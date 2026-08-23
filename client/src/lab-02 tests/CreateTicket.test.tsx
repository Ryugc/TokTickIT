import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import App from '../App';
import CreateTicket from '../components/CreateTicket';
import { DevRequesterContextType } from '../context/DevRequesterContext';

describe('CreateTicket Component', () => {
  const mockCategories = [
    { id: 1, name: 'Account and Access' },
    { id: 2, name: 'Hardware' },
  ];

  const mockSystems = [
    { id: 1, name: 'Active Directory' },
    { id: 5, name: 'Workstation Hardware' },
  ];

  const mockRequester = {
    id: 1,
    name: 'Jennifer Anderson',
    email: 'jennifer.anderson@toktickit.com',
    department: 'Human Resources',
    isActive: true,
  };

  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
    localStorage.setItem('toktickit_selected_requester', JSON.stringify(mockRequester));

    vi.spyOn(global, 'fetch').mockImplementation((url, options) => {
      const urlStr = typeof url === 'string' ? url : url.toString();

      if (urlStr.includes('/api/requesters')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([mockRequester]),
        } as Response);
      }

      if (urlStr.includes('/api/categories')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockCategories),
        } as Response);
      }

      if (urlStr.includes('/api/related-systems')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockSystems),
        } as Response);
      }

      if (urlStr.includes('/api/tickets') && options?.method === 'POST') {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              id: 101,
              ticketNumber: 'TKT-2026-987654',
              summary: 'Laptop screen shattered',
              description: 'Dropped laptop while moving desks.',
              requestedPriority: 'HIGH',
              currentStatus: 'NEW',
              createdAt: new Date().toISOString(),
            }),
        } as Response);
      }

      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve([]),
      } as Response);
    });
  });

  it('renders ticket form fields (Category, Related System, Priority, Summary, Description, File)', async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByLabelText(/Category/i)).toBeInTheDocument();
    });

    expect(screen.getByLabelText(/Related System/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Requested Priority/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Summary/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Description/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/File Attachment/i)).toBeInTheDocument();
  });

  it('displays real-time inline validation error messages when submitting empty required fields', async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Submit Ticket/i })).toBeInTheDocument();
    });

    const submitBtn = screen.getByRole('button', { name: /Submit Ticket/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText('Summary is required')).toBeInTheDocument();
      expect(screen.getByText('Description is required')).toBeInTheDocument();
    });
  });

  it('shows busy/loading state on Submit button during API request submission', async () => {
    let resolveTicketFetch: (value: any) => void;
    const fetchPromise = new Promise((resolve) => {
      resolveTicketFetch = resolve;
    });

    vi.spyOn(global, 'fetch').mockImplementation((url, options) => {
      const urlStr = typeof url === 'string' ? url : url.toString();

      if (urlStr.includes('/api/tickets') && options?.method === 'POST') {
        return fetchPromise as Promise<Response>;
      }

      if (urlStr.includes('/api/categories')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(mockCategories) } as Response);
      }
      if (urlStr.includes('/api/related-systems')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(mockSystems) } as Response);
      }
      if (urlStr.includes('/api/requesters')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve([mockRequester]) } as Response);
      }

      return Promise.resolve({ ok: true, json: () => Promise.resolve([]) } as Response);
    });

    render(<App />);

    await waitFor(() => {
      expect(screen.getByLabelText(/Summary/i)).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText(/Summary/i), { target: { value: 'Valid Summary' } });
    fireEvent.change(screen.getByLabelText(/Description/i), { target: { value: 'Valid Description text.' } });

    const submitBtn = screen.getByRole('button', { name: /Submit Ticket/i });
    fireEvent.click(submitBtn);

    // Button should enter loading/busy state and be disabled
    await waitFor(() => {
      expect(screen.getByText(/Submitting.../i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Submitting.../i })).toBeDisabled();
    });

    // Resolve the API promise
    await act(async () => {
      resolveTicketFetch!({
        ok: true,
        json: () =>
          Promise.resolve({
            id: 101,
            ticketNumber: 'TKT-2026-987654',
            summary: 'Valid Summary',
            description: 'Valid Description text.',
            requestedPriority: 'MEDIUM',
            currentStatus: 'NEW',
            createdAt: new Date().toISOString(),
          }),
      });
    });
  });

  it('displays the generated Ticket Number on successful creation screen', async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByLabelText(/Summary/i)).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText(/Summary/i), { target: { value: 'Laptop screen shattered' } });
    fireEvent.change(screen.getByLabelText(/Description/i), { target: { value: 'Dropped laptop while moving desks.' } });

    const submitBtn = screen.getByRole('button', { name: /Submit Ticket/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/Ticket Submitted Successfully!/i)).toBeInTheDocument();
    });

    expect(screen.getByDisplayValue('TKT-2026-987654')).toBeInTheDocument();
  });
});
