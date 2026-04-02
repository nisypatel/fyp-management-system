import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.middleware';
import { UserRole } from '../types';

export const requireRole = (allowedRoles: UserRole[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        message: 'Access denied. Insufficient permissions.',
      });
      return;
    }

    next();
  };
};

// Convenience middlewares for specific roles
export const requireAdmin = requireRole([UserRole.Admin]);
export const requireTeacher = requireRole([UserRole.Admin, UserRole.Teacher]);
export const requireStudent = requireRole([UserRole.Admin, UserRole.Teacher, UserRole.Student]);
