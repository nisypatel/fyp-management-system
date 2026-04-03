const Project = require('../models/Project');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { sendProjectCompletionEmail } = require('../utils/sendEmail');
const path = require('path');
const fs = require('fs');

const isStudentInActiveProject = async (studentId, excludeProjectId = null) => {
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

  const project = await Project.findOne(query).select('_id');
  return Boolean(project);
};

// Helper function to create notification
const createNotification = async (recipient, sender, type, title, message, projectId) => {
  await Notification.create({
    recipient,
    sender,
    type,
    title,
    message,
    relatedProject: projectId
  });
};

const PHASE_SEQUENCE = ['Synopsis', 'Design/UML', 'Frontend', 'Backend', 'Testing & Report'];

const isZipFile = (file) => {
  if (!file) return false;
  const extension = path.extname(file.originalname).toLowerCase();
  return extension === '.zip' || extension === '.rar';
};

// @desc    Create new project proposal
// @route   POST /api/projects
// @access  Private (Student)
exports.createProject = async (req, res) => {
  try {
    const { title, description, category, technologies, teamMembers } = req.body;

    const studentAlreadyActive = await isStudentInActiveProject(req.user.id);
    if (studentAlreadyActive) {
      return res.status(400).json({
        success: false,
        message: 'You already have an active project'
      });
    }

    const projectData = {
      title,
      description,
      category,
      technologies: technologies ? JSON.parse(technologies) : [],
      teamMembers: [],
      student: req.user.id
    };

    // Handle Team Members Verification Flow
    if (teamMembers) {
      const memberEmails = JSON.parse(teamMembers);
      const seenEmails = new Set();
      // Process emails
      if (Array.isArray(memberEmails) && memberEmails.length > 0) {
        for (let email of memberEmails) {
          if (!email || email.trim() === '') continue;

          const normalizedEmail = email.trim().toLowerCase();
          if (seenEmails.has(normalizedEmail)) {
            continue;
          }
          seenEmails.add(normalizedEmail);
          
          const memberUser = await User.findOne({ email: normalizedEmail, role: 'student' });
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

          const memberAlreadyActive = await isStudentInActiveProject(memberUser._id);
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
    }

    // Handle file upload if present
    if (req.file) {
      projectData.proposalFile = {
        filename: req.file.filename,
        originalName: req.file.originalname,
        path: req.file.path,
        size: req.file.size,
        uploadedAt: new Date()
      };
    }

    const project = await Project.create(projectData);

    // Notify invited team members for response.
    for (let member of project.teamMembers) {
      if (member.student) {
        await createNotification(
          member.student,
          req.user.id,
          'team_invited',
          'Team Invitation',
          `${req.user.name} invited you to join the team for project: ${title}`,
          project._id
        );
      }
    }

    // Notify all admins
    const admins = await User.find({ role: 'admin' });
    for (let admin of admins) {
      await createNotification(
        admin._id,
        req.user.id,
        'project_submitted',
        'New Project Proposal',
        `${req.user.name} has submitted a new project proposal: ${title}`,
        project._id
      );
    }

    res.status(201).json({
      success: true,
      project
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get all projects (with filters based on role)
// @route   GET /api/projects
// @access  Private
exports.getProjects = async (req, res) => {
  try {
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

    const projects = await Project.find(query)
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
      message: error.message
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
      message: error.message
    });
  }
};

// @desc    Request supervisor for project
// @route   PUT /api/projects/:id/request-supervisor
// @access  Private (Student)
exports.requestSupervisor = async (req, res) => {
  try {
    const { supervisorId } = req.body;

    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    if (project.student.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this project'
      });
    }

    // Verify supervisor is a faculty
    const supervisor = await User.findById(supervisorId);
    if (!supervisor || supervisor.role !== 'faculty') {
      return res.status(400).json({
        success: false,
        message: 'Invalid supervisor'
      });
    }

    project.supervisor = supervisorId;
    project.supervisorStatus = 'pending';
    await project.save();

    // Notify supervisor
    await createNotification(
      supervisorId,
      req.user.id,
      'supervisor_requested',
      'New Supervision Request',
      `${req.user.name} has requested you as a supervisor for project: ${project.title}`,
      project._id
    );

    res.status(200).json({
      success: true,
      project
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Accept/Reject supervisor request
// @route   PUT /api/projects/:id/supervisor-response
// @access  Private (Faculty)
exports.supervisorResponse = async (req, res) => {
  try {
    const { status } = req.body; // 'accepted' or 'rejected'

    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    if (!project.supervisor || project.supervisor.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to respond to this request'
      });
    }

    project.supervisorStatus = status;
    if (status === 'rejected') {
      project.supervisor = null;
    }
    await project.save();

    // Notify student
    await createNotification(
      project.student,
      req.user.id,
      status === 'accepted' ? 'supervisor_accepted' : 'supervisor_rejected',
      `Supervisor Request ${status === 'accepted' ? 'Accepted' : 'Rejected'}`,
      `${req.user.name} has ${status} your supervision request for: ${project.title}`,
      project._id
    );

    res.status(200).json({
      success: true,
      project
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
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

    project.adminStatus = status;
    if (status === 'approved') {
      project.status = 'in-progress';
    } else {
      project.status = 'rejected';
    }
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
      message: error.message
    });
  }
};

// @desc    Add feedback to project
// @route   POST /api/projects/:id/feedback
// @access  Private (Faculty, Admin)
exports.addFeedback = async (req, res) => {
  try {
    const { message } = req.body;

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
      message: error.message
    });
  }
};

// @desc    Upload document to project
// @route   POST /api/projects/:id/documents
// @access  Private
exports.uploadDocument = async (req, res) => {
  try {
    const { title } = req.body;

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

    project.documents.push({
      title: title || req.file.originalname,
      filename: req.file.filename,
      originalName: req.file.originalname,
      path: req.file.path,
      size: req.file.size,
      uploadedBy: req.user.id
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
      message: error.message
    });
  }
};

// @desc    Update project progress
// @route   PUT /api/projects/:id/progress
// @access  Private (Faculty only)
exports.updateProgress = async (req, res) => {
  try {
    const { progress } = req.body;

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

    if (typeof progress !== 'number' || progress < 0 || progress > 100) {
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
          console.error(`Failed to send completion email to ${recipient.email}:`, emailError);
        }
      }
    }
    await project.save();

    res.status(200).json({
      success: true,
      project
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
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
      message: error.message
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
      message: error.message
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
      message: error.message
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
      message: error.message
    });
  }
};

// @desc    Submit a project phase
// @route   PUT /api/projects/:id/phases/:phaseId/submit
// @access  Private (Student)
exports.submitPhase = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id).populate('student', 'name');

    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    const isOwner = project.student._id.toString() === req.user.id;
    const acceptedTeamMember = project.teamMembers.find(
      (member) => member.student && member.student.toString() === req.user.id && member.inviteStatus === 'accepted'
    );

    if (!isOwner && !acceptedTeamMember) {
      return res.status(403).json({
        success: false,
        message: 'Only project owner or accepted team members can submit phases'
      });
    }

    const phase = project.phases.id(req.params.phaseId);
    if (!phase) {
      return res.status(404).json({ success: false, message: 'Phase not found' });
    }

    const phaseIndex = project.phases.findIndex((item) => item._id.toString() === phase._id.toString());
    const hasUnapprovedPreviousPhase = project.phases
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
    
    // Initialize submission object if it doesn't exist
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
    await project.save();

    // Notify Supervisor
    if (project.supervisor) {
      await createNotification(
        project.supervisor,
        req.user.id,
        'phase_submitted',
        'Phase Submitted for Review',
        `${req.user.name} has submitted the ${phase.title} phase for review.`,
        project._id
      );
    }

    if (!isOwner) {
      await createNotification(
        project.student._id,
        req.user.id,
        'phase_submitted',
        'Team Member Submitted Phase',
        `${req.user.name} submitted the ${phase.title} phase for your project.`,
        project._id
      );
    }

    res.status(200).json({ success: true, project });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
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

    if (!PHASE_SEQUENCE.includes(phase.title)) {
      return res.status(400).json({ success: false, message: 'Invalid phase' });
    }

    const { status, feedback } = req.body; // status: 'approved' or 'rejected'

    if (phase.status !== 'submitted') {
      return res.status(400).json({
        success: false,
        message: 'Only submitted phases can be reviewed'
      });
    }

    phase.status = status;
    phase.feedback = feedback;
    
    if (status === 'approved') {
      phase.approvedAt = Date.now();
      
      // Calculate overall progress based on approved phases
      const approvedPhasesCount = project.phases.filter(p => p.status === 'approved').length;
      project.progress = approvedPhasesCount * 20; // 5 phases = 20% each
      
      if (project.progress === 100) {
        project.status = 'completed';
      }
    }

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
    res.status(400).json({ success: false, message: error.message });
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
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
      uploadedAt: new Date()
    };

    project.codeReview.status = 'submitted';
    project.codeReview.submittedAt = new Date();

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
      message: error.message
    });
  }
};

// @desc    Review screen recording submission
// @route   PUT /api/projects/:id/screen-recording/review
// @access  Private (Faculty/Admin)
exports.reviewScreenRecording = async (req, res) => {
  try {
    const { status, feedback } = req.body;

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Status must be approved or rejected'
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
      message: error.message
    });
  }
};
