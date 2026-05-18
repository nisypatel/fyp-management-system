const User = require('../models/User');
const UserType = require('../models/UserType');
const SystemSetting = require('../models/SystemSetting');
const Project = require('../models/Project');
const Notification = require('../models/Notification');
const { normalizeRole } = require('../utils/role');
const { appendAuditEntry, buildAuditEntry } = require('../utils/auditTrail');
const { sendEmail } = require('../utils/sendEmail');
const { uploadFileToCloudinary, deleteFromCloudinary } = require('../utils/cloudinary');

const VERIFICATION_DOMAIN_KEY = 'verification_email_domain';

const normalizeDomain = (domain = '') => String(domain).trim().toLowerCase().replace(/^@+/, '');

const getVerificationDomain = async () => {
  const setting = await SystemSetting.findOne({ key: VERIFICATION_DOMAIN_KEY }).lean();
  return normalizeDomain(setting?.value || process.env.COLLEGE_EMAIL_DOMAIN || '');
};

const getLocalPartFromEmail = (email = '') => {
  const [localPart] = String(email).split('@');
  return (localPart || '').trim().toLowerCase();
};

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

    const usersQuery = User.find(query).select('-password').populate({ path: 'department', select: 'name' }).sort('-createdAt');
    if (hasPagination) {
      usersQuery.skip(skip).limit(limit);
    }

    const [users, total] = await Promise.all([
      usersQuery,
      User.countDocuments(query)
    ]);

    // normalize department to string for backward compatibility
    const normalizedUsers = users.map((u) => {
      const obj = u.toObject();
      if (obj.department) obj.department = obj.department.name || obj.department;
      return obj;
    });

    res.status(200).json({
      success: true,
      count: normalizedUsers.length,
      total,
      page: hasPagination ? page : 1,
      limit: hasPagination ? limit : total,
      totalPages: hasPagination ? Math.ceil(total / limit) : 1,
      users: normalizedUsers
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

    if (department && String(department).trim()) {
      const deptVal = String(department).trim();
      // If looks like an ObjectId, query by id, otherwise assume it's a department name
      const mongoose = require('mongoose');
      if (mongoose.Types.ObjectId.isValid(deptVal)) {
        facultyQuery.department = mongoose.Types.ObjectId(deptVal);
      } else {
        // Some legacy users may still have department stored as string
        facultyQuery.$or = [
          { department: deptVal },
          { department: mongoose.Types.ObjectId.isValid(deptVal) ? mongoose.Types.ObjectId(deptVal) : undefined }
        ].filter(Boolean);
      }
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
      .populate({ path: 'department', select: 'name code' })
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

        const obj = person.toObject();
        // Normalize department for response (keep string for backward compatibility)
        obj.department = person.department ? (person.department.name || String(person.department)) : '';
        return {
          ...obj,
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

    const roleType = await UserType.findOne({ key: normalizedRole });
    if (roleType) {
      userData.roleType = roleType._id;
    }

    const Department = require('../models/Department');
    if (normalizedRole === 'student') {
      // Validate department id or name
      let deptId = department;
      if (!deptId) {
        return res.status(400).json({ success: false, message: 'Department is required for students' });
      }
      if (typeof deptId === 'string') {
        const mongoose = require('mongoose');
        if (mongoose.Types.ObjectId.isValid(deptId)) {
          const found = await Department.findById(deptId);
          if (!found) return res.status(400).json({ success: false, message: 'Invalid department' });
          userData.department = found._id;
        } else {
          // try find by name
          const found = await Department.findOne({ name: deptId.trim() });
          if (!found) return res.status(400).json({ success: false, message: 'Invalid department' });
          userData.department = found._id;
        }
      }
      userData.enrollmentNumber = enrollmentNumber;
    } else if (normalizedRole === 'faculty') {
      let deptId = department;
      if (!deptId) {
        return res.status(400).json({ success: false, message: 'Department is required for faculty' });
      }
      if (typeof deptId === 'string') {
        const mongoose = require('mongoose');
        if (mongoose.Types.ObjectId.isValid(deptId)) {
          const found = await Department.findById(deptId);
          if (!found) return res.status(400).json({ success: false, message: 'Invalid department' });
          userData.department = found._id;
        } else {
          const found = await Department.findOne({ name: deptId.trim() });
          if (!found) return res.status(400).json({ success: false, message: 'Invalid department' });
          userData.department = found._id;
        }
      }
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
    if (department !== undefined) {
      const Department = require('../models/Department');
      if (department === null || department === '') {
        user.department = department;
      } else if (typeof department === 'string') {
        const mongoose = require('mongoose');
        if (mongoose.Types.ObjectId.isValid(department)) {
          const found = await Department.findById(department);
          if (!found) return res.status(400).json({ success: false, message: 'Invalid department' });
          user.department = found._id;
        } else {
          const found = await Department.findOne({ name: department.trim() });
          if (!found) return res.status(400).json({ success: false, message: 'Invalid department' });
          user.department = found._id;
        }
      } else {
        user.department = department;
      }
    }
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

// @desc    Request OTP verification
// @route   POST /api/users/verification/otp
// @access  Private (Student)
exports.requestOTPVerification = async (req, res) => {
  try {
    const { emailLocalPart } = req.body;
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (user.verificationStatus === 'verified') {
      return res.status(200).json({
        success: true,
        message: 'User already verified',
        verificationStatus: 'verified'
      });
    }

    const verificationDomain = await getVerificationDomain();
    if (!verificationDomain) {
      return res.status(400).json({
        success: false,
        message: 'Verification email domain is not configured by admin yet'
      });
    }

    const normalizedLocalPart = String(emailLocalPart || '').trim().toLowerCase();
    const localPartRegex = /^[a-z0-9._%+-]+$/i;
    if (!normalizedLocalPart || !localPartRegex.test(normalizedLocalPart)) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid college email username'
      });
    }

    const verificationEmail = `${normalizedLocalPart}@${verificationDomain}`;

    // Generate or re-generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = Date.now() + 10 * 60 * 1000; // 10 minutes

    user.verificationStatus = 'otp_pending';
    user.verificationMethod = 'otp';
    user.verificationEmail = verificationEmail;
    user.otpToken = otp;
    user.otpExpires = otpExpires;
    user.verificationAudit.push({
      action: 'otp_requested',
      performedBy: req.user.id,
      timestamp: new Date(),
      notes: `OTP requested for ${verificationEmail}`
    });

    await user.save();

    try {
      await sendEmail({
        email: verificationEmail,
        subject: 'Your FYP verification OTP',
        message: `Your OTP is ${otp}. It expires in 10 minutes.`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 16px;">
            <h2 style="color: #0f4c81; margin: 0 0 12px;">FYP Account Verification</h2>
            <p style="margin: 0 0 10px;">Use this OTP to verify your student account:</p>
            <p style="font-size: 28px; letter-spacing: 2px; font-weight: 700; margin: 8px 0 16px;">${otp}</p>
            <p style="margin: 0; color: #555;">This code expires in 10 minutes.</p>
          </div>
        `
      });
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: 'OTP could not be sent. Please try again.'
      });
    }

    res.status(200).json({
      success: true,
      message: 'OTP sent to your educational email',
      verificationStatus: 'otp_pending',
      verificationDomain,
      verificationEmail,
      expiresIn: '10 minutes'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'An error occurred. Please try again.'
    });
  }
};

// @desc    Confirm OTP verification
// @route   POST /api/users/verification/otp/confirm
// @access  Private (Student)
exports.confirmOTPVerification = async (req, res) => {
  try {
    const { otp } = req.body;

    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (user.verificationStatus === 'verified') {
      return res.status(200).json({
        success: true,
        message: 'User already verified',
        verificationStatus: 'verified'
      });
    }

    if (user.verificationStatus !== 'otp_pending') {
      return res.status(400).json({
        success: false,
        message: 'No pending OTP verification'
      });
    }

    if (!user.otpToken || user.otpExpires < Date.now()) {
      return res.status(400).json({
        success: false,
        message: 'OTP has expired'
      });
    }

    if (user.otpToken !== otp) {
      return res.status(400).json({
        success: false,
        message: 'Invalid OTP'
      });
    }

    user.verificationStatus = 'verified';
    user.verificationMethod = 'otp';
    user.otpToken = undefined;
    user.otpExpires = undefined;
    user.verificationAudit.push({
      action: 'otp_verified',
      performedBy: req.user.id,
      timestamp: new Date(),
      notes: 'OTP verification successful'
    });

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Email verification successful',
      verificationStatus: 'verified'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'An error occurred. Please try again.'
    });
  }
};

// @desc    Upload ID card for verification
// @route   POST /api/users/verification/id-card
// @access  Private (Student)
exports.uploadIDCard = async (req, res) => {
  let uploadedIdCard = null;
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'ID card file is required'
      });
    }

    const user = await User.findById(req.user.id);

    if (user.verificationStatus === 'verified') {
      return res.status(400).json({
        success: false,
        message: 'User is already verified'
      });
    }

    uploadedIdCard = await uploadFileToCloudinary(req.file, {
      folder: `fyp/users/${user._id}/verification/id-card`
    });

    user.verificationStatus = 'id_pending';
    user.verificationMethod = 'id_card';
    user.idCardFile = {
      ...uploadedIdCard,
      uploadedAt: new Date()
    };
    user.verificationAudit.push({
      action: 'id_card_uploaded',
      performedBy: req.user.id,
      timestamp: new Date(),
      notes: 'ID card uploaded for verification'
    });

    await user.save();

    // Notify admins
    const admins = await User.find({ role: 'admin' });
    const notifications = admins.map(admin =>
      Notification.create({
        recipient: admin._id,
        sender: req.user.id,
        type: 'verification_pending',
        title: 'ID Card Verification Pending',
        message: `${user.name} has uploaded an ID card for verification`,
        relatedUser: user._id
      })
    );

    await Promise.all(notifications);

    res.status(200).json({
      success: true,
      message: 'ID card uploaded successfully. Awaiting admin review.'
    });
  } catch (error) {
    if (uploadedIdCard?.public_id) {
      try {
        await deleteFromCloudinary(uploadedIdCard.public_id, { resource_type: uploadedIdCard.resource_type || 'image' });
      } catch (cleanupError) {
        // keep original error response; cleanup failure should not block the request failure path
      }
    }

    res.status(400).json({
      success: false,
      message: 'An error occurred. Please try again.'
    });
  }
};

// @desc    Get pending ID card verifications
// @route   GET /api/users/verification/pending
// @access  Private (Admin)
exports.getPendingVerifications = async (req, res) => {
  try {
    const users = await User.find({
      verificationStatus: 'id_pending'
    }).select('name email verificationMethod idCardFile verificationAudit createdAt');

    res.status(200).json({
      success: true,
      count: users.length,
      data: users
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'An error occurred. Please try again.'
    });
  }
};

// @desc    Get verification config and student verification state
// @route   GET /api/users/verification/config
// @access  Private
exports.getVerificationConfig = async (req, res) => {
  try {
    const verificationDomain = await getVerificationDomain();

    if (req.user.role === 'student') {
      const user = await User.findById(req.user.id).select('verificationStatus verificationEmail verificationMethod');
      return res.status(200).json({
        success: true,
        verificationDomain,
        verificationStatus: user?.verificationStatus || 'unverified',
        verificationMethod: user?.verificationMethod || null,
        verificationEmail: user?.verificationEmail || null,
        emailLocalPart: getLocalPartFromEmail(user?.verificationEmail)
      });
    }

    return res.status(200).json({
      success: true,
      verificationDomain
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'An error occurred. Please try again.'
    });
  }
};

// @desc    Update verification email domain
// @route   PUT /api/users/verification/config
// @access  Private (Admin)
exports.updateVerificationConfig = async (req, res) => {
  try {
    const domain = normalizeDomain(req.body.verificationDomain || '');
    const domainRegex = /^[a-z0-9.-]+\.[a-z]{2,}$/i;

    if (!domain || !domainRegex.test(domain)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid domain (example: college.edu)'
      });
    }

    await SystemSetting.findOneAndUpdate(
      { key: VERIFICATION_DOMAIN_KEY },
      {
        key: VERIFICATION_DOMAIN_KEY,
        value: domain,
        updatedBy: req.user.id
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true
      }
    );

    res.status(200).json({
      success: true,
      verificationDomain: domain,
      message: 'Verification domain updated successfully'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'An error occurred. Please try again.'
    });
  }
};

// @desc    Review ID card verification
// @route   PUT /api/users/:id/verification/review
// @access  Private (Admin)
exports.reviewIDCardVerification = async (req, res) => {
  try {
    const { status, notes } = req.body; // 'verified' or 'rejected'

    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (user.verificationStatus !== 'id_pending') {
      return res.status(400).json({
        success: false,
        message: 'No pending ID card verification for this user'
      });
    }

    user.verificationStatus = status === 'verified' ? 'verified' : 'rejected';
    user.verificationAudit.push({
      action: status === 'verified' ? 'id_card_approved' : 'id_card_rejected',
      performedBy: req.user.id,
      timestamp: new Date(),
      notes: notes || `${status === 'verified' ? 'Approved' : 'Rejected'} by admin`
    });

    await user.save();

    // Notify user
    await Notification.create({
      recipient: user._id,
      sender: req.user.id,
      type: 'verification_result',
      title: `ID Card Verification ${status === 'verified' ? 'Approved' : 'Rejected'}`,
      message: `Your ID card verification has been ${status === 'verified' ? 'approved' : 'rejected'}. ${notes || ''}`,
      relatedUser: user._id
    });

    res.status(200).json({
      success: true,
      message: `ID card verification ${status}`
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'An error occurred. Please try again.'
    });
  }
};
