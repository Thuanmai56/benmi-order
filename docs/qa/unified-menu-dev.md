# Unified menu option groups — dev rollout

Products and shared option groups now own menu configuration. Product options reference live products and have independent surcharges. Canonical groups are projected into the existing cart/receipt envelope (version 3); legacy bundle records are archived and historical order snapshots are unchanged.

Only `dev` enables `UNIFIED_MENU_ENABLED`. Database migrations 0065–0066 were dry-run against a fresh copy of all dev menu tables, then applied using `npm run db:migrations:apply:dev`. All 31 legacy rule groups across 14 tenants matched their original fixed quantities, category sources, repetition rules and surcharges. Remote post-migration comparison confirmed every product's name, price, category and stock were unchanged.

Validation:
- Root `npm test` and `npm run check`; backend TypeScript, six CLI resource-identity checks and `cf build --mode dev`.
- 64 menu safety, legacy bundle, receipt and canonical-option tests passed. These cover 3/7 subsets, category inheritance/override/restore, fixed quantities, repeats, live product references/stock, nested surcharges, cycles, foreign tenant IDs, atomic rollback and stale/concurrent writes.
- Browser fixture uses the actual new entity API against isolated SQLite data. Verified product/group saves, custom option creation, product search/category filter, cycle error retention, dirty-close continuation, retry after HTTP 503, and preserving an unrelated dirty product after a successful save.
- Browser checked 1366×1024, 1024×768 and 768×1024; Vietnamese and Traditional Chinese drawer labels, fixed footer and independent body scrolling.
- Customer selection of a product with surcharge 0 and a child option with surcharge 3 gave 103 on a 100 base product. The receipt-compatible snapshot contained the child label and surcharge once.

- Checkout now refreshes canonical options after a server rejection, displays Vietnamese/Traditional Chinese messages, reopens selection, and preserves quantities, notes and selections even when the product was renamed.
- The old inline beverage selector was outside `menu_bundle_rules`. An explicit category-ID mapping was prepared with `scripts/prepare-option-source-backfill.cjs` and saved through the transactional group API on dev. One shared inherited group covers all 13 existing sets and references five live beverages, each with surcharge 0. The before/after product-field comparison passed. New beverages in the configured source category remain eligible. Legacy saved beverage selections are restored into the canonical group; receipts use one canonical selection.

Release uses the repository's cf CLI configuration and Node 24. The dev Worker's automatic build command is `npm run check` and deploy command is `npm run deploy:dev`. Pages and Worker automatic deployments for commit `7565afd` both succeeded. All 14 tenant bootstraps and option catalogs returned HTTP 200 with complete unified configuration. The deployed POS was opened and its product drawer and group library inspected without editing live menu data.

Preview: https://dev.benmi-order.pages.dev/orders
Worker: https://platform-worker-dev.thuanmnc.workers.dev

Tablet dimensions were tested in the browser; no physical printer or tablet hardware was used.

## Option editor and unsaved-change fix — 2026-10-11

The drawer now compares editable persisted values and un-applied child drafts,
rather than treating the route stack as a change. Rendering fixed/included rules
is read-only. Unchanged Apply/Save and reverted fields do not write data, including
category-sourced options that must not become explicit overrides just by viewing.

Direct option entry has no Back button and saves the selected option through the
existing revision-checked group API. Entry from a group draft uses Apply without
saving until Save group. Failed direct saves keep edits outside the parent snapshot
so retrying or reverting cannot save a stale temporary option. Source-backed
options expose local pause and explain why removal would automatically re-add them.

Validation:
- `npm run check`, `npm test`, and `npm run test:unified-menu` pass. The unified
  suite includes 17 new event-driven drawer tests for clean navigation, real child
  edits, reverts, default subsets, source overrides, fixed quantities, localized
  labels, isolated writes, stale conflicts, retry and removal.
- Browser fixture uses the real transactional API against isolated SQLite. Direct
  surcharge save, Apply/Save group with a child surcharge, HTTP 503 retention and
  retry, clean close, and compact dirty confirmation were verified.
- Vietnamese and Traditional Chinese labels were inspected. Opening a disclosure
  alone stays clean. Confirmation keeps form DOM, scroll, disclosure state and focus.
- At 1024×768, 768×1024 and 390×844, the drawer is 520px (374px on the small screen),
  no horizontal overflow occurs, the footer stays visible, and all visible controls
  have touch targets at least 48px. The temporary viewport override was reset.

Frontend cache-buster: `20261011_option_editor_v2`. No backend API or migration changes.
