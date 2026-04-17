import { Router, Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { authenticate } from '../middleware/auth';
import { query } from '../config/database';

const router = Router();

const SEVERITY_LEVELS = [
  { min: 0, max: 4, label: '极轻微' },
  { min: 5, max: 9, label: '轻度抑郁' },
  { min: 10, max: 14, label: '中度抑郁' },
  { min: 15, max: 19, label: '中重度抑郁' },
  { min: 20, max: 27, label: '重度抑郁' },
];

function getSeverity(score: number): string {
  for (const level of SEVERITY_LEVELS) {
    if (score >= level.min && score <= level.max) return level.label;
  }
  return '重度抑郁';
}

// POST /api/phq9 — Submit a PHQ-9 assessment
router.post('/', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.sub;
    const { answers, functional_impact } = req.body;

    if (!answers || typeof answers !== 'object') {
      return res.status(400).json({ error: 'answers object is required' });
    }

    const score = Object.values(answers as Record<string, number>).reduce((sum: number, v) => sum + (v as number), 0);
    const severity = getSeverity(score);

    const id = uuidv4();
    query(
      `INSERT INTO phq9_results (id, user_id, score, severity, answers, functional_impact)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, userId, score, severity, JSON.stringify(answers), functional_impact ?? null]
    );

    const result = query('SELECT * FROM phq9_results WHERE id = ?', [id]);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

// GET /api/phq9 — Get PHQ-9 history
router.get('/', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.sub;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);

    const result = query(
      `SELECT * FROM phq9_results
       WHERE user_id = ?
       ORDER BY created_at DESC
       LIMIT ?`,
      [userId, limit]
    );

    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

// GET /api/phq9/latest — Get latest result
router.get('/latest', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.sub;
    const result = query(
      `SELECT * FROM phq9_results
       WHERE user_id = ?
       ORDER BY created_at DESC
       LIMIT 1`,
      [userId]
    );

    res.json(result.rows[0] || null);
  } catch (err) {
    next(err);
  }
});

export default router;
