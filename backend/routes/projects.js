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
  getPhaseTemplate,
  updatePhaseTemplate,
  submitPhase,
  evaluatePhase,
  uploadScreenRecording,
  reviewScreenRecording
} = require('../controllers/projectController');
const { protect, authorize } = require('../middleware/auth');
const { upload, uploadVideo, phaseUpload, handleMulterError } = require('../middleware/upload');
const { validateRequest } = require('../middleware/validation');
const {
  createProjectValidation,
  requestSupervisorValidation,
  supervisorResponseValidation,
  adminApprovalValidation,
  teamInviteResponseValidation,
  addFeedbackValidation,
  updateProgressValidation,
  updatePhaseTemplateValidation,
  submitPhaseValidation,
  evaluatePhaseValidation,
  reviewScreenRecordingValidation,
  objectIdRule
} = require('../middleware/validators');

// General routes
router.route('/')
  .get(protect, getProjects)
  .post(
    protect,
    authorize('student'),
    upload.single('proposalFile'),
    handleMulterError,
    createProjectValidation,
    validateRequest,
    createProject
  );

router.get('/supervisor/requests', protect, authorize('faculty'), getSupervisorRequests);
router.get('/admin/pending', protect, authorize('admin'), getPendingProjects);
router.get('/team/invites', protect, authorize('student'), getTeamInvites);
router.get('/phase-template', protect, getPhaseTemplate);
router.put('/phase-template', protect, authorize('admin'), updatePhaseTemplateValidation, validateRequest, updatePhaseTemplate);

router.route('/:id')
  .get(protect, objectIdRule('id', 'Project id'), validateRequest, getProject);

router.put('/:id/request-supervisor', protect, authorize('student'), requestSupervisorValidation, validateRequest, requestSupervisor);
router.put('/:id/supervisor-response', protect, authorize('faculty'), supervisorResponseValidation, validateRequest, supervisorResponse);
router.put('/:id/admin-approval', protect, authorize('admin'), adminApprovalValidation, validateRequest, adminApproval);
router.put('/:id/team-invite-response', protect, authorize('student'), teamInviteResponseValidation, validateRequest, respondToTeamInvite);
router.post('/:id/feedback', protect, authorize('faculty', 'admin'), addFeedbackValidation, validateRequest, addFeedback);
router.post('/:id/documents', protect, objectIdRule('id', 'Project id'), validateRequest, upload.single('document'), handleMulterError, uploadDocument);
router.post('/:id/screen-recording', protect, authorize('student'), objectIdRule('id', 'Project id'), validateRequest, uploadVideo.single('screenRecording'), handleMulterError, uploadScreenRecording);
router.put('/:id/screen-recording/review', protect, authorize('faculty', 'admin'), reviewScreenRecordingValidation, validateRequest, reviewScreenRecording);
router.put('/:id/progress', protect, authorize('faculty'), updateProgressValidation, validateRequest, updateProgress);

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
  submitPhaseValidation,
  validateRequest,
  submitPhase
);
router.put('/:id/phases/:phaseId/evaluate', protect, authorize('faculty'), evaluatePhaseValidation, validateRequest, evaluatePhase);

module.exports = router;
