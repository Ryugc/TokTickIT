import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../../src/app';
import prisma from '../../src/lib/prisma';
import jwt from 'jsonwebtoken';
import { Role, TicketStatus, TicketPriority } from '@prisma/client';
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

const mockOtherRequesterUser = {
  id: 6,
  name: 'Bob Requester',
  email: 'bob@company.com',
  role: Role.REQUESTER,
  department: 'Marketing',
  isActive: true,
  mustChangePassword: false,
};

function makeCookie(user: typeof mockStaffUser | typeof mockRequesterUser) {
  const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET);
  return `toktickit_session=${token}`;
}

const mockTicketNoActions = {
  id: 101,
  ticketNumber: 'TCK-101',
  summary: 'Flickering monitor',
  description: 'Display output flickers intermittently',
  requestedPriority: TicketPriority.MEDIUM,
  itPriority: TicketPriority.MEDIUM,
  currentStatus: TicketStatus.OPEN,
  requesterId: 5,
  assignedToId: 2,
  categoryId: 1,
  relatedSystemId: 1,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockTicketResolved = {
  ...mockTicketNoActions,
  id: 102,
  ticketNumber: 'TCK-102',
  currentStatus: TicketStatus.RESOLVED,
};

describe('Resolution Gate & Expanded Status Workflow API', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('Resolution Gate Validation', () => {
    it('blocks resolving a ticket when 0 Action Taken entries exist (400 Bad Request)', async () => {
      vi.spyOn(prisma.user, 'findUnique').mockImplementation((args: any) => {
        const id = args.where.id;
        if (id === 2) return Promise.resolve(mockStaffUser as any);
        return Promise.resolve(null);
      });

      vi.spyOn(prisma.ticket, 'findUnique').mockImplementation((args: any) => {
        if (args.where.id === 101) return Promise.resolve(mockTicketNoActions as any);
        return Promise.resolve(null);
      });

      vi.spyOn(prisma.actionTaken, 'count').mockResolvedValue(0);

      const res = await request(app)
        .patch('/api/tickets/101/status')
        .set('Cookie', makeCookie(mockStaffUser))
        .send({ status: 'RESOLVED' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('ACTION_TAKEN_REQUIRED');
      expect(res.body.message).toMatch(/Action Taken entry is required/i);
    });

    it('allows resolving a ticket when at least 1 Action Taken entry exists (200 OK)', async () => {
      vi.spyOn(prisma.user, 'findUnique').mockImplementation((args: any) => {
        const id = args.where.id;
        if (id === 2) return Promise.resolve(mockStaffUser as any);
        return Promise.resolve(null);
      });

      vi.spyOn(prisma.ticket, 'findUnique').mockImplementation((args: any) => {
        if (args.where.id === 101) return Promise.resolve(mockTicketNoActions as any);
        return Promise.resolve(null);
      });

      vi.spyOn(prisma.actionTaken, 'count').mockResolvedValue(1);

      vi.spyOn(prisma.ticket, 'update').mockImplementation((args: any) => {
        return Promise.resolve({
          ...mockTicketNoActions,
          currentStatus: args.data.currentStatus,
        } as any);
      });

      const res = await request(app)
        .patch('/api/tickets/101/status')
        .set('Cookie', makeCookie(mockStaffUser))
        .send({ status: 'RESOLVED' });

      expect(res.status).toBe(200);
      expect(res.body.currentStatus).toBe('RESOLVED');
    });
  });

  describe('Expanded Status Transitions & Requester Workflow Actions', () => {
    it('allows IT Staff to transition status to WAITING_FOR_REQUESTER', async () => {
      vi.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockStaffUser as any);
      vi.spyOn(prisma.ticket, 'findUnique').mockResolvedValue(mockTicketNoActions as any);
      vi.spyOn(prisma.ticket, 'update').mockImplementation((args: any) => {
        return Promise.resolve({
          ...mockTicketNoActions,
          currentStatus: args.data.currentStatus,
        } as any);
      });

      const res = await request(app)
        .patch('/api/tickets/101/status')
        .set('Cookie', makeCookie(mockStaffUser))
        .send({ status: 'WAITING_FOR_REQUESTER' });

      expect(res.status).toBe(200);
      expect(res.body.currentStatus).toBe('WAITING_FOR_REQUESTER');
    });

    it('allows Requester to cancel their own active ticket', async () => {
      vi.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockRequesterUser as any);
      vi.spyOn(prisma.ticket, 'findUnique').mockResolvedValue(mockTicketNoActions as any);
      vi.spyOn(prisma.ticket, 'update').mockImplementation((args: any) => {
        return Promise.resolve({
          ...mockTicketNoActions,
          currentStatus: args.data.currentStatus,
        } as any);
      });

      const res = await request(app)
        .patch('/api/tickets/101/status')
        .set('Cookie', makeCookie(mockRequesterUser))
        .send({ status: 'CANCELLED' });

      expect(res.status).toBe(200);
      expect(res.body.currentStatus).toBe('CANCELLED');
    });

    it('allows Requester to reopen their own resolved ticket', async () => {
      vi.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockRequesterUser as any);
      vi.spyOn(prisma.ticket, 'findUnique').mockResolvedValue(mockTicketResolved as any);
      vi.spyOn(prisma.ticket, 'update').mockImplementation((args: any) => {
        return Promise.resolve({
          ...mockTicketResolved,
          currentStatus: args.data.currentStatus,
        } as any);
      });

      const res = await request(app)
        .patch('/api/tickets/102/status')
        .set('Cookie', makeCookie(mockRequesterUser))
        .send({ status: 'REOPENED' });

      expect(res.status).toBe(200);
      expect(res.body.currentStatus).toBe('REOPENED');
    });

    it('blocks Requester from attempting forbidden transitions like RESOLVED', async () => {
      vi.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockRequesterUser as any);
      vi.spyOn(prisma.ticket, 'findUnique').mockResolvedValue(mockTicketNoActions as any);

      const res = await request(app)
        .patch('/api/tickets/101/status')
        .set('Cookie', makeCookie(mockRequesterUser))
        .send({ status: 'RESOLVED' });

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/Requesters can only cancel active tickets or reopen/i);
    });

    it('blocks Requester from updating status on another user ticket', async () => {
      vi.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockOtherRequesterUser as any);
      vi.spyOn(prisma.ticket, 'findUnique').mockResolvedValue(mockTicketNoActions as any);

      const res = await request(app)
        .patch('/api/tickets/101/status')
        .set('Cookie', makeCookie(mockOtherRequesterUser))
        .send({ status: 'CANCELLED' });

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/do not have permission/i);
    });
  });
});
