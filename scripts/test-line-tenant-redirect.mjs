import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const initialScript = html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
assert.ok(initialScript, 'index.html must contain the tenant resolver');

function storage(values = {}) {
  const data = { ...values };
  return {
    getItem: key => data[key] ?? null,
    setItem: (key, value) => { data[key] = String(value); },
    removeItem: key => { delete data[key]; }
  };
}

function resolveTenant(url, pendingTenant) {
  const parsed = new URL(url);
  const classes = new Set();
  const context = {
    URLSearchParams,
    URL,
    decodeURIComponent,
    location: {
      href: parsed.href,
      hostname: parsed.hostname,
      pathname: parsed.pathname,
      search: parsed.search,
      hash: parsed.hash,
      replace: () => {}
    },
    document: {
      title: '',
      documentElement: { classList: { add: value => classes.add(value) } }
    },
    sessionStorage: storage(pendingTenant ? { pending_line_login_tenant_id: pendingTenant } : {}),
    localStorage: storage({ current_tenant_id: 'jiangjiejie', benmi_last_tenant_id: 'jiangjiejie' })
  };
  context.window = context;
  vm.runInNewContext(initialScript, context);
  return { tenant: context.__INITIAL_TENANT_ID, failed: context.__TENANT_RESOLUTION_FAILED === true, classes };
}

test('explicit tenant and LIFF state override a stale tenant from a previous visit', () => {
  assert.equal(resolveTenant('https://benmi-order.pages.dev/?tenant_id=bsc').tenant, 'bsc');
  const state = encodeURIComponent('/?tenant_id=bsc');
  assert.equal(resolveTenant(`https://benmi-order.pages.dev/?liff.state=${state}`).tenant, 'bsc');
  assert.equal(resolveTenant(`https://benmi-order.pages.dev/?tenant_id=jiangjiejie&liff.state=${state}`).tenant, 'bsc');
});

test('malformed LINE callback URL recovers the appended tenant', () => {
  const result = resolveTenant('https://benmi-order.pages.dev/?tenant_id=jiangjiejie?tenant_id=bsc');
  assert.equal(result.tenant, 'bsc');
});

test('LINE callback restores only the tenant saved for the current login', () => {
  const result = resolveTenant('https://benmi-order.pages.dev/?code=abc&state=xyz', 'bsc');
  assert.equal(result.tenant, 'bsc');
  assert.equal(result.failed, false);
});

test('LINE callback can recover tenant from its nested redirect URI across origins', () => {
  const redirectUri = encodeURIComponent('https://benmi-order.pages.dev/?tenant_id=bsc');
  const result = resolveTenant(`https://benmi-order.pages.dev/?code=abc&liffRedirectUri=${redirectUri}`);
  assert.equal(result.tenant, 'bsc');
  assert.equal(result.failed, false);
});

test('LINE callback without tenant context is blocked instead of showing another store', () => {
  const result = resolveTenant('https://benmi-order.pages.dev/?code=abc&state=xyz');
  assert.equal(result.tenant, null);
  assert.equal(result.failed, true);
  assert.equal(result.classes.has('tenant-resolution-failed'), true);
});

test('ordinary root visit ignores another store in local storage', () => {
  assert.equal(resolveTenant('https://benmi-order.pages.dev/').tenant, 'benmi');
});

test('desktop LINE login keeps tenant in redirect URI and does not retry without one', async () => {
  const location = new URL('https://blabfood.app/?tenant_id=bsc');
  const loginCalls = [];
  const initializedIds = [];
  const configRequests = [];
  const context = {
    URL,
    URLSearchParams,
    console: { log() {}, warn() {}, error() {} },
    addEventListener() {},
    location: {
      href: location.href,
      hostname: location.hostname,
      pathname: location.pathname,
      search: location.search,
      hash: location.hash
    },
    document: { title: 'Menu' },
    sessionStorage: storage(),
    localStorage: storage({ tenant_bootstrap_bsc: JSON.stringify({ tenant: { id: 'bsc', liffId: '2011532198-9wCmvSiU' } }) }),
    storeConfig: { liffId: '2011532198-9wCmvSiU' },
    extractTenantId: () => 'bsc',
    fetch: async (url, options) => {
      configRequests.push({ url, options });
      return { ok: true, json: async () => ({ liffId: '2010595300-lmVTCe1A' }) };
    },
    liff: {
      init: async ({ liffId }) => { initializedIds.push(liffId); },
      login: options => {
        loginCalls.push(options);
        throw new Error('invalid redirect URI');
      }
    }
  };
  context.window = context;
  vm.runInNewContext(fs.readFileSync(path.join(root, 'js/client-core.js'), 'utf8'), context);
  let shownError = false;
  context.customAlert = () => { shownError = true; };
  await context.triggerDesktopLineLogin();

  assert.equal(loginCalls.length, 1);
  assert.deepEqual(initializedIds, ['2010595300-lmVTCe1A']);
  assert.equal(configRequests.length, 1);
  assert.equal(new URL(configRequests[0].url).searchParams.get('tenant_id'), 'bsc');
  assert.equal(configRequests[0].options.cache, 'no-store');
  assert.equal(new URL(loginCalls[0].redirectUri).searchParams.get('tenant_id'), 'bsc');
  assert.equal(context.sessionStorage.getItem('pending_line_login_tenant_id'), null);
  assert.equal(shownError, true);

  context.isLiffInitialized = false;
  context.liffInitPromise = null;
  context.fetch = async () => { throw new Error('config unavailable'); };
  await assert.rejects(context.ensureLiffReady(), /config unavailable/);
  assert.equal(initializedIds.length, 1, 'cached LIFF ID must not initialize when fresh config fails');
});
