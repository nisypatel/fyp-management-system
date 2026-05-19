require('dotenv').config({ override: true });
const mongoose = require('mongoose');

const run = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  const db = mongoose.connection.db;
  const depts = await db.collection('departments').find().project({ _id: 1, name: 1 }).toArray();

  let totalUpdated = 0;
  for (const d of depts) {
    const name = d.name;
    if (!name) continue;
    const res = await db.collection('users').updateMany({ department: name }, { $set: { department: d._id } });
    console.log(`Updated ${res.modifiedCount} users for department '${name}' -> ${d._id}`);
    totalUpdated += res.modifiedCount || 0;
  }

  // Also handle case-insensitive variants: map 'cse' -> 'CSE'
  // Build map of lowercase name->id
  const map = new Map(depts.map(d => [String(d.name).toLowerCase(), d._id]));
  const legacyRows = await db.collection('users').aggregate([
    { $match: { department: { $type: 'string' } } },
    { $group: { _id: { $toLower: '$department' }, vals: { $addToSet: '$department' }, count: { $sum: 1 } } }
  ]).toArray();

  for (const row of legacyRows) {
    const low = row._id;
    if (map.has(low)) {
      const id = map.get(low);
      const res = await db.collection('users').updateMany({ department: { $in: row.vals } }, { $set: { department: id } });
      console.log(`Case-insensitive: Updated ${res.modifiedCount} users for variants ${JSON.stringify(row.vals)} -> ${id}`);
      totalUpdated += res.modifiedCount || 0;
    }
  }

  console.log(`Migration complete. Total updated: ${totalUpdated}`);
  await mongoose.disconnect();
};

run().catch(err => { console.error(err); process.exit(1); });
