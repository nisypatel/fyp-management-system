export const isStrongPassword = (value) => {
  return /^(?=.*[A-Za-z])(?=.*\d).{8,}$/.test(value || '');
};

export const isValidPhone = (value) => {
  if (!value) return true;
  return /^[0-9]{10}$/.test(String(value).trim());
};

export const isValidEmail = (value) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());
};

export const maxSizeInBytes = {
  document: 10 * 1024 * 1024,
  video: 500 * 1024 * 1024
};

export const hasAllowedExtension = (filename, allowedExts = []) => {
  if (!filename) return false;
  const ext = filename.toLowerCase().split('.').pop();
  return allowedExts.includes(`.${ext}`);
};

export const getApiErrorMessage = (error, fallbackMessage) => {
  const data = error?.response?.data;
  if (Array.isArray(data?.errors) && data.errors.length > 0) {
    return data.errors
      .map((item) => item?.message)
      .filter(Boolean)
      .join(', ');
  }
  return data?.message || fallbackMessage;
};

export const isBasicPassword = (value) => {
  return String(value || '').length >= 8;
};
