# PDP: Unify modifier sources — audit and migration plan

## Objectives and scope
Make all option groups visible from one tenant-scoped management API, preserving group IDs, selections, surcharges, default options, availability and item/category links. This phase records code findings and prepares a read-only data inventory. No production migration or deployment has been performed.

## Evidence and current architecture
Audited on 2026-09-28. Access initially failed with Cloudflare 7403, then succeeded after access was restored. Read-only inventory completed against dev and production. See inventory-dev.json and inventory-production.json for ID mapping candidates. These inventories verify presence and binding counts, not full option-field parity or migration completeness.

| Source | Storage | Current consumer |
|---|---|---|
| Legacy customizations | menu_customizations, options_json | bootstrap.customizations, option sidebar |
| Legacy modifier categories | menu_categories(category_type=modifier), menu_items | bootstrap.modifiers, option sidebar |
| Canonical groups | modifier_groups, modifier_options | item/category modifier joins in bootstrap |
| Item bindings | item_modifier_links | catalog.items[].modifierGroups, item settings |
| Category bindings | category_modifier_links | catalog[].modifierGroups, categoryModifierLinks |

Relevant code: `js/orders-menu.js` loadMenuData / renderMenuCategories / serializeMenuData / saveItemModifiersModal; `benmi-worker-official/src/modules/bootstrap.ts`; `benmi-worker-official/src/modules/menu.ts`.

Confirmed findings:
- Sidebar iterates customization categories, not all canonical groups. Item-only groups are absent from that list.
- Bootstrap reads canonical groups through item/category links, so unlinked groups have no complete library representation.
- Saving __customizations writes both menu_customizations and modifier_groups; item settings write canonical groups directly.
- Client serialization adds an mg_ prefix to customization group item links, while the server customization upsert uses cust.id directly when supplied. A canonical ID contract is required before migration.
- Menu saving deletes non-order groups and options without links. An editable library must preserve intentionally unassigned groups and delete only through explicit actions.
- The production-to-dev copy script omits modifier_groups, modifier_options and both link tables; that script cannot establish a representative modifier fixture.
- Category editor identity uses slugs whereas relationships use database IDs. Translate at UI boundaries; use database IDs in the new API.

## Proposed architecture
Use a tenant-scoped management response listing canonical groups independently of bindings. Each group includes id, name, selectionType, required/min/max, scope, sortOrder, options, categoryIds and itemIds. Keep customer bootstrap compatibility during transition. Preserve IDs; never deduplicate on name alone.

Legacy adapters must record source kind and source ID. Where both legacy IDs and mg_-prefixed IDs exist, compare fields and links and flag conflicts rather than merge automatically. Preserve option thresholds and sub-options as well as core fields; their representation must be mapped before switching writes.

## Migration and rollout
1. Complete read-only inventory in dev and production using authorized access; record counts and orphan links.
2. Build explicit legacy-to-canonical mapping; report conflicts and missing counterparts. Make backfill idempotent and tenant-scoped.
3. Add management library reads with compatibility adapters. Keep legacy customer payloads intact.
4. Connect sidebar and item modal to the same group objects; represent each ID once and edit bindings separately.
5. Introduce explicit group writes/deletes; remove implicit deletion of unassigned groups. Preserve defaults, min/max and availability in round trips.
6. Validate on dev, then staging; migrate production only after parity evidence. Remove legacy writes last.

Rollback: retain legacy tables and ID mappings throughout the transition, export affected configuration before backfill, and retain the old read path until parity is established. A read rollback is safe only while legacy representations remain synchronized. Do not delete legacy tables in the first release.

## Alternatives and trade-offs
- Collect nested item groups only in the sidebar: small patch, but misses unlinked groups and leaves conflicting write paths.
- Replace all storage immediately: simpler end state, but unverified legacy mappings risk losing rules and links.
- Selected phased approach: more temporary adapters, with explicit identity and parity checks before cutover.

## Cross-cutting concerns
Every query/join/write must include tenant_id. Require existing management authentication for the complete library. Invalidate bootstrap cache after writes. Audit only catalog configuration, not orders or credentials. Use existing tenant/group indexes; fetch groups/options/links in batches rather than per item. Track missing mappings, duplicate candidates and before/after counts by tenant.

## Execution status
- [x] Trace schema and code read/write paths.
- [x] Prepare read-only inventory SQL.
- [x] Execute inventory successfully on dev and production (access restored).
- [x] Produce ID inventory and mapping candidate report.
- [ ] Verify full field parity and resolve legacy category mappings before migration.
- [ ] Implement unified management API and shared UI state.
- [ ] Backfill and switch writes after dev/staging verification.

## Verification plan
Verify item-only Size, order scope, category inheritance, mixed item/category links, shared groups, unassigned groups, explicit deletion, no duplicate IDs and cross-tenant isolation. Compare names, prices, defaults, selection limits, stock state, thresholds and sub-options before/after. Save and reload from both sidebar and item modal; confirm customer ordering and bundle behavior. Check cache invalidation and frontend cache-busting. No migration is ready to run until actual inventory and mapping are complete.

## Verified inventory after access restoration

| Metric | Dev | Production |
|---|---:|---:|
| Canonical modifier groups | 17 | 0 |
| Legacy customizations without canonical counterpart | 8 | 25 |
| Legacy modifier categories | 16 | 18 |
| Legacy groups matching both direct and prefixed canonical IDs | 0 | 0 |
| Item modifier bindings | 1 | 0 |

Dev Size: tenant jiangjiejie, group mg_1790486239369_1, scope item, two options, one binding to jj_combo_a1 (套餐 A (3隻鹹水雞翅+6樣菜)), no menu_customizations counterpart. This confirms the sidebar omission for the reported item. It does not exist in the queried production canonical tables.

Sixteen dev canonical groups have a legacy ID counterpart; field equality has not yet been established. One dev order group (custom_mod_jj_sesame_oil) has zero canonical options, which requires checking against legacy JSON rather than assuming migration succeeded.

Decision: do not switch reads exclusively to modifier_groups yet. Production still depends on 25 legacy customizations and 18 modifier categories. First implement a compatibility library with source provenance, then compare complete option fields and links before idempotent backfill. No database updates or deployments were performed. SELECT queries reported zero rows written.

## Compatibility rollout (2026-09-28)
Implemented GET /api/menu/modifier-library: legacy customizations and modifier categories plus canonical groups, with source IDs, canonical IDs, options and canonical bindings. Conflicting alias identities fail closed. Sidebar now includes item-linked canonical groups and opens their existing item modifier editor. Shared item group edits propagate by ID across loaded items. Missing modifierGroups no longer serializes an implicit empty list.

This is the first compatibility release, not migration completion: category-linked-only and unassigned canonical groups are returned by the API but still need a standalone group editor in the sidebar; the source write paths and cleanup behavior remain pending. Legacy metadata parity and canonical backfill are still required before production cutover.

Verification: four adapter tests, thirty menu safety tests, frontend static check and TypeScript passed. Deployed Worker dev version 98873aef-48b7-49af-86e5-94c5485288eb and Pages preview 356e0370. Live API returned jiangjiejie=12 groups (Size linked to jj_combo_a1), benmi=2, bsc=5, dapinglin=3. Verified new script cache version through /orders on dev.benmi-order.pages.dev. No production deployment or database migration.
