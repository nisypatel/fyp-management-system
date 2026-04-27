const { validationResult } = require('express-validator');
const {
  registerValidation,
  createProjectValidation,
  requestSupervisorValidation,
  notificationListValidation,
  submitPhaseValidation
} = require('../middleware/validators');

const runValidation = async ({ validators, body = {}, params = {}, query = {} }) => {
  const req = {
    body,
    params,
    query,
    headers: {},
    cookies: {}
  };

  for (const validator of validators) {
    await validator.run(req);
  }

  return validationResult(req).array();
};

describe('Request validators', () => {
  test('registerValidation rejects weak password', async () => {
    const errors = await runValidation({
      validators: registerValidation,
      body: {
        name: 'Test User',
        email: 'test@example.com',
        password: '1234567',
        role: 'student',
        department: 'CSE',
        enrollmentNumber: '20CS001'
      }
    });

    expect(errors.some((error) => error.path === 'password')).toBe(true);
  });

  test('requestSupervisorValidation rejects malformed project id', async () => {
    const errors = await runValidation({
      validators: requestSupervisorValidation,
      params: { id: 'bad-id' },
      body: { supervisorId: '507f1f77bcf86cd799439011' }
    });

    expect(errors.some((error) => error.path === 'id')).toBe(true);
  });

  test('notificationListValidation accepts valid query and parses integers', async () => {
    const errors = await runValidation({
      validators: notificationListValidation,
      query: { page: '2', limit: '10', read: 'false' }
    });

    expect(errors.length).toBe(0);
  });

  test('submitPhaseValidation rejects invalid reference link', async () => {
    const errors = await runValidation({
      validators: submitPhaseValidation,
      params: {
        id: '507f1f77bcf86cd799439011',
        phaseId: '507f1f77bcf86cd799439012'
      },
      body: { link: 'not-a-url' }
    });

    expect(errors.some((error) => error.path === 'link')).toBe(true);
  });

  test('createProjectValidation rejects empty technologies array', async () => {
    const errors = await runValidation({
      validators: createProjectValidation,
      body: {
        title: 'Final Year Project',
        description: 'This is a sufficiently long description for validation.',
        category: 'Web Development',
        technologies: '[]'
      }
    });

    expect(errors.some((error) => error.path === 'technologies')).toBe(true);
  });

  test('createProjectValidation accepts non-empty technologies array', async () => {
    const errors = await runValidation({
      validators: createProjectValidation,
      body: {
        title: 'Final Year Project',
        description: 'This is a sufficiently long description for validation.',
        category: 'Web Development',
        technologies: JSON.stringify(['React', 'Node.js'])
      }
    });

    expect(errors.some((error) => error.path === 'technologies')).toBe(false);
  });
});
