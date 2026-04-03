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
  getTeamInvites,
  respondToTeamInvite,
  getSupervisorRequests,
  getPendingProjects,
  submitPhase,
  evaluatePhase,
  uploadScreenRecording,
  reviewScreenRecording
} = require('../controllers/projectController');
const { protect, authorize } = require('../middleware/auth');
const { upload, uploadVideo, phaseUpload, handleMulterError } = require('../middleware/upload');

// General routes
router.route('/')
  .get(protect, getProjects)
  .post(protect, authorize('student'), upload.single('proposalFile'), handleMulterError, createProject);

router.get('/supervisor/requests', protect, authorize('faculty'), getSupervisorRequests);
router.get('/admin/pending', protect, authorize('admin'), getPendingProjects);
router.get('/team/invites', protect, authorize('student'), getTeamInvites);

router.route('/:id')
  .get(protect, getProject);

router.put('/:id/request-supervisor', protect, authorize('student'), requestSupervisor);
router.put('/:id/supervisor-response', protect, authorize('faculty'), supervisorResponse);
router.put('/:id/admin-approval', protect, authorize('admin'), adminApproval);
router.put('/:id/team-invite-response', protect, authorize('student'), respondToTeamInvite);
router.post('/:id/feedback', protect, authorize('faculty', 'admin'), addFeedback);
router.post('/:id/documents', protect, upload.single('document'), handleMulterError, uploadDocument);
router.post('/:id/screen-recording', protect, authorize('student'), uploadVideo.single('screenRecording'), handleMulterError, uploadScreenRecording);
router.put('/:id/screen-recording/review', protect, authorize('faculty', 'admin'), reviewScreenRecording);
router.put('/:id/progress', protect, authorize('faculty'), updateProgress);

// Phases routes
router.put(
  '/:id/phases/:phaseId/submit',
  protect,
  authorize('student'),
  phaseUpload.fields([
    { name: 'document', maxCount: 1 },
    { name: 'supportingVideo', maxCount: 1 }
  ]),
  handleMulterError,
  submitPhase
);
router.put('/:id/phases/:phaseId/evaluate', protect, authorize('faculty'), evaluatePhase);

module.exports = router;
