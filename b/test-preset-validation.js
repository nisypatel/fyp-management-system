const mongoose = require('mongoose');
const Preset = require('./models/Preset');

async function test() {
  try {
    const doc = new Preset({ 
      name: 'Test', 
      phases: [{ title: 'Phase 1' }], 
      createdBy: new mongoose.Types.ObjectId() 
    });
    
    const result = await doc.validate();
    console.log('Validation passed');
  } catch (err) {
    console.log('Validation error:', err.name);
    console.log('Errors:', Object.keys(err.errors || {}).map(k => ({
      path: k,
      message: err.errors[k].message
    })));
  }
}

test().catch(console.error);
