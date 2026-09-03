import React, { useState, useEffect } from 'react';
import { useDevRequester } from '../context/DevRequesterContext';

interface Category {
  id: number;
  name: string;
}

interface RelatedSystem {
  id: number;
  name: string;
}

interface Ticket {
  id: number;
  ticketNumber: string;
  summary: string;
  description: string;
  requestedPriority: string;
  currentStatus: string;
  createdAt: string;
}

const getApiUrl = (path: string): string => {
  const origin =
    typeof window !== 'undefined' && window.location.origin && window.location.origin !== 'null'
      ? window.location.origin
      : 'http://localhost:3000';
  return `${origin}${path}`;
};

export const CreateTicket: React.FC = () => {
  const { selectedRequester, setIsSelectorOpen } = useDevRequester();

  const [categories, setCategories] = useState<Category[]>([]);
  const [relatedSystems, setRelatedSystems] = useState<RelatedSystem[]>([]);

  const [categoryId, setCategoryId] = useState<string>('');
  const [relatedSystemId, setRelatedSystemId] = useState<string>('');
  const [requestedPriority, setRequestedPriority] = useState<string>('MEDIUM');
  const [summary, setSummary] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [file, setFile] = useState<File | null>(null);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [createdTicket, setCreatedTicket] = useState<Ticket | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [catRes, sysRes] = await Promise.all([
          fetch(getApiUrl('/api/categories')),
          fetch(getApiUrl('/api/related-systems')),
        ]);

        if (catRes.ok) {
          const catData: Category[] = await catRes.json();
          setCategories(catData);
          if (catData.length > 0) {
            setCategoryId(String(catData[0].id));
          }
        }

        if (sysRes.ok) {
          const sysData: RelatedSystem[] = await sysRes.json();
          setRelatedSystems(sysData);
          if (sysData.length > 0) {
            setRelatedSystemId(String(sysData[0].id));
          }
        }
      } catch (err) {
        console.error('Failed to load reference data', err);
      }
    };

    fetchData();
  }, []);

  const validateFile = (selectedFile: File): string | null => {
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    const maxSizeBytes = 5 * 1024 * 1024; // 5 MB

    if (!allowedMimeTypes.includes(selectedFile.type)) {
      return 'Invalid file type. Only JPG, PNG, WEBP, and PDF files are allowed.';
    }

    if (selectedFile.size > maxSizeBytes) {
      return 'File size exceeds maximum limit of 5MB.';
    }

    return null;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      const fileErr = validateFile(selected);
      if (fileErr) {
        setErrors((prev) => ({ ...prev, file: fileErr }));
        setFile(null);
      } else {
        setErrors((prev) => {
          const next = { ...prev };
          delete next.file;
          return next;
        });
        setFile(selected);
      }
    } else {
      setFile(null);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!summary || summary.trim() === '') {
      newErrors.summary = 'Summary is required';
    }

    if (!description || description.trim() === '') {
      newErrors.description = 'Description is required';
    }

    if (!categoryId) {
      newErrors.categoryId = 'Category is required';
    }

    if (!relatedSystemId) {
      newErrors.relatedSystemId = 'Related system is required';
    }

    if (!requestedPriority) {
      newErrors.requestedPriority = 'Requested priority is required';
    }

    if (file) {
      const fileErr = validateFile(file);
      if (fileErr) {
        newErrors.file = fileErr;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiError(null);

    if (!selectedRequester) {
      setIsSelectorOpen(true);
      return;
    }

    if (!validateForm()) {
      return;
    }

    setSubmitting(true);

    try {
      // Create ticket
      const ticketRes = await fetch(getApiUrl('/api/tickets'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requester-Id': String(selectedRequester.id),
        },
        body: JSON.stringify({
          summary: summary.trim(),
          description: description.trim(),
          categoryId: Number(categoryId),
          relatedSystemId: Number(relatedSystemId),
          requestedPriority,
        }),
      });

      if (!ticketRes.ok) {
        const errorData = await ticketRes.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to create ticket');
      }

      const ticket: Ticket = await ticketRes.json();

      // If file attached, upload attachment
      if (file) {
        const formData = new FormData();
        formData.append('file', file);

        const attachRes = await fetch(getApiUrl(`/api/tickets/${ticket.id}/attachments`), {
          method: 'POST',
          headers: {
            'X-Requester-Id': String(selectedRequester.id),
          },
          body: formData,
        });

        if (!attachRes.ok) {
          const attachError = await attachRes.json().catch(() => ({}));
          console.warn('Attachment upload failed:', attachError.error);
        }
      }

      setCreatedTicket(ticket);
    } catch (err) {
      setApiError(err instanceof Error ? err.message : 'An error occurred during submission');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setCreatedTicket(null);
    setSummary('');
    setDescription('');
    setFile(null);
    setErrors({});
    setApiError(null);
  };

  if (createdTicket) {
    return (
      <div className="zen-card" style={{ maxWidth: '700px', margin: '0 auto', textAlign: 'center', padding: '2.5rem 2rem' }}>
        <div
          style={{
            backgroundColor: 'var(--pale-green)',
            border: '1px solid #B8E2CD',
            borderRadius: '0.5rem',
            padding: '1.5rem',
            marginBottom: '2rem',
          }}
        >
          <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>✅</div>
          <h2 style={{ color: 'var(--primary-green)', fontWeight: 700, marginBottom: '0.5rem' }}>
            Ticket Submitted Successfully!
          </h2>
          <p style={{ color: 'var(--dark-text)', fontSize: '0.95rem' }}>
            Your support request has been logged.
          </p>
        </div>

        <div className="form-group" style={{ textAlign: 'left', marginBottom: '1.5rem' }}>
          <label className="form-label" htmlFor="created-ticket-number">Generated Ticket Number</label>
          <input
            id="created-ticket-number"
            type="text"
            className="form-input"
            value={createdTicket.ticketNumber}
            readOnly
            style={{
              backgroundColor: 'var(--readonly-surface)',
              fontWeight: 700,
              color: 'var(--primary-green)',
              fontSize: '1.25rem',
              letterSpacing: '0.05em',
            }}
          />
        </div>

        <div style={{ textAlign: 'left', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '2rem' }}>
          <div>
            <span style={{ fontSize: '0.875rem', color: '#6B7280' }}>Status:</span>
            <div style={{ fontWeight: 600 }}>{createdTicket.currentStatus}</div>
          </div>
          <div>
            <span style={{ fontSize: '0.875rem', color: '#6B7280' }}>Requested Priority:</span>
            <div style={{ fontWeight: 600 }}>{createdTicket.requestedPriority}</div>
          </div>
        </div>

        <button className="btn-zen-primary" onClick={handleReset} style={{ padding: '0.75rem 2rem', fontSize: '1rem' }}>
          Create Another Ticket
        </button>
      </div>
    );
  }

  return (
    <div className="zen-card" style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', pb: '1rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--primary-green)', marginBottom: '0.25rem' }}>
          Create New IT Support Ticket
        </h2>
        <p style={{ color: '#6B7280', fontSize: '0.9rem' }}>
          Fill out the details below to submit a request to the IT service team.
        </p>
      </div>

      {apiError && (
        <div
          style={{
            backgroundColor: '#FEE2E2',
            border: '1px solid #FCA5A5',
            color: '#991B1B',
            padding: '0.75rem 1rem',
            borderRadius: '0.375rem',
            marginBottom: '1.5rem',
            fontSize: '0.9rem',
          }}
        >
          {apiError}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
          {/* Category */}
          <div className="form-group">
            <label htmlFor="ticket-category" className="form-label">
              Category <span style={{ color: 'var(--error)' }}>*</span>
            </label>
            <select
              id="ticket-category"
              className="form-select"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              style={errors.categoryId ? { borderColor: 'var(--error)' } : {}}
            >
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
            {errors.categoryId && (
              <span className="text-error" style={{ fontSize: '0.85rem', color: 'var(--error)' }}>
                {errors.categoryId}
              </span>
            )}
          </div>

          {/* Related System */}
          <div className="form-group">
            <label htmlFor="ticket-system" className="form-label">
              Related System <span style={{ color: 'var(--error)' }}>*</span>
            </label>
            <select
              id="ticket-system"
              className="form-select"
              value={relatedSystemId}
              onChange={(e) => setRelatedSystemId(e.target.value)}
              style={errors.relatedSystemId ? { borderColor: 'var(--error)' } : {}}
            >
              {relatedSystems.map((sys) => (
                <option key={sys.id} value={sys.id}>
                  {sys.name}
                </option>
              ))}
            </select>
            {errors.relatedSystemId && (
              <span className="text-error" style={{ fontSize: '0.85rem', color: 'var(--error)' }}>
                {errors.relatedSystemId}
              </span>
            )}
          </div>

          {/* Requested Priority */}
          <div className="form-group">
            <label htmlFor="ticket-priority" className="form-label">
              Requested Priority <span style={{ color: 'var(--error)' }}>*</span>
            </label>
            <select
              id="ticket-priority"
              className="form-select"
              value={requestedPriority}
              onChange={(e) => setRequestedPriority(e.target.value)}
              style={errors.requestedPriority ? { borderColor: 'var(--error)' } : {}}
            >
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="URGENT">Urgent</option>
            </select>
            {errors.requestedPriority && (
              <span className="text-error" style={{ fontSize: '0.85rem', color: 'var(--error)' }}>
                {errors.requestedPriority}
              </span>
            )}
          </div>
        </div>

        {/* Summary */}
        <div className="form-group">
          <label htmlFor="ticket-summary" className="form-label">
            Summary <span style={{ color: 'var(--error)' }}>*</span>
          </label>
          <input
            id="ticket-summary"
            type="text"
            className="form-input"
            placeholder="Brief description of the issue"
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            style={errors.summary ? { borderColor: 'var(--error)' } : {}}
          />
          {errors.summary && (
            <span className="text-error" style={{ fontSize: '0.85rem', color: 'var(--error)' }}>
              {errors.summary}
            </span>
          )}
        </div>

        {/* Description */}
        <div className="form-group">
          <label htmlFor="ticket-description" className="form-label">
            Description <span style={{ color: 'var(--error)' }}>*</span>
          </label>
          <textarea
            id="ticket-description"
            className="form-input"
            rows={5}
            placeholder="Provide full details, steps to reproduce, or relevant context"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            style={{ fontFamily: 'inherit', resize: 'vertical', ...(errors.description ? { borderColor: 'var(--error)' } : {}) }}
          />
          {errors.description && (
            <span className="text-error" style={{ fontSize: '0.85rem', color: 'var(--error)' }}>
              {errors.description}
            </span>
          )}
        </div>

        {/* File Attachment */}
        <div className="form-group">
          <label htmlFor="ticket-attachment" className="form-label">
            File Attachment (Optional)
          </label>
          <input
            id="ticket-attachment"
            type="file"
            className="form-input"
            accept=".jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf"
            onChange={handleFileChange}
            style={errors.file ? { borderColor: 'var(--error)' } : {}}
          />
          <span style={{ fontSize: '0.8rem', color: '#6B7280' }}>
            Supported formats: JPG, PNG, WEBP, PDF (Max file size: 5MB)
          </span>
          {errors.file && (
            <span className="text-error" style={{ fontSize: '0.85rem', color: 'var(--error)' }}>
              {errors.file}
            </span>
          )}
        </div>

        {/* Action Button */}
        <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end' }}>
          <button
            type="submit"
            className="btn-zen-primary"
            disabled={submitting}
            style={{ padding: '0.75rem 2rem', fontSize: '1rem' }}
          >
            {submitting ? (
              <>
                <span className="spinner" style={{ display: 'inline-block', marginRight: '0.5rem' }}>⏳</span>
                Submitting...
              </>
            ) : (
              'Submit Ticket'
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateTicket;
