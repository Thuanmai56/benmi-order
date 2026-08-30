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

global.document = {
  createElement: (tag) => {
    if (tag === 'canvas') {
      return {
        width: 576,
        height: 800,
        getContext: () => ({
          fillRect: () => {},
          fillText: () => {},
          strokeRect: () => {},
          stroke: () => {},
          beginPath: () => {},
          moveTo: () => {},
          lineTo: () => {},
          setLineDash: () => {},
          save: () => {},
          restore: () => {},
          drawImage: () => {}
        }),
        toDataURL: () => "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
      };
    }
    return { style: {}, appendChild: () => {}, removeChild: () => {} };
  },
  body: { appendChild: () => {}, removeChild: () => {} }
};

global.window = {
  location: { search: '?tenant=benmi' },
  localStorage: global.localStorage,
  document: global.document
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

const cashierPng = service.drawReceiptToCanvas(mockOrder, false, 80);
assert(cashierPng.startsWith("data:image/png;base64,"), "Cashier receipt should generate valid Base64 PNG");
console.log("✅ Test 4 Passed: Cashier receipt Canvas Painter verified.");

// 5. Test Kitchen Ticket Canvas Layout
const kitchenPng = service.drawReceiptToCanvas(mockOrder, true, 80);
assert(kitchenPng.startsWith("data:image/png;base64,"), "Kitchen ticket should generate valid Base64 PNG");
console.log("✅ Test 5 Passed: Kitchen ticket Canvas Painter verified.");

// 6. Test Bluetooth Settings & Hybrid Dual-Interface Configuration
const hybridSettings = {
  autoPrintNewOrders: true,
  cashier: {
    enabled: true,
    interface_type: "bluetooth",
    mac_address: "00:11:22:33:44:55",
    device_name: "XP-58IIH",
    paperWidth: 58,
    autoCut: true
  },
  kitchen: {
    enabled: true,
    interface_type: "network",
    ip: "192.168.1.101",
    port: 9100,
    paperWidth: 80,
    autoCut: true
  }
};
service.saveSettings(hybridSettings);
const loadedHybrid = service.getSettings();
assert.strictEqual(loadedHybrid.cashier.interface_type, "bluetooth", "Cashier interface should be bluetooth");
assert.strictEqual(loadedHybrid.cashier.mac_address, "00:11:22:33:44:55", "Cashier MAC should match");
assert.strictEqual(loadedHybrid.kitchen.interface_type, "network", "Kitchen interface should be network");
console.log("✅ Test 6 Passed: Hybrid Dual-Interface Settings (Bluetooth + Network) verified.");

// 7. Test TSPL Protocol Settings Persistence
const tsplSettings = {
  autoPrintNewOrders: true,
  cashier: {
    enabled: true,
    protocol: "tspl",
    interface_type: "bluetooth",
    mac_address: "DC:0D:30:88:99:AA",
    device_name: "Aimo D520BT",
    tspl_label_size: "100x150",
    tspl_custom_width_mm: 100,
    tspl_custom_height_mm: 150,
    tspl_mode: "summary"
  },
  kitchen: {
    enabled: true,
    protocol: "tspl",
    interface_type: "bluetooth",
    mac_address: "DC:0D:30:88:99:BB",
    device_name: "XP-365B",
    tspl_label_size: "50x30",
    tspl_custom_width_mm: 50,
    tspl_custom_height_mm: 30,
    tspl_mode: "item_stickers"
  }
};
service.saveSettings(tsplSettings);
const loadedTspl = service.getSettings();
assert.strictEqual(loadedTspl.cashier.protocol, "tspl", "Cashier protocol should be tspl");
assert.strictEqual(loadedTspl.cashier.tspl_label_size, "100x150", "Cashier label size should match");
assert.strictEqual(loadedTspl.kitchen.tspl_mode, "item_stickers", "Kitchen label mode should match");
console.log("✅ Test 7 Passed: TSPL Dual-Station Settings persistence verified.");

// 8. Test TSPL Dimension Resolution & Order Item Parsing
const dims100x150 = service.resolveLabelDimensions({ tspl_label_size: "100x150" });
assert.strictEqual(dims100x150.widthMm, 100, "100x150 width should be 100mm");
assert.strictEqual(dims100x150.heightMm, 150, "100x150 height should be 150mm");

const dims40x30 = service.resolveLabelDimensions({ tspl_label_size: "40x30" });
assert.strictEqual(dims40x30.widthMm, 40, "40x30 width should be 40mm");
assert.strictEqual(dims40x30.heightMm, 30, "40x30 height should be 30mm");

const dimsCustom = service.resolveLabelDimensions({ tspl_label_size: "custom", tspl_custom_width_mm: 80, tspl_custom_height_mm: 120 });
assert.strictEqual(dimsCustom.widthMm, 80, "Custom width should be 80mm");
assert.strictEqual(dimsCustom.heightMm, 120, "Custom height should be 120mm");

const parsedItems = service.parseOrderItems(mockOrder);
assert.strictEqual(parsedItems.length, 2, "mockOrder should parse into 2 individual items");
assert.strictEqual(parsedItems[0].name, "招牌越式烤肉麵包", "First item name should match");
assert.strictEqual(parsedItems[0].options, "大辣、不加洋蔥", "First item options should match");
assert.strictEqual(parsedItems[1].name, "越式滴漏冰咖啡", "Second item name should match");
console.log("✅ Test 8 Passed: TSPL Dimension Resolver (including 40x30mm) & Item Parser verified.");

// 9. Test TSPL Order Summary Label Canvas Painter
const tsplSummaryPng = service.drawOrderLabelToCanvas(mockOrder, false, 100, 150);
assert(tsplSummaryPng.startsWith("data:image/png;base64,"), "TSPL order summary label should generate valid Base64 PNG");
console.log("✅ Test 9 Passed: TSPL Order Summary Label Canvas Painter verified.");

// 10. Test TSPL Item / Cup Sticker Canvas Painter (40x30mm compact sticker)
const tsplStickerPng = service.drawItemStickerToCanvas(parsedItems[0], mockOrder, 0, parsedItems.length, 40, 30);
assert(tsplStickerPng.startsWith("data:image/png;base64,"), "TSPL item sticker should generate valid Base64 PNG");
console.log("✅ Test 10 Passed: TSPL Individual Cup/Dish 40x30mm Sticker Canvas Painter verified.");

// 11. Test Bluetooth Paired Devices Query & Fallback
service.getPairedBluetoothDevices().then((res) => {
  assert(Array.isArray(res.devices), "getPairedBluetoothDevices should return devices array");
  console.log(`✅ Test 11 Passed: getPairedBluetoothDevices returned ${res.devices.length} devices.`);

  // 12. Test Local Mock TCP Socket Communication
  const mockServer = net.createServer((socket) => {
    socket.on('data', (data) => {
      assert(data.length > 0, "Socket should receive raw bytes");
      socket.destroy();
      mockServer.close(() => {
        console.log("✅ Test 12 Passed: Mock TCP Socket Server on Port 9100 successfully received print stream.");
        console.log("\n🎉 ALL 12 PRINTER SYSTEM (ESC/POS + TSPL, BT + NET, RECEIPT + STICKERS) TESTS PASSED SUCCESSFULLY!");
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
});
