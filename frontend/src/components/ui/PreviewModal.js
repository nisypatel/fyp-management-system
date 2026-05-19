// Purpose: Modal for previewing documents with support for various file types
import React, { useState, useEffect } from 'react';
import { FiX, FiDownload, FiLoader } from 'react-icons/fi';
import { getDocumentDownloadUrl, getDocumentPreviewUrl, getFileKind, getMeaningfulDocumentName } from '../../utils/fileUtils';
import apiClient from '../../services/apiClient';
import '../../styles/preview-modal.css';

const PreviewModal = ({ file, onClose, isOpen = false }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [fetchedPreviewUrl, setFetchedPreviewUrl] = useState(null);

  const getApiRelativePath = (url) => {
    if (!url) return url;
    if (typeof url !== 'string') return url;
    return url.startsWith('/api/') ? url.slice(4) : url;
  };

  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      setError(null);
    }
  }, [isOpen]);

  const displayName = getMeaningfulDocumentName(file);
  const downloadUrl = getDocumentDownloadUrl(file);
  const previewUrl = getDocumentPreviewUrl(file);
  const fileKind = getFileKind(file);
  // Try inline preview for any browser-supported type, including office docs.
  const canPreviewInline = Boolean(previewUrl) && ['image', 'pdf', 'video', 'office', 'text'].includes(fileKind);

  const ensureFileExtension = (name, kind) => {
    const baseName = String(name || 'download').trim() || 'download';
    if (/\.[^./\\]+$/.test(baseName)) return baseName;
    if (kind === 'pdf') return `${baseName}.pdf`;
    if (kind === 'image') return `${baseName}.png`;
    if (kind === 'video') return `${baseName}.mp4`;
    if (kind === 'office') return `${baseName}.pdf`;
    return baseName;
  };

  const handleDownload = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await apiClient.get(getApiRelativePath(downloadUrl), { responseType: 'blob' });
      const contentType = String(response.headers?.['content-type'] || '').toLowerCase();

      if (contentType.includes('text/html')) {
        throw new Error('The download returned an HTML page instead of a file.');
      }

      const blob = new Blob([response.data], { type: contentType || 'application/octet-stream' });
      const objectUrl = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = objectUrl;

      const contentDisposition = response.headers?.['content-disposition'] || '';
      const match = contentDisposition.match(/filename="?([^";]+)"?/i);
      const headerName = match?.[1] || displayName;
      anchor.download = ensureFileExtension(headerName, fileKind);

      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(objectUrl);
      setIsLoading(false);
    } catch (downloadError) {
      setIsLoading(false);
      setError(downloadError.message || 'Unable to download file');
    }
  };

  const handleIframeLoad = () => {
    setIsLoading(false);
  };

  const handleIframeError = () => {
    setError('Unable to preview this file');
    setIsLoading(false);
  };

  useEffect(() => {
    let active = true;
    let blobUrl = null;

    const shouldFetch = previewUrl && previewUrl.startsWith('/api/') && (fileKind === 'pdf' || fileKind === 'office' || fileKind === 'text');

    if (!shouldFetch) return undefined;

    (async () => {
      try {
        const resp = await apiClient.get(getApiRelativePath(previewUrl), { responseType: 'blob' });
        if (!active) return;
        const blob = resp.data;
        blobUrl = window.URL.createObjectURL(blob);
        setFetchedPreviewUrl(blobUrl);
        setIsLoading(false);
      } catch (err) {
        if (!active) return;
        setError('Unable to load preview');
        setIsLoading(false);
      }
    })();

    return () => {
      active = false;
      if (blobUrl) {
        window.URL.revokeObjectURL(blobUrl);
      }
      setFetchedPreviewUrl(null);
    };
  }, [previewUrl, fileKind]);

  if (!isOpen || !file) return null;

  return (
    <div className="preview-modal-overlay" onClick={onClose}>
      <div className="preview-modal-container" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="preview-modal-header">
          <div className="preview-modal-title">
            <p className="preview-modal-kicker">Previewing</p>
            <h3 title={displayName}>{displayName}</h3>
            <p className="preview-modal-type">{fileKind} preview</p>
          </div>
          <div className="preview-modal-actions">
            {downloadUrl && (
              <button
                type="button"
                onClick={handleDownload}
                className="preview-modal-button preview-modal-download"
                title="Download file"
              >
                <FiDownload />
                <span>Download file</span>
              </button>
            )}
            <button
              className="preview-modal-button preview-modal-close"
              onClick={onClose}
              title="Close preview"
              aria-label="Close preview"
            >
              <FiX />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="preview-modal-content">
          {isLoading && canPreviewInline && (
            <div className="preview-modal-loading">
              <FiLoader className="preview-modal-spinner" />
              <p>Loading preview…</p>
            </div>
          )}

          {error && (
            <div className="preview-modal-error">
              <h4>Preview Unavailable</h4>
              <p>{error}</p>
              {downloadUrl && (
                <button type="button" onClick={handleDownload} className="preview-modal-fallback-link">
                  Download to view
                </button>
              )}
            </div>
          )}

          {!error && canPreviewInline && fileKind === 'image' && (
            <img
              src={previewUrl}
              alt={displayName}
              onLoad={handleIframeLoad}
              onError={handleIframeError}
              className="preview-modal-image"
            />
          )}

          {!error && canPreviewInline && fileKind === 'pdf' && (
            <iframe
              src={fetchedPreviewUrl || previewUrl}
              title={displayName}
              onLoad={handleIframeLoad}
              onError={handleIframeError}
              className="preview-modal-iframe"
            />
          )}

          {!error && canPreviewInline && fileKind === 'video' && (
            <video
              src={fetchedPreviewUrl || previewUrl}
              controls
              onLoadedMetadata={handleIframeLoad}
              onError={handleIframeError}
              className="preview-modal-video"
              playsInline
            />
          )}

          {!error && canPreviewInline && fileKind === 'office' && (
            <iframe
              src={fetchedPreviewUrl || previewUrl}
              title={displayName}
              onLoad={handleIframeLoad}
              onError={handleIframeError}
              className="preview-modal-iframe"
            />
          )}

          {!error && canPreviewInline && fileKind === 'text' && (
            <iframe
              src={fetchedPreviewUrl || previewUrl}
              title={displayName}
              onLoad={handleIframeLoad}
              onError={handleIframeError}
              className="preview-modal-iframe"
            />
          )}

          {!canPreviewInline && !error && (
            <div className="preview-modal-unsupported">
              <h4>Preview unavailable</h4>
              <p>This file may not render in your browser. If it does not open inline, use download instead.</p>
              {downloadUrl && (
                <button
                  type="button"
                  onClick={handleDownload}
                  className="preview-modal-fallback-link"
                >
                  Download file
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PreviewModal;
