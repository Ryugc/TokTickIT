import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import AttachmentSection, { Attachment } from '../components/AttachmentSection';
import { DevRequesterProvider } from '../context/DevRequesterContext';

describe('AttachmentSection Component', () => {
  const mockRequester = {
    id: 1,
    name: 'Jennifer Anderson',
    email: 'jennifer.anderson@toktickit.com',
    department: 'Human Resources',
    isActive: true,
  };

  const mockAttachments: Attachment[] = [
    {
      id: 1,
      fileName: 'active-spec.pdf',
      fileType: 'application/pdf',
      fileSize: 1024,
      isRemoved: false,
      removalReason: null,
      createdAt: new Date().toISOString(),
    },
    {
      id: 2,
      fileName: 'old-screenshot.png',
      fileType: 'image/png',
      fileSize: 2048,
      isRemoved: true,
      removalReason: 'Superseded by active-spec.pdf',
      createdAt: new Date().toISOString(),
    },
  ];

  const onAttachmentUpdated = vi.fn();

  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
    localStorage.setItem('toktickit_selected_requester', JSON.stringify(mockRequester));

    vi.spyOn(global, 'fetch').mockImplementation((url) => {
      const urlStr = typeof url === 'string' ? url : url.toString();
      if (urlStr.includes('/api/requesters')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([mockRequester]),
        } as Response);
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
      } as Response);
    });
  });

  const renderComponent = (attachments = mockAttachments) => {
    return render(
      <DevRequesterProvider>
        <AttachmentSection
          ticketId={101}
          attachments={attachments}
          onAttachmentUpdated={onAttachmentUpdated}
        />
      </DevRequesterProvider>
    );
  };

  it('renders active and soft-removed attachment metadata correctly', () => {
    renderComponent();

    expect(screen.getByText('active-spec.pdf')).toBeInTheDocument();
    expect(screen.getByText('old-screenshot.png')).toBeInTheDocument();
    expect(screen.getByText(/Superseded by active-spec.pdf/i)).toBeInTheDocument();
    expect(screen.getByText(/1 \/ 5 Active/i)).toBeInTheDocument();
  });

  it('opens soft removal modal when remove button is clicked on an active attachment', () => {
    renderComponent();

    const removeBtn = screen.getByRole('button', { name: /Soft Remove/i });
    fireEvent.click(removeBtn);

    expect(screen.getByRole('heading', { name: /Soft Remove Attachment/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/Removal Reason/i)).toBeInTheDocument();
  });

  it('validates mandatory removal reason field in soft removal modal', async () => {
    renderComponent();

    const removeBtn = screen.getByRole('button', { name: /Soft Remove/i });
    fireEvent.click(removeBtn);

    const confirmBtn = screen.getByRole('button', { name: /Confirm Soft Removal/i });
    fireEvent.click(confirmBtn);

    expect(screen.getByText(/Removal reason is required/i)).toBeInTheDocument();
  });

  it('submits soft removal successfully when valid removal reason is entered', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch').mockImplementation((url) => {
      const urlStr = typeof url === 'string' ? url : url.toString();
      if (urlStr.includes('/api/requesters')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([mockRequester]),
        } as Response);
      }
      if (urlStr.includes('/api/attachments/1')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ id: 1, isRemoved: true }),
        } as Response);
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
      } as Response);
    });

    renderComponent();

    fireEvent.click(screen.getByRole('button', { name: /Soft Remove/i }));

    const reasonInput = screen.getByLabelText(/Removal Reason/i);
    fireEvent.change(reasonInput, { target: { value: 'File contains sensitive information' } });

    fireEvent.click(screen.getByRole('button', { name: /Confirm Soft Removal/i }));

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining('/api/attachments/1'),
        expect.objectContaining({
          method: 'DELETE',
          headers: expect.objectContaining({ 'X-Requester-Id': '1' }),
          body: JSON.stringify({ removalReason: 'File contains sensitive information' }),
        })
      );
      expect(onAttachmentUpdated).toHaveBeenCalled();
    });
  });

  it('renders disabled download button for soft-removed attachment', () => {
    renderComponent();

    const disabledBtn = screen.getByRole('button', { name: /Download Unavailable \(Removed\)/i });
    expect(disabledBtn).toBeInTheDocument();
    expect(disabledBtn).toBeDisabled();
  });
});
