-- Initial Database Schema
-- Creates all tables for IKAS Bildirimlerim

-- Agencies table
CREATE TABLE IF NOT EXISTS agencies (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  notes TEXT,
  active INTEGER DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Stores table
CREATE TABLE IF NOT EXISTS stores (
  id SERIAL PRIMARY KEY,
  agency_id INTEGER REFERENCES agencies(id),
  name TEXT NOT NULL,
  ikas_token TEXT,
  telegram_chat_id TEXT,
  webhook_id TEXT,
  active INTEGER DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  store_id INTEGER REFERENCES stores(id),
  telegram_chat_id TEXT NOT NULL,
  telegram_username TEXT,
  active INTEGER DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  store_id INTEGER REFERENCES stores(id),
  order_number TEXT,
  order_data TEXT,
  notification_type TEXT DEFAULT 'order',
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_stores_agency ON stores(agency_id);
CREATE INDEX IF NOT EXISTS idx_users_store ON users(store_id);
CREATE INDEX IF NOT EXISTS idx_notifications_store ON notifications(store_id);
