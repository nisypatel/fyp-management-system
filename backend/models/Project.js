const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Please add a project title'],
    trim: true,
    maxlength: [200, 'Title cannot be more than 200 characters']
  },
  description: {
    type: String,
    required: [true, 'Please add a project description'],
    maxlength: [2000, 'Description cannot be more than 2000 characters']
  },
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  supervisor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  supervisorStatus: {
    type: String,
    enum: ['pending', 'accepted', 'rejected'],
    default: 'pending'
  },
  adminStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  category: {
    type: String,
    enum: ['Web Development', 'Mobile Development', 'AI/ML', 'Data Science', 'IoT', 'Cybersecurity', 'Other'],
    required: true
  },
  technologies: [{
    type: String
  }],
  teamMembers: [{
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    email: String,
    name: String,
    enrollmentNumber: String,
    inviteStatus: {
      type: String,
      enum: ['pending', 'accepted', 'rejected'],
      default: 'pending'
    },
    respondedAt: Date
  }],
  proposalFile: {
    filename: String,
    originalName: String,
    path: String,
    size: Number,
    uploadedAt: Date
  },
  documents: [{
    title: String,
    filename: String,
    originalName: String,
    path: String,
    size: Number,
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  status: {
    type: String,
    enum: ['proposal', 'in-progress', 'completed', 'rejected'],
    default: 'proposal'
  },
  codeReview: {
    screenRecording: {
      filename: String,
      originalName: String,
      path: String,
      size: Number,
      uploadedAt: Date,
      uploadedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    },
    status: {
      type: String,
      enum: ['pending', 'submitted', 'approved', 'rejected'],
      default: 'pending'
    },
    instructions: String,
    feedback: String,
    submittedAt: Date,
    reviewedAt: Date,
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  progress: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  phases: {
    type: [{
      title: {
        type: String,
        trim: true,
        maxlength: [100, 'Phase title cannot exceed 100 characters']
      },
      status: {
        type: String,
        enum: ['pending', 'submitted', 'approved', 'rejected'],
        default: 'pending'
      },
      submission: {
        link: String, 
        fileUrl: String, 
        fileName: String,
        fileSize: Number,
        submittedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User'
        },
        videoUrl: String,
        videoName: String,
        videoSize: Number,
        comments: String,
        submittedAt: Date
      },
      feedback: [{
        from: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User'
        },
        message: {
          type: String,
          trim: true
        },
        timestamp: {
          type: Date,
          default: Date.now
        },
        role: {
          type: String,
          enum: ['student', 'faculty', 'admin']
        }
      }],
      approvedAt: Date
    }],
    default: []
  },
  feedback: [{
    from: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    message: String,
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  milestones: [{
    title: String,
    description: String,
    deadline: Date,
    completed: {
      type: Boolean,
      default: false
    },
    completedAt: Date
  }],
  delayReminder: {
    phaseId: String,
    lastSentAt: Date,
    inactiveDaysAtLastReminder: Number
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
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
  }]
}, {
  timestamps: true
});

// Indexes for performance
projectSchema.index({ student: 1 });
projectSchema.index({ supervisor: 1 });
projectSchema.index({ status: 1 });
projectSchema.index({ adminStatus: 1 });
projectSchema.index({ supervisorStatus: 1 });
projectSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Project', projectSchema);
