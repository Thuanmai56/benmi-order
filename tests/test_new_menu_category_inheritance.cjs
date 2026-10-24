const { test } = require("node:test");
const assert = require("node:assert/strict");
const { schemaTrueFixture } = require("./helpers/option-groups.cjs");

test("Category Inheritance: All products in category inherit group; other categories do not", async () => {
  const f = schemaTrueFixture();
  const catalog = await f.api.loadOptionCatalog(f.env, "haoshiguoshao");
  const targetCategory = catalog.categories.find((c) => c.id === "cat_hs_guoshao");
  assert.ok(targetCategory, "cat_hs_guoshao must exist");

  const itemsInCategory = catalog.products.filter((p) => p.category_id === targetCategory.id);
  assert.ok(itemsInCategory.length >= 2, "Should have at least 2 items in cat_hs_guoshao");
  const itemInOtherCat = catalog.products.find((p) => p.category_id !== targetCategory.id);
  assert.ok(itemInOtherCat, "Should have items in other categories");

  // Create an option group linked to cat_hs_guoshao
  const newGroup = {
    id: "g_hs_spicy_level",
    name: "辣度選擇",
    revision: 0,
    scope: "item",
    minSelection: 1,
    maxSelection: 1,
    allowRepeats: false,
    categoryIds: [targetCategory.id],
    itemIds: [],
    sources: [],
    options: [
      { id: "opt_hs_no_spicy", name: "不辣", price: 0, quantity: 1 },
      { id: "opt_hs_mild_spicy", name: "微辣", price: 0, quantity: 1 },
      { id: "opt_hs_hot_spicy", name: "大辣", price: 5, quantity: 1 },
    ],
  };

  const saveRes = await f.save("group", newGroup, "haoshiguoshao");
  assert.equal(saveRes.status, 200, await saveRes.clone().text());

  const refreshedCatalog = await f.api.loadOptionCatalog(f.env, "haoshiguoshao");

  // Every item in target category MUST inherit g_hs_spicy_level
  for (const item of itemsInCategory) {
    const groups = f.api.effectiveGroups(refreshedCatalog, item.id);
    const hasSpicy = groups.some((g) => g.id === "g_hs_spicy_level");
    assert.ok(hasSpicy, `Item ${item.name} (${item.id}) in ${targetCategory.id} must inherit g_hs_spicy_level`);
  }

  // Item in other category MUST NOT inherit g_hs_spicy_level
  const otherGroups = f.api.effectiveGroups(refreshedCatalog, itemInOtherCat.id);
  const otherHasSpicy = otherGroups.some((g) => g.id === "g_hs_spicy_level");
  assert.equal(otherHasSpicy, false, `Item ${itemInOtherCat.name} in other category must NOT inherit g_hs_spicy_level`);

  f.db.close();
});

test("Category Inheritance Override: Product can explicitly disable inherited category group", async () => {
  const f = schemaTrueFixture();
  const catalog = await f.api.loadOptionCatalog(f.env, "haoshiguoshao");
  const targetCategory = catalog.categories.find((c) => c.id === "cat_hs_guoshao");
  const items = catalog.products.filter((p) => p.category_id === targetCategory.id);
  const itemToOverride = items[0];
  const siblingItem = items[1];

  // 1. Create category-linked group
  const groupPayload = {
    id: "g_hs_temp_override",
    name: "溫度",
    revision: 0,
    scope: "item",
    minSelection: 1,
    maxSelection: 1,
    categoryIds: [targetCategory.id],
    options: [
      { id: "opt_hot", name: "熱", price: 0, quantity: 1 },
      { id: "opt_warm", name: "溫", price: 0, quantity: 1 },
    ],
  };
  await f.save("group", groupPayload, "haoshiguoshao");

  // 2. Override on itemToOverride by setting disabled: true
  const productOverride = {
    id: itemToOverride.id,
    name: itemToOverride.name,
    price: itemToOverride.price,
    categoryId: itemToOverride.category_id,
    revision: itemToOverride.menu_revision || 0,
    links: [
      {
        groupId: "g_hs_temp_override",
        disabled: true,
      },
    ],
  };

  const overrideRes = await f.save("product", productOverride, "haoshiguoshao");
  assert.equal(overrideRes.status, 200, await overrideRes.clone().text());

  const refreshed = await f.api.loadOptionCatalog(f.env, "haoshiguoshao");

  // Item with override MUST NOT have the disabled group
  const overriddenGroups = f.api.effectiveGroups(refreshed, itemToOverride.id);
  assert.equal(
    overriddenGroups.some((g) => g.id === "g_hs_temp_override"),
    false,
    "Overridden item must have g_hs_temp_override disabled"
  );

  // Sibling item MUST still have the inherited group
  const siblingGroups = f.api.effectiveGroups(refreshed, siblingItem.id);
  assert.equal(
    siblingGroups.some((g) => g.id === "g_hs_temp_override"),
    true,
    "Sibling item must still inherit g_hs_temp_override"
  );

  f.db.close();
});

test("Category Inheritance Subset: Product can restrict inherited group to a subset of options", async () => {
  const f = schemaTrueFixture();
  const catalog = await f.api.loadOptionCatalog(f.env, "haoshiguoshao");
  const targetCategory = catalog.categories.find((c) => c.id === "cat_hs_guoshao");
  const items = catalog.products.filter((p) => p.category_id === targetCategory.id);
  const itemA = items[0];
  const itemB = items[1];

  // Group has 4 options
  const groupPayload = {
    id: "g_hs_topping_subset",
    name: "加料",
    revision: 0,
    scope: "item",
    minSelection: 0,
    maxSelection: 2,
    categoryIds: [targetCategory.id],
    options: [
      { id: "opt_t1", name: "滷蛋", price: 15, quantity: 1 },
      { id: "opt_t2", name: "貢丸", price: 15, quantity: 1 },
      { id: "opt_t3", name: "起司", price: 20, quantity: 1 },
      { id: "opt_t4", name: "青菜", price: 20, quantity: 1 },
    ],
  };
  await f.save("group", groupPayload, "haoshiguoshao");

  // Item A restricts to only opt_t1 and opt_t3
  const productA = {
    id: itemA.id,
    name: itemA.name,
    price: itemA.price,
    categoryId: itemA.category_id,
    revision: itemA.menu_revision || 0,
    links: [
      {
        groupId: "g_hs_topping_subset",
        optionIds: ["opt_t1", "opt_t3"],
        disabled: false,
      },
    ],
  };
  await f.save("product", productA, "haoshiguoshao");

  const refreshed = await f.api.loadOptionCatalog(f.env, "haoshiguoshao");

  // Item A should have only 2 options
  const groupsA = f.api.effectiveGroups(refreshed, itemA.id);
  const subsetGroupA = groupsA.find((g) => g.id === "g_hs_topping_subset");
  assert.ok(subsetGroupA, "Item A must have g_hs_topping_subset");
  assert.equal(subsetGroupA.options.length, 2);
  assert.deepEqual(
    subsetGroupA.options.map((o) => o.id).sort(),
    ["opt_t1", "opt_t3"]
  );

  // Item B should have all 4 options
  const groupsB = f.api.effectiveGroups(refreshed, itemB.id);
  const fullGroupB = groupsB.find((g) => g.id === "g_hs_topping_subset");
  assert.ok(fullGroupB, "Item B must have g_hs_topping_subset");
  assert.equal(fullGroupB.options.length, 4);

  f.db.close();
});

test("Category Inheritance: No duplication when item is linked directly AND via category", async () => {
  const f = schemaTrueFixture();
  const catalog = await f.api.loadOptionCatalog(f.env, "haoshiguoshao");
  const targetCategory = catalog.categories.find((c) => c.id === "cat_hs_guoshao");
  const targetItem = catalog.products.find((p) => p.category_id === targetCategory.id);

  // Link to both categoryIds and itemIds
  const groupPayload = {
    id: "g_hs_dual_link",
    name: "雙重關聯測試",
    revision: 0,
    scope: "item",
    minSelection: 1,
    maxSelection: 1,
    categoryIds: [targetCategory.id],
    itemIds: [targetItem.id],
    options: [
      { id: "opt_d1", name: "選項1", price: 0, quantity: 1 },
      { id: "opt_d2", name: "選項2", price: 0, quantity: 1 },
    ],
  };
  await f.save("group", groupPayload, "haoshiguoshao");

  const refreshed = await f.api.loadOptionCatalog(f.env, "haoshiguoshao");
  const groups = f.api.effectiveGroups(refreshed, targetItem.id);
  const dualMatches = groups.filter((g) => g.id === "g_hs_dual_link");
  assert.equal(dualMatches.length, 1, "Must never duplicate group in effectiveGroups");

  f.db.close();
});
