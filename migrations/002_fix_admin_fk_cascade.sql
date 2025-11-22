-- Migration: Fix admin_users foreign key cascade
-- Date: 2025-01-22

-- Drop existing foreign key constraint
ALTER TABLE admin_users DROP CONSTRAINT IF EXISTS admin_users_agency_id_fkey;

-- Re-add foreign key with ON DELETE SET NULL
ALTER TABLE admin_users ADD CONSTRAINT admin_users_agency_id_fkey
  FOREIGN KEY (agency_id) REFERENCES agencies(id) ON DELETE SET NULL;
