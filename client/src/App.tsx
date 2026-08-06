import { useEffect, useState } from 'react';
import { Ticket, Activity, Database, CheckCircle2, AlertCircle } from 'lucide-react';

interface HealthStatus {
  status: string;
  timestamp: string;
  database: string;
  environment: string;
}

export default function App() {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/health')
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        return res.json();
      })
      .then((data: HealthStatus) => {
        setHealth(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to fetch API health status:', err);
        setError(err.message);
        setLoading(false);
      });
  }, []);

  return (
    <div className="container">
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Ticket style={{ color: '#06b6d4', width: '2rem', height: '2rem' }} />
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700 }}>
            Tok<span className="gradient-text">TickIT</span>
          </h1>
        </div>
        <span className={`badge ${health?.status === 'ok' ? 'online' : ''}`}>
          <Activity size={16} />
          {loading ? 'Checking server...' : error ? 'Server Offline' : 'Backend Connected'}
        </span>
      </header>

      <main style={{ display: 'grid', gap: '2rem' }}>
        <section className="glass-card">
          <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', fontWeight: 600 }}>
            Welcome to <span className="gradient-text">TokTickIT</span> Vertical Slice
          </h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
            Full-stack IT support ticketing platform scaffolding. React (Vite) client configured with Express.js server & Prisma ORM PostgreSQL schema.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
            <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '0.5rem', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <Ticket style={{ color: 'var(--accent-cyan)' }} size={20} />
                <span style={{ fontWeight: 600 }}>Client Setup</span>
              </div>
              <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                React 18 + Vite + TypeScript
              </span>
            </div>

            <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '0.5rem', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <Activity style={{ color: 'var(--accent-indigo)' }} size={20} />
                <span style={{ fontWeight: 600 }}>Server Setup</span>
              </div>
              <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                Express.js + REST API
              </span>
            </div>

            <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '0.5rem', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <Database style={{ color: 'var(--success)' }} size={20} />
                <span style={{ fontWeight: 600 }}>Database ORM</span>
              </div>
              <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                Prisma ORM (PostgreSQL)
              </span>
            </div>
          </div>
        </section>

        <section className="glass-card">
          <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Activity size={20} style={{ color: 'var(--accent-cyan)' }} />
            System Health Checks
          </h3>
          {loading ? (
            <p style={{ color: 'var(--text-secondary)' }}>Connecting to Express backend...</p>
          ) : error ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#ef4444' }}>
              <AlertCircle size={20} />
              <span>Could not reach Express server at <code>/api/health</code> ({error})</span>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--success)' }}>
                <CheckCircle2 size={18} />
                <span>Backend Status: <strong>{health?.status.toUpperCase()}</strong></span>
              </div>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                Server Timestamp: {health?.timestamp}
              </p>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                ORM Database Provider: {health?.database}
              </p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
