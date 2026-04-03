const User = require('../models/User');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const sendEmail = require('../utils/sendEmail');

// Generate JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE
  });
};

// Get token from model, create cookie and send response
const sendTokenResponse = (user, statusCode, res) => {
  // Create token
  const token = generateToken(user._id);

  const options = {
    expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax'
  };

  res.status(statusCode).cookie('token', token, options).json({
    success: true,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      department: user.department,
      enrollmentNumber: user.enrollmentNumber,
      employeeId: user.employeeId
    }
  });
};

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res) => {
  try {
    // Check if user is already logged in (verify any existing token cookie)
    if (req.cookies.token && req.cookies.token !== 'none') {
      try {
        const decoded = jwt.verify(req.cookies.token, process.env.JWT_SECRET);
        const existingUser = await User.findById(decoded.id);
        if (existingUser) {
          return res.status(403).json({
            success: false,
            message: 'You are already logged in. Please logout first.'
          });
        }
      } catch (err) {
        // Token invalid, proceed with registration
      }
    }

    const { name, email, password, role, department, enrollmentNumber, employeeId, phone } = req.body;

    // Check if user email exists
    const emailExists = await User.findOne({ email });
    if (emailExists) {
      return res.status(400).json({
        success: false,
        message: 'A user with this email already exists'
      });
    }

    // Check enrollment number for students
    if (role === 'student' || !role) {
      if (enrollmentNumber) {
        const enrollmentExists = await User.findOne({ enrollmentNumber });
        if (enrollmentExists) {
          return res.status(400).json({
            success: false,
            message: 'A student with this enrollment number already exists'
          });
        }
      }
    }

    // Check employee ID for teachers
    if (role === 'teacher') {
      if (employeeId) {
        const employeeExists = await User.findOne({ employeeId });
        if (employeeExists) {
          return res.status(400).json({
            success: false,
            message: 'A teacher with this employee ID already exists'
          });
        }
      }
    }

    // Create user
    const userData = {
      name,
      email,
      password,
      role: role || 'student'
    };

    if (phone) {
      userData.phone = phone;
    }

    if (role === 'student' || !role) {
      userData.department = department;
      userData.enrollmentNumber = enrollmentNumber;
    } else if (role === 'teacher') {
      userData.department = department;
      userData.employeeId = employeeId;
    }

    const user = await User.create(userData);

    // Send welcome email
    try {
      const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
          <div style="text-align: center; margin-bottom: 20px;">
            <h2 style="color: #4F46E5; margin: 0;">FYP Management System</h2>
          </div>
          <div style="background-color: #f9f9f9; padding: 20px; border-radius: 8px;">
            <h3 style="color: #333; margin-top: 0;">Welcome, ${user.name}!</h3>
            <p style="color: #555; line-height: 1.6;">Your account has been successfully created.</p>
            <p style="color: #555; line-height: 1.6;">You are registered as a <strong>${user.role.toUpperCase()}</strong>.</p>
            <hr style="border: 0; border-top: 1px solid #ddd; margin: 20px 0;" />
            <p style="color: #555; line-height: 1.6;">Log in now to start managing your Final Year Projects effectively and collaborating with your peers and supervisors.</p>
            <div style="text-align: center; margin-top: 30px;">
              <a href="${process.env.CLIENT_URL || 'http://localhost:3000'}/login" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">Login to Dashboard</a>
            </div>
          </div>
          <div style="text-align: center; margin-top: 20px; font-size: 12px; color: #888;">
            <p>If you didn't create this account, please ignore this email.</p>
            <p>&copy; ${new Date().getFullYear()} FYP Management System</p>
          </div>
        </div>
      `;

      await sendEmail({
        email: user.email,
        subject: 'Welcome to FYP Management System! 🎉',
        message: `Hi ${user.name},\n\nWelcome to the FYP Management System! Your account has been successfully created as a ${user.role}.\n\nBest regards,\nFYP Team`,
        html: emailHtml
      });
    } catch (err) {
      console.log('Error sending welcome email:', err.message);
      // We don't want to fail registration if email fails
    }

    sendTokenResponse(user, 201, res);
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check if user is already logged in (verify any existing token cookie)
    if (req.cookies.token && req.cookies.token !== 'none') {
      try {
        const decoded = jwt.verify(req.cookies.token, process.env.JWT_SECRET);
        const existingUser = await User.findById(decoded.id);
        
        // Deny login if they are currently logged in as ANY active user
        if (existingUser && existingUser.isActive) {
          return res.status(403).json({
            success: false,
            message: 'Another user session is active. Please logout first.'
          });
        }
      } catch (err) {
        // Token invalid, proceed with normal login
      }
    }

    // Validate email & password
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide an email and password'
      });
    }

    // Check for user
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Your account has been deactivated. Please contact admin.'
      });
    }

    // Check if password matches
    const isMatch = await user.matchPassword(password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    sendTokenResponse(user, 200, res);
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    res.status(200).json({
      success: true,
      user
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update user profile
// @route   PUT /api/auth/updateprofile
// @access  Private
exports.updateProfile = async (req, res) => {
  try {
    const fieldsToUpdate = {
      name: req.body.name,
      phone: req.body.phone
    };

    const user = await User.findByIdAndUpdate(req.user.id, fieldsToUpdate, {
      new: true,
      runValidators: true
    });

    res.status(200).json({
      success: true,
      user
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update password
// @route   PUT /api/auth/updatepassword
// @access  Private
exports.updatePassword = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('+password');

    // Check current password
    if (!(await user.matchPassword(req.body.currentPassword))) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    const { newPassword } = req.body;

    // Strong password validation
    if (!newPassword || newPassword.length < 8 || !/\d/.test(newPassword) || !/[a-zA-Z]/.test(newPassword)) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters long and contain both letters and numbers'
      });
    }

    user.password = newPassword;
    await user.save();

    sendTokenResponse(user, 200, res);
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Forgot password
// @route   POST /api/auth/forgotpassword
// @access  Public
exports.forgotPassword = async (req, res) => {
  try {
    const user = await User.findOne({ email: req.body.email });
    if (!user) {
      return res.status(404).json({ success: false, message: 'There is no user with that email' });
    }

    // Get reset token
    const resetToken = user.getResetPasswordToken();
    await user.save({ validateBeforeSave: false });

    // Create reset url
    // Use frontend URL, typically from environment config, default to localhost
    const frontendUrl = process.env.CLIENT_URL || 'http://localhost:3000';
    const resetUrl = `${frontendUrl}/reset-password/${resetToken}`;

    const message = `You are receiving this email because you (or someone else) has requested the reset of a password. Please make a PUT request to: \n\n ${resetUrl}`;

    try {
      const resetHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px; text-align: center;">
          <h2 style="color: #4F46E5; margin-bottom: 20px;">Password Reset Request</h2>
          <div style="background-color: #fce4e4; padding: 15px; border-radius: 6px; margin-bottom: 20px; display: inline-block;">
            <p style="color: #333; margin: 0; font-size: 16px;">We received a request to reset your password.</p>
          </div>
          <p style="color: #555; line-height: 1.6; font-size: 15px; margin-bottom: 30px;">
            Click the button below to set a new password. This link will expire in 10 minutes.
          </p>
          <a href="${resetUrl}" style="background-color: #E11D48; color: white; padding: 12px 30px; text-decoration: none; border-radius: 4px; font-weight: bold; font-size: 16px;">Reset Password</a>
          <hr style="border: 0; border-top: 1px solid #ddd; margin: 30px 0;" />
          <p style="color: #888; font-size: 13px;">If you didn't request a password reset, you can safely ignore this email.</p>
        </div>
      `;

      await sendEmail({
        email: user.email,
        subject: '🔒 Reset Your FYP Management Password',
        message,
        html: resetHtml
      });

      res.status(200).json({ success: true, message: 'Email sent' });
    } catch (err) {
      console.error(err);
      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;
      await user.save({ validateBeforeSave: false });

      return res.status(500).json({ success: false, message: 'Email could not be sent' });
    }
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Reset password
// @route   PUT /api/auth/resetpassword/:token
// @access  Public
exports.resetPassword = async (req, res) => {
  try {
    // Get hashed token
    const resetPasswordToken = crypto
      .createHash('sha256')
      .update(req.params.token)
      .digest('hex');

    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid token' });
    }

    const { password } = req.body;

    // Strong password validation
    if (!password || password.length < 8 || !/\d/.test(password) || !/[a-zA-Z]/.test(password)) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters long and contain both letters and numbers'
      });
    }

    // Set new password
    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    sendTokenResponse(user, 200, res);
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Log user out / clear cookie
// @route   POST /api/auth/logout
// @access  Public
exports.logout = (req, res) => {
  res.cookie('token', 'none', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true
  });

  res.status(200).json({
    success: true,
    data: {}
  });
};


