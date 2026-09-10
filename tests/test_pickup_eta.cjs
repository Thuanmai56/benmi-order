const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync('js/orders-core.js', 'utf8');
const ctx = vm.createContext({ Date, allowScheduledPickup: false, t: (key, values) => ({key, ...values}) });
for (const name of ['parsePickupTimeMs', 'formatEta', 'isOrderElapsedMode']) {
  const start = source.indexOf(`function ${name}(`);
  const end = source.indexOf('\nfunction ', start + 1);
  vm.runInContext(source.slice(start, end), ctx);
}
for (const time of ['2026-09-12 12:00', '', '即刻', 'Làm ngay']) {
  assert.equal(ctx.isOrderElapsedMode({ diningOption: 'takeaway', time }), false);
}
assert.equal(ctx.isOrderElapsedMode({ diningOption: 'dine_in' }), true);
assert.equal(ctx.isOrderElapsedMode({ dining_option: 'dine_in' }), true);
const future = new Date(Date.now() + 90 * 60000);
const local = `${future.getFullYear()}-${String(future.getMonth()+1).padStart(2,'0')}-${String(future.getDate()).padStart(2,'0')} ${String(future.getHours()).padStart(2,'0')}:${String(future.getMinutes()).padStart(2,'0')}`;
assert.equal(ctx.formatEta(local).key, 'etaHours');
assert.equal(ctx.formatEta(local).h, 1);
assert.equal(ctx.formatEta('即刻'), '-');
console.log('PASS: takeaway countdown independent of scheduling setting; dine-in elapsed; missing pickup stays unknown');
