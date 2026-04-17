import { Router, Request, Response, NextFunction } from 'express';
import { encouragementService } from '../services/EncouragementService';
import { authenticate } from '../middleware/auth';

const router = Router();
router.use(authenticate);

// GET /api/encouragement/current
router.get('/current', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const messages = await encouragementService.getCurrent(req.user!.sub);
    res.json(messages);
  } catch (err) {
    next(err);
  }
});

export default router;
