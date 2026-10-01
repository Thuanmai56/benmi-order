-- Migration: 0061_add_max_per_order_to_menu_items.sql
-- Description: Add max_per_order column to menu_items table for item-level order purchase limits

ALTER TABLE menu_items ADD COLUMN max_per_order INTEGER DEFAULT NULL;
