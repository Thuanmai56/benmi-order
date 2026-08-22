-- Migration: Add announcement banner text to tenant_config table
-- Description: Stores customizable store announcement text to be displayed in customer menu header

ALTER TABLE tenant_config ADD COLUMN announcement TEXT DEFAULT NULL;
