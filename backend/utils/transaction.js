const mongoose = require('mongoose');

function isTransactionNotSupportedError(error) {
  return Boolean(
    error &&
    typeof error.message === 'string' &&
    error.message.includes('Transaction numbers are only allowed on a replica set member or mongos')
  );
}

/**
 * Execute an async operation within a MongoDB transaction
 * @param {Function} operation - Async function that performs the operations
 * @param {Object} session - Optional existing session
 * @returns {Promise} - Result of the operation
 */
async function executeInTransaction(operation, session = null) {
  if (!session && mongoose.connection.readyState !== 1) {
    return operation(null);
  }

  const newSession = session || await mongoose.startSession();
  
  try {
    newSession.startTransaction();
    const result = await operation(newSession);
    await newSession.commitTransaction();
    return result;
  } catch (error) {
    if (isTransactionNotSupportedError(error) && !session) {
      return operation(null);
    }

    if (newSession.inTransaction()) {
      await newSession.abortTransaction();
    }
    throw error;
  } finally {
    if (!session) {
      // Only end the session if we created it
      await newSession.endSession();
    }
  }
}

/**
 * Helper to attach session to a query
 * @param {Object} query - Mongoose query object
 * @param {Object} session - MongoDB session
 * @returns {Object} - Same query with session attached
 */
function withSession(query, session) {
  if (session) {
    query.session(session);
  }
  return query;
}

module.exports = {
  executeInTransaction,
  withSession
};
