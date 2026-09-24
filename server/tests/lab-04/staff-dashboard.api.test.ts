import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../../src/app';
import prisma from '../../src/lib/prisma';
import jwt from 'jsonwebtoken';
import { Role, TicketStatus } from '@prisma/client';
import { JWT_SECRET } from '../../src/middleware/auth';

const mockStaffUser = {
  id: 2,
  name: 'Jane Staff',
  email: 'staff@toktickit.com',
  role: Role.IT_STAFF,
  department: 'IT Support',
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

function makeCookie(user: typeof mockStaffUser | typeof mockRequesterUser) {
  const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET);
  return `toktickit_session=${token}`;
}

describe('Staff Operational Dashboard API', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('returns metrics and top 5 recent tickets for IT Staff', async () => {
    vi.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockStaffUser as any);
    
    // Mock prisma counts
    vi.spyOn(prisma.ticket, 'count')
      .mockResolvedValueOnce(5)  // unassignedCount
      .mockResolvedValueOnce(3)  // myAssignedCount
      .mockResolvedValueOnce(4)  // newCount
      .mockResolvedValueOnce(6)  // openCount
      .mockResolvedValueOnce(2)  // inProgressCount
      .mockResolvedValueOnce(1); // waitingForRequesterCount

    vi.spyOn(prisma.ticket, 'findMany').mockResolvedValue([
      {
        id: 101,
        ticketNumber: 'TCK-LAB4-001',
        summary: 'Recent Ticket 1',
        currentStatus: TicketStatus.IN_PROGRESS,
        updatedAt: new Date(),
        requesterUser: { id: 5, name: 'Alice', email: 'alice@co.com' },
        assignedTo: { id: 2, name: 'Jane Staff', email: 'staff@toktickit.com' },
        category: { id: 1, name: 'Hardware' },
        relatedSystem: { id: 1, name: 'Laptop' },
      },
    ] as any);

    const res = await request(app)
      .get('/api/dashboard/staff')
      .set('Cookie', [makeCookie(mockStaffUser)]);

    expect(res.status).toBe(200);
    expect(res.body.unassignedCount).toBe(5);
    expect(res.body.myAssignedCount).toBe(3);
    expect(res.body.newCount).toBe(4);
    expect(res.body.openCount).toBe(6);
    expect(res.body.inProgressCount).toBe(2);
    expect(res.body.waitingForRequesterCount).toBe(1);
    expect(Array.isArray(res.body.recentTickets)).toBe(true);
    expect(res.body.recentTickets.length).toBe(1);
  });

  it('blocks Requester role from accessing staff dashboard with HTTP 403 Forbidden', async () => {
    vi.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockRequesterUser as any);

    const res = await request(app)
      .get('/api/dashboard/staff')
      .set('Cookie', [makeCookie(mockRequesterUser)]);

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('FORBIDDEN');
  });

  it('rejects unauthenticated requests with HTTP 401 Unauthorized', async () => {
    const res = await request(app).get('/api/dashboard/staff');

    expect(res.status).toBe(401);
  });
});
