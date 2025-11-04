import { Database } from 'bun:sqlite';
import { readFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';

let db: Database | null = null;

export function getDatabase(): Database {
  if (db) return db;

  const dbPath = process.env.DATABASE_PATH || join(process.cwd(), 'data', 'app.db');
  
  // Create parent directory if it doesn't exist
  mkdirSync(dirname(dbPath), { recursive: true });
  
  db = new Database(dbPath, { create: true });

  // Enable foreign keys
  db.run('PRAGMA foreign_keys = ON;');
  
  // Enable WAL mode for better concurrency
  db.run('PRAGMA journal_mode = WAL;');

  return db;
}

export function runMigrations() {
  const db = getDatabase();
  const schemaPath = join(import.meta.dir, 'schema.sql');
  const schema = readFileSync(schemaPath, 'utf-8');

  // Split by semicolon and run each statement
  const statements = schema
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0);

  for (const statement of statements) {
    db.run(statement);
  }

  console.log('✅ Database migrations completed');
}

// Log query for debugging (optional, can be enabled/disabled)
export function logQuery(query: string, params?: any[]) {
  if (process.env.LOG_QUERIES === 'true') {
    console.log('[DB Query]', query, params || []);
  }
}

export function closeDatabase() {
  if (db) {
    db.close();
    db = null;
  }
}

