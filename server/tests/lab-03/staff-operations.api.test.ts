import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../../src/app';
import prisma from '../../src/lib/prisma';
import jwt from 'jsonwebtoken';
import { Role } from '@prisma/client';
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

describe('Ticket management operations', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('allows valid status transitions for IT staff', async () => {
    vi.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockStaffUser as any);
    vi.spyOn(prisma.ticket, 'findUnique').mockResolvedValue({
      id: 101,
      currentStatus: 'NEW',
      requesterId: 5,
      assignedToId: 2,
    } as any);
    vi.spyOn(prisma.ticket, 'update').mockResolvedValue({
      id: 101,
      currentStatus: 'OPEN',
      updatedAt: new Date(),
    } as any);

    const res = await request(app)
      .patch('/api/tickets/101/status')
      .set('Cookie', [makeCookie(mockStaffUser)])
      .send({ status: 'OPEN' });

    expect(res.status).toBe(200);
    expect(res.body.currentStatus).toBe('OPEN');
  });

  it('rejects invalid status leaps', async () => {
    vi.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockStaffUser as any);
    vi.spyOn(prisma.ticket, 'findUnique').mockResolvedValue({
      id: 101,
      currentStatus: 'CLOSED',
      requesterId: 5,
      assignedToId: 2,
    } as any);

    const res = await request(app)
      .patch('/api/tickets/101/status')
      .set('Cookie', [makeCookie(mockStaffUser)])
      .send({ status: 'IN_PROGRESS' });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/Invalid status transition from CLOSED to IN_PROGRESS/i);
  });

  it('updates assignee for staff users', async () => {
    vi.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockStaffUser as any);
    vi.spyOn(prisma.user, 'findUnique').mockResolvedValueOnce(mockStaffUser as any).mockResolvedValueOnce({
      id: 3,
      name: 'Another Staff',
      email: 'other@toktickit.com',
      role: Role.IT_STAFF,
      isActive: true,
    } as any);
    vi.spyOn(prisma.ticket, 'findUnique').mockResolvedValue({
      id: 101,
      assignedToId: 2,
      currentStatus: 'OPEN',
      requesterId: 5,
    } as any);
    vi.spyOn(prisma.ticket, 'update').mockResolvedValue({
      id: 101,
      assignedToId: 3,
      updatedAt: new Date(),
    } as any);

    const res = await request(app)
      .patch('/api/tickets/101/assign')
      .set('Cookie', [makeCookie(mockStaffUser)])
      .send({ assignedToId: 3 });

    expect(res.status).toBe(200);
    expect(res.body.assignedToId).toBe(3);
  });

  it('adds a public comment for authorized users', async () => {
    vi.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockRequesterUser as any);
    vi.spyOn(prisma.ticket, 'findUnique').mockResolvedValue({
      id: 101,
      requesterId: 5,
      currentStatus: 'OPEN',
    } as any);
    vi.spyOn(prisma.comment, 'create').mockResolvedValue({
      id: 10,
      content: 'Here is the update',
      ticketId: 101,
      authorId: 5,
      createdAt: new Date(),
    } as any);
    vi.spyOn(prisma.comment, 'findUnique').mockResolvedValue({
      id: 10,
      content: 'Here is the update',
      ticketId: 101,
      authorId: 5,
      author: { id: 5, name: 'Alice Requester', role: Role.REQUESTER },
      createdAt: new Date(),
    } as any);

    const res = await request(app)
      .post('/api/tickets/101/comments')
      .set('Cookie', [makeCookie(mockRequesterUser)])
      .send({ content: 'Here is the update' });

    expect(res.status).toBe(201);
    expect(res.body.content).toBe('Here is the update');
  });

  it('blocks internal notes for requesters', async () => {
    vi.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockRequesterUser as any);
    vi.spyOn(prisma.ticket, 'findUnique').mockResolvedValue({
      id: 101,
      requesterId: 5,
      currentStatus: 'OPEN',
    } as any);

    const res = await request(app)
      .post('/api/tickets/101/notes')
      .set('Cookie', [makeCookie(mockRequesterUser)])
      .send({ content: 'Internal details' });

    expect(res.status).toBe(403);
    expect(res.body.message).toMatch(/Internal notes are confidential/i);
  });
});
