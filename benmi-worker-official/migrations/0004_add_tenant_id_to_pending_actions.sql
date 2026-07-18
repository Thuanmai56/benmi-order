DROP TABLE IF EXISTS pending_actions;

-- Bảng Giao dịch Chờ xác nhận (Pending Actions) cô lập theo từng Tenant
CREATE TABLE pending_actions (
    tenant_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    order_key TEXT NOT NULL,
    action_type TEXT NOT NULL,      -- 'CHANGE', 'REJECT'
    question_text TEXT NOT NULL,    -- Nội dung câu hỏi bot gửi
    reason TEXT,                    -- Lý do (ví dụ: '時間需調整')
    note TEXT,                      -- Ghi chú/Thời gian đề xuất
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (tenant_id, user_id, order_key),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

-- Index tăng tốc truy vấn theo tenant_id và user_id
CREATE INDEX idx_pending_actions_tenant_user ON pending_actions(tenant_id, user_id);
