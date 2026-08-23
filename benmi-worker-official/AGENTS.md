# Cloudflare Worker Backend (`benmi-worker-official`) - AI Agent Instructions

This module contains the serverless backend for the **Benmi Multi-Tenant Order Platform**, running on Cloudflare Workers with D1 Database, Workers KV, and LINE Messaging API integration.

---

## 1. Architecture & Multi-Tenant Routing

All endpoints are multi-tenant aware and extract `tenant_id` via query param `?tenant_id=...` or request header `X-Tenant-Id`:
- **`src/modules/bootstrap.ts`**: High-performance `/api/tenant/bootstrap` endpoint returning catalog, modifiers, branding, and operating hours. Cached in Workers KV (`tenant:{tenant_id}:bootstrap`) for < 10ms response time.
- **`src/modules/orders.ts`**: Order lifecycle management (`/api/orders`, `/api/create`, `/api/orders/append`, `/api/orders/status`, `/api/orders/stream`). Supports Dine-in, Takeaway, Table numbers, and Multi-round appends.
- **`src/modules/menu.ts`**: Menu synchronization and stock management (`/api/menu`, `/api/menu/stock`, `/api/menu/image`).
- **`src/modules/line.ts`**: LINE Messaging API webhook, Flex Message builders, Quick Replies, and AI Assistant integration (Groq / OpenRouter).
- **`src/modules/tenant.ts`**: Tenant context resolution and feature configuration.

---

## 2. Core Development Rules

### A. Zero Hardcoding (Multi-Tenant First)
- **STRICT INVARIANT**: Never write hardcoded logic targeting specific tenant IDs (e.g. `if (tenantId === 'benmi')`) or category slugs (e.g. `if (slug === 'drinks')`).
- Store behaviors and feature switches must be read dynamically from `tenant_config` (`features`, `allow_dine_in`, `locale`, etc.) or from D1 tables.

### B. Database & Migrations (Cloudflare D1)
- **Production Database**: `blab-db-production` (`48479f91-eec7-4da2-b044-edaaf622f195`)
- **Staging Database**: `blab-db-test` (`c0152835-7d42-4545-8cb4-6658dfc7e97d`)
- Migration files are stored in `migrations/` with incremental naming (e.g., `0031_add_category_applied_modifiers.sql`).

#### Common Migration Commands:
```bash
# List unapplied migrations
npx wrangler d1 migrations list blab-db-test --remote --env test
npx wrangler d1 migrations list blab-db-production --remote

# Apply migrations
npx wrangler d1 migrations apply blab-db-test --remote --env test
npx wrangler d1 migrations apply blab-db-production --remote

# Execute single SQL file or command
npx wrangler d1 execute blab-db-test --remote --env test --file=./migrations/00XX_name.sql
npx wrangler d1 execute blab-db-production --remote --command="SELECT * FROM tenants;"
```

### C. KV Cache Invalidation
Whenever menu items, categories, or tenant configurations are modified, you must call:
```typescript
await invalidateBootstrapCache(tenantId, env);
```
To bypass cache during debugging/testing, pass `?nocache=1` or `?_t=<timestamp>` in the request URL.

---

## 3. Build & Deployment Commands

| Action | Command |
| :--- | :--- |
| **Type Check** | `npx tsc --noEmit` |
| **Local Dev** | `npx wrangler dev` |
| **Deploy Staging** | `npx wrangler deploy --env test` |
| **Deploy Production** | `npx wrangler deploy` |
| **Generate Types** | `npx wrangler types` |

---

## 4. Cloudflare Workers Documentation References
- Docs: https://developers.cloudflare.com/workers/
- Limits & Quotas: https://developers.cloudflare.com/workers/platform/limits/
- D1 Database: https://developers.cloudflare.com/d1/
- KV Storage: https://developers.cloudflare.com/kv/
