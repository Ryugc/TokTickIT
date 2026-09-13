import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma';
import { Role } from '@prisma/client';

export const JWT_SECRET = process.env.JWT_SECRET || 'toktickit-super-secret-jwt-key';

export interface UserPayload {
  id: number;
  name: string;
  email: string;
  role: Role;
  department: string;
  isActive: boolean;
  mustChangePassword: boolean;
}

declare global {
  namespace Express {
    interface Request {
      user?: UserPayload;
    }
  }
}

export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    let token: string | undefined;

    if (req.cookies && req.cookies.toktickit_session) {
      token = req.cookies.toktickit_session;
    } else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.substring(7);
    }

    if (!token) {
      return res.status(401).json({ error: 'UNAUTHORIZED', message: 'Authentication required.' });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { id: number };
    const user = await prisma.user.findUnique({
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
  } catch (error) {
    return res.status(401).json({ error: 'UNAUTHORIZED', message: 'Invalid or expired session token.' });
  }
}

export function requirePasswordChangeCheck(req: Request, res: Response, next: NextFunction) {
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
