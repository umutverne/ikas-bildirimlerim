import pkg from 'pg';
const { Pool } = pkg;
import crypto from 'crypto';

// PostgreSQL connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Initialize database tables
async function initDatabase() {
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
    console.log('✅ Database tables initialized');
  } catch (error) {
    console.error('❌ Database initialization error:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Initialize on startup
await initDatabase();

function generateCode() {
  return crypto.randomBytes(4).toString('hex').toUpperCase();
}

export const db_agencies = {
  async create(name) {
    const apiKey = crypto.randomBytes(32).toString('hex');
    const result = await pool.query(
      'INSERT INTO agencies (name, api_key) VALUES ($1, $2) RETURNING id',
      [name, apiKey]
    );
    return { id: result.rows[0].id, api_key: apiKey };
  },

  async getByApiKey(apiKey) {
    const result = await pool.query(
      'SELECT * FROM agencies WHERE api_key = $1 AND active = 1',
      [apiKey]
    );
    return result.rows[0] || null;
  },

  async getAll() {
    const result = await pool.query('SELECT * FROM agencies ORDER BY created_at DESC');
    return result.rows;
  }
};

export const db_stores = {
  async create(agencyId, storeName, authorizedAppId) {
    const linkCode = generateCode();
    const result = await pool.query(
      'INSERT INTO stores (agency_id, store_name, authorized_app_id, link_code) VALUES ($1, $2, $3, $4) RETURNING id',
      [agencyId, storeName, authorizedAppId, linkCode]
    );
    return { id: result.rows[0].id, link_code: linkCode };
  },

  async getByLinkCode(linkCode) {
    const result = await pool.query(
      'SELECT * FROM stores WHERE link_code = $1 AND active = 1',
      [linkCode]
    );
    return result.rows[0] || null;
  },

  async getByAppId(authorizedAppId) {
    const result = await pool.query(
      'SELECT * FROM stores WHERE authorized_app_id = $1 AND active = 1',
      [authorizedAppId]
    );
    return result.rows[0] || null;
  },

  async getByAgency(agencyId) {
    const result = await pool.query(`
      SELECT s.*, COUNT(u.id)::integer as user_count
      FROM stores s
      LEFT JOIN users u ON s.id = u.store_id AND u.active = 1
      WHERE s.agency_id = $1 AND s.active = 1
      GROUP BY s.id
      ORDER BY s.created_at DESC
    `, [agencyId]);
    return result.rows;
  },

  async getAll() {
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
  }
};

export const db_users = {
  async create(storeId, chatId, firstName, lastName, username) {
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
  },

  async getByChatId(chatId) {
    const result = await pool.query(`
      SELECT u.*, s.store_name, s.authorized_app_id
      FROM users u
      LEFT JOIN stores s ON u.store_id = s.id
      WHERE u.chat_id = $1 AND u.active = 1
    `, [chatId]);
    return result.rows[0] || null;
  },

  async getByStore(storeId) {
    const result = await pool.query(
      'SELECT * FROM users WHERE store_id = $1 AND active = 1',
      [storeId]
    );
    return result.rows;
  },

  async deactivate(chatId) {
    await pool.query(
      'UPDATE users SET active = 0 WHERE chat_id = $1',
      [chatId]
    );
  }
};

export const db_notifications = {
  async log(userId, orderNumber, orderTotal) {
    await pool.query(
      'INSERT INTO notifications (user_id, order_number, order_total) VALUES ($1, $2, $3)',
      [userId, orderNumber, orderTotal]
    );
  },

  async getStats(storeId = null) {
    let query, params;

    if (storeId) {
      query = `
        SELECT COUNT(*)::integer as total_notifications,
               SUM(order_total)::real as total_revenue
        FROM notifications n
        JOIN users u ON n.user_id = u.id
        WHERE u.store_id = $1
      `;
      params = [storeId];
    } else {
      query = `
        SELECT COUNT(*)::integer as total_notifications,
               SUM(order_total)::real as total_revenue
        FROM notifications
      `;
      params = [];
    }

    const result = await pool.query(query, params);
    return result.rows[0] || { total_notifications: 0, total_revenue: 0 };
  }
};

export async function resetDatabase() {
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
}

export default pool;
