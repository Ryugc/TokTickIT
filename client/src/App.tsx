import { useState } from 'react';

interface Category {
  id: number;
  name: string;
}

export default function App() {
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
    <div className="container py-5">
      <header className="mb-4 text-center">
        <h1 className="display-5 fw-bold text-primary">TokTickIT IT Service Desk</h1>
        <p className="lead text-muted">System Status & Service Category Checker</p>
      </header>

      <div className="row justify-content-center">
        <div className="col-md-8 col-lg-6">
          <div className="card shadow-sm border-0">
            <div className="card-body text-center p-4">
              <button
                className="btn btn-primary btn-lg mb-4"
                onClick={checkSystem}
                disabled={loading}
              >
                {loading ? 'Checking system status...' : '[Check System]'}
              </button>

              {loading && (
                <div className="d-flex align-items-center justify-content-center gap-2 text-secondary mb-3">
                  <div className="spinner-border spinner-border-sm" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                  <span>Checking system status...</span>
                </div>
              )}

              {status === 'online' && !loading && (
                <div className="text-start">
                  <div className="alert alert-success d-flex align-items-center mb-4" role="alert">
                    <span className="fw-bold">System Status: Online</span>
                  </div>
                  <h5 className="fw-semibold mb-3">Supported Request Categories:</h5>
                  <ul className="list-group">
                    {categories.map((cat) => (
                      <li key={cat.id} className="list-group-item d-flex align-items-center">
                        <span className="badge bg-primary rounded-pill me-3">{cat.id}</span>
                        {cat.name}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {status === 'offline' && !loading && (
                <div className="text-start">
                  <div className="alert alert-danger mb-3" role="alert">
                    <div className="fw-bold mb-1">System Status: Offline</div>
                    <div>{errorMessage}</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
