const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const { schemaTrueFixture } = require("./helpers/option-groups.cjs");
const { Element } = require("./helpers/menu-drawer-dom.cjs");

/**
 * Setup a simulated customer DOM environment running client-option-groups.js
 */
function createCustomerEnvironment(catalog, tenantId, targetProduct) {
  const doc = {
    createElement(tag) {
      const e = new Element(tag, doc);
      e.style = {};
      return e;
    },
  };
  doc.body = doc.createElement("body");
  doc.body.style.overflow = "auto";
  doc.documentElement = { lang: "zh-TW" };
  doc.activeElement = doc.body;
  doc.getElementById = (id) => {
    if (id === "unified-option-modal") return doc.body.querySelector("#unified-option-modal");
    return doc.body.querySelector("#" + id);
  };
  doc.querySelectorAll = (s) => doc.body.querySelectorAll(s);

  const rule = {
    version: 3,
    groups: catalog.groups.filter((g) => {
      const links = catalog.links.filter((l) => l.group_id === g.id);
      return links.some((l) => l.item_id === targetProduct.id || l.category_id === targetProduct.category_id);
    }),
  };

  const key = `${targetProduct.category_id}_${targetProduct.name}`;
  const cart = {};
  const bundleCartData = {};
  const customizeData = {};

  const context = {
    document: doc,
    console,
    setTimeout,
    clearTimeout,
    Image: class {
      naturalWidth = 48;
      set src(v) {
        queueMicrotask(() => this.onload?.());
      }
      decode() {
        return Promise.resolve();
      }
    },
    currentLocale: "zh-TW",
    cart,
    bundleCartData,
    customizeData,
    resolveCatalogItem: (lookupKey) => {
      return {
        catSlug: targetProduct.category_id,
        origName: targetProduct.name,
        displayName: targetProduct.name,
        basePrice: targetProduct.price,
        categoryName: "Category",
        itemId: targetProduct.id,
        targetItem: { price: targetProduct.price, bundleRule: rule },
        bundleRule: rule,
      };
    },
    updateTotal() {},
  };
  context.window = context;
  vm.createContext(context);

  const clientOptionGroupsSrc = fs.readFileSync("js/client-option-groups.js", "utf8");
  vm.runInContext(clientOptionGroupsSrc, context);

  return { doc, context, cart, bundleCartData, rule, key };
}

test("Customer SQLite validation: Jiangjiejie 6-course combo selection, repeat quantities, and server validation", async () => {
  const f = schemaTrueFixture();
  const catalog = await f.api.loadOptionCatalog(f.env, "jiangjiejie");
  const combo = catalog.products.find((p) => p.id === "jj_combo_a1");
  assert.ok(combo, "jj_combo_a1 must exist");

  const effective = f.api.effectiveGroups(catalog, combo.id);
  assert.equal(effective.length, 1);
  const sideGroup = effective[0];
  assert.equal(sideGroup.minSelection, 6);
  assert.equal(sideGroup.maxSelection, 6);
  assert.equal(sideGroup.allowRepeats, true);
  assert.ok(sideGroup.options.length >= 30, "Should have 30+ side dish options");

  // Build customer selections: 2 x Option 0, 2 x Option 1, 2 x Option 2
  const opt0 = sideGroup.options[0];
  const opt1 = sideGroup.options[1];
  const opt2 = sideGroup.options[2];

  const portionGroups = [
    {
      groupId: sideGroup.id,
      groupName: sideGroup.name,
      items: [
        { itemId: opt0.productId || opt0.id, optionId: opt0.id, name: opt0.name, quantity: 2, surcharge: 0 },
        { itemId: opt1.productId || opt1.id, optionId: opt1.id, name: opt1.name, quantity: 2, surcharge: 0 },
        { itemId: opt2.productId || opt2.id, optionId: opt2.id, name: opt2.name, quantity: 2, surcharge: 0 },
      ],
    },
  ];

  const orderItems = [
    {
      itemId: combo.id,
      name: combo.name,
      quantity: 1,
      price: combo.price,
      subtotal: combo.price,
      bundleSelections: {
        bundleRuleId: sideGroup.id,
        portions: [{ portionIndex: 0, groups: portionGroups }],
      },
    },
  ];

  // Validate on Cloudflare Worker backend
  const result = await f.api.validateUnifiedOrderItems(f.env, "jiangjiejie", orderItems);
  assert.equal(result.valid, true, `Validation failed: ${result.error} (${result.code})`);
  assert.equal(orderItems[0].subtotal, 150);

  // Assert canonical snapshots were written with portion counts
  const validatedPortion = orderItems[0].bundleSelections.portions[0];
  assert.equal(validatedPortion.groups[0].items.length, 3);
  assert.equal(validatedPortion.groups[0].items[0].quantity, 2);
  assert.equal(validatedPortion.groups[0].items[1].quantity, 2);
  assert.equal(validatedPortion.groups[0].items[2].quantity, 2);

  f.db.close();
});

test("Customer SQLite validation: Dapinglin 7-side dishes combo order validation", async () => {
  const f = schemaTrueFixture();
  const catalog = await f.api.loadOptionCatalog(f.env, "dapinglin");
  const combo = catalog.products.find((p) => p.name.includes("菜菜餐"));
  assert.ok(combo, "Dapinglin 菜菜餐 must exist");

  const effective = f.api.effectiveGroups(catalog, combo.id);
  assert.equal(effective.length, 1);
  const sideGroup = effective[0];
  assert.equal(sideGroup.minSelection, 7);
  assert.equal(sideGroup.maxSelection, 7);

  // Select 7 single portions of distinct dishes
  const selectedItems = sideGroup.options.slice(0, 7).map((o) => ({
    itemId: o.productId || o.id,
    optionId: o.id,
    name: o.name,
    quantity: 1,
    surcharge: 0,
  }));

  const orderItems = [
    {
      itemId: combo.id,
      name: combo.name,
      quantity: 1,
      price: combo.price,
      subtotal: combo.price,
      bundleSelections: {
        portions: [{ portionIndex: 0, groups: [{ groupId: sideGroup.id, groupName: sideGroup.name, items: selectedItems }] }],
      },
    },
  ];

  const result = await f.api.validateUnifiedOrderItems(f.env, "dapinglin", orderItems);
  assert.equal(result.valid, true, `Dapinglin combo validation failed: ${result.error}`);
  assert.equal(orderItems[0].subtotal, combo.price);

  f.db.close();
});

test("Customer SQLite validation: Haoshiguoshao noodle type single selection with surcharge", async () => {
  const f = schemaTrueFixture();
  const catalog = await f.api.loadOptionCatalog(f.env, "haoshiguoshao");
  const soup = catalog.products.find((p) => p.id === "hs_item_gs_01" || p.name.includes("原味鍋燒"));
  assert.ok(soup, "Haoshiguoshao 原味鍋燒 must exist");

  const effective = f.api.effectiveGroups(catalog, soup.id);
  assert.ok(effective.length >= 1, "Should have noodle type group");
  const noodleGroup = effective[0];
  assert.equal(noodleGroup.minSelection, 1);
  assert.equal(noodleGroup.maxSelection, 1);

  // Choose noodle option with 0 or positive surcharge
  const noodleOpt = noodleGroup.options[0];
  const orderItems = [
    {
      itemId: soup.id,
      name: soup.name,
      quantity: 1,
      price: soup.price,
      subtotal: soup.price + noodleOpt.price,
      bundleSelections: {
        portions: [
          {
            portionIndex: 0,
            groups: [
              {
                groupId: noodleGroup.id,
                items: [{ itemId: noodleOpt.productId || noodleOpt.id, optionId: noodleOpt.id, name: noodleOpt.name, quantity: 1, surcharge: noodleOpt.price }],
              },
            ],
          },
        ],
      },
    },
  ];

  const result = await f.api.validateUnifiedOrderItems(f.env, "haoshiguoshao", orderItems);
  assert.equal(result.valid, true, `Haoshiguoshao order failed: ${result.error}`);

  f.db.close();
});

test("Customer SQLite validation security: Rejects price tampering, invalid quantities, and out-of-stock items", async () => {
  const f = schemaTrueFixture();
  const catalog = await f.api.loadOptionCatalog(f.env, "jiangjiejie");
  const combo = catalog.products.find((p) => p.id === "jj_combo_a1");
  const effective = f.api.effectiveGroups(catalog, combo.id);
  const sideGroup = effective[0];
  const opt0 = sideGroup.options[0];

  // 1. Price tampering ($100 instead of $150)
  const tamperedPriceItems = [
    {
      itemId: combo.id,
      name: combo.name,
      quantity: 1,
      price: combo.price,
      subtotal: 100, // Tampered!
      bundleSelections: {
        portions: [
          {
            portionIndex: 0,
            groups: [{ groupId: sideGroup.id, items: [{ itemId: opt0.productId || opt0.id, optionId: opt0.id, quantity: 6 }] }],
          },
        ],
      },
    },
  ];
  const priceResult = await f.api.validateUnifiedOrderItems(f.env, "jiangjiejie", tamperedPriceItems);
  assert.equal(priceResult.valid, false);
  assert.equal(priceResult.code, "OPTION_PRICE_CHANGED");

  // 2. Quantity bounds (selected 5 portions instead of required 6)
  const insufficientItems = [
    {
      itemId: combo.id,
      name: combo.name,
      quantity: 1,
      price: combo.price,
      subtotal: combo.price,
      bundleSelections: {
        portions: [
          {
            portionIndex: 0,
            groups: [{ groupId: sideGroup.id, items: [{ itemId: opt0.productId || opt0.id, optionId: opt0.id, quantity: 5 }] }],
          },
        ],
      },
    },
  ];
  const qtyResult = await f.api.validateUnifiedOrderItems(f.env, "jiangjiejie", insufficientItems);
  assert.equal(qtyResult.valid, false);
  assert.equal(qtyResult.code, "OPTION_QUANTITY");

  // 3. Out-of-stock item selected
  f.db.prepare("UPDATE menu_items SET out_of_stock_until = datetime('now', '+1 hour') WHERE id = ?").run(opt0.productId || opt0.id);

  const oosItems = [
    {
      itemId: combo.id,
      name: combo.name,
      quantity: 1,
      price: combo.price,
      subtotal: combo.price,
      bundleSelections: {
        portions: [
          {
            portionIndex: 0,
            groups: [{ groupId: sideGroup.id, items: [{ itemId: opt0.productId || opt0.id, optionId: opt0.id, quantity: 6 }] }],
          },
        ],
      },
    },
  ];
  const oosResult = await f.api.validateUnifiedOrderItems(f.env, "jiangjiejie", oosItems);
  assert.equal(oosResult.valid, false);
  assert.equal(oosResult.code, "OPTION_UNAVAILABLE");

  f.db.close();
});
