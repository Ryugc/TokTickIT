import { useState } from 'react';
import { DevRequesterProvider } from './context/DevRequesterContext';
import Header from './components/Header';
import DevRequesterSelector from './components/DevRequesterSelector';

interface Category {
  id: number;
  name: string;
}

function MainContent() {
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
        <div style={{ textAlign: 'center', marginBottom: '2rem', marginTop: '1rem' }}>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--primary-green)', marginBottom: '0.5rem' }}>
            TokTickIT IT Service Desk
          </h2>
          <p style={{ color: '#6B7280' }}>System Status & Service Category Checker</p>
        </div>

        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <div className="zen-card" style={{ textAlign: 'center' }}>
            <button
              className="btn-zen-primary"
              onClick={checkSystem}
              disabled={loading}
              style={{ fontSize: '1rem', padding: '0.75rem 1.5rem', marginBottom: '1.5rem' }}
            >
              {loading ? 'Checking system status...' : '[Check System]'}
            </button>

            {loading && (
              <div style={{ color: '#6B7280', marginBottom: '1rem' }}>
                Checking system status...
              </div>
            )}

            {status === 'online' && !loading && (
              <div style={{ textAlign: 'left' }}>
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
              <div style={{ textAlign: 'left' }}>
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
