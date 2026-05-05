const mongoose = require('mongoose');

const requireDatabaseConnection = (req, res, next) => {
  if (mongoose.connection.readyState === 1) {
    return next();
  }

  return res.status(503).json({
    success: false,
    message: 'Database connection is unavailable. Please try again later.'
  });
};

module.exports = requireDatabaseConnection;