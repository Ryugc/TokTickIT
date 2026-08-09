import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import App from './App';

describe('TokTickIT IT Service Desk Component', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders app title heading and check system button', () => {
    render(<App />);
    expect(screen.getByText('TokTickIT IT Service Desk')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '[Check System]' })).toBeInTheDocument();
  });

  it('displays loading state during system check', async () => {
    vi.spyOn(global, 'fetch').mockImplementation(() => new Promise(() => {})); // Pending promise
    render(<App />);

    const button = screen.getByRole('button', { name: '[Check System]' });
    fireEvent.click(button);

    expect(screen.getAllByText('Checking system status...').length).toBeGreaterThan(0);
  });

  it('displays success state with categories on successful API response', async () => {
    const mockCategories = [
      { id: 1, name: 'Account and Access' },
      { id: 2, name: 'Hardware' },
      { id: 3, name: 'Software' },
      { id: 4, name: 'Network' },
    ];

    vi.spyOn(global, 'fetch').mockImplementation((url) => {
      if (typeof url === 'string' && url.includes('/api/health')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ status: 'ok', service: 'TokTickIT API' }),
        } as Response);
      }
      if (typeof url === 'string' && url.includes('/api/categories')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockCategories),
        } as Response);
      }
      return Promise.reject(new Error('Unknown endpoint'));
    });

    render(<App />);
    const button = screen.getByRole('button', { name: '[Check System]' });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText('System Status: Online')).toBeInTheDocument();
    });

    expect(screen.getByText('Supported Request Categories:')).toBeInTheDocument();
    expect(screen.getByText('Account and Access')).toBeInTheDocument();
    expect(screen.getByText('Hardware')).toBeInTheDocument();
    expect(screen.getByText('Software')).toBeInTheDocument();
    expect(screen.getByText('Network')).toBeInTheDocument();
  });

  it('displays offline status and error message on fetch failure', async () => {
    vi.spyOn(global, 'fetch').mockRejectedValue(new Error('Network error'));

    render(<App />);
    const button = screen.getByRole('button', { name: '[Check System]' });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText('System Status: Offline')).toBeInTheDocument();
    });

    expect(screen.getByText('Unable to connect to TokTickIT API')).toBeInTheDocument();
  });
});
