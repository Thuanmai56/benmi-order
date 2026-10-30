---
name: tenant-menu-seeder
description: Seed new restaurant menus and tenant configurations into Cloudflare D1 database and KV cache from structured JSON, text specs, or extracted menu data using the Unified Option Groups (Schema v2/v3) architecture.
---

# Tenant & Menu Seeder Skill (Unified Menu Architecture)

Use this skill when the user wants to add, seed, or migrate a new restaurant (tenant), its menu catalog, unified option groups (`modifier_groups` / `modifier_options` / `item_modifier_links`), order-wide customizations, and store settings into the Cloudflare D1 database.

---

## 1. Input Contract & The 3-Level F&B Choice Hierarchy

### Input Sources
The input can be:
1. The standardized JSON (`tenant`, `categories`, `option_groups`, `review_notes`) produced by the **Sales Gemini Menu Extractor Prompt** ([`docs/prompts/gemini_menu_extractor_prompt.md`](file:///Users/duccao/Documents/benmi-order/docs/prompts/gemini_menu_extractor_prompt.md)).
   - Map `option_groups[].linked_category_ids` into `INSERT INTO item_modifier_links ... SELECT p.tenant_id, p.id, ... FROM menu_items p WHERE p.category_id IN (...)`.
   - Map `option_groups[].linked_item_ids` directly into `INSERT INTO item_modifier_links (tenant_id, item_id, group_id, sort_order, is_disabled)`.
2. A legacy extractor JSON (`categories` + `customizations` + `bundle_rule`) or raw text/flyer specs provided by Sales/user.

With `UNIFIED_MENU_ENABLED="true"` (`unifiedMenu: true`), the **Canonical Option Groups Schema** (`modifier_groups`, `modifier_options`, `item_modifier_links`) in `benmi-worker-official/src/modules/option-groups.ts` is the **sole runtime authority** for all item options, bundles/combos, and order-level customizations.

### Non-Negotiable Unified Menu Rules
1. **Explicit Item-Level Links (`item_modifier_links`) Only**:
   - Runtime (`effectiveGroups()`) resolves **ONLY explicit `item_modifier_links`**.
   - Legacy `category_modifier_links` and `menu_categories.applied_modifiers` are **ignored** for `unifiedOptions` items.
   - Every product that uses a modifier or bundle group **MUST** have a row in `item_modifier_links (tenant_id, item_id, group_id, option_ids_json, is_disabled, sort_order)`.
   - To attach a shared group (e.g., flavor/spice/toppings) to all items in specific categories, use an `INSERT INTO item_modifier_links ... SELECT` query joining `menu_items`.
2. **`included = 0` (Choice) vs. `included = 1` (Fixed Bundle)**:
   - **`included = 0` (`type: 'choice'`)**: Customer selects between `min_selection` and `max_selection` options (e.g., *"Choose 1 drink from Cola/Green Tea for $0"*, *"Choose 1 noodle type"*, or optional toppings). **Even when the choice is free ($0 surcharge / included in meal price), `included` MUST be `0`!**
   - **`included = 1` (`type: 'fixed'`)**: Fixed component where **EVERY** option in the group is automatically included in its `included_quantity`, and `min_selection = max_selection = SUM(included_quantity)`. Never set `included = 1` on a "choose 1 of N" group, or `validateOptionGraph()` will throw `INSUFFICIENT_OPTIONS`.
3. **`auto_popup` Behavior**:
   - **`auto_popup = 1`**: Immediately opens the Dish Configurator modal when tapping `+` (required whenever `min_selection > 0` or `included = 1`, such as mandatory noodle/base choice, bento side dishes, or combo drink selection).
   - **`auto_popup = 0`**: Optional customization (`min_selection = 0`, `included = 0`). Tapping `+` adds the dish immediately (applying any `is_default = 1` option), while customers can tap `客製化` / Customize to change flavors or add toppings.
4. **Graph Integrity (`validateOptionGraph`)**:
   - **No Self-Links (`OPTION_PRODUCT_CYCLE`)**: A `modifier_group` must never be linked via `item_modifier_links` to a `menu_item` that is referenced as a `product_id` (or inside `sources_json`) within that same group.
   - **Option Count (`INSUFFICIENT_OPTIONS`)**: Every choice group (`included = 0`) must have at least `max(1, min_selection)` options (either in `modifier_options` or resolved via `sources_json`). If `allow_repeats = 0`, `max_selection` must not exceed the number of options in the group.
   - **Order-Scope Isolation (`INVALID_ORDER_OPTION_PRODUCT`)**: Options in a group with `scope = 'order'` must have `product_id = NULL`.
5. **No Hybrid Collision & Display Name Integrity (Zero Dual-Key / Raw ID)**:
   - **No Legacy Hybrid Pollution**: When a tenant uses Unified Option Groups (`modifier_groups`), leave `menu_categories.applied_modifiers` empty (`'[]'`) or omit it. Never link a legacy category modifier to dishes that already have `item_modifier_links`.
   - **Display Names in Selections**: Client-side customization drafts (`draft.single`, `customizeData`) must store human-readable display names (`opt.name`), NEVER database IDs (`optId`).
   - **Single Canonical Key**: Modifiers must only use one canonical key (`group.slug || group.id`). Never write dual keys into selection maps.

---

### Classify by Scope Before Generating SQL (The 3-Level Hierarchy)

#### Level 1 — Order-Wide Customizations (`scope = 'order'`)
- Choices selected once for the whole order/bag (e.g., plastic bag `提袋加購`, disposable bowl threshold rule, shared pepper/chili/garlic seasoning).
- **Canonical Storage**:
  - `modifier_groups` with `scope = 'order'`, `auto_popup = 0`, `is_required = 0` (or `1`), `min_selection = 0`, `max_selection = 1` (`selection_type = 'single'`) or `N` (`selection_type = 'multiple'`).
  - `modifier_options` with `product_id = NULL`, `price` (surcharge), `is_default` (`1` for default radio choice), and optional `eligibility_rules_json` / `sub_options_json`.
- **Shadow Storage**: Also upsert `menu_customizations (id, tenant_id, key, title, type, sort_order, options_json)` for backward compatibility.
- **Threshold-Gated & Auto-Promotion Rule (e.g., Free Bowl over $250)**:
  - Use `eligibility_rules_json` on the threshold option in `modifier_options`:
    ```json
    [{"rule_type":"min_order_subtotal","min_order_subtotal":250,"threshold_basis":"food_subtotal","error_message":"滿 250 元即可免費附提碗"}]
    ```
  - In a single-select (`radio`) group pairing a paid fallback option (e.g., `加購提碗 (+5元)`, `price = 5`, `is_default = 1`, `eligibility_rules_json = '[]'`) with a free threshold option (`滿$250免費附提碗`, `price = 0`, `min_order_subtotal: 250`), the client cart automatically promotes selection to the `$0` option (and disables the paid option) when food subtotal $\ge 250$, and reverts to the paid option if subtotal drops $< 250$.

#### Level 2 — Mandatory Core Component / Starch / Combo (`scope = 'item'`, `min_selection >= 1`, `auto_popup = 1`)
- If a dish **cannot be prepared** without choosing from a set of bases/drinks/sides (e.g., 鍋燒 MUST choose 1 noodle: 意麵/冬粉/烏龍; Combo MUST choose 1 drink; Bento MUST choose N sides):
- **Canonical Storage**:
  - `modifier_groups` with `scope = 'item'`, `selection_type = 'single'` (or `'multiple'`), `is_required = 1`, `min_selection = 1`, `max_selection = 1`, `included = 0`, `auto_popup = 1`, `labels_json = '{"zh-TW":"請選擇 1 樣...","vi":"Chọn 1 ..."}'`.
  - **Populating Options (Choose Method A or Method B)**:
    - **Method A (Direct `modifier_options` — Recommended)**: Insert choices directly into `modifier_options` (set `product_id = '<menu_item_id>'` if the option should inherit live stock/name/image from a catalog item, or `product_id = NULL` for self-contained options).
    - **Method B (Bundle Pool via `sources_json`)**: Seed pool items into `menu_categories` with `category_type = 'bundle_pool'` (hidden from standalone catalog), and set `sources_json = '[{"type":"category","categoryId":"cat_<tenant>_pool"}]'` on `modifier_groups`.
  - Bind to the parent dish via `item_modifier_links`.
  - *(Optional Shadow Sync)*: Upsert `menu_bundle_rules` for legacy audit parity.

#### Level 3 — Dish-Level Modifiers & Add-on Toppings (`scope = 'item'`)
- Optional or defaultable adjustments to an already complete dish (e.g., `口味選擇`, `辣度`, `加料選項` extra cheese/meat, drink ice/sugar):
- **Canonical Storage**:
  - `modifier_groups` with `scope = 'item'`, `included = 0`.
  - For passive/defaultable single choice (e.g., flavor/spice where tapping `+` should add immediately with default flavor): set `is_required = 0`, `min_selection = 0`, `max_selection = 1`, `auto_popup = 0`, and mark the default option in `modifier_options` with `is_default = 1`.
  - For multi-select add-on toppings: set `selection_type = 'multiple'`, `is_required = 0`, `min_selection = 0`, `max_selection = N` (where `N <= total_options` if `allow_repeats = 0`), `auto_popup = 0`.
  - Bind to every applicable dish in `item_modifier_links`.

---

## 2. Step-by-Step Execution Workflow

### Step 1: File Location & Naming
1. Tenant SQL seed files live in `benmi-worker-official/seeds/tenants/<tenant_id>.sql`.
2. **Do NOT put tenant menu seeds into `migrations/`**. The `migrations/` directory is strictly reserved for platform-wide Schema DDL and verified data repair migrations.

### Step 2: Idempotent SQL Seed Template (Canonical Unified Schema)
Use `INSERT ... ON CONFLICT DO UPDATE` so the seed file can be executed repeatedly without errors or duplicate records. Scope every write to `tenant_id`.

```sql
-- ==============================================================================
-- Tenant Seed: <tenant_id> (<brand_name>)
-- Description: Initial menu catalog, unified option groups, and store config
-- Execution (from benmi-worker-official/):
--   npx cf d1 execute <db_id> --file=seeds/tenants/<tenant_id>.sql --mode <dev|test|production>
-- ==============================================================================

-- 1. Tenants Table (Triggers automatically create tenant_lifecycle state='active')
INSERT INTO tenants (id, name)
VALUES ('<tenant_id>', '<brand_name>')
ON CONFLICT(id) DO UPDATE SET name = excluded.name;

-- 2. Tenant Config Table
INSERT INTO tenant_config (
    tenant_id, brand_name, brand_color, store_address, operating_hours,
    delivery_policy, default_password, locale, allow_scheduled_pickup,
    allow_dine_in, store_status, liff_id, liff_url, order_prefix,
    features, cuisine_type, is_marketplace_visible, is_active, latitude, longitude,
    groq_model, openrouter_model, customer_order_domain, legacy_liff_endpoint_url
) VALUES (
    '<tenant_id>',
    '<brand_name>',
    '<brand_color>',
    '<store_address>',
    '<operating_hours>',
    '<delivery_policy>',
    '12345678',
    '<zh-TW | vi>',
    <1 or 0>,
    <1 or 0>,
    'open',
    '2009560906-c5taZfiY',
    'https://liff.line.me/2009560906-c5taZfiY',
    '<unique_order_prefix>',
    '["reports", "flex_notifications"]',
    '<taiwanese | vietnamese | korean | snack | drinks>',
    1,
    1,
    <latitude>,
    <longitude>,
    'openai/gpt-oss-20b',
    'google/gemma-4-26b-a4b-it:free',
    'blabfood',
    'https://benmi-order.pages.dev/?tenant_id=<tenant_id>'
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
    liff_id = excluded.liff_id,
    liff_url = excluded.liff_url,
    order_prefix = excluded.order_prefix,
    features = excluded.features,
    cuisine_type = excluded.cuisine_type,
    is_marketplace_visible = excluded.is_marketplace_visible,
    is_active = excluded.is_active,
    latitude = excluded.latitude,
    longitude = excluded.longitude,
    groq_model = excluded.groq_model,
    openrouter_model = excluded.openrouter_model,
    customer_order_domain = excluded.customer_order_domain,
    legacy_liff_endpoint_url = excluded.legacy_liff_endpoint_url;

-- 3. Menu Categories (Catalog & Optional Bundle Pools)
INSERT INTO menu_categories (
    id, tenant_id, name, short_name, slug, category_type, selection_type,
    is_required, min_selection, max_selection, sort_order,
    allow_customization, applied_modifiers
) VALUES
('cat_<tenant>_main',   '<tenant_id>', '招牌主食', '主食', 'main',   'catalog',     'single', 0, 0, 1, 1, 1, '[]'),
('cat_<tenant>_combos', '<tenant_id>', '超值套餐', '套餐', 'combos', 'catalog',     'single', 0, 0, 1, 2, 1, '[]'),
('cat_<tenant>_drinks_pool', '<tenant_id>', '套餐飲料池', '飲料', 'drink-choice', 'bundle_pool', 'single', 1, 1, 1, 9, 0, '[]')
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

-- 4. Menu Items (Catalog Products & Pool Items)
INSERT INTO menu_items (
    id, tenant_id, category_id, name, price, description, badge_text, is_recommended, sort_order
) VALUES
('<tenant>_main_01',  '<tenant_id>', 'cat_<tenant>_main',        '招牌脆皮雞排', 85,  NULL, '招牌必點', 1, 1),
('<tenant>_combo_01', '<tenant_id>', 'cat_<tenant>_combos',      '個人獨享餐',   150, '含雞排+點心+飲料擇一', '超值', 1, 1),
('<tenant>_drk_01',   '<tenant_id>', 'cat_<tenant>_drinks_pool', '可樂',         0,   NULL, NULL, 0, 1),
('<tenant>_drk_02',   '<tenant_id>', 'cat_<tenant>_drinks_pool', '無糖綠茶',     0,   NULL, NULL, 0, 2)
ON CONFLICT(id) DO UPDATE SET
    tenant_id = excluded.tenant_id,
    category_id = excluded.category_id,
    name = excluded.name,
    price = excluded.price,
    description = excluded.description,
    badge_text = excluded.badge_text,
    is_recommended = excluded.is_recommended,
    sort_order = excluded.sort_order;

-- 5. Level 1: Order-Wide Customizations (Canonical + Legacy Shadow)
INSERT INTO menu_customizations (id, tenant_id, key, title, type, sort_order, options_json)
VALUES (
    'custom_<tenant>_bag',
    '<tenant_id>',
    'bag',
    '響應環保 / 提袋加購',
    'radio',
    0,
    '[{"id":"opt_<tenant>_bag_none","name":"不需要提袋","price":0,"is_default":true},{"id":"opt_<tenant>_bag_buy","name":"購買提袋 (+1元)","price":1,"is_default":false}]'
)
ON CONFLICT(id) DO UPDATE SET
    tenant_id = excluded.tenant_id,
    key = excluded.key,
    title = excluded.title,
    type = excluded.type,
    sort_order = excluded.sort_order,
    options_json = excluded.options_json;

INSERT INTO modifier_groups (
    id, tenant_id, name, selection_type, is_required, min_selection, max_selection,
    sort_order, scope, auto_popup, source_metadata_json
) VALUES (
    'mg_cust_<tenant>_bag',
    '<tenant_id>',
    '響應環保 / 提袋加購',
    'single',
    0,
    0,
    1,
    0,
    'order',
    0,
    '{"source_table":"menu_customizations","source_id":"custom_<tenant>_bag","legacy_key":"bag","legacy_type":"radio"}'
)
ON CONFLICT(id) DO UPDATE SET
    name = excluded.name,
    selection_type = excluded.selection_type,
    is_required = excluded.is_required,
    min_selection = excluded.min_selection,
    max_selection = excluded.max_selection,
    sort_order = excluded.sort_order,
    scope = excluded.scope,
    auto_popup = excluded.auto_popup;

INSERT INTO modifier_options (
    id, tenant_id, group_id, name, price, is_default, sort_order,
    sub_options_json, eligibility_rules_json, source_metadata_json
) VALUES
('opt_<tenant>_bag_none', '<tenant_id>', 'mg_cust_<tenant>_bag', '不需要提袋',     0, 1, 0, '[]', '[]', '{}'),
('opt_<tenant>_bag_buy',  '<tenant_id>', 'mg_cust_<tenant>_bag', '購買提袋 (+1元)', 1, 0, 1, '[]', '[]', '{}')
ON CONFLICT(id) DO UPDATE SET
    name = excluded.name,
    price = excluded.price,
    is_default = excluded.is_default,
    sort_order = excluded.sort_order,
    sub_options_json = excluded.sub_options_json,
    eligibility_rules_json = excluded.eligibility_rules_json;

-- 6. Level 2: Mandatory Core Choice / Combo Drink (auto_popup = 1, included = 0)
INSERT INTO modifier_groups (
    id, tenant_id, name, selection_type, is_required, min_selection, max_selection,
    sort_order, scope, allow_repeats, included, sources_json, labels_json, auto_popup, source_metadata_json
) VALUES (
    'mg_item_<tenant>_combo_drink',
    '<tenant_id>',
    '飲料選擇 (二擇一)',
    'single',
    1,
    1,
    1,
    0,
    'item',
    0,
    0, -- MUST be 0 for "choose 1 of N" even when price is $0!
    '[{"type":"category","categoryId":"cat_<tenant>_drinks_pool"}]',
    '{"zh-TW":"請選擇 1 樣飲料","vi":"Chọn 1 loại đồ uống"}',
    1,
    '{}'
)
ON CONFLICT(id) DO UPDATE SET
    name = excluded.name,
    selection_type = excluded.selection_type,
    is_required = excluded.is_required,
    min_selection = excluded.min_selection,
    max_selection = excluded.max_selection,
    sort_order = excluded.sort_order,
    scope = excluded.scope,
    allow_repeats = excluded.allow_repeats,
    included = excluded.included,
    sources_json = excluded.sources_json,
    labels_json = excluded.labels_json,
    auto_popup = excluded.auto_popup;

INSERT INTO item_modifier_links (tenant_id, item_id, group_id, sort_order, is_disabled)
VALUES ('<tenant_id>', '<tenant>_combo_01', 'mg_item_<tenant>_combo_drink', 0, 0)
ON CONFLICT(tenant_id, item_id, group_id) DO UPDATE SET
    sort_order = excluded.sort_order,
    is_disabled = excluded.is_disabled;

-- 7. Level 3: Dish-Level Shared Modifier Group (Explicitly Linked to Items)
INSERT INTO modifier_groups (
    id, tenant_id, name, selection_type, is_required, min_selection, max_selection,
    sort_order, scope, allow_repeats, included, auto_popup, source_metadata_json
) VALUES (
    'mg_item_<tenant>_flavor',
    '<tenant_id>',
    '口味選擇',
    'single',
    0,
    0,
    1,
    1,
    'item',
    0,
    0,
    0,
    '{}'
)
ON CONFLICT(id) DO UPDATE SET
    name = excluded.name,
    selection_type = excluded.selection_type,
    is_required = excluded.is_required,
    min_selection = excluded.min_selection,
    max_selection = excluded.max_selection,
    sort_order = excluded.sort_order,
    scope = excluded.scope,
    included = excluded.included,
    auto_popup = excluded.auto_popup;

INSERT INTO modifier_options (
    id, tenant_id, group_id, name, price, is_default, sort_order,
    sub_options_json, eligibility_rules_json
) VALUES
('opt_<tenant>_fl_01', '<tenant_id>', 'mg_item_<tenant>_flavor', '椒鹽', 0, 1, 1, '[]', '[]'),
('opt_<tenant>_fl_02', '<tenant_id>', 'mg_item_<tenant>_flavor', '小辣', 0, 0, 2, '[]', '[]'),
('opt_<tenant>_fl_03', '<tenant_id>', 'mg_item_<tenant>_flavor', '梅粉', 0, 0, 3, '[]', '[]')
ON CONFLICT(id) DO UPDATE SET
    name = excluded.name,
    price = excluded.price,
    is_default = excluded.is_default,
    sort_order = excluded.sort_order;

-- Materialize explicit item_modifier_links for all items in target catalog categories
INSERT INTO item_modifier_links (tenant_id, item_id, group_id, sort_order)
SELECT p.tenant_id, p.id, 'mg_item_<tenant>_flavor', 1
FROM menu_items p
WHERE p.tenant_id = '<tenant_id>'
  AND p.category_id IN ('cat_<tenant>_main', 'cat_<tenant>_combos')
ON CONFLICT(tenant_id, item_id, group_id) DO NOTHING;

-- 8. Bump Catalog Revision
INSERT INTO menu_catalog_revisions (tenant_id, revision)
VALUES ('<tenant_id>', 1)
ON CONFLICT(tenant_id) DO UPDATE SET revision = revision + 1;
```

---

### Step 3: Execute Seed on D1 (`cf` CLI)
Run from `benmi-worker-official/` using Cloudflare's `cf` CLI (or `node scripts/seed-new-tenants-unified-menu.mjs --mode <dev|test|production>` if using a runner script).

| Environment | `--mode` | D1 Database Name | D1 Database ID | KV `ORDER_STATE` Namespace ID |
| :--- | :--- | :--- | :--- | :--- |
| **Dev** | `dev` | `blab-db-dev` | `40b67d8a-29e0-40c1-9ce2-b76f76864e95` | `f85c539e10df45049780abe25631f082` |
| **Staging** | `test` | `blab-db-test` | `c0152835-7d42-4545-8cb4-6658dfc7e97d` | `ad5b1e14aad4486fb2ffcd9961cadf3a` |
| **Production** | `production` | `blab-db-production` | `48479f91-eec7-4da2-b044-edaaf622f195` | `4800c4ce106043de89baa2aa7a7676b0` |

```bash
cd benmi-worker-official

# Execute SQL statements via cf d1 query (or script runner):
npx cf d1 query <database_id> --sql "<SQL>" --mode <dev|test|production>
```

---

### Step 4: Invalidate KV Edge Cache (`bootstrap:v2` & `bootstrap`)
Unified Menu reads/writes `tenant:<tenant_id>:bootstrap:v2` as well as legacy `tenant:<tenant_id>:bootstrap`, `tenant:<tenant_id>:menu`, and `tenant:<tenant_id>:config_cache`.

Always warm/refresh the cache via `nocache=1` or delete the KV keys in the target environment's `ORDER_STATE` namespace:
```bash
# Immediate cache bypass & re-warm via Bootstrap API (updates KV cache on D1 read):
curl -s "https://platform-worker-dev.thuanmnc.workers.dev/api/tenant/bootstrap?tenant_id=<tenant_id>&nocache=1" | jq '.unifiedMenu, .menuComplete'
```

---

### Step 5: Verification Checklist & Test Links
Before completing the task, verify:
1. **Option Graph Validation**: Every item with option links projects a valid `bundleRule` (`version: 3`) in `/api/tenant/bootstrap?tenant_id=<tenant_id>&nocache=1`, and `/api/menu/options?tenant_id=<tenant_id>` returns `complete: true` without `INSUFFICIENT_OPTIONS` or `OPTION_PRODUCT_CYCLE`.
2. **Choice vs. Fixed Semantics**: Choice groups have `type: "choice"` (`included: false`) and `eligibleItems.length >= minQuantity`.
3. **Order-Level Customizations**: `customizations` array contains all `scope = 'order'` groups with accurate prices, defaults, and `minOrderSubtotal` threshold rules.
4. **No Childish Emojis**: Category titles, item names, badges, and customization titles follow `ui-design-principles.md` (clean typography, no decorative emojis like `🪑`, `➕`, `🛍️`, `📦`, `🎁`).

Provide clickable links to test the seeded tenant (using the new `blabfood.app` domains):
- **Customer Menu (LIFF / Web)**: `https://order.blabfood.app/<tenant_id>`
- **POS Dashboard (Tablet / Staff)**: `https://pos.blabfood.app/<tenant_id>`
- **Marketplace (Explore)**: `https://explore.blabfood.app`
- **LINE Webhook URL**: `https://benmi-worker-official.thuanmnc.workers.dev/webhook/<tenant_id>`
- **Bootstrap API Check**: `https://benmi-worker-official.thuanmnc.workers.dev/api/tenant/bootstrap?tenant_id=<tenant_id>&nocache=1`
