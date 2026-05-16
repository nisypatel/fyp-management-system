// Purpose: Reusable document view and download actions for uploaded files.
import React, { useState } from 'react';
import { FiDownload, FiEye } from 'react-icons/fi';
import { toast } from 'react-toastify';
import { getDocumentDownloadUrl, getMeaningfulDocumentName, openDocumentPreview } from '../../utils/fileUtils';
import PreviewModal from './PreviewModal';

const DocumentActions = ({ file, loading = false, className = '' }) => {
  const [busyAction, setBusyAction] = useState(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const displayName = getMeaningfulDocumentName(file);
  const downloadUrl = getDocumentDownloadUrl(file);
  const disabled = loading || !file || !displayName || !downloadUrl;

  const handleView = async () => {
    if (disabled || busyAction) return;

    setBusyAction('view');
    try {
      // Try modal preview first
      if (file?.secure_url || (file?.fileUrl && file.fileUrl.includes('cloudinary'))) {
        setShowPreviewModal(true);
      } else {
        // Fallback to new window preview
        const result = await openDocumentPreview(file);
        if (result.status === 'missing') {
          toast.error('File is unavailable');
        } else if (result.status === 'blocked') {
          toast.error('Please allow pop-ups to preview this file');
        }
      }
    } finally {
      setBusyAction(null);
    }
  };

  if (!file) {
    return null;
  }

  return (
    <>
      <div className={`document-actions ${className}`.trim()}>
        <button
          type="button"
          className="document-action-button"
          onClick={handleView}
          disabled={disabled || busyAction === 'view'}
          aria-label={disabled ? 'File preview unavailable' : `View ${displayName}`}
          title={disabled ? 'File preview unavailable' : `View ${displayName}`}
        >
          <FiEye aria-hidden="true" />
        </button>

        {downloadUrl ? (
          <a
            className="document-action-button document-action-link"
            href={downloadUrl}
            download={displayName}
            aria-label={`Download ${displayName}`}
            title={`Download ${displayName}`}
            onClick={(event) => {
              if (disabled) {
                event.preventDefault();
              }
            }}
          >
            <FiDownload aria-hidden="true" />
          </a>
        ) : (
          <span
            className="document-action-button document-action-disabled"
            aria-hidden="true"
            title="File download unavailable"
          >
            <FiDownload aria-hidden="true" />
          </span>
        )}
      </div>

      <PreviewModal
        file={file}
        isOpen={showPreviewModal}
        onClose={() => setShowPreviewModal(false)}
      />
    </>
  );
};

export default DocumentActions;
