// scripts/test-staging-orders.ts
// Integration test script for verifying multi-tenant sequential order keys & isolation on Staging

const STAGING_URL = process.env.WORKER_URL || "https://platform-worker-staging.thuanmnc.workers.dev";

interface OrderResponse {
  success?: boolean;
  key?: string;
  uuid?: string;
  idempotent?: boolean;
  error?: string;
  code?: string;
}

async function createTestOrder(
  tenantId: string,
  diningOption: "takeaway" | "dine_in",
  customerName: string,
  items: Array<{ id: string; name: string; category: string; price: number; quantity: number }>,
  customUuid?: string
): Promise<OrderResponse> {
  const uuid = customUuid || `test_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const total = items.reduce((sum, it) => sum + it.price * it.quantity, 0);

  const payload = {
    key: "TEMP-KEY",
    uuid: uuid,
    userId: `user_test_${tenantId}`,
    customer: customerName,
    time: "2026-08-31 18:00",
    dining_option: diningOption,
    content: items.map(it => `${it.quantity}份 x ${it.name}`).join("\n"),
    total: total,
    note: "Automated Integration Test",
    tenant_id: tenantId,
    items: items.map(it => ({
      itemId: it.id,
      name: it.name,
      categoryName: it.category,
      unitPrice: it.price,
      quantity: it.quantity,
      selectedOptions: [],
      notes: ""
    })),
    is_desktop: true
  };

  const res = await fetch(`${STAGING_URL}/api/create?tenant_id=${encodeURIComponent(tenantId)}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Tenant-ID": tenantId
    },
    body: JSON.stringify(payload)
  });

  const json = await res.json() as OrderResponse;
  return json;
}

async function fetchTenantOrders(tenantId: string): Promise<any[]> {
  const res = await fetch(`${STAGING_URL}/api/orders?tenant_id=${encodeURIComponent(tenantId)}`, {
    headers: {
      "X-Tenant-ID": tenantId,
      "Accept": "application/json"
    }
  });
  if (!res.ok) throw new Error(`Fetch orders failed with status ${res.status}`);
  return await res.json() as any[];
}

async function runAllTests() {
  console.log(`🚀 Starting Staging Integration Tests against ${STAGING_URL}...\n`);
  let passed = 0;
  let failed = 0;

  // ==========================================
  // Test Case 1: Multi-Tenant Prefix Isolation
  // ==========================================
  try {
    console.log("👉 Test Case 1: Multi-Tenant Prefix Isolation (Benmi vs BSC vs Weiweibao)");
    const [resBenmi, resBsc, resWwb] = await Promise.all([
      createTestOrder("benmi", "takeaway", "Test Benmi Customer", [
        { id: "b1", name: "Bánh Mì Thịt Nướng L", category: "Bánh Mì", price: 115, quantity: 1 }
      ]),
      createTestOrder("bsc", "takeaway", "Test BSC Customer", [
        { id: "k1", name: "鹹水雞 - 雞胸肉", category: "肉類", price: 60, quantity: 1 }
      ]),
      createTestOrder("weiweibao", "takeaway", "Test WWB Customer", [
        { id: "w1", name: "微為飽 炒飯", category: "主食", price: 90, quantity: 1 }
      ])
    ]);

    console.log(`   - Benmi Order Key: ${resBenmi.key} (Expected prefix: B)`);
    console.log(`   - BSC Order Key:   ${resBsc.key} (Expected prefix: K)`);
    console.log(`   - WWB Order Key:   ${resWwb.key} (Expected prefix: W)`);

    if (
      resBenmi.key && resBenmi.key.startsWith("B") &&
      resBsc.key && resBsc.key.startsWith("K") &&
      resWwb.key && resWwb.key.startsWith("W")
    ) {
      console.log("   ✅ PASS: All 3 tenants generated distinct prefixed keys without collision!\n");
      passed++;
    } else {
      console.error("   ❌ FAIL: One or more tenant keys missing correct prefix!\n");
      failed++;
    }
  } catch (err) {
    console.error("   ❌ FAIL: Test Case 1 threw error:", err, "\n");
    failed++;
  }

  // ==========================================
  // Test Case 2: UUID Idempotency Check
  // ==========================================
  try {
    console.log("👉 Test Case 2: UUID Idempotency Check");
    const testUuid = `idempotent_test_${Date.now()}`;
    const firstRes = await createTestOrder("benmi", "takeaway", "Idempotent User", [
      { id: "b1", name: "Bánh Mì Pate", category: "Bánh Mì", price: 90, quantity: 1 }
    ], testUuid);

    const secondRes = await createTestOrder("benmi", "takeaway", "Idempotent User", [
      { id: "b1", name: "Bánh Mì Pate", category: "Bánh Mì", price: 90, quantity: 1 }
    ], testUuid);

    console.log(`   - First Submission Key:  ${firstRes.key}`);
    console.log(`   - Second Submission Key: ${secondRes.key} (idempotent: ${secondRes.idempotent})`);

    if (firstRes.key && secondRes.key === firstRes.key && secondRes.idempotent === true) {
      console.log("   ✅ PASS: Idempotent hit returned identical order key!\n");
      passed++;
    } else {
      console.error("   ❌ FAIL: Idempotent check did not return same key or idempotent:true!\n");
      failed++;
    }
  } catch (err) {
    console.error("   ❌ FAIL: Test Case 2 threw error:", err, "\n");
    failed++;
  }

  // ==========================================
  // Test Case 3: Dine-in vs Takeaway Sequence Separation
  // ==========================================
  try {
    console.log("👉 Test Case 3: Dining Option Sequence Separation (D vs T on Weiweibao)");
    const [takeawayOrder, dineInOrder] = await Promise.all([
      createTestOrder("weiweibao", "takeaway", "Takeaway User", [
        { id: "w1", name: "微為飽 炒飯", category: "主食", price: 90, quantity: 1 }
      ]),
      createTestOrder("weiweibao", "dine_in", "Dine-in User", [
        { id: "w2", name: "微為飽 湯麵", category: "主食", price: 85, quantity: 1 }
      ])
    ]);

    console.log(`   - WWB Takeaway Key: ${takeawayOrder.key} (Expected containing -T)`);
    console.log(`   - WWB Dine-in Key:  ${dineInOrder.key} (Expected containing -D)`);

    if (
      takeawayOrder.key && takeawayOrder.key.includes("-T") &&
      dineInOrder.key && dineInOrder.key.includes("-D")
    ) {
      console.log("   ✅ PASS: Takeaway and Dine-in generated distinct types (-T vs -D)!\n");
      passed++;
    } else {
      console.error("   ❌ FAIL: Dining option keys missing -T or -D!\n");
      failed++;
    }
  } catch (err) {
    console.error("   ❌ FAIL: Test Case 3 threw error:", err, "\n");
    failed++;
  }

  // ==========================================
  // Test Case 4: Data Isolation in Order Query
  // ==========================================
  try {
    console.log("👉 Test Case 4: Data Query Isolation between Benmi and BSC");
    const [benmiOrders, bscOrders] = await Promise.all([
      fetchTenantOrders("benmi"),
      fetchTenantOrders("bsc")
    ]);

    const benmiKeys = benmiOrders.map(o => o.key);
    const bscKeys = bscOrders.map(o => o.key);

    console.log(`   - Benmi Active Orders Count: ${benmiOrders.length}`);
    console.log(`   - BSC Active Orders Count:   ${bscOrders.length}`);

    const hasOverlap = benmiKeys.some(k => bscKeys.includes(k));
    if (!hasOverlap) {
      console.log("   ✅ PASS: Zero key overlap between Benmi and BSC active orders!\n");
      passed++;
    } else {
      console.error("   ❌ FAIL: Detected overlapping keys between Benmi and BSC!\n");
      failed++;
    }
  } catch (err) {
    console.error("   ❌ FAIL: Test Case 4 threw error:", err, "\n");
    failed++;
  }

  // ==========================================
  // Summary
  // ==========================================
  console.log("==========================================");
  console.log(`🎯 Test Summary: ${passed} PASSED, ${failed} FAILED`);
  console.log("==========================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runAllTests().catch(err => {
  console.error("Fatal Test Runner Error:", err);
  process.exit(1);
});
