# Order detail snapshots

Issue #64 exposed a scope ambiguity: option labels and freeform notes were mixed in generated text and reinterpreted by independent renderers. Version 1 stores sale-time snapshots and renders them through the shared `js/order-detail-view.js` contract.

## Contract

`detailVersion: 1` requests contain items with product IDs, stable `lineId` on modification, typed option trees, `portionNotes`, and `orderSelections`. `note` belongs to the submitted round. `operationId` is stable across retries; append/modify require `expectedDetailRevision`, and modify requires `targetRound`. Omitted editable fields preserve their previous values, explicit empty values clear them. Prices and labels are resolved from the tenant catalog.

Snapshots hold ordered rounds, historical labels/prices, nested selections and notes. Each operation inserts an immutable revision and atomically updates the orders row, reporting projection and receipt outbox. A database trigger aborts stale revisions and illegal lifecycle/status transitions before projections can change. Operation IDs are tenant-scoped and bound to a request digest.

## Readers and compatibility

Modern readers never fall back to text for an empty array. The browser and LINE renderer consume the same pure view contract. `order_content` remains a generated compatibility projection. Legacy orders are not bulk backfilled; original text is retained as an explicit legacy block when appending. Legacy clients cannot overwrite a snapshotted order. Existing order IDs and print-dedup storage keys do not change.

## Rollout

Additive migration 0069; reads and writes are independent flags, off unless explicitly enabled. Rehearse on a fresh dev backup and compare every existing table. Deploy readers first, then enable writes only on dev after browser and transactional tests pass. Rollback disables writes but retains snapshot readers; never restore an old database over newly accepted orders. No staging, production or admin rollout.

## Verification

Exercise create/load/append/modify, concurrent revisions, retry and fault rollback, legacy ambiguity, nested quantities/prices, catalog changes and tenant isolation. Verify POS, LINE and printer output for equal notes in different scopes and option names containing note-like labels or `x1`. Log only codes/tenant/operation context, never note text.
