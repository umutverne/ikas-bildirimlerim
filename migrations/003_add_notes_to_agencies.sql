-- Migration: Add notes column to agencies table
-- Date: 2025-01-22

-- Add notes column to agencies table
ALTER TABLE agencies ADD COLUMN IF NOT EXISTS notes TEXT;
