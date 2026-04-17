import { Router, Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { authenticate } from '../middleware/auth';
import { query } from '../config/database';

const router = Router();

// POST /api/mood — Log a mood entry
router.post('/', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.sub;
    const { mood_score, mood_emoji, mood_label, note } = req.body;

    if (!mood_score || !mood_emoji || !mood_label) {
      return res.status(400).json({ error: 'mood_score, mood_emoji, mood_label are required' });
    }

    const id = uuidv4();
    query(
      `INSERT INTO mood_entries (id, user_id, mood_score, mood_emoji, mood_label, note)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, userId, mood_score, mood_emoji, mood_label, note || null]
    );

    const result = query('SELECT * FROM mood_entries WHERE id = ?', [id]);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

// GET /api/mood — Get mood entries (paginated)
router.get('/', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.sub;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
    const offset = parseInt(req.query.offset as string) || 0;

    const result = query(
      `SELECT * FROM mood_entries
       WHERE user_id = ?
       ORDER BY recorded_at DESC
       LIMIT ? OFFSET ?`,
      [userId, limit, offset]
    );

    const countResult = query(
      'SELECT COUNT(*) as count FROM mood_entries WHERE user_id = ?',
      [userId]
    );

    res.json({
      entries: result.rows,
      total: countResult.rows[0].count,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/mood/today — Get today's mood entries
router.get('/today', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.sub;
    const result = query(
      `SELECT * FROM mood_entries
       WHERE user_id = ? AND date(recorded_at) = date('now')
       ORDER BY recorded_at DESC`,
      [userId]
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

// GET /api/mood/trend — Get mood trend (last N days)
router.get('/trend', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.sub;
    const days = Math.min(parseInt(req.query.days as string) || 30, 90);

    // Compute cutoff date in JS for reliable SQLite compatibility
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const cutoffStr = cutoff.toISOString();

    const result = query(
      `SELECT mood_score, mood_emoji, mood_label, note, recorded_at
       FROM mood_entries
       WHERE user_id = ? AND recorded_at >= ?
       ORDER BY recorded_at ASC`,
      [userId, cutoffStr]
    );

    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

export default router;
