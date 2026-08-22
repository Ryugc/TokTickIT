import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import App from '../App';

describe('DevRequesterSelector Component & Context', () => {
  const mockRequesters = [
    {
      id: 1,
      name: 'Jennifer Anderson',
      email: 'jennifer.anderson@toktickit.com',
      department: 'Human Resources',
      isActive: true,
    },
    {
      id: 2,
      name: 'Sarah Johnson',
      email: 'sarah.johnson@toktickit.com',
      department: 'Engineering',
      isActive: true,
    },
    {
      id: 3,
      name: 'David Lee',
      email: 'david.lee@toktickit.com',
      department: 'Finance',
      isActive: true,
    },
  ];

  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();

    vi.spyOn(global, 'fetch').mockImplementation((url) => {
      if (typeof url === 'string' && url.includes('/api/requesters')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockRequesters),
        } as Response);
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve([]),
      } as Response);
    });
  });

  it('renders Dev Requester Selector modal and explanatory notice when no identity is selected', async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    expect(screen.getByText('Select Development Requester')).toBeInTheDocument();
    expect(
      screen.getByText(/Development Identity Selector — This selector is for development and testing purposes only/i)
    ).toBeInTheDocument();
  });

  it('populates dropdown with active requesters', async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });

    const options = screen.getAllByRole('option');
    expect(options).toHaveLength(3);
    expect(options[0]).toHaveTextContent('Jennifer Anderson (Human Resources) — jennifer.anderson@toktickit.com');
    expect(options[1]).toHaveTextContent('Sarah Johnson (Engineering) — sarah.johnson@toktickit.com');
    expect(options[2]).toHaveTextContent('David Lee (Finance) — david.lee@toktickit.com');
  });

  it('updates selected requester in context and header when Continue is clicked', async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });

    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: '2' } });

    const continueButton = screen.getByRole('button', { name: 'Continue' });
    fireEvent.click(continueButton);

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    expect(screen.getByText('Sarah Johnson')).toBeInTheDocument();
    expect(screen.getByText('(Engineering)')).toBeInTheDocument();

    const stored = JSON.parse(localStorage.getItem('toktickit_selected_requester') || '{}');
    expect(stored.id).toBe(2);
    expect(stored.name).toBe('Sarah Johnson');
  });

  it('allows changing requester via header Change Requester button', async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });

    // Select Jennifer Anderson first
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    expect(screen.getByText('Jennifer Anderson')).toBeInTheDocument();

    // Click Change Requester button
    const changeButton = screen.getByRole('button', { name: 'Change Requester' });
    fireEvent.click(changeButton);

    // Modal should reappear
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
  });
});
