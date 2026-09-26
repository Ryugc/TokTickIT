import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import TicketDetail from '../components/TicketDetail';
import { AuthContext } from '../context/AuthContext';

const mockStaffUser = {
  id: 2,
  name: 'Jane Staff',
  email: 'staff@toktickit.com',
  role: 'IT_STAFF' as const,
  department: 'IT Support',
  isActive: true,
  mustChangePassword: false,
};

const mockRequesterUser = {
  id: 5,
  name: 'Alice Requester',
  email: 'alice@company.com',
  role: 'REQUESTER' as const,
  department: 'Sales',
  isActive: true,
  mustChangePassword: false,
};

const mockOpenTicket = {
  id: 101,
  ticketNumber: 'TKT-2026-000101',
  summary: 'Flickering monitor output',
  description: 'Screen turns black intermittently.',
  requestedPriority: 'MEDIUM',
  itPriority: 'MEDIUM',
  currentStatus: 'OPEN',
  requesterId: 5,
  requesterUser: { id: 5, name: 'Alice Requester', email: 'alice@company.com', department: 'Sales' },
  assignedTo: { id: 2, name: 'Jane Staff', email: 'staff@toktickit.com' },
  category: { id: 1, name: 'Hardware' },
  relatedSystem: { id: 1, name: 'Workstation Display' },
  attachments: [],
  comments: [],
  internalNotes: [],
  createdAt: '2026-09-24T10:00:00.000Z',
  updatedAt: '2026-09-24T10:00:00.000Z',
};

const mockResolvedTicket = {
  ...mockOpenTicket,
  id: 102,
  ticketNumber: 'TKT-2026-000102',
  currentStatus: 'RESOLVED',
};

describe('Extended Ticket Workflow & Resolution Gate UI', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders expanded status options in staff status dropdown', async () => {
    vi.spyOn(global, 'fetch').mockImplementation((input) => {
      const url = typeof input === 'string' ? input : (input as Request).url;
      if (url.includes('/api/tickets/101/actions')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve([]) } as Response);
      }
      if (url.includes('/api/tickets/101')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(mockOpenTicket) } as Response);
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) } as Response);
    });

    render(
      <AuthContext.Provider
        value={{
          user: mockStaffUser,
          setUser: vi.fn(),
          loading: false,
          error: null,
          login: vi.fn(),
          logout: vi.fn(),
          changePassword: vi.fn(),
          checkAuth: vi.fn(),
        }}
      >
        <TicketDetail ticketId={101} onBack={vi.fn()} />
      </AuthContext.Provider>
    );

    await waitFor(() => {
      expect(screen.getByText('Flickering monitor output')).toBeInTheDocument();
    });

    const statusSelect = screen.getByLabelText(/ticket status/i) as HTMLSelectElement;
    expect(statusSelect).toBeInTheDocument();

    const options = Array.from(statusSelect.options).map((opt) => opt.value);
    expect(options).toContain('WAITING_FOR_REQUESTER');
    expect(options).toContain('REOPENED');
    expect(options).toContain('CANCELLED');
  });

  it('displays Resolution Gate error message when staff resolves ticket with 0 Action Taken entries', async () => {
    vi.spyOn(global, 'fetch').mockImplementation((input, init) => {
      const url = typeof input === 'string' ? input : (input as Request).url;
      if (url.includes('/api/tickets/101/actions')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve([]) } as Response);
      }
      if (url.includes('/api/tickets/101/status')) {
        return Promise.resolve({
          ok: false,
          status: 400,
          json: () =>
            Promise.resolve({
              error: 'ACTION_TAKEN_REQUIRED',
              message: 'At least one Action Taken entry is required before resolving or closing a ticket.',
            }),
        } as Response);
      }
      if (url.includes('/api/tickets/101')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(mockOpenTicket) } as Response);
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) } as Response);
    });

    render(
      <AuthContext.Provider
        value={{
          user: mockStaffUser,
          setUser: vi.fn(),
          loading: false,
          error: null,
          login: vi.fn(),
          logout: vi.fn(),
          changePassword: vi.fn(),
          checkAuth: vi.fn(),
        }}
      >
        <TicketDetail ticketId={101} onBack={vi.fn()} />
      </AuthContext.Provider>
    );

    await waitFor(() => {
      expect(screen.getByText('Flickering monitor output')).toBeInTheDocument();
    });

    const statusSelect = screen.getByLabelText(/ticket status/i);
    fireEvent.change(statusSelect, { target: { value: 'RESOLVED' } });

    await waitFor(() => {
      expect(
        screen.getByText(/At least one Action Taken entry is required before resolving or closing a ticket/i)
      ).toBeInTheDocument();
    });
  });

  it('allows Requester to cancel their open ticket', async () => {
    const patchSpy = vi.fn();

    vi.spyOn(global, 'fetch').mockImplementation((input, init) => {
      const url = typeof input === 'string' ? input : (input as Request).url;
      const method = init?.method || 'GET';

      if (url.includes('/api/tickets/101/actions')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve([]) } as Response);
      }
      if (url.includes('/api/tickets/101/status') && method === 'PATCH') {
        patchSpy(JSON.parse((init?.body as string) || '{}'));
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ ...mockOpenTicket, currentStatus: 'CANCELLED' }),
        } as Response);
      }
      if (url.includes('/api/tickets/101')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(mockOpenTicket) } as Response);
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) } as Response);
    });

    render(
      <AuthContext.Provider
        value={{
          user: mockRequesterUser,
          setUser: vi.fn(),
          loading: false,
          error: null,
          login: vi.fn(),
          logout: vi.fn(),
          changePassword: vi.fn(),
          checkAuth: vi.fn(),
        }}
      >
        <TicketDetail ticketId={101} onBack={vi.fn()} />
      </AuthContext.Provider>
    );

    await waitFor(() => {
      expect(screen.getByText('Flickering monitor output')).toBeInTheDocument();
    });

    const cancelButton = screen.getByRole('button', { name: /cancel ticket/i });
    expect(cancelButton).toBeInTheDocument();

    fireEvent.click(cancelButton);

    await waitFor(() => {
      expect(patchSpy).toHaveBeenCalledWith({ status: 'CANCELLED' });
      expect(screen.getByText(/Status: Cancelled/i)).toBeInTheDocument();
    });
  });

  it('allows Requester to reopen their resolved ticket', async () => {
    const patchSpy = vi.fn();

    vi.spyOn(global, 'fetch').mockImplementation((input, init) => {
      const url = typeof input === 'string' ? input : (input as Request).url;
      const method = init?.method || 'GET';

      if (url.includes('/api/tickets/102/actions')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve([]) } as Response);
      }
      if (url.includes('/api/tickets/102/status') && method === 'PATCH') {
        patchSpy(JSON.parse((init?.body as string) || '{}'));
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ ...mockResolvedTicket, currentStatus: 'REOPENED' }),
        } as Response);
      }
      if (url.includes('/api/tickets/102')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(mockResolvedTicket) } as Response);
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) } as Response);
    });

    render(
      <AuthContext.Provider
        value={{
          user: mockRequesterUser,
          setUser: vi.fn(),
          loading: false,
          error: null,
          login: vi.fn(),
          logout: vi.fn(),
          changePassword: vi.fn(),
          checkAuth: vi.fn(),
        }}
      >
        <TicketDetail ticketId={102} onBack={vi.fn()} />
      </AuthContext.Provider>
    );

    await waitFor(() => {
      expect(screen.getByText('Flickering monitor output')).toBeInTheDocument();
    });

    const reopenButton = screen.getByRole('button', { name: /reopen ticket/i });
    expect(reopenButton).toBeInTheDocument();

    fireEvent.click(reopenButton);

    await waitFor(() => {
      expect(patchSpy).toHaveBeenCalledWith({ status: 'REOPENED' });
      expect(screen.getByText(/Status: Reopened/i)).toBeInTheDocument();
    });
  });
});
