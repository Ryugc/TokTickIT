import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export const ChangePassword: React.FC = () => {
  const { changePassword } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Complexity rules (BR-01)
  const hasMinLength = newPassword.length >= 8;
  const hasUpper = /[A-Z]/.test(newPassword);
  const hasLower = /[a-z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);
  const hasSpecial = /[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(newPassword);
  const isComplex = hasMinLength && hasUpper && hasLower && hasNumber && hasSpecial;
  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!isComplex) {
      setErrorMessage('New password does not meet complexity requirements.');
      return;
    }

    if (!passwordsMatch) {
      setErrorMessage('New password and confirmation password do not match.');
      return;
    }

    setLoading(true);
    const result = await changePassword(currentPassword, newPassword);
    setLoading(false);

    if (!result.success) {
      setErrorMessage(result.error || 'Failed to change password');
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 9999,
        padding: '1rem',
      }}
    >
      <div
        className="zen-card"
        style={{
          width: '100%',
          maxWidth: '480px',
          padding: '2.5rem 2rem',
          borderTop: '4px solid var(--primary-green, #006B3C)',
          boxShadow: '0 10px 25px -5px rgba(0,0,0,0.2)',
          backgroundColor: '#FFFFFF',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div
            style={{
              display: 'inline-block',
              backgroundColor: '#FEFCBF',
              color: '#B7791F',
              padding: '0.25rem 0.75rem',
              borderRadius: '9999px',
              fontSize: '0.75rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              marginBottom: '0.5rem',
            }}
          >
            Action Required
          </div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--primary-green, #006B3C)' }}>
            Mandatory Password Change
          </h2>
          <p style={{ color: '#6B7280', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            For account security, you must update your temporary password before continuing.
          </p>
        </div>

        {errorMessage && (
          <div
            role="alert"
            style={{
              backgroundColor: '#FFF5F5',
              borderLeft: '4px solid #E53E3E',
              color: '#C53030',
              padding: '0.75rem 1rem',
              borderRadius: '0.375rem',
              marginBottom: '1.25rem',
              fontSize: '0.875rem',
            }}
          >
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1rem' }}>
            <label
              htmlFor="current-password"
              style={{ display: 'block', fontWeight: 600, fontSize: '0.875rem', color: '#374151', marginBottom: '0.375rem' }}
            >
              Current Password
            </label>
            <input
              id="current-password"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Enter current/temporary password"
              required
              className="zen-input"
              style={{ width: '100%', padding: '0.625rem', borderRadius: '0.375rem' }}
            />
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label
              htmlFor="new-password"
              style={{ display: 'block', fontWeight: 600, fontSize: '0.875rem', color: '#374151', marginBottom: '0.375rem' }}
            >
              New Password
            </label>
            <input
              id="new-password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter new strong password"
              required
              className="zen-input"
              style={{ width: '100%', padding: '0.625rem', borderRadius: '0.375rem' }}
            />
          </div>

          {/* Complexity Checklist (BR-01) */}
          <div
            style={{
              backgroundColor: '#F8FAFC',
              border: '1px solid #E2E8F0',
              borderRadius: '0.375rem',
              padding: '0.75rem',
              marginBottom: '1rem',
              fontSize: '0.8rem',
            }}
          >
            <div style={{ fontWeight: 600, color: '#475569', marginBottom: '0.375rem' }}>Password Requirements:</div>
            <ul style={{ listStyle: 'none', paddingLeft: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <li style={{ color: hasMinLength ? '#16A34A' : '#64748B' }}>
                {hasMinLength ? '✓' : '○'} At least 8 characters long
              </li>
              <li style={{ color: hasUpper ? '#16A34A' : '#64748B' }}>
                {hasUpper ? '✓' : '○'} At least 1 uppercase letter (A-Z)
              </li>
              <li style={{ color: hasLower ? '#16A34A' : '#64748B' }}>
                {hasLower ? '✓' : '○'} At least 1 lowercase letter (a-z)
              </li>
              <li style={{ color: hasNumber ? '#16A34A' : '#64748B' }}>
                {hasNumber ? '✓' : '○'} At least 1 number (0-9)
              </li>
              <li style={{ color: hasSpecial ? '#16A34A' : '#64748B' }}>
                {hasSpecial ? '✓' : '○'} At least 1 special character (!@#$%^&*)
              </li>
            </ul>
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label
              htmlFor="confirm-password"
              style={{ display: 'block', fontWeight: 600, fontSize: '0.875rem', color: '#374151', marginBottom: '0.375rem' }}
            >
              Confirm New Password
            </label>
            <input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter new password"
              required
              className="zen-input"
              style={{ width: '100%', padding: '0.625rem', borderRadius: '0.375rem' }}
            />
            {confirmPassword.length > 0 && (
              <span style={{ fontSize: '0.75rem', color: passwordsMatch ? '#16A34A' : '#DC2626', marginTop: '0.25rem', display: 'block' }}>
                {passwordsMatch ? 'Passwords match' : 'Passwords do not match'}
              </span>
            )}
          </div>

          <button
            type="submit"
            disabled={loading || !isComplex || !passwordsMatch}
            className="btn-zen-primary"
            style={{
              width: '100%',
              padding: '0.75rem',
              fontSize: '0.95rem',
              fontWeight: 600,
              borderRadius: '0.375rem',
              opacity: loading || !isComplex || !passwordsMatch ? 0.6 : 1,
              cursor: loading || !isComplex || !passwordsMatch ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? 'Updating Password...' : 'Update Password & Continue'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChangePassword;
