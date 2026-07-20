-- 4. Bảng Giao dịch Chờ xác nhận (Pending Actions)
CREATE TABLE pending_actions (
    user_id TEXT NOT NULL,
    order_key TEXT NOT NULL,
    action_type TEXT NOT NULL,      -- 'CHANGE', 'REJECT'
    question_text TEXT NOT NULL,    -- Nội dung câu hỏi bot gửi
    reason TEXT,                    -- Lý do (ví dụ: '時間需調整')
    note TEXT,                      -- Ghi chú/Thời gian đề xuất
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, order_key)
);

-- Index tăng tốc truy vấn theo user_id
CREATE INDEX idx_pending_actions_user ON pending_actions(user_id);
