const fs = require('fs');
const path = require('path');

console.log('=================================================');
console.log('🔍 Testing Settings Tab Switching & Menu View Hierarchy...');
console.log('=================================================');

const ordersHtml = fs.readFileSync(path.join(__dirname, '../orders.html'), 'utf-8');
const ordersSettingsJs = fs.readFileSync(path.join(__dirname, '../js/orders-settings.js'), 'utf-8');
const ordersMenuJs = fs.readFileSync(path.join(__dirname, '../js/orders-menu.js'), 'utf-8');
const ordersCoreJs = fs.readFileSync(path.join(__dirname, '../js/orders-core.js'), 'utf-8');

let errors = 0;
function assert(condition, msg) {
  if (!condition) {
    console.error(`❌ FAILED: ${msg}`);
    errors++;
  } else {
    console.log(`✓ ${msg}`);
  }
}

// 1. Check DOM Tree Balance for #view-menu inside .main-layout
const viewMenuIdx = ordersHtml.indexOf('id="view-menu"');
const viewSettingsIdx = ordersHtml.indexOf('id="view-settings"');
const mainLayoutIdx = ordersHtml.indexOf('class="main-layout"');
const mainCloseIdx = ordersHtml.indexOf('</main>');

assert(mainLayoutIdx > 0 && viewSettingsIdx > mainLayoutIdx, '#view-settings is inside .main-layout');
assert(viewMenuIdx > viewSettingsIdx, '#view-menu follows #view-settings');
assert(viewMenuIdx < mainCloseIdx, '#view-menu is INSIDE </main> and .main-layout (NOT pushed outside)');

// 2. Count <div> tags between id="view-settings" and id="view-menu"
const settingsSnippet = ordersHtml.substring(viewSettingsIdx, viewMenuIdx);
let openDivs = (settingsSnippet.match(/<div(\s|>)/g) || []).length;
let closeDivs = (settingsSnippet.match(/<\/div>/g) || []).length;
assert(openDivs === closeDivs, `Settings container div tags are balanced: open=${openDivs}, close=${closeDivs}`);

// 3. Verify switchSettingTab platform-hidden logic does NOT block inactive tabs
assert(
  ordersSettingsJs.includes('const targetToc = matchedSec ? document.getElementById(matchedSec.tocId) : null;') &&
  ordersSettingsJs.includes('const isPlatformHidden = targetToc && window.getComputedStyle(targetToc).display === "none";'),
  'switchSettingTab checks TOC item visibility instead of card display to allow clicking inactive tabs'
);

// 4. Verify sidebar nav buttons call switchTab
assert(
  ordersHtml.includes('id="tab-menu" data-tab="menu" onclick="switchTab(\'menu\')"'),
  'Sidebar tab-menu uses onclick="switchTab(\'menu\')"'
);
assert(
  ordersHtml.includes('id="tab-settings" data-tab="settings" onclick="switchTab(\'settings\')"'),
  'Sidebar tab-settings uses onclick="switchTab(\'settings\')"'
);

// 5. Verify openMenuSettings re-renders menu categories if data already exists
assert(
  ordersMenuJs.includes('if (viewMenu) viewMenu.style.display = "block";') &&
  ordersMenuJs.includes('renderMenuCategories();'),
  'openMenuSettings sets view-menu display: block and re-renders categories'
);

if (errors > 0) {
  console.error(`\n❌ Total errors: ${errors}`);
  process.exit(1);
} else {
  console.log('\n=================================================');
  console.log('🎉 ALL TAB SWITCHING & MENU HIERARCHY CHECKS PASSED!');
  console.log('=================================================');
}
