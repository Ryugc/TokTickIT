import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import { TicketPriority, TicketStatus } from '@prisma/client';
import prisma from './lib/prisma';

dotenv.config();

export const app = express();

app.use(cors());
app.use(express.json());

const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
});

const PERMITTED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

// Health check endpoint
app.get('/api/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    service: 'TokTickIT API',
  });
});

// Categories list endpoint
app.get('/api/categories', async (_req: Request, res: Response) => {
  try {
    const categories = await prisma.category.findMany({
      select: {
        id: true,
        name: true,
      },
      orderBy: {
        id: 'asc',
      },
    });
    res.status(200).json(categories);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// Related systems list endpoint
app.get('/api/related-systems', async (_req: Request, res: Response) => {
  try {
    const systems = await prisma.relatedSystem.findMany({
      select: {
        id: true,
        name: true,
      },
      orderBy: {
        id: 'asc',
      },
    });
    res.status(200).json(systems);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch related systems' });
  }
});

// Requesters list endpoint (active only, ordered by name)
app.get('/api/requesters', async (_req: Request, res: Response) => {
  try {
    const requesters = await prisma.requesterUser.findMany({
      where: {
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        department: true,
        isActive: true,
      },
      orderBy: {
        name: 'asc',
      },
    });
    res.status(200).json(requesters);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch requesters' });
  }
});

// Create ticket endpoint
app.post('/api/tickets', async (req: Request, res: Response) => {
  try {
    const requesterIdHeader = req.headers['x-requester-id'];
    if (!requesterIdHeader) {
      return res.status(400).json({ error: 'Missing X-Requester-Id header' });
    }
    const requesterId = Number(requesterIdHeader);
    if (isNaN(requesterId) || requesterId <= 0) {
      return res.status(400).json({ error: 'Invalid X-Requester-Id header' });
    }

    const requester = await prisma.requesterUser.findUnique({
      where: { id: requesterId },
    });
    if (!requester || !requester.isActive) {
      return res.status(400).json({ error: 'Invalid or inactive requester' });
    }

    const { summary, description, categoryId, relatedSystemId, requestedPriority } = req.body;

    if (!summary || typeof summary !== 'string' || summary.trim() === '') {
      return res.status(400).json({ error: 'Summary is required' });
    }

    if (!description || typeof description !== 'string' || description.trim() === '') {
      return res.status(400).json({ error: 'Description is required' });
    }

    const numCategoryId = Number(categoryId);
    const numRelatedSystemId = Number(relatedSystemId);

    if (!numCategoryId || isNaN(numCategoryId)) {
      return res.status(400).json({ error: 'Valid categoryId is required' });
    }

    if (!numRelatedSystemId || isNaN(numRelatedSystemId)) {
      return res.status(400).json({ error: 'Valid relatedSystemId is required' });
    }

    const validPriorities = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];
    const priorityUpper = (requestedPriority || '').toString().toUpperCase();
    if (!validPriorities.includes(priorityUpper)) {
      return res.status(400).json({ error: 'Invalid requestedPriority' });
    }

    const year = new Date().getFullYear();
    let ticketNumber = '';
    let attempts = 0;
    while (attempts < 10) {
      const randomPart = Math.floor(100000 + Math.random() * 900000).toString();
      const candidate = `TKT-${year}-${randomPart}`;
      const existing = await prisma.ticket.findFirst({ where: { ticketNumber: candidate } });
      if (!existing) {
        ticketNumber = candidate;
        break;
      }
      attempts++;
    }

    if (!ticketNumber) {
      ticketNumber = `TKT-${year}-${Date.now().toString().slice(-6)}`;
    }

    const newTicket = await prisma.ticket.create({
      data: {
        ticketNumber,
        summary: summary.trim(),
        description: description.trim(),
        requestedPriority: priorityUpper as TicketPriority,
        currentStatus: TicketStatus.NEW,
        requesterId,
        categoryId: numCategoryId,
        relatedSystemId: numRelatedSystemId,
      },
    });

    return res.status(201).json(newTicket);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to create ticket' });
  }
});

// Upload attachment endpoint
const uploadSingleFile = upload.single('file');

app.post('/api/tickets/:id/attachments', (req: Request, res: Response) => {
  uploadSingleFile(req, res, async (err) => {
    const file = (req as any).file;

    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'File size exceeds maximum limit of 5MB' });
      }
      return res.status(400).json({ error: err.message });
    } else if (err) {
      return res.status(400).json({ error: err.message });
    }

    try {
      const requesterIdHeader = req.headers['x-requester-id'];
      if (!requesterIdHeader) {
        if (file && fs.existsSync(file.path)) fs.unlinkSync(file.path);
        return res.status(400).json({ error: 'Missing X-Requester-Id header' });
      }
      const requesterId = Number(requesterIdHeader);
      if (isNaN(requesterId) || requesterId <= 0) {
        if (file && fs.existsSync(file.path)) fs.unlinkSync(file.path);
        return res.status(400).json({ error: 'Invalid X-Requester-Id header' });
      }

      const ticketId = Number(req.params.id);
      if (isNaN(ticketId)) {
        if (file && fs.existsSync(file.path)) fs.unlinkSync(file.path);
        return res.status(400).json({ error: 'Invalid ticket ID' });
      }

      const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
      if (!ticket) {
        if (file && fs.existsSync(file.path)) fs.unlinkSync(file.path);
        return res.status(404).json({ error: 'Ticket not found' });
      }

      if (ticket.requesterId !== requesterId) {
        if (file && fs.existsSync(file.path)) fs.unlinkSync(file.path);
        return res.status(403).json({ error: 'Forbidden: Ticket does not belong to requester' });
      }

      if (!file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      if (!PERMITTED_MIME_TYPES.includes(file.mimetype)) {
        if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
        return res.status(400).json({ error: 'Invalid file type. Allowed: JPG, PNG, WEBP, PDF' });
      }

      const activeAttachmentsCount = await prisma.attachment.count({
        where: { ticketId, isRemoved: false },
      });

      if (activeAttachmentsCount >= 5) {
        if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
        return res.status(400).json({ error: 'Maximum active attachments limit reached' });
      }

      const attachment = await prisma.attachment.create({
        data: {
          fileName: file.originalname,
          fileType: file.mimetype,
          fileSize: file.size,
          storagePath: file.path,
          ticketId,
        },
      });

      return res.status(201).json(attachment);
    } catch (error) {
      if (file && fs.existsSync(file.path)) fs.unlinkSync(file.path);
      return res.status(500).json({ error: 'Failed to upload attachment' });
    }
  });
});

// GET /api/tickets — Paginated, filtered, searchable ticket list for the active requester
app.get('/api/tickets', async (req: Request, res: Response) => {
  try {
    // --- Identity resolution ---
    const requesterIdHeader = req.headers['x-requester-id'];
    if (!requesterIdHeader) {
      return res.status(400).json({ error: 'Missing X-Requester-Id header' });
    }
    const requesterId = Number(requesterIdHeader);
    if (isNaN(requesterId) || requesterId <= 0) {
      return res.status(400).json({ error: 'Invalid X-Requester-Id header' });
    }

    const requester = await prisma.requesterUser.findUnique({ where: { id: requesterId } });
    if (!requester || !requester.isActive) {
      return res.status(400).json({ error: 'Invalid or inactive requester' });
    }

    // --- Query params ---
    const {
      search,
      categoryId,
      requestedPriority,
      currentStatus,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      page = '1',
      limit = '10',
    } = req.query as Record<string, string>;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 10));
    const skip = (pageNum - 1) * limitNum;

    // Allowed sort fields whitelist (prevents injection)
    const allowedSortFields = ['createdAt', 'updatedAt', 'currentStatus', 'requestedPriority'];
    const resolvedSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'createdAt';
    const resolvedSortOrder: 'asc' | 'desc' = sortOrder === 'asc' ? 'asc' : 'desc';

    // --- Build where clause ---
    const where: Record<string, unknown> = { requesterId };

    if (categoryId) {
      const numCategoryId = parseInt(categoryId, 10);
      if (!isNaN(numCategoryId) && numCategoryId > 0) {
        where.categoryId = numCategoryId;
      }
    }

    if (requestedPriority) {
      const validPriorities = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];
      const upperPriority = requestedPriority.toUpperCase();
      if (validPriorities.includes(upperPriority)) {
        where.requestedPriority = upperPriority;
      }
    }

    if (currentStatus) {
      const validStatuses = ['NEW', 'OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];
      const upperStatus = currentStatus.toUpperCase();
      if (validStatuses.includes(upperStatus)) {
        where.currentStatus = upperStatus;
      }
    }

    if (search && search.trim() !== '') {
      where.OR = [
        { summary: { contains: search.trim(), mode: 'insensitive' } },
        { ticketNumber: { contains: search.trim(), mode: 'insensitive' } },
      ];
    }

    // --- Execute queries ---
    const [tickets, total] = await Promise.all([
      prisma.ticket.findMany({
        where,
        orderBy: { [resolvedSortBy]: resolvedSortOrder },
        skip,
        take: limitNum,
        include: {
          category: { select: { id: true, name: true } },
          relatedSystem: { select: { id: true, name: true } },
        },
      }),
      prisma.ticket.count({ where }),
    ]);

    const totalPages = total === 0 ? 0 : Math.ceil(total / limitNum);

    return res.status(200).json({
      data: tickets,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages,
      },
    });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch tickets' });
  }
});

// GET /api/tickets/:id — Retrieve full ticket detail for an owned ticket
app.get('/api/tickets/:id', async (req: Request, res: Response) => {
  try {
    const requesterIdHeader = req.headers['x-requester-id'];
    if (!requesterIdHeader) {
      return res.status(400).json({ error: 'Missing X-Requester-Id header' });
    }
    const requesterId = Number(requesterIdHeader);
    if (isNaN(requesterId) || requesterId <= 0) {
      return res.status(400).json({ error: 'Invalid X-Requester-Id header' });
    }

    const ticketId = Number(req.params.id);
    if (isNaN(ticketId) || ticketId <= 0) {
      return res.status(400).json({ error: 'Invalid ticket ID' });
    }

    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        category: { select: { id: true, name: true } },
        relatedSystem: { select: { id: true, name: true } },
        requesterUser: { select: { id: true, name: true, email: true, department: true } },
        attachments: {
          select: {
            id: true,
            fileName: true,
            fileType: true,
            fileSize: true,
            isRemoved: true,
            removalReason: true,
            createdAt: true,
          },
          orderBy: { id: 'asc' },
        },
      },
    });

    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    if (ticket.requesterId !== requesterId) {
      return res.status(403).json({ error: 'Forbidden: Ticket does not belong to requester' });
    }

    return res.status(200).json(ticket);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch ticket details' });
  }
});

// DELETE /api/attachments/:id — Soft-remove attachment with mandatory removalReason
app.delete('/api/attachments/:id', async (req: Request, res: Response) => {
  try {
    const requesterIdHeader = req.headers['x-requester-id'];
    if (!requesterIdHeader) {
      return res.status(400).json({ error: 'Missing X-Requester-Id header' });
    }
    const requesterId = Number(requesterIdHeader);
    if (isNaN(requesterId) || requesterId <= 0) {
      return res.status(400).json({ error: 'Invalid X-Requester-Id header' });
    }

    const attachmentId = Number(req.params.id);
    if (isNaN(attachmentId) || attachmentId <= 0) {
      return res.status(400).json({ error: 'Invalid attachment ID' });
    }

    const { removalReason } = req.body || {};
    if (!removalReason || typeof removalReason !== 'string' || removalReason.trim() === '') {
      return res.status(400).json({ error: 'Removal reason is required' });
    }

    const attachment = await prisma.attachment.findUnique({
      where: { id: attachmentId },
      include: { ticket: true },
    });

    if (!attachment) {
      return res.status(404).json({ error: 'Attachment not found' });
    }

    if (attachment.ticket.requesterId !== requesterId) {
      return res.status(403).json({ error: 'Forbidden: Ticket does not belong to requester' });
    }

    const updatedAttachment = await prisma.attachment.update({
      where: { id: attachmentId },
      data: {
        isRemoved: true,
        removalReason: removalReason.trim(),
      },
    });

    return res.status(200).json(updatedAttachment);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to remove attachment' });
  }
});

// GET /api/attachments/:id/download — Stream active attachment bytes
app.get('/api/attachments/:id/download', async (req: Request, res: Response) => {
  try {
    const requesterIdHeader = req.headers['x-requester-id'] || req.query.requesterId;
    if (!requesterIdHeader) {
      return res.status(400).json({ error: 'Missing X-Requester-Id header' });
    }
    const requesterId = Number(requesterIdHeader);
    if (isNaN(requesterId) || requesterId <= 0) {
      return res.status(400).json({ error: 'Invalid X-Requester-Id header' });
    }

    const attachmentId = Number(req.params.id);
    if (isNaN(attachmentId) || attachmentId <= 0) {
      return res.status(400).json({ error: 'Invalid attachment ID' });
    }

    const attachment = await prisma.attachment.findUnique({
      where: { id: attachmentId },
      include: { ticket: true },
    });

    if (!attachment) {
      return res.status(404).json({ error: 'Attachment not found' });
    }

    if (attachment.ticket.requesterId !== requesterId) {
      return res.status(403).json({ error: 'Forbidden: Ticket does not belong to requester' });
    }

    if (attachment.isRemoved) {
      return res.status(410).json({ error: 'Attachment has been removed' });
    }

    if (!fs.existsSync(attachment.storagePath)) {
      return res.status(404).json({ error: 'Attachment file not found on disk' });
    }

    return res.download(attachment.storagePath, attachment.fileName);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to download attachment' });
  }
});

// Root API welcome endpoint
app.get('/api', (_req: Request, res: Response) => {
  res.json({
    message: 'Welcome to TokTickIT API',
    version: '0.1.0',
    endpoints: {
      health: '/api/health',
      categories: '/api/categories',
      relatedSystems: '/api/related-systems',
      requesters: '/api/requesters',
      tickets: '/api/tickets',
    },
  });
});

export default app;


