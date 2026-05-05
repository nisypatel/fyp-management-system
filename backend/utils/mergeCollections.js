require('dotenv').config();
const mongoose = require('mongoose');
const logger = require('./logger');

const renamePairs = [
  { from: 'phase_templates', to: 'phasetemplates' },
  { from: 'fileuploads', to: 'file_uploads' },
  { from: 'refreshtokens', to: 'refresh_tokens' }
];

const run = async () => {
  if (!process.env.MONGO_URI) {
    console.error('MONGO_URI not set');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI);
  const db = mongoose.connection.db;
  const ts = Date.now();

  for (const pair of renamePairs) {
    const collections = await db.listCollections({ name: pair.from }).toArray();
    const targets = await db.listCollections({ name: pair.to }).toArray();
    const hasLegacy = collections.length > 0;
    const hasTarget = targets.length > 0;

    if (hasLegacy && hasTarget) {
      console.log(`Found both '${pair.from}' and '${pair.to}'. Preparing safe merge.`);

      const legacyDocs = await db.collection(pair.from).find().toArray();
      console.log(`- Legacy docs: ${legacyDocs.length}`);

      // Backup legacy docs into a backup collection (no _id preserved to avoid conflicts)
      const backupName = `backup_${pair.from}_${ts}`;
      const backupDocs = legacyDocs.map((d) => {
        const copy = { ...d };
        delete copy._id;
        return copy;
      });

      if (backupDocs.length > 0) {
        await db.collection(backupName).insertMany(backupDocs, { ordered: false });
        console.log(`- Backed up legacy collection to '${backupName}' (${backupDocs.length} docs)`);
      } else {
        console.log('- No docs to backup from legacy collection.');
      }

      // Try inserting legacy docs into target collection, skipping _id to avoid collisions
      const docsToInsert = legacyDocs.map((d) => {
        const copy = { ...d };
        delete copy._id;
        return copy;
      });

      let inserted = 0;
      if (docsToInsert.length > 0) {
        try {
          const res = await db.collection(pair.to).insertMany(docsToInsert, { ordered: false });
          inserted = res.insertedCount || 0;
        } catch (err) {
          // insertMany with ordered:false may still throw on some duplicate key errors; count inserted from error if available
          if (err && err.insertedCount != null) inserted = err.insertedCount;
          console.warn('- Some documents could not be inserted due to duplicates or constraints.');
        }
      }

      console.log(`- Inserted ${inserted} documents into '${pair.to}'.`);

      if (process.env.MERGE_AND_REMOVE === 'true') {
        // Only remove legacy collection if explicitly enabled
        await db.collection(pair.from).drop();
        console.log(`- Dropped legacy collection '${pair.from}'.`);
      } else {
        console.log("- Legacy collection preserved. To remove it after verifying, set MERGE_AND_REMOVE=true and rerun this script.");
      }
    }
  }

  await mongoose.disconnect();
  console.log('Merge script completed.');
};

run().catch((err) => {
  console.error('Merge script error:', err);
  process.exit(1);
});
