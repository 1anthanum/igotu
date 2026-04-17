import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authService } from '../services/AuthService';
import { validate } from '../middleware/validation';
import { verifyToken } from '../config/jwt';

const router = Router();

const registerSchema = z.object({
  email: z.string().email('请输入有效的邮箱地址'),
  username: z.string().min(2, '用户名至少2个字符').max(50),
  password: z.string().min(6, '密码至少6个字符'),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// POST /api/auth/register
router.post('/register', validate(registerSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await authService.register(req.body);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/login
router.post('/login', validate(loginSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await authService.login(req.body);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/refresh
router.post('/refresh', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      res.status(400).json({ error: '缺少刷新令牌' });
      return;
    }

    const decoded = verifyToken(refreshToken);
    if (decoded.type !== 'refresh') {
      res.status(401).json({ error: '无效的令牌类型' });
      return;
    }

    const { signAccessToken, signRefreshToken } = require('../config/jwt');
    res.json({
      accessToken: signAccessToken(decoded.sub, decoded.email),
      refreshToken: signRefreshToken(decoded.sub, decoded.email),
    });
  } catch (err) {
    res.status(401).json({ error: '刷新令牌无效或已过期' });
  }
});

export default router;
