import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../../src/app';
import prisma from '../../src/lib/prisma';

describe('POST /api/tickets & Attachment Upload API', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('POST /api/tickets', () => {
    it('should create a ticket for valid input and return 201 Created with generated ticketNumber and currentStatus NEW', async () => {
      const mockRequester = {
        id: 1,
        name: 'Jennifer Anderson',
        email: 'jennifer.anderson@toktickit.com',
        department: 'Human Resources',
        isActive: true,
      };

      const mockCategory = { id: 2, name: 'Hardware' };
      const mockSystem = { id: 5, name: 'Workstation Hardware' };

      const mockCreatedTicket = {
        id: 101,
        ticketNumber: 'TKT-2026-123456',
        summary: 'Screen flickers when connected to dock',
        description: 'The monitor loses connection randomly when connected via USB-C.',
        requestedPriority: 'HIGH',
        currentStatus: 'NEW',
        requesterId: 1,
        categoryId: 2,
        relatedSystemId: 5,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      vi.spyOn(prisma.requesterUser, 'findUnique').mockResolvedValue(mockRequester as any);
      vi.spyOn(prisma.category, 'findUnique').mockResolvedValue(mockCategory as any);
      vi.spyOn(prisma.relatedSystem, 'findUnique').mockResolvedValue(mockSystem as any);
      vi.spyOn(prisma.ticket, 'findUnique').mockResolvedValue(null);
      vi.spyOn(prisma.ticket, 'create').mockResolvedValue(mockCreatedTicket as any);

      const response = await request(app)
        .post('/api/tickets')
        .set('X-Requester-Id', '1')
        .send({
          summary: 'Screen flickers when connected to dock',
          description: 'The monitor loses connection randomly when connected via USB-C.',
          categoryId: 2,
          relatedSystemId: 5,
          requestedPriority: 'HIGH',
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('ticketNumber');
      expect(response.body.ticketNumber).toMatch(/^TKT-2026-\d{6}$/);
      expect(response.body.currentStatus).toBe('NEW');
      expect(response.body.summary).toBe('Screen flickers when connected to dock');
    });

    it('should return 400 Bad Request when X-Requester-Id header is missing', async () => {
      const response = await request(app)
        .post('/api/tickets')
        .send({
          summary: 'VPN disconnects constantly',
          description: 'Connection drops every 5 minutes.',
          categoryId: 4,
          relatedSystemId: 3,
          requestedPriority: 'MEDIUM',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toMatch(/Missing X-Requester-Id header/i);
    });

    it('should return 400 Bad Request when summary is missing or empty', async () => {
      const mockRequester = { id: 1, isActive: true };
      vi.spyOn(prisma.requesterUser, 'findUnique').mockResolvedValue(mockRequester as any);

      const response = await request(app)
        .post('/api/tickets')
        .set('X-Requester-Id', '1')
        .send({
          summary: '   ',
          description: 'Valid description text here.',
          categoryId: 1,
          relatedSystemId: 1,
          requestedPriority: 'LOW',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toMatch(/Summary is required/i);
    });

    it('should return 400 Bad Request when description is missing or empty', async () => {
      const mockRequester = { id: 1, isActive: true };
      vi.spyOn(prisma.requesterUser, 'findUnique').mockResolvedValue(mockRequester as any);

      const response = await request(app)
        .post('/api/tickets')
        .set('X-Requester-Id', '1')
        .send({
          summary: 'Valid Summary',
          description: '',
          categoryId: 1,
          relatedSystemId: 1,
          requestedPriority: 'LOW',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toMatch(/Description is required/i);
    });
  });

  describe('POST /api/tickets/:id/attachments', () => {
    it('should upload attachment for owned ticket and return 201 Created', async () => {
      const mockTicket = {
        id: 101,
        ticketNumber: 'TKT-2026-123456',
        requesterId: 1,
      };

      const mockAttachment = {
        id: 1,
        fileName: 'screenshot.png',
        fileType: 'image/png',
        fileSize: 1024,
        storagePath: 'uploads/file-123.png',
        isRemoved: false,
        removalReason: null,
        ticketId: 101,
        createdAt: new Date().toISOString(),
      };

      vi.spyOn(prisma.ticket, 'findUnique').mockResolvedValue(mockTicket as any);
      vi.spyOn(prisma.attachment, 'count').mockResolvedValue(0);
      vi.spyOn(prisma.attachment, 'create').mockResolvedValue(mockAttachment as any);

      const response = await request(app)
        .post('/api/tickets/101/attachments')
        .set('X-Requester-Id', '1')
        .attach('file', Buffer.from('fake image content'), 'screenshot.png');

      expect(response.status).toBe(201);
      expect(response.body.fileName).toBe('screenshot.png');
      expect(response.body.ticketId).toBe(101);
    });

    it('should return 403 Forbidden when uploading attachment to ticket owned by another requester', async () => {
      const mockTicket = {
        id: 101,
        ticketNumber: 'TKT-2026-123456',
        requesterId: 1, // Owned by requester 1
      };

      vi.spyOn(prisma.ticket, 'findUnique').mockResolvedValue(mockTicket as any);

      // Requester 2 attempts to upload
      const response = await request(app)
        .post('/api/tickets/101/attachments')
        .set('X-Requester-Id', '2')
        .attach('file', Buffer.from('fake image content'), 'screenshot.png');

      expect(response.status).toBe(403);
      expect(response.body.error).toMatch(/Forbidden/i);
    });

    it('should return 400 Bad Request when uploading invalid file type (.exe)', async () => {
      const mockTicket = { id: 101, requesterId: 1 };
      vi.spyOn(prisma.ticket, 'findUnique').mockResolvedValue(mockTicket as any);

      const response = await request(app)
        .post('/api/tickets/101/attachments')
        .set('X-Requester-Id', '1')
        .attach('file', Buffer.from('executable binary'), {
          filename: 'malware.exe',
          contentType: 'application/x-msdownload',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toMatch(/Invalid file type/i);
    });

    it('should return 400 Bad Request when active attachments limit (5) is reached', async () => {
      const mockTicket = { id: 101, requesterId: 1 };
      vi.spyOn(prisma.ticket, 'findUnique').mockResolvedValue(mockTicket as any);
      vi.spyOn(prisma.attachment, 'count').mockResolvedValue(5); // 5 active attachments exist

      const response = await request(app)
        .post('/api/tickets/101/attachments')
        .set('X-Requester-Id', '1')
        .attach('file', Buffer.from('fake image content'), 'extra.png');

      expect(response.status).toBe(400);
      expect(response.body.error).toMatch(/Maximum active attachments limit/i);
    });

    it('should return 400 Bad Request when file size exceeds 5MB limit', async () => {
      const mockTicket = { id: 101, requesterId: 1 };
      vi.spyOn(prisma.ticket, 'findUnique').mockResolvedValue(mockTicket as any);

      // Create dummy buffer > 5MB
      const largeBuffer = Buffer.alloc(5 * 1024 * 1024 + 100);

      const response = await request(app)
        .post('/api/tickets/101/attachments')
        .set('X-Requester-Id', '1')
        .attach('file', largeBuffer, 'large-file.pdf');

      expect(response.status).toBe(400);
      expect(response.body.error).toMatch(/File size exceeds/i);
    });
  });
});
