import crypto from 'crypto';

const USE_POSTGRES = !!process.env.DATABASE_URL;

let pool, Database;

if (USE_POSTGRES) {
  // PostgreSQL for production (Railway)
  const pkg = await import('pg');
  pool = new pkg.default.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });
  console.log('🗄️  Using PostgreSQL database');
} else {
  // SQLite for local development
  try {
    const sqlite3 = await import('better-sqlite3');
    Database = sqlite3.default;
    console.log('🗄️  Using SQLite database (local development)');
  } catch (error) {
    console.error('⚠️  SQLite not available. Please set DATABASE_URL for PostgreSQL or install better-sqlite3 for local development.');
    process.exit(1);
  }
}

// Initialize database tables
async function initDatabase() {
  if (USE_POSTGRES) {
    const client = await pool.connect();
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS agencies (
          id SERIAL PRIMARY KEY,
          name TEXT NOT NULL,
          api_key TEXT UNIQUE NOT NULL,
          active INTEGER DEFAULT 1,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS stores (
          id SERIAL PRIMARY KEY,
          agency_id INTEGER NOT NULL REFERENCES agencies(id),
          store_name TEXT NOT NULL,
          authorized_app_id TEXT UNIQUE NOT NULL,
          link_code TEXT UNIQUE NOT NULL,
          webhook_id TEXT,
          ikas_token TEXT,
          active INTEGER DEFAULT 1,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          store_id INTEGER NOT NULL REFERENCES stores(id),
          chat_id TEXT UNIQUE NOT NULL,
          first_name TEXT,
          last_name TEXT,
          username TEXT,
          active INTEGER DEFAULT 1,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS notifications (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES users(id),
          order_number TEXT,
          order_total REAL,
          sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE INDEX IF NOT EXISTS idx_stores_app_id ON stores(authorized_app_id);
        CREATE INDEX IF NOT EXISTS idx_stores_link_code ON stores(link_code);
        CREATE INDEX IF NOT EXISTS idx_users_chat_id ON users(chat_id);
        CREATE INDEX IF NOT EXISTS idx_users_store_id ON users(store_id);
      `);
      console.log('✅ PostgreSQL tables initialized');
    } catch (error) {
      console.error('❌ Database initialization error:', error);
      throw error;
    } finally {
      client.release();
    }
  } else {
    // SQLite initialization
    const db = new Database('data.db');
    db.exec(`
      CREATE TABLE IF NOT EXISTS agencies (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        api_key TEXT UNIQUE NOT NULL,
        active INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS stores (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        agency_id INTEGER NOT NULL,
        store_name TEXT NOT NULL,
        authorized_app_id TEXT UNIQUE NOT NULL,
        link_code TEXT UNIQUE NOT NULL,
        webhook_id TEXT,
        ikas_token TEXT,
        active INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
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
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (store_id) REFERENCES stores(id)
      );

      CREATE TABLE IF NOT EXISTS notifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        order_number TEXT,
        order_total REAL,
        sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      );

      CREATE INDEX IF NOT EXISTS idx_stores_app_id ON stores(authorized_app_id);
      CREATE INDEX IF NOT EXISTS idx_stores_link_code ON stores(link_code);
      CREATE INDEX IF NOT EXISTS idx_users_chat_id ON users(chat_id);
      CREATE INDEX IF NOT EXISTS idx_users_store_id ON users(store_id);
    `);
    db.close();
    console.log('✅ SQLite tables initialized');
  }
}

// Initialize on startup
await initDatabase();

function generateCode() {
  return crypto.randomBytes(4).toString('hex').toUpperCase();
}

// Database helper functions
function getDb() {
  if (!USE_POSTGRES) {
    return new Database('data.db');
  }
  return null;
}

export const db_agencies = {
  async create(name) {
    const apiKey = crypto.randomBytes(32).toString('hex');

    if (USE_POSTGRES) {
      const result = await pool.query(
        'INSERT INTO agencies (name, api_key) VALUES ($1, $2) RETURNING id',
        [name, apiKey]
      );
      return { id: result.rows[0].id, api_key: apiKey };
    } else {
      const db = getDb();
      const stmt = db.prepare('INSERT INTO agencies (name, api_key) VALUES (?, ?)');
      const result = stmt.run(name, apiKey);
      db.close();
      return { id: result.lastInsertRowid, api_key: apiKey };
    }
  },

  async getByApiKey(apiKey) {
    if (USE_POSTGRES) {
      const result = await pool.query(
        'SELECT * FROM agencies WHERE api_key = $1 AND active = 1',
        [apiKey]
      );
      return result.rows[0] || null;
    } else {
      const db = getDb();
      const stmt = db.prepare('SELECT * FROM agencies WHERE api_key = ? AND active = 1');
      const result = stmt.get(apiKey);
      db.close();
      return result || null;
    }
  },

  async getAll() {
    if (USE_POSTGRES) {
      const result = await pool.query(`
        SELECT a.*,
               COUNT(DISTINCT s.id)::integer as store_count,
               au.email as admin_email
        FROM agencies a
        LEFT JOIN stores s ON a.id = s.agency_id AND s.active = 1
        LEFT JOIN admin_users au ON a.id = au.agency_id AND au.role = 'agency_admin' AND au.active = 1
        GROUP BY a.id, au.email
        ORDER BY a.created_at DESC
      `);
      return result.rows;
    } else {
      const db = getDb();
      const stmt = db.prepare(`
        SELECT a.*,
               COUNT(DISTINCT s.id) as store_count,
               au.email as admin_email
        FROM agencies a
        LEFT JOIN stores s ON a.id = s.agency_id AND s.active = 1
        LEFT JOIN admin_users au ON a.id = au.agency_id AND au.role = 'agency_admin' AND au.active = 1
        GROUP BY a.id, au.email
        ORDER BY a.created_at DESC
      `);
      const result = stmt.all();
      db.close();
      return result;
    }
  },

  async getById(id) {
    if (USE_POSTGRES) {
      const result = await pool.query('SELECT * FROM agencies WHERE id = $1', [id]);
      return result.rows[0] || null;
    } else {
      const db = getDb();
      const stmt = db.prepare('SELECT * FROM agencies WHERE id = ?');
      const result = stmt.get(id);
      db.close();
      return result || null;
    }
  },

  async update(id, name, notes = null) {
    if (USE_POSTGRES) {
      await pool.query(
        'UPDATE agencies SET name = $1, notes = $2 WHERE id = $3',
        [name, notes, id]
      );
    } else {
      const db = getDb();
      const stmt = db.prepare('UPDATE agencies SET name = ?, notes = ? WHERE id = ?');
      stmt.run(name, notes, id);
      db.close();
    }
  },

  async delete(id) {
    if (USE_POSTGRES) {
      // Soft delete
      await pool.query('UPDATE agencies SET active = 0 WHERE id = $1', [id]);
    } else {
      const db = getDb();
      const stmt = db.prepare('UPDATE agencies SET active = 0 WHERE id = ?');
      stmt.run(id);
      db.close();
    }
  }
};

export const db_stores = {
  async create(agencyId, storeName, authorizedAppId, ikasToken = null) {
    const linkCode = generateCode();

    if (USE_POSTGRES) {
      const result = await pool.query(
        'INSERT INTO stores (agency_id, store_name, authorized_app_id, link_code, ikas_token) VALUES ($1, $2, $3, $4, $5) RETURNING id',
        [agencyId, storeName, authorizedAppId, linkCode, ikasToken]
      );
      return { id: result.rows[0].id, link_code: linkCode };
    } else {
      const db = getDb();
      const stmt = db.prepare('INSERT INTO stores (agency_id, store_name, authorized_app_id, link_code, ikas_token) VALUES (?, ?, ?, ?, ?)');
      const result = stmt.run(agencyId, storeName, authorizedAppId, linkCode, ikasToken);
      db.close();
      return { id: result.lastInsertRowid, link_code: linkCode };
    }
  },

  async updateWebhookId(storeId, webhookId) {
    if (USE_POSTGRES) {
      await pool.query(
        'UPDATE stores SET webhook_id = $1 WHERE id = $2',
        [webhookId, storeId]
      );
    } else {
      const db = getDb();
      const stmt = db.prepare('UPDATE stores SET webhook_id = ? WHERE id = ?');
      stmt.run(webhookId, storeId);
      db.close();
    }
  },

  async getByLinkCode(linkCode) {
    if (USE_POSTGRES) {
      const result = await pool.query(
        'SELECT * FROM stores WHERE link_code = $1 AND active = 1',
        [linkCode]
      );
      return result.rows[0] || null;
    } else {
      const db = getDb();
      const stmt = db.prepare('SELECT * FROM stores WHERE link_code = ? AND active = 1');
      const result = stmt.get(linkCode);
      db.close();
      return result || null;
    }
  },

  async getByAppId(authorizedAppId) {
    if (USE_POSTGRES) {
      const result = await pool.query(
        'SELECT * FROM stores WHERE authorized_app_id = $1 AND active = 1',
        [authorizedAppId]
      );
      return result.rows[0] || null;
    } else {
      const db = getDb();
      const stmt = db.prepare('SELECT * FROM stores WHERE authorized_app_id = ? AND active = 1');
      const result = stmt.get(authorizedAppId);
      db.close();
      return result || null;
    }
  },

  async getByAgency(agencyId) {
    if (USE_POSTGRES) {
      const result = await pool.query(`
        SELECT s.*, COUNT(u.id)::integer as user_count
        FROM stores s
        LEFT JOIN users u ON s.id = u.store_id AND u.active = 1
        WHERE s.agency_id = $1 AND s.active = 1
        GROUP BY s.id
        ORDER BY s.created_at DESC
      `, [agencyId]);
      return result.rows;
    } else {
      const db = getDb();
      const stmt = db.prepare(`
        SELECT s.*, COUNT(u.id) as user_count
        FROM stores s
        LEFT JOIN users u ON s.id = u.store_id AND u.active = 1
        WHERE s.agency_id = ? AND s.active = 1
        GROUP BY s.id
        ORDER BY s.created_at DESC
      `);
      const result = stmt.all(agencyId);
      db.close();
      return result;
    }
  },

  async getAll() {
    if (USE_POSTGRES) {
      const result = await pool.query(`
        SELECT s.*, a.name as agency_name, COUNT(u.id)::integer as user_count
        FROM stores s
        LEFT JOIN agencies a ON s.agency_id = a.id
        LEFT JOIN users u ON s.id = u.store_id AND u.active = 1
        WHERE s.active = 1
        GROUP BY s.id, a.name
        ORDER BY s.created_at DESC
      `);
      return result.rows;
    } else {
      const db = getDb();
      const stmt = db.prepare(`
        SELECT s.*, a.name as agency_name, COUNT(u.id) as user_count
        FROM stores s
        LEFT JOIN agencies a ON s.agency_id = a.id
        LEFT JOIN users u ON s.id = u.store_id AND u.active = 1
        WHERE s.active = 1
        GROUP BY s.id, a.name
        ORDER BY s.created_at DESC
      `);
      const result = stmt.all();
      db.close();
      return result;
    }
  }
};

export const db_users = {
  async create(storeId, chatId, firstName, lastName, username) {
    if (USE_POSTGRES) {
      const existingResult = await pool.query(
        'SELECT * FROM users WHERE chat_id = $1',
        [chatId]
      );
      const existing = existingResult.rows[0];

      if (existing) {
        await pool.query(
          'UPDATE users SET store_id = $1, first_name = $2, last_name = $3, username = $4, active = 1 WHERE chat_id = $5',
          [storeId, firstName, lastName, username, chatId]
        );
        return { id: existing.id, updated: true };
      }

      const result = await pool.query(
        'INSERT INTO users (store_id, chat_id, first_name, last_name, username) VALUES ($1, $2, $3, $4, $5) RETURNING id',
        [storeId, chatId, firstName, lastName, username]
      );
      return { id: result.rows[0].id, updated: false };
    } else {
      const db = getDb();
      const checkStmt = db.prepare('SELECT * FROM users WHERE chat_id = ?');
      const existing = checkStmt.get(chatId);

      if (existing) {
        const updateStmt = db.prepare('UPDATE users SET store_id = ?, first_name = ?, last_name = ?, username = ?, active = 1 WHERE chat_id = ?');
        updateStmt.run(storeId, firstName, lastName, username, chatId);
        db.close();
        return { id: existing.id, updated: true };
      }

      const insertStmt = db.prepare('INSERT INTO users (store_id, chat_id, first_name, last_name, username) VALUES (?, ?, ?, ?, ?)');
      const result = insertStmt.run(storeId, chatId, firstName, lastName, username);
      db.close();
      return { id: result.lastInsertRowid, updated: false };
    }
  },

  async getByChatId(chatId) {
    if (USE_POSTGRES) {
      const result = await pool.query(`
        SELECT u.*, s.store_name, s.authorized_app_id
        FROM users u
        LEFT JOIN stores s ON u.store_id = s.id
        WHERE u.chat_id = $1 AND u.active = 1
      `, [chatId]);
      return result.rows[0] || null;
    } else {
      const db = getDb();
      const stmt = db.prepare(`
        SELECT u.*, s.store_name, s.authorized_app_id
        FROM users u
        LEFT JOIN stores s ON u.store_id = s.id
        WHERE u.chat_id = ? AND u.active = 1
      `);
      const result = stmt.get(chatId);
      db.close();
      return result || null;
    }
  },

  async getByStore(storeId) {
    if (USE_POSTGRES) {
      const result = await pool.query(
        'SELECT * FROM users WHERE store_id = $1 AND active = 1',
        [storeId]
      );
      return result.rows;
    } else {
      const db = getDb();
      const stmt = db.prepare('SELECT * FROM users WHERE store_id = ? AND active = 1');
      const result = stmt.all(storeId);
      db.close();
      return result;
    }
  },

  async deactivate(chatId) {
    if (USE_POSTGRES) {
      await pool.query(
        'UPDATE users SET active = 0 WHERE chat_id = $1',
        [chatId]
      );
    } else {
      const db = getDb();
      const stmt = db.prepare('UPDATE users SET active = 0 WHERE chat_id = ?');
      stmt.run(chatId);
      db.close();
    }
  }
};

export const db_notifications = {
  async log(userId, orderNumber, orderTotal) {
    if (USE_POSTGRES) {
      await pool.query(
        'INSERT INTO notifications (user_id, order_number, order_total) VALUES ($1, $2, $3)',
        [userId, orderNumber, orderTotal]
      );
    } else {
      const db = getDb();
      const stmt = db.prepare('INSERT INTO notifications (user_id, order_number, order_total) VALUES (?, ?, ?)');
      stmt.run(userId, orderNumber, orderTotal);
      db.close();
    }
  },

  async getStats(storeId = null) {
    if (USE_POSTGRES) {
      let query, params;

      if (storeId) {
        query = `
          SELECT COUNT(*)::integer as total_notifications,
                 SUM(order_total)::real as total_revenue,
                 SUM(CASE WHEN order_number LIKE 'TEST-%' THEN order_total ELSE 0 END)::real as test_order_revenue
          FROM notifications n
          JOIN users u ON n.user_id = u.id
          WHERE u.store_id = $1
        `;
        params = [storeId];
      } else {
        query = `
          SELECT COUNT(*)::integer as total_notifications,
                 SUM(order_total)::real as total_revenue,
                 SUM(CASE WHEN order_number LIKE 'TEST-%' THEN order_total ELSE 0 END)::real as test_order_revenue
          FROM notifications
        `;
        params = [];
      }

      const result = await pool.query(query, params);
      return result.rows[0] || { total_notifications: 0, total_revenue: 0, test_order_revenue: 0 };
    } else {
      const db = getDb();
      let query, stmt, result;

      if (storeId) {
        query = `
          SELECT COUNT(*) as total_notifications,
                 SUM(order_total) as total_revenue,
                 SUM(CASE WHEN order_number LIKE 'TEST-%' THEN order_total ELSE 0 END) as test_order_revenue
          FROM notifications n
          JOIN users u ON n.user_id = u.id
          WHERE u.store_id = ?
        `;
        stmt = db.prepare(query);
        result = stmt.get(storeId);
      } else {
        query = `
          SELECT COUNT(*) as total_notifications,
                 SUM(order_total) as total_revenue,
                 SUM(CASE WHEN order_number LIKE 'TEST-%' THEN order_total ELSE 0 END) as test_order_revenue
          FROM notifications
        `;
        stmt = db.prepare(query);
        result = stmt.get();
      }

      db.close();
      return result || { total_notifications: 0, total_revenue: 0, test_order_revenue: 0 };
    }
  }
};

export async function resetDatabase() {
  if (USE_POSTGRES) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('DELETE FROM notifications');
      await client.query('DELETE FROM users');
      await client.query('DELETE FROM stores');
      await client.query('DELETE FROM agencies');
      await client.query('COMMIT');
      return { success: true, message: 'Database reset successfully' };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } else {
    const db = getDb();
    db.exec('DELETE FROM notifications');
    db.exec('DELETE FROM users');
    db.exec('DELETE FROM stores');
    db.exec('DELETE FROM agencies');
    db.close();
    return { success: true, message: 'Database reset successfully' };
  }
}

export default USE_POSTGRES ? pool : null;
