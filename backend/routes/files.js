const express = require('express');
const router = express.Router();
const {
  downloadFile,
  deleteFile
} = require('../controllers/fileController');
const { protect } = require('../middleware/auth');
const { param } = require('express-validator');
const { validateRequest } = require('../middleware/validation');

router.get(
  '/download/:filename',
  protect,
  param('filename').trim().notEmpty().withMessage('Filename is required'),
  validateRequest,
  downloadFile
);

router.delete(
  '/:projectId/:documentId',
  protect,
  param('projectId').isMongoId().withMessage('Project id is invalid'),
  param('documentId').isMongoId().withMessage('Document id is invalid'),
  validateRequest,
  deleteFile
);

module.exports = router;
