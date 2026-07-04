// db/connection.js — SQLite database connection (sql.js / WASM)
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import initSqlJs from 'sql.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, '..');
const DATA_DIR = join(PROJECT_ROOT, '.data');
const DB_PATH = join(DATA_DIR, 'ar-overlay.db');

/** @type {import('sql.js').Database | null} */
let db = null;
let saveTimer = null;
let dirty = false;

const SAVE_DEBOUNCE_MS = 1000; // write to disk at most once per second

/**
 * Initialize the database: load existing or create new.
 * Must be called once at server startup.
 */
export async function initDatabase() {
  if (db) return db;

  const SQL = await initSqlJs();
  mkdirSync(DATA_DIR, { recursive: true });

  if (existsSync(DB_PATH)) {
    const buffer = readFileSync(DB_PATH);
    db = new SQL.Database(buffer);
    console.log(`[db] loaded existing database (${(buffer.length / 1024).toFixed(0)} KB)`);
  } else {
    db = new SQL.Database();
    console.log('[db] created new in-memory database');
  }

  // Enable WAL mode + foreign keys on every startup (not just new DBs)
  db.run('PRAGMA journal_mode=WAL');
  db.run('PRAGMA foreign_keys=ON');

  return db;
}

/**
 * Get the current database instance. Throws if not initialized.
 */
export function getDb() {
  if (!db) throw new Error('Database not initialized. Call initDatabase() first.');
  return db;
}

/**
 * Run a SQL statement (no return).
 */
export function run(sql, params = []) {
  markDirty();
  return getDb().run(sql, params);
}

/**
 * Execute a query and return rows.
 */
export function query(sql, params = []) {
  const stmt = getDb().prepare(sql);
  if (params.length > 0) stmt.bind(params);
  const rows = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject());
  }
  stmt.free();
  return rows;
}

/**
 * Execute a query and return a single row, or null.
 */
export function queryOne(sql, params = []) {
  const rows = query(sql, params);
  return rows.length > 0 ? rows[0] : null;
}

/**
 * Execute a statement and return { changes, lastInsertRowid }.
 */
export function exec(sql, params = []) {
  markDirty();
  return getDb().run(sql, params);
}

/**
 * Run multiple SQL statements (semicolon-separated).
 */
export function execScript(sql) {
  markDirty();
  return getDb().exec(sql);
}

/**
 * Mark database as dirty — schedule a save to disk.
 */
function markDirty() {
  dirty = true;
  if (saveTimer) return;
  saveTimer = setTimeout(() => {
    saveToDisk();
    saveTimer = null;
  }, SAVE_DEBOUNCE_MS);
}

/**
 * Persist the in-memory database to disk.
 */
export function saveToDisk() {
  if (!db || !dirty) return;
  try {
    const data = db.export();
    writeFileSync(DB_PATH, Buffer.from(data));
    dirty = false;
  } catch (err) {
    console.error('[db] failed to save:', err.message);
  }
}

/**
 * Force immediate save (call before server shutdown).
 */
export function closeDatabase() {
  if (saveTimer) {
    clearTimeout(saveTimer);
    saveTimer = null;
  }
  saveToDisk();
  if (db) {
    db.close();
    db = null;
    console.log('[db] database closed');
  }
}

/**
 * Check if database is initialized.
 */
export function isReady() {
  return db !== null;
}
