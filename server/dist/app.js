"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.app = void 0;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const multer_1 = __importDefault(require("multer"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const client_1 = require("@prisma/client");
const prisma_1 = __importDefault(require("./lib/prisma"));
const auth_1 = require("./middleware/auth");
dotenv_1.default.config();
exports.app = (0, express_1.default)();
exports.app.use((0, cors_1.default)());
exports.app.use(express_1.default.json());
exports.app.use((0, cookie_parser_1.default)());
const uploadDir = path_1.default.join(__dirname, '../uploads');
if (!fs_1.default.existsSync(uploadDir)) {
    fs_1.default.mkdirSync(uploadDir, { recursive: true });
}
const storage = multer_1.default.diskStorage({
    destination: (_req, _file, cb) => {
        cb(null, uploadDir);
    },
    filename: (_req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const ext = path_1.default.extname(file.originalname);
        cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
    },
});
const upload = (0, multer_1.default)({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
});
const PERMITTED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
const VALID_TICKET_PRIORITIES = Object.values(client_1.TicketPriority);
const STATUS_TRANSITIONS = {
    NEW: ['OPEN', 'IN_PROGRESS', 'CLOSED'],
    OPEN: ['IN_PROGRESS', 'RESOLVED', 'CLOSED'],
    IN_PROGRESS: ['RESOLVED', 'CLOSED'],
    RESOLVED: ['CLOSED', 'OPEN'],
    CLOSED: ['OPEN'],
};
const isStaffRole = (role) => role === client_1.Role.IT_STAFF || role === client_1.Role.ADMIN;
const isValidPassword = (password) => {
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
};
const isValidTicketStatus = (value) => {
    if (typeof value !== 'string')
        return false;
    return Object.values(client_1.TicketStatus).includes(value.toUpperCase());
};
const isValidTicketPriority = (value) => {
    if (typeof value !== 'string')
        return false;
    return VALID_TICKET_PRIORITIES.includes(value.toUpperCase());
};
const normalizeStatus = (value) => {
    if (typeof value !== 'string')
        return null;
    const upperValue = value.trim().toUpperCase();
    if (Object.values(client_1.TicketStatus).includes(upperValue)) {
        return upperValue;
    }
    return null;
};
const isValidStatusTransition = (currentStatus, targetStatus) => {
    if (currentStatus === targetStatus)
        return true;
    const allowedTransitions = STATUS_TRANSITIONS[currentStatus] || [];
    return allowedTransitions.includes(targetStatus);
};
// Health check endpoint
exports.app.get('/api/health', (_req, res) => {
    res.status(200).json({
        status: 'ok',
        service: 'TokTickIT API',
    });
});
// Categories list endpoint
exports.app.get('/api/categories', async (_req, res) => {
    try {
        const categories = await prisma_1.default.category.findMany({
            select: {
                id: true,
                name: true,
            },
            orderBy: {
                id: 'asc',
            },
        });
        res.status(200).json(categories);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch categories' });
    }
});
// Related systems list endpoint
exports.app.get('/api/related-systems', async (_req, res) => {
    try {
        const systems = await prisma_1.default.relatedSystem.findMany({
            select: {
                id: true,
                name: true,
            },
            orderBy: {
                id: 'asc',
            },
        });
        res.status(200).json(systems);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch related systems' });
    }
});
// -------------------------------------------------------------
// Authentication Routes
// -------------------------------------------------------------
// POST /api/auth/login
exports.app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body || {};
        if (!email || !password) {
            return res.status(401).json({ error: 'UNAUTHORIZED', message: 'Email and password are required.' });
        }
        const user = await prisma_1.default.user.findUnique({
            where: { email: email.toLowerCase().trim() },
        });
        if (!user) {
            return res.status(401).json({ error: 'UNAUTHORIZED', message: 'Invalid email or password credentials.' });
        }
        if (!user.isActive) {
            return res.status(401).json({ error: 'UNAUTHORIZED', message: 'Account is deactivated.' });
        }
        const passwordValid = bcryptjs_1.default.compareSync(password, user.passwordHash);
        if (!passwordValid) {
            return res.status(401).json({ error: 'UNAUTHORIZED', message: 'Invalid email or password credentials.' });
        }
        const token = jsonwebtoken_1.default.sign({ id: user.id, email: user.email, role: user.role }, auth_1.JWT_SECRET, {
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
    }
    catch (error) {
        return res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Login failed due to a server error.' });
    }
});
// POST /api/auth/logout
exports.app.post('/api/auth/logout', (_req, res) => {
    res.clearCookie('toktickit_session');
    return res.status(200).json({ message: 'Successfully logged out.' });
});
// GET /api/auth/me
exports.app.get('/api/auth/me', auth_1.authMiddleware, (req, res) => {
    return res.status(200).json({ user: req.user });
});
// POST /api/auth/change-password
exports.app.post('/api/auth/change-password', auth_1.authMiddleware, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body || {};
        if (!currentPassword || !newPassword) {
            return res.status(400).json({ error: 'INVALID_INPUT', message: 'Current and new password are required.' });
        }
        const user = await prisma_1.default.user.findUnique({
            where: { id: req.user.id },
        });
        if (!user) {
            return res.status(404).json({ error: 'USER_NOT_FOUND', message: 'User not found.' });
        }
        const currentValid = bcryptjs_1.default.compareSync(currentPassword, user.passwordHash);
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
        const newPasswordHash = bcryptjs_1.default.hashSync(newPassword, 10);
        const updatedUser = await prisma_1.default.user.update({
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
    }
    catch (error) {
        return res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Failed to change password.' });
    }
});
// -------------------------------------------------------------
// IT Staff Queue Routes
// -------------------------------------------------------------
// GET /api/staff/tickets — Global ticket queue for IT_STAFF and ADMIN
exports.app.get('/api/staff/tickets', auth_1.authMiddleware, auth_1.requirePasswordChangeCheck, async (req, res) => {
    // Role gate: only IT_STAFF and ADMIN allowed
    if (!req.user || (req.user.role !== client_1.Role.IT_STAFF && req.user.role !== client_1.Role.ADMIN)) {
        return res.status(403).json({
            error: 'FORBIDDEN',
            message: 'Only IT Staff and Admins may access the global staff queue.',
        });
    }
    try {
        const { search, category, requestedPriority, itPriority, status, assignedToId, sortBy = 'createdAt', sortOrder = 'desc', page = '1', limit = '10', } = req.query;
        // --- Pagination ---
        const pageNum = Math.max(1, parseInt(page, 10) || 1);
        const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 10));
        const skip = (pageNum - 1) * limitNum;
        // --- Sort field whitelist ---
        const allowedSortFields = ['createdAt', 'updatedAt', 'requestedPriority', 'itPriority'];
        const resolvedSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'createdAt';
        const resolvedSortOrder = sortOrder === 'asc' ? 'asc' : 'desc';
        // --- Build where clause ---
        const where = {};
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
            }
            else {
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
            }
            else {
                const numAssigneeId = parseInt(assignedToId, 10);
                if (!isNaN(numAssigneeId) && numAssigneeId > 0) {
                    where.assignedToId = numAssigneeId;
                }
            }
        }
        // --- Execute queries ---
        const [tickets, totalItems] = await Promise.all([
            prisma_1.default.ticket.findMany({
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
            prisma_1.default.ticket.count({ where }),
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
    }
    catch (error) {
        return res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Failed to fetch staff ticket queue.' });
    }
});
// PATCH /api/tickets/:id/status — Update ticket status for IT_STAFF / ADMIN
exports.app.patch('/api/tickets/:id/status', auth_1.authMiddleware, auth_1.requirePasswordChangeCheck, async (req, res) => {
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
        const ticket = await prisma_1.default.ticket.findUnique({ where: { id: ticketId } });
        if (!ticket) {
            return res.status(404).json({ error: 'TICKET_NOT_FOUND', message: 'Ticket not found.' });
        }
        if (!isValidStatusTransition(ticket.currentStatus, targetStatus)) {
            return res.status(400).json({
                error: 'INVALID_STATUS_TRANSITION',
                message: `Invalid status transition from ${ticket.currentStatus} to ${targetStatus}.`,
            });
        }
        const updatedTicket = await prisma_1.default.ticket.update({
            where: { id: ticketId },
            data: { currentStatus: targetStatus },
        });
        return res.status(200).json(updatedTicket);
    }
    catch (error) {
        return res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Failed to update ticket status.' });
    }
});
// PATCH /api/tickets/:id/assign — Assign ticket to active IT staff/admin
exports.app.patch('/api/tickets/:id/assign', auth_1.authMiddleware, auth_1.requirePasswordChangeCheck, async (req, res) => {
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
        const targetAssignee = await prisma_1.default.user.findUnique({ where: { id: assignedToId } });
        if (!targetAssignee || !targetAssignee.isActive || (targetAssignee.role !== client_1.Role.IT_STAFF && targetAssignee.role !== client_1.Role.ADMIN)) {
            return res.status(400).json({
                error: 'INVALID_ASSIGNEE',
                message: 'Target assignee must be an active IT Staff or Admin user.',
            });
        }
        const ticket = await prisma_1.default.ticket.findUnique({ where: { id: ticketId } });
        if (!ticket) {
            return res.status(404).json({ error: 'TICKET_NOT_FOUND', message: 'Ticket not found.' });
        }
        const updatedTicket = await prisma_1.default.ticket.update({
            where: { id: ticketId },
            data: {
                assignedToId,
                currentStatus: ticket.currentStatus === client_1.TicketStatus.NEW ? client_1.TicketStatus.OPEN : ticket.currentStatus,
            },
        });
        return res.status(200).json(updatedTicket);
    }
    catch (error) {
        return res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Failed to assign ticket.' });
    }
});
// PATCH /api/tickets/:id/priority — Update internal IT priority for staff/admin
exports.app.patch('/api/tickets/:id/priority', auth_1.authMiddleware, auth_1.requirePasswordChangeCheck, async (req, res) => {
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
        const ticket = await prisma_1.default.ticket.findUnique({ where: { id: ticketId } });
        if (!ticket) {
            return res.status(404).json({ error: 'TICKET_NOT_FOUND', message: 'Ticket not found.' });
        }
        const updatedTicket = await prisma_1.default.ticket.update({
            where: { id: ticketId },
            data: { itPriority: normalizedPriority },
        });
        return res.status(200).json(updatedTicket);
    }
    catch (error) {
        return res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Failed to update ticket priority.' });
    }
});
// POST /api/tickets/:id/comments — public comments
exports.app.post('/api/tickets/:id/comments', auth_1.authMiddleware, auth_1.requirePasswordChangeCheck, async (req, res) => {
    try {
        const ticketId = Number(req.params.id);
        if (!Number.isInteger(ticketId) || ticketId <= 0) {
            return res.status(400).json({ error: 'INVALID_TICKET_ID', message: 'Ticket ID must be a valid positive integer.' });
        }
        const content = typeof req.body?.content === 'string' ? req.body.content.trim() : '';
        if (!content) {
            return res.status(400).json({ error: 'INVALID_COMMENT', message: 'Comment content is required.' });
        }
        const ticket = await prisma_1.default.ticket.findUnique({ where: { id: ticketId }, select: { id: true, requesterId: true } });
        if (!ticket) {
            return res.status(404).json({ error: 'TICKET_NOT_FOUND', message: 'Ticket not found.' });
        }
        const userRole = req.user?.role;
        if (userRole === client_1.Role.REQUESTER && ticket.requesterId !== req.user.id) {
            return res.status(403).json({
                error: 'FORBIDDEN',
                message: 'You can only comment on tickets you own.',
            });
        }
        const comment = await prisma_1.default.comment.create({
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
            id: comment.id,
            content: comment.content,
            ticketId: comment.ticketId,
            createdAt: comment.createdAt,
            author: comment.author,
        });
    }
    catch (error) {
        return res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Failed to add public comment.' });
    }
});
// GET /api/tickets/:id/comments — public comments
exports.app.get('/api/tickets/:id/comments', auth_1.authMiddleware, auth_1.requirePasswordChangeCheck, async (req, res) => {
    try {
        const ticketId = Number(req.params.id);
        if (!Number.isInteger(ticketId) || ticketId <= 0) {
            return res.status(400).json({ error: 'INVALID_TICKET_ID', message: 'Ticket ID must be a valid positive integer.' });
        }
        const ticket = await prisma_1.default.ticket.findUnique({ where: { id: ticketId }, select: { id: true, requesterId: true } });
        if (!ticket) {
            return res.status(404).json({ error: 'TICKET_NOT_FOUND', message: 'Ticket not found.' });
        }
        if (req.user?.role === client_1.Role.REQUESTER && ticket.requesterId !== req.user.id) {
            return res.status(403).json({
                error: 'FORBIDDEN',
                message: 'You can only view comments on tickets you own.',
            });
        }
        const comments = await prisma_1.default.comment.findMany({
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
    }
    catch (error) {
        return res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Failed to fetch ticket comments.' });
    }
});
// POST /api/tickets/:id/notes — internal notes for staff/admin only
exports.app.post('/api/tickets/:id/notes', auth_1.authMiddleware, auth_1.requirePasswordChangeCheck, async (req, res) => {
    try {
        if (!req.user || req.user.role === client_1.Role.REQUESTER) {
            return res.status(403).json({
                error: 'FORBIDDEN',
                message: 'Internal notes are confidential to IT Staff and Admins.',
            });
        }
        const ticketId = Number(req.params.id);
        if (!Number.isInteger(ticketId) || ticketId <= 0) {
            return res.status(400).json({ error: 'INVALID_TICKET_ID', message: 'Ticket ID must be a valid positive integer.' });
        }
        const ticket = await prisma_1.default.ticket.findUnique({ where: { id: ticketId }, select: { id: true } });
        if (!ticket) {
            return res.status(404).json({ error: 'TICKET_NOT_FOUND', message: 'Ticket not found.' });
        }
        const content = typeof req.body?.content === 'string' ? req.body.content.trim() : '';
        if (!content) {
            return res.status(400).json({ error: 'INVALID_NOTE', message: 'Note content is required.' });
        }
        const note = await prisma_1.default.internalNote.create({
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
    }
    catch (error) {
        return res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Failed to add internal note.' });
    }
});
// GET /api/tickets/:id/notes — confidential notes for staff/admin only
exports.app.get('/api/tickets/:id/notes', auth_1.authMiddleware, auth_1.requirePasswordChangeCheck, async (req, res) => {
    try {
        if (!req.user || req.user.role === client_1.Role.REQUESTER) {
            return res.status(403).json({
                error: 'FORBIDDEN',
                message: 'Internal notes are confidential to IT Staff and Admins.',
            });
        }
        const ticketId = Number(req.params.id);
        if (!Number.isInteger(ticketId) || ticketId <= 0) {
            return res.status(400).json({ error: 'INVALID_TICKET_ID', message: 'Ticket ID must be a valid positive integer.' });
        }
        const ticket = await prisma_1.default.ticket.findUnique({ where: { id: ticketId }, select: { id: true } });
        if (!ticket) {
            return res.status(404).json({ error: 'TICKET_NOT_FOUND', message: 'Ticket not found.' });
        }
        const notes = await prisma_1.default.internalNote.findMany({
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
    }
    catch (error) {
        return res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Failed to fetch internal notes.' });
    }
});
// -------------------------------------------------------------
// Administrator User Management Routes
// -------------------------------------------------------------
const requireAdmin = (req, res) => {
    if (!req.user || req.user.role !== client_1.Role.ADMIN) {
        res.status(403).json({
            error: 'FORBIDDEN',
            message: 'Only administrators may manage users.',
        });
        return false;
    }
    return true;
};
// GET /api/admin/users — paginated admin user directory
exports.app.get('/api/admin/users', auth_1.authMiddleware, auth_1.requirePasswordChangeCheck, async (req, res) => {
    if (!requireAdmin(req, res))
        return;
    try {
        const { search = '', role, department, isActive, page = '1', limit = '10', } = req.query;
        const pageNumber = Math.max(1, parseInt(page, 10) || 1);
        const limitNumber = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
        const where = {};
        if (search.trim()) {
            where.OR = [
                { name: { contains: search.trim(), mode: 'insensitive' } },
                { email: { contains: search.trim(), mode: 'insensitive' } },
            ];
        }
        if (role && Object.values(client_1.Role).includes(role.toUpperCase())) {
            where.role = role.toUpperCase();
        }
        if (department?.trim()) {
            where.department = { contains: department.trim(), mode: 'insensitive' };
        }
        if (isActive === 'true' || isActive === 'false') {
            where.isActive = isActive === 'true';
        }
        const [users, totalItems] = await Promise.all([
            prisma_1.default.user.findMany({
                where,
                select: userSelect,
                orderBy: { name: 'asc' },
                skip: (pageNumber - 1) * limitNumber,
                take: limitNumber,
            }),
            prisma_1.default.user.count({ where }),
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
    }
    catch (error) {
        return res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Failed to fetch users.' });
    }
});
// POST /api/admin/users — provision a user with a temporary password
exports.app.post('/api/admin/users', auth_1.authMiddleware, auth_1.requirePasswordChangeCheck, async (req, res) => {
    if (!requireAdmin(req, res))
        return;
    try {
        const { name, email, department, role, password, initialPassword } = req.body || {};
        const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
        const normalizedRole = typeof role === 'string' ? role.trim().toUpperCase() : '';
        const temporaryPassword = password ?? initialPassword;
        if (!name?.trim() || !normalizedEmail || !department?.trim() || !Object.values(client_1.Role).includes(normalizedRole)) {
            return res.status(400).json({ error: 'INVALID_INPUT', message: 'Name, email, department, and a valid role are required.' });
        }
        if (!isValidPassword(temporaryPassword)) {
            return res.status(400).json({ error: 'INVALID_PASSWORD', message: 'Password must be at least 8 characters long and contain uppercase, lowercase, number, and special character.' });
        }
        const existingUser = await prisma_1.default.user.findUnique({ where: { email: normalizedEmail } });
        if (existingUser) {
            return res.status(409).json({ error: 'EMAIL_EXISTS', message: 'A user with this email already exists.' });
        }
        const user = await prisma_1.default.user.create({
            data: {
                name: name.trim(),
                email: normalizedEmail,
                department: department.trim(),
                role: normalizedRole,
                passwordHash: bcryptjs_1.default.hashSync(temporaryPassword, 10),
                mustChangePassword: true,
            },
            select: userSelect,
        });
        return res.status(201).json(user);
    }
    catch (error) {
        return res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Failed to create user.' });
    }
});
// PATCH /api/admin/users/:id — edit a user profile and active state
exports.app.patch('/api/admin/users/:id', auth_1.authMiddleware, auth_1.requirePasswordChangeCheck, async (req, res) => {
    if (!requireAdmin(req, res))
        return;
    try {
        const userId = Number(req.params.id);
        if (!Number.isInteger(userId) || userId <= 0) {
            return res.status(400).json({ error: 'INVALID_USER_ID', message: 'User ID must be a valid positive integer.' });
        }
        const target = await prisma_1.default.user.findUnique({ where: { id: userId } });
        if (!target)
            return res.status(404).json({ error: 'USER_NOT_FOUND', message: 'User not found.' });
        const nextRole = req.body?.role === undefined ? target.role : String(req.body.role).trim().toUpperCase();
        const nextActive = req.body?.isActive === undefined ? target.isActive : req.body.isActive;
        if (!Object.values(client_1.Role).includes(nextRole) || typeof nextActive !== 'boolean') {
            return res.status(400).json({ error: 'INVALID_INPUT', message: 'Role and isActive must contain valid values.' });
        }
        if (target.id === req.user.id && !nextActive) {
            return res.status(400).json({ error: 'SELF_DEACTIVATION_BLOCKED', message: 'You cannot deactivate your own Admin account. Please contact another system administrator.' });
        }
        if (target.id === req.user.id && nextRole !== client_1.Role.ADMIN) {
            return res.status(400).json({ error: 'SELF_DEMOTION_BLOCKED', message: 'You cannot remove your own ADMIN role.' });
        }
        if (target.role === client_1.Role.ADMIN && target.isActive && (nextRole !== client_1.Role.ADMIN || !nextActive)) {
            const activeAdminCount = await prisma_1.default.user.count({ where: { role: client_1.Role.ADMIN, isActive: true } });
            if (activeAdminCount <= 1) {
                return res.status(400).json({ error: 'ACTIVE_ADMIN_REQUIRED', message: 'At least one active Admin must remain in the system.' });
            }
        }
        const data = { role: nextRole, isActive: nextActive };
        if (typeof req.body?.name === 'string' && req.body.name.trim())
            data.name = req.body.name.trim();
        if (typeof req.body?.department === 'string' && req.body.department.trim())
            data.department = req.body.department.trim();
        if (typeof req.body?.email === 'string' && req.body.email.trim())
            data.email = req.body.email.trim().toLowerCase();
        const updatedUser = await prisma_1.default.user.update({ where: { id: userId }, data, select: userSelect });
        return res.status(200).json(updatedUser);
    }
    catch (error) {
        return res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Failed to update user.' });
    }
});
// POST /api/admin/users/:id/reset-password — reset credentials and require change
exports.app.post('/api/admin/users/:id/reset-password', auth_1.authMiddleware, auth_1.requirePasswordChangeCheck, async (req, res) => {
    if (!requireAdmin(req, res))
        return;
    try {
        const userId = Number(req.params.id);
        const temporaryPassword = req.body?.password ?? req.body?.newPassword;
        if (!Number.isInteger(userId) || userId <= 0)
            return res.status(400).json({ error: 'INVALID_USER_ID', message: 'User ID must be a valid positive integer.' });
        if (!isValidPassword(temporaryPassword))
            return res.status(400).json({ error: 'INVALID_PASSWORD', message: 'Password must be at least 8 characters long and contain uppercase, lowercase, number, and special character.' });
        const user = await prisma_1.default.user.findUnique({ where: { id: userId } });
        if (!user)
            return res.status(404).json({ error: 'USER_NOT_FOUND', message: 'User not found.' });
        const updatedUser = await prisma_1.default.user.update({
            where: { id: userId },
            data: { passwordHash: bcryptjs_1.default.hashSync(temporaryPassword, 10), mustChangePassword: true },
            select: userSelect,
        });
        return res.status(200).json(updatedUser);
    }
    catch (error) {
        return res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Failed to reset user password.' });
    }
});
// Requesters list endpoint (active requesters, ordered by name)
exports.app.get('/api/requesters', async (_req, res) => {
    try {
        const requesters = await prisma_1.default.user.findMany({
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
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch requesters' });
    }
});
// Create ticket endpoint
exports.app.post('/api/tickets', async (req, res) => {
    try {
        const requesterIdHeader = req.headers['x-requester-id'];
        if (!requesterIdHeader) {
            return res.status(400).json({ error: 'Missing X-Requester-Id header' });
        }
        const requesterId = Number(requesterIdHeader);
        if (isNaN(requesterId) || requesterId <= 0) {
            return res.status(400).json({ error: 'Invalid X-Requester-Id header' });
        }
        const requester = await prisma_1.default.user.findUnique({
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
            const existing = await prisma_1.default.ticket.findFirst({ where: { ticketNumber: candidate } });
            if (!existing) {
                ticketNumber = candidate;
                break;
            }
            attempts++;
        }
        if (!ticketNumber) {
            ticketNumber = `TKT-${year}-${Date.now().toString().slice(-6)}`;
        }
        const newTicket = await prisma_1.default.ticket.create({
            data: {
                ticketNumber,
                summary: summary.trim(),
                description: description.trim(),
                requestedPriority: priorityUpper,
                currentStatus: client_1.TicketStatus.NEW,
                requesterId,
                categoryId: numCategoryId,
                relatedSystemId: numRelatedSystemId,
            },
        });
        return res.status(201).json(newTicket);
    }
    catch (error) {
        return res.status(500).json({ error: 'Failed to create ticket' });
    }
});
// Upload attachment endpoint
const uploadSingleFile = upload.single('file');
exports.app.post('/api/tickets/:id/attachments', (req, res) => {
    uploadSingleFile(req, res, async (err) => {
        const file = req.file;
        if (err instanceof multer_1.default.MulterError) {
            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({ error: 'File size exceeds maximum limit of 5MB' });
            }
            return res.status(400).json({ error: err.message });
        }
        else if (err) {
            return res.status(400).json({ error: err.message });
        }
        try {
            const requesterIdHeader = req.headers['x-requester-id'];
            if (!requesterIdHeader) {
                if (file && fs_1.default.existsSync(file.path))
                    fs_1.default.unlinkSync(file.path);
                return res.status(400).json({ error: 'Missing X-Requester-Id header' });
            }
            const requesterId = Number(requesterIdHeader);
            if (isNaN(requesterId) || requesterId <= 0) {
                if (file && fs_1.default.existsSync(file.path))
                    fs_1.default.unlinkSync(file.path);
                return res.status(400).json({ error: 'Invalid X-Requester-Id header' });
            }
            const ticketId = Number(req.params.id);
            if (isNaN(ticketId)) {
                if (file && fs_1.default.existsSync(file.path))
                    fs_1.default.unlinkSync(file.path);
                return res.status(400).json({ error: 'Invalid ticket ID' });
            }
            const ticket = await prisma_1.default.ticket.findUnique({ where: { id: ticketId } });
            if (!ticket) {
                if (file && fs_1.default.existsSync(file.path))
                    fs_1.default.unlinkSync(file.path);
                return res.status(404).json({ error: 'Ticket not found' });
            }
            if (ticket.requesterId !== requesterId) {
                if (file && fs_1.default.existsSync(file.path))
                    fs_1.default.unlinkSync(file.path);
                return res.status(403).json({ error: 'Forbidden: Ticket does not belong to requester' });
            }
            if (!file) {
                return res.status(400).json({ error: 'No file uploaded' });
            }
            if (!PERMITTED_MIME_TYPES.includes(file.mimetype)) {
                if (fs_1.default.existsSync(file.path))
                    fs_1.default.unlinkSync(file.path);
                return res.status(400).json({ error: 'Invalid file type. Allowed: JPG, PNG, WEBP, PDF' });
            }
            const activeAttachmentsCount = await prisma_1.default.attachment.count({
                where: { ticketId, isRemoved: false },
            });
            if (activeAttachmentsCount >= 5) {
                if (fs_1.default.existsSync(file.path))
                    fs_1.default.unlinkSync(file.path);
                return res.status(400).json({ error: 'Maximum active attachments limit reached' });
            }
            const attachment = await prisma_1.default.attachment.create({
                data: {
                    fileName: file.originalname,
                    fileType: file.mimetype,
                    fileSize: file.size,
                    storagePath: file.path,
                    ticketId,
                },
            });
            return res.status(201).json(attachment);
        }
        catch (error) {
            if (file && fs_1.default.existsSync(file.path))
                fs_1.default.unlinkSync(file.path);
            return res.status(500).json({ error: 'Failed to upload attachment' });
        }
    });
});
// GET /api/tickets — Paginated, filtered, searchable ticket list for the active requester
exports.app.get('/api/tickets', async (req, res) => {
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
        const requester = await prisma_1.default.user.findUnique({ where: { id: requesterId } });
        if (!requester || !requester.isActive) {
            return res.status(400).json({ error: 'Invalid or inactive requester' });
        }
        // --- Query params ---
        const { search, categoryId, requestedPriority, currentStatus, sortBy = 'createdAt', sortOrder = 'desc', page = '1', limit = '10', } = req.query;
        const pageNum = Math.max(1, parseInt(page, 10) || 1);
        const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 10));
        const skip = (pageNum - 1) * limitNum;
        // Allowed sort fields whitelist (prevents injection)
        const allowedSortFields = ['createdAt', 'updatedAt', 'currentStatus', 'requestedPriority'];
        const resolvedSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'createdAt';
        const resolvedSortOrder = sortOrder === 'asc' ? 'asc' : 'desc';
        // --- Build where clause ---
        const where = { requesterId };
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
            prisma_1.default.ticket.findMany({
                where,
                orderBy: { [resolvedSortBy]: resolvedSortOrder },
                skip,
                take: limitNum,
                include: {
                    category: { select: { id: true, name: true } },
                    relatedSystem: { select: { id: true, name: true } },
                },
            }),
            prisma_1.default.ticket.count({ where }),
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
    }
    catch (error) {
        return res.status(500).json({ error: 'Failed to fetch tickets' });
    }
});
// Ticket detail retains Lab 2 header identity only when no session credentials are supplied.
async function ticketDetailAuth(req, res, next) {
    const hasSessionToken = Boolean(req.cookies?.toktickit_session
        || (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')));
    if (hasSessionToken) {
        return (0, auth_1.authMiddleware)(req, res, next);
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
        role: client_1.Role.REQUESTER,
        department: '',
        isActive: true,
        mustChangePassword: false,
    };
    return next();
}
// GET /api/tickets/:id — Retrieve ticket detail with role-aware visibility
exports.app.get('/api/tickets/:id', ticketDetailAuth, auth_1.requirePasswordChangeCheck, async (req, res) => {
    try {
        const ticketId = Number(req.params.id);
        if (!Number.isInteger(ticketId) || ticketId <= 0) {
            return res.status(400).json({ error: 'INVALID_TICKET_ID', message: 'Ticket ID must be a valid positive integer.' });
        }
        const ticket = await prisma_1.default.ticket.findUnique({
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
        if (req.user?.role === client_1.Role.REQUESTER && ticket.requesterId !== req.user.id) {
            return res.status(403).json({ error: 'FORBIDDEN', message: 'Ticket does not belong to requester.' });
        }
        const response = {
            ...ticket,
            comments: ticket.comments || [],
            ...(req.user && isStaffRole(req.user.role) ? { internalNotes: ticket.internalNotes || [] } : {}),
        };
        return res.status(200).json(response);
    }
    catch (error) {
        return res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Failed to fetch ticket details.' });
    }
});
// DELETE /api/attachments/:id — Soft-remove attachment with mandatory removalReason
exports.app.delete('/api/attachments/:id', async (req, res) => {
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
        const attachment = await prisma_1.default.attachment.findUnique({
            where: { id: attachmentId },
            include: { ticket: true },
        });
        if (!attachment) {
            return res.status(404).json({ error: 'Attachment not found' });
        }
        if (attachment.ticket.requesterId !== requesterId) {
            return res.status(403).json({ error: 'Forbidden: Ticket does not belong to requester' });
        }
        const updatedAttachment = await prisma_1.default.attachment.update({
            where: { id: attachmentId },
            data: {
                isRemoved: true,
                removalReason: removalReason.trim(),
            },
        });
        return res.status(200).json(updatedAttachment);
    }
    catch (error) {
        return res.status(500).json({ error: 'Failed to remove attachment' });
    }
});
// GET /api/attachments/:id/download — Stream active attachment bytes
exports.app.get('/api/attachments/:id/download', async (req, res) => {
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
        const attachment = await prisma_1.default.attachment.findUnique({
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
        if (!fs_1.default.existsSync(attachment.storagePath)) {
            return res.status(404).json({ error: 'Attachment file not found on disk' });
        }
        return res.download(attachment.storagePath, attachment.fileName);
    }
    catch (error) {
        return res.status(500).json({ error: 'Failed to download attachment' });
    }
});
// Root API welcome endpoint
exports.app.get('/api', (_req, res) => {
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
exports.default = exports.app;
