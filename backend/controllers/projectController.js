const Project = require('../models/Project');
const User = require('../models/User');
const Notification = require('../models/Notification');
const PhaseTemplate = require('../models/PhaseTemplate');
const { sendProjectCompletionEmail } = require('../utils/sendEmail');
const logger = require('../utils/logger');
const { sanitizeText } = require('../utils/sanitize');
const { appendAuditEntry, buildAuditEntry, MAX_AUDIT_ENTRIES } = require('../utils/auditTrail');
const { executeInTransaction, withSession } = require('../utils/transaction');
const path = require('path');
const fs = require('fs');

const isStudentInActiveProject = async (studentId, excludeProjectId = null, session = null) => {
  const query = {
    status: { $in: ['proposal', 'in-progress'] },
    $or: [
      { student: studentId },
      {
        teamMembers: {
          $elemMatch: {
            student: studentId,
            inviteStatus: 'accepted'
          }
        }
      }
    ]
  };

  if (excludeProjectId) {
    query._id = { $ne: excludeProjectId };
  }

  const project = await withSession(Project.findOne(query).select('_id'), session);
  return Boolean(project);
};

// Helper function to create notification
const createNotification = async (recipient, sender, type, title, message, projectId, session = null) => {
  const notificationData = {
    recipient,
    sender,
    type,
    title,
    message,
    relatedProject: projectId,
    updatedBy: sender || null,
    changeHistory: [
      buildAuditEntry({
        userId: sender,
        action: 'notification_created',
        changes: `Type: ${type}`
      })
    ]
  };

  if (session) {
    await Notification.create([notificationData], { session });
    return;
  }

  await Notification.create(notificationData);
};

const parseJsonArray = (value, fallback = []) => {
  if (!value) return fallback;
  if (Array.isArray(value)) return value;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : fallback;
  } catch (error) {
    return fallback;
  }
};

const isProjectContributor = (project, userId) => {
  const isOwner = project.student && project.student.toString() === userId;
  const isAcceptedTeamMember = project.teamMembers.some(
    (member) => member.student && member.student.toString() === userId && member.inviteStatus === 'accepted'
  );

  return isOwner || isAcceptedTeamMember;
};

const isZipFile = (file) => {
  if (!file) return false;
  const extension = path.extname(file.originalname).toLowerCase();
  return extension === '.zip' || extension === '.rar';
};

const normalizePhaseTitles = (rawPhases) => {
  if (!Array.isArray(rawPhases)) return [];

  const normalized = rawPhases
    .map((phase) => {
      if (typeof phase === 'string') return phase.trim();
      if (phase && typeof phase.title === 'string') return phase.title.trim();
      return '';
    })
    .filter(Boolean)
    .slice(0, 20);

  const seen = new Set();
  return normalized.filter((title) => {
    const key = title.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const buildProjectPhases = (phaseTitles) =>
  phaseTitles.map((title) => ({
    title,
    status: 'pending'
  }));

const getConfiguredPhaseTemplate = async () => {
  const phaseTemplate = await PhaseTemplate.findOne().sort('-updatedAt');
  const configuredTitles = normalizePhaseTitles(phaseTemplate?.phases || []);
  return configuredTitles;
};

// @desc    Get admin-managed project phase template
// @route   GET /api/projects/phase-template
// @access  Private
exports.getPhaseTemplate = async (req, res) => {
  try {
    const phaseTemplate = await PhaseTemplate.findOne().sort('-updatedAt').populate('updatedBy', 'name role');
    const phases = normalizePhaseTitles(phaseTemplate?.phases || []).map((title, index) => ({
      order: index + 1,
      title
    }));

    res.status(200).json({
      success: true,
      phases,
      updatedAt: phaseTemplate?.updatedAt || null,
      updatedBy: phaseTemplate?.updatedBy || null
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'An error occurred. Please try again.'
    });
  }
};

// @desc    Update admin-managed project phase template
// @route   PUT /api/projects/phase-template
// @access  Private (Admin)
exports.updatePhaseTemplate = async (req, res) => {
  try {
    const sanitizedPhases = Array.isArray(req.body.phases)
      ? req.body.phases.map((phase) => (typeof phase === 'string' ? sanitizeText(phase) : { ...phase, title: sanitizeText(phase.title || '') }))
      : req.body.phases;
    const normalizedTitles = normalizePhaseTitles(sanitizedPhases);

    if (!normalizedTitles.length) {
      return res.status(400).json({
        success: false,
        message: 'Please provide at least one valid phase title'
      });
    }

    if (normalizedTitles.some((title) => title.length > 100)) {
      return res.status(400).json({
        success: false,
        message: 'Each phase title must be 100 characters or less'
      });
    }

    const updatedTemplate = await PhaseTemplate.findOneAndUpdate(
      {},
      {
        $set: {
          phases: normalizedTitles.map((title) => ({ title })),
          updatedBy: req.user.id
        },
        $push: {
          changeHistory: {
            $each: [
              buildAuditEntry({
                userId: req.user.id,
                action: 'phase_template_updated',
                changes: `Configured ${normalizedTitles.length} phases`
              })
            ],
            $slice: -MAX_AUDIT_ENTRIES
          }
        }
      },
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true
      }
    ).populate('updatedBy', 'name role');

    res.status(200).json({
      success: true,
      phases: normalizedTitles.map((title, index) => ({ order: index + 1, title })),
      updatedAt: updatedTemplate.updatedAt,
      updatedBy: updatedTemplate.updatedBy
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'An error occurred. Please try again.'
    });
  }
};

// @desc    Create new project proposal
// @route   POST /api/projects
// @access  Private (Student)
exports.createProject = async (req, res) => {
  try {
    const { title, description, category, technologies, teamMembers } = req.body;
    const sanitizedTitle = sanitizeText(title || '');
    const sanitizedDescription = sanitizeText(description || '');
    const sanitizedCategory = sanitizeText(category || '');
    const phaseTitles = await getConfiguredPhaseTemplate();

    if (!phaseTitles.length) {
      return res.status(400).json({
        success: false,
        message: 'Admin must configure project phases before project creation'
      });
    }

    const parsedTechnologies = parseJsonArray(technologies, [])
      .map((item) => sanitizeText(String(item)))
      .filter(Boolean)
      .slice(0, 20);

    const parsedTeamMembers = parseJsonArray(teamMembers, [])
      .map((item) => String(item).trim())
      .filter(Boolean)
      .slice(0, 4);

    if (!parsedTechnologies.length) {
      return res.status(400).json({
        success: false,
        message: 'Please provide at least one technology'
      });
    }

    const project = await executeInTransaction(async (session) => {
      const studentAlreadyActive = await isStudentInActiveProject(req.user.id, null, session);
      if (studentAlreadyActive) {
        return res.status(400).json({
          success: false,
          message: 'You already have an active project'
        });
      }

      const projectData = {
        title: sanitizedTitle,
        description: sanitizedDescription,
        category: sanitizedCategory,
        technologies: parsedTechnologies,
        phases: buildProjectPhases(phaseTitles),
        teamMembers: [],
        student: req.user.id,
        updatedBy: req.user.id,
        changeHistory: [
          buildAuditEntry({
            userId: req.user.id,
            action: 'project_created',
            changes: 'Project proposal created by student'
          })
        ]
      };

      if (parsedTeamMembers.length > 0) {
        const seenEmails = new Set();
        for (const email of parsedTeamMembers) {
          if (!email || email.trim() === '') continue;

          const normalizedEmail = email.trim().toLowerCase();
          if (seenEmails.has(normalizedEmail)) {
            continue;
          }
          seenEmails.add(normalizedEmail);

          const memberUser = await withSession(User.findOne({ email: normalizedEmail, role: 'student' }), session);
          if (!memberUser) {
            return res.status(404).json({
              success: false,
              message: `Student with email '${email}' not found. Ensure they are registered first.`
            });
          }

          if (memberUser._id.toString() === req.user.id) {
            return res.status(400).json({
              success: false,
              message: 'You cannot add yourself as a team member'
            });
          }

          const memberAlreadyActive = await isStudentInActiveProject(memberUser._id, null, session);
          if (memberAlreadyActive) {
            return res.status(400).json({
              success: false,
              message: `${memberUser.name} is already part of an active project`
            });
          }

          projectData.teamMembers.push({
            student: memberUser._id,
            email: memberUser.email,
            name: memberUser.name,
            enrollmentNumber: memberUser.enrollmentNumber || memberUser.email,
            inviteStatus: 'pending'
          });
        }
      }

      if (req.file) {
        projectData.proposalFile = {
          filename: req.file.filename,
          originalName: req.file.originalname,
          path: req.file.path,
          size: req.file.size,
          uploadedAt: new Date()
        };
      }

      const createdProject = new Project(projectData);
      await createdProject.save(session ? { session } : undefined);

      for (const member of createdProject.teamMembers) {
        if (member.student) {
          await createNotification(
            member.student,
            req.user.id,
            'team_invited',
            'Team Invitation',
            `${req.user.name} invited you to join the team for project: ${title}`,
            createdProject._id,
            session
          );
        }
      }

      const admins = await withSession(User.find({ role: 'admin' }), session);
      for (const admin of admins) {
        await createNotification(
          admin._id,
          req.user.id,
          'project_submitted',
          'New Project Proposal',
          `${req.user.name} has submitted a new project proposal: ${title}`,
          createdProject._id,
          session
        );
      }

      return createdProject;
    });

    if (res.headersSent || !project || !project._id) {
      return;
    }

    res.status(201).json({
      success: true,
      project
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'An error occurred. Please try again.'
    });
  }
};

// @desc    Get all projects (with filters based on role)
// @route   GET /api/projects
// @access  Private
exports.getProjects = async (req, res) => {
  try {
    const { q } = req.query;
    const hasPagination = req.query.page !== undefined || req.query.limit !== undefined;
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 100);
    const skip = (page - 1) * limit;
    let query = {};

    if (req.user.role === 'student') {
      query = {
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
    } else if (req.user.role === 'faculty') {
      query.supervisor = req.user.id;
    }
    // Admin sees all projects

    if (q && q.trim()) {
      const escaped = q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const searchCondition = {
        $or: [
        { title: { $regex: escaped, $options: 'i' } },
        { description: { $regex: escaped, $options: 'i' } }
        ]
      };

      if (query.$or) {
        query = {
          $and: [
            { $or: query.$or },
            searchCondition
          ]
        };
      } else {
        query = {
          ...query,
          ...searchCondition
        };
      }
    }

    const projectsQuery = Project.find(query)
      .populate('student', 'name email enrollmentNumber department')
      .populate('supervisor', 'name email employeeId')
      .sort('-createdAt');

    if (hasPagination) {
      projectsQuery.skip(skip).limit(limit);
    }

    const [projects, total] = await Promise.all([
      projectsQuery,
      Project.countDocuments(query)
    ]);

    res.status(200).json({
      success: true,
      count: projects.length,
      total,
      page: hasPagination ? page : 1,
      limit: hasPagination ? limit : total,
      totalPages: hasPagination ? Math.ceil(total / limit) : 1,
      projects
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'An error occurred. Please try again.'
    });
  }
};

// @desc    Get single project
// @route   GET /api/projects/:id
// @access  Private
exports.getProject = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate('student', 'name email enrollmentNumber department phone')
      .populate('supervisor', 'name email employeeId department phone')
      .populate('feedback.from', 'name role')
      .populate('phases.feedback.from', 'name role')
      .populate('documents.uploadedBy', 'name role');

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    // Check authorization
    if (req.user.role === 'student') {
      const isOwner = project.student._id.toString() === req.user.id;
      const isAcceptedTeamMember = project.teamMembers.some(
        (member) => member.student && member.student.toString() === req.user.id && member.inviteStatus === 'accepted'
      );

      if (!isOwner && !isAcceptedTeamMember) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to access this project'
        });
      }
    }

    if (req.user.role === 'faculty' && (!project.supervisor || project.supervisor._id.toString() !== req.user.id)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this project'
      });
    }

    res.status(200).json({
      success: true,
      project
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'An error occurred. Please try again.'
    });
  }
};

// @desc    Request supervisor for project
// @route   PUT /api/projects/:id/request-supervisor
// @access  Private (Student)
exports.requestSupervisor = async (req, res) => {
  try {
    const { supervisorId } = req.body;

    const project = await executeInTransaction(async (session) => {
      const currentProject = await withSession(Project.findById(req.params.id), session);

      if (!currentProject) {
        return res.status(404).json({
          success: false,
          message: 'Project not found'
        });
      }

      if (currentProject.student.toString() !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to update this project'
        });
      }

      if (currentProject.adminStatus === 'rejected') {
        return res.status(400).json({
          success: false,
          message: 'Supervisor cannot be requested because this project is rejected by admin'
        });
      }

      if (currentProject.supervisorStatus === 'accepted') {
        return res.status(400).json({
          success: false,
          message: 'Supervisor is already assigned and accepted for this project'
        });
      }

      const supervisor = await withSession(User.findById(supervisorId), session);
      if (!supervisor || supervisor.role !== 'faculty') {
        return res.status(400).json({
          success: false,
          message: 'Invalid supervisor'
        });
      }

      if (currentProject.supervisor && currentProject.supervisor.toString() === supervisorId && currentProject.supervisorStatus === 'pending') {
        return res.status(400).json({
          success: false,
          message: 'Supervisor request is already pending for this faculty member'
        });
      }

      currentProject.supervisor = supervisorId;
      currentProject.supervisorStatus = 'pending';
      appendAuditEntry(currentProject, {
        userId: req.user.id,
        action: 'supervisor_requested',
        changes: `Requested supervisor ${supervisorId}`
      });
      await currentProject.save(session ? { session } : undefined);

      await createNotification(
        supervisorId,
        req.user.id,
        'supervisor_requested',
        'New Supervision Request',
        `${req.user.name} has requested you as a supervisor for project: ${currentProject.title}`,
        currentProject._id,
        session
      );

      return currentProject;
    });

    if (res.headersSent || !project || !project._id) {
      return;
    }

    res.status(200).json({
      success: true,
      project
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'An error occurred. Please try again.'
    });
  }
};

// @desc    Accept/Reject supervisor request
// @route   PUT /api/projects/:id/supervisor-response
// @access  Private (Faculty)
exports.supervisorResponse = async (req, res) => {
  try {
    const { status } = req.body; // 'accepted' or 'rejected'

    const project = await executeInTransaction(async (session) => {
      const currentProject = await withSession(Project.findById(req.params.id), session);

      if (!currentProject) {
        return res.status(404).json({
          success: false,
          message: 'Project not found'
        });
      }

      if (!currentProject.supervisor || currentProject.supervisor.toString() !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to respond to this request'
        });
      }

      if (currentProject.supervisorStatus !== 'pending') {
        return res.status(400).json({
          success: false,
          message: 'This supervisor request is no longer pending'
        });
      }

      currentProject.supervisorStatus = status;
      if (status === 'rejected') {
        currentProject.supervisor = null;
      }
      appendAuditEntry(currentProject, {
        userId: req.user.id,
        action: 'supervisor_response',
        changes: `Supervisor request ${status}`
      });
      await currentProject.save(session ? { session } : undefined);

      await createNotification(
        currentProject.student,
        req.user.id,
        status === 'accepted' ? 'supervisor_accepted' : 'supervisor_rejected',
        `Supervisor Request ${status === 'accepted' ? 'Accepted' : 'Rejected'}`,
        `${req.user.name} has ${status} your supervision request for: ${currentProject.title}`,
        currentProject._id,
        session
      );

      return currentProject;
    });

    if (res.headersSent || !project || !project._id) {
      return;
    }

    res.status(200).json({
      success: true,
      project
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'An error occurred. Please try again.'
    });
  }
};

// @desc    Admin approve/reject project
// @route   PUT /api/projects/:id/admin-approval
// @access  Private (Admin)
exports.adminApproval = async (req, res) => {
  try {
    const { status } = req.body; // 'approved' or 'rejected'

    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    if (project.adminStatus !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'This project has already been reviewed by admin'
      });
    }

    if (status === 'approved' && project.supervisorStatus !== 'accepted') {
      return res.status(400).json({
        success: false,
        message: 'Project can be approved only after supervisor accepts the request'
      });
    }

    project.adminStatus = status;
    if (status === 'approved') {
      project.status = 'in-progress';
    } else {
      project.status = 'rejected';
    }
    appendAuditEntry(project, {
      userId: req.user.id,
      action: 'admin_approval',
      changes: `Admin marked project as ${status}`
    });
    await project.save();

    // Notify student
    await createNotification(
      project.student,
      req.user.id,
      status === 'approved' ? 'admin_approved' : 'admin_rejected',
      `Project ${status === 'approved' ? 'Approved' : 'Rejected'}`,
      `Your project "${project.title}" has been ${status} by admin`,
      project._id
    );

    // Notify supervisor if exists
    if (project.supervisor) {
      await createNotification(
        project.supervisor,
        req.user.id,
        status === 'approved' ? 'admin_approved' : 'admin_rejected',
        `Project ${status === 'approved' ? 'Approved' : 'Rejected'}`,
        `Project "${project.title}" has been ${status} by admin`,
        project._id
      );
    }

    res.status(200).json({
      success: true,
      project
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'An error occurred. Please try again.'
    });
  }
};

// @desc    Add feedback to project
// @route   POST /api/projects/:id/feedback
// @access  Private (Faculty, Admin)
exports.addFeedback = async (req, res) => {
  try {
    const message = sanitizeText(req.body.message || '');

    if (!message) {
      return res.status(400).json({
        success: false,
        message: 'Feedback message is required'
      });
    }

    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    project.feedback.push({
      from: req.user.id,
      message
    });
    appendAuditEntry(project, {
      userId: req.user.id,
      action: 'project_feedback_added',
      changes: 'General project feedback added'
    });
    await project.save();

    // Notify student
    await createNotification(
      project.student,
      req.user.id,
      'feedback_received',
      'New Feedback Received',
      `${req.user.name} has provided feedback on your project`,
      project._id
    );

    res.status(200).json({
      success: true,
      project
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'An error occurred. Please try again.'
    });
  }
};

// @desc    Upload document to project
// @route   POST /api/projects/:id/documents
// @access  Private
exports.uploadDocument = async (req, res) => {
  try {
    const title = sanitizeText(req.body.title || '');

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please upload a file'
      });
    }

    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    const canUpload =
      req.user.role === 'admin' ||
      (req.user.role === 'faculty' && project.supervisor && project.supervisor.toString() === req.user.id) ||
      isProjectContributor(project, req.user.id);

    if (!canUpload) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to upload documents to this project'
      });
    }

    if (title && title.trim().length > 150) {
      return res.status(400).json({
        success: false,
        message: 'Document title cannot exceed 150 characters'
      });
    }

    project.documents.push({
      title: title || req.file.originalname,
      filename: req.file.filename,
      originalName: req.file.originalname,
      path: req.file.path,
      size: req.file.size,
      uploadedBy: req.user.id
    });
    appendAuditEntry(project, {
      userId: req.user.id,
      action: 'document_uploaded',
      changes: `Document uploaded: ${title || req.file.originalname}`
    });
    await project.save();

    // Notify relevant parties
    if (req.user.role === 'student' && project.supervisor) {
      await createNotification(
        project.supervisor,
        req.user.id,
        'document_uploaded',
        'New Document Uploaded',
        `${req.user.name} uploaded a new document to project: ${project.title}`,
        project._id
      );
    }

    res.status(200).json({
      success: true,
      project
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'An error occurred. Please try again.'
    });
  }
};

// @desc    Update project progress
// @route   PUT /api/projects/:id/progress
// @access  Private (Faculty only)
exports.updateProgress = async (req, res) => {
  try {
    const progress = Number(req.body.progress);

    const project = await Project.findById(req.params.id)
      .populate('student', 'name email')
      .populate('teamMembers.student', 'name email');

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    if (!project.supervisor || project.supervisor.toString() !== req.user.id || project.supervisorStatus !== 'accepted') {
      return res.status(403).json({
        success: false,
        message: 'Only the assigned faculty supervisor can update progress'
      });
    }

    if (Number.isNaN(progress) || progress < 0 || progress > 100) {
      return res.status(400).json({
        success: false,
        message: 'Progress must be between 0 and 100'
      });
    }

    project.progress = progress;
    if (progress === 100) {
      project.status = 'completed';
      
      // Send completion emails to all team members and project owner
      const emailRecipients = [];
      
      // Add project owner
      if (project.student && project.student.email) {
        emailRecipients.push({
          email: project.student.email,
          name: project.student.name
        });
      }
      
      // Add accepted team members
      project.teamMembers.forEach((member) => {
        if (member.inviteStatus === 'accepted' && member.student && member.student.email) {
          emailRecipients.push({
            email: member.student.email,
            name: member.student.name
          });
        }
      });
      
      // Send emails to all recipients
      for (const recipient of emailRecipients) {
        try {
          await sendProjectCompletionEmail(
            recipient.email,
            project.title,
            recipient.name
          );
        } catch (emailError) {
          logger.error('Failed to send completion email', {
            email: recipient.email,
            message: emailError.message,
            stack: emailError.stack
          });
        }
      }
    }
    appendAuditEntry(project, {
      userId: req.user.id,
      action: 'project_progress_updated',
      changes: `Progress set to ${progress}%`
    });
    await project.save();

    res.status(200).json({
      success: true,
      project
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'An error occurred. Please try again.'
    });
  }
};

// @desc    Get pending team invitations for logged in student
// @route   GET /api/projects/team/invites
// @access  Private (Student)
exports.getTeamInvites = async (req, res) => {
  try {
    const projects = await Project.find({
      status: { $in: ['proposal', 'in-progress'] },
      teamMembers: {
        $elemMatch: {
          student: req.user.id,
          inviteStatus: 'pending'
        }
      }
    })
      .populate('student', 'name email enrollmentNumber')
      .sort('-createdAt');

    const invites = projects.map((project) => {
      const myInvite = project.teamMembers.find(
        (member) => member.student && member.student.toString() === req.user.id && member.inviteStatus === 'pending'
      );

      return {
        projectId: project._id,
        projectTitle: project.title,
        projectStatus: project.status,
        invitedBy: project.student,
        invitedAt: project.createdAt,
        inviteStatus: myInvite ? myInvite.inviteStatus : 'pending'
      };
    });

    res.status(200).json({
      success: true,
      count: invites.length,
      invites
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'An error occurred. Please try again.'
    });
  }
};

// @desc    Accept or reject a team invitation
// @route   PUT /api/projects/:id/team-invite-response
// @access  Private (Student)
exports.respondToTeamInvite = async (req, res) => {
  try {
    const { status } = req.body;
    if (!['accepted', 'rejected'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Status must be accepted or rejected'
      });
    }

    const project = await Project.findById(req.params.id).populate('student', 'name');
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    const member = project.teamMembers.find(
      (item) => item.student && item.student.toString() === req.user.id && item.inviteStatus === 'pending'
    );

    if (!member) {
      return res.status(404).json({
        success: false,
        message: 'No pending invite found for this project'
      });
    }

    if (status === 'accepted') {
      const alreadyActiveElsewhere = await isStudentInActiveProject(req.user.id, project._id);
      if (alreadyActiveElsewhere) {
        return res.status(400).json({
          success: false,
          message: 'You are already part of an active project and cannot join another one'
        });
      }
    }

    member.inviteStatus = status;
    member.respondedAt = new Date();
    appendAuditEntry(project, {
      userId: req.user.id,
      action: 'team_invite_response',
      changes: `Team invite ${status}`
    });
    await project.save();

    if (status === 'accepted') {
      await Project.updateMany(
        {
          _id: { $ne: project._id },
          status: { $in: ['proposal', 'in-progress'] },
          teamMembers: {
            $elemMatch: {
              student: req.user.id,
              inviteStatus: 'pending'
            }
          }
        },
        {
          $set: {
            'teamMembers.$[member].inviteStatus': 'rejected',
            'teamMembers.$[member].respondedAt': new Date()
          }
        },
        {
          arrayFilters: [
            {
              'member.student': req.user.id,
              'member.inviteStatus': 'pending'
            }
          ]
        }
      );
    }

    await createNotification(
      project.student._id,
      req.user.id,
      status === 'accepted' ? 'team_invite_accepted' : 'team_invite_rejected',
      status === 'accepted' ? 'Team Invite Accepted' : 'Team Invite Rejected',
      `${req.user.name} has ${status} your invitation for project: ${project.title}`,
      project._id
    );

    res.status(200).json({
      success: true,
      message: `Invitation ${status}`,
      project
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'An error occurred. Please try again.'
    });
  }
};

// @desc    Get all pending supervisor requests
// @route   GET /api/projects/supervisor/requests
// @access  Private (Faculty)
exports.getSupervisorRequests = async (req, res) => {
  try {
    const projects = await Project.find({
      supervisor: req.user.id,
      supervisorStatus: 'pending'
    })
      .populate('student', 'name email enrollmentNumber department')
      .sort('-createdAt');

    res.status(200).json({
      success: true,
      count: projects.length,
      projects
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'An error occurred. Please try again.'
    });
  }
};

// @desc    Get all projects pending admin approval
// @route   GET /api/projects/admin/pending
// @access  Private (Admin)
exports.getPendingProjects = async (req, res) => {
  try {
    const projects = await Project.find({
      adminStatus: 'pending'
    })
      .populate('student', 'name email enrollmentNumber department')
      .populate('supervisor', 'name email employeeId')
      .sort('-createdAt');

    res.status(200).json({
      success: true,
      count: projects.length,
      projects
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'An error occurred. Please try again.'
    });
  }
};

// @desc    Submit a project phase
// @route   PUT /api/projects/:id/phases/:phaseId/submit
// @access  Private (Student)
exports.submitPhase = async (req, res) => {
  try {
    const { link, comments } = req.body;

    const uploadedDocument = req.files?.document?.[0] || null;
    const uploadedVideo = req.files?.supportingVideo?.[0] || null;

    if (!uploadedDocument) {
      return res.status(400).json({ success: false, message: 'Please upload a phase file' });
    }

    if (isZipFile(uploadedDocument) && !uploadedVideo) {
      return res.status(400).json({
        success: false,
        message: 'A walkthrough video is required when uploading a ZIP or RAR file.'
      });
    }

    const project = await executeInTransaction(async (session) => {
      const currentProject = await withSession(
        Project.findById(req.params.id).populate('student', 'name'),
        session
      );

      if (!currentProject) {
        return res.status(404).json({ success: false, message: 'Project not found' });
      }

      if (currentProject.adminStatus !== 'approved' || currentProject.status !== 'in-progress') {
        return res.status(400).json({
          success: false,
          message: 'Phases can only be submitted for approved in-progress projects'
        });
      }

      if (!currentProject.supervisor || currentProject.supervisorStatus !== 'accepted') {
        return res.status(400).json({
          success: false,
          message: 'A supervisor must accept the request before phase submission'
        });
      }

      const isOwner = currentProject.student._id.toString() === req.user.id;
      const acceptedTeamMember = currentProject.teamMembers.find(
        (member) => member.student && member.student.toString() === req.user.id && member.inviteStatus === 'accepted'
      );

      if (!isOwner && !acceptedTeamMember) {
        return res.status(403).json({
          success: false,
          message: 'Only project owner or accepted team members can submit phases'
        });
      }

      const phase = currentProject.phases.id(req.params.phaseId);
      if (!phase) {
        return res.status(404).json({ success: false, message: 'Phase not found' });
      }

      const phaseIndex = currentProject.phases.findIndex((item) => item._id.toString() === phase._id.toString());
      const hasUnapprovedPreviousPhase = currentProject.phases
        .slice(0, phaseIndex)
        .some((item) => item.status !== 'approved');

      if (hasUnapprovedPreviousPhase) {
        return res.status(400).json({
          success: false,
          message: 'Please complete and get approval for the previous phase first.'
        });
      }

      if (!['pending', 'rejected'].includes(phase.status)) {
        return res.status(400).json({
          success: false,
          message: 'This phase is already submitted or approved.'
        });
      }

      if (!phase.submission) phase.submission = {};

      phase.submission.link = link;
      phase.submission.comments = comments;
      phase.submission.submittedAt = Date.now();
      phase.submission.submittedBy = req.user.id;

      phase.submission.fileUrl = uploadedDocument.path;
      phase.submission.fileName = uploadedDocument.originalname;
      phase.submission.fileSize = uploadedDocument.size;
      phase.submission.videoUrl = uploadedVideo ? uploadedVideo.path : null;
      phase.submission.videoName = uploadedVideo ? uploadedVideo.originalname : null;
      phase.submission.videoSize = uploadedVideo ? uploadedVideo.size : null;

      phase.status = 'submitted';
      appendAuditEntry(currentProject, {
        userId: req.user.id,
        action: 'phase_submitted',
        changes: `Submitted phase: ${phase.title}`
      });
      await currentProject.save(session ? { session } : undefined);

      if (currentProject.supervisor) {
        await createNotification(
          currentProject.supervisor,
          req.user.id,
          'phase_submitted',
          'Phase Submitted for Review',
          `${req.user.name} has submitted the ${phase.title} phase for review.`,
          currentProject._id,
          session
        );
      }

      if (!isOwner) {
        await createNotification(
          currentProject.student._id,
          req.user.id,
          'phase_submitted',
          'Team Member Submitted Phase',
          `${req.user.name} submitted the ${phase.title} phase for your project.`,
          currentProject._id,
          session
        );
      }

      return currentProject;
    });

    if (res.headersSent || !project || !project._id) {
      return;
    }

    res.status(200).json({ success: true, project });
  } catch (error) {
    res.status(400).json({ success: false, message: 'An error occurred. Please try again.' });
  }
};

// @desc    Evaluate (Approve/Reject) a project phase
// @route   PUT /api/projects/:id/phases/:phaseId/evaluate
// @access  Private (Faculty)
exports.evaluatePhase = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    if (!project.supervisor || project.supervisor.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Only the supervisor can evaluate' });
    }

    const phase = project.phases.id(req.params.phaseId);
    if (!phase) {
      return res.status(404).json({ success: false, message: 'Phase not found' });
    }

    const { status } = req.body; // status: 'approved' or 'rejected'
    const feedbackMessage = sanitizeText(req.body.feedback || '');

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Status must be approved or rejected' });
    }

    if (status === 'rejected' && !feedbackMessage) {
      return res.status(400).json({
        success: false,
        message: 'Feedback is required when rejecting a phase'
      });
    }

    if (phase.status !== 'submitted') {
      return res.status(400).json({
        success: false,
        message: 'Only submitted phases can be reviewed'
      });
    }

    phase.status = status;
    if (!Array.isArray(phase.feedback)) {
      phase.feedback = [];
    }
    if (feedbackMessage) {
      phase.feedback.push({
        from: req.user.id,
        message: feedbackMessage,
        timestamp: new Date(),
        role: req.user.role
      });
    }
    
    if (status === 'approved') {
      phase.approvedAt = Date.now();
      
      // Calculate overall progress based on approved phases
      const approvedPhasesCount = project.phases.filter(p => p.status === 'approved').length;
      const totalPhases = project.phases.length || 1;
      project.progress = Math.round((approvedPhasesCount / totalPhases) * 100);
      
      if (project.progress === 100) {
        project.status = 'completed';
      }
    }

    appendAuditEntry(project, {
      userId: req.user.id,
      action: 'phase_evaluated',
      changes: `Phase ${phase.title} marked as ${status}`
    });

    await project.save();

    // Notify student
    await createNotification(
      project.student,
      req.user.id,
      `phase_${status}`,
      `Phase ${status.charAt(0).toUpperCase() + status.slice(1)}`,
      `Your supervisor has ${status} the ${phase.title} phase.`,
      project._id
    );

    res.status(200).json({ success: true, project });
  } catch (error) {
    res.status(400).json({ success: false, message: 'An error occurred. Please try again.' });
  }
};

// @desc    Upload screen recording for code review
// @route   POST /api/projects/:id/screen-recording
// @access  Private (Student)
exports.uploadScreenRecording = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    if (project.status !== 'in-progress' || project.adminStatus !== 'approved') {
      return res.status(400).json({
        success: false,
        message: 'Screen recording can only be submitted for approved in-progress projects'
      });
    }

    // Only project owner (student) can upload screen recording
    if (project.student.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Only the project owner can upload screen recording'
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    // Initialize codeReview if it doesn't exist
    if (!project.codeReview) {
      project.codeReview = {};
    }

    project.codeReview.screenRecording = {
      filename: req.file.filename,
      originalName: req.file.originalname,
      path: req.file.path,
      size: req.file.size,
      uploadedAt: new Date()
    };

    project.codeReview.status = 'submitted';
    project.codeReview.submittedAt = new Date();

    appendAuditEntry(project, {
      userId: req.user.id,
      action: 'screen_recording_uploaded',
      changes: `Uploaded recording: ${req.file.originalname}`
    });

    await project.save();

    // Notify supervisor about submission
    if (project.supervisor) {
      await createNotification(
        project.supervisor,
        req.user.id,
        'code_review_submitted',
        'Screen Recording Submitted for Review',
        `${req.user.name} has submitted a screen recording for your review on project: ${project.title}`,
        project._id
      );
    }

    res.status(200).json({
      success: true,
      message: 'Screen recording uploaded successfully',
      project
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'An error occurred. Please try again.'
    });
  }
};

// @desc    Review screen recording submission
// @route   PUT /api/projects/:id/screen-recording/review
// @access  Private (Faculty/Admin)
exports.reviewScreenRecording = async (req, res) => {
  try {
    const { status } = req.body;
    const feedback = sanitizeText(req.body.feedback || '');

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Status must be approved or rejected'
      });
    }

    if (status === 'rejected' && (!feedback || !feedback.trim())) {
      return res.status(400).json({
        success: false,
        message: 'Feedback is required when rejecting a screen recording'
      });
    }

    const project = await Project.findById(req.params.id).populate('student', 'name email');

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    const canReview =
      req.user.role === 'admin' ||
      (req.user.role === 'faculty' && project.supervisor && project.supervisor.toString() === req.user.id);

    if (!canReview) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to review this screen recording'
      });
    }

    if (!project.codeReview || project.codeReview.status !== 'submitted') {
      return res.status(400).json({
        success: false,
        message: 'No submitted screen recording available for review'
      });
    }

    project.codeReview.status = status;
    project.codeReview.feedback = feedback;
    project.codeReview.reviewedAt = new Date();
    project.codeReview.reviewedBy = req.user.id;

    appendAuditEntry(project, {
      userId: req.user.id,
      action: 'screen_recording_reviewed',
      changes: `Screen recording ${status}`
    });

    await project.save();

    await createNotification(
      project.student._id,
      req.user.id,
      status === 'approved' ? 'code_review_approved' : 'code_review_rejected',
      `Screen Recording ${status.charAt(0).toUpperCase() + status.slice(1)}`,
      `Your screen recording for project: ${project.title} has been ${status}.`,
      project._id
    );

    res.status(200).json({
      success: true,
      message: `Screen recording ${status}`,
      project
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'An error occurred. Please try again.'
    });
  }
};
