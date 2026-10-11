/* Usage: node --experimental-sqlite scripts/audit-unified-options.cjs <D1 query JSON snapshot> */
const fs = require("node:fs");
const assert = require("node:assert/strict");
const {
  moduleFor,
  DatabaseSync,
} = require("../tests/helpers/option-groups.cjs");
(async () => {
  const snapshot = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys=OFF");
  for (const row of snapshot[0].results) db.exec(row.sql);
  const tables = [
    "menu_items",
    "menu_categories",
    "modifier_groups",
    "modifier_options",
    "item_modifier_links",
    "category_modifier_links",
    "menu_bundle_rules",
  ];
  for (const [i, table] of tables.entries())
    for (const row of snapshot[i + 1].results) {
      const keys = Object.keys(row);
      db.prepare(
        `INSERT INTO ${table} (${keys.join(",")}) VALUES (${keys.map(() => "?").join(",")})`,
      ).run(...keys.map((k) => row[k]));
    }
  const before = {
    items: JSON.stringify(
      db
        .prepare(
          "SELECT id,name,price,category_id,out_of_stock_until FROM menu_items ORDER BY id",
        )
        .all(),
    ),
    options: db.prepare("SELECT count(*) n FROM modifier_options").get().n,
  };
  const rules = db
    .prepare("SELECT * FROM menu_bundle_rules WHERE is_active=1")
    .all();
  db.exec(
    fs.readFileSync(
      "benmi-worker-official/migrations/0065_unified_option_groups.sql",
      "utf8",
    ),
  );
  db.exec(
    fs.readFileSync(
      "benmi-worker-official/migrations/0066_optional_migrated_option_groups.sql",
      "utf8",
    ),
  );
  assert.equal(
    JSON.stringify(
      db
        .prepare(
          "SELECT id,name,price,category_id,out_of_stock_until FROM menu_items ORDER BY id",
        )
        .all(),
    ),
    before.items,
  );
  const { api, env } = moduleFor(db),
    tenants = db.prepare("SELECT DISTINCT tenant_id FROM menu_items").all();
  let compared = 0;
  const catalogs = {};
  for (const { tenant_id } of tenants) {
    const c = await api.loadOptionCatalog(env, tenant_id);
    api.validateOptionGraph(c);
    catalogs[tenant_id] = c;
  }
  for (const r of rules) {
    const config = JSON.parse(r.config_json),
      c = catalogs[r.tenant_id];
    for (const [i, g] of config.groups.entries()) {
      const migrated = c.groups.find((v) => v.id === `ug_${r.id}_${i}`);
      assert.ok(migrated);
      const fixed = g.type === "fixed";
      const min = fixed
          ? g.items.reduce((n, o) => n + o.quantity, 0)
          : (g.minQuantity ?? g.minSelections ?? g.requiredCount ?? 1),
        max = fixed
          ? min
          : (g.maxQuantity ?? g.maxSelections ?? g.requiredCount ?? 1);
      assert.equal(migrated.minSelection, min);
      assert.equal(migrated.maxSelection, max);
      assert.equal(
        migrated.allowRepeats,
        Boolean(g.allowRepeats ?? g.allowRepeat),
      );
      assert.equal(migrated.included, fixed);
      const expected = new Map();
      if (fixed)
        for (const o of g.items)
          expected.set(o.itemId, {
            quantity: o.quantity,
            price: o.surcharge || 0,
          });
      else
        for (const p of c.products)
          if (
            (g.sources || []).some((s) =>
              s.type === "category"
                ? p.category_id === (s.refId || s.categoryId)
                : s.itemIds?.includes(p.id),
            )
          )
            expected.set(p.id, {
              quantity: 1,
              price: g.surcharges?.[p.id] || 0,
            });
      const actual = api.groupOptions(c, migrated);
      assert.equal(actual.length, expected.size);
      for (const o of actual) {
        assert.deepEqual(
          { quantity: o.quantity, price: o.price },
          expected.get(o.productId),
        );
      }
      compared++;
    }
  }
  console.log(
    JSON.stringify({
      tenants: tenants.length,
      legacyRules: rules.length,
      groupsCompared: compared,
      productsUnchanged: true,
      legacyRulesArchived:
        db
          .prepare("SELECT count(*) n FROM menu_bundle_rules WHERE is_active=1")
          .get().n === 0,
      cycles: false,
    }),
  );
  if (process.argv[3])
    fs.writeFileSync(process.argv[3], JSON.stringify(catalogs, null, 2));
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
