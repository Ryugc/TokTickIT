import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

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

// Root API welcome endpoint
app.get('/api', (_req: Request, res: Response) => {
  res.json({
    message: 'Welcome to TokTickIT API',
    version: '0.1.0',
    endpoints: {
      health: '/api/health',
    },
  });
});

export default app;
