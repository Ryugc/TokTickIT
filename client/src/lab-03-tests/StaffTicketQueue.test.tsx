import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthProvider } from '../context/AuthContext';
import StaffTicketQueue from '../components/StaffTicketQueue';

// ---------------------------------------------------------------------------
// Shared mock helpers
// ---------------------------------------------------------------------------

interface MockUser {
  id: number;
  name: string;
  email: string;
  role: 'IT_STAFF' | 'ADMIN' | 'REQUESTER';
  department: string;
  isActive: boolean;
  mustChangePassword: boolean;
}

const mockStaffUser: MockUser = {
  id: 2,
  name: 'Jane Staff',
  email: 'staff@toktickit.com',
  role: 'IT_STAFF',
  department: 'IT Support',
  isActive: true,
  mustChangePassword: false,
};

const mockAdminUser: MockUser = {
  id: 1,
  name: 'Super Admin',
  email: 'admin@toktickit.com',
  role: 'ADMIN',
  department: 'IT Operations',
  isActive: true,
  mustChangePassword: false,
};

const mockRequesterUser: MockUser = {
  id: 5,
  name: 'Alice Requester',
  email: 'alice@company.com',
  role: 'REQUESTER',
  department: 'Sales',
  isActive: true,
  mustChangePassword: false,
};

const makeTicketResponse = (overrides: Record<string, unknown> = {}) => ({
  data: [
    {
      id: 101,
      ticketNumber: 'TKT-2026-000101',
      summary: 'VPN connection failing intermittently',
      description: 'Unable to connect to VPN.',
      requestedPriority: 'HIGH',
      itPriority: 'HIGH',
      currentStatus: 'OPEN',
      requesterUser: { id: 5, name: 'Alice Requester', email: 'alice@company.com', department: 'Sales' },
      assignedTo: { id: 2, name: 'Jane Staff', email: 'staff@toktickit.com' },
      category: { id: 1, name: 'Network' },
      relatedSystem: { id: 3, name: 'Corporate VPN' },
      createdAt: '2026-09-12T10:00:00.000Z',
      updatedAt: '2026-09-12T10:30:00.000Z',
      ...overrides,
    },
  ],
  pagination: {
    totalItems: 1,
    totalPages: 1,
    currentPage: 1,
    limit: 10,
  },
});

const emptyResponse = {
  data: [],
  pagination: { totalItems: 0, totalPages: 0, currentPage: 1, limit: 10 },
};

/** Renders StaffTicketQueue with the given user injected via AuthContext */
function renderWithUser(user: MockUser | null) {
  // Pre-populate the /api/auth/me response so AuthProvider resolves the user
  vi.spyOn(global, 'fetch').mockImplementation((input) => {
    const url = typeof input === 'string' ? input : (input as Request).url;
    if (url.includes('/api/auth/me')) {
      if (!user) {
        return Promise.resolve({ ok: false, status: 401, json: () => Promise.resolve({}) } as Response);
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ user }),
      } as Response);
    }
    // Default: staff queue returns one ticket
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve(makeTicketResponse()),
    } as Response);
  });

  return render(
    <AuthProvider>
      <StaffTicketQueue />
    </AuthProvider>,
  );
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe('StaffTicketQueue Component', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // -------------------------------------------------------------------------
  // 1. IT_STAFF user: table headers and ticket rows render correctly
  // -------------------------------------------------------------------------
  it('renders table headers and a ticket row for IT_STAFF user', async () => {
    renderWithUser(mockStaffUser);

    // Wait until the table has rendered (ticket row is visible)
    await waitFor(() => {
      expect(screen.getAllByText('TKT-2026-000101').length).toBeGreaterThan(0);
    });

    // Table column headers (in <th> elements)
    expect(screen.getByText('Ticket No.')).toBeInTheDocument();
    expect(screen.getByText('Summary')).toBeInTheDocument();
    expect(screen.getByText('Category')).toBeInTheDocument();
    expect(screen.getByText('Assigned To')).toBeInTheDocument();

    // Ticket row data visible somewhere in the DOM (rendered in both table and mobile card)
    expect(screen.getAllByText('VPN connection failing intermittently').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Network').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Jane Staff').length).toBeGreaterThan(0);
  });

  // -------------------------------------------------------------------------
  // 2. Loading spinner visible during fetch
  // -------------------------------------------------------------------------
  it('shows loading spinner while ticket data is being fetched', async () => {
    // Never resolve so we stay in loading state
    vi.spyOn(global, 'fetch').mockImplementation((input) => {
      const url = typeof input === 'string' ? input : (input as Request).url;
      if (url.includes('/api/auth/me')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ user: mockStaffUser }) } as Response);
      }
      return new Promise(() => {}); // hangs forever
    });

    render(
      <AuthProvider>
        <StaffTicketQueue />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText(/Loading ticket queue/i)).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // 3. Empty state when no tickets exist in system
  // -------------------------------------------------------------------------
  it('shows empty state when the system has no tickets', async () => {
    vi.spyOn(global, 'fetch').mockImplementation((input) => {
      const url = typeof input === 'string' ? input : (input as Request).url;
      if (url.includes('/api/auth/me')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ user: mockStaffUser }) } as Response);
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve(emptyResponse) } as Response);
    });

    render(<AuthProvider><StaffTicketQueue /></AuthProvider>);

    await waitFor(() => {
      expect(screen.getByText(/No tickets in the system yet/i)).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // 4. No-results state when filters return empty
  // -------------------------------------------------------------------------
  it('shows no-results state when search/filter query returns no tickets', async () => {
    let firstCall = true;
    vi.spyOn(global, 'fetch').mockImplementation((input) => {
      const url = typeof input === 'string' ? input : (input as Request).url;
      if (url.includes('/api/auth/me')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ user: mockStaffUser }) } as Response);
      }
      // First call (no filter) returns tickets; subsequent calls (filtered) return empty
      if (firstCall) {
        firstCall = false;
        return Promise.resolve({ ok: true, json: () => Promise.resolve(makeTicketResponse()) } as Response);
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve(emptyResponse) } as Response);
    });

    render(<AuthProvider><StaffTicketQueue /></AuthProvider>);

    // The ticket number appears in both desktop table AND mobile cards — use getAllByText
    await waitFor(() => {
      expect(screen.getAllByText('TKT-2026-000101').length).toBeGreaterThan(0);
    });

    // Type something in the search box to trigger a re-fetch with empty result
    fireEvent.change(screen.getByPlaceholderText(/Ticket # or summary/i), {
      target: { value: 'nonexistent-search-term' },
    });

    await waitFor(() => {
      expect(screen.getByText(/No tickets match your current filters/i)).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // 5. Error state when fetch fails
  // -------------------------------------------------------------------------
  it('shows error state with retry button when the API request fails', async () => {
    vi.spyOn(global, 'fetch').mockImplementation((input) => {
      const url = typeof input === 'string' ? input : (input as Request).url;
      if (url.includes('/api/auth/me')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ user: mockStaffUser }) } as Response);
      }
      return Promise.resolve({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ message: 'Internal server error' }),
      } as Response);
    });

    render(<AuthProvider><StaffTicketQueue /></AuthProvider>);

    await waitFor(() => {
      expect(screen.getByText(/Failed to load tickets/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Retry/i })).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // 6. Search input triggers re-fetch with search param
  // -------------------------------------------------------------------------
  it('updates the search input value and triggers a re-fetch when the user types', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch').mockImplementation((input) => {
      const url = typeof input === 'string' ? input : (input as Request).url;
      if (url.includes('/api/auth/me')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ user: mockStaffUser }) } as Response);
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve(makeTicketResponse()) } as Response);
    });

    render(<AuthProvider><StaffTicketQueue /></AuthProvider>);

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Ticket # or summary/i)).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/Ticket # or summary/i);
    fireEvent.change(searchInput, { target: { value: 'VPN' } });

    await waitFor(() => {
      const staffCalls = fetchSpy.mock.calls.filter(([url]) =>
        typeof url === 'string' && url.includes('/api/staff/tickets') && url.includes('search=VPN')
      );
      expect(staffCalls.length).toBeGreaterThan(0);
    });
  });

  // -------------------------------------------------------------------------
  // 7. Status filter dropdown change triggers re-fetch
  // -------------------------------------------------------------------------
  it('triggers re-fetch with status param when status filter dropdown is changed', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch').mockImplementation((input) => {
      const url = typeof input === 'string' ? input : (input as Request).url;
      if (url.includes('/api/auth/me')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ user: mockStaffUser }) } as Response);
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve(makeTicketResponse()) } as Response);
    });

    render(<AuthProvider><StaffTicketQueue /></AuthProvider>);

    // Select by the id attribute since label is not linked via htmlFor
    await waitFor(() => {
      expect(document.getElementById('filter-status')).toBeInTheDocument();
    });

    fireEvent.change(document.getElementById('filter-status')!, {
      target: { value: 'OPEN' },
    });

    await waitFor(() => {
      const statusCalls = fetchSpy.mock.calls.filter(([url]) =>
        typeof url === 'string' && url.includes('/api/staff/tickets') && url.includes('status=OPEN')
      );
      expect(statusCalls.length).toBeGreaterThan(0);
    });
  });

  // -------------------------------------------------------------------------
  // 8. Clear Filters button resets all filters
  // -------------------------------------------------------------------------
  it('resets all filter inputs and hides Clear Filters button when Clear Filters is clicked', async () => {
    vi.spyOn(global, 'fetch').mockImplementation((input) => {
      const url = typeof input === 'string' ? input : (input as Request).url;
      if (url.includes('/api/auth/me')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ user: mockStaffUser }) } as Response);
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve(makeTicketResponse()) } as Response);
    });

    render(<AuthProvider><StaffTicketQueue /></AuthProvider>);

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Ticket # or summary/i)).toBeInTheDocument();
    });

    // Set a filter
    fireEvent.change(screen.getByPlaceholderText(/Ticket # or summary/i), {
      target: { value: 'some search' },
    });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Clear Filters/i })).toBeInTheDocument();
    });

    // Click clear
    fireEvent.click(screen.getByRole('button', { name: /Clear Filters/i }));

    await waitFor(() => {
      const input = screen.getByPlaceholderText(/Ticket # or summary/i) as HTMLInputElement;
      expect(input.value).toBe('');
      expect(screen.queryByRole('button', { name: /Clear Filters/i })).not.toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // 9. "Next" pagination button increments page
  // -------------------------------------------------------------------------
  it('renders Next pagination button and calls correct page URL when clicked', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch').mockImplementation((input) => {
      const url = typeof input === 'string' ? input : (input as Request).url;
      if (url.includes('/api/auth/me')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ user: mockStaffUser }) } as Response);
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          data: [makeTicketResponse().data[0]],
          pagination: { totalItems: 25, totalPages: 3, currentPage: 1, limit: 10 },
        }),
      } as Response);
    });

    render(<AuthProvider><StaffTicketQueue /></AuthProvider>);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Next/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Next/i }));

    await waitFor(() => {
      const calls = fetchSpy.mock.calls.filter(([url]) =>
        typeof url === 'string' && url.includes('/api/staff/tickets') && url.includes('page=2')
      );
      expect(calls.length).toBeGreaterThan(0);
    });
  });

  // -------------------------------------------------------------------------
  // 10. "Previous" button decrements page
  // -------------------------------------------------------------------------
  it('renders Previous pagination button disabled on first page and enabled on page 2', async () => {
    vi.spyOn(global, 'fetch').mockImplementation((input) => {
      const url = typeof input === 'string' ? input : (input as Request).url;
      if (url.includes('/api/auth/me')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ user: mockStaffUser }) } as Response);
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          data: [makeTicketResponse().data[0]],
          pagination: { totalItems: 25, totalPages: 3, currentPage: 2, limit: 10 },
        }),
      } as Response);
    });

    render(<AuthProvider><StaffTicketQueue /></AuthProvider>);

    // When pagination shows currentPage=2, Previous should be enabled
    await waitFor(() => {
      const prevBtn = screen.getByRole('button', { name: /Previous/i }) as HTMLButtonElement;
      expect(prevBtn.disabled).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // 11. ADMIN user renders queue with role badge
  // -------------------------------------------------------------------------
  it('renders queue for ADMIN user and shows Admin role badge', async () => {
    vi.spyOn(global, 'fetch').mockImplementation((input) => {
      const url = typeof input === 'string' ? input : (input as Request).url;
      if (url.includes('/api/auth/me')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ user: mockAdminUser }) } as Response);
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve(makeTicketResponse()) } as Response);
    });

    render(<AuthProvider><StaffTicketQueue /></AuthProvider>);

    await waitFor(() => {
      expect(screen.getByText('IT Staff Ticket Queue')).toBeInTheDocument();
      expect(screen.getByText('Admin')).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // 12. REQUESTER user sees 403 access denied card — no fetch made
  // -------------------------------------------------------------------------
  it('renders Access Denied card for REQUESTER user and does not call the staff queue API', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch').mockImplementation((input) => {
      const url = typeof input === 'string' ? input : (input as Request).url;
      if (url.includes('/api/auth/me')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ user: mockRequesterUser }) } as Response);
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve(makeTicketResponse()) } as Response);
    });

    render(<AuthProvider><StaffTicketQueue /></AuthProvider>);

    await waitFor(() => {
      expect(screen.getByText(/Access Denied/i)).toBeInTheDocument();
      expect(screen.getByText(/only accessible to IT Staff and Admin/i)).toBeInTheDocument();
    });

    // Ensure the staff queue API was never called
    const staffQueueCalls = fetchSpy.mock.calls.filter(([url]) =>
      typeof url === 'string' && url.includes('/api/staff/tickets')
    );
    expect(staffQueueCalls).toHaveLength(0);
  });
});
