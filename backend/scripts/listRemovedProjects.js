require('dotenv').config();
const connectDB = require('../config/db');
const Project = require('../models/Project');

(async () => {
  try {
    await connectDB();
    const projects = await Project.find({ 'removed.at': { $exists: true, $ne: null } })
      .select('_id title removed adminStatus status')
      .lean();

    console.log(JSON.stringify(projects, null, 2));
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
})();
