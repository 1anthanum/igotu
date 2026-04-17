import express from 'express';
import cors from 'cors';
import path from 'path';
import { env } from './config/environment';
import { errorHandler } from './middleware/errorHandler';
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

// Middleware
app.use(cors({
  origin: env.CORS_ORIGIN,
  credentials: true,
}));
app.use(express.json());

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes — Original (MicroWins)
app.use('/api/auth', authRoutes);
app.use('/api/achievements', achievementRoutes);
app.use('/api/templates', templateRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/encouragement', encouragementRoutes);
app.use('/api/user', userRoutes);

// Routes — IGOTU modules
app.use('/api/chat', chatRoutes);
app.use('/api/phq9', phq9Routes);
app.use('/api/exercises', exerciseRoutes);
app.use('/api/cognitive', cognitiveRoutes);
app.use('/api/mood', moodRoutes);

// Error handling (for API routes)
app.use('/api', errorHandler);

// ── Serve frontend static files in production ──
// In production, the built Vue app lives in ../public (relative to dist/)
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
