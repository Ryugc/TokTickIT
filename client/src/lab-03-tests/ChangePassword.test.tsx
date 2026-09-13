import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthProvider } from '../context/AuthContext';
import ChangePassword from '../components/ChangePassword';

describe('ChangePassword Component', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders mandatory password change dialog with checklist items', () => {
    render(
      <AuthProvider>
        <ChangePassword />
      </AuthProvider>
    );

    expect(screen.getByText('Mandatory Password Change')).toBeInTheDocument();
    expect(screen.getByLabelText(/Current Password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^New Password$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Confirm New Password/i)).toBeInTheDocument();
    expect(screen.getByText(/At least 8 characters long/i)).toBeInTheDocument();
  });

  it('keeps submit button disabled until new password satisfies complexity and matches confirmation', () => {
    render(
      <AuthProvider>
        <ChangePassword />
      </AuthProvider>
    );

    const submitBtn = screen.getByRole('button', { name: /Update Password & Continue/i }) as HTMLButtonElement;
    expect(submitBtn.disabled).toBe(true);

    // Enter simple non-complex password
    fireEvent.change(screen.getByLabelText(/Current Password/i), { target: { value: 'Password123!' } });
    fireEvent.change(screen.getByLabelText(/^New Password$/i), { target: { value: 'simple' } });
    fireEvent.change(screen.getByLabelText(/Confirm New Password/i), { target: { value: 'simple' } });

    expect(submitBtn.disabled).toBe(true);

    // Enter valid complex password
    fireEvent.change(screen.getByLabelText(/^New Password$/i), { target: { value: 'ValidPassword123!' } });
    fireEvent.change(screen.getByLabelText(/Confirm New Password/i), { target: { value: 'ValidPassword123!' } });

    expect(submitBtn.disabled).toBe(false);
  });
});
