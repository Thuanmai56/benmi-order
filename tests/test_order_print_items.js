const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('../benmi-worker-official/node_modules/typescript');
const file = require.resolve('../benmi-worker-official/src/modules/order-print-items.ts');
const exportsObject = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
}).outputText, { exports: exportsObject });
(async () => {
  const orders = Array.from({ length: 103 }, (_, i) => ({ key: 'K' + i }));
  const calls = [];
  const env = { DB: { prepare(sql) {
    assert(sql.includes('WHERE tenant_id = ? AND order_key IN'));
    return { bind(tenant, ...keys) {
      assert.equal(tenant, 'test-tenant'); assert(keys.length <= 50); calls.push(keys);
      return { async all() { return { results: keys.filter(key => key !== 'K102').map(order_key => ({
        order_key, item_name: 'Historical item', quantity: 2, unit_price: 65,
        selected_options: '[{"choice":"less ice"}]', notes: 'saved note', round_number: 2
      })) }; } };
    } };
  } } };
  await exportsObject.attachOrderPrintItems(env, 'test-tenant', orders);
  assert.equal(calls.length, 3);
  assert.equal(orders[0].items[0].unit_price, 65);
  assert.equal(orders[0].items[0].round_number, 2);
  assert.equal(orders[102].items, undefined, 'Legacy text-only order keeps its fallback');
  console.log('PASS: tenant-scoped batching, historical prices/options/rounds, legacy fallback');
})().catch(error => { console.error(error); process.exitCode = 1; });
