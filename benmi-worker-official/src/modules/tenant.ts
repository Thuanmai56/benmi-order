import { tenantIsDeleted } from '../utils/tenant-lifecycle';
import { Env } from '../types/env';
import { TenantContext } from '../types/tenant';
import { createTenantRepository } from '../repositories/tenant.repository';

export async function resolveTenantContext(
  tenantId: string,
  env: Env
): Promise<TenantContext | null> {
  if (await tenantIsDeleted(env.DB, tenantId)) return null;
  const repo = createTenantRepository(env.DB, env.ORDER_STATE, env);
  return repo.getTenantContext(tenantId);
}

export async function invalidateTenantCache(tenantId: string, env: Env): Promise<void> {
  const repo = createTenantRepository(env.DB, env.ORDER_STATE, env);
  return repo.invalidateCache(tenantId);
}
