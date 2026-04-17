/**
 * Test setup — uses an in-memory SQLite database for isolation.
 */
import { beforeAll, afterAll } from 'vitest';

// Override DB_PATH to use in-memory before any imports touch the database
process.env.DB_PATH = ':memory:';
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret';

import { testConnection } from '../config/database';
import { runMigrations } from '../migrations/runner';

beforeAll(() => {
  testConnection();
  runMigrations();
});
