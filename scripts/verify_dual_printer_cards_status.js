/**
 * scripts/verify_dual_printer_cards_status.js
 * Verifies split real-time connection status on the two printer station cards
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

console.log("=================================================");
console.log("🔍 Verifying Dual Printer Cards Connection Status Display...");
console.log("=================================================");

const ordersHtml = fs.readFileSync(path.join(__dirname, '../orders.html'), 'utf-8');
const ordersSettingsJs = fs.readFileSync(path.join(__dirname, '../js/orders-settings.js'), 'utf-8');
const ordersI18nJs = fs.readFileSync(path.join(__dirname, '../js/orders-i18n.js'), 'utf-8');

let errors = 0;
function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    errors++;
  } else {
    console.log(`✓ ${message}`);
  }
}

// 1. HTML Verification for Cashier Card Status Pill
assert(ordersHtml.includes('id="printer-cashier-status-pill"'), '#printer-cashier-status-pill present in orders.html');
assert(ordersHtml.includes('id="printer-cashier-status-dot"'), '#printer-cashier-status-dot present in orders.html');
assert(ordersHtml.includes('id="printer-cashier-status-text"'), '#printer-cashier-status-text present in orders.html');

// 2. HTML Verification for Kitchen Card Status Pill
assert(ordersHtml.includes('id="printer-kitchen-status-pill"'), '#printer-kitchen-status-pill present in orders.html');
assert(ordersHtml.includes('id="printer-kitchen-status-dot"'), '#printer-kitchen-status-dot present in orders.html');
assert(ordersHtml.includes('id="printer-kitchen-status-text"'), '#printer-kitchen-status-text present in orders.html');

// 3. JS & I18N Verification in DOM VM
const mockElements = {};
function getMock(id) {
  if (!mockElements[id]) {
    mockElements[id] = {
      id,
      innerText: '',
      innerHTML: '',
      className: '',
      classList: {
        add(cls) { mockElements[id].className += ' ' + cls; },
        remove(cls) { mockElements[id].className = mockElements[id].className.replace(cls, '').trim(); },
        contains(cls) { return mockElements[id].className.includes(cls); }
      },
      style: { display: 'none' },
      querySelector: () => null,
      querySelectorAll: () => []
    };
  }
  return mockElements[id];
}

const mockPrinterService = {
  settings: {
    cashier: {
      enabled: true,
      interface_type: 'network',
      ip: '192.168.1.100',
      port: 9100
    },
    kitchen: {
      enabled: false,
      interface_type: 'bluetooth',
      device_name: 'Aimo D520BT'
    }
  },
  getSettings() { return this.settings; },
  saveSettings(s) { this.settings = s; return true; }
};

const sandbox = {
  document: {
    getElementById: (id) => getMock(id),
    querySelectorAll: () => [],
    addEventListener: () => {},
    removeEventListener: () => {}
  },
  window: {},
  PrinterService: mockPrinterService,
  console: { log: () => {}, warn: () => {}, error: () => {} },
  setTimeout: (fn) => fn(),
  clearTimeout: () => {}
};
sandbox.window = sandbox;

const context = vm.createContext(sandbox);
vm.runInContext(ordersI18nJs, context);
vm.runInContext(ordersSettingsJs, context);

// Test Initial Status Update (ZH-TW default)
vm.runInContext("updateSettingsPrinterStatusDisplay()", context);

assert(
  getMock("printer-cashier-status-text").innerText.includes("192.168.1.100:9100"),
  `Cashier status displays network IP: "${getMock("printer-cashier-status-text").innerText}"`
);
assert(
  getMock("printer-cashier-status-dot").className.includes("online"),
  'Cashier status dot is online'
);
assert(
  getMock("printer-cashier-status-pill").className.includes("connected"),
  'Cashier status pill has connected class'
);

assert(
  getMock("printer-kitchen-status-text").innerText === "已停用",
  `Disabled Kitchen status displays: "${getMock("printer-kitchen-status-text").innerText}"`
);
assert(
  getMock("printer-kitchen-status-dot").className.includes("offline"),
  'Kitchen status dot is offline'
);
assert(
  getMock("printer-kitchen-status-pill").className.includes("disconnected"),
  'Kitchen status pill has disconnected class'
);

// Switch Kitchen to Enabled via Bluetooth
mockPrinterService.settings.kitchen.enabled = true;
vm.runInContext("updateSettingsPrinterStatusDisplay()", context);

assert(
  getMock("printer-kitchen-status-text").innerText.includes("Aimo D520BT"),
  `Kitchen status displays Bluetooth device: "${getMock("printer-kitchen-status-text").innerText}"`
);
assert(
  getMock("printer-kitchen-status-dot").className.includes("online"),
  'Kitchen status dot is now online'
);

// Test Vietnamese translation
vm.runInContext("setLanguage('vi')", context);
vm.runInContext("updateSettingsPrinterStatusDisplay()", context);

assert(
  getMock("printer-cashier-status-text").innerText.includes("Mạng LAN"),
  `Cashier status in Vietnamese contains 'Mạng LAN': "${getMock("printer-cashier-status-text").innerText}"`
);
assert(
  getMock("printer-kitchen-status-text").innerText.includes("Bluetooth"),
  `Kitchen status in Vietnamese contains 'Bluetooth': "${getMock("printer-kitchen-status-text").innerText}"`
);

// Disable Cashier in Vietnamese
mockPrinterService.settings.cashier.enabled = false;
vm.runInContext("updateSettingsPrinterStatusDisplay()", context);
assert(
  getMock("printer-cashier-status-text").innerText === "Đã tắt",
  `Disabled Cashier in Vietnamese displays 'Đã tắt': "${getMock("printer-cashier-status-text").innerText}"`
);

if (errors > 0) {
  console.error(`\n❌ Completed with ${errors} error(s)`);
  process.exit(1);
} else {
  console.log("\n=================================================");
  console.log("🎉 ALL DUAL PRINTER CARDS STATUS TESTS PASSED!");
  console.log("=================================================");
}
