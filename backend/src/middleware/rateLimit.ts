/**
 * Zero-dependency rate limiter middleware for Express.
 * Uses in-memory sliding window per IP.
 *
 * NOTE: For multi-process / clustered deployments, replace
 * the in-memory store with Redis or a shared store.
 */
import { Request, Response, NextFunction } from 'express';

interface WindowEntry {
  count: number;
  resetAt: number;
}

const stores = new Map<string, Map<string, WindowEntry>>();

// Cleanup expired entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [, store] of stores) {
    for (const [key, entry] of store) {
      if (now > entry.resetAt) store.delete(key);
    }
  }
}, 5 * 60 * 1000);

interface RateLimitOptions {
  /** Time window in milliseconds */
  windowMs: number;
  /** Max requests per window */
  max: number;
  /** Error message when rate limited */
  message?: string;
  /** Unique name for this limiter (to separate stores) */
  name?: string;
  /** Key extractor — defaults to IP */
  keyGenerator?: (req: Request) => string;
}

export function rateLimit(options: RateLimitOptions) {
  const {
    windowMs,
    max,
    message = '请求过于频繁，请稍后再试',
    name = 'default',
    keyGenerator = (req: Request) =>
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim()
      || req.socket.remoteAddress
      || 'unknown',
  } = options;

  if (!stores.has(name)) {
    stores.set(name, new Map());
  }
  const store = stores.get(name)!;

  return (req: Request, res: Response, next: NextFunction): void => {
    const key = keyGenerator(req);
    const now = Date.now();
    const entry = store.get(key);

    if (!entry || now > entry.resetAt) {
      // New window
      store.set(key, { count: 1, resetAt: now + windowMs });
      res.setHeader('X-RateLimit-Limit', max);
      res.setHeader('X-RateLimit-Remaining', max - 1);
      next();
      return;
    }

    entry.count++;

    if (entry.count > max) {
      const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
      res.setHeader('Retry-After', retryAfter);
      res.setHeader('X-RateLimit-Limit', max);
      res.setHeader('X-RateLimit-Remaining', 0);
      res.status(429).json({ error: message });
      return;
    }

    res.setHeader('X-RateLimit-Limit', max);
    res.setHeader('X-RateLimit-Remaining', max - entry.count);
    next();
  };
}

// ── Pre-configured limiters ──

/** Auth endpoints: 10 attempts per 15 minutes per IP */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: '登录/注册尝试过多，请15分钟后再试',
  name: 'auth',
});

/** Chat (Claude API): 30 messages per 5 minutes per user */
export const chatLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 30,
  message: '消息发送过于频繁，请稍后再试',
  name: 'chat',
  // Rate limit by user ID (from JWT), not IP
  keyGenerator: (req: Request) => req.user?.sub || req.socket.remoteAddress || 'unknown',
});

/** General API: 200 requests per minute per IP */
export const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 200,
  message: '请求过于频繁，请稍后再试',
  name: 'api',
});
