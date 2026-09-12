import React from 'react';
import { useAuth } from '../context/AuthContext';

export const Header: React.FC = () => {
  const { user, logout } = useAuth();

  const getRoleBadgeColor = (role?: string) => {
    switch (role) {
      case 'ADMIN':
        return '#9B2C2C';
      case 'IT_STAFF':
        return '#2B6CB0';
      default:
        return '#2F855A';
    }
  };

  return (
    <header className="app-header">
      <div className="header-content">
        <h1 className="header-title">TokTickIT IT Service Desk</h1>

        <div className="requester-badge-container">
          {user && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div>
                <strong>{user.name}</strong>{' '}
                <span style={{ fontSize: '0.8125rem', opacity: 0.8 }}>({user.department})</span>
              </div>
              <span
                style={{
                  backgroundColor: getRoleBadgeColor(user.role),
                  color: '#FFFFFF',
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  padding: '0.15rem 0.5rem',
                  borderRadius: '9999px',
                  textTransform: 'uppercase',
                }}
              >
                {user.role}
              </span>
              <button
                type="button"
                className="btn-zen-outline"
                onClick={logout}
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
