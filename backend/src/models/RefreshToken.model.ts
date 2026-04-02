import mongoose, { Schema } from 'mongoose';
import { IRefreshToken } from '../types';

const refreshTokenSchema = new Schema<IRefreshToken>(
  {
    token: {
      type: String,
      required: true,
      unique: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// TTL index to automatically delete expired tokens
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Index for faster token lookups
refreshTokenSchema.index({ token: 1 });
refreshTokenSchema.index({ userId: 1 });

// Static method to revoke all tokens for a user
refreshTokenSchema.statics.revokeUserTokens = async function (userId: string) {
  return await this.deleteMany({ userId });
};

// Static method to revoke a specific token
refreshTokenSchema.statics.revokeToken = async function (token: string) {
  return await this.deleteOne({ token });
};

const RefreshToken = mongoose.model<IRefreshToken>('RefreshToken', refreshTokenSchema);

export default RefreshToken;
