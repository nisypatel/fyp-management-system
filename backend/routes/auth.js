const express = require('express');
const router = express.Router();
const multer = require('multer');
const {
  register,
  login,
  logout,
  getMe,
  deactivateMyAccount,
  updateProfile,
  updatePassword,
  forgotPassword,
  resetPassword,
  uploadProfileImage
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const { validateRequest } = require('../middleware/validation');
const {
  registerValidation,
  loginValidation,
  forgotPasswordValidation,
  resetPasswordValidation,
  updateProfileValidation,
  updatePasswordValidation
} = require('../middleware/validators');
const {
  authLoginLimiter,
  authRegisterLimiter,
  authForgotPasswordLimiter
} = require('../middleware/rateLimiter');

const profileImageUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: parseInt(process.env.MAX_PROFILE_IMAGE_SIZE || '', 10) || 5 * 1024 * 1024
  }
});

router.post('/register', authRegisterLimiter, registerValidation, validateRequest, register);
router.post('/login', authLoginLimiter, loginValidation, validateRequest, login);
router.post('/logout', logout);
router.get('/me', protect, getMe);
router.delete('/me', protect, deactivateMyAccount);
router.put('/updateprofile', protect, updateProfileValidation, validateRequest, updateProfile);
router.post('/profile-image', protect, profileImageUpload.single('profileImage'), uploadProfileImage);
router.put('/updatepassword', protect, updatePasswordValidation, validateRequest, updatePassword);
router.post('/forgotpassword', authForgotPasswordLimiter, forgotPasswordValidation, validateRequest, forgotPassword);
router.put('/resetpassword/:token', resetPasswordValidation, validateRequest, resetPassword);

module.exports = router;
