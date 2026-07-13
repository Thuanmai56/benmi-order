-- Migration: Initialize Menu Tables
-- Author: Antigravity Agent
-- Date: 2026-07-12

-- 1. Bảng Cửa hàng (Tenants)
CREATE TABLE IF NOT EXISTS tenants (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. Bảng Danh mục Thực đơn (Menu Categories)
CREATE TABLE IF NOT EXISTS menu_categories (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    name TEXT NOT NULL,
    slug TEXT NOT NULL, -- 'small', 'large', 'combo', 'drinks', 'topping'
    sort_order INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    UNIQUE(tenant_id, slug)
);

-- 3. Bảng Mục Thực đơn chi tiết (Menu Items)
CREATE TABLE IF NOT EXISTS menu_items (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    category_id TEXT NOT NULL,
    name TEXT NOT NULL,
    price REAL NOT NULL CHECK(price >= 0),
    description TEXT,
    out_of_stock_until DATETIME, -- NULL: còn hàng, tương lai: hết hàng đến mốc đó
    sort_order INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES menu_categories(id) ON DELETE RESTRICT
);

-- 4. Tạo các chỉ mục tối ưu hóa hiệu năng truy vấn
CREATE INDEX IF NOT EXISTS idx_menu_items_tenant ON menu_items(tenant_id);
CREATE INDEX IF NOT EXISTS idx_menu_categories_tenant ON menu_categories(tenant_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_out_of_stock ON menu_items(tenant_id, out_of_stock_until);
