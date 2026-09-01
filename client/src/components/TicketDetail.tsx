import React, { useState, useEffect, useCallback } from 'react';
import { useDevRequester } from '../context/DevRequesterContext';
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

interface TicketDetailData {
  id: number;
  ticketNumber: string;
  summary: string;
  description: string;
  requestedPriority: string;
  currentStatus: string;
  requesterId: number;
  category: Category;
  relatedSystem: RelatedSystem;
  requesterUser?: RequesterUser;
  attachments: Attachment[];
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
  const { selectedRequester } = useDevRequester();

  const [ticket, setTicket] = useState<TicketDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTicketDetail = useCallback(async () => {
    if (!selectedRequester) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(getApiUrl(`/api/tickets/${ticketId}`), {
        headers: {
          'X-Requester-Id': String(selectedRequester.id),
        },
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to fetch ticket detail');
      }

      const data = await res.json();
      setTicket(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [ticketId, selectedRequester]);

  useEffect(() => {
    fetchTicketDetail();
  }, [fetchTicketDetail]);

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

  return (
    <div style={{ maxWidth: '900px', margin: '2rem auto 0' }}>
      {/* Header & Back Action */}
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

      {/* Main Ticket Detail Card */}
      <div className="zen-card" style={{ padding: '1.75rem 2rem' }}>
        {/* Title / Ticket Number */}
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

          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
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

        {/* Read-Only Grid Fields */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem', marginBottom: '1.5rem' }}>
          {/* Category */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#6B7280', marginBottom: '0.35rem' }}>
              Category
            </label>
            <div
              id="ticket-detail-category"
              style={{
                backgroundColor: '#F0F4F2',
                border: '1px solid var(--border-color)',
                borderRadius: '0.375rem',
                padding: '0.6rem 0.875rem',
                fontSize: '0.9rem',
                fontWeight: 600,
                color: 'var(--dark-text)',
              }}
            >
              {ticket.category?.name || '—'}
            </div>
          </div>

          {/* Related System */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#6B7280', marginBottom: '0.35rem' }}>
              Related System
            </label>
            <div
              id="ticket-detail-related-system"
              style={{
                backgroundColor: '#F0F4F2',
                border: '1px solid var(--border-color)',
                borderRadius: '0.375rem',
                padding: '0.6rem 0.875rem',
                fontSize: '0.9rem',
                fontWeight: 600,
                color: 'var(--dark-text)',
              }}
            >
              {ticket.relatedSystem?.name || '—'}
            </div>
          </div>

          {/* Created Date */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#6B7280', marginBottom: '0.35rem' }}>
              Date Submitted
            </label>
            <div
              id="ticket-detail-created-at"
              style={{
                backgroundColor: '#F0F4F2',
                border: '1px solid var(--border-color)',
                borderRadius: '0.375rem',
                padding: '0.6rem 0.875rem',
                fontSize: '0.9rem',
                color: 'var(--dark-text)',
              }}
            >
              {formatDate(ticket.createdAt)}
            </div>
          </div>

          {/* Requester */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#6B7280', marginBottom: '0.35rem' }}>
              Requester Identity
            </label>
            <div
              id="ticket-detail-requester"
              style={{
                backgroundColor: '#F0F4F2',
                border: '1px solid var(--border-color)',
                borderRadius: '0.375rem',
                padding: '0.6rem 0.875rem',
                fontSize: '0.9rem',
                color: 'var(--dark-text)',
              }}
            >
              {ticket.requesterUser?.name || selectedRequester?.name} ({ticket.requesterUser?.department || selectedRequester?.department})
            </div>
          </div>
        </div>

        {/* Description Field */}
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#6B7280', marginBottom: '0.35rem' }}>
            Full Problem Description
          </label>
          <div
            id="ticket-detail-description"
            style={{
              backgroundColor: '#F0F4F2',
              border: '1px solid var(--border-color)',
              borderRadius: '0.375rem',
              padding: '0.875rem 1rem',
              fontSize: '0.925rem',
              color: 'var(--dark-text)',
              whiteSpace: 'pre-wrap',
              lineHeight: 1.5,
              minHeight: '80px',
            }}
          >
            {ticket.description}
          </div>
        </div>

        {/* File Attachments Section */}
        <AttachmentSection
          ticketId={ticket.id}
          attachments={ticket.attachments || []}
          onAttachmentUpdated={fetchTicketDetail}
        />
      </div>
    </div>
  );
};

export default TicketDetail;
