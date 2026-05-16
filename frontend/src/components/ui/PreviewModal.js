// Purpose: Modal for previewing documents with support for various file types
import React, { useState, useEffect } from 'react';
import { FiX, FiDownload, FiLoader } from 'react-icons/fi';
import { getDocumentDownloadUrl, getDocumentPreviewUrl, getFileKind, getMeaningfulDocumentName } from '../../utils/fileUtils';
import '../../styles/preview-modal.css';

const PreviewModal = ({ file, onClose, isOpen = false }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      setError(null);
    }
  }, [isOpen]);

  if (!isOpen || !file) return null;

  const displayName = getMeaningfulDocumentName(file);
  const downloadUrl = getDocumentDownloadUrl(file);
  const previewUrl = getDocumentPreviewUrl(file);
  const fileKind = getFileKind(file);

  // Try inline preview for any browser-supported type, including office docs.
  const canPreviewInline = Boolean(previewUrl) && ['image', 'pdf', 'video', 'office', 'text'].includes(fileKind);

  const handleIframeLoad = () => {
    setIsLoading(false);
  };

  const handleIframeError = () => {
    setError('Unable to preview this file');
    setIsLoading(false);
  };

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
              <a
                href={downloadUrl}
                download={displayName}
                className="preview-modal-button preview-modal-download"
                title="Download file"
              >
                <FiDownload />
                <span>Download file</span>
              </a>
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
                <a href={downloadUrl} download={displayName} className="preview-modal-fallback-link">
                  Download to view
                </a>
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
              src={previewUrl}
              title={displayName}
              onLoad={handleIframeLoad}
              onError={handleIframeError}
              className="preview-modal-iframe"
            />
          )}

          {!error && canPreviewInline && fileKind === 'video' && (
            <video
              src={previewUrl}
              controls
              onLoadedMetadata={handleIframeLoad}
              onError={handleIframeError}
              className="preview-modal-video"
              playsInline
            />
          )}

          {!error && canPreviewInline && fileKind === 'office' && (
            <iframe
              src={previewUrl}
              title={displayName}
              onLoad={handleIframeLoad}
              onError={handleIframeError}
              className="preview-modal-iframe"
            />
          )}

          {!error && canPreviewInline && fileKind === 'text' && (
            <iframe
              src={previewUrl}
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
                <a href={downloadUrl} download={displayName} className="preview-modal-fallback-link">
                  Download file
                </a>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PreviewModal;
