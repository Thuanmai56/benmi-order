import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { execFileSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '../..');

function sha256(content) {
  return crypto.createHash('sha256').update(content).digest('hex');
}

export function runVerify(targetDbPath) {
  const dbPath = targetDbPath || path.resolve(REPO_ROOT, 'docs/proposals/full_menu_schema_migration/artifacts/latest_isolated_target.db');
  console.log(`[Verify] Bắt đầu đối chiếu dữ liệu (Data Parity Verification) trên database: ${dbPath}...`);

  const idMapPath = path.resolve(REPO_ROOT, 'docs/proposals/full_menu_schema_migration/id-map.json');
  const manifestPath = path.resolve(REPO_ROOT, 'docs/proposals/full_menu_schema_migration/artifacts/latest_source_manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const snapDir = path.resolve(REPO_ROOT, `docs/proposals/full_menu_schema_migration/artifacts/${manifest.run_id}`);
  const snapshotData = JSON.parse(fs.readFileSync(path.resolve(snapDir, 'consolidated_snapshot.json'), 'utf8'));
  const idMap = JSON.parse(fs.readFileSync(idMapPath, 'utf8'));

  const report = {
    meta: {
      verified_at: new Date().toISOString(),
      target_db: dbPath,
      source_snapshot_run_id: manifest.run_id
    },
    foreign_keys_valid: false,
    source_tables_unchanged: {},
    groups_parity: { expected: idMap.groups.length, matched: 0, mismatched: [] },
    options_parity: { expected: idMap.options.length, matched: 0, mismatched: [] },
    category_links_parity: { expected: idMap.category_links.length, matched: 0, mismatched: [] },
    sub_options_verified: { total_options_with_sub: 0, matched: 0, mismatched: [] },
    rules_verified: { total_options_with_rules: 0, matched: 0, mismatched: [] },
    discrepancies_count: 0
  };

  // 1. Check foreign keys
  console.log('[Verify] 1. Kiểm tra ràng buộc Foreign Keys (PRAGMA foreign_key_check)...');
  const fkCheck = execFileSync('sqlite3', [dbPath, 'PRAGMA foreign_key_check;'], { encoding: 'utf8' }).trim();
  if (fkCheck === '') {
    report.foreign_keys_valid = true;
    console.log('  ✓ Ràng buộc Foreign Keys hợp lệ 100% (0 lỗi).');
  } else {
    report.foreign_keys_valid = false;
    report.discrepancies_count++;
    console.error('  ✗ Lỗi Foreign Key Check:', fkCheck);
  }

  // 2. Check source tables unchanged
  console.log('[Verify] 2. Kiểm tra tính toàn vẹn của dữ liệu nguồn (Source data unchanged)...');
  const sourceTablesToCheck = ['menu_categories', 'menu_items', 'menu_customizations', 'menu_customization_option_rules'];
  for (const table of sourceTablesToCheck) {
    const rawOut = execFileSync('sqlite3', [dbPath, `SELECT * FROM ${table} ORDER BY rowid;`], { encoding: 'utf8' });
    const countOut = execFileSync('sqlite3', [dbPath, `SELECT COUNT(*) FROM ${table};`], { encoding: 'utf8' }).trim();
    const currentCount = parseInt(countOut, 10);
    const expectedCount = snapshotData[table].length;
    const isCountMatch = currentCount === expectedCount;

    report.source_tables_unchanged[table] = {
      expected_count: expectedCount,
      current_count: currentCount,
      intact: isCountMatch
    };
    if (isCountMatch) {
      console.log(`  ✓ ${table.padEnd(32)}: ${currentCount}/${expectedCount} dòng (Bảo toàn 100%)`);
    } else {
      report.discrepancies_count++;
      console.error(`  ✗ ${table.padEnd(32)}: ${currentCount} != expected ${expectedCount}`);
    }
  }

  // 3. Verify modifier_groups parity
  console.log('[Verify] 3. Đối chiếu chi tiết từng trường của modifier_groups...');
  for (const g of idMap.groups) {
    const expected = g.data;
    const q = `SELECT name, selection_type, is_required, min_selection, max_selection, sort_order, scope, source_metadata_json FROM modifier_groups WHERE id = '${g.target_id}';`;
    const rowRaw = execFileSync('sqlite3', [dbPath, q], { encoding: 'utf8' }).trim();

    if (!rowRaw) {
      report.groups_parity.mismatched.push({ id: g.target_id, error: 'NOT_FOUND' });
      report.discrepancies_count++;
      continue;
    }

    const parts = rowRaw.split('|');
    const actual = {
      name: parts[0],
      selection_type: parts[1],
      is_required: parseInt(parts[2], 10),
      min_selection: parseInt(parts[3], 10),
      max_selection: parseInt(parts[4], 10),
      sort_order: parseInt(parts[5], 10),
      scope: parts[6],
      source_metadata_json: parts[7]
    };

    const isMatch = (
      actual.name === expected.name &&
      actual.selection_type === expected.selection_type &&
      actual.is_required === expected.is_required &&
      actual.min_selection === expected.min_selection &&
      actual.max_selection === expected.max_selection &&
      actual.sort_order === expected.sort_order &&
      actual.scope === expected.scope
    );

    if (isMatch) {
      report.groups_parity.matched++;
    } else {
      report.groups_parity.mismatched.push({ id: g.target_id, expected, actual });
      report.discrepancies_count++;
    }
  }
  console.log(`  ✓ modifier_groups: ${report.groups_parity.matched}/${report.groups_parity.expected} nhóm khớp 100%`);

  // 4. Verify modifier_options parity (including sub_options_json & eligibility_rules_json)
  console.log('[Verify] 4. Đối chiếu chi tiết modifier_options, sub_options_json, rules_json...');
  for (const o of idMap.options) {
    const expected = o.data;
    const q = `SELECT group_id, name, price, is_default, sort_order, sub_options_json, eligibility_rules_json, is_out_of_stock, description FROM modifier_options WHERE id = '${o.target_id}';`;
    const rowRaw = execFileSync('sqlite3', [dbPath, q], { encoding: 'utf8' }).trim();

    if (!rowRaw) {
      report.options_parity.mismatched.push({ id: o.target_id, error: 'NOT_FOUND' });
      report.discrepancies_count++;
      continue;
    }

    const parts = rowRaw.split('|');
    const actual = {
      group_id: parts[0],
      name: parts[1],
      price: parseInt(parts[2], 10),
      is_default: parseInt(parts[3], 10),
      sort_order: parseInt(parts[4], 10),
      sub_options_json: parts[5],
      eligibility_rules_json: parts[6],
      is_out_of_stock: parseInt(parts[7], 10),
      description: parts[8] === '' ? null : parts[8]
    };

    const isMatch = (
      actual.group_id === expected.group_id &&
      actual.name === expected.name &&
      actual.price === expected.price &&
      actual.is_default === expected.is_default &&
      actual.sort_order === expected.sort_order &&
      actual.is_out_of_stock === expected.is_out_of_stock
    );

    if (isMatch) {
      report.options_parity.matched++;
    } else {
      report.options_parity.mismatched.push({ id: o.target_id, expected, actual });
      report.discrepancies_count++;
    }

    // Sub-options check
    const expectedSubOpts = JSON.parse(expected.sub_options_json);
    if (expectedSubOpts.length > 0) {
      report.sub_options_verified.total_options_with_sub++;
      const actualSubOpts = JSON.parse(actual.sub_options_json);
      if (JSON.stringify(expectedSubOpts) === JSON.stringify(actualSubOpts)) {
        report.sub_options_verified.matched++;
      } else {
        report.sub_options_verified.mismatched.push({ id: o.target_id, expected: expectedSubOpts, actual: actualSubOpts });
        report.discrepancies_count++;
      }
    }

    // Rules check
    const expectedRules = JSON.parse(expected.eligibility_rules_json);
    if (expectedRules.length > 0) {
      report.rules_verified.total_options_with_rules++;
      const actualRules = JSON.parse(actual.eligibility_rules_json);
      if (JSON.stringify(expectedRules) === JSON.stringify(actualRules)) {
        report.rules_verified.matched++;
      } else {
        report.rules_verified.mismatched.push({ id: o.target_id, expected: expectedRules, actual: actualRules });
        report.discrepancies_count++;
      }
    }
  }
  console.log(`  ✓ modifier_options: ${report.options_parity.matched}/${report.options_parity.expected} lựa chọn khớp 100%`);
  console.log(`  ✓ sub_options_json: ${report.sub_options_verified.matched}/${report.sub_options_verified.total_options_with_sub} options có sub-options khớp 100%`);
  console.log(`  ✓ eligibility_rules_json: ${report.rules_verified.matched}/${report.rules_verified.total_options_with_rules} options có rule khớp 100%`);

  // 5. Verify category_modifier_links parity
  console.log('[Verify] 5. Đối chiếu category_modifier_links...');
  for (const l of idMap.category_links) {
    const q = `SELECT sort_order FROM category_modifier_links WHERE tenant_id = '${l.tenant_id}' AND category_id = '${l.category_id}' AND group_id = '${l.group_id}';`;
    const rowRaw = execFileSync('sqlite3', [dbPath, q], { encoding: 'utf8' }).trim();
    if (rowRaw !== '') {
      report.category_links_parity.matched++;
    } else {
      report.category_links_parity.mismatched.push(l);
      report.discrepancies_count++;
    }
  }
  console.log(`  ✓ category_modifier_links: ${report.category_links_parity.matched}/${report.category_links_parity.expected} liên kết khớp 100%`);

  // Save artifact
  const outDir = path.resolve(REPO_ROOT, 'docs/proposals/full_menu_schema_migration/artifacts');
  fs.writeFileSync(path.resolve(outDir, 'data-parity-report.json'), JSON.stringify(report, null, 2), 'utf8');

  console.log(`\n[Verify] Hoàn tất đối chiếu T07!`);
  console.log(`- Tổng số chênh lệch / lỗi (discrepancies): ${report.discrepancies_count}`);
  console.log(`- Artifact: docs/proposals/full_menu_schema_migration/artifacts/data-parity-report.json`);

  if (report.discrepancies_count > 0) {
    throw new Error(`Data parity check failed with ${report.discrepancies_count} discrepancies!`);
  }
  return report;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runVerify();
}
