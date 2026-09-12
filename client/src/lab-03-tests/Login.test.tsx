import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthProvider } from '../context/AuthContext';
import Login from '../components/Login';

describe('Login Component', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders login form elements cleanly', () => {
    render(
      <AuthProvider>
        <Login />
      </AuthProvider>
    );

    expect(screen.getByText('TokTickIT')).toBeInTheDocument();
    expect(screen.getByLabelText(/Email Address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign In' })).toBeInTheDocument();
  });

  it('displays error message when login fails with invalid credentials', async () => {
    vi.spyOn(global, 'fetch').mockImplementation((url) => {
      if (typeof url === 'string' && url.includes('/api/auth/me')) {
        return Promise.resolve({ ok: false, status: 401 } as Response);
      }
      if (typeof url === 'string' && url.includes('/api/auth/login')) {
        return Promise.resolve({
          ok: false,
          status: 401,
          json: () => Promise.resolve({ message: 'Invalid email or password credentials.' }),
        } as Response);
      }
      return Promise.resolve({ ok: false } as Response);
    });

    render(
      <AuthProvider>
        <Login />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByLabelText(/Email Address/i)).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText(/Email Address/i), {
      target: { value: 'user@toktickit.com' },
    });
    fireEvent.change(screen.getByLabelText(/Password/i), {
      target: { value: 'WrongPassword!' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Sign In' }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText(/Invalid email or password credentials/i)).toBeInTheDocument();
    });
  });

  it('toggles password visibility when Show/Hide button is clicked', async () => {
    render(
      <AuthProvider>
        <Login />
      </AuthProvider>
    );

    const passwordInput = screen.getByLabelText(/Password/i) as HTMLInputElement;
    const toggleButton = screen.getByRole('button', { name: 'Show' });

    expect(passwordInput.type).toBe('password');

    fireEvent.click(toggleButton);
    expect(passwordInput.type).toBe('text');
    expect(screen.getByRole('button', { name: 'Hide' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Hide' }));
    expect(passwordInput.type).toBe('password');
  });
});
