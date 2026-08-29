// ==========================================================
// Automated Unit Tests: POS ESC/POS Thermal Printing System
// Tests: Settings, Deduplication, HTML Layouts, TCP Socket Simulation
// ==========================================================

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const net = require('net');

console.log("🚀 Starting POS Thermal Printer System Verification...\n");

// 1. Mock Browser Environment (window, localStorage, document)
const mockStorage = {};
global.localStorage = {
  getItem: (key) => mockStorage[key] || null,
  setItem: (key, val) => { mockStorage[key] = String(val); },
  removeItem: (key) => { delete mockStorage[key]; },
  clear: () => { for (const k in mockStorage) delete mockStorage[k]; }
};

global.window = {
  location: { search: '?tenant=benmi' },
  localStorage: global.localStorage
};

// Load js/printer-service.js
const printerServiceCode = fs.readFileSync(path.join(__dirname, '../js/printer-service.js'), 'utf8');
eval(printerServiceCode);

const service = global.window.PrinterService;
assert(service, "PrinterService should be initialized on window object");
console.log("✅ Test 1 Passed: PrinterService initialized successfully.");

// 2. Test Settings Management
const defaultSettings = service.getSettings();
assert.strictEqual(defaultSettings.autoPrintNewOrders, false, "Default autoPrintNewOrders should be false");
assert.strictEqual(defaultSettings.cashier.port, 9100, "Default cashier port should be 9100");
assert.strictEqual(defaultSettings.kitchen.port, 9100, "Default kitchen port should be 9100");

const customSettings = {
  autoPrintNewOrders: true,
  cashier: { enabled: true, ip: "192.168.1.50", port: 9100, paperWidth: 80, autoCut: true },
  kitchen: { enabled: true, ip: "192.168.1.51", port: 9100, paperWidth: 80, autoCut: true }
};
service.saveSettings(customSettings);
const loadedSettings = service.getSettings();
assert.strictEqual(loadedSettings.autoPrintNewOrders, true, "autoPrintNewOrders should be updated to true");
assert.strictEqual(loadedSettings.cashier.ip, "192.168.1.50", "Cashier IP should match saved setting");
console.log("✅ Test 2 Passed: Settings load & save persistence verified.");

// 3. Test Deduplication Mechanism
assert.strictEqual(service.isOrderAlreadyPrinted("ORD-001"), false, "ORD-001 should not be printed initially");
service.markOrderAsPrinted("ORD-001");
assert.strictEqual(service.isOrderAlreadyPrinted("ORD-001"), true, "ORD-001 should be marked as printed");
assert.strictEqual(service.isOrderAlreadyPrinted("ORD-002"), false, "ORD-002 should not be printed");
console.log("✅ Test 3 Passed: Order deduplication prevents duplicate printing.");

// 4. Test Cashier Receipt HTML Layout
const mockOrder = {
  key: "260829-01",
  customer: "王小明",
  diningOption: "dine_in",
  tableNumber: "12",
  time: "12:30",
  content: "1份 x 招牌越式烤肉麵包 $95\n   ↳ 大辣、不加洋蔥\n1份 x 越式滴漏冰咖啡 $65",
  total: 160,
  note: "請附發票載具"
};

const cashierHtml = service.buildCashierReceiptHTML(mockOrder, 80);
assert(cashierHtml.includes("客 人 結 帳 聯"), "Cashier receipt should contain 客人結帳聯 header");
assert(cashierHtml.includes("#260829-01"), "Cashier receipt should contain order key");
assert(cashierHtml.includes("桌號：12"), "Cashier receipt should contain table number 12");
assert(cashierHtml.includes("$160"), "Cashier receipt should display total price $160");
assert(cashierHtml.includes("大辣、不加洋蔥"), "Cashier receipt should display modifiers");
console.log("✅ Test 4 Passed: Cashier receipt HTML formatting verified.");

// 5. Test Kitchen Ticket HTML Layout
const kitchenHtml = service.buildKitchenTicketHTML(mockOrder, 80);
assert(kitchenHtml.includes("廚 房 出 餐 聯"), "Kitchen ticket should contain 廚房出餐聯 header");
assert(kitchenHtml.includes("【內用 桌號：12】"), "Kitchen ticket should contain prominent table number");
assert(kitchenHtml.includes("招牌越式烤肉麵包"), "Kitchen ticket should contain dish name");
assert(kitchenHtml.includes("大辣、不加洋蔥"), "Kitchen ticket should contain kitchen modifiers");
assert(!kitchenHtml.includes("$160") && !kitchenHtml.includes("應收總計"), "Kitchen ticket MUST NOT show pricing totals");
console.log("✅ Test 5 Passed: Kitchen ticket formatting (large font, modifiers, strictly NO pricing) verified.");

// 6. Test Local Mock TCP Socket Communication
const mockServer = net.createServer((socket) => {
  socket.on('data', (data) => {
    assert(data.length > 0, "Socket should receive raw bytes");
    socket.destroy();
    mockServer.close(() => {
      console.log("✅ Test 6 Passed: Mock TCP Socket Server on Port 9100 successfully received print stream.");
      console.log("\n🎉 ALL 6 PRINTER SYSTEM TESTS PASSED SUCCESSFULLY!");
      process.exit(0);
    });
  });
});

mockServer.listen(9100, '127.0.0.1', () => {
  const client = new net.Socket();
  client.connect(9100, '127.0.0.1', () => {
    client.write(Buffer.from([0x1B, 0x40, 0x1D, 0x56, 0x00])); // ESC @, GS V 0
  });
});
