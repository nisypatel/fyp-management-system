const path = require('path');
const fs = require('fs');
const Project = require('../models/Project');
const { appendAuditEntry } = require('../utils/auditTrail');

// @desc    Download file
// @route   GET /api/files/download/:filename
// @access  Private
exports.downloadFile = async (req, res) => {
  try {
    const { filename } = req.params;
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return res.status(400).json({
        success: false,
        message: 'Invalid filename'
      });
    }

    const filePath = path.join(__dirname, '../uploads', filename);

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: 'File not found'
      });
    }

    // Verify user has access to this file
    const project = await Project.findOne({
      $or: [
        { 'proposalFile.filename': filename },
        { 'documents.filename': filename },
        { 'codeReview.screenRecording.filename': filename },
        { 'phases.submission.fileUrl': { $regex: `${filename}$` } },
        { 'phases.submission.videoUrl': { $regex: `${filename}$` } }
      ]
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'File not found'
      });
    }

    // Check authorization
    const isAuthorized = 
      req.user.role === 'admin' ||
      project.student.toString() === req.user.id ||
      (project.supervisor && project.supervisor.toString() === req.user.id) ||
      project.teamMembers.some(
        (member) => member.student && member.student.toString() === req.user.id && member.inviteStatus === 'accepted'
      );

    if (!isAuthorized) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to download this file'
      });
    }

    // Get original filename
    let originalName = filename;
    if (project.proposalFile && project.proposalFile.filename === filename) {
      originalName = project.proposalFile.originalName;
    } else if (project.codeReview?.screenRecording?.filename === filename) {
      originalName = project.codeReview.screenRecording.originalName || filename;
    } else {
      const doc = project.documents.find(d => d.filename === filename);
      if (doc) {
        originalName = doc.originalName;
      } else {
        const phaseWithFile = project.phases.find((phase) => phase.submission && (
          (phase.submission.fileUrl && phase.submission.fileUrl.endsWith(filename)) ||
          (phase.submission.videoUrl && phase.submission.videoUrl.endsWith(filename))
        ));

        if (phaseWithFile) {
          if (phaseWithFile.submission.fileUrl && phaseWithFile.submission.fileUrl.endsWith(filename)) {
            originalName = phaseWithFile.submission.fileName || filename;
          } else {
            originalName = phaseWithFile.submission.videoName || filename;
          }
        }
      }
    }

    res.download(filePath, originalName, (err) => {
      if (err) {
        res.status(500).json({
          success: false,
          message: 'Error downloading file'
        });
      }
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'An error occurred. Please try again.'
    });
  }
};

// @desc    Delete file
// @route   DELETE /api/files/:projectId/:documentId
// @access  Private
exports.deleteFile = async (req, res) => {
  try {
    const { projectId, documentId } = req.params;

    const project = await Project.findById(projectId);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    // Check authorization
    if (req.user.role !== 'admin' && project.student.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }

    const documentIndex = project.documents.findIndex(
      doc => doc._id.toString() === documentId
    );

    if (documentIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }

    const document = project.documents[documentIndex];
    const filePath = path.join(__dirname, '..', document.path);

    // Delete file from filesystem
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Remove from database
    project.documents.splice(documentIndex, 1);
    appendAuditEntry(project, {
      userId: req.user.id,
      action: 'document_deleted',
      changes: `Document deleted: ${document.originalName || document.filename}`
    });
    await project.save();

    res.status(200).json({
      success: true,
      message: 'File deleted successfully'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'An error occurred. Please try again.'
    });
  }
};
