jest.mock('../models/User', () => ({
  findOne: jest.fn(),
  findById: jest.fn(),
  countDocuments: jest.fn(),
  create: jest.fn()
}));

jest.mock('../models/Project', () => ({
  findById: jest.fn(),
  findOne: jest.fn(),
  countDocuments: jest.fn()
}));

jest.mock('../models/Notification', () => ({
  find: jest.fn(),
  countDocuments: jest.fn()
}));

jest.mock('../models/UserType', () => ({
  findOne: jest.fn()
}));

jest.mock('../models/Preset', () => ({
  findOne: jest.fn(),
  findOneAndUpdate: jest.fn(),
  findById: jest.fn(),
  findByIdAndUpdate: jest.fn(),
  updateMany: jest.fn(),
  countDocuments: jest.fn(),
  create: jest.fn(),
  deleteOne: jest.fn()
}));

jest.mock('../utils/sendEmail', () => ({
  sendEmail: jest.fn().mockResolvedValue(true)
}));

const User = require('../models/User');
const Project = require('../models/Project');
const Notification = require('../models/Notification');
const UserType = require('../models/UserType');
const Preset = require('../models/Preset');
const authController = require('../controllers/authController');
const projectController = require('../controllers/projectController');
const notificationController = require('../controllers/notificationController');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
process.env.JWT_EXPIRE = process.env.JWT_EXPIRE || '30d';

const makeRes = () => {
  const res = {};
  res.statusCode = 200;
  res.cookies = [];
  res.status = jest.fn((code) => {
    res.statusCode = code;
    return res;
  });
  res.json = jest.fn((payload) => {
    res.payload = payload;
    return res;
  });
  res.cookie = jest.fn((name, value, options) => {
    res.cookies.push({ name, value, options });
    return res;
  });
  return res;
};

const makeReq = (overrides = {}) => ({
  body: {},
  params: {},
  query: {},
  user: { id: 'user-1', role: 'student', name: 'Test Student' },
  file: null,
  cookies: {},
  ...overrides
});

beforeEach(() => {
  jest.clearAllMocks();
  UserType.findOne.mockResolvedValue({ _id: 'user-type-student' });
  Preset.findOne.mockReturnValue({
    sort: jest.fn().mockResolvedValue(null)
  });
});

describe('Core workflow controller tests', () => {
  test('register creates a student and returns token cookie metadata', async () => {
    User.findOne.mockResolvedValueOnce(null);
    User.create.mockResolvedValueOnce({
      _id: 'user-1',
      name: 'Test Student',
      email: 'student@test.com',
      role: 'student',
      department: 'CSE',
      enrollmentNumber: '20CS001'
    });

    const req = makeReq({
      body: {
        name: 'Test Student',
        email: 'student@test.com',
        password: 'Test1234',
        role: 'student',
        department: 'CSE',
        enrollmentNumber: '20CS001'
      }
    });
    const res = makeRes();

    await authController.register(req, res);

    expect(User.findOne).toHaveBeenCalledWith({ email: 'student@test.com' });
    expect(User.create).toHaveBeenCalled();
    expect(res.statusCode).toBe(201);
    expect(res.cookies[0].name).toBe('token');
    expect(res.payload.success).toBe(true);
    expect(res.payload.user.role).toBe('student');
  });

  test('login rejects invalid credentials', async () => {
    const fakeUser = {
      _id: 'user-1',
      password: 'hashed-password',
      isActive: true,
      role: 'student',
      name: 'Test Student',
      email: 'student@test.com',
      department: 'CSE',
      enrollmentNumber: '20CS001',
      employeeId: null,
      matchPassword: jest.fn().mockResolvedValue(false)
    };

    User.findOne.mockReturnValueOnce({
      select: jest.fn().mockResolvedValue(fakeUser)
    });

    const req = makeReq({
      body: { email: 'student@test.com', password: 'WrongPass1' }
    });
    const res = makeRes();

    await authController.login(req, res);

    expect(res.statusCode).toBe(401);
    expect(res.payload.success).toBe(false);
  });

  test('logout clears the auth cookie', () => {
    const req = makeReq();
    const res = makeRes();

    authController.logout(req, res);

    expect(res.cookies[0].name).toBe('token');
    expect(res.cookies[0].value).toBe('none');
    expect(res.payload.success).toBe(true);
  });

  test('createProject rejects empty technology list', async () => {
    Project.findOne.mockResolvedValueOnce(null);
    Preset.findOne.mockResolvedValueOnce({
      _id: 'preset-1',
      phases: [{ title: 'Phase A' }],
      isActive: true
    });
    User.findById.mockResolvedValueOnce({
      verificationStatus: 'verified'
    });

    const req = makeReq({
      body: {
        title: 'AI Project',
        description: 'A full-length project description for testing',
        category: 'AI/ML',
        technologies: '[]',
        teamMembers: '[]'
      },
      user: { id: 'student-1', role: 'student', name: 'Test Student' }
    });
    const res = makeRes();

    await projectController.createProject(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.payload.message).toMatch(/technology/i);
  });

  test('requestSupervisor blocks already rejected projects', async () => {
    Project.findById.mockResolvedValueOnce({
      _id: 'project-1',
      student: 'student-1',
      adminStatus: 'rejected',
      supervisorStatus: 'pending',
      supervisor: null,
      save: jest.fn()
    });

    const req = makeReq({
      params: { id: 'project-1' },
      body: { supervisorId: 'faculty-1' },
      user: { id: 'student-1', role: 'student', name: 'Test Student' }
    });
    const res = makeRes();

    await projectController.requestSupervisor(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.payload.message).toMatch(/rejected/i);
  });

  test('uploadScreenRecording only allows approved in-progress projects', async () => {
    Project.findById.mockResolvedValueOnce({
      _id: 'project-1',
      student: 'student-1',
      status: 'proposal',
      adminStatus: 'pending',
      codeReview: null,
      supervisor: null,
      save: jest.fn()
    });

    const req = makeReq({
      params: { id: 'project-1' },
      user: { id: 'student-1', role: 'student', name: 'Test Student' },
      file: { filename: 'recording.mp4', originalname: 'recording.mp4', path: '/tmp/recording.mp4', size: 1000 }
    });
    const res = makeRes();

    await projectController.uploadScreenRecording(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.payload.message).toMatch(/approved in-progress/i);
  });

  test('getNotifications returns pagination metadata', async () => {
    const fakeQuery = {
      populate: jest.fn().mockReturnThis(),
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue([
        { _id: 'n1', isRead: false },
        { _id: 'n2', isRead: true }
      ])
    };

    Notification.find.mockReturnValueOnce(fakeQuery);
    Notification.countDocuments
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(1);

    const req = makeReq({
      query: { page: '1', limit: '20', read: 'false' },
      user: { id: 'student-1', role: 'student', name: 'Test Student' }
    });
    const res = makeRes();

    await notificationController.getNotifications(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.payload.totalPages).toBe(1);
    expect(res.payload.unreadCount).toBe(1);
    expect(Array.isArray(res.payload.notifications)).toBe(true);
  });
});
