const Notification = require('../models/Notification');
const { appendAuditEntry, buildAuditEntry, MAX_AUDIT_ENTRIES } = require('../utils/auditTrail');

// @desc    Get user notifications
// @route   GET /api/notifications
// @access  Private
exports.getNotifications = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const skip = (page - 1) * limit;
    const filter = { recipient: req.user.id };

    if (req.query.read === 'true') {
      filter.isRead = true;
    }
    if (req.query.read === 'false') {
      filter.isRead = false;
    }
    if (req.query.type) {
      filter.type = req.query.type;
    }

    const notifications = await Notification.find(filter)
      .populate('sender', 'name role')
      .populate('relatedProject', 'title')
      .sort('-createdAt')
      .skip(skip)
      .limit(limit);

    const total = await Notification.countDocuments(filter);

    const unreadCount = await Notification.countDocuments({ 
      recipient: req.user.id,
      isRead: false 
    });

    res.status(200).json({
      success: true,
      count: notifications.length,
      total,
      page,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      unreadCount,
      notifications
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'An error occurred. Please try again.'
    });
  }
};

// @desc    Mark notification as read
// @route   PUT /api/notifications/:id/read
// @access  Private
exports.markAsRead = async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    if (notification.recipient.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }

    notification.isRead = true;
    appendAuditEntry(notification, {
      userId: req.user.id,
      action: 'notification_marked_read',
      changes: 'Notification marked as read'
    });
    await notification.save();

    const unreadCount = await Notification.countDocuments({
      recipient: req.user.id,
      isRead: false
    });

    res.status(200).json({
      success: true,
      unreadCount,
      notification
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'An error occurred. Please try again.'
    });
  }
};

// @desc    Mark all notifications as read
// @route   PUT /api/notifications/read-all
// @access  Private
exports.markAllAsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { recipient: req.user.id, isRead: false },
      {
        $set: {
          isRead: true,
          updatedBy: req.user.id
        },
        $push: {
          changeHistory: {
            $each: [
              buildAuditEntry({
                userId: req.user.id,
                action: 'notifications_marked_read_all',
                changes: 'Marked all notifications as read'
              })
            ],
            $slice: -MAX_AUDIT_ENTRIES
          }
        }
      }
    );

    res.status(200).json({
      success: true,
      unreadCount: 0,
      message: 'All notifications marked as read'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'An error occurred. Please try again.'
    });
  }
};

// @desc    Delete notification
// @route   DELETE /api/notifications/:id
// @access  Private
exports.deleteNotification = async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    if (notification.recipient.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }

    await notification.deleteOne();

    const unreadCount = await Notification.countDocuments({
      recipient: req.user.id,
      isRead: false
    });

    res.status(200).json({
      success: true,
      unreadCount,
      message: 'Notification deleted'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'An error occurred. Please try again.'
    });
  }
};

// @desc    Delete all notifications for current user
// @route   DELETE /api/notifications
// @access  Private
exports.deleteAllNotifications = async (req, res) => {
  try {
    await Notification.deleteMany({ recipient: req.user.id });

    res.status(200).json({
      success: true,
      unreadCount: 0,
      message: 'All notifications deleted'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'An error occurred. Please try again.'
    });
  }
};
