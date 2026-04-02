import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/generateTokens';
import { JWTPayload } from '../types';

export interface AuthRequest extends Request {
  user?: JWTPayload;
}

export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.',
      });
      return;
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
      res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.',
      });
      return;
    }

    // Verify token
    const decoded = verifyAccessToken(token);

    // Attach user payload to request
    req.user = decoded;

    next();
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Invalid or expired access token') {
      res.status(401).json({
        success: false,
        message: 'Invalid or expired token. Please login again.',
      });
      return;
    }

    res.status(500).json({
      success: false,
      message: 'Authentication error',
    });
    return;
  }
};
