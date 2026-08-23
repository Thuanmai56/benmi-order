-- Migration: 0032_create_order_items.sql
-- Create structured order_items table for item-level data and analytics

CREATE TABLE IF NOT EXISTS order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id TEXT NOT NULL,
    order_key TEXT NOT NULL,
    round_number INTEGER NOT NULL DEFAULT 1,
    item_id TEXT,                          -- ID sản phẩm trong menu_items (nếu có)
    item_name TEXT NOT NULL,               -- Tên món hiển thị
    category_name TEXT,                    -- Tên danh mục (VD: Bánh mì, Nước)
    quantity INTEGER NOT NULL DEFAULT 1,   -- Số lượng đặt
    unit_price REAL NOT NULL DEFAULT 0,    -- Đơn giá món
    subtotal REAL NOT NULL DEFAULT 0,      -- Thành tiền = (đơn giá + toppings) * số lượng
    selected_options TEXT,                 -- JSON mảng các tùy biến/topping: [{"group":"Độ cay","choice":"Cay vừa","price":0}]
    notes TEXT,                            -- Ghi chú riêng cho món
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_key) REFERENCES orders(key) ON DELETE CASCADE
);

-- Index tối ưu truy vấn báo cáo theo quán và thời gian
CREATE INDEX IF NOT EXISTS idx_order_items_tenant_created 
ON order_items (tenant_id, created_at);

-- Index tối ưu truy vấn chi tiết các món trong một đơn hàng
CREATE INDEX IF NOT EXISTS idx_order_items_order_key 
ON order_items (order_key);

-- Index tối ưu thống kê doanh số theo món
CREATE INDEX IF NOT EXISTS idx_order_items_tenant_item 
ON order_items (tenant_id, item_name);
