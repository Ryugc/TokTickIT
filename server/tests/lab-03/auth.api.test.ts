import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../../src/app';
import prisma from '../../src/lib/prisma';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Role } from '@prisma/client';
import { JWT_SECRET } from '../../src/middleware/auth';

describe('Lab 3 - Authentication Foundation API Endpoints', () => {
  const validPasswordHash = bcrypt.hashSync('Password123!', 10);

  const mockActiveUser = {
    id: 1,
    name: 'Jennifer Anderson',
    email: 'jennifer.anderson@toktickit.com',
    passwordHash: validPasswordHash,
    role: Role.REQUESTER,
    department: 'Human Resources',
    isActive: true,
    mustChangePassword: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockUserMustChange = {
    id: 2,
    name: 'New Staff',
    email: 'new.staff@toktickit.com',
    passwordHash: validPasswordHash,
    role: Role.IT_STAFF,
    department: 'IT Support',
    isActive: true,
    mustChangePassword: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockInactiveUser = {
    id: 3,
    name: 'Inactive User',
    email: 'inactive.user@toktickit.com',
    passwordHash: validPasswordHash,
    role: Role.REQUESTER,
    department: 'Operations',
    isActive: false,
    mustChangePassword: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('POST /api/auth/login', () => {
    it('should authenticate user with valid credentials and return HTTP 200 with session cookie', async () => {
      vi.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockActiveUser as any);

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'jennifer.anderson@toktickit.com',
          password: 'Password123!',
        });

      expect(response.status).toBe(200);
      expect(response.headers['set-cookie']).toBeDefined();
      expect(response.headers['set-cookie'][0]).toContain('toktickit_session');
      expect(response.body.user).toEqual({
        id: 1,
        name: 'Jennifer Anderson',
        email: 'jennifer.anderson@toktickit.com',
        role: 'REQUESTER',
        department: 'Human Resources',
        isActive: true,
        mustChangePassword: false,
      });
    });

    it('should reject login with HTTP 401 when password is invalid', async () => {
      vi.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockActiveUser as any);

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'jennifer.anderson@toktickit.com',
          password: 'WrongPassword123!',
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('UNAUTHORIZED');
    });

    it('should reject login with HTTP 401 when email is not found', async () => {
      vi.spyOn(prisma.user, 'findUnique').mockResolvedValue(null);

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@toktickit.com',
          password: 'Password123!',
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('UNAUTHORIZED');
    });

    it('should reject login with HTTP 401 when user account is inactive', async () => {
      vi.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockInactiveUser as any);

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'inactive.user@toktickit.com',
          password: 'Password123!',
        });

      expect(response.status).toBe(401);
      expect(response.body.message).toContain('deactivated');
    });
  });

  describe('GET /api/auth/me', () => {
    it('should return HTTP 200 with current user profile when session token cookie is provided', async () => {
      vi.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockActiveUser as any);

      const token = jwt.sign({ id: 1, email: mockActiveUser.email, role: mockActiveUser.role }, JWT_SECRET);

      const response = await request(app)
        .get('/api/auth/me')
        .set('Cookie', [`toktickit_session=${token}`]);

      expect(response.status).toBe(200);
      expect(response.body.user.email).toBe('jennifer.anderson@toktickit.com');
    });

    it('should return HTTP 401 when no session token is provided', async () => {
      const response = await request(app).get('/api/auth/me');
      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should clear session cookie and return HTTP 200', async () => {
      const response = await request(app).post('/api/auth/logout');
      expect(response.status).toBe(200);
      expect(response.body.message).toContain('logged out');
    });
  });

  describe('POST /api/auth/change-password', () => {
    it('should update password hash and set mustChangePassword = false when valid', async () => {
      vi.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockUserMustChange as any);
      vi.spyOn(prisma.user, 'update').mockResolvedValue({
        id: 2,
        email: mockUserMustChange.email,
        mustChangePassword: false,
      } as any);

      const token = jwt.sign({ id: 2, email: mockUserMustChange.email, role: mockUserMustChange.role }, JWT_SECRET);

      const response = await request(app)
        .post('/api/auth/change-password')
        .set('Cookie', [`toktickit_session=${token}`])
        .send({
          currentPassword: 'Password123!',
          newPassword: 'BrandNewSecurePassword99!',
        });

      expect(response.status).toBe(200);
      expect(response.body.user.mustChangePassword).toBe(false);
    });

    it('should return HTTP 400 when new password fails complexity requirements (BR-01)', async () => {
      vi.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockUserMustChange as any);

      const token = jwt.sign({ id: 2, email: mockUserMustChange.email, role: mockUserMustChange.role }, JWT_SECRET);

      const response = await request(app)
        .post('/api/auth/change-password')
        .set('Cookie', [`toktickit_session=${token}`])
        .send({
          currentPassword: 'Password123!',
          newPassword: 'weak', // Fails complexity
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('INVALID_PASSWORD');
    });

    it('should return HTTP 400 when current password is wrong', async () => {
      vi.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockUserMustChange as any);

      const token = jwt.sign({ id: 2, email: mockUserMustChange.email, role: mockUserMustChange.role }, JWT_SECRET);

      const response = await request(app)
        .post('/api/auth/change-password')
        .set('Cookie', [`toktickit_session=${token}`])
        .send({
          currentPassword: 'WrongPassword!',
          newPassword: 'BrandNewSecurePassword99!',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('INVALID_CURRENT_PASSWORD');
    });
  });
});
