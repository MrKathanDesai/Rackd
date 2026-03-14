import Database from 'better-sqlite3';
import { readFileSync } from 'fs';
import { join, resolve, isAbsolute } from 'path';

// Resolve DATABASE_PATH relative to backend root (parent of src/), not CWD
const BACKEND_ROOT = join(__dirname, '../..');
const rawDbPath = process.env.DATABASE_PATH || './rackd.db';
const DB_PATH = isAbsolute(rawDbPath) ? rawDbPath : resolve(BACKEND_ROOT, rawDbPath);

export const db = new Database(DB_PATH);

// Enable foreign keys
db.pragma('foreign_keys = ON');
// Enable WAL mode for better concurrent read performance
db.pragma('journal_mode = WAL');

// Initialize database with schema
export function migrate() {
  const schema = readFileSync(join(__dirname, 'schema.sql'), 'utf-8');
  db.exec(schema);
  console.log('Database schema initialized');
}

// Run migrations on startup if tables don't exist
const tableCheck = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='users'").get();
if (!tableCheck) {
  console.log('No database found, running migrations...');
  migrate();
} else {
  // Incremental migrations for existing databases
  runIncrementalMigrations();
}

function runIncrementalMigrations() {
  // Helper: check if a column exists on a table
  function hasColumn(table: string, column: string): boolean {
    const cols = db.pragma(`table_info(${table})`) as Array<{ name: string }>;
    return cols.some((c) => c.name === column);
  }

  // Helper: check if a table exists
  function hasTable(name: string): boolean {
    const row = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?")
      .get(name);
    return !!row;
  }

  // ── Rebuild users table to update CHECK constraint ────────────────
  // The original CHECK is `role IN ('manager', 'staff')` — we need 'superadmin'.
  // Check current constraint by inspecting the CREATE TABLE SQL directly.
  const needsRebuild = (() => {
    // If is_super_admin column doesn't exist, we definitely need to rebuild
    if (!hasColumn('users', 'is_super_admin')) return true;
    // Check the actual table DDL for the CHECK constraint
    const tableInfo = db
      .prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='users'")
      .get() as { sql: string } | undefined;
    if (!tableInfo) return true;
    // If the DDL doesn't include 'superadmin' in the role CHECK, need rebuild
    return !tableInfo.sql.includes("'superadmin'");
  })();

  if (needsRebuild) {
    console.log('Migration: rebuilding users table with updated schema');
    db.exec('PRAGMA foreign_keys = OFF');

    db.exec(`
      CREATE TABLE users_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL DEFAULT '',
        role TEXT NOT NULL CHECK(role IN ('superadmin', 'manager', 'staff')),
        is_super_admin INTEGER NOT NULL DEFAULT 0,
        status TEXT NOT NULL CHECK(status IN ('active', 'invited', 'deactivated')) DEFAULT 'active',
        invite_code TEXT,
        invite_expires TEXT,
        last_login TEXT,
        created_by INTEGER,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
      )
    `);

    // Build column list based on what exists in old table
    const oldCols = (db.pragma('table_info(users)') as Array<{ name: string }>).map(c => c.name);
    const newCols = ['id', 'name', 'email', 'password', 'role', 'is_super_admin', 'status',
                     'invite_code', 'invite_expires', 'last_login', 'created_by', 'created_at'];

    const commonCols = newCols.filter(c => oldCols.includes(c));
    const colList = commonCols.join(', ');

    db.exec(`INSERT INTO users_new (${colList}) SELECT ${colList} FROM users`);
    db.exec('DROP TABLE users');
    db.exec('ALTER TABLE users_new RENAME TO users');

    db.exec('PRAGMA foreign_keys = ON');
  } else {
    // Add any missing columns individually
    if (!hasColumn('users', 'status')) {
      console.log('Migration: adding status to users');
      db.exec("ALTER TABLE users ADD COLUMN status TEXT NOT NULL DEFAULT 'active'");
    }
    if (!hasColumn('users', 'invite_code')) {
      console.log('Migration: adding invite_code to users');
      db.exec('ALTER TABLE users ADD COLUMN invite_code TEXT');
    }
    if (!hasColumn('users', 'invite_expires')) {
      console.log('Migration: adding invite_expires to users');
      db.exec('ALTER TABLE users ADD COLUMN invite_expires TEXT');
    }
    if (!hasColumn('users', 'last_login')) {
      console.log('Migration: adding last_login to users');
      db.exec('ALTER TABLE users ADD COLUMN last_login TEXT');
    }
    if (!hasColumn('users', 'created_by')) {
      console.log('Migration: adding created_by to users');
      db.exec('ALTER TABLE users ADD COLUMN created_by INTEGER');
    }
  }

  // ── OTPs table: add purpose column ────────────────────────────────
  if (!hasColumn('otps', 'purpose')) {
    console.log('Migration: adding purpose to otps');
    db.exec("ALTER TABLE otps ADD COLUMN purpose TEXT NOT NULL DEFAULT 'reset'");
  }

  // ── User permissions table ────────────────────────────────────────
  if (!hasTable('user_permissions')) {
    console.log('Migration: creating user_permissions table');
    db.exec(`
      CREATE TABLE user_permissions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        permission TEXT NOT NULL,
        granted INTEGER NOT NULL DEFAULT 1,
        set_by INTEGER,
        set_at TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE(user_id, permission),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (set_by) REFERENCES users(id) ON DELETE SET NULL
      )
    `);
    db.exec('CREATE INDEX IF NOT EXISTS idx_user_permissions_user ON user_permissions(user_id)');
  }

  // ── Migrate existing users ────────────────────────────────────────
  // kathandesai2404@gmail.com → superadmin with is_super_admin=1
  const superAdminRow = db
    .prepare("SELECT id, role, is_super_admin FROM users WHERE email = ?")
    .get('kathandesai2404@gmail.com') as any;
  if (superAdminRow && !superAdminRow.is_super_admin) {
    console.log('Migration: promoting kathandesai2404@gmail.com to superadmin');
    db.prepare("UPDATE users SET role = 'superadmin', is_super_admin = 1 WHERE id = ?").run(
      superAdminRow.id
    );
  }

  // Ensure new indexes exist
  db.exec('CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_users_status ON users(status)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_otps_email ON otps(email)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_otps_purpose ON otps(purpose)');

  console.log('Incremental migrations complete');
}

export default db;
