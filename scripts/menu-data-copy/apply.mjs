import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '../..');

export function applyCopy(targetDbPath) {
  const dbPath = targetDbPath || path.resolve(REPO_ROOT, 'docs/proposals/full_menu_schema_migration/artifacts/latest_isolated_target.db');
  console.log(`[Apply] Bắt đầu thực thi copy dữ liệu vào database: ${dbPath}...`);

  const previewPath = path.resolve(REPO_ROOT, 'docs/proposals/full_menu_schema_migration/artifacts/copy-preview.json');
  if (!fs.existsSync(previewPath)) {
    throw new Error('Chưa có file copy-preview.json. Vui lòng chạy T05 preview trước!');
  }
  const preview = JSON.parse(fs.readFileSync(previewPath, 'utf8'));

  const startTime = new Date().toISOString();
  const runId = `apply_${Date.now()}`;

  const executionReport = {
    run_id: runId,
    started_at: startTime,
    completed_at: null,
    target_database: dbPath,
    tenants_processed: [],
    tenants_failed: [],
    total_inserted_groups: 0,
    total_inserted_options: 0,
    total_inserted_links: 0,
    status: 'IN_PROGRESS'
  };

  const insertedRecords = {
    run_id: runId,
    modifier_groups: [],
    modifier_options: [],
    category_modifier_links: []
  };

  const checkpoint = {
    run_id: runId,
    last_completed_tenant: null,
    committed_tenants: [],
    timestamp: null
  };

  // Group items by tenant
  const tenantGroupsMap = new Map();
  for (const g of preview.plan.modifier_groups) {
    if (g.action === 'insert') {
      if (!tenantGroupsMap.has(g.tenant_id)) tenantGroupsMap.set(g.tenant_id, []);
      tenantGroupsMap.get(g.tenant_id).push(g);
    }
  }

  const tenantOptionsMap = new Map();
  for (const o of preview.plan.modifier_options) {
    if (o.action === 'insert') {
      if (!tenantOptionsMap.has(o.tenant_id)) tenantOptionsMap.set(o.tenant_id, []);
      tenantOptionsMap.get(o.tenant_id).push(o);
    }
  }

  const tenantLinksMap = new Map();
  for (const l of preview.plan.category_modifier_links) {
    if (l.action === 'insert') {
      if (!tenantLinksMap.has(l.tenant_id)) tenantLinksMap.set(l.tenant_id, []);
      tenantLinksMap.get(l.tenant_id).push(l);
    }
  }

  // All tenants to process
  const allTenants = Array.from(new Set([
    ...tenantGroupsMap.keys(),
    ...tenantOptionsMap.keys(),
    ...tenantLinksMap.keys()
  ]));

  console.log(`[Apply] Tìm thấy ${allTenants.length} tenants cần áp dụng.`);

  for (const tenantId of allTenants) {
    process.stdout.write(`[Apply] Đang áp dụng cho tenant ${tenantId.padEnd(20)}... `);

    const groups = tenantGroupsMap.get(tenantId) || [];
    const options = tenantOptionsMap.get(tenantId) || [];
    const links = tenantLinksMap.get(tenantId) || [];

    let sql = `PRAGMA foreign_keys = ON;\nBEGIN TRANSACTION;\n`;

    // 1. Groups insert
    for (const g of groups) {
      const p = g.payload;
      sql += `INSERT INTO modifier_groups (
        id, tenant_id, name, selection_type, is_required, min_selection, max_selection, sort_order, scope, source_metadata_json
      ) VALUES (
        '${p.id}', '${p.tenant_id}', '${p.name.replace(/'/g, "''")}', '${p.selection_type}',
        ${p.is_required}, ${p.min_selection}, ${p.max_selection}, ${p.sort_order},
        '${p.scope}', '${p.source_metadata_json.replace(/'/g, "''")}'
      );\n`;
    }

    // 2. Options insert
    for (const o of options) {
      const p = o.payload;
      const descVal = p.description === null ? 'NULL' : `'${String(p.description).replace(/'/g, "''")}'`;
      const oosDeadlineVal = p.out_of_stock_until === null ? 'NULL' : `'${String(p.out_of_stock_until).replace(/'/g, "''")}'`;
      sql += `INSERT INTO modifier_options (
        id, tenant_id, group_id, name, price, is_default, sort_order, out_of_stock_until,
        sub_options_json, eligibility_rules_json, is_out_of_stock, description, source_metadata_json
      ) VALUES (
        '${p.id}', '${p.tenant_id}', '${p.group_id}', '${p.name.replace(/'/g, "''")}',
        ${p.price}, ${p.is_default}, ${p.sort_order}, ${oosDeadlineVal},
        '${p.sub_options_json.replace(/'/g, "''")}', '${p.eligibility_rules_json.replace(/'/g, "''")}',
        ${p.is_out_of_stock}, ${descVal}, '${p.source_metadata_json.replace(/'/g, "''")}'
      );\n`;
    }

    // 3. Category modifier links insert
    for (const l of links) {
      sql += `INSERT INTO category_modifier_links (
        tenant_id, category_id, group_id, sort_order
      ) VALUES (
        '${l.tenant_id}', '${l.category_id}', '${l.group_id}', ${l.sort_order}
      );\n`;
    }

    sql += `COMMIT;\n`;

    try {
      execFileSync('sqlite3', [dbPath], { input: sql, encoding: 'utf8' });

      executionReport.tenants_processed.push(tenantId);
      executionReport.total_inserted_groups += groups.length;
      executionReport.total_inserted_options += options.length;
      executionReport.total_inserted_links += links.length;

      for (const g of groups) insertedRecords.modifier_groups.push(g.target_id);
      for (const o of options) insertedRecords.modifier_options.push(o.target_id);
      for (const l of links) insertedRecords.category_modifier_links.push(`${l.tenant_id}::${l.category_id}::${l.group_id}`);

      checkpoint.last_completed_tenant = tenantId;
      checkpoint.committed_tenants.push(tenantId);
      checkpoint.timestamp = new Date().toISOString();

      console.log(`OK (Groups: ${groups.length}, Options: ${options.length}, Links: ${links.length})`);
    } catch (err) {
      console.error(`FAILED: ${err.message}`);
      executionReport.tenants_failed.push({
        tenant_id: tenantId,
        error: err.message
      });
      executionReport.status = 'PARTIAL_FAILURE';
      break;
    }
  }

  if (executionReport.tenants_failed.length === 0) {
    executionReport.status = 'COMPLETED_SUCCESS';
  }
  executionReport.completed_at = new Date().toISOString();

  // Save artifacts
  const outDir = path.resolve(REPO_ROOT, 'docs/proposals/full_menu_schema_migration/artifacts');
  fs.writeFileSync(path.resolve(outDir, 'inserted-records.json'), JSON.stringify(insertedRecords, null, 2), 'utf8');
  fs.writeFileSync(path.resolve(outDir, 'checkpoint.json'), JSON.stringify(checkpoint, null, 2), 'utf8');
  fs.writeFileSync(path.resolve(outDir, 'execution-report.json'), JSON.stringify(executionReport, null, 2), 'utf8');

  console.log(`\n[Apply] Kết quả thực thi: ${executionReport.status}`);
  console.log(`- Tenants thành công: ${executionReport.tenants_processed.length}/${allTenants.length}`);
  console.log(`- Groups đã chèn: ${executionReport.total_inserted_groups}`);
  console.log(`- Options đã chèn: ${executionReport.total_inserted_options}`);
  console.log(`- Links đã chèn: ${executionReport.total_inserted_links}`);
  console.log(`- Artifacts: inserted-records.json, checkpoint.json, execution-report.json`);

  return executionReport;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  applyCopy();
}
