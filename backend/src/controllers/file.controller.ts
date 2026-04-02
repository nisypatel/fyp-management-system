import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import FileUpload from '../models/FileUpload.model';
import Project from '../models/Project.model';
import fs from 'fs';
import { UserRole } from '../types';

/**
 * Upload file to project
 */
export const uploadFile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { projectId } = req.body;

    if (!req.user || !req.file) {
      res.status(400).json({ success: false, message: 'Missing required data' });
      return;
    }

    // Verify project exists
    const project = await Project.findById(projectId);
    if (!project) {
      // Delete uploaded file
      fs.unlinkSync(req.file.path);
      res.status(404).json({ success: false, message: 'Project not found' });
      return;
    }

    // Check if user has permission to upload
    const canUpload =
      req.user.role === UserRole.Admin ||
      project.supervisor.toString() === req.user.userId ||
      project.student?.toString() === req.user.userId;

    if (!canUpload) {
      // Delete uploaded file
      fs.unlinkSync(req.file.path);
      res.status(403).json({ success: false, message: 'Not authorized to upload to this project' });
      return;
    }

    // Create file record
    const fileUpload = await FileUpload.create({
      filename: req.file.filename,
      originalName: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      uploadedBy: req.user.userId,
      projectId,
      uploadPath: req.file.path,
    });

    // Add file reference to project
    project.files.push(fileUpload._id);
    await project.save();

    res.status(201).json({
      success: true,
      message: 'File uploaded successfully',
      data: fileUpload,
    });
  } catch (error: unknown) {
    // Clean up uploaded file on error
    if (req.file) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (unlinkError) {
        console.error('Error deleting file:', unlinkError);
      }
    }

    console.error('Upload file error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    res.status(500).json({ success: false, message: 'Failed to upload file', error: errorMessage });
  }
};

/**
 * Get all files for a project
 */
export const getProjectFiles = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { projectId } = req.params;

    if (!req.user) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    // Verify project exists and user has access
    const project = await Project.findById(projectId);
    if (!project) {
      res.status(404).json({ success: false, message: 'Project not found' });
      return;
    }

    const hasAccess =
      req.user.role === UserRole.Admin ||
      project.supervisor.toString() === req.user.userId ||
      project.student?.toString() === req.user.userId;

    if (!hasAccess) {
      res.status(403).json({ success: false, message: 'Access denied' });
      return;
    }

    // Get files
    const files = await FileUpload.find({ projectId }).populate('uploadedBy', 'name email');

    res.status(200).json({
      success: true,
      data: files,
    });
  } catch (error: unknown) {
    console.error('Get project files error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    res.status(500).json({ success: false, message: 'Failed to fetch files', error: errorMessage });
  }
};

/**
 * Download file
 */
export const downloadFile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { fileId } = req.params;

    if (!req.user) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    // Get file record
    const file = await FileUpload.findById(fileId);
    if (!file) {
      res.status(404).json({ success: false, message: 'File not found' });
      return;
    }

    // Verify project access
    const project = await Project.findById(file.projectId);
    if (!project) {
      res.status(404).json({ success: false, message: 'Project not found' });
      return;
    }

    const hasAccess =
      req.user.role === UserRole.Admin ||
      project.supervisor.toString() === req.user.userId ||
      project.student?.toString() === req.user.userId;

    if (!hasAccess) {
      res.status(403).json({ success: false, message: 'Access denied' });
      return;
    }

    // Check if file exists on disk
    if (!fs.existsSync(file.uploadPath)) {
      res.status(404).json({ success: false, message: 'File not found on server' });
      return;
    }

    // Send file
    res.download(file.uploadPath, file.originalName);
  } catch (error: unknown) {
    console.error('Download file error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    res.status(500).json({ success: false, message: 'Failed to download file', error: errorMessage });
  }
};

/**
 * Delete file
 */
export const deleteFile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { fileId } = req.params;

    if (!req.user) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    // Get file record
    const file = await FileUpload.findById(fileId);
    if (!file) {
      res.status(404).json({ success: false, message: 'File not found' });
      return;
    }

    // Verify project access
    const project = await Project.findById(file.projectId);
    if (!project) {
      res.status(404).json({ success: false, message: 'Project not found' });
      return;
    }

    // Only admin or file uploader can delete
    const canDelete =
      req.user.role === UserRole.Admin || file.uploadedBy.toString() === req.user.userId;

    if (!canDelete) {
      res.status(403).json({ success: false, message: 'Not authorized to delete this file' });
      return;
    }

    // Delete file from disk
    if (fs.existsSync(file.uploadPath)) {
      fs.unlinkSync(file.uploadPath);
    }

    // Remove file reference from project
    project.files = project.files.filter((f) => f.toString() !== fileId);
    await project.save();

    // Delete file record
    await FileUpload.findByIdAndDelete(fileId);

    res.status(200).json({
      success: true,
      message: 'File deleted successfully',
    });
  } catch (error: unknown) {
    console.error('Delete file error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    res.status(500).json({ success: false, message: 'Failed to delete file', error: errorMessage });
  }
};
