import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
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

const ticketDetailResponse = {
  id: 101,
  ticketNumber: 'TKT-2026-000101',
  summary: 'VPN connection failing intermittently',
  description: 'Unable to connect to internal network via VPN.',
  requestedPriority: 'HIGH',
  itPriority: 'HIGH',
  currentStatus: 'OPEN',
  requesterId: 5,
  requesterUser: { id: 5, name: 'Alice Requester', email: 'alice@company.com', department: 'Sales' },
  assignedTo: { id: 2, name: 'Jane Staff', email: 'staff@toktickit.com' },
  category: { id: 1, name: 'Network' },
  relatedSystem: { id: 3, name: 'Corporate VPN' },
  attachments: [],
  comments: [],
  internalNotes: [{ id: 1, content: 'Investigating VPN profile', author: { id: 2, name: 'Jane Staff', role: 'IT_STAFF' }, createdAt: '2026-09-12T10:25:00.000Z' }],
  createdAt: '2026-09-12T10:00:00.000Z',
  updatedAt: '2026-09-12T10:30:00.000Z',
};

describe('TicketDetail operations UI', () => {
  it('renders staff controls and responds to status updates for IT staff', async () => {
    vi.spyOn(global, 'fetch').mockImplementation((input) => {
      const url = typeof input === 'string' ? input : (input as Request).url;
      if (url.includes('/api/tickets/101')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(ticketDetailResponse),
        } as Response);
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) } as Response);
    });

    render(
      <AuthContext.Provider value={{
        user: mockStaffUser,
        setUser: vi.fn(),
        loading: false,
        error: null,
        login: vi.fn(),
        logout: vi.fn(),
        changePassword: vi.fn(),
        checkAuth: vi.fn(),
      }}>
        <TicketDetail ticketId={101} onBack={vi.fn()} />
      </AuthContext.Provider>,
    );

    await waitFor(() => expect(screen.getByText('VPN connection failing intermittently')).toBeInTheDocument());

    expect(screen.getByLabelText(/ticket status/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/it priority/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /assign to me/i })).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/ticket status/i), { target: { value: 'IN_PROGRESS' } });
    expect((screen.getByLabelText(/ticket status/i) as HTMLSelectElement).value).toBe('IN_PROGRESS');
  });

  it('hides internal notes controls for requesters', async () => {
    vi.spyOn(global, 'fetch').mockImplementation((input) => {
      const url = typeof input === 'string' ? input : (input as Request).url;
      if (url.includes('/api/tickets/101')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ ...ticketDetailResponse, internalNotes: [] }),
        } as Response);
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) } as Response);
    });

    render(
      <AuthContext.Provider value={{
        user: mockRequesterUser,
        setUser: vi.fn(),
        loading: false,
        error: null,
        login: vi.fn(),
        logout: vi.fn(),
        changePassword: vi.fn(),
        checkAuth: vi.fn(),
      }}>
        <TicketDetail ticketId={101} onBack={vi.fn()} />
      </AuthContext.Provider>,
    );

    await waitFor(() => expect(screen.getByText('VPN connection failing intermittently')).toBeInTheDocument());
    expect(screen.queryByText(/internal notes/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /add internal note/i })).not.toBeInTheDocument();
  });
});
