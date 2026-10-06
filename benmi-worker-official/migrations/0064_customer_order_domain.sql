-- Additive only: every existing/new tenant keeps its legacy LINE endpoint.
ALTER TABLE tenant_config ADD COLUMN customer_order_domain TEXT NOT NULL DEFAULT 'legacy'
  CHECK (customer_order_domain IN ('legacy', 'blabfood'));
ALTER TABLE tenant_config ADD COLUMN legacy_liff_endpoint_url TEXT;
