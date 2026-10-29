# Deleted options still visible in LIFF — 2026-10-29

## Production evidence (read-only investigation)

The production bootstrap for `yanxiansuji`, both cached and `nocache=1`,
returned `unifiedMenu: true` together with the old `cat_yanzisuchun_flavor`
modifier category and its ten choices (`yzs_fl_01` through `yzs_fl_10`).
The category's `appliedModifiers` still referenced that legacy category.

The canonical D1 tables no longer contain the old flavor group. They contain
five groups: one item-scoped beverage group and four order-scoped groups.
Only the beverage group has an item link. The pictured product `yzs_snk_07`
has price 35 and no canonical item options (`bundleRule: null`). Thus the
per-item flavor popup in the screenshot does not reflect the current POS model.

Eight tenants still have legacy modifier categories alongside canonical groups.
These records alone do not establish a bug for every tenant; exposing both
configuration sources makes stale clients vulnerable to fallback behavior.

Current JavaScript already respected `item.unifiedOptions` when it found a
matching item. It did not guard at bootstrap level, or in the separate category
resolver. Browser hydration also accepted old snapshots without checking their
version or completeness. The screenshot cannot establish which script or local
snapshot the reporting device used. Regression tests reproduce both the old
snapshot hydration and fallback from a unified payload missing the item marker.

The screenshot's `$0` is a separate confirmed contract mismatch: the popup read
`resolveCatalogItem().price`, while the resolver returns `basePrice`.

## Local repair

- Unified bootstrap exposes only canonical option rules; legacy modifier lists,
  category assignments and category modifier groups are empty. Product rules
  are always assigned from the canonical projection, including explicit null.
- Unified client resolvers reject legacy category/item modifiers regardless of
  per-item markers. Canonical item rules and whole-order customizations remain.
- Bootstrap version 3 rejects old KV entries. Browser instant hydration requires
  a complete version-3 snapshot belonging to the current tenant. Frontend asset
  URLs were bumped, including the core preload.
- Legacy mode retains its original modifier data. Popup base price uses the
  resolver's `basePrice`, with compatible fallbacks.

No tenant-specific application branches, migrations, or remote D1 writes.
Legacy rows remain available for rollback and historical orders.

## Verification

`tests/test_deleted_option_authority.cjs` failed in all four scenarios before
the repair and passes afterward. It runs actual customer scripts in page order
and the actual bootstrap handler against SQLite with the repository migrations.
It covers old/missing item markers, stale browser and KV snapshots, optional
item choices, individual option removal, group deletion, order-scoped choices,
legacy rollback, and the popup base price. It is included in `test:new-menu`.

Additional checks passed: frontend static/shared-scope checks, Worker TypeScript,
cache-buster validation, 27 existing new-menu tests, 58 compatibility/cutover/
option tests, and the required-options browser scenario in Chromium and WebKit
for both Vietnamese and Traditional Chinese.

This records a local repair, not a production deployment. Backend and frontend
must both be released; the new bootstrap version rebuilds old cache entries on
request. Recheck normal and uncached production bootstrap after release, then
open LIFF on the affected device. The full release baseline remains a required
pre-deployment gate.

## Self-review — 2026-10-30

The initial repair was incomplete. Four issues were reproduced locally with the
actual browser scripts, bootstrap handler, SQLite fixtures, PrinterService and
typed order validator. This review adds no further application-code changes.

1. **Introduced regression: historical option names.** Removing `modifiers`
   also removes the only bootstrap lookup source for legacy option IDs.
   `updatePosOptionIdMap` and `resolveOptionDisplayName` do not have a separate
   historical lookup. A saved order choice `old_hot` prints as `old_hot` with
   the patched unified bootstrap, while the legacy bootstrap resolves it to
   `Pepper`. Keep a display-only ID/name dictionary, independent of selectable
   menu groups, and consume it in POS/printing and customer display resolution.

2. **Existing stale-draft pricing.** Neither fresh-menu loading nor cart restore
   reconciles `customizeData` with current groups. `calculatePortionExtra` and
   `buildStructuredCartItems` still trust saved `selectedDetails.price` even
   when unified modifiers are empty. Reproduction: current product price 35,
   no current group, old option surcharge 7 → customer subtotal 42; typed checkout
   strips the label-only option but retains the submitted total, and
   `buildDetailRound` rejects it with `ORDER_PRICE_CHANGED`. Reconcile editable
   cart selections against the current catalog while retaining notes and actual
   historical-order snapshots.

3. **Existing unrecoverable removed-group selection.** After deleting a product's
   last group, `bundleCartData` and typed checkout still contain that group's
   choices. The validator rejects them with `OPTION_GROUPS_REQUIRED`. Recovery
   only opens the option editor when the product still has a `bundleRule`; the
   editor itself returns early when no rule remains. The stale group survives
   retry. Handle a removed rule explicitly: clear/reconcile current draft
   choices, recalculate and require the customer to confirm the updated cart.

4. **Existing incomplete-bootstrap cart loss.** `fetchMenu` validates tenant and
   `menuComplete`, but `validateCartStockBeforeSubmit` adopts any successful JSON
   response. A response `{tenant:{id:'a'},menuComplete:false,catalog:[]}` makes an
   existing `food_Meal` appear unavailable and deletes it from the cart. Validate
   tenant identity and completeness before replacing bootstrap or changing any
   cart state; leave the cart intact when menu validation cannot complete.

The typed server boundary rejected both invalid-selection/price reproductions;
these are not evidence that production accepts an invalid charge. Reproduction
used local SQLite only and did not create orders or modify production data.

## Follow-up repair — 2026-10-30

All four findings above are now addressed locally:

- Unified bootstrap supplies `optionDisplayNames` independently of selectable
  groups. POS/PrinterService and LIFF resolve historical IDs from this dictionary.
  It contains legacy modifier/product names and canonical option names scoped
  to the requested tenant; it supplies no selectable choices or prices.
- `reconcileCartOptions` runs when fresh menus arrive, when a saved cart is
  restored, before submission and after an option-related rejection. It migrates
  still-configured legacy choices into the canonical tree, removes obsolete
  legacy fields and removed groups (including child groups), and regenerates
  display-only modifier projections when needed. Notes and source snapshot
  objects are retained. Genuine legacy menus keep their existing behavior.
- Unified pricing and structured submission no longer trust legacy draft
  surcharges. A changed cart pauses submission once and asks the customer to
  review and explicitly submit again. Removing the last group now clears its
  obsolete draft tree, so the next submission no longer depends on opening a
  nonexistent option editor. Typed `ORDER_PRICE_CHANGED` errors also refresh
  through the existing recovery flow.
- Menu polling, pre-submit validation and rejection recovery validate tenant,
  completeness and catalog shape before adopting a response. Incomplete or
  unavailable pre-submit data blocks submission while preserving the cart and
  existing cache. New messages cover Vietnamese and Traditional Chinese.

Verification includes nine regression tests in
`test_deleted_option_authority.cjs`, including acceptance by the actual typed
server validator at the corrected total (35 rather than 42). The POS/printing
regression resolves a historical ID using the display-only dictionary. The
mobile browser scenario confirms review and successful retry for create,
append and modify in both languages, in Chromium and WebKit. Existing combo
price-change recovery scenarios also pass in both browsers.

Frontend static/shared-scope checks, Worker TypeScript, cache-buster validation,
36 new-menu tests, the targeted compatibility/order-detail suites and unified
menu suites pass. All frontend modules changed for this repair have updated
asset URLs. No remote D1 writes, commits or deployments were performed by this
repair. The full release baseline remains required before PR/deployment.

## Pre-push validation — 2026-10-30 (JST)

The full release baseline completed at **22/27 suites passed**. Both menu
component suites and both full-page menu suites passed in Chromium and WebKit.
The separate deleted-option/POS display regressions passed **15/15 tests**.

Five release suites failed on existing layout issues and were reproduced on a
clean checkout of pre-repair `HEAD` (`41d9449`), using the same Node and browsers:

- `pos-display-chromium` and `pos-display-webkit`: clipped action-button text.
- `pos-tablet-layout-webkit`: clipped reference-card actions at 960px in Vietnamese.
- `pos-detail-scroll`: 75.015625px bottom clearance against the required 80px.
- `menu-static-contracts`: 16 fixed pixel font sizes in `css/orders-menu.css`,
  reproduced by `test_menu_display_scale.cjs`.

These failures were not bypassed or counted as passing. No layout files or test
thresholds were changed for this repair. Local release evidence is in
`artifacts/release-baseline/2026-10-29T15-19-07-453Z/summary.json`.
