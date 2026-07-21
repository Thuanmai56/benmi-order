-- 5. Bảng Đơn hàng (Orders)
CREATE TABLE orders (
    key TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    user_id TEXT,
    customer_name TEXT NOT NULL,
    pickup_time TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'NEW',
    total_amount REAL NOT NULL CHECK(total_amount >= 0),
    order_content TEXT NOT NULL, -- Chi tiết món ăn (chuỗi text hoặc JSON)
    reason TEXT DEFAULT '',
    note TEXT DEFAULT '',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

-- Chỉ mục tối ưu truy vấn đơn hàng
CREATE INDEX idx_orders_tenant_created ON orders(tenant_id, created_at DESC);
CREATE INDEX idx_orders_tenant_status ON orders(tenant_id, status);
CREATE INDEX idx_orders_user ON orders(user_id);
