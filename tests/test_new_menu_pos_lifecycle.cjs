const { test } = require("node:test");
const assert = require("node:assert/strict");
const { schemaTrueFixture } = require("./helpers/option-groups.cjs");

test("POS Lifecycle: Create, read, update, and delete option group with shadow-sync cleanup", async () => {
  const f = schemaTrueFixture();
  const tenantId = "haoshiguoshao";
  const catalog = await f.api.loadOptionCatalog(f.env, tenantId);
  const targetCategory = catalog.categories.find((c) => c.id === "cat_hs_guoshao");
  assert.ok(targetCategory);

  // 1. CREATE: Create brand new option group
  const createPayload = {
    id: "g_pos_lifecycle_test",
    name: "湯底客製化",
    revision: 0,
    scope: "item",
    minSelection: 1,
    maxSelection: 1,
    allowRepeats: false,
    categoryIds: [targetCategory.id],
    itemIds: [],
    sources: [],
    options: [
      { id: "opt_soup_original", name: "原味柴魚", price: 0, quantity: 1 },
      { id: "opt_soup_spicy", name: "川味麻辣", price: 15, quantity: 1 },
      { id: "opt_soup_milk", name: "香濃牛奶", price: 20, quantity: 1 },
    ],
  };

  const createRes = await f.save("group", createPayload, tenantId);
  assert.equal(createRes.status, 200, await createRes.clone().text());

  // Verify created in DB and catalog
  let currentCatalog = await f.api.loadOptionCatalog(f.env, tenantId);
  let group = currentCatalog.groups.find((g) => g.id === "g_pos_lifecycle_test");
  assert.ok(group, "Group must exist after create");
  assert.equal(group.name, "湯底客製化");
  assert.equal(group.options.length, 3);
  assert.equal(group.revision, 1);

  // Verify DB tables populated
  const dbGroup = f.db.prepare("SELECT * FROM modifier_groups WHERE id = ? AND tenant_id = ?").get(group.id, tenantId);
  assert.ok(dbGroup, "modifier_groups row must exist");
  const dbOptions = f.db.prepare("SELECT * FROM modifier_options WHERE group_id = ? AND tenant_id = ?").all(group.id, tenantId);
  assert.equal(dbOptions.length, 3, "3 modifier_options rows must exist");

  // 2. UPDATE: Edit min/max selection and add 1 more option
  const updatePayload = {
    id: group.id,
    name: "湯底客製化 (升級版)",
    revision: group.revision, // 1
    scope: "item",
    minSelection: 1,
    maxSelection: 2,
    allowRepeats: false,
    categoryIds: [targetCategory.id],
    itemIds: [],
    sources: [],
    options: [
      { id: "opt_soup_original", name: "原味柴魚", price: 0, quantity: 1 },
      { id: "opt_soup_spicy", name: "川味麻辣", price: 15, quantity: 1 },
      { id: "opt_soup_milk", name: "香濃牛奶", price: 20, quantity: 1 },
      { id: "opt_soup_tomato", name: "鮮茄濃湯", price: 25, quantity: 1 },
    ],
  };

  const updateRes = await f.save("group", updatePayload, tenantId);
  assert.equal(updateRes.status, 200, await updateRes.clone().text());

  currentCatalog = await f.api.loadOptionCatalog(f.env, tenantId);
  group = currentCatalog.groups.find((g) => g.id === "g_pos_lifecycle_test");
  assert.equal(group.name, "湯底客製化 (升級版)");
  assert.equal(group.maxSelection, 2);
  assert.equal(group.options.length, 4);
  assert.equal(group.revision, 2);

  // 3. DELETE: Soft/hard delete via deleted: true with valid revision
  const deletePayload = {
    id: group.id,
    revision: group.revision, // 2
    deleted: true,
  };

  const deleteRes = await f.save("group", deletePayload, tenantId);
  assert.equal(deleteRes.status, 200, await deleteRes.clone().text());

  // Verify deleted from catalog
  currentCatalog = await f.api.loadOptionCatalog(f.env, tenantId);
  assert.equal(
    currentCatalog.groups.some((g) => g.id === "g_pos_lifecycle_test"),
    false,
    "Group must be deleted from catalog"
  );

  // Verify DB clean up: 0 orphan rows
  const remainingGroup = f.db.prepare("SELECT COUNT(*) AS count FROM modifier_groups WHERE id = ? AND tenant_id = ?").get(group.id, tenantId);
  assert.equal(remainingGroup.count, 0, "modifier_groups row must be removed");

  const remainingOptions = f.db.prepare("SELECT COUNT(*) AS count FROM modifier_options WHERE group_id = ? AND tenant_id = ?").get(group.id, tenantId);
  assert.equal(remainingOptions.count, 0, "modifier_options rows must be removed");

  const remainingCategoryLinks = f.db.prepare("SELECT COUNT(*) AS count FROM category_modifier_links WHERE group_id = ? AND tenant_id = ?").get(group.id, tenantId);
  assert.equal(remainingCategoryLinks.count, 0, "category_modifier_links rows must be removed");

  f.db.close();
});

test("POS Lifecycle: Linked product deletion guard protects reference and permits delete after unlinking", async () => {
  const f = schemaTrueFixture();
  const tenantId = "haoshiguoshao";
  const catalog = await f.api.loadOptionCatalog(f.env, tenantId);
  const dish = catalog.products[0];
  const sideProduct = catalog.products[1];
  assert.ok(dish && sideProduct);

  // 1. Create group that links sideProduct as an option
  const groupPayload = {
    id: "g_pos_linked_guard_test",
    name: "加點附餐",
    revision: 0,
    scope: "item",
    minSelection: 0,
    maxSelection: 1,
    itemIds: [dish.id],
    options: [
      { id: "opt_side_ref", name: sideProduct.name, productId: sideProduct.id, price: 30, quantity: 1 },
    ],
  };

  await f.save("group", groupPayload, tenantId);

  // 2. Attempt to delete sideProduct -> MUST BE BLOCKED with PRODUCT_IS_LINKED
  const blockedDeleteRes = await f.save(
    "product",
    { id: sideProduct.id, revision: sideProduct.menu_revision || 0, deleted: true },
    tenantId
  );
  assert.equal(blockedDeleteRes.status, 400);
  const blockedBody = await blockedDeleteRes.json();
  assert.equal(blockedBody.error, "PRODUCT_IS_LINKED");

  // 3. Delete the referencing group
  const refCatalog = await f.api.loadOptionCatalog(f.env, tenantId);
  const refGroup = refCatalog.groups.find((g) => g.id === "g_pos_linked_guard_test");
  await f.save("group", { id: refGroup.id, revision: refGroup.revision, deleted: true }, tenantId);

  // 4. Now attempt to delete sideProduct -> MUST SUCCEED (200)
  const allowedDeleteRes = await f.save(
    "product",
    { id: sideProduct.id, revision: sideProduct.menu_revision || 0, deleted: true },
    tenantId
  );
  assert.equal(allowedDeleteRes.status, 200, await allowedDeleteRes.clone().text());

  const postCatalog = await f.api.loadOptionCatalog(f.env, tenantId);
  assert.equal(postCatalog.products.some((p) => p.id === sideProduct.id), false, "Product must now be deleted");

  f.db.close();
});

test("POS Lifecycle: Order-scope group CRUD and clean shadow sync in menu_customizations", async () => {
  const f = schemaTrueFixture();
  const tenantId = "haoshiguoshao";

  // 1. Create order-scope group
  const orderGroupPayload = {
    id: "g_pos_cutlery_order",
    name: "環保餐具需求",
    revision: 0,
    scope: "order",
    minSelection: 1,
    maxSelection: 1,
    allowRepeats: false,
    options: [
      { id: "opt_need_cutlery", name: "需要餐具", price: 0, quantity: 1 },
      { id: "opt_no_cutlery", name: "不需要餐具 (愛地球)", price: 0, quantity: 1 },
    ],
  };

  const createRes = await f.save("group", orderGroupPayload, tenantId);
  assert.equal(createRes.status, 200, await createRes.clone().text());

  // Check shadow sync in menu_customizations
  const customRow = f.db.prepare("SELECT * FROM menu_customizations WHERE (id = ? OR key = ?) AND tenant_id = ?").get("g_pos_cutlery_order", "g_pos_cutlery_order", tenantId);
  assert.ok(customRow, "menu_customizations row must be populated by shadow-sync");

  const catalog = await f.api.loadOptionCatalog(f.env, tenantId);
  const group = catalog.groups.find((g) => g.id === "g_pos_cutlery_order");
  assert.ok(group);
  assert.equal(group.scope, "order");

  // 2. Delete order-scope group
  const deleteRes = await f.save("group", { id: group.id, revision: group.revision, deleted: true }, tenantId);
  assert.equal(deleteRes.status, 200);

  // Check shadow sync cleaned up
  const customAfterDelete = f.db.prepare("SELECT * FROM menu_customizations WHERE (id = ? OR key = ?) AND tenant_id = ?").get("g_pos_cutlery_order", "g_pos_cutlery_order", tenantId);
  assert.equal(Boolean(customAfterDelete), false, "menu_customizations row must be removed when group is deleted");

  f.db.close();
});
