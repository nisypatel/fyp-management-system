const ROLE_ALIASES = {
  teacher: 'faculty',
  faculty: 'faculty',
  student: 'student',
  admin: 'admin'
};

const normalizeRole = (role) => {
  if (!role || typeof role !== 'string') {
    return role;
  }

  return ROLE_ALIASES[role.trim().toLowerCase()] || role.trim().toLowerCase();
};

module.exports = {
  normalizeRole
};
