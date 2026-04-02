const express = require('express');
const router = express.Router();
const {
  getUsers,
  getTeachers,
  getUser,
  createUser,
  updateUser,
  deleteUser,
  getDashboardStats
} = require('../controllers/userController');
const { protect, authorize } = require('../middleware/auth');

router.get('/teachers', protect, getTeachers);
router.get('/stats/dashboard', protect, getDashboardStats);

router.route('/')
  .get(protect, authorize('admin'), getUsers)
  .post(protect, authorize('admin'), createUser);

router.route('/:id')
  .get(protect, authorize('admin'), getUser)
  .put(protect, authorize('admin'), updateUser)
  .delete(protect, authorize('admin'), deleteUser);

module.exports = router;
