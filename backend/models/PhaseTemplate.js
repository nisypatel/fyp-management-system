const mongoose = require('mongoose');

const phaseTemplateSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Please add a phase title'],
    trim: true,
    unique: true
  },
  description: {
    type: String,
    trim: true,
    default: ''
  },
  order: {
    type: Number,
    required: true,
    min: 1
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  collection: 'phasetemplates'
});

phaseTemplateSchema.index({ order: 1 });

module.exports = mongoose.model('PhaseTemplate', phaseTemplateSchema);