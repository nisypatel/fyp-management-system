const pad = (value) => String(value).padStart(2, '0');

const formatDate = (value) => {
  if (!value) return 'N/A';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'N/A';

  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`;
};

const formatDateTime = (value) => {
  if (!value) return 'N/A';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'N/A';

  return `${formatDate(date)} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

module.exports = {
  formatDate,
  formatDateTime
};
