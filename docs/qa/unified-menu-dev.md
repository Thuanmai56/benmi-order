# Unified menu option groups — dev rollout

Products and shared option groups now own menu configuration. Product options reference live products and have independent surcharges. Canonical groups are projected into the existing cart/receipt envelope (version 3); legacy bundle records are archived and historical order snapshots are unchanged.

Only `dev` enables `UNIFIED_MENU_ENABLED`. Database migrations 0065–0066 was dry-run against a fresh copy of all dev menu tables, then applied using `npm run db:migrations:apply:dev`. All 31 legacy rule groups across 14 tenants matched their original fixed quantities, category sources, repetition rules and surcharges. Remote post-migration comparison confirmed every product's name, price, category and stock were unchanged.

Validation:
- Root `npm test` and `npm run check`; backend TypeScript, six CLI resource-identity checks and `cf build --mode dev`.
- 62 menu safety, legacy bundle, receipt and canonical-option tests passed. These cover 3/7 subsets, category inheritance/override/restore, fixed quantities, repeats, live product references/stock, nested surcharges, cycles, foreign tenant IDs, atomic rollback and stale/concurrent writes.
- Browser fixture uses the actual new entity API against isolated SQLite data. Verified product/group saves, custom option creation, product search/category filter, cycle error retention, dirty-close continuation, retry after HTTP 503, and preserving an unrelated dirty product after a successful save.
- Browser checked 1366×1024, 1024×768 and 768×1024; Vietnamese and Traditional Chinese drawer labels, fixed footer and independent body scrolling.
- Customer selection of a product with surcharge 0 and a child option with surcharge 3 gave 103 on a 100 base product. The receipt-compatible snapshot contained the child label and surcharge once.

Release uses the repository's cf CLI configuration and Node 24. The dev Worker's automatic build command is `npm run check` and deploy command is `npm run deploy:dev`. Feature activation, Pages deployment and remote bootstrap smoke checks are recorded after release below.
