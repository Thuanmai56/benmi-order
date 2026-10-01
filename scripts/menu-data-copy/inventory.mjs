import { execFileSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '../..');
const WORKER_DIR = path.resolve(REPO_ROOT, 'benmi-worker-official');

/**
 * Execute D1 command and parse JSON output safely via execFileSync (no shell escaping issues)
 */
export function executeD1Query(dbName, sql, isRemote = true, env = null) {
  const args = ['wrangler', 'd1', 'execute', dbName];
  if (isRemote) args.push('--remote');
  if (env) args.push('--env', env);
  args.push('--json', `--command=${sql.trim()}`);

  const rawOutput = execFileSync('npx', args, {
    cwd: WORKER_DIR,
    encoding: 'utf8',
    maxBuffer: 100 * 1024 * 1024,
    stdio: ['pipe', 'pipe', 'pipe']
  });

  const jsonStart = rawOutput.indexOf('[');
  if (jsonStart === -1) {
    throw new Error(`Wrangler output does not contain JSON array:\n${rawOutput}`);
  }
  const parsed = JSON.parse(rawOutput.substring(jsonStart));
  if (!parsed || !parsed[0] || parsed[0].success === false) {
    throw new Error(`D1 query execution failed: ${JSON.stringify(parsed)}`);
  }
  return parsed[0].results || [];
}

/**
 * Run inventory check against specified database
 */
export async function runInventory(dbName = 'blab-db-production', isRemote = true, env = null) {
  console.log(`[Inventory] Bắt đầu kiểm kê read-only từ database: ${dbName} (remote: ${isRemote})...`);
  const startTime = new Date().toISOString();

  const inventory = {
    meta: {
      generated_at: startTime,
      database_name: dbName,
      is_remote: isRemote,
      env: env || 'production'
    },
    schema: {},
    migrations: [],
    tenants: [],
    tables_summary: {},
    legacy_sources: {
      menu_customizations: [],
      menu_customization_option_rules: [],
      modifier_categories: [],
      modifier_category_items: [],
      applied_modifiers_analysis: []
    },
    canonical_current: {
      modifier_groups: [],
      modifier_options: [],
      category_modifier_links: [],
      item_modifier_links: []
    },
    validation: {
      invalid_json: [],
      orphan_records: [],
      id_collisions: [],
      numeric_types: {}
    }
  };

  // 1. Fetch tables schema
  console.log(`[Inventory] 1. Trích xuất sqlite_master schema...`);
  const tables = executeD1Query(dbName, `
    SELECT name, type, sql 
    FROM sqlite_master 
    WHERE type IN ('table', 'index') 
      AND name NOT LIKE '_cf_%' 
      AND name NOT LIKE 'sqlite_%'
    ORDER BY type, name;
  `, isRemote, env);

  const relevantTables = [
    'menu_categories',
    'menu_items',
    'menu_customizations',
    'menu_customization_option_rules',
    'modifier_groups',
    'modifier_options',
    'category_modifier_links',
    'item_modifier_links',
    'tenant_config',
    'tenants',
    'd1_migrations'
  ];

  for (const t of tables) {
    if (t.type === 'table') {
      const tableInfo = executeD1Query(dbName, `PRAGMA table_info(${t.name});`, isRemote, env);
      const fkList = executeD1Query(dbName, `PRAGMA foreign_key_list(${t.name});`, isRemote, env);
      const indexList = executeD1Query(dbName, `PRAGMA index_list(${t.name});`, isRemote, env);
      inventory.schema[t.name] = {
        sql: t.sql,
        columns: tableInfo,
        foreign_keys: fkList,
        indexes: indexList
      };
    }
  }

  // 2. Applied migrations
  console.log(`[Inventory] 2. Trích xuất migration ledger...`);
  inventory.migrations = executeD1Query(dbName, `
    SELECT id, name, applied_at 
    FROM d1_migrations 
    ORDER BY id ASC;
  `, isRemote, env);

  // 3. Active tenants
  console.log(`[Inventory] 3. Trích xuất danh sách tenants...`);
  inventory.tenants = executeD1Query(dbName, `
    SELECT t.id, t.name, t.store_display_name, 
           c.brand_name, c.is_active, c.store_status, c.allow_dine_in
    FROM tenants t
    LEFT JOIN tenant_config c ON c.tenant_id = t.id
    ORDER BY t.id ASC;
  `, isRemote, env);

  // 4. Counts per table and per tenant
  console.log(`[Inventory] 4. Thống kê số lượng dòng theo bảng và tenant...`);
  for (const tableName of relevantTables) {
    if (!inventory.schema[tableName]) continue;
    
    // Check if table has tenant_id
    const hasTenantId = inventory.schema[tableName].columns.some(c => c.name === 'tenant_id');
    if (hasTenantId) {
      const counts = executeD1Query(dbName, `
        SELECT tenant_id, COUNT(*) as count 
        FROM ${tableName} 
        GROUP BY tenant_id 
        ORDER BY tenant_id ASC;
      `, isRemote, env);
      const total = counts.reduce((acc, row) => acc + (row.count || 0), 0);
      inventory.tables_summary[tableName] = { total, by_tenant: counts };
    } else {
      const totalRes = executeD1Query(dbName, `SELECT COUNT(*) as count FROM ${tableName};`, isRemote, env);
      inventory.tables_summary[tableName] = { total: totalRes[0]?.count || 0, by_tenant: [] };
    }
  }

  // 5. Fetch Legacy menu_customizations
  console.log(`[Inventory] 5. Trích xuất menu_customizations và validate options_json...`);
  const customizations = executeD1Query(dbName, `
    SELECT id, tenant_id, key, title, type, sort_order, 
           COALESCE(is_required, 0) as is_required, options_json
    FROM menu_customizations
    ORDER BY tenant_id ASC, sort_order ASC, id ASC;
  `, isRemote, env);

  for (const c of customizations) {
    let parsedOptions = null;
    try {
      parsedOptions = typeof c.options_json === 'string' ? JSON.parse(c.options_json) : c.options_json;
      if (!Array.isArray(parsedOptions)) {
        inventory.validation.invalid_json.push({
          table: 'menu_customizations',
          id: c.id,
          tenant_id: c.tenant_id,
          field: 'options_json',
          error: 'Parsed JSON is not an array'
        });
      }
    } catch (err) {
      inventory.validation.invalid_json.push({
        table: 'menu_customizations',
        id: c.id,
        tenant_id: c.tenant_id,
        field: 'options_json',
        error: err.message
      });
    }

    inventory.legacy_sources.menu_customizations.push({
      ...c,
      parsed_options: parsedOptions,
      options_count: Array.isArray(parsedOptions) ? parsedOptions.length : 0
    });
  }

  // 6. Fetch Legacy menu_customization_option_rules
  console.log(`[Inventory] 6. Trích xuất menu_customization_option_rules...`);
  inventory.legacy_sources.menu_customization_option_rules = executeD1Query(dbName, `
    SELECT id, tenant_id, customization_key, option_id, rule_type, 
           min_order_subtotal, threshold_basis, error_message, is_active
    FROM menu_customization_option_rules
    ORDER BY tenant_id ASC, customization_key ASC, option_id ASC;
  `, isRemote, env);

  // 7. Fetch modifier categories and their items
  console.log(`[Inventory] 7. Trích xuất categories dạng modifier và catalog categories...`);
  const allCategories = executeD1Query(dbName, `
    SELECT id, tenant_id, name, slug, short_name, category_type,
           is_required, selection_type, min_selection, max_selection,
           sort_order, allow_customization, applied_modifiers
    FROM menu_categories
    ORDER BY tenant_id ASC, sort_order ASC;
  `, isRemote, env);

  const modCatMap = new Map();
  const modCats = [];
  for (const cat of allCategories) {
    const isModifierCat = cat.category_type === 'modifier' || 
                          cat.category_type === 'order_customization';
    if (isModifierCat) {
      modCats.push(cat);
      modCatMap.set(cat.id, cat);
    }
  }

  let modItemsByCat = new Map();
  if (modCats.length > 0) {
    const catIdList = modCats.map(c => `'${c.id.replace(/'/g, "''")}'`).join(',');
    const allModItems = executeD1Query(dbName, `
      SELECT id, tenant_id, category_id, name, price, sort_order, 
             out_of_stock_until, description
      FROM menu_items
      WHERE category_id IN (${catIdList})
      ORDER BY sort_order ASC;
    `, isRemote, env);

    for (const item of allModItems) {
      if (!modItemsByCat.has(item.category_id)) {
        modItemsByCat.set(item.category_id, []);
      }
      modItemsByCat.get(item.category_id).push(item);
    }
  }

  for (const cat of allCategories) {
    if (modCatMap.has(cat.id)) {
      const items = modItemsByCat.get(cat.id) || [];
      inventory.legacy_sources.modifier_categories.push({
        ...cat,
        items_count: items.length,
        items: items
      });
    } else {
      // Analyze applied_modifiers semantics
      let parsedApplied = null;
      let rawApplied = cat.applied_modifiers;

      if (rawApplied && String(rawApplied).trim() !== '') {
        try {
          parsedApplied = JSON.parse(rawApplied);
        } catch {
          parsedApplied = String(rawApplied).split(',').map(s => s.trim()).filter(Boolean);
        }
      }

      inventory.legacy_sources.applied_modifiers_analysis.push({
        tenant_id: cat.tenant_id,
        category_id: cat.id,
        category_name: cat.name,
        allow_customization: cat.allow_customization,
        raw_applied_modifiers: rawApplied,
        parsed_applied: parsedApplied,
        effective_scope: (cat.allow_customization === 0) ? 'none' : 
                         (!rawApplied || rawApplied.trim() === '') ? 'wildcard_all' : 'specific'
      });
    }
  }

  // 8. Fetch Canonical tables data
  console.log(`[Inventory] 8. Trích xuất canonical tables (modifier_groups, modifier_options, links)...`);
  inventory.canonical_current.modifier_groups = executeD1Query(dbName, `
    SELECT * FROM modifier_groups ORDER BY tenant_id ASC, sort_order ASC, id ASC;
  `, isRemote, env);

  inventory.canonical_current.modifier_options = executeD1Query(dbName, `
    SELECT * FROM modifier_options ORDER BY tenant_id ASC, group_id ASC, sort_order ASC, id ASC;
  `, isRemote, env);

  inventory.canonical_current.category_modifier_links = executeD1Query(dbName, `
    SELECT * FROM category_modifier_links ORDER BY tenant_id ASC, category_id ASC, sort_order ASC;
  `, isRemote, env);

  inventory.canonical_current.item_modifier_links = executeD1Query(dbName, `
    SELECT * FROM item_modifier_links ORDER BY tenant_id ASC, item_id ASC, sort_order ASC;
  `, isRemote, env);

  // 9. Check ID collisions and alias overlap
  console.log(`[Inventory] 9. Kiểm tra va chạm định danh (collisions / aliases)...`);
  const canonicalGroupIds = new Set(inventory.canonical_current.modifier_groups.map(g => g.id));
  
  for (const c of inventory.legacy_sources.menu_customizations) {
    const rawId = c.id;
    const prefixedId = `mg_${c.id}`;
    if (canonicalGroupIds.has(rawId)) {
      inventory.validation.id_collisions.push({
        type: 'exact_id_match',
        source: 'menu_customizations',
        tenant_id: c.tenant_id,
        source_id: rawId,
        canonical_group_id: rawId
      });
    }
    if (canonicalGroupIds.has(prefixedId)) {
      inventory.validation.id_collisions.push({
        type: 'prefixed_alias_match',
        source: 'menu_customizations',
        tenant_id: c.tenant_id,
        source_id: rawId,
        canonical_group_id: prefixedId
      });
    }
  }

  for (const cat of inventory.legacy_sources.modifier_categories) {
    const rawId = cat.id;
    const prefixedId = `mg_${cat.id}`;
    if (canonicalGroupIds.has(rawId)) {
      inventory.validation.id_collisions.push({
        type: 'exact_id_match',
        source: 'modifier_category',
        tenant_id: cat.tenant_id,
        source_id: rawId,
        canonical_group_id: rawId
      });
    }
    if (canonicalGroupIds.has(prefixedId)) {
      inventory.validation.id_collisions.push({
        type: 'prefixed_alias_match',
        source: 'modifier_category',
        tenant_id: cat.tenant_id,
        source_id: rawId,
        canonical_group_id: prefixedId
      });
    }
  }

  // 10. Check numeric types of price column
  console.log(`[Inventory] 10. Kiểm tra typeof(price) trên các bảng...`);
  const priceTypes = executeD1Query(dbName, `
    SELECT typeof(price) as type_name, COUNT(*) as count 
    FROM menu_items 
    GROUP BY typeof(price);
  `, isRemote, env);
  inventory.validation.numeric_types.menu_items_price = priceTypes;

  if (inventory.schema.modifier_options) {
    const modOptionPriceTypes = executeD1Query(dbName, `
      SELECT typeof(price) as type_name, COUNT(*) as count 
      FROM modifier_options 
      GROUP BY typeof(price);
    `, isRemote, env);
    inventory.validation.numeric_types.modifier_options_price = modOptionPriceTypes;
  }

  console.log(`[Inventory] Hoàn tất kiểm kê!`);
  return inventory;
}

// CLI runner if executed directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runInventory()
    .then(data => {
      const outPath = path.resolve(REPO_ROOT, 'docs/proposals/full_menu_schema_migration/inventory.json');
      fs.writeFileSync(outPath, JSON.stringify(data, null, 2), 'utf8');
      console.log(`[Inventory] Đã lưu kết quả inventory ra file: ${outPath}`);
    })
    .catch(err => {
      console.error('[Inventory] Lỗi:', err);
      process.exit(1);
    });
}
