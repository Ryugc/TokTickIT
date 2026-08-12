import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import { app } from '../../src/app';
import prisma from '../../src/lib/prisma';

describe('GET /api/categories', () => {
  it('should return HTTP 200 with the list of categories', async () => {
    const mockCategories = [
      { id: 1, name: 'Account and Access' },
      { id: 2, name: 'Hardware' },
      { id: 3, name: 'Software' },
      { id: 4, name: 'Network' },
    ];
    vi.spyOn(prisma.category, 'findMany').mockResolvedValue(mockCategories as any);

    const response = await request(app).get('/api/categories');

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toMatch(/json/);
    expect(response.body).toEqual(mockCategories);
  });
});
