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

export function runPreview(targetDbPath) {
  const dbPath = targetDbPath || path.resolve(REPO_ROOT, 'docs/proposals/full_menu_schema_migration/artifacts/latest_isolated_target.db');
  console.log(`[Preview] Bắt đầu dry-run preview trên database: ${dbPath}...`);

  const idMapPath = path.resolve(REPO_ROOT, 'docs/proposals/full_menu_schema_migration/id-map.json');
  if (!fs.existsSync(idMapPath)) {
    throw new Error('Chưa có file id-map.json. Vui lòng chạy T03 mapping trước!');
  }
  const idMap = JSON.parse(fs.readFileSync(idMapPath, 'utf8'));

  const preview = {
    meta: {
      generated_at: new Date().toISOString(),
      target_db: dbPath,
      id_map_source_hash: idMap.meta.source_snapshot_hash
    },
    summary: {
      total_operations: 0,
      insert: 0,
      already_equal: 0,
      conflict: 0,
      unresolved: 0,
      by_tenant: {}
    },
    plan: {
      modifier_groups: [],
      modifier_options: [],
      category_modifier_links: []
    }
  };

  // Helper to query existing rows from target SQLite DB
  const queryRows = (sql) => {
    try {
      const out = execFileSync('sqlite3', [dbPath, sql], { encoding: 'utf8' }).trim();
      if (!out) return [];
      return out.split('\n').map(line => line.split('|'));
    } catch {
      return [];
    }
  };

  // 1. Plan for modifier_groups
  console.log('[Preview] 1. Lập kế hoạch cho modifier_groups...');
  const existingGroupsRaw = queryRows('SELECT id, tenant_id, name, selection_type, is_required, min_selection, max_selection, sort_order, scope FROM modifier_groups;');
  const existingGroupsMap = new Map();
  for (const r of existingGroupsRaw) {
    existingGroupsMap.set(r[0], {
      id: r[0], tenant_id: r[1], name: r[2], selection_type: r[3],
      is_required: parseInt(r[4], 10), min_selection: parseInt(r[5], 10),
      max_selection: parseInt(r[6], 10), sort_order: parseInt(r[7], 10),
      scope: r[8]
    });
  }

  for (const g of idMap.groups) {
    const tenantId = g.tenant_id;
    preview.summary.by_tenant[tenantId] = preview.summary.by_tenant[tenantId] || {
      groups_insert: 0, options_insert: 0, links_insert: 0,
      already_equal: 0, conflicts: 0
    };

    const targetId = g.target_id;
    let action = 'insert';
    let conflictReason = null;

    if (existingGroupsMap.has(targetId)) {
      const existing = existingGroupsMap.get(targetId);
      // Compare core fields
      const isMatch = (
        existing.tenant_id === g.data.tenant_id &&
        existing.name === g.data.name &&
        existing.selection_type === g.data.selection_type &&
        existing.is_required === g.data.is_required &&
        existing.min_selection === g.data.min_selection &&
        existing.max_selection === g.data.max_selection &&
        existing.sort_order === g.data.sort_order &&
        existing.scope === g.data.scope
      );
      if (isMatch) {
        action = 'already_equal';
        preview.summary.already_equal++;
        preview.summary.by_tenant[tenantId].already_equal++;
      } else {
        action = 'conflict';
        conflictReason = 'Existing group core fields do not match legacy definition';
        preview.summary.conflict++;
        preview.summary.by_tenant[tenantId].conflicts++;
      }
    } else {
      action = 'insert';
      preview.summary.insert++;
      preview.summary.by_tenant[tenantId].groups_insert++;
    }

    const payload = g.data;
    const sourceHash = sha256(JSON.stringify(g));
    const targetHash = sha256(JSON.stringify(payload));

    preview.plan.modifier_groups.push({
      action,
      tenant_id: tenantId,
      source_kind: g.source_kind,
      source_id: g.source_id,
      target_id: targetId,
      payload,
      source_hash: sourceHash,
      expected_target_hash: targetHash,
      conflict_reason: conflictReason
    });
  }

  // 2. Plan for modifier_options
  console.log('[Preview] 2. Lập kế hoạch cho modifier_options...');
  const existingOptionsRaw = queryRows('SELECT id, tenant_id, group_id, name, price, is_default, sort_order FROM modifier_options;');
  const existingOptionsMap = new Map();
  for (const r of existingOptionsRaw) {
    existingOptionsMap.set(r[0], {
      id: r[0], tenant_id: r[1], group_id: r[2], name: r[3],
      price: parseInt(r[4], 10), is_default: parseInt(r[5], 10),
      sort_order: parseInt(r[6], 10)
    });
  }

  for (const o of idMap.options) {
    const tenantId = o.tenant_id;
    const targetId = o.target_id;
    let action = 'insert';
    let conflictReason = null;

    if (existingOptionsMap.has(targetId)) {
      const existing = existingOptionsMap.get(targetId);
      const isMatch = (
        existing.tenant_id === o.data.tenant_id &&
        existing.group_id === o.data.group_id &&
        existing.name === o.data.name &&
        existing.price === o.data.price &&
        existing.is_default === o.data.is_default &&
        existing.sort_order === o.data.sort_order
      );
      if (isMatch) {
        action = 'already_equal';
        preview.summary.already_equal++;
        preview.summary.by_tenant[tenantId].already_equal++;
      } else {
        action = 'conflict';
        conflictReason = 'Existing option core fields do not match legacy definition';
        preview.summary.conflict++;
        preview.summary.by_tenant[tenantId].conflicts++;
      }
    } else {
      action = 'insert';
      preview.summary.insert++;
      preview.summary.by_tenant[tenantId].options_insert++;
    }

    const payload = o.data;
    const sourceHash = sha256(JSON.stringify(o));
    const targetHash = sha256(JSON.stringify(payload));

    preview.plan.modifier_options.push({
      action,
      tenant_id: tenantId,
      source_kind: o.source_kind,
      source_group_id: o.source_group_id,
      source_option_identity: o.source_option_identity,
      target_id: targetId,
      payload,
      source_hash: sourceHash,
      expected_target_hash: targetHash,
      conflict_reason: conflictReason
    });
  }

  // 3. Plan for category_modifier_links
  console.log('[Preview] 3. Lập kế hoạch cho category_modifier_links...');
  const existingLinksRaw = queryRows('SELECT tenant_id, category_id, group_id, sort_order FROM category_modifier_links;');
  const existingLinksMap = new Map();
  for (const r of existingLinksRaw) {
    existingLinksMap.set(`${r[0]}::${r[1]}::${r[2]}`, parseInt(r[3], 10));
  }

  for (const l of idMap.category_links) {
    const tenantId = l.tenant_id;
    const key = `${l.tenant_id}::${l.category_id}::${l.group_id}`;
    let action = 'insert';

    if (existingLinksMap.has(key)) {
      action = 'already_equal';
      preview.summary.already_equal++;
      preview.summary.by_tenant[tenantId].already_equal++;
    } else {
      action = 'insert';
      preview.summary.insert++;
      preview.summary.by_tenant[tenantId].links_insert++;
    }

    preview.plan.category_modifier_links.push({
      action,
      tenant_id: l.tenant_id,
      category_id: l.category_id,
      group_id: l.group_id,
      sort_order: l.sort_order,
      derived_from: l.derived_from
    });
  }

  preview.summary.total_operations = preview.summary.insert + preview.summary.already_equal + preview.summary.conflict + preview.summary.unresolved;

  // Save preview artifact
  const outDir = path.resolve(REPO_ROOT, 'docs/proposals/full_menu_schema_migration/artifacts');
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.resolve(outDir, 'copy-preview.json'), JSON.stringify(preview, null, 2), 'utf8');

  console.log(`\n[Preview] Hoàn tất T05 Dry-Run Preview!`);
  console.log(`- Tổng số thao tác dự kiến: ${preview.summary.total_operations}`);
  console.log(`- Thao tác Insert: ${preview.summary.insert} (Groups: ${preview.plan.modifier_groups.filter(g => g.action === 'insert').length}, Options: ${preview.plan.modifier_options.filter(o => o.action === 'insert').length}, Links: ${preview.plan.category_modifier_links.filter(l => l.action === 'insert').length})`);
  console.log(`- Thao tác Already Equal: ${preview.summary.already_equal}`);
  console.log(`- Thao tác Conflict: ${preview.summary.conflict}`);
  console.log(`- Thao tác Unresolved: ${preview.summary.unresolved}`);
  console.log(`- Artifact: docs/proposals/full_menu_schema_migration/artifacts/copy-preview.json`);

  return preview;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runPreview();
}
