const express = require('express');
const {
  getPresets,
  getPreset,
  createPreset,
  updatePreset,
  deletePreset,
  activatePreset,
  getActivePreset
} = require('../controllers/presetController');

const router = express.Router();

const { protect, authorize } = require('../middleware/auth');

router.use(protect); // All preset routes require authentication

router
  .route('/')
  .get(authorize('admin'), getPresets)
  .post(authorize('admin'), createPreset);

router
  .route('/active')
  .get(getActivePreset);

router
  .route('/:id/activate')
  .put(authorize('admin'), activatePreset);

router
  .route('/:id')
  .get(authorize('admin'), getPreset)
  .put(authorize('admin'), updatePreset)
  .delete(authorize('admin'), deletePreset);

module.exports = router;