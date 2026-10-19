const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { DatabaseSync } = require('node:sqlite');
const ts = require('../benmi-worker-official/node_modules/typescript');

require.extensions['.ts'] = (module, file) => module._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS }
}).outputText, file);

const { createReportRepository } = require('../benmi-worker-official/src/repositories/report.repository.ts');
const { getItemAnalyticsReport } = require('../benmi-worker-official/src/modules/reports.ts');

function createFixture() {
  const db = new DatabaseSync(':memory:');
  db.exec(`
    CREATE TABLE orders (
      key TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      status TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_key TEXT NOT NULL,
      tenant_id TEXT NOT NULL,
      item_name TEXT NOT NULL,
      category_name TEXT,
      quantity INTEGER NOT NULL,
      unit_price REAL NOT NULL,
      subtotal REAL NOT NULL,
      selected_options TEXT,
      created_at TEXT NOT NULL
    );
  `);

  const env = {
    DB: {
      prepare(sql) {
        const build = params => ({
          bind(...args) { return build(args); },
          async first() { return db.prepare(sql).get(...params) || null; },
          async all() { return { results: db.prepare(sql).all(...params) }; },
          async run() { return { meta: { changes: db.prepare(sql).run(...params).changes } }; }
        });
        return build([]);
      }
    }
  };

  return { db, env };
}

test('getItemAnalyticsReport returns 500 when env.DB is not configured', async () => {
  const req = new Request('https://example.com/api/reports/items-analytics?tenant_id=benmi');
  const res = await getItemAnalyticsReport(req, {});
  assert.equal(res.status, 500);
  const data = await res.json();
  assert.equal(data.code, 'NO_DB');
});

test('ReportRepository aggregates items and computes totalOrders only for DONE/PICKED_UP/PAID orders', async () => {
  const { db, env } = createFixture();

  // Seed orders: 2 completed, 1 cancelled
  db.exec(`
    INSERT INTO orders VALUES
      ('order-1', 'benmi', 'DONE', '2026-10-19 10:00:00'),
      ('order-2', 'benmi', 'PAID', '2026-10-19 11:00:00'),
      ('order-3', 'benmi', 'CANCELLED', '2026-10-19 12:00:00'),
      ('order-4', 'other-tenant', 'DONE', '2026-10-19 10:30:00');

    INSERT INTO order_items (order_key, tenant_id, item_name, category_name, quantity, unit_price, subtotal, selected_options, created_at) VALUES
      ('order-1', 'benmi', 'Bánh Mì Thịt Nướng', 'Bánh Mì', 2, 70, 140, '[{"choice":"Cay vừa"},{"choice":"Thêm rau"}]', '2026-10-19 10:00:00'),
      ('order-1', 'benmi', 'Cà Phê Sữa Đá', 'Đồ Uống', 1, 35, 35, '[{"choice":"Ít đường"}]', '2026-10-19 10:00:00'),
      ('order-2', 'benmi', 'Bánh Mì Thịt Nướng', 'Bánh Mì', 1, 70, 70, '[{"choice":"Cay vừa"}]', '2026-10-19 11:00:00'),
      ('order-3', 'benmi', 'Bánh Mì Xíu Mại', 'Bánh Mì', 3, 65, 195, '[]', '2026-10-19 12:00:00'),
      ('order-4', 'other-tenant', 'Bánh Mì Thịt Nướng', 'Bánh Mì', 5, 70, 350, '[]', '2026-10-19 10:30:00');
  `);

  const repo = createReportRepository(env.DB);
  const result = await repo.getItemAnalytics('benmi', '2026-10-19 00:00:00', '2026-10-19 23:59:59');

  // Cancelled order-3 and other-tenant order-4 must be excluded
  assert.equal(result.totalOrders, 2);
  assert.equal(result.totalItemsSold, 4); // 2 + 1 Bánh Mì + 1 Cà phê = 4 items
  assert.equal(result.totalRevenue, 245); // 140 + 35 + 70 = 245
  assert.equal(result.items.length, 2);

  // Top item is Bánh Mì Thịt Nướng
  const top = result.items[0];
  assert.equal(top.itemName, 'Bánh Mì Thịt Nướng');
  assert.equal(top.totalQuantity, 3);
  assert.equal(top.totalSales, 210);
  assert.equal(top.orderAppearances, 2);
  assert.deepEqual(top.optionsBreakdown, { 'Cay vừa': 2, 'Thêm rau': 1 });

  // Second item is Cà Phê Sữa Đá
  const drink = result.items[1];
  assert.equal(drink.itemName, 'Cà Phê Sữa Đá');
  assert.equal(drink.totalQuantity, 1);
  assert.equal(drink.totalSales, 35);
  assert.deepEqual(drink.optionsBreakdown, { 'Ít đường': 1 });

  // Test HTTP endpoint getItemAnalyticsReport integration
  const req = new Request('https://example.com/api/reports/items-analytics?tenant_id=benmi&range=today');
  const res = await getItemAnalyticsReport(req, env);
  assert.equal(res.status, 200);
  const summary = await res.json();
  assert.equal(summary.tenantId, 'benmi');
  assert.equal(summary.range, 'today');
  assert.equal(summary.totalOrders, 2);
  assert.equal(summary.totalRevenue, 245);
  assert.equal(summary.topItem.itemName, 'Bánh Mì Thịt Nướng');

  db.close();
});
