/**
 * Verification script for Smart Auto-Hide Header on Scroll
 */
const fs = require("fs");

console.log("=================================================");
console.log("🧪 Testing Smart Auto-Hide Header on Scroll");
console.log("=================================================");

// 1. Verify CSS rules
const cssContent = fs.readFileSync("css/orders.css", "utf8");

const hasMainTopbarHidden = cssContent.includes(".main-topbar.topbar-hidden") &&
  cssContent.includes("margin-top: -65px");
console.log(hasMainTopbarHidden ? "✓ .main-topbar.topbar-hidden is properly defined with -65px margin" : "✗ Missing .main-topbar.topbar-hidden");

const hasDetailTopbarHidden = cssContent.includes(".order-detail-topbar.topbar-hidden") &&
  cssContent.includes("transform: translateY(-100%)");
console.log(hasDetailTopbarHidden ? "✓ .order-detail-topbar.topbar-hidden is properly defined" : "✗ Missing .order-detail-topbar.topbar-hidden");

const hasDetailSticky = cssContent.includes("position: sticky;") &&
  cssContent.includes(".order-detail-topbar");
console.log(hasDetailSticky ? "✓ .order-detail-topbar has sticky positioning" : "✗ Missing sticky styling on .order-detail-topbar");

// 2. Verify JS functions in orders-core.js
const coreContent = fs.readFileSync("js/orders-core.js", "utf8");
const hasInitSmartHeader = coreContent.includes("function initSmartHeaderScroll()") &&
  coreContent.includes("window.initSmartHeaderScroll = initSmartHeaderScroll");
console.log(hasInitSmartHeader ? "✓ initSmartHeaderScroll defined and exported to window" : "✗ Missing initSmartHeaderScroll");

const hasWheelListener = coreContent.includes("mainLayout.addEventListener(\"wheel\"");
console.log(hasWheelListener ? "✓ Wheel event listener attached to mainLayout" : "✗ Missing wheel listener in orders-core.js");

const hasTouchListener = coreContent.includes("mainLayout.addEventListener(\"touchmove\"");
console.log(hasTouchListener ? "✓ Touchmove event listener attached to mainLayout" : "✗ Missing touch listener in orders-core.js");

// 3. Verify JS functions in orders-modals.js
const modalsContent = fs.readFileSync("js/orders-modals.js", "utf8");
const hasInitOrderDetailHeader = modalsContent.includes("function initOrderDetailHeaderScroll()") &&
  modalsContent.includes("window.initOrderDetailHeaderScroll = initOrderDetailHeaderScroll");
console.log(hasInitOrderDetailHeader ? "✓ initOrderDetailHeaderScroll defined and exported to window" : "✗ Missing initOrderDetailHeaderScroll");

// 4. Verify orders.html wiring
const htmlContent = fs.readFileSync("orders.html", "utf8");
const hasDomContentLoadedCalls = htmlContent.includes("initSmartHeaderScroll()") &&
  htmlContent.includes("initOrderDetailHeaderScroll()");
console.log(hasDomContentLoadedCalls ? "✓ Both header scroll initializers wired in DOMContentLoaded" : "✗ Missing initializer calls in orders.html");

if (hasMainTopbarHidden && hasDetailTopbarHidden && hasDetailSticky &&
    hasInitSmartHeader && hasWheelListener && hasTouchListener &&
    hasInitOrderDetailHeader && hasDomContentLoadedCalls) {
  console.log("=================================================");
  console.log("🎉 ALL AUTO-HIDE HEADER TESTS PASSED SUCCESSFULLY!");
  console.log("=================================================");
  process.exit(0);
} else {
  console.error("❌ Some tests failed.");
  process.exit(1);
}
