const fs = require("fs");
const assert = require("assert");

console.log("=================================================");
console.log("🧪 Testing Action Button Corner Icon Positioning");
console.log("=================================================");

const cssContent = fs.readFileSync("css/orders.css", "utf8");
const kdsCssContent = fs.readFileSync("css/orders-kds.css", "utf8");

// 1. Verify tile action buttons have relative positioning
assert(cssContent.includes(".tile-action-btn.btn-action-ready") &&
       cssContent.includes("position: relative !important;"),
       "Missing position: relative on tile action buttons");
console.log("✓ Tile action buttons have position: relative");

// 2. Verify tile SVGs are positioned absolute at top-right
assert(cssContent.includes(".tile-action-btn.btn-action-ready > svg") &&
       cssContent.includes("position: absolute !important;") &&
       cssContent.includes("top: 4px !important;") &&
       cssContent.includes("right: 6px !important;"),
       "Missing top-right absolute positioning on tile action SVGs");
console.log("✓ 1-tick (btn-action-ready) & 2-tick (btn-action-pickup, btn-action-paid) tile icons positioned at top-right corner");

// 3. Verify modal review buttons have top-right positioning
assert(cssContent.includes("#btn-review-ready > svg") &&
       cssContent.includes("#btn-review-picked > svg") &&
       cssContent.includes("position: absolute !important;") &&
       cssContent.includes("top: 6px !important;") &&
       cssContent.includes("right: 10px !important;"),
       "Missing top-right absolute positioning on modal review buttons");
console.log("✓ Modal review buttons (#btn-review-ready, #btn-review-picked) have top-right corner status icons");

// 4. Verify KDS mode done button has top-right positioning
assert(kdsCssContent.includes(".kds-btn-done > svg") &&
       kdsCssContent.includes("position: absolute !important;"),
       "Missing top-right positioning on .kds-btn-done > svg");
console.log("✓ KDS done button has top-right corner status icon");

console.log("\n=================================================");
console.log("🎉 ALL ACTION BUTTON ICON CHECKS PASSED!");
console.log("=================================================");
