import { Env } from '../types/env';
import { TenantContext } from '../types/tenant';
import { createTenantRepository } from '../repositories/tenant.repository';

export async function resolveTenantContext(
  tenantId: string,
  env: Env
): Promise<TenantContext | null> {
  const repo = createTenantRepository(env.DB, env.ORDER_STATE, env);
  return repo.getTenantContext(tenantId);
}

export async function invalidateTenantCache(tenantId: string, env: Env): Promise<void> {
  const repo = createTenantRepository(env.DB, env.ORDER_STATE, env);
  return repo.invalidateCache(tenantId);
}
