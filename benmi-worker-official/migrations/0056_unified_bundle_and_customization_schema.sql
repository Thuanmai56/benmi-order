-- Migration: 0056_unified_bundle_and_customization_schema.sql
-- Description: Schema foundation for Unified Bundle and Customization Architecture (PDP)

-- 1. Create modifier_groups table (Option Library of the store)
CREATE TABLE IF NOT EXISTS modifier_groups (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    name TEXT NOT NULL,
    selection_type TEXT NOT NULL DEFAULT 'single', -- 'single' (radio) | 'multiple' (checkbox)
    is_required INTEGER NOT NULL DEFAULT 0,        -- 0: optional, 1: required
    min_selection INTEGER NOT NULL DEFAULT 0,
    max_selection INTEGER NOT NULL DEFAULT 1,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_mod_groups_tenant ON modifier_groups(tenant_id, sort_order);

-- 2. Create modifier_options table (Concrete choices inside a group)
CREATE TABLE IF NOT EXISTS modifier_options (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    group_id TEXT NOT NULL REFERENCES modifier_groups(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    price INTEGER NOT NULL DEFAULT 0,              -- Surcharge amount (0, 10, 15...)
    is_default INTEGER NOT NULL DEFAULT 0,
    sort_order INTEGER NOT NULL DEFAULT 0,
    out_of_stock_until DATETIME DEFAULT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_mod_options_group ON modifier_options(tenant_id, group_id, sort_order);

-- 3. Create item_modifier_links table (Item-Level Binding for Type 2 items)
CREATE TABLE IF NOT EXISTS item_modifier_links (
    tenant_id TEXT NOT NULL,
    item_id TEXT NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
    group_id TEXT NOT NULL REFERENCES modifier_groups(id) ON DELETE CASCADE,
    sort_order INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (tenant_id, item_id, group_id)
);
CREATE INDEX IF NOT EXISTS idx_item_mod_links ON item_modifier_links(tenant_id, item_id);

-- 4. Add item_type column to menu_items (standard | bundle)
ALTER TABLE menu_items ADD COLUMN item_type TEXT DEFAULT 'standard';

-- 5. Add is_required column to menu_customizations for Global Order Customizations (Type 3)
ALTER TABLE menu_customizations ADD COLUMN is_required INTEGER DEFAULT 0;
