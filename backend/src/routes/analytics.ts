import { Router, Request, Response, NextFunction } from 'express';
import { analyticsService } from '../services/AnalyticsService';
import { authenticate } from '../middleware/auth';

const router = Router();
router.use(authenticate);

// GET /api/analytics/weekly
router.get('/weekly', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const summary = await analyticsService.getWeeklySummary(req.user!.sub);
    res.json(summary);
  } catch (err) {
    next(err);
  }
});

// GET /api/analytics/monthly
router.get('/monthly', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const summary = await analyticsService.getMonthlySummary(req.user!.sub);
    res.json(summary);
  } catch (err) {
    next(err);
  }
});

// GET /api/analytics/patterns
router.get('/patterns', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const patterns = await analyticsService.detectPatterns(req.user!.sub);
    res.json(patterns);
  } catch (err) {
    next(err);
  }
});

export default router;
