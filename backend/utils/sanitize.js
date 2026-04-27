const xss = require('xss');

const sanitizeText = (value = '') => {
  if (typeof value !== 'string') return '';
  return xss(value.trim());
};

module.exports = {
  sanitizeText
};
