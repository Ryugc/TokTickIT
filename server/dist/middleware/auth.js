"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.JWT_SECRET = void 0;
exports.authMiddleware = authMiddleware;
exports.requirePasswordChangeCheck = requirePasswordChangeCheck;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const prisma_1 = __importDefault(require("../lib/prisma"));
exports.JWT_SECRET = process.env.JWT_SECRET || 'toktickit-super-secret-jwt-key';
async function authMiddleware(req, res, next) {
    try {
        let token;
        if (req.cookies && req.cookies.toktickit_session) {
            token = req.cookies.toktickit_session;
        }
        else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
            token = req.headers.authorization.substring(7);
        }
        if (!token) {
            return res.status(401).json({ error: 'UNAUTHORIZED', message: 'Authentication required.' });
        }
        const decoded = jsonwebtoken_1.default.verify(token, exports.JWT_SECRET);
        const user = await prisma_1.default.user.findUnique({
            where: { id: decoded.id },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                department: true,
                isActive: true,
                mustChangePassword: true,
            },
        });
        if (!user || !user.isActive) {
            return res.status(401).json({ error: 'UNAUTHORIZED', message: 'User is inactive or not found.' });
        }
        req.user = user;
        next();
    }
    catch (error) {
        return res.status(401).json({ error: 'UNAUTHORIZED', message: 'Invalid or expired session token.' });
    }
}
function requirePasswordChangeCheck(req, res, next) {
    if (!req.user) {
        return res.status(401).json({ error: 'UNAUTHORIZED', message: 'Authentication required.' });
    }
    const allowedPaths = ['/api/auth/change-password', '/api/auth/logout', '/api/auth/me'];
    const isAllowed = allowedPaths.some((p) => req.path === p || req.originalUrl.includes(p));
    if (req.user.mustChangePassword && !isAllowed) {
        return res.status(403).json({
            error: 'PASSWORD_CHANGE_REQUIRED',
            message: 'Mandatory password change required before proceeding.',
        });
    }
    next();
}
