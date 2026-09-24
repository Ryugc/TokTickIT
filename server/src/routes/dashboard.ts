import { Router, Request, Response } from 'express';
import { Role, TicketStatus } from '@prisma/client';
import prisma from '../lib/prisma';
import { authMiddleware, requirePasswordChangeCheck } from '../middleware/auth';

const router = Router();

// GET /api/dashboard/staff
router.get('/dashboard/staff', authMiddleware, requirePasswordChangeCheck, async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const isStaff = user.role === Role.IT_STAFF || user.role === Role.ADMIN;
    if (!isStaff) {
      return res.status(403).json({ error: 'FORBIDDEN', message: 'Access denied. IT Staff and Admins only.' });
    }

    const [
      unassignedCount,
      myAssignedCount,
      newCount,
      openCount,
      inProgressCount,
      waitingForRequesterCount,
      recentTickets,
    ] = await Promise.all([
      prisma.ticket.count({
        where: {
          assignedToId: null,
          currentStatus: { notIn: [TicketStatus.CLOSED, TicketStatus.CANCELLED] },
        },
      }),
      prisma.ticket.count({
        where: {
          assignedToId: user.id,
          currentStatus: { notIn: [TicketStatus.CLOSED, TicketStatus.CANCELLED] },
        },
      }),
      prisma.ticket.count({ where: { currentStatus: TicketStatus.NEW } }),
      prisma.ticket.count({ where: { currentStatus: TicketStatus.OPEN } }),
      prisma.ticket.count({ where: { currentStatus: TicketStatus.IN_PROGRESS } }),
      prisma.ticket.count({ where: { currentStatus: TicketStatus.WAITING_FOR_REQUESTER } }),
      prisma.ticket.findMany({
        take: 5,
        orderBy: { updatedAt: 'desc' },
        include: {
          requesterUser: { select: { id: true, name: true, email: true } },
          assignedTo: { select: { id: true, name: true, email: true } },
          category: { select: { id: true, name: true } },
          relatedSystem: { select: { id: true, name: true } },
        },
      }),
    ]);

    return res.status(200).json({
      unassignedCount,
      myAssignedCount,
      newCount,
      openCount,
      inProgressCount,
      waitingForRequesterCount,
      recentTickets,
    });
  } catch (error) {
    return res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Failed to fetch staff dashboard metrics.' });
  }
});

// GET /api/dashboard/requester
router.get('/dashboard/requester', authMiddleware, requirePasswordChangeCheck, async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const userId = user.id;

    const [openCount, inProgressCount, resolvedCount, closedCount, recentTickets] = await Promise.all([
      prisma.ticket.count({
        where: { requesterId: userId, currentStatus: TicketStatus.OPEN },
      }),
      prisma.ticket.count({
        where: { requesterId: userId, currentStatus: TicketStatus.IN_PROGRESS },
      }),
      prisma.ticket.count({
        where: { requesterId: userId, currentStatus: TicketStatus.RESOLVED },
      }),
      prisma.ticket.count({
        where: { requesterId: userId, currentStatus: TicketStatus.CLOSED },
      }),
      prisma.ticket.findMany({
        where: { requesterId: userId },
        take: 5,
        orderBy: { updatedAt: 'desc' },
        include: {
          category: { select: { id: true, name: true } },
          relatedSystem: { select: { id: true, name: true } },
        },
      }),
    ]);

    return res.status(200).json({
      openCount,
      inProgressCount,
      resolvedCount,
      closedCount,
      recentTickets,
    });
  } catch (error) {
    return res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Failed to fetch requester dashboard metrics.' });
  }
});

export default router;
