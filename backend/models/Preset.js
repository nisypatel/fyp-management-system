const mongoose = require('mongoose');

const normalizeSubmissionType = (value) => {
  const allowedTypes = new Set(['file', 'url', 'text', 'textarea']);
  return allowedTypes.has(value) ? value : 'file';
};

const presetSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: [100, 'Preset name cannot exceed 100 characters']
    },
    phases: [
      {
        title: {
          type: String,
          required: true,
          trim: true,
          maxlength: [100, 'Phase title cannot exceed 100 characters']
        },
        submissionType: {
          type: String,
          enum: ['file', 'url', 'text', 'textarea'],
          default: 'file'
        },
        order: {
          type: Number,
          required: true,
          min: 1
        }
      }
    ],
    isActive: {
      type: Boolean,
      default: false
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
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
    collection: 'presets'
  }
);

// Ensure at least one preset is active and assign phase order values
presetSchema.pre('save', async function(next) {
  if (Array.isArray(this.phases) && this.phases.length) {
    this.phases = this.phases.map((phase, index) => ({
      title: phase.title,
      submissionType: normalizeSubmissionType(phase.submissionType),
      order: index + 1
    }));
  }

  if (this.isActive) {
    // If setting this to active, deactivate others
    await mongoose.model('Preset').updateMany(
      { _id: { $ne: this._id } },
      { isActive: false }
    );
  } else {
    // If deactivating, ensure at least one remains active
    const activeCount = await mongoose.model('Preset').countDocuments({ isActive: true, _id: { $ne: this._id } });
    if (activeCount === 0) {
      return next(new Error('At least one preset must remain active'));
    }
  }
  next();
});

presetSchema.pre('findOneAndUpdate', function(next) {
  const update = this.getUpdate();
  if (update && update.phases && Array.isArray(update.phases)) {
    update.phases = update.phases.map((phase, index) => ({
      title: phase.title,
      submissionType: normalizeSubmissionType(phase.submissionType),
      order: index + 1
    }));
    this.setUpdate(update);
  }
  next();
});

module.exports = mongoose.model('Preset', presetSchema);