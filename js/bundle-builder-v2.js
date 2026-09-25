/* Combo selection shared by new v2 bundles and existing v1 rules. */
(() => {
  let draft = null;
  const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
  const getRule = item => item?.bundleRule || item?.targetItem?.bundleRule;
  const groupName = group => group.name || group.label?.['zh-TW'] || group.label?.vi || '搭配';
  const minOf = group => Number(group.minQuantity ?? group.minSelections ?? group.requiredCount ?? 1);
  const maxOf = group => Number(group.maxQuantity ?? group.maxSelections ?? group.requiredCount ?? minOf(group));
  const optionsFor = item => (bootstrapData?.modifiers || []).filter(mod => item.appliedModifiers?.includes('*') || item.appliedModifiers?.includes(mod.id) || item.appliedModifiers?.includes(mod.slug));
  const optionPrice = option => Number(option?.price || 0);
  const itemExtra = item => Number(item.surcharge || 0) + (item.modifiers || []).reduce((sum, mod) => sum + Number(mod.price || 0), 0);

  function buildFixed(group) {
    return (group.items || []).flatMap(fixed => {
      const item = (group.eligibleItems || []).find(candidate => candidate.id === fixed.itemId);
      if (!item) return [];
      return Array.from({ length: Number(fixed.quantity || 1) }, () => ({ itemId: item.id, name: item.name, quantity: 1,
        surcharge: Number(fixed.surcharge || item.surcharge || 0), modifiers: [] }));
    });
  }

  function validGroup(group, items) {
    if (!items || items.length < minOf(group) || items.length > maxOf(group)) return false;
    if (group.type === 'fixed') {
      const expected = new Map((group.items || []).map(item => [item.itemId, Number(item.quantity)]));
      for (const item of items) expected.set(item.itemId, Number(expected.get(item.itemId) || 0) - Number(item.quantity || 0));
      if ([...expected.values()].some(count => count !== 0)) return false;
    }
    if (!group.allowRepeats && new Set(items.map(item => item.itemId)).size !== items.length && group.type !== 'fixed') return false;
    return items.every(item => {
      const eligible = (group.eligibleItems || []).find(candidate => candidate.id === item.itemId && !candidate.isOutOfStock);
      if (!eligible) return false;
      if (Number(item.surcharge || 0) !== Number(eligible.surcharge || 0)) return false;
      if (Number(group.bundleVersion || 1) < 2) return true;
      return optionsFor(eligible).every(mod => {
        const count = (item.modifiers || []).filter(choice => choice.groupId === mod.id).length;
        return count >= Number(mod.minSelection || (mod.isRequired ? 1 : 0)) && (!mod.maxSelection || count <= Number(mod.maxSelection));
      });
    });
  }

  function render() {
    if (!draft) return;
    const { rule, groupIndex, selections, key, mode } = draft;
    const group = rule.groups[groupIndex];
    const items = selections[group.id] || [];
    const nav = document.getElementById('bundle-step-nav');
    nav.innerHTML = rule.groups.map((candidate, index) => `<button type="button" class="bundle-v2-nav ${index === groupIndex ? 'active' : ''}" onclick="bundleChooseGroup(${index})">${validGroup(candidate, selections[candidate.id]) ? '✓ ' : ''}${esc(groupName(candidate))}</button>`).join('');
    const stale = rule.groups.some(candidate => (selections[candidate.id] || []).some(item => {
      const current = candidate.eligibleItems?.find(source => source.id === item.itemId);
      return current && Number(current.surcharge || 0) !== Number(item.surcharge || 0);
    }));
    document.getElementById('bundle-refresh-prices').style.display = stale ? 'block' : 'none';
    document.getElementById('bundle-modal-group-label').textContent = groupName(group);
    document.getElementById('bundle-modal-current-count').textContent = String(items.length);
    document.getElementById('bundle-modal-max-count').textContent = String(maxOf(group));
    document.getElementById('bundle-progress-fill').style.width = `${Math.round(rule.groups.filter(g => validGroup(g, selections[g.id])).length * 100 / rule.groups.length)}%`;
    document.getElementById('bundle-quota-badge').style.display = validGroup(group, items) ? 'inline-flex' : 'none';

    const cats = new Map([['all', '全部']]);
    (group.eligibleItems || []).forEach(item => {
      const cat = bootstrapData?.catalog?.find(candidate => candidate.id === item.categoryId);
      if (cat) cats.set(cat.id, cat.shortName || cat.name);
    });
    document.getElementById('bundle-cat-tabs').innerHTML = group.type === 'fixed' ? '' : [...cats].map(([id, label]) => `<button type="button" class="bundle-cat-tab-btn ${draft.category === id ? 'active' : ''}" onclick="bundleFilterCategory('${esc(id)}')">${esc(label)}</button>`).join('');
    const list = document.getElementById('bundle-items-list');
    const display = group.type === 'fixed' ? items.map((item, index) => ({ item, index, source: (group.eligibleItems || []).find(it => it.id === item.itemId) }))
      : (group.eligibleItems || []).filter(it => draft.category === 'all' || it.categoryId === draft.category).map(source => ({ source }));
    const listed = display.map(entry => {
      const source = entry.source;
      if (!source) return '';
      const selected = group.type === 'fixed' ? [entry.item] : items.filter(item => item.itemId === source.id);
      const soldOut = Boolean(source.isOutOfStock);
      const count = selected.length;
      const canAdd = !soldOut && group.type !== 'fixed' && (maxOf(group) === 1 ? count === 0 : (items.length < maxOf(group) && (group.allowRepeats || count === 0)));
      const addAction = maxOf(group) === 1 && group.type !== 'fixed' ? `bundleSelectSingle('${esc(source.id)}')` : `bundleAddItem('${esc(source.id)}')`;
      const settings = selected.map((item, localIndex) => {
        const actualIndex = group.type === 'fixed' ? entry.index : items.indexOf(item);
        const mods = optionsFor(source);
        if (!mods.length) return '';
        const labels = (item.modifiers || []).map(mod => esc(mod.name)).join('、');
        const hasRequired = mods.some(mod => mod.isRequired || Number(mod.minSelection || 0) > 0);
        const isComplete = mods.every(mod => {
          const c = (item.modifiers || []).filter(choice => choice.groupId === mod.id).length;
          return c >= Number(mod.minSelection || (mod.isRequired ? 1 : 0));
        });
        const statusLabel = labels ? `<span class="bundle-v2-mod-labels">${labels}</span>`
          : (hasRequired ? '<span class="bundle-v2-mod-pending">需選擇客製化</span>' : '<span class="bundle-v2-mod-labels">可自選客製化</span>');
        return `<div class="bundle-v2-detail" onclick="event.stopPropagation()">
          ${statusLabel}
          <button type="button" class="bundle-v2-mod-btn ${!isComplete && hasRequired ? 'pulse' : ''}" onclick="bundleEditModifiers(${actualIndex})">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:4px; vertical-align:-1px;"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>客製化${selected.length > 1 ? ` (${localIndex + 1})` : ''}
          </button>
        </div>`;
      }).filter(Boolean).join('');
      const extra = Number(source.surcharge || 0);
      const cleanName = (source.name || '').replace(/^(\d+|[A-Za-z])\.\s*/, '');
      const safeName = esc(cleanName);
      const priceLabel = extra > 0 ? ` (+<span style="color:#059669; font-weight:800;">$${extra}</span>)` : '';
      const oosBadge = soldOut ? '<span class="oos-badge" style="color:#dc2626; font-size:12px; font-weight:800; margin-left:6px;">(已售完)</span>' : '';
      const disabledPlus = !canAdd;

      if (group.type === 'fixed') {
        return `<div class="bundle-item-card selected">
          <div class="bundle-item-head">
            <div class="bundle-item-info">
              <span class="bundle-item-title">${safeName}</span>${priceLabel}
            </div>
            <span class="bundle-v2-badge-fixed">已包含</span>
          </div>
          ${settings}
        </div>`;
      }

      if (count === 0) {
        return `<div class="bundle-item-card ${soldOut ? 'sold-out' : ''}" ${canAdd ? `onclick="${addAction}" style="cursor:pointer;"` : ''} style="${soldOut ? 'opacity: 0.5; pointer-events: none;' : ''}">
          <div class="bundle-item-head">
            <div class="bundle-item-info">
              <span class="bundle-item-title">${safeName}</span>${priceLabel}${oosBadge}
            </div>
            <div class="bundle-stepper" onclick="event.stopPropagation()">
              <button type="button" class="bundle-btn-add ${disabledPlus ? 'disabled' : ''}" onclick="${addAction}" ${disabledPlus ? 'disabled' : ''} aria-label="Add ${safeName}">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
              </button>
            </div>
          </div>
        </div>`;
      }

      return `<div class="bundle-item-card selected ${soldOut ? 'sold-out' : ''}">
        <div class="bundle-item-head">
          <div class="bundle-item-info">
            <span class="bundle-item-title">${safeName}</span>${priceLabel}${oosBadge}
          </div>
          <div class="bundle-stepper" onclick="event.stopPropagation()">
            <button type="button" class="bundle-btn-minus" onclick="bundleRemoveLastItemOf('${esc(source.id)}')" aria-label="Decrease">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            </button>
            <span class="bundle-qty-val">${count}</span>
            <button type="button" class="bundle-btn-plus ${disabledPlus ? 'disabled' : ''}" onclick="${addAction}" ${disabledPlus ? 'disabled' : ''} aria-label="Increase">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            </button>
          </div>
        </div>
        ${settings}
      </div>`;
    }).join('');
    const orphaned = group.type === 'fixed' ? '' : items.map((item, index) => ({ item, index })).filter(({ item }) => !(group.eligibleItems || []).some(source => source.id === item.itemId)).map(({ item, index }) =>
      `<div class="bundle-v2-item sold-out"><strong>${esc(item.name || item.itemId)}</strong><span>已無法選擇，請移除</span><button type="button" onclick="bundleRemoveItem(${index})">移除</button></div>`).join('');
    list.innerHTML = listed + orphaned || '<p class="bundle-v2-empty">目前沒有可選餐點</p>';

    const extra = rule.groups.reduce((sum, candidate) => sum + (selections[candidate.id] || []).reduce((amount, item) => amount + itemExtra(item), 0), 0);
    const price = Number(draft.itemInfo?.basePrice ?? draft.itemInfo?.targetItem?.price ?? 0) + extra;
    const complete = rule.groups.every(candidate => validGroup(candidate, selections[candidate.id]));
    const btn = document.getElementById('bundle-confirm-btn');
    btn.disabled = !complete;
    btn.textContent = complete ? `加入購物車 · $${price}` : `請完成所有選擇 · $${price}`;
    const copy = document.getElementById('bundle-copy-previous');
    copy.style.display = draft.portionIndex > 0 && mode === 'new' ? 'block' : 'none';
  }

  window.openBundleBuilderModal = function(catSlug, origName, portionIndex) {
    const key = catSlug + '_' + origName;
    const itemInfo = resolveCatalogItem(key);
    const rule = getRule(itemInfo);
    if (!rule?.groups?.length) return;
    rule.groups.forEach(group => { group.bundleVersion = Number(rule.version || 1); });
    const targetIndex = Number.isInteger(portionIndex) ? portionIndex : Number(cart[key] || 0);
    const existing = window.bundleCartData?.[key]?.[targetIndex];
    const selections = {};
    for (const group of rule.groups) {
      const prior = existing?.groups?.find(saved => saved.groupId === group.id);
      const previous = prior ? (prior.items || []).flatMap(item => Array.from({ length: Number(item.quantity || 1) }, () => ({ ...item, quantity: 1, modifiers: [...(item.modifiers || [])] }))) : [];
      if (group.type === 'fixed') {
        const remaining = [...previous];
        selections[group.id] = buildFixed(group).map(item => {
          const oldIndex = remaining.findIndex(old => old.itemId === item.itemId);
          const old = oldIndex >= 0 ? remaining.splice(oldIndex, 1)[0] : null;
          return old ? { ...item, surcharge: old.surcharge ?? item.surcharge, modifiers: [...(old.modifiers || [])] } : item;
        });
      } else selections[group.id] = previous;
    }
    const firstMissing = rule.groups.findIndex(group => !validGroup(group, selections[group.id]));
    draft = { key, catSlug, origName, itemInfo, rule, selections, portionIndex: targetIndex, groupIndex: Math.max(0, firstMissing), category: 'all', mode: existing ? 'edit' : 'new' };
    document.getElementById('bundle-modal-item-name').textContent = `${itemInfo.displayName || origName}${targetIndex ? ` · 第 ${targetIndex + 1} 份` : ''}`;
    document.getElementById('bundle-builder-modal').style.display = 'flex';
    render();
  };
  window.bundleQuickAdd = function(catSlug, origName) {
    const key = catSlug + '_' + origName;
    const rule = getRule(resolveCatalogItem(key));
    if (!rule?.groups?.length || rule.groups.some(group => group.type !== 'fixed')) return false;
    const groups = rule.groups.map(group => ({ groupId: group.id, groupName: groupName(group), items: buildFixed(group) }));
    if (rule.groups.some((group, index) => !validGroup(group, groups[index].items))) return false;
    const portionIndex = Number(cart[key] || 0);
    window.bundleCartData = window.bundleCartData || {};
    window.bundleCartData[key] = window.bundleCartData[key] || [];
    window.bundleCartData[key][portionIndex] = { portionIndex, groups };
    cart[key] = portionIndex + 1;
    const qty = document.getElementById('qty-' + catSlug + '-' + origName);
    if (qty) qty.textContent = String(cart[key]);
    const edit = document.getElementById('bundle-edit-btn-' + catSlug + '-' + origName);
    if (edit) edit.style.display = 'flex';
    updateTotal();
    return true;
  };
  window.closeBundleBuilderModal = function() { document.getElementById('bundle-builder-modal').style.display = 'none'; draft = null; };
  window.bundleChooseGroup = function(index) { if (!draft) return; draft.groupIndex = index; draft.category = 'all'; render(); };
  window.bundleFocusGroup = function(groupId) { if (!draft) return; const index = draft.rule.groups.findIndex(group => group.id === groupId); if (index >= 0) window.bundleChooseGroup(index); };
  window.bundleFilterCategory = function(category) { if (!draft) return; draft.category = category; render(); };
  window.bundleSelectSingle = function(itemId) {
    if (!draft) return;
    const group = draft.rule.groups[draft.groupIndex];
    const source = group.eligibleItems.find(item => item.id === itemId);
    if (!source || source.isOutOfStock) return;
    const wasIncomplete = !validGroup(group, draft.selections[group.id]);
    draft.selections[group.id] = [{ itemId, name: source.name, quantity: 1, surcharge: Number(source.surcharge || 0), modifiers: [] }];
    if (wasIncomplete && validGroup(group, draft.selections[group.id])) {
      const next = draft.rule.groups.findIndex(candidate => !validGroup(candidate, draft.selections[candidate.id]));
      if (next >= 0) draft.groupIndex = next;
    }
    render();
  };
  window.bundleAddItem = function(itemId) {
    if (!draft) return;
    const group = draft.rule.groups[draft.groupIndex];
    const list = draft.selections[group.id];
    const source = group.eligibleItems.find(item => item.id === itemId);
    if (!source || source.isOutOfStock || list.length >= maxOf(group) || (!group.allowRepeats && list.some(item => item.itemId === itemId))) return;
    list.push({ itemId, name: source.name, quantity: 1, surcharge: Number(source.surcharge || 0), modifiers: [] });
    render();
  };
  window.bundleRemoveItem = function(index) { if (!draft) return; draft.selections[draft.rule.groups[draft.groupIndex].id].splice(index, 1); render(); };
  window.bundleRemoveLastItemOf = function(itemId) {
    if (!draft) return;
    const group = draft.rule.groups[draft.groupIndex];
    if (!group || group.type === 'fixed') return;
    const list = draft.selections[group.id] || [];
    for (let i = list.length - 1; i >= 0; i--) {
      if (list[i].itemId === itemId) {
        list.splice(i, 1);
        break;
      }
    }
    render();
  };
  window.bundleEditModifiers = function(index) {
    if (!draft) return;
    const group = draft.rule.groups[draft.groupIndex];
    const item = draft.selections[group.id][index];
    const source = group.eligibleItems.find(it => it.id === item?.itemId);
    if (!source) return;
    const mods = optionsFor(source);
    const body = mods.map(mod => {
      const choices = mod.options.filter(option => !option.isOutOfStock).map(option => {
        const selected = item.modifiers.some(choice => choice.groupId === mod.id && choice.optionId === option.id);
        return `<label class="bundle-v2-mod-option"><input type="${mod.selectionType === 'multiple' ? 'checkbox' : 'radio'}" name="bundle-mod-${esc(mod.id)}" ${selected ? 'checked' : ''} onchange="bundleSetModifier('${esc(mod.id)}','${esc(option.id)}',this.checked)"><span>${esc(option.name)}${optionPrice(option) ? ` +$${optionPrice(option)}` : ''}</span></label>`;
      }).join('');
      return `<fieldset class="bundle-v2-mod-group"><legend>${esc(mod.name)}${mod.isRequired ? ' · 必選' : ''}</legend>${choices}</fieldset>`;
    }).join('');
    draft.editingItem = item;
    document.getElementById('bundle-modifier-editor').innerHTML = `<div class="bundle-v2-mod-panel"><button type="button" onclick="bundleCloseModifiers()">← 返回選擇</button><h3>${esc(source.name)}</h3>${body}<button type="button" onclick="bundleCloseModifiers()">完成</button></div>`;
    document.getElementById('bundle-modifier-editor').style.display = 'block';
  };
  window.bundleSetModifier = function(groupId, optionId, checked) {
    const item = draft?.editingItem;
    const mod = bootstrapData?.modifiers?.find(candidate => candidate.id === groupId);
    const option = mod?.options?.find(candidate => candidate.id === optionId);
    if (!item || !option || option.isOutOfStock) return;
    item.modifiers = item.modifiers.filter(choice => choice.groupId !== groupId || (mod.selectionType === 'multiple' && choice.optionId !== optionId));
    if (checked) {
      const count = item.modifiers.filter(choice => choice.groupId === groupId).length;
      if (mod.selectionType === 'multiple' && mod.maxSelection && count >= Number(mod.maxSelection)) {
        customAlert(`最多選擇 ${mod.maxSelection} 項`);
        window.bundleEditModifiers(draft.selections[draft.rule.groups[draft.groupIndex].id].indexOf(item));
        return;
      }
      item.modifiers.push({ groupId, optionId, name: option.name, price: optionPrice(option) });
    }
  };
  window.bundleCloseModifiers = function() { document.getElementById('bundle-modifier-editor').style.display = 'none'; if (draft) draft.editingItem = null; render(); };
  window.bundleCopyPrevious = function() {
    if (!draft || draft.portionIndex < 1) return;
    const previous = window.bundleCartData?.[draft.key]?.[draft.portionIndex - 1];
    if (!previous) return;
    for (const group of draft.rule.groups) {
      const saved = previous.groups.find(candidate => candidate.groupId === group.id);
      if (saved) draft.selections[group.id] = structuredClone(saved.items).flatMap(item => Array.from({ length: Number(item.quantity || 1) }, () => ({ ...item, quantity: 1 })));
    }
    render();
  };
  window.bundleRefreshPrices = function() {
    if (!draft) return;
    for (const group of draft.rule.groups) for (const item of draft.selections[group.id] || []) {
      const current = group.eligibleItems?.find(source => source.id === item.itemId);
      if (current) item.surcharge = Number(current.surcharge || 0);
    }
    render();
  };
  window.confirmBundleSelection = function() {
    if (!draft || !draft.rule.groups.every(group => validGroup(group, draft.selections[group.id]))) return;
    const { key, catSlug, origName, portionIndex, rule, selections } = draft;
    const portion = { portionIndex, groups: rule.groups.map(group => ({ groupId: group.id, groupName: groupName(group),
      items: selections[group.id].map(item => ({ ...item, price: 0 })) })) };
    window.bundleCartData = window.bundleCartData || {};
    window.bundleCartData[key] = window.bundleCartData[key] || [];
    window.bundleCartData[key][portionIndex] = portion;
    cart[key] = Math.max(Number(cart[key] || 0), portionIndex + 1);
    const qty = document.getElementById('qty-' + catSlug + '-' + origName);
    if (qty) qty.textContent = String(cart[key]);
    const edit = document.getElementById('bundle-edit-btn-' + catSlug + '-' + origName);
    if (edit) edit.style.display = 'flex';
    window.closeBundleBuilderModal();
    updateTotal();
  };
  window.bundleRemovePortion = function(catSlug, origName, index) {
    const key = catSlug + '_' + origName;
    window.bundleCartData?.[key]?.splice(index, 1);
    if (window.bundleCartData?.[key]) window.bundleCartData[key].forEach((portion, pIndex) => { portion.portionIndex = pIndex; });
    cart[key] = Math.max(0, Number(cart[key] || 0) - 1);
    const qty = document.getElementById('qty-' + catSlug + '-' + origName);
    if (qty) qty.textContent = String(cart[key]);
    updateTotal();
  };
  window.bundlePortionExtra = portion => (portion?.groups || []).reduce((sum, group) => sum + (group.items || []).reduce((amount, item) => amount + itemExtra(item) * Number(item.quantity || 1), 0), 0);
  window.checkAllBundlesComplete = function() {
    for (const key of Object.keys(cart || {})) {
      if (!cart[key]) continue;
      const item = resolveCatalogItem(key);
      const rule = getRule(item);
      if (!rule?.groups?.length) continue;
      const portions = window.bundleCartData?.[key] || [];
      for (let index = 0; index < cart[key]; index++) {
        const portion = portions[index];
        const missing = rule.groups.find(group => !validGroup(group, portion?.groups?.find(saved => saved.groupId === group.id)?.items?.flatMap(selected => Array.from({ length: Number(selected.quantity || 1) }, () => selected))));
        if (missing) return { valid: false, error: `${item.displayName || item.origName} · 第 ${index + 1} 份：請完成「${groupName(missing)}」`, key, portionIndex: index, groupId: missing.id };
      }
    }
    return { valid: true };
  };
})();
