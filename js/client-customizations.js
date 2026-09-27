// ==========================================
// Benmi Client Menu - Module: Customizations & Modifiers
// ==========================================

var bootstrapData = window.bootstrapData;
var cart = window.cart;
var customizeData = window.customizeData;
var comboDrinkData = window.comboDrinkData;
var currentPopup = window.currentPopup;

// --- COMBO DRINKS (OPTIONAL INLINE DRINK SELECTOR) ---
function renderComboDrinksInline(origName, qty) {
    const containerId = 'combo-container-combo-' + origName;
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';
    if (qty === 0) return;

    const cDrinkData = window.comboDrinkData || comboDrinkData;
    if (!cDrinkData[origName]) cDrinkData[origName] = [];

    const bData = window.bootstrapData || bootstrapData;
    const drinksCategory = bData?.catalog?.find(c => c.slug === 'drinks');
    const drinkItems = drinksCategory ? drinksCategory.items : [];
    if (drinkItems.length === 0) return;

    const box = document.createElement('div');
    box.className = 'combo-drinks';
    box.innerHTML = '<div style="display:flex; align-items:center; gap:6px; font-weight:800; font-size:14px; margin-bottom:6px;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8h1a4 4 0 0 1 0 8h-1"></path><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"></path><line x1="6" y1="1" x2="6" y2="4"></line><line x1="10" y1="1" x2="10" y2="4"></line><line x1="14" y1="1" x2="14" y2="4"></line></svg><span>選擇附贈飲料</span></div>';

    for (let i = 1; i <= qty; i++) {
        let firstDrink = drinkItems.find(d => !d.isOutOfStock) || drinkItems[0];
        const firstDrinkName = firstDrink ? firstDrink.name : '';
        if (!cDrinkData[origName][i - 1]) cDrinkData[origName][i - 1] = firstDrinkName;

        let sel = document.createElement('select');
        for (let d of drinkItems) {
            let opt = document.createElement('option');
            opt.value = d.name;
            opt.text = `第 ${i} 份：${d.name}${d.isOutOfStock ? ' (已售完)' : ''}`;
            if (d.isOutOfStock && cDrinkData[origName][i - 1] !== d.name) {
                opt.disabled = true;
            }
            if (cDrinkData[origName][i - 1] === d.name) opt.selected = true;
            sel.appendChild(opt);
        }
        sel.onchange = () => {
            cDrinkData[origName][i - 1] = sel.value;
            if (typeof updateTotal === 'function') updateTotal();
        };
        box.appendChild(sel);
    }
    container.appendChild(box);
}

function getCategoryModifiers(catSlug) {
    const bData = window.bootstrapData || bootstrapData;
    const catObj = bData?.catalog?.find(c => c.slug === catSlug);
    if (!catObj) return [];
    if (catObj.allowCustomization === false) return [];
    const applied = catObj.appliedModifiers || ['*'];
    if (applied.length === 0) return [];
    const allMods = bData?.modifiers || [];
    if (applied.includes('*')) return allMods;
    return allMods.filter(m => applied.includes(m.slug) || applied.includes(m.id));
}

function getItemModifiers(catSlug, itemName) {
    const bData = window.bootstrapData || bootstrapData;
    const catObj = bData?.catalog?.find(c => c.slug === catSlug);
    const itemObj = catObj?.items?.find(it => it.name === itemName);
    const itemMods = [];
    if (itemObj && Array.isArray(itemObj.modifierGroups) && itemObj.modifierGroups.length > 0) {
        itemObj.modifierGroups.forEach((mg, idx) => {
            itemMods.push({
                id: mg.id || `mg_${idx}`,
                slug: mg.id || `mg_${idx}`,
                name: mg.name,
                selectionType: mg.selectionType || 'single',
                isRequired: Boolean(mg.isRequired),
                minSelection: mg.minSelection,
                maxSelection: mg.maxSelection,
                options: (mg.options || []).map(opt => ({
                    id: opt.id,
                    name: opt.name,
                    price: opt.price || 0,
                    isDefault: Boolean(opt.isDefault),
                    isOutOfStock: Boolean(opt.isOutOfStock)
                }))
            });
        });
    }
    const catMods = getCategoryModifiers(catSlug);
    return [...itemMods, ...catMods];
}

function initPortionDefaults(category, origName, portionIndex) {
    const key = category + '_' + origName;
    const cData = window.customizeData || customizeData;
    if (!cData[key]) cData[key] = [];
    if (!cData[key][portionIndex]) {
        const modifiers = getItemModifiers(category, origName);
        const defaultSingle = {};
        modifiers.filter(m => m.selectionType === 'single').forEach(m => {
            const defOpt = (m.options || []).find(o => o.isDefault && !o.isOutOfStock) || (m.isRequired ? ((m.options || []).find(o => !o.isOutOfStock) || m.options[0]) : null);
            if (defOpt) defaultSingle[m.slug] = defOpt.name;
        });
        const defaultMulti = {};
        modifiers.filter(m => m.selectionType === 'multiple').forEach(m => {
            (m.options || []).filter(o => o.isDefault && !o.isOutOfStock).forEach(o => {
                defaultMulti[o.name] = true;
            });
        });
        cData[key][portionIndex] = { single: defaultSingle, multiple: defaultMulti, note: '' };
    }
    return cData[key][portionIndex];
}

// --- CUSTOMIZE POPUP (SCHEMA-DRIVEN MODIFIERS POPUP) ---
function openItemCustomizeModal(category, origName, targetPortionIndex) {
    if (typeof checkDesktopAuthGuard === 'function' && !checkDesktopAuthGuard()) return;
    const key = category + '_' + origName;
    const cartObj = window.cart || cart || {};
    const currentQty = cartObj[key] || 0;
    const portionIdx = (typeof targetPortionIndex === 'number') ? targetPortionIndex : currentQty;
    const isAddingNew = portionIdx >= currentQty;

    const modifiers = getItemModifiers(category, origName);
    if (!modifiers || modifiers.length === 0) {
        if (isAddingNew && typeof updateQty === 'function') {
            cartObj[key] = (cartObj[key] || 0) + 1;
            const qtySpan = document.getElementById('qty-' + category + '-' + origName);
            if (qtySpan) {
                qtySpan.innerText = cartObj[key];
                qtySpan.style.color = 'var(--primary)';
            }
            if (typeof updateTotal === 'function') updateTotal();
        }
        return;
    }

    const cData = window.customizeData || customizeData || {};
    window.customizeData = cData;
    if (!cData[key]) cData[key] = [];

    // Draft portion data (deep clone existing or init defaults)
    const existing = cData[key][portionIdx];
    let draft = null;
    if (existing) {
        draft = JSON.parse(JSON.stringify(existing));
    } else {
        const defaultSingle = {};
        modifiers.filter(m => m.selectionType === 'single').forEach(m => {
            const defOpt = (m.options || []).find(o => o.isDefault && !o.isOutOfStock) || (m.isRequired ? ((m.options || []).find(o => !o.isOutOfStock) || m.options[0]) : null);
            if (defOpt) defaultSingle[m.slug] = defOpt.name;
        });
        const defaultMulti = {};
        modifiers.filter(m => m.selectionType === 'multiple').forEach(m => {
            (m.options || []).filter(o => o.isDefault && !o.isOutOfStock).forEach(o => {
                defaultMulti[o.name] = true;
            });
        });
        draft = { single: defaultSingle, multiple: defaultMulti, note: '' };
    }

    // Resolve item info and price
    const resolveFn = typeof resolveCatalogItem === 'function' ? resolveCatalogItem : (window.resolveCatalogItem || (k => ({ origName, displayName: origName, price: 0 })));
    const itemInfo = resolveFn(key);
    const basePrice = Number(itemInfo?.price || 0);

    // Close any previous open popup
    if (typeof closePopup === 'function') closePopup();

    const overlay = document.createElement('div');
    overlay.className = 'popup-overlay';
    overlay.id = 'item-customize-overlay';
    overlay.onclick = (e) => { if (e.target === overlay) closePopup(); };

    const box = document.createElement('div');
    box.className = 'popup-box';

    const portionLabel = isAddingNew
        ? (currentQty > 0 ? `加點第 ${portionIdx + 1} 份` : `基本售價 $${basePrice}`)
        : `編輯第 ${portionIdx + 1} 份`;

    let portionTabsHTML = '';
    if (currentQty > 0) {
        portionTabsHTML = `
            <div class="portion-tabs-row" style="display: flex; gap: 8px; overflow-x: auto; margin: 4px 0 12px 0; padding-bottom: 4px;">
                ${Array.from({ length: currentQty }).map((_, i) => `
                    <button type="button" class="portion-tab-btn" data-portion="${i}" 
                            style="padding: 6px 12px; border-radius: 8px; font-size: 13px; font-weight: 700; border: 1.5px solid ${i === portionIdx ? 'var(--primary)' : '#e2e8f0'}; background: ${i === portionIdx ? '#f0fdf4' : '#fff'}; color: ${i === portionIdx ? 'var(--primary)' : '#475569'}; cursor: pointer; white-space: nowrap;">
                        第 ${i + 1} 份
                    </button>
                `).join('')}
                <button type="button" class="portion-tab-btn" data-portion="${currentQty}" 
                        style="padding: 6px 12px; border-radius: 8px; font-size: 13px; font-weight: 700; border: 1.5px dashed ${portionIdx >= currentQty ? 'var(--primary)' : '#cbd5e1'}; background: ${portionIdx >= currentQty ? '#f0fdf4' : '#f8fafc'}; color: ${portionIdx >= currentQty ? 'var(--primary)' : '#64748b'}; cursor: pointer; white-space: nowrap;">
                    + 加點第 ${currentQty + 1} 份
                </button>
            </div>
        `;
    }

    const copyPrevBtnHTML = (portionIdx > 0 && isAddingNew && cData[key] && cData[key][portionIdx - 1]) ? `
        <button type="button" class="btn-copy-prev-custom" style="width: 100%; border: 1px dashed #cbd5e1; background: #f8fafc; color: #475569; font-size: 13px; font-weight: 700; border-radius: 10px; padding: 8px 12px; margin-bottom: 10px; cursor: pointer;">
            與上一份相同
        </button>
    ` : '';

    box.innerHTML = `
        <div class="popup-header">
            <div>
                <div style="font-size: 18px; font-weight: 900; color: #0f172a;">${origName}</div>
                <div style="font-size: 13px; font-weight: 600; color: #64748b; margin-top: 2px;">${portionLabel}</div>
            </div>
            <div class="close-btn" onclick="closePopup()">✕</div>
        </div>
        ${portionTabsHTML}
        ${copyPrevBtnHTML}
        <div class="customize-modal-body" style="display: flex; flex-direction: column; gap: 14px; max-height: 55vh; overflow-y: auto; padding-right: 4px;">
        </div>
        <div class="customize-modal-footer" style="margin-top: 16px; padding-top: 12px; border-top: 1px solid #f1f5f9;">
            <button type="button" class="btn-send btn-customize-confirm" style="width: 100%; min-height: 48px; font-size: 16px; font-weight: 800; border-radius: 12px; display: flex; align-items: center; justify-content: center; gap: 6px;">
                <span>${isAddingNew ? '加入購物車' : '確認修改'}</span>
            </button>
        </div>
    `;

    box.querySelectorAll('.portion-tab-btn').forEach(btn => {
        btn.onclick = () => {
            const target = Number(btn.getAttribute('data-portion'));
            openItemCustomizeModal(category, origName, target);
        };
    });

    const copyBtn = box.querySelector('.btn-copy-prev-custom');
    if (copyBtn) {
        copyBtn.onclick = () => {
            const prev = cData[key] && cData[key][portionIdx - 1];
            if (prev) {
                draft = JSON.parse(JSON.stringify(prev));
                renderModalOptions();
            }
        };
    }

    const bodyEl = box.querySelector('.customize-modal-body');
    const confirmBtn = box.querySelector('.btn-customize-confirm');

    function renderModalOptions() {
        bodyEl.innerHTML = '';
        const getPrice = window.getModifierPrice || (typeof getModifierPrice === 'function' ? getModifierPrice : () => 0);

        modifiers.forEach(mod => {
            const section = document.createElement('div');
            section.className = 'modifier-section';
            section.style.marginBottom = '8px';

            const reqBadge = mod.isRequired ? `<span class="modifier-required-badge">必選</span>` : `<span class="modifier-optional-badge">可選</span>`;
            let sectionInner = `
                <div class="modifier-group-title" style="margin-bottom: 8px;">
                    <span style="font-size: 14px; font-weight: 800; color: #1e293b;">${mod.name}</span>
                    ${reqBadge}
                </div>
            `;

            if (mod.selectionType === 'single') {
                sectionInner += `<div class="modifier-pills-row">`;
                (mod.options || []).forEach(opt => {
                    const isOos = Boolean(opt.isOutOfStock);
                    const isSelected = (draft.single && draft.single[mod.slug] === opt.name);
                    const price = Number(opt.price !== undefined ? opt.price : getPrice(opt.name));
                    const priceText = price > 0 ? ` (+$${price})` : '';
                    const oosBadge = isOos ? `<span class="modifier-oos-tag">已售完</span>` : '';
                    sectionInner += `
                        <div class="modifier-pill ${isSelected ? 'active' : ''} ${isOos ? 'disabled' : ''}" 
                             data-mod-slug="${mod.slug}" data-opt-name="${opt.name}">
                            <span>${opt.name}${priceText}</span>${oosBadge}
                        </div>
                    `;
                });
                sectionInner += `</div>`;
            } else if (mod.selectionType === 'multiple') {
                sectionInner += `<div class="modifier-checkbox-grid">`;
                (mod.options || []).forEach(opt => {
                    const isOos = Boolean(opt.isOutOfStock);
                    const isChecked = Boolean(draft.multiple && draft.multiple[opt.name]);
                    const price = Number(opt.price !== undefined ? opt.price : getPrice(opt.name));
                    const priceText = isOos ? `<span class="modifier-oos-tag">已售完</span>` : (price > 0 ? `+$${price}` : '$0');
                    sectionInner += `
                        <div class="modifier-checkbox-chip ${isChecked ? 'active' : ''} ${isOos ? 'disabled' : ''}" 
                             data-opt-name="${opt.name}">
                            <span>${opt.name}</span>
                            <span style="font-size: 12px; opacity: 0.85;">${priceText}</span>
                        </div>
                    `;
                });
                sectionInner += `</div>`;
            }

            section.innerHTML = sectionInner;

            section.querySelectorAll('.modifier-pill').forEach(pill => {
                pill.onclick = () => {
                    if (pill.classList.contains('disabled')) return;
                    const modSlug = pill.getAttribute('data-mod-slug');
                    const optName = pill.getAttribute('data-opt-name');
                    if (!draft.single) draft.single = {};
                    draft.single[modSlug] = optName;
                    renderModalOptions();
                };
            });

            section.querySelectorAll('.modifier-checkbox-chip').forEach(chip => {
                chip.onclick = () => {
                    if (chip.classList.contains('disabled')) return;
                    const optName = chip.getAttribute('data-opt-name');
                    if (!draft.multiple) draft.multiple = {};
                    if (draft.multiple[optName]) {
                        delete draft.multiple[optName];
                    } else {
                        draft.multiple[optName] = true;
                    }
                    renderModalOptions();
                };
            });

            bodyEl.appendChild(section);
        });

        // Note input
        const noteDiv = document.createElement('div');
        noteDiv.innerHTML = `
            <label style="font-size: 13px; font-weight: 800; color: #475569; display: block; margin: 12px 0 6px 0;">個別備註</label>
            <input type="text" maxlength="50" value="${(draft.note || '').replace(/"/g, '&quot;')}" placeholder="例如：不要香菜、醬料分開裝" 
                   class="customize-note-input"
                   style="width: 100%; border: 1.5px solid #e2e8f0; border-radius: 12px; padding: 10px 14px; font-size: 14px; color: #1e293b; background: #fff; outline: none; box-sizing: border-box;">
        `;
        const noteInput = noteDiv.querySelector('.customize-note-input');
        noteInput.oninput = (e) => { draft.note = e.target.value; };
        bodyEl.appendChild(noteDiv);

        // Calculate dynamic total
        let extra = 0;
        if (draft.single) {
            Object.values(draft.single).forEach(opt => { extra += getPrice(opt); });
        }
        if (draft.multiple) {
            Object.keys(draft.multiple).forEach(opt => { if (draft.multiple[opt]) extra += getPrice(opt); });
        }
        const totalPrice = basePrice + extra;

        const actionText = isAddingNew ? '加入購物車' : '確認修改';
        confirmBtn.innerHTML = `
            <span>${actionText}</span>
            <span style="opacity: 0.85;">·</span>
            <span>$${totalPrice}</span>
        `;
    }

    confirmBtn.onclick = () => {
        // Validate required single modifier groups
        const missingReq = modifiers.find(m => m.isRequired && (!draft.single || !draft.single[m.slug]));
        if (missingReq) {
            if (typeof customAlert === 'function') customAlert(`請選擇「${missingReq.name}」`);
            else alert(`請選擇「${missingReq.name}」`);
            return;
        }

        // Save portion
        cData[key][portionIdx] = JSON.parse(JSON.stringify(draft));

        if (isAddingNew) {
            cartObj[key] = (cartObj[key] || 0) + 1;
        }

        // Update card UI
        const qtySpan = document.getElementById('qty-' + category + '-' + origName);
        if (qtySpan) {
            qtySpan.innerText = cartObj[key];
            qtySpan.style.color = cartObj[key] > 0 ? 'var(--primary)' : 'inherit';
        }

        const btn = document.getElementById('customize-btn-' + category + '-' + origName);
        if (btn) {
            btn.style.display = cartObj[key] > 0 ? 'flex' : 'none';
        }

        if (typeof updateTotal === 'function') updateTotal();
        closePopup();
    };

    renderModalOptions();

    overlay.appendChild(box);
    overlay._savedScrollY = window.scrollY;
    document.body.style.position = 'fixed';
    document.body.style.top = `-${overlay._savedScrollY}px`;
    document.body.style.left = '0';
    document.body.style.right = '0';
    document.body.style.width = '100%';

    document.body.appendChild(overlay);
    currentPopup = overlay;
    window.currentPopup = overlay;
}

function toggleCustomize(category, origName) {
    if (typeof checkDesktopAuthGuard === 'function' && !checkDesktopAuthGuard()) return;
    openItemCustomizeModal(category, origName, 0);
}

function updateCustomizeOkBtn(key) {
    const popup = window.currentPopup || currentPopup;
    if (!popup) return;
    const okBtn = popup.querySelector('.btn-customize-ok');
    if (!okBtn) return;
    const cData = window.customizeData || customizeData;
    const portions = cData ? cData[key] : null;
    let extra = 0;
    const getPrice = window.getModifierPrice || (typeof getModifierPrice === 'function' ? getModifierPrice : () => 0);
    if (Array.isArray(portions)) {
        portions.forEach(p => {
            if (p) {
                if (p.single) {
                    Object.values(p.single).forEach(optName => {
                        extra += getPrice(optName);
                    });
                }
                if (p.multiple) {
                    Object.keys(p.multiple).forEach(optName => {
                        if (p.multiple[optName]) {
                            extra += getPrice(optName);
                        }
                    });
                }
            }
        });
    }
    okBtn.innerText = extra > 0 ? `完成設定 (+$${extra})` : '完成設定';
}

// Dynamic tenant modifier helpers
function selectSingleModifier(key, portionIdx, modSlug, optName, el) {
    if (el && el.classList.contains('disabled')) return;
    const cData = window.customizeData || customizeData;
    if (!cData[key]) cData[key] = [];
    if (!cData[key][portionIdx]) cData[key][portionIdx] = { single: {}, multiple: {}, note: '' };
    if (!cData[key][portionIdx].single) cData[key][portionIdx].single = {};
    cData[key][portionIdx].single[modSlug] = optName;

    const parentRow = el.parentElement;
    if (parentRow) parentRow.querySelectorAll('.modifier-pill').forEach(p => p.classList.remove('active'));
    el.classList.add('active');
    updateCustomizeOkBtn(key);
    if (typeof updateTotal === 'function') updateTotal();
    else if (typeof window.updateTotal === 'function') window.updateTotal();
}

function toggleMultipleModifier(key, portionIdx, optName, el) {
    if (el && el.classList.contains('disabled')) return;
    const cData = window.customizeData || customizeData;
    if (!cData[key]) cData[key] = [];
    if (!cData[key][portionIdx]) cData[key][portionIdx] = { single: {}, multiple: {}, note: '' };
    if (!cData[key][portionIdx].multiple) cData[key][portionIdx].multiple = {};

    const isCurrentlyChecked = Boolean(cData[key][portionIdx].multiple[optName]);
    if (isCurrentlyChecked) {
        delete cData[key][portionIdx].multiple[optName];
        el.classList.remove('active');
    } else {
        cData[key][portionIdx].multiple[optName] = true;
        el.classList.add('active');
    }
    updateCustomizeOkBtn(key);
    if (typeof updateTotal === 'function') updateTotal();
    else if (typeof window.updateTotal === 'function') window.updateTotal();
}

function saveCustomNote(key, portionIdx, val) {
    const cData = window.customizeData || customizeData;
    if (!cData) return;
    if (!cData[key]) cData[key] = [];
    if (!cData[key][portionIdx]) cData[key][portionIdx] = { single: {}, multiple: {}, note: '' };
    cData[key][portionIdx].note = String(val || '').slice(0, 50);
}

function closePopup() {
    const popup = window.currentPopup || currentPopup;
    if (popup) {
        const savedY = popup._savedScrollY || 0;
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.left = '';
        document.body.style.right = '';
        document.body.style.width = '';

        popup.remove();
        currentPopup = null;
        window.currentPopup = null;

        setTimeout(() => {
            const origScroll = document.documentElement.style.scrollBehavior;
            document.documentElement.style.scrollBehavior = 'auto';
            window.scrollTo(0, savedY);
            document.documentElement.style.scrollBehavior = origScroll;
        }, 10);
    }
    if (typeof updateTotal === 'function') {
        updateTotal();
    } else if (typeof window.updateTotal === 'function') {
        window.updateTotal();
    }
}

// Window Public Bindings
window.renderComboDrinksInline = renderComboDrinksInline;
window.getCategoryModifiers = getCategoryModifiers;
window.getItemModifiers = getItemModifiers;
window.initPortionDefaults = initPortionDefaults;
window.openItemCustomizeModal = openItemCustomizeModal;
window.toggleCustomize = toggleCustomize;
window.selectSingleModifier = selectSingleModifier;
window.toggleMultipleModifier = toggleMultipleModifier;
window.saveCustomNote = saveCustomNote;
window.closePopup = closePopup;
