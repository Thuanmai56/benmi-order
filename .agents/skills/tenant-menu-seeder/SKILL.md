---
name: tenant-menu-seeder
description: Seed new restaurant menus and tenant configurations into Cloudflare D1 database and KV cache from structured JSON, text specs, or extracted menu data.
---

# Tenant & Menu Seeder Skill

Use this skill when the user wants to add, seed, or migrate a new restaurant (tenant), its menu, options, modifiers, and store settings into the Cloudflare D1 database.

---

## 1. Input Processing

The input can be:
- The standardized JSON produced by the **Gemini Menu Extractor Prompt** (`docs/prompts/gemini_menu_extractor_prompt.md`).
- A raw text description, flyer details, or menu specification provided by the user.

### Standard Schema Expected:
The extractor contract also supports top-level `customizations` and `review_notes`; missing `customizations` in older input means no order-wide groups.

### Classify by scope before generating SQL (The 3-Level F&B Choice Hierarchy)
1. **Level 1 - Order-Wide Customizations**:
   - Seasoning selected once for the whole order/bag (pepper, chili, garlic, oil, broth, etc.) belongs in `menu_customizations`, like BSC's first flavor section. Each entry has `id`, `key`, `title`, `type` (`radio`/`checkbox`), `sort_order`, and `options_json`.
2. **Level 2 - Mandatory Core Component / Starch / Combo (Bundle Rules)**:
   - If a dish CANNOT be prepared without choosing from a fixed set of bases (e.g., 鍋燒 MUST choose 1 noodle type: 意麵/冬粉/烏龍/泡飯/油麵; Bento MUST choose 4 side dishes; Combo MUST choose 1 drink), this MUST be seeded as a `menu_bundle_rules` (min: 1, max: 1), NOT as a passive modifier!
   - *Why?* Passive modifiers auto-default silently without prompting the customer on `+`. A `bundle_rule` triggers the All-in-One Dish Configurator modal immediately with zero delay.
   - Seed the underlying choices in a category (e.g., `cat_<tenant>_noodle_type`) with items priced at $0 (or surcharges), then attach `menu_bundle_rules`.
3. **Level 3 - Dish-Level Modifiers & Add-on Toppings**:
   - Optional toppings (加肉, 加起司), spice level adjustments, or drink ice/sugar that modify an already complete dish belong in `menu_categories` with `category_type: "modifier"` and are linked via `applied_modifiers`.

Example order-wide group:
```json
{"id":"custom_store_pepper","key":"pepper","title":"胡椒粉","type":"radio","sort_order":0,"options":[{"name":"正常","price":0},{"name":"少","price":0}]}
```

```json
{
  "tenant": {
    "id": "<tenant_id>",
    "brand_name": "<Store Name>",
    "brand_color": "<#hex_color>",
    "store_address": "<Address>",
    "operating_hours": "11:00-21:00",
    "allow_scheduled_pickup": true,
    "locale": "zh-TW | vi",
    "delivery_policy": "<Delivery terms or empty>"
  },
  "categories": [
    {
      "id": "cat_<tenant>_<slug>",
      "slug": "<main | spicy | egg | topping | drinks | ...>",
      "name": "<Category Display Title>",
      "category_type": "catalog | modifier",
      "selection_type": "single | multiple | combo_drink",
      "is_required": true | false,
      "min_selection": 0 | 1,
      "max_selection": 1 | 10,
      "sort_order": 1,
      "items": [
        {
          "id": "<item_id>",
          "name": "<Item Name>",
          "price": 50,
          "description": "<Description or null>",
          "badge_text": "<Tag or null>",
          "is_recommended": true | false,
          "sort_order": 1
        }
      ]
    }
  ]
}
```

---

## 2. Step-by-Step Execution Workflow

### Step 1: File Location & Naming
1. Tenant seed files are stored in `benmi-worker-official/seeds/tenants/`.
2. Name the file after the tenant ID: `seeds/tenants/<tenant_id>.sql` (e.g. `seeds/tenants/miyansuo.sql`).
3. **Do NOT put tenant menu seeds into `migrations/`**. The `migrations/` directory is strictly reserved for platform-wide Schema DDL changes.

### Step 2: Idempotent SQL Seed Generation
Use `INSERT ... ON CONFLICT DO UPDATE` so the seed file can be executed repeatedly without errors or duplicating rows.

For order-wide groups, upsert `menu_customizations (id, tenant_id, key, title, type, sort_order, options_json)`. Scope every data change to the target tenant.

Write the SQL seed file under `benmi-worker-official/seeds/tenants/<tenant_id>.sql`:

```sql
-- ==============================================================================
-- Tenant Seed: <tenant_id> (<brand_name>)
-- Description: Initial menu, categories, bundle rules, and store configuration
-- Execution:
--   echo "y" | npx wrangler d1 execute <database_name> --remote [--env dev|test] --file=seeds/tenants/<tenant_id>.sql
-- ==============================================================================

-- 1. Tenants Table
INSERT INTO tenants (id, name) 
VALUES ('<tenant_id>', '<brand_name>')
ON CONFLICT(id) DO UPDATE SET name = excluded.name;

-- 2. Tenant Config Table
INSERT INTO tenant_config (
    tenant_id, brand_name, brand_color, store_address, operating_hours,
    delivery_policy, default_password, locale, allow_scheduled_pickup,
    allow_dine_in, store_status, liff_id, liff_url, order_prefix,
    features, cuisine_type, is_marketplace_visible, is_active, latitude, longitude
) VALUES (
    '<tenant_id>',
    '<brand_name>',
    '<brand_color>',
    '<store_address>',
    '<operating_hours_json>',
    '<delivery_policy>',
    '12345678',
    '<locale>',
    <1 or 0>,
    0,
    'open',
    '2009560906-c5taZfiY',
    'https://liff.line.me/2009560906-c5taZfiY',
    '<unique_prefix>',
    '["reports", "flex_notifications"]',
    'taiwanese',
    1,
    1,
    <latitude>,
    <longitude>
)
ON CONFLICT(tenant_id) DO UPDATE SET
    brand_name = excluded.brand_name,
    brand_color = excluded.brand_color,
    store_address = excluded.store_address,
    operating_hours = excluded.operating_hours,
    delivery_policy = excluded.delivery_policy,
    locale = excluded.locale,
    allow_scheduled_pickup = excluded.allow_scheduled_pickup,
    allow_dine_in = excluded.allow_dine_in,
    store_status = excluded.store_status,
    order_prefix = excluded.order_prefix,
    features = excluded.features,
    cuisine_type = excluded.cuisine_type,
    is_marketplace_visible = excluded.is_marketplace_visible,
    is_active = excluded.is_active,
    latitude = excluded.latitude,
    longitude = excluded.longitude;

-- 3. Categories (Catalog & Modifiers)
INSERT INTO menu_categories (
    id, tenant_id, name, short_name, slug, category_type, selection_type,
    is_required, min_selection, max_selection, sort_order,
    allow_customization, applied_modifiers
) VALUES
('cat_<tenant>_main', '<tenant_id>', '...', '...', 'main', 'catalog', 'single', 0, 0, 1, 1, 1, '["cat_<tenant>_topping"]'),
('cat_<tenant>_topping', '<tenant_id>', '...', '...', 'topping', 'modifier', 'multiple', 0, 0, 10, 2, 0, '[]')
ON CONFLICT(id) DO UPDATE SET
    tenant_id = excluded.tenant_id,
    name = excluded.name,
    short_name = excluded.short_name,
    slug = excluded.slug,
    category_type = excluded.category_type,
    selection_type = excluded.selection_type,
    is_required = excluded.is_required,
    min_selection = excluded.min_selection,
    max_selection = excluded.max_selection,
    sort_order = excluded.sort_order,
    allow_customization = excluded.allow_customization,
    applied_modifiers = excluded.applied_modifiers;

-- 4. Menu Items
INSERT INTO menu_items (
    id, tenant_id, category_id, name, price, description, badge_text, is_recommended, sort_order
) VALUES
('<tenant>_item_01', '<tenant_id>', 'cat_<tenant>_main', '...', 50, '...', '招牌推薦', 1, 1),
('<tenant>_top_01', '<tenant_id>', 'cat_<tenant>_topping', '...', 10, NULL, NULL, 0, 1)
ON CONFLICT(id) DO UPDATE SET
    tenant_id = excluded.tenant_id,
    category_id = excluded.category_id,
    name = excluded.name,
    price = excluded.price,
    description = excluded.description,
    badge_text = excluded.badge_text,
    is_recommended = excluded.is_recommended,
    sort_order = excluded.sort_order;

-- 5. Bundle Rules Table (Mandatory Starch / Base / Combos)
-- Required when an item cannot be prepared without picking 1 or N items from a base pool
INSERT INTO menu_bundle_rules (id, tenant_id, parent_item_id, schema_version, config_json)
VALUES (
    'rule_<tenant>_<item_id>_base',
    '<tenant_id>',
    '<tenant>_item_01',
    1,
    '{"version":1,"groups":[{"id":"base-choice","name":"選擇搭配","label":{"zh-TW":"請選擇 1 樣搭配","vi":"Chọn 1 món kết hợp"},"minQuantity":1,"maxQuantity":1,"allowRepeat":false,"sources":[{"type":"category","categoryId":"cat_<tenant>_pool"}],"pricing":{"type":"included"}}]}'
)
ON CONFLICT(tenant_id, parent_item_id) DO UPDATE SET
    schema_version = excluded.schema_version,
    config_json = excluded.config_json,
    is_active = excluded.is_active;
```

### Step 3: Execute Seed on D1
Run `wrangler d1 execute` for the target environment(s):
```bash
# Dev:
echo "y" | npx wrangler d1 execute blab-db-dev --remote --env dev --file=seeds/tenants/<tenant_id>.sql

# Staging:
echo "y" | npx wrangler d1 execute blab-db-test --remote --env test --file=seeds/tenants/<tenant_id>.sql

# Production:
echo "y" | npx wrangler d1 execute blab-db-production --remote --file=seeds/tenants/<tenant_id>.sql
```

### Step 4: Clear KV Cache
Resolve the namespace for the selected environment from `wrangler.jsonc`; do not reuse the historical namespace below blindly. Invalidate both `tenant:<tenant_id>:bootstrap` and `tenant:<tenant_id>:menu` after menu changes. Clear config cache only when configuration changes.
Invalidate cache for the new tenant:
```bash
CI=true CLOUDFLARE_ACCOUNT_ID=525bb177ae7306325d13269246769f50 npx wrangler kv key delete --remote --namespace-id=ad5b1e14aad4486fb2ffcd9961cadf3a "tenant:<tenant_id>:bootstrap"
```

### Step 5: Verification & Links
For a scope conversion, verify bootstrap with `nocache=1`: migrated groups appear once in `customizations`, are absent from `modifiers`, catalog products/prices are unchanged, and remaining modifier references resolve. Verify the customer first section, POS selection, order text/structured payload, and paid-option totals. Test migration reruns and foreign keys locally before applying remotely. Choose the environment from user/session context; do not assume production from the example commands.
Provide direct clickable links to test the menu:
- Customer Menu: `https://benmi-order.pages.dev/?tenant_id=<tenant_id>`
- POS Dashboard: `https://benmi-order.pages.dev/orders.html?tenant_id=<tenant_id>`
- LINE Webhook URL (LINE Developers Console): `https://benmi-worker-official.thuanmnc.workers.dev/webhook/<tenant_id>`
- API Bootstrap Check: `curl "https://benmi-worker-official.thuanmnc.workers.dev/api/tenant/bootstrap?tenant_id=<tenant_id>"`
