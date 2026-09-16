import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider } from '../context/AuthContext';
import UserManagement from '../components/UserManagement';

const admin = { id: 1, name: 'Super Admin', email: 'admin@toktickit.com', role: 'ADMIN' as const, department: 'IT Operations', isActive: true, mustChangePassword: false };
const requester = { ...admin, id: 2, role: 'REQUESTER' as const, email: 'requester@company.com' };
const users = [{ ...admin }, { id: 3, name: 'Jane Staff', email: 'staff@company.com', role: 'IT_STAFF' as const, department: 'IT Support', isActive: true, mustChangePassword: false }];

function renderWithUser(user: typeof admin | typeof requester) {
  vi.spyOn(global, 'fetch').mockImplementation((input, options) => {
    const url = String(input);
    if (url.includes('/api/auth/me')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ user }) } as Response);
    if (options?.method === 'POST') return Promise.resolve({ ok: true, json: () => Promise.resolve({ ...users[0], id: 4, name: 'Created User' }) } as Response);
    return Promise.resolve({ ok: true, json: () => Promise.resolve({ data: users, pagination: { totalItems: 2, totalPages: 1, currentPage: 1, limit: 50 } }) } as Response);
  });
  return render(<AuthProvider><UserManagement /></AuthProvider>);
}

describe('UserManagement', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('renders the admin directory and filters by search and role', async () => {
    renderWithUser(admin);
    await waitFor(() => expect(screen.getByText('Jane Staff')).toBeInTheDocument());
    expect(screen.getByText('User Management')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Search users'), { target: { value: 'Jane' } });
    fireEvent.change(screen.getByLabelText('Filter by role'), { target: { value: 'IT_STAFF' } });
    await waitFor(() => expect(vi.mocked(global.fetch).mock.calls.some(([url]) => String(url).includes('search=Jane') && String(url).includes('role=IT_STAFF'))).toBe(true));
  });

  it('submits the create user modal', async () => {
    renderWithUser(admin);
    await waitFor(() => expect(screen.getByRole('button', { name: /Add User/i })).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /Add User/i }));
    const dialog = screen.getByRole('dialog');
    fireEvent.change(screen.getByLabelText('Name', { selector: 'input' }), { target: { value: 'Created User' } });
    fireEvent.change(screen.getByLabelText('Email', { selector: 'input' }), { target: { value: 'created@company.com' } });
    fireEvent.change(dialog.querySelectorAll('input')[2], { target: { value: 'Finance' } });
    fireEvent.change(screen.getByLabelText('Initial Password'), { target: { value: 'Password123!' } });
    fireEvent.click(screen.getByRole('button', { name: /Create User/i }));
    await waitFor(() => expect(screen.getByText('Created User')).toBeInTheDocument());
  });

  it('does not render management controls for non-admin users', async () => {
    renderWithUser(requester);
    await waitFor(() => expect(screen.queryByText('User Management')).not.toBeInTheDocument());
    expect(screen.queryByRole('button', { name: /Add User/i })).not.toBeInTheDocument();
  });
});