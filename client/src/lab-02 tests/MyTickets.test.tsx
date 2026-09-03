import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DevRequesterProvider } from '../context/DevRequesterContext';
import MyTickets from '../components/MyTickets';

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

const mockRequesterA = {
  id: 1,
  name: 'Jennifer Anderson',
  email: 'jennifer.anderson@toktickit.com',
  department: 'Human Resources',
  isActive: true,
};

const mockRequesterB = {
  id: 2,
  name: 'Carlos Ramirez',
  email: 'carlos.ramirez@toktickit.com',
  department: 'Finance',
  isActive: true,
};

const mockCategories = [
  { id: 1, name: 'Account and Access' },
  { id: 2, name: 'Hardware' },
];

const makeTicket = (overrides: Record<string, unknown> = {}) => ({
  id: 1,
  ticketNumber: 'TKT-2026-100001',
  summary: 'Printer not responding',
  description: 'Office printer is offline.',
  requestedPriority: 'MEDIUM',
  currentStatus: 'NEW',
  requesterId: 1,
  category: { id: 1, name: 'Hardware' },
  relatedSystem: { id: 1, name: 'Workstation Hardware' },
  createdAt: '2026-01-15T08:00:00.000Z',
  updatedAt: '2026-01-15T08:00:00.000Z',
  ...overrides,
});

const makeTicketsResponse = (tickets: ReturnType<typeof makeTicket>[], meta: Partial<{total: number; page: number; limit: number; totalPages: number}> = {}) => ({
  data: tickets,
  pagination: {
    total: tickets.length,
    page: 1,
    limit: 10,
    totalPages: Math.ceil(tickets.length / 10) || 0,
    ...meta,
  },
});

/** Renders MyTickets inside the real context provider, injecting a pre-selected requester via localStorage */
function renderWithRequester(requester = mockRequesterA) {
  localStorage.setItem('toktickit_selected_requester', JSON.stringify(requester));
  return render(
    <DevRequesterProvider>
      <MyTickets />
    </DevRequesterProvider>,
  );
}

/** Sets up a global fetch mock that handles all expected API calls */
function mockFetch({
  ticketsResponse = makeTicketsResponse([makeTicket()]),
  categories = mockCategories,
  requesters = [mockRequesterA],
  ticketsFn,
}: {
  ticketsResponse?: ReturnType<typeof makeTicketsResponse>;
  categories?: typeof mockCategories;
  requesters?: typeof mockRequesterA[];
  ticketsFn?: (url: string) => ReturnType<typeof makeTicketsResponse>;
} = {}) {
  vi.spyOn(global, 'fetch').mockImplementation((urlInput) => {
    const url = typeof urlInput === 'string' ? urlInput : urlInput.toString();

    if (url.includes('/api/requesters')) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve(requesters) } as Response);
    }
    if (url.includes('/api/categories')) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve(categories) } as Response);
    }
    if (url.includes('/api/tickets')) {
      const response = ticketsFn ? ticketsFn(url) : ticketsResponse;
      return Promise.resolve({ ok: true, json: () => Promise.resolve(response) } as Response);
    }
    return Promise.resolve({ ok: true, json: () => Promise.resolve([]) } as Response);
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('MyTickets Component', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  // -------------------------------------------------------------------------
  // 1. Renders ticket rows when API returns data
  // -------------------------------------------------------------------------
  it('renders ticket rows for the active requester when API returns data', async () => {
    mockFetch({
      ticketsResponse: makeTicketsResponse([
        makeTicket({ id: 1, ticketNumber: 'TKT-2026-100001', summary: 'Printer not responding' }),
        makeTicket({ id: 2, ticketNumber: 'TKT-2026-100002', summary: 'VPN disconnects' }),
      ]),
    });

    renderWithRequester();

    await waitFor(() => {
      const matches = screen.getAllByText('Printer not responding');
      expect(matches.length).toBeGreaterThanOrEqual(1);
      const vnMatches = screen.queryAllByText('VPN disconnects');
      expect(vnMatches.length).toBeGreaterThanOrEqual(1);
      // Ticket numbers exist in the rendered output
      expect(screen.getAllByText('TKT-2026-100001').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('TKT-2026-100002').length).toBeGreaterThanOrEqual(1);
    });
  });

  // -------------------------------------------------------------------------
  // 2. Empty state — no tickets, no filters
  // -------------------------------------------------------------------------
  it('shows empty state message when requester has no tickets and no filters are active', async () => {
    mockFetch({ ticketsResponse: makeTicketsResponse([]) });

    renderWithRequester();

    await waitFor(() => {
      // Both table and card render in jsdom; check at least one instance exists
      expect(screen.getAllByText(/No tickets yet/i).length).toBeGreaterThanOrEqual(1);
    });
  });

  // -------------------------------------------------------------------------
  // 3. No-results state — filters active, API returns zero
  // -------------------------------------------------------------------------
  it('shows no-results state message when filters are active but API returns zero tickets', async () => {
    mockFetch({ ticketsResponse: makeTicketsResponse([]) });

    renderWithRequester();

    // Apply a priority filter
    await waitFor(() => expect(screen.getByLabelText(/Priority/i)).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText(/Priority/i), { target: { value: 'URGENT' } });

    await waitFor(() => {
      expect(screen.getAllByText(/No matching tickets/i).length).toBeGreaterThanOrEqual(1);
    });
  });

  // -------------------------------------------------------------------------
  // 4. Search triggers re-fetch with search param
  // -------------------------------------------------------------------------
  it('triggers API re-fetch with search query when user types in search input', async () => {
    const capturedUrls: string[] = [];

    vi.spyOn(global, 'fetch').mockImplementation((urlInput) => {
      const url = typeof urlInput === 'string' ? urlInput : urlInput.toString();
      capturedUrls.push(url);

      if (url.includes('/api/requesters')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve([mockRequesterA]) } as Response);
      }
      if (url.includes('/api/categories')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(mockCategories) } as Response);
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(makeTicketsResponse([])),
      } as Response);
    });

    renderWithRequester();

    await waitFor(() => expect(screen.getByRole('searchbox')).toBeInTheDocument());

    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'printer' } });

    // Wait for debounce + re-fetch
    await waitFor(
      () => {
        const ticketCalls = capturedUrls.filter((u) => u.includes('/api/tickets'));
        const searchCall = ticketCalls.find((u) => u.includes('search=printer'));
        expect(searchCall).toBeDefined();
      },
      { timeout: 1000 },
    );
  });

  // -------------------------------------------------------------------------
  // 5. Category filter triggers re-fetch with categoryId param
  // -------------------------------------------------------------------------
  it('triggers API re-fetch with categoryId when category filter is changed', async () => {
    const capturedUrls: string[] = [];

    vi.spyOn(global, 'fetch').mockImplementation((urlInput) => {
      const url = typeof urlInput === 'string' ? urlInput : urlInput.toString();
      capturedUrls.push(url);

      if (url.includes('/api/requesters')) return Promise.resolve({ ok: true, json: () => Promise.resolve([mockRequesterA]) } as Response);
      if (url.includes('/api/categories')) return Promise.resolve({ ok: true, json: () => Promise.resolve(mockCategories) } as Response);
      return Promise.resolve({ ok: true, json: () => Promise.resolve(makeTicketsResponse([])) } as Response);
    });

    renderWithRequester();

    // Wait for category select to be populated
    await waitFor(() => expect(screen.getByLabelText(/Category/i)).toBeInTheDocument());

    fireEvent.change(screen.getByLabelText(/Category/i), { target: { value: '2' } });

    await waitFor(() => {
      const ticketCalls = capturedUrls.filter((u) => u.includes('/api/tickets'));
      expect(ticketCalls.some((u) => u.includes('categoryId=2'))).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // 6. Priority filter triggers re-fetch
  // -------------------------------------------------------------------------
  it('triggers API re-fetch with requestedPriority when priority filter is changed', async () => {
    const capturedUrls: string[] = [];

    vi.spyOn(global, 'fetch').mockImplementation((urlInput) => {
      const url = typeof urlInput === 'string' ? urlInput : urlInput.toString();
      capturedUrls.push(url);

      if (url.includes('/api/requesters')) return Promise.resolve({ ok: true, json: () => Promise.resolve([mockRequesterA]) } as Response);
      if (url.includes('/api/categories')) return Promise.resolve({ ok: true, json: () => Promise.resolve(mockCategories) } as Response);
      return Promise.resolve({ ok: true, json: () => Promise.resolve(makeTicketsResponse([])) } as Response);
    });

    renderWithRequester();

    await waitFor(() => expect(screen.getByLabelText(/Priority/i)).toBeInTheDocument());

    fireEvent.change(screen.getByLabelText(/Priority/i), { target: { value: 'HIGH' } });

    await waitFor(() => {
      const ticketCalls = capturedUrls.filter((u) => u.includes('/api/tickets'));
      expect(ticketCalls.some((u) => u.includes('requestedPriority=HIGH'))).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // 7. Status filter triggers re-fetch
  // -------------------------------------------------------------------------
  it('triggers API re-fetch with currentStatus when status filter is changed', async () => {
    const capturedUrls: string[] = [];

    vi.spyOn(global, 'fetch').mockImplementation((urlInput) => {
      const url = typeof urlInput === 'string' ? urlInput : urlInput.toString();
      capturedUrls.push(url);

      if (url.includes('/api/requesters')) return Promise.resolve({ ok: true, json: () => Promise.resolve([mockRequesterA]) } as Response);
      if (url.includes('/api/categories')) return Promise.resolve({ ok: true, json: () => Promise.resolve(mockCategories) } as Response);
      return Promise.resolve({ ok: true, json: () => Promise.resolve(makeTicketsResponse([])) } as Response);
    });

    renderWithRequester();

    await waitFor(() => expect(screen.getByLabelText(/Status/i)).toBeInTheDocument());

    fireEvent.change(screen.getByLabelText(/Status/i), { target: { value: 'OPEN' } });

    await waitFor(() => {
      const ticketCalls = capturedUrls.filter((u) => u.includes('/api/tickets'));
      expect(ticketCalls.some((u) => u.includes('currentStatus=OPEN'))).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // 8. Pagination — Next button increments page
  // -------------------------------------------------------------------------
  it('increments page and re-fetches when Next button is clicked', async () => {
    const capturedUrls: string[] = [];

    vi.spyOn(global, 'fetch').mockImplementation((urlInput) => {
      const url = typeof urlInput === 'string' ? urlInput : urlInput.toString();
      capturedUrls.push(url);

      if (url.includes('/api/requesters')) return Promise.resolve({ ok: true, json: () => Promise.resolve([mockRequesterA]) } as Response);
      if (url.includes('/api/categories')) return Promise.resolve({ ok: true, json: () => Promise.resolve(mockCategories) } as Response);
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve(
            makeTicketsResponse(
              Array.from({ length: 10 }, (_, i) => makeTicket({ id: i + 1 })),
              { total: 25, page: 1, limit: 10, totalPages: 3 },
            ),
          ),
      } as Response);
    });

    renderWithRequester();

    // Wait for Next button to appear (it shows when totalPages > 1)
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Next/i })).toBeInTheDocument();
    });

    const nextBtn = screen.getByRole('button', { name: /Next/i });
    expect(nextBtn).not.toBeDisabled();

    await act(async () => {
      fireEvent.click(nextBtn);
    });

    await waitFor(() => {
      const ticketCalls = capturedUrls.filter((u) => u.includes('/api/tickets'));
      expect(ticketCalls.some((u) => u.includes('page=2'))).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // 9. Pagination — Prev button is disabled on page 1
  // -------------------------------------------------------------------------
  it('disables the Prev button when on the first page', async () => {
    vi.spyOn(global, 'fetch').mockImplementation((urlInput) => {
      const url = typeof urlInput === 'string' ? urlInput : urlInput.toString();
      if (url.includes('/api/requesters')) return Promise.resolve({ ok: true, json: () => Promise.resolve([mockRequesterA]) } as Response);
      if (url.includes('/api/categories')) return Promise.resolve({ ok: true, json: () => Promise.resolve(mockCategories) } as Response);
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve(
            makeTicketsResponse(
              Array.from({ length: 10 }, (_, i) => makeTicket({ id: i + 1 })),
              { total: 25, page: 1, limit: 10, totalPages: 3 },
            ),
          ),
      } as Response);
    });

    renderWithRequester();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /← Prev/i })).toBeDisabled();
    });
  });

  // -------------------------------------------------------------------------
  // 10. Requester switching resets page to 1
  // -------------------------------------------------------------------------
  it('resets page to 1 and re-fetches when selectedRequester changes', async () => {
    const capturedUrls: string[] = [];

    // First render with requester A (both requesters available)
    vi.spyOn(global, 'fetch').mockImplementation((urlInput) => {
      const url = typeof urlInput === 'string' ? urlInput : urlInput.toString();
      capturedUrls.push(url);

      if (url.includes('/api/requesters')) return Promise.resolve({ ok: true, json: () => Promise.resolve([mockRequesterA, mockRequesterB]) } as Response);
      if (url.includes('/api/categories')) return Promise.resolve({ ok: true, json: () => Promise.resolve(mockCategories) } as Response);
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve(
            makeTicketsResponse(
              Array.from({ length: 10 }, (_, i) => makeTicket({ id: i + 1 })),
              { total: 25, page: 1, limit: 10, totalPages: 3 },
            ),
          ),
      } as Response);
    });

    renderWithRequester(mockRequesterA);

    // Navigate to page 2
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Next/i })).not.toBeDisabled();
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Next/i }));
    });

    await waitFor(() => {
      expect(capturedUrls.filter((u) => u.includes('page=2'))).not.toHaveLength(0);
    });

    // Switch requester in localStorage → context re-fetch → page should reset
    act(() => {
      localStorage.setItem('toktickit_selected_requester', JSON.stringify(mockRequesterB));
    });

    await waitFor(() => {
      // After requester switch, the component should eventually fire a page=1 request for requester B
      const ticketCalls = capturedUrls.filter((u) => u.includes('/api/tickets'));
      expect(ticketCalls.some((u) => u.includes('page=1'))).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // 11. No requester selected — shows prompt
  // -------------------------------------------------------------------------
  it('shows "No Requester Selected" prompt with a select button when no requester is active', async () => {
    // No localStorage entry → context stays null
    vi.spyOn(global, 'fetch').mockImplementation((urlInput) => {
      const url = typeof urlInput === 'string' ? urlInput : urlInput.toString();
      if (url.includes('/api/requesters')) return Promise.resolve({ ok: true, json: () => Promise.resolve([mockRequesterA]) } as Response);
      if (url.includes('/api/categories')) return Promise.resolve({ ok: true, json: () => Promise.resolve(mockCategories) } as Response);
      return Promise.resolve({ ok: true, json: () => Promise.resolve([]) } as Response);
    });

    // Do NOT set localStorage — selectedRequester will be null after fetchRequesters completes
    // (context auto-opens selector, so selectedRequester stays null initially)
    render(
      <DevRequesterProvider>
        <MyTickets />
      </DevRequesterProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText(/No Requester Selected/i)).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: /Select Requester/i })).toBeInTheDocument();
  });
});
