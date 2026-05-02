import { Request, Response, NextFunction } from 'express';
import { env } from '../config/environment';

/**
 * Lightweight password gate for the whole API.
 *
 * Activated only when env.ACCESS_PASSWORD is non-empty (i.e. shared deployment).
 * In local dev with no password set, this middleware is a no-op.
 *
 * Auth signal can come from either:
 *   - Header `X-Access-Password`
 *   - Cookie `ofe_access` (set after a successful POST /api/access-gate/check)
 *
 * This is friction control on top of the user's own JWT auth — not a security
 * boundary in itself. Real protection lives in the Cloudflare Worker's
 * X-Access-Password check + per-IP rate limit on the upstream Anthropic call.
 */

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function readCookie(req: Request, name: string): string {
  const raw = req.headers.cookie;
  if (!raw) return '';
  for (const part of raw.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === name) return decodeURIComponent(v.join('='));
  }
  return '';
}

export function accessGate(req: Request, res: Response, next: NextFunction) {
  // No password configured → middleware off
  if (!env.ACCESS_PASSWORD) return next();

  // Allow the gate-check endpoint and health check.
  // The middleware is mounted at `/api`, so `req.path` is relative ('/health', not '/api/health').
  // We support both forms to be safe.
  const path = req.path;
  if (
    path === '/health' ||
    path === '/access-gate/check' ||
    path === '/api/health' ||
    path === '/api/access-gate/check'
  ) {
    return next();
  }

  const provided =
    (req.header('X-Access-Password') ?? '') || readCookie(req, 'ofe_access');

  if (provided && timingSafeEqual(provided, env.ACCESS_PASSWORD)) {
    return next();
  }

  res.status(401).json({ error: 'unauthorized', message: 'Access password required' });
}

/** POST /api/access-gate/check — frontend uses this to redeem the password for a cookie. */
export function accessGateCheck(req: Request, res: Response) {
  if (!env.ACCESS_PASSWORD) {
    return res.json({ ok: true, gated: false });
  }
  const password = String(req.body?.password ?? '');
  if (!password || !timingSafeEqual(password, env.ACCESS_PASSWORD)) {
    return res.status(401).json({ ok: false, error: 'wrong_password' });
  }
  // 30-day cookie. SameSite=Lax for cross-site embedding tolerance; Secure in prod.
  const isProd = env.NODE_ENV === 'production';
  const maxAge = 60 * 60 * 24 * 30;
  res.setHeader(
    'Set-Cookie',
    `ofe_access=${encodeURIComponent(password)}; Path=/; Max-Age=${maxAge}; SameSite=${
      isProd ? 'None' : 'Lax'
    }${isProd ? '; Secure' : ''}; HttpOnly`,
  );
  res.json({ ok: true, gated: true });
}
