import mongoose, { Schema } from 'mongoose';
import { IFileUpload } from '../types';

const fileUploadSchema = new Schema<IFileUpload>(
  {
    filename: {
      type: String,
      required: true,
    },
    originalName: {
      type: String,
      required: true,
    },
    mimetype: {
      type: String,
      required: true,
      validate: {
        validator: function (v: string) {
          // Whitelist allowed MIME types
          const allowedTypes = [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'image/jpeg',
            'image/png',
            'image/jpg',
          ];
          return allowedTypes.includes(v);
        },
        message: 'File type not allowed',
      },
    },
    size: {
      type: Number,
      required: true,
      max: [10485760, 'File size cannot exceed 10MB'], // 10MB
    },
    uploadedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    projectId: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
    },
    uploadPath: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient queries
fileUploadSchema.index({ projectId: 1 });
fileUploadSchema.index({ uploadedBy: 1 });

const FileUpload = mongoose.model<IFileUpload>('FileUpload', fileUploadSchema);

export default FileUpload;
