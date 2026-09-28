import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import StaffDashboard from '../components/StaffDashboard';
import RequesterDashboard from '../components/RequesterDashboard';
import Dashboard from '../pages/Dashboard';
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

const mockAdminUser = {
  id: 1,
  name: 'Admin User',
  email: 'admin@toktickit.com',
  role: 'ADMIN' as const,
  department: 'IT Administration',
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

const mockStaffDashboardData = {
  unassignedCount: 5,
  myAssignedCount: 3,
  newCount: 4,
  openCount: 6,
  inProgressCount: 2,
  waitingForRequesterCount: 1,
  recentTickets: [
    {
      id: 101,
      ticketNumber: 'TCK-LAB4-001',
      summary: 'Printer network offline',
      currentStatus: 'IN_PROGRESS',
      requestedPriority: 'HIGH',
      itPriority: 'HIGH',
      updatedAt: '2026-09-28T10:00:00.000Z',
      requesterUser: { id: 5, name: 'Alice Requester', email: 'alice@company.com' },
      assignedTo: { id: 2, name: 'Jane Staff', email: 'staff@toktickit.com' },
      category: { id: 1, name: 'Hardware' },
      relatedSystem: { id: 1, name: 'Printer' },
    },
  ],
};

const mockRequesterDashboardData = {
  openCount: 2,
  inProgressCount: 1,
  resolvedCount: 3,
  closedCount: 5,
  recentTickets: [
    {
      id: 102,
      ticketNumber: 'TCK-LAB4-002',
      summary: 'Laptop display flickering',
      currentStatus: 'OPEN',
      requestedPriority: 'MEDIUM',
      updatedAt: '2026-09-28T11:00:00.000Z',
      category: { id: 1, name: 'Hardware' },
      relatedSystem: { id: 2, name: 'Laptop' },
    },
  ],
};

describe('Role-Tailored Dashboards Component Suite', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('Staff Operational Dashboard', () => {
    it('fetches /api/dashboard/staff and renders key metrics accurately', async () => {
      vi.spyOn(global, 'fetch').mockImplementation((input) => {
        const url = typeof input === 'string' ? input : (input as Request).url;
        if (url.includes('/api/dashboard/staff')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockStaffDashboardData),
          } as Response);
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) } as Response);
      });

      render(<StaffDashboard />);

      await waitFor(() => {
        expect(screen.getByText('IT Staff Operational Dashboard')).toBeInTheDocument();
      });

      expect(screen.getByTestId('metric-unassignedCount')).toHaveTextContent('5');
      expect(screen.getByTestId('metric-myAssignedCount')).toHaveTextContent('3');
      expect(screen.getByTestId('metric-newCount')).toHaveTextContent('4');
      expect(screen.getByTestId('metric-openCount')).toHaveTextContent('6');
      expect(screen.getByTestId('metric-inProgressCount')).toHaveTextContent('2');
      expect(screen.getByTestId('metric-waitingForRequesterCount')).toHaveTextContent('1');
    });

    it('renders Recent Operational Activity table with priority, status badges, and triggers detail action', async () => {
      const selectTicketSpy = vi.fn();

      vi.spyOn(global, 'fetch').mockImplementation((input) => {
        const url = typeof input === 'string' ? input : (input as Request).url;
        if (url.includes('/api/dashboard/staff')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockStaffDashboardData),
          } as Response);
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) } as Response);
      });

      render(<StaffDashboard onSelectTicket={selectTicketSpy} />);

      await waitFor(() => {
        expect(screen.getByText('TCK-LAB4-001')).toBeInTheDocument();
      });

      expect(screen.getByText('Printer network offline')).toBeInTheDocument();
      expect(screen.getByText('High')).toBeInTheDocument();
      expect(screen.getAllByText('In Progress').length).toBeGreaterThan(0);

      const viewButton = screen.getByRole('button', { name: /view/i });
      fireEvent.click(viewButton);

      expect(selectTicketSpy).toHaveBeenCalledWith(101);
    });
  });

  describe('Requester Personal Dashboard', () => {
    it('fetches /api/dashboard/requester and renders personal metrics accurately', async () => {
      vi.spyOn(global, 'fetch').mockImplementation((input) => {
        const url = typeof input === 'string' ? input : (input as Request).url;
        if (url.includes('/api/dashboard/requester')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockRequesterDashboardData),
          } as Response);
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) } as Response);
      });

      render(<RequesterDashboard />);

      await waitFor(() => {
        expect(screen.getByText('My Personal Dashboard')).toBeInTheDocument();
      });

      expect(screen.getByTestId('metric-openCount')).toHaveTextContent('2');
      expect(screen.getByTestId('metric-inProgressCount')).toHaveTextContent('1');
      expect(screen.getByTestId('metric-resolvedCount')).toHaveTextContent('3');
      expect(screen.getByTestId('metric-closedCount')).toHaveTextContent('5');
    });

    it('renders My Recent Tickets table with status badge and quick view action', async () => {
      const selectTicketSpy = vi.fn();

      vi.spyOn(global, 'fetch').mockImplementation((input) => {
        const url = typeof input === 'string' ? input : (input as Request).url;
        if (url.includes('/api/dashboard/requester')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockRequesterDashboardData),
          } as Response);
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) } as Response);
      });

      render(<RequesterDashboard onSelectTicket={selectTicketSpy} />);

      await waitFor(() => {
        expect(screen.getByText('TCK-LAB4-002')).toBeInTheDocument();
      });

      expect(screen.getByText('Laptop display flickering')).toBeInTheDocument();
      expect(screen.getByText('Open')).toBeInTheDocument();

      const viewButton = screen.getByRole('button', { name: /view/i });
      fireEvent.click(viewButton);

      expect(selectTicketSpy).toHaveBeenCalledWith(102);
    });
  });

  describe('Dashboard Page Role Routing', () => {
    it('renders StaffDashboard for IT_STAFF role', async () => {
      vi.spyOn(global, 'fetch').mockImplementation((input) => {
        const url = typeof input === 'string' ? input : (input as Request).url;
        if (url.includes('/api/dashboard/staff')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockStaffDashboardData),
          } as Response);
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
          <Dashboard />
        </AuthContext.Provider>
      );

      await waitFor(() => {
        expect(screen.getByText('IT Staff Operational Dashboard')).toBeInTheDocument();
      });
    });

    it('renders StaffDashboard for ADMIN role', async () => {
      vi.spyOn(global, 'fetch').mockImplementation((input) => {
        const url = typeof input === 'string' ? input : (input as Request).url;
        if (url.includes('/api/dashboard/staff')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockStaffDashboardData),
          } as Response);
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) } as Response);
      });

      render(
        <AuthContext.Provider
          value={{
            user: mockAdminUser,
            setUser: vi.fn(),
            loading: false,
            error: null,
            login: vi.fn(),
            logout: vi.fn(),
            changePassword: vi.fn(),
            checkAuth: vi.fn(),
          }}
        >
          <Dashboard />
        </AuthContext.Provider>
      );

      await waitFor(() => {
        expect(screen.getByText('IT Staff Operational Dashboard')).toBeInTheDocument();
      });
    });

    it('renders RequesterDashboard for REQUESTER role', async () => {
      vi.spyOn(global, 'fetch').mockImplementation((input) => {
        const url = typeof input === 'string' ? input : (input as Request).url;
        if (url.includes('/api/dashboard/requester')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockRequesterDashboardData),
          } as Response);
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
          <Dashboard />
        </AuthContext.Provider>
      );

      await waitFor(() => {
        expect(screen.getByText('My Personal Dashboard')).toBeInTheDocument();
      });
    });
  });
});
