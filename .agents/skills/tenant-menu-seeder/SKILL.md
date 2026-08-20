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
Invalidate cache for the new tenant:
```bash
CI=true CLOUDFLARE_ACCOUNT_ID=525bb177ae7306325d13269246769f50 npx wrangler kv key delete --remote --namespace-id=ad5b1e14aad4486fb2ffcd9961cadf3a "tenant:<tenant_id>:bootstrap"
```

### Step 5: Verification & Links
Provide direct clickable links to test the menu:
- Customer Menu: `https://benmi-order.pages.dev/?tenant_id=<tenant_id>`
- POS Dashboard: `https://benmi-order.pages.dev/orders.html?tenant_id=<tenant_id>`
- API Bootstrap Check: `curl "https://benmi-worker-official.thuanmnc.workers.dev/api/tenant/bootstrap?tenant_id=<tenant_id>"`
