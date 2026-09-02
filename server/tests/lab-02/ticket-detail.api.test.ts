import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../../src/app';
import prisma from '../../src/lib/prisma';

describe('GET /api/tickets/:id - Ticket Detail API', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('should return 200 OK with detailed ticket information for owned ticket', async () => {
    const mockTicket = {
      id: 101,
      ticketNumber: 'TKT-2026-100001',
      summary: 'Printer offline in Accounting',
      description: 'The network printer stops responding to print jobs.',
      requestedPriority: 'MEDIUM',
      currentStatus: 'NEW',
      requesterId: 1,
      categoryId: 2,
      relatedSystemId: 3,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      category: { id: 2, name: 'Hardware' },
      relatedSystem: { id: 3, name: 'Print Server' },
      requesterUser: {
        id: 1,
        name: 'Jennifer Anderson',
        email: 'jennifer.anderson@toktickit.com',
        department: 'Human Resources',
      },
      attachments: [
        {
          id: 1,
          fileName: 'error-log.pdf',
          fileType: 'application/pdf',
          fileSize: 2048,
          isRemoved: false,
          removalReason: null,
          createdAt: new Date().toISOString(),
        },
      ],
    };

    vi.spyOn(prisma.ticket, 'findUnique').mockResolvedValue(mockTicket as any);

    const res = await request(app)
      .get('/api/tickets/101')
      .set('X-Requester-Id', '1');

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(101);
    expect(res.body.ticketNumber).toBe('TKT-2026-100001');
    expect(res.body.category.name).toBe('Hardware');
    expect(res.body.relatedSystem.name).toBe('Print Server');
    expect(res.body.attachments).toHaveLength(1);
    expect(res.body.attachments[0].fileName).toBe('error-log.pdf');
  });

  it('should return 403 Forbidden when ticket belongs to a different requester', async () => {
    const mockTicket = {
      id: 101,
      ticketNumber: 'TKT-2026-100001',
      requesterId: 1, // Owned by requester 1
    };

    vi.spyOn(prisma.ticket, 'findUnique').mockResolvedValue(mockTicket as any);

    // Requester 2 attempts access
    const res = await request(app)
      .get('/api/tickets/101')
      .set('X-Requester-Id', '2');

    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/Forbidden/i);
  });

  it('should return 404 Not Found when ticket does not exist', async () => {
    vi.spyOn(prisma.ticket, 'findUnique').mockResolvedValue(null);

    const res = await request(app)
      .get('/api/tickets/999')
      .set('X-Requester-Id', '1');

    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/Ticket not found/i);
  });

  it('should return 400 Bad Request when X-Requester-Id header is missing', async () => {
    const res = await request(app).get('/api/tickets/101');

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Missing X-Requester-Id/i);
  });
});
