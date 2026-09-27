import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';

export interface PerformedByUser {
  id: number;
  name: string;
  email: string;
  role?: string;
}

export interface ActionTaken {
  id: string;
  ticketId: number;
  performedById: number;
  description: string;
  result: string;
  followUpRequired: boolean;
  followUpNote: string | null;
  attachmentNotes: string | null;
  actionDate: string;
  createdAt: string;
  updatedAt: string;
  performedBy: PerformedByUser;
}

interface ActionsTakenSectionProps {
  ticketId: number;
}

const getApiUrl = (path: string): string => {
  const origin =
    typeof window !== 'undefined' && window.location.origin && window.location.origin !== 'null'
      ? window.location.origin
      : 'http://localhost:3000';
  return `${origin}${path}`;
};

const formatDate = (iso: string): string => {
  try {
    return new Date(iso).toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
};

export const ActionsTakenSection: React.FC<ActionsTakenSectionProps> = ({ ticketId }) => {
  const { user } = useAuth();
  const isStaffOrAdmin = user?.role === 'IT_STAFF' || user?.role === 'ADMIN';

  const [actions, setActions] = useState<ActionTaken[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [description, setDescription] = useState<string>('');
  const [result, setResult] = useState<string>('');
  const [followUpRequired, setFollowUpRequired] = useState<boolean>(false);
  const [followUpNote, setFollowUpNote] = useState<string>('');
  const [attachmentNotes, setAttachmentNotes] = useState<string>('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);

  const fetchActions = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(getApiUrl(`/api/tickets/${ticketId}/actions`), {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-Requester-Id': String(user.id),
        },
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || errData.error || 'Failed to load actions taken log');
      }

      const data = await res.json();
      setActions(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while loading actions');
    } finally {
      setLoading(false);
    }
  }, [ticketId, user]);

  useEffect(() => {
    fetchActions();
  }, [fetchActions]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (!description.trim()) {
      setValidationError('Description is required.');
      return;
    }

    if (!result.trim()) {
      setValidationError('Result is required.');
      return;
    }

    if (followUpRequired && !followUpNote.trim()) {
      setValidationError('Follow-up note is required when follow-up is checked.');
      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        description: description.trim(),
        result: result.trim(),
        followUpRequired,
        followUpNote: followUpRequired ? followUpNote.trim() : null,
        attachmentNotes: attachmentNotes.trim() ? attachmentNotes.trim() : null,
      };

      const res = await fetch(getApiUrl(`/api/tickets/${ticketId}/actions`), {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-Requester-Id': String(user?.id),
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || errData.error || 'Failed to log action taken');
      }

      // Reset form
      setDescription('');
      setResult('');
      setFollowUpRequired(false);
      setFollowUpNote('');
      setAttachmentNotes('');
      setValidationError(null);

      // Refresh actions
      await fetchActions();
    } catch (err) {
      setValidationError(err instanceof Error ? err.message : 'Failed to log action taken');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="actions-taken-section"
      style={{
        border: '1px solid #10B981',
        borderRadius: '0.75rem',
        overflow: 'hidden',
        marginTop: '1.5rem',
        backgroundColor: '#FFFFFF',
      }}
    >
      <div
        style={{
          background: '#ECFDF5',
          borderBottom: '1px solid #10B981',
          padding: '0.8rem 1rem',
          fontWeight: 700,
          color: '#065F46',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <span>🛠️ Actions Taken Audit Log</span>
        <span style={{ fontSize: '0.8rem', color: '#047857', fontWeight: 500 }}>
          {actions.length} {actions.length === 1 ? 'Entry' : 'Entries'}
        </span>
      </div>

      <div style={{ padding: '1.25rem' }}>
        {loading ? (
          <div style={{ color: '#6B7280', italic: 'true', padding: '1rem 0' }}>
            Loading actions taken log...
          </div>
        ) : error ? (
          <div style={{ color: '#DC2626', padding: '0.5rem 0' }}>{error}</div>
        ) : actions.length === 0 ? (
          <div style={{ color: '#6B7280', fontStyle: 'italic', marginBottom: isStaffOrAdmin ? '1.5rem' : '0' }}>
            No actions taken logged for this ticket yet.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: isStaffOrAdmin ? '1.5rem' : '0' }}>
            {actions.map((act) => (
              <div
                key={act.id}
                style={{
                  background: '#F9FAFB',
                  border: '1px solid #E5E7EB',
                  borderRadius: '0.5rem',
                  padding: '1rem',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justify: 'space-between',
                    alignItems: 'center',
                    marginBottom: '0.5rem',
                    fontSize: '0.8rem',
                    color: '#4B5563',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <strong>{act.performedBy?.name || 'Staff Member'}</strong>
                    <span
                      style={{
                        backgroundColor: '#D1FAE5',
                        color: '#065F46',
                        padding: '0.1rem 0.4rem',
                        borderRadius: '0.25rem',
                        fontSize: '0.7rem',
                        fontWeight: 600,
                      }}
                    >
                      {act.performedBy?.role || 'IT_STAFF'}
                    </span>
                  </div>
                  <span>{formatDate(act.actionDate || act.createdAt)}</span>
                </div>

                <div style={{ marginBottom: '0.5rem' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase' }}>
                    Description / Procedure
                  </div>
                  <div style={{ fontSize: '0.925rem', color: '#111827', whiteSpace: 'pre-wrap' }}>
                    {act.description}
                  </div>
                </div>

                <div style={{ marginBottom: '0.5rem' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase' }}>
                    Result / Outcome
                  </div>
                  <div style={{ fontSize: '0.925rem', color: '#111827', whiteSpace: 'pre-wrap' }}>
                    {act.result}
                  </div>
                </div>

                {act.followUpRequired && (
                  <div
                    style={{
                      background: '#FEF3C7',
                      border: '1px solid #F59E0B',
                      borderRadius: '0.375rem',
                      padding: '0.6rem 0.8rem',
                      marginTop: '0.5rem',
                      color: '#92400E',
                      fontSize: '0.875rem',
                    }}
                  >
                    <strong>⚠️ Follow-Up Required:</strong> {act.followUpNote || 'No details provided.'}
                  </div>
                )}

                {act.attachmentNotes && (
                  <div
                    style={{
                      marginTop: '0.5rem',
                      fontSize: '0.8125rem',
                      color: '#4B5563',
                      background: '#F3F4F6',
                      padding: '0.4rem 0.6rem',
                      borderRadius: '0.25rem',
                    }}
                  >
                    <strong>📎 Attachment Notes:</strong> {act.attachmentNotes}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Action Taken Creation Form (IT_STAFF / ADMIN ONLY) */}
        {isStaffOrAdmin && (
          <form
            onSubmit={handleSubmit}
            aria-label="Log Action Form"
            style={{
              borderTop: actions.length > 0 ? '1px solid #E5E7EB' : 'none',
              paddingTop: actions.length > 0 ? '1.25rem' : '0',
            }}
          >
            <h4 style={{ fontSize: '1rem', fontWeight: 600, color: '#065F46', marginBottom: '1rem' }}>
              ➕ Log New Action Taken
            </h4>

            {validationError && (
              <div
                style={{
                  backgroundColor: '#FEE2E2',
                  border: '1px solid #FCA5A5',
                  color: '#991B1B',
                  padding: '0.6rem 0.8rem',
                  borderRadius: '0.375rem',
                  fontSize: '0.875rem',
                  marginBottom: '1rem',
                }}
              >
                {validationError}
              </div>
            )}

            <div style={{ marginBottom: '1rem' }}>
              <label
                htmlFor="action-description"
                style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#374151', marginBottom: '0.35rem' }}
              >
                Description <span style={{ color: '#DC2626' }}>*</span>
              </label>
              <textarea
                id="action-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe diagnostic or resolution procedures performed..."
                rows={3}
                style={{
                  width: '100%',
                  padding: '0.6rem 0.75rem',
                  borderRadius: '0.375rem',
                  border: '1px solid #CBD5E1',
                  fontSize: '0.9rem',
                }}
              />
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label
                htmlFor="action-result"
                style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#374151', marginBottom: '0.35rem' }}
              >
                Result <span style={{ color: '#DC2626' }}>*</span>
              </label>
              <textarea
                id="action-result"
                value={result}
                onChange={(e) => setResult(e.target.value)}
                placeholder="State the verified outcome or technical result..."
                rows={2}
                style={{
                  width: '100%',
                  padding: '0.6rem 0.75rem',
                  borderRadius: '0.375rem',
                  border: '1px solid #CBD5E1',
                  fontSize: '0.9rem',
                }}
              />
            </div>

            <div style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input
                type="checkbox"
                id="action-followup-checkbox"
                checked={followUpRequired}
                onChange={(e) => {
                  setFollowUpRequired(e.target.checked);
                  if (!e.target.checked) setFollowUpNote('');
                }}
                style={{ width: '1.1rem', height: '1.1rem', cursor: 'pointer' }}
              />
              <label htmlFor="action-followup-checkbox" style={{ fontSize: '0.875rem', fontWeight: 600, color: '#374151', cursor: 'pointer' }}>
                Follow-Up Required?
              </label>
            </div>

            {followUpRequired && (
              <div style={{ marginBottom: '1rem', paddingLeft: '1.5rem' }}>
                <label
                  htmlFor="action-followup-note"
                  style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#B45309', marginBottom: '0.35rem' }}
                >
                  Follow-Up Note <span style={{ color: '#DC2626' }}>*</span>
                </label>
                <textarea
                  id="action-followup-note"
                  value={followUpNote}
                  onChange={(e) => setFollowUpNote(e.target.value)}
                  placeholder="Specify mandatory follow-up steps or schedules..."
                  rows={2}
                  style={{
                    width: '100%',
                    padding: '0.6rem 0.75rem',
                    borderRadius: '0.375rem',
                    border: '1px solid #F59E0B',
                    backgroundColor: '#FFFBEB',
                    fontSize: '0.9rem',
                  }}
                />
              </div>
            )}

            <div style={{ marginBottom: '1.25rem' }}>
              <label
                htmlFor="action-attachment-notes"
                style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#374151', marginBottom: '0.35rem' }}
              >
                Attachment Notes (Optional)
              </label>
              <textarea
                id="action-attachment-notes"
                value={attachmentNotes}
                onChange={(e) => setAttachmentNotes(e.target.value)}
                placeholder="Optional references to log files, screenshots, or attachments..."
                rows={2}
                style={{
                  width: '100%',
                  padding: '0.6rem 0.75rem',
                  borderRadius: '0.375rem',
                  border: '1px solid #CBD5E1',
                  fontSize: '0.9rem',
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="submit"
                disabled={submitting}
                className="btn-zen-primary"
                style={{ padding: '0.6rem 1.25rem' }}
              >
                {submitting ? 'Submitting...' : 'Log Action Taken'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default ActionsTakenSection;
