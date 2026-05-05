const logger = require('./logger');
const UserType = require('../models/UserType');
const User = require('../models/User');
const Preset = require('../models/Preset');
const SystemSetting = require('../models/SystemSetting');

const DEFAULT_USER_TYPES = [
  { key: 'student', name: 'Student', description: 'Student users with enrollment numbers' },
  { key: 'faculty', name: 'Faculty', description: 'Faculty users with employee IDs' },
  { key: 'admin', name: 'Administrator', description: 'Full access admin users' }
];
const VERIFICATION_DOMAIN_KEY = 'verification_email_domain';

const migrateSchema = async () => {
  try {
    for (const type of DEFAULT_USER_TYPES) {
      await UserType.findOneAndUpdate(
        { key: type.key },
        { $setOnInsert: type },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    }

    const userTypes = await UserType.find({ key: { $in: DEFAULT_USER_TYPES.map((item) => item.key) } });
    const userTypeMap = userTypes.reduce((acc, item) => {
      acc[item.key] = item._id;
      return acc;
    }, {});

    const usersToFix = await User.find({ $or: [{ roleType: { $exists: false } }, { roleType: null }] });
    for (const user of usersToFix) {
      const roleKey = user.role ? user.role.toString().trim().toLowerCase() : 'student';
      const typeId = userTypeMap[roleKey] || userTypeMap.student;
      if (typeId) {
        user.roleType = typeId;
        await user.save();
      }
    }

    const presets = await Preset.find();
    for (const preset of presets) {
      if (Array.isArray(preset.phases)) {
        const normalized = preset.phases.map((phase, index) => ({
          title: phase.title || `Phase ${index + 1}`,
          order: index + 1
        }));
        preset.phases = normalized;
        await preset.save();
      }
    }

    const configuredDomain = String(process.env.COLLEGE_EMAIL_DOMAIN || '').trim().toLowerCase().replace(/^@+/, '');
    if (configuredDomain) {
      await SystemSetting.findOneAndUpdate(
        { key: VERIFICATION_DOMAIN_KEY },
        {
          $setOnInsert: {
            key: VERIFICATION_DOMAIN_KEY,
            value: configuredDomain
          }
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    }

    // Use debug level so this message is hidden at the default 'info' level
    logger.debug('Schema migration completed successfully');
  } catch (error) {
    logger.error('Schema migration failed', { message: error.message, stack: error.stack });
  }
};

module.exports = {
  migrateSchema
};
