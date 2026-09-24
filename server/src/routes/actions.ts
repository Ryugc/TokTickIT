import { Router, Request, Response } from 'express';
import { Role } from '@prisma/client';
import prisma from '../lib/prisma';
import { authMiddleware, requirePasswordChangeCheck } from '../middleware/auth';

const router = Router();

// GET /api/tickets/:id/actions
router.get('/tickets/:id/actions', authMiddleware, requirePasswordChangeCheck, async (req: Request, res: Response) => {
  try {
    const ticketId = parseInt(req.params.id, 10);
    if (isNaN(ticketId)) {
      return res.status(400).json({ error: 'INVALID_ID', message: 'Invalid ticket ID format.' });
    }

    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      select: { id: true, requesterId: true },
    });

    if (!ticket) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Ticket not found.' });
    }

    const user = req.user!;
    const isStaff = user.role === Role.IT_STAFF || user.role === Role.ADMIN;
    const isOwner = ticket.requesterId === user.id;

    if (!isStaff && !isOwner) {
      return res.status(403).json({ error: 'FORBIDDEN', message: 'Access denied to actions taken for this ticket.' });
    }

    const actions = await prisma.actionTaken.findMany({
      where: { ticketId },
      include: {
        performedBy: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return res.status(200).json(actions);
  } catch (error) {
    return res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Failed to fetch actions taken.' });
  }
});

// POST /api/tickets/:id/actions
router.post('/tickets/:id/actions', authMiddleware, requirePasswordChangeCheck, async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const isStaff = user.role === Role.IT_STAFF || user.role === Role.ADMIN;
    if (!isStaff) {
      return res.status(403).json({ error: 'FORBIDDEN', message: 'Only IT Staff and Admins can log actions taken.' });
    }

    const ticketId = parseInt(req.params.id, 10);
    if (isNaN(ticketId)) {
      return res.status(400).json({ error: 'INVALID_ID', message: 'Invalid ticket ID format.' });
    }

    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
    });

    if (!ticket) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Ticket not found.' });
    }

    const { description, result, followUpRequired, followUpNote, attachmentNotes } = req.body || {};

    if (typeof description !== 'string' || !description.trim()) {
      return res.status(400).json({ error: 'BAD_REQUEST', message: 'Description is required.' });
    }

    if (typeof result !== 'string' || !result.trim()) {
      return res.status(400).json({ error: 'BAD_REQUEST', message: 'Result is required.' });
    }

    const isFollowUpRequired = Boolean(followUpRequired);

    if (isFollowUpRequired && (typeof followUpNote !== 'string' || !followUpNote.trim())) {
      return res.status(400).json({
        error: 'BAD_REQUEST',
        message: 'Follow-up note is required when follow-up is requested.',
      });
    }

    const action = await prisma.actionTaken.create({
      data: {
        ticketId,
        performedById: user.id,
        description: description.trim(),
        result: result.trim(),
        followUpRequired: isFollowUpRequired,
        followUpNote: isFollowUpRequired ? followUpNote.trim() : (followUpNote && typeof followUpNote === 'string' ? followUpNote.trim() : null),
        attachmentNotes: typeof attachmentNotes === 'string' && attachmentNotes.trim() ? attachmentNotes.trim() : null,
      },
      include: {
        performedBy: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });

    return res.status(201).json(action);
  } catch (error) {
    return res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Failed to create action taken record.' });
  }
});

// PATCH /api/actions/:id
router.patch('/actions/:id', authMiddleware, requirePasswordChangeCheck, async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const isStaff = user.role === Role.IT_STAFF || user.role === Role.ADMIN;
    if (!isStaff) {
      return res.status(403).json({ error: 'FORBIDDEN', message: 'Only IT Staff and Admins can modify actions taken.' });
    }

    const actionId = req.params.id;
    const existingAction = await prisma.actionTaken.findUnique({
      where: { id: actionId },
    });

    if (!existingAction) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Action taken record not found.' });
    }

    const { description, result, followUpRequired, followUpNote, attachmentNotes } = req.body || {};

    const nextFollowUpRequired = followUpRequired !== undefined ? Boolean(followUpRequired) : existingAction.followUpRequired;
    const nextFollowUpNote = followUpNote !== undefined ? followUpNote : existingAction.followUpNote;

    if (nextFollowUpRequired && (typeof nextFollowUpNote !== 'string' || !nextFollowUpNote.trim())) {
      return res.status(400).json({
        error: 'BAD_REQUEST',
        message: 'Follow-up note is required when follow-up is requested.',
      });
    }

    const updateData: any = {};
    if (description !== undefined) {
      if (typeof description !== 'string' || !description.trim()) {
        return res.status(400).json({ error: 'BAD_REQUEST', message: 'Description cannot be empty.' });
      }
      updateData.description = description.trim();
    }

    if (result !== undefined) {
      if (typeof result !== 'string' || !result.trim()) {
        return res.status(400).json({ error: 'BAD_REQUEST', message: 'Result cannot be empty.' });
      }
      updateData.result = result.trim();
    }

    if (followUpRequired !== undefined) {
      updateData.followUpRequired = nextFollowUpRequired;
    }

    if (followUpNote !== undefined) {
      updateData.followUpNote = typeof followUpNote === 'string' && followUpNote.trim() ? followUpNote.trim() : null;
    }

    if (attachmentNotes !== undefined) {
      updateData.attachmentNotes = typeof attachmentNotes === 'string' && attachmentNotes.trim() ? attachmentNotes.trim() : null;
    }

    const updatedAction = await prisma.actionTaken.update({
      where: { id: actionId },
      data: updateData,
      include: {
        performedBy: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });

    return res.status(200).json(updatedAction);
  } catch (error) {
    return res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Failed to update action taken record.' });
  }
});

export default router;
