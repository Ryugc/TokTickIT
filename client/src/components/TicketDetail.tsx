import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import AttachmentSection, { Attachment } from './AttachmentSection';

interface Category {
  id: number;
  name: string;
}

interface RelatedSystem {
  id: number;
  name: string;
}

interface RequesterUser {
  id: number;
  name: string;
  email: string;
  department: string;
}

interface AssigneeUser {
  id: number;
  name: string;
  email: string;
  role?: string;
}

interface TicketComment {
  id: number;
  content: string;
  createdAt: string;
  author: { id: number; name: string; role?: string };
}

interface TicketDetailData {
  id: number;
  ticketNumber: string;
  summary: string;
  description: string;
  requestedPriority: string;
  itPriority?: string | null;
  currentStatus: string;
  requesterId: number;
  category: Category;
  relatedSystem: RelatedSystem;
  requesterUser?: RequesterUser;
  assignedTo?: AssigneeUser | null;
  attachments: Attachment[];
  comments?: TicketComment[];
  internalNotes?: TicketComment[];
  createdAt: string;
  updatedAt: string;
}

interface TicketDetailProps {
  ticketId: number;
  onBack: () => void;
}

const getApiUrl = (path: string): string => {
  const origin =
    typeof window !== 'undefined' && window.location.origin && window.location.origin !== 'null'
      ? window.location.origin
      : 'http://localhost:3000';
  return `${origin}${path}`;
};

const PRIORITY_LABELS: Record<string, string> = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
  URGENT: 'Urgent',
};

const STATUS_LABELS: Record<string, string> = {
  NEW: 'New',
  OPEN: 'Open',
  IN_PROGRESS: 'In Progress',
  RESOLVED: 'Resolved',
  CLOSED: 'Closed',
};

const PRIORITY_COLORS: Record<string, React.CSSProperties> = {
  LOW:    { backgroundColor: '#E0F2FE', color: '#0369A1' },
  MEDIUM: { backgroundColor: '#FEF9C3', color: '#854D0E' },
  HIGH:   { backgroundColor: '#FEE2E2', color: '#991B1B' },
  URGENT: { backgroundColor: '#7F1D1D', color: '#FFFFFF' },
};

const STATUS_COLORS: Record<string, React.CSSProperties> = {
  NEW:         { backgroundColor: '#EAF6EF', color: '#006B3C' },
  OPEN:        { backgroundColor: '#DBEAFE', color: '#1E40AF' },
  IN_PROGRESS: { backgroundColor: '#FEF3C7', color: '#92400E' },
  RESOLVED:    { backgroundColor: '#D1FAE5', color: '#065F46' },
  CLOSED:      { backgroundColor: '#F3F4F6', color: '#374151' },
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

export const TicketDetail: React.FC<TicketDetailProps> = ({ ticketId, onBack }) => {
  const { user } = useAuth();

  const [ticket, setTicket] = useState<TicketDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusValue, setStatusValue] = useState('');
  const [priorityValue, setPriorityValue] = useState('');
  const [commentInput, setCommentInput] = useState('');
  const [noteInput, setNoteInput] = useState('');
  const [isStaffView, setIsStaffView] = useState(user?.role === 'IT_STAFF' || user?.role === 'ADMIN');

  const fetchTicketDetail = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(getApiUrl(`/api/tickets/${ticketId}`), {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-Requester-Id': String(user.id),
        },
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || err.error || 'Failed to fetch ticket detail');
      }

      const data = await res.json();
      setTicket(data);
      setStatusValue(data.currentStatus || '');
      setPriorityValue(data.itPriority || data.requestedPriority || '');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [ticketId, user]);

  useEffect(() => {
    setIsStaffView(user?.role === 'IT_STAFF' || user?.role === 'ADMIN');
  }, [user]);

  useEffect(() => {
    fetchTicketDetail();
  }, [fetchTicketDetail]);

  const handleStatusUpdate = async (event: React.ChangeEvent<HTMLSelectElement>) => {
    const nextStatus = event.target.value;
    if (!ticket || !user || !isStaffView) return;

    setStatusValue(nextStatus);
    try {
      const res = await fetch(getApiUrl(`/api/tickets/${ticket.id}/status`), {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || data.error || 'Failed to update status');
      }
      setTicket((prev) => (prev ? { ...prev, currentStatus: data.currentStatus || nextStatus } : prev));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update status');
      setStatusValue(ticket.currentStatus || '');
    }
  };

  const handlePriorityUpdate = async (event: React.ChangeEvent<HTMLSelectElement>) => {
    const nextPriority = event.target.value;
    if (!ticket || !user || !isStaffView) return;

    setPriorityValue(nextPriority);
    try {
      const res = await fetch(getApiUrl(`/api/tickets/${ticket.id}/priority`), {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itPriority: nextPriority }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || data.error || 'Failed to update priority');
      }
      setTicket((prev) => (prev ? { ...prev, itPriority: data.itPriority || nextPriority } : prev));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update priority');
      setPriorityValue(ticket.itPriority || ticket.requestedPriority || '');
    }
  };

  const handleAssignToMe = async () => {
    if (!ticket || !user || !isStaffView) return;
    try {
      const res = await fetch(getApiUrl(`/api/tickets/${ticket.id}/assign`), {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignedToId: user.id }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || data.error || 'Failed to assign ticket');
      }
      setTicket((prev) => (prev ? { ...prev, assignedTo: { id: user.id, name: user.name, email: user.email }, currentStatus: data.currentStatus || prev.currentStatus } : prev));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to assign ticket');
    }
  };

  const handleCommentSubmit = async () => {
    if (!ticket || !commentInput.trim()) return;
    try {
      const res = await fetch(getApiUrl(`/api/tickets/${ticket.id}/comments`), {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: commentInput.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || data.error || 'Failed to add comment');
      }
      setCommentInput('');
      await fetchTicketDetail();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add comment');
    }
  };

  const handleNoteSubmit = async () => {
    if (!ticket || !isStaffView || !noteInput.trim()) return;
    try {
      const res = await fetch(getApiUrl(`/api/tickets/${ticket.id}/notes`), {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: noteInput.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || data.error || 'Failed to add internal note');
      }
      setNoteInput('');
      await fetchTicketDetail();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add internal note');
    }
  };

  if (loading) {
    return (
      <div className="zen-card" style={{ maxWidth: '900px', margin: '2rem auto', textAlign: 'center', padding: '3rem 2rem' }}>
        <p style={{ color: '#6B7280', fontSize: '1rem' }}>Loading ticket details...</p>
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="zen-card" style={{ maxWidth: '900px', margin: '2rem auto', textAlign: 'center', padding: '3rem 2rem' }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚠️</div>
        <h3 style={{ color: '#DC2626', fontWeight: 700, marginBottom: '0.5rem' }}>Unable to Access Ticket</h3>
        <p style={{ color: '#6B7280', marginBottom: '1.5rem' }}>{error || 'Ticket not found.'}</p>
        <button
          id="back-to-tickets-btn"
          className="btn-zen-primary"
          onClick={onBack}
          style={{ padding: '0.6rem 1.5rem' }}
        >
          ← Back to My Tickets
        </button>
      </div>
    );
  }

  const publicComments = ticket.comments || [];
  const internalNotes = ticket.internalNotes || [];

  return (
    <div style={{ maxWidth: '1100px', margin: '2rem auto 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <button
          id="back-to-tickets-btn"
          onClick={onBack}
          style={{
            backgroundColor: 'transparent',
            color: 'var(--primary-green)',
            border: '1px solid #B8E2CD',
            borderRadius: '0.375rem',
            padding: '0.5rem 1rem',
            fontSize: '0.875rem',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.375rem',
          }}
        >
          ← Back to My Tickets
        </button>
        <span style={{ fontSize: '0.875rem', color: '#6B7280' }}>
          Ticket ID: #{ticket.id}
        </span>
      </div>

      <div className="zen-card" style={{ padding: '1.75rem 2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
          <div>
            <span
              id="ticket-detail-number"
              style={{
                fontFamily: 'monospace',
                fontSize: '1.25rem',
                fontWeight: 700,
                color: 'var(--primary-green)',
                backgroundColor: 'var(--pale-green)',
                padding: '0.25rem 0.75rem',
                borderRadius: '0.375rem',
                display: 'inline-block',
                marginBottom: '0.5rem',
              }}
            >
              {ticket.ticketNumber}
            </span>
            <h2 id="ticket-detail-summary" style={{ fontSize: '1.375rem', fontWeight: 700, color: 'var(--dark-text)', margin: 0 }}>
              {ticket.summary}
            </h2>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <span
              id="ticket-detail-status-badge"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '0.35rem 0.85rem',
                borderRadius: '9999px',
                fontSize: '0.8125rem',
                fontWeight: 700,
                ...(STATUS_COLORS[ticket.currentStatus] || {}),
              }}
            >
              Status: {STATUS_LABELS[ticket.currentStatus] || ticket.currentStatus}
            </span>
            <span
              id="ticket-detail-priority-badge"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '0.35rem 0.85rem',
                borderRadius: '9999px',
                fontSize: '0.8125rem',
                fontWeight: 700,
                ...(PRIORITY_COLORS[ticket.requestedPriority] || {}),
              }}
            >
              Priority: {PRIORITY_LABELS[ticket.requestedPriority] || ticket.requestedPriority}
            </span>
          </div>
        </div>

        {isStaffView && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', marginBottom: '1.5rem', padding: '1rem', backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '0.75rem' }}>
            <button
              type="button"
              onClick={handleAssignToMe}
              style={{ background: '#006B3C', color: '#fff', border: 'none', borderRadius: '0.5rem', padding: '0.65rem 1rem', fontWeight: 600, cursor: 'pointer' }}
            >
              Assign to Me
            </button>

            <label style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.8rem', fontWeight: 600, color: '#374151' }}>
              Ticket Status
              <select
                aria-label="Ticket Status"
                value={statusValue}
                onChange={handleStatusUpdate}
                style={{ minWidth: '170px', borderRadius: '0.5rem', border: '1px solid #CBD5E1', padding: '0.6rem 0.75rem', background: '#fff' }}
              >
                {Object.entries(STATUS_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </label>

            <label style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.8rem', fontWeight: 600, color: '#374151' }}>
              IT Priority
              <select
                aria-label="IT Priority"
                value={priorityValue}
                onChange={handlePriorityUpdate}
                style={{ minWidth: '170px', borderRadius: '0.5rem', border: '1px solid #CBD5E1', padding: '0.6rem 0.75rem', background: '#fff' }}
              >
                {Object.entries(PRIORITY_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </label>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem', marginBottom: '1.5rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#6B7280', marginBottom: '0.35rem' }}>
              Category
            </label>
            <div id="ticket-detail-category" style={{ backgroundColor: '#F0F4F2', border: '1px solid var(--border-color)', borderRadius: '0.375rem', padding: '0.6rem 0.875rem', fontSize: '0.9rem', fontWeight: 600, color: 'var(--dark-text)' }}>
              {ticket.category?.name || '—'}
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#6B7280', marginBottom: '0.35rem' }}>
              Related System
            </label>
            <div id="ticket-detail-related-system" style={{ backgroundColor: '#F0F4F2', border: '1px solid var(--border-color)', borderRadius: '0.375rem', padding: '0.6rem 0.875rem', fontSize: '0.9rem', fontWeight: 600, color: 'var(--dark-text)' }}>
              {ticket.relatedSystem?.name || '—'}
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#6B7280', marginBottom: '0.35rem' }}>
              Date Submitted
            </label>
            <div id="ticket-detail-created-at" style={{ backgroundColor: '#F0F4F2', border: '1px solid var(--border-color)', borderRadius: '0.375rem', padding: '0.6rem 0.875rem', fontSize: '0.9rem', color: 'var(--dark-text)' }}>
              {formatDate(ticket.createdAt)}
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#6B7280', marginBottom: '0.35rem' }}>
              Requester Identity
            </label>
            <div id="ticket-detail-requester" style={{ backgroundColor: '#F0F4F2', border: '1px solid var(--border-color)', borderRadius: '0.375rem', padding: '0.6rem 0.875rem', fontSize: '0.9rem', color: 'var(--dark-text)' }}>
              {ticket.requesterUser?.name || '—'} ({ticket.requesterUser?.department || '—'})
            </div>
          </div>
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#6B7280', marginBottom: '0.35rem' }}>
            Full Problem Description
          </label>
          <div id="ticket-detail-description" style={{ backgroundColor: '#F0F4F2', border: '1px solid var(--border-color)', borderRadius: '0.375rem', padding: '0.875rem 1rem', fontSize: '0.925rem', color: 'var(--dark-text)', whiteSpace: 'pre-wrap', lineHeight: 1.5, minHeight: '80px' }}>
            {ticket.description}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.25rem', marginBottom: '1.5rem' }}>
          <div style={{ border: '1px solid #DDE8E1', borderRadius: '0.75rem', overflow: 'hidden' }}>
            <div style={{ background: '#F3F7F5', borderBottom: '1px solid #DDE8E1', padding: '0.8rem 1rem', fontWeight: 700, color: '#1F2937' }}>
              Public Comments
            </div>
            <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {publicComments.length === 0 ? (
                <div style={{ color: '#6B7280', fontStyle: 'italic' }}>No public comments yet.</div>
              ) : (
                publicComments.map((comment) => (
                  <div key={comment.id} style={{ background: comment.author.role === 'IT_STAFF' || comment.author.role === 'ADMIN' ? '#E7F7EE' : '#F3F4F6', borderRadius: '0.75rem', padding: '0.8rem 0.9rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#6B7280', marginBottom: '0.35rem' }}>
                      <strong>{comment.author.name}</strong>
                      <span>{formatDate(comment.createdAt)}</span>
                    </div>
                    <div style={{ whiteSpace: 'pre-wrap', color: '#111827' }}>{comment.content}</div>
                  </div>
                ))
              )}
            </div>
            <div style={{ padding: '0 1rem 1rem' }}>
              <textarea
                value={commentInput}
                onChange={(e) => setCommentInput(e.target.value)}
                placeholder="Add a public comment"
                style={{ width: '100%', minHeight: '80px', resize: 'vertical', border: '1px solid #CBD5E1', borderRadius: '0.5rem', padding: '0.75rem', fontSize: '0.95rem' }}
              />
              <div style={{ marginTop: '0.75rem', display: 'flex', justifyContent: 'flex-end' }}>
                <button type="button" onClick={handleCommentSubmit} style={{ background: '#006B3C', color: '#fff', border: 'none', borderRadius: '0.5rem', padding: '0.6rem 1rem', fontWeight: 600, cursor: 'pointer' }}>
                  Post Public Comment
                </button>
              </div>
            </div>
          </div>

          {isStaffView && (
            <div style={{ border: '1px solid #F5D98D', background: '#FEF3C7', borderRadius: '0.75rem', overflow: 'hidden' }}>
              <div style={{ background: '#FDF6D8', borderBottom: '1px solid #F5D98D', padding: '0.8rem 1rem', fontWeight: 700, color: '#B45309' }}>
                🔒 Confidential Internal Notes — Visible only to IT Staff and Admins
              </div>
              <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {internalNotes.length === 0 ? (
                  <div style={{ color: '#92400E', fontStyle: 'italic' }}>No internal notes yet.</div>
                ) : (
                  internalNotes.map((note) => (
                    <div key={note.id} style={{ background: '#FFF7DB', border: '1px solid #F5D98D', borderRadius: '0.75rem', padding: '0.8rem 0.9rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#B45309', marginBottom: '0.35rem' }}>
                        <strong>{note.author.name}</strong>
                        <span>{formatDate(note.createdAt)}</span>
                      </div>
                      <div style={{ whiteSpace: 'pre-wrap', color: '#78350F' }}>{note.content}</div>
                    </div>
                  ))
                )}
              </div>
              <div style={{ padding: '0 1rem 1rem' }}>
                <textarea
                  value={noteInput}
                  onChange={(e) => setNoteInput(e.target.value)}
                  placeholder="Add an internal note"
                  style={{ width: '100%', minHeight: '80px', resize: 'vertical', border: '1px solid #F5D98D', borderRadius: '0.5rem', padding: '0.75rem', fontSize: '0.95rem', background: '#FFFBEB' }}
                />
                <div style={{ marginTop: '0.75rem', display: 'flex', justifyContent: 'flex-end' }}>
                  <button type="button" onClick={handleNoteSubmit} style={{ background: '#B45309', color: '#fff', border: 'none', borderRadius: '0.5rem', padding: '0.6rem 1rem', fontWeight: 600, cursor: 'pointer' }}>
                    Add Internal Note
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        <AttachmentSection ticketId={ticket.id} attachments={ticket.attachments || []} onAttachmentUpdated={fetchTicketDetail} />
      </div>
    </div>
  );
};

export default TicketDetail;
