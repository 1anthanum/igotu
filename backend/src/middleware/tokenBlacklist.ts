/**
 * In-memory JWT blacklist for logout support.
 *
 * Stores revoked token JTI (JWT ID) with expiration time.
 * Automatically purges expired entries every 10 minutes.
 *
 * NOTE: For multi-process deployments, replace with Redis
 * or a database-backed store.
 */

const blacklist = new Map<string, number>(); // jti → expiry timestamp

// Cleanup expired entries every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [jti, expiry] of blacklist) {
    if (now > expiry) blacklist.delete(jti);
  }
}, 10 * 60 * 1000);

/**
 * Add a token to the blacklist.
 * @param jti - Unique token identifier
 * @param expiresAt - Token expiration time (Unix ms)
 */
export function revokeToken(jti: string, expiresAt: number): void {
  blacklist.set(jti, expiresAt);
}

/**
 * Check if a token has been revoked.
 */
export function isTokenRevoked(jti: string): boolean {
  return blacklist.has(jti);
}

/**
 * Revoke all tokens for a user by storing a "revoked before" timestamp.
 * This is a separate map that tracks per-user revocation.
 */
const userRevokedBefore = new Map<string, number>();

export function revokeAllUserTokens(userId: string): void {
  userRevokedBefore.set(userId, Date.now());
}

export function isUserTokenRevoked(userId: string, tokenIssuedAt: number): boolean {
  const revokedBefore = userRevokedBefore.get(userId);
  if (!revokedBefore) return false;
  // Token was issued before the revocation → it's revoked
  return tokenIssuedAt * 1000 <= revokedBefore;
}
