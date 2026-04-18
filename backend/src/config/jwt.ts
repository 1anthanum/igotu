import jwt, { SignOptions } from 'jsonwebtoken';
import { randomUUID } from 'crypto';
import { env } from './environment';

export interface JwtPayload {
  sub: string;       // user id
  email: string;
  type: 'access' | 'refresh';
  jti?: string;      // unique token ID (for revocation)
  iat?: number;      // issued at (auto-set by jsonwebtoken)
}

export function signAccessToken(userId: string, email: string): string {
  return jwt.sign(
    { sub: userId, email, type: 'access', jti: randomUUID() } as JwtPayload,
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN } as SignOptions
  );
}

export function signRefreshToken(userId: string, email: string): string {
  return jwt.sign(
    { sub: userId, email, type: 'refresh', jti: randomUUID() } as JwtPayload,
    env.JWT_SECRET,
    { expiresIn: env.JWT_REFRESH_EXPIRES_IN } as SignOptions
  );
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, env.JWT_SECRET) as JwtPayload;
}

/** Decode without verification (to extract expiry for blacklisting) */
export function decodeToken(token: string): JwtPayload | null {
  const decoded = jwt.decode(token);
  return decoded as JwtPayload | null;
}
