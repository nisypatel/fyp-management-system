const path = require('path');
const fs = require('fs');
const Project = require('../models/Project');
const { appendAuditEntry } = require('../utils/auditTrail');
const { buildCloudinaryDownloadUrl, buildCloudinaryPreviewUrl, deleteFromCloudinary, isCloudinaryConfigured } = require('../utils/cloudinary');

const getFileDisplayName = (fileRecord = {}, fallback = 'download') => (
  fileRecord.original_filename ||
  fileRecord.originalName ||
  fileRecord.fileName ||
  fallback
);

const contentTypeToExtension = (ct = '') => {
  if (!ct) return '';
  ct = String(ct).split(';')[0].trim().toLowerCase();
  const map = {
    'application/pdf': 'pdf',
    'application/msword': 'doc',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
    'application/vnd.ms-powerpoint': 'ppt',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
    'application/vnd.ms-excel': 'xls',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/gif': 'gif'
  };
  return map[ct] || '';
};

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

    const escapeRegex = (value = '') => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const searchRegex = new RegExp(escapeRegex(filename), 'i');

    const project = await Project.findOne({
      $or: [
        { 'proposalFile.public_id': searchRegex },
        { 'proposalFile.original_filename': searchRegex },
        { 'proposalFile.filename': searchRegex },
        { 'proposalFile.originalName': searchRegex },
        { 'proposalFile.fileUrl': searchRegex },
        { 'proposalFile.secure_url': searchRegex },
        { 'proposalFile.url': searchRegex },
        { 'proposalFile.path': searchRegex },
        { 'documents.public_id': searchRegex },
        { 'documents.original_filename': searchRegex },
        { 'documents.filename': searchRegex },
        { 'documents.originalName': searchRegex },
        { 'documents.fileUrl': searchRegex },
        { 'documents.secure_url': searchRegex },
        { 'documents.url': searchRegex },
        { 'documents.path': searchRegex },
        { 'codeReview.screenRecording.public_id': searchRegex },
        { 'codeReview.screenRecording.original_filename': searchRegex },
        { 'codeReview.screenRecording.filename': searchRegex },
        { 'codeReview.screenRecording.originalName': searchRegex },
        { 'codeReview.screenRecording.fileUrl': searchRegex },
        { 'codeReview.screenRecording.secure_url': searchRegex },
        { 'codeReview.screenRecording.url': searchRegex },
        { 'codeReview.screenRecording.path': searchRegex },
        { 'phases.submission.filePublicId': searchRegex },
        { 'phases.submission.fileOriginalFilename': searchRegex },
        { 'phases.submission.fileName': searchRegex },
        { 'phases.submission.fileUrl': searchRegex },
        { 'phases.submission.secure_url': searchRegex },
        { 'phases.submission.url': searchRegex },
        { 'phases.submission.path': searchRegex },
        { 'phases.submission.videoPublicId': searchRegex },
        { 'phases.submission.videoOriginalFilename': searchRegex },
        { 'phases.submission.videoName': searchRegex },
        { 'phases.submission.videoUrl': searchRegex }
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
    const wantInline = String(req.query.inline || '').trim() === '1';

    // Ensure downloaded filename contains a sensible extension when possible.
    let displayName = getFileDisplayName(fileRecord, filename) || filename;
    const hasExt = /\.[^./\\]+$/.test(displayName);
    const format = String(fileRecord?.format || '').trim();
    if (!hasExt && format) {
      displayName = `${displayName}.${format}`;
    }

    const cloudinaryDownloadUrl = buildCloudinaryDownloadUrl(fileRecord, {
      filename: displayName
    });

    if (cloudinaryDownloadUrl) {
      // If caller requests inline preview, stream the Cloudinary preview through the server
      // This avoids CORS and cross-origin iframe/blob access issues in the browser
      if (wantInline) {
        const src = fileRecord?.secure_url || fileRecord?.url || fileRecord?.path || cloudinaryDownloadUrl;
        const previewUrl = (typeof buildCloudinaryOptimizedPreviewUrl === 'function')
          ? buildCloudinaryOptimizedPreviewUrl(src, (fileRecord && fileRecord.format) || 'raw')
          : (buildCloudinaryPreviewUrl(fileRecord) || cloudinaryDownloadUrl);

        try {
          const client = previewUrl.startsWith('https') ? require('https') : require('http');
          return client.get(previewUrl, (cloudRes) => {
            if (cloudRes.statusCode >= 400) {
              return res.status(502).json({ success: false, message: 'Unable to fetch preview' });
            }

            // If displayName lacks extension, try to infer from content-type
            if (cloudRes.headers['content-type'] && !/\.[^./\\]+$/.test(displayName)) {
              const inferred = contentTypeToExtension(cloudRes.headers['content-type']);
              if (inferred) {
                displayName = `${displayName}.${inferred}`;
              }
            }

            if (cloudRes.headers['content-type']) res.setHeader('Content-Type', cloudRes.headers['content-type']);
            if (cloudRes.headers['content-length']) res.setHeader('Content-Length', cloudRes.headers['content-length']);
            if (cloudRes.headers['cache-control']) res.setHeader('Cache-Control', cloudRes.headers['cache-control']);

            // Suggest inline disposition for preview requests
            res.setHeader('Content-Disposition', `inline; filename="${displayName}"`);

            cloudRes.pipe(res);
          }).on('error', (err) => {
            return res.status(502).json({ success: false, message: 'Error fetching preview' });
          });
        } catch (err) {
          return res.status(502).json({ success: false, message: 'Error fetching preview' });
        }
      }

      // For downloads: stream the Cloudinary download URL through the server so we can set
      // a proper filename (including inferred extension) rather than redirecting.
      try {
        const client = cloudinaryDownloadUrl.startsWith('https') ? require('https') : require('http');
        return client.get(cloudinaryDownloadUrl, (cloudRes) => {
          if (cloudRes.statusCode >= 400) {
            return res.status(502).json({ success: false, message: 'Unable to fetch file' });
          }

          if (cloudRes.headers['content-type'] && !/\.[^./\\]+$/.test(displayName)) {
            const inferred = contentTypeToExtension(cloudRes.headers['content-type']);
            if (inferred) {
              displayName = `${displayName}.${inferred}`;
            }
          }

          if (cloudRes.headers['content-type']) res.setHeader('Content-Type', cloudRes.headers['content-type']);
          if (cloudRes.headers['content-length']) res.setHeader('Content-Length', cloudRes.headers['content-length']);
          if (cloudRes.headers['cache-control']) res.setHeader('Cache-Control', cloudRes.headers['cache-control']);

          res.setHeader('Content-Disposition', `attachment; filename="${displayName}"`);
          cloudRes.pipe(res);
        }).on('error', (err) => {
          // Fallback to redirect if streaming fails
          return res.redirect(cloudinaryDownloadUrl);
        });
      } catch (err) {
        return res.redirect(cloudinaryDownloadUrl);
      }
    }

    const filePath = path.join(__dirname, '../uploads', filename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: 'File not found'
      });
    }
    // If caller requested inline preview, send the file with inline disposition
    // reuse computed displayName (includes extension when available)
    if (wantInline) {
      try {
        // If filename lacks extension, check for PDF signature in file bytes
        if (!/\.[^./\\]+$/.test(displayName)) {
          const fd = fs.openSync(filePath, 'r');
          const header = Buffer.alloc(4);
          fs.readSync(fd, header, 0, 4, 0);
          fs.closeSync(fd);
          const sig = header.toString('utf8', 0, 4);
          if (sig === '%PDF') {
            displayName = `${displayName}.pdf`;
            res.setHeader('Content-Type', 'application/pdf');
          }
        }

        res.setHeader('Content-Disposition', `inline; filename="${displayName}"`);
        return res.sendFile(filePath, (err) => {
          if (err) {
            res.status(500).json({ success: false, message: 'Error sending file' });
          }
        });
      } catch (err) {
        return res.status(500).json({ success: false, message: 'Error sending file' });
      }
    }

    res.download(filePath, displayName, (err) => {
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
