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

const mockOtherRequesterUser = {
  id: 6,
  name: 'Bob Requester',
  email: 'bob@company.com',
  role: Role.REQUESTER,
  department: 'Marketing',
  isActive: true,
  mustChangePassword: false,
};

function makeCookie(user: typeof mockStaffUser | typeof mockRequesterUser | typeof mockAdminUser) {
  const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET);
  return `toktickit_session=${token}`;
}

describe('Actions Taken API Endpoints', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('GET /api/tickets/:id/actions', () => {
    it('returns actions taken list for IT Staff', async () => {
      vi.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockStaffUser as any);
      vi.spyOn(prisma.ticket, 'findUnique').mockResolvedValue({ id: 101, requesterId: 5 } as any);
      vi.spyOn(prisma.actionTaken, 'findMany').mockResolvedValue([
        {
          id: 'action-1',
          ticketId: 101,
          performedById: 2,
          description: 'Replaced RAM',
          result: 'System booted successfully',
          followUpRequired: false,
          followUpNote: null,
          attachmentNotes: null,
          actionDate: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
          performedBy: { id: 2, name: 'Jane Staff', email: 'staff@toktickit.com', role: Role.IT_STAFF },
        },
      ] as any);

      const res = await request(app)
        .get('/api/tickets/101/actions')
        .set('Cookie', [makeCookie(mockStaffUser)]);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(1);
      expect(res.body[0].description).toBe('Replaced RAM');
    });

    it('allows ticket owner requester to view actions taken', async () => {
      vi.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockRequesterUser as any);
      vi.spyOn(prisma.ticket, 'findUnique').mockResolvedValue({ id: 101, requesterId: 5 } as any);
      vi.spyOn(prisma.actionTaken, 'findMany').mockResolvedValue([
        {
          id: 'action-1',
          ticketId: 101,
          performedById: 2,
          description: 'Replaced RAM',
          result: 'Success',
          performedBy: { id: 2, name: 'Jane Staff', email: 'staff@toktickit.com', role: Role.IT_STAFF },
        },
      ] as any);

      const res = await request(app)
        .get('/api/tickets/101/actions')
        .set('Cookie', [makeCookie(mockRequesterUser)]);

      expect(res.status).toBe(200);
      expect(res.body.length).toBe(1);
    });

    it('blocks non-owner requester with HTTP 403 Forbidden', async () => {
      vi.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockOtherRequesterUser as any);
      vi.spyOn(prisma.ticket, 'findUnique').mockResolvedValue({ id: 101, requesterId: 5 } as any);

      const res = await request(app)
        .get('/api/tickets/101/actions')
        .set('Cookie', [makeCookie(mockOtherRequesterUser)]);

      expect(res.status).toBe(403);
      expect(res.body.error).toBe('FORBIDDEN');
    });

    it('returns HTTP 404 for non-existent ticket', async () => {
      vi.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockStaffUser as any);
      vi.spyOn(prisma.ticket, 'findUnique').mockResolvedValue(null);

      const res = await request(app)
        .get('/api/tickets/999/actions')
        .set('Cookie', [makeCookie(mockStaffUser)]);

      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/tickets/:id/actions', () => {
    it('creates an action taken entry for IT Staff with valid payload', async () => {
      vi.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockStaffUser as any);
      vi.spyOn(prisma.ticket, 'findUnique').mockResolvedValue({ id: 101 } as any);
      vi.spyOn(prisma.actionTaken, 'create').mockResolvedValue({
        id: 'action-123',
        ticketId: 101,
        performedById: 2,
        description: 'Ran network diagnostic',
        result: 'DNS issue identified and resolved',
        followUpRequired: false,
        followUpNote: null,
        attachmentNotes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        performedBy: { id: 2, name: 'Jane Staff', email: 'staff@toktickit.com', role: Role.IT_STAFF },
      } as any);

      const res = await request(app)
        .post('/api/tickets/101/actions')
        .set('Cookie', [makeCookie(mockStaffUser)])
        .send({
          description: 'Ran network diagnostic',
          result: 'DNS issue identified and resolved',
          followUpRequired: false,
        });

      expect(res.status).toBe(201);
      expect(res.body.id).toBe('action-123');
      expect(res.body.description).toBe('Ran network diagnostic');
    });

    it('rejects creation when description or result is missing', async () => {
      vi.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockStaffUser as any);
      vi.spyOn(prisma.ticket, 'findUnique').mockResolvedValue({ id: 101 } as any);

      const res = await request(app)
        .post('/api/tickets/101/actions')
        .set('Cookie', [makeCookie(mockStaffUser)])
        .send({
          description: '   ',
          result: 'Done',
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/Description is required/i);
    });

    it('rejects creation when followUpRequired is true but followUpNote is missing or empty', async () => {
      vi.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockStaffUser as any);
      vi.spyOn(prisma.ticket, 'findUnique').mockResolvedValue({ id: 101 } as any);

      const res = await request(app)
        .post('/api/tickets/101/actions')
        .set('Cookie', [makeCookie(mockStaffUser)])
        .send({
          description: 'Updated BIOS',
          result: 'Success',
          followUpRequired: true,
          followUpNote: '   ',
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/Follow-up note is required/i);
    });

    it('blocks requester from creating action taken with HTTP 403 Forbidden', async () => {
      vi.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockRequesterUser as any);
      vi.spyOn(prisma.ticket, 'findUnique').mockResolvedValue({ id: 101, requesterId: 5 } as any);

      const res = await request(app)
        .post('/api/tickets/101/actions')
        .set('Cookie', [makeCookie(mockRequesterUser)])
        .send({
          description: 'Attempted edit',
          result: 'Fail',
        });

      expect(res.status).toBe(403);
    });

    it('automatically attributes performedById from active user session', async () => {
      vi.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockStaffUser as any);
      vi.spyOn(prisma.ticket, 'findUnique').mockResolvedValue({ id: 101 } as any);

      let createdData: any = null;
      vi.spyOn(prisma.actionTaken, 'create').mockImplementation((args: any) => {
        createdData = args.data;
        return Promise.resolve({ id: 'action-99', ...args.data } as any);
      });

      const res = await request(app)
        .post('/api/tickets/101/actions')
        .set('Cookie', [makeCookie(mockStaffUser)])
        .send({
          description: 'System check',
          result: 'All ok',
          performedById: 9999, // User spoof attempt should be overridden
        });

      expect(res.status).toBe(201);
      expect(createdData.performedById).toBe(2); // must equal mockStaffUser.id
    });
  });

  describe('PATCH /api/actions/:id', () => {
    it('allows IT Staff to update an action taken entry', async () => {
      vi.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockStaffUser as any);
      vi.spyOn(prisma.actionTaken, 'findUnique').mockResolvedValue({
        id: 'action-123',
        description: 'Old desc',
        result: 'Old res',
        followUpRequired: false,
        followUpNote: null,
      } as any);

      vi.spyOn(prisma.actionTaken, 'update').mockResolvedValue({
        id: 'action-123',
        description: 'Updated desc',
        result: 'Updated res',
        followUpRequired: false,
        followUpNote: null,
      } as any);

      const res = await request(app)
        .patch('/api/actions/action-123')
        .set('Cookie', [makeCookie(mockStaffUser)])
        .send({
          description: 'Updated desc',
          result: 'Updated res',
        });

      expect(res.status).toBe(200);
      expect(res.body.description).toBe('Updated desc');
    });

    it('rejects patch when followUpRequired is updated to true without followUpNote', async () => {
      vi.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockStaffUser as any);
      vi.spyOn(prisma.actionTaken, 'findUnique').mockResolvedValue({
        id: 'action-123',
        description: 'Old desc',
        result: 'Old res',
        followUpRequired: false,
        followUpNote: null,
      } as any);

      const res = await request(app)
        .patch('/api/actions/action-123')
        .set('Cookie', [makeCookie(mockStaffUser)])
        .send({
          followUpRequired: true,
          followUpNote: '',
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/Follow-up note is required/i);
    });

    it('blocks Requester from modifying action entry with HTTP 403 Forbidden', async () => {
      vi.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockRequesterUser as any);

      const res = await request(app)
        .patch('/api/actions/action-123')
        .set('Cookie', [makeCookie(mockRequesterUser)])
        .send({ description: 'Hacked' });

      expect(res.status).toBe(403);
    });
  });
});
