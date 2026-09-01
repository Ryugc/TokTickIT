import { useState } from 'react';
import { DevRequesterProvider } from './context/DevRequesterContext';
import Header from './components/Header';
import DevRequesterSelector from './components/DevRequesterSelector';
import CreateTicket from './components/CreateTicket';
import MyTickets from './components/MyTickets';
import TicketDetail from './components/TicketDetail';

interface Category {
  id: number;
  name: string;
}

function MainContent() {
  const [selectedTicketId, setSelectedTicketId] = useState<number | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [status, setStatus] = useState<'idle' | 'online' | 'offline'>('idle');
  const [categories, setCategories] = useState<Category[]>([]);
  const [errorMessage, setErrorMessage] = useState<string>('');

  const checkSystem = async () => {
    setLoading(true);
    setErrorMessage('');
    try {
      const [healthRes, categoriesRes] = await Promise.all([
        fetch('/api/health'),
        fetch('/api/categories'),
      ]);

      if (!healthRes.ok || !categoriesRes.ok) {
        throw new Error('Unable to connect to TokTickIT API');
      }

      const categoriesData = await categoriesRes.json();
      setCategories(categoriesData);
      setStatus('online');
    } catch (err) {
      setStatus('offline');
      setErrorMessage('Unable to connect to TokTickIT API');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Header />
      <main className="container">
        <div style={{ textAlign: 'center', marginBottom: '2rem', marginTop: '0.5rem' }}>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--primary-green)', marginBottom: '0.5rem' }}>
            TokTickIT IT Service Desk
          </h2>
          <p style={{ color: '#6B7280' }}>Requester Portal</p>
        </div>

        {selectedTicketId !== null ? (
          <TicketDetail
            ticketId={selectedTicketId}
            onBack={() => setSelectedTicketId(null)}
          />
        ) : (
          <>
            <CreateTicket />
            <MyTickets onSelectTicket={(id) => setSelectedTicketId(id)} />
          </>
        )}

        <div style={{ maxWidth: '800px', margin: '2rem auto 0' }}>
          <div className="zen-card" style={{ textAlign: 'center' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--dark-text)', marginBottom: '1rem' }}>
              System Status & Service Category Checker
            </h3>
            <button
              className="btn-zen-primary"
              onClick={checkSystem}
              disabled={loading}
              style={{ fontSize: '1rem', padding: '0.75rem 1.5rem', marginBottom: '1rem' }}
            >
              {loading ? 'Checking system status...' : '[Check System]'}
            </button>

            {loading && (
              <div style={{ color: '#6B7280', marginBottom: '1rem' }}>
                Checking system status...
              </div>
            )}

            {status === 'online' && !loading && (
              <div style={{ textAlign: 'left', marginTop: '1rem' }}>
                <div className="dev-notice-banner" style={{ borderLeftColor: 'var(--primary-green)' }}>
                  <strong>System Status: Online</strong>
                </div>
                <h4 style={{ fontWeight: 600, marginBottom: '1rem' }}>Supported Request Categories:</h4>
                <ul style={{ listStyle: 'none', padding: 0 }}>
                  {categories.map((cat) => (
                    <li
                      key={cat.id}
                      style={{
                        padding: '0.75rem 1rem',
                        borderBottom: '1px solid var(--border-color)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                      }}
                    >
                      <span
                        style={{
                          backgroundColor: 'var(--pale-green)',
                          color: 'var(--primary-green)',
                          fontWeight: 700,
                          borderRadius: '9999px',
                          padding: '0.125rem 0.5rem',
                          fontSize: '0.875rem',
                        }}
                      >
                        {cat.id}
                      </span>
                      {cat.name}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {status === 'offline' && !loading && (
              <div style={{ textAlign: 'left', marginTop: '1rem' }}>
                <div style={{ backgroundColor: '#FEE2E2', border: '1px solid #FCA5A5', color: '#991B1B', padding: '1rem', borderRadius: '0.375rem' }}>
                  <div style={{ fontWeight: 700, marginBottom: '0.25rem' }}>System Status: Offline</div>
                  <div>{errorMessage}</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
      <DevRequesterSelector />
    </>
  );
}

export default function App() {
  return (
    <DevRequesterProvider>
      <MainContent />
    </DevRequesterProvider>
  );
}


