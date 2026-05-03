const logger = require('../utils/logger');

const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log to console for dev (but don't expose full error to client)
  logger.error('Unhandled request error', {
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    name: err.name,
    code: err.code,
    path: req.originalUrl,
    method: req.method
  });

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    const message = 'Invalid resource ID';
    error = { message, statusCode: 404 };
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const duplicateField = Object.keys(err.keyValue || {})[0];
    const message = duplicateField
      ? `A record with this ${duplicateField} already exists`
      : 'This record already exists';
    error = { message, statusCode: 400 };
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map((val) => ({
      field: val.path,
      message: val.message
    }));
    error = { message: 'Validation failed', errors, statusCode: 400 };
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    error = { message: 'Invalid authentication token', statusCode: 401 };
  }

  if (err.name === 'TokenExpiredError') {
    error = { message: 'Authentication token expired', statusCode: 401 };
  }

  // File upload errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    error = { message: 'File size exceeds maximum limit', statusCode: 400 };
  }

  if (err.code === 'LIMIT_PART_COUNT') {
    error = { message: 'Too many file parts', statusCode: 400 };
  }

  // Sanitize error message for production (don't expose DB errors, file paths, etc)
  let clientMessage = error.message || 'Server Error';
  if (process.env.NODE_ENV === 'production' && error.statusCode === 500) {
    // Generic message for unexpected 500 errors in production
    clientMessage = 'An unexpected error occurred. Please try again later.';
  }

  const statusCode = error.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    message: clientMessage,
    ...(error.errors ? { errors: error.errors } : {})
  });
};

module.exports = errorHandler;
