import express from 'express';
import cors from 'cors';
import path from 'path';
import { env } from './config/environment';
import { errorHandler } from './middleware/errorHandler';
import { requestLogger } from './middleware/requestLogger';
import { authLimiter, apiLimiter } from './middleware/rateLimit';
import { accessGate, accessGateCheck } from './middleware/accessGate';
import authRoutes from './routes/auth';
import achievementRoutes from './routes/achievements';
import templateRoutes from './routes/templates';
import analyticsRoutes from './routes/analytics';
import encouragementRoutes from './routes/encouragement';
import userRoutes from './routes/user';
import chatRoutes from './routes/chat';
import phq9Routes from './routes/phq9';
import exerciseRoutes from './routes/exercises';
import cognitiveRoutes from './routes/cognitive';
import moodRoutes from './routes/mood';

const app = express();

// ── Global middleware ──
app.use(cors({
  origin: env.CORS_ORIGIN,
  credentials: true,
}));
app.use(express.json({ limit: '1mb' })); // Limit request body size
app.use(requestLogger);

// ── Access password gate (no-op when ACCESS_PASSWORD is unset) ──
app.use('/api', accessGate);
app.post('/api/access-gate/check', accessGateCheck);

// ── Global rate limit (all API routes) ──
app.use('/api', apiLimiter);

// Health check (no rate limit beyond global)
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── Routes with targeted rate limits ──
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/achievements', achievementRoutes);
app.use('/api/templates', templateRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/encouragement', encouragementRoutes);
app.use('/api/user', userRoutes);

// Chat routes with per-user rate limit on message sending
app.use('/api/chat', chatRoutes);

// IGOTU modules
app.use('/api/phq9', phq9Routes);
app.use('/api/exercises', exerciseRoutes);
app.use('/api/cognitive', cognitiveRoutes);
app.use('/api/mood', moodRoutes);

// Error handling (for API routes)
app.use('/api', errorHandler);

// ── Serve frontend static files in production ──
if (env.NODE_ENV === 'production') {
  const publicPath = path.join(__dirname, '..', 'public');
  app.use(express.static(publicPath));

  // SPA fallback — all non-API routes serve index.html
  app.get('*', (_req, res) => {
    res.sendFile(path.join(publicPath, 'index.html'));
  });
}

// Error handling (catch-all)
app.use(errorHandler);

export default app;
