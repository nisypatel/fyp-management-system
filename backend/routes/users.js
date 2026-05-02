const express = require('express');
const router = express.Router();
const {
  getUsers,
  getFaculty,
  getUser,
  createUser,
  updateUser,
  deleteUser,
  getDashboardStats,
  requestOTPVerification,
  confirmOTPVerification,
  uploadIDCard,
  getPendingVerifications,
  reviewIDCardVerification,
  getVerificationConfig,
  updateVerificationConfig
} = require('../controllers/userController');
const { protect, authorize } = require('../middleware/auth');
const { validateRequest } = require('../middleware/validation');
const { createUserValidation, updateUserValidation, objectIdRule } = require('../middleware/validators');

router.get('/faculty', protect, getFaculty);
router.get('/stats/dashboard', protect, getDashboardStats);

// Verification routes
router.get('/verification/config', protect, getVerificationConfig);
router.put('/verification/config', protect, authorize('admin'), updateVerificationConfig);
router.post('/verification/otp', protect, authorize('student'), requestOTPVerification);
router.post('/verification/otp/confirm', protect, authorize('student'), confirmOTPVerification);
router.post('/verification/id-card', protect, authorize('student'), require('../middleware/upload').uploadIDCard.single('idCard'), require('../middleware/upload').handleMulterError, uploadIDCard);
router.get('/verification/pending', protect, authorize('admin'), getPendingVerifications);
router.put('/:id/verification/review', protect, authorize('admin'), objectIdRule('id', 'User id'), validateRequest, reviewIDCardVerification);

router.route('/')
  .get(protect, authorize('admin'), getUsers)
  .post(protect, authorize('admin'), createUserValidation, validateRequest, createUser);

router.route('/:id')
  .get(protect, authorize('admin'), objectIdRule('id', 'User id'), validateRequest, getUser)
  .put(protect, authorize('admin'), updateUserValidation, validateRequest, updateUser)
  .delete(protect, authorize('admin'), objectIdRule('id', 'User id'), validateRequest, deleteUser);

module.exports = router;
