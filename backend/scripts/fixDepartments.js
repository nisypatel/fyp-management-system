const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env') });

const User = require('../models/User');
const Department = require('../models/Department');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/fyp_management';

const run = async () => {
  await mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
  console.log('Connected to DB');

  try {
    const users = await User.find({ department: { $type: 'string' } }).select('name email department');
    console.log(`Found ${users.length} users with string department`);

    let updated = 0;

    for (const user of users) {
      const depName = String(user.department).trim();
      if (!depName) continue;
      const dept = await Department.findOne({ name: depName });
      if (dept) {
        user.department = dept._id;
        await user.save();
        updated += 1;
        console.log(`Updated user ${user.email} -> department ${dept.name} (${dept._id})`);
      } else {
        console.log(`No department record found for '${depName}' (user ${user.email})`);
      }
    }

    console.log(`Migration complete. ${updated} users updated.`);
  } catch (err) {
    console.error('Migration failed', err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
};

run();
