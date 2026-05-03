const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const UserType = require('./UserType');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a name'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Please add an email'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      'Please add a valid email'
    ]
  },
  password: {
    type: String,
    required: [true, 'Please add a password'],
    minlength: 6,
    select: false
  },
  role: {
    type: String,
    enum: ['student', 'faculty', 'admin'],
    default: 'student'
  },
  department: {
    type: String,
    required: function() {
      return this.role === 'student' || this.role === 'faculty';
    }
  },
  enrollmentNumber: {
    type: String,
    unique: true,
    sparse: true,
    required: function() {
      return this.role === 'student';
    }
  },
  employeeId: {
    type: String,
    unique: true,
    sparse: true,
    required: function() {
      return this.role === 'faculty';
    }
  },
  phone: {
    type: String,
    match: [/^[0-9]{10}$/, 'Please add a valid phone number']
  },
  avatar: {
    publicId: {
      type: String,
      default: null
    },
    url: {
      type: String,
      default: null
    },
    uploadedAt: {
      type: Date,
      default: null
    }
  },
  verificationStatus: {
    type: String,
    enum: ['unverified', 'otp_pending', 'otp_verified', 'id_pending', 'verified', 'rejected'],
    default: 'unverified'
  },
  verificationMethod: {
    type: String,
    enum: ['otp', 'id_card'],
    default: null
  },
  verificationEmail: {
    type: String,
    trim: true,
    lowercase: true,
    default: null
  },
  otpToken: String,
  otpExpires: Date,
  idCardFile: {
    filename: String,
    originalName: String,
    path: String,
    size: Number,
    uploadedAt: Date
  },
  verificationAudit: [{
    action: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    notes: String
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  resetPasswordToken: String,
  resetPasswordExpire: Date,
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  roleType: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'UserType',
    default: null
  },
  changeHistory: [{
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    action: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100
    },
    changes: {
      type: String,
      trim: true,
      maxlength: 500
    },
    changedAt: {
      type: Date,
      default: Date.now
    }
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for faster queries (email, enrollmentNumber, employeeId already indexed via unique: true)
userSchema.index({ role: 1 });
userSchema.index({ roleType: 1 });

// Encrypt password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.pre('save', async function(next) {
  if (this.role && !this.roleType) {
    const normalizedRole = this.role.trim().toLowerCase();
    const type = await UserType.findOne({ key: normalizedRole });
    if (type) {
      this.roleType = type._id;
    }
  }
  next();
});

// Match password
userSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Generate and hash password token
userSchema.methods.getResetPasswordToken = function() {
  // Generate token
  const resetToken = crypto.randomBytes(20).toString('hex');

  // Hash token and set to resetPasswordToken field
  this.resetPasswordToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  // Set expire (10 minutes)
  this.resetPasswordExpire = Date.now() + 10 * 60 * 1000;

  return resetToken;
};

module.exports = mongoose.model('User', userSchema);
