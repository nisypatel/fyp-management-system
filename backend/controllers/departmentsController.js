const Department = require('../models/Department');
const User = require('../models/User');

// @desc Get all departments
// @route GET /api/departments
// @access Private (admin)
exports.getDepartments = async (req, res) => {
  try {
    const departments = await Department.find().sort('name');
    res.status(200).json({ success: true, departments });
  } catch (error) {
    res.status(400).json({ success: false, message: 'An error occurred. Please try again.' });
  }
};

// @desc Create department
// @route POST /api/departments
// @access Private (admin)
exports.createDepartment = async (req, res) => {
  try {
    const { name, code } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Department name is required' });
    }

    const normalized = name.trim();
    const exists = await Department.findOne({ name: normalized });
    if (exists) {
      return res.status(400).json({ success: false, message: 'Department already exists' });
    }

    const dept = await Department.create({ name: normalized, code: code || null });
    res.status(201).json({ success: true, department: dept });
  } catch (error) {
    res.status(400).json({ success: false, message: 'An error occurred. Please try again.' });
  }
};

// @desc Update department
// @route PUT /api/departments/:id
// @access Private (admin)
exports.updateDepartment = async (req, res) => {
  try {
    const dept = await Department.findById(req.params.id);
    if (!dept) {
      return res.status(404).json({ success: false, message: 'Department not found' });
    }
    const { name, code } = req.body;
    if (name && String(name).trim()) {
      const normalized = String(name).trim();
      const dup = await Department.findOne({ name: normalized, _id: { $ne: dept._id } });
      if (dup) {
        return res.status(400).json({ success: false, message: 'Another department with this name exists' });
      }
      dept.name = normalized;
    }
    if (code !== undefined) dept.code = code;
    await dept.save();
    res.status(200).json({ success: true, department: dept });
  } catch (error) {
    res.status(400).json({ success: false, message: 'An error occurred. Please try again.' });
  }
};

// @desc Delete department
// @route DELETE /api/departments/:id
// @access Private (admin)
exports.deleteDepartment = async (req, res) => {
  try {
    const dept = await Department.findById(req.params.id);
    if (!dept) {
      return res.status(404).json({ success: false, message: 'Department not found' });
    }

    // Prevent deletion if users exist in department
    const userCount = await User.countDocuments({ department: dept._id });
    if (userCount > 0) {
      return res.status(400).json({ success: false, message: 'Cannot delete department with associated users' });
    }

    await dept.deleteOne();
    res.status(200).json({ success: true, message: 'Department deleted' });
  } catch (error) {
    res.status(400).json({ success: false, message: 'An error occurred. Please try again.' });
  }
};
