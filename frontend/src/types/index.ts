export const UserRole = {
  Admin: 'Admin',
  Teacher: 'Teacher',
  Student: 'Student',
} as const;

export type UserRole = typeof UserRole[keyof typeof UserRole];

export const ProjectStatus = {
  Pending: 'Pending',
  InProgress: 'InProgress',
  Completed: 'Completed',
} as const;

export type ProjectStatus = typeof ProjectStatus[keyof typeof ProjectStatus];

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  data: {
    user: User;
    accessToken: string;
    refreshToken: string;
  };
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
  role?: UserRole;
}

export interface Project {
  _id: string;
  title: string;
  description: string;
  status: ProjectStatus;
  student?: User;
  supervisor?: User;
  files: string[];
  createdAt: string;
  updatedAt: string;
}

export interface FileUpload {
  _id: string;
  filename: string;
  originalName: string;
  mimetype: string;
  size: number;
  uploadedBy: string;
  projectId: string;
  uploadPath: string;
  createdAt: string;
}
