import pkg from 'pg';
const { Pool } = pkg;

const USE_POSTGRES = !!process.env.DATABASE_URL;
let pool, Database;

if (USE_POSTGRES) {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });
} else {
  const sqlite3 = await import('better-sqlite3');
  Database = sqlite3.default;
}

// Admin Users CRUD
export const db_admin_users = {
  async create(email, password_hash, full_name, role, agency_id = null, must_change_password = 0) {
    if (USE_POSTGRES) {
      const result = await pool.query(
        'INSERT INTO admin_users (email, password_hash, full_name, role, agency_id, must_change_password) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
        [email, password_hash, full_name, role, agency_id, must_change_password ? 1 : 0]
      );
      return result.rows[0];
    } else {
      const db = new Database('data.db');
      const stmt = db.prepare('INSERT INTO admin_users (email, password_hash, full_name, role, agency_id, must_change_password) VALUES (?, ?, ?, ?, ?, ?)');
      const info = stmt.run(email, password_hash, full_name, role, agency_id, must_change_password ? 1 : 0);
      return { id: info.lastInsertRowid, email, full_name, role, agency_id };
    }
  },

  async getByEmail(email) {
    if (USE_POSTGRES) {
      const result = await pool.query('SELECT * FROM admin_users WHERE email = $1 AND active = 1', [email]);
      return result.rows[0] || null;
    } else {
      const db = new Database('data.db');
      const stmt = db.prepare('SELECT * FROM admin_users WHERE email = ? AND active = 1');
      return stmt.get(email) || null;
    }
  },

  async getById(id) {
    if (USE_POSTGRES) {
      const result = await pool.query('SELECT * FROM admin_users WHERE id = $1', [id]);
      return result.rows[0] || null;
    } else {
      const db = new Database('data.db');
      const stmt = db.prepare('SELECT * FROM admin_users WHERE id = ?');
      return stmt.get(id) || null;
    }
  },

  async getByAgency(agency_id) {
    if (USE_POSTGRES) {
      const result = await pool.query('SELECT * FROM admin_users WHERE agency_id = $1 AND active = 1', [agency_id]);
      return result.rows;
    } else {
      const db = new Database('data.db');
      const stmt = db.prepare('SELECT * FROM admin_users WHERE agency_id = ? AND active = 1');
      return stmt.all(agency_id);
    }
  },

  async updateLastLogin(id) {
    if (USE_POSTGRES) {
      await pool.query('UPDATE admin_users SET last_login = NOW() WHERE id = $1', [id]);
    } else {
      const db = new Database('data.db');
      const stmt = db.prepare('UPDATE admin_users SET last_login = CURRENT_TIMESTAMP WHERE id = ?');
      stmt.run(id);
    }
  },

  async updatePassword(id, password_hash, must_change_password = 0) {
    if (USE_POSTGRES) {
      await pool.query(
        'UPDATE admin_users SET password_hash = $1, must_change_password = $2 WHERE id = $3',
        [password_hash, must_change_password ? 1 : 0, id]
      );
    } else {
      const db = new Database('data.db');
      const stmt = db.prepare('UPDATE admin_users SET password_hash = ?, must_change_password = ? WHERE id = ?');
      stmt.run(password_hash, must_change_password ? 1 : 0, id);
    }
  }
};
