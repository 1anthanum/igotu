import dotenv from 'dotenv';
import path from 'path';
dotenv.config();

export const env = {
  PORT: parseInt(process.env.PORT || '3000', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',

  // Database (SQLite)
  DB_PATH: process.env.DB_PATH || path.join(process.cwd(), 'igotu.db'),

  // JWT
  JWT_SECRET: process.env.JWT_SECRET || 'dev-secret-change-in-production',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '30d',

  // Encryption
  ENCRYPTION_KEY: process.env.ENCRYPTION_KEY || 'a'.repeat(64), // 32-byte hex key

  // CORS
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:5173',

  // Anthropic (Claude API)
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY || '',
  ANTHROPIC_MODEL: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514',
  ANTHROPIC_MAX_TOKENS: parseInt(process.env.ANTHROPIC_MAX_TOKENS || '4096', 10),
};

// Validate critical env vars in production
if (env.NODE_ENV === 'production') {
  const required = ['JWT_SECRET', 'ENCRYPTION_KEY'];
  for (const key of required) {
    if (!process.env[key]) {
      throw new Error(`Missing required environment variable: ${key}`);
    }
  }
  if (env.JWT_SECRET === 'dev-secret-change-in-production') {
    throw new Error('JWT_SECRET must be changed from default value in production');
  }
  if (env.ENCRYPTION_KEY === 'a'.repeat(64)) {
    throw new Error('ENCRYPTION_KEY must be changed from default value in production');
  }
}
