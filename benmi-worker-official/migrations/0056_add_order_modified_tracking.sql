-- Migration: 0056_add_order_modified_tracking.sql
-- Description: Add is_modified column to orders table for visual tracking when customer edits sold-out items.

ALTER TABLE orders ADD COLUMN is_modified INTEGER NOT NULL DEFAULT 0;
