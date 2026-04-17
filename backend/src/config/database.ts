import Database from 'better-sqlite3';
import { env } from './environment';

let db: Database.Database;

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(env.DB_PATH, {
      verbose: env.NODE_ENV === 'development' ? console.log : undefined,
    });

    // Enable WAL mode for better concurrent read performance
    db.pragma('journal_mode = WAL');
    // Enable foreign keys
    db.pragma('foreign_keys = ON');
    // Reasonable busy timeout (5s)
    db.pragma('busy_timeout = 5000');
  }
  return db;
}

/**
 * Compatibility wrapper — keeps the { rows, rowCount } interface
 * so existing code can migrate with minimal changes.
 *
 * - SELECT queries  → returns { rows: [...] }
 * - INSERT/UPDATE/DELETE with RETURNING → returns { rows: [...], rowCount }
 * - INSERT/UPDATE/DELETE without RETURNING → returns { rows: [], rowCount: changes }
 *
 * Converts PostgreSQL-style $1, $2 placeholders to SQLite ? placeholders.
 */
export function query(text: string, params?: any[]): { rows: any[]; rowCount: number } {
  const database = getDb();

  // Convert $1, $2, ... to ? placeholders
  let sqliteText = text.replace(/\$\d+/g, '?');

  // Remove PostgreSQL-specific casts like ::text, ::int, ::date, ::jsonb
  sqliteText = sqliteText.replace(/::(text|int|integer|date|jsonb|timestamptz|timestamp|varchar)/gi, '');

  // Trim whitespace
  sqliteText = sqliteText.trim();

  const isSelect = /^\s*(SELECT|WITH)\b/i.test(sqliteText);
  const hasReturning = /\bRETURNING\b/i.test(sqliteText);

  if (isSelect) {
    const stmt = database.prepare(sqliteText);
    const rows = stmt.all(...(params || []));
    return { rows, rowCount: rows.length };
  }

  if (hasReturning) {
    // SQLite supports RETURNING since 3.35.0
    const stmt = database.prepare(sqliteText);
    const rows = stmt.all(...(params || []));
    return { rows, rowCount: rows.length };
  }

  // Non-SELECT, non-RETURNING — run and return changes count
  const stmt = database.prepare(sqliteText);
  const info = stmt.run(...(params || []));
  return { rows: [], rowCount: info.changes };
}

/**
 * Run multiple statements inside a transaction (synchronous).
 */
export function transaction<T>(fn: () => T): T {
  const database = getDb();
  const runInTransaction = database.transaction(fn);
  return runInTransaction();
}

/**
 * Verify the database is accessible
 */
export function testConnection(): void {
  const database = getDb();
  const result = database.prepare("SELECT datetime('now') as now").get() as any;
  console.log(`✅ SQLite database connected: ${env.DB_PATH}`);
  console.log(`   Current time: ${result.now}`);
}

/**
 * Graceful shutdown
 */
export function closeDb(): void {
  if (db) {
    db.close();
    console.log('🔒 Database connection closed');
  }
}
