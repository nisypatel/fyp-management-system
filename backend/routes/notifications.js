const express = require('express');
const router = express.Router();
const {
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  deleteAllNotifications
} = require('../controllers/notificationController');
const { protect } = require('../middleware/auth');
const { validateRequest } = require('../middleware/validation');
const { notificationListValidation, notificationIdValidation } = require('../middleware/validators');

router.get('/', protect, notificationListValidation, validateRequest, getNotifications);
router.put('/read-all', protect, markAllAsRead);
router.put('/:id/read', protect, notificationIdValidation, validateRequest, markAsRead);
router.delete('/', protect, deleteAllNotifications);
router.delete('/:id', protect, notificationIdValidation, validateRequest, deleteNotification);

module.exports = router;
