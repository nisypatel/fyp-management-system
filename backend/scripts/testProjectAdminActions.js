require('dotenv').config();
const connectDB = require('../config/db');
const { adminRemoveProject, adminRestoreProject, adminDeleteProject } = require('../controllers/projectController');

const makeRes = () => {
  const res = {};
  res.statusCode = 200;
  res.status = (code) => { res.statusCode = code; return res; };
  res.json = (payload) => { res.payload = payload; console.log('RESPONSE', res.statusCode, JSON.stringify(payload)); return res; };
  return res;
};

(async () => {
  try {
    await connectDB();
    const projectId = process.argv[2];
    const action = process.argv[3];
    const req = { params: { id: projectId }, user: { id: '698ff9c39001dfdd2496f642', role: 'admin' } };
    const res = makeRes();

    if (action === 'remove') {
      req.body = { reason: 'test' };
      await adminRemoveProject(req, res);
    } else if (action === 'restore') {
      await adminRestoreProject(req, res);
    } else if (action === 'delete') {
      await adminDeleteProject(req, res);
    } else {
      throw new Error('action must be restore or delete');
    }

    process.exit(0);
  } catch (error) {
    console.error('SCRIPT ERR', error);
    process.exit(1);
  }
})();
