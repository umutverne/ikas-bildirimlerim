import initSqlJs from 'sql.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dataDir = join(__dirname, '..', 'data');
if (!existsSync(dataDir)) {
  mkdirSync(dataDir, { recursive: true });
}

const dbPath = join(dataDir, 'app.db');

const SQL = await initSqlJs();
let db;

if (existsSync(dbPath)) {
  const buffer = readFileSync(dbPath);
  db = new SQL.Database(buffer);
} else {
  db = new SQL.Database();
}

function saveDatabase() {
  const data = db.export();
  const buffer = Buffer.from(data);
  writeFileSync(dbPath, buffer);
}

db.exec(`
  CREATE TABLE IF NOT EXISTS agencies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    api_key TEXT UNIQUE NOT NULL,
    active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS stores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    agency_id INTEGER NOT NULL,
    store_name TEXT NOT NULL,
    authorized_app_id TEXT UNIQUE NOT NULL,
    link_code TEXT UNIQUE NOT NULL,
    webhook_id TEXT,
    active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (agency_id) REFERENCES agencies(id)
  );

  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    store_id INTEGER NOT NULL,
    chat_id TEXT UNIQUE NOT NULL,
    first_name TEXT,
    last_name TEXT,
    username TEXT,
    active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (store_id) REFERENCES stores(id)
  );

  CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    order_number TEXT,
    order_total REAL,
    sent_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE INDEX IF NOT EXISTS idx_stores_app_id ON stores(authorized_app_id);
  CREATE INDEX IF NOT EXISTS idx_stores_link_code ON stores(link_code);
  CREATE INDEX IF NOT EXISTS idx_users_chat_id ON users(chat_id);
  CREATE INDEX IF NOT EXISTS idx_users_store_id ON users(store_id);
`);

function generateCode() {
  return crypto.randomBytes(4).toString('hex').toUpperCase();
}

export const db_agencies = {
  create(name) {
    const apiKey = crypto.randomBytes(32).toString('hex');
    db.run('INSERT INTO agencies (name, api_key) VALUES (?, ?)', [name, apiKey]);
    saveDatabase();
    const result = db.exec('SELECT last_insert_rowid() as id')[0];
    return { id: result.values[0][0], api_key: apiKey };
  },

  getByApiKey(apiKey) {
    const result = db.exec('SELECT * FROM agencies WHERE api_key = ? AND active = 1', [apiKey]);
    if (!result[0]) return null;
    const cols = result[0].columns;
    const vals = result[0].values[0];
    if (!vals) return null;
    return Object.fromEntries(cols.map((col, i) => [col, vals[i]]));
  },

  getAll() {
    const result = db.exec('SELECT * FROM agencies ORDER BY created_at DESC');
    if (!result[0]) return [];
    const cols = result[0].columns;
    return result[0].values.map(row => Object.fromEntries(cols.map((col, i) => [col, row[i]])));
  }
};

export const db_stores = {
  create(agencyId, storeName, authorizedAppId) {
    const linkCode = generateCode();
    db.run('INSERT INTO stores (agency_id, store_name, authorized_app_id, link_code) VALUES (?, ?, ?, ?)', [agencyId, storeName, authorizedAppId, linkCode]);
    saveDatabase();
    const result = db.exec('SELECT last_insert_rowid() as id')[0];
    return { id: result.values[0][0], link_code: linkCode };
  },

  getByLinkCode(linkCode) {
    const result = db.exec('SELECT * FROM stores WHERE link_code = ? AND active = 1', [linkCode]);
    if (!result[0]) return null;
    const cols = result[0].columns;
    const vals = result[0].values[0];
    if (!vals) return null;
    return Object.fromEntries(cols.map((col, i) => [col, vals[i]]));
  },

  getByAppId(authorizedAppId) {
    const result = db.exec('SELECT * FROM stores WHERE authorized_app_id = ? AND active = 1', [authorizedAppId]);
    if (!result[0]) return null;
    const cols = result[0].columns;
    const vals = result[0].values[0];
    if (!vals) return null;
    return Object.fromEntries(cols.map((col, i) => [col, vals[i]]));
  },

  getByAgency(agencyId) {
    const result = db.exec(`
      SELECT s.*, COUNT(u.id) as user_count
      FROM stores s
      LEFT JOIN users u ON s.id = u.store_id AND u.active = 1
      WHERE s.agency_id = ? AND s.active = 1
      GROUP BY s.id
      ORDER BY s.created_at DESC
    `, [agencyId]);
    if (!result[0]) return [];
    const cols = result[0].columns;
    return result[0].values.map(row => Object.fromEntries(cols.map((col, i) => [col, row[i]])));
  },

  getAll() {
    const result = db.exec(`
      SELECT s.*, a.name as agency_name, COUNT(u.id) as user_count
      FROM stores s
      LEFT JOIN agencies a ON s.agency_id = a.id
      LEFT JOIN users u ON s.id = u.store_id AND u.active = 1
      WHERE s.active = 1
      GROUP BY s.id
      ORDER BY s.created_at DESC
    `);
    if (!result[0]) return [];
    const cols = result[0].columns;
    return result[0].values.map(row => Object.fromEntries(cols.map((col, i) => [col, row[i]])));
  }
};

export const db_users = {
  create(storeId, chatId, firstName, lastName, username) {
    const existingResult = db.exec('SELECT * FROM users WHERE chat_id = ?', [chatId]);
    const existing = existingResult[0] && existingResult[0].values[0] ?
      Object.fromEntries(existingResult[0].columns.map((col, i) => [col, existingResult[0].values[0][i]])) : null;

    if (existing) {
      db.run('UPDATE users SET store_id = ?, first_name = ?, last_name = ?, username = ?, active = 1 WHERE chat_id = ?', [storeId, firstName, lastName, username, chatId]);
      saveDatabase();
      return { id: existing.id, updated: true };
    }

    db.run('INSERT INTO users (store_id, chat_id, first_name, last_name, username) VALUES (?, ?, ?, ?, ?)', [storeId, chatId, firstName, lastName, username]);
    saveDatabase();
    const result = db.exec('SELECT last_insert_rowid() as id')[0];
    return { id: result.values[0][0], updated: false };
  },

  getByChatId(chatId) {
    const result = db.exec(`
      SELECT u.*, s.store_name, s.authorized_app_id
      FROM users u
      LEFT JOIN stores s ON u.store_id = s.id
      WHERE u.chat_id = ? AND u.active = 1
    `, [chatId]);
    if (!result[0]) return null;
    const cols = result[0].columns;
    const vals = result[0].values[0];
    if (!vals) return null;
    return Object.fromEntries(cols.map((col, i) => [col, vals[i]]));
  },

  getByStore(storeId) {
    const result = db.exec('SELECT * FROM users WHERE store_id = ? AND active = 1', [storeId]);
    if (!result[0]) return [];
    const cols = result[0].columns;
    return result[0].values.map(row => Object.fromEntries(cols.map((col, i) => [col, row[i]])));
  },

  deactivate(chatId) {
    db.run('UPDATE users SET active = 0 WHERE chat_id = ?', [chatId]);
    saveDatabase();
  }
};

export const db_notifications = {
  log(userId, orderNumber, orderTotal) {
    db.run('INSERT INTO notifications (user_id, order_number, order_total) VALUES (?, ?, ?)', [userId, orderNumber, orderTotal]);
    saveDatabase();
  },

  getStats(storeId = null) {
    let result;
    if (storeId) {
      result = db.exec(`
        SELECT COUNT(*) as total_notifications,
               SUM(order_total) as total_revenue
        FROM notifications n
        JOIN users u ON n.user_id = u.id
        WHERE u.store_id = ?
      `, [storeId]);
    } else {
      result = db.exec(`
        SELECT COUNT(*) as total_notifications,
               SUM(order_total) as total_revenue
        FROM notifications
      `);
    }
    if (!result[0]) return { total_notifications: 0, total_revenue: 0 };
    const cols = result[0].columns;
    const vals = result[0].values[0];
    if (!vals) return { total_notifications: 0, total_revenue: 0 };
    return Object.fromEntries(cols.map((col, i) => [col, vals[i]]));
  }
};

export function resetDatabase() {
  db.exec('DELETE FROM notifications');
  db.exec('DELETE FROM users');
  db.exec('DELETE FROM stores');
  db.exec('DELETE FROM agencies');
  saveDatabase();
  return { success: true, message: 'Database reset successfully' };
}

export default db;
