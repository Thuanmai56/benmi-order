-- Migration: 0064_add_modifier_migration_metadata.sql
-- Description: Add additive metadata, sub-options, and rule storage columns to canonical modifier tables to prevent data loss during legacy data copy.

-- 1. Add source_metadata_json to modifier_groups
ALTER TABLE modifier_groups ADD COLUMN source_metadata_json TEXT NOT NULL DEFAULT '{}';

-- 2. Add additive columns to modifier_options
ALTER TABLE modifier_options ADD COLUMN sub_options_json TEXT NOT NULL DEFAULT '[]';
ALTER TABLE modifier_options ADD COLUMN eligibility_rules_json TEXT NOT NULL DEFAULT '[]';
ALTER TABLE modifier_options ADD COLUMN is_out_of_stock INTEGER NOT NULL DEFAULT 0;
ALTER TABLE modifier_options ADD COLUMN description TEXT DEFAULT NULL;
ALTER TABLE modifier_options ADD COLUMN source_metadata_json TEXT NOT NULL DEFAULT '{}';
