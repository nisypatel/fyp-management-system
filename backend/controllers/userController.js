const User = require('../models/User');
const Project = require('../models/Project');
const Notification = require('../models/Notification');
const { normalizeRole } = require('../utils/role');
const { appendAuditEntry, buildAuditEntry } = require('../utils/auditTrail');

// @desc    Get all users
// @route   GET /api/users
// @access  Private (Admin)
exports.getUsers = async (req, res) => {
  try {
    const { role, q } = req.query;
    const hasPagination = req.query.page !== undefined || req.query.limit !== undefined;
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 100);
    const skip = (page - 1) * limit;
    let query = {};
    
    if (role) {
      query.role = normalizeRole(role);
    }

    if (q && q.trim()) {
      const escaped = q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.$or = [
        { name: { $regex: escaped, $options: 'i' } },
        { email: { $regex: escaped, $options: 'i' } }
      ];
    }

    const usersQuery = User.find(query).select('-password').sort('-createdAt');
    if (hasPagination) {
      usersQuery.skip(skip).limit(limit);
    }

    const [users, total] = await Promise.all([
      usersQuery,
      User.countDocuments(query)
    ]);

    res.status(200).json({
      success: true,
      count: users.length,
      total,
      page: hasPagination ? page : 1,
      limit: hasPagination ? limit : total,
      totalPages: hasPagination ? Math.ceil(total / limit) : 1,
      users
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'An error occurred. Please try again.'
    });
  }
};

// @desc    Get all faculty
// @route   GET /api/users/faculty
// @access  Private
exports.getFaculty = async (req, res) => {
  try {
    const { department, q } = req.query;
    const facultyQuery = { role: 'faculty', isActive: true };

    if (department && department.trim()) {
      facultyQuery.department = department.trim();
    }

    if (q && q.trim()) {
      const escaped = q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      facultyQuery.$or = [
        { name: { $regex: escaped, $options: 'i' } },
        { email: { $regex: escaped, $options: 'i' } }
      ];
    }

    const facultyUsers = await User.find(facultyQuery)
      .select('name email employeeId department')
      .sort('name');

    const [activeLoads, pendingLoads] = await Promise.all([
      Project.aggregate([
        {
          $match: {
            supervisor: { $ne: null },
            supervisorStatus: 'accepted',
            status: { $in: ['proposal', 'in-progress'] }
          }
        },
        {
          $group: {
            _id: '$supervisor',
            activeAssigned: { $sum: 1 },
            inProgress: {
              $sum: {
                $cond: [{ $eq: ['$status', 'in-progress'] }, 1, 0]
              }
            }
          }
        }
      ]),
      Project.aggregate([
        {
          $match: {
            supervisor: { $ne: null },
            supervisorStatus: 'pending'
          }
        },
        {
          $group: {
            _id: '$supervisor',
            pendingRequests: { $sum: 1 }
          }
        }
      ])
    ]);

    const activeLoadByFacultyId = new Map(
      activeLoads.map((row) => [row._id?.toString(), row])
    );
    const pendingLoadByFacultyId = new Map(
      pendingLoads.map((row) => [row._id?.toString(), row])
    );

    const faculty = facultyUsers
      .map((person) => {
        const facultyId = person._id.toString();
        const active = activeLoadByFacultyId.get(facultyId);
        const pending = pendingLoadByFacultyId.get(facultyId);
        const activeAssigned = active?.activeAssigned || 0;
        const pendingRequests = pending?.pendingRequests || 0;
        const inProgress = active?.inProgress || 0;
        const recommendationScore = activeAssigned * 2 + pendingRequests;

        let loadTag = 'High Load';
        if (recommendationScore <= 2) {
          loadTag = 'Recommended';
        } else if (recommendationScore <= 5) {
          loadTag = 'Available';
        }

        return {
          ...person.toObject(),
          workload: {
            activeAssigned,
            pendingRequests,
            inProgress,
            recommendationScore,
            loadTag
          }
        };
      })
      .sort((a, b) => a.workload.recommendationScore - b.workload.recommendationScore);

    res.status(200).json({
      success: true,
      count: faculty.length,
      faculty
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'An error occurred. Please try again.'
    });
  }
};

// @desc    Get single user
// @route   GET /api/users/:id
// @access  Private (Admin)
exports.getUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      user
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'An error occurred. Please try again.'
    });
  }
};

// @desc    Create user (by admin)
// @route   POST /api/users
// @access  Private (Admin)
exports.createUser = async (req, res) => {
  try {
    const { name, email, password, role, department, enrollmentNumber, employeeId, phone } = req.body;
    const normalizedRole = normalizeRole(role);
    const normalizedEmail = email.trim().toLowerCase();

    const userExists = await User.findOne({ email: normalizedEmail });
    if (userExists) {
      return res.status(400).json({
        success: false,
        message: 'User already exists'
      });
    }

    if ((normalizedRole === 'student' || normalizedRole === 'faculty') && !department) {
      return res.status(400).json({
        success: false,
        message: 'Department is required for students and faculty'
      });
    }

    if (normalizedRole === 'student' && !enrollmentNumber) {
      return res.status(400).json({
        success: false,
        message: 'Enrollment number is required for students'
      });
    }

    if (normalizedRole === 'faculty' && !employeeId) {
      return res.status(400).json({
        success: false,
        message: 'Employee ID is required for faculty'
      });
    }

    const userData = {
      name,
      email: normalizedEmail,
      password,
      role: normalizedRole,
      phone,
      updatedBy: req.user.id,
      changeHistory: [
        buildAuditEntry({
          userId: req.user.id,
          action: 'user_created_by_admin',
          changes: `User created with role ${normalizedRole}`
        })
      ]
    };

    if (normalizedRole === 'student') {
      userData.department = department;
      userData.enrollmentNumber = enrollmentNumber;
    } else if (normalizedRole === 'faculty') {
      userData.department = department;
      userData.employeeId = employeeId;
    }

    const user = await User.create(userData);

    res.status(201).json({
      success: true,
      user
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'An error occurred. Please try again.'
    });
  }
};

// @desc    Update user
// @route   PUT /api/users/:id
// @access  Private (Admin)
exports.updateUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const { name, email, department, phone, isActive } = req.body;

    if (name !== undefined) user.name = name;
    if (email !== undefined) user.email = email.trim().toLowerCase();
    if (department !== undefined) user.department = department;
    if (phone !== undefined) user.phone = phone;
    if (isActive !== undefined) {
      user.isActive = isActive;
    }

    appendAuditEntry(user, {
      userId: req.user.id,
      action: 'user_updated_by_admin',
      changes: 'Admin updated user profile fields'
    });

    await user.save();

    res.status(200).json({
      success: true,
      user
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'An error occurred. Please try again.'
    });
  }
};

// @desc    Delete user
// @route   DELETE /api/users/:id
// @access  Private (Admin)
exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if user has associated projects
    if (user.role === 'student') {
      const projects = await Project.find({ student: user._id });
      if (projects.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Cannot delete user with associated projects'
        });
      }
    }

    await user.deleteOne();

    res.status(200).json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'An error occurred. Please try again.'
    });
  }
};

// @desc    Get dashboard statistics
// @route   GET /api/users/stats/dashboard
// @access  Private
exports.getDashboardStats = async (req, res) => {
  try {
    let stats = {};

    if (req.user.role === 'admin') {
      const totalStudents = await User.countDocuments({ role: 'student' });
      const totalFaculty = await User.countDocuments({ role: 'faculty' });
      const totalUsers = await User.countDocuments();
      const totalProjects = await Project.countDocuments();
      const pendingProjects = await Project.countDocuments({ adminStatus: 'pending' });
      const approvedProjects = await Project.countDocuments({ adminStatus: 'approved' });
      const rejectedProjects = await Project.countDocuments({ adminStatus: 'rejected' });
      const inProgressProjects = await Project.countDocuments({ status: 'in-progress' });
      const completedProjects = await Project.countDocuments({ status: 'completed' });

      const inProgressProjectDocs = await Project.find({
        status: 'in-progress',
        adminStatus: 'approved'
      })
        .select('title progress updatedAt phases student supervisor supervisorStatus codeReview.status delayReminder')
        .populate('student', 'name')
        .populate('supervisor', 'name');

      const delayedThresholdDays = 14;
      const reminderCooldownMs = 24 * 60 * 60 * 1000;
      const now = Date.now();
      const delayedAlerts = [];
      const delayedReminderNotifications = [];
      let reviewHourTotal = 0;
      let reviewCount = 0;
      let phaseRejections = 0;
      let screenReviewRejections = 0;
      const rejectionHotspots = {};

      for (const project of inProgressProjectDocs) {
        const phases = Array.isArray(project.phases) ? project.phases : [];

        phases.forEach((phase) => {
          if (phase?.status === 'rejected') {
            phaseRejections += 1;
            if (phase.title) {
              rejectionHotspots[phase.title] = (rejectionHotspots[phase.title] || 0) + 1;
            }
          }

          if (phase?.submission?.submittedAt && phase?.approvedAt) {
            const hours = (new Date(phase.approvedAt).getTime() - new Date(phase.submission.submittedAt).getTime()) / (1000 * 60 * 60);
            if (!Number.isNaN(hours) && Number.isFinite(hours) && hours >= 0) {
              reviewHourTotal += hours;
              reviewCount += 1;
            }
          }
        });

        if (project.codeReview?.status === 'rejected') {
          screenReviewRejections += 1;
        }

        const currentPhase = phases.find((phase) => phase.status !== 'approved');
        if (!currentPhase || currentPhase.status === 'approved') {
          continue;
        }

        const lastActivityAt = currentPhase.submission?.submittedAt || project.updatedAt;
        const inactiveDays = Math.floor((now - new Date(lastActivityAt).getTime()) / (1000 * 60 * 60 * 24));
        if (inactiveDays >= delayedThresholdDays) {
          delayedAlerts.push({
            projectId: project._id,
            title: project.title,
            studentName: project.student?.name || 'Student',
            supervisorName: project.supervisor?.name || 'Unassigned',
            currentPhaseTitle: currentPhase.title || 'Current Phase',
            currentPhaseStatus: currentPhase.status,
            inactiveDays,
            progress: project.progress || 0
          });

          const phaseId = currentPhase._id ? currentPhase._id.toString() : String(currentPhase.title || 'phase');
          const lastReminderAt = project.delayReminder?.lastSentAt ? new Date(project.delayReminder.lastSentAt).getTime() : null;
          const samePhaseAsLastReminder = project.delayReminder?.phaseId === phaseId;
          const cooldownPassed = !lastReminderAt || now - lastReminderAt >= reminderCooldownMs;
          const shouldSendReminder = !samePhaseAsLastReminder || cooldownPassed;

          if (shouldSendReminder) {
            const reminderTitle = 'Project Phase Delay Alert';
            const reminderMessage = `Your project "${project.title}" has been inactive in phase "${currentPhase.title || 'Current Phase'}" for ${inactiveDays} days. Please review and take action.`;

            if (project.student?._id) {
              delayedReminderNotifications.push({
                recipient: project.student._id,
                type: 'general',
                title: reminderTitle,
                message: reminderMessage,
                relatedProject: project._id,
                updatedBy: req.user.id,
                changeHistory: [
                  buildAuditEntry({
                    userId: req.user.id,
                    action: 'delay_alert_generated',
                    changes: 'Automated delay reminder created for student'
                  })
                ]
              });
            }

            if (project.supervisor && project.supervisorStatus === 'accepted') {
              delayedReminderNotifications.push({
                recipient: project.supervisor._id || project.supervisor,
                type: 'general',
                title: reminderTitle,
                message: `Project "${project.title}" is delayed in phase "${currentPhase.title || 'Current Phase'}" (${inactiveDays} days inactive). Please review student progress.`,
                relatedProject: project._id,
                updatedBy: req.user.id,
                changeHistory: [
                  buildAuditEntry({
                    userId: req.user.id,
                    action: 'delay_alert_generated',
                    changes: 'Automated delay reminder created for supervisor'
                  })
                ]
              });
            }

            project.delayReminder = {
              phaseId,
              lastSentAt: new Date(now),
              inactiveDaysAtLastReminder: inactiveDays
            };
            appendAuditEntry(project, {
              userId: req.user.id,
              action: 'delay_reminder_updated',
              changes: `Delay reminder updated for phase ${currentPhase.title || 'Current Phase'}`
            });
            await project.save();
          }
        }
      }

      if (delayedReminderNotifications.length > 0) {
        await Notification.insertMany(delayedReminderNotifications);
      }

      const avgPhaseReviewHours = reviewCount ? Number((reviewHourTotal / reviewCount).toFixed(1)) : 0;
      const topRejectionPhases = Object.entries(rejectionHotspots)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([phaseTitle, count]) => ({ phaseTitle, count }));

      stats = {
        totalUsers,
        totalStudents,
        totalFaculty,
        totalProjects,
        pendingProjects,
        approvedProjects,
        rejectedProjects,
        inProgressProjects,
        completedProjects,
        delayedProjects: delayedAlerts.length,
        delayedAlerts: delayedAlerts.slice(0, 8),
        avgPhaseReviewHours,
        phaseRejections,
        screenReviewRejections,
        topRejectionPhases
      };
    } else if (req.user.role === 'faculty') {
      const totalAssigned = await Project.countDocuments({ 
        supervisor: req.user.id,
        supervisorStatus: 'accepted'
      });
      const pendingRequests = await Project.countDocuments({ 
        supervisor: req.user.id,
        supervisorStatus: 'pending'
      });
      const inProgress = await Project.countDocuments({ 
        supervisor: req.user.id,
        status: 'in-progress'
      });
      const completed = await Project.countDocuments({ 
        supervisor: req.user.id,
        status: 'completed'
      });

      stats = {
        totalAssigned,
        pendingRequests,
        inProgress,
        completed
      };
    } else if (req.user.role === 'student') {
      const studentProjectScope = {
        $or: [
          { student: req.user.id },
          {
            teamMembers: {
              $elemMatch: {
                student: req.user.id,
                inviteStatus: 'accepted'
              }
            }
          }
        ]
      };

      const myProjects = await Project.countDocuments(studentProjectScope);
      const pending = await Project.countDocuments({
        ...studentProjectScope,
        status: 'proposal'
      });
      const inProgress = await Project.countDocuments({
        ...studentProjectScope,
        status: 'in-progress'
      });
      const completed = await Project.countDocuments({
        ...studentProjectScope,
        status: 'completed'
      });

      stats = {
        myProjects,
        pending,
        inProgress,
        completed
      };
    }

    res.status(200).json({
      success: true,
      stats
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'An error occurred. Please try again.'
    });
  }
};
