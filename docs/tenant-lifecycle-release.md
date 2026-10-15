# Tenant lifecycle release

The admin and platform Workers require coordinated migrations. No remote database changes are performed by committing this feature.

## Release order

1. Apply `benmi-order/benmi-worker-official/migrations/0067_tenant_lifecycle.sql` to the target PLATFORM_DB with that repository's `cf` migration command. The migration uses production/main tables; it does not require the optional development menu or LINE projection tables. The copy in `blab_admin/platform-migrations` is for integration tests and must match byte-for-byte.
2. Apply `blab_admin/migrations/0006_tenant_lifecycle.sql` to ADMIN_DB using the admin repository's configured migration runner. It copies existing immutable agreement events before replacing their tenant identifier FK with a snapshot; evidence FKs and immutability triggers remain.
3. Deploy the platform Worker, then the admin Worker/assets. Do not use the previous destructive admin DELETE endpoint during this maintenance window, and do not roll the admin back to that implementation.
4. As an authenticated admin, POST `/api/tenant-lifecycle/reconcile` with the configured same-origin header. Repeat until `remaining` is zero. This verifies old deletion candidates against PLATFORM_DB and completes interrupted soft deletions. The scheduled handler also processes bounded batches.
5. Verify in dev/staging: normal lists and search exclude deleted tenants; the deleted list shows old deletions with unknown date/history; cached menu/POS/order/LINE routes reject deleted tenants. Test permanent deletion only using disposable fixtures with no orders or agreement evidence. Release production after staging verification.

## Permanent deletion and recovery

`DELETE /api/tenants/:id` and `DELETE /api/tenant-profiles/:id` soft-delete, retaining data. `DELETE /api/tenants/:id/permanent` requires admin permission and `{ "confirmation": "exact-tenant-id" }`. Cancelled orders count as order history. Any invitation, acceptance or legal event blocks permanent deletion; old deletions with unknown history are also blocked. Operational profile/seed audit survives as immutable tenant snapshots.

Purge stages are recorded in `tenant_purge_operations`. On failure, the tenant remains `purging`; repeat the same permanent DELETE after its lease has expired or been released. Object references remain until object deletion succeeds; database and scoped KV cleanup can be repeated. Runtime tombstones and the purge completion/audit rows remain to fence delayed workflows and make repeated requests idempotent. Remote LINE accounts/resources are not deleted.

## Validation

Admin: `npm test` and `npm run build`. Platform: `npm run check` from the backend, and `npm test` from the repository root, including `scripts/test-tenant-lifecycle.cjs`. Platform builds use Node 24 and the lockfile's `cf` CLI; no Wrangler deployment configuration is changed.
