# Missing options after unified menu release — 2026-10-27

## Cause and production evidence

Before the manual repair reported by the operator, the production bootstrap for Benmi returned `unifiedMenu: true`, but all 13
combo products had `bundleRule: null`. The legacy inline beverage selector exits
when unified mode is enabled. Its replacement was applied manually on dev (see
`docs/qa/unified-menu-dev.md`), but was not included in a release migration.

Commit `8448960` also removed category inheritance from `effectiveGroups` and
returned an empty `categoryLinks` array without materializing the existing links.
Production still had 31 category assignments across eight tenants. The customer
client ignores legacy item modifiers for products marked `unifiedOptions`.

The all-tenant audit additionally found an untouched seeded beverage group in
yanxiansuji with `included=1` and two choices while its maximum was one. The seed
confused a drink included in the price with the canonical fixed/all-options flag.

## Repair

Scope updated at the operator’s request: **exclude Benmi entirely**, because its
options were restored manually. Both migration writes use the same temporary
exclusion configuration. There is no beverage backfill for Benmi, and no Benmi
cache refresh should be performed as part of this repair.

Migration `0072_repair_unified_option_cutover.sql`:

- Converts existing category assignments into explicit item links for every
  active tenant in scope, preserving direct disabled links and option subsets.
- Corrects untouched included-price choice groups using their original bundle
  metadata. Fixed groups and groups edited since seeding are preserved.
- Preserves existing products, prices, stock, option records and order history.
  Existing category links remain available for rollback compatibility. New menu
  products still require explicit group assignment under the current editor model.

The seed script now writes explicit item links and correctly seeds the beverage
group as a choice. Regression coverage is included in the shared menu release gate.

## Dry-run result

Read-only production snapshot, then local SQLite execution using production table
definitions and the actual `loadOptionCatalog`, `validateOptionGraph` and
`projectOptionRule` code:

| Tenant | Restored category-to-item links |
| --- | ---: |
| zhadantongxue | 39 |
| weiweibao | 17 |
| xiaolan | 21 |
| thuyngason | 18 |
| blab_demo | 3 |
| haoshiguoshao | 36 |
| yanxiansuji | 57 |
| Total | 191 |

The revised migration adds 191 links across seven tenants. All 15 non-Benmi
tenant option graphs validate after repair on the original read-only snapshot.
Benmi is excluded, including any missing historical links. All 611 menu item records and
184 pre-existing option records compare equal before/after. No live orders were
created. Five regression tests cover multi-tenant isolation, disabled/subset
overrides, byte-for-byte preservation of manually repaired Benmi data (including
revisions), migration reruns, inactive tenants, fixed versus included-price groups,
and the seed SQL.

After excluding Benmi, the five regression tests and 27 targeted menu tests passed
with Node 24.22.1. Before this scope-only revision, the five regression tests, 27 targeted menu
tests, frontend static checks and Worker TypeScript checks passed. The full
release baseline completed at **23/25 suites passed**; all option components and
full menu pages passed in Chromium and WebKit. Existing failures in unchanged
UI files remain: `test_menu_display_scale.cjs` finds 16 hardcoded pixel font sizes
in `css/orders-menu.css`, and the compact 375×600 order-detail scroll test measures
75.015625px bottom clearance against an 80px requirement. These are not bypassed
or counted as passing. Local evidence is under
`artifacts/release-baseline/2026-10-27T03-03-10-444Z/`.

## Release and cache refresh

This file records a local dry run; it is not evidence of production application.
Use Node 24 and the repository's cf migration workflow. Check pending migrations
first, review their scope, then apply in dev → staging → production order. Do not
reseed tenant menus to repair this issue.

After applying, invalidate the affected tenants' bootstrap keys using
`invalidateBootstrapCache(tenantId, env)` (or the equivalent administrative
deletion of both `tenant:{id}:bootstrap` and `tenant:{id}:bootstrap:v2`). Fetch
`/api/tenant/bootstrap?tenant_id={id}&nocache=1` to verify fresh data and warm the
cache. Verify normal cached requests too. Confirm every configured choice group
is present for the affected non-Benmi tenants and the yanxiansuji beverage group
is a choice of one. Frontend assets are unchanged.

Do not blindly remove links to roll back after operators have edited the menu;
compare the pre-migration snapshot and preserve subsequent changes.
