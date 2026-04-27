const mongoose = require('mongoose');

const phaseTemplateSchema = new mongoose.Schema(
  {
    phases: [
      {
        title: {
          type: String,
          required: true,
          trim: true,
          maxlength: [100, 'Phase title cannot exceed 100 characters']
        }
      }
    ],
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    changeHistory: [
      {
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
      }
    ]
  },
  {
    timestamps: true,
    collection: 'phase_templates'
  }
);

module.exports = mongoose.model('PhaseTemplate', phaseTemplateSchema);