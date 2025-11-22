-- Migration: Add Admin User System
-- Date: 2025-01-22

-- Add admin fields to agencies table
ALTER TABLE agencies ADD COLUMN IF NOT EXISTS admin_email TEXT;
ALTER TABLE agencies ADD COLUMN IF NOT EXISTS admin_password_hash TEXT;
ALTER TABLE agencies ADD COLUMN IF NOT EXISTS contact_phone TEXT;

-- Create admin_users table for super admins and agency admins
CREATE TABLE IF NOT EXISTS admin_users (
  id SERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('super_admin', 'agency_admin')),
  agency_id INTEGER REFERENCES agencies(id),
  active INTEGER DEFAULT 1,
  must_change_password INTEGER DEFAULT 0,
  last_login TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create sessions table for login management
CREATE TABLE IF NOT EXISTS admin_sessions (
  id TEXT PRIMARY KEY,
  admin_user_id INTEGER NOT NULL REFERENCES admin_users(id),
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_admin_users_email ON admin_users(email);
CREATE INDEX IF NOT EXISTS idx_admin_users_agency ON admin_users(agency_id);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_user ON admin_sessions(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_expires ON admin_sessions(expires_at);

-- Insert default super admin (password: admin123)
-- bcrypt hash for 'admin123': $2a$10$N9qo8uLOickgx2ZMRZoMye/wlKG5iqL5FZPjEu8.xRm8hzLFJPzHC
INSERT INTO admin_users (email, password_hash, full_name, role, agency_id)
VALUES ('admin@ikasbildirim.com', '$2a$10$N9qo8uLOickgx2ZMRZoMye/wlKG5iqL5FZPjEu8.xRm8hzLFJPzHC', 'Super Admin', 'super_admin', NULL)
ON CONFLICT (email) DO NOTHING;
