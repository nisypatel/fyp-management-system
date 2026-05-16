const { body, param, query } = require('express-validator');

const parseArrayPayload = (value) => {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      return [];
    }
  }
  return [];
};

const objectIdRule = (field, label) =>
  param(field)
    .isMongoId()
    .withMessage(`${label} is invalid`);

const roleRule = body('role')
  .optional()
  .trim()
  .toLowerCase()
  .isIn(['student', 'faculty', 'teacher', 'admin'])
  .withMessage('Role must be student, faculty, or admin');

const emailRule = body('email')
  .trim()
  .isEmail()
  .withMessage('Please provide a valid email address')
  .normalizeEmail();

const passwordRule = body('password')
  .isLength({ min: 8 })
  .withMessage('Password must be at least 8 characters')
  .matches(/^(?=.*[A-Za-z])(?=.*\d).+$/)
  .withMessage('Password must include letters and numbers');

const registrationPasswordRule = body('password')
  .isLength({ min: 8 })
  .withMessage('Password must be at least 8 characters');

const registerValidation = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 80 })
    .withMessage('Name must be between 2 and 80 characters'),
  emailRule,
  registrationPasswordRule,
  roleRule,
  body('department')
    .optional()
    .trim()
    .isLength({ min: 2, max: 120 })
    .withMessage('Department must be between 2 and 120 characters'),
  body('enrollmentNumber')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ min: 3, max: 40 })
    .withMessage('Enrollment number must be between 3 and 40 characters'),
  body('employeeId')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ min: 2, max: 40 })
    .withMessage('Employee ID must be between 2 and 40 characters'),
  body('phone')
    .optional({ values: 'falsy' })
    .trim()
    .matches(/^[0-9]{10}$/)
    .withMessage('Phone number must be exactly 10 digits')
];

const loginValidation = [
  emailRule,
  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

const forgotPasswordValidation = [
  emailRule
];

const resetPasswordValidation = [
  param('token')
    .isLength({ min: 10 })
    .withMessage('Reset token is invalid'),
  passwordRule
];

const updateProfileValidation = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 80 })
    .withMessage('Name must be between 2 and 80 characters'),
  body('phone')
    .optional({ values: 'falsy' })
    .trim()
    .matches(/^[0-9]{10}$/)
    .withMessage('Phone number must be exactly 10 digits')
];

const updatePasswordValidation = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('New password must be at least 8 characters')
    .matches(/^(?=.*[A-Za-z])(?=.*\d).+$/)
    .withMessage('New password must include letters and numbers')
];

const createProjectValidation = [
  body('title')
    .trim()
    .isLength({ min: 5, max: 200 })
    .withMessage('Title must be between 5 and 200 characters'),
  body('description')
    .trim()
    .isLength({ min: 20, max: 2000 })
    .withMessage('Description must be between 20 and 2000 characters'),
  body('category')
    .trim()
    .isIn(['Web Development', 'Mobile Development', 'AI/ML', 'Data Science', 'IoT', 'Cybersecurity', 'Other'])
    .withMessage('Please select a valid category'),
  body('technologies')
    .custom((value) => {
      const technologies = parseArrayPayload(value)
        .map((item) => String(item).trim())
        .filter(Boolean);

      if (!technologies.length) {
        throw new Error('Please provide at least one technology');
      }
      return true;
    }),
  body('teamMembers')
    .optional({ values: 'falsy' })
    .custom((value) => {
      const teamMembers = parseArrayPayload(value)
        .map((item) => String(item).trim())
        .filter(Boolean);

      if (teamMembers.length > 4) {
        throw new Error('You can add up to 4 team members');
      }

      return true;
    })
];

const requestSupervisorValidation = [
  objectIdRule('id', 'Project id'),
  body('supervisorId')
    .isMongoId()
    .withMessage('Supervisor id is invalid')
];

const supervisorResponseValidation = [
  objectIdRule('id', 'Project id'),
  body('status')
    .isIn(['accepted', 'rejected'])
    .withMessage('Status must be accepted or rejected')
];

const adminApprovalValidation = [
  objectIdRule('id', 'Project id'),
  body('status')
    .isIn(['approved', 'rejected'])
    .withMessage('Status must be approved or rejected')
];

const adminRemoveValidation = [
  objectIdRule('id', 'Project id'),
  body('reason')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Reason cannot exceed 1000 characters')
];

const addFeedbackValidation = [
  objectIdRule('id', 'Project id'),
  body('message')
    .trim()
    .isLength({ min: 5, max: 1200 })
    .withMessage('Feedback must be between 5 and 1200 characters')
];

const updateProgressValidation = [
  objectIdRule('id', 'Project id'),
  body('progress')
    .isInt({ min: 0, max: 100 })
    .withMessage('Progress must be between 0 and 100')
];

const teamInviteResponseValidation = [
  objectIdRule('id', 'Project id'),
  body('status')
    .isIn(['accepted', 'rejected'])
    .withMessage('Status must be accepted or rejected')
];

const submitPhaseValidation = [
  objectIdRule('id', 'Project id'),
  param('phaseId')
    .isMongoId()
    .withMessage('Phase id is invalid'),
  body('link')
    .optional({ values: 'falsy' })
    .isURL()
    .withMessage('Reference link must be a valid URL'),
  body('text')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 5000 })
    .withMessage('Text submission cannot exceed 5000 characters'),
  body('comments')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Comments cannot exceed 1000 characters')
];

const evaluatePhaseValidation = [
  objectIdRule('id', 'Project id'),
  param('phaseId')
    .isMongoId()
    .withMessage('Phase id is invalid'),
  body('status')
    .isIn(['approved', 'rejected'])
    .withMessage('Status must be approved or rejected'),
  body('feedback')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Feedback cannot exceed 1000 characters')
];

const updatePhaseTemplateValidation = [
  body('phases')
    .isArray({ min: 1, max: 20 })
    .withMessage('Phases must be an array with 1 to 20 items'),
  body('phases.*.title')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Each phase title must be between 2 and 100 characters'),
  body('phases.*.submissionType')
    .optional()
    .isIn(['file', 'url', 'text', 'textarea'])
    .withMessage('Submission type must be file, url, text, or textarea')
];

const reviewScreenRecordingValidation = [
  objectIdRule('id', 'Project id'),
  body('status')
    .isIn(['approved', 'rejected'])
    .withMessage('Status must be approved or rejected'),
  body('feedback')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Feedback cannot exceed 1000 characters')
];

const notificationListValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be greater than 0')
    .toInt(),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
    .toInt(),
  query('read')
    .optional()
    .isIn(['true', 'false'])
    .withMessage('Read filter must be true or false'),
  query('type')
    .optional()
    .trim()
    .isLength({ min: 2, max: 64 })
    .withMessage('Type filter is invalid')
];

const notificationIdValidation = [
  objectIdRule('id', 'Notification id')
];

const createUserValidation = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 80 })
    .withMessage('Name must be between 2 and 80 characters'),
  emailRule,
  registrationPasswordRule,
  body('role')
    .trim()
    .toLowerCase()
    .isIn(['student', 'faculty', 'teacher', 'admin'])
    .withMessage('Role must be student, faculty, or admin'),
  body('department')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 120 })
    .withMessage('Department is too long'),
  body('enrollmentNumber')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 40 })
    .withMessage('Enrollment number is too long'),
  body('employeeId')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 40 })
    .withMessage('Employee ID is too long'),
  body('phone')
    .optional({ values: 'falsy' })
    .trim()
    .matches(/^[0-9]{10}$/)
    .withMessage('Phone number must be exactly 10 digits')
];

const updateUserValidation = [
  objectIdRule('id', 'User id'),
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 80 })
    .withMessage('Name must be between 2 and 80 characters'),
  body('email')
    .optional()
    .trim()
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
  body('department')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 120 })
    .withMessage('Department is too long'),
  body('phone')
    .optional({ values: 'falsy' })
    .trim()
    .matches(/^[0-9]{10}$/)
    .withMessage('Phone number must be exactly 10 digits'),
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be true or false')
    .toBoolean()
];

module.exports = {
  registerValidation,
  loginValidation,
  forgotPasswordValidation,
  resetPasswordValidation,
  updateProfileValidation,
  updatePasswordValidation,
  createProjectValidation,
  requestSupervisorValidation,
  supervisorResponseValidation,
  adminApprovalValidation,
  addFeedbackValidation,
  updateProgressValidation,
  teamInviteResponseValidation,
  submitPhaseValidation,
  evaluatePhaseValidation,
  updatePhaseTemplateValidation,
  reviewScreenRecordingValidation,
  notificationListValidation,
  notificationIdValidation,
  adminRemoveValidation,
  // adminRestoreValidation is same as objectId check, reusing objectIdRule in route
  createUserValidation,
  updateUserValidation,
  objectIdRule
};
