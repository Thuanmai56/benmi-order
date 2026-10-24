#!/usr/bin/env node
import { parseArgs } from "node:util";

const options = {
  env: { type: "string", default: "dev" },
  tenant: { type: "string", default: "all" },
};

const { values } = parseArgs({ options, allowPositionals: true });

const ENV_URLS = {
  dev: "https://platform-worker-dev.thuanmnc.workers.dev",
  staging: "https://platform-worker-staging.thuanmnc.workers.dev",
  production: "https://benmi-worker-official.thuanmnc.workers.dev",
};

const baseUrl = ENV_URLS[values.env] || values.env;

const SEEDED_TENANTS = [
  "jiangjiejie",
  "dapinglin",
  "haoshiguoshao",
  "bsc",
  "benmi",
  "zhadantongxue",
  "weiweibao",
  "52kaoroufan",
  "xiaolan",
  "thuyngason",
  "quanthuyhang",
  "blab_demo",
];

const targetTenants = values.tenant === "all" ? SEEDED_TENANTS : [values.tenant];

console.log("================================================================");
console.log(`🚀 RUNNING LIVE WORKER SMOKE TESTS ON: ${baseUrl} (${values.env})`);
console.log("================================================================\n");

async function run() {
  const results = [];
  let allPassed = true;

  for (const tenantId of targetTenants) {
    process.stdout.write(`[LiveTest] Testing tenant: ${tenantId.padEnd(15)} ... `);
    const start = Date.now();
    try {
      // 1. Test Unified Option Catalog endpoint
      const optionsRes = await fetch(`${baseUrl}/api/menu/options?tenant_id=${encodeURIComponent(tenantId)}`);
      if (!optionsRes.ok) {
        throw new Error(`HTTP ${optionsRes.status} on /api/menu/options`);
      }
      const catalog = await optionsRes.json();
      if (!catalog.categories || !catalog.products || !catalog.groups) {
        throw new Error("Invalid catalog structure returned");
      }

      // 2. Test Customer Bootstrap Menu endpoint
      const menuRes = await fetch(`${baseUrl}/api/menu?tenant_id=${encodeURIComponent(tenantId)}`);
      if (!menuRes.ok) {
        throw new Error(`HTTP ${menuRes.status} on /api/menu`);
      }
      const menu = await menuRes.json();
      if (!menu || typeof menu !== "object" || (!menu._category_names && !menu.categories && !Array.isArray(menu))) {
        throw new Error("Invalid bootstrap menu structure returned");
      }

      const elapsed = Date.now() - start;
      console.log(`✓ PASS (${elapsed}ms) [cats: ${catalog.categories.length}, prods: ${catalog.products.length}, groups: ${catalog.groups.length}]`);
      results.push({
        tenant: tenantId,
        categories: catalog.categories.length,
        products: catalog.products.length,
        groups: catalog.groups.length,
        duration: `${elapsed}ms`,
        status: "PASS",
      });
    } catch (err) {
      allPassed = false;
      console.log(`✗ FAIL (${err.message})`);
      results.push({
        tenant: tenantId,
        categories: 0,
        products: 0,
        groups: 0,
        duration: `${Date.now() - start}ms`,
        status: `FAIL: ${err.message}`,
      });
    }
  }

  // Live Mutation Smoke Test (Dev / Staging only, never production)
  if (values.env !== "production" && values.env !== "main") {
    console.log("\n[LiveTest] Running safe transactional mutation test on dev/staging for jiangjiejie...");
    try {
      const getRes = await fetch(`${baseUrl}/api/menu/options?tenant_id=jiangjiejie`);
      const data = await getRes.json();
      const testGroup = data.groups.find((g) => g.id === "ug_rule_jj_combo_a1_0");

      if (testGroup) {
        const testOptId = `live_smoke_${Date.now()}`;
        const testOption = {
          id: testOptId,
          name: "Smoke Test Option",
          price: 99,
          productId: null,
          quantity: 1,
          isDefault: false,
          subOptions: [],
          eligibilityRules: [],
          fromSource: false,
        };

        const postRes = await fetch(`${baseUrl}/api/menu/option-group?tenant_id=jiangjiejie`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...testGroup,
            options: [...testGroup.options, testOption],
            itemIds: ["jj_combo_a1"],
            categoryIds: [],
            delete: false,
          }),
        });

        if (!postRes.ok) {
          const errBody = await postRes.text();
          throw new Error(`POST save option failed HTTP ${postRes.status}: ${errBody}`);
        }

        const saveResult = await postRes.json();
        const savedGroup = saveResult.catalog.groups.find((g) => g.id === "ug_rule_jj_combo_a1_0");
        const found = savedGroup?.options?.some((o) => o.id === testOptId);
        if (!found) throw new Error("Saved smoke test option was not found in returned catalog!");

        // Immediate cleanup
        const cleanupRes = await fetch(`${baseUrl}/api/menu/option-group?tenant_id=jiangjiejie`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...savedGroup,
            options: savedGroup.options.filter((o) => o.id !== testOptId),
            itemIds: ["jj_combo_a1"],
            categoryIds: [],
            delete: false,
          }),
        });

        if (!cleanupRes.ok) throw new Error("Cleanup failed!");
        console.log("  ✓ Live mutation smoke test (Create -> Verify -> Delete) PASSED!");
      }
    } catch (err) {
      allPassed = false;
      console.error("  ✗ Live mutation smoke test FAILED:", err.message);
    }
  }

  console.log("\n================================================================");
  console.log("📊 SMOKE TEST SUMMARY");
  console.log("================================================================");
  console.table(results);

  if (!allPassed) {
    console.error("🚨 SOME LIVE SMOKE TESTS FAILED!");
    process.exit(1);
  } else {
    console.log("🎉 ALL LIVE SMOKE TESTS PASSED!");
  }
}

run();
