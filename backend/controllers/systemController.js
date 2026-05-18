const SystemSetting = require('../models/SystemSetting');
const { uploadFileToCloudinary, isCloudinaryConfigured } = require('../utils/cloudinary');


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
