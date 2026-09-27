import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TENANT_ID = 'jiangjiejie';
const WORKER_DIR = path.resolve(__dirname, '../benmi-worker-official');

console.log(`=== Starting Full Data Sync for tenant: ${TENANT_ID} (Production -> Dev) ===\n`);

const tables = [
  { name: 'tenants', filter: `id = '${TENANT_ID}'` },
  { name: 'tenant_config', filter: `tenant_id = '${TENANT_ID}'` },
  { name: 'menu_categories', filter: `tenant_id = '${TENANT_ID}'` },
  { name: 'menu_items', filter: `tenant_id = '${TENANT_ID}'` },
  { name: 'menu_customizations', filter: `tenant_id = '${TENANT_ID}'` },
  { name: 'menu_bundle_rules', filter: `tenant_id = '${TENANT_ID}'` },
  { name: 'menu_customization_option_rules', filter: `tenant_id = '${TENANT_ID}'` },
  { name: 'daily_order_counters', filter: `tenant_id = '${TENANT_ID}'` },
  { name: 'orders', filter: `tenant_id = '${TENANT_ID}'` },
  { name: 'order_items', filter: `tenant_id = '${TENANT_ID}'` },
  { name: 'pending_actions', filter: `tenant_id = '${TENANT_ID}'` }
];

function escapeSqlValue(val) {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'number') return val;
  if (typeof val === 'boolean') return val ? 1 : 0;
  return `'${String(val).replace(/'/g, "''")}'`;
}

function getDevColumns(tableName) {
  const cmd = `npx wrangler d1 execute blab-db-dev --remote --env dev --json --command "PRAGMA table_info(${tableName});"`;
  const out = execSync(cmd, { cwd: WORKER_DIR, encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });
  const jsonStart = out.indexOf('[');
  if (jsonStart === -1) throw new Error(`Could not parse dev table_info for ${tableName}`);
  const parsed = JSON.parse(out.substring(jsonStart));
  return parsed[0]?.results?.map(r => r.name) || [];
}

const tableData = [];

// 1. Fetch data from production and schema from dev
console.log(`1. Fetching schema from dev and data from production...`);
for (const t of tables) {
  process.stdout.write(`   Table ${t.name.padEnd(32)}: `);
  
  // Dev columns
  const devCols = getDevColumns(t.name);
  
  // Prod data
  const cmd = `npx wrangler d1 execute blab-db-production --remote --json --command "SELECT * FROM ${t.name} WHERE ${t.filter};"`;
  let output;
  try {
    output = execSync(cmd, { cwd: WORKER_DIR, encoding: 'utf8', maxBuffer: 50 * 1024 * 1024 });
  } catch (err) {
    console.error(`\nFailed to fetch ${t.name}:`, err.message);
    process.exit(1);
  }

  const jsonStart = output.indexOf('[');
  if (jsonStart === -1) {
    console.log(`0 rows (no json)`);
    tableData.push({ ...t, devCols, rows: [] });
    continue;
  }
  const parsed = JSON.parse(output.substring(jsonStart));
  const rows = parsed[0]?.results || [];
  console.log(`${String(rows.length).padStart(4)} rows exported | ${devCols.length} dev cols`);
  tableData.push({ ...t, devCols, rows });
}

// 2. Build SQL file
console.log(`\n2. Generating idempotent SQL script...`);
const sqlStatements = [];
sqlStatements.push(`-- Data sync for tenant ${TENANT_ID} from blab-db-production to blab-db-dev`);
sqlStatements.push(`PRAGMA foreign_keys = OFF;`);

// Deletion order (reverse: child tables first)
for (let i = tableData.length - 1; i >= 0; i--) {
  const t = tableData[i];
  sqlStatements.push(`DELETE FROM ${t.name} WHERE ${t.filter};`);
}

// Insertion order (forward: parent tables first)
let totalInserted = 0;
for (const t of tableData) {
  if (t.rows.length === 0) continue;
  for (const row of t.rows) {
    // Only keep columns that exist in the target dev table
    const targetCols = Object.keys(row).filter(c => t.devCols.includes(c));
    const targetVals = targetCols.map(c => escapeSqlValue(row[c]));
    sqlStatements.push(`INSERT INTO ${t.name} (${targetCols.join(', ')}) VALUES (${targetVals.join(', ')});`);
    totalInserted++;
  }
}

sqlStatements.push(`PRAGMA foreign_keys = ON;`);

const tempSqlFile = path.resolve(WORKER_DIR, `temp_sync_${TENANT_ID}.sql`);
fs.writeFileSync(tempSqlFile, sqlStatements.join('\n'), 'utf8');
console.log(`   Saved ${sqlStatements.length} statements (${totalInserted} inserts) to ${tempSqlFile}`);

// 3. Apply to blab-db-dev
console.log(`\n3. Applying data to blab-db-dev...`);
const applyCmd = `npx wrangler d1 execute blab-db-dev --remote --env dev --file=temp_sync_${TENANT_ID}.sql`;
try {
  const applyOutput = execSync(applyCmd, { cwd: WORKER_DIR, encoding: 'utf8', maxBuffer: 50 * 1024 * 1024 });
  console.log(applyOutput);
  console.log(`✓ Data applied successfully to blab-db-dev!`);
} catch (err) {
  console.error(`Failed to execute on blab-db-dev:`, err.message);
  process.exit(1);
} finally {
  if (fs.existsSync(tempSqlFile)) {
    fs.unlinkSync(tempSqlFile);
    console.log(`Cleaned up ${tempSqlFile}`);
  }
}

// 4. Verify row counts on dev
console.log(`\n4. Verifying data counts on blab-db-dev...`);
let allMatch = true;
for (const t of tableData) {
  const countCmd = `npx wrangler d1 execute blab-db-dev --remote --env dev --json --command "SELECT count(*) as c FROM ${t.name} WHERE ${t.filter};"`;
  const countOut = execSync(countCmd, { cwd: WORKER_DIR, encoding: 'utf8' });
  const jsonStart = countOut.indexOf('[');
  const parsed = JSON.parse(countOut.substring(jsonStart));
  const devCount = parsed[0]?.results?.[0]?.c ?? 0;
  const match = devCount === t.rows.length;
  if (!match) allMatch = false;
  console.log(`   ${t.name.padEnd(32)}: Prod ${String(t.rows.length).padStart(4)} | Dev ${String(devCount).padStart(4)} ${match ? '✓' : '✗ MISMATCH'}`);
}

// 5. Purge and warm bootstrap cache on dev
console.log(`\n5. Purging and warming bootstrap cache on dev Worker...`);
try {
  const warmUrl = `https://platform-worker-dev.thuanmnc.workers.dev/api/tenant/bootstrap?tenant_id=${TENANT_ID}&_purge=1&_t=${Date.now()}`;
  const warmRes = execSync(`curl -s "${warmUrl}"`, { encoding: 'utf8' });
  const warmData = JSON.parse(warmRes);
  console.log(`✓ Bootstrap cache refreshed!`);
  console.log(`   Brand Name : ${warmData.tenant?.brandName}`);
  console.log(`   Categories : ${warmData.catalog?.length || 0}`);
  const totalItems = warmData.catalog?.reduce((sum, cat) => sum + (cat.items?.length || 0), 0) || 0;
  console.log(`   Total Items: ${totalItems}`);
  console.log(`   Bundle Rules: ${warmData.bundleRules?.length || 0}`);
} catch (err) {
  console.warn(`Warm cache note:`, err.message);
}

if (allMatch) {
  console.log(`\n🎉 SUCCESS: All data for tenant ${TENANT_ID} has been perfectly copied from production to dev!`);
} else {
  console.warn(`\n⚠️ Some table counts did not match expected values. Please check logs above.`);
}
