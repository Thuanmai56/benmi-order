# Customer order domain rollout

Production supports `https://order.blabfood.app/<tenant_id>` and the trailing-slash form. The new hostname belongs to the existing `benmi-order` Pages project. The initial release leaves every tenant in `legacy`; ordinary requests to the new hostname receive an uncached 302 to the legacy menu. LINE callback parameters are passed to the document without redirect. Static assets and POST requests keep their existing behavior.

`GET /api/config?tenant_id=<tenant_id>` reads D1 on every request and responds with `Cache-Control: no-store`. It returns `tenantId`, `liffId`, `customerOrderDomain`, `liffEndpointUrl`, and `orderUrl`. Unavailable configuration blocks login with a retryable error. Menu/bootstrap caches never select the LIFF ID or login redirect URL.

The additive migration is `0064_customer_order_domain.sql`. Apply this file alone: do not apply unrelated pending migrations or seeds. Neither this migration nor the release changes LIFF IDs, LINE Console endpoints, webhooks, orders, or tenant activation states. `liff_url` remains the LINE deep link.

## Switching one tenant

1. Copy its exact current Endpoint URL from LINE Console. Read its current `/api/config` and verify its LIFF ID.
2. Save the old URL while remaining in `legacy`, using the script below with both domains set to `legacy`. Review the dry run; add `--apply` to persist. The API checks the expected domain and LIFF ID.
3. Change that tenant's LIFF Endpoint in LINE Console to `https://order.blabfood.app/<tenant_id>` (no trailing slash in Console).
4. Run the script with `--domain blabfood --expected-domain legacy --apply`. Keep the same expected LIFF ID. The API requires a recorded legacy endpoint before first activation.
5. Verify browser login, opening from LINE on iOS/Android, controlled order creation, append/edit links, POS and LINE delivery. Initial deployment smoke checks do not create orders.

```sh
node scripts/set-order-domain.mjs \
  --tenant TENANT_ID --domain legacy --expected-domain legacy \
  --expected-liff-id LIFF_ID \
  --legacy-endpoint 'EXACT_OLD_ENDPOINT'
# Add --apply only after reviewing the printed request.
```

The script reads the dedicated key from `ORDER_DOMAIN_ADMIN_KEY` or the local private file `~/.config/benmi-order/order-domain-admin-key`. Never commit, print, or share this key. The API does not accept the application's legacy hardcoded admin fallback for domain migration.

A successful update invalidates bootstrap, tenant config and marketplace caches. Both origins remain available. LINE Console and D1 changes are not atomic; a callback during the transition may need the customer to reopen the store link and sign in again. Existing open tabs are not forcibly navigated. Carts stored on the old origin are not copied to the new origin.

## Tenant rollback

Restore the saved old Endpoint in LINE Console, then run the script with `--domain legacy --expected-domain blabfood --expected-liff-id LIFF_ID --apply`. The saved legacy URL is retained for future rollback. Never change LIFF IDs or restore order data as part of domain rollback.

## Code rollback baseline

Captured before this rollout on 2026-10-06:

- Customer repository/Pages commit: `2ec090f7ae7bc1ef408aed1299e04068b0dafc45`.
- Pages deployment: `d3f2d513-af9e-47f9-b55c-b7a8ea6a1b26`.
- Platform Worker version: `1710ba33-797b-499b-b642-2a9c0cab197c`.
- Admin repository commit: `2fb04ac235d754a8e7f32d51780a6546257cdfde`.
- Admin Worker version: `4df15f91-02f6-4f5a-8336-310659b4b2db`.

Restore the appropriate Worker version and Pages deployment/commit when needed. If any tenant has already migrated, restore its Console Endpoint and tenant state before removing the code that serves the new path. Leave the additive columns, order data and custom domain in place. Keep admin variables/bindings at their captured production values; the admin checkout contained unrelated uncommitted config/migration/document changes which this rollout does not publish.
