-- Migration: Fix stores.agency_id foreign key cascade
-- Date: 2025-01-22

ALTER TABLE stores DROP CONSTRAINT IF EXISTS stores_agency_id_fkey;

ALTER TABLE stores ADD CONSTRAINT stores_agency_id_fkey
  FOREIGN KEY (agency_id) REFERENCES agencies(id) ON DELETE CASCADE;
