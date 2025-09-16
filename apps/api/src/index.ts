import dotenv from 'dotenv';
dotenv.config({ path: '../../.env' });

import express from 'express';
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
// import searchRoutes from './routes/search.routes';
// import paymentRoutes from './routes/payment.routes';
import adminMetricsRoutes from './routes/admin/metrics.routes';
import analyticsRoutes from './routes/analytics';
import recommendationRoutes from './routes/recommendation.routes';
import { healthCheck } from './controllers/healthController';
import { errorHandler, notFound } from './middleware/errorHandler';
import { requestId } from './middleware/requestId';
import { initializeSocket } from './services/socket.service';
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
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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
// app.use('/api', searchRoutes);
// app.use('/api/payments', paymentRoutes);
app.use('/api/admin/metrics', adminMetricsRoutes);
app.use('/api/moderation', moderationRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/recommendations', recommendationRoutes);
app.use('/track', trackingRoutes);

// Health check
app.get('/health', healthCheck);

// Not found handler
app.use(notFound);

// Error handling
app.use(errorHandler);

// Export app for testing
export default app;

// Start server
server.listen(PORT, () => {
  console.log(`🚀 API server running on http://localhost:${PORT}`);
  cronService.start();
});
