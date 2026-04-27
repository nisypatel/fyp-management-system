const express = require('express');
const router = express.Router();
const {
  getUsers,
  getFaculty,
  getUser,
  createUser,
  updateUser,
  deleteUser,
  getDashboardStats
} = require('../controllers/userController');
const { protect, authorize } = require('../middleware/auth');
const { validateRequest } = require('../middleware/validation');
const { createUserValidation, updateUserValidation, objectIdRule } = require('../middleware/validators');

router.get('/faculty', protect, getFaculty);
router.get('/stats/dashboard', protect, getDashboardStats);

router.route('/')
  .get(protect, authorize('admin'), getUsers)
  .post(protect, authorize('admin'), createUserValidation, validateRequest, createUser);

router.route('/:id')
  .get(protect, authorize('admin'), objectIdRule('id', 'User id'), validateRequest, getUser)
  .put(protect, authorize('admin'), updateUserValidation, validateRequest, updateUser)
  .delete(protect, authorize('admin'), objectIdRule('id', 'User id'), validateRequest, deleteUser);

module.exports = router;
