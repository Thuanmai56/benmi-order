/**
 * Unit Test: Exact Flavor & Modifier Label Resolution
 * 
 * Verifies that:
 * 1. extractFlavorSettings preserves exact category labels (辣度, 口味, 鹹度, 配料, 甜度, 冰塊)
 * 2. It never collapses or defaults to "熱門加料與選項"
 * 3. Fallback when label is truly absent defaults to "配料" (or "Topping"), never "熱門加料與選項"
 */

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

console.log("🚀 Running Flavor & Customization Label Resolution Tests...\n");

// 1. Setup Sandbox VM
const sandbox = {
  window: {},
  document: {
    getElementById: () => null,
    querySelectorAll: () => [],
    addEventListener: () => {}
  },
  navigator: { userAgent: "NodeTest" },
  localStorage: { getItem: () => null, setItem: () => {} },
  console
};
sandbox.window = sandbox;

const i18nCode = fs.readFileSync(path.join(__dirname, "../js/orders-i18n.js"), "utf8");
const liveCode = fs.readFileSync(path.join(__dirname, "../js/orders-live.js"), "utf8");

vm.createContext(sandbox);
vm.runInContext(i18nCode, sandbox);
vm.runInContext(liveCode, sandbox);

const extractFlavorSettings = sandbox.window.extractFlavorSettings;
assert(typeof extractFlavorSettings === "function", "extractFlavorSettings must be a function");

// Test Case 1: Multiple customization groups (e.g. from checkout)
const sampleContent1 = `【新訂單】#B0916-T001
外帶自取
取餐時間: 12:30
🧂 客製化設定：
  • 辣度：小辣
  • 口味：特調胡椒
  • 甜度：半糖
  • 冰塊：少冰
  • 配料：加蛋、加起司
1份 x 招牌麵包 $85
總金額: $85`;

const res1 = extractFlavorSettings(sampleContent1);
assert(res1 !== null, "res1 should not be null");

// Verify extraIngredients has exact labels
const expected = [
  { label: "辣度", value: "小辣" },
  { label: "口味", value: "特調胡椒" },
  { label: "甜度", value: "半糖" },
  { label: "冰塊", value: "少冰" },
  { label: "配料", value: "加蛋、加起司" }
];

assert.strictEqual(res1.extraIngredients.length, 5, "Should extract all 5 options");
expected.forEach((exp, idx) => {
  const actual = res1.extraIngredients[idx];
  assert.strictEqual(actual.label, exp.label, `Item ${idx} label should be "${exp.label}", got: "${actual.label}"`);
  assert.strictEqual(actual.value, exp.value, `Item ${idx} value should be "${exp.value}", got: "${actual.value}"`);
  assert.notStrictEqual(actual.label, "熱門加料與選項", "Label must NOT be '熱門加料與選項'");
});
console.log("✅ Test 1 Passed: Exact flavor types (辣度, 口味, 甜度, 冰塊, 配料) correctly extracted with precise labels.");

// Test Case 2: Traditional inline flavor settings
const sampleContent2 = `【新訂單】#B0916-T002
外帶自取
🧪 口味設定：【口味選擇：原味 | 辣度選擇 (朝天椒)：大辣】
• 配料：加酸菜
1份 x 越式米線 $120`;

const res2 = extractFlavorSettings(sampleContent2);
assert(res2 !== null, "res2 should not be null");
assert.strictEqual(res2.flavors.length, 2, "Should extract 2 inline flavors");
assert.strictEqual(res2.flavors[0].label, "口味", "First flavor should be 口味");
assert.strictEqual(res2.flavors[0].value, "原味", "First flavor val should be 原味");
assert.strictEqual(res2.flavors[1].label, "辣度", "Second flavor should be 辣度");
assert.strictEqual(res2.flavors[1].value, "大辣", "Second flavor val should be 大辣");

assert.strictEqual(res2.extraIngredients.length, 1, "Should extract 1 extra ingredient");
assert.strictEqual(res2.extraIngredients[0].label, "配料", "Extra ingredient label should be 配料");
assert.strictEqual(res2.extraIngredients[0].value, "加酸菜", "Extra ingredient value should be 加酸菜");
console.log("✅ Test 2 Passed: Inline flavor settings and separate bullets properly distinguished.");

// Test Case 3: I18N Fallback does not use colOptions
const t = sandbox.window.t;
const extraIngredientLabel = t("extraIngredientLabel");
assert.strictEqual(extraIngredientLabel, "配料", "extraIngredientLabel in zh-TW must be '配料'");

// Test Case 4: Multi-round flavor extraction and header filtering
const sampleMultiRound = `
[第 1 輪 / Đợt 1]
2 x 筍片 $60
2 x 蘋果 $60
🧂 客製化設定 / Chọn vị:
• 口味: 原味客製
• 鹹度: 正常
• 辣度: 不辣

[第 2 輪 加點 / Đợt 2 - 19:30]
1 x 日本山藥 $50
1 x 木耳 $30
1 x 竹輪 $25
🧂 客製化設定 / Chọn vị:
• 口味: 特調胡椒
• 鹹度: 正常
• 辣度: 不辣

[第 3 輪 加點 / Đợt 3 - 19:35]
1 x 花椰菜 $35
1 x 腐竹豆皮 $35
1 x 豬耳朵 $35
🧂 客製化設定 / Chọn vị:
• 口味: 特調胡椒
• 鹹度: 正常
• 辣度: 不辣
`;

const extractRoundFlavorMap = sandbox.window.extractRoundFlavorMap;
assert(typeof extractRoundFlavorMap === "function", "extractRoundFlavorMap must be a function");
const roundMap = extractRoundFlavorMap(sampleMultiRound);
assert.strictEqual(roundMap.size, 3, "Must extract 3 rounds of flavors");

const r1 = roundMap.get(1);
assert(r1 && r1.extraIngredients.some(e => e.label === "口味" && e.value === "原味客製"), "Round 1 must have 原味客製");
assert(!r1.extraIngredients.some(e => e.label.includes("客製化")), "Round 1 must not contain bogus 客製化 chips");

const r2 = roundMap.get(2);
assert(r2 && r2.extraIngredients.some(e => e.label === "口味" && e.value === "特調胡椒"), "Round 2 must have 特調胡椒");

const r3 = roundMap.get(3);
assert(r3 && r3.extraIngredients.some(e => e.label === "口味" && e.value === "特調胡椒"), "Round 3 must have 特調胡椒");
console.log("✅ Test 4 Passed: Multi-round flavors separated per round and header titles filtered.");

console.log("\n🎉 ALL FLAVOR & MODIFIER LABEL RESOLUTION TESTS PASSED!");

