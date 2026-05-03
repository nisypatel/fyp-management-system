const User = require('../models/User');
const Project = require('../models/Project');
const Notification = require('../models/Notification');
const PhaseTemplate = require('../models/PhaseTemplate');
const RefreshToken = require('../models/RefreshToken');

const DEFAULT_PHASE_TEMPLATES = [
  {
    title: 'Synopsis',
    order: 1,
    description: 'Submit the project synopsis and proposed objectives.'
  },
  {
    title: 'Design/UML',
    order: 2,
    description: 'Submit architecture, UML diagrams, and system design artifacts.'
  },
  {
    title: 'Frontend',
    order: 3,
    description: 'Submit the client-side implementation and UI progress.'
  },
  {
    title: 'Backend',
    order: 4,
    description: 'Submit the server-side implementation and API progress.'
  },
  {
    title: 'Testing & Report',
    order: 5,
    description: 'Submit final testing evidence and project report.'
  }
];

const collections = [User, Project, Notification, PhaseTemplate, RefreshToken];

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
};

module.exports = bootstrapDatabase;