import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../../src/app';
import prisma from '../../src/lib/prisma';

// ---------------------------------------------------------------------------
// Shared mock data
// ---------------------------------------------------------------------------

const mockRequesterA = {
  id: 1,
  name: 'Jennifer Anderson',
  email: 'jennifer.anderson@toktickit.com',
  department: 'Human Resources',
  isActive: true,
};

const mockRequesterB = {
  id: 2,
  name: 'Carlos Ramirez',
  email: 'carlos.ramirez@toktickit.com',
  department: 'Finance',
  isActive: true,
};

const makeTicket = (overrides: Record<string, unknown> = {}) => ({
  id: 1,
  ticketNumber: 'TKT-2026-100001',
  summary: 'Printer not responding',
  description: 'The office printer is offline.',
  requestedPriority: 'MEDIUM',
  currentStatus: 'NEW',
  requesterId: 1,
  categoryId: 1,
  relatedSystemId: 1,
  createdAt: new Date('2026-01-15T08:00:00Z'),
  updatedAt: new Date('2026-01-15T08:00:00Z'),
  category: { id: 1, name: 'Hardware' },
  relatedSystem: { id: 1, name: 'Workstation Hardware' },
  ...overrides,
});

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe('GET /api/tickets — My Tickets', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // -------------------------------------------------------------------------
  // 1. Happy path — returns paginated ticket list
  // -------------------------------------------------------------------------
  it('should return 200 with paginated data and pagination metadata for the active requester', async () => {
    const tickets = [
      makeTicket({ id: 1, ticketNumber: 'TKT-2026-100001' }),
      makeTicket({ id: 2, ticketNumber: 'TKT-2026-100002', summary: 'VPN disconnects' }),
    ];

    vi.spyOn(prisma.requesterUser, 'findUnique').mockResolvedValue(mockRequesterA as any);
    vi.spyOn(prisma.ticket, 'findMany').mockResolvedValue(tickets as any);
    vi.spyOn(prisma.ticket, 'count').mockResolvedValue(2);

    const res = await request(app)
      .get('/api/tickets')
      .set('X-Requester-Id', '1');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('data');
    expect(res.body).toHaveProperty('pagination');
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.pagination.total).toBe(2);
    expect(res.body.pagination.page).toBe(1);
    expect(res.body.pagination.limit).toBe(10);
    expect(res.body.pagination.totalPages).toBe(1);
  });

  // -------------------------------------------------------------------------
  // 2. Empty state — no tickets for this requester
  // -------------------------------------------------------------------------
  it('should return 200 with empty data array when requester has no tickets', async () => {
    vi.spyOn(prisma.requesterUser, 'findUnique').mockResolvedValue(mockRequesterA as any);
    vi.spyOn(prisma.ticket, 'findMany').mockResolvedValue([]);
    vi.spyOn(prisma.ticket, 'count').mockResolvedValue(0);

    const res = await request(app)
      .get('/api/tickets')
      .set('X-Requester-Id', '1');

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
    expect(res.body.pagination.total).toBe(0);
    expect(res.body.pagination.totalPages).toBe(0);
  });

  // -------------------------------------------------------------------------
  // 3. Filter by categoryId
  // -------------------------------------------------------------------------
  it('should pass categoryId filter to Prisma query when provided', async () => {
    const hardwareTicket = makeTicket({ categoryId: 2, category: { id: 2, name: 'Hardware' } });

    vi.spyOn(prisma.requesterUser, 'findUnique').mockResolvedValue(mockRequesterA as any);
    const findManySpy = vi.spyOn(prisma.ticket, 'findMany').mockResolvedValue([hardwareTicket] as any);
    vi.spyOn(prisma.ticket, 'count').mockResolvedValue(1);

    const res = await request(app)
      .get('/api/tickets?categoryId=2')
      .set('X-Requester-Id', '1');

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);

    // Verify Prisma was called with the categoryId filter in the where clause
    const whereArg = findManySpy.mock.calls[0][0]?.where as any;
    expect(whereArg).toHaveProperty('categoryId', 2);
  });

  // -------------------------------------------------------------------------
  // 4. Filter by requestedPriority
  // -------------------------------------------------------------------------
  it('should pass requestedPriority filter to Prisma query when provided', async () => {
    const urgentTicket = makeTicket({ requestedPriority: 'URGENT' });

    vi.spyOn(prisma.requesterUser, 'findUnique').mockResolvedValue(mockRequesterA as any);
    const findManySpy = vi.spyOn(prisma.ticket, 'findMany').mockResolvedValue([urgentTicket] as any);
    vi.spyOn(prisma.ticket, 'count').mockResolvedValue(1);

    const res = await request(app)
      .get('/api/tickets?requestedPriority=URGENT')
      .set('X-Requester-Id', '1');

    expect(res.status).toBe(200);
    const whereArg = findManySpy.mock.calls[0][0]?.where as any;
    expect(whereArg).toHaveProperty('requestedPriority', 'URGENT');
  });

  // -------------------------------------------------------------------------
  // 5. Filter by currentStatus
  // -------------------------------------------------------------------------
  it('should pass currentStatus filter to Prisma query when provided', async () => {
    const openTicket = makeTicket({ currentStatus: 'OPEN' });

    vi.spyOn(prisma.requesterUser, 'findUnique').mockResolvedValue(mockRequesterA as any);
    const findManySpy = vi.spyOn(prisma.ticket, 'findMany').mockResolvedValue([openTicket] as any);
    vi.spyOn(prisma.ticket, 'count').mockResolvedValue(1);

    const res = await request(app)
      .get('/api/tickets?currentStatus=OPEN')
      .set('X-Requester-Id', '1');

    expect(res.status).toBe(200);
    const whereArg = findManySpy.mock.calls[0][0]?.where as any;
    expect(whereArg).toHaveProperty('currentStatus', 'OPEN');
  });

  // -------------------------------------------------------------------------
  // 6. Search by summary keyword
  // -------------------------------------------------------------------------
  it('should apply OR search filter across summary and ticketNumber when search param provided', async () => {
    const matchingTicket = makeTicket({ summary: 'Printer not responding' });

    vi.spyOn(prisma.requesterUser, 'findUnique').mockResolvedValue(mockRequesterA as any);
    const findManySpy = vi.spyOn(prisma.ticket, 'findMany').mockResolvedValue([matchingTicket] as any);
    vi.spyOn(prisma.ticket, 'count').mockResolvedValue(1);

    const res = await request(app)
      .get('/api/tickets?search=printer')
      .set('X-Requester-Id', '1');

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);

    const whereArg = findManySpy.mock.calls[0][0]?.where as any;
    // Should contain an OR clause covering summary and ticketNumber
    expect(whereArg).toHaveProperty('OR');
    expect(Array.isArray(whereArg.OR)).toBe(true);
    const orFields = whereArg.OR.map((clause: any) => Object.keys(clause)[0]);
    expect(orFields).toContain('summary');
    expect(orFields).toContain('ticketNumber');
  });

  // -------------------------------------------------------------------------
  // 7. Search by ticket number
  // -------------------------------------------------------------------------
  it('should return matching ticket when search matches ticketNumber pattern', async () => {
    const targetTicket = makeTicket({ ticketNumber: 'TKT-2026-999999' });

    vi.spyOn(prisma.requesterUser, 'findUnique').mockResolvedValue(mockRequesterA as any);
    vi.spyOn(prisma.ticket, 'findMany').mockResolvedValue([targetTicket] as any);
    vi.spyOn(prisma.ticket, 'count').mockResolvedValue(1);

    const res = await request(app)
      .get('/api/tickets?search=TKT-2026-999999')
      .set('X-Requester-Id', '1');

    expect(res.status).toBe(200);
    expect(res.body.data[0].ticketNumber).toBe('TKT-2026-999999');
  });

  // -------------------------------------------------------------------------
  // 8. Sort by requestedPriority ascending
  // -------------------------------------------------------------------------
  it('should pass sortBy and sortOrder to Prisma orderBy when provided', async () => {
    vi.spyOn(prisma.requesterUser, 'findUnique').mockResolvedValue(mockRequesterA as any);
    const findManySpy = vi.spyOn(prisma.ticket, 'findMany').mockResolvedValue([makeTicket()] as any);
    vi.spyOn(prisma.ticket, 'count').mockResolvedValue(1);

    const res = await request(app)
      .get('/api/tickets?sortBy=requestedPriority&sortOrder=asc')
      .set('X-Requester-Id', '1');

    expect(res.status).toBe(200);
    const orderByArg = findManySpy.mock.calls[0][0]?.orderBy as any;
    expect(orderByArg).toMatchObject({ requestedPriority: 'asc' });
  });

  // -------------------------------------------------------------------------
  // 9. Requester isolation — B only sees their own tickets
  // -------------------------------------------------------------------------
  it('should enforce requester isolation: requester B only receives their own tickets', async () => {
    vi.spyOn(prisma.requesterUser, 'findUnique').mockResolvedValue(mockRequesterB as any);
    const findManySpy = vi.spyOn(prisma.ticket, 'findMany').mockResolvedValue([]);
    vi.spyOn(prisma.ticket, 'count').mockResolvedValue(0);

    const res = await request(app)
      .get('/api/tickets')
      .set('X-Requester-Id', '2');

    expect(res.status).toBe(200);
    // Prisma should always be scoped to requesterId = 2
    const whereArg = findManySpy.mock.calls[0][0]?.where as any;
    expect(whereArg).toHaveProperty('requesterId', 2);
  });

  // -------------------------------------------------------------------------
  // 10. Missing X-Requester-Id header → 400
  // -------------------------------------------------------------------------
  it('should return 400 Bad Request when X-Requester-Id header is missing', async () => {
    const res = await request(app).get('/api/tickets');

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Missing X-Requester-Id header/i);
  });

  // -------------------------------------------------------------------------
  // 11. Invalid X-Requester-Id (non-numeric) → 400
  // -------------------------------------------------------------------------
  it('should return 400 Bad Request when X-Requester-Id is not a valid number', async () => {
    const res = await request(app)
      .get('/api/tickets')
      .set('X-Requester-Id', 'not-a-number');

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Invalid X-Requester-Id header/i);
  });

  // -------------------------------------------------------------------------
  // 12. Pagination metadata correctness
  // -------------------------------------------------------------------------
  it('should return correct totalPages when total exceeds page limit', async () => {
    vi.spyOn(prisma.requesterUser, 'findUnique').mockResolvedValue(mockRequesterA as any);
    vi.spyOn(prisma.ticket, 'findMany').mockResolvedValue(
      Array.from({ length: 5 }, (_, i) => makeTicket({ id: i + 1 })) as any,
    );
    vi.spyOn(prisma.ticket, 'count').mockResolvedValue(23);

    const res = await request(app)
      .get('/api/tickets?page=2&limit=5')
      .set('X-Requester-Id', '1');

    expect(res.status).toBe(200);
    expect(res.body.pagination).toMatchObject({
      total: 23,
      page: 2,
      limit: 5,
      totalPages: 5, // ceil(23/5) = 5
    });
  });

  // -------------------------------------------------------------------------
  // 13. Default sort is createdAt descending
  // -------------------------------------------------------------------------
  it('should default to sorting by createdAt descending when no sort params provided', async () => {
    vi.spyOn(prisma.requesterUser, 'findUnique').mockResolvedValue(mockRequesterA as any);
    const findManySpy = vi.spyOn(prisma.ticket, 'findMany').mockResolvedValue([]);
    vi.spyOn(prisma.ticket, 'count').mockResolvedValue(0);

    await request(app)
      .get('/api/tickets')
      .set('X-Requester-Id', '1');

    const orderByArg = findManySpy.mock.calls[0][0]?.orderBy as any;
    expect(orderByArg).toMatchObject({ createdAt: 'desc' });
  });
});
