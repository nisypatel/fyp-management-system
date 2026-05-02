const mongoose = require('mongoose');

const refreshTokenSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  tokenHash: {
    type: String,
    required: true,
    unique: true,
    select: false
  },
  expiresAt: {
    type: Date,
    required: true,
    index: true
  },
  revokedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true,
  collection: 'refresh_tokens'
});

refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('RefreshToken', refreshTokenSchema);