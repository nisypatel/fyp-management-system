require('dotenv').config();
const connectDB = require('../config/db');
const Project = require('../models/Project');

(async () => {
  try {
    await connectDB();
    const id = process.argv[2];
    if (!id) {
      console.error('Usage: node printProjectById.js <projectId>');
      process.exit(2);
    }

    const project = await Project.findById(id).lean();
    if (!project) {
      console.error('Project not found');
      process.exit(1);
    }

    const out = {
      _id: project._id,
      title: project.title,
      status: project.status,
      adminStatus: project.adminStatus,
      student: project.student,
      presetId: project.presetId,
      presetSnapshot: project.presetSnapshot,
      phases: project.phases,
      removed: project.removed || null,
      progress: project.progress
    };

    console.log(JSON.stringify(out, null, 2));
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
})();
