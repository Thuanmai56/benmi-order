// ==========================================
// Benmi POS - Module: Menu Editor & Stock
// ==========================================

let currentMenuData = null;   // Array form for editor
let rawMenuData = null;       // Original object form from API
let activeCategoryIndex = -1;
let isMenuDirty = false;
let savedMenuSnapshot = null;
let isMenuSaving = false;

function getBenmiDefaultCategories() {
  return [
    { id: "small", label: currentLang === 'vi' ? "Bánh mì nhỏ" : "小麵包" },
    { id: "large", label: currentLang === 'vi' ? "Bánh mì lớn" : "大麵包" },
    { id: "combo", label: currentLang === 'vi' ? "Combo kèm đồ uống" : "特惠套餐" },
    { id: "drinks", label: currentLang === 'vi' ? "Đồ uống" : "單點飲料" },
    { id: "topping", label: currentLang === 'vi' ? "Topping thêm" : "加料選項" }
  ];
}

function updateMenuSaveState() {
  const btn = document.getElementById("btn-menu-save");
  const label = document.getElementById("btn-menu-save-text");
  if (!btn) return;
  btn.disabled = isMenuSaving || !isMenuDirty;
  btn.classList.toggle("has-changes", isMenuDirty);
  const text = t(isMenuSaving ? "menuSaving" : isMenuDirty ? "btnMenuSave" : "menuSaved");
  if (label) label.textContent = text;
  else btn.textContent = text;
}

function markMenuDirty() {
  isMenuDirty = true;
  updateMenuSaveState();
}

function clearMenuDirty() {
  isMenuDirty = false;
  savedMenuSnapshot = JSON.stringify(currentMenuData);
  updateMenuSaveState();
}

function confirmLeaveMenu() {
  if (isMenuSaving) return false;
  if (!isMenuDirty) return true;
  if (!confirm(t("menuDiscardConfirm"))) return false;
  currentMenuData = savedMenuSnapshot ? JSON.parse(savedMenuSnapshot) : null;
  activeCategoryIndex = currentMenuData?.length ? Math.max(0, Math.min(activeCategoryIndex, currentMenuData.length - 1)) : -1;
  clearMenuDirty();
  renderMenuCategories();
  if (activeCategoryIndex >= 0) renderMenuCategoryEditor(activeCategoryIndex);
  else {
    const body = document.getElementById("menu-editor-body");
    if (body) body.textContent = t("menuSelectPrompt");
  }
  return true;
}
window.confirmLeaveMenu = confirmLeaveMenu;

// All help disclosures, including dynamically rendered category help.
document.addEventListener('click', event => {
  document.querySelectorAll('.menu-help[open]').forEach(help => {
    if (!help.contains(event.target)) help.open = false;
  });
});
document.addEventListener('keydown', event => {
  if (event.key === 'Escape') document.querySelectorAll('.menu-help[open]').forEach(help => { help.open = false; });
});

window.addEventListener("beforeunload", event => {
  if (!isMenuDirty && !isMenuSaving) return;
  event.preventDefault();
  event.returnValue = "";
});

function openMenuSettings() {
  if (isMenuDirty) syncMenuDataFromDOM();
  activeTab = "menu";
  document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
  document.querySelectorAll(".mini-btn").forEach(t => t.classList.remove("active"));
  const tabMenu = document.getElementById("tab-menu");
  if (tabMenu) tabMenu.classList.add("active");
  if (typeof updateSidebarActive === "function") {
    updateSidebarActive("menu");
  }
  document.querySelectorAll(".content").forEach(c => c.style.display = "none");
  const viewMenu = document.getElementById("view-menu");
  if (viewMenu) viewMenu.style.display = "block";
  if (!currentMenuData) {
    loadMenuData();
  } else {
    renderMenuCategories();
    if (activeCategoryIndex >= 0) {
      renderMenuCategoryEditor(activeCategoryIndex);
    }
  }
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
        if (cat.slug === 'sec-flavor' || cat.slug === 'flavor' || cat.categoryType === 'order_customization' || cat.category_type === 'order_customization') {
          return;
        }
        categories.push({
          id: cat.slug,
          catId: cat.id || cat.slug,
          title: cat.name,
          shortName: cat.shortName || cat.name,
          type: 'catalog',
          allowCustomization: cat.allowCustomization !== undefined ? cat.allowCustomization : (cat.slug !== 'drinks'),
          appliedModifiers: cat.appliedModifiers || (cat.allowCustomization === false ? [] : ['*']),
          items: cat.items.map(it => ({
            id: it.id || null,
            name: it.name,
            price: it.price,
            isOos: it.isOutOfStock,
            badgeText: it.badgeText || (it.badge || ''),
            isRecommended: it.isRecommended || false,
            bundleRule: it.bundleRule || null,
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
            shortName: mod.shortName || mod.name,
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

    if (!categories.some(c => c.type === 'order_customization' || c.id === 'sec-flavor')) {
      const customGroups = (data.customizations && data.customizations.length > 0)
        ? data.customizations.map((cust, gIdx) => ({
            id: cust.id || `custom_${tenantId}_${cust.key || gIdx}`,
            key: cust.key || `custom_${gIdx}`,
            title: cust.title || cust.name || '',
            type: cust.type || 'radio',
            sortOrder: cust.sortOrder !== undefined ? cust.sortOrder : gIdx,
            options: (cust.options || []).map(opt => ({
              id: opt.id || opt.name,
              name: opt.name || opt.title || '',
              price: opt.price !== undefined ? opt.price : (opt.surcharge !== undefined ? opt.surcharge : 0),
              isOos: Boolean(opt.isOutOfStock || opt.is_out_of_stock),
              sub_options: Array.isArray(opt.sub_options) ? [...opt.sub_options] : (Array.isArray(opt.subOptions) ? [...opt.subOptions] : []),
              originalName: opt.name || opt.title || ''
            }))
          }))
        : [];

      categories.push({
        id: 'sec-flavor',
        title: currentLang === 'vi' ? 'Tùy chọn khẩu vị & biến thể' : '口味與客製化選擇',
        shortName: currentLang === 'vi' ? 'Khẩu vị' : '口味選擇',
        type: 'order_customization',
        allowCustomization: false,
        appliedModifiers: [],
        sortOrder: data.customizationSortOrder ?? 0,
        groups: customGroups,
        items: []
      });
    }

    // The customization panel is a real sortable section. Keep its saved
    // position interleaved with catalog categories rather than forcing it first.
    categories.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));

    currentMenuData = categories.length > 0 ? categories : getBenmiDefaultCategories().map(cat => ({
      id: cat.id,
      title: cat.label,
      type: 'catalog',
      items: []
    }));

    if (typeof updatePosCatalogPriceMap === 'function') {
      updatePosCatalogPriceMap(currentMenuData);
    }

    clearMenuDirty();
    activeCategoryIndex = currentMenuData.length > 0 ? 0 : -1;
    renderMenuCategories();
    if (activeCategoryIndex >= 0) {
      renderMenuCategoryEditor(0);
    } else {
      if (bodyEl) bodyEl.innerHTML = `<div style="text-align:center; padding: 22px; color:#999;" id="i18n-menu-select-prompt">${t("menuSelectPrompt")}</div>`;
      const titleEl = document.getElementById("menu-editor-title");
      if (titleEl) titleEl.innerText = t("menuEditorTitle");
      const renameBtn = document.getElementById("btn-category-rename");
      const deleteBtn = document.getElementById("btn-category-delete");
      if (renameBtn) renameBtn.style.display = "none";
      if (deleteBtn) deleteBtn.style.display = "none";
    }
  } catch (e) {
    console.warn("Bootstrap load failed, falling back to legacy /api/menu:", e);
    try {
      const res = await fetch(`${WORKER_BASE}/api/menu?tenant_id=${getTenantIdFromUrl()}&_t=${Date.now()}`);
      if (!res.ok) throw new Error("Failed to load");
      rawMenuData = await res.json();
      currentMenuData = getBenmiDefaultCategories().map(cat => ({
        id: cat.id,
        title: (rawMenuData._category_names && rawMenuData._category_names[cat.id]) || cat.label,
        shortName: (rawMenuData._category_short_names && rawMenuData._category_short_names[cat.id]) || (rawMenuData._category_names && rawMenuData._category_names[cat.id]) || cat.label,
        type: 'catalog',
        items: Object.entries(rawMenuData[cat.id] || {}).map(([name, price]) => {
          const isOos = rawMenuData.out_of_stock && rawMenuData.out_of_stock.includes(`${cat.id}:${name}`);
          return { name, price: typeof price === 'object' ? price.price : price, badgeText: typeof price === 'object' ? (price.badge_text || '') : '', isOos, originalName: name };
        })
      }));
      if (typeof updatePosCatalogPriceMap === 'function') {
        updatePosCatalogPriceMap(currentMenuData);
      }
      clearMenuDirty();
      activeCategoryIndex = currentMenuData.length > 0 ? 0 : -1;
      renderMenuCategories();
      if (activeCategoryIndex >= 0) {
        renderMenuCategoryEditor(0);
      } else {
        if (bodyEl) bodyEl.innerHTML = `<div style="text-align:center; padding: 22px; color:#999;" id="i18n-menu-select-prompt">${t("menuSelectPrompt")}</div>`;
        const titleEl = document.getElementById("menu-editor-title");
        if (titleEl) titleEl.innerText = t("menuEditorTitle");
        const renameBtn = document.getElementById("btn-category-rename");
        const deleteBtn = document.getElementById("btn-category-delete");
        if (renameBtn) renameBtn.style.display = "none";
        if (deleteBtn) deleteBtn.style.display = "none";
      }
    } catch (err2) {
      alert(t("menuLoadFail") + err2.message);
    }
  }
}

let draggedCategoryIndex = null;
let isCategoryManagerOpen = false;

function openCategoriesManager() {
  if (!confirmLeaveMenu()) return;
  isCategoryManagerOpen = true;
  activeCategoryIndex = -1;
  renderMenuCategories();
  renderCategoriesManagerView();
}

function closeCategoriesManager() {
  if (!confirmLeaveMenu()) return;
  isCategoryManagerOpen = false;
  activeCategoryIndex = (currentMenuData && currentMenuData.length > 0) ? 0 : -1;
  renderMenuCategories();
  if (activeCategoryIndex >= 0) {
    renderMenuCategoryEditor(activeCategoryIndex);
  } else {
    const titleEl = document.getElementById("menu-editor-title");
    if (titleEl) titleEl.innerText = t("menuEditorTitle");
    const subEl = document.getElementById("i18n-menu-edit-sub");
    if (subEl) subEl.innerText = t("menuEditSub");
    const bodyEl = document.getElementById("menu-editor-body");
    if (bodyEl) bodyEl.innerHTML = `<div style="text-align:center; padding: 22px; color:#999;" id="i18n-menu-select-prompt">${t("menuSelectPrompt")}</div>`;
    const renameBtn = document.getElementById("btn-category-rename");
    const deleteBtn = document.getElementById("btn-category-delete");
    const addItemBtn = document.getElementById("btn-menu-add-item");
    const addCatTopBtn = document.getElementById("btn-menu-add-cat-top");
    const closeBtn = document.getElementById("btn-menu-manage-close");
    if (renameBtn) renameBtn.style.display = "none";
    if (deleteBtn) deleteBtn.style.display = "none";
    if (addItemBtn) addItemBtn.style.display = "none";
    if (addCatTopBtn) addCatTopBtn.style.display = "none";
    if (closeBtn) closeBtn.style.display = "none";
  }
}

function getDragAfterElement(container, y, selector) {
  const draggableElements = [...container.querySelectorAll(`${selector}:not(.dragging)`)];

  return draggableElements.reduce((closest, child) => {
    const box = child.getBoundingClientRect();
    const offset = y - box.top - box.height / 2;
    if (offset < 0 && offset > closest.offset) {
      return { offset: offset, element: child };
    } else {
      return closest;
    }
  }, { offset: Number.NEGATIVE_INFINITY }).element;
}

function updateCategoryCardIndexes(cardsList) {
  if (!cardsList) return;
  const cards = cardsList.querySelectorAll('.cat-mgr-card');
  cards.forEach((c, i) => {
    const idxEl = c.querySelector('.cat-mgr-index');
    if (idxEl) idxEl.innerText = `#${i + 1}`;
  });
}

function formatPlusBtnText(text, fallback) {
  const raw = String(text || fallback || '').trim();
  if (!raw) return '';
  return raw.startsWith('+') ? raw : `+ ${raw}`;
}

function renderCategoriesManagerView() {
  const titleEl = document.getElementById("menu-editor-title");
  if (titleEl) titleEl.innerText = t("manageCategoriesTitle");
  const subEl = document.getElementById("i18n-menu-edit-sub");
  if (subEl) subEl.innerText = t("manageCategoriesSub");

  // Toggle header action buttons
  const renameBtn = document.getElementById("btn-category-rename");
  const deleteBtn = document.getElementById("btn-category-delete");
  const addItemBtn = document.getElementById("btn-menu-add-item");
  const addCatTopBtn = document.getElementById("btn-menu-add-cat-top");
  const closeBtn = document.getElementById("btn-menu-manage-close");

  if (renameBtn) renameBtn.style.display = "none";
  if (deleteBtn) deleteBtn.style.display = "none";
  if (addItemBtn) addItemBtn.style.display = "none";
  if (addCatTopBtn) addCatTopBtn.style.display = "inline-flex";
  if (closeBtn) closeBtn.style.display = "inline-flex";

  const container = document.getElementById("menu-editor-body");
  if (!container) return;
  container.innerHTML = "";

  const mgrContainer = document.createElement("div");
  mgrContainer.className = "cat-mgr-container";

  if (!currentMenuData || currentMenuData.length === 0) {
    mgrContainer.innerHTML = `<div style="text-align:center; padding: 30px; color:#94a3b8;">${t("noCategoriesPrompt") || "尚無任何分類"}</div>`;
  } else {
    const cardsList = document.createElement("div");
    cardsList.className = "cat-mgr-cards-list";

    cardsList.addEventListener("dragover", (e) => {
      e.preventDefault();
      const draggingCard = cardsList.querySelector(".cat-mgr-card.dragging");
      if (!draggingCard) return;
      const afterElement = getDragAfterElement(cardsList, e.clientY, '.cat-mgr-card');
      if (afterElement == null) {
        cardsList.appendChild(draggingCard);
      } else {
        cardsList.insertBefore(draggingCard, afterElement);
      }
      updateCategoryCardIndexes(cardsList);
    });

    currentMenuData.forEach((cat, idx) => {
      const card = document.createElement("div");
      card.className = "cat-mgr-card";
      card.draggable = true;
      card.setAttribute("data-cat-id", cat.id);

      card.addEventListener("dragstart", (e) => {
        e.dataTransfer.effectAllowed = "move";
        setTimeout(() => card.classList.add("dragging"), 0);
      });

      card.addEventListener("dragend", () => {
        card.classList.remove("dragging");

        // Extract new order from DOM
        const newOrderIds = [...cardsList.querySelectorAll('.cat-mgr-card')].map(c => c.getAttribute('data-cat-id'));
        const catMap = new Map(currentMenuData.map(c => [c.id, c]));
        const reordered = newOrderIds.map(id => catMap.get(id)).filter(Boolean);

        let changed = false;
        for (let i = 0; i < reordered.length; i++) {
          if (reordered[i].id !== currentMenuData[i].id) {
            changed = true;
            break;
          }
        }

        if (changed) {
          currentMenuData = reordered;
          currentMenuData.forEach((category, order) => {
            category.sortOrder = order + 1;
          });
          markMenuDirty();
          renderMenuCategories();
          saveMenuData(true);
        }
        renderCategoriesManagerView();
      });

      const isSystemCustomization = cat.type === 'order_customization' || cat.id === 'sec-flavor';
      const badge = cat.type === 'modifier'
        ? `<span style="font-size: 11.5px; padding: 3px 8px; background: #e0e7ff; color: #4338ca; border-radius: 6px; font-weight: 800;">${t("modifierPrefix")}</span>`
        : isSystemCustomization
        ? `<span style="font-size: 11.5px; padding: 3px 8px; background: #fef3c7; color: #92400e; border-radius: 6px; font-weight: 800;">${currentLang === 'vi' ? 'Khẩu vị' : '客製化'}</span>`
        : `<span style="font-size: 11.5px; padding: 3px 8px; background: #ecfdf5; color: #047857; border-radius: 6px; font-weight: 800;">${t("categoryTypeCatalogBadge") || "餐點"}</span>`;

      const itemCount = isSystemCustomization
        ? (cat.groups ? cat.groups.reduce((acc, g) => acc + (g.options ? g.options.length : 0), 0) : 0)
        : cat.items.length;

      const actionsHtml = isSystemCustomization
        ? `<span style="font-size: 12px; color: #64748b; font-weight: 600; padding-right: 6px;">${t("customizationPositionHint")}</span>`
        : `
          <button type="button" class="btn btn-ghost" style="border: 1px solid #cbd5e1; background:#fff; padding: 6px 12px; font-size: 13px; font-weight: 700; border-radius: 8px; display:inline-flex; align-items:center; gap:4px;" onclick="promptRenameCategoryAtIndex(${idx})">${(typeof POS_SVG !== 'undefined' && POS_SVG.edit) || ''} <span>${t("btnCategoryRename")}</span></button>
          <button type="button" class="btn btn-ghost" style="border: 1px solid #fee2e2; background:#fff5f5; color:var(--brand-red); padding: 6px 12px; font-size: 13px; font-weight: 700; border-radius: 8px; display:inline-flex; align-items:center; gap:4px;" onclick="deleteCategoryAtIndex(${idx})">${(typeof POS_SVG !== 'undefined' && POS_SVG.trash) || ''} <span>${t("btnCategoryDelete")}</span></button>
        `;
      const gripSvg = (typeof POS_SVG !== "undefined" && POS_SVG.grip) || "";

      card.innerHTML = `
        <div class="cat-mgr-drag-handle" title="Kéo rê để đổi thứ tự / 拖曳排序">${gripSvg}</div>
        <div class="cat-mgr-index">#${idx + 1}</div>
        <div class="cat-mgr-info">
          ${badge}
          <span class="cat-mgr-name">${escapeHtml(cat.title)}${cat.shortName && cat.shortName !== cat.title ? ` <span style="font-size: 11.5px; color: #64748b; font-weight: normal;">(${escapeHtml(cat.shortName)})</span>` : ''}</span>
          <span class="cat-mgr-count">${itemCount} ${t("menuItemUnit")}</span>
        </div>
        <div class="cat-mgr-actions" onclick="event.stopPropagation()">
          ${actionsHtml}
        </div>
      `;

      cardsList.appendChild(card);
    });

    mgrContainer.appendChild(cardsList);
  }

  // Add category button at the bottom of the list
  const bottomAddBtn = document.createElement("button");
  bottomAddBtn.type = "button";
  bottomAddBtn.className = "cat-mgr-add-btn";
  const plusSvg = (typeof POS_SVG !== "undefined" && POS_SVG.plus) || "";
  bottomAddBtn.innerHTML = `${plusSvg}<span>${t("btnAddCategoryBottom")}</span>`;
  bottomAddBtn.onclick = () => openAddCategoryModal();
  mgrContainer.appendChild(bottomAddBtn);

  container.appendChild(mgrContainer);
}

function renderMenuCategories() {
  const container = document.getElementById("menu-categories");
  if (!container) return;
  container.innerHTML = "";
  if (!currentMenuData) return;

  currentMenuData.forEach((cat, index) => {
    const div = document.createElement("div");
    div.className = `menu-cat-item ${activeCategoryIndex === index && !isCategoryManagerOpen ? 'active' : ''}`;

    const isSystemCustomization = cat.type === 'order_customization' || cat.id === 'sec-flavor';
    const badge = cat.type === 'modifier'
      ? `<span style="font-size: 11px; padding: 2px 6px; background: #e0e7ff; color: #4338ca; border-radius: 4px; font-weight: 700; margin-right: 6px;">${t("modifierPrefix")}</span>`
      : isSystemCustomization
      ? `<span style="font-size: 11px; padding: 2px 6px; background: #fef3c7; color: #92400e; border-radius: 4px; font-weight: 700; margin-right: 6px;">${currentLang === 'vi' ? 'Khẩu vị' : '客製化'}</span>`
      : '';

    const itemCount = isSystemCustomization
      ? (cat.groups ? cat.groups.reduce((acc, g) => acc + (g.options ? g.options.length : 0), 0) : 0)
      : cat.items.length;

    div.innerHTML = `
      <div style="display:flex; align-items:center; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; flex:1;">
        ${badge}
        <span class="menu-cat-title">${escapeHtml(cat.title)}</span>
      </div>
      <span class="menu-cat-count">${itemCount} ${t("menuItemUnit")}</span>
    `;

    div.onclick = () => {
      if (index !== activeCategoryIndex && !confirmLeaveMenu()) return;
      if (index === activeCategoryIndex && isMenuDirty) syncMenuDataFromDOM();
      isCategoryManagerOpen = false;
      activeCategoryIndex = index;
      renderMenuCategories();
      renderMenuCategoryEditor(index);
    };
    container.appendChild(div);
  });

  // Bottom Add Category Button in Left Panel
  const bottomDiv = document.createElement("div");
  bottomDiv.style.padding = "12px 14px";
  const plusIcon = (typeof POS_SVG !== "undefined" && POS_SVG.plus) || "";
  bottomDiv.innerHTML = `
    <button type="button" class="btn btn-ghost btn-block menu-cat-add-bottom" onclick="openAddCategoryModal()">
      ${plusIcon}<span>${t("btnMenuAddCategory")}</span>
    </button>
  `;
  container.appendChild(bottomDiv);
}

function getStoreModifiersList() {
  if (!currentMenuData) return [];
  return currentMenuData.filter(c => c.type === 'modifier');
}

function renderMenuCategoryEditor(index) {
  isCategoryManagerOpen = false;
  const renameBtn = document.getElementById("btn-category-rename");
  const deleteBtn = document.getElementById("btn-category-delete");
  const addItemBtn = document.getElementById("btn-menu-add-item");
  const addCatTopBtn = document.getElementById("btn-menu-add-cat-top");
  const closeBtn = document.getElementById("btn-menu-manage-close");
  const subEl = document.getElementById("i18n-menu-edit-sub");

  if (addCatTopBtn) addCatTopBtn.style.display = "none";
  if (closeBtn) closeBtn.style.display = "none";
  if (addItemBtn) addItemBtn.style.display = "inline-flex";
  const addBundleBtn = document.getElementById('btn-menu-add-bundle');
  if (addBundleBtn) addBundleBtn.style.display = currentMenuData?.[index]?.type === 'catalog' && !window.currentTenantFeatures?.includes('disable_bundle_builder_v2') ? 'inline-flex' : 'none';
  const addBundleLabel = document.getElementById('i18n-btn-create-bundle');
  if (addBundleLabel) addBundleLabel.textContent = t('comboCreateTitle');
  if (subEl) subEl.innerText = t("menuEditSub");

  if (!currentMenuData || !currentMenuData[index]) {
    if (renameBtn) renameBtn.style.display = "none";
    if (deleteBtn) deleteBtn.style.display = "none";
    return;
  }

  const cat = currentMenuData[index];

  if (cat.type === 'order_customization' || cat.id === 'sec-flavor') {
    if (renameBtn) renameBtn.style.display = "none";
    if (deleteBtn) deleteBtn.style.display = "none";
    if (addItemBtn) {
      addItemBtn.style.display = "inline-flex";
      addItemBtn.innerText = formatPlusBtnText(t("btnAddCustomGroup"), "新增客製化分組");
      addItemBtn.onclick = () => addCustomizationGroup(index);
    }
    renderOrderCustomizationEditor(document.getElementById("menu-editor-body"), cat, index);
    return;
  }

  if (addItemBtn) {
    addItemBtn.innerText = formatPlusBtnText(t("btnMenuAddItem"), "新增項目");
    addItemBtn.onclick = () => addNewMenuItem();
  }

  if (renameBtn) renameBtn.style.display = "inline-flex";
  if (deleteBtn) deleteBtn.style.display = "inline-flex";

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

    
    let modifiersHtml = '';
    if (storeModifiers.length === 0) {
      modifiersHtml = `<div class="no-modifiers-hint" style="font-size: 12px; color: #94a3b8; margin: 0; padding: 0; line-height: 1.3;">${t("noModifiersInStore")}</div>`;
    } else {
      modifiersHtml = `
        <div style="display: flex; gap: 6px; margin-bottom: 6px;">
          <button type="button" class="btn btn-ghost" style="padding: 4px 10px; font-size: 12.5px; font-weight: 700; background: #fff; border: 1.5px solid #cbd5e1; border-radius: 6px; cursor: pointer;" onclick="selectAllCategoryModifiers(${index}, true)">${t("btnSelectAll")}</button>
          <button type="button" class="btn btn-ghost" style="padding: 4px 10px; font-size: 12.5px; font-weight: 700; background: #fff; border: 1.5px solid #cbd5e1; border-radius: 6px; color: #64748b; cursor: pointer;" onclick="selectAllCategoryModifiers(${index}, false)">${t("btnUnselectAll")}</button>
        </div>
        <div style="display: flex; flex-wrap: wrap; gap: 8px;">
      `;

      storeModifiers.forEach(mod => {
        const isModSelected = appliedMods.includes('*') || appliedMods.includes(mod.id);
        const safeModId = mod.id.replace(/'/g, "\\'");
        modifiersHtml += `
          <label style="display: inline-flex; align-items: center; gap: 6px; padding: 6px 12px; min-height: 40px; background: ${isModSelected ? '#ecfdf5' : '#fff'}; border: 1.5px solid ${isModSelected ? '#10b981' : '#cbd5e1'}; border-radius: 8px; cursor: pointer; font-size: 13.5px; font-weight: 700; color: ${isModSelected ? '#065f46' : '#475569'}; user-select: none;">
            <input type="checkbox" ${isModSelected ? 'checked' : ''} style="width: 18px; height: 18px; accent-color: #10b981; cursor: pointer;" onchange="toggleCategoryModifierItem(${index}, '${safeModId}', this.checked)">
            <span>${escapeHtml(mod.title)}</span>
          </label>
        `;
      });
      modifiersHtml += `</div>`;
    }

    toggleDiv.innerHTML = `
      <div class="help-title-row" style="margin-bottom: 4px;">
        <div style="font-weight: 800; font-size: 13.5px; color: #1e293b;" id="i18n-applied-modifiers-title">${t("appliedModifiersTitle")}</div>
        <details class="menu-help"><summary aria-labelledby="i18n-applied-modifiers-title"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v6m0 3v1"/></svg></summary><div class="menu-help-text" id="i18n-applied-modifiers-desc">${t("appliedModifiersDesc")}</div></details>
      </div>
      ${modifiersHtml}
    `;
    container.appendChild(toggleDiv);
  }

  const itemsContainer = document.createElement("div");
  itemsContainer.className = "menu-items-list";
  itemsContainer.style.display = "flex";
  itemsContainer.style.flexDirection = "column";
  itemsContainer.style.gap = "8px";

  itemsContainer.addEventListener("dragover", (e) => {
    e.preventDefault();
    const draggingRow = itemsContainer.querySelector(".menu-item-row.dragging");
    if (!draggingRow) return;
    const afterElement = getDragAfterElement(itemsContainer, e.clientY, '.menu-item-row');
    if (afterElement == null) {
      itemsContainer.appendChild(draggingRow);
    } else {
      itemsContainer.insertBefore(draggingRow, afterElement);
    }
  });

  cat.items.forEach((item, iIdx) => {
    const row = document.createElement("div");
    row.className = "menu-item-row";
    row.draggable = true;
    row.setAttribute("data-item-index", iIdx);

    row.addEventListener("dragstart", (e) => {
      syncMenuDataFromDOM();
      row.classList.add("dragging");
      e.dataTransfer.effectAllowed = "move";
    });
    row.addEventListener("dragend", () => {
      row.classList.remove("dragging");
      syncMenuDataFromDOM();
      const currentItems = currentMenuData[index].items;
      const newOrderIndices = [...itemsContainer.querySelectorAll('.menu-item-row')].map(r => parseInt(r.getAttribute('data-item-index'), 10));
      const reordered = newOrderIndices.map(idx => currentItems[idx]).filter(Boolean);
      currentMenuData[index].items = reordered;
      markMenuDirty();
      renderMenuCategoryEditor(index);
    });

    const oosBg = item.isOos ? '#fee2e2' : '#d1fae5';
    const oosColor = item.isOos ? '#b91c1c' : '#065f46';
    const oosBorder = item.isOos ? '#fca5a5' : '#6ee7b7';
    const oosText = item.isOos ? t("stockStatusOutOfStock") : t("stockStatusInStock");

    const gripSvg = (typeof POS_SVG !== "undefined" && POS_SVG.grip) || "⋮⋮";
    const tagSvg = (typeof POS_SVG !== "undefined" && POS_SVG.tag) || "";
    const imageSvg = (typeof POS_SVG !== "undefined" && POS_SVG.image) || "";
    const trashSvg = (typeof POS_SVG !== "undefined" && POS_SVG.trash) || "";
    const layersSvg = (typeof POS_SVG !== "undefined" && POS_SVG.layers) || "";
    const plusSvg = (typeof POS_SVG !== "undefined" && POS_SVG.plus) || "";

    const hasBundle = Boolean(item.bundleRule && Array.isArray(item.bundleRule.groups) && item.bundleRule.groups.length > 0);
    const bundleCount = hasBundle ? item.bundleRule.groups.length : 0;
    let bundleBtnHtml = '';
    if (cat.type === 'catalog' && !window.currentTenantFeatures?.includes('disable_bundle_builder_v2')) {
      if (hasBundle) {
        const bundleText = currentLang === 'vi'
          ? `${t("bundleBadge")} (${bundleCount} ${t("bundleGroupUnit")})`
          : `${t("bundleBadge")} (${bundleCount}${t("bundleGroupUnit")})`;
        bundleBtnHtml = `
          <button type="button" class="menu-item-bundle-btn is-bundle" onclick="openBundleWizard(${index}, ${iIdx})" title="${t('btnEditBundle')}">
            ${layersSvg}<span>${bundleText}</span>
          </button>
        `;
      } else {
        bundleBtnHtml = `
          <button type="button" class="menu-item-bundle-btn is-not-bundle" onclick="openBundleWizard(${index}, ${iIdx})" title="${t('btnSetBundle')}">
            ${plusSvg}<span>${t("btnSetBundle")}</span>
          </button>
        `;
      }
    }

    row.innerHTML = `
      <div class="menu-item-main-fields">
        <div class="menu-item-drag" title="Kéo để đổi thứ tự">${gripSvg}</div>
        <input type="text" class="menu-item-name-input" value="${escapeHtml(item.name)}" data-name-cidx="${index}" data-name-iidx="${iIdx}" oninput="markMenuDirty()"
          placeholder="${t("newItemPlaceholder")}">
        <label class="menu-item-price-label">
          <span class="price-currency">$</span>
          <input type="number" class="menu-item-price-input" value="${item.price !== null && item.price !== undefined ? item.price : ''}" data-cidx="${index}" data-iidx="${iIdx}" oninput="markMenuDirty()"
            placeholder="${t("priceHiddenPlaceholder")}">
        </label>
        <label class="menu-item-badge-label" title="${t('menuItemBadgePlaceholder')}">
          <span class="badge-icon">${tagSvg}</span>
          <input type="text" class="menu-item-badge-input" value="${escapeHtml(item.badgeText || '')}" data-badge-cidx="${index}" data-badge-iidx="${iIdx}" oninput="markMenuDirty()"
            placeholder="${t('menuItemBadgePlaceholder')}">
        </label>
      </div>
      <div class="menu-item-actions">
        <button type="button" class="menu-item-status-pill ${item.isOos ? 'oos' : 'in-stock'}"
          onclick="openStockModal(${index}, ${iIdx})" title="${oosText}">
          <span class="status-dot"></span>
          <span class="status-text">${oosText}</span>
        </button>
        ${bundleBtnHtml}
        <button type="button" class="btn btn-ghost menu-item-action-btn" onclick="openImageModal('${cat.id}', '${escapeHtml(item.name)}')">
          ${imageSvg}<span>${t("btnItemImage")}</span>
        </button>
        <button type="button" class="btn btn-ghost menu-item-action-btn btn-danger-ghost" onclick="removeMenuItemAt(${index}, ${iIdx})">
          ${trashSvg}<span>${t("btnItemDelete")}</span>
        </button>
      </div>
    `;
    itemsContainer.appendChild(row);
  });
  container.appendChild(itemsContainer);
}

function renderOrderCustomizationEditor(container, cat, cIdx) {
  if (!container) return;
  container.innerHTML = "";

  const titleEl = document.getElementById("menu-editor-title");
  if (titleEl) {
    const totalOptions = cat.groups ? cat.groups.reduce((acc, g) => acc + (g.options ? g.options.length : 0), 0) : 0;
    titleEl.innerText = `${cat.title} ${t("menuItemTotalCount", { count: totalOptions })}`;
  }

  const banner = document.createElement("div");
  banner.className = "cust-header-banner";
  banner.innerHTML = `
    <div class="cust-title">${t("customizationManageTitle")}</div>
    <div class="cust-desc">${t("customizationManageDesc")}</div>
  `;
  container.appendChild(banner);

  if (!cat.groups || cat.groups.length === 0) {
    const emptyDiv = document.createElement("div");
    emptyDiv.style.textAlign = "center";
    emptyDiv.style.padding = "24px";
    emptyDiv.style.color = "#94a3b8";
    emptyDiv.innerText = t("noCategoriesPrompt") || "尚無任何客製化設定";
    container.appendChild(emptyDiv);
  } else {
    cat.groups.forEach((grp, gIdx) => {
      const card = document.createElement("div");
      card.className = "cust-group-card";
      card.setAttribute("data-cust-group-index", gIdx);

      const typeBadge = grp.type === 'checkbox'
        ? `<span style="font-size: 11.5px; padding: 3px 8px; background: #e0e7ff; color: #4338ca; border-radius: 6px; font-weight: 800;">${currentLang === 'vi' ? 'Chọn nhiều' : '多選'}</span>`
        : `<span style="font-size: 11.5px; padding: 3px 8px; background: #ecfdf5; color: #047857; border-radius: 6px; font-weight: 800;">${currentLang === 'vi' ? 'Chọn 1' : '單選'}</span>`;

      const optionsCount = (grp.options || []).length;

      let optionsHtml = '';
      (grp.options || []).forEach((opt, oIdx) => {
        const oosBg = opt.isOos ? '#fee2e2' : '#d1fae5';
        const oosColor = opt.isOos ? '#b91c1c' : '#065f46';
        const oosBorder = opt.isOos ? '#fca5a5' : '#6ee7b7';
        const oosText = opt.isOos ? t("stockStatusOutOfStock") : t("stockStatusInStock");

        const subChipsHtml = (opt.sub_options || []).map((sub, sIdx) => `
          <span class="cust-sub-chip">
            <span>${escapeHtml(sub)}</span>
            <button type="button" class="cust-sub-chip-remove" onclick="removeSubOptionChip(${cIdx}, ${gIdx}, ${oIdx}, ${sIdx})" title="✕">✕</button>
          </span>
        `).join('');

        optionsHtml += `
          <div class="cust-option-block" data-gidx="${gIdx}" data-oidx="${oIdx}">
            <div class="cust-option-row">
              <input type="text" class="menu-item-name-input" value="${escapeHtml(opt.name)}"
                data-cust-name-cidx="${cIdx}" data-cust-gidx="${gIdx}" data-cust-oidx="${oIdx}"
                oninput="syncMenuDataFromDOM(); markMenuDirty()" placeholder="${t("labelOptionName")}">
              <label class="menu-item-price-label" title="${t("labelSurcharge")}">
                <span>+$</span>
                <input type="number" class="menu-item-price-input" value="${opt.price !== null && opt.price !== undefined ? opt.price : 0}"
                  data-cust-price-cidx="${cIdx}" data-cust-gidx="${gIdx}" data-cust-oidx="${oIdx}"
                  oninput="syncMenuDataFromDOM(); markMenuDirty()" placeholder="0">
              </label>
              <div class="menu-item-actions" style="margin-left: auto;">
                <button type="button" class="menu-item-btn" style="background: ${oosBg}; color: ${oosColor}; border: 1px solid ${oosBorder}; display: inline-flex; align-items: center; gap: 5px;"
                  onclick="openStockModalForCustomization(${cIdx}, ${gIdx}, ${oIdx})" title="${oosText}">
                  <span style="width: 7px; height: 7px; border-radius: 50%; background: currentColor; display: inline-block;"></span> <span>${oosText}</span>
                </button>
                <button type="button" class="menu-item-btn btn-ghost" style="border: 1px solid #fee2e2; background: #fff5f5; color: var(--brand-red); display:inline-flex; align-items:center; gap:4px;"
                  onclick="removeCustomizationOption(${cIdx}, ${gIdx}, ${oIdx})" title="${t("btnItemDelete")}">
                  ${(typeof POS_SVG !== 'undefined' && POS_SVG.trash) || ''} <span>${t("btnItemDelete")}</span>
                </button>
              </div>
            </div>
            <div class="cust-sub-options-container">
              <span class="cust-sub-label">${t("subOptionsLabel")}</span>
              ${subChipsHtml}
              <button type="button" class="cust-add-sub-chip-btn"
                onclick="promptAddSubOptionChip(${cIdx}, ${gIdx}, ${oIdx})">
                <span>${formatPlusBtnText(t("btnAddSubOption"), "新增細項")}</span>
              </button>
            </div>
          </div>
        `;
      });

      card.innerHTML = `
        <div class="cust-group-header">
          <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
            <span class="cust-group-title">${escapeHtml(grp.title)}</span>
            <button type="button" class="menu-item-btn btn-ghost" style="padding: 3px 6px; font-size: 12px; border: 1px solid #cbd5e1; display:inline-flex; align-items:center; justify-content:center;"
              onclick="renameCustomizationGroup(${cIdx}, ${gIdx})" title="${t("btnCategoryRename")}">${(typeof POS_SVG !== 'undefined' && POS_SVG.edit) || ''}</button>
            <button type="button" style="cursor: pointer; border: none; background: transparent; padding: 0;"
              onclick="toggleCustomizationGroupType(${cIdx}, ${gIdx})" title="${grp.type === 'checkbox' ? t('toggleGroupTypeSingle') : t('toggleGroupTypeMultiple')}">
              ${typeBadge}
            </button>
          </div>
          <div style="display: flex; align-items: center; gap: 8px; margin-left: auto;">
            <span style="font-size: 13px; color: #64748b; font-weight: 600;">${optionsCount} ${t("menuItemUnit")}</span>
            <button type="button" class="menu-item-btn btn-ghost" style="border: 1px solid #fee2e2; background: #fff5f5; color: var(--brand-red); padding: 3px 6px; font-size: 12px; display:inline-flex; align-items:center; justify-content:center;"
              onclick="removeCustomizationGroup(${cIdx}, ${gIdx})" title="${t("btnCategoryDelete")}">
              ${(typeof POS_SVG !== 'undefined' && POS_SVG.trash) || ''}
            </button>
          </div>
        </div>
        <div class="cust-options-list">
          ${optionsHtml}
        </div>
        <button type="button" class="cat-mgr-add-btn" style="margin-top: 10px;" onclick="addCustomizationOption(${cIdx}, ${gIdx})">
          <span>${formatPlusBtnText(t("btnAddCustomOption"), "新增選項")}</span>
        </button>
      `;

      container.appendChild(card);
    });
  }

  // Always show button to add new customization group (Tầng 1)
  const addGroupBtn = document.createElement("button");
  addGroupBtn.type = "button";
  addGroupBtn.className = "cat-mgr-add-btn";
  addGroupBtn.style.marginTop = "16px";
  addGroupBtn.style.background = "#f8fafc";
  addGroupBtn.style.border = "2px dashed #94a3b8";
  addGroupBtn.innerHTML = `<span>${formatPlusBtnText(t("btnAddCustomGroup"), "新增客製化分組")}</span>`;
  addGroupBtn.onclick = () => addCustomizationGroup(cIdx);
  container.appendChild(addGroupBtn);
}

function addCustomizationGroup(cIdx) {
  syncMenuDataFromDOM();
  const groupTitle = prompt(t("promptAddCustomGroup"));
  if (groupTitle !== null) {
    const trimmed = groupTitle.trim();
    if (!trimmed) return;
    const cat = currentMenuData[cIdx];
    if (cat) {
      if (!Array.isArray(cat.groups)) cat.groups = [];
      const tenantId = getTenantIdFromUrl();
      const newKey = `group_${Date.now().toString(36)}`;
      const newId = `custom_${tenantId}_${newKey}`;
      cat.groups.push({
        id: newId,
        key: newKey,
        title: trimmed,
        type: 'radio',
        sortOrder: cat.groups.length,
        options: []
      });
      markMenuDirty();
      renderOrderCustomizationEditor(document.getElementById("menu-editor-body"), cat, cIdx);
      renderMenuCategories();
    }
  }
}
window.addCustomizationGroup = addCustomizationGroup;

function renameCustomizationGroup(cIdx, gIdx) {
  syncMenuDataFromDOM();
  const grp = currentMenuData[cIdx]?.groups?.[gIdx];
  if (!grp) return;
  const newTitle = prompt(t("promptRenameCustomGroup"), grp.title);
  if (newTitle !== null) {
    const trimmed = newTitle.trim();
    if (!trimmed) return;
    grp.title = trimmed;
    markMenuDirty();
    renderOrderCustomizationEditor(document.getElementById("menu-editor-body"), currentMenuData[cIdx], cIdx);
    renderMenuCategories();
  }
}
window.renameCustomizationGroup = renameCustomizationGroup;

function toggleCustomizationGroupType(cIdx, gIdx) {
  syncMenuDataFromDOM();
  const grp = currentMenuData[cIdx]?.groups?.[gIdx];
  if (!grp) return;
  grp.type = grp.type === 'checkbox' ? 'radio' : 'checkbox';
  markMenuDirty();
  renderOrderCustomizationEditor(document.getElementById("menu-editor-body"), currentMenuData[cIdx], cIdx);
}
window.toggleCustomizationGroupType = toggleCustomizationGroupType;

function removeCustomizationGroup(cIdx, gIdx) {
  const grp = currentMenuData[cIdx]?.groups?.[gIdx];
  if (!grp) return;
  if (confirm(t("confirmDeleteCustomGroup"))) {
    syncMenuDataFromDOM();
    currentMenuData[cIdx].groups.splice(gIdx, 1);
    markMenuDirty();
    renderOrderCustomizationEditor(document.getElementById("menu-editor-body"), currentMenuData[cIdx], cIdx);
    renderMenuCategories();
  }
}
window.removeCustomizationGroup = removeCustomizationGroup;

function promptAddSubOptionChip(cIdx, gIdx, oIdx) {
  syncMenuDataFromDOM();
  const subName = prompt(t("promptAddSubOption"));
  if (subName !== null) {
    const trimmed = subName.trim();
    if (!trimmed) return;
    const opt = currentMenuData[cIdx]?.groups?.[gIdx]?.options?.[oIdx];
    if (opt) {
      if (!Array.isArray(opt.sub_options)) opt.sub_options = [];
      if (!opt.sub_options.includes(trimmed)) {
        opt.sub_options.push(trimmed);
        markMenuDirty();
        renderOrderCustomizationEditor(document.getElementById("menu-editor-body"), currentMenuData[cIdx], cIdx);
      }
    }
  }
}
window.promptAddSubOptionChip = promptAddSubOptionChip;

function removeSubOptionChip(cIdx, gIdx, oIdx, sIdx) {
  syncMenuDataFromDOM();
  const opt = currentMenuData[cIdx]?.groups?.[gIdx]?.options?.[oIdx];
  if (opt && Array.isArray(opt.sub_options)) {
    opt.sub_options.splice(sIdx, 1);
    markMenuDirty();
    renderOrderCustomizationEditor(document.getElementById("menu-editor-body"), currentMenuData[cIdx], cIdx);
  }
}
window.removeSubOptionChip = removeSubOptionChip;

function addCustomizationOption(cIdx, gIdx) {
  syncMenuDataFromDOM();
  const group = currentMenuData[cIdx]?.groups?.[gIdx];
  if (group) {
    if (!Array.isArray(group.options)) group.options = [];
    const newId = `opt_${Date.now().toString(36)}`;
    const defaultName = t("newItemPlaceholder") || "新選項";
    group.options.push({
      id: newId,
      name: defaultName,
      price: 0,
      isOos: false,
      sub_options: [],
      originalName: defaultName
    });
    markMenuDirty();
    renderOrderCustomizationEditor(document.getElementById("menu-editor-body"), currentMenuData[cIdx], cIdx);
    renderMenuCategories();
    setTimeout(() => {
      const newInp = document.querySelector(`input[data-cust-name-cidx="${cIdx}"][data-cust-gidx="${gIdx}"][data-cust-oidx="${group.options.length - 1}"]`);
      if (newInp) {
        newInp.focus();
        newInp.select();
      }
    }, 50);
  }
}
window.addCustomizationOption = addCustomizationOption;

function removeCustomizationOption(cIdx, gIdx, oIdx) {
  const group = currentMenuData[cIdx]?.groups?.[gIdx];
  const opt = group?.options?.[oIdx];
  if (!opt) return;
  if (confirm(t("confirmDeleteItem"))) {
    syncMenuDataFromDOM();
    group.options.splice(oIdx, 1);
    markMenuDirty();
    renderOrderCustomizationEditor(document.getElementById("menu-editor-body"), currentMenuData[cIdx], cIdx);
    renderMenuCategories();
  }
}
window.removeCustomizationOption = removeCustomizationOption;

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
  const cat = currentMenuData[activeCategoryIndex];
  if (cat && (cat.type === 'order_customization' || cat.id === 'sec-flavor')) {
    addCustomizationGroup(activeCategoryIndex);
    return;
  }
  if (cat && Array.isArray(cat.items)) {
    cat.items.unshift({ name: t("newItemPlaceholder"), price: 0, badgeText: "" });
  }
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
  document.querySelectorAll("#menu-editor-body input[data-cust-name-cidx]").forEach(inp => {
    const cIdx = parseInt(inp.getAttribute("data-cust-name-cidx"), 10);
    const gIdx = parseInt(inp.getAttribute("data-cust-gidx"), 10);
    const oIdx = parseInt(inp.getAttribute("data-cust-oidx"), 10);
    if (currentMenuData[cIdx]?.groups?.[gIdx]?.options?.[oIdx]) {
      currentMenuData[cIdx].groups[gIdx].options[oIdx].name = inp.value.trim();
    }
  });
  document.querySelectorAll("#menu-editor-body input[data-cust-price-cidx]").forEach(inp => {
    const cIdx = parseInt(inp.getAttribute("data-cust-price-cidx"), 10);
    const gIdx = parseInt(inp.getAttribute("data-cust-gidx"), 10);
    const oIdx = parseInt(inp.getAttribute("data-cust-oidx"), 10);
    const val = inp.value.trim() === "" ? 0 : parseInt(inp.value, 10) || 0;
    if (currentMenuData[cIdx]?.groups?.[gIdx]?.options?.[oIdx]) {
      currentMenuData[cIdx].groups[gIdx].options[oIdx].price = val;
    }
  });
}

function serializeMenuData(categories) {
  const output = {};
  categories.forEach(cat => {
    if (cat.type === 'order_customization' || cat.id === 'sec-flavor') {
      output.__customizations = {
        id: cat.id,
        title: cat.title,
        shortName: cat.shortName || cat.title,
        sortOrder: cat.sortOrder !== undefined ? cat.sortOrder : Object.keys(output).length + 1,
        groups: (cat.groups || []).map((grp, gIdx) => ({
          id: grp.id,
          key: grp.key,
          title: grp.title,
          type: grp.type || 'radio',
          sortOrder: grp.sortOrder !== undefined ? grp.sortOrder : (gIdx + 1),
          options: (grp.options || []).map(opt => ({
            id: opt.id || opt.name,
            name: opt.name,
            surcharge: opt.price || 0,
            price: opt.price || 0,
            is_out_of_stock: Boolean(opt.isOos),
            isOutOfStock: Boolean(opt.isOos),
            sub_options: Array.isArray(opt.sub_options) ? opt.sub_options : []
          }))
        }))
      };
      return;
    }
    output[cat.id] = {
      __title: cat.title,
      __short_name: cat.shortName || cat.title,
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
  return output;
}

async function saveMenuData(skipConfirm = false) {
  if (!currentMenuData || isMenuSaving) return;
  if (!skipConfirm && !confirm(t("confirmSaveMenu"))) return;
  syncMenuDataFromDOM();
  const output = serializeMenuData(currentMenuData);
  isMenuSaving = true;
  updateMenuSaveState();
  const editor = document.getElementById("menu-editor-body");
  if (editor) editor.inert = true;
  document.querySelectorAll(".menu-header-actions, #menu-categories").forEach(el => el.inert = true);

  try {
    const res = await fetch(`${WORKER_BASE}/api/menu?tenant_id=${getTenantIdFromUrl()}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(output)
    });
    if (!res.ok) throw new Error("API returned " + res.status);
    clearMenuDirty();
    if (typeof updatePosCatalogPriceMap === 'function') {
      updatePosCatalogPriceMap(currentMenuData);
    }
    if (!skipConfirm) {
      alert(t("menuSaveSuccess"));
    }
    renderMenuCategories();
  } catch (e) {
    alert(t("menuSaveFail") + e.message);
  } finally {
    isMenuSaving = false;
    if (editor) editor.inert = false;
    document.querySelectorAll(".menu-header-actions, #menu-categories").forEach(el => el.inert = false);
    updateMenuSaveState();
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
  if (!confirmLeaveMenu()) return;
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

  const shortInp = document.getElementById("add-cat-input-short-name");
  if (shortInp) shortInp.value = "";

  const modal = document.getElementById("addCategoryModal");
  if (modal) {
    modal.style.display = "flex";
    // Let the user choose when to open the keyboard on a tablet.
    const body = modal.querySelector(".modal-body");
    if (body) body.scrollTop = 0;
    updateAddCategoryViewport();
  }
}

function updateAddCategoryViewport() {
  const modal = document.getElementById("addCategoryModal");
  if (!modal || modal.style.display === "none") return;
  const viewport = window.visualViewport;
  modal.style.height = `${viewport ? viewport.height : window.innerHeight}px`;
  modal.style.top = `${viewport ? viewport.offsetTop : 0}px`;
}
if (window.visualViewport) {
  window.visualViewport.addEventListener("resize", updateAddCategoryViewport);
  window.visualViewport.addEventListener("scroll", updateAddCategoryViewport);
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
  const inp = document.getElementById("add-cat-input-name");
  if (inp) inp.value = "";
  const shortInp = document.getElementById("add-cat-input-short-name");
  if (shortInp) shortInp.value = "";
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

  const shortInp = document.getElementById("add-cat-input-short-name");
  const shortName = (shortInp && shortInp.value.trim()) ? shortInp.value.trim() : name;

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
    shortName: shortName,
    type: type,
    allowCustomization: allowCust,
    appliedModifiers: appliedMods,
    items: []
  };

  currentMenuData.push(newCat);
  markMenuDirty();
  closeAddCategoryModal();
  renderMenuCategories();

  if (isCategoryManagerOpen) {
    renderCategoriesManagerView();
  } else {
    activeCategoryIndex = currentMenuData.length - 1;
    renderMenuCategoryEditor(activeCategoryIndex);
  }

  // A new category remains a draft until the explicit Save action.
  markMenuDirty();
}

async function promptRenameCategoryAtIndex(idx) {
  if (!currentMenuData || !currentMenuData[idx]) return;
  const currentCat = currentMenuData[idx];
  const newTitle = prompt(t("promptCategoryNamePrompt"), currentCat.title);
  if (newTitle !== null) {
    const trimmed = newTitle.trim();
    if (!trimmed) {
      alert(t("promptCategoryNameEmpty"));
      return;
    }
    syncMenuDataFromDOM();
    currentCat.title = trimmed;
    currentCat.shortName = trimmed;
    markMenuDirty();
    renderMenuCategories();
    if (isCategoryManagerOpen) {
      renderCategoriesManagerView();
    } else {
      renderMenuCategoryEditor(idx);
    }
    // Auto-save immediately to database & refresh edge cache
    await saveMenuData(true);
  }
}

async function deleteCategoryAtIndex(idx) {
  if (isMenuSaving || !currentMenuData || !currentMenuData[idx]) return;
  const cat = currentMenuData[idx];
  if (!confirm(t("confirmDeleteCategory", { name: cat.title }))) return;

  syncMenuDataFromDOM();
  // Persist only the deletion. Other unsaved edits must remain drafts.
  const saved = savedMenuSnapshot ? JSON.parse(savedMenuSnapshot) : [];
  if (saved.some(entry => entry.id === cat.id)) {
    isMenuSaving = true;
    updateMenuSaveState();
    const panels = document.querySelectorAll('.menu-split');
    panels.forEach(el => { el.inert = true; });
    try {
      const remaining = saved.filter(entry => entry.id !== cat.id);
      const res = await fetch(`${WORKER_BASE}/api/menu?tenant_id=${getTenantIdFromUrl()}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(serializeMenuData(remaining))
      });
      if (!res.ok) throw new Error('API returned ' + res.status);
      savedMenuSnapshot = JSON.stringify(remaining);
    } catch (error) {
      alert(t('menuSaveFail') + error.message);
      return;
    } finally {
      isMenuSaving = false;
      panels.forEach(el => { el.inert = false; });
      updateMenuSaveState();
    }
  }
  currentMenuData.splice(idx, 1);
  isMenuDirty = JSON.stringify(currentMenuData) !== savedMenuSnapshot;
  updateMenuSaveState();
  renderMenuCategories();

  if (isCategoryManagerOpen) {
    renderCategoriesManagerView();
  } else {
    activeCategoryIndex = -1;
    const titleEl = document.getElementById("menu-editor-title");
    if (titleEl) titleEl.innerText = t("menuEditorTitle");
    const bodyEl = document.getElementById("menu-editor-body");
    if (bodyEl) bodyEl.innerHTML = `<div style="text-align:center; padding: 22px; color:#999;" id="i18n-menu-select-prompt">${t("menuSelectPrompt")}</div>`;
    
    const renameBtn = document.getElementById("btn-category-rename");
    const deleteBtn = document.getElementById("btn-category-delete");
    if (renameBtn) renameBtn.style.display = "none";
    if (deleteBtn) deleteBtn.style.display = "none";
  }

  // Auto-save immediately to database & refresh edge cache
  await saveMenuData(true);
}

function promptRenameCategory() {
  if (activeCategoryIndex >= 0) {
    promptRenameCategoryAtIndex(activeCategoryIndex);
  }
}

function deleteActiveCategory() {
  if (activeCategoryIndex >= 0) {
    deleteCategoryAtIndex(activeCategoryIndex);
  }
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
let currentStockGidx = null;
let currentStockOidx = null;

function openStockModal(cIdx, iIdx) {
  // Sync changes currently typed in DOM
  syncMenuDataFromDOM();

  currentStockCidx = cIdx;
  currentStockIidx = iIdx;
  currentStockGidx = null;
  currentStockOidx = null;

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

function openStockModalForCustomization(cIdx, gIdx, oIdx) {
  syncMenuDataFromDOM();
  currentStockCidx = cIdx;
  currentStockIidx = null;
  currentStockGidx = gIdx;
  currentStockOidx = oIdx;

  const group = currentMenuData[cIdx]?.groups?.[gIdx];
  const option = group?.options?.[oIdx];
  if (!group || !option) return;

  const titleEl = document.getElementById("stock-modal-title");
  if (titleEl) titleEl.innerText = t("stockModalItem", { name: `${group.title} - ${option.name}` });

  const statusSelect = document.getElementById("stock-status-select");
  if (statusSelect) statusSelect.value = option.isOos ? "out_of_stock" : "in_stock";

  const durationSelect = document.getElementById("stock-duration-select");
  if (durationSelect) durationSelect.value = "today";
  const untilDateInput = document.getElementById("oos-until-date");
  if (untilDateInput) untilDateInput.value = "";

  handleStockStatusChange();
  const modal = document.getElementById("stockModal");
  if (modal) modal.style.display = "flex";
}
window.openStockModalForCustomization = openStockModalForCustomization;

function closeStockModal() {
  document.getElementById("stockModal").style.display = "none";
  currentStockCidx = null;
  currentStockIidx = null;
  currentStockGidx = null;
  currentStockOidx = null;
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
  const isCustom = (currentStockGidx !== null && currentStockOidx !== null);
  if (currentStockCidx === null || (!isCustom && currentStockIidx === null)) return;

  // Sync current data from DOM
  syncMenuDataFromDOM();

  const status = document.getElementById("stock-status-select").value;
  const duration = document.getElementById("stock-duration-select").value;
  const untilDate = document.getElementById("oos-until-date").value;

  if (status === "out_of_stock" && duration === "multiple_days" && !untilDate) {
    alert(t("alertSelectOosDate"));
    return;
  }

  let body;
  let targetItem;

  if (isCustom) {
    const group = currentMenuData[currentStockCidx]?.groups?.[currentStockGidx];
    targetItem = group?.options?.[currentStockOidx];
    if (!targetItem) return;
    body = {
      category_slug: 'order_customization',
      customization_key: group.key || group.id,
      name: targetItem.originalName || targetItem.name,
      status: status,
      duration: duration,
      until_date: untilDate ? `${untilDate}T04:00:00+07:00` : null
    };
  } else {
    const categorySlug = currentMenuData[currentStockCidx].id;
    targetItem = currentMenuData[currentStockCidx].items[currentStockIidx];
    body = {
      category_slug: categorySlug,
      name: targetItem.originalName || targetItem.name,
      status: status,
      duration: duration,
      until_date: untilDate ? `${untilDate}T04:00:00+07:00` : null
    };
  }

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
    targetItem.isOos = (status === "out_of_stock");

    const targetCidx = currentStockCidx;
    closeStockModal();
    if (isCustom) {
      renderOrderCustomizationEditor(document.getElementById("menu-editor-body"), currentMenuData[targetCidx], targetCidx);
      renderMenuCategories();
    } else {
      renderMenuCategoryEditor(targetCidx);
    }
  } catch (e) {
    alert(t("stockUpdateFail") + e.message);
  }
}

// Position disclosures in viewport coordinates, outside the category columns.
document.addEventListener('toggle', event => {
  const help = event.target;
  if (!help.matches?.('.menu-help') || !help.open) return;
  const text = help.querySelector('.menu-help-text');
  if (!text) return;
  const anchor = help.getBoundingClientRect();
  text.style.right = 'auto';
  text.style.maxWidth = (window.innerWidth - 24) + 'px';
  text.style.left = Math.max(12, Math.min(anchor.left, window.innerWidth - text.offsetWidth - 12)) + 'px';
  text.style.top = Math.max(12, Math.min(anchor.bottom, window.innerHeight - text.offsetHeight - 12)) + 'px';
}, true);

// ==========================================================================
// POS Menu Bundle / Combo Editor Controller
// ==========================================================================

let bundleEditingTarget = null; // { catIndex, itemIndex, item }
let bundleDraftRule = null; // { version: 1, groups: [...] }
let bundleActiveGroupIndex = 0;
let bundleSourceTab = 'category'; // 'category' | 'items'

async function openBundleEditorModal(catIdx, itemIdx) {
  if (isMenuDirty) syncMenuDataFromDOM();
  if (!currentMenuData || !currentMenuData[catIdx] || !currentMenuData[catIdx].items[itemIdx]) return;

  const targetItem = currentMenuData[catIdx].items[itemIdx];
  if (!targetItem.name || targetItem.name.trim() === '') {
    alert(t("bundleValidationEmptyName") || "請先填寫菜單項目名稱");
    return;
  }

  // If item is freshly added and hasn't been saved to D1 yet, prompt to save
  if (isMenuDirty && !targetItem.id) {
    const shouldSave = confirm(currentLang === 'vi' 
      ? "Món mới cần được lưu vào hệ thống trước khi thiết lập Combo. Bạn có muốn lưu thực đơn ngay bây giờ không?" 
      : "新建立的菜單項目需先儲存至資料庫方可設定組合，是否立即儲存？");
    if (shouldSave) {
      await saveMenuData(true);
    } else {
      return;
    }
  }

  bundleEditingTarget = {
    catIndex: catIdx,
    itemIndex: itemIdx,
    item: currentMenuData[catIdx].items[itemIdx]
  };

  if (targetItem.bundleRule && Array.isArray(targetItem.bundleRule.groups) && targetItem.bundleRule.groups.length > 0) {
    bundleDraftRule = JSON.parse(JSON.stringify(targetItem.bundleRule));
    // Ensure group properties
    bundleDraftRule.groups.forEach((grp, idx) => {
      grp.id = grp.id || `group_${idx + 1}_${Date.now()}`;
      if (!grp.label || typeof grp.label !== 'object') {
        grp.label = {
          "zh-TW": grp.name || `自選分組 #${idx + 1}`,
          "vi": grp.name || `Nhóm chọn #${idx + 1}`
        };
      }
      grp.minQuantity = Math.max(1, Number(grp.minQuantity || 1));
      grp.maxQuantity = Math.max(grp.minQuantity, Number(grp.maxQuantity || grp.minQuantity));
      grp.allowRepeats = grp.allowRepeats !== undefined ? Boolean(grp.allowRepeats) : (grp.allowRepeat !== undefined ? Boolean(grp.allowRepeat) : true);
      grp.sources = Array.isArray(grp.sources) ? grp.sources : [];
    });
  } else {
    // Default initial bundle structure with 1 group
    bundleDraftRule = {
      version: 1,
      groups: [
        {
          id: `group_1_${Date.now()}`,
          label: {
            "zh-TW": "請選擇 1 樣餐點",
            "vi": "Chọn 1 món"
          },
          name: "請選擇 1 樣餐點",
          minQuantity: 1,
          maxQuantity: 1,
          allowRepeats: false,
          sources: []
        }
      ]
    };
  }

  bundleActiveGroupIndex = 0;
  bundleSourceTab = 'category';

  // Set modal header details
  const nameEl = document.getElementById("bundle-modal-item-name");
  if (nameEl) nameEl.textContent = targetItem.name;
  const priceEl = document.getElementById("bundle-modal-item-price");
  if (priceEl) priceEl.textContent = `$${targetItem.price !== null && targetItem.price !== undefined ? targetItem.price : 0}`;

  // Show/hide remove combo button & danger zone card
  const removeBtn = document.getElementById("btn-bundle-remove-config");
  const dangerZoneCard = document.getElementById("bundle-danger-zone-card");
  const isExistingCombo = Boolean(targetItem.bundleRule && targetItem.bundleRule.groups?.length > 0);
  if (removeBtn) {
    removeBtn.style.display = isExistingCombo ? "inline-flex" : "none";
  }
  if (dangerZoneCard) {
    dangerZoneCard.style.display = isExistingCombo ? "flex" : "none";
  }

  const modal = document.getElementById("modal-bundle-editor");
  if (modal) modal.style.display = "flex";

  renderBundleEditorSidebar();
  renderBundleGroupConfigPanel();
}
window.openBundleEditorModal = openBundleEditorModal;

function closeBundleEditorModal() {
  const modal = document.getElementById("modal-bundle-editor");
  if (modal) modal.style.display = "none";
  bundleEditingTarget = null;
  bundleDraftRule = null;
  bundleActiveGroupIndex = 0;
}
window.closeBundleEditorModal = closeBundleEditorModal;

function syncBundleCurrentGroupFromDOM() {
  if (!bundleDraftRule || !bundleDraftRule.groups[bundleActiveGroupIndex]) return;
  const grp = bundleDraftRule.groups[bundleActiveGroupIndex];
  const zhInp = document.getElementById("bundle-group-name-zh");
  const viInp = document.getElementById("bundle-group-name-vi");
  if (zhInp) grp.label["zh-TW"] = zhInp.value;
  if (viInp) grp.label["vi"] = viInp.value;
  grp.name = grp.label["zh-TW"] || grp.label["vi"] || grp.name;
}

function renderBundleEditorSidebar() {
  const listEl = document.getElementById("bundle-groups-list");
  const badgeEl = document.getElementById("bundle-group-count-badge");
  if (!listEl || !bundleDraftRule) return;

  if (badgeEl) badgeEl.textContent = String(bundleDraftRule.groups.length);
  listEl.innerHTML = "";

  bundleDraftRule.groups.forEach((grp, gIdx) => {
    const isActive = gIdx === bundleActiveGroupIndex;
    const grpName = (grp.label && (grp.label[currentLang] || grp.label['zh-TW'] || grp.label['vi'])) || grp.name || `${t("bundleBadge")} #${gIdx + 1}`;
    const qty = grp.minQuantity || 1;
    const repeatText = grp.allowRepeats ? (currentLang === 'vi' ? 'Được chọn lặp lại' : '可重複選') : (currentLang === 'vi' ? 'Không lặp lại' : '不可重複');
    const ruleSummary = currentLang === 'vi'
      ? `Bắt buộc ${qty} ${t("bundleItemUnit")} • ${repeatText}`
      : `必須選取 ${qty} ${t("bundleItemUnit")} • ${repeatText}`;

    const card = document.createElement("div");
    card.className = `bundle-group-card ${isActive ? 'active' : ''}`;
    card.onclick = () => selectBundleGroup(gIdx);

    let deleteBtnHtml = '';
    if (bundleDraftRule.groups.length > 1) {
      deleteBtnHtml = `
        <button type="button" class="bundle-group-card-delete" onclick="deleteBundleGroup(${gIdx}, event)" title="${t('btnItemDelete')}">
          ${POS_SVG.trash}
        </button>
      `;
    }

    card.innerHTML = `
      <div class="bundle-group-card-header">
        <span class="bundle-group-card-title">${escapeHtml(grpName)}</span>
        <span class="bundle-group-card-badge">#${gIdx + 1}</span>
      </div>
      <div class="bundle-group-card-rule">
        <span>${ruleSummary}</span>
      </div>
      ${deleteBtnHtml}
    `;
    listEl.appendChild(card);
  });
}

function selectBundleGroup(groupIdx) {
  syncBundleCurrentGroupFromDOM();
  bundleActiveGroupIndex = groupIdx;
  renderBundleEditorSidebar();
  renderBundleGroupConfigPanel();
}
window.selectBundleGroup = selectBundleGroup;

function addBundleGroup() {
  syncBundleCurrentGroupFromDOM();
  const newIdx = bundleDraftRule.groups.length + 1;
  bundleDraftRule.groups.push({
    id: `group_${newIdx}_${Date.now()}`,
    label: {
      "zh-TW": `請選擇 1 樣餐點 (組 ${newIdx})`,
      "vi": `Chọn 1 món (Nhóm ${newIdx})`
    },
    name: `請選擇 1 樣餐點 (組 ${newIdx})`,
    minQuantity: 1,
    maxQuantity: 1,
    allowRepeats: false,
    sources: []
  });
  bundleActiveGroupIndex = bundleDraftRule.groups.length - 1;
  renderBundleEditorSidebar();
  renderBundleGroupConfigPanel();
}
window.addBundleGroup = addBundleGroup;

function deleteBundleGroup(groupIdx, event) {
  if (event) event.stopPropagation();
  if (bundleDraftRule.groups.length <= 1) {
    alert(t("bundleValidationEmptyGroups"));
    return;
  }
  const confirmMsg = currentLang === 'vi' ? "Bạn có chắc muốn xóa nhóm chọn này?" : "確定要刪除此分組嗎？";
  if (!confirm(confirmMsg)) return;

  bundleDraftRule.groups.splice(groupIdx, 1);
  if (bundleActiveGroupIndex >= bundleDraftRule.groups.length) {
    bundleActiveGroupIndex = bundleDraftRule.groups.length - 1;
  }
  renderBundleEditorSidebar();
  renderBundleGroupConfigPanel();
}
window.deleteBundleGroup = deleteBundleGroup;

function updateBundleGroupName(val) {
  if (!bundleDraftRule || !bundleDraftRule.groups[bundleActiveGroupIndex]) return;
  const grp = bundleDraftRule.groups[bundleActiveGroupIndex];
  grp.name = val;
  if (!grp.label || typeof grp.label !== 'object') {
    grp.label = {};
  }
  grp.label["zh-TW"] = val;
  grp.label["vi"] = val;

  // Update card title live
  const cards = document.querySelectorAll("#bundle-groups-list .bundle-group-card");
  if (cards[bundleActiveGroupIndex]) {
    const titleEl = cards[bundleActiveGroupIndex].querySelector(".bundle-group-card-title");
    const displayVal = val || `${t("bundleBadge")} #${bundleActiveGroupIndex + 1}`;
    if (titleEl) titleEl.textContent = displayVal;
  }
}
window.updateBundleGroupName = updateBundleGroupName;

function updateBundleGroupLabel(lang, val) {
  updateBundleGroupName(val);
}
window.updateBundleGroupLabel = updateBundleGroupLabel;

function stepBundleQty(delta) {
  if (!bundleDraftRule || !bundleDraftRule.groups[bundleActiveGroupIndex]) return;
  const grp = bundleDraftRule.groups[bundleActiveGroupIndex];
  const newQty = Math.max(1, (grp.minQuantity || 1) + delta);
  grp.minQuantity = newQty;
  grp.maxQuantity = newQty;

  const valEl = document.getElementById("bundle-stepper-val");
  if (valEl) valEl.textContent = String(newQty);
  renderBundleEditorSidebar();
}
window.stepBundleQty = stepBundleQty;

function toggleBundleRepeat(isChecked) {
  if (!bundleDraftRule || !bundleDraftRule.groups[bundleActiveGroupIndex]) return;
  bundleDraftRule.groups[bundleActiveGroupIndex].allowRepeats = isChecked;
  const lbl = document.getElementById("bundle-repeat-label");
  if (lbl) lbl.classList.toggle("checked", isChecked);
  renderBundleEditorSidebar();
}
window.toggleBundleRepeat = toggleBundleRepeat;

function switchBundleSourceTab(tab) {
  bundleSourceTab = tab;
  renderBundleSourcesSection();
}
window.switchBundleSourceTab = switchBundleSourceTab;

function toggleBundleSourceCategory(catId, isChecked) {
  if (!bundleDraftRule || !bundleDraftRule.groups[bundleActiveGroupIndex]) return;
  const grp = bundleDraftRule.groups[bundleActiveGroupIndex];
  if (isChecked) {
    if (!grp.sources.some(s => s.type === 'category' && (s.categoryId === catId || s.refId === catId))) {
      grp.sources.push({ type: 'category', categoryId: catId, refId: catId });
    }
  } else {
    grp.sources = grp.sources.filter(s => !(s.type === 'category' && (s.categoryId === catId || s.refId === catId)));
  }
  renderBundleSourcesSection();
  renderBundleEligiblePreview();
}
window.toggleBundleSourceCategory = toggleBundleSourceCategory;

function toggleBundleSourceItem(itemId, isChecked) {
  if (!bundleDraftRule || !bundleDraftRule.groups[bundleActiveGroupIndex]) return;
  const grp = bundleDraftRule.groups[bundleActiveGroupIndex];
  let itemListSrc = grp.sources.find(s => s.type === 'item_list');
  if (!itemListSrc) {
    itemListSrc = { type: 'item_list', itemIds: [] };
    grp.sources.push(itemListSrc);
  }
  if (isChecked) {
    if (!itemListSrc.itemIds.includes(itemId)) itemListSrc.itemIds.push(itemId);
  } else {
    itemListSrc.itemIds = itemListSrc.itemIds.filter(id => id !== itemId);
  }
  if (itemListSrc.itemIds.length === 0) {
    grp.sources = grp.sources.filter(s => s !== itemListSrc);
  }
  renderBundleSourcesSection();
  renderBundleEligiblePreview();
}
window.toggleBundleSourceItem = toggleBundleSourceItem;

function computeEligibleItemsCount(grp) {
  if (!grp || !Array.isArray(grp.sources) || grp.sources.length === 0 || !currentMenuData) return 0;
  const itemSet = new Set();
  currentMenuData.forEach(cat => {
    if (cat.type !== 'catalog' || !Array.isArray(cat.items)) return;
    const catMatches = grp.sources.some(s => s.type === 'category' && (s.categoryId === cat.catId || s.refId === cat.catId || s.categoryId === cat.id || s.refId === cat.id));
    if (catMatches) {
      cat.items.forEach(it => {
        if (it.name) itemSet.add(it.id || it.name);
      });
    } else {
      const itemSrc = grp.sources.find(s => s.type === 'item_list');
      if (itemSrc && Array.isArray(itemSrc.itemIds)) {
        cat.items.forEach(it => {
          if (itemSrc.itemIds.includes(it.id) || itemSrc.itemIds.includes(it.name)) {
            itemSet.add(it.id || it.name);
          }
        });
      }
    }
  });
  return itemSet.size;
}

function renderBundleEligiblePreview() {
  const previewEl = document.getElementById("bundle-eligible-count");
  if (!previewEl || !bundleDraftRule || !bundleDraftRule.groups[bundleActiveGroupIndex]) return;
  const grp = bundleDraftRule.groups[bundleActiveGroupIndex];
  const count = computeEligibleItemsCount(grp);
  previewEl.textContent = String(count);
}

function renderBundleSourcesSection() {
  const container = document.getElementById("bundle-sources-container");
  if (!container || !bundleDraftRule || !bundleDraftRule.groups[bundleActiveGroupIndex]) return;
  const grp = bundleDraftRule.groups[bundleActiveGroupIndex];

  const catTabActive = bundleSourceTab === 'category';
  const itemTabActive = bundleSourceTab === 'items';

  let sourcesHtml = `
    <div class="bundle-source-type-segmented">
      <button type="button" class="bundle-source-type-pill ${catTabActive ? 'active' : ''}" onclick="switchBundleSourceTab('category')">
        ${POS_SVG.folder}<span>${t("bundleSourceCategory")}</span>
      </button>
      <button type="button" class="bundle-source-type-pill ${itemTabActive ? 'active' : ''}" onclick="switchBundleSourceTab('items')">
        ${POS_SVG.tag}<span>${t("bundleSourceItems")}</span>
      </button>
    </div>
  `;

  if (catTabActive) {
    sourcesHtml += `<div class="bundle-sources-grid" style="margin-top: 10px;">`;
    (currentMenuData || []).forEach(cat => {
      if (cat.type !== 'catalog') return;
      const catKey = cat.catId || cat.id;
      const isSelected = grp.sources.some(s => s.type === 'category' && (s.categoryId === catKey || s.refId === catKey || s.categoryId === cat.id));
      const itemCount = (cat.items && cat.items.length) || 0;
      sourcesHtml += `
        <label class="bundle-source-chip ${isSelected ? 'selected' : ''}">
          <input type="checkbox" ${isSelected ? 'checked' : ''} onchange="toggleBundleSourceCategory('${escapeHtml(catKey)}', this.checked)">
          <span class="bundle-source-chip-name">${escapeHtml(cat.title)}</span>
          <span class="bundle-source-chip-count">${itemCount} ${t("bundleItemUnit")}</span>
        </label>
      `;
    });
    sourcesHtml += `</div>`;
  } else {
    // Individual Items selector
    sourcesHtml += `<div class="bundle-sources-grid" style="margin-top: 10px; max-height: 260px;">`;
    let itemListSrc = grp.sources.find(s => s.type === 'item_list');
    const selectedItemIds = itemListSrc && Array.isArray(itemListSrc.itemIds) ? itemListSrc.itemIds : [];

    (currentMenuData || []).forEach(cat => {
      if (cat.type !== 'catalog' || !cat.items || cat.items.length === 0) return;
      cat.items.forEach(it => {
        const itemKey = it.id || it.name;
        const isSelected = selectedItemIds.includes(itemKey);
        sourcesHtml += `
          <label class="bundle-source-chip ${isSelected ? 'selected' : ''}" title="${escapeHtml(cat.title)} - ${escapeHtml(it.name)}">
            <input type="checkbox" ${isSelected ? 'checked' : ''} onchange="toggleBundleSourceItem('${escapeHtml(itemKey)}', this.checked)">
            <span class="bundle-source-chip-name">${escapeHtml(it.name)}</span>
            <span class="bundle-source-chip-count">$${it.price || 0}</span>
          </label>
        `;
      });
    });
    sourcesHtml += `</div>`;
  }

  container.innerHTML = sourcesHtml;
}

function renderBundleGroupConfigPanel() {
  const panel = document.getElementById("bundle-group-config-panel");
  if (!panel) return;

  if (!bundleDraftRule || !bundleDraftRule.groups || !bundleDraftRule.groups[bundleActiveGroupIndex]) {
    panel.innerHTML = `<div style="text-align:center; padding: 40px; color:#94a3b8;">${t("bundleValidationEmptyGroups")}</div>`;
    return;
  }

  const grp = bundleDraftRule.groups[bundleActiveGroupIndex];
  const grpName = grp.name || (grp.label && (grp.label[currentLang] || grp.label['zh-TW'] || grp.label['vi'])) || '';
  const qty = grp.minQuantity || 1;
  const isRepeat = Boolean(grp.allowRepeats);
  const eligibleCount = computeEligibleItemsCount(grp);

  panel.innerHTML = `
    <!-- Section 1: Group Name -->
    <div class="bundle-config-section">
      <div class="bundle-config-section-title">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
        </svg>
        <span id="i18n-bundle-section-name">${t("bundleGroupDetailTitle")}</span>
      </div>
      <div class="bundle-group-name-inputs">
        <div class="bundle-field-group">
          <label class="bundle-field-label" id="i18n-bundle-name-lbl">${t("bundleGroupName")}</label>
          <input type="text" class="bundle-input-text" id="bundle-group-name" value="${escapeHtml(grpName)}"
            placeholder="${t("bundleGroupNamePlaceholder")}" oninput="updateBundleGroupName(this.value)">
        </div>
      </div>
    </div>

    <!-- Section 2: Quantity Rule & Repeat -->
    <div class="bundle-config-section">
      <div class="bundle-config-section-title">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <path d="m9 12 2 2 4-4"/>
        </svg>
        <span id="i18n-bundle-section-rule">${t("bundleQuantityRule")}</span>
      </div>
      <div class="bundle-quantity-stepper-row">
        <div class="bundle-stepper-control">
          <button type="button" class="bundle-stepper-btn" onclick="stepBundleQty(-1)" aria-label="Decrease">-</button>
          <span class="bundle-stepper-value" id="bundle-stepper-val">${qty}</span>
          <button type="button" class="bundle-stepper-btn" onclick="stepBundleQty(1)" aria-label="Increase">+</button>
        </div>
        <label class="bundle-checkbox-label ${isRepeat ? 'checked' : ''}" id="bundle-repeat-label">
          <input type="checkbox" class="bundle-checkbox-input" ${isRepeat ? 'checked' : ''} onchange="toggleBundleRepeat(this.checked)">
          <div class="bundle-checkbox-text">
            <span class="bundle-checkbox-title">${t("bundleAllowRepeat")}</span>
            <span class="bundle-checkbox-desc">${t("bundleAllowRepeatDesc")}</span>
          </div>
        </label>
      </div>
    </div>

    <!-- Section 3: Sources Selector -->
    <div class="bundle-config-section">
      <div class="bundle-config-section-title">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.9a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z"/>
          <path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65"/>
          <path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65"/>
        </svg>
        <span id="i18n-bundle-section-source">${t("bundleSourceType")}</span>
      </div>
      <div id="bundle-sources-container"></div>
    </div>

    <!-- Section 4: Live Eligible Items Preview -->
    <div class="bundle-config-section" style="margin-top: auto; padding-top: 10px; border-top: 1px dashed #e2e8f0;">
      <div style="display: flex; align-items: center; justify-content: space-between; font-size: 13px; color: #475569;">
        <span>${t("bundleEligiblePreview")}:</span>
        <strong style="font-size: 16px; color: #4338ca;"><span id="bundle-eligible-count">${eligibleCount}</span> ${t("bundleItemUnit")}</strong>
      </div>
    </div>
  `;

  renderBundleSourcesSection();
}

async function saveBundleConfig() {
  if (!bundleEditingTarget || !bundleDraftRule) return;
  syncBundleCurrentGroupFromDOM();

  if (!bundleDraftRule.groups || bundleDraftRule.groups.length === 0) {
    alert(t("bundleValidationEmptyGroups"));
    return;
  }

  for (let i = 0; i < bundleDraftRule.groups.length; i++) {
    const grp = bundleDraftRule.groups[i];
    const zh = grp.label && grp.label["zh-TW"];
    const vi = grp.label && grp.label["vi"];
    if ((!zh || zh.trim() === '') && (!vi || vi.trim() === '') && (!grp.name || grp.name.trim() === '')) {
      alert(`${t("bundleValidationEmptyName")} (#${i + 1})`);
      selectBundleGroup(i);
      return;
    }
    if (!grp.sources || grp.sources.length === 0) {
      alert(`${t("bundleValidationEmptySources")} (#${i + 1})`);
      selectBundleGroup(i);
      return;
    }
  }

  const btnSave = document.getElementById("btn-bundle-modal-save");
  if (btnSave) {
    btnSave.disabled = true;
    btnSave.textContent = t("menuSaving");
  }

  try {
    const tenantId = getTenantIdFromUrl();
    const cat = currentMenuData[bundleEditingTarget.catIndex];
    const payload = {
      parent_item_id: bundleEditingTarget.item.id || null,
      item_name: bundleEditingTarget.item.name,
      category_id: cat.catId || null,
      category_slug: cat.id,
      config: {
        version: 1,
        groups: bundleDraftRule.groups
      }
    };

    const res = await fetch(`${WORKER_BASE}/api/menu/bundle-rules?tenant_id=${tenantId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const resData = await res.json();
    if (!res.ok || resData.error) {
      throw new Error(resData.error || res.statusText);
    }

    bundleEditingTarget.item.bundleRule = resData.bundleRule || bundleDraftRule;
    alert(t("bundleSaveSuccess"));
    const catIdx = bundleEditingTarget.catIndex;
    closeBundleEditorModal();
    renderMenuCategoryEditor(catIdx);
  } catch (err) {
    alert(t("bundleSaveFail") + (err.message || err));
  } finally {
    if (btnSave) {
      btnSave.disabled = false;
      btnSave.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
          <polyline points="17 21 17 13 7 13 7 21"/>
          <polyline points="7 3 7 8 15 8"/>
        </svg>
        <span id="i18n-btn-bundle-save">${t("btnBundleSave")}</span>
      `;
    }
  }
}
window.saveBundleConfig = saveBundleConfig;

async function clearBundleConfig() {
  if (!bundleEditingTarget) return;
  if (!confirm(t("confirmRemoveBundleConfig"))) return;

  const btnDel = document.getElementById("btn-bundle-remove-config");
  if (btnDel) btnDel.disabled = true;

  try {
    const tenantId = getTenantIdFromUrl();
    const cat = currentMenuData[bundleEditingTarget.catIndex];
    const payload = {
      parent_item_id: bundleEditingTarget.item.id || null,
      item_name: bundleEditingTarget.item.name,
      category_id: cat.catId || null,
      category_slug: cat.id,
      delete: true
    };

    const res = await fetch(`${WORKER_BASE}/api/menu/bundle-rules?tenant_id=${tenantId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const resData = await res.json();
    if (!res.ok || resData.error) {
      throw new Error(resData.error || res.statusText);
    }

    bundleEditingTarget.item.bundleRule = null;
    const catIdx = bundleEditingTarget.catIndex;
    closeBundleEditorModal();
    renderMenuCategoryEditor(catIdx);
  } catch (err) {
    alert(t("bundleSaveFail") + (err.message || err));
  } finally {
    if (btnDel) btnDel.disabled = false;
  }
}
window.clearBundleConfig = clearBundleConfig;
