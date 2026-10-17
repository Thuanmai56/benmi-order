# Dev rebase and data validation — 2026-10-17

## Git and deployment target

- Original dev: `c3776303551b5081facd0f6ebce0f75c708023f5`.
- Main integrated: `3fb69495be7146c7cfcb91374e07d605ec7fbe2e`.
- Local recovery branch: `backup/dev-before-rebase-20261017`.
- Rebase preserved the internal display-order merge. `range-diff` accounted for all 106 non-merge dev commits; conflict resolutions retained main lifecycle checks, LINE projections and all dev test commands.
- Only dev is published: `platform-worker-dev`, `dev.benmi-order.pages.dev`, D1 `blab-db-dev`. Staging, production and blab-admin are outside this release.

## Applied migrations and data parity

The remote ledger already contained all 73 previous migrations, including `0065_unified_option_groups.sql` and `0066_optional_migrated_option_groups.sql`. No seed or old menu conversion was replayed. Full filenames distinguish the two migrations numbered 0065.

The following missing migrations were rehearsed on a private local copy and then applied with the configured cf D1 runner:

1. `0065_line_order_receipts.sql`.
2. `0067_tenant_lifecycle.sql`.
3. `0068_unified_menu_lifecycle_guards.sql`.

The third migration extends insert/update fencing to canonical menu and LINE projection tables. It checks both sides of a tenant move and allows DELETE for the existing purge flow. Catalog revision bookkeeping remains available during purge.

Fresh remote data matched the rehearsal immediately before migration. After migration, all rows and values in the 23 pre-existing application tables matched the backup, independently of row order. Only the migration ledger gained entries.

| Data | Before | After |
| --- | ---: | ---: |
| Tenants | 15 | 15 |
| Products | 527 | 527 |
| Categories | 83 | 83 |
| Option groups | 78 | 78 |
| Options | 175 | 175 |
| Orders | 2,218 | 2,218 |
| Order items | 4,758 | 4,758 |
| Lifecycle rows | absent | 15 |
| LINE receipt rows | absent | 0 |

Lifecycle history flags were checked against existing orders. SQLite integrity/quick checks passed. Two pre-existing `order_items` foreign-key violations, at rowids 6478 and 7293, remained unchanged; no new violation appeared. Historical records were preserved.

Private backup, rehearsal database, row comparisons and logs are stored outside Git in `/private/tmp/benmi-rebase-data-20261017/` (backup directory mode 0700, data files 0600). Time Travel bookmark recorded before mutation: `00000448-00000000-00005107-b2d1b84eca03c6f1eac719929d84ebbb`.

## Dev cache isolation

Live dev and staging previously shared `Benmi-KV-Test`. Dev now uses the previously empty `BENMI_DEV_KV` namespace `f85c539e10df45049780abe25631f082`.

26 existing image/image-list and POS password values needed by dev were copied and verified byte-for-byte. The source namespace was not edited. Bootstrap/menu/config caches were not copied and rebuild from dev D1. Orders remain authoritative in D1. No production data was imported.

## Validation

- Frontend check and root `npm test`: passed (83 tests).
- `npm run test:unified-menu`: passed (76 tests).
- Menu safety and compatibility regression: passed (40 and 3 tests).
- Cluster 1, 2 and 3–5: passed (6, 4 and 5 tests).
- LINE receipt/retry and receipt-display tests: passed (23 tests); outbound delivery mocked.
- Order identity and printer system tests: passed.
- `npm run test:pos-reliability`: covers concurrent auto-print deduplication, offline station loop prevention, and polling abort/recovery.
- Backend TypeScript check, CLI tests (6 tests), and `npm run build:dev`: passed. Built Worker configuration was checked for dev D1, isolated KV, unified menu and the receipt cron.
- POS and customer option UI: 16 cases across 1440×900, 1024×768, 768×1024 and 390×844, in vi and zh-TW. Covered menu tab round trips, product drawer/no-op close, original simple/complex customer option presentations, nested surcharge pricing and missing photos. POS checks issued no write requests.
- Old frontend test mocks were updated to support the existing sticky-navigation measurement API; production sticky-navigation code was preserved.

## Release verification and recovery

Publish with an explicit lease against the original dev SHA. Confirm Pages and Worker checks for the same final commit, then verify deployed assets, API health, bootstrap, menu/history and receipt cron invocations.

For application rollback, redeploy the original dev commit; the applied migrations are additive. Keep the isolated KV values and the D1 snapshot available. Do not restore a full database over orders created after this release; use a forward correction or an explicitly reviewed recovery of affected records.
