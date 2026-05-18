const express = require('express');
const router = express.Router();
const { getSettings, updateSettings } = require('../controllers/systemController');
const { protect, authorize } = require('../middleware/auth');
const { validateRequest } = require('../middleware/validation');
const upload = require('../middleware/upload').uploadIDCard;
const { handleMulterError } = require('../middleware/upload');
const { uploadLogo } = require('../controllers/systemController');

router.get('/', protect, authorize('admin'), getSettings);
router.put('/', protect, authorize('admin'), updateSettings);
router.put('/logo', protect, authorize('admin'), upload.single('logo'), handleMulterError, uploadLogo);

module.exports = router;
