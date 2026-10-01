import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import { fileURLToPath } from 'url';
import { executeD1Query } from './inventory.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '../..');
const WORKER_DIR = path.resolve(REPO_ROOT, 'benmi-worker-official');

const SENSITIVE_TENANT_CONFIG_COLS = [
  'line_channel_token',
  'line_channel_secret',
  'liff_id',
  'liff_url',
  'groq_api_key',
  'groq_model',
  'openrouter_api_key',
  'openrouter_model'
];

function esc(val) {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'number') return val;
  if (typeof val === 'boolean') return val ? 1 : 0;
  return `'${String(val).replace(/'/g, "''")}'`;
}

export async function runFullSync() {
  console.log('=================================================================');
  console.log('🚀 BẮT ĐẦU ĐỒNG BỘ NGUYÊN TRẠNG DỮ LIỆU TỪ PRODUCTION SANG DEV');
  console.log('   (Giữ nguyên LINE configs, LIFF ID và Infra API Keys trên Dev)');
  console.log('=================================================================\n');

  // 1. Sao lưu sensitive config hiện tại trên Dev
  console.log('[FullSync] 1. Sao lưu cấu hình LINE & Infra hiện có trên Dev...');
  const devTenantConfigs = executeD1Query(
    'blab-db-dev',
    'SELECT tenant_id, line_channel_token, line_channel_secret, liff_id, liff_url, groq_api_key, groq_model, openrouter_api_key, openrouter_model FROM tenant_config;',
    true,
    'dev'
  );

  const devTenantConfigMap = new Map();
  for (const tc of devTenantConfigs) {
    devTenantConfigMap.set(tc.tenant_id, tc);
  }

  console.log(`  ✓ Đã lưu cấu hình của ${devTenantConfigs.length} tenant_configs từ Dev.`);

  // 2. Trích xuất dữ liệu gốc từ Production
  console.log('\n[FullSync] 2. Trích xuất toàn bộ dữ liệu gốc từ Production...');
  const prodTenants = executeD1Query('blab-db-production', 'SELECT * FROM tenants ORDER BY id;', true);
  const prodTenantConfigs = executeD1Query('blab-db-production', 'SELECT * FROM tenant_config ORDER BY tenant_id;', true);
  const prodCategories = executeD1Query('blab-db-production', 'SELECT * FROM menu_categories ORDER BY tenant_id, sort_order;', true);
  const prodItems = executeD1Query('blab-db-production', 'SELECT * FROM menu_items ORDER BY tenant_id, sort_order;', true);
  const prodCustomizations = executeD1Query('blab-db-production', 'SELECT * FROM menu_customizations ORDER BY tenant_id, sort_order;', true);
  const prodCustomRules = executeD1Query('blab-db-production', 'SELECT * FROM menu_customization_option_rules ORDER BY tenant_id, id;', true);
  const prodBundleRules = executeD1Query('blab-db-production', 'SELECT * FROM menu_bundle_rules ORDER BY tenant_id, id;', true);

  console.log(`  - tenants: ${prodTenants.length} rows`);
  console.log(`  - tenant_config: ${prodTenantConfigs.length} rows`);
  console.log(`  - menu_categories: ${prodCategories.length} rows`);
  console.log(`  - menu_items: ${prodItems.length} rows`);
  console.log(`  - menu_customizations: ${prodCustomizations.length} rows`);
  console.log(`  - menu_customization_option_rules: ${prodCustomRules.length} rows`);
  console.log(`  - menu_bundle_rules: ${prodBundleRules.length} rows`);

  // 3. Đọc dữ liệu canonical đã kiểm chứng từ T03/T06
  console.log('\n[FullSync] 3. Đọc dữ liệu Canonical chuẩn hóa (Schema mới)...');
  const idMapPath = path.resolve(REPO_ROOT, 'docs/proposals/full_menu_schema_migration/id-map.json');
  const idMap = JSON.parse(fs.readFileSync(idMapPath, 'utf8'));

  const canonicalGroups = idMap.groups.map(g => g.data);
  const canonicalOptions = idMap.options.map(o => o.data);
  const canonicalLinks = idMap.category_links.map(l => ({
    tenant_id: l.tenant_id,
    category_id: l.category_id,
    group_id: l.group_id,
    sort_order: l.sort_order ?? 0
  }));

  console.log(`  - modifier_groups: ${canonicalGroups.length} rows`);
  console.log(`  - modifier_options: ${canonicalOptions.length} rows`);
  console.log(`  - category_modifier_links: ${canonicalLinks.length} rows`);

  // 4. Chuẩn bị SQL
  console.log('\n[FullSync] 4. Chuẩn bị dữ liệu và câu lệnh SQL...');

  // 4.1 Clean SQL (dọn sạch toàn bộ menu cũ và test data trên Dev)
  const cleanSql = `
PRAGMA foreign_keys = OFF;
DELETE FROM item_modifier_links;
DELETE FROM category_modifier_links;
DELETE FROM modifier_options;
DELETE FROM modifier_groups;
DELETE FROM menu_bundle_rules;
DELETE FROM menu_customization_option_rules;
DELETE FROM menu_customizations;
DELETE FROM menu_items;
DELETE FROM menu_categories;
DELETE FROM tenant_config;
PRAGMA foreign_keys = ON;
`;

  // 4.2 Chuẩn hóa tenants (chỉ lấy 4 cột tương thích với schema tenants trên dev)
  const mergedTenants = prodTenants.map(t => ({
    id: t.id,
    name: t.name,
    created_at: t.created_at,
    updated_at: t.updated_at
  }));

  // 4.3 Chuẩn hóa tenant_config (bảo tồn nguyên trạng token, LIFF ID và infra keys của Dev)
  const mergedTenantConfigs = prodTenantConfigs.map(tc => {
    const devTc = devTenantConfigMap.get(tc.tenant_id);
    const row = { ...tc };
    for (const col of SENSITIVE_TENANT_CONFIG_COLS) {
      if (devTc && devTc[col] !== undefined && devTc[col] !== null) {
        row[col] = devTc[col];
      } else {
        if (col === 'liff_id') {
          row[col] = '2011224566-kLLdMjkq';
        } else if (col === 'liff_url') {
          row[col] = 'https://liff.line.me/2011224566-kLLdMjkq';
        } else {
          row[col] = null;
        }
      }
    }
    return row;
  });

  // Helper build INSERT statements
  const buildInserts = (table, rows, onConflict = '') => {
    if (!rows || rows.length === 0) return '';
    const cols = Object.keys(rows[0]);
    let sql = `PRAGMA foreign_keys = OFF;\n`;
    for (const r of rows) {
      const vals = cols.map(c => esc(r[c]));
      sql += `INSERT INTO ${table} (${cols.join(',')}) VALUES (${vals.join(',')}) ${onConflict};\n`;
    }
    sql += `PRAGMA foreign_keys = ON;\n`;
    return sql;
  };

  // Helper execute SQL string via temporary file with wrangler
  const executeBatchSql = (label, sql) => {
    const tmpFile = path.resolve(WORKER_DIR, `_tmp_sync_${Date.now()}_${Math.random().toString(36).slice(2, 6)}.sql`);
    fs.writeFileSync(tmpFile, sql, 'utf8');
    try {
      process.stdout.write(`  [Sync] Đang nạp ${label.padEnd(35)}... `);
      execFileSync('npx', ['wrangler', 'd1', 'execute', 'blab-db-dev', '--remote', '--env', 'dev', `--file=${path.basename(tmpFile)}`], {
        cwd: WORKER_DIR,
        encoding: 'utf8',
        maxBuffer: 100 * 1024 * 1024
      });
      console.log('Xong ✓');
    } finally {
      if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile);
    }
  };

  // 5. Thực thi tuần tự lên blab-db-dev
  console.log('\n[FullSync] 5. Bắt đầu áp dụng lên blab-db-dev...');

  // Bước 5.1: Dọn sạch bảng menu & config cũ trên dev
  executeBatchSql('Dọn sạch bảng thử nghiệm cũ', cleanSql);

  // Bước 5.2: Upsert tenants & tenant_config (bảo lưu credentials của Dev)
  executeBatchSql(
    'tenants (14 rows)',
    buildInserts('tenants', mergedTenants, 'ON CONFLICT(id) DO UPDATE SET name=excluded.name, updated_at=excluded.updated_at')
  );
  executeBatchSql('tenant_config (14 rows)', buildInserts('tenant_config', mergedTenantConfigs));

  // Bước 5.3: Nạp menu legacy gốc từ Production
  executeBatchSql(`menu_categories (${prodCategories.length} rows)`, buildInserts('menu_categories', prodCategories));

  // Menu items nạp theo chunks 100 rows
  for (let i = 0; i < prodItems.length; i += 100) {
    const chunk = prodItems.slice(i, i + 100);
    executeBatchSql(
      `menu_items (chunk ${Math.floor(i / 100) + 1}/${Math.ceil(prodItems.length / 100)})`,
      buildInserts('menu_items', chunk)
    );
  }

  executeBatchSql(`menu_customizations (${prodCustomizations.length} rows)`, buildInserts('menu_customizations', prodCustomizations));
  executeBatchSql(`menu_customization_option_rules (${prodCustomRules.length} rows)`, buildInserts('menu_customization_option_rules', prodCustomRules));
  executeBatchSql(`menu_bundle_rules (${prodBundleRules.length} rows)`, buildInserts('menu_bundle_rules', prodBundleRules));

  // Bước 5.4: Nạp toàn bộ dữ liệu Canonical của schema mới
  executeBatchSql(`modifier_groups (${canonicalGroups.length} rows)`, buildInserts('modifier_groups', canonicalGroups));

  for (let i = 0; i < canonicalOptions.length; i += 50) {
    const chunk = canonicalOptions.slice(i, i + 50);
    executeBatchSql(
      `modifier_options (chunk ${Math.floor(i / 50) + 1}/${Math.ceil(canonicalOptions.length / 50)})`,
      buildInserts('modifier_options', chunk)
    );
  }

  executeBatchSql(`category_modifier_links (${canonicalLinks.length} rows)`, buildInserts('category_modifier_links', canonicalLinks));

  // 6. Đối chiếu và kiểm tra sau nạp
  console.log('\n[FullSync] 6. Kiểm tra đối chiếu số lượng và toàn vẹn dữ liệu trên Dev...');

  const devCounts1 = executeD1Query('blab-db-dev', `
    SELECT 'tenants' as tbl, count(*) as count FROM tenants
    UNION ALL SELECT 'tenant_config', count(*) FROM tenant_config
    UNION ALL SELECT 'menu_categories', count(*) FROM menu_categories
    UNION ALL SELECT 'menu_items', count(*) FROM menu_items
    UNION ALL SELECT 'menu_customizations', count(*) FROM menu_customizations;
  `, true, 'dev');

  const devCounts2 = executeD1Query('blab-db-dev', `
    SELECT 'menu_customization_option_rules' as tbl, count(*) as count FROM menu_customization_option_rules
    UNION ALL SELECT 'menu_bundle_rules', count(*) FROM menu_bundle_rules
    UNION ALL SELECT 'modifier_groups', count(*) FROM modifier_groups
    UNION ALL SELECT 'modifier_options', count(*) FROM modifier_options
    UNION ALL SELECT 'category_modifier_links', count(*) FROM category_modifier_links;
  `, true, 'dev');

  console.table([...devCounts1, ...devCounts2]);

  // 7. Kiểm tra Foreign Keys
  const fkCheck = executeD1Query('blab-db-dev', 'PRAGMA foreign_key_check;', true, 'dev');
  const menuFkErrors = fkCheck.filter(e => !['order_items', 'orders'].includes(e.table));
  console.log(`\n[FullSync] Kiểm tra Foreign Keys trên các bảng menu: ${menuFkErrors.length === 0 ? 'HỢP LỆ 100% (0 lỗi)' : JSON.stringify(menuFkErrors)}`);

  // 8. Kiểm tra xác nhận sensitive config được bảo toàn
  const sampleBenmiConfig = executeD1Query(
    'blab-db-dev',
    "SELECT tenant_id, liff_id, liff_url, (line_channel_token IS NOT NULL) as has_token FROM tenant_config WHERE tenant_id = 'benmi';",
    true,
    'dev'
  );
  console.log('\n[FullSync] Xác nhận cấu hình Dev (benmi):', sampleBenmiConfig[0]);

  console.log('\n=================================================================');
  console.log('🎉 ĐỒNG BỘ TOÀN DIỆN THÀNH CÔNG RỰC RỠ!');
  console.log('=================================================================');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runFullSync().catch(err => {
    console.error('\n[FullSync Error]:', err.message);
    process.exit(1);
  });
}
