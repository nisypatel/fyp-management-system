import { Router } from 'express';
import {
  createProject,
  getProjects,
  getProjectById,
  updateProject,
  deleteProject,
  assignStudent,
} from '../controllers/project.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireAdmin, requireTeacher } from '../middleware/rbac.middleware';

const router = Router();

/**
 * @route   GET /api/projects
 * @desc    Get all projects (filtered by role)
 * @access  Protected
 */
router.get('/', authenticate, getProjects);

/**
 * @route   POST /api/projects
 * @desc    Create a new project
 * @access  Protected (Admin/Teacher only)
 */
router.post('/', authenticate, requireTeacher, createProject);

/**
 * @route   GET /api/projects/:id
 * @desc    Get single project by ID
 * @access  Protected
 */
router.get('/:id', authenticate, getProjectById);

/**
 * @route   PUT /api/projects/:id
 * @desc    Update project
 * @access  Protected (Admin/Supervisor only)
 */
router.put('/:id', authenticate, updateProject);

/**
 * @route   DELETE /api/projects/:id
 * @desc    Delete project
 * @access  Protected (Admin only)
 */
router.delete('/:id', authenticate, requireAdmin, deleteProject);

/**
 * @route   POST /api/projects/:id/assign
 * @desc    Assign student to project
 * @access  Protected (Admin/Teacher only)
 */
router.post('/:id/assign', authenticate, requireTeacher, assignStudent);

export default router;
