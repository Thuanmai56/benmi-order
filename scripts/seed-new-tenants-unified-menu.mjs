import { execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');
const WORKER_DIR = path.resolve(REPO_ROOT, 'benmi-worker-official');

const mode = process.argv.includes('--mode') 
  ? process.argv[process.argv.indexOf('--mode') + 1] 
  : 'dev';

const DB_MAP = {
  dev: '40b67d8a-29e0-40c1-9ce2-b76f76864e95',        // blab-db-dev
  test: 'c0152835-7d42-4545-8cb4-6658dfc7e97d',       // blab-db-test (staging)
  production: '48479f91-eec7-4da2-b044-edaaf622f195'  // blab-db-production
};

const dbId = DB_MAP[mode];
if (!dbId) {
  console.error(`Invalid mode: ${mode}. Expected dev | test | production.`);
  process.exit(1);
}

console.log(`================================================================`);
console.log(`🚀 Seeding Unified Menu Data for nongfumingjia & yanxiansuji`);
console.log(`   Target: ${mode} (${dbId})`);
console.log(`================================================================\n`);

const sqlStatements = [
  // 1. nongfumingjia - Order-level Bag Customization
  `INSERT INTO modifier_groups (
    id, tenant_id, name, selection_type, is_required, min_selection, max_selection, sort_order, scope, auto_popup, source_metadata_json
  ) VALUES (
    'mg_cust_nongfumingjia_custom_nfm_bag',
    'nongfumingjia',
    '✦ 響應環保 / 提袋加購',
    'single',
    0,
    0,
    1,
    0,
    'order',
    0,
    '{"source_table":"menu_customizations","source_id":"custom_nfm_bag","legacy_key":"bag","legacy_type":"radio"}'
  ) ON CONFLICT(id) DO UPDATE SET
    name = excluded.name,
    selection_type = excluded.selection_type,
    is_required = excluded.is_required,
    min_selection = excluded.min_selection,
    max_selection = excluded.max_selection,
    sort_order = excluded.sort_order,
    scope = excluded.scope;`,

  `INSERT INTO modifier_options (
    id, tenant_id, group_id, name, price, is_default, sort_order, sub_options_json, eligibility_rules_json, source_metadata_json
  ) VALUES
  (
    'opt_nfm_bag_none',
    'nongfumingjia',
    'mg_cust_nongfumingjia_custom_nfm_bag',
    '不需要提袋',
    0,
    1,
    0,
    '[]',
    '[]',
    '{"source_table":"menu_customizations.options_json","source_group_id":"custom_nfm_bag","source_option_id":"bag_none"}'
  ),
  (
    'opt_nfm_bag_buy',
    'nongfumingjia',
    'mg_cust_nongfumingjia_custom_nfm_bag',
    '購買提袋 (+1元)',
    1,
    0,
    1,
    '[]',
    '[]',
    '{"source_table":"menu_customizations.options_json","source_group_id":"custom_nfm_bag","source_option_id":"bag_buy"}'
  ) ON CONFLICT(id) DO UPDATE SET
    name = excluded.name,
    price = excluded.price,
    is_default = excluded.is_default,
    sort_order = excluded.sort_order;`,

  // 2. yanxiansuji - Make sure menu_customizations has custom_yzs_bag
  `INSERT INTO menu_customizations (id, tenant_id, key, title, type, sort_order, options_json)
  VALUES (
    'custom_yzs_bag',
    'yanxiansuji',
    'bag',
    '✦ 響應環保 / 提袋加購',
    'radio',
    0,
    '[{"id":"bag_none","name":"不需要提袋","price":0,"is_default":true},{"id":"bag_buy","name":"購買提袋 (+1元)","price":1,"is_default":false}]'
  ) ON CONFLICT(id) DO UPDATE SET
    tenant_id = excluded.tenant_id,
    key = excluded.key,
    title = excluded.title,
    type = excluded.type,
    sort_order = excluded.sort_order,
    options_json = excluded.options_json;`,

  // 3. yanxiansuji - Order-level Bag Customization in modifier_groups
  `INSERT INTO modifier_groups (
    id, tenant_id, name, selection_type, is_required, min_selection, max_selection, sort_order, scope, auto_popup, source_metadata_json
  ) VALUES (
    'mg_cust_yanxiansuji_custom_yzs_bag',
    'yanxiansuji',
    '✦ 響應環保 / 提袋加購',
    'single',
    0,
    0,
    1,
    0,
    'order',
    0,
    '{"source_table":"menu_customizations","source_id":"custom_yzs_bag","legacy_key":"bag","legacy_type":"radio"}'
  ) ON CONFLICT(id) DO UPDATE SET
    name = excluded.name,
    selection_type = excluded.selection_type,
    is_required = excluded.is_required,
    min_selection = excluded.min_selection,
    max_selection = excluded.max_selection,
    sort_order = excluded.sort_order,
    scope = excluded.scope;`,

  `INSERT INTO modifier_options (
    id, tenant_id, group_id, name, price, is_default, sort_order, sub_options_json, eligibility_rules_json, source_metadata_json
  ) VALUES
  (
    'opt_yzs_bag_none',
    'yanxiansuji',
    'mg_cust_yanxiansuji_custom_yzs_bag',
    '不需要提袋',
    0,
    1,
    0,
    '[]',
    '[]',
    '{"source_table":"menu_customizations.options_json","source_group_id":"custom_yzs_bag","source_option_id":"bag_none"}'
  ),
  (
    'opt_yzs_bag_buy',
    'yanxiansuji',
    'mg_cust_yanxiansuji_custom_yzs_bag',
    '購買提袋 (+1元)',
    1,
    0,
    1,
    '[]',
    '[]',
    '{"source_table":"menu_customizations.options_json","source_group_id":"custom_yzs_bag","source_option_id":"bag_buy"}'
  ) ON CONFLICT(id) DO UPDATE SET
    name = excluded.name,
    price = excluded.price,
    is_default = excluded.is_default,
    sort_order = excluded.sort_order;`,

  // 4. yanxiansuji - Category-level Flavor Group (口味選擇)
  `INSERT INTO modifier_groups (
    id, tenant_id, name, selection_type, is_required, min_selection, max_selection, sort_order, scope, auto_popup, source_metadata_json
  ) VALUES (
    'mg_cat_yanxiansuji_cat_yanzisuchun_flavor',
    'yanxiansuji',
    '口味選擇',
    'single',
    0,
    0,
    1,
    7,
    'category',
    0,
    '{"source_table":"menu_categories","source_id":"cat_yanzisuchun_flavor","slug":"cat_yanzisuchun_flavor","category_type":"modifier"}'
  ) ON CONFLICT(id) DO UPDATE SET
    name = excluded.name,
    selection_type = excluded.selection_type,
    is_required = excluded.is_required,
    min_selection = excluded.min_selection,
    max_selection = excluded.max_selection,
    sort_order = excluded.sort_order,
    scope = excluded.scope;`,

  `INSERT INTO modifier_options (
    id, tenant_id, group_id, name, price, is_default, sort_order, sub_options_json, eligibility_rules_json, source_metadata_json
  ) VALUES
  ('opt_yzs_fl_01', 'yanxiansuji', 'mg_cat_yanxiansuji_cat_yanzisuchun_flavor', '椒鹽',     0, 1, 1,  '[]', '[]', '{"source_table":"menu_items","source_item_id":"yzs_fl_01"}'),
  ('opt_yzs_fl_02', 'yanxiansuji', 'mg_cat_yanxiansuji_cat_yanzisuchun_flavor', '胡椒',     0, 0, 2,  '[]', '[]', '{"source_table":"menu_items","source_item_id":"yzs_fl_02"}'),
  ('opt_yzs_fl_03', 'yanxiansuji', 'mg_cat_yanxiansuji_cat_yanzisuchun_flavor', '海苔椒鹽', 0, 0, 3,  '[]', '[]', '{"source_table":"menu_items","source_item_id":"yzs_fl_03"}'),
  ('opt_yzs_fl_04', 'yanxiansuji', 'mg_cat_yanxiansuji_cat_yanzisuchun_flavor', '小辣',     0, 0, 4,  '[]', '[]', '{"source_table":"menu_items","source_item_id":"yzs_fl_04"}'),
  ('opt_yzs_fl_05', 'yanxiansuji', 'mg_cat_yanxiansuji_cat_yanzisuchun_flavor', '山葵椒鹽', 0, 0, 5,  '[]', '[]', '{"source_table":"menu_items","source_item_id":"yzs_fl_05"}'),
  ('opt_yzs_fl_06', 'yanxiansuji', 'mg_cat_yanxiansuji_cat_yanzisuchun_flavor', '青花椒鹽', 0, 0, 6,  '[]', '[]', '{"source_table":"menu_items","source_item_id":"yzs_fl_06"}'),
  ('opt_yzs_fl_07', 'yanxiansuji', 'mg_cat_yanxiansuji_cat_yanzisuchun_flavor', '咖哩椒鹽', 0, 0, 7,  '[]', '[]', '{"source_table":"menu_items","source_item_id":"yzs_fl_07"}'),
  ('opt_yzs_fl_08', 'yanxiansuji', 'mg_cat_yanxiansuji_cat_yanzisuchun_flavor', '沙茶椒鹽', 0, 0, 8,  '[]', '[]', '{"source_table":"menu_items","source_item_id":"yzs_fl_08"}'),
  ('opt_yzs_fl_09', 'yanxiansuji', 'mg_cat_yanxiansuji_cat_yanzisuchun_flavor', '胡椒梅粉', 0, 0, 9,  '[]', '[]', '{"source_table":"menu_items","source_item_id":"yzs_fl_09"}'),
  ('opt_yzs_fl_10', 'yanxiansuji', 'mg_cat_yanxiansuji_cat_yanzisuchun_flavor', '梅粉',     0, 0, 10, '[]', '[]', '{"source_table":"menu_items","source_item_id":"yzs_fl_10"}')
  ON CONFLICT(id) DO UPDATE SET
    name = excluded.name,
    price = excluded.price,
    is_default = excluded.is_default,
    sort_order = excluded.sort_order;`,

  `INSERT INTO item_modifier_links (tenant_id, item_id, group_id, sort_order)
  SELECT p.tenant_id, p.id, mapping.column3, mapping.column4
  FROM (VALUES
  ('yanxiansuji', 'cat_yanzisuchun_signature', 'mg_cat_yanxiansuji_cat_yanzisuchun_flavor', 0),
  ('yanxiansuji', 'cat_yanzisuchun_classic',   'mg_cat_yanxiansuji_cat_yanzisuchun_flavor', 0),
  ('yanxiansuji', 'cat_yanzisuchun_snack',     'mg_cat_yanxiansuji_cat_yanzisuchun_flavor', 0),
  ('yanxiansuji', 'cat_yanzisuchun_fries',     'mg_cat_yanxiansuji_cat_yanzisuchun_flavor', 0),
  ('yanxiansuji', 'cat_yanzisuchun_veggies',   'mg_cat_yanxiansuji_cat_yanzisuchun_flavor', 0),
  ('yanxiansuji', 'cat_yanzisuchun_combos',    'mg_cat_yanxiansuji_cat_yanzisuchun_flavor', 0)
  ) AS mapping
  JOIN menu_items p ON p.tenant_id = mapping.column1 AND p.category_id = mapping.column2
  WHERE 1
  ON CONFLICT(tenant_id, item_id, group_id) DO NOTHING;`,

  // 5. yanxiansuji - Combo / Bundle Rule for 個人獨享餐 (yzs_cb_04)
  `INSERT INTO modifier_groups (
    id, tenant_id, name, selection_type, is_required, min_selection, max_selection, sort_order, scope,
    allow_repeats, included, sources_json, labels_json, auto_popup, source_metadata_json
  ) VALUES (
    'ug_rule_yzs_cb_04_drink_0',
    'yanxiansuji',
    '飲料選擇 (二擇一)',
    'single',
    1,
    1,
    1,
    0,
    'item',
    0,
    0,
    '[{"type":"category","categoryId":"cat_yanzisuchun_drink_choice"}]',
    '{"zh-TW":"請選擇 1 樣飲料","vi":"Chọn 1 loại đồ uống"}',
    1,
    '{"legacyBundleRuleId":"rule_yzs_cb_04_drink","legacyGroupId":"drink-choice","legacySurcharges":{}}'
  ) ON CONFLICT(id) DO UPDATE SET
    name = excluded.name,
    selection_type = excluded.selection_type,
    is_required = excluded.is_required,
    min_selection = excluded.min_selection,
    max_selection = excluded.max_selection,
    sort_order = excluded.sort_order,
    scope = excluded.scope,
    included = excluded.included,
    sources_json = excluded.sources_json,
    labels_json = excluded.labels_json,
    auto_popup = excluded.auto_popup;`,

  `INSERT INTO item_modifier_links (tenant_id, item_id, group_id, sort_order, is_disabled)
  VALUES (
    'yanxiansuji',
    'yzs_cb_04',
    'ug_rule_yzs_cb_04_drink_0',
    0,
    0
  ) ON CONFLICT(tenant_id, item_id, group_id) DO UPDATE SET
    sort_order = excluded.sort_order,
    is_disabled = excluded.is_disabled;`,

  // 6. Update catalog revisions to trigger cache reload
  `INSERT INTO menu_catalog_revisions (tenant_id, revision)
  VALUES ('nongfumingjia', 1)
  ON CONFLICT(tenant_id) DO UPDATE SET revision = revision + 1;`,

  `INSERT INTO menu_catalog_revisions (tenant_id, revision)
  VALUES ('yanxiansuji', 1)
  ON CONFLICT(tenant_id) DO UPDATE SET revision = revision + 1;`
];

for (let i = 0; i < sqlStatements.length; i++) {
  const sql = sqlStatements[i].trim();
  const label = sql.split('\n')[0].slice(0, 50);
  process.stdout.write(`[${i + 1}/${sqlStatements.length}] Executing: ${label}... `);
  try {
    const cmd = `npx cf d1 query ${dbId} --sql "${sql.replace(/"/g, '\\"')}" --mode ${mode}`;
    execSync(cmd, { cwd: WORKER_DIR, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    console.log('✓ OK');
  } catch (err) {
    console.error('✗ ERROR');
    console.error(err.stderr || err.message);
    process.exit(1);
  }
}

console.log('\n✅ All SQL statements executed successfully!');
