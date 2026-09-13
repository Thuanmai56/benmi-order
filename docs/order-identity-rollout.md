# Order identity rollout — 2026-09-14

## Contract

`orders.key` / API `key` is a server-created UUID and the immutable primary key. `display_key` / API `displayKey` is the short receipt number. `business_date` uses the existing Asia/Taipei business-day convention. Receipt uniqueness is `(tenant_id, business_date, display_key)`; the same short number can be used by different tenants or in a later year without overwriting an order.

`orders.uuid` / request `uuid` remains the **client retry token**, not the order primary key. It is unique per tenant. Repeating a committed request, including concurrent requests, returns the original key and displayKey. An unavailable counter returns 503 rather than inventing a random number. The counter increment can leave gaps if an order fails; consecutive gapless numbering is not promised.

All POS actions, append URLs, LINE postbacks, order_items and pending_actions use the primary key. UI and printed receipts use displayKey. LINE text receipts carry a separate reference so a webhook never matches a new order by an ambiguous short number. Human progress lookup is restricted to the customer and refuses ambiguous numbers. Existing authentication and general order pricing/state-machine concerns are outside this change.

## Two independently prepared branches

- `codex/order-uuid-main`, based on main `6036c32`: retains bundle/threshold validation and existing production UI.
- `codex/order-uuid-dev`, based on dev `5cff231`: retains structured print items and native printer UI.

Do not merge dev into main to obtain this change. Review/merge the matching implementation into each base. Both contain the identical 0054 migration and the same D1 identity test suite. No remote migration, push, merge or deployment was executed during implementation.

## Migration 0054

The migration changes existing physical primary keys in one transaction with deferred foreign-key validation. It preserves the client retry UUID, short number, amounts, timestamps, content and status. It updates order_items and pending_actions, and retains a tenant-scoped `order_legacy_keys` mapping plus `orders.legacy_key` for historical links/devices. It also advances daily counters past recognizable legacy sequence numbers and enforces immutable identity on subsequent writes.

The mapping is permanent compatibility data, not a cache. A pre-migration reference always resolves to its original order, even when a later year's receipt number is identical. New short numbers are never accepted as mutation identifiers. UUIDs are not access credentials; authorization must still be enforced separately.

Google Sheets receives `orderId` (UUID) and `displayKey`; its existing `key` remains the legacy key for migrated orders so an external upsert does not create a second row. New orders use UUID for that external key. Confirm the receiver's behavior in staging; no external Sheets deployment was modified.

## Required coordinated release

This is a primary-key migration, not a safe rolling mixed-version DB change. Old Worker code cannot continue writing after 0054. Pre-migration clients retain compatible references for historical orders, but must reload for correct display of new UUID orders. Bundled Android assets require a rebuilt app/release; HTML cache busting alone does not update an offline bundled APK.

1. Before release, verify the actual migration ledger and schema on the target DB: all previous required schema migrations through 0053 must be present. Check extra custom foreign keys/integrations to `orders.key`, null/invalid created_at values, orphan items/pending actions, counts and totals. This implementation was tested on synthetic local D1, not a production snapshot.
2. Export a recoverable snapshot / record a restore point. Retain the export securely. Measure 0054 on a staging copy at actual volume; the backfill updates every order and child row and may require a separate batched migration plan at large scale.
3. Release and verify dev first using its matching branch and `blab-db-dev`. Stage production's matching branch against a staging copy before main release. Do not assume dev and production have identical schema/data from their branch names.
4. Schedule a write pause for order APIs, LINE webhook processing and POS mutations. Drain requests and pending background writes; do not rely only on `store_status=paused`, which does not stop every mutation. Preserve/retry LINE delivery rather than acknowledging unprocessed events. Keep writers stopped while migration and Worker activation take place.
5. Apply 0054 through Wrangler migrations on the correct database/environment, then activate the matching Worker, then publish refreshed HTML/JS and update/reload POS devices. Existing env config and LIFF/domain selection remain unchanged.
6. While writes are still paused, verify `PRAGMA foreign_key_check`, unchanged order/item counts and totals, UUID keys and alias mapping. Smoke-test one synthetic tenant: create, retry, append, status, old LINE button, new LINE button, history and cashier/kitchen print. Verify no external duplicate Sheets row.
7. Resume traffic and watch error rates, SQL errors, unknown references, print duplicates, and create/append results. Keep the mapping and old integration aliases.

### Rollback

Do not deploy an old Worker against the migrated DB and do not reconstruct old primary keys from display_key: new orders can now have identical display numbers across tenants/years. Before traffic resumes, rollback is restoration of the verified pre-migration snapshot together with the previous Worker/client. After new writes, prefer a forward fix; any full restore requires stopping writers and reconciling every new order/append/payment first. There is no automatic destructive down migration.

## Local verification

Install the matching Worker's dependencies (`npm ci` in benmi-worker-official), then from the repository root:

```sh
npm run check
npm run test:order-identity
./benmi-worker-official/node_modules/.bin/tsc --noEmit -p benmi-worker-official/tsconfig.json
```

Identity checks run real local D1 through Miniflare, execute the migration transaction, then run real source handlers. Outbound fetches are stubbed; they never send real LINE messages or Sheets writes. Python 3 is used only to split SQL statements correctly with SQLite's parser. Frontend checks do not replace device acceptance testing.

Additional main checks: Dapinglin bundle rules and order-prefix migration tests. Additional dev checks: order print items, printer sequence, receipt canvas sizing, display number on receipt/sticker, and suppression of reprinting migrated orders.
