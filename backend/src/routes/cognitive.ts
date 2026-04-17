import { Router, Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { authenticate } from '../middleware/auth';
import { query } from '../config/database';

const router = Router();

// POST /api/cognitive — Save a cognitive restructuring record
router.post('/', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.sub;
    const {
      thought,
      emotions,
      distortions,
      intensity_before,
      supporting_evidence,
      counter_evidence,
      balanced_thought,
      intensity_after,
    } = req.body;

    if (!thought) {
      return res.status(400).json({ error: 'thought is required' });
    }

    const id = uuidv4();
    query(
      `INSERT INTO cognitive_records
        (id, user_id, thought, emotions, distortions, intensity_before, supporting_evidence, counter_evidence, balanced_thought, intensity_after)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        userId,
        thought,
        JSON.stringify(emotions || []),
        JSON.stringify(distortions || []),
        intensity_before || null,
        supporting_evidence || null,
        counter_evidence || null,
        balanced_thought || null,
        intensity_after || null,
      ]
    );

    const result = query('SELECT * FROM cognitive_records WHERE id = ?', [id]);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

// GET /api/cognitive — Get cognitive restructuring history
router.get('/', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.sub;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);

    const result = query(
      `SELECT * FROM cognitive_records
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

export default router;
