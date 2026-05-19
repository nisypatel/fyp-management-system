const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

async function main() {
  const email = 'vrajptl90@gmail.com';
  const newPassword = '0000';

  if (!process.env.MONGO_URI) {
    console.error('MONGO_URI not set in .env');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  });

  try {
    // Hash the new password and update using updateOne to avoid document validation
    const salt = await bcrypt.genSalt(10);
    const hashed = await bcrypt.hash(newPassword, salt);

    const result = await User.updateOne({ email }, { $set: { password: hashed } });
    if (!result.matchedCount && !result.n) {
      console.error('User not found:', email);
      await mongoose.disconnect();
      process.exit(1);
    }

    console.log('Password updated for', email);
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    await mongoose.disconnect();
    process.exit(1);
  }
}

main();
