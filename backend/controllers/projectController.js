const Project = require('../models/Project');
const User = require('../models/User');
const Notification = require('../models/Notification');
const path = require('path');
const fs = require('fs');

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

// @desc    Create new project proposal
// @route   POST /api/projects
// @access  Private (Student)
exports.createProject = async (req, res) => {
  try {
    const { title, description, category, technologies, teamMembers } = req.body;

    // Check if student already has a pending or active project
    const existingProject = await Project.findOne({
      student: req.user.id,
      status: { $in: ['proposal', 'in-progress'] }
    });

    if (existingProject) {
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
      teamMembers: teamMembers ? JSON.parse(teamMembers) : [],
      student: req.user.id
    };

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
      query.student = req.user.id;
    } else if (req.user.role === 'teacher') {
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
    if (req.user.role === 'student' && project.student._id.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this project'
      });
    }

    if (req.user.role === 'teacher' && (!project.supervisor || project.supervisor._id.toString() !== req.user.id)) {
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

    // Verify supervisor is a teacher
    const supervisor = await User.findById(supervisorId);
    if (!supervisor || supervisor.role !== 'teacher') {
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
// @access  Private (Teacher)
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
// @access  Private (Teacher, Admin)
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
// @access  Private (Student, Teacher)
exports.updateProgress = async (req, res) => {
  try {
    const { progress } = req.body;

    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    project.progress = progress;
    if (progress === 100) {
      project.status = 'completed';
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

// @desc    Get all pending supervisor requests
// @route   GET /api/projects/supervisor/requests
// @access  Private (Teacher)
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
