import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import Project from '../models/Project.model';
import User from '../models/User.model';
import { UserRole, ProjectStatus } from '../types';

/**
 * Create a new project (Admin/Teacher only)
 */
export const createProject = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { title, description, supervisorId, studentId } = req.body;

    if (!req.user) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    // Verify supervisor exists and is a teacher or admin
    const supervisor = await User.findById(supervisorId);
    if (!supervisor || (supervisor.role !== UserRole.Teacher && supervisor.role !== UserRole.Admin)) {
      res.status(400).json({ success: false, message: 'Invalid supervisor' });
      return;
    }

    // If student is provided, verify they exist and are a student
    if (studentId) {
      const student = await User.findById(studentId);
      if (!student || student.role !== UserRole.Student) {
        res.status(400).json({ success: false, message: 'Invalid student' });
        return;
      }
    }

    const project = await Project.create({
      title,
      description,
      supervisor: supervisorId,
      student: studentId || null,
      status: ProjectStatus.Pending,
    });

    const populatedProject = await Project.findById(project._id)
      .populate('supervisor', 'name email role')
      .populate('student', 'name email role');

    res.status(201).json({
      success: true,
      message: 'Project created successfully',
      data: populatedProject,
    });
  } catch (error: unknown) {
    console.error('Create project error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    res.status(500).json({ success: false, message: 'Failed to create project', error: errorMessage });
  }
};

/**
 * Get all projects (filtered by role)
 */
export const getProjects = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    let query: Record<string, any> = {};

    // Filter projects based on user role
    if (req.user.role === UserRole.Student) {
      // Students see only their own projects
      query.student = req.user.userId;
    } else if (req.user.role === UserRole.Teacher) {
      // Teachers see projects they supervise
      query.supervisor = req.user.userId;
    }
    // Admins see all projects (no filter)

    const projects = await Project.find(query)
      .populate('supervisor', 'name email role')
      .populate('student', 'name email role')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: projects,
    });
  } catch (error: unknown) {
    console.error('Get projects error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    res.status(500).json({ success: false, message: 'Failed to fetch projects', error: errorMessage });
  }
};

/**
 * Get single project by ID
 */
export const getProjectById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    if (!req.user) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const project = await Project.findById(id)
      .populate('supervisor', 'name email role')
      .populate('student', 'name email role')
      .populate('files');

    if (!project) {
      res.status(404).json({ success: false, message: 'Project not found' });
      return;
    }

    // Check access permissions
    const hasAccess =
      req.user.role === UserRole.Admin ||
      project.supervisor.toString() === req.user.userId ||
      project.student?.toString() === req.user.userId;

    if (!hasAccess) {
      res.status(403).json({ success: false, message: 'Access denied' });
      return;
    }

    res.status(200).json({
      success: true,
      data: project,
    });
  } catch (error: unknown) {
    console.error('Get project error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    res.status(500).json({ success: false, message: 'Failed to fetch project', error: errorMessage });
  }
};

/**
 * Update project (Admin/Supervisor only)
 */
export const updateProject = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const updates = req.body;

    if (!req.user) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const project = await Project.findById(id);

    if (!project) {
      res.status(404).json({ success: false, message: 'Project not found' });
      return;
    }

    // Check update permissions
    const canUpdate =
      req.user.role === UserRole.Admin || project.supervisor.toString() === req.user.userId;

    if (!canUpdate) {
      res.status(403).json({ success: false, message: 'Not authorized to update this project' });
      return;
    }

    // Update project
    const updatedProject = await Project.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true,
    })
      .populate('supervisor', 'name email role')
      .populate('student', 'name email role');

    res.status(200).json({
      success: true,
      message: 'Project updated successfully',
      data: updatedProject,
    });
  } catch (error: unknown) {
    console.error('Update project error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    res.status(500).json({ success: false, message: 'Failed to update project', error: errorMessage });
  }
};

/**
 * Delete project (Admin only)
 */
export const deleteProject = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    if (!req.user) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const project = await Project.findByIdAndDelete(id);

    if (!project) {
      res.status(404).json({ success: false, message: 'Project not found' });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Project deleted successfully',
    });
  } catch (error: unknown) {
    console.error('Delete project error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    res.status(500).json({ success: false, message: 'Failed to delete project', error: errorMessage });
  }
};

/**
 * Assign student to project (Admin/Teacher only)
 */
export const assignStudent = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { studentId } = req.body;

    if (!req.user) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const project = await Project.findById(id);

    if (!project) {
      res.status(404).json({ success: false, message: 'Project not found' });
      return;
    }

    // Verify student exists and has student role
    const student = await User.findById(studentId);
    if (!student || student.role !== UserRole.Student) {
      res.status(400).json({ success: false, message: 'Invalid student' });
      return;
    }

    // Assign student
    project.student = studentId;
    await project.save();

    const updatedProject = await Project.findById(id)
      .populate('supervisor', 'name email role')
      .populate('student', 'name email role');

    res.status(200).json({
      success: true,
      message: 'Student assigned successfully',
      data: updatedProject,
    });
  } catch (error: unknown) {
    console.error('Assign student error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    res.status(500).json({ success: false, message: 'Failed to assign student', error: errorMessage });
  }
};
