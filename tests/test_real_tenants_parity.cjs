const test = require("node:test");
const assert = require("node:assert/strict");
const { schemaTrueFixture } = require("./helpers/option-groups.cjs");

test("Real Tenants Parity: Catalog loading and strict category filtering across all seeded tenants", async () => {
  const f = schemaTrueFixture();
  const tenants = f.db.prepare("SELECT id, name FROM tenants ORDER BY id").all();
  assert.ok(tenants.length >= 10, "Should have at least 10 seeded tenants in schema-true DB");

  for (const { id: tenantId, name } of tenants) {
    const catalog = await f.api.loadOptionCatalog(f.env, tenantId);
    assert.ok(catalog, `Catalog must load for tenant ${tenantId} (${name})`);
    assert.ok(Array.isArray(catalog.categories), `Categories must be an array for ${tenantId}`);
    assert.ok(Array.isArray(catalog.products), `Products must be an array for ${tenantId}`);
    assert.ok(Array.isArray(catalog.groups), `Groups must be an array for ${tenantId}`);
    assert.ok(Array.isArray(catalog.links), `Links must be an array for ${tenantId}`);

    // Verify Bug 1 prevention: No non-catalog pseudo-categories in catalog.categories
    for (const cat of catalog.categories) {
      assert.ok(
        !["order_customization", "bundle_pool"].includes(cat.category_type),
        `Tenant ${tenantId} category ${cat.id} has invalid pseudo-category_type: ${cat.category_type}`
      );
    }

    // Verify all products map to an existing catalog category
    const validCatIds = new Set(catalog.categories.map((c) => c.id));
    for (const prod of catalog.products) {
      assert.ok(
        validCatIds.has(prod.category_id),
        `Tenant ${tenantId} product ${prod.id} references non-catalog category ${prod.category_id}`
      );
    }

    // Verify all group sources reference existing catalog categories or products
    for (const g of catalog.groups) {
      for (const source of g.sources || []) {
        if (source.type === "category") {
          const catId = source.refId || source.categoryId;
          assert.ok(
            validCatIds.has(catId),
            `Tenant ${tenantId} group ${g.id} references missing source category ${catId}`
          );
        }
      }
    }
  }

  f.db.close();
});

test("Real Tenants Parity: Adding and removing custom options across all groups without SQLite constraint failures", async () => {
  const f = schemaTrueFixture();
  const tenants = f.db.prepare("SELECT id FROM tenants ORDER BY id").all().map((r) => r.id);

  for (const tenantId of tenants) {
    const catalog = await f.api.loadOptionCatalog(f.env, tenantId);
    if (!catalog.groups.length) continue;

    for (const group of catalog.groups) {
      const customOptId = `test_custom_${tenantId}_${group.id}`;
      const customOption = {
        id: customOptId,
        name: "Test Custom Item",
        price: 15,
        productId: null,
        quantity: 1,
        isDefault: false,
        subOptions: [],
        eligibilityRules: [],
        fromSource: false,
      };

      const groupItemIds = catalog.links.filter((l) => l.groupId === group.id && !l.disabled).map((l) => l.itemId);
      const groupCatIds = catalog.categoryLinks.filter((l) => l.groupId === group.id).map((l) => l.categoryId);

      // Save group with custom option added
      const savePayload = {
        ...group,
        options: [...group.options, customOption],
        itemIds: groupItemIds,
        categoryIds: groupCatIds,
        delete: false,
      };

      const res = await f.save("group", savePayload, tenantId);
      const body = await res.json();
      assert.equal(
        res.status,
        200,
        `Tenant ${tenantId} group ${group.id} save custom option failed: ${JSON.stringify(body)}`
      );
      assert.equal(body.success, true);

      // Verify Bug 2 prevention: Option exists and menu_bundle_rules (if any) was updated without UNIQUE constraint failure
      const updatedCatalog = body.catalog;
      const updatedGroup = updatedCatalog.groups.find((g) => g.id === group.id);
      assert.ok(updatedGroup, `Group ${group.id} must exist in updated catalog`);
      assert.ok(
        updatedGroup.options.some((o) => o.id === customOptId && o.name === "Test Custom Item"),
        `Custom option ${customOptId} must be present in group ${group.id}`
      );

      // Verify bundle rules are valid for linked items
      for (const itemId of groupItemIds) {
        const bundleRule = f.api.projectOptionRule(updatedCatalog, itemId);
        assert.ok(bundleRule, `Bundle rule for item ${itemId} must be generated`);
        assert.ok(
          bundleRule.groups.some((bg) => bg.id === group.id),
          `Bundle rule for ${itemId} must include group ${group.id}`
        );
      }

      // Cleanup: revert group back to original options
      const revertPayload = {
        ...updatedGroup,
        options: updatedGroup.options.filter((o) => o.id !== customOptId),
        itemIds: groupItemIds,
        categoryIds: groupCatIds,
        delete: false,
      };
      const cleanupRes = await f.save("group", revertPayload, tenantId);
      assert.equal(cleanupRes.status, 200, `Cleanup for group ${group.id} must succeed`);
    }
  }

  f.db.close();
});

test("Real Tenants Parity: Adding product options to groups and verifying pricing", async () => {
  const f = schemaTrueFixture();
  const tenants = ["jiangjiejie", "dapinglin", "haoshiguoshao"];

  for (const tenantId of tenants) {
    const catalog = await f.api.loadOptionCatalog(f.env, tenantId);
    if (!catalog.groups.length) continue;

    const group = catalog.groups[0];
    const groupItemIds = catalog.links.filter((l) => l.groupId === group.id && !l.disabled).map((l) => l.itemId);
    const existingProductIds = new Set(group.options.map((o) => o.productId).filter(Boolean));
    const availableProduct = catalog.products.find((p) => !existingProductIds.has(p.id) && !groupItemIds.includes(p.id));
    if (!availableProduct) continue;

    const productOptId = `test_prod_opt_${availableProduct.id}`;
    const productOption = {
      id: productOptId,
      name: availableProduct.name,
      productId: availableProduct.id,
      price: 5,
      quantity: 1,
      isDefault: false,
      subOptions: [],
      eligibilityRules: [],
      fromSource: false,
    };

    const groupCatIds = catalog.categoryLinks.filter((l) => l.groupId === group.id).map((l) => l.categoryId);

    const saveRes = await f.save("group", {
      ...group,
      options: [...group.options, productOption],
      itemIds: groupItemIds,
      categoryIds: groupCatIds,
      delete: false,
    }, tenantId);

    const saveBody = await saveRes.json();
    assert.equal(saveRes.status, 200, `Adding product option must succeed for ${tenantId}: ${JSON.stringify(saveBody)}`);

    const updatedGroup = saveBody.catalog.groups.find((g) => g.id === group.id);
    const expandedOptions = f.api.groupOptions(saveBody.catalog, updatedGroup);
    const foundOpt = expandedOptions.find((o) => o.id === productOptId);
    assert.ok(foundOpt, "Added product option must be found");
    assert.equal(foundOpt.price, 5);
    assert.equal(foundOpt.retailPrice, availableProduct.price);

    // Revert
    await f.save("group", {
      ...updatedGroup,
      options: updatedGroup.options.filter((o) => o.id !== productOptId),
      itemIds: groupItemIds,
      categoryIds: groupCatIds,
      delete: false,
    }, tenantId);
  }

  f.db.close();
});

test("Real Tenants Parity: Customer order validation on combo items across tenants", async () => {
  const f = schemaTrueFixture();
  const tenants = ["jiangjiejie", "dapinglin", "haoshiguoshao"];

  for (const tenantId of tenants) {
    const catalog = await f.api.loadOptionCatalog(f.env, tenantId);
    const comboProducts = catalog.products.filter((p) => f.api.effectiveGroups(catalog, p.id).length > 0);

    for (const product of comboProducts) {
      const groups = f.api.effectiveGroups(catalog, product.id);
      assert.ok(groups.length > 0, `Product ${product.id} must have effective groups`);

      // Construct a valid choice payload satisfying min/max
      const validChoices = groups.map((g) => {
        const requiredCount = g.minSelection > 0 ? g.minSelection : 1;
        const selectedOptions = g.options.slice(0, requiredCount).map((o) => ({
          itemId: o.id,
          optionId: o.id,
          name: o.name,
          price: o.price,
          quantity: 1,
        }));
        return {
          groupId: g.id,
          name: g.name,
          items: selectedOptions,
        };
      });

      // Validate selection
      const result = f.api.validateOptionSelection(catalog, product.id, validChoices, [], 1000);
      assert.ok(result, `Validation result must be returned for ${product.id}`);
      assert.equal(result.groups.length, groups.length, `Validated groups must match effective groups count for ${product.id}`);
    }
  }

  f.db.close();
});
