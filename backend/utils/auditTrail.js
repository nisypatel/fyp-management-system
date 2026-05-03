const MAX_AUDIT_ENTRIES = 100;

const buildAuditEntry = ({ userId = null, action, changes = '' }) => ({
  changedBy: userId || null,
  action,
  changes
});

const appendAuditEntry = (doc, { userId = null, action, changes = '' }) => {
  if (!doc || !action) {
    return;
  }

  doc.updatedBy = userId || doc.updatedBy || null;

  if (!Array.isArray(doc.changeHistory)) {
    doc.changeHistory = [];
  }

  doc.changeHistory.push(buildAuditEntry({ userId, action, changes }));

  if (doc.changeHistory.length > MAX_AUDIT_ENTRIES) {
    doc.changeHistory = doc.changeHistory.slice(-MAX_AUDIT_ENTRIES);
  }
};

module.exports = {
  MAX_AUDIT_ENTRIES,
  buildAuditEntry,
  appendAuditEntry
};
