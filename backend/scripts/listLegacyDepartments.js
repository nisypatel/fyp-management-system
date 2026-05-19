require('dotenv').config({ override: true });
const mongoose = require('mongoose');
const User = require('../models/User');

const run = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  const rows = await User.aggregate([
    { $match: { department: { $exists: true, $ne: null, $type: 'string' } } },
    { $group: { _id: '$department', count: { $sum: 1 } } }
  ]);
  console.log('Legacy departments and counts:');
  console.table(rows);

  for (const r of rows) {
    const dept = r._id;
    // Use raw collection to avoid Mongoose casting the string to ObjectId
    const users = await mongoose.connection.db.collection('users').find({ department: dept }).project({ name: 1, email: 1, department: 1 }).toArray();
    console.log(`\nUsers with department='${dept}':`);
    users.forEach(u => console.log(`- ${u.email} (department: ${u.department})`));
  }

  await mongoose.disconnect();
};

run().catch(err => { console.error(err); process.exit(1); });
