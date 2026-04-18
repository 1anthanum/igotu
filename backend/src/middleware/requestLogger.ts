/**
 * Request logging middleware.
 * Logs: method, path, status, duration, user (if authenticated).
 * Highlights sensitive operations for audit trail.
 */
import { Request, Response, NextFunction } from 'express';

const SENSITIVE_PATHS = [
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/refresh',
  '/api/auth/logout',
  '/api/user/export',
  '/api/user/import',
  '/api/chat/sessions',
];

function isSensitive(path: string, method: string): boolean {
  if (SENSITIVE_PATHS.some(p => path.startsWith(p))) return true;
  if (method === 'DELETE') return true;
  return false;
}

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();

  // Capture the original end to log after response is sent
  const originalEnd = res.end;
  res.end = function (...args: any[]) {
    const duration = Date.now() - start;
    const userId = req.user?.sub || '-';
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim()
      || req.socket.remoteAddress
      || '-';
    const sensitive = isSensitive(req.path, req.method);

    const logLine = [
      new Date().toISOString(),
      req.method,
      req.path,
      res.statusCode,
      `${duration}ms`,
      `user:${userId}`,
      `ip:${ip}`,
      sensitive ? '[AUDIT]' : '',
    ].filter(Boolean).join(' ');

    // Auth failures get warning level
    if (req.path.startsWith('/api/auth') && res.statusCode >= 400) {
      console.warn(`[AUTH-FAIL] ${logLine}`);
    } else if (res.statusCode >= 500) {
      console.error(`[ERROR] ${logLine}`);
    } else if (sensitive) {
      console.log(`[AUDIT] ${logLine}`);
    } else if (process.env.NODE_ENV !== 'production' || res.statusCode >= 400) {
      // In dev: log everything; in prod: only errors and audits
      console.log(`[REQ] ${logLine}`);
    }

    return originalEnd.apply(res, args as unknown as [any, BufferEncoding]);
  } as any;

  next();
}
