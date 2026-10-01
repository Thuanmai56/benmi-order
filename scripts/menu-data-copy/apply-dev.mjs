import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { executeD1Query } from './inventory.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '../..');

export async function applyToDev() {
  console.log('=== BẮT ĐẦU QUY TRÌNH ÁP DỤNG DỮ LIỆU LÊN DEV (blab-db-dev) ===\n');

  // 1. Đọc snapshot và mapping
  const manifestPath = path.resolve(REPO_ROOT, 'docs/proposals/full_menu_schema_migration/artifacts/latest_source_manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const snapDir = path.resolve(REPO_ROOT, `docs/proposals/full_menu_schema_migration/artifacts/${manifest.run_id}`);
  const snapshotData = JSON.parse(fs.readFileSync(path.resolve(snapDir, 'consolidated_snapshot.json'), 'utf8'));

  console.log(`[Dev Sync] 1. Trích xuất trạng thái hiện tại từ remote blab-db-dev...`);
  const existingGroups = executeD1Query('blab-db-dev', 'SELECT id, tenant_id, name, selection_type FROM modifier_groups;', true, 'dev');
  const existingOptions = executeD1Query('blab-db-dev', 'SELECT id, tenant_id, group_id, name FROM modifier_options;', true, 'dev');
  const existingLinks = executeD1Query('blab-db-dev', 'SELECT tenant_id, category_id, group_id FROM category_modifier_links;', true, 'dev');

  const existingGroupIds = new Set(existingGroups.map(g => g.id));
  const existingOptionIds = new Set(existingOptions.map(o => o.id));
  const existingLinkKeys = new Set(existingLinks.map(l => `${l.tenant_id}::${l.category_id}::${l.group_id}`));

  console.log(`  - Nhóm canonical hiện có trên Dev: ${existingGroups.length}`);
  console.log(`  - Options hiện có trên Dev: ${existingOptions.length}`);
  console.log(`  - Links hiện có trên Dev: ${existingLinks.length}`);

  // 2. Chuẩn bị danh sách bản ghi cần chèn
  const groupsToInsert = [];
  const optionsToInsert = [];
  const linksToInsert = [];

  const {
    menu_categories = [],
    menu_items = [],
    menu_customizations = [],
    menu_customization_option_rules = []
  } = snapshotData;

  const rulesMap = new Map();
  for (const r of menu_customization_option_rules) {
    const key = `${r.tenant_id}::${r.customization_key}::${r.option_id}`;
    if (!rulesMap.has(key)) rulesMap.set(key, []);
    rulesMap.get(key).push(r);
  }

  // 2.1 Customizations -> modifier_groups
  for (const c of menu_customizations) {
    const groupId = c.id;
    let parsedOpts = [];
    try {
      parsedOpts = typeof c.options_json === 'string' ? JSON.parse(c.options_json) : (c.options_json || []);
    } catch {
      parsedOpts = [];
    }

    if (!existingGroupIds.has(groupId)) {
      groupsToInsert.push({
        id: groupId,
        tenant_id: c.tenant_id,
        name: c.title,
        selection_type: c.type === 'checkbox' ? 'multiple' : 'single',
        is_required: c.is_required ? 1 : 0,
        min_selection: c.is_required ? 1 : 0,
        max_selection: c.type === 'checkbox' ? (parsedOpts.length || 99) : 1,
        sort_order: c.sort_order || 0,
        scope: 'order',
        source_metadata_json: JSON.stringify({
          source_table: 'menu_customizations',
          source_id: c.id,
          legacy_key: c.key,
          legacy_type: c.type
        })
      });
    }

    // Options inside customization
    for (let idx = 0; idx < parsedOpts.length; idx++) {
      const opt = parsedOpts[idx];
      const optId = opt.id ? `${groupId}_${opt.id}` : `${groupId}_idx_${idx}`;

      if (!existingOptionIds.has(optId)) {
        const optRules = rulesMap.get(`${c.tenant_id}::${c.key}::${opt.id}`) || 
                         rulesMap.get(`${c.tenant_id}::${c.key}::${opt.name}`) || [];
        const eligibilityRules = optRules.map(r => ({
          rule_id: r.id,
          rule_type: r.rule_type,
          min_order_subtotal: r.min_order_subtotal,
          threshold_basis: r.threshold_basis,
          error_message: r.error_message,
          is_active: r.is_active
        }));
        if (opt.min_order_amount || opt.minOrderSubtotal) {
          eligibilityRules.push({
            rule_id: `inline_${c.id}_${idx}`,
            rule_type: 'min_order_subtotal',
            min_order_subtotal: opt.min_order_amount || opt.minOrderSubtotal,
            threshold_basis: opt.thresholdBasis || 'merchandise_subtotal_after_pricing',
            error_message: opt.ruleErrorMessage || null,
            is_active: 1
          });
        }

        const subOptions = opt.sub_options || opt.subOptions || [];
        const isOos = Boolean(opt.is_out_of_stock || opt.isOutOfStock);

        optionsToInsert.push({
          id: optId,
          tenant_id: c.tenant_id,
          group_id: groupId,
          name: opt.name,
          price: Math.round(Number(opt.price || opt.surcharge || 0)),
          is_default: (opt.is_default || opt.isDefault) ? 1 : 0,
          sort_order: idx,
          out_of_stock_until: opt.out_of_stock_until || null,
          sub_options_json: JSON.stringify(subOptions),
          eligibility_rules_json: JSON.stringify(eligibilityRules),
          is_out_of_stock: isOos ? 1 : 0,
          description: opt.description || null,
          source_metadata_json: JSON.stringify({
            source_table: 'menu_customizations.options_json',
            source_group_id: c.id,
            source_option_id: opt.id || null,
            snapshot_ordinal: idx
          })
        });
      }
    }
  }

  // 2.2 Modifier categories -> modifier_groups
  const modifierCategories = menu_categories.filter(cat => 
    cat.category_type === 'modifier' || cat.category_type === 'order_customization'
  );

  const modCatToGroupIdMap = new Map();

  for (const cat of modifierCategories) {
    const groupId = cat.id;
    modCatToGroupIdMap.set(`${cat.tenant_id}::id::${cat.id}`, groupId);
    if (cat.slug) modCatToGroupIdMap.set(`${cat.tenant_id}::slug::${cat.slug}`, groupId);

    const items = menu_items.filter(it => it.tenant_id === cat.tenant_id && it.category_id === cat.id);

    if (!existingGroupIds.has(groupId)) {
      groupsToInsert.push({
        id: groupId,
        tenant_id: cat.tenant_id,
        name: cat.name,
        selection_type: (cat.selection_type === 'multiple') ? 'multiple' : 'single',
        is_required: cat.is_required ? 1 : 0,
        min_selection: cat.min_selection ?? (cat.is_required ? 1 : 0),
        max_selection: cat.max_selection ?? (cat.selection_type === 'multiple' ? (items.length || 99) : 1),
        sort_order: cat.sort_order || 0,
        scope: cat.category_type === 'order_customization' ? 'order' : 'category',
        source_metadata_json: JSON.stringify({
          source_table: 'menu_categories',
          source_id: cat.id,
          slug: cat.slug,
          category_type: cat.category_type
        })
      });
    }

    for (let idx = 0; idx < items.length; idx++) {
      const it = items[idx];
      const optId = `opt_${it.id}`;

      if (!existingOptionIds.has(optId)) {
        optionsToInsert.push({
          id: optId,
          tenant_id: cat.tenant_id,
          group_id: groupId,
          name: it.name,
          price: Math.round(Number(it.price || 0)),
          is_default: (idx === 0 && Boolean(cat.is_required)) ? 1 : 0,
          sort_order: it.sort_order || idx,
          out_of_stock_until: it.out_of_stock_until || null,
          sub_options_json: '[]',
          eligibility_rules_json: '[]',
          is_out_of_stock: it.out_of_stock_until ? 1 : 0,
          description: it.description || null,
          source_metadata_json: JSON.stringify({
            source_table: 'menu_items',
            source_item_id: it.id,
            category_id: it.category_id
          })
        });
      }
    }
  }

  // 2.3 Category modifier links from applied_modifiers
  const catalogCategories = menu_categories.filter(cat => cat.category_type === 'catalog');
  for (const cat of catalogCategories) {
    if (cat.allow_customization === 0) continue;

    let applied = [];
    if (cat.applied_modifiers && String(cat.applied_modifiers).trim() !== '') {
      try {
        applied = JSON.parse(cat.applied_modifiers);
      } catch {
        applied = String(cat.applied_modifiers).split(',').map(s => s.trim()).filter(Boolean);
      }
    } else {
      applied = ['*'];
    }

    if (applied.includes('*')) {
      const tenantCategoryGroups = [
        ...groupsToInsert.filter(g => g.tenant_id === cat.tenant_id && g.scope === 'category'),
        ...existingGroups.filter(g => g.tenant_id === cat.tenant_id && g.scope === 'category')
      ];
      for (let sortIdx = 0; sortIdx < tenantCategoryGroups.length; sortIdx++) {
        const g = tenantCategoryGroups[sortIdx];
        const linkKey = `${cat.tenant_id}::${cat.id}::${g.id}`;
        if (!existingLinkKeys.has(linkKey)) {
          linksToInsert.push({
            tenant_id: cat.tenant_id,
            category_id: cat.id,
            group_id: g.id,
            sort_order: sortIdx
          });
        }
      }
    } else {
      for (let sortIdx = 0; sortIdx < applied.length; sortIdx++) {
        const token = applied[sortIdx];
        const targetGroupId = modCatToGroupIdMap.get(`${cat.tenant_id}::id::${token}`) || 
                              modCatToGroupIdMap.get(`${cat.tenant_id}::slug::${token}`);
        if (targetGroupId) {
          const linkKey = `${cat.tenant_id}::${cat.id}::${targetGroupId}`;
          if (!existingLinkKeys.has(linkKey)) {
            linksToInsert.push({
              tenant_id: cat.tenant_id,
              category_id: cat.id,
              group_id: targetGroupId,
              sort_order: sortIdx
            });
          }
        }
      }
    }
  }

  console.log(`\n[Dev Sync] 2. Kế hoạch Insert vào blab-db-dev:`);
  console.log(`  - Groups mới cần thêm: ${groupsToInsert.length}`);
  console.log(`  - Options mới cần thêm: ${optionsToInsert.length}`);
  console.log(`  - Category links mới cần thêm: ${linksToInsert.length}`);
  console.log(`  - Groups cũ giữ nguyên (không đụng): ${existingGroups.length}`);

  // 3. Thực thi batch insert lên blab-db-dev
  console.log(`\n[Dev Sync] 3. Bắt đầu thực thi chèn dữ liệu lên blab-db-dev...`);

  // Helper escape
  const esc = (s) => (s === null || s === undefined ? 'NULL' : `'${String(s).replace(/'/g, "''")}'`);

  // Insert groups in batches of 10
  const BATCH_SIZE = 10;
  for (let i = 0; i < groupsToInsert.length; i += BATCH_SIZE) {
    const chunk = groupsToInsert.slice(i, i + BATCH_SIZE);
    let sql = '';
    for (const g of chunk) {
      sql += `INSERT INTO modifier_groups (
        id, tenant_id, name, selection_type, is_required, min_selection, max_selection, sort_order, scope, source_metadata_json
      ) VALUES (
        ${esc(g.id)}, ${esc(g.tenant_id)}, ${esc(g.name)}, ${esc(g.selection_type)},
        ${g.is_required}, ${g.min_selection}, ${g.max_selection}, ${g.sort_order},
        ${esc(g.scope)}, ${esc(g.source_metadata_json)}
      );\n`;
    }
    executeD1Query('blab-db-dev', sql, true, 'dev');
    console.log(`  ✓ Groups batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(groupsToInsert.length / BATCH_SIZE)} committed.`);
  }

  // Insert options in batches of 15
  for (let i = 0; i < optionsToInsert.length; i += 15) {
    const chunk = optionsToInsert.slice(i, i + 15);
    let sql = '';
    for (const o of chunk) {
      sql += `INSERT INTO modifier_options (
        id, tenant_id, group_id, name, price, is_default, sort_order, out_of_stock_until,
        sub_options_json, eligibility_rules_json, is_out_of_stock, description, source_metadata_json
      ) VALUES (
        ${esc(o.id)}, ${esc(o.tenant_id)}, ${esc(o.group_id)}, ${esc(o.name)},
        ${o.price}, ${o.is_default}, ${o.sort_order}, ${esc(o.out_of_stock_until)},
        ${esc(o.sub_options_json)}, ${esc(o.eligibility_rules_json)},
        ${o.is_out_of_stock}, ${esc(o.description)}, ${esc(o.source_metadata_json)}
      );\n`;
    }
    executeD1Query('blab-db-dev', sql, true, 'dev');
    console.log(`  ✓ Options batch ${Math.floor(i / 15) + 1}/${Math.ceil(optionsToInsert.length / 15)} committed.`);
  }

  // Insert category links in batches of 10
  for (let i = 0; i < linksToInsert.length; i += BATCH_SIZE) {
    const chunk = linksToInsert.slice(i, i + BATCH_SIZE);
    let sql = '';
    for (const l of chunk) {
      sql += `INSERT INTO category_modifier_links (
        tenant_id, category_id, group_id, sort_order
      ) VALUES (
        ${esc(l.tenant_id)}, ${esc(l.category_id)}, ${esc(l.group_id)}, ${l.sort_order}
      );\n`;
    }
    executeD1Query('blab-db-dev', sql, true, 'dev');
    console.log(`  ✓ Links batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(linksToInsert.length / BATCH_SIZE)} committed.`);
  }

  // 4. Verify lại sau apply
  console.log(`\n[Dev Sync] 4. Đối chiếu lại số lượng sau khi áp dụng lên Dev...`);
  const postCounts = executeD1Query('blab-db-dev', `
    SELECT 'modifier_groups' as tbl, count(*) as count FROM modifier_groups
    UNION ALL
    SELECT 'modifier_options' as tbl, count(*) as count FROM modifier_options
    UNION ALL
    SELECT 'category_modifier_links' as tbl, count(*) as count FROM category_modifier_links;
  `, true, 'dev');

  for (const c of postCounts) {
    console.log(`  - ${c.tbl.padEnd(25)}: ${c.count} dòng`);
  }

  console.log(`\n=== HOÀN TẤT ĐỒNG BỘ LÊN DEV THÀNH CÔNG! ===`);
  return {
    groups_added: groupsToInsert.length,
    options_added: optionsToInsert.length,
    links_added: linksToInsert.length,
    post_counts: postCounts
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  applyToDev().catch(err => {
    console.error('[Dev Sync Error]:', err);
    process.exit(1);
  });
}
