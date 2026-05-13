import app from './app';
import { env } from './config/environment';
import { testConnection, closeDb } from './config/database';
import { runMigrations } from './migrations/runner';
import { startVEMBridge, stopVEMBridge } from './services/VEMBridge';

function start() {
  try {
    // Test database connection (synchronous with SQLite)
    testConnection();

    // Run pending migrations
    runMigrations();

    // Start server
    // Start VEM event bridge (no-op if VEM_BASE_URL not configured)
    startVEMBridge();

    app.listen(env.PORT, () => {
      console.log(`🌿 IGOTU API running on port ${env.PORT}`);
      console.log(`   Environment: ${env.NODE_ENV}`);
      console.log(`   Database: ${env.DB_PATH}`);
    });

    // Graceful shutdown
    process.on('SIGINT', () => {
      stopVEMBridge();
      closeDb();
      process.exit(0);
    });
    process.on('SIGTERM', () => {
      stopVEMBridge();
      closeDb();
      process.exit(0);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

start();
