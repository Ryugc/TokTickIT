import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import cookieParser from 'cookie-parser';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { TicketPriority, TicketStatus, Role } from '@prisma/client';
import prisma from './lib/prisma';
import { authMiddleware, requirePasswordChangeCheck, JWT_SECRET } from './middleware/auth';

dotenv.config();

export const app = express();

app.use(cors());
app.use(express.json());
app.use(cookieParser());

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

const VALID_TICKET_PRIORITIES = Object.values(TicketPriority);
const STATUS_TRANSITIONS: Record<string, string[]> = {
  NEW: ['OPEN', 'IN_PROGRESS', 'CLOSED'],
  OPEN: ['IN_PROGRESS', 'RESOLVED', 'CLOSED'],
  IN_PROGRESS: ['RESOLVED', 'CLOSED'],
  RESOLVED: ['CLOSED', 'OPEN'],
  CLOSED: ['OPEN'],
};

const isStaffRole = (role?: Role) => role === Role.IT_STAFF || role === Role.ADMIN;

const isValidPassword = (password: unknown): password is string => {
  return typeof password === 'string'
    && password.length >= 8
    && /[A-Z]/.test(password)
    && /[a-z]/.test(password)
    && /[0-9]/.test(password)
    && /[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(password);
};

const userSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  department: true,
  isActive: true,
  mustChangePassword: true,
  createdAt: true,
  updatedAt: true,
} as const;

const isValidTicketStatus = (value: unknown): value is TicketStatus => {
  if (typeof value !== 'string') return false;
  return Object.values(TicketStatus).includes(value.toUpperCase() as TicketStatus);
};

const isValidTicketPriority = (value: unknown): value is TicketPriority => {
  if (typeof value !== 'string') return false;
  return VALID_TICKET_PRIORITIES.includes(value.toUpperCase() as TicketPriority);
};

const normalizeStatus = (value: unknown): TicketStatus | null => {
  if (typeof value !== 'string') return null;
  const upperValue = value.trim().toUpperCase();
  if (Object.values(TicketStatus).includes(upperValue as TicketStatus)) {
    return upperValue as TicketStatus;
  }
  return null;
};

const isValidStatusTransition = (currentStatus: string, targetStatus: string) => {
  if (currentStatus === targetStatus) return true;
  const allowedTransitions = STATUS_TRANSITIONS[currentStatus] || [];
  return allowedTransitions.includes(targetStatus);
};

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

// -------------------------------------------------------------
// Authentication Routes
// -------------------------------------------------------------

// POST /api/auth/login
app.post('/api/auth/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(401).json({ error: 'UNAUTHORIZED', message: 'Email and password are required.' });
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (!user) {
      return res.status(401).json({ error: 'UNAUTHORIZED', message: 'Invalid email or password credentials.' });
    }

    if (!user.isActive) {
      return res.status(401).json({ error: 'UNAUTHORIZED', message: 'Account is deactivated.' });
    }

    const passwordValid = bcrypt.compareSync(password, user.passwordHash);
    if (!passwordValid) {
      return res.status(401).json({ error: 'UNAUTHORIZED', message: 'Invalid email or password credentials.' });
    }

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, {
      expiresIn: '8h',
    });

    res.cookie('toktickit_session', token, {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 8 * 60 * 60 * 1000,
    });

    return res.status(200).json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        isActive: user.isActive,
        mustChangePassword: user.mustChangePassword,
      },
    });
  } catch (error) {
    return res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Login failed due to a server error.' });
  }
});

// POST /api/auth/logout
app.post('/api/auth/logout', (_req: Request, res: Response) => {
  res.clearCookie('toktickit_session');
  return res.status(200).json({ message: 'Successfully logged out.' });
});

// GET /api/auth/me
app.get('/api/auth/me', authMiddleware, (req: Request, res: Response) => {
  return res.status(200).json({ user: req.user });
});

// POST /api/auth/change-password
app.post('/api/auth/change-password', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body || {};
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'INVALID_INPUT', message: 'Current and new password are required.' });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
    });

    if (!user) {
      return res.status(404).json({ error: 'USER_NOT_FOUND', message: 'User not found.' });
    }

    const currentValid = bcrypt.compareSync(currentPassword, user.passwordHash);
    if (!currentValid) {
      return res.status(400).json({ error: 'INVALID_CURRENT_PASSWORD', message: 'Current password is incorrect.' });
    }

    // Password Complexity Validation (BR-01)
    const hasLength = newPassword.length >= 8;
    const hasUpper = /[A-Z]/.test(newPassword);
    const hasLower = /[a-z]/.test(newPassword);
    const hasNumber = /[0-9]/.test(newPassword);
    const hasSpecial = /[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(newPassword);

    if (!hasLength || !hasUpper || !hasLower || !hasNumber || !hasSpecial) {
      return res.status(400).json({
        error: 'INVALID_PASSWORD',
        message: 'Password must be at least 8 characters long and contain uppercase, lowercase, number, and special character.',
      });
    }

    const newPasswordHash = bcrypt.hashSync(newPassword, 10);
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: newPasswordHash,
        mustChangePassword: false,
      },
      select: {
        id: true,
        email: true,
        mustChangePassword: true,
      },
    });

    return res.status(200).json({
      message: 'Password changed successfully.',
      user: updatedUser,
    });
  } catch (error) {
    return res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Failed to change password.' });
  }
});

// -------------------------------------------------------------
// IT Staff Queue Routes
// -------------------------------------------------------------

// GET /api/staff/tickets — Global ticket queue for IT_STAFF and ADMIN
app.get(
  '/api/staff/tickets',
  authMiddleware,
  requirePasswordChangeCheck,
  async (req: Request, res: Response) => {
    // Role gate: only IT_STAFF and ADMIN allowed
    if (!req.user || (req.user.role !== Role.IT_STAFF && req.user.role !== Role.ADMIN)) {
      return res.status(403).json({
        error: 'FORBIDDEN',
        message: 'Only IT Staff and Admins may access the global staff queue.',
      });
    }

    try {
      const {
        search,
        category,
        requestedPriority,
        itPriority,
        status,
        assignedToId,
        sortBy = 'createdAt',
        sortOrder = 'desc',
        page = '1',
        limit = '10',
      } = req.query as Record<string, string>;

      // --- Pagination ---
      const pageNum = Math.max(1, parseInt(page, 10) || 1);
      const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 10));
      const skip = (pageNum - 1) * limitNum;

      // --- Sort field whitelist ---
      const allowedSortFields = ['createdAt', 'updatedAt', 'requestedPriority', 'itPriority'];
      const resolvedSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'createdAt';
      const resolvedSortOrder: 'asc' | 'desc' = sortOrder === 'asc' ? 'asc' : 'desc';

      // --- Build where clause ---
      const where: Record<string, unknown> = {};

      // Search: ticket number or summary
      if (search && search.trim() !== '') {
        where.OR = [
          { summary: { contains: search.trim(), mode: 'insensitive' } },
          { ticketNumber: { contains: search.trim(), mode: 'insensitive' } },
        ];
      }

      // Category filter: numeric ID or name string
      if (category && category.trim() !== '') {
        const numCategoryId = parseInt(category, 10);
        if (!isNaN(numCategoryId) && numCategoryId > 0) {
          where.categoryId = numCategoryId;
        } else {
          where.category = { name: { contains: category.trim(), mode: 'insensitive' } };
        }
      }

      // Requested priority filter
      if (requestedPriority) {
        const validPriorities = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];
        const upperPriority = requestedPriority.toUpperCase();
        if (validPriorities.includes(upperPriority)) {
          where.requestedPriority = upperPriority;
        }
      }

      // IT priority filter
      if (itPriority) {
        const validPriorities = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];
        const upperPriority = itPriority.toUpperCase();
        if (validPriorities.includes(upperPriority)) {
          where.itPriority = upperPriority;
        }
      }

      // Status filter
      if (status) {
        const validStatuses = ['NEW', 'OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];
        const upperStatus = status.toUpperCase();
        if (validStatuses.includes(upperStatus)) {
          where.currentStatus = upperStatus;
        }
      }

      // Assigned-to filter: "unassigned" → null, numeric ID → exact match
      if (assignedToId && assignedToId.trim() !== '') {
        if (assignedToId.toLowerCase() === 'unassigned') {
          where.assignedToId = null;
        } else {
          const numAssigneeId = parseInt(assignedToId, 10);
          if (!isNaN(numAssigneeId) && numAssigneeId > 0) {
            where.assignedToId = numAssigneeId;
          }
        }
      }

      // --- Execute queries ---
      const [tickets, totalItems] = await Promise.all([
        prisma.ticket.findMany({
          where,
          orderBy: { [resolvedSortBy]: resolvedSortOrder },
          skip,
          take: limitNum,
          include: {
            requesterUser: { select: { id: true, name: true, email: true, department: true } },
            assignedTo: { select: { id: true, name: true, email: true } },
            category: { select: { id: true, name: true } },
            relatedSystem: { select: { id: true, name: true } },
          },
        }),
        prisma.ticket.count({ where }),
      ]);

      const totalPages = totalItems === 0 ? 0 : Math.ceil(totalItems / limitNum);

      return res.status(200).json({
        data: tickets,
        pagination: {
          totalItems,
          totalPages,
          currentPage: pageNum,
          limit: limitNum,
        },
      });
    } catch (error) {
      return res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Failed to fetch staff ticket queue.' });
    }
  }
);

// PATCH /api/tickets/:id/status — Update ticket status for IT_STAFF / ADMIN
app.patch('/api/tickets/:id/status', authMiddleware, requirePasswordChangeCheck, async (req: Request, res: Response) => {
  try {
    if (!req.user || !isStaffRole(req.user.role)) {
      return res.status(403).json({
        error: 'FORBIDDEN',
        message: 'Only IT Staff and Admins may update ticket status.',
      });
    }

    const ticketId = Number(req.params.id);
    if (!Number.isInteger(ticketId) || ticketId <= 0) {
      return res.status(400).json({ error: 'INVALID_TICKET_ID', message: 'Ticket ID must be a valid positive integer.' });
    }

    const targetStatus = normalizeStatus(req.body?.status);
    if (!targetStatus) {
      return res.status(400).json({
        error: 'INVALID_STATUS',
        message: 'Status is required and must be one of NEW, OPEN, IN_PROGRESS, RESOLVED, CLOSED.',
      });
    }

    const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket) {
      return res.status(404).json({ error: 'TICKET_NOT_FOUND', message: 'Ticket not found.' });
    }

    if (!isValidStatusTransition(ticket.currentStatus, targetStatus)) {
      return res.status(400).json({
        error: 'INVALID_STATUS_TRANSITION',
        message: `Invalid status transition from ${ticket.currentStatus} to ${targetStatus}.`,
      });
    }

    const updatedTicket = await prisma.ticket.update({
      where: { id: ticketId },
      data: { currentStatus: targetStatus },
    });

    return res.status(200).json(updatedTicket);
  } catch (error) {
    return res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Failed to update ticket status.' });
  }
});

// PATCH /api/tickets/:id/assign — Assign ticket to active IT staff/admin
app.patch('/api/tickets/:id/assign', authMiddleware, requirePasswordChangeCheck, async (req: Request, res: Response) => {
  try {
    if (!req.user || !isStaffRole(req.user.role)) {
      return res.status(403).json({
        error: 'FORBIDDEN',
        message: 'Only IT Staff and Admins may assign tickets.',
      });
    }

    const ticketId = Number(req.params.id);
    if (!Number.isInteger(ticketId) || ticketId <= 0) {
      return res.status(400).json({ error: 'INVALID_TICKET_ID', message: 'Ticket ID must be a valid positive integer.' });
    }

    const assignedToId = Number(req.body?.assignedToId);
    if (!Number.isInteger(assignedToId) || assignedToId <= 0) {
      return res.status(400).json({ error: 'INVALID_ASSIGNEE', message: 'assignedToId must be a valid positive integer.' });
    }

    const targetAssignee = await prisma.user.findUnique({ where: { id: assignedToId } });
    if (!targetAssignee || !targetAssignee.isActive || (targetAssignee.role !== Role.IT_STAFF && targetAssignee.role !== Role.ADMIN)) {
      return res.status(400).json({
        error: 'INVALID_ASSIGNEE',
        message: 'Target assignee must be an active IT Staff or Admin user.',
      });
    }

    const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket) {
      return res.status(404).json({ error: 'TICKET_NOT_FOUND', message: 'Ticket not found.' });
    }

    const updatedTicket = await prisma.ticket.update({
      where: { id: ticketId },
      data: {
        assignedToId,
        currentStatus: ticket.currentStatus === TicketStatus.NEW ? TicketStatus.OPEN : ticket.currentStatus,
      },
    });

    return res.status(200).json(updatedTicket);
  } catch (error) {
    return res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Failed to assign ticket.' });
  }
});

// PATCH /api/tickets/:id/priority — Update internal IT priority for staff/admin
app.patch('/api/tickets/:id/priority', authMiddleware, requirePasswordChangeCheck, async (req: Request, res: Response) => {
  try {
    if (!req.user || !isStaffRole(req.user.role)) {
      return res.status(403).json({
        error: 'FORBIDDEN',
        message: 'Only IT Staff and Admins may update ticket priority.',
      });
    }

    const ticketId = Number(req.params.id);
    if (!Number.isInteger(ticketId) || ticketId <= 0) {
      return res.status(400).json({ error: 'INVALID_TICKET_ID', message: 'Ticket ID must be a valid positive integer.' });
    }

    const itPriority = req.body?.itPriority;
    const normalizedPriority = typeof itPriority === 'string' ? itPriority.trim().toUpperCase() : '';
    if (!isValidTicketPriority(normalizedPriority)) {
      return res.status(400).json({
        error: 'INVALID_PRIORITY',
        message: 'itPriority must be one of LOW, MEDIUM, HIGH, URGENT.',
      });
    }

    const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket) {
      return res.status(404).json({ error: 'TICKET_NOT_FOUND', message: 'Ticket not found.' });
    }

    const updatedTicket = await prisma.ticket.update({
      where: { id: ticketId },
      data: { itPriority: normalizedPriority as TicketPriority },
    });

    return res.status(200).json(updatedTicket);
  } catch (error) {
    return res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Failed to update ticket priority.' });
  }
});

// POST /api/tickets/:id/comments — public comments
app.post('/api/tickets/:id/comments', authMiddleware, requirePasswordChangeCheck, async (req: Request, res: Response) => {
  try {
    const ticketId = Number(req.params.id);
    if (!Number.isInteger(ticketId) || ticketId <= 0) {
      return res.status(400).json({ error: 'INVALID_TICKET_ID', message: 'Ticket ID must be a valid positive integer.' });
    }

    const content = typeof req.body?.content === 'string' ? req.body.content.trim() : '';
    if (!content) {
      return res.status(400).json({ error: 'INVALID_COMMENT', message: 'Comment content is required.' });
    }

    const ticket = await prisma.ticket.findUnique({ where: { id: ticketId }, select: { id: true, requesterId: true } });
    if (!ticket) {
      return res.status(404).json({ error: 'TICKET_NOT_FOUND', message: 'Ticket not found.' });
    }

    const userRole = req.user?.role;
    if (userRole === Role.REQUESTER && ticket.requesterId !== req.user!.id) {
      return res.status(403).json({
        error: 'FORBIDDEN',
        message: 'You can only comment on tickets you own.',
      });
    }

    const comment = await prisma.comment.create({
      data: {
        content,
        ticketId,
        authorId: req.user!.id,
      },
      include: {
        author: { select: { id: true, name: true, role: true } },
      },
    });

    return res.status(201).json({
      id: comment.id,
      content: comment.content,
      ticketId: comment.ticketId,
      createdAt: comment.createdAt,
      author: comment.author,
    });
  } catch (error) {
    return res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Failed to add public comment.' });
  }
});

// GET /api/tickets/:id/comments — public comments
app.get('/api/tickets/:id/comments', authMiddleware, requirePasswordChangeCheck, async (req: Request, res: Response) => {
  try {
    const ticketId = Number(req.params.id);
    if (!Number.isInteger(ticketId) || ticketId <= 0) {
      return res.status(400).json({ error: 'INVALID_TICKET_ID', message: 'Ticket ID must be a valid positive integer.' });
    }

    const ticket = await prisma.ticket.findUnique({ where: { id: ticketId }, select: { id: true, requesterId: true } });
    if (!ticket) {
      return res.status(404).json({ error: 'TICKET_NOT_FOUND', message: 'Ticket not found.' });
    }

    if (req.user?.role === Role.REQUESTER && ticket.requesterId !== req.user.id) {
      return res.status(403).json({
        error: 'FORBIDDEN',
        message: 'You can only view comments on tickets you own.',
      });
    }

    const comments = await prisma.comment.findMany({
      where: { ticketId },
      orderBy: { createdAt: 'asc' },
      include: { author: { select: { id: true, name: true, role: true } } },
    });

    return res.status(200).json(comments.map((comment) => ({
      id: comment.id,
      content: comment.content,
      ticketId: comment.ticketId,
      createdAt: comment.createdAt,
      author: comment.author,
    })));
  } catch (error) {
    return res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Failed to fetch ticket comments.' });
  }
});

// POST /api/tickets/:id/notes — internal notes for staff/admin only
app.post('/api/tickets/:id/notes', authMiddleware, requirePasswordChangeCheck, async (req: Request, res: Response) => {
  try {
    if (!req.user || req.user.role === Role.REQUESTER) {
      return res.status(403).json({
        error: 'FORBIDDEN',
        message: 'Internal notes are confidential to IT Staff and Admins.',
      });
    }

    const ticketId = Number(req.params.id);
    if (!Number.isInteger(ticketId) || ticketId <= 0) {
      return res.status(400).json({ error: 'INVALID_TICKET_ID', message: 'Ticket ID must be a valid positive integer.' });
    }

    const ticket = await prisma.ticket.findUnique({ where: { id: ticketId }, select: { id: true } });
    if (!ticket) {
      return res.status(404).json({ error: 'TICKET_NOT_FOUND', message: 'Ticket not found.' });
    }

    const content = typeof req.body?.content === 'string' ? req.body.content.trim() : '';
    if (!content) {
      return res.status(400).json({ error: 'INVALID_NOTE', message: 'Note content is required.' });
    }

    const note = await prisma.internalNote.create({
      data: {
        content,
        ticketId,
        authorId: req.user.id,
      },
      include: {
        author: { select: { id: true, name: true, role: true } },
      },
    });

    return res.status(201).json({
      id: note.id,
      content: note.content,
      ticketId: note.ticketId,
      createdAt: note.createdAt,
      author: note.author,
    });
  } catch (error) {
    return res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Failed to add internal note.' });
  }
});

// GET /api/tickets/:id/notes — confidential notes for staff/admin only
app.get('/api/tickets/:id/notes', authMiddleware, requirePasswordChangeCheck, async (req: Request, res: Response) => {
  try {
    if (!req.user || req.user.role === Role.REQUESTER) {
      return res.status(403).json({
        error: 'FORBIDDEN',
        message: 'Internal notes are confidential to IT Staff and Admins.',
      });
    }

    const ticketId = Number(req.params.id);
    if (!Number.isInteger(ticketId) || ticketId <= 0) {
      return res.status(400).json({ error: 'INVALID_TICKET_ID', message: 'Ticket ID must be a valid positive integer.' });
    }

    const ticket = await prisma.ticket.findUnique({ where: { id: ticketId }, select: { id: true } });
    if (!ticket) {
      return res.status(404).json({ error: 'TICKET_NOT_FOUND', message: 'Ticket not found.' });
    }

    const notes = await prisma.internalNote.findMany({
      where: { ticketId },
      orderBy: { createdAt: 'asc' },
      include: { author: { select: { id: true, name: true, role: true } } },
    });

    return res.status(200).json(notes.map((note) => ({
      id: note.id,
      content: note.content,
      ticketId: note.ticketId,
      createdAt: note.createdAt,
      author: note.author,
    })));
  } catch (error) {
    return res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Failed to fetch internal notes.' });
  }
});

// -------------------------------------------------------------
// Administrator User Management Routes
// -------------------------------------------------------------

const requireAdmin = (req: Request, res: Response) => {
  if (!req.user || req.user.role !== Role.ADMIN) {
    res.status(403).json({
      error: 'FORBIDDEN',
      message: 'Only administrators may manage users.',
    });
    return false;
  }
  return true;
};

// GET /api/admin/users — paginated admin user directory
app.get('/api/admin/users', authMiddleware, requirePasswordChangeCheck, async (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return;

  try {
    const {
      search = '',
      role,
      department,
      isActive,
      page = '1',
      limit = '10',
    } = req.query as Record<string, string>;
    const pageNumber = Math.max(1, parseInt(page, 10) || 1);
    const limitNumber = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
    const where: Record<string, unknown> = {};

    if (search.trim()) {
      where.OR = [
        { name: { contains: search.trim(), mode: 'insensitive' } },
        { email: { contains: search.trim(), mode: 'insensitive' } },
      ];
    }
    if (role && Object.values(Role).includes(role.toUpperCase() as Role)) {
      where.role = role.toUpperCase();
    }
    if (department?.trim()) {
      where.department = { contains: department.trim(), mode: 'insensitive' };
    }
    if (isActive === 'true' || isActive === 'false') {
      where.isActive = isActive === 'true';
    }

    const [users, totalItems] = await Promise.all([
      prisma.user.findMany({
        where,
        select: userSelect,
        orderBy: { name: 'asc' },
        skip: (pageNumber - 1) * limitNumber,
        take: limitNumber,
      }),
      prisma.user.count({ where }),
    ]);

    return res.status(200).json({
      data: users,
      pagination: {
        totalItems,
        totalPages: totalItems === 0 ? 0 : Math.ceil(totalItems / limitNumber),
        currentPage: pageNumber,
        limit: limitNumber,
      },
    });
  } catch (error) {
    return res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Failed to fetch users.' });
  }
});

// POST /api/admin/users — provision a user with a temporary password
app.post('/api/admin/users', authMiddleware, requirePasswordChangeCheck, async (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return;

  try {
    const { name, email, department, role, password, initialPassword } = req.body || {};
    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
    const normalizedRole = typeof role === 'string' ? role.trim().toUpperCase() : '';
    const temporaryPassword = password ?? initialPassword;

    if (!name?.trim() || !normalizedEmail || !department?.trim() || !Object.values(Role).includes(normalizedRole as Role)) {
      return res.status(400).json({ error: 'INVALID_INPUT', message: 'Name, email, department, and a valid role are required.' });
    }
    if (!isValidPassword(temporaryPassword)) {
      return res.status(400).json({ error: 'INVALID_PASSWORD', message: 'Password must be at least 8 characters long and contain uppercase, lowercase, number, and special character.' });
    }

    const existingUser = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existingUser) {
      return res.status(409).json({ error: 'EMAIL_EXISTS', message: 'A user with this email already exists.' });
    }

    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        email: normalizedEmail,
        department: department.trim(),
        role: normalizedRole as Role,
        passwordHash: bcrypt.hashSync(temporaryPassword, 10),
        mustChangePassword: true,
      },
      select: userSelect,
    });
    return res.status(201).json(user);
  } catch (error) {
    return res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Failed to create user.' });
  }
});

// PATCH /api/admin/users/:id — edit a user profile and active state
app.patch('/api/admin/users/:id', authMiddleware, requirePasswordChangeCheck, async (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return;

  try {
    const userId = Number(req.params.id);
    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(400).json({ error: 'INVALID_USER_ID', message: 'User ID must be a valid positive integer.' });
    }
    const target = await prisma.user.findUnique({ where: { id: userId } });
    if (!target) return res.status(404).json({ error: 'USER_NOT_FOUND', message: 'User not found.' });

    const nextRole = req.body?.role === undefined ? target.role : String(req.body.role).trim().toUpperCase();
    const nextActive = req.body?.isActive === undefined ? target.isActive : req.body.isActive;
    if (!Object.values(Role).includes(nextRole as Role) || typeof nextActive !== 'boolean') {
      return res.status(400).json({ error: 'INVALID_INPUT', message: 'Role and isActive must contain valid values.' });
    }
    if (target.id === req.user!.id && !nextActive) {
      return res.status(400).json({ error: 'SELF_DEACTIVATION_BLOCKED', message: 'You cannot deactivate your own Admin account. Please contact another system administrator.' });
    }
    if (target.id === req.user!.id && nextRole !== Role.ADMIN) {
      return res.status(400).json({ error: 'SELF_DEMOTION_BLOCKED', message: 'You cannot remove your own ADMIN role.' });
    }
    if (target.role === Role.ADMIN && target.isActive && (nextRole !== Role.ADMIN || !nextActive)) {
      const activeAdminCount = await prisma.user.count({ where: { role: Role.ADMIN, isActive: true } });
      if (activeAdminCount <= 1) {
        return res.status(400).json({ error: 'ACTIVE_ADMIN_REQUIRED', message: 'At least one active Admin must remain in the system.' });
      }
    }

    const data: Record<string, unknown> = { role: nextRole as Role, isActive: nextActive };
    if (typeof req.body?.name === 'string' && req.body.name.trim()) data.name = req.body.name.trim();
    if (typeof req.body?.department === 'string' && req.body.department.trim()) data.department = req.body.department.trim();
    if (typeof req.body?.email === 'string' && req.body.email.trim()) data.email = req.body.email.trim().toLowerCase();

    const updatedUser = await prisma.user.update({ where: { id: userId }, data, select: userSelect });
    return res.status(200).json(updatedUser);
  } catch (error) {
    return res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Failed to update user.' });
  }
});

// POST /api/admin/users/:id/reset-password — reset credentials and require change
app.post('/api/admin/users/:id/reset-password', authMiddleware, requirePasswordChangeCheck, async (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return;

  try {
    const userId = Number(req.params.id);
    const temporaryPassword = req.body?.password ?? req.body?.newPassword;
    if (!Number.isInteger(userId) || userId <= 0) return res.status(400).json({ error: 'INVALID_USER_ID', message: 'User ID must be a valid positive integer.' });
    if (!isValidPassword(temporaryPassword)) return res.status(400).json({ error: 'INVALID_PASSWORD', message: 'Password must be at least 8 characters long and contain uppercase, lowercase, number, and special character.' });

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ error: 'USER_NOT_FOUND', message: 'User not found.' });
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: bcrypt.hashSync(temporaryPassword, 10), mustChangePassword: true },
      select: userSelect,
    });
    return res.status(200).json(updatedUser);
  } catch (error) {
    return res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Failed to reset user password.' });
  }
});

// Requesters list endpoint (active requesters, ordered by name)
app.get('/api/requesters', async (_req: Request, res: Response) => {
  try {
    const requesters = await prisma.user.findMany({
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

    const requester = await prisma.user.findUnique({
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

    const requester = await prisma.user.findUnique({ where: { id: requesterId } });
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

// Ticket detail retains Lab 2 header identity only when no session credentials are supplied.
async function ticketDetailAuth(req: Request, res: Response, next: () => void) {
  const hasSessionToken = Boolean(
    req.cookies?.toktickit_session
    || (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')),
  );

  if (hasSessionToken) {
    return authMiddleware(req, res, next);
  }

  const requesterIdHeader = req.headers['x-requester-id'];
  if (!requesterIdHeader) {
    return res.status(400).json({ error: 'Missing X-Requester-Id header' });
  }

  const requesterId = Number(requesterIdHeader);
  if (!Number.isInteger(requesterId) || requesterId <= 0) {
    return res.status(400).json({ error: 'Invalid X-Requester-Id header' });
  }

  req.user = {
    id: requesterId,
    name: '',
    email: '',
    role: Role.REQUESTER,
    department: '',
    isActive: true,
    mustChangePassword: false,
  };
  return next();
}

// GET /api/tickets/:id — Retrieve ticket detail with role-aware visibility
app.get('/api/tickets/:id', ticketDetailAuth, requirePasswordChangeCheck, async (req: Request, res: Response) => {
  try {
    const ticketId = Number(req.params.id);
    if (!Number.isInteger(ticketId) || ticketId <= 0) {
      return res.status(400).json({ error: 'INVALID_TICKET_ID', message: 'Ticket ID must be a valid positive integer.' });
    }

    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        category: { select: { id: true, name: true } },
        relatedSystem: { select: { id: true, name: true } },
        requesterUser: { select: { id: true, name: true, email: true, department: true } },
        assignedTo: { select: { id: true, name: true, email: true, role: true } },
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
        comments: {
          orderBy: { createdAt: 'asc' },
          include: {
            author: { select: { id: true, name: true, role: true } },
          },
        },
        internalNotes: req.user && isStaffRole(req.user.role)
          ? {
              orderBy: { createdAt: 'asc' },
              include: {
                author: { select: { id: true, name: true, role: true } },
              },
            }
          : false,
      },
    });

    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found', code: 'TICKET_NOT_FOUND', message: 'Ticket not found.' });
    }

    if (req.user?.role === Role.REQUESTER && ticket.requesterId !== req.user.id) {
      return res.status(403).json({ error: 'FORBIDDEN', message: 'Ticket does not belong to requester.' });
    }

    const response = {
      ...ticket,
      comments: ticket.comments || [],
      ...(req.user && isStaffRole(req.user.role) ? { internalNotes: ticket.internalNotes || [] } : {}),
    };

    return res.status(200).json(response);
  } catch (error) {
    return res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Failed to fetch ticket details.' });
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


