const multer = require('multer');
const path = require('path');
const fs = require('fs');

const documentExtensions = new Set(['.pdf', '.doc', '.docx', '.ppt', '.pptx', '.zip', '.rar', '.jpg', '.jpeg', '.png']);
const documentMimeTypes = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/zip',
  'application/x-zip-compressed',
  'application/vnd.rar',
  'application/x-rar-compressed',
  'image/jpeg',
  'image/png'
]);

const videoExtensions = new Set(['.mp4', '.webm', '.avi', '.mov', '.mkv', '.flv', '.wmv']);
const videoMimeTypes = new Set([
  'video/mp4',
  'video/webm',
  'video/x-msvideo',
  'video/quicktime',
  'video/x-matroska',
  'video/x-flv',
  'video/x-ms-wmv'
]);

const isAllowedDocument = (file) => {
  const ext = path.extname(file.originalname || '').toLowerCase();
  return documentExtensions.has(ext) && documentMimeTypes.has((file.mimetype || '').toLowerCase());
};

const isAllowedVideo = (file) => {
  const ext = path.extname(file.originalname || '').toLowerCase();
  return videoExtensions.has(ext) && videoMimeTypes.has((file.mimetype || '').toLowerCase());
};

// Create uploads directory if it doesn't exist
const uploadDir = './uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// File filter for documents
const docFileFilter = (req, file, cb) => {
  if (isAllowedDocument(file)) {
    return cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only PDF, DOC, DOCX, PPT, PPTX, ZIP, RAR, JPG, JPEG, PNG are allowed.'));
  }
};

const phaseFileFilter = (req, file, cb) => {
  const isDocument = isAllowedDocument(file);
  const isVideo = isAllowedVideo(file);

  if (isDocument || isVideo) {
    return cb(null, true);
  }

  cb(new Error('Invalid file type. Upload a supported document or video file'));
};

// File filter for videos
const videoFileFilter = (req, file, cb) => {
  if (isAllowedVideo(file)) {
    return cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only MP4, WebM, AVI, MOV, MKV, FLV, WMV are allowed.'));
  }
};

// Multer upload configuration for documents
const upload = multer({
  storage: storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024 // 10MB default
  },
  fileFilter: docFileFilter
});

// Multer upload configuration for screen recordings (larger file size limit)
const uploadVideo = multer({
  storage: storage,
  limits: {
    fileSize: parseInt(process.env.MAX_VIDEO_FILE_SIZE, 10) || 500 * 1024 * 1024
  },
  fileFilter: videoFileFilter
});

const phaseUpload = multer({
  storage: storage,
  limits: {
    fileSize: parseInt(process.env.MAX_PHASE_FILE_SIZE, 10) || 500 * 1024 * 1024,
    files: 2
  },
  fileFilter: phaseFileFilter
});

// Error handling middleware for multer
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File too large. Please upload a smaller file.'
      });
    }

    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        message: 'Too many files uploaded. Please follow the allowed file count.'
      });
    }
    return res.status(400).json({
      success: false,
      message: err.message
    });
  } else if (err) {
    return res.status(400).json({
      success: false,
      message: err.message
    });
  }
  next();
};

module.exports = { upload, uploadVideo, phaseUpload, handleMulterError };
