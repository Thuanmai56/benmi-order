/* Three-step menu combo editor. Existing bundle rules remain readable. */
let comboWizard = null;
const comboEscape = value => String(value ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
const comboText = key => t(key);
const comboGroups = () => comboWizard?.config.groups || [];
const comboDraftKey = () => `bundle_wizard:${getTenantIdFromUrl()}:${comboWizard.product.id || 'new'}`;
const comboCatalogItems = () => (currentMenuData || []).filter(cat => cat.type === 'catalog').flatMap(cat => cat.items.filter(item => item.id && item.id !== comboWizard?.product.id && !item.bundleRule).map(item => ({ id: item.id, name: item.name, categoryId: cat.catId, categoryName: cat.title })));
// Keep the legacy API label fields synchronized with the single editable name.
const comboLabel = (zh, vi) => { const name = currentLang === 'vi' ? vi : zh; return { 'zh-TW': name, vi: name }; };
const comboGroupName = group => typeof group.label === 'string' ? group.label : (group.label?.[currentLang] || group.name || group.label?.['zh-TW'] || group.label?.vi || '');
function comboSetGroupName(group, name) { group.name = name; group.label = { 'zh-TW': name, vi: name }; }
const comboNewGroup = type => ({ id: `group_${crypto.randomUUID()}`, type, label: comboLabel('', ''), minQuantity: 1, maxQuantity: 1, allowRepeats: false, sources: [], items: [], surcharges: {} });

function persistComboWizard() {
  if (!comboWizard) return;
  comboWizard.changed = true;
  localStorage.setItem(comboDraftKey(), JSON.stringify({ product: comboWizard.product, config: comboWizard.config, step: comboWizard.step }));
}

function openBundleWizard(catIndex = activeCategoryIndex, itemIndex = null) {
  if (window.currentTenantFeatures?.includes('disable_bundle_builder_v2')) return;
  if (isMenuDirty && !confirmLeaveMenu()) return;
  if (!currentMenuData?.[catIndex] || currentMenuData[catIndex].type !== 'catalog') return;
  const cat = currentMenuData[catIndex];
  const item = itemIndex === null ? null : cat.items[itemIndex];
  const product = { id: item?.id || null, categoryId: cat.catId, name: item?.name || '', price: Number(item?.price || 0) };
  const config = item?.bundleRule?.groups?.length ? {
    version: 2,
    groups: item.bundleRule.groups.map(group => ({ id: group.id, type: group.type || 'choice',
      label: comboGroupName(group),
      minQuantity: Number(group.minQuantity || 1), maxQuantity: Number(group.maxQuantity || group.minQuantity || 1),
      allowRepeats: Boolean(group.allowRepeats), sources: group.sources || [], items: group.items || [], surcharges: group.surcharges || {} }))
  } : { version: 2, groups: [] };
  comboWizard = { product, config, step: 0, changed: false, returnFocus: document.activeElement };
  const saved = localStorage.getItem(comboDraftKey());
  if (saved && confirm(comboText('comboRestoreDraft'))) {
    try { const parsed = JSON.parse(saved); comboWizard.product = parsed.product; comboWizard.config = parsed.config; comboWizard.step = parsed.step || 0; comboWizard.changed = true; } catch { localStorage.removeItem(comboDraftKey()); }
  }
  comboGroups().forEach(group => comboSetGroupName(group, comboGroupName(group)));
  document.body.classList.add('bundle-wizard-open');
  document.getElementById('bundle-wizard').style.display = 'flex';
  renderComboWizard();
  document.getElementById('bundle-wizard-title').focus();
}
window.openBundleWizard = openBundleWizard;

function closeBundleWizard() {
  if (!comboWizard) return;
  if (comboWizard.changed && !confirm(comboText('comboLeaveDraft'))) return;
  dismissComboWizard();
}
window.closeBundleWizard = closeBundleWizard;
function dismissComboWizard(skipRestore = false) {
  const returnFocus = comboWizard?.returnFocus;
  document.getElementById('bundle-wizard').style.display = 'none';
  document.body.classList.remove('bundle-wizard-open');
  comboWizard = null;
  returnFocus?.focus();
  if (!skipRestore && window._hubModalReturnState) {
    const state = window._hubModalReturnState;
    window._hubModalReturnState = null;
    if (typeof openItemDetailModal === 'function') {
      openItemDetailModal(state.catIdx, state.itemIdx);
    }
  }
}

function comboWizardBack() { if (comboWizard?.step > 0) { comboWizard.step--; persistComboWizard(); renderComboWizard(); } }
window.bundleWizardBack = comboWizardBack;
function comboWizardField(field, value) { comboWizard.product[field] = field === 'price' ? Number(value) : value; persistComboWizard(); }
window.comboWizardField = comboWizardField;
function comboWizardImage(event) {
  const file = event.target.files?.[0];
  if (!file || !comboWizard) return;
  const reader = new FileReader();
  reader.onload = () => {
    const image = new Image();
    image.onload = () => {
      if (!comboWizard) return;
      const scale = Math.min(1, 800 / image.width, 800 / image.height);
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(image.width * scale));
      canvas.height = Math.max(1, Math.round(image.height * scale));
      canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
      comboWizard.imageDataUri = canvas.toDataURL('image/webp', 0.8);
      persistComboWizard();
      renderComboWizard();
    };
    image.src = reader.result;
  };
  reader.readAsDataURL(file);
}
window.comboWizardImage = comboWizardImage;
function comboWizardGroupField(index, field, value) {
  const group = comboGroups()[index]; if (!group) return;
  if (field === 'name') comboSetGroupName(group, value);
  else if (field === 'minQuantity') { group.minQuantity = Math.max(1, Number(value)); group.maxQuantity = group.minQuantity; }
  else if (field === 'allowRepeats') group.allowRepeats = Boolean(value);
  persistComboWizard();
}
window.comboWizardGroupField = comboWizardGroupField;

function comboWizardTemplate(kind) {
  if (comboGroups().length && !confirm(comboText('comboReplaceTemplate'))) return;
  const newChoice = (zh, vi) => { const group = comboNewGroup('choice'); group.label = comboLabel(zh, vi); return group; };
  if (kind === 'meal') comboWizard.config.groups = [newChoice('選擇主餐', 'Chọn món chính'), newChoice('選擇飲料', 'Chọn đồ uống')];
  if (kind === 'many') { const group = newChoice('任選餐點', 'Chọn món'); group.minQuantity = group.maxQuantity = 2; comboWizard.config.groups = [group]; }
  if (kind === 'fixed') { const group = comboNewGroup('fixed'); group.label = comboLabel('套餐內容', 'Món trong combo'); comboWizard.config.groups = [group]; }
  comboWizard.preview = {}; comboWizard.search = {}; comboWizard.filters = {};
  persistComboWizard(); renderComboWizard();
  document.querySelector('.bundle-wizard-group input')?.focus();
}
window.comboWizardTemplate = comboWizardTemplate;
function comboWizardAddGroup(type) { comboGroups().push(comboNewGroup(type)); persistComboWizard(); renderComboWizard(); }
window.comboWizardAddGroup = comboWizardAddGroup;
function comboWizardRemoveGroup(index) { comboGroups().splice(index, 1); persistComboWizard(); renderComboWizard(); }
window.comboWizardRemoveGroup = comboWizardRemoveGroup;

function comboWizardToggleItem(index, itemId, checked) {
  const group = comboGroups()[index];
  if (group.type === 'fixed') {
    group.items = group.items.filter(item => item.itemId !== itemId);
    if (checked) group.items.push({ itemId, quantity: 1, surcharge: 0 });
  } else {
    let source = group.sources.find(src => src.type === 'item_list');
    if (!source) { source = { type: 'item_list', itemIds: [] }; group.sources.push(source); }
    source.itemIds = source.itemIds.filter(id => id !== itemId);
    if (checked) source.itemIds.push(itemId);
    if (!checked) delete group.surcharges[itemId];
  }
  persistComboWizard(); renderComboWizard();
}
window.comboWizardToggleItem = comboWizardToggleItem;
function comboWizardToggleCategory(index, categoryId, checked) {
  const group = comboGroups()[index];
  group.sources = group.sources.filter(source => !(source.type === 'category' && source.refId === categoryId));
  if (checked) group.sources.push({ type: 'category', refId: categoryId });
  persistComboWizard(); renderComboWizard();
}
window.comboWizardToggleCategory = comboWizardToggleCategory;
function comboWizardItemValue(index, itemId, field, value) {
  const group = comboGroups()[index];
  if (group.type === 'fixed') {
    const item = group.items.find(candidate => candidate.itemId === itemId);
    if (item) item[field] = Number(value);
  } else group.surcharges[itemId] = Number(value);
  persistComboWizard();
}
window.comboWizardItemValue = comboWizardItemValue;
function comboWizardSearch(index, value) { comboWizard.search = comboWizard.search || {}; comboWizard.search[index] = value; renderComboWizard(); document.getElementById(`combo-search-${index}`)?.focus(); }
window.comboWizardSearch = comboWizardSearch;
function comboWizardFilter(index, categoryId) { comboWizard.filters = comboWizard.filters || {}; comboWizard.filters[index] = categoryId; renderComboWizard(); }
window.comboWizardFilter = comboWizardFilter;
function comboWizardPreviewPick(index, itemId, change) {
  const group = comboGroups()[index];
  if (!group || group.type !== 'choice') return;
  comboWizard.preview = comboWizard.preview || {};
  const chosen = comboWizard.preview[group.id] || [];
  if (Number(group.maxQuantity) === 1 && change > 0) comboWizard.preview[group.id] = [itemId];
  else if (change < 0) { const at = chosen.lastIndexOf(itemId); if (at >= 0) chosen.splice(at, 1); comboWizard.preview[group.id] = chosen; }
  else if (chosen.length < Number(group.maxQuantity) && (group.allowRepeats || !chosen.includes(itemId))) { chosen.push(itemId); comboWizard.preview[group.id] = chosen; }
  renderComboWizard();
}
window.comboWizardPreviewPick = comboWizardPreviewPick;

function comboWizardError() {
  const p = comboWizard.product;
  if (!p.name.trim()) return comboText('comboNeedName');
  if (!Number.isFinite(p.price) || p.price < 0) return comboText('comboNeedPrice');
  if (!comboGroups().length) return comboText('comboNeedGroup');
  const validIds = new Set(comboCatalogItems().map(item => item.id));
  for (let i = 0; i < comboGroups().length; i++) {
    const group = comboGroups()[i];
    if (!comboGroupName(group).trim()) return `${i + 1}: ${comboText('comboNeedGroupName')}`;
    if (group.type === 'fixed') {
      if (!group.items.length || new Set(group.items.map(item => item.itemId)).size !== group.items.length || group.items.some(item => !validIds.has(item.itemId) || !Number.isInteger(Number(item.quantity)) || Number(item.quantity) < 1 || !Number.isFinite(Number(item.surcharge)) || Number(item.surcharge) < 0)) return `${i + 1}: ${comboText('comboNeedItems')}`;
    } else {
      const eligible = new Set();
      for (const source of group.sources) {
        if (source.type === 'item_list') for (const id of source.itemIds) eligible.add(id);
        if (source.type === 'category') comboCatalogItems().filter(item => item.categoryId === source.refId).forEach(item => eligible.add(item.id));
      }
      if (!Number.isInteger(Number(group.minQuantity)) || Number(group.minQuantity) < 1 || eligible.size < 1 || [...eligible].some(id => !validIds.has(id)) || (!group.allowRepeats && eligible.size < group.minQuantity) || Object.values(group.surcharges).some(value => !Number.isFinite(Number(value)) || Number(value) < 0)) return `${i + 1}: ${comboText('comboNeedItems')}`;
    }
  }
  return '';
}

function comboWizardNext() {
  if (!comboWizard) return;
  const error = comboWizard.step === 0 ? (!comboWizard.product.name.trim() ? comboText('comboNeedName') : !Number.isFinite(comboWizard.product.price) || comboWizard.product.price < 0 ? comboText('comboNeedPrice') : '') : comboWizard.step === 1 ? comboWizardError() : '';
  document.getElementById('bundle-wizard-error').textContent = error;
  if (error) return;
  if (comboWizard.step < 2) { comboWizard.step++; persistComboWizard(); renderComboWizard(); return; }
  saveComboWizard();
}
window.bundleWizardNext = comboWizardNext;

function renderComboWizard() {
  if (!comboWizard) return;
  const { product, step } = comboWizard;
  document.getElementById('bundle-wizard-steps').setAttribute('aria-label', comboText('comboStepsLabel'));
  document.getElementById('bundle-wizard-error').textContent = '';
  document.getElementById('bundle-wizard-title').textContent = product.id ? comboText('comboEditTitle') : comboText('comboCreateTitle');
  document.getElementById('bundle-wizard-close').textContent = comboText('comboClose');
  document.getElementById('bundle-wizard-prev').textContent = comboText('comboBack');
  document.getElementById('bundle-wizard-prev').disabled = step === 0;
  document.getElementById('bundle-wizard-next').textContent = comboText(step === 2 ? 'comboSave' : 'comboContinue');
  renderBundleStepper(step);
  const body = document.getElementById('bundle-wizard-body');
  if (comboWizard.renderedStep !== step) body.scrollTop = 0;
  comboWizard.renderedStep = step;
  if (step === 0) {
    body.innerHTML = `<aside class="bundle-wizard-guide"><h2>${comboText('comboWhatTitle')}</h2><p>${comboText('comboWhatBody')}</p><p>${comboText('comboPriceHelp')}</p><p>${comboText('comboSetupHelp')}</p></aside><div class="bundle-wizard-info-fields"><label>${comboText('comboProductName')}<input type="text" value="${comboEscape(product.name)}" oninput="comboWizardField('name',this.value)"></label>
      <label>${comboText('comboBasePrice')}<input type="number" min="0" step="1" value="${product.price}" oninput="comboWizardField('price',this.value)"></label>
      <label>${comboText('comboCategory')}<select onchange="comboWizardField('categoryId',this.value)">${currentMenuData.filter(cat => cat.type === 'catalog').map(cat => `<option value="${comboEscape(cat.catId)}" ${cat.catId === product.categoryId ? 'selected' : ''}>${comboEscape(cat.title)}</option>`).join('')}</select></label>
      <label>${comboText('comboImage')}<input type="file" accept="image/*" onchange="comboWizardImage(event)"></label>
      ${comboWizard.imageDataUri ? `<img src="${comboWizard.imageDataUri}" alt="${comboText('comboImage')}" class="bundle-wizard-image-preview">` : ''}
      ${product.id ? `<button type="button" class="btn btn-ghost" onclick="openImageModal('${comboEscape(currentMenuData.find(cat => cat.catId === product.categoryId)?.id || '')}','${comboEscape(product.name)}')">${comboText('comboImage')}</button>` : ''}</div>`;
  } else if (step === 1) {
    const candidates = comboCatalogItems();
    const categories = currentMenuData.filter(cat => cat.type === 'catalog');
    const cards = ['meal', 'many', 'fixed'].map(kind => {
      const key = { meal: 'Meal', many: 'Many', fixed: 'Fixed' }[kind];
      return `<button type="button" class="bundle-template-card" onclick="comboWizardTemplate('${kind}')"><strong>${comboText('comboTemplate' + key)}</strong><span>${comboText('comboTemplate' + key + 'Help')}</span><span class="bundle-template-example">${comboText('comboTemplate' + key + 'Example')}</span><span class="bundle-template-action">${comboText('comboUseTemplate')}</span></button>`;
    }).join('');
    const templateContent = `<p>${comboText('comboTemplatesHelp')}</p><div class="bundle-wizard-templates">${cards}</div>`;
    const templates = `<section class="bundle-wizard-guide"><h2>${comboText('comboPartsTitle')}</h2><p>${comboText('comboPartsHelp')}</p></section>` + (comboGroups().length
      ? `<details class="bundle-wizard-guide"><summary>${comboText('comboChangeTemplate')}</summary>${templateContent}</details>`
      : `<section class="bundle-wizard-guide"><h2>${comboText('comboTemplatesTitle')}</h2>${templateContent}</section>`);
    body.innerHTML = templates + comboGroups().map((group, index) => {
      const selectedIds = group.type === 'fixed' ? group.items.map(it => it.itemId) : group.sources.filter(src => src.type === 'item_list').flatMap(src => src.itemIds || []);
      const search = comboWizard.search?.[index] || '';
      const filter = comboWizard.filters?.[index] || 'all';
      const visible = candidates.filter(item => (filter === 'all' || item.categoryId === filter) && item.name.toLowerCase().includes(search.toLowerCase()));
      return `<section class="bundle-wizard-group"><header><h2>${index + 1}. ${comboText(group.type === 'fixed' ? 'comboFixedGroup' : 'comboChoiceGroup')}</h2><button type="button" onclick="comboWizardRemoveGroup(${index})">${comboText('comboRemove')}</button></header><p class="bundle-wizard-hint">${comboText(group.type === 'fixed' ? 'comboFixedHelp' : 'comboChoiceHelp')}</p>
        <label>${comboText('comboGroupName')}<input value="${comboEscape(comboGroupName(group))}" oninput="comboWizardGroupField(${index},'name',this.value)"></label>
        ${group.type === 'choice' ? `<div class="bundle-wizard-two"><label>${comboText('comboQuantity')}<input type="number" min="1" value="${group.minQuantity}" onchange="comboWizardGroupField(${index},'minQuantity',this.value)"></label><label class="bundle-wizard-check"><input type="checkbox" ${group.allowRepeats ? 'checked' : ''} onchange="comboWizardGroupField(${index},'allowRepeats',this.checked)">${comboText('comboRepeat')}</label></div>` : ''}
        <div class="bundle-wizard-two"><input id="combo-search-${index}" type="search" placeholder="${comboText('comboSearch')}" value="${comboEscape(search)}" oninput="comboWizardSearch(${index},this.value)"><select aria-label="${comboText('comboFilterCategory')}" onchange="comboWizardFilter(${index},this.value)"><option value="all">${comboText('comboAllCategories')}</option>${categories.map(cat => `<option value="${comboEscape(cat.catId)}" ${filter === cat.catId ? 'selected' : ''}>${comboEscape(cat.title)}</option>`).join('')}</select></div>
        <div class="bundle-wizard-candidates">${visible.map(item => {
          const selected = selectedIds.includes(item.id);
          const fixed = group.items.find(f => f.itemId === item.id);
          const extra = fixed?.surcharge ?? group.surcharges[item.id] ?? 0;
          return `<div class="bundle-wizard-candidate"><label><input type="checkbox" ${selected ? 'checked' : ''} onchange="comboWizardToggleItem(${index},'${comboEscape(item.id)}',this.checked)"><span>${comboEscape(item.name)} · ${comboEscape(item.categoryName)}</span></label>${selected ? `<label>${comboText('comboSurcharge')}<input type="number" min="0" value="${extra}" onchange="comboWizardItemValue(${index},'${comboEscape(item.id)}','surcharge',this.value)"></label>${fixed ? `<label>${comboText('comboQuantity')}<input type="number" min="1" value="${fixed.quantity}" onchange="comboWizardItemValue(${index},'${comboEscape(item.id)}','quantity',this.value)"></label>` : ''}` : ''}</div>`;
        }).join('')}</div>
        ${group.type === 'choice' ? `<details><summary>${comboText('comboWholeCategory')}</summary><p>${comboText('comboWholeCategoryHelp')}</p>${categories.map(cat => `<label class="bundle-wizard-check"><input type="checkbox" ${group.sources.some(src => src.type === 'category' && src.refId === cat.catId) ? 'checked' : ''} onchange="comboWizardToggleCategory(${index},'${comboEscape(cat.catId)}',this.checked)">${comboEscape(cat.title)}</label>`).join('')}</details>` : ''}
      </section>`;
    }).join('') + `<div class="bundle-wizard-add"><button type="button" onclick="comboWizardAddGroup('choice')">${comboText('comboAddChoice')}</button><button type="button" onclick="comboWizardAddGroup('fixed')">${comboText('comboAddFixed')}</button></div>`;
  } else {
    const error = comboWizardError();
    comboWizard.preview = comboWizard.preview || {};
    const candidates = comboCatalogItems();
    let previewExtra = 0;
    let complete = true;
    const sections = comboGroups().map((group, index) => {
      const name = comboEscape(comboGroupName(group));
      if (group.type === 'fixed') {
        const details = group.items.map(fixed => {
          const item = candidates.find(candidate => candidate.id === fixed.itemId);
          previewExtra += Number(fixed.surcharge || 0) * Number(fixed.quantity || 1);
          return `<div>${comboEscape(item?.name || fixed.itemId)} ×${fixed.quantity} · ${Number(fixed.surcharge) ? `+$${fixed.surcharge}` : comboText('comboIncluded')}</div>`;
        }).join('');
        return `<section><h3>${name}</h3>${details}</section>`;
      }
      const eligible = [...new Set(group.sources.flatMap(source => source.type === 'item_list' ? source.itemIds || [] : candidates.filter(item => item.categoryId === source.refId).map(item => item.id)))];
      const chosen = (comboWizard.preview[group.id] || []).filter(id => eligible.includes(id));
      comboWizard.preview[group.id] = chosen;
      if (chosen.length < Number(group.minQuantity) || chosen.length > Number(group.maxQuantity)) complete = false;
      chosen.forEach(id => { previewExtra += Number(group.surcharges[id] || 0); });
      const controls = eligible.map(id => {
        const item = candidates.find(candidate => candidate.id === id);
        if (!item) return '';
        const count = chosen.filter(value => value === id).length;
        const extra = Number(group.surcharges[id] || 0);
        return `<div class="bundle-wizard-preview-choice"><span>${comboEscape(item.name)} · ${extra ? `+$${extra}` : comboText('comboIncluded')}</span>${count ? `<button type="button" onclick="comboWizardPreviewPick(${index},'${comboEscape(id)}',-1)" aria-label="${comboText('comboRemove')}">−</button>` : ''}<strong>${count || ''}</strong><button type="button" onclick="comboWizardPreviewPick(${index},'${comboEscape(id)}',1)" ${chosen.length >= Number(group.maxQuantity) && Number(group.maxQuantity) !== 1 ? 'disabled' : ''}>${Number(group.maxQuantity) === 1 ? comboText('comboSelect') : '+'}</button></div>`;
      }).join('');
      return `<section><h3>${name} · ${chosen.length}/${group.minQuantity}</h3>${controls}</section>`;
    }).join('');
    body.innerHTML = `<div class="bundle-wizard-preview"><h2>${comboEscape(product.name)} · $${Number(product.price) + previewExtra}</h2>${sections}<p>${comboText(complete ? 'comboPreviewComplete' : 'comboPreviewIncomplete')}</p></div>${error ? `<p class="bundle-wizard-error">${comboEscape(error)}</p>` : ''}`;
  }
}

async function saveComboWizard() {
  const error = comboWizardError();
  if (error) { document.getElementById('bundle-wizard-error').textContent = error; return; }
  const btn = document.getElementById('bundle-wizard-next');
  btn.disabled = true;
  try {
    const draftKey = comboDraftKey();
    const response = await fetch(`${WORKER_BASE}/api/menu/bundles?tenant_id=${encodeURIComponent(getTenantIdFromUrl())}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ product: comboWizard.product, config: comboWizard.config })
    });
    const result = await response.json();
    if (!response.ok || !result.success) throw new Error(result.error || comboText('comboSaveFailed'));
    localStorage.removeItem(draftKey);
    comboWizard.product.id = result.product.id;
    if (comboWizard.imageDataUri) {
      const category = currentMenuData.find(cat => cat.catId === comboWizard.product.categoryId);
      const name = `${category?.id || comboWizard.product.categoryId}_${comboWizard.product.name}`;
      const imageResponse = await fetch(`${WORKER_BASE}/api/image?tenant_id=${encodeURIComponent(getTenantIdFromUrl())}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, dataUri: comboWizard.imageDataUri })
      });
      if (!imageResponse.ok) throw new Error(`${comboText('comboSaved')} · ${comboText('imageUploadFail')}`);
    }
    dismissComboWizard(true);
    await loadMenuData();
    alert(comboText('comboSaved'));
    if (window._hubModalReturnState) {
      const state = window._hubModalReturnState;
      window._hubModalReturnState = null;
      if (Array.isArray(currentMenuData) && typeof openItemDetailModal === 'function') {
        const freshCatIdx = currentMenuData.findIndex(c => c.id === state.catId);
        if (freshCatIdx !== -1) {
          const freshItemIdx = currentMenuData[freshCatIdx].items?.findIndex(it => it.name === state.itemName);
          if (freshItemIdx !== -1) {
            openItemDetailModal(freshCatIdx, freshItemIdx);
          }
        }
      }
    }
  } catch (error) {
    document.getElementById('bundle-wizard-error').textContent = error.message || comboText('comboSaveFailed');
  } finally { btn.disabled = false; }
}

function comboWizardJumpToStep(targetStep) {
  if (!comboWizard) return;
  if (targetStep === comboWizard.step) return;

  if (targetStep < comboWizard.step) {
    comboWizard.step = targetStep;
    persistComboWizard();
    renderComboWizard();
    return;
  }

  if (comboWizard.step === 0 || targetStep > 0) {
    if (!comboWizard.product.name.trim()) {
      document.getElementById('bundle-wizard-error').textContent = comboText('comboNeedName');
      return;
    }
    if (!Number.isFinite(comboWizard.product.price) || comboWizard.product.price < 0) {
      document.getElementById('bundle-wizard-error').textContent = comboText('comboNeedPrice');
      return;
    }
  }

  if (targetStep === 2) {
    const error = comboWizardError();
    if (error) {
      document.getElementById('bundle-wizard-error').textContent = error;
      return;
    }
  }

  comboWizard.step = targetStep;
  persistComboWizard();
  renderComboWizard();
}
window.comboWizardJumpToStep = comboWizardJumpToStep;

function renderBundleStepper(currentStep) {
  const stepsContainer = document.getElementById('bundle-wizard-steps');
  if (!stepsContainer) return;

  const stepsConfig = [
    { key: 'comboStepInfo', subKey: 'comboStepInfoSub', num: 1 },
    { key: 'comboStepParts', subKey: 'comboStepPartsSub', num: 2 },
    { key: 'comboStepPreview', subKey: 'comboStepPreviewSub', num: 3 }
  ];

  const checkSvg = `<svg class="bundle-step-check" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;

  let html = `<div class="bundle-stepper">`;

  stepsConfig.forEach((cfg, idx) => {
    const isCompleted = idx < currentStep;
    const isActive = idx === currentStep;
    const isPending = idx > currentStep;

    const stateClass = isCompleted ? 'is-completed' : isActive ? 'is-active' : 'is-pending';
    const ariaCurrent = isActive ? 'aria-current="step"' : '';

    const badgeText = isCompleted ? comboText('comboStepCompleted') : isActive ? comboText('comboStepCurrent') : comboText('comboStepPending');
    const titleText = `${cfg.num}. ${comboText(cfg.key)}`;
    const subText = comboText(cfg.subKey) || '';

    const iconContent = isCompleted ? checkSvg : `<span class="bundle-step-num">${cfg.num}</span>`;

    html += `
      <div class="bundle-step-item ${stateClass}" ${ariaCurrent} onclick="comboWizardJumpToStep(${idx})" role="button" tabindex="0" title="${titleText}">
        <div class="bundle-step-indicator">
          <div class="bundle-step-icon">${iconContent}</div>
        </div>
        <div class="bundle-step-content">
          <div class="bundle-step-header">
            <span class="bundle-step-badge">${badgeText}</span>
          </div>
          <div class="bundle-step-title">${titleText}</div>
          <div class="bundle-step-sub">${subText}</div>
        </div>
      </div>
    `;

    if (idx < stepsConfig.length - 1) {
      const connClass = idx < currentStep ? 'is-completed' : 'is-pending';
      html += `
        <div class="bundle-step-connector ${connClass}">
          <div class="bundle-step-connector-fill"></div>
        </div>
      `;
    }
  });

  html += `</div>`;
  stepsContainer.innerHTML = html;
}
window.renderBundleStepper = renderBundleStepper;

