const User = require('../models/User');
const Project = require('../models/Project');
const Notification = require('../models/Notification');
const PhaseTemplate = require('../models/PhaseTemplate');
const RefreshToken = require('../models/RefreshToken');

const DEFAULT_PHASE_TEMPLATES = [
  {
    title: 'Synopsis',
    order: 1,
    description: 'Submit the project synopsis and proposed objectives.',
    submissionType: 'file'
  },
  {
    title: 'Design/UML',
    order: 2,
    description: 'Submit architecture, UML diagrams, and system design artifacts.',
    submissionType: 'file'
  },
  {
    title: 'Frontend',
    order: 3,
    description: 'Submit the client-side implementation and UI progress.',
    submissionType: 'file'
  },
  {
    title: 'Backend',
    order: 4,
    description: 'Submit the server-side implementation and API progress.',
    submissionType: 'file'
  },
  {
    title: 'Testing & Report',
    order: 5,
    description: 'Submit final testing evidence and project report.',
    submissionType: 'file'
  }
];

const Department = require('../models/Department');

const collections = [User, Project, Notification, PhaseTemplate, RefreshToken, Department];

const seedPhaseTemplates = async () => {
  const existingCount = await PhaseTemplate.countDocuments();

  if (existingCount > 0) {
    return;
  }

  await PhaseTemplate.insertMany(DEFAULT_PHASE_TEMPLATES);
  console.log('Seeded default phase templates');
};

const bootstrapDatabase = async () => {
  await Promise.all(collections.map((model) => model.createCollection()));
  // Use syncIndexes to safely create/update indexes without conflicts
  await Promise.all(collections.map((model) => model.syncIndexes()));
  await seedPhaseTemplates();
  // Migrate existing string departments into Department collection
  try {
    // Find distinct department values where stored as string (legacy)
    const legacyDepartments = await User.aggregate([
      { $match: { department: { $exists: true, $ne: null, $type: 'string' } } },
      { $group: { _id: '$department' } }
    ]).then(rows => rows.map(r => r._id).filter(Boolean));

    for (const deptName of legacyDepartments) {
      const name = String(deptName).trim();
      if (!name) continue;
      let dept = await Department.findOne({ name });
      if (!dept) {
        dept = await Department.create({ name });
      }
      // Update users with string department to reference this dept id
      await User.updateMany({ department: name }, { $set: { department: dept._id } });
    }
  } catch (err) {
    console.warn('Department migration skipped or failed', err.message);
  }
};

module.exports = bootstrapDatabase;