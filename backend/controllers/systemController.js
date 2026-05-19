const SystemSetting = require('../models/SystemSetting');
const { uploadFileToCloudinary, isCloudinaryConfigured } = require('../utils/cloudinary');
const { formatDateTime } = require('../utils/dateFormat');


// @desc Get system settings (select keys)
// @route GET /api/system
// @access Private (admin)
exports.getSettings = async (req, res) => {
  try {
    const keys = ['college_name', 'college_logo_url'];
    const settings = await SystemSetting.find({ key: { $in: keys } }).lean();
    const map = {};
    for (const s of settings) map[s.key] = s.value;
    res.status(200).json({ success: true, settings: map });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to load settings' });
  }
};

// @desc Update system settings (college name / logo url)
// @route PUT /api/system
// @access Private (admin)
exports.updateSettings = async (req, res) => {
  try {
    const { collegeName, collegeLogoUrl } = req.body;
    const ops = [];
    if (typeof collegeName === 'string') {
      ops.push(SystemSetting.findOneAndUpdate(
        { key: 'college_name' },
        { $set: { key: 'college_name', value: collegeName } },
        { upsert: true, new: true }
      ).exec());
    }
    if (typeof collegeLogoUrl === 'string') {
      ops.push(SystemSetting.findOneAndUpdate(
        { key: 'college_logo_url' },
        { $set: { key: 'college_logo_url', value: collegeLogoUrl } },
        { upsert: true, new: true }
      ).exec());
    }

    await Promise.all(ops);
    res.status(200).json({ success: true, message: 'Settings updated' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update settings' });
  }
};

// @desc Upload college logo image and save URL
// @route PUT /api/system/logo
// @access Private (admin)
exports.uploadLogo = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    if (!isCloudinaryConfigured()) {
      return res.status(500).json({ success: false, message: 'Cloudinary is not configured on server' });
    }

    const uploadResult = await uploadFileToCloudinary(req.file, {
      folderContext: {
        userRole: 'admin',
        userId: req.user.id,
        projectId: 'system-logo',
        projectTitle: 'system-logo',
        fileType: 'logo'
      },
      resource_type: 'image'
    });

    // Save to system setting
    await SystemSetting.findOneAndUpdate(
      { key: 'college_logo_url' },
      { $set: { key: 'college_logo_url', value: uploadResult.secure_url } },
      { upsert: true, new: true }
    );

    res.status(200).json({ success: true, url: uploadResult.secure_url });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to upload logo' });
  }
};

// @desc Get current submission deadline
// @route GET /api/system/deadline
// @access Private
exports.getSubmissionDeadline = async (req, res) => {
  try {
    const setting = await SystemSetting.findOne({ key: 'submission_deadline' }).lean();
    const deadline = setting?.value ? new Date(setting.value) : null;
    const isExpired = deadline ? new Date() > deadline : false;
    
    res.status(200).json({ 
      success: true, 
      deadline: deadline ? deadline.toISOString() : null,
      isExpired,
      expiresAt: deadline ? formatDateTime(deadline) : 'Not set'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to load deadline' });
  }
};

// @desc Set or update submission deadline
// @route PUT /api/system/deadline
// @access Private (admin)
exports.setSubmissionDeadline = async (req, res) => {
  try {
    const { deadline } = req.body;
    
    if (!deadline) {
      return res.status(400).json({ success: false, message: 'Deadline is required' });
    }
    
    // Validate it's a valid date
    const deadlineDate = new Date(deadline);
    if (isNaN(deadlineDate.getTime())) {
      return res.status(400).json({ success: false, message: 'Invalid deadline date' });
    }
    
    const setting = await SystemSetting.findOneAndUpdate(
      { key: 'submission_deadline' },
      { 
        $set: { 
          key: 'submission_deadline', 
          value: deadlineDate.toISOString(),
          updatedBy: req.user.id
        } 
      },
      { upsert: true, new: true }
    );
    
    res.status(200).json({ 
      success: true, 
      message: 'Submission deadline updated',
      deadline: deadlineDate.toISOString(),
      expiresAt: formatDateTime(deadlineDate)
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update deadline' });
  }
};

// @desc Check if submission deadline has expired
// @access Public utility
exports.isDeadlineExpired = async () => {
  try {
    const setting = await SystemSetting.findOne({ key: 'submission_deadline' }).lean();
    if (!setting || !setting.value) return false;
    
    const deadline = new Date(setting.value);
    return new Date() > deadline;
  } catch (error) {
    return false;
  }
};

// @desc Get deadline expiry status (used by API to send with project data)
// @access Public utility
exports.getDeadlineStatus = async () => {
  try {
    const setting = await SystemSetting.findOne({ key: 'submission_deadline' }).lean();
    if (!setting || !setting.value) {
      return { deadline: null, isExpired: false };
    }
    
    const deadline = new Date(setting.value);
    const isExpired = new Date() > deadline;
    
    return { 
      deadline: deadline.toISOString(),
      isExpired,
      expiresAt: formatDateTime(deadline)
    };
  } catch (error) {
    return { deadline: null, isExpired: false };
  }
};
