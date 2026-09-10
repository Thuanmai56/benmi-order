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

### Classify by scope before generating SQL
- Printed square checkboxes are not evidence of multi-select. When the user specifies one choice per group, map every such group to `type: "radio"` in menu_customizations (`selection_type: "single"` only for dish modifiers). Do not infer mandatory selection or defaults from this instruction.
- Standalone products go to catalog categories. Options selected separately for each dish go to modifier categories.
- Seasoning selected once for the whole order/bag belongs in `menu_customizations`, like BSC's first flavor section. This is a data-model distinction, not a tenant-name special case. Confirm ambiguous scope from the menu/user.
- Each `customizations` entry has `id`, tenant-unique `key`, `title`, `type` (`radio`/`checkbox`), `sort_order`, and `options`; serialize `options` to `options_json`. Preserve option names, order, prices, sub-options and availability.
- Bootstrap already exposes these rows as `customizations`; index renders them before products. Do not duplicate them as modifiers, menu items or a synthetic category unless the current renderer explicitly requires it.
- Set catalog `allow_customization` and `applied_modifiers` explicitly for remaining dish-level modifiers. When none remain, use `0` and `'[]'`; this does not disable order-level choices.
- Inspect charging/submission code before moving paid or conditional choices. Current customer radio customizations display prices but do not add them to the total. Preserve such requirements in `review_notes`; implement the missing behavior or resolve the representation before applying that conversion. Do not erase surcharges or turn exclusive options into independent checkboxes.
- BSC is a reference for structure, not a source of option names/defaults. Never infer order-level scope solely from a cuisine, slug or tenant name.

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
