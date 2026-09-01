-- 6. Bảng Cấu hình Tenant (Tenant Configuration)
CREATE TABLE IF NOT EXISTS tenant_config (
    tenant_id TEXT PRIMARY KEY,
    -- LINE Integration
    line_channel_token TEXT,          -- LINE Channel Access Token
    line_channel_secret TEXT,         -- For webhook signature verification
    liff_id TEXT,
    liff_url TEXT,
    -- AI Integration
    groq_api_key TEXT,
    groq_model TEXT DEFAULT 'openai/gpt-oss-120b',
    openrouter_api_key TEXT,
    openrouter_model TEXT DEFAULT 'google/gemini-2.5-flash:free',
    -- Branding
    brand_name TEXT NOT NULL,         -- e.g. "Benmi", "BSC"
    brand_color TEXT DEFAULT '#00b900',
    store_address TEXT,
    -- Business Config
    operating_hours TEXT,             -- JSON or plain text
    delivery_policy TEXT,             -- Text shown for delivery FAQ
    quick_replies TEXT,               -- JSON: [{"triggers": ["keyword1"], "reply": "response"}]
    flex_template TEXT,               -- JSON: custom Flex Message template overrides
    default_password TEXT DEFAULT '12345678',
    locale TEXT DEFAULT 'zh-TW',      -- Primary language
    -- Google Sheets
    google_sheets_url TEXT,
    -- Metadata
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_tenant_config_active ON tenant_config(is_active);

-- Seed mặc định cho Benmi
INSERT OR IGNORE INTO tenants (id, name) VALUES ('benmi', 'Benmi Vietnam Sandwich');

INSERT OR IGNORE INTO tenant_config (
    tenant_id,
    brand_name,
    brand_color,
    store_address,
    operating_hours,
    delivery_policy,
    quick_replies,
    default_password,
    locale
) VALUES (
    'benmi',
    'Benmi 越式法國麵包',
    '#00b900',
    '新北市土城區中央路二段135號',
    '11:00-21:00（一到五），7:30-21:00（六日）',
    'Benmi 最新外送說明如下：\n滿 2,000 元： 不限距離，土城全區皆享免運！\n滿 800 元：\n距離店址 2公里內 ➔ 免運\n距離店址 超過2公里 ➔ 酌收 80元 運費。\n未滿 800 元： 也別擔心！歡迎直接點擊 UberEats 平台直接下單，美味一樣送到家 https://cutt.ly/Mt9w2fAD',
    '[{"triggers":["營業時間"],"reply":"我們的營業時間：11:00-21:00（一到五），7:30-21:00（六日）。"},{"triggers":["地址","在哪"],"reply":"新北市土城區中央路二段135號"},{"triggers":["外送嗎"],"reply":"Benmi 最新外送說明如下：\n滿 2,000 元： 不限距離，土城全區皆享免運！\n滿 800 元：\n距離店址 2公里內 ➔ 免運\n距離店址 超過2公里 ➔ 酌收 80元 運費。\n未滿 800 元： 也別擔心！歡迎直接點擊 UberEats 平台直接下單，美味一樣送到家 https://cutt.ly/Mt9w2fAD"}]',
    '12345678',
    'zh-TW'
);
