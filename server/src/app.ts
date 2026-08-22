import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import prisma from './lib/prisma';

dotenv.config();

export const app = express();

app.use(cors());
app.use(express.json());

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

// Root API welcome endpoint
app.get('/api', (_req: Request, res: Response) => {
  res.json({
    message: 'Welcome to TokTickIT API',
    version: '0.1.0',
    endpoints: {
      health: '/api/health',
      categories: '/api/categories',
      requesters: '/api/requesters',
    },
  });
});

export default app;

