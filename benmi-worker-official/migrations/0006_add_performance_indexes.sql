-- 6. Performance Optimization Indexes

-- Menu Categories & Items sorting indexes (Optimizes /api/menu fetch)
CREATE INDEX IF NOT EXISTS idx_menu_categories_tenant_sort ON menu_categories(tenant_id, sort_order ASC);
CREATE INDEX IF NOT EXISTS idx_menu_items_tenant_sort ON menu_items(tenant_id, sort_order ASC);

-- Menu Items lookup index for stock status updates (/api/menu/stock-status)
CREATE INDEX IF NOT EXISTS idx_menu_items_tenant_cat_name ON menu_items(tenant_id, category_id, name);

-- Orders query indexes (Optimizes /api/orders fetch and filtering)
CREATE INDEX IF NOT EXISTS idx_orders_tenant_created ON orders(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_tenant_updated ON orders(tenant_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_tenant_status ON orders(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);

-- Pending Actions lookup index
CREATE INDEX IF NOT EXISTS idx_pending_actions_tenant_user ON pending_actions(tenant_id, user_id);
