import mongoose, { Schema } from 'mongoose';
import { IProject, ProjectStatus } from '../types';

const projectSchema = new Schema<IProject>(
  {
    title: {
      type: String,
      required: [true, 'Project title is required'],
      trim: true,
      minlength: [5, 'Title must be at least 5 characters'],
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    description: {
      type: String,
      required: [true, 'Project description is required'],
      trim: true,
      minlength: [10, 'Description must be at least 10 characters'],
      maxlength: [2000, 'Description cannot exceed 2000 characters'],
    },
    status: {
      type: String,
      enum: Object.values(ProjectStatus),
      default: ProjectStatus.Pending,
      required: true,
    },
    student: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    supervisor: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Supervisor is required'],
    },
    files: [
      {
        type: Schema.Types.ObjectId,
        ref: 'FileUpload',
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient queries
projectSchema.index({ student: 1 });
projectSchema.index({ supervisor: 1 });
projectSchema.index({ status: 1 });

const Project = mongoose.model<IProject>('Project', projectSchema);

export default Project;
