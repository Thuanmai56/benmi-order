import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { devWorker, tenant } from './runtime.mjs';
const require = createRequire(import.meta.url);
const playwright = require('playwright');

export async function browserSession(app, pages, { language = 'vi', viewport = { width: 1024, height: 768 }, name = 'full-page' } = {}) {
  const browserName = process.env.MENU_QA_BROWSER || 'chromium';
  const browser = await playwright[browserName].launch();
  const context = await browser.newContext({ viewport, hasTouch: true, locale: language, serviceWorkers: 'block' });
  const errors = [], requests = [], faults = [];
  const directory = path.resolve(process.env.MENU_QA_ARTIFACT_DIR || 'artifacts/menu-qa', `${name}-${browserName}-${language}`);
  mkdirSync(directory, { recursive: true });
  await context.tracing.start({ screenshots: true, snapshots: true, sources: true });
  await context.addInitScript(({ language }) => {
    try { localStorage.setItem('benmi_lang', language); } catch {}
    // Only the external LINE SDK is simulated; app state, HTML and API logic are real.
    window.liff = { init: async () => {}, ready: Promise.resolve(), isLoggedIn: () => true,
      isInClient: () => false, getOS: () => 'web', getLanguage: () => language,
      getContext: () => null, getProfile: async () => ({ userId: 'guest_menu_qa', displayName: 'Menu QA' }),
      permission: { query: async () => ({ state: 'unavailable' }) },
      login: () => { throw new Error('Unexpected LINE login'); }, sendMessages: () => { throw new Error('QA must never send LINE messages'); } };
  }, { language });
  context.on('page', page => {
    page.setDefaultTimeout(10000);
    page.on('pageerror', e => errors.push(e.message));
    page.on('dialog', dialog => dialog.accept());
  });
  await context.route('**/*', async route => {
    const request = route.request(), url = new URL(request.url());
    if (url.origin === devWorker) {
      const record = { method: request.method(), path: url.pathname, body: request.postDataJSON() };
      requests.push(record);
      const faultIndex = faults.findIndex(f => f.path === url.pathname && request.method() === 'POST');
      const fault = faultIndex >= 0 ? faults.splice(faultIndex, 1)[0] : null;
      if (fault?.type === 'offline') return route.abort('internetdisconnected');
      if (fault?.status) { record.status = fault.status; return route.fulfill({ status: fault.status, contentType: 'application/json', body: JSON.stringify({ error: fault.status === 400 ? 'INVALID_OPTION_DETAILS' : 'QA_SERVICE_UNAVAILABLE' }) }); }
      const response = app.mf
        ? await app.mf.dispatchFetch(request.url(), { method: request.method(), headers: Object.fromEntries(Object.entries(request.headers()).filter(([key]) => !['if-none-match', 'if-modified-since'].includes(key))), body: request.postDataBuffer() || undefined })
        : await route.fetch({ url: app.url + url.pathname + url.search, maxRetries: 0 });
      record.status = app.mf ? response.status : response.status();
      if (request.method() === 'POST') { try { record.response = await (app.mf ? response.clone() : response).json(); } catch {} }
      if (fault?.type === 'lost-response') return route.abort('failed');
      return app.mf ? route.fulfill({ status: response.status, headers: Object.fromEntries(response.headers), body: Buffer.from(await response.arrayBuffer()) }) : route.fulfill({ response });
    }
    if (url.origin === pages.url) {
      if (!pages.assetUrl) return route.continue();
      const response = await route.fetch({ url: pages.assetUrl + url.pathname + url.search });
      return route.fulfill({ response });
    }
    // No third-party I/O: fonts, telemetry, LIFF and icons do not define menu behavior.
    return route.fulfill({ status: 200, contentType: url.pathname.endsWith('.css') ? 'text/css' : 'text/javascript', body: '' });
  });
  const page = await context.newPage();
  return { browser, context, page, errors, requests, faults, directory,
    async pos(target = page) {
      await target.goto(`${pages.url}/orders?tenant_id=${tenant}&env=dev#menu`);
      await target.waitForFunction(() => window.UnifiedMenu?.enabled && document.querySelector('#menu-categories')?.children.length > 0);
      await target.locator('#i18n-btn-start-shift').click();
    },
    async close() {
      writeFileSync(path.join(directory, 'requests.json'), JSON.stringify(requests, null, 2));
      writeFileSync(path.join(directory, 'errors.json'), JSON.stringify(errors, null, 2));
      await page.screenshot({ path: path.join(directory, 'last-page.png'), fullPage: true }).catch(() => {});
      await context.tracing.stop({ path: path.join(directory, 'trace.zip') });
      await browser.close();
    },
  };
}

export const drawer = page => page.locator('#unified-menu-drawer');
export const field = (page, key) => drawer(page).locator(`[data-field="${key}"]`);
export const action = (page, key) => drawer(page).locator(`[data-action="${key}"]`);
export async function saveDrawer(page) {
  const response = page.waitForResponse(r => r.request().method() === 'POST' && /\/api\/menu\/(product|option-group)\?/.test(r.url()));
  await action(page, 'save').click();
  const result = await response;
  assert.equal(result.status(), 200, await result.text());
  await drawer(page).waitFor({ state: 'hidden' });
  return result.json();
}
export async function newGroup(page, name) {
  await page.locator('#btn-seg-options').click();
  await page.locator('#menu-categories [data-action="new-group"]').click();
  await drawer(page).locator('[data-action="select-new-scope"][data-scope="item"]').click();
  await field(page, 'name').fill(name);
  await action(page, 'add-option').click();
  await action(page, 'custom').click();
  await field(page, 'option.name').fill('QA zero surcharge');
  await field(page, 'option.price').fill('0');
  await action(page, 'apply').click();
  const result = await saveDrawer(page);
  const group = result.catalog.groups.find(g => g.name === name);
  assert.ok(group);
  return group;
}
export async function editGroup(page, id) {
  await page.locator('#btn-seg-options').click();
  await page.locator(`[data-group="${id}"]`).click();
  await page.locator('#btn-option-group-edit').click();
  await field(page, 'name').waitFor();
}

export async function newProduct(page, name, groupId) {
  await page.locator('#btn-seg-products').click();
  await page.locator('#btn-menu-create-unified').click();
  await field(page, 'name').fill(name);
  await field(page, 'price').fill('100');
  await action(page, 'groups').click();
  await drawer(page).locator(`[data-check="group"][value="${groupId}"]`).check();
  await action(page, 'apply').click();
  const result = await saveDrawer(page);
  const product = result.catalog.products.find(p => p.name === name);
  assert.ok(product);
  assert.ok(result.catalog.links.some(l => l.itemId === product.id && l.groupId === groupId));
  return product;
}
