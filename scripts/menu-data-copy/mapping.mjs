import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '../..');

function sha256(content) {
  return crypto.createHash('sha256').update(content).digest('hex');
}

/**
 * Generate stable deterministic target ID
 */
export function generateTargetId(prefix, ...components) {
  const raw = components.join('::');
  const hash = crypto.createHash('sha256').update(raw).digest('hex').substring(0, 16);
  return `${prefix}_${hash}`;
}

export function buildMappings(snapshotData) {
  const idMap = {
    meta: {
      generated_at: new Date().toISOString(),
      source_snapshot_hash: sha256(JSON.stringify(snapshotData))
    },
    groups: [],
    options: [],
    category_links: [],
    item_links: []
  };

  const conflicts = [];

  const {
    tenants = [],
    menu_categories = [],
    menu_items = [],
    menu_customizations = [],
    menu_customization_option_rules = [],
    modifier_groups: existingCanonicalGroups = [],
    modifier_options: existingCanonicalOptions = []
  } = snapshotData;

  const existingGroupIds = new Set(existingCanonicalGroups.map(g => g.id));
  const existingOptionIds = new Set(existingCanonicalOptions.map(o => o.id));

  // Map option rules by tenant + customization_key + option_id
  const rulesMap = new Map();
  for (const r of menu_customization_option_rules) {
    const key = `${r.tenant_id}::${r.customization_key}::${r.option_id}`;
    if (!rulesMap.has(key)) rulesMap.set(key, []);
    rulesMap.get(key).push(r);
  }

  // 1. Map menu_customizations -> modifier_groups
  for (const c of menu_customizations) {
    let parsedOpts = [];
    try {
      parsedOpts = typeof c.options_json === 'string' ? JSON.parse(c.options_json) : (c.options_json || []);
    } catch (e) {
      conflicts.push({
        type: 'INVALID_OPTIONS_JSON',
        tenant_id: c.tenant_id,
        source_id: c.id,
        message: e.message
      });
      continue;
    }

    const targetGroupId = `mg_cust_${c.tenant_id}_${c.id}`;

    // Check collision with existing canonical
    if (existingGroupIds.has(targetGroupId)) {
      conflicts.push({
        type: 'GROUP_ID_COLLISION',
        tenant_id: c.tenant_id,
        source_kind: 'menu_customizations',
        source_id: c.id,
        target_id: targetGroupId
      });
    }

    const groupRecord = {
      tenant_id: c.tenant_id,
      source_kind: 'menu_customizations',
      source_id: c.id,
      source_key: c.key,
      target_table: 'modifier_groups',
      target_id: targetGroupId,
      data: {
        id: targetGroupId,
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
      }
    };
    idMap.groups.push(groupRecord);

    // Map options inside customization
    for (let idx = 0; idx < parsedOpts.length; idx++) {
      const opt = parsedOpts[idx];
      const sourceOptId = opt.id || `ordinal:${idx}`;
      const targetOptId = opt.id
        ? generateTargetId('opt', c.tenant_id, c.id, opt.id)
        : generateTargetId('opt', c.tenant_id, c.id, `idx_${idx}`);

      // Lookup rule
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

      // Check inline rule from opt
      if (opt.min_order_amount || opt.minOrderSubtotal) {
        eligibilityRules.push({
          rule_id: `inline_${c.id}_${idx}`,
          rule_type: 'min_order_subtotal',
          min_order_subtotal: opt.min_order_amount || opt.minOrderSubtotal,
          threshold_basis: opt.thresholdBasis || 'merchandise_subtotal_after_pricing',
          error_message: opt.ruleErrorMessage || null,
          is_active: 1,
          derived_from: 'inline_option_json'
        });
      }

      const subOptions = opt.sub_options || opt.subOptions || [];
      const isOos = Boolean(opt.is_out_of_stock || opt.isOutOfStock);

      const optRecord = {
        tenant_id: c.tenant_id,
        source_kind: 'customization_option',
        source_group_id: c.id,
        source_option_identity: sourceOptId,
        target_table: 'modifier_options',
        target_id: targetOptId,
        data: {
          id: targetOptId,
          tenant_id: c.tenant_id,
          group_id: targetGroupId,
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
            snapshot_ordinal: idx,
            raw_keys: Object.keys(opt)
          })
        }
      };
      idMap.options.push(optRecord);
    }
  }

  // 2. Map modifier menu_categories -> modifier_groups
  // NOTE: Exclude phantom UI containers (category_type === 'order_customization' or slug === 'sec-flavor')
  // because order-level customizations are already mapped exclusively from menu_customizations above.
  const modifierCategories = menu_categories.filter(cat => 
    cat.category_type === 'modifier' && cat.slug !== 'sec-flavor'
  );

  const modCatToGroupIdMap = new Map(); // key: `${cat.tenant_id}::${cat.id}` or slug -> targetGroupId

  for (const cat of modifierCategories) {
    const targetGroupId = `mg_cat_${cat.tenant_id}_${cat.id}`;
    modCatToGroupIdMap.set(`${cat.tenant_id}::id::${cat.id}`, targetGroupId);
    if (cat.slug) {
      modCatToGroupIdMap.set(`${cat.tenant_id}::slug::${cat.slug}`, targetGroupId);
    }

    const items = menu_items.filter(it => it.tenant_id === cat.tenant_id && it.category_id === cat.id);

    const groupRecord = {
      tenant_id: cat.tenant_id,
      source_kind: 'menu_categories.modifier',
      source_id: cat.id,
      source_slug: cat.slug,
      target_table: 'modifier_groups',
      target_id: targetGroupId,
      data: {
        id: targetGroupId,
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
          short_name: cat.short_name || null,
          category_type: cat.category_type,
          original_selection_type: cat.selection_type
        })
      }
    };
    idMap.groups.push(groupRecord);

    // Map items in modifier category -> modifier_options
    for (let idx = 0; idx < items.length; idx++) {
      const it = items[idx];
      const targetOptId = generateTargetId('opt_item', cat.tenant_id, cat.id, it.id);

      const optRecord = {
        tenant_id: cat.tenant_id,
        source_kind: 'menu_items.modifier_option',
        source_group_id: cat.id,
        source_option_identity: it.id,
        target_table: 'modifier_options',
        target_id: targetOptId,
        data: {
          id: targetOptId,
          tenant_id: cat.tenant_id,
          group_id: targetGroupId,
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
            category_id: it.category_id,
            badge_text: it.badge_text || null
          })
        }
      };
      idMap.options.push(optRecord);
    }
  }

  // 3. Map category_modifier_links from applied_modifiers
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
      // Default when null/empty and allow_customization != 0 is wildcard '*'
      applied = ['*'];
    }

    if (applied.includes('*')) {
      // Link to all category-scoped modifier groups of this tenant
      const tenantCategoryGroups = idMap.groups.filter(g => 
        g.tenant_id === cat.tenant_id && g.data.scope === 'category'
      );
      for (let sortIdx = 0; sortIdx < tenantCategoryGroups.length; sortIdx++) {
        const g = tenantCategoryGroups[sortIdx];
        idMap.category_links.push({
          tenant_id: cat.tenant_id,
          category_id: cat.id,
          group_id: g.target_id,
          sort_order: sortIdx,
          derived_from: 'wildcard_all'
        });
      }
    } else {
      // Specific list of IDs or slugs
      for (let sortIdx = 0; sortIdx < applied.length; sortIdx++) {
        const token = applied[sortIdx];
        const targetGroupId = modCatToGroupIdMap.get(`${cat.tenant_id}::id::${token}`) || 
                              modCatToGroupIdMap.get(`${cat.tenant_id}::slug::${token}`);
        if (targetGroupId) {
          idMap.category_links.push({
            tenant_id: cat.tenant_id,
            category_id: cat.id,
            group_id: targetGroupId,
            sort_order: sortIdx,
            derived_from: `token:${token}`
          });
        } else {
          conflicts.push({
            type: 'UNRESOLVED_APPLIED_MODIFIER_TOKEN',
            tenant_id: cat.tenant_id,
            category_id: cat.id,
            category_name: cat.name,
            token: token
          });
        }
      }
    }
  }

  return { idMap, conflicts };
}

export function runMapping() {
  console.log('[Mapping] Bắt đầu xây dựng identity & field mapping...');

  const manifestPath = path.resolve(REPO_ROOT, 'docs/proposals/full_menu_schema_migration/artifacts/latest_source_manifest.json');
  if (!fs.existsSync(manifestPath)) {
    throw new Error('Chưa có file latest_source_manifest.json. Vui lòng chạy T02 snapshot trước!');
  }
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const snapDir = path.resolve(REPO_ROOT, `docs/proposals/full_menu_schema_migration/artifacts/${manifest.run_id}`);
  const consolidated = JSON.parse(fs.readFileSync(path.resolve(snapDir, 'consolidated_snapshot.json'), 'utf8'));

  const { idMap, conflicts } = buildMappings(consolidated);

  const outDir = path.resolve(REPO_ROOT, 'docs/proposals/full_menu_schema_migration');
  fs.writeFileSync(path.resolve(outDir, 'id-map.json'), JSON.stringify(idMap, null, 2), 'utf8');
  fs.writeFileSync(path.resolve(outDir, 'conflicts.json'), JSON.stringify(conflicts, null, 2), 'utf8');

  // Generate field-mapping.md documentation
  const mdContent = `# Bảng Quy chiếu Mapping Dữ liệu (Field Mapping Specification)

- **Thời điểm sinh**: ${new Date().toISOString()}
- **Snapshot Run ID**: \`${manifest.run_id}\`
- **Tổng số Groups map**: ${idMap.groups.length} nhóm
- **Tổng số Options map**: ${idMap.options.length} lựa chọn
- **Tổng số Category Links map**: ${idMap.category_links.length} liên kết
- **Tổng số Conflicts / Unresolved**: ${conflicts.length}

---

## 1. Định danh Nhóm Tuỳ chọn (Group Identity Mapping)

| Nguồn | Identity Nguồn | Target Group ID | Tên hiển thị | Selection Type | Scope |
|---|---|---|---|---|---|
${idMap.groups.map(g => `| \`${g.source_kind}\` | \`${g.source_id}\` | \`${g.target_id}\` | ${g.data.name} | \`${g.data.selection_type}\` | \`${g.data.scope}\` |`).join('\n')}

---

## 2. Quy tắc Định danh Lựa chọn (Option Identity Allocation)

- **Options có ID sẵn**: Sử dụng hàm băm xác định \`generateTargetId('opt', tenant, group_id, opt.id)\`. ID luôn ổn định 100% qua mọi lần chạy lại.
- **Options không có ID (ví dụ: bsc, dapinglin)**: Sử dụng thứ tự phần tử tại thời điểm snapshot \`generateTargetId('opt', tenant, group_id, 'idx_' + idx)\`.
- **Options từ Menu Items**: Sử dụng \`generateTargetId('opt_item', tenant, category_id, item.id)\`.

---

## 3. Bảo toàn Dữ liệu Sub-options và Rules

- **Sub-options**: Được serialized nguyên vẹn vào cột JSON \`sub_options_json\`.
- **Option Rules**: Tích hợp các rules từ bảng \`menu_customization_option_rules\` và inline rules thành mảng JSON trong cột \`eligibility_rules_json\`.
- **Provenance / Traceability**: Mọi bản ghi group và option đều mang trường \`source_metadata_json\` lưu rõ bảng gốc, ID gốc và thứ tự snapshot.

---

## 4. Xử lý Mâu thuẫn (Conflicts / Unresolved Report)

${conflicts.length === 0 ? '**Không phát hiện mâu thuẫn hay token không giải được (0 conflicts)!**' : JSON.stringify(conflicts, null, 2)}
`;

  fs.writeFileSync(path.resolve(outDir, 'field-mapping.md'), mdContent, 'utf8');

  console.log(`[Mapping] Hoàn tất T03!`);
  console.log(`- Groups mapped: ${idMap.groups.length}`);
  console.log(`- Options mapped: ${idMap.options.length}`);
  console.log(`- Category links mapped: ${idMap.category_links.length}`);
  console.log(`- Conflicts count: ${conflicts.length}`);
  console.log(`- Artifacts: id-map.json, conflicts.json, field-mapping.md`);

  return { idMap, conflicts };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runMapping();
}
