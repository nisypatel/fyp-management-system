require('dotenv').config({ path: __dirname + '/../.env' });
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const User = require('../models/User');
const Department = require('../models/Department');

(async () => {
  try {
    await connectDB();
    const deptVal = 'CSE';
    const isObjectId = mongoose.Types.ObjectId.isValid(deptVal);
    if (isObjectId) {
      const users = await User.find({ role: 'faculty', isActive: true, department: mongoose.Types.ObjectId(deptVal) }).select('name email department');
      console.log('Found (by id):', users.length);
    } else {
      const foundDept = await Department.findOne({ name: { $regex: `^${deptVal}$`, $options: 'i' } }).select('_id');
      if (foundDept) {
        const users = await User.find({ role: 'faculty', isActive: true, department: foundDept._id }).select('name email department');
        console.log('Found (by dept id):', users.length);
      } else {
        // raw collection query
        const raw = await mongoose.connection.db.collection('users').find({ role: 'faculty', isActive: true, department: deptVal }).project({ name: 1, email: 1, department: 1 }).toArray();
        console.log('Found (raw string department):', raw.length);
      }
    }
    process.exit(0);
  } catch (err) {
    console.error('Error', err);
    process.exit(1);
  }
})();
