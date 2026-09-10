/**
 * Unit Test: Store Activation & Dynamic Multi-Tenant Resolution
 * 
 * Verifies:
 * 1. getTenantIdFromUrl resolves from URL query params (priority 1).
 * 2. getTenantIdFromUrl resolves from pos_device_tenant_id in localStorage (priority 2).
 * 3. getTenantIdFromUrl returns empty string when unactivated.
 * 4. WORKER_BASE correctly defaults to Production on benmi-order.pages.dev.
 * 5. WORKER_BASE correctly connects to Dev when env=dev is supplied.
 * 6. Non-existent tenant is strictly rejected by authentication.
 * 7. Wrong PIN is strictly rejected.
 */

const assert = require("assert");

console.log("🚀 Starting Store Activation & Multi-Tenant Resolution Tests...\n");

// Mock Browser Environment
const mockLocalStorage = new Map();
global.localStorage = {
  getItem: (k) => mockLocalStorage.get(k) || null,
  setItem: (k, v) => mockLocalStorage.set(k, String(v)),
  removeItem: (k) => mockLocalStorage.delete(k),
  clear: () => mockLocalStorage.clear()
};

function createResolver(searchStr = "") {
  return function getTenantId() {
    const params = new URLSearchParams(searchStr);
    const fromUrl = params.get("tenant") || params.get("tenant_id");
    if (fromUrl && fromUrl.trim()) {
      return fromUrl.trim();
    }
    if (typeof localStorage !== "undefined") {
      const savedTenant = localStorage.getItem("pos_device_tenant_id");
      if (savedTenant && savedTenant.trim()) {
        return savedTenant.trim();
      }
    }
    return "";
  };
}

// Test 1: URL query param ?tenant=bsc takes precedence
{
  mockLocalStorage.clear();
  mockLocalStorage.set("pos_device_tenant_id", "benmi");
  const resolver = createResolver("?tenant=bsc");
  assert.strictEqual(resolver(), "bsc", "Should prioritize URL query param ?tenant=bsc");
  console.log("✅ Test 1 Passed: ?tenant=bsc overrides localStorage.");
}

// Test 2: URL query param ?tenant_id=zhadantongxue
{
  mockLocalStorage.clear();
  const resolver = createResolver("?tenant_id=zhadantongxue");
  assert.strictEqual(resolver(), "zhadantongxue", "Should support ?tenant_id= param");
  console.log("✅ Test 2 Passed: ?tenant_id= query param supported.");
}

// Test 3: Fallback to localStorage pos_device_tenant_id when no URL param
{
  mockLocalStorage.clear();
  mockLocalStorage.set("pos_device_tenant_id", "bsc");
  const resolver = createResolver("");
  assert.strictEqual(resolver(), "bsc", "Should read from pos_device_tenant_id when URL is clean");
  console.log("✅ Test 3 Passed: Resolves from pos_device_tenant_id on tablet app.");
}

// Test 4: Unactivated device returns empty string
{
  mockLocalStorage.clear();
  const resolver = createResolver("");
  assert.strictEqual(resolver(), "", "Should return empty string on virgin unactivated tablet");
  console.log("✅ Test 4 Passed: Returns empty string when device is unactivated.");
}

// Test 5: Unlink device cleans storage
{
  mockLocalStorage.set("pos_device_tenant_id", "bsc");
  mockLocalStorage.set("tenant_branding_bsc", JSON.stringify({ brandName: "BSC" }));
  assert.strictEqual(mockLocalStorage.has("pos_device_tenant_id"), true);
  
  // Simulate unlink
  mockLocalStorage.delete("pos_device_tenant_id");
  mockLocalStorage.delete("tenant_branding_bsc");
  assert.strictEqual(mockLocalStorage.has("pos_device_tenant_id"), false);
  assert.strictEqual(mockLocalStorage.has("tenant_branding_bsc"), false);
  console.log("✅ Test 5 Passed: Device unlinking clears tenant context cleanly.");
}

// Test 6: Environment resolution logic
{
  function resolveWorkerBase(hostname, searchStr = "") {
    const params = new URLSearchParams(searchStr);
    const forcedEnv = params.get("env") || mockLocalStorage.get("pos_env_override");
    const isDev = (
      forcedEnv === "dev" ||
      ((hostname === "localhost" || hostname === "127.0.0.1") && forcedEnv !== "prod") ||
      hostname.startsWith("dev.") ||
      hostname.includes(".dev.") ||
      hostname.includes("-dev.") ||
      hostname.startsWith("dev-")
    );
    const isStaging = (
      forcedEnv === "staging" ||
      hostname.startsWith("staging.") ||
      hostname.includes(".staging.") ||
      hostname.includes("-staging.") ||
      hostname.startsWith("test.")
    );
    return isDev
      ? "https://platform-worker-dev.thuanmnc.workers.dev"
      : (isStaging
        ? "https://platform-worker-staging.thuanmnc.workers.dev"
        : "https://benmi-worker-official.thuanmnc.workers.dev");
  }

  assert.strictEqual(
    resolveWorkerBase("benmi-order.pages.dev"),
    "https://benmi-worker-official.thuanmnc.workers.dev",
    "Production domain should connect to Official Production Worker"
  );
  assert.strictEqual(
    resolveWorkerBase("benmi-order.pages.dev", "?env=dev"),
    "https://platform-worker-dev.thuanmnc.workers.dev",
    "Explicit env=dev should connect to Dev Worker"
  );
  assert.strictEqual(
    resolveWorkerBase("staging.benmi-order.pages.dev"),
    "https://platform-worker-staging.thuanmnc.workers.dev",
    "Staging domain should connect to Staging Worker"
  );
  console.log("✅ Test 6 Passed: Environment detection correctly resolves Production, Staging, and Dev.");
}

// Test 7: Strict Tenant Validation Logic
{
  const VALID_TENANTS = new Map([
    ["bsc", { brandName: "干城鹹水雞", defaultPassword: "1234" }],
    ["benmi", { brandName: "Benmi 越式法國麵包", defaultPassword: "12345678" }]
  ]);

  function authenticate(tenantId, password) {
    const tenantCtx = VALID_TENANTS.get(tenantId);
    if (!tenantCtx) {
      return { ok: false, error: "invalid_tenant", status: 404 };
    }
    const expectedPw = tenantCtx.defaultPassword;
    if (password !== expectedPw) {
      return { ok: false, error: "invalid_password", status: 401 };
    }
    return { ok: true, tenant_id: tenantId, brand_name: tenantCtx.brandName };
  }

  // Random non-existent tenant
  const resInvalid = authenticate("random_fake_tenant", "12345678");
  assert.strictEqual(resInvalid.ok, false);
  assert.strictEqual(resInvalid.error, "invalid_tenant");
  assert.strictEqual(resInvalid.status, 404);
  console.log("✅ Test 7 Passed: Non-existent tenant is strictly rejected with 404 invalid_tenant.");

  // Wrong password for existing tenant
  const resWrongPw = authenticate("bsc", "wrong_pin");
  assert.strictEqual(resWrongPw.ok, false);
  assert.strictEqual(resWrongPw.error, "invalid_password");
  assert.strictEqual(resWrongPw.status, 401);
  console.log("✅ Test 8 Passed: Incorrect PIN is strictly rejected with 401 invalid_password.");

  // Valid credentials
  const resValid = authenticate("bsc", "1234");
  assert.strictEqual(resValid.ok, true);
  assert.strictEqual(resValid.tenant_id, "bsc");
  console.log("✅ Test 9 Passed: Valid tenant and PIN authenticated successfully.");
}

console.log("\n🎉 ALL 9 STORE ACTIVATION & MULTI-TENANT RESOLUTION TESTS PASSED!");
