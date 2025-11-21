import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const db = new Database(join(__dirname, '..', 'data', 'app.db'));

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
    const stmt = db.prepare('INSERT INTO agencies (name, api_key) VALUES (?, ?)');
    const result = stmt.run(name, apiKey);
    return { id: result.lastInsertRowid, api_key: apiKey };
  },

  getByApiKey(apiKey) {
    return db.prepare('SELECT * FROM agencies WHERE api_key = ? AND active = 1').get(apiKey);
  },

  getAll() {
    return db.prepare('SELECT * FROM agencies ORDER BY created_at DESC').all();
  }
};

export const db_stores = {
  create(agencyId, storeName, authorizedAppId) {
    const linkCode = generateCode();
    const stmt = db.prepare('INSERT INTO stores (agency_id, store_name, authorized_app_id, link_code) VALUES (?, ?, ?, ?)');
    const result = stmt.run(agencyId, storeName, authorizedAppId, linkCode);
    return { id: result.lastInsertRowid, link_code: linkCode };
  },

  getByLinkCode(linkCode) {
    return db.prepare('SELECT * FROM stores WHERE link_code = ? AND active = 1').get(linkCode);
  },

  getByAppId(authorizedAppId) {
    return db.prepare('SELECT * FROM stores WHERE authorized_app_id = ? AND active = 1').get(authorizedAppId);
  },

  getByAgency(agencyId) {
    return db.prepare(`
      SELECT s.*, COUNT(u.id) as user_count
      FROM stores s
      LEFT JOIN users u ON s.id = u.store_id AND u.active = 1
      WHERE s.agency_id = ? AND s.active = 1
      GROUP BY s.id
      ORDER BY s.created_at DESC
    `).all(agencyId);
  },

  getAll() {
    return db.prepare(`
      SELECT s.*, a.name as agency_name, COUNT(u.id) as user_count
      FROM stores s
      LEFT JOIN agencies a ON s.agency_id = a.id
      LEFT JOIN users u ON s.id = u.store_id AND u.active = 1
      WHERE s.active = 1
      GROUP BY s.id
      ORDER BY s.created_at DESC
    `).all();
  }
};

export const db_users = {
  create(storeId, chatId, firstName, lastName, username) {
    const existing = db.prepare('SELECT * FROM users WHERE chat_id = ?').get(chatId);

    if (existing) {
      const stmt = db.prepare('UPDATE users SET store_id = ?, first_name = ?, last_name = ?, username = ?, active = 1 WHERE chat_id = ?');
      stmt.run(storeId, firstName, lastName, username, chatId);
      return { id: existing.id, updated: true };
    }

    const stmt = db.prepare('INSERT INTO users (store_id, chat_id, first_name, last_name, username) VALUES (?, ?, ?, ?, ?)');
    const result = stmt.run(storeId, chatId, firstName, lastName, username);
    return { id: result.lastInsertRowid, updated: false };
  },

  getByChatId(chatId) {
    return db.prepare(`
      SELECT u.*, s.store_name, s.authorized_app_id
      FROM users u
      LEFT JOIN stores s ON u.store_id = s.id
      WHERE u.chat_id = ? AND u.active = 1
    `).get(chatId);
  },

  getByStore(storeId) {
    return db.prepare('SELECT * FROM users WHERE store_id = ? AND active = 1').all(storeId);
  },

  deactivate(chatId) {
    const stmt = db.prepare('UPDATE users SET active = 0 WHERE chat_id = ?');
    stmt.run(chatId);
  }
};

export const db_notifications = {
  log(userId, orderNumber, orderTotal) {
    const stmt = db.prepare('INSERT INTO notifications (user_id, order_number, order_total) VALUES (?, ?, ?)');
    stmt.run(userId, orderNumber, orderTotal);
  },

  getStats(storeId = null) {
    if (storeId) {
      return db.prepare(`
        SELECT COUNT(*) as total_notifications,
               SUM(order_total) as total_revenue
        FROM notifications n
        JOIN users u ON n.user_id = u.id
        WHERE u.store_id = ?
      `).get(storeId);
    }

    return db.prepare(`
      SELECT COUNT(*) as total_notifications,
             SUM(order_total) as total_revenue
      FROM notifications
    `).get();
  }
};

export default db;
