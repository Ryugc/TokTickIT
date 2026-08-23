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
      const existing = await prisma.ticket.findUnique({ where: { ticketNumber: candidate } });
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
        if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        return res.status(400).json({ error: 'Missing X-Requester-Id header' });
      }
      const requesterId = Number(requesterIdHeader);
      if (isNaN(requesterId) || requesterId <= 0) {
        if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        return res.status(400).json({ error: 'Invalid X-Requester-Id header' });
      }

      const ticketId = Number(req.params.id);
      if (isNaN(ticketId)) {
        if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        return res.status(400).json({ error: 'Invalid ticket ID' });
      }

      const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
      if (!ticket) {
        if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        return res.status(404).json({ error: 'Ticket not found' });
      }

      if (ticket.requesterId !== requesterId) {
        if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        return res.status(403).json({ error: 'Forbidden: Ticket does not belong to requester' });
      }

      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      if (!PERMITTED_MIME_TYPES.includes(req.file.mimetype)) {
        if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        return res.status(400).json({ error: 'Invalid file type. Allowed: JPG, PNG, WEBP, PDF' });
      }

      const activeAttachmentsCount = await prisma.attachment.count({
        where: { ticketId, isRemoved: false },
      });

      if (activeAttachmentsCount >= 5) {
        if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        return res.status(400).json({ error: 'Maximum active attachments limit reached' });
      }

      const attachment = await prisma.attachment.create({
        data: {
          fileName: req.file.originalname,
          fileType: req.file.mimetype,
          fileSize: req.file.size,
          storagePath: req.file.path,
          ticketId,
        },
      });

      return res.status(201).json(attachment);
    } catch (error) {
      if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      return res.status(500).json({ error: 'Failed to upload attachment' });
    }
  });
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


