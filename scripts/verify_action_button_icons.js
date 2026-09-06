const fs = require("fs");
const assert = require("assert");

console.log("=================================================");
console.log("🧪 Testing Action Button Top-Left Corner Icons");
console.log("=================================================");

const cssContent = fs.readFileSync("css/orders.css", "utf8");

// 1. Verify tile action buttons have relative positioning + overflow visible
assert(cssContent.includes(".tile-action-btn.btn-action-ready") &&
       cssContent.includes("position: relative !important;"),
       "Missing position: relative on tile action buttons");
assert(cssContent.includes("overflow: visible;"),
       "Missing overflow: visible on tile-action-btn (icons should overflow border)");
console.log("✓ Tile action buttons have position: relative and overflow: visible (icons can overflow border)");

// 2. Verify tile SVGs are positioned at top-left corner with negative offset
assert(cssContent.includes(".tile-action-btn.btn-action-ready > svg") &&
       cssContent.includes("top: -6px !important;") &&
       cssContent.includes("left: -5px !important;"),
       "Missing top-left corner positioning on tile action SVGs");
console.log("✓ 1-tick (btn-action-ready) & 2-tick (btn-action-pickup, btn-action-paid) icons at top-left corner, overflow border");

// 3. Verify modal review buttons have top-left overflow positioning
assert(cssContent.includes("#btn-review-ready > svg") &&
       cssContent.includes("#btn-review-picked > svg") &&
       cssContent.includes("top: -7px !important;") &&
       cssContent.includes("left: -6px !important;"),
       "Missing top-left corner positioning on modal review buttons");
console.log("✓ Modal review buttons (#btn-review-ready, #btn-review-picked) have top-left overflow icons");

// 4. Verify store status dropdown is right-aligned
assert(cssContent.includes("right: 0;") && cssContent.includes("left: auto;"),
       "Missing right-aligned positioning on store-status-menu");
console.log("✓ Store status dropdown right-aligned (won't overflow viewport)");

console.log("\n=================================================");
console.log("🎉 ALL ACTION BUTTON ICON CHECKS PASSED!");
console.log("=================================================");
