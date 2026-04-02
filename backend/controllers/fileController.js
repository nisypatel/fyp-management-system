const path = require('path');
const fs = require('fs');
const Project = require('../models/Project');

// @desc    Download file
// @route   GET /api/files/download/:filename
// @access  Private
exports.downloadFile = async (req, res) => {
  try {
    const { filename } = req.params;
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
        { 'documents.filename': filename }
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
      (project.supervisor && project.supervisor.toString() === req.user.id);

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
    } else {
      const doc = project.documents.find(d => d.filename === filename);
      if (doc) {
        originalName = doc.originalName;
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
      message: error.message
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
    await project.save();

    res.status(200).json({
      success: true,
      message: 'File deleted successfully'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};
