import React, { useState, useEffect } from 'react';
import { useDevRequester } from '../context/DevRequesterContext';

export const DevRequesterSelector: React.FC = () => {
  const {
    isSelectorOpen,
    setIsSelectorOpen,
    selectedRequester,
    setSelectedRequester,
    requesters,
    loading,
    error,
  } = useDevRequester();

  const [tempSelectedId, setTempSelectedId] = useState<string>('');

  useEffect(() => {
    if (selectedRequester) {
      setTempSelectedId(String(selectedRequester.id));
    } else if (requesters.length > 0) {
      setTempSelectedId(String(requesters[0].id));
    }
  }, [selectedRequester, requesters]);

  if (!isSelectorOpen) {
    return null;
  }

  const handleContinue = () => {
    const selectedIdNum = Number(tempSelectedId);
    const found = requesters.find((r) => r.id === selectedIdNum);
    if (found) {
      setSelectedRequester(found);
      setIsSelectorOpen(false);
    }
  };

  return (
    <div className="modal-overlay" role="dialog" aria-labelledby="dev-selector-title" aria-modal="true">
      <div className="modal-card">
        <div className="modal-header">
          <h2 id="dev-selector-title" className="modal-title">
            Select Development Requester
          </h2>
        </div>

        <div className="dev-notice-banner">
          <strong>Notice:</strong> Development Identity Selector — This selector is for development and testing purposes only and does NOT represent secure user authentication.
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '1rem 0' }}>Loading active requesters...</div>
        ) : error ? (
          <div className="text-error" style={{ marginBottom: '1rem' }}>{error}</div>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleContinue();
            }}
          >
            <div className="form-group">
              <label htmlFor="requester-select" className="form-label">
                Development Requester User <span style={{ color: 'var(--error)' }}>*</span>
              </label>
              <select
                id="requester-select"
                className="form-select"
                value={tempSelectedId}
                onChange={(e) => setTempSelectedId(e.target.value)}
              >
                {requesters.map((req) => (
                  <option key={req.id} value={req.id}>
                    {req.name} ({req.department}) — {req.email}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1.5rem' }}>
              <button
                type="submit"
                className="btn-zen-primary"
                disabled={!tempSelectedId || requesters.length === 0}
              >
                Continue
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default DevRequesterSelector;
