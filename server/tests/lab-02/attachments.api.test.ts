import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import fs from 'fs';
import path from 'path';
import app from '../../src/app';
import prisma from '../../src/lib/prisma';

describe('Attachment API (Soft Removal, Downloads & Upload Limits)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('DELETE /api/attachments/:id (Soft Removal)', () => {
    it('should soft-remove attachment and return 200 OK when valid removalReason is provided', async () => {
      const mockAttachment = {
        id: 10,
        fileName: 'confidential.pdf',
        fileType: 'application/pdf',
        fileSize: 1024,
        storagePath: 'uploads/test.pdf',
        isRemoved: false,
        removalReason: null,
        ticketId: 101,
        ticket: { id: 101, requesterId: 1 },
      };

      const mockUpdatedAttachment = {
        ...mockAttachment,
        isRemoved: true,
        removalReason: 'Uploaded by mistake containing outdated specs',
      };

      vi.spyOn(prisma.attachment, 'findUnique').mockResolvedValue(mockAttachment as any);
      vi.spyOn(prisma.attachment, 'update').mockResolvedValue(mockUpdatedAttachment as any);

      const res = await request(app)
        .delete('/api/attachments/10')
        .set('X-Requester-Id', '1')
        .send({ removalReason: 'Uploaded by mistake containing outdated specs' });

      expect(res.status).toBe(200);
      expect(res.body.isRemoved).toBe(true);
      expect(res.body.removalReason).toBe('Uploaded by mistake containing outdated specs');
    });

    it('should return 400 Bad Request when removalReason is missing or empty', async () => {
      const res = await request(app)
        .delete('/api/attachments/10')
        .set('X-Requester-Id', '1')
        .send({ removalReason: '   ' });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/Removal reason is required/i);
    });

    it('should return 403 Forbidden when deleting attachment belonging to another requester', async () => {
      const mockAttachment = {
        id: 10,
        ticket: { id: 101, requesterId: 1 }, // Owned by requester 1
      };

      vi.spyOn(prisma.attachment, 'findUnique').mockResolvedValue(mockAttachment as any);

      // Requester 2 attempts deletion
      const res = await request(app)
        .delete('/api/attachments/10')
        .set('X-Requester-Id', '2')
        .send({ removalReason: 'Obsolete file' });

      expect(res.status).toBe(403);
      expect(res.body.error).toMatch(/Forbidden/i);
    });
  });

  describe('GET /api/attachments/:id/download (File Download & Soft Removal Enforcement)', () => {
    it('should stream active attachment file bytes for owned ticket', async () => {
      const tempFilePath = path.join(__dirname, 'temp_test_download.pdf');
      fs.writeFileSync(tempFilePath, 'dummy file bytes');

      const mockAttachment = {
        id: 10,
        fileName: 'test-doc.pdf',
        fileType: 'application/pdf',
        fileSize: 16,
        storagePath: tempFilePath,
        isRemoved: false,
        removalReason: null,
        ticket: { id: 101, requesterId: 1 },
      };

      vi.spyOn(prisma.attachment, 'findUnique').mockResolvedValue(mockAttachment as any);

      const res = await request(app)
        .get('/api/attachments/10/download')
        .set('X-Requester-Id', '1');

      if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);

      expect(res.status).toBe(200);
    });

    it('should return 410 Gone when attempting to download a soft-removed attachment', async () => {
      const mockAttachment = {
        id: 10,
        fileName: 'test-doc.pdf',
        fileType: 'application/pdf',
        fileSize: 16,
        storagePath: 'uploads/test.pdf',
        isRemoved: true,
        removalReason: 'Deprecated documentation',
        ticket: { id: 101, requesterId: 1 },
      };

      vi.spyOn(prisma.attachment, 'findUnique').mockResolvedValue(mockAttachment as any);

      const res = await request(app)
        .get('/api/attachments/10/download')
        .set('X-Requester-Id', '1');

      expect(res.status).toBe(410);
      expect(res.body.error).toMatch(/Attachment has been removed/i);
    });

    it('should return 403 Forbidden when downloading attachment owned by another requester', async () => {
      const mockAttachment = {
        id: 10,
        isRemoved: false,
        ticket: { id: 101, requesterId: 1 },
      };

      vi.spyOn(prisma.attachment, 'findUnique').mockResolvedValue(mockAttachment as any);

      const res = await request(app)
        .get('/api/attachments/10/download')
        .set('X-Requester-Id', '2');

      expect(res.status).toBe(403);
      expect(res.body.error).toMatch(/Forbidden/i);
    });
  });

  describe('Upload Limits (Max 5 active attachments, 5MB limit, allowed MIME types)', () => {
    it('should return 400 Bad Request when 5 active attachments exist', async () => {
      const mockTicket = { id: 101, requesterId: 1 };
      vi.spyOn(prisma.ticket, 'findUnique').mockResolvedValue(mockTicket as any);
      vi.spyOn(prisma.attachment, 'count').mockResolvedValue(5);

      const res = await request(app)
        .post('/api/tickets/101/attachments')
        .set('X-Requester-Id', '1')
        .attach('file', Buffer.from('file content'), '6th_file.png');

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/Maximum active attachments limit reached/i);
    });
  });
});
