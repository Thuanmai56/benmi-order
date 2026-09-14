# Online browser release: order identity — 2026-09-14

## Contract and compatibility

`orders.order_id` / API `orderId` is the immutable server UUID. `orders.uuid` remains the tenant-scoped client retry token. `display_key` / `displayKey` is the human receipt number; `business_date` follows the existing UTC+8 convention.

`orders.key` / API `key` stays a permanent compatibility reference. Existing keys, foreign keys, LINE buttons and Sheets row keys are never rewritten. New orders keep the short key when unused; if another tenant/year already owns it, a UUID becomes the compatibility key. A concurrent collision retries a strict INSERT with that UUID. It never updates the colliding order. Modern browser labels use displayKey. An already-open old tab can show the UUID in this collision case until reloaded, but continues operating on the correct order.

UUID and compatibility-key lookups are tenant scoped. New browser/LINE actions retain compatibility references during this release. This deliberately leaves physical foreign keys on the existing column; moving those is unnecessary to separate identity from numbering. A later API/client migration can adopt orderId everywhere. Short display numbers alone are not mutation identifiers, except where they are already the permanent stored compatibility key.

## Migration and rollout

0055_expand_order_identity.sql is additive. It fills identity columns on existing orders without modifying their business fields or children. An INSERT trigger populates the fields for old Worker requests that overlap deployment or rollback. Existing Worker upserts do not change these fields. UUID uniqueness and immutability are enforced; receipt lookup is indexed, and counters are advanced past historical sequence numbers. Number allocation fails with 503 on counter outage; gaps are allowed.

0054_add_ai_order_redirect_enabled.sql already exists in main and production. The earlier, unreleased destructive 0054_separate_order_identity.sql MUST NOT be applied. The release branches supersede the earlier order-uuid branches. Keep the distinct current main/dev features; never merge all of dev into main just to ship identity.

1. Verify each remote migration ledger, schema, invalid dates, foreign keys and unique retry tokens. Record current Worker and Pages versions and a D1 Time Travel bookmark.
2. Run frontend validation, TypeScript and the local D1 identity suite, including actual legacy handlers. Exercise main bundle rules and dev browser printing separately. Synthetic tests stub outbound LINE and Sheets requests.
3. Apply only the expected additive migration on dev while the old Worker remains active. Check identities and foreign keys; deploy the tested dev Worker; publish matching dev browser assets through the dev Git branch.
4. Verify live dev read-only endpoints/assets and browser loading. Repeat the verified sequence for main. No APK is required for this browser-only release because there are no app users.
5. Check migration ledger, populated UUIDs, foreign keys, deployment versions, HTML cachebusters and JS responses. Never submit fake customer orders or send test LINE/Sheets notifications on production.

D1 briefly serializes schema/backfill work. This is an online rollout without a scheduled write pause, not a guarantee of zero milliseconds of latency or zero unrelated failures. Backfill must be re-evaluated for much larger databases; the inspected DBs currently contain about 3,451 production and 2,086 dev orders.

## Rollback

Leave additive columns, trigger and populated UUIDs in place. Restore the previous browser and Worker versions if required; old handlers remain schema compatible and all key references remain valid. Do not drop columns, rewrite keys, or restore a whole database over new orders. A baseline Worker still has its historical cross-year/prefix collision weakness; prefer a forward fix if a collision is involved. New UUIDs remain retained even when old code creates orders during rollback.

## Verification

Run `npm run check`, `npm run test:order-identity`, and `benmi-worker-official/node_modules/.bin/tsc --noEmit -p benmi-worker-official/tsconfig.json`.

For the actual prior dev handler use `ORDER_IDENTITY_LEGACY_REF=e6e2d95 npm run test:order-identity`; main defaults to prior production 2e3600b. The suite runs actual D1 through Miniflare, verifies existing child links and UUID immutability, exercises concurrent retries and same-prefix tenants, and calls the legacy create/retry/list/update handlers on expanded schema. These checks do not replace acceptance on physical printer hardware. APK builds are deferred.
