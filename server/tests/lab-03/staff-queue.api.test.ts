import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../../src/app';
import prisma from '../../src/lib/prisma';
import jwt from 'jsonwebtoken';
import { Role } from '@prisma/client';
import { JWT_SECRET } from '../../src/middleware/auth';

// ---------------------------------------------------------------------------
// Shared mock data
// ---------------------------------------------------------------------------

const mockStaffUser = {
  id: 2,
  name: 'Jane Staff',
  email: 'staff@toktickit.com',
  role: Role.IT_STAFF,
  department: 'IT Support',
  isActive: true,
  mustChangePassword: false,
};

const mockAdminUser = {
  id: 1,
  name: 'Super Admin',
  email: 'admin@toktickit.com',
  role: Role.ADMIN,
  department: 'IT Operations',
  isActive: true,
  mustChangePassword: false,
};

const mockRequesterUser = {
  id: 5,
  name: 'Alice Requester',
  email: 'alice@company.com',
  role: Role.REQUESTER,
  department: 'Sales',
  isActive: true,
  mustChangePassword: false,
};

const makeTicket = (overrides: Record<string, unknown> = {}) => ({
  id: 101,
  ticketNumber: 'TKT-2026-000101',
  summary: 'VPN connection failing intermittently',
  description: 'Unable to connect to internal network via VPN.',
  requestedPriority: 'HIGH',
  itPriority: 'HIGH',
  currentStatus: 'OPEN',
  requesterId: 5,
  assignedToId: 2,
  categoryId: 1,
  relatedSystemId: 3,
  createdAt: new Date('2026-09-12T10:00:00Z'),
  updatedAt: new Date('2026-09-12T10:30:00Z'),
  requesterUser: { id: 5, name: 'Alice Requester', email: 'alice@company.com', department: 'Sales' },
  assignedTo: { id: 2, name: 'Jane Staff', email: 'staff@toktickit.com' },
  category: { id: 1, name: 'Network' },
  relatedSystem: { id: 3, name: 'Corporate VPN' },
  ...overrides,
});

// Helper: create a signed JWT cookie for a given user
function makeStaffCookie(user: typeof mockStaffUser) {
  const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET);
  return `toktickit_session=${token}`;
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe('GET /api/staff/tickets — IT Staff Queue', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // -------------------------------------------------------------------------
  // 1. IT_STAFF role → 200 with paginated data
  // -------------------------------------------------------------------------
  it('should return 200 with paginated ticket data for IT_STAFF user', async () => {
    vi.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockStaffUser as any);
    vi.spyOn(prisma.ticket, 'findMany').mockResolvedValue([makeTicket()] as any);
    vi.spyOn(prisma.ticket, 'count').mockResolvedValue(1);

    const res = await request(app)
      .get('/api/staff/tickets')
      .set('Cookie', [makeStaffCookie(mockStaffUser)]);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('data');
    expect(res.body).toHaveProperty('pagination');
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].ticketNumber).toBe('TKT-2026-000101');
    // Check pagination shape
    expect(res.body.pagination).toMatchObject({
      totalItems: 1,
      totalPages: 1,
      currentPage: 1,
      limit: 10,
    });
  });

  // -------------------------------------------------------------------------
  // 2. ADMIN role → 200 with paginated data
  // -------------------------------------------------------------------------
  it('should return 200 with paginated ticket data for ADMIN user', async () => {
    vi.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockAdminUser as any);
    vi.spyOn(prisma.ticket, 'findMany').mockResolvedValue([makeTicket()] as any);
    vi.spyOn(prisma.ticket, 'count').mockResolvedValue(1);

    const res = await request(app)
      .get('/api/staff/tickets')
      .set('Cookie', [makeStaffCookie(mockAdminUser as any)]);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
  });

  // -------------------------------------------------------------------------
  // 3. REQUESTER role → 403 FORBIDDEN (AC-05)
  // -------------------------------------------------------------------------
  it('should return 403 FORBIDDEN when accessed by a REQUESTER role user', async () => {
    vi.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockRequesterUser as any);

    const res = await request(app)
      .get('/api/staff/tickets')
      .set('Cookie', [makeStaffCookie(mockRequesterUser as any)]);

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('FORBIDDEN');
    expect(res.body.message).toMatch(/Only IT Staff and Admins/i);
  });

  // -------------------------------------------------------------------------
  // 4. No auth cookie → 401 UNAUTHORIZED
  // -------------------------------------------------------------------------
  it('should return 401 UNAUTHORIZED when no authentication cookie is provided', async () => {
    const res = await request(app).get('/api/staff/tickets');

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('UNAUTHORIZED');
  });

  // -------------------------------------------------------------------------
  // 5. search param → OR clause in where (AC-05)
  // -------------------------------------------------------------------------
  it('should apply OR search filter on ticketNumber and summary when search param is provided', async () => {
    vi.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockStaffUser as any);
    const findManySpy = vi.spyOn(prisma.ticket, 'findMany').mockResolvedValue([makeTicket()] as any);
    vi.spyOn(prisma.ticket, 'count').mockResolvedValue(1);

    const res = await request(app)
      .get('/api/staff/tickets?search=VPN')
      .set('Cookie', [makeStaffCookie(mockStaffUser)]);

    expect(res.status).toBe(200);

    const whereArg = findManySpy.mock.calls[0][0]?.where as any;
    expect(whereArg).toHaveProperty('OR');
    expect(Array.isArray(whereArg.OR)).toBe(true);
    const orFields = whereArg.OR.map((clause: any) => Object.keys(clause)[0]);
    expect(orFields).toContain('summary');
    expect(orFields).toContain('ticketNumber');
  });

  // -------------------------------------------------------------------------
  // 6. status filter → currentStatus in where (AC-05)
  // -------------------------------------------------------------------------
  it('should pass status filter to Prisma currentStatus when status query param provided', async () => {
    vi.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockStaffUser as any);
    const findManySpy = vi.spyOn(prisma.ticket, 'findMany').mockResolvedValue([makeTicket({ currentStatus: 'IN_PROGRESS' })] as any);
    vi.spyOn(prisma.ticket, 'count').mockResolvedValue(1);

    const res = await request(app)
      .get('/api/staff/tickets?status=IN_PROGRESS')
      .set('Cookie', [makeStaffCookie(mockStaffUser)]);

    expect(res.status).toBe(200);
    const whereArg = findManySpy.mock.calls[0][0]?.where as any;
    expect(whereArg).toHaveProperty('currentStatus', 'IN_PROGRESS');
  });

  // -------------------------------------------------------------------------
  // 7. requestedPriority filter (AC-05)
  // -------------------------------------------------------------------------
  it('should pass requestedPriority filter into Prisma where clause', async () => {
    vi.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockStaffUser as any);
    const findManySpy = vi.spyOn(prisma.ticket, 'findMany').mockResolvedValue([makeTicket({ requestedPriority: 'URGENT' })] as any);
    vi.spyOn(prisma.ticket, 'count').mockResolvedValue(1);

    const res = await request(app)
      .get('/api/staff/tickets?requestedPriority=URGENT')
      .set('Cookie', [makeStaffCookie(mockStaffUser)]);

    expect(res.status).toBe(200);
    const whereArg = findManySpy.mock.calls[0][0]?.where as any;
    expect(whereArg).toHaveProperty('requestedPriority', 'URGENT');
  });

  // -------------------------------------------------------------------------
  // 8. itPriority filter (AC-05)
  // -------------------------------------------------------------------------
  it('should pass itPriority filter into Prisma where clause', async () => {
    vi.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockStaffUser as any);
    const findManySpy = vi.spyOn(prisma.ticket, 'findMany').mockResolvedValue([makeTicket({ itPriority: 'HIGH' })] as any);
    vi.spyOn(prisma.ticket, 'count').mockResolvedValue(1);

    const res = await request(app)
      .get('/api/staff/tickets?itPriority=HIGH')
      .set('Cookie', [makeStaffCookie(mockStaffUser)]);

    expect(res.status).toBe(200);
    const whereArg = findManySpy.mock.calls[0][0]?.where as any;
    expect(whereArg).toHaveProperty('itPriority', 'HIGH');
  });

  // -------------------------------------------------------------------------
  // 9. assignedToId=unassigned → assignedToId: null in where (AC-05)
  // -------------------------------------------------------------------------
  it('should set assignedToId to null in where clause when assignedToId=unassigned is provided', async () => {
    vi.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockStaffUser as any);
    const findManySpy = vi.spyOn(prisma.ticket, 'findMany').mockResolvedValue([makeTicket({ assignedToId: null, assignedTo: null })] as any);
    vi.spyOn(prisma.ticket, 'count').mockResolvedValue(1);

    const res = await request(app)
      .get('/api/staff/tickets?assignedToId=unassigned')
      .set('Cookie', [makeStaffCookie(mockStaffUser)]);

    expect(res.status).toBe(200);
    const whereArg = findManySpy.mock.calls[0][0]?.where as any;
    expect(whereArg).toHaveProperty('assignedToId', null);
  });

  // -------------------------------------------------------------------------
  // 10. assignedToId=<number> → exact match in where (AC-05)
  // -------------------------------------------------------------------------
  it('should set assignedToId to the numeric value in where clause when a user ID is provided', async () => {
    vi.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockStaffUser as any);
    const findManySpy = vi.spyOn(prisma.ticket, 'findMany').mockResolvedValue([makeTicket()] as any);
    vi.spyOn(prisma.ticket, 'count').mockResolvedValue(1);

    const res = await request(app)
      .get('/api/staff/tickets?assignedToId=2')
      .set('Cookie', [makeStaffCookie(mockStaffUser)]);

    expect(res.status).toBe(200);
    const whereArg = findManySpy.mock.calls[0][0]?.where as any;
    expect(whereArg).toHaveProperty('assignedToId', 2);
  });

  // -------------------------------------------------------------------------
  // 11. Default pagination — page=1, limit=10 (AC-05)
  // -------------------------------------------------------------------------
  it('should default to page=1 and limit=10 when no pagination params are provided', async () => {
    vi.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockStaffUser as any);
    const findManySpy = vi.spyOn(prisma.ticket, 'findMany').mockResolvedValue([makeTicket()] as any);
    vi.spyOn(prisma.ticket, 'count').mockResolvedValue(1);

    const res = await request(app)
      .get('/api/staff/tickets')
      .set('Cookie', [makeStaffCookie(mockStaffUser)]);

    expect(res.status).toBe(200);
    const findManyArgs = findManySpy.mock.calls[0][0] as any;
    expect(findManyArgs.skip).toBe(0);
    expect(findManyArgs.take).toBe(10);
    expect(res.body.pagination.currentPage).toBe(1);
    expect(res.body.pagination.limit).toBe(10);
  });

  // -------------------------------------------------------------------------
  // 12. Custom pagination page=2, limit=5 (AC-05)
  // -------------------------------------------------------------------------
  it('should return correct skip, currentPage, and totalPages for page=2 limit=5 with 23 total items', async () => {
    vi.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockStaffUser as any);
    const findManySpy = vi.spyOn(prisma.ticket, 'findMany').mockResolvedValue(
      Array.from({ length: 5 }, (_, i) => makeTicket({ id: 100 + i })) as any,
    );
    vi.spyOn(prisma.ticket, 'count').mockResolvedValue(23);

    const res = await request(app)
      .get('/api/staff/tickets?page=2&limit=5')
      .set('Cookie', [makeStaffCookie(mockStaffUser)]);

    expect(res.status).toBe(200);
    const findManyArgs = findManySpy.mock.calls[0][0] as any;
    expect(findManyArgs.skip).toBe(5); // (2-1)*5
    expect(findManyArgs.take).toBe(5);
    expect(res.body.pagination).toMatchObject({
      totalItems: 23,
      totalPages: 5, // ceil(23/5)
      currentPage: 2,
      limit: 5,
    });
  });

  // -------------------------------------------------------------------------
  // 13. Custom sort: sortBy=itPriority, sortOrder=asc (AC-05)
  // -------------------------------------------------------------------------
  it('should pass itPriority ascending orderBy to Prisma when sortBy=itPriority&sortOrder=asc', async () => {
    vi.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockStaffUser as any);
    const findManySpy = vi.spyOn(prisma.ticket, 'findMany').mockResolvedValue([makeTicket()] as any);
    vi.spyOn(prisma.ticket, 'count').mockResolvedValue(1);

    const res = await request(app)
      .get('/api/staff/tickets?sortBy=itPriority&sortOrder=asc')
      .set('Cookie', [makeStaffCookie(mockStaffUser)]);

    expect(res.status).toBe(200);
    const orderByArg = findManySpy.mock.calls[0][0]?.orderBy as any;
    expect(orderByArg).toMatchObject({ itPriority: 'asc' });
  });

  // -------------------------------------------------------------------------
  // 14. Default sort: createdAt desc
  // -------------------------------------------------------------------------
  it('should default to sorting by createdAt descending when no sort params are provided', async () => {
    vi.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockStaffUser as any);
    const findManySpy = vi.spyOn(prisma.ticket, 'findMany').mockResolvedValue([makeTicket()] as any);
    vi.spyOn(prisma.ticket, 'count').mockResolvedValue(1);

    await request(app)
      .get('/api/staff/tickets')
      .set('Cookie', [makeStaffCookie(mockStaffUser)]);

    const orderByArg = findManySpy.mock.calls[0][0]?.orderBy as any;
    expect(orderByArg).toMatchObject({ createdAt: 'desc' });
  });

  // -------------------------------------------------------------------------
  // 15. mustChangePassword=true user → 403 PASSWORD_CHANGE_REQUIRED (BR-02)
  // -------------------------------------------------------------------------
  it('should return 403 PASSWORD_CHANGE_REQUIRED when staff user has mustChangePassword=true', async () => {
    const mustChangeStaff = { ...mockStaffUser, mustChangePassword: true };
    vi.spyOn(prisma.user, 'findUnique').mockResolvedValue(mustChangeStaff as any);

    const res = await request(app)
      .get('/api/staff/tickets')
      .set('Cookie', [makeStaffCookie(mustChangeStaff)]);

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('PASSWORD_CHANGE_REQUIRED');
  });
});
