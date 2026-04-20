/**
 * Express API Server - Main entry point
 */

// OpenTelemetry must be imported FIRST before any other imports
// tracing.ts는 import만 해도 자동으로 초기화됨
import '../src/tracing';

import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { errorHandler } from './middleware/errorHandler';
import userRoutes from './routes/userRoutes';
import { getDatabaseService } from '../src/services/database';

dotenv.config();

const app: Express = express();
const PORT = process.env.API_PORT || 3000;

// Initialize database connection
const initDatabase = async () => {
  try {
    const db = getDatabaseService();
    await db.connect();
    console.log('Database connected successfully');
  } catch (error) {
    console.error('Failed to connect to database:', error);
    process.exit(1);
  }
};

// Middleware
app.use(cors({
  origin: [
    process.env.FRONTEND_URL || 'http://localhost:5173',
    'http://localhost:8080',
    'http://localhost:5174',
    'https://www.aws11.shop',
    'https://web.aws11.shop',
    'https://api.aws11.shop',
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  preflightContinue: false,
  optionsSuccessStatus: 204,
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Health check endpoint (with DB query for load testing)
app.get('/auth/health', async (req: Request, res: Response) => {
  try {
    // Simple DB query to generate load
    const db = getDatabaseService();
    await db.query('SELECT 1');
    res.json({ status: 'ok', timestamp: new Date().toISOString(), db: 'connected' });
  } catch (error) {
    res.status(503).json({ status: 'error', timestamp: new Date().toISOString(), db: 'disconnected' });
  }
});

// API routes
app.use('/auth/user', userRoutes);

// Error handler (must be last)
app.use(errorHandler);

// Start server
if (process.env.NODE_ENV !== 'test') {
  initDatabase().then(() => {
    app.listen(PORT, () => {
      console.log(`API Server running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  });
}

export default app;
