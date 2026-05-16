const path = require('path');
const fs = require('fs');
const Project = require('../models/Project');
const { appendAuditEntry } = require('../utils/auditTrail');
const { buildCloudinaryDownloadUrl, deleteFromCloudinary, isCloudinaryConfigured } = require('../utils/cloudinary');

const getFileDisplayName = (fileRecord = {}, fallback = 'download') => (
  fileRecord.original_filename ||
  fileRecord.originalName ||
  fileRecord.fileName ||
  fallback
);

const getFileSearchValues = (fileRecord = {}) => [
  fileRecord.public_id,
  fileRecord.publicId,
  fileRecord.filename,
  fileRecord.original_filename,
  fileRecord.originalName,
  fileRecord.filePublicId,
  fileRecord.videoPublicId,
  fileRecord.fileOriginalFilename,
  fileRecord.videoOriginalFilename,
  fileRecord.fileUrl,
  fileRecord.videoUrl,
  fileRecord.secure_url,
  fileRecord.path,
  fileRecord.url
].filter(Boolean);

const matchesFileReference = (fileRecord = {}, reference = '') => {
  if (!reference) return false;
  const values = getFileSearchValues(fileRecord);
  return values.some((value) => String(value).includes(reference) || String(value).endsWith(reference));
};

const findProjectFile = (project, reference) => {
  if (!project || !reference) return null;

  if (project.proposalFile && matchesFileReference(project.proposalFile, reference)) {
    return { type: 'proposalFile', file: project.proposalFile };
  }

  const document = project.documents?.find((item) => matchesFileReference(item, reference));
  if (document) {
    return { type: 'document', file: document };
  }

  if (project.codeReview?.screenRecording && matchesFileReference(project.codeReview.screenRecording, reference)) {
    return { type: 'screenRecording', file: project.codeReview.screenRecording };
  }

  for (const phase of project.phases || []) {
    const submission = phase.submission || {};
    if (matchesFileReference(submission, reference)) {
      return { type: 'phaseSubmission', file: submission };
    }
  }

  return null;
};

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

    const project = await Project.findOne({
      $or: [
        { 'proposalFile.public_id': filename },
        { 'proposalFile.original_filename': filename },
        { 'documents.public_id': filename },
        { 'documents.original_filename': filename },
        { 'codeReview.screenRecording.public_id': filename },
        { 'codeReview.screenRecording.original_filename': filename },
        { 'phases.submission.filePublicId': filename },
        { 'phases.submission.fileOriginalFilename': filename },
        { 'phases.submission.videoPublicId': filename },
        { 'phases.submission.videoOriginalFilename': filename }
      ]
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'File not found'
      });
    }

    const resolvedFile = findProjectFile(project, filename);
    if (!resolvedFile) {
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

    const fileRecord = resolvedFile.file;
    const cloudinaryDownloadUrl = buildCloudinaryDownloadUrl(fileRecord, {
      filename: getFileDisplayName(fileRecord, filename)
    });

    if (cloudinaryDownloadUrl) {
      return res.redirect(cloudinaryDownloadUrl);
    }

    const filePath = path.join(__dirname, '../uploads', filename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: 'File not found'
      });
    }

    res.download(filePath, getFileDisplayName(fileRecord, filename), (err) => {
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

    const documentPublicId = document.public_id || document.publicId;
    if (documentPublicId && isCloudinaryConfigured()) {
      await deleteFromCloudinary(documentPublicId, { resource_type: document.resource_type || 'raw' });
    } else if (document.path) {
      const filePath = path.join(__dirname, '..', document.path);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
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
