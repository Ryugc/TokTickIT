import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../../src/app';

describe('GET /api/health', () => {
  it('should return HTTP 200 with status ok and service TokTickIT API', async () => {
    const response = await request(app).get('/api/health');

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toMatch(/json/);
    expect(response.body).toEqual({
      status: 'ok',
      service: 'TokTickIT API',
    });
  });
});
