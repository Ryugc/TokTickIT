import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../../src/app';
import prisma from '../../src/lib/prisma';
import jwt from 'jsonwebtoken';
import { Role, TicketStatus } from '@prisma/client';
import { JWT_SECRET } from '../../src/middleware/auth';

const mockRequesterUser = {
  id: 5,
  name: 'Alice Requester',
  email: 'alice@company.com',
  role: Role.REQUESTER,
  department: 'Sales',
  isActive: true,
  mustChangePassword: false,
};

function makeCookie(user: typeof mockRequesterUser) {
  const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET);
  return `toktickit_session=${token}`;
}

describe('Requester Personal Dashboard API', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('returns personal metrics and top 5 recent tickets for requester', async () => {
    vi.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockRequesterUser as any);

    // Mock count calls for open, inProgress, resolved, closed
    vi.spyOn(prisma.ticket, 'count')
      .mockResolvedValueOnce(2) // openCount
      .mockResolvedValueOnce(1) // inProgressCount
      .mockResolvedValueOnce(3) // resolvedCount
      .mockResolvedValueOnce(5); // closedCount

    vi.spyOn(prisma.ticket, 'findMany').mockResolvedValue([
      {
        id: 102,
        ticketNumber: 'TCK-LAB4-002',
        summary: 'My Laptop Issue',
        currentStatus: TicketStatus.OPEN,
        requesterId: 5,
        updatedAt: new Date(),
        category: { id: 1, name: 'Hardware' },
        relatedSystem: { id: 1, name: 'Laptop' },
      },
    ] as any);

    const res = await request(app)
      .get('/api/dashboard/requester')
      .set('Cookie', [makeCookie(mockRequesterUser)]);

    expect(res.status).toBe(200);
    expect(res.body.openCount).toBe(2);
    expect(res.body.inProgressCount).toBe(1);
    expect(res.body.resolvedCount).toBe(3);
    expect(res.body.closedCount).toBe(5);
    expect(Array.isArray(res.body.recentTickets)).toBe(true);
    expect(res.body.recentTickets.length).toBe(1);
    expect(res.body.recentTickets[0].summary).toBe('My Laptop Issue');
  });

  it('verifies query filters strictly isolate data to active user ID', async () => {
    vi.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockRequesterUser as any);

    const countSpy = vi.spyOn(prisma.ticket, 'count').mockResolvedValue(0);
    const findManySpy = vi.spyOn(prisma.ticket, 'findMany').mockResolvedValue([]);

    const res = await request(app)
      .get('/api/dashboard/requester')
      .set('Cookie', [makeCookie(mockRequesterUser)]);

    expect(res.status).toBe(200);

    // Check count query arguments for requesterId
    countSpy.mock.calls.forEach((call) => {
      expect(call[0]?.where?.requesterId).toBe(5);
    });

    // Check findMany query arguments for requesterId
    expect(findManySpy.mock.calls[0][0]?.where?.requesterId).toBe(5);
  });

  it('rejects unauthenticated requests with HTTP 401 Unauthorized', async () => {
    const res = await request(app).get('/api/dashboard/requester');

    expect(res.status).toBe(401);
  });
});
