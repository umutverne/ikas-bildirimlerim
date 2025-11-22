import pkg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const { Pool } = pkg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigrations() {
  // Only run if DATABASE_URL is set (PostgreSQL mode)
  if (!process.env.DATABASE_URL) {
    console.log('⚠️  No DATABASE_URL - Skipping PostgreSQL migrations (SQLite will auto-create tables)');
    return;
  }

  console.log('🔄 Running PostgreSQL migrations...');
  console.log('📡 Database URL:', process.env.DATABASE_URL ? 'Set ✅' : 'Not set ❌');

  let pool;
  try {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      connectionTimeoutMillis: 10000
    });

    // Test connection
    console.log('🔌 Testing database connection...');
    await pool.query('SELECT NOW()');
    console.log('✅ Database connection successful');

    // Read all migration files
    const migrationsDir = path.join(__dirname, '../migrations');
    console.log('📁 Migrations directory:', migrationsDir);

    const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql') && !f.startsWith('000_')).sort();
    console.log('📋 Found migrations:', files.join(', '));

    for (const file of files) {
      console.log(`📄 Running migration: ${file}`);
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
      await pool.query(sql);
      console.log(`✅ Migration completed: ${file}`);
    }

    console.log('✅ All migrations completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('Stack:', error.stack);
    // Don't throw - let the server start anyway
    console.warn('⚠️  Continuing despite migration error...');
  } finally {
    if (pool) {
      await pool.end();
      console.log('🔌 Database connection closed');
    }
  }
}

// Run migrations - don't exit on error
runMigrations().catch(error => {
  console.error('Fatal error during migration:', error.message);
  // Don't exit - let server start
  console.warn('⚠️  Migration error ignored, server will start...');
});
