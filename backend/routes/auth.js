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
const requireDatabaseConnection = require('../middleware/database');
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

router.post('/register', requireDatabaseConnection, authRegisterLimiter, registerValidation, validateRequest, register);
router.post('/login', requireDatabaseConnection, authLoginLimiter, loginValidation, validateRequest, login);
router.post('/logout', logout);
router.get('/me', requireDatabaseConnection, protect, getMe);
router.delete('/me', requireDatabaseConnection, protect, deactivateMyAccount);
router.put('/updateprofile', requireDatabaseConnection, protect, updateProfileValidation, validateRequest, updateProfile);
router.post('/profile-image', requireDatabaseConnection, protect, profileImageUpload.single('profileImage'), uploadProfileImage);
router.put('/updatepassword', requireDatabaseConnection, protect, updatePasswordValidation, validateRequest, updatePassword);
router.post('/forgotpassword', requireDatabaseConnection, authForgotPasswordLimiter, forgotPasswordValidation, validateRequest, forgotPassword);
router.put('/resetpassword/:token', requireDatabaseConnection, resetPasswordValidation, validateRequest, resetPassword);

module.exports = router;
