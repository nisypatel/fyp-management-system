import { Document, Types } from 'mongoose';

export enum UserRole {
  Admin = 'Admin',
  Teacher = 'Teacher',
  Student = 'Student',
}

export enum ProjectStatus {
  Pending = 'Pending',
  InProgress = 'InProgress',
  Completed = 'Completed',
}

export interface IUser extends Document {
  _id: Types.ObjectId;
  name: string;
  email: string;
  password: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

export interface IProject extends Document {
  _id: Types.ObjectId;
  title: string;
  description: string;
  status: ProjectStatus;
  student: Types.ObjectId | IUser;
  supervisor: Types.ObjectId | IUser;
  files: Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

export interface IRefreshToken extends Document {
  _id: Types.ObjectId;
  token: string;
  userId: Types.ObjectId | IUser;
  expiresAt: Date;
  createdAt: Date;
}

export interface IFileUpload extends Document {
  _id: Types.ObjectId;
  filename: string;
  originalName: string;
  mimetype: string;
  size: number;
  uploadedBy: Types.ObjectId | IUser;
  projectId: Types.ObjectId | IProject;
  uploadPath: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface JWTPayload {
  userId: string;
  email: string;
  role: UserRole;
}

export interface AuthRequest extends Request {
  user?: JWTPayload;
}
