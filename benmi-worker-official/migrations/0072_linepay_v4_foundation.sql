-- Storage only: no merchant is enabled and no existing order is changed.
-- LINE Pay remains sandbox-only; payment/order mutation guards arrive with Request API.
CREATE TABLE linepay_merchant_configs (
    tenant_id TEXT PRIMARY KEY REFERENCES tenant_config(tenant_id),
    enabled INTEGER NOT NULL DEFAULT 0 CHECK(enabled IN (0, 1)),
    environment TEXT NOT NULL DEFAULT 'sandbox' CHECK(environment = 'sandbox'),
    currency TEXT NOT NULL DEFAULT 'TWD' CHECK(currency = 'TWD'),
    line_login_channel_id TEXT CHECK(line_login_channel_id IS NULL OR
        (length(line_login_channel_id) > 0 AND line_login_channel_id NOT GLOB '*[^0-9]*')),
    current_credential_version INTEGER CHECK(current_credential_version > 0),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (tenant_id, current_credential_version)
        REFERENCES linepay_merchant_credentials(tenant_id, version),
    CHECK(enabled = 0 OR (line_login_channel_id IS NOT NULL AND current_credential_version IS NOT NULL))
);

CREATE TABLE linepay_merchant_credentials (
    tenant_id TEXT NOT NULL REFERENCES linepay_merchant_configs(tenant_id),
    version INTEGER NOT NULL CHECK(typeof(version) = 'integer' AND version > 0),
    channel_id TEXT NOT NULL CHECK(length(channel_id) > 0 AND channel_id NOT GLOB '*[^0-9]*'),
    -- v1.<base64 96-bit nonce>.<base64 AES-GCM ciphertext + tag>. Never plaintext.
    encrypted_secret TEXT NOT NULL CHECK(encrypted_secret GLOB 'v1.*.*'),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (tenant_id, version)
);

-- Composite keys prevent an order, credential or operation crossing tenant boundaries.
CREATE UNIQUE INDEX idx_orders_linepay_tenant_identity ON orders(tenant_id, order_id);

CREATE TABLE linepay_payments (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    order_id TEXT NOT NULL,
    credential_version INTEGER NOT NULL,
    merchant_order_id TEXT NOT NULL CHECK(length(merchant_order_id) BETWEEN 1 AND 100),
    transaction_id TEXT CHECK(transaction_id IS NULL OR
        (length(transaction_id) = 19 AND transaction_id NOT GLOB '*[^0-9]*')),
    payer_user_id TEXT NOT NULL CHECK(length(payer_user_id) > 0),
    amount INTEGER NOT NULL CHECK(typeof(amount) = 'integer' AND amount BETWEEN 1 AND 9007199254740991),
    currency TEXT NOT NULL DEFAULT 'TWD' CHECK(currency = 'TWD'),
    environment TEXT NOT NULL DEFAULT 'sandbox' CHECK(environment = 'sandbox'),
    status TEXT NOT NULL DEFAULT 'CREATING' CHECK(status IN
        ('CREATING','PENDING','CONFIRMING','PAID','REFUNDING','REFUNDED','FAILED','CANCELLED','UNKNOWN')),
    callback_state_hash TEXT NOT NULL CHECK(length(callback_state_hash) = 64 AND callback_state_hash NOT GLOB '*[^0-9a-f]*'),
    payment_url_web TEXT,
    payment_url_app TEXT,
    last_provider_code TEXT,
    next_check_at INTEGER NOT NULL DEFAULT 0 CHECK(next_check_at >= 0),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE (tenant_id, id),
    UNIQUE (tenant_id, merchant_order_id),
    UNIQUE (tenant_id, transaction_id),
    FOREIGN KEY (tenant_id, order_id) REFERENCES orders(tenant_id, order_id),
    FOREIGN KEY (tenant_id, credential_version) REFERENCES linepay_merchant_credentials(tenant_id, version)
);

-- UNKNOWN keeps the slot until provider evidence resolves it. PAID holds it until a full refund.
CREATE UNIQUE INDEX idx_linepay_one_open_payment_per_order ON linepay_payments(tenant_id, order_id)
    WHERE status IN ('CREATING','PENDING','CONFIRMING','PAID','REFUNDING','UNKNOWN');
CREATE INDEX idx_linepay_payment_reconciliation ON linepay_payments(status, next_check_at);

CREATE TABLE linepay_operations (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    payment_id TEXT NOT NULL,
    kind TEXT NOT NULL CHECK(kind IN ('REQUEST','CONFIRM','CHECK','REFUND')),
    idempotency_key_hash TEXT NOT NULL CHECK(length(idempotency_key_hash) = 64 AND idempotency_key_hash NOT GLOB '*[^0-9a-f]*'),
    request_hash TEXT NOT NULL CHECK(length(request_hash) = 64 AND request_hash NOT GLOB '*[^0-9a-f]*'),
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING','RUNNING','SUCCEEDED','FAILED','UNKNOWN')),
    claim_id TEXT,
    lease_until INTEGER NOT NULL DEFAULT 0 CHECK(lease_until >= 0),
    provider_code TEXT,
    provider_transaction_id TEXT CHECK(provider_transaction_id IS NULL OR
        (length(provider_transaction_id) = 19 AND provider_transaction_id NOT GLOB '*[^0-9]*')),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE (tenant_id, idempotency_key_hash),
    FOREIGN KEY (tenant_id, payment_id) REFERENCES linepay_payments(tenant_id, id)
);
CREATE INDEX idx_linepay_operations_payment ON linepay_operations(tenant_id, payment_id, kind);
CREATE UNIQUE INDEX idx_linepay_one_running_operation ON linepay_operations(tenant_id, payment_id)
    WHERE status IN ('RUNNING','UNKNOWN');

-- Financial identity/snapshots and historical credentials cannot be reassigned in place.
CREATE TRIGGER linepay_credentials_immutable BEFORE UPDATE ON linepay_merchant_credentials
BEGIN SELECT RAISE(ABORT, 'LINE_PAY_CREDENTIAL_IMMUTABLE'); END;
CREATE TRIGGER linepay_payment_identity_immutable BEFORE UPDATE ON linepay_payments
WHEN NEW.id IS NOT OLD.id OR NEW.tenant_id IS NOT OLD.tenant_id OR NEW.order_id IS NOT OLD.order_id
    OR NEW.credential_version IS NOT OLD.credential_version OR NEW.merchant_order_id IS NOT OLD.merchant_order_id
    OR NEW.payer_user_id IS NOT OLD.payer_user_id OR NEW.amount IS NOT OLD.amount
    OR NEW.currency IS NOT OLD.currency OR NEW.environment IS NOT OLD.environment
    OR (OLD.transaction_id IS NOT NULL AND NEW.transaction_id IS NOT OLD.transaction_id)
BEGIN SELECT RAISE(ABORT, 'LINE_PAY_PAYMENT_IMMUTABLE'); END;
CREATE TRIGGER linepay_operation_identity_immutable BEFORE UPDATE ON linepay_operations
WHEN NEW.id IS NOT OLD.id OR NEW.tenant_id IS NOT OLD.tenant_id OR NEW.payment_id IS NOT OLD.payment_id
    OR NEW.kind IS NOT OLD.kind OR NEW.idempotency_key_hash IS NOT OLD.idempotency_key_hash
    OR NEW.request_hash IS NOT OLD.request_hash
BEGIN SELECT RAISE(ABORT, 'LINE_PAY_OPERATION_IMMUTABLE'); END;
