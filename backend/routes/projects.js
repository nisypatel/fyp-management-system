const express = require('express');
const router = express.Router();
const {
  createProject,
  getProjects,
  getProject,
  requestSupervisor,
  supervisorResponse,
  adminApproval,
  addFeedback,
  uploadDocument,
  updateProgress,
  getSupervisorRequests,
  getPendingProjects,
  submitPhase,
  evaluatePhase
} = require('../controllers/projectController');
const { protect, authorize } = require('../middleware/auth');
const { upload, handleMulterError } = require('../middleware/upload');

// General routes
router.route('/')
  .get(protect, getProjects)
  .post(protect, authorize('student'), upload.single('proposalFile'), handleMulterError, createProject);

router.get('/supervisor/requests', protect, authorize('teacher'), getSupervisorRequests);
router.get('/admin/pending', protect, authorize('admin'), getPendingProjects);

router.route('/:id')
  .get(protect, getProject);

router.put('/:id/request-supervisor', protect, authorize('student'), requestSupervisor);
router.put('/:id/supervisor-response', protect, authorize('teacher'), supervisorResponse);
router.put('/:id/admin-approval', protect, authorize('admin'), adminApproval);
router.post('/:id/feedback', protect, authorize('teacher', 'admin'), addFeedback);
router.post('/:id/documents', protect, upload.single('document'), handleMulterError, uploadDocument);
router.put('/:id/progress', protect, authorize('student', 'teacher'), updateProgress);

// Phases routes
router.put('/:id/phases/:phaseId/submit', protect, authorize('student'), upload.single('document'), handleMulterError, submitPhase);
router.put('/:id/phases/:phaseId/evaluate', protect, authorize('teacher'), evaluatePhase);

module.exports = router;
