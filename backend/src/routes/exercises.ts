import { Router, Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { authenticate } from '../middleware/auth';
import { query } from '../config/database';

const router = Router();

// POST /api/exercises — Log an exercise completion
router.post('/', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.sub;
    const { type, technique, data } = req.body;

    if (!type || !['breathing', 'grounding'].includes(type)) {
      return res.status(400).json({ error: 'type must be "breathing" or "grounding"' });
    }

    const id = uuidv4();
    query(
      `INSERT INTO exercise_logs (id, user_id, type, technique, data)
       VALUES (?, ?, ?, ?, ?)`,
      [id, userId, type, technique || null, JSON.stringify(data || {})]
    );

    const result = query('SELECT * FROM exercise_logs WHERE id = ?', [id]);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

// GET /api/exercises — Get exercise history
router.get('/', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.sub;
    const type = req.query.type as string;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);

    let sql = `SELECT * FROM exercise_logs WHERE user_id = ?`;
    const params: any[] = [userId];

    if (type && ['breathing', 'grounding'].includes(type)) {
      sql += ` AND type = ?`;
      params.push(type);
    }

    sql += ` ORDER BY completed_at DESC LIMIT ?`;
    params.push(limit);

    const result = query(sql, params);
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

// GET /api/exercises/stats — Get exercise stats
router.get('/stats', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.sub;

    const result = query(
      `SELECT type, COUNT(*) as count,
              MAX(completed_at) as last_completed
       FROM exercise_logs
       WHERE user_id = ?
       GROUP BY type`,
      [userId]
    );

    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

export default router;
