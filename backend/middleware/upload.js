const multer = require('multer');
const path = require('path');
const fs = require('fs');

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
  // Allowed file types for documents
  const allowedTypes = /pdf|doc|docx|ppt|pptx|zip|rar|jpg|jpeg|png/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only PDF, DOC, DOCX, PPT, PPTX, ZIP, RAR, JPG, JPEG, PNG are allowed'));
  }
};

const phaseFileFilter = (req, file, cb) => {
  const documentTypes = /pdf|doc|docx|ppt|pptx|zip|rar|jpg|jpeg|png/;
  const videoTypes = /mp4|webm|avi|mov|mkv|flv|wmv/;
  const extname = path.extname(file.originalname).toLowerCase();
  const isDocument = documentTypes.test(extname) && documentTypes.test(file.mimetype);
  const isVideo = videoTypes.test(extname) && videoTypes.test(file.mimetype);

  if (isDocument || isVideo) {
    return cb(null, true);
  }

  cb(new Error('Invalid file type. Upload a supported document or video file'));
};

// File filter for videos
const videoFileFilter = (req, file, cb) => {
  // Allowed file types for videos
  const allowedTypes = /mp4|webm|avi|mov|mkv|flv|wmv/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only MP4, WebM, AVI, MOV, MKV, FLV, WMV are allowed'));
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
    fileSize: 500 * 1024 * 1024 // 500MB for videos
  },
  fileFilter: videoFileFilter
});

const phaseUpload = multer({
  storage: storage,
  limits: {
    fileSize: 500 * 1024 * 1024
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
