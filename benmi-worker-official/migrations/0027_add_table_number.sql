-- Migration: 0025_add_table_number.sql
-- Description: Add table_number column to orders table for dine-in table tracking

ALTER TABLE orders ADD COLUMN table_number TEXT DEFAULT NULL;
