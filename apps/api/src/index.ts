import dotenv from 'dotenv';
dotenv.config({ path: '../../.env' });

import express from 'express';
import os from 'os';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import authRoutes from './routes/auth';
import userRoutes from './routes/user';
import communityRoutes from './routes/community';
import memberRoutes from './routes/member';
import postRoutes from './routes/post';
import moderationRoutes from './routes/moderation';
import commentRoutes from './routes/comments';
import reactionRoutes from './routes/reactions';
import docsRoutes from './routes/docs';
import uploadRoutes from './routes/upload.routes';
import fileVersionRoutes from './routes/fileVersions.routes';
import courseRoutes from './routes/course';
import messageRoutes from './routes/message';
import gamificationRoutes from './routes/gamification';
import trackingRoutes from './routes/tracking';
import notificationRoutes from './routes/notification';
import searchRoutes from './routes/search.routes';
import eventRoutes from './routes/event';
import eventAttendeeRoutes from './routes/eventAttendee';
import bookmarkRoutes from './routes/bookmark';
import adminRoutes from './routes/admin/index';
let paymentRoutes: any;
try {
  // Optional: only mount payments if the package/config is available
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  paymentRoutes = require('./routes/payment.routes').default;
} catch (error) {
  console.warn('Payments routes disabled (missing optional dependency):', (error as any)?.message || error);
}
// Gate analytics (realtime imports may fail due to authorize mismatch)
let analyticsRoutes: any;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  analyticsRoutes = require('./routes/analytics').default;
} catch (error) {
  console.warn('Analytics routes disabled (optional module failed to load):', (error as any)?.message || error);
}
import adminMetricsRoutes from './routes/admin/metrics.routes';
/* analytics routes optional load gated below */
import recommendationRoutes from './routes/recommendation.routes';
import { healthCheck } from './controllers/healthController';
import { errorHandler, notFound } from './middleware/errorHandler';
import { requestId } from './middleware/requestId';
import { initializeSocket } from './services/socket.service';
import { requestTiming } from './middleware/timing';
import metricsRoutes from './routes/metrics';
import { initializeAnalyticsSocket } from './services/analytics.socket.service';
import { cronService } from './services/cron.service';

// Initialize push service only if VAPID keys are configured
let pushService: any;
try {
  if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    pushService = require('./services/push.service').pushService;
 }
} catch (error) {
  console.warn('Push service initialization failed:', error);
}

const app: express.Application = express();
const server = http.createServer(app);
const INSTANCE_ID = process.env.INSTANCE_ID || process.env.HOSTNAME || os.hostname();

// Initialize Socket.io
const socketService = initializeSocket(server);
initializeAnalyticsSocket(socketService);

const PORT = process.env.PORT || 4000;

// Middleware
app.use(helmet());
app.use(requestId);
// Add these CORS options
const corsOptions = {
  origin: process.env.APP_URL || 'http://localhost:3000',
  credentials: true,
  optionsSuccessStatus: 200,
};

// Update the cors middleware
app.use(cors(corsOptions));
app.use(compression());
app.use(morgan('dev'));
app.use(
  express.json({
    verify: (req: any, _res, buf) => {
      if (buf?.length) {
        req.rawBody = Buffer.from(buf);
      }
    },
  })
);
app.use(express.urlencoded({ extended: true }));
// Record basic timings and counters for Prometheus
app.use(requestTiming);

// Leniently ignore JSON parse errors for GET requests so health/status endpoints remain accessible
app.use((err: any, req: any, res: any, next: any) => {
  const isJsonParseError = err?.type === 'entity.parse.failed' || err instanceof SyntaxError;
  if (isJsonParseError && req?.method === 'GET') return next();
  next(err);
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/communities', communityRoutes);
app.use('/api/members', memberRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/reactions', reactionRoutes);
app.use('/api/docs', docsRoutes);
app.use('/api/uploads', uploadRoutes);
app.use('/api/files', fileVersionRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/gamification', gamificationRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api', searchRoutes);
app.use('/', metricsRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/event-attendees', eventAttendeeRoutes);
app.use('/api/bookmarks', bookmarkRoutes);
app.use('/api/admin', adminRoutes);
if (paymentRoutes) {
  app.use('/api/payments', paymentRoutes);
}
app.use('/api/admin/metrics', adminMetricsRoutes);
app.use('/api/moderation', moderationRoutes);
if (analyticsRoutes) {
  app.use('/api/analytics', analyticsRoutes);
}
app.use('/api/recommendations', recommendationRoutes);
app.use('/track', trackingRoutes);

// Health check
app.get('/health', healthCheck);

// Socket health + broadcast probe (no auth)
app.get('/health/socket', (req: any, res: any) => {
  try {
    const online = socketService.getOnlineUsers?.() ?? [];
    const info: any = {
      ok: true,
      instanceId: INSTANCE_ID,
      onlineCount: Array.isArray(online) ? online.length : 0,
      onlineUsers: online,
      time: new Date().toISOString(),
    };
    if (String(req.query?.broadcast).toLowerCase() === 'true') {
      const payload = { type: 'health_broadcast', ...info };
      socketService.broadcast?.('health_broadcast', payload);
      info.broadcasted = true;
    }
    res.setHeader('X-Instance-Id', INSTANCE_ID);
    res.json(info);
  } catch (e) {
    res.status(500).json({ ok: false, error: 'Socket health failed', instanceId: INSTANCE_ID });
  }
});

// Not found handler
app.use(notFound);

// Error handling
app.use(errorHandler);

// Export app for testing
export default app;

// Start server (skip during tests)
if (process.env.NODE_ENV !== 'test') {
  server.listen(PORT, () => {
    console.log(`🚀 API server running on http://localhost:${PORT}`);
    cronService.start();
  });
}
