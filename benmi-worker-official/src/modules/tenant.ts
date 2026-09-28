import { tenantIsDeleted } from '../utils/tenant-lifecycle';
import { Env } from '../types/env';
import { TenantContext } from '../types/tenant';
import { createTenantRepository } from '../repositories/tenant.repository';
import { applyLineProjection, LineRuntimeError, readLineProjection } from './line-runtime';

export async function resolveTenantContext(
  tenantId: string,
  env: Env
): Promise<TenantContext | null> {
  if (await tenantIsDeleted(env.DB, tenantId)) return null;
  const lineProjection = await readLineProjection(env, tenantId);
  if (lineProjection && !lineProjection.is_active) return null;

  const repo = createTenantRepository(env.DB, lineProjection ? undefined : env.ORDER_STATE, env);
  const ctx = await repo.getTenantContext(tenantId);
  if (!ctx) {
    if (lineProjection) throw new LineRuntimeError('LINE_RUNTIME_UNAVAILABLE');
    return null;
  }

  return lineProjection ? applyLineProjection(env, ctx, lineProjection) : ctx;
}

export async function invalidateTenantCache(tenantId: string, env: Env): Promise<void> {
  const repo = createTenantRepository(env.DB, env.ORDER_STATE, env);
  return repo.invalidateCache(tenantId);
}
