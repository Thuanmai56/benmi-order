-- Per-tenant kill switch for AI-driven order-button redirects.
-- Keep existing behavior enabled by default; operators can disable it per tenant.
ALTER TABLE tenant_config
ADD COLUMN ai_order_redirect_enabled INTEGER NOT NULL DEFAULT 1;
