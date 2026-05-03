const Preset = require('../models/Preset');
const asyncHandler = require('../middleware/async');
const ErrorResponse = require('../utils/appError');

// @desc    Get all presets
// @route   GET /api/presets
// @access  Private (Admin)
exports.getPresets = asyncHandler(async (req, res, next) => {
  const presets = await Preset.find().populate('createdBy', 'name').populate('updatedBy', 'name');

  res.status(200).json({
    success: true,
    count: presets.length,
    data: presets
  });
});

// @desc    Get single preset
// @route   GET /api/presets/:id
// @access  Private (Admin)
exports.getPreset = asyncHandler(async (req, res, next) => {
  const preset = await Preset.findById(req.params.id)
    .populate('createdBy', 'name')
    .populate('updatedBy', 'name');

  if (!preset) {
    return next(new ErrorResponse('Preset not found', 404));
  }

  res.status(200).json({
    success: true,
    data: preset
  });
});

// @desc    Create preset
// @route   POST /api/presets
// @access  Private (Admin)
exports.createPreset = asyncHandler(async (req, res, next) => {
  req.body.createdBy = req.user.id;

  const activePresetCount = await Preset.countDocuments({ isActive: true });
  if (activePresetCount === 0) {
    req.body.isActive = true;
  }

  if (req.body.phases && Array.isArray(req.body.phases)) {
    req.body.phases = req.body.phases.map((phase, index) => ({
      title: phase.title,
      order: index + 1
    }));
  }

  const preset = await Preset.create(req.body);

  res.status(201).json({
    success: true,
    data: preset
  });
});

// @desc    Update preset
// @route   PUT /api/presets/:id
// @access  Private (Admin)
exports.updatePreset = asyncHandler(async (req, res, next) => {
  let preset = await Preset.findById(req.params.id);

  if (!preset) {
    return next(new ErrorResponse('Preset not found', 404));
  }

  req.body.updatedBy = req.user.id;

  if (req.body.phases && Array.isArray(req.body.phases)) {
    req.body.phases = req.body.phases.map((phase, index) => ({
      title: phase.title,
      order: index + 1
    }));
  }

  // Add to change history
  if (req.body.phases || req.body.name) {
    const changes = [];
    if (req.body.name && req.body.name !== preset.name) {
      changes.push(`Name changed from '${preset.name}' to '${req.body.name}'`);
    }
    if (req.body.phases) {
      changes.push('Phases updated');
    }

    req.body.changeHistory = [
      ...preset.changeHistory,
      {
        changedBy: req.user.id,
        action: 'Updated',
        changes: changes.join(', ')
      }
    ];
  }

  preset = await Preset.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  });

  res.status(200).json({
    success: true,
    data: preset
  });
});

// @desc    Delete preset
// @route   DELETE /api/presets/:id
// @access  Private (Admin)
exports.deletePreset = asyncHandler(async (req, res, next) => {
  const preset = await Preset.findById(req.params.id);

  if (!preset) {
    return next(new ErrorResponse('Preset not found', 404));
  }

  // Check if it's the last preset
  const presetCount = await Preset.countDocuments();
  if (presetCount <= 1) {
    return next(new ErrorResponse('Cannot delete the last preset', 400));
  }

  await preset.deleteOne();

  res.status(200).json({
    success: true,
    data: {}
  });
});

// @desc    Set active preset
// @route   PUT /api/presets/:id/activate
// @access  Private (Admin)
exports.activatePreset = asyncHandler(async (req, res, next) => {
  const preset = await Preset.findById(req.params.id);

  if (!preset) {
    return next(new ErrorResponse('Preset not found', 404));
  }

  // Deactivate all other presets
  await Preset.updateMany({}, { isActive: false });

  // Activate this preset
  preset.isActive = true;
  preset.updatedBy = req.user.id;
  preset.changeHistory.push({
    changedBy: req.user.id,
    action: 'Activated',
    changes: 'Preset set as active'
  });

  await preset.save();

  res.status(200).json({
    success: true,
    data: preset
  });
});

// @desc    Get active preset
// @route   GET /api/presets/active
// @access  Private
exports.getActivePreset = asyncHandler(async (req, res, next) => {
  let preset = await Preset.findOne({ isActive: true });

  if (!preset) {
    preset = await Preset.findOne();
  }

  if (!preset) {
    return next(new ErrorResponse('No preset found', 404));
  }

  res.status(200).json({
    success: true,
    data: preset
  });
});