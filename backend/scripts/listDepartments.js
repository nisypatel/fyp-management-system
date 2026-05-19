require('dotenv').config({ override: true });
const mongoose = require('mongoose');
const Department = require('../models/Department');

const run = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  const docs = await Department.find().select('name code').lean();
  console.log('Departments:');
  console.table(docs);
  await mongoose.disconnect();
};

run().catch(err => { console.error(err); process.exit(1); });
