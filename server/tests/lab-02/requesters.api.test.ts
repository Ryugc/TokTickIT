import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../../src/app';
import prisma from '../../src/lib/prisma';

describe('GET /api/requesters', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('should return HTTP 200 with list of active requesters ordered by name', async () => {
    const mockActiveRequesters = [
      {
        id: 3,
        name: 'David Lee',
        email: 'david.lee@toktickit.com',
        department: 'Finance',
        isActive: true,
      },
      {
        id: 1,
        name: 'Jennifer Anderson',
        email: 'jennifer.anderson@toktickit.com',
        department: 'Human Resources',
        isActive: true,
      },
      {
        id: 4,
        name: 'Michael Brown',
        email: 'michael.brown@toktickit.com',
        department: 'Marketing',
        isActive: true,
      },
      {
        id: 2,
        name: 'Sarah Johnson',
        email: 'sarah.johnson@toktickit.com',
        department: 'Engineering',
        isActive: true,
      },
    ];

    const spy = vi
      .spyOn(prisma.requesterUser, 'findMany')
      .mockResolvedValue(mockActiveRequesters as any);

    const response = await request(app).get('/api/requesters');

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toMatch(/json/);
    expect(response.body).toEqual(mockActiveRequesters);
    expect(spy).toHaveBeenCalledWith({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        email: true,
        department: true,
        isActive: true,
      },
      orderBy: { name: 'asc' },
    });
  });

  it('should filter out inactive users and only contain active requesters', async () => {
    const mockActiveRequesters = [
      {
        id: 1,
        name: 'Jennifer Anderson',
        email: 'jennifer.anderson@toktickit.com',
        department: 'Human Resources',
        isActive: true,
      },
    ];

    vi.spyOn(prisma.requesterUser, 'findMany').mockResolvedValue(mockActiveRequesters as any);

    const response = await request(app).get('/api/requesters');

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.every((req: any) => req.isActive === true)).toBe(true);
    expect(response.body.some((req: any) => req.name === 'Inactive Test User')).toBe(false);
  });

  it('should return HTTP 500 when database operation fails', async () => {
    vi.spyOn(prisma.requesterUser, 'findMany').mockRejectedValue(new Error('Database error'));

    const response = await request(app).get('/api/requesters');

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: 'Failed to fetch requesters' });
  });
});
