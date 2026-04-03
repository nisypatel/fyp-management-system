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
    name: String,
    enrollmentNumber: String
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
        enum: ['Synopsis', 'Design/UML', 'Frontend', 'Backend', 'Testing & Report']
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
        comments: String,
        submittedAt: Date
      },
      feedback: String,
      approvedAt: Date
    }],
    default: [
      { title: 'Synopsis', status: 'pending' },
      { title: 'Design/UML', status: 'pending' },
      { title: 'Frontend', status: 'pending' },
      { title: 'Backend', status: 'pending' },
      { title: 'Testing & Report', status: 'pending' }
    ]
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
