import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ActionsTakenSection from '../components/ActionsTakenSection';
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

const mockActionsList = [
  {
    id: 'c1f7a0b3-401d-4f1d-92a1-123456789abc',
    ticketId: 101,
    performedById: 2,
    description: 'Replaced faulty Ethernet cable on Workstation 4.',
    result: 'Network connectivity restored to 1Gbps full duplex.',
    followUpRequired: true,
    followUpNote: 'Verify patch panel port labeling tomorrow morning.',
    attachmentNotes: 'Photo of replaced cable attached.',
    actionDate: '2026-09-24T10:00:00.000Z',
    createdAt: '2026-09-24T10:00:00.000Z',
    updatedAt: '2026-09-24T10:00:00.000Z',
    performedBy: {
      id: 2,
      name: 'Jane Staff',
      email: 'staff@toktickit.com',
      role: 'IT_STAFF',
    },
  },
];

describe('ActionsTakenSection Component', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders existing Actions Taken entries with full detail for IT Staff', async () => {
    vi.spyOn(global, 'fetch').mockImplementation((input) => {
      const url = typeof input === 'string' ? input : (input as Request).url;
      if (url.includes('/api/tickets/101/actions')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockActionsList),
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
        <ActionsTakenSection ticketId={101} />
      </AuthContext.Provider>
    );

    await waitFor(() => {
      expect(screen.getByText('Replaced faulty Ethernet cable on Workstation 4.')).toBeInTheDocument();
    });

    expect(screen.getByText('Network connectivity restored to 1Gbps full duplex.')).toBeInTheDocument();
    expect(screen.getByText('Jane Staff')).toBeInTheDocument();
    expect(screen.getByText(/Verify patch panel port labeling tomorrow morning/)).toBeInTheDocument();
    expect(screen.getByText(/Photo of replaced cable attached/)).toBeInTheDocument();

    // Verify Staff Form is visible
    expect(screen.getByRole('button', { name: /log action taken/i })).toBeInTheDocument();
  });

  it('allows IT Staff to submit a valid Action Taken form', async () => {
    const postSpy = vi.fn();

    vi.spyOn(global, 'fetch').mockImplementation((input, init) => {
      const url = typeof input === 'string' ? input : (input as Request).url;
      const method = init?.method || 'GET';

      if (url.includes('/api/tickets/101/actions')) {
        if (method === 'POST') {
          postSpy(JSON.parse((init?.body as string) || '{}'));
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                id: 'new-action-uuid',
                ticketId: 101,
                performedById: 2,
                description: 'Upgraded RAM to 32GB',
                result: 'System booted cleanly',
                followUpRequired: false,
                followUpNote: null,
                attachmentNotes: null,
                actionDate: new Date().toISOString(),
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                performedBy: mockStaffUser,
              }),
          } as Response);
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockActionsList),
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
        <ActionsTakenSection ticketId={101} />
      </AuthContext.Provider>
    );

    await waitFor(() => {
      expect(screen.getByText('Replaced faulty Ethernet cable on Workstation 4.')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText(/description/i), {
      target: { value: 'Upgraded RAM to 32GB' },
    });
    fireEvent.change(screen.getByLabelText(/result/i), {
      target: { value: 'System booted cleanly' },
    });

    fireEvent.click(screen.getByRole('button', { name: /log action taken/i }));

    await waitFor(() => {
      expect(postSpy).toHaveBeenCalledWith({
        description: 'Upgraded RAM to 32GB',
        result: 'System booted cleanly',
        followUpRequired: false,
        followUpNote: null,
        attachmentNotes: null,
      });
    });
  });

  it('enforces conditional validation when Follow-Up Required is checked', async () => {
    const postSpy = vi.fn();

    vi.spyOn(global, 'fetch').mockImplementation((input, init) => {
      const url = typeof input === 'string' ? input : (input as Request).url;
      if (url.includes('/api/tickets/101/actions')) {
        if (init?.method === 'POST') {
          postSpy();
          return Promise.resolve({ ok: true, json: () => Promise.resolve({}) } as Response);
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve([]) } as Response);
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
        <ActionsTakenSection ticketId={101} />
      </AuthContext.Provider>
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /log action taken/i })).toBeInTheDocument();
    });

    // Fill description and result
    fireEvent.change(screen.getByLabelText(/description/i), {
      target: { value: 'Inspected power supply' },
    });
    fireEvent.change(screen.getByLabelText(/result/i), {
      target: { value: 'Volts stable' },
    });

    // Check Follow-Up Required
    const checkbox = screen.getByLabelText(/follow-up required\?/i);
    fireEvent.click(checkbox);

    // Follow-up note input should now appear
    expect(screen.getByLabelText(/follow-up note/i)).toBeInTheDocument();

    // Attempt submit without follow-up note
    fireEvent.click(screen.getByRole('button', { name: /log action taken/i }));

    // Expect validation error and NO POST request made
    await waitFor(() => {
      expect(screen.getByText(/follow-up note is required when follow-up is checked/i)).toBeInTheDocument();
    });
    expect(postSpy).not.toHaveBeenCalled();

    // Fill in follow-up note and re-submit
    fireEvent.change(screen.getByLabelText(/follow-up note/i), {
      target: { value: 'Re-check PSU temperatures after 24 hrs' },
    });
    fireEvent.click(screen.getByRole('button', { name: /log action taken/i }));

    await waitFor(() => {
      expect(postSpy).toHaveBeenCalled();
    });
  });

  it('renders read-only mode for Requesters (hides creation form)', async () => {
    vi.spyOn(global, 'fetch').mockImplementation((input) => {
      const url = typeof input === 'string' ? input : (input as Request).url;
      if (url.includes('/api/tickets/101/actions')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockActionsList),
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
        <ActionsTakenSection ticketId={101} />
      </AuthContext.Provider>
    );

    // Existing actions should be visible
    await waitFor(() => {
      expect(screen.getByText('Replaced faulty Ethernet cable on Workstation 4.')).toBeInTheDocument();
    });

    // Form inputs & submit controls should be hidden for REQUESTER
    expect(screen.queryByRole('form', { name: /log action form/i })).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/description/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /log action taken/i })).not.toBeInTheDocument();
  });
});
