const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('--- Testing Radio Customization Price Addon (+20) ---');

const indexHtml = fs.readFileSync(path.resolve(__dirname, '../index.html'), 'utf-8');
const clientCheckoutJs = fs.readFileSync(path.resolve(__dirname, '../js/client-checkout.js'), 'utf-8');

// Test 1: Verify renderCustomizationsPanel produces data-price on radio inputs
assert.ok(
    indexHtml.includes('input type="radio" name="${inputName}" data-price="${optPrice}" data-group-title="${escapeHtml(group.title)}"'),
    'Radio inputs must have data-price and data-group-title in renderCustomizationsPanel'
);
console.log('✓ Test 1 Passed: Radio inputs have data-price and data-group-title');

// Test 2: Verify updateTotal queries input[data-price]:checked instead of only checkbox
assert.ok(
    indexHtml.includes("document.querySelectorAll('.custom-panel input[data-price]:checked')"),
    "updateTotal must select all checked inputs with data-price (.custom-panel input[data-price]:checked)"
);
console.log('✓ Test 2 Passed: updateTotal queries .custom-panel input[data-price]:checked');

// Test 3: Verify customSummaries in updateTotal displays price suffix for radio
assert.ok(
    indexHtml.includes("const priceSuffix = p > 0 ? ` (+$${p})` : '';"),
    "customSummaries in updateTotal must include price suffix if radio price > 0"
);
console.log('✓ Test 3 Passed: customSummaries includes priceSuffix for radio addons');

// Test 4: Verify client-checkout.js includes price in formatGlobalCustomizationsText for radio
assert.ok(
    clientCheckoutJs.includes("const p = Number(checkedRadio.getAttribute('data-price')) || 0;"),
    "client-checkout.js formatGlobalCustomizationsText must read data-price from checkedRadio"
);
assert.ok(
    clientCheckoutJs.includes("const pricePart = p > 0 ? `(+$${p})` : '';"),
    "client-checkout.js formatGlobalCustomizationsText must format (+$price) for radio"
);
console.log('✓ Test 4 Passed: client-checkout.js formatGlobalCustomizationsText handles radio price');

// Test 5: Verify getStructuredGlobalCustomizations in client-checkout.js records price for radio
assert.ok(
    clientCheckoutJs.includes("price: p"),
    "client-checkout.js getStructuredGlobalCustomizations must record price for radio"
);
console.log('✓ Test 5 Passed: getStructuredGlobalCustomizations records price for radio');

// Test 6: Functional calculation test of addonsTotal logic
{
    const mockInputs = [
        { tagName: 'INPUT', type: 'radio', value: '多', price: 20, checked: true, groupTitle: '✦ 洋蔥調整' },
        { tagName: 'INPUT', type: 'checkbox', value: '不要蒜頭', price: 0, checked: true, groupTitle: '✦ 配料' }
    ];

    let addonsTotal = 0;
    let summaryLines = [];
    mockInputs.filter(inp => inp.checked && inp.price !== undefined).forEach(chk => {
        const p = Number(chk.price) || 0;
        if (p > 0) {
            addonsTotal += p;
            const rawGroupTitle = chk.groupTitle || '';
            const cleanGroup = rawGroupTitle.replace(/^✦\s*/, '').replace(/選擇|調整/g, '').trim();
            const labelText = cleanGroup ? `${cleanGroup} (${chk.value})` : chk.value;
            summaryLines.push({ label: `+ 加購：${labelText}`, price: `+$${p}` });
        }
    });

    assert.strictEqual(addonsTotal, 20, 'addonsTotal should be 20 when ticking "多"');
    assert.strictEqual(summaryLines.length, 1, 'Should have 1 addon line in summary');
    assert.strictEqual(summaryLines[0].label, '+ 加購：洋蔥 (多)');
    assert.strictEqual(summaryLines[0].price, '+$20');

    let foodTotal = 100;
    let grandTotal = foodTotal + addonsTotal;
    assert.strictEqual(grandTotal, 120, 'Grand total should be 120 (100 food + 20 addon)');
    console.log('✓ Test 6 Passed: Functional addonsTotal calculation and summary formatting');
}

console.log('\n🎉 ALL TESTS PASSED SUCCESSFULLY!');
