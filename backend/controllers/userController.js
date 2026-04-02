const User = require('../models/User');
const Project = require('../models/Project');

// @desc    Get all users
// @route   GET /api/users
// @access  Private (Admin)
exports.getUsers = async (req, res) => {
  try {
    const { role } = req.query;
    let query = {};
    
    if (role) {
      query.role = role;
    }

    const users = await User.find(query).select('-password').sort('-createdAt');

    res.status(200).json({
      success: true,
      count: users.length,
      users
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get all teachers
// @route   GET /api/users/teachers
// @access  Private
exports.getTeachers = async (req, res) => {
  try {
    const teachers = await User.find({ role: 'teacher', isActive: true })
      .select('name email employeeId department')
      .sort('name');

    res.status(200).json({
      success: true,
      count: teachers.length,
      teachers
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get single user
// @route   GET /api/users/:id
// @access  Private (Admin)
exports.getUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      user
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Create user (by admin)
// @route   POST /api/users
// @access  Private (Admin)
exports.createUser = async (req, res) => {
  try {
    const { name, email, password, role, department, enrollmentNumber, employeeId, phone } = req.body;

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({
        success: false,
        message: 'User already exists'
      });
    }

    const userData = {
      name,
      email,
      password,
      role,
      phone
    };

    if (role === 'student') {
      userData.department = department;
      userData.enrollmentNumber = enrollmentNumber;
    } else if (role === 'teacher') {
      userData.department = department;
      userData.employeeId = employeeId;
    }

    const user = await User.create(userData);

    res.status(201).json({
      success: true,
      user
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update user
// @route   PUT /api/users/:id
// @access  Private (Admin)
exports.updateUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const { name, email, department, phone, isActive } = req.body;

    user.name = name || user.name;
    user.email = email || user.email;
    user.department = department || user.department;
    user.phone = phone || user.phone;
    if (isActive !== undefined) {
      user.isActive = isActive;
    }

    await user.save();

    res.status(200).json({
      success: true,
      user
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Delete user
// @route   DELETE /api/users/:id
// @access  Private (Admin)
exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if user has associated projects
    if (user.role === 'student') {
      const projects = await Project.find({ student: user._id });
      if (projects.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Cannot delete user with associated projects'
        });
      }
    }

    await user.deleteOne();

    res.status(200).json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get dashboard statistics
// @route   GET /api/users/stats/dashboard
// @access  Private
exports.getDashboardStats = async (req, res) => {
  try {
    let stats = {};

    if (req.user.role === 'admin') {
      const totalStudents = await User.countDocuments({ role: 'student' });
      const totalTeachers = await User.countDocuments({ role: 'teacher' });
      const totalProjects = await Project.countDocuments();
      const pendingProjects = await Project.countDocuments({ adminStatus: 'pending' });
      const approvedProjects = await Project.countDocuments({ adminStatus: 'approved' });
      const inProgressProjects = await Project.countDocuments({ status: 'in-progress' });
      const completedProjects = await Project.countDocuments({ status: 'completed' });

      stats = {
        totalStudents,
        totalTeachers,
        totalProjects,
        pendingProjects,
        approvedProjects,
        inProgressProjects,
        completedProjects
      };
    } else if (req.user.role === 'teacher') {
      const totalAssigned = await Project.countDocuments({ 
        supervisor: req.user.id,
        supervisorStatus: 'accepted'
      });
      const pendingRequests = await Project.countDocuments({ 
        supervisor: req.user.id,
        supervisorStatus: 'pending'
      });
      const inProgress = await Project.countDocuments({ 
        supervisor: req.user.id,
        status: 'in-progress'
      });
      const completed = await Project.countDocuments({ 
        supervisor: req.user.id,
        status: 'completed'
      });

      stats = {
        totalAssigned,
        pendingRequests,
        inProgress,
        completed
      };
    } else if (req.user.role === 'student') {
      const myProjects = await Project.countDocuments({ student: req.user.id });
      const pending = await Project.countDocuments({ 
        student: req.user.id,
        status: 'proposal'
      });
      const inProgress = await Project.countDocuments({ 
        student: req.user.id,
        status: 'in-progress'
      });
      const completed = await Project.countDocuments({ 
        student: req.user.id,
        status: 'completed'
      });

      stats = {
        myProjects,
        pending,
        inProgress,
        completed
      };
    }

    res.status(200).json({
      success: true,
      stats
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};
