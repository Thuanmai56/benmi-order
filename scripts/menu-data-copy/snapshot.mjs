import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { execFileSync } from 'child_process';
import { fileURLToPath } from 'url';
import { executeD1Query } from './inventory.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '../..');

const RELEVANT_TABLES = [
  'tenants',
  'tenant_config',
  'menu_categories',
  'menu_items',
  'menu_customizations',
  'menu_customization_option_rules',
  'modifier_groups',
  'modifier_options',
  'category_modifier_links',
  'item_modifier_links',
  'd1_migrations'
];

function sha256(content) {
  return crypto.createHash('sha256').update(content).digest('hex');
}

export async function createSnapshot(dbName = 'blab-db-production', isRemote = true, env = null) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const runId = `snap_${timestamp}`;
  const outDir = path.resolve(REPO_ROOT, `docs/proposals/full_menu_schema_migration/artifacts/${runId}`);
  fs.mkdirSync(outDir, { recursive: true });

  console.log(`[Snapshot] Bắt đầu tạo snapshot nhất quán từ ${dbName}...`);
  console.log(`[Snapshot] Thư mục lưu: ${outDir}`);

  // Đọc inventory để lấy DDL schema chuẩn
  const inventoryPath = path.resolve(REPO_ROOT, 'docs/proposals/full_menu_schema_migration/inventory.json');
  if (!fs.existsSync(inventoryPath)) {
    throw new Error('Chưa có file inventory.json. Vui lòng chạy T01 inventory trước!');
  }
  const inventory = JSON.parse(fs.readFileSync(inventoryPath, 'utf8'));

  const manifest = {
    run_id: runId,
    timestamp: new Date().toISOString(),
    source_database: dbName,
    is_remote: isRemote,
    tables: {},
    overall_sha256: null
  };

  const combinedData = {};

  for (const table of RELEVANT_TABLES) {
    process.stdout.write(`[Snapshot] Đang trích xuất bảng ${table.padEnd(32)}... `);
    const rows = executeD1Query(dbName, `SELECT * FROM ${table};`, isRemote, env);
    const tableJson = JSON.stringify(rows, null, 2);
    const tableHash = sha256(tableJson);

    fs.writeFileSync(path.resolve(outDir, `${table}.json`), tableJson, 'utf8');

    manifest.tables[table] = {
      row_count: rows.length,
      sha256: tableHash,
      file: `${table}.json`
    };
    combinedData[table] = rows;
    console.log(`${rows.length} rows (hash: ${tableHash.substring(0, 10)}...)`);
  }

  const consolidatedJson = JSON.stringify(combinedData, null, 2);
  manifest.overall_sha256 = sha256(consolidatedJson);
  fs.writeFileSync(path.resolve(outDir, 'consolidated_snapshot.json'), consolidatedJson, 'utf8');
  fs.writeFileSync(path.resolve(outDir, 'source-manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');

  // Khôi phục vào isolated SQLite database
  const targetDbPath = path.resolve(outDir, 'isolated_target.db');
  console.log(`\n[Snapshot] Đang khôi phục snapshot vào SQLite DB độc lập: ${targetDbPath}...`);

  // Tạo file SQL phục dựng
  let restoreSql = `PRAGMA foreign_keys = OFF;\nBEGIN TRANSACTION;\n`;

  // 1. Tạo schema các bảng
  for (const table of RELEVANT_TABLES) {
    const tableSchema = inventory.schema[table];
    if (tableSchema && tableSchema.sql) {
      restoreSql += `${tableSchema.sql};\n`;
    }
  }

  // 2. Chèn dữ liệu
  for (const table of RELEVANT_TABLES) {
    const rows = combinedData[table] || [];
    for (const row of rows) {
      const cols = Object.keys(row);
      const vals = cols.map(c => {
        const v = row[c];
        if (v === null || v === undefined) return 'NULL';
        if (typeof v === 'number') return v;
        return `'${String(v).replace(/'/g, "''")}'`;
      });
      restoreSql += `INSERT INTO ${table} (${cols.join(',')}) VALUES (${vals.join(',')});\n`;
    }
  }

  restoreSql += `COMMIT;\nPRAGMA foreign_keys = ON;\n`;

  const tmpRestorePath = path.resolve(outDir, '_restore.sql');
  fs.writeFileSync(tmpRestorePath, restoreSql, 'utf8');

  // Chạy sqlite3 CLI để tạo DB
  if (fs.existsSync(targetDbPath)) fs.unlinkSync(targetDbPath);
  execFileSync('sqlite3', [targetDbPath], {
    input: restoreSql,
    encoding: 'utf8'
  });
  fs.unlinkSync(tmpRestorePath);

  // Xác minh số dòng trong SQLite DB đã khôi phục
  console.log(`[Snapshot] Xác minh số dòng sau khi khôi phục vào isolated SQLite DB:`);
  let allMatched = true;
  for (const table of RELEVANT_TABLES) {
    const countOut = execFileSync('sqlite3', [targetDbPath, `SELECT COUNT(*) FROM ${table};`], { encoding: 'utf8' }).trim();
    const actualCount = parseInt(countOut, 10);
    const expectedCount = manifest.tables[table].row_count;
    if (actualCount === expectedCount) {
      console.log(`  ✓ ${table.padEnd(32)}: ${actualCount} rows (Khớp 100%)`);
    } else {
      console.error(`  ✗ ${table.padEnd(32)}: ${actualCount} rows != expected ${expectedCount}`);
      allMatched = false;
    }
  }

  if (!allMatched) {
    throw new Error('Số dòng trong database khôi phục không khớp với snapshot manifest!');
  }

  // Tạo symlink hoặc copy file `latest_isolated_target.db` để các step sau tiện dùng
  const latestDbPath = path.resolve(REPO_ROOT, 'docs/proposals/full_menu_schema_migration/artifacts/latest_isolated_target.db');
  fs.copyFileSync(targetDbPath, latestDbPath);
  const latestManifestPath = path.resolve(REPO_ROOT, 'docs/proposals/full_menu_schema_migration/artifacts/latest_source_manifest.json');
  fs.copyFileSync(path.resolve(outDir, 'source-manifest.json'), latestManifestPath);

  console.log(`\n[Snapshot] Hoàn tất T02 thành công!`);
  console.log(`- Snapshot directory: ${outDir}`);
  console.log(`- Isolated SQLite DB: ${targetDbPath}`);
  console.log(`- Latest DB pointer: ${latestDbPath}`);
  return {
    runId,
    outDir,
    targetDbPath,
    latestDbPath,
    manifest
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  createSnapshot()
    .then(() => process.exit(0))
    .catch(err => {
      console.error('[Snapshot] Lỗi:', err);
      process.exit(1);
    });
}
