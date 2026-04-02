const express = require('express');
const router = express.Router();
const {
  downloadFile,
  deleteFile
} = require('../controllers/fileController');
const { protect } = require('../middleware/auth');

router.get('/download/:filename', protect, downloadFile);
router.delete('/:projectId/:documentId', protect, deleteFile);

module.exports = router;
