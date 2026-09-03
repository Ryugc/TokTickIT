import React, { useState } from 'react';
import { useDevRequester } from '../context/DevRequesterContext';

export interface Attachment {
  id: number;
  fileName: string;
  fileType: string;
  fileSize: number;
  isRemoved: boolean;
  removalReason?: string | null;
  createdAt: string;
}

interface AttachmentSectionProps {
  ticketId: number;
  attachments: Attachment[];
  onAttachmentUpdated: () => void;
}

const getApiUrl = (path: string): string => {
  const origin =
    typeof window !== 'undefined' && window.location.origin && window.location.origin !== 'null'
      ? window.location.origin
      : 'http://localhost:3000';
  return `${origin}${path}`;
};

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const PERMITTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export const AttachmentSection: React.FC<AttachmentSectionProps> = ({
  ticketId,
  attachments,
  onAttachmentUpdated,
}) => {
  const { selectedRequester } = useDevRequester();

  // Upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);

  // Soft Removal Modal state
  const [removingAttachment, setRemovingAttachment] = useState<Attachment | null>(null);
  const [removalReason, setRemovalReason] = useState('');
  const [removalError, setRemovalError] = useState<string | null>(null);
  const [submittingRemoval, setSubmittingRemoval] = useState(false);

  // Active vs removed attachments
  const activeAttachments = attachments.filter((att) => !att.isRemoved);
  const removedAttachments = attachments.filter((att) => att.isRemoved);
  const activeCount = activeAttachments.length;
  const isLimitReached = activeCount >= 5;

  // Handle file select
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError(null);
    setUploadSuccess(null);
    const file = e.target.files?.[0];
    if (!file) {
      setSelectedFile(null);
      return;
    }

    if (!PERMITTED_TYPES.includes(file.type)) {
      setUploadError('Invalid file type. Only JPG, PNG, WEBP, and PDF files are allowed.');
      setSelectedFile(null);
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setUploadError('File size exceeds the 5MB maximum limit.');
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
  };

  // Handle file upload
  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile || !selectedRequester) return;

    if (isLimitReached) {
      setUploadError('Maximum limit of 5 active attachments reached for this ticket.');
      return;
    }

    setUploading(true);
    setUploadError(null);
    setUploadSuccess(null);

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const res = await fetch(getApiUrl(`/api/tickets/${ticketId}/attachments`), {
        method: 'POST',
        headers: {
          'X-Requester-Id': String(selectedRequester.id),
        },
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to upload attachment');
      }

      setUploadSuccess(`Successfully uploaded ${selectedFile.name}`);
      setSelectedFile(null);
      // Reset input element value
      const fileInput = document.getElementById('attachment-upload-input') as HTMLInputElement;
      if (fileInput) fileInput.value = '';

      onAttachmentUpdated();
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  // Handle file download
  const handleDownload = async (attachment: Attachment) => {
    if (!selectedRequester || attachment.isRemoved) return;

    try {
      const res = await fetch(getApiUrl(`/api/attachments/${attachment.id}/download`), {
        headers: {
          'X-Requester-Id': String(selectedRequester.id),
        },
      });

      if (res.status === 410) {
        alert('This file has been soft-removed and is no longer available for download.');
        return;
      }

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(err.error || 'Failed to download file.');
        return;
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = attachment.fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      alert('An error occurred while downloading the file.');
    }
  };

  // Handle soft removal submit
  const handleRemovalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!removingAttachment || !selectedRequester) return;

    if (!removalReason.trim()) {
      setRemovalError('Removal reason is required.');
      return;
    }

    setSubmittingRemoval(true);
    setRemovalError(null);

    try {
      const res = await fetch(getApiUrl(`/api/attachments/${removingAttachment.id}`), {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'X-Requester-Id': String(selectedRequester.id),
        },
        body: JSON.stringify({ removalReason: removalReason.trim() }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to remove attachment');
      }

      setRemovingAttachment(null);
      setRemovalReason('');
      onAttachmentUpdated();
    } catch (err) {
      setRemovalError(err instanceof Error ? err.message : 'Failed to remove attachment');
    } finally {
      setSubmittingRemoval(false);
    }
  };

  return (
    <div style={{ marginTop: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--primary-green)', margin: 0 }}>
          📎 File Attachments ({activeCount} / 5 Active)
        </h3>
      </div>

      {/* -------------------------------------------------------------------- */}
      {/* Active Attachments List                                               */}
      {/* -------------------------------------------------------------------- */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h4 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--dark-text)', marginBottom: '0.5rem' }}>
          Active Attachments
        </h4>
        {activeAttachments.length === 0 ? (
          <p style={{ fontSize: '0.875rem', color: '#6B7280', fontStyle: 'italic', margin: 0 }}>
            No active attachments for this ticket.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {activeAttachments.map((att) => (
              <div
                key={att.id}
                id={`active-attachment-${att.id}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  backgroundColor: '#FFFFFF',
                  border: '1px solid var(--border-color)',
                  borderRadius: '0.5rem',
                  padding: '0.75rem 1rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={{ fontSize: '1.25rem' }}>📄</span>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--dark-text)' }}>
                      {att.fileName}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#6B7280' }}>
                      {formatFileSize(att.fileSize)} · {att.fileType}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    id={`download-attachment-btn-${att.id}`}
                    type="button"
                    onClick={() => handleDownload(att)}
                    style={{
                      backgroundColor: 'var(--pale-green)',
                      color: 'var(--primary-green)',
                      border: '1px solid #B8E2CD',
                      borderRadius: '0.375rem',
                      padding: '0.4rem 0.75rem',
                      fontSize: '0.8125rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    ⬇ Download
                  </button>

                  <button
                    id={`remove-attachment-btn-${att.id}`}
                    type="button"
                    onClick={() => {
                      setRemovingAttachment(att);
                      setRemovalReason('');
                      setRemovalError(null);
                    }}
                    style={{
                      backgroundColor: '#FEF2F2',
                      color: '#DC2626',
                      border: '1px solid #FCA5A5',
                      borderRadius: '0.375rem',
                      padding: '0.4rem 0.75rem',
                      fontSize: '0.8125rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    🗑 Soft Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* -------------------------------------------------------------------- */}
      {/* Soft-Removed Attachments List                                         */}
      {/* -------------------------------------------------------------------- */}
      {removedAttachments.length > 0 && (
        <div style={{ marginBottom: '1.5rem' }}>
          <h4 style={{ fontSize: '0.9rem', fontWeight: 600, color: '#6B7280', marginBottom: '0.5rem' }}>
            Soft-Removed Attachments
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {removedAttachments.map((att) => (
              <div
                key={att.id}
                id={`removed-attachment-${att.id}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  backgroundColor: '#F0F4F2',
                  border: '1px solid #D1D5DB',
                  borderRadius: '0.5rem',
                  padding: '0.75rem 1rem',
                  opacity: 0.75,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={{ fontSize: '1.25rem', opacity: 0.5 }}>🚫</span>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.875rem', color: '#6B7280', textDecoration: 'line-through' }}>
                      {att.fileName}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>
                      {formatFileSize(att.fileSize)} · Removed
                    </div>
                    {att.removalReason && (
                      <div style={{ fontSize: '0.78rem', color: '#DC2626', marginTop: '0.2rem', fontWeight: 500 }}>
                        Reason: {att.removalReason}
                      </div>
                    )}
                  </div>
                </div>

                <button
                  id={`download-attachment-disabled-${att.id}`}
                  type="button"
                  disabled
                  style={{
                    backgroundColor: '#E5E7EB',
                    color: '#9CA3AF',
                    border: '1px solid #D1D5DB',
                    borderRadius: '0.375rem',
                    padding: '0.4rem 0.75rem',
                    fontSize: '0.8125rem',
                    fontWeight: 600,
                    cursor: 'not-allowed',
                  }}
                >
                  Download Unavailable (Removed)
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------------- */}
      {/* Upload New Attachment Form                                            */}
      {/* -------------------------------------------------------------------- */}
      <div
        style={{
          backgroundColor: 'var(--surface-card)',
          border: '1px border-dashed #B8E2CD',
          borderRadius: '0.625rem',
          padding: '1.25rem',
        }}
      >
        <h4 style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--primary-green)', marginBottom: '0.5rem' }}>
          Upload New Attachment
        </h4>

        {isLimitReached ? (
          <p style={{ color: '#DC2626', fontSize: '0.875rem', margin: 0, fontWeight: 500 }}>
            ⚠️ Active attachment limit (5) reached. Soft-remove an existing attachment to upload a new one.
          </p>
        ) : (
          <form onSubmit={handleUploadSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <input
                id="attachment-upload-input"
                type="file"
                accept=".jpg,.jpeg,.png,.webp,.pdf"
                onChange={handleFileChange}
                disabled={uploading}
                style={{ fontSize: '0.875rem' }}
              />
              <button
                id="upload-attachment-btn"
                type="submit"
                className="btn-zen-primary"
                disabled={!selectedFile || uploading}
                style={{ padding: '0.5rem 1.25rem', fontSize: '0.875rem' }}
              >
                {uploading ? 'Uploading...' : 'Upload File'}
              </button>
            </div>

            <p style={{ fontSize: '0.75rem', color: '#6B7280', margin: 0 }}>
              Permitted formats: JPG, PNG, WEBP, PDF (Max 5 MB each). Maximum 5 active attachments per ticket.
            </p>

            {uploadError && (
              <div id="attachment-upload-error" style={{ color: '#DC2626', fontSize: '0.85rem', fontWeight: 500 }}>
                ⚠️ {uploadError}
              </div>
            )}

            {uploadSuccess && (
              <div id="attachment-upload-success" style={{ color: 'var(--primary-green)', fontSize: '0.85rem', fontWeight: 500 }}>
                ✓ {uploadSuccess}
              </div>
            )}
          </form>
        )}
      </div>

      {/* -------------------------------------------------------------------- */}
      {/* Soft Removal Modal                                                   */}
      {/* -------------------------------------------------------------------- */}
      {removingAttachment && (
        <div
          id="soft-removal-modal"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem',
          }}
        >
          <div
            className="zen-card"
            style={{
              maxWidth: '500px',
              width: '100%',
              padding: '1.5rem',
              borderRadius: '0.75rem',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            }}
          >
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#DC2626', marginBottom: '0.5rem' }}>
              Soft Remove Attachment
            </h3>
            <p style={{ fontSize: '0.875rem', color: '#4B5563', marginBottom: '1rem' }}>
              Are you sure you want to remove <strong>{removingAttachment.fileName}</strong>?
              This action will soft-remove the attachment and prevent further downloads.
            </p>

            <form onSubmit={handleRemovalSubmit}>
              <div style={{ marginBottom: '1rem' }}>
                <label
                  htmlFor="removal-reason-input"
                  style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: 'var(--dark-text)', marginBottom: '0.35rem' }}
                >
                  Removal Reason <span style={{ color: '#DC2626' }}>*</span>
                </label>
                <textarea
                  id="removal-reason-input"
                  className="form-input"
                  rows={3}
                  placeholder="Provide a mandatory reason for removing this file (e.g. Obsolete document)..."
                  value={removalReason}
                  onChange={(e) => setRemovalReason(e.target.value)}
                  style={{ width: '100%', fontSize: '0.875rem' }}
                />
                {removalError && (
                  <div id="removal-reason-error" style={{ color: '#DC2626', fontSize: '0.8125rem', marginTop: '0.35rem', fontWeight: 500 }}>
                    {removalError}
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  id="cancel-removal-btn"
                  type="button"
                  onClick={() => {
                    setRemovingAttachment(null);
                    setRemovalReason('');
                    setRemovalError(null);
                  }}
                  style={{
                    backgroundColor: '#E5E7EB',
                    color: '#374151',
                    border: 'none',
                    borderRadius: '0.375rem',
                    padding: '0.5rem 1rem',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  id="confirm-removal-btn"
                  type="submit"
                  disabled={submittingRemoval}
                  style={{
                    backgroundColor: '#DC2626',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '0.375rem',
                    padding: '0.5rem 1.25rem',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    opacity: submittingRemoval ? 0.6 : 1,
                  }}
                >
                  {submittingRemoval ? 'Removing...' : 'Confirm Soft Removal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AttachmentSection;
