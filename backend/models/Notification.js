const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  type: {
    type: String,
    enum: [
      'project_submitted',
      'supervisor_requested',
      'supervisor_accepted',
      'supervisor_rejected',
      'admin_approved',
      'admin_rejected',
      'feedback_received',
      'document_uploaded',
      'milestone_completed',
      'phase_submitted',
      'phase_approved',
      'phase_rejected',
      'code_review_submitted',
      'code_review_approved',
      'code_review_rejected',
      'team_invited',
      'team_invite_accepted',
      'team_invite_rejected',
      'general'
    ],
    required: true
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  relatedProject: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project'
  },
  isRead: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes
notificationSchema.index({ recipient: 1, isRead: 1 });
notificationSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
