import { Request, Response, NextFunction } from 'express';
import { verifyToken, JwtPayload } from '../config/jwt';

// Extend Express Request to include user
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: '未提供认证令牌' });
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = verifyToken(token);
    if (decoded.type !== 'access') {
      res.status(401).json({ error: '无效的令牌类型' });
      return;
    }
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: '令牌无效或已过期' });
  }
}
