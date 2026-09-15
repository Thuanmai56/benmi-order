const assert = require('assert');
const fs = require('fs');
const path = require('path');

const storage = {};
global.localStorage = {
  getItem: (key) => storage[key] || null,
  setItem: (key, value) => { storage[key] = String(value); }
};
global.document = {};
global.window = {
  location: { search: '?tenant=sequence-test' },
  localStorage: global.localStorage
};

eval(fs.readFileSync(path.join(__dirname, '../js/printer-service.js'), 'utf8'));

const service = window.PrinterService;
const order = {
  key: 'SEQ-001',
  status: 'NEW',
  items: [
    { name: 'Món A', quantity: 2 },
    { name: 'Món B', quantity: 1 }
  ]
};
global.latestOrders = [order];

service.saveSettings({
  autoPrintNewOrders: true,
  cashier: { enabled: true, interface_type: 'network', ip: '192.168.1.10' },
  kitchen: { enabled: true, interface_type: 'network', ip: '192.168.1.11', tspl_mode: 'item_stickers' }
});

const sequence = [];
service.printCashierReceipt = async () => {
  sequence.push('bill');
};
service.drawItemStickerToCanvas = (_item, _order, itemIndex) => itemIndex;
service.transmitReceiptBitmap = async (_png, _config, title) => {
  sequence.push(title.match(/\((\d+)\/(\d+)\)/)?.[0] || title);
};

(async () => {
  const result = await service.handleIncomingOrders([order]);
  assert.deepStrictEqual(sequence, [
    'bill',
    '(1/3)',
    '(2/3)',
    '(3/3)'
  ], 'autoprint must finish the bill before sending every sticker in order');
  assert.strictEqual(result, undefined, 'incoming-order handler should not expose an internal result');
  assert.strictEqual(service.isOrderAlreadyPrinted(order.key), true, 'successful dual-station print should be deduplicated');

  service.saveSettings({
    autoPrintNewOrders: true,
    cashier: { enabled: false, interface_type: 'network', ip: '192.168.1.10' },
    kitchen: { enabled: true, interface_type: 'network', ip: '192.168.1.11', tspl_mode: 'item_stickers' }
  });
  const capabilities = service.getPrintCapabilities();
  assert.deepStrictEqual(capabilities, { bill: false, stickers: true }, 'disabled bill station must not be part of print capabilities');
  assert.strictEqual(service.canPrintFullOrder(), false, 'full-order action requires both stations');

  console.log('✅ Printer sequence and station capability tests passed.');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
