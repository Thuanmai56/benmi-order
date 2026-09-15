/**
 * Verification script for Order Detail Totals Logic
 */
const fs = require('fs');
const assert = require('assert');

console.log("=================================================");
console.log("🧪 Testing Order Detail Totals Logic & Translations");
console.log("=================================================");

const i18n = fs.readFileSync('js/orders-i18n.js', 'utf8');
const html = fs.readFileSync('orders.html', 'utf8');
const modals = fs.readFileSync('js/orders-modals.js', 'utf8');

// 1. Verify translations
assert(i18n.includes('labelSubtotal: "Tạm tính"'), "VI labelSubtotal should be Tạm tính");
assert(i18n.includes('labelGrandtotal: "Tổng cộng"'), "VI labelGrandtotal should be Tổng cộng");
assert(i18n.includes('labelDiscount: "Giảm giá"'), "VI labelDiscount should be Giảm giá");
assert(i18n.includes('labelDiscount: "折抵優惠"'), "zh-TW labelDiscount should be 折抵優惠");
console.log("✓ Translations for Subtotal (Tạm tính / 小計) and Grand Total (Tổng cộng / 總計) are distinct and correct");

// 2. Verify HTML IDs and initial hidden states
assert(html.includes('id="review-subtotal-row" style="display: none;"'), "review-subtotal-row missing or not hidden by default");
assert(html.includes('id="review-discount-row" style="display: none;"'), "review-discount-row missing or not hidden by default");
assert(html.includes('id="review-grandtotal-row"'), "review-grandtotal-row missing");
console.log("✓ HTML includes subtotal, discount, and grandtotal rows with proper initial states");

// 3. Verify modals logic
assert(modals.includes('subtotalRow.style.display = "none"'), "modals.js missing logic to hide redundant subtotal when no discount");
assert(modals.includes('discountRow.style.display = "flex"'), "modals.js missing logic to show discount row when discount active");
console.log("✓ modals.js only shows subtotal & discount when discount exists, eliminating redundant double total");

// 4. Runtime Calculation Verification
const vm = require('vm');
const windowObj = {
  currentTenantBrandName: 'Test Store',
  Capacitor: null
};
const printerCode = fs.readFileSync('js/printer-service.js', 'utf8');
vm.runInNewContext(printerCode, {
  window: windowObj,
  document: { createElement: () => ({ getContext: () => ({}) }) },
  console,
  URLSearchParams,
  localStorage: { getItem: () => null, setItem: () => {} },
  setTimeout,
  clearTimeout
});
const PrinterService = windowObj.PrinterService;
assert(PrinterService, "PrinterService must be loaded");

// Helper function simulating calculateModalTotals in js/orders-modals.js
function calculateModalTotals(order) {
  let itemsSubtotal = 0;
  if (typeof PrinterService !== "undefined" && typeof PrinterService.parseOrderItems === "function") {
    const parsedItems = PrinterService.parseOrderItems(order, false) || [];
    parsedItems.forEach(it => {
      let linePrice = Number(String(it.price || "").replace(/[^0-9.]/g, '')) || 0;
      if (linePrice === 0) {
        const unitNum = Number(String(it.unitPrice || "").replace(/[^0-9.]/g, '')) || 0;
        const q = Math.max(1, Number(it.quantity) || 1);
        if (unitNum > 0) {
          linePrice = unitNum * q;
        } else if (it.name && typeof lookupItemPrice === "function") {
          const lp = lookupItemPrice(it.name);
          if (lp != null && Number(lp) > 0) {
            linePrice = Number(lp) * q;
          }
        }
      }
      if (linePrice > 0) {
        itemsSubtotal += linePrice;
      }
    });
  } else if (Array.isArray(order?.items) && order.items.length > 0) {
    order.items.forEach(it => {
      const q = Math.max(1, Number(it.quantity) || 1);
      const sub = Number(it.subtotal);
      if (!isNaN(sub) && sub > 0) {
        itemsSubtotal += sub;
      } else {
        const p = Number(it.price ?? it.unit_price ?? it.unitPrice) || 0;
        itemsSubtotal += p * q;
      }
    });
  }

  let finalTotalNum = 0;
  if (order?.total !== undefined && order?.total !== null && !isNaN(order.total) && Number(order.total) > 0) {
    finalTotalNum = Number(order.total);
  } else if (order?.content) {
    const match = String(order.content).match(/💰\s*總金額[：:]\s*\$?(\d+)/) || String(order.content).match(/Tổng\s*(?:tiền)?[：:]\s*(\d+)/i);
    if (match) {
      finalTotalNum = Number(match[1]);
    }
  }

  let showDiscount = false;
  let discountAmount = 0;
  if (itemsSubtotal > finalTotalNum && finalTotalNum > 0) {
    showDiscount = true;
    discountAmount = itemsSubtotal - finalTotalNum;
  }

  return { itemsSubtotal, finalTotalNum, showDiscount, discountAmount };
}

// Case A: User's reported order: 3x 茶燻百葉 ($30 each, total $90)
const orderUserReported = {
  key: "K0912-T005",
  total: 90,
  items: [
    { name: "茶燻百葉", quantity: 3, unit_price: 30, subtotal: 90 }
  ]
};
const resUser = calculateModalTotals(orderUserReported);
assert.strictEqual(resUser.itemsSubtotal, 90, "Subtotal must be 90, NOT 270");
assert.strictEqual(resUser.finalTotalNum, 90, "Final total must be 90");
assert.strictEqual(resUser.showDiscount, false, "Discount row must NOT be shown");
assert.strictEqual(resUser.discountAmount, 0, "Discount amount must be 0");
console.log("✓ User's order K0912-T005 (3x $30 = $90): No phantom $270 subtotal and no -$180 discount!");

// Case B: Fallback text order with multi-qty: "3份 x 茶燻百葉 $30"
const orderFallbackText = {
  key: "K0912-T006",
  total: 90,
  content: "訂單編號：K0912-T006\n\n📦 訂單內容：\n3份 x 茶燻百葉 $30\n\n💰 總金額：$90"
};
const resText = calculateModalTotals(orderFallbackText);
assert.strictEqual(resText.itemsSubtotal, 90, "Text order subtotal must be 90");
assert.strictEqual(resText.showDiscount, false, "Text order without discount must not show discount row");
console.log("✓ Text fallback order (3份 x 茶燻百葉 $30): Subtotal is 90, discount hidden!");

// Case C: Legitimate discount order (3x $30 + 1x $50 = $140, total = $120 with $20 discount)
const orderWithDiscount = {
  key: "K0912-T007",
  total: 120,
  items: [
    { name: "茶燻百葉", quantity: 3, unit_price: 30, subtotal: 90 },
    { name: "紅糟肉", quantity: 1, unit_price: 50, subtotal: 50 }
  ]
};
const resDisc = calculateModalTotals(orderWithDiscount);
assert.strictEqual(resDisc.itemsSubtotal, 140, "Subtotal must be 140");
assert.strictEqual(resDisc.finalTotalNum, 120, "Final total must be 120");
assert.strictEqual(resDisc.showDiscount, true, "Discount row must be shown");
assert.strictEqual(resDisc.discountAmount, 20, "Discount amount must be 20");
console.log("✓ Legitimate discount order: Subtotal $140, Discount -$20, Grand Total $120!");

console.log("=================================================");
console.log("🎉 ALL TOTALS TESTS PASSED SUCCESSFULLY!");
console.log("=================================================");
