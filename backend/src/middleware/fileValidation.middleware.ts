import { Request, Response, NextFunction } from 'express';

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg',
  'image/png',
  'image/jpg',
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export const validateFileUpload = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.file) {
    res.status(400).json({
      success: false,
      message: 'No file uploaded',
    });
    return;
  }

  // Check file size
  if (req.file.size > MAX_FILE_SIZE) {
    res.status(400).json({
      success: false,
      message: 'File size exceeds 10MB limit',
    });
    return;
  }

  // Check MIME type
  if (!ALLOWED_MIME_TYPES.includes(req.file.mimetype)) {
    res.status(400).json({
      success: false,
      message: 'File type not allowed. Only PDF, Word documents, and images (JPEG, PNG) are permitted.',
    });
    return;
  }

  // Sanitize filename - remove potentially dangerous characters
  const sanitizedFilename = req.file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
  req.file.originalname = sanitizedFilename;

  next();
};
