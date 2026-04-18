import { Request, Response, NextFunction } from 'express';
import { verifyToken, JwtPayload } from '../config/jwt';
import { isTokenRevoked, isUserTokenRevoked } from './tokenBlacklist';

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

    // Check if this specific token has been revoked (logout)
    if (decoded.jti && isTokenRevoked(decoded.jti)) {
      res.status(401).json({ error: '令牌已被注销' });
      return;
    }

    // Check if all tokens for this user were revoked (force logout)
    if (decoded.iat && isUserTokenRevoked(decoded.sub, decoded.iat)) {
      res.status(401).json({ error: '令牌已被注销' });
      return;
    }

    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: '令牌无效或已过期' });
  }
}
