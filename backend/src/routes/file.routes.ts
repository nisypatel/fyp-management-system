import { Router } from 'express';
import { uploadFile, getProjectFiles, downloadFile, deleteFile } from '../controllers/file.controller';
import { authenticate } from '../middleware/auth.middleware';
import { upload } from '../config/multer.config';
import { validateFileUpload } from '../middleware/fileValidation.middleware';

const router = Router();

/**
 * @route   POST /api/files/upload
 * @desc    Upload file to project
 * @access  Protected
 */
router.post('/upload', authenticate, upload.single('file'), validateFileUpload, uploadFile);

/**
 * @route   GET /api/files/project/:projectId
 * @desc    Get all files for a project
 * @access  Protected
 */
router.get('/project/:projectId', authenticate, getProjectFiles);

/**
 * @route   GET /api/files/:fileId/download
 * @desc    Download file
 * @access  Protected
 */
router.get('/:fileId/download', authenticate, downloadFile);

/**
 * @route   DELETE /api/files/:fileId
 * @desc    Delete file
 * @access  Protected
 */
router.delete('/:fileId', authenticate, deleteFile);

export default router;
