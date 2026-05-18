const mongoose = require('mongoose');

const departmentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    unique: true
  },
  code: {
    type: String,
    trim: true,
    default: null
  }
}, { timestamps: true });

module.exports = mongoose.model('Department', departmentSchema);
