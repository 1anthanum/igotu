import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { query } from '../config/database';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validation';

const router = Router();
router.use(authenticate);

const templateSchema = z.object({
  title: z.string().min(1).max(100),
  emoji: z.string().max(10).optional(),
  category: z.string().max(50),
});

// GET /api/templates — Get user's templates
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = query(
      `SELECT id, title, emoji, category, sort_order, is_active
       FROM achievement_templates
       WHERE user_id = ? AND is_active = 1
       ORDER BY sort_order, title`,
      [req.user!.sub]
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

// POST /api/templates — Create custom template
router.post('/', validate(templateSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { title, emoji, category } = req.body;
    const id = uuidv4();
    query(
      `INSERT INTO achievement_templates (id, user_id, title, emoji, category)
       VALUES (?, ?, ?, ?, ?)`,
      [id, req.user!.sub, title, emoji || null, category]
    );
    const result = query(
      'SELECT id, title, emoji, category, sort_order FROM achievement_templates WHERE id = ?',
      [id]
    );
    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    // SQLite UNIQUE constraint error
    if (err.message && err.message.includes('UNIQUE constraint failed')) {
      res.status(409).json({ error: '该模板名称已存在' });
      return;
    }
    next(err);
  }
});

// PUT /api/templates/:id — Update template
router.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { title, emoji, category } = req.body;
    query(
      `UPDATE achievement_templates
       SET title = COALESCE(?, title),
           emoji = COALESCE(?, emoji),
           category = COALESCE(?, category)
       WHERE id = ? AND user_id = ?`,
      [title, emoji, category, req.params.id, req.user!.sub]
    );
    const result = query(
      'SELECT id, title, emoji, category FROM achievement_templates WHERE id = ? AND user_id = ?',
      [req.params.id, req.user!.sub]
    );
    if (result.rows.length === 0) {
      res.status(404).json({ error: '未找到该模板' });
      return;
    }
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/templates/:id — Soft delete
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = query(
      `UPDATE achievement_templates SET is_active = 0 WHERE id = ? AND user_id = ?`,
      [req.params.id, req.user!.sub]
    );
    if (result.rowCount === 0) {
      res.status(404).json({ error: '未找到该模板' });
      return;
    }
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

export default router;
