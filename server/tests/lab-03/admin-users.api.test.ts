import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { Role } from '@prisma/client';
import app from '../../src/app';
import prisma from '../../src/lib/prisma';
import { JWT_SECRET } from '../../src/middleware/auth';

const admin = { id: 1, name: 'Super Admin', email: 'admin@toktickit.com', role: Role.ADMIN, department: 'IT Operations', isActive: true, mustChangePassword: false };
const staff = { ...admin, id: 2, role: Role.IT_STAFF, email: 'staff@toktickit.com' };
const requester = { ...admin, id: 3, role: Role.REQUESTER, email: 'requester@company.com' };

const cookieFor = (user: typeof admin) => `toktickit_session=${jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET)}`;
const directoryUser = (overrides = {}) => ({ ...admin, createdAt: new Date(), updatedAt: new Date(), ...overrides });

describe('Administrator user management API', () => {
  beforeEach(() => vi.restoreAllMocks());

  it.each([staff, requester])('rejects $role users with 403', async (user) => {
    vi.spyOn(prisma.user, 'findUnique').mockResolvedValue(user as any);
    const response = await request(app).get('/api/admin/users').set('Cookie', cookieFor(user as any));
    expect(response.status).toBe(403);
  });

  it('lists users with search, role filter, and pagination', async () => {
    vi.spyOn(prisma.user, 'findUnique').mockResolvedValue(admin as any);
    vi.spyOn(prisma.user, 'findMany').mockResolvedValue([directoryUser()] as any);
    vi.spyOn(prisma.user, 'count').mockResolvedValue(1);
    const response = await request(app).get('/api/admin/users?search=super&role=ADMIN&page=2&limit=5').set('Cookie', cookieFor(admin));
    expect(response.status).toBe(200);
    expect(response.body.data[0].passwordHash).toBeUndefined();
    expect(response.body.pagination).toMatchObject({ totalItems: 1, currentPage: 2, limit: 5 });
  });

  it('creates a user with a hashed temporary password and forced change', async () => {
    vi.spyOn(prisma.user, 'findUnique').mockResolvedValueOnce(admin as any).mockResolvedValueOnce(null);
    vi.spyOn(prisma.user, 'create').mockResolvedValue(directoryUser({ id: 4, email: 'new@company.com', mustChangePassword: true }) as any);
    const response = await request(app).post('/api/admin/users').set('Cookie', cookieFor(admin)).send({ name: 'New User', email: 'NEW@company.com', department: 'Sales', role: 'REQUESTER', password: 'TempPassword123!' });
    expect(response.status).toBe(201);
    expect(response.body.mustChangePassword).toBe(true);
    expect(response.body.passwordHash).toBeUndefined();
    expect((prisma.user.create as any).mock.calls[0][0].data.passwordHash).not.toBe('TempPassword123!');
  });

  it('edits another user and blocks self-deactivation', async () => {
    vi.spyOn(prisma.user, 'findUnique').mockResolvedValue(admin as any);
    vi.spyOn(prisma.user, 'update').mockResolvedValue(directoryUser({ name: 'Renamed Admin' }) as any);
    const updated = await request(app).patch('/api/admin/users/2').set('Cookie', cookieFor(admin)).send({ name: 'Renamed Admin' });
    expect(updated.status).toBe(200);
    expect(updated.body.name).toBe('Renamed Admin');

    const blocked = await request(app).patch('/api/admin/users/1').set('Cookie', cookieFor(admin)).send({ isActive: false });
    expect(blocked.status).toBe(400);
    expect(blocked.body.error).toBe('SELF_DEACTIVATION_BLOCKED');
  });

  it('blocks self-demotion and removing the final active admin', async () => {
    vi.spyOn(prisma.user, 'findUnique').mockResolvedValue(admin as any);
    const selfDemotion = await request(app).patch('/api/admin/users/1').set('Cookie', cookieFor(admin)).send({ role: 'REQUESTER' });
    expect(selfDemotion.status).toBe(400);
    expect(selfDemotion.body.error).toBe('SELF_DEMOTION_BLOCKED');

    vi.spyOn(prisma.user, 'findUnique').mockResolvedValueOnce(admin as any).mockResolvedValueOnce({ ...admin, id: 4 } as any);
    vi.spyOn(prisma.user, 'count').mockResolvedValue(1);
    const lastAdmin = await request(app).patch('/api/admin/users/4').set('Cookie', cookieFor(admin)).send({ isActive: false });
    expect(lastAdmin.status).toBe(400);
    expect(lastAdmin.body.error).toBe('ACTIVE_ADMIN_REQUIRED');
  });
});