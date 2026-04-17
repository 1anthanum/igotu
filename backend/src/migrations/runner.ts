import fs from 'fs';
import path from 'path';
import { getDb, query, transaction } from '../config/database';

export function runMigrations(): void {
  const db = getDb();

  // Ensure migrations table exists
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      applied_at TEXT DEFAULT (datetime('now'))
    )
  `);

  // Read migration files
  const migrationsDir = path.join(__dirname);
  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  for (const file of files) {
    const migrationName = file.replace('.sql', '');

    // Check if already applied
    const existing = db.prepare('SELECT 1 FROM schema_migrations WHERE name = ?').get(migrationName);

    if (!existing) {
      console.log(`📦 Running migration: ${migrationName}`);
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');

      transaction(() => {
        db.exec(sql);
        db.prepare('INSERT INTO schema_migrations (name) VALUES (?)').run(migrationName);
      });

      console.log(`   ✅ Migration applied: ${migrationName}`);
    }
  }

  console.log('✅ All migrations up to date');
}

// Allow running directly: npx ts-node src/migrations/runner.ts
if (require.main === module) {
  try {
    runMigrations();
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}
