import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useDevRequester } from '../context/DevRequesterContext';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Category {
  id: number;
  name: string;
}

interface RelatedSystem {
  id: number;
  name: string;
}

interface Ticket {
  id: number;
  ticketNumber: string;
  summary: string;
  description: string;
  requestedPriority: string;
  currentStatus: string;
  requesterId: number;
  category: Category;
  relatedSystem: RelatedSystem;
  createdAt: string;
  updatedAt: string;
}

interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface TicketsResponse {
  data: Ticket[];
  pagination: PaginationMeta;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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
    return new Date(iso).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

const Badge: React.FC<{ label: string; style: React.CSSProperties }> = ({ label, style }) => (
  <span
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      padding: '0.2rem 0.6rem',
      borderRadius: '9999px',
      fontSize: '0.78rem',
      fontWeight: 600,
      letterSpacing: '0.02em',
      whiteSpace: 'nowrap',
      ...style,
    }}
  >
    {label}
  </span>
);

const SkeletonRow: React.FC = () => (
  <tr>
    {[180, 260, 100, 90, 90, 90].map((w, i) => (
      <td key={i} style={{ padding: '0.875rem 1rem' }}>
        <div
          style={{
            height: '0.875rem',
            width: `${w}px`,
            maxWidth: '100%',
            borderRadius: '0.375rem',
            backgroundColor: '#E5E7EB',
            animation: 'shimmer 1.5s infinite linear',
          }}
        />
      </td>
    ))}
  </tr>
);

const SkeletonCard: React.FC = () => (
  <div
    style={{
      backgroundColor: 'var(--surface-card)',
      border: '1px solid var(--border-color)',
      borderRadius: '0.625rem',
      padding: '1rem',
      marginBottom: '0.75rem',
    }}
  >
    {[80, 200, 120].map((w, i) => (
      <div
        key={i}
        style={{
          height: '0.8rem',
          width: `${w}px`,
          maxWidth: '100%',
          borderRadius: '0.25rem',
          backgroundColor: '#E5E7EB',
          marginBottom: '0.625rem',
          animation: 'shimmer 1.5s infinite linear',
        }}
      />
    ))}
  </div>
);

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export const MyTickets: React.FC = () => {
  const { selectedRequester, setIsSelectorOpen } = useDevRequester();

  // Filter/sort state
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Pagination state
  const [page, setPage] = useState(1);
  const LIMIT = 10;

  // Data state
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  // Reference data
  const [categories, setCategories] = useState<Category[]>([]);

  // Mobile detection via JS (CSS media queries don't work in jsdom)
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth < 768 : false,
  );
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Track whether any filter/search is active (for empty vs no-results state)
  const hasActiveFilters =
    search.trim() !== '' ||
    filterCategory !== '' ||
    filterPriority !== '' ||
    filterStatus !== '';

  // Debounce search input
  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fetch reference categories once
  useEffect(() => {
    fetch(getApiUrl('/api/categories'))
      .then((r) => r.json())
      .then((data: Category[]) => setCategories(data))
      .catch(() => {});
  }, []);

  // Main data fetch
  const fetchTickets = useCallback(async () => {
    if (!selectedRequester) return;

    setLoading(true);
    setApiError(null);

    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set('search', search.trim());
      if (filterCategory) params.set('categoryId', filterCategory);
      if (filterPriority) params.set('requestedPriority', filterPriority);
      if (filterStatus) params.set('currentStatus', filterStatus);
      params.set('sortBy', sortBy);
      params.set('sortOrder', sortOrder);
      params.set('page', String(page));
      params.set('limit', String(LIMIT));

      const res = await fetch(getApiUrl(`/api/tickets?${params.toString()}`), {
        headers: { 'X-Requester-Id': String(selectedRequester.id) },
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to load tickets');
      }

      const body = await res.json();
      // Guard: API must return { data, pagination } shape
      if (body && Array.isArray(body.data) && body.pagination) {
        setTickets(body.data);
        setPagination(body.pagination as PaginationMeta);
      } else {
        // Silently ignore malformed responses (e.g. from legacy mocks)
        setTickets([]);
        setPagination({ total: 0, page: 1, limit: LIMIT, totalPages: 0 });
      }
    } catch (err) {
      setApiError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [selectedRequester, search, filterCategory, filterPriority, filterStatus, sortBy, sortOrder, page]);

  // Re-fetch whenever dependencies change
  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  // Reset to page 1 whenever requester or filters change (not pagination itself)
  useEffect(() => {
    setPage(1);
  }, [selectedRequester?.id, search, filterCategory, filterPriority, filterStatus, sortBy, sortOrder]);

  // Debounced search handler
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (searchDebounce.current) clearTimeout(searchDebounce.current);
    searchDebounce.current = setTimeout(() => setSearch(val), 350);
    // Update input value display immediately
    setSearchInput(val);
  };
  const [searchInput, setSearchInput] = useState('');

  // Guard: no requester selected
  if (!selectedRequester) {
    return (
      <div
        className="zen-card"
        style={{ maxWidth: '860px', margin: '2rem auto', textAlign: 'center', padding: '3rem 2rem' }}
      >
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎫</div>
        <h2 style={{ color: 'var(--primary-green)', fontWeight: 700, marginBottom: '0.5rem' }}>
          No Requester Selected
        </h2>
        <p style={{ color: '#6B7280', marginBottom: '1.5rem' }}>
          Please select a Development Requester to view your tickets.
        </p>
        <button
          id="my-tickets-select-requester-btn"
          className="btn-zen-primary"
          onClick={() => setIsSelectorOpen(true)}
          style={{ padding: '0.75rem 2rem' }}
        >
          Select Requester
        </button>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <>
      {/* Keyframe animation injected once */}
      <style>{`
        @keyframes shimmer {
          0%   { opacity: 1; }
          50%  { opacity: 0.4; }
          100% { opacity: 1; }
        }
        @media (max-width: 767px) {
          .my-tickets-table-wrap { display: none !important; }
          .my-tickets-cards-wrap  { display: block !important; }
        }
        @media (min-width: 768px) {
          .my-tickets-table-wrap { display: block !important; }
          .my-tickets-cards-wrap  { display: none !important; }
        }
      `}</style>

      <div style={{ maxWidth: '1100px', margin: '2rem auto 0' }}>
        {/* ------------------------------------------------------------------ */}
        {/* Header                                                              */}
        {/* ------------------------------------------------------------------ */}
        <div
          className="zen-card"
          style={{ marginBottom: '1.25rem', padding: '1.25rem 1.5rem 1rem' }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '0.75rem',
              marginBottom: '1.25rem',
            }}
          >
            <div>
              <h2
                style={{
                  fontSize: '1.375rem',
                  fontWeight: 700,
                  color: 'var(--primary-green)',
                  margin: 0,
                }}
              >
                📋 My Tickets
              </h2>
              <p style={{ color: '#6B7280', fontSize: '0.875rem', marginTop: '0.2rem' }}>
                Viewing as&nbsp;
                <strong style={{ color: 'var(--dark-text)' }}>{selectedRequester.name}</strong>
                &nbsp;·&nbsp;{selectedRequester.department}
              </p>
            </div>
            {!loading && pagination !== null && (
              <span
                style={{
                  backgroundColor: 'var(--pale-green)',
                  color: 'var(--primary-green)',
                  fontWeight: 700,
                  borderRadius: '9999px',
                  padding: '0.25rem 0.875rem',
                  fontSize: '0.875rem',
                }}
              >
                {pagination.total} ticket{pagination.total !== 1 ? 's' : ''}
              </span>
            )}
          </div>

          {/* ---------------------------------------------------------------- */}
          {/* Filter Bar                                                       */}
          {/* ---------------------------------------------------------------- */}
          <div
            id="my-tickets-filters"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
              gap: '0.75rem',
              alignItems: 'end',
            }}
          >
            {/* Search */}
            <div style={{ gridColumn: 'span 2', minWidth: 0 }}>
              <label
                htmlFor="my-tickets-search"
                style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.35rem', color: 'var(--dark-text)' }}
              >
                Search
              </label>
              <input
                id="my-tickets-search"
                type="search"
                className="form-input"
                placeholder="Ticket # or summary…"
                value={searchInput}
                onChange={handleSearchChange}
                style={{ fontSize: '0.9rem', padding: '0.5rem 0.75rem' }}
              />
            </div>

            {/* Category */}
            <div>
              <label
                htmlFor="my-tickets-filter-category"
                style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.35rem', color: 'var(--dark-text)' }}
              >
                Category
              </label>
              <select
                id="my-tickets-filter-category"
                className="form-select"
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                style={{ fontSize: '0.9rem', padding: '0.5rem 0.75rem' }}
              >
                <option value="">All Categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            {/* Priority */}
            <div>
              <label
                htmlFor="my-tickets-filter-priority"
                style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.35rem', color: 'var(--dark-text)' }}
              >
                Priority
              </label>
              <select
                id="my-tickets-filter-priority"
                className="form-select"
                value={filterPriority}
                onChange={(e) => setFilterPriority(e.target.value)}
                style={{ fontSize: '0.9rem', padding: '0.5rem 0.75rem' }}
              >
                <option value="">All Priorities</option>
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
            </div>

            {/* Status */}
            <div>
              <label
                htmlFor="my-tickets-filter-status"
                style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.35rem', color: 'var(--dark-text)' }}
              >
                Status
              </label>
              <select
                id="my-tickets-filter-status"
                className="form-select"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                style={{ fontSize: '0.9rem', padding: '0.5rem 0.75rem' }}
              >
                <option value="">All Statuses</option>
                <option value="NEW">New</option>
                <option value="OPEN">Open</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="RESOLVED">Resolved</option>
                <option value="CLOSED">Closed</option>
              </select>
            </div>

            {/* Sort */}
            <div>
              <label
                htmlFor="my-tickets-sort-by"
                style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.35rem', color: 'var(--dark-text)' }}
              >
                Sort By
              </label>
              <select
                id="my-tickets-sort-by"
                className="form-select"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                style={{ fontSize: '0.9rem', padding: '0.5rem 0.75rem' }}
              >
                <option value="createdAt">Date Created</option>
                <option value="updatedAt">Last Updated</option>
                <option value="requestedPriority">Priority</option>
                <option value="currentStatus">Status</option>
              </select>
            </div>

            {/* Sort Order */}
            <div>
              <label
                htmlFor="my-tickets-sort-order"
                style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.35rem', color: 'var(--dark-text)' }}
              >
                Order
              </label>
              <select
                id="my-tickets-sort-order"
                className="form-select"
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}
                style={{ fontSize: '0.9rem', padding: '0.5rem 0.75rem' }}
              >
                <option value="desc">Newest First</option>
                <option value="asc">Oldest First</option>
              </select>
            </div>

            {/* Clear button */}
            {hasActiveFilters && (
              <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                <button
                  id="my-tickets-clear-filters-btn"
                  onClick={() => {
                    setSearch('');
                    setSearchInput('');
                    setFilterCategory('');
                    setFilterPriority('');
                    setFilterStatus('');
                    setPage(1);
                  }}
                  style={{
                    backgroundColor: 'transparent',
                    color: '#DC2626',
                    border: '1px solid #FCA5A5',
                    borderRadius: '0.375rem',
                    padding: '0.5rem 0.75rem',
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    transition: 'background 0.15s',
                    width: '100%',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#FEF2F2')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  ✕ Clear Filters
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ------------------------------------------------------------------ */}
        {/* Error Banner                                                        */}
        {/* ------------------------------------------------------------------ */}
        {apiError && (
          <div
            style={{
              backgroundColor: '#FEE2E2',
              border: '1px solid #FCA5A5',
              color: '#991B1B',
              padding: '0.875rem 1rem',
              borderRadius: '0.5rem',
              marginBottom: '1rem',
              fontSize: '0.9rem',
            }}
          >
            ⚠️ {apiError}
          </div>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* Desktop Table                                                       */}
        {/* ------------------------------------------------------------------ */}
        <div className="my-tickets-table-wrap zen-card" style={{ padding: 0, overflow: 'hidden', display: isMobile ? 'none' : 'block' }}>
          <table
            id="my-tickets-table"
            style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}
          >
            <thead>
              <tr
                style={{
                  backgroundColor: 'var(--pale-green)',
                  borderBottom: '2px solid #B8E2CD',
                }}
              >
                {['Ticket #', 'Summary', 'Category', 'Priority', 'Status', 'Created'].map((col) => (
                  <th
                    key={col}
                    style={{
                      padding: '0.875rem 1rem',
                      textAlign: 'left',
                      fontWeight: 700,
                      fontSize: '0.8125rem',
                      color: 'var(--primary-green)',
                      letterSpacing: '0.03em',
                      textTransform: 'uppercase',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading
                ? Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
                : tickets.length === 0
                ? (
                  <tr>
                    <td colSpan={6}>
                      <EmptyState hasFilters={hasActiveFilters} />
                    </td>
                  </tr>
                )
                : tickets.map((ticket, idx) => (
                  <tr
                    key={ticket.id}
                    id={`ticket-row-${ticket.id}`}
                    style={{
                      backgroundColor: idx % 2 === 0 ? '#FFFFFF' : '#FAFAFA',
                      borderBottom: '1px solid var(--border-color)',
                      transition: 'background-color 0.15s',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--pale-green)')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = idx % 2 === 0 ? '#FFFFFF' : '#FAFAFA')}
                  >
                    <td style={{ padding: '0.875rem 1rem', whiteSpace: 'nowrap' }}>
                      <span style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--primary-green)', fontSize: '0.85rem' }}>
                        {ticket.ticketNumber}
                      </span>
                    </td>
                    <td style={{ padding: '0.875rem 1rem', maxWidth: '300px' }}>
                      <span style={{ fontWeight: 500, color: 'var(--dark-text)', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {ticket.summary}
                      </span>
                    </td>
                    <td style={{ padding: '0.875rem 1rem', whiteSpace: 'nowrap', color: '#6B7280' }}>
                      {ticket.category?.name ?? '—'}
                    </td>
                    <td style={{ padding: '0.875rem 1rem' }}>
                      <Badge
                        label={PRIORITY_LABELS[ticket.requestedPriority] ?? ticket.requestedPriority}
                        style={PRIORITY_COLORS[ticket.requestedPriority] ?? {}}
                      />
                    </td>
                    <td style={{ padding: '0.875rem 1rem' }}>
                      <Badge
                        label={STATUS_LABELS[ticket.currentStatus] ?? ticket.currentStatus}
                        style={STATUS_COLORS[ticket.currentStatus] ?? {}}
                      />
                    </td>
                    <td style={{ padding: '0.875rem 1rem', whiteSpace: 'nowrap', color: '#6B7280', fontSize: '0.85rem' }}>
                      {formatDate(ticket.createdAt)}
                    </td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>

        {/* ------------------------------------------------------------------ */}
        {/* Mobile Cards                                                        */}
        {/* ------------------------------------------------------------------ */}
        <div className="my-tickets-cards-wrap" style={{ display: isMobile ? 'block' : 'none' }}>
          {loading
            ? Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
            : tickets.length === 0
            ? <EmptyState hasFilters={hasActiveFilters} />
            : tickets.map((ticket) => (
              <div
                key={ticket.id}
                id={`ticket-card-${ticket.id}`}
                style={{
                  backgroundColor: 'var(--surface-card)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '0.625rem',
                  padding: '1rem 1.125rem',
                  marginBottom: '0.75rem',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                  <span style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--primary-green)', fontSize: '0.82rem' }}>
                    {ticket.ticketNumber}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>{formatDate(ticket.createdAt)}</span>
                </div>
                <p style={{ fontWeight: 600, color: 'var(--dark-text)', marginBottom: '0.625rem', lineHeight: 1.35 }}>
                  {ticket.summary}
                </p>
                <div style={{ fontSize: '0.8rem', color: '#6B7280', marginBottom: '0.625rem' }}>
                  {ticket.category?.name ?? '—'}
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <Badge
                    label={PRIORITY_LABELS[ticket.requestedPriority] ?? ticket.requestedPriority}
                    style={PRIORITY_COLORS[ticket.requestedPriority] ?? {}}
                  />
                  <Badge
                    label={STATUS_LABELS[ticket.currentStatus] ?? ticket.currentStatus}
                    style={STATUS_COLORS[ticket.currentStatus] ?? {}}
                  />
                </div>
              </div>
            ))
          }
        </div>

        {/* ------------------------------------------------------------------ */}
        {/* Pagination                                                          */}
        {/* ------------------------------------------------------------------ */}
        {!loading && pagination !== null && pagination.totalPages > 1 && (
          <div
            id="my-tickets-pagination"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              marginTop: '1.5rem',
              flexWrap: 'wrap',
            }}
          >
            <button
              id="my-tickets-prev-btn"
              className="btn-zen-primary"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}
            >
              ← Prev
            </button>

            {/* Page number buttons (up to 7 shown) */}
            {buildPageRange(page, pagination.totalPages).map((p, idx) =>
              p === '...' ? (
                <span key={`ellipsis-${idx}`} style={{ padding: '0 0.25rem', color: '#6B7280' }}>
                  …
                </span>
              ) : (
                <button
                  key={p}
                  id={`my-tickets-page-btn-${p}`}
                  onClick={() => setPage(Number(p))}
                  style={{
                    padding: '0.5rem 0.875rem',
                    borderRadius: '0.375rem',
                    border: '1px solid',
                    fontSize: '0.875rem',
                    fontWeight: page === Number(p) ? 700 : 500,
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                    backgroundColor: page === Number(p) ? 'var(--primary-green)' : 'var(--surface-card)',
                    borderColor: page === Number(p) ? 'var(--primary-green)' : 'var(--border-color)',
                    color: page === Number(p) ? '#fff' : 'var(--dark-text)',
                  }}
                >
                  {p}
                </button>
              ),
            )}

            <button
              id="my-tickets-next-btn"
              className="btn-zen-primary"
              onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
              disabled={page >= pagination.totalPages}
              style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}
            >
              Next →
            </button>

            <span style={{ fontSize: '0.8rem', color: '#6B7280', marginLeft: '0.5rem' }}>
              Page {page} of {pagination?.totalPages ?? 0}
            </span>
          </div>
        )}
      </div>
    </>
  );
};

// ---------------------------------------------------------------------------
// Empty / No-results state
// ---------------------------------------------------------------------------
const EmptyState: React.FC<{ hasFilters: boolean }> = ({ hasFilters }) => (
  <div
    id={hasFilters ? 'my-tickets-no-results' : 'my-tickets-empty'}
    style={{ textAlign: 'center', padding: '3rem 1.5rem' }}
  >
    <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>{hasFilters ? '🔍' : '🎫'}</div>
    <h3 style={{ fontWeight: 700, color: 'var(--dark-text)', marginBottom: '0.5rem' }}>
      {hasFilters ? 'No matching tickets' : 'No tickets yet'}
    </h3>
    <p style={{ color: '#6B7280', fontSize: '0.9rem' }}>
      {hasFilters
        ? 'Try adjusting your search or filters to find what you\'re looking for.'
        : 'You haven\'t submitted any support tickets yet. Use the form above to get started.'}
    </p>
  </div>
);

// ---------------------------------------------------------------------------
// Pagination range helper
// ---------------------------------------------------------------------------
function buildPageRange(current: number, total: number): (number | '...')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  const pages: (number | '...')[] = [];

  if (current <= 4) {
    pages.push(1, 2, 3, 4, 5, '...', total);
  } else if (current >= total - 3) {
    pages.push(1, '...', total - 4, total - 3, total - 2, total - 1, total);
  } else {
    pages.push(1, '...', current - 1, current, current + 1, '...', total);
  }

  return pages;
}

export default MyTickets;
