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

### Step 1: Migration Number Discovery
1. Check existing files in `benmi-worker-official/migrations/`.
2. Find the highest number (e.g. `0017`) and increment by 1 (e.g. `0018_seed_<tenant_id>_menu.sql`).

### Step 2: SQL Migration Generation
For existing tenants, add a new migration rather than rewriting an applied seed. Use `INSERT ... ON CONFLICT(id) DO UPDATE` with explicit fields rather than REPLACE (which deletes/reinserts rows).

For order-wide groups, upsert `menu_customizations (id, tenant_id, key, title, type, sort_order, options_json)` using the existing schema from migration 0037. When converting modifiers, copy their current options before deleting only the converted items/categories, remove converted references from `applied_modifiers`, and preserve unrelated categories/options. Scope every data change to the target tenant. Do not reseed the entire menu merely to move flavor groups.

Write the SQL migration file under `benmi-worker-official/migrations/`:

```sql
-- Migration: 00XX_seed_<tenant_id>_menu.sql
-- Description: Seed initial menu and tenant config for tenant '<tenant_id>'

-- 1. Tenants Table
INSERT OR IGNORE INTO tenants (id, name) 
VALUES ('<tenant_id>', '<brand_name>');

-- 2. Tenant Config Table
INSERT OR REPLACE INTO tenant_config (
    tenant_id, brand_name, brand_color, store_address, operating_hours,
    delivery_policy, default_password, locale, allow_scheduled_pickup,
    store_status, liff_id, liff_url, is_active
) VALUES (
    '<tenant_id>',
    '<brand_name>',
    '<brand_color>',
    '<store_address>',
    '<operating_hours>',
    '<delivery_policy>',
    '12345678',
    '<locale>',
    <1 or 0>,
    'open',
    '2009560906-c5taZfiY',
    'https://liff.line.me/2009560906-c5taZfiY',
    1
);

-- 3. Categories (Catalog & Modifiers)
INSERT OR REPLACE INTO menu_categories (
    id, tenant_id, name, slug, category_type, selection_type,
    is_required, min_selection, max_selection, sort_order
) VALUES
('cat_<tenant>_main', '<tenant_id>', '...', 'main', 'catalog', 'single', 0, 0, 1, 1),
('cat_<tenant>_topping', '<tenant_id>', '...', 'topping', 'modifier', 'multiple', 0, 0, 10, 2);

-- 4. Menu Items
INSERT OR REPLACE INTO menu_items (
    id, tenant_id, category_id, name, price, description, badge_text, is_recommended, sort_order
) VALUES
('<tenant>_item_01', '<tenant_id>', 'cat_<tenant>_main', '...', 50, '...', '👍 推薦', 1, 1),
('<tenant>_top_01', '<tenant_id>', 'cat_<tenant>_topping', '...', 10, NULL, NULL, 0, 1);

-- 5. Bundle Rules Table (Mandatory Starch / Base / Combos)
-- Required when an item cannot be prepared without picking 1 or N items from a base category
INSERT OR REPLACE INTO menu_bundle_rules (
    id, tenant_id, item_id, name, group_id, group_name,
    min_selections, max_selections, selection_type, rule_json
) VALUES
(
    'rule_<tenant>_<item_id>_base',
    '<tenant_id>',
    '<tenant>_item_01',
    '麵體',
    'noodle-type',
    '麵體',
    1,
    1,
    'fixed',
    '{"version":1,"groups":[{"id":"noodle-type","name":"麵體","label":{"zh-TW":"請選擇 1 樣麵體","vi":"Chọn 1 loại mì"},"minQuantity":1,"maxQuantity":1,"allowRepeats":false,"sources":[{"type":"category","categoryId":"cat_<tenant>_noodle_type"}]}]}'
);
```

### Step 3: Apply Migration to D1
Run wrangler migration command for Staging and/or Production:
```bash
# Staging:
CI=true CLOUDFLARE_ACCOUNT_ID=525bb177ae7306325d13269246769f50 npx wrangler d1 migrations apply blab-db-test --remote --env test

# Production:
CI=true CLOUDFLARE_ACCOUNT_ID=525bb177ae7306325d13269246769f50 npx wrangler d1 migrations apply blab-db-production --remote
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
