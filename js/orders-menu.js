// ==========================================
// Benmi POS - Module: Menu Editor & Stock
// ==========================================

let currentMenuData = null;   // Array form for editor
let rawMenuData = null;       // Original object form from API
let activeCategoryIndex = -1;
let isMenuDirty = false;

function getBenmiDefaultCategories() {
  return [
    { id: "small", label: currentLang === 'vi' ? "Bánh mì nhỏ" : "小麵包" },
    { id: "large", label: currentLang === 'vi' ? "Bánh mì lớn" : "大麵包" },
    { id: "combo", label: currentLang === 'vi' ? "Combo kèm đồ uống" : "特惠套餐" },
    { id: "drinks", label: currentLang === 'vi' ? "Đồ uống" : "單點飲料" },
    { id: "topping", label: currentLang === 'vi' ? "Topping thêm" : "加料選項" }
  ];
}

function markMenuDirty() {
  isMenuDirty = true;
  const btn = document.querySelector("#view-menu .btn-primary");
  if (btn) {
    btn.style.backgroundColor = "var(--brand-red)";
    btn.innerText = t("btnMenuDirty");
  }
}

function clearMenuDirty() {
  isMenuDirty = false;
  const btn = document.querySelector("#view-menu .btn-primary");
  if (btn) {
    btn.style.backgroundColor = ""; // revert to CSS default
    btn.innerText = t("btnMenuSave");
  }
}

function openMenuSettings() {
  activeTab = "menu";
  document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
  document.querySelectorAll(".content").forEach(c => c.style.display = "none");
  const viewMenu = document.getElementById("view-menu");
  if (viewMenu) viewMenu.style.display = "block";
  if (!currentMenuData) loadMenuData();
}

async function loadMenuData() {
  const bodyEl = document.getElementById("menu-editor-body");
  if (bodyEl) bodyEl.innerHTML = `<div style="text-align:center; padding: 22px; color:#999;">${t("menuLoading")}</div>`;
  try {
    const tenantId = getTenantIdFromUrl();
    const res = await fetch(`${WORKER_BASE}/api/tenant/bootstrap?tenant_id=${tenantId}&_t=${Date.now()}`);
    if (!res.ok) throw new Error("Failed to load bootstrap");
    const data = await res.json();

    const categories = [];
    if (data.catalog) {
      data.catalog.forEach(cat => {
        categories.push({
          id: cat.slug,
          title: cat.name,
          type: 'catalog',
          allowCustomization: cat.allowCustomization !== undefined ? cat.allowCustomization : (cat.slug !== 'drinks'),
          appliedModifiers: cat.appliedModifiers || (cat.allowCustomization === false ? [] : ['*']),
          items: cat.items.map(it => ({
            name: it.name,
            price: it.price,
            isOos: it.isOutOfStock,
            badgeText: it.badgeText || (it.badge || ''),
            isRecommended: it.isRecommended || false,
            originalName: it.name
          }))
        });
      });
    }
    if (data.modifiers) {
      data.modifiers.forEach(mod => {
        if (!categories.some(c => c.id === mod.slug)) {
          categories.push({
            id: mod.slug,
            title: mod.name,
            type: 'modifier',
            items: mod.options.map(opt => ({
              name: opt.name,
              price: opt.price,
              isOos: opt.isOutOfStock,
              badgeText: opt.badgeText || (opt.badge || ''),
              isRecommended: opt.isRecommended || false,
              originalName: opt.name
            }))
          });
        }
      });
    }

    currentMenuData = categories.length > 0 ? categories : getBenmiDefaultCategories().map(cat => ({
      id: cat.id,
      title: cat.label,
      type: 'catalog',
      items: []
    }));

    activeCategoryIndex = -1;
    renderMenuCategories();
    if (bodyEl) bodyEl.innerHTML = `<div style="text-align:center; padding: 22px; color:#999;" id="i18n-menu-select-prompt">${t("menuSelectPrompt")}</div>`;
    const titleEl = document.getElementById("menu-editor-title");
    if (titleEl) titleEl.innerText = t("menuEditorTitle");
    const renameBtn = document.getElementById("btn-category-rename");
    const deleteBtn = document.getElementById("btn-category-delete");
    if (renameBtn) renameBtn.style.display = "none";
    if (deleteBtn) deleteBtn.style.display = "none";
  } catch (e) {
    console.warn("Bootstrap load failed, falling back to legacy /api/menu:", e);
    try {
      const res = await fetch(`${WORKER_BASE}/api/menu?tenant_id=${getTenantIdFromUrl()}&_t=${Date.now()}`);
      if (!res.ok) throw new Error("Failed to load");
      rawMenuData = await res.json();
      currentMenuData = getBenmiDefaultCategories().map(cat => ({
        id: cat.id,
        title: cat.label,
        type: 'catalog',
        items: Object.entries(rawMenuData[cat.id] || {}).map(([name, price]) => {
          const isOos = rawMenuData.out_of_stock && rawMenuData.out_of_stock.includes(`${cat.id}:${name}`);
          return { name, price: typeof price === 'object' ? price.price : price, badgeText: typeof price === 'object' ? (price.badge_text || '') : '', isOos, originalName: name };
        })
      }));
      activeCategoryIndex = -1;
      renderMenuCategories();
      if (bodyEl) bodyEl.innerHTML = `<div style="text-align:center; padding: 22px; color:#999;" id="i18n-menu-select-prompt">${t("menuSelectPrompt")}</div>`;
      const titleEl = document.getElementById("menu-editor-title");
      if (titleEl) titleEl.innerText = t("menuEditorTitle");
      const renameBtn = document.getElementById("btn-category-rename");
      const deleteBtn = document.getElementById("btn-category-delete");
      if (renameBtn) renameBtn.style.display = "none";
      if (deleteBtn) deleteBtn.style.display = "none";
    } catch (err2) {
      alert(t("menuLoadFail") + err2.message);
    }
  }
}

let draggedCategoryIndex = null;

function moveCategoryUp(index, event) {
  if (event) event.stopPropagation();
  if (!currentMenuData || index <= 0) return;
  syncMenuDataFromDOM();
  const moved = currentMenuData.splice(index, 1)[0];
  currentMenuData.splice(index - 1, 0, moved);
  if (activeCategoryIndex === index) {
    activeCategoryIndex = index - 1;
  } else if (activeCategoryIndex === index - 1) {
    activeCategoryIndex = index;
  }
  markMenuDirty();
  renderMenuCategories();
  if (activeCategoryIndex >= 0) {
    renderMenuCategoryEditor(activeCategoryIndex);
  }
}

function moveCategoryDown(index, event) {
  if (event) event.stopPropagation();
  if (!currentMenuData || index >= currentMenuData.length - 1) return;
  syncMenuDataFromDOM();
  const moved = currentMenuData.splice(index, 1)[0];
  currentMenuData.splice(index + 1, 0, moved);
  if (activeCategoryIndex === index) {
    activeCategoryIndex = index + 1;
  } else if (activeCategoryIndex === index + 1) {
    activeCategoryIndex = index;
  }
  markMenuDirty();
  renderMenuCategories();
  if (activeCategoryIndex >= 0) {
    renderMenuCategoryEditor(activeCategoryIndex);
  }
}

function renderMenuCategories() {
  const container = document.getElementById("menu-categories");
  if (!container) return;
  container.innerHTML = "";
  if (!currentMenuData) return;
  currentMenuData.forEach((cat, index) => {
    const div = document.createElement("div");
    div.className = `menu-cat-item ${activeCategoryIndex === index ? 'active' : ''}`;
    div.draggable = true;

    div.addEventListener("dragstart", (e) => {
      draggedCategoryIndex = index;
      e.dataTransfer.effectAllowed = "move";
      setTimeout(() => div.style.opacity = "0.4", 0);
    });
    div.addEventListener("dragend", () => {
      div.style.opacity = "1";
    });
    div.addEventListener("dragover", (e) => {
      e.preventDefault();
      div.style.borderTop = "2px dashed var(--primary)";
    });
    div.addEventListener("dragleave", () => {
      div.style.borderTop = "";
    });
    div.addEventListener("drop", (e) => {
      e.preventDefault();
      div.style.borderTop = "";
      if (draggedCategoryIndex !== null && draggedCategoryIndex !== index) {
        syncMenuDataFromDOM();
        const moved = currentMenuData.splice(draggedCategoryIndex, 1)[0];
        currentMenuData.splice(index, 0, moved);
        activeCategoryIndex = index;
        markMenuDirty();
        renderMenuCategories();
        renderMenuCategoryEditor(index);
      }
    });

    const badge = cat.type === 'modifier' ? `<span style="font-size: 11px; padding: 2px 6px; background: #e0e7ff; color: #4338ca; border-radius: 4px; font-weight: 700; margin-right: 6px;">${t("modifierPrefix")}</span>` : '';
    const isFirst = index === 0;
    const isLast = index === currentMenuData.length - 1;

    div.innerHTML = `
      <div class="menu-cat-drag" title="Kéo để đổi thứ tự / 拖曳排序">☰</div>
      <div style="display:flex; align-items:center; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; flex:1;">
        ${badge}
        <span class="menu-cat-title">${escapeHtml(cat.title)}</span>
      </div>
      <span class="menu-cat-count">${cat.items.length} ${t("menuItemUnit")}</span>
      <div class="menu-cat-reorder-btns" onclick="event.stopPropagation()">
        <button type="button" class="btn-cat-reorder" onclick="moveCategoryUp(${index}, event)" ${isFirst ? 'disabled' : ''} title="Di chuyển lên / 上移">▲</button>
        <button type="button" class="btn-cat-reorder" onclick="moveCategoryDown(${index}, event)" ${isLast ? 'disabled' : ''} title="Di chuyển xuống / 下移">▼</button>
      </div>
    `;
    div.onclick = () => {
      syncMenuDataFromDOM();
      activeCategoryIndex = index;
      renderMenuCategories();
      renderMenuCategoryEditor(index);
    };
    container.appendChild(div);
  });
}

function getStoreModifiersList() {
  if (!currentMenuData) return [];
  return currentMenuData.filter(c => c.type === 'modifier');
}

function renderMenuCategoryEditor(index) {
  const renameBtn = document.getElementById("btn-category-rename");
  const deleteBtn = document.getElementById("btn-category-delete");

  if (!currentMenuData || !currentMenuData[index]) {
    if (renameBtn) renameBtn.style.display = "none";
    if (deleteBtn) deleteBtn.style.display = "none";
    return;
  }

  if (renameBtn) renameBtn.style.display = "inline-flex";
  if (deleteBtn) deleteBtn.style.display = "inline-flex";

  const cat = currentMenuData[index];
  const titleEl = document.getElementById("menu-editor-title");
  if (titleEl) titleEl.innerText = `${cat.title} ${t("menuItemTotalCount", { count: cat.items.length })}`;

  const container = document.getElementById("menu-editor-body");
  if (!container) return;
  container.innerHTML = "";

  if (cat.type === 'catalog') {
    const storeModifiers = getStoreModifiersList();
    const appliedMods = cat.appliedModifiers || (cat.allowCustomization === false ? [] : ['*']);

    const toggleDiv = document.createElement("div");
    toggleDiv.className = "category-customization-box";
    toggleDiv.style.cssText = "margin-bottom: 20px; background: #f8fafc; padding: 16px; border-radius: 12px; border: 1.5px solid #e2e8f0;";
    
    let modifiersHtml = '';
    if (storeModifiers.length === 0) {
      modifiersHtml = `<div style="font-size: 13px; color: #94a3b8; padding: 4px 0;">${t("noModifiersInStore")}</div>`;
    } else {
      modifiersHtml = `
        <div style="display: flex; gap: 8px; margin-bottom: 12px;">
          <button type="button" class="btn btn-ghost" style="padding: 6px 12px; font-size: 13px; font-weight: 700; background: #fff; border: 1.5px solid #cbd5e1; border-radius: 8px; cursor: pointer;" onclick="selectAllCategoryModifiers(${index}, true)">${t("btnSelectAll")}</button>
          <button type="button" class="btn btn-ghost" style="padding: 6px 12px; font-size: 13px; font-weight: 700; background: #fff; border: 1.5px solid #cbd5e1; border-radius: 8px; color: #64748b; cursor: pointer;" onclick="selectAllCategoryModifiers(${index}, false)">${t("btnUnselectAll")}</button>
        </div>
        <div style="display: flex; flex-wrap: wrap; gap: 10px;">
      `;

      storeModifiers.forEach(mod => {
        const isModSelected = appliedMods.includes('*') || appliedMods.includes(mod.id);
        const safeModId = mod.id.replace(/'/g, "\\'");
        modifiersHtml += `
          <label style="display: inline-flex; align-items: center; gap: 8px; padding: 8px 14px; min-height: 48px; background: ${isModSelected ? '#ecfdf5' : '#fff'}; border: 1.5px solid ${isModSelected ? '#10b981' : '#cbd5e1'}; border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: 700; color: ${isModSelected ? '#065f46' : '#475569'}; user-select: none;">
            <input type="checkbox" ${isModSelected ? 'checked' : ''} style="width: 20px; height: 20px; accent-color: #10b981; cursor: pointer;" onchange="toggleCategoryModifierItem(${index}, '${safeModId}', this.checked)">
            <span>${escapeHtml(mod.title)}</span>
          </label>
        `;
      });
      modifiersHtml += `</div>`;
    }

    toggleDiv.innerHTML = `
      <div style="margin-bottom: 12px;">
        <div style="font-weight: 800; font-size: 15px; color: #1e293b;" id="i18n-applied-modifiers-title">${t("appliedModifiersTitle")}</div>
        <div style="font-size: 12px; color: #64748b; margin-top: 2px;" id="i18n-applied-modifiers-desc">${t("appliedModifiersDesc")}</div>
      </div>
      ${modifiersHtml}
    `;
    container.appendChild(toggleDiv);
  }

  let draggedItemIndex = null;

  cat.items.forEach((item, iIdx) => {
    const row = document.createElement("div");
    row.className = "menu-item-row";
    row.draggable = true;

    row.addEventListener("dragstart", (e) => {
      draggedItemIndex = iIdx;
      e.dataTransfer.effectAllowed = "move";
      setTimeout(() => row.style.opacity = "0.4", 0);
    });
    row.addEventListener("dragend", () => { row.style.opacity = "1"; });
    row.addEventListener("dragover", (e) => {
      e.preventDefault();
      row.style.border = "2px dashed var(--primary)";
    });
    row.addEventListener("dragleave", () => {
      row.style.border = "1px solid var(--border)";
    });
    row.addEventListener("drop", (e) => {
      e.preventDefault();
      row.style.border = "1px solid var(--border)";
      if (draggedItemIndex !== null && draggedItemIndex !== iIdx) {
        syncMenuDataFromDOM();
        const arr = currentMenuData[index].items;
        const moved = arr.splice(draggedItemIndex, 1)[0];
        arr.splice(iIdx, 0, moved);
        markMenuDirty();
        renderMenuCategoryEditor(index);
      }
    });

    const oosBg = item.isOos ? '#fee2e2' : '#d1fae5';
    const oosColor = item.isOos ? '#b91c1c' : '#065f46';
    const oosBorder = item.isOos ? '#fca5a5' : '#6ee7b7';
    const oosText = item.isOos ? t("stockStatusOutOfStock") : t("stockStatusInStock");

    row.innerHTML = `
      <div class="menu-item-drag">☰</div>
      <input type="text" class="menu-item-name-input" value="${escapeHtml(item.name)}" data-name-cidx="${index}" data-name-iidx="${iIdx}" oninput="markMenuDirty()"
        placeholder="${t("newItemPlaceholder")}">
      <label class="menu-item-price-label">
        <span>$</span>
        <input type="number" class="menu-item-price-input" value="${item.price !== null && item.price !== undefined ? item.price : ''}" data-cidx="${index}" data-iidx="${iIdx}" oninput="markMenuDirty()"
        placeholder="${t("priceHiddenPlaceholder")}">
      </label>
      <label class="menu-item-badge-label" title="標籤 / 推薦 (例如: 雞肉足足100g, 👍 推薦)">
        <span style="font-size:14px; color:#ef4444;">🏷️</span>
        <input type="text" class="menu-item-badge-input" value="${escapeHtml(item.badgeText || '')}" data-badge-cidx="${index}" data-badge-iidx="${iIdx}" oninput="markMenuDirty()"
          placeholder="標籤/推薦">
      </label>
      <div class="menu-item-actions">
        <button class="menu-item-btn" style="background: ${oosBg}; color: ${oosColor}; border: 1px solid ${oosBorder};"
          onclick="openStockModal(${index}, ${iIdx})">${oosText}</button>
        <button class="menu-item-btn btn-ghost" style="border: 1px solid #cbd5e1; background:#fff;" onclick="openImageModal('${cat.id}', '${escapeHtml(item.name)}')">${t("btnItemImage")}</button>
        <button class="menu-item-btn btn-ghost" style="border: 1px solid #fee2e2; background: #fff5f5; color: var(--brand-red);" onclick="removeMenuItemAt(${index}, ${iIdx})">${t("btnItemDelete")}</button>
      </div>
    `;
    container.appendChild(row);
  });
}

function removeMenuItemAt(cIdx, iIdx) {
  if (confirm(t("confirmDeleteItem"))) {
    syncMenuDataFromDOM();
    currentMenuData[cIdx].items.splice(iIdx, 1);
    markMenuDirty();
    renderMenuCategoryEditor(cIdx);
    renderMenuCategories();
  }
}

function addNewMenuItem() {
  if (activeCategoryIndex < 0 || !currentMenuData) return;
  syncMenuDataFromDOM();
  currentMenuData[activeCategoryIndex].items.unshift({ name: t("newItemPlaceholder"), price: 0, badgeText: "" });
  markMenuDirty();
  renderMenuCategoryEditor(activeCategoryIndex);
  renderMenuCategories();
}

function syncMenuDataFromDOM() {
  if (!currentMenuData) return;
  document.querySelectorAll("#menu-editor-body input[data-name-cidx]").forEach(inp => {
    const cIdx = parseInt(inp.getAttribute("data-name-cidx"), 10);
    const iIdx = parseInt(inp.getAttribute("data-name-iidx"), 10);
    if (currentMenuData[cIdx] && currentMenuData[cIdx].items[iIdx]) {
      currentMenuData[cIdx].items[iIdx].name = inp.value;
    }
  });
  document.querySelectorAll("#menu-editor-body input[data-cidx]").forEach(inp => {
    const cIdx = parseInt(inp.getAttribute("data-cidx"), 10);
    const iIdx = parseInt(inp.getAttribute("data-iidx"), 10);
    const val = inp.value.trim() === "" ? null : parseInt(inp.value, 10);
    if (currentMenuData[cIdx] && currentMenuData[cIdx].items[iIdx]) {
      currentMenuData[cIdx].items[iIdx].price = val;
    }
  });
  document.querySelectorAll("#menu-editor-body input[data-badge-cidx]").forEach(inp => {
    const cIdx = parseInt(inp.getAttribute("data-badge-cidx"), 10);
    const iIdx = parseInt(inp.getAttribute("data-badge-iidx"), 10);
    if (currentMenuData[cIdx] && currentMenuData[cIdx].items[iIdx]) {
      currentMenuData[cIdx].items[iIdx].badgeText = inp.value.trim();
    }
  });
}

async function saveMenuData(skipConfirm = false) {
  if (!currentMenuData) return;
  if (!skipConfirm && !confirm(t("confirmSaveMenu"))) return;
  syncMenuDataFromDOM();

  // Convert to rich item map format for API
  const output = {};
  currentMenuData.forEach(cat => {
    output[cat.id] = {
      __title: cat.title,
      __type: cat.type || 'catalog',
      __allow_customization: cat.allowCustomization !== false ? 1 : 0,
      __applied_modifiers: cat.appliedModifiers || (cat.allowCustomization === false ? [] : ['*'])
    };
    cat.items.forEach(item => {
      if (item.name && item.name.trim() !== "" && item.price !== null) {
        output[cat.id][item.name.trim()] = {
          price: item.price,
          badge_text: item.badgeText || null,
          is_recommended: (item.badgeText && item.badgeText.includes('推薦')) || item.isRecommended ? 1 : 0
        };
      }
    });
  });

  const btn = document.querySelector("#view-menu .btn-primary");
  const oldText = btn ? btn.innerText : "";
  if (btn) { btn.innerText = t("menuSaving"); btn.disabled = true; }

  try {
    const res = await fetch(`${WORKER_BASE}/api/menu?tenant_id=${getTenantIdFromUrl()}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(output)
    });
    if (!res.ok) throw new Error("API returned " + res.status);
    clearMenuDirty();
    if (!skipConfirm) {
      alert(t("menuSaveSuccess"));
    }
    renderMenuCategories();
  } catch (e) {
    alert(t("menuSaveFail") + e.message);
  } finally {
    if (btn) { btn.innerText = t("btnMenuSave"); btn.disabled = false; }
  }
}

function toggleCategoryModifierItem(catIndex, modId, isChecked) {
  if (!currentMenuData || !currentMenuData[catIndex]) return;
  syncMenuDataFromDOM();
  const cat = currentMenuData[catIndex];
  const allMods = getStoreModifiersList().map(m => m.id);
  
  let currentList = [];
  if (!cat.appliedModifiers || cat.appliedModifiers.includes('*')) {
    currentList = [...allMods];
  } else {
    currentList = [...cat.appliedModifiers];
  }

  if (isChecked) {
    if (!currentList.includes(modId)) currentList.push(modId);
  } else {
    currentList = currentList.filter(id => id !== modId);
  }

  cat.appliedModifiers = (allMods.length > 0 && currentList.length === allMods.length) ? ['*'] : currentList;
  cat.allowCustomization = currentList.length > 0;
  markMenuDirty();
  renderMenuCategoryEditor(catIndex);
}

function selectAllCategoryModifiers(catIndex, selectAll) {
  if (!currentMenuData || !currentMenuData[catIndex]) return;
  syncMenuDataFromDOM();
  const cat = currentMenuData[catIndex];
  cat.appliedModifiers = selectAll ? ['*'] : [];
  cat.allowCustomization = selectAll;
  markMenuDirty();
  renderMenuCategoryEditor(catIndex);
}

// --- Category Management ---
function openAddCategoryModal() {
  const inp = document.getElementById("add-cat-input-name");
  if (inp) inp.value = "";
  const typeSelect = document.getElementById("add-cat-select-type");
  if (typeSelect) typeSelect.value = "catalog";

  const modContainer = document.getElementById("add-cat-modifiers-list");
  const storeMods = getStoreModifiersList();
  if (modContainer) {
    if (storeMods.length === 0) {
      modContainer.innerHTML = `<div style="font-size: 12px; color: #94a3b8;">${t("noModifiersInStore")}</div>`;
    } else {
      modContainer.innerHTML = storeMods.map(mod => `
        <label style="display: inline-flex; align-items: center; gap: 8px; padding: 6px 12px; min-height: 44px; background: #fff; border: 1.5px solid #cbd5e1; border-radius: 8px; font-size: 13px; font-weight: 700; cursor: pointer; color: #334155;">
          <input type="checkbox" name="add-cat-mod" value="${escapeHtml(mod.id)}" checked style="width: 18px; height: 18px; accent-color: #10b981;">
          <span>${escapeHtml(mod.title)}</span>
        </label>
      `).join('');
    }
  }

  const group = document.getElementById("add-cat-customization-group");
  if (group) group.style.display = "block";

  const modal = document.getElementById("addCategoryModal");
  if (modal) {
    modal.style.display = "flex";
    if (inp) setTimeout(() => inp.focus(), 50);
  }
}

function onAddCategoryTypeChange() {
  const typeSelect = document.getElementById("add-cat-select-type");
  const group = document.getElementById("add-cat-customization-group");
  if (group && typeSelect) {
    group.style.display = typeSelect.value === "catalog" ? "block" : "none";
  }
}

function closeAddCategoryModal() {
  const modal = document.getElementById("addCategoryModal");
  if (modal) modal.style.display = "none";
}

async function confirmAddCategory() {
  const inp = document.getElementById("add-cat-input-name");
  const name = inp ? inp.value.trim() : "";
  if (!name) {
    alert(t("promptCategoryNameEmpty"));
    return;
  }
  const typeSelect = document.getElementById("add-cat-select-type");
  const type = typeSelect ? typeSelect.value : "catalog";

  const selectedMods = [];
  document.querySelectorAll('input[name="add-cat-mod"]:checked').forEach(cb => {
    selectedMods.push(cb.value);
  });
  const allModsCount = getStoreModifiersList().length;
  const appliedMods = (allModsCount > 0 && selectedMods.length === allModsCount) ? ['*'] : selectedMods;
  const allowCust = type === "catalog" ? (selectedMods.length > 0) : false;

  // Generate clean unique slug
  let baseSlug = name.toLowerCase().replace(/[^a-z0-9]/g, '').replace(/_+/g, '');
  if (!baseSlug) baseSlug = "cat";
  const slug = `${baseSlug}-${Date.now().toString(36)}`;

  if (!currentMenuData) currentMenuData = [];
  syncMenuDataFromDOM();

  const newCat = {
    id: slug,
    title: name,
    type: type,
    allowCustomization: allowCust,
    appliedModifiers: appliedMods,
    items: []
  };

  currentMenuData.push(newCat);
  activeCategoryIndex = currentMenuData.length - 1;
  closeAddCategoryModal();
  renderMenuCategories();
  renderMenuCategoryEditor(activeCategoryIndex);

  // Auto-save immediately to database & refresh cache
  await saveMenuData(true);
}

function promptRenameCategory() {
  if (activeCategoryIndex < 0 || !currentMenuData || !currentMenuData[activeCategoryIndex]) return;
  const currentCat = currentMenuData[activeCategoryIndex];
  const newTitle = prompt(t("promptCategoryNamePrompt"), currentCat.title);
  if (newTitle !== null) {
    const trimmed = newTitle.trim();
    if (!trimmed) {
      alert(t("promptCategoryNameEmpty"));
      return;
    }
    syncMenuDataFromDOM();
    currentCat.title = trimmed;
    markMenuDirty();
    renderMenuCategories();
    renderMenuCategoryEditor(activeCategoryIndex);
  }
}

function deleteActiveCategory() {
  if (activeCategoryIndex < 0 || !currentMenuData || !currentMenuData[activeCategoryIndex]) return;
  const cat = currentMenuData[activeCategoryIndex];
  if (!confirm(t("confirmDeleteCategory", { name: cat.title }))) return;

  syncMenuDataFromDOM();
  currentMenuData.splice(activeCategoryIndex, 1);
  activeCategoryIndex = -1;
  markMenuDirty();
  renderMenuCategories();

  const titleEl = document.getElementById("menu-editor-title");
  if (titleEl) titleEl.innerText = t("menuEditorTitle");
  const bodyEl = document.getElementById("menu-editor-body");
  if (bodyEl) bodyEl.innerHTML = `<div style="text-align:center; padding: 22px; color:#999;" id="i18n-menu-select-prompt">${t("menuSelectPrompt")}</div>`;
  
  const renameBtn = document.getElementById("btn-category-rename");
  const deleteBtn = document.getElementById("btn-category-delete");
  if (renameBtn) renameBtn.style.display = "none";
  if (deleteBtn) deleteBtn.style.display = "none";
}

// --- Image Management ---
let currentImageItemName = null;

async function openImageModal(categoryId, itemName) {
  currentImageItemName = `${categoryId}_${itemName}`;
  document.getElementById("image-modal-title").innerText = t("imageModalItem", { name: itemName });
  document.getElementById("image-preview").style.display = "none";
  document.getElementById("btn-delete-image").style.display = "none";
  document.getElementById("image-status").innerText = t("imageChecking");

  document.getElementById("imageModal").style.display = "flex";

  try {
    const res = await fetch(`${WORKER_BASE}/api/image_list?tenant_id=${getTenantIdFromUrl()}&_t=${Date.now()}`);
    if (res.ok) {
      const list = await res.json();
      const hasImg = list.includes(currentImageItemName) || list.includes(itemName);
      if (hasImg) {
        const resolvedName = list.includes(currentImageItemName) ? currentImageItemName : itemName;
        document.getElementById("image-preview").src = `${WORKER_BASE}/api/image?tenant_id=${getTenantIdFromUrl()}&name=${encodeURIComponent(resolvedName)}&_t=${Date.now()}`;
        document.getElementById("image-preview").style.display = "block";
        document.getElementById("btn-delete-image").style.display = "block";
        document.getElementById("image-status").innerText = t("imageHasImage");
      } else {
        document.getElementById("image-status").innerText = t("imageNoImage");
      }
    }
  } catch (e) {
    document.getElementById("image-status").innerText = t("imageLoadFail");
  }
}

function handleImageSelect(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function (e) {
    const img = new Image();
    img.onload = function () {
      // Resize if too large
      const MAX_WIDTH = 800;
      const MAX_HEIGHT = 800;
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > MAX_WIDTH) {
          height *= MAX_WIDTH / width;
          width = MAX_WIDTH;
        }
      } else {
        if (height > MAX_HEIGHT) {
          width *= MAX_HEIGHT / height;
          height = MAX_HEIGHT;
        }
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, width, height);

      // Get base64 (webp is usually smaller)
      const dataUri = canvas.toDataURL("image/webp", 0.8);
      uploadImage(dataUri);
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
  event.target.value = ''; // reset
}

async function uploadImage(dataUri) {
  document.getElementById("image-status").innerText = t("imageUploading");
  try {
    const res = await fetch(`${WORKER_BASE}/api/image?tenant_id=${getTenantIdFromUrl()}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: currentImageItemName, dataUri })
    });
    if (!res.ok) throw new Error("Upload failed");

    document.getElementById("image-preview").src = dataUri;
    document.getElementById("image-preview").style.display = "block";
    document.getElementById("btn-delete-image").style.display = "block";
    document.getElementById("image-status").innerText = t("imageUploadSuccess");
  } catch (e) {
    alert(t("imageUploadFail") + e.message);
    document.getElementById("image-status").innerText = t("imageLoadFail");
  }
}

async function deleteItemImage() {
  if (!confirm(t("confirmDeleteImage"))) return;
  const statusEl = document.getElementById("image-status");
  const previewEl = document.getElementById("image-preview");
  const deleteBtn = document.getElementById("btn-delete-image");

  if (statusEl) statusEl.innerText = t("imageDeleting");
  try {
    const tenantId = getTenantIdFromUrl();
    const res = await fetch(`${WORKER_BASE}/api/image?tenant_id=${tenantId}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: currentImageItemName })
    });
    if (!res.ok) throw new Error("Delete failed");

    if (previewEl) {
      previewEl.src = "";
      previewEl.style.display = "none";
    }
    if (deleteBtn) deleteBtn.style.display = "none";
    if (statusEl) statusEl.innerText = t("imageNoImage");
  } catch (e) {
    alert(t("imageDeleteFail") + e.message);
    if (statusEl) statusEl.innerText = t("imageLoadFail");
  }
}

// --- Stock Management ---
let currentStockCidx = null;
let currentStockIidx = null;

function openStockModal(cIdx, iIdx) {
  // Sync changes currently typed in DOM
  syncMenuDataFromDOM();

  currentStockCidx = cIdx;
  currentStockIidx = iIdx;

  const item = currentMenuData[cIdx].items[iIdx];
  document.getElementById("stock-modal-title").innerText = t("stockModalItem", { name: item.name });

  // Set values
  const statusSelect = document.getElementById("stock-status-select");
  statusSelect.value = item.isOos ? "out_of_stock" : "in_stock";

  // Reset duration & date
  document.getElementById("stock-duration-select").value = "today";
  document.getElementById("oos-until-date").value = "";

  handleStockStatusChange();

  document.getElementById("stockModal").style.display = "flex";
}

function closeStockModal() {
  document.getElementById("stockModal").style.display = "none";
  currentStockCidx = null;
  currentStockIidx = null;
}

function handleStockStatusChange() {
  const status = document.getElementById("stock-status-select").value;
  const optionsContainer = document.getElementById("oos-options-container");
  if (status === "out_of_stock") {
    optionsContainer.style.display = "block";
  } else {
    optionsContainer.style.display = "none";
  }
  handleStockDurationChange();
}

function handleStockDurationChange() {
  const duration = document.getElementById("stock-duration-select").value;
  const dateContainer = document.getElementById("oos-date-container");
  const status = document.getElementById("stock-status-select").value;

  if (status === "out_of_stock" && duration === "multiple_days") {
    dateContainer.style.display = "block";
  } else {
    dateContainer.style.display = "none";
  }
}

async function saveStockStatus() {
  if (currentStockCidx === null || currentStockIidx === null) return;

  // Sync current data from DOM
  syncMenuDataFromDOM();

  const categorySlug = currentMenuData[currentStockCidx].id;
  const item = currentMenuData[currentStockCidx].items[currentStockIidx];
  const status = document.getElementById("stock-status-select").value;
  const duration = document.getElementById("stock-duration-select").value;
  const untilDate = document.getElementById("oos-until-date").value;

  if (status === "out_of_stock" && duration === "multiple_days" && !untilDate) {
    alert(t("alertSelectOosDate"));
    return;
  }

  const body = {
    category_slug: categorySlug,
    name: item.originalName || item.name,
    status: status,
    duration: duration,
    until_date: untilDate ? `${untilDate}T04:00:00+07:00` : null
  };

  try {
    const res = await fetch(`${WORKER_BASE}/api/menu/stock-status?tenant_id=${getTenantIdFromUrl()}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      const errData = await res.json();
      throw new Error(errData.error || "Update failed");
    }

    // Update local state
    item.isOos = (status === "out_of_stock");

    const targetCidx = currentStockCidx;
    closeStockModal();
    renderMenuCategoryEditor(targetCidx);
  } catch (e) {
    alert(t("stockUpdateFail") + e.message);
  }
}
