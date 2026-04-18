import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authService } from '../services/AuthService';
import { validate } from '../middleware/validation';
import { verifyToken, decodeToken, signAccessToken, signRefreshToken } from '../config/jwt';
import { authenticate } from '../middleware/auth';
import { revokeToken, revokeAllUserTokens } from '../middleware/tokenBlacklist';

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

    res.json({
      accessToken: signAccessToken(decoded.sub, decoded.email),
      refreshToken: signRefreshToken(decoded.sub, decoded.email),
    });
  } catch (err) {
    res.status(401).json({ error: '刷新令牌无效或已过期' });
  }
});

// POST /api/auth/logout — Revoke current token
router.post('/logout', authenticate, (req: Request, res: Response) => {
  const token = req.headers.authorization!.split(' ')[1];
  const decoded = decodeToken(token);
  if (decoded?.jti) {
    // Calculate when this token expires (iat + maxAge)
    const exp = (decoded as any).exp;
    const expiresAt = exp ? exp * 1000 : Date.now() + 7 * 24 * 60 * 60 * 1000;
    revokeToken(decoded.jti, expiresAt);
  }
  res.json({ success: true, message: '已登出' });
});

// POST /api/auth/logout-all — Revoke all tokens for this user
router.post('/logout-all', authenticate, (req: Request, res: Response) => {
  revokeAllUserTokens(req.user!.sub);
  res.json({ success: true, message: '已登出所有设备' });
});

export default router;
