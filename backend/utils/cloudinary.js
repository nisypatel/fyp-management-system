const cloudinary = require('cloudinary').v2;
const path = require('path');

const isCloudinaryConfigured = () => {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  );
};

if (isCloudinaryConfigured()) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true
  });
}

/**
 * Generate a sanitized, readable filename for Cloudinary
 * Combines original filename with timestamp for uniqueness
 * @param {string} originalName - Original filename from upload
 * @returns {string} Sanitized filename with timestamp
 */
const generateReadableFilename = (originalName = '') => {
  if (!originalName) return `file_${Date.now()}`;
  
  // Remove extension temporarily
  const ext = path.extname(originalName).toLowerCase();
  let baseName = path.basename(originalName, ext);
  
  // Sanitize: replace special chars with dash, lowercase, limit length
  baseName = baseName
    .replace(/[^a-z0-9]/gi, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase()
    .slice(0, 50);
  
  // Add timestamp suffix for uniqueness
  const timestamp = Math.floor(Date.now() / 1000);
  return `${baseName}_${timestamp}${ext}`;
};

/**
 * Build dynamic folder structure based on context
 * Examples:
 *   - faculty/[project-title]/[student-name]
 *   - student/[student-id]/projects/[project-title]
 *   - admin/project-review/[project-id]
 * @param {Object} context - Context object with user, project, etc.
 * @returns {string} Folder path for Cloudinary
 */
const buildDynamicCloudinaryFolder = (context = {}) => {
  const { userRole, userId, userName, projectId, projectTitle, fileType = 'document' } = context;
  
  const sanitize = (text) => String(text || '')
    .replace(/[^a-z0-9]/gi, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase()
    .slice(0, 50);
  
  let folderPath = 'fyp-management';
  
  if (userRole === 'student') {
    // student/[user-id]/projects/[project-title]/[file-type]
    folderPath = `${folderPath}/student/${sanitize(userId)}/projects/${sanitize(projectTitle)}/${fileType}`;
  } else if (userRole === 'faculty') {
    // faculty/supervised/[project-title]/[file-type]
    folderPath = `${folderPath}/faculty/supervised/${sanitize(projectTitle)}/${fileType}`;
  } else if (userRole === 'admin') {
    // admin/project-review/[project-id]/[file-type]
    folderPath = `${folderPath}/admin/project-review/${sanitize(projectId)}/${fileType}`;
  } else {
    // fallback structure
    folderPath = `${folderPath}/uploads/${sanitize(userRole)}/${sanitize(userId)}/${fileType}`;
  }
  
  return folderPath;
};

/**
 * Legacy folder builder (for backwards compatibility)
 */
const buildCloudinaryFolder = (...parts) => parts
  .flat()
  .map((part) => String(part || '').trim())
  .filter(Boolean)
  .join('/');

const uploadBufferToCloudinary = (buffer, options = {}) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(options, (error, result) => {
      if (error) return reject(error);
      resolve(result);
    });

    uploadStream.end(buffer);
  });
};

const deleteFromCloudinary = async (publicId, options = {}) => {
  if (!publicId) return null;
  return cloudinary.uploader.destroy(publicId, options);
};

const getCloudinaryResourceType = (file = {}) => {
  const mimetype = String(file.mimetype || '').toLowerCase();
  if (mimetype.startsWith('image/')) return 'image';
  if (mimetype.startsWith('video/')) return 'video';
  return 'raw';
};

const normalizeCloudinaryUploadResult = (result, file = {}) => ({
  secure_url: result.secure_url,
  public_id: result.public_id,
  original_filename: result.original_filename || file.originalname || null,
  resource_type: result.resource_type || getCloudinaryResourceType(file),
  format: result.format || path.extname(file.originalname || '').replace('.', '').toLowerCase() || null,
  bytes: result.bytes ?? file.size ?? null,
  width: result.width ?? null,
  height: result.height ?? null,
  created_at: result.created_at ? new Date(result.created_at) : new Date(),
  filename: result.public_id,
  originalName: result.original_filename || file.originalname || null,
  path: result.secure_url,
  url: result.secure_url
});

/**
 * Upload file to Cloudinary with organized folder structure
 * @param {Object} file - File buffer and metadata from multer
 * @param {Object} options - Upload options including folder structure context
 * @returns {Promise<Object>} Normalized upload result
 */
const uploadFileToCloudinary = async (file, options = {}) => {
  if (!file || !file.buffer) {
    throw new Error('No file buffer provided');
  }

  if (!isCloudinaryConfigured()) {
    throw new Error('Cloudinary is not configured');
  }

  const resourceType = options.resource_type || getCloudinaryResourceType(file);
  
  // Generate readable filename
  const readableFilename = generateReadableFilename(file.originalname);
  
  // Build folder path from context
  const folderPath = options.folderContext 
    ? buildDynamicCloudinaryFolder(options.folderContext)
    : (options.folder || 'fyp-management/uploads');

  const uploadOptions = {
    folder: folderPath,
    public_id: path.basename(readableFilename, path.extname(readableFilename)),
    resource_type: resourceType,
    use_filename: false,
    unique_filename: false,
    overwrite: false,
    ...options
  };

  const result = await uploadBufferToCloudinary(file.buffer, uploadOptions);
  return normalizeCloudinaryUploadResult(result, file);
};

/**
 * Build Cloudinary URL for preview (without attachment flag)
 * @param {Object} file - File object with secure_url
 * @returns {string} Preview URL
 */
const buildCloudinaryPreviewUrl = (file) => {
  const secureUrl = file?.secure_url || file?.url || file?.path || '';
  if (!secureUrl) return '';
  
  // Return URL as-is for browser preview (no attachment flag)
  return secureUrl;
};

/**
 * Build Cloudinary URL for download (with attachment flag)
 * @param {Object} file - File object with secure_url
 * @param {Object} options - Download options
 * @returns {string} Download URL with attachment header
 */
const buildCloudinaryDownloadUrl = (file, options = {}) => {
  const secureUrl = file?.secure_url || file?.url || file?.path || '';
  if (!secureUrl) return '';

  const fileName = options.filename || file?.original_filename || file?.originalName || file?.name || 'download';
  if (!secureUrl.includes('/upload/')) return secureUrl;

  return secureUrl.replace('/upload/', `/upload/fl_attachment:${encodeURIComponent(fileName)}/`);
};

/**
 * Build optimized Cloudinary preview URL with transformations
 * Optimizes for browser preview based on file type
 * @param {string} secureUrl - Cloudinary secure URL
 * @param {string} fileType - File type (image, pdf, video, etc.)
 * @returns {string} Optimized preview URL
 */
const buildCloudinaryOptimizedPreviewUrl = (secureUrl, fileType = 'raw') => {
  if (!secureUrl || !secureUrl.includes('/upload/')) return secureUrl;
  
  let transformations = [];
  
  // Add optimizations based on file type
  if (fileType === 'image') {
    // Optimize images: quality auto, format auto
    transformations.push('q_auto', 'f_auto');
  } else if (fileType === 'pdf') {
    // PDF preview optimization
    transformations.push('page_1', 'q_auto');
  }
  
  if (transformations.length === 0) return secureUrl;
  
  // Insert transformations after /upload/
  const transformStr = transformations.join(',');
  return secureUrl.replace('/upload/', `/upload/${transformStr}/`);
};

module.exports = {
  isCloudinaryConfigured,
  uploadBufferToCloudinary,
  deleteFromCloudinary,
  getCloudinaryResourceType,
  buildCloudinaryFolder,
  buildDynamicCloudinaryFolder,
  generateReadableFilename,
  normalizeCloudinaryUploadResult,
  uploadFileToCloudinary,
  buildCloudinaryDownloadUrl,
  buildCloudinaryPreviewUrl,
  buildCloudinaryOptimizedPreviewUrl
};
