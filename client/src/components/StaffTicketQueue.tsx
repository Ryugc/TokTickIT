import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface RequesterInfo {
  id: number;
  name: string;
  email: string;
  department: string;
}

interface AssigneeInfo {
  id: number;
  name: string;
  email: string;
}

interface CategoryInfo {
  id: number;
  name: string;
}

interface RelatedSystemInfo {
  id: number;
  name: string;
}

export interface StaffTicket {
  id: number;
  ticketNumber: string;
  summary: string;
  description: string;
  requestedPriority: string;
  itPriority: string | null;
  currentStatus: string;
  requesterUser: RequesterInfo;
  assignedTo: AssigneeInfo | null;
  category: CategoryInfo;
  relatedSystem: RelatedSystemInfo;
  createdAt: string;
  updatedAt: string;
}

interface PaginationMeta {
  totalItems: number;
  totalPages: number;
  currentPage: number;
  limit: number;
}

interface StaffTicketsResponse {
  data: StaffTicket[];
  pagination: PaginationMeta;
}

type ViewState = 'loading' | 'loaded' | 'empty' | 'no-results' | 'error';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STATUS_OPTIONS = ['NEW', 'OPEN', 'IN_PROGRESS', 'WAITING_FOR_REQUESTER', 'RESOLVED', 'REOPENED', 'CLOSED', 'CANCELLED'] as const;
const PRIORITY_OPTIONS = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const;
const SORT_OPTIONS = [
  { value: 'createdAt', label: 'Created Date' },
  { value: 'updatedAt', label: 'Last Updated' },
  { value: 'requestedPriority', label: 'Req. Priority' },
  { value: 'itPriority', label: 'IT Priority' },
] as const;

// ---------------------------------------------------------------------------
// Badge helpers
// ---------------------------------------------------------------------------

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, React.CSSProperties> = {
    NEW:                   { background: '#DBEAFE', color: '#1E40AF' },
    OPEN:                  { background: '#FEF3C7', color: '#92400E' },
    IN_PROGRESS:           { background: '#E0E7FF', color: '#3730A3' },
    WAITING_FOR_REQUESTER: { background: '#FFEDD5', color: '#9A3412' },
    RESOLVED:              { background: '#DCFCE7', color: '#166534' },
    REOPENED:              { background: '#FEE2E2', color: '#991B1B' },
    CLOSED:                { background: '#F1F5F9', color: '#475569' },
    CANCELLED:             { background: '#E2E8F0', color: '#64748B' },
  };
  const label: Record<string, string> = {
    NEW: 'New',
    OPEN: 'Open',
    IN_PROGRESS: 'In Progress',
    WAITING_FOR_REQUESTER: 'Waiting for Requester',
    RESOLVED: 'Resolved',
    REOPENED: 'Reopened',
    CLOSED: 'Closed',
    CANCELLED: 'Cancelled',
  };
  const style = styles[status] || { background: '#EDF2F7', color: '#718096' };
  return (
    <span style={{
      ...style,
      fontSize: '0.75rem',
      fontWeight: 600,
      padding: '0.2rem 0.6rem',
      borderRadius: '9999px',
      whiteSpace: 'nowrap' as const,
      display: 'inline-block',
    }}>
      {label[status] || status}
    </span>
  );
}

function PriorityBadge({ priority, label }: { priority: string | null; label?: string }) {
  if (!priority) {
    return (
      <span style={{ fontSize: '0.75rem', color: '#A0AEC0', fontStyle: 'italic' }}>
        {label || '—'}
      </span>
    );
  }
  const styles: Record<string, React.CSSProperties> = {
    LOW:    { background: '#EDF2F7', color: '#4A5568' },
    MEDIUM: { background: '#EBF8FF', color: '#2B6CB0' },
    HIGH:   { background: '#FEEBC8', color: '#DD6B20' },
    URGENT: { background: '#FED7D7', color: '#E53E3E' },
  };
  const style = styles[priority] || { background: '#EDF2F7', color: '#4A5568' };
  const displayLabel: Record<string, string> = { LOW: 'Low', MEDIUM: 'Medium', HIGH: 'High', URGENT: 'Urgent' };
  return (
    <span style={{
      ...style,
      fontSize: '0.75rem',
      fontWeight: 600,
      padding: '0.2rem 0.6rem',
      borderRadius: '9999px',
      whiteSpace: 'nowrap' as const,
      display: 'inline-block',
    }}>
      {displayLabel[priority] || priority}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Spinner
// ---------------------------------------------------------------------------

function LoadingSpinner() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4rem 2rem', gap: '1rem' }}>
      <div style={{
        width: '48px', height: '48px', border: '4px solid #EAF6EF',
        borderTop: '4px solid #006B3C', borderRadius: '50%',
        animation: 'tkt-spin 0.8s linear infinite',
      }} />
      <p style={{ color: '#4A5568', fontSize: '0.9rem', margin: 0 }}>Loading ticket queue…</p>
      <style>{`@keyframes tkt-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Pagination Controls
// ---------------------------------------------------------------------------

function PaginationControls({
  pagination,
  onPageChange,
}: {
  pagination: PaginationMeta;
  onPageChange: (page: number) => void;
}) {
  const { currentPage, totalPages, totalItems, limit } = pagination;
  if (totalPages <= 1) return null;

  const visiblePages: number[] = [];
  let start = Math.max(1, currentPage - 2);
  const end = Math.min(totalPages, start + 4);
  if (end - start < 4) start = Math.max(1, end - 4);
  for (let i = start; i <= end; i++) visiblePages.push(i);

  const from = (currentPage - 1) * limit + 1;
  const to = Math.min(currentPage * limit, totalItems);

  const btnBase: React.CSSProperties = {
    padding: '0.4rem 0.75rem', border: '1px solid #E2E8F0', borderRadius: '0.375rem',
    background: 'white', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 500,
    color: '#4A5568', transition: 'all 0.15s ease',
  };
  const activeBtnStyle: React.CSSProperties = {
    ...btnBase, background: '#006B3C', color: 'white', borderColor: '#006B3C',
  };
  const disabledBtnStyle: React.CSSProperties = {
    ...btnBase, opacity: 0.4, cursor: 'not-allowed',
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', padding: '1rem 0 0.5rem' }}>
      <span style={{ fontSize: '0.8rem', color: '#718096' }}>
        Showing {from}–{to} of {totalItems} tickets
      </span>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
        <button
          id="pagination-prev"
          style={currentPage === 1 ? disabledBtnStyle : btnBase}
          disabled={currentPage === 1}
          onClick={() => onPageChange(currentPage - 1)}
        >
          ← Previous
        </button>
        {visiblePages.map((p) => (
          <button
            key={p}
            id={`pagination-page-${p}`}
            style={p === currentPage ? activeBtnStyle : btnBase}
            onClick={() => onPageChange(p)}
          >
            {p}
          </button>
        ))}
        <button
          id="pagination-next"
          style={currentPage === totalPages ? disabledBtnStyle : btnBase}
          disabled={currentPage === totalPages}
          onClick={() => onPageChange(currentPage + 1)}
        >
          Next →
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function StaffTicketQueue() {
  const { user } = useAuth();

  // Filter state
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [requestedPriorityFilter, setRequestedPriorityFilter] = useState('');
  const [itPriorityFilter, setItPriorityFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Pagination state
  const [page, setPage] = useState(1);
  const limit = 10;

  // Data state
  const [tickets, setTickets] = useState<StaffTicket[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [viewState, setViewState] = useState<ViewState>('loading');
  const [errorMsg, setErrorMsg] = useState('');

  const hasActiveFilters =
    search !== '' || statusFilter !== '' || requestedPriorityFilter !== '' ||
    itPriorityFilter !== '' || categoryFilter !== '';

  // ---------------------------------------------------------------------------
  // Fetch
  // ---------------------------------------------------------------------------

  const fetchTickets = useCallback(async () => {
    setViewState('loading');
    setErrorMsg('');

    const params = new URLSearchParams();
    if (search.trim()) params.set('search', search.trim());
    if (statusFilter) params.set('status', statusFilter);
    if (requestedPriorityFilter) params.set('requestedPriority', requestedPriorityFilter);
    if (itPriorityFilter) params.set('itPriority', itPriorityFilter);
    if (categoryFilter.trim()) params.set('category', categoryFilter.trim());
    params.set('sortBy', sortBy);
    params.set('sortOrder', sortOrder);
    params.set('page', String(page));
    params.set('limit', String(limit));

    try {
      const res = await fetch(`/api/staff/tickets?${params.toString()}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setErrorMsg((body as any).message || `Request failed with status ${res.status}`);
        setViewState('error');
        return;
      }
      const data: StaffTicketsResponse = await res.json();
      setTickets(data.data);
      setPagination(data.pagination);

      if (data.pagination.totalItems === 0) {
        setViewState(hasActiveFilters ? 'no-results' : 'empty');
      } else {
        setViewState('loaded');
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unexpected error');
      setViewState('error');
    }
  }, [search, statusFilter, requestedPriorityFilter, itPriorityFilter, categoryFilter, sortBy, sortOrder, page, limit, hasActiveFilters]);

  useEffect(() => {
    if (user && (user.role === 'IT_STAFF' || user.role === 'ADMIN')) {
      fetchTickets();
    }
  }, [fetchTickets, user]);

  // ---------------------------------------------------------------------------
  // Access guard
  // ---------------------------------------------------------------------------

  if (!user || user.role === 'REQUESTER') {
    return (
      <div style={{ maxWidth: '520px', margin: '4rem auto', padding: '0 1rem' }}>
        <div style={{
          background: '#FFF5F5', border: '1px solid #FEB2B2', borderRadius: '0.75rem',
          padding: '2rem', textAlign: 'center',
        }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🚫</div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#C53030', marginBottom: '0.5rem' }}>
            Access Denied
          </h2>
          <p style={{ color: '#742A2A', fontSize: '0.9rem', margin: 0 }}>
            The IT Staff Queue is only accessible to IT Staff and Admin users.
          </p>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Event handlers
  // ---------------------------------------------------------------------------

  const handleClearFilters = () => {
    setSearch('');
    setStatusFilter('');
    setRequestedPriorityFilter('');
    setItPriorityFilter('');
    setCategoryFilter('');
    setPage(1);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setPage(1);
  };

  const handleFilterChange =
    (setter: React.Dispatch<React.SetStateAction<string>>) =>
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      setter(e.target.value);
      setPage(1);
    };

  // ---------------------------------------------------------------------------
  // Shared styles
  // ---------------------------------------------------------------------------

  const cardStyle: React.CSSProperties = {
    background: 'white', borderRadius: '0.75rem', boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
    border: '1px solid #E2E8F0', padding: '1.5rem', marginBottom: '1rem',
  };

  const inputStyle: React.CSSProperties = {
    padding: '0.5rem 0.75rem', border: '1px solid #E2E8F0', borderRadius: '0.5rem',
    fontSize: '0.875rem', color: '#1A202C', background: 'white',
    outline: 'none', transition: 'border-color 0.15s',
  };

  const selectStyle: React.CSSProperties = {
    ...inputStyle, cursor: 'pointer',
  };

  const thStyle: React.CSSProperties = {
    padding: '0.75rem 1rem', textAlign: 'left' as const, fontSize: '0.75rem',
    fontWeight: 600, color: '#4A5568', textTransform: 'uppercase' as const,
    letterSpacing: '0.05em', borderBottom: '2px solid #E2E8F0',
    background: '#F8FAFC', whiteSpace: 'nowrap' as const,
  };

  const tdStyle: React.CSSProperties = {
    padding: '0.875rem 1rem', fontSize: '0.875rem', color: '#1A202C',
    borderBottom: '1px solid #F1F5F9', verticalAlign: 'middle' as const,
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div id="staff-ticket-queue" style={{ maxWidth: '1200px', margin: '0 auto', padding: '1.5rem 1rem' }}>

      {/* ── Page Header ──────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1A202C', margin: '0 0 0.25rem' }}>
            IT Staff Ticket Queue
          </h1>
          <p style={{ fontSize: '0.875rem', color: '#4A5568', margin: 0 }}>
            Global view of all support tickets •{' '}
            <span style={{
              background: '#EAF6EF', color: '#006B3C', fontWeight: 600,
              fontSize: '0.75rem', padding: '0.1rem 0.5rem', borderRadius: '9999px',
            }}>
              {user.role === 'ADMIN' ? 'Admin' : 'IT Staff'}
            </span>
          </p>
        </div>
        {pagination && (
          <div style={{
            background: '#EAF6EF', color: '#006B3C', fontWeight: 600,
            fontSize: '0.875rem', padding: '0.4rem 1rem', borderRadius: '9999px',
          }}>
            {pagination.totalItems} ticket{pagination.totalItems !== 1 ? 's' : ''}
          </div>
        )}
      </div>

      {/* ── Filter Bar ───────────────────────────────────────────────────── */}
      <div style={{ ...cardStyle, padding: '1rem 1.25rem' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))',
          gap: '0.75rem',
          alignItems: 'end',
        }}>
          {/* Search — spans 2 columns */}
          <div style={{ gridColumn: 'span 2' }}>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#4A5568', marginBottom: '0.3rem' }}>
              Search
            </label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '0.65rem', top: '50%', transform: 'translateY(-50%)', color: '#A0AEC0', fontSize: '0.9rem' }}>
                🔍
              </span>
              <input
                id="queue-search"
                type="text"
                placeholder="Ticket # or summary…"
                value={search}
                onChange={handleSearchChange}
                style={{ ...inputStyle, width: '100%', paddingLeft: '2rem', boxSizing: 'border-box' }}
              />
            </div>
          </div>

          {/* Status */}
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#4A5568', marginBottom: '0.3rem' }}>
              Status
            </label>
            <select
              id="filter-status"
              value={statusFilter}
              onChange={handleFilterChange(setStatusFilter)}
              style={{ ...selectStyle, width: '100%' }}
            >
              <option value="">All Statuses</option>
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s === 'IN_PROGRESS' ? 'In Progress' : s.charAt(0) + s.slice(1).toLowerCase()}
                </option>
              ))}
            </select>
          </div>

          {/* Requested Priority */}
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#4A5568', marginBottom: '0.3rem' }}>
              Req. Priority
            </label>
            <select
              id="filter-requested-priority"
              value={requestedPriorityFilter}
              onChange={handleFilterChange(setRequestedPriorityFilter)}
              style={{ ...selectStyle, width: '100%' }}
            >
              <option value="">All Priorities</option>
              {PRIORITY_OPTIONS.map((p) => (
                <option key={p} value={p}>{p.charAt(0) + p.slice(1).toLowerCase()}</option>
              ))}
            </select>
          </div>

          {/* IT Priority */}
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#4A5568', marginBottom: '0.3rem' }}>
              IT Priority
            </label>
            <select
              id="filter-it-priority"
              value={itPriorityFilter}
              onChange={handleFilterChange(setItPriorityFilter)}
              style={{ ...selectStyle, width: '100%' }}
            >
              <option value="">All IT Priorities</option>
              {PRIORITY_OPTIONS.map((p) => (
                <option key={p} value={p}>{p.charAt(0) + p.slice(1).toLowerCase()}</option>
              ))}
            </select>
          </div>

          {/* Sort */}
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#4A5568', marginBottom: '0.3rem' }}>
              Sort By
            </label>
            <div style={{ display: 'flex', gap: '0.4rem' }}>
              <select
                id="sort-by"
                value={sortBy}
                onChange={(e) => { setSortBy(e.target.value); setPage(1); }}
                style={{ ...selectStyle, flex: 1 }}
              >
                {SORT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
              <button
                id="sort-order-toggle"
                title={sortOrder === 'desc' ? 'Descending' : 'Ascending'}
                onClick={() => { setSortOrder((o) => (o === 'desc' ? 'asc' : 'desc')); setPage(1); }}
                style={{
                  padding: '0.5rem 0.6rem', border: '1px solid #E2E8F0', borderRadius: '0.5rem',
                  background: 'white', cursor: 'pointer', fontSize: '0.85rem',
                }}
              >
                {sortOrder === 'desc' ? '↓' : '↑'}
              </button>
            </div>
          </div>

          {/* Clear Filters */}
          {hasActiveFilters && (
            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              <button
                id="clear-filters"
                onClick={handleClearFilters}
                style={{
                  padding: '0.5rem 1rem', border: '1px solid #E2E8F0', borderRadius: '0.5rem',
                  background: 'white', cursor: 'pointer', fontSize: '0.875rem', color: '#4A5568',
                  fontWeight: 500, width: '100%',
                }}
              >
                ✕ Clear Filters
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── View States ──────────────────────────────────────────────────── */}

      {viewState === 'loading' && <LoadingSpinner />}

      {viewState === 'error' && (
        <div style={{ ...cardStyle, borderColor: '#FEB2B2', background: '#FFF5F5', textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>⚠️</div>
          <h3 style={{ color: '#C53030', fontWeight: 700, marginBottom: '0.5rem' }}>Failed to load tickets</h3>
          <p style={{ color: '#742A2A', fontSize: '0.875rem', marginBottom: '1rem' }}>{errorMsg}</p>
          <button
            id="error-retry"
            onClick={fetchTickets}
            style={{
              padding: '0.5rem 1.25rem', background: '#006B3C', color: 'white', border: 'none',
              borderRadius: '0.5rem', cursor: 'pointer', fontWeight: 600, fontSize: '0.875rem',
            }}
          >
            Retry
          </button>
        </div>
      )}

      {viewState === 'empty' && (
        <div style={{ ...cardStyle, textAlign: 'center', padding: '4rem 2rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎉</div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1A202C', marginBottom: '0.5rem' }}>
            No tickets in the system yet
          </h3>
          <p style={{ color: '#4A5568', fontSize: '0.9rem' }}>
            New support requests from requesters will appear here.
          </p>
        </div>
      )}

      {viewState === 'no-results' && (
        <div style={{ ...cardStyle, textAlign: 'center', padding: '3rem 2rem' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🔍</div>
          <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#1A202C', marginBottom: '0.5rem' }}>
            No tickets match your current filters
          </h3>
          <p style={{ color: '#4A5568', fontSize: '0.875rem', marginBottom: '1.25rem' }}>
            Try adjusting the search or filter criteria.
          </p>
          <button
            id="no-results-clear"
            onClick={handleClearFilters}
            style={{
              padding: '0.5rem 1.25rem', background: '#006B3C', color: 'white', border: 'none',
              borderRadius: '0.5rem', cursor: 'pointer', fontWeight: 600, fontSize: '0.875rem',
            }}
          >
            Clear All Filters
          </button>
        </div>
      )}

      {viewState === 'loaded' && (
        <>
          {/* ── Desktop Table ─────────────────────────────────────────── */}
          <div id="queue-table-container" style={{ ...cardStyle, padding: 0, overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'auto' }}>
              <thead>
                <tr>
                  <th style={thStyle}>Ticket No.</th>
                  <th style={thStyle}>Created</th>
                  <th style={{ ...thStyle, minWidth: '200px' }}>Summary</th>
                  <th style={thStyle}>Category</th>
                  <th style={thStyle}>Req. Priority</th>
                  <th style={thStyle}>IT Priority</th>
                  <th style={thStyle}>Status</th>
                  <th style={thStyle}>Assigned To</th>
                </tr>
              </thead>
              <tbody>
                {tickets.map((ticket) => (
                  <tr
                    key={ticket.id}
                    style={{ transition: 'background 0.12s' }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = '#F7FAFC')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td style={tdStyle}>
                      <span style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: '#006B3C', fontWeight: 600 }}>
                        {ticket.ticketNumber}
                      </span>
                    </td>
                    <td style={{ ...tdStyle, whiteSpace: 'nowrap', color: '#718096', fontSize: '0.8rem' }}>
                      {new Date(ticket.createdAt).toLocaleDateString('en-GB', {
                        day: '2-digit', month: 'short', year: 'numeric',
                      })}
                    </td>
                    <td style={{ ...tdStyle, maxWidth: '280px' }}>
                      <div style={{ fontWeight: 500, color: '#1A202C', marginBottom: '0.15rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {ticket.summary}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#718096' }}>
                        {ticket.requesterUser?.name ?? '—'}
                      </div>
                    </td>
                    <td style={{ ...tdStyle, whiteSpace: 'nowrap', color: '#4A5568' }}>
                      {ticket.category?.name ?? '—'}
                    </td>
                    <td style={tdStyle}>
                      <PriorityBadge priority={ticket.requestedPriority} />
                    </td>
                    <td style={tdStyle}>
                      <PriorityBadge priority={ticket.itPriority} label="Not set" />
                    </td>
                    <td style={tdStyle}>
                      <StatusBadge status={ticket.currentStatus} />
                    </td>
                    <td style={{
                      ...tdStyle,
                      color: ticket.assignedTo ? '#1A202C' : '#A0AEC0',
                      fontStyle: ticket.assignedTo ? 'normal' : 'italic',
                      whiteSpace: 'nowrap',
                    }}>
                      {ticket.assignedTo?.name ?? 'Unassigned'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ── Mobile Cards ──────────────────────────────────────────── */}
          <div id="queue-cards-container" style={{ display: 'none' }}>
            {tickets.map((ticket) => (
              <div
                key={ticket.id}
                style={{
                  background: 'white', borderRadius: '0.75rem',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.08)', border: '1px solid #E2E8F0',
                  borderLeft: '4px solid #006B3C', padding: '1rem 1.25rem', marginBottom: '0.75rem',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                  <span style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: '#006B3C', fontWeight: 700 }}>
                    {ticket.ticketNumber}
                  </span>
                  <StatusBadge status={ticket.currentStatus} />
                </div>
                <div style={{ fontWeight: 600, color: '#1A202C', marginBottom: '0.35rem', fontSize: '0.9rem' }}>
                  {ticket.summary}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '0.75rem', color: '#718096' }}>
                    👤 {ticket.requesterUser?.name ?? '—'}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: '#718096' }}>
                    📁 {ticket.category?.name ?? '—'}
                  </span>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', alignItems: 'center' }}>
                  <PriorityBadge priority={ticket.requestedPriority} />
                  <PriorityBadge priority={ticket.itPriority} label="IT: Not set" />
                  <span style={{
                    fontSize: '0.75rem',
                    color: ticket.assignedTo ? '#4A5568' : '#A0AEC0',
                    fontStyle: ticket.assignedTo ? 'normal' : 'italic',
                  }}>
                    🔧 {ticket.assignedTo?.name ?? 'Unassigned'}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* ── Pagination ────────────────────────────────────────────── */}
          {pagination && (
            <PaginationControls
              pagination={pagination}
              onPageChange={(p) => setPage(p)}
            />
          )}

          {/* Responsive CSS: hide table on mobile, show cards */}
          <style>{`
            @media (max-width: 767px) {
              #queue-table-container { display: none !important; }
              #queue-cards-container { display: block !important; }
            }
          `}</style>
        </>
      )}
    </div>
  );
}
