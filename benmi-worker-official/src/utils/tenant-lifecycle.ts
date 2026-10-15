/** Always read D1 before caches: a stale KV value must never reactivate a deleted tenant. */
export async function tenantIsDeleted(db: D1Database, tenantId: string): Promise<boolean> {
  const row = await db.prepare('SELECT state FROM tenant_lifecycle WHERE tenant_id=?')
    .bind(tenantId).first<{ state: string }>();
  return Boolean(row && row.state !== 'active');
}
