const mongoose = require('mongoose');
const logger = require('../utils/logger');
const { migrateSchema } = require('../utils/schemaMigration');

const migrateLegacyCollections = async (db) => {
  const collections = await db.listCollections({}, { nameOnly: true }).toArray();
  const collectionNames = new Set(collections.map((item) => item.name));

  const renamePairs = [
    { from: 'phase_templates', to: 'phasetemplates' },
    { from: 'fileuploads', to: 'file_uploads' },
    { from: 'refreshtokens', to: 'refresh_tokens' }
  ];

  for (const pair of renamePairs) {
    const hasLegacy = collectionNames.has(pair.from);
    const hasTarget = collectionNames.has(pair.to);

    if (hasLegacy && !hasTarget) {
      await db.collection(pair.from).rename(pair.to);
      logger.info(`Migrated collection '${pair.from}' to '${pair.to}'`);
      collectionNames.delete(pair.from);
      collectionNames.add(pair.to);
    } else if (hasLegacy && hasTarget) {
      logger.warn(
        `Both '${pair.from}' and '${pair.to}' exist. Migration skipped to avoid data loss.`
      );
    }
  }
};

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    await migrateLegacyCollections(conn.connection.db);
    await migrateSchema();

    logger.info(`MongoDB Connected: ${conn.connection.host}`);

    return conn;
  } catch (error) {
    logger.error(`Database connection error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
