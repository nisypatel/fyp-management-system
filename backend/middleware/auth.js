const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { normalizeRole } = require('../utils/role');

// Protect routes - verify JWT token
exports.protect = async (req, res, next) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({
      success: false,
      message: 'Database connection is unavailable. Please try again later.'
    });
  }

  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies.token) {
    token = req.cookies.token;
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized to access this route'
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).select('-password');
    
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }

    if (!req.user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Your account has been deactivated'
      });
    }

    req.user.role = normalizeRole(req.user.role);

    next();
  } catch (error) {
    const message = error.name === 'TokenExpiredError'
      ? 'Your session has expired. Please login again.'
      : 'Not authorized to access this route';

    return res.status(401).json({
      success: false,
      message
    });
  }
};

// Grant access to specific roles
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `User role '${req.user.role}' is not authorized to access this route`
      });
    }
    next();
  };
};
