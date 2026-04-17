import jwt from 'jsonwebtoken';
import { env } from './environment';

export interface JwtPayload {
  sub: string;       // user id
  email: string;
  type: 'access' | 'refresh';
}

export function signAccessToken(userId: string, email: string): string {
  return jwt.sign(
    { sub: userId, email, type: 'access' } as JwtPayload,
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN }
  );
}

export function signRefreshToken(userId: string, email: string): string {
  return jwt.sign(
    { sub: userId, email, type: 'refresh' } as JwtPayload,
    env.JWT_SECRET,
    { expiresIn: env.JWT_REFRESH_EXPIRES_IN }
  );
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, env.JWT_SECRET) as JwtPayload;
}
