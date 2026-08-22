import React from 'react';
import { useDevRequester } from '../context/DevRequesterContext';

export const Header: React.FC = () => {
  const { selectedRequester, setIsSelectorOpen } = useDevRequester();

  return (
    <header className="app-header">
      <div className="header-content">
        <h1 className="header-title">TokTickIT IT Service Desk</h1>

        <div className="requester-badge-container">
          {selectedRequester ? (
            <div>
              <span style={{ fontSize: '0.875rem', opacity: 0.9 }}>Requester: </span>
              <strong>{selectedRequester.name}</strong>{' '}
              <span style={{ fontSize: '0.8125rem', opacity: 0.8 }}>({selectedRequester.department})</span>
            </div>
          ) : (
            <span style={{ fontSize: '0.875rem', opacity: 0.9 }}>No Requester Selected</span>
          )}

          <button
            type="button"
            className="btn-zen-outline"
            onClick={() => setIsSelectorOpen(true)}
          >
            Change Requester
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
