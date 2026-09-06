/**
 * Verification script for:
 * 1. Removal of close button in order detail
 * 2. Top-right circular notification badge on sidebar live tab button
 */
const fs = require('fs');
const assert = require('assert');

console.log("=================================================");
console.log("🧪 Testing Close Button Removal & Circular Badge");
console.log("=================================================");

const html = fs.readFileSync('orders.html', 'utf8');
const css = fs.readFileSync('css/orders.css', 'utf8');

// 1. Verify close button removal
assert(!html.includes('id="btn-review-close-1"'), "btn-review-close-1 should be removed from orders.html");
assert(!html.includes('id="btn-review-close-2"'), "btn-review-close-2 should be removed from orders.html");
assert(!html.includes('id="btn-review-close-3"'), "btn-review-close-3 should be removed from orders.html");
console.log("✓ Close buttons (btn-review-close-1,2,3) successfully removed from order detail right column");

// 2. Verify 2-button layout in CSS
assert(css.includes('#review-actions-accepted,'), "css missing #review-actions-accepted grid layout");
assert(css.includes('grid-template-columns: 1.6fr 1fr;'), "css missing 1.6fr 1fr 2-button layout");
console.log("✓ CSS updated for 2-button lifecycle actions layout (1.6fr 1fr)");

// 3. Verify circular badge positioned at top-right corner
assert(css.includes('.sidebar-count-badge {'), "css missing .sidebar-count-badge");
assert(css.includes('position: absolute;'), "badge missing position: absolute");
assert(css.includes('top: -3px;') && css.includes('right: -3px;'), "badge missing top-right offset");
assert(css.includes('border-radius: 999px;') || css.includes('border-radius: 50%'), "badge missing circular border-radius");
assert(css.includes('border: 2px solid #ffffff;'), "badge missing crisp white border");
console.log("✓ Sidebar count badge is styled as a circular badge in the top-right corner of live tab button");

console.log("=================================================");
console.log("🎉 ALL TESTS PASSED SUCCESSFULLY!");
console.log("=================================================");
