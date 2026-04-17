import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { achievementService } from '../services/AchievementService';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validation';

const router = Router();
router.use(authenticate);

const logSchema = z.object({
  templateId: z.string().uuid().optional(),
  title: z.string().min(1, '请输入成就名称').max(255),
  emoji: z.string().max(10).optional(),
  category: z.string().max(50).optional(),
  note: z.string().max(1000).optional(),
  recordedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

// POST /api/achievements — Log a new achievement (core action)
router.post('/', validate(logSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const achievement = await achievementService.log({
      userId: req.user!.sub,
      ...req.body,
    });
    res.status(201).json(achievement);
  } catch (err) {
    next(err);
  }
});

// GET /api/achievements — List with pagination
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await achievementService.list(req.user!.sub, {
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 20,
      category: req.query.category as string,
      startDate: req.query.startDate as string,
      endDate: req.query.endDate as string,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// GET /api/achievements/today — Today's achievements
router.get('/today', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const items = await achievementService.getToday(req.user!.sub);
    res.json({ items, count: items.length });
  } catch (err) {
    next(err);
  }
});

// GET /api/achievements/calendar — Heatmap data
router.get('/calendar', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const days = parseInt(req.query.days as string) || 365;
    const data = await achievementService.getCalendarData(req.user!.sub, days);
    res.json(data);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/achievements/:id
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const deleted = await achievementService.delete(req.user!.sub, req.params.id);
    if (!deleted) {
      res.status(404).json({ error: '未找到该成就' });
      return;
    }
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

export default router;
