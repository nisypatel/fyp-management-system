import apiClient from '../services/apiClient';

const API_FILE_DOWNLOAD_PREFIX = '/api/files/download';

const FILE_KIND_EXTENSIONS = {
  image: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg'],
  pdf: ['pdf'],
  text: ['txt', 'csv', 'md', 'log', 'json', 'xml', 'yaml', 'yml', 'rtf'],
  video: ['mp4', 'webm', 'mov', 'm4v', 'avi', 'mkv', 'ogv'],
  office: ['doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx']
};

const FILE_KIND_MIME_TYPES = {
  image: 'image/*',
  pdf: 'application/pdf',
  text: 'text/plain',
  video: 'video/*',
  office: 'application/octet-stream'
};

const stripQueryAndHash = (value = '') => String(value).split('#')[0].split('?')[0];

// API base configured at build/runtime. When undefined, leave relative paths as-is.
const API_BASE = (typeof process !== 'undefined' && process.env && process.env.REACT_APP_API_URL)
  ? String(process.env.REACT_APP_API_URL).replace(/\/+$|\s+$/g, '')
  : '';

const makeAbsoluteApiPath = (url) => {
  if (!url) return url;
  if (/^https?:\/\//i.test(url)) return url;
  if (!API_BASE) return url;

  if (url.startsWith('/api/')) {
    return `${API_BASE}${url.slice(4)}`;
  }

  return `${API_BASE}/${String(url).replace(/^\/+/, '')}`;
};

const getBaseName = (value = '') => {
  const cleanValue = stripQueryAndHash(value);
  if (!cleanValue) return '';

  return cleanValue.split('/').pop().split('\\').pop();
};

const isExternalUrl = (value = '') => /^https?:\/\//i.test(String(value));

const isCloudinaryUrl = (value = '') => /res\.cloudinary\.com/i.test(String(value));

const buildCloudinaryAttachmentUrl = (secureUrl = '', displayName = 'download') => {
  if (!secureUrl) return '';
  if (!secureUrl.includes('/upload/')) return secureUrl;
  return secureUrl.replace('/upload/', `/upload/fl_attachment:${encodeURIComponent(displayName)}/`);
};

const GENERIC_FILE_NAMES = new Set([
  'file',
  'document',
  'upload',
  'uploaded file',
  'untitled',
  'video',
  'image',
  'pdf'
]);

const getStoredFileNameCandidates = (file) => {
  if (!file || typeof file !== 'object') return [];

  return [
    file.original_filename,
    file.originalName,
    file.fileName,
    file.name,
    file.title,
    file.public_id,
    file.filename,
    file.fileUrl,
    file.videoUrl,
    file.secure_url,
    file.url,
    file.path
  ].filter(Boolean);
};

export const getMeaningfulDocumentName = (file) => {
  const displayName = getDocumentDisplayName(file);
  if (displayName && !GENERIC_FILE_NAMES.has(displayName.trim().toLowerCase())) {
    return displayName;
  }

  const candidates = getStoredFileNameCandidates(file);
  for (const candidate of candidates) {
    const baseName = getBaseName(candidate);
    if (baseName && !GENERIC_FILE_NAMES.has(baseName.trim().toLowerCase())) {
      return baseName;
    }
  }

  return displayName || 'Document';
};

/**
 * Build optimized Cloudinary preview URL
 * - For images: auto quality and format
 * - For PDFs: page 1 with auto quality
 * - For videos: native preview
 */
const buildCloudinaryPreviewUrl = (secureUrl = '', fileKind = 'raw') => {
  if (!secureUrl || !secureUrl.includes('/upload/')) return secureUrl;

  let transformations = [];

  // Add kind-specific optimizations
  if (fileKind === 'image') {
    transformations.push('q_auto', 'f_auto');
  } else if (fileKind === 'pdf') {
    transformations.push('page_1', 'q_auto');
  }

  if (transformations.length === 0) return secureUrl;

  const transformStr = transformations.join(',');
  return secureUrl.replace('/upload/', `/upload/${transformStr}/`);
};

export const getDocumentDisplayName = (file) => {
  if (!file) return '';
  if (typeof file === 'string') return getBaseName(file) || file;

  return (
    file.original_filename ||
    file.originalName ||
    file.fileName ||
    file.title ||
    file.name ||
    getBaseName(file.filename || file.public_id || file.path || file.secure_url || file.url || file.fileUrl || file.videoUrl || '')
  );
};

export const getDocumentStoredName = (file) => {
  if (!file) return '';
  if (typeof file === 'string') return getBaseName(file) || file;

  return (
    getBaseName(file.public_id || '') ||
    getBaseName(file.filename || '') ||
    getBaseName(file.original_filename || '') ||
    getBaseName(file.fileUrl || '') ||
    getBaseName(file.videoUrl || '') ||
    getBaseName(file.path || '') ||
    getBaseName(file.secure_url || '') ||
    getBaseName(file.url || '') ||
    getBaseName(file.fileName || '') ||
    getBaseName(file.originalName || '') ||
    ''
  );
};

export const getFileExtension = (file) => {
  const displayName = getDocumentDisplayName(file) || getDocumentStoredName(file);
  const fileName = stripQueryAndHash(displayName || '').toLowerCase();
  const dotIndex = fileName.lastIndexOf('.');

  return dotIndex >= 0 ? fileName.slice(dotIndex + 1) : '';
};

export const getFileKind = (file) => {
  if (file && typeof file === 'object') {
    const resourceType = String(file.resource_type || file.resourceType || '').toLowerCase();
    const format = String(file.format || '').toLowerCase();

    if (resourceType === 'image') return 'image';
    if (resourceType === 'video') return 'video';
    if (format === 'pdf') return 'pdf';

    if (FILE_KIND_EXTENSIONS.office.includes(format)) return 'office';
    if (FILE_KIND_EXTENSIONS.image.includes(format)) return 'image';
    if (FILE_KIND_EXTENSIONS.video.includes(format)) return 'video';
  }

  const extension = getFileExtension(file);

  for (const [kind, extensions] of Object.entries(FILE_KIND_EXTENSIONS)) {
    if (extensions.includes(extension)) {
      return kind;
    }
  }

  return 'unsupported';
};

export const getDocumentDownloadUrl = (file) => {
  if (!file) return '';

  if (typeof file === 'object') {
    if (file.downloadUrl) {
      return file.downloadUrl;
    }

    const storedName = getDocumentStoredName(file);

    // Prefer the backend download proxy for Cloudinary and uploaded files so the server
    // can set a correct filename and extension (for example, `.pdf`).
    if (storedName) {
      return makeAbsoluteApiPath(`${API_FILE_DOWNLOAD_PREFIX}/${encodeURIComponent(storedName)}`);
    }

    if (file.secure_url) {
      return buildCloudinaryAttachmentUrl(file.secure_url, getDocumentDisplayName(file));
    }

    if (file.url && isExternalUrl(file.url)) {
      return file.url;
    }

    if (file.url && isCloudinaryUrl(file.url)) {
      return buildCloudinaryAttachmentUrl(file.url, getDocumentDisplayName(file));
    }

    if (file.fileUrl && isCloudinaryUrl(file.fileUrl)) {
      return buildCloudinaryAttachmentUrl(file.fileUrl, getDocumentDisplayName(file));
    }
  }

  const storedName = getDocumentStoredName(file);
  if (!storedName) {
    if (typeof file === 'object' && file.fileUrl && isExternalUrl(file.fileUrl)) {
      return file.fileUrl;
    }
    return '';
  }

  return makeAbsoluteApiPath(`${API_FILE_DOWNLOAD_PREFIX}/${encodeURIComponent(storedName)}`);
};

/**
 * Get optimized preview URL for the file
 * Uses Cloudinary URLs directly for cloud-stored files
 * Falls back to download URL for local files
 */
export const getDocumentPreviewUrl = (file) => {
  if (!file) return '';

  if (typeof file === 'object') {
    // If we can derive a stored name (public_id/filename), prefer the internal download proxy
    // This ensures same-origin fetches (with credentials) and avoids Cloudinary CORS issues for PDFs
    const storedName = getDocumentStoredName(file);
    if (storedName) {
      const downloadUrl = `${API_FILE_DOWNLOAD_PREFIX}/${encodeURIComponent(storedName)}`;
      const inlineUrl = downloadUrl.includes('?') ? `${downloadUrl}&inline=1` : `${downloadUrl}?inline=1`;
      return makeAbsoluteApiPath(inlineUrl);
    }

    // Prefer Cloudinary secure URL with optimizations
    if (file.secure_url && isCloudinaryUrl(file.secure_url)) {
      const fileKind = getFileKind(file);
      return buildCloudinaryPreviewUrl(file.secure_url, fileKind);
    }

    // Fallback to regular secure_url
    if (file.secure_url) {
      return file.secure_url;
    }

    // External URLs
    if (file.url && isExternalUrl(file.url)) {
      return file.url;
    }

    if (file.url && isCloudinaryUrl(file.url)) {
      const fileKind = getFileKind(file);
      return buildCloudinaryPreviewUrl(file.url, fileKind);
    }

    if (file.fileUrl && isCloudinaryUrl(file.fileUrl)) {
      const fileKind = getFileKind(file);
      return buildCloudinaryPreviewUrl(file.fileUrl, fileKind);
    }

    if (file.fileUrl && isExternalUrl(file.fileUrl)) {
      return file.fileUrl;
    }
  }

  // Fallback to download URL
  // Request inline preview when falling back to the download endpoint
  const downloadUrl = getDocumentDownloadUrl(file);
  if (!downloadUrl) return '';
  // Append inline flag if not present, and make absolute when targeting API path
  const inlineUrl = downloadUrl.includes('?') ? `${downloadUrl}&inline=1` : `${downloadUrl}?inline=1`;
  return makeAbsoluteApiPath(inlineUrl);
};

export const getDocumentPreviewMimeType = (file) => {
  const kind = getFileKind(file);
  return FILE_KIND_MIME_TYPES[kind] || 'application/octet-stream';
};


const escapeHtml = (value = '') =>
  String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

const renderPreviewShell = (previewWindow, displayName) => {
  previewWindow.document.open();
  previewWindow.document.write(`
    <!doctype html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>${escapeHtml(displayName || 'Document Preview')}</title>
        <style>
          :root { color-scheme: light; }
          body {
            margin: 0;
            font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
            background: #f4f8fc;
            color: #102033;
          }
          .shell { min-height: 100vh; display: flex; flex-direction: column; }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 1rem;
            padding: 1rem 1.25rem;
            border-bottom: 1px solid #d9e4f0;
            background: #fff;
          }
          .title { margin: 0; font-size: 1rem; font-weight: 700; word-break: break-word; }
          .subtitle { margin: 0.2rem 0 0; font-size: 0.85rem; color: #5b6b7d; }
          .download-link { flex-shrink: 0; color: #0f4c81; text-decoration: none; font-weight: 700; }
          .content { flex: 1; display: flex; align-items: center; justify-content: center; padding: 1.25rem; }
          .loading,
          .fallback {
            max-width: 720px;
            width: 100%;
            background: #fff;
            border: 1px solid #d9e4f0;
            border-radius: 14px;
            padding: 1.25rem;
            box-shadow: 0 8px 24px rgba(17, 28, 45, 0.08);
          }
          .loading { text-align: center; color: #5b6b7d; }
          .preview-frame,
          .preview-image,
          .preview-video,
          .preview-text {
            width: min(100%, 1120px);
            max-height: calc(100vh - 9rem);
            border: none;
            border-radius: 14px;
            background: #fff;
            box-shadow: 0 8px 24px rgba(17, 28, 45, 0.08);
          }
          .preview-image,
          .preview-video { object-fit: contain; }
          .preview-text {
            padding: 1rem 1.15rem;
            white-space: pre-wrap;
            overflow: auto;
            line-height: 1.6;
            font-family: Consolas, "Liberation Mono", Menlo, monospace;
            font-size: 0.92rem;
          }
          .fallback h2 { margin: 0 0 0.45rem; font-size: 1.06rem; }
          .fallback p { margin: 0 0 0.9rem; color: #5b6b7d; line-height: 1.55; }
          .fallback-actions { display: flex; gap: 0.75rem; flex-wrap: wrap; }
          .fallback-actions a {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            min-height: 2.5rem;
            padding: 0 0.9rem;
            border-radius: 999px;
            background: #0f4c81;
            color: #fff;
            text-decoration: none;
            font-weight: 700;
          }
          .fallback-actions button {
            min-height: 2.5rem;
            padding: 0 0.9rem;
            border-radius: 999px;
            border: 1px solid #0f4c81;
            background: transparent;
            color: #0f4c81;
            font-weight: 700;
            cursor: pointer;
          }
          @media (max-width: 640px) {
            .header { flex-direction: column; align-items: flex-start; }
            .download-link { align-self: flex-start; }
          }
        </style>
      </head>
      <body>
        <div class="shell">
          <div class="header">
            <div>
              <p class="title">${escapeHtml(displayName || 'Document Preview')}</p>
              <p class="subtitle">Loading preview…</p>
            </div>
            <a class="download-link" href="#" aria-disabled="true" onclick="(function(){ try{ if(window.opener && window.opener.__downloadDocumentFromParent){ window.opener.__downloadDocumentFromParent(encodeURIComponent(window.location.href), encodeURIComponent('${escapeHtml(displayName || 'Document')}')); return false; } }catch(e){} return true; })()">Download</a>
          </div>
          <div class="content">
            <div class="loading">Loading preview…</div>
          </div>
        </div>
      </body>
    </html>
  `);
  previewWindow.document.close();
};

const renderPreviewFallback = (previewWindow, fileMeta, message) => {
  const displayName = escapeHtml(fileMeta.displayName || 'Document');
  const downloadUrl = fileMeta.downloadUrl || '#';

  // Use opener-based download helper when available to ensure authenticated requests
  const encodedUrl = encodeURIComponent(downloadUrl);
  const encodedName = encodeURIComponent(displayName);

  previewWindow.document.body.innerHTML = `
    <div class="shell">
      <div class="header">
        <div>
          <p class="title">${displayName}</p>
          <p class="subtitle">${escapeHtml(message)}</p>
        </div>
        <a class="download-link" href="${downloadUrl}" download="${displayName}">Download</a>
      </div>
      <div class="content">
        <div class="fallback">
          <h2>Preview unavailable</h2>
          <p>${escapeHtml(message)}</p>
          <div class="fallback-actions">
            <a href="${downloadUrl}" download="${displayName}" onclick="(function(){ try{ if(window.opener && window.opener.__downloadDocumentFromParent){ window.opener.__downloadDocumentFromParent('${encodedUrl}','${encodedName}'); return false;} }catch(e){} return true; })()">Download file</a>
            <button type="button" onclick="window.close()">Close tab</button>
          </div>
        </div>
      </div>
    </div>
  `;
};

const renderPreviewError = (previewWindow, fileMeta) => {
  renderPreviewFallback(
    previewWindow,
    fileMeta,
    'This file could not be loaded. It may be missing, corrupted, or unavailable.'
  );
};

const renderTextPreview = async (previewWindow, fileMeta, blob) => {
  const text = await blob.text();
  const encodedDownload = encodeURIComponent(fileMeta.downloadUrl || '');
  const encodedName = encodeURIComponent(escapeHtml(fileMeta.displayName || 'Document'));
  previewWindow.document.body.innerHTML = `
    <div class="shell">
      <div class="header">
        <div>
          <p class="title">${escapeHtml(fileMeta.displayName)}</p>
          <p class="subtitle">Text preview</p>
        </div>
        <a class="download-link" href="${fileMeta.downloadUrl}" download="${escapeHtml(fileMeta.displayName)}" onclick="(function(){ try{ if(window.opener && window.opener.__downloadDocumentFromParent){ window.opener.__downloadDocumentFromParent('${encodedDownload}','${encodedName}'); return false; } }catch(e){} return true; })()">Download</a>
      </div>
      <div class="content">
        <pre class="preview-text">${escapeHtml(text)}</pre>
      </div>
    </div>
  `;
};

const renderMediaPreview = (previewWindow, fileMeta, blobUrl, kind) => {
  const mediaElement =
    kind === 'image'
      ? `<img class="preview-image" src="${blobUrl}" alt="${escapeHtml(fileMeta.displayName)}" />`
      : kind === 'video'
        ? `<video class="preview-video" src="${blobUrl}" controls playsinline></video>`
        : kind === 'pdf'
          ? `<iframe class="preview-frame" src="${blobUrl}" title="${escapeHtml(fileMeta.displayName)}"></iframe>`
          : `<object class="preview-frame" data="${blobUrl}" type="${getDocumentPreviewMimeType(fileMeta.source)}">
              <div class="fallback">
                <h2>Preview unavailable</h2>
                <p>Your browser could not preview this file. Download it to open it in a supported app.</p>
                <div class="fallback-actions">
                  <a href="${fileMeta.downloadUrl}" download="${escapeHtml(fileMeta.displayName)}">Download file</a>
                  <button type="button" onclick="window.close()">Close tab</button>
                </div>
              </div>
            </object>`;

  previewWindow.document.body.innerHTML = `
    <div class="shell">
      <div class="header">
        <div>
          <p class="title">${escapeHtml(fileMeta.displayName)}</p>
          <p class="subtitle">${kind === 'office' ? 'Office document preview' : `${kind} preview`}</p>
        </div>
        <a class="download-link" href="${fileMeta.downloadUrl}" download="${escapeHtml(fileMeta.displayName)}" onclick="(function(){ try{ if(window.opener && window.opener.__downloadDocumentFromParent){ window.opener.__downloadDocumentFromParent('${encodeURIComponent(fileMeta.downloadUrl || '')}','${encodeURIComponent(escapeHtml(fileMeta.displayName || 'Document'))}'); return false; } }catch(e){} return true; })()">Download</a>
      </div>
      <div class="content">
        ${mediaElement}
      </div>
    </div>
  `;
};

/**
 * Programmatic authenticated download helper.
 * Attempts to fetch the file using `apiClient` (so cookies/credentials are included),
 * then triggers a browser download with the provided filename.
 */
export const downloadDocumentByUrl = async (downloadUrl, displayName) => {
  if (!downloadUrl) return false;
  try {
    let blob;
    const isApiPath = String(downloadUrl || '').startsWith('/api/') || (API_BASE && String(downloadUrl || '').startsWith(API_BASE));

    if (isApiPath) {
      // Normalize path relative to apiClient baseURL
      let apiPath = String(downloadUrl || '');
      if (API_BASE && apiPath.startsWith(API_BASE)) apiPath = apiPath.slice(API_BASE.length);
      if (apiPath.startsWith('/api')) apiPath = apiPath.slice(4);
      if (!apiPath.startsWith('/')) apiPath = `/${apiPath}`;
      const resp = await apiClient.get(apiPath, { responseType: 'blob' });
      blob = resp.data;
    } else {
      const resp = await fetch(downloadUrl, { credentials: 'include' });
      if (!resp.ok) throw new Error('Unable to download');
      blob = await resp.blob();
    }

    const blobUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = displayName || getBaseName(downloadUrl) || 'download';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => window.URL.revokeObjectURL(blobUrl), 5000);
    return true;
  } catch (err) {
    console.error('downloadDocumentByUrl error', err);
    return false;
  }
};

const resolveDocumentSource = (file) => {
  const displayName = getDocumentDisplayName(file) || 'Document';
  const storedName = getDocumentStoredName(file);
  const downloadUrl = getDocumentDownloadUrl(file);
  const previewUrl = getDocumentPreviewUrl(file);
  const kind = getFileKind(file);

  return {
    source: file,
    displayName,
    storedName,
    downloadUrl,
    previewUrl,
    kind
  };
};

export const openDocumentPreview = async (file) => {
  const fileMeta = resolveDocumentSource(file);

  if (!fileMeta.previewUrl || (!fileMeta.downloadUrl && !fileMeta.storedName)) {
    if (fileMeta.previewUrl && isExternalUrl(fileMeta.previewUrl)) {
      const externalWindow = window.open(fileMeta.previewUrl, '_blank');
      return externalWindow ? { status: 'opened' } : { status: 'blocked' };
    }

    return { status: 'missing' };
  }

  if (isExternalUrl(fileMeta.previewUrl) && fileMeta.kind === 'image') {
    const externalWindow = window.open(fileMeta.previewUrl, '_blank');
    return externalWindow ? { status: 'opened' } : { status: 'blocked' };
  }

  const previewWindow = window.open('', '_blank', 'width=1200,height=900');

  if (!previewWindow) {
    return { status: 'blocked' };
  }

  // Expose a parent-side download helper so the preview window can request an
  // authenticated download if a normal anchor download fails or is blocked.
  window.__downloadDocumentFromParent = async (encodedUrl, encodedName) => {
    try {
      const url = decodeURIComponent(String(encodedUrl || ''));
      const name = decodeURIComponent(String(encodedName || ''));
      return await downloadDocumentByUrl(url, name);
    } catch (err) {
      console.error('__downloadDocumentFromParent error', err);
      return false;
    }
  };

  // Remove the helper when the preview window closes
  previewWindow.addEventListener('beforeunload', () => {
    try { delete window.__downloadDocumentFromParent; } catch (e) {}
  }, { once: true });

  renderPreviewShell(previewWindow, fileMeta.displayName);

  try {
    let blob;
    const isApiPath = String(fileMeta.previewUrl || '').startsWith('/api/');
    const isAbsoluteApiBase = API_BASE && String(fileMeta.previewUrl || '').startsWith(API_BASE);

    if (isApiPath || isAbsoluteApiBase) {
      // Use axios client so cookies and interceptors are applied (auth)
      let apiPath = String(fileMeta.previewUrl || '');
      if (API_BASE && apiPath.startsWith(API_BASE)) apiPath = apiPath.slice(API_BASE.length);
      if (apiPath.startsWith('/api')) apiPath = apiPath.slice(4);
      if (!apiPath.startsWith('/')) apiPath = `/${apiPath}`;

      const axiosResp = await apiClient.get(apiPath, { responseType: 'blob' });
      blob = axiosResp.data;
    } else {
      const response = await fetch(fileMeta.previewUrl, { credentials: 'include' });

      if (!response.ok) {
        throw new Error('Unable to load file');
      }

      blob = await response.blob();
    }

    const kind = fileMeta.kind;

    if (kind === 'text') {
      await renderTextPreview(previewWindow, fileMeta, blob);
      return { status: 'opened' };
    }

    const blobUrl = window.URL.createObjectURL(blob);
    previewWindow.addEventListener(
      'beforeunload',
      () => {
        window.URL.revokeObjectURL(blobUrl);
      },
      { once: true }
    );

    renderMediaPreview(previewWindow, fileMeta, blobUrl, kind);

    return { status: 'opened' };
  } catch (error) {
    renderPreviewError(previewWindow, fileMeta);
    return { status: 'error' };
  }
};
