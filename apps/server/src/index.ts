import express from 'express';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import mongoSanitize from 'express-mongo-sanitize';
import rateLimit from 'express-rate-limit';
import path from 'path';

import { env } from './config/env';
import { connectDB } from './config/db';
import { getRedisClient } from './config/redis';
import { initializeSocket } from './config/socket';
import { initializeFirebase } from './config/firebase';
import { errorHandler } from './middleware/errorHandler';
import { setupSocketHandlers } from './socket/handlers';
import { startTelemetry } from './socket/telemetry';
import { startSubscriptionCron } from './jobs/subscriptionCron';
import { migrateDeviceTokens } from './utils/migrateDeviceTokens';

// Route imports
import authRoutes from './routes/auth';
import leadRoutes from './routes/leads';
import subscriptionRoutes from './routes/subscriptions';
import signalRoutes from './routes/signals';
import reviewRoutes from './routes/reviews';
import analyticsRoutes from './routes/analytics';
import configRoutes from './routes/config';
import planRoutes from './routes/plans';
import notificationRoutes from './routes/notifications';

const app = express();
const server = http.createServer(app);

// Trust proxy (behind nginx)
app.set('trust proxy', 1);

// Middleware
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({
  origin: env.CORS_ORIGIN.split(','),
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(mongoSanitize());

// Rate limiting on auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  message: { success: false, error: 'Too many requests, please try again later.' },
});

// Static file serving for uploads
app.use('/uploads', express.static(path.resolve(env.UPLOAD_DIR)));
app.use('/downloads', express.static(path.resolve('./uploads/app')));

// Routes
app.use('/api/v1/auth', authLimiter, authRoutes);
app.use('/api/v1/public/leads', leadRoutes);
app.use('/api/v1/public/payment-qr', subscriptionRoutes);
app.use('/api/v1/client/subscriptions', subscriptionRoutes);
app.use('/api/v1/admin/subscriptions', subscriptionRoutes);
app.use('/api/v1/signals', signalRoutes);
app.use('/api/v1/admin/signals', signalRoutes);
app.use('/api/v1/public/signals', signalRoutes);
app.use('/api/v1/client/reviews', reviewRoutes);
app.use('/api/v1/public/reviews', reviewRoutes);
app.use('/api/v1/admin/reviews', reviewRoutes);
app.use('/api/v1/admin/analytics', analyticsRoutes);
app.use('/api/v1/admin/export', analyticsRoutes);
app.use('/api/v1/config', configRoutes);
app.use('/api/v1/public/config', configRoutes);
app.use('/api/v1/plans', planRoutes);
app.use('/api/v1/public/plans', planRoutes);
app.use('/api/v1/admin/notifications', notificationRoutes);

// Health check
app.get('/api/v1/health', (_req, res) => {
  res.json({ success: true, message: 'The One Trade API is running', timestamp: new Date() });
});

// Error handler
app.use(errorHandler);

// Initialize and start
async function start() {
  try {
    // Connect to MongoDB
    await connectDB();

    // Migrate legacy deviceToken → deviceTokens array
    await migrateDeviceTokens();

    // Initialize Redis
    getRedisClient();

    // Initialize Firebase (stubbed until credentials provided)
    initializeFirebase();

    // Initialize Socket.io
    const io = initializeSocket(server);
    setupSocketHandlers(io);
    startTelemetry(io);

    // Start cron jobs
    startSubscriptionCron();

    // Start server
    server.listen(env.PORT, () => {
      console.warn(`Server running on port ${env.PORT} in ${env.NODE_ENV} mode`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

start();
