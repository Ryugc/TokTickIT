import React, { useState, useEffect } from 'react';

export interface RecentRequesterTicket {
  id: number;
  ticketNumber: string;
  summary: string;
  currentStatus: string;
  requestedPriority?: string;
  updatedAt: string;
  category?: { id: number; name: string };
  relatedSystem?: { id: number; name: string };
}

export interface RequesterDashboardData {
  openCount: number;
  inProgressCount: number;
  resolvedCount: number;
  closedCount: number;
  recentTickets: RecentRequesterTicket[];
}

interface RequesterDashboardProps {
  onSelectTicket?: (ticketId: number) => void;
}

const STATUS_BADGES: Record<string, { label: string; bg: string; color: string }> = {
  NEW: { label: 'New', bg: '#DBEAFE', color: '#1E40AF' },
  OPEN: { label: 'Open', bg: '#FEF3C7', color: '#92400E' },
  IN_PROGRESS: { label: 'In Progress', bg: '#E0E7FF', color: '#3730A3' },
  WAITING_FOR_REQUESTER: { label: 'Waiting for Requester', bg: '#FFEDD5', color: '#9A3412' },
  RESOLVED: { label: 'Resolved', bg: '#DCFCE7', color: '#166534' },
  REOPENED: { label: 'Reopened', bg: '#FEE2E2', color: '#991B1B' },
  CLOSED: { label: 'Closed', bg: '#F1F5F9', color: '#475569' },
  CANCELLED: { label: 'Cancelled', bg: '#E2E8F0', color: '#64748B' },
};

export const RequesterDashboard: React.FC<RequesterDashboardProps> = ({ onSelectTicket }) => {
  const [data, setData] = useState<RequesterDashboardData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);

    fetch('/api/dashboard/requester')
      .then(async (res) => {
        if (!res.ok) {
          const errJson = await res.json().catch(() => ({}));
          throw new Error(errJson.message || `Failed to fetch requester dashboard (Status ${res.status})`);
        }
        return res.json();
      })
      .then((data: RequesterDashboardData) => {
        if (isMounted) {
          setData(data);
          setLoading(false);
        }
      })
      .catch((err: Error) => {
        if (isMounted) {
          setError(err.message);
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="zen-card" style={{ textAlign: 'center', padding: '2rem', marginBottom: '2rem' }}>
        <p style={{ color: '#6B7280' }}>Loading personal dashboard metrics...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="zen-card" style={{ borderColor: 'var(--error)', marginBottom: '2rem' }}>
        <h3 style={{ color: 'var(--error)', marginBottom: '0.5rem' }}>Dashboard Error</h3>
        <p style={{ color: '#6B7280' }}>{error}</p>
      </div>
    );
  }

  if (!data) return null;

  const metricCards = [
    { key: 'openCount', title: 'Open Tickets', count: data.openCount, borderTopColor: '#F59E0B' },
    { key: 'inProgressCount', title: 'In Progress', count: data.inProgressCount, borderTopColor: '#6366F1' },
    { key: 'resolvedCount', title: 'Resolved Tickets', count: data.resolvedCount, borderTopColor: 'var(--primary-green)' },
    { key: 'closedCount', title: 'Closed Tickets', count: data.closedCount, borderTopColor: '#64748B' },
  ];

  const recentTickets = data.recentTickets || [];

  return (
    <div style={{ marginBottom: '2rem' }}>
      <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--dark-text)', marginBottom: '1rem' }}>
        My Personal Dashboard
      </h3>

      {/* Metric Cards Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1rem',
          marginBottom: '2rem',
        }}
      >
        {metricCards.map((card) => (
          <div
            key={card.key}
            className="zen-card"
            style={{
              padding: '1.25rem',
              borderTop: `4px solid ${card.borderTopColor}`,
              display: 'flex',
              flexDirection: 'column',
              justify: 'space-between',
            }}
          >
            <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#6B7280', marginBottom: '0.5rem' }}>
              {card.title}
            </span>
            <span
              data-testid={`metric-${card.key}`}
              style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--dark-text)' }}
            >
              {card.count}
            </span>
          </div>
        ))}
      </div>

      {/* My Recent Tickets Table */}
      <div className="zen-card">
        <h4 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--dark-text)', marginBottom: '1rem' }}>
          My Recent Tickets
        </h4>

        {recentTickets.length === 0 ? (
          <p style={{ color: '#6B7280', fontStyle: 'italic' }}>You have not submitted any tickets yet.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border-color)', color: '#4B5563' }}>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Ticket #</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Summary</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Category</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Status</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Updated</th>
                  <th style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {recentTickets.map((ticket) => {
                  const statusBadge = STATUS_BADGES[ticket.currentStatus] || { label: ticket.currentStatus, bg: '#E2E8F0', color: '#475569' };

                  return (
                    <tr
                      key={ticket.id}
                      style={{ borderBottom: '1px solid var(--border-color)', transition: 'background-color 0.15s' }}
                    >
                      <td style={{ padding: '0.75rem 0.5rem', fontWeight: 600, color: 'var(--primary-green)' }}>
                        {ticket.ticketNumber}
                      </td>
                      <td style={{ padding: '0.75rem 0.5rem', fontWeight: 500, maxWidth: '260px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {ticket.summary}
                      </td>
                      <td style={{ padding: '0.75rem 0.5rem', color: '#4B5563' }}>
                        {ticket.category?.name || 'General'}
                      </td>
                      <td style={{ padding: '0.75rem 0.5rem' }}>
                        <span
                          style={{
                            backgroundColor: statusBadge.bg,
                            color: statusBadge.color,
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            padding: '0.2rem 0.5rem',
                            borderRadius: '9999px',
                            display: 'inline-block',
                          }}
                        >
                          {statusBadge.label}
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem 0.5rem', color: '#6B7280', fontSize: '0.85rem' }}>
                        {new Date(ticket.updatedAt).toLocaleDateString()}
                      </td>
                      <td style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>
                        {onSelectTicket && (
                          <button
                            type="button"
                            className="btn-zen-primary"
                            style={{ padding: '0.25rem 0.75rem', fontSize: '0.8rem' }}
                            onClick={() => onSelectTicket(ticket.id)}
                          >
                            View
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default RequesterDashboard;
