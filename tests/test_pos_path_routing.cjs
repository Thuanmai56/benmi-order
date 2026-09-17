const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const coreJsSource = fs.readFileSync(path.join(__dirname, '../js/orders-core.js'), 'utf8');

function evaluateTenantId(urlStr, localStorageTenant = null) {
  const url = new URL(urlStr);
  const mockLocalStorage = {
    getItem: (key) => (key === 'pos_device_tenant_id' ? localStorageTenant : null),
    setItem: () => {},
    removeItem: () => {},
  };

  const sandbox = {
    window: {
      location: {
        href: url.href,
        hostname: url.hostname,
        pathname: url.pathname,
        search: url.search,
      },
    },
    location: {
      href: url.href,
      hostname: url.hostname,
      pathname: url.pathname,
      search: url.search,
    },
    URLSearchParams,
    localStorage: mockLocalStorage,
    document: {
      addEventListener: () => {},
      documentElement: { classList: { add: () => {} } },
      querySelectorAll: () => [],
    },
    isNativeAppPlatform: () => false,
    setInterval: () => {},
    clearInterval: () => {},
    setTimeout: () => {},
    clearTimeout: () => {},
    console,
  };

  vm.createContext(sandbox);
  vm.runInContext(coreJsSource, sandbox);
  return sandbox.getTenantIdFromUrl();
}

console.log('Testing getTenantIdFromUrl() with various path and query combinations...');

// 1. RESTful path /:tenant/orders
assert.equal(evaluateTenantId('https://pos.blabfood.app/bsc/orders'), 'bsc');
assert.equal(evaluateTenantId('https://pos.blabfood.app/zhadantongxue/orders/'), 'zhadantongxue');

// 2. Short path /:tenant
assert.equal(evaluateTenantId('https://pos.blabfood.app/bsc'), 'bsc');
assert.equal(evaluateTenantId('https://pos.blabfood.app/store-123/'), 'store-123');

// 3. Query param overrides path
assert.equal(evaluateTenantId('https://pos.blabfood.app/bsc/orders?tenant_id=override_tenant'), 'override_tenant');
assert.equal(evaluateTenantId('https://pos.blabfood.app/bsc?tenant=override_tenant'), 'override_tenant');

// 4. Root & Reserved paths fall back to default or localStorage
assert.equal(evaluateTenantId('https://pos.blabfood.app/'), 'benmi');
assert.equal(evaluateTenantId('https://pos.blabfood.app/orders'), 'benmi');
assert.equal(evaluateTenantId('https://pos.blabfood.app/orders.html'), 'benmi');
assert.equal(evaluateTenantId('https://pos.blabfood.app/index.html'), 'benmi');

// 5. LocalStorage fallback when no path/query tenant
assert.equal(evaluateTenantId('https://pos.blabfood.app/orders', 'saved_store'), 'saved_store');

// 6. Legacy host with query
assert.equal(evaluateTenantId('https://benmi-order.pages.dev/orders.html?tenant_id=bsc'), 'bsc');
assert.equal(evaluateTenantId('https://benmi-order.pages.dev/orders.html'), 'benmi');

console.log('✓ All getTenantIdFromUrl() test cases passed successfully!');
