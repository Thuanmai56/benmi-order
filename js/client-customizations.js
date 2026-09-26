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

// --- CUSTOMIZE POPUP (SCHEMA-DRIVEN MODIFIERS POPUP) ---
function toggleCustomize(category, origName) {
    if (typeof checkDesktopAuthGuard === 'function' && !checkDesktopAuthGuard()) return;
    const key = category + '_' + origName;
    const cartObj = window.cart || cart;
    const qty = cartObj[key];
    if (!qty) return;

    const modifiers = getCategoryModifiers(category);
    if (!modifiers || modifiers.length === 0) return;

    const cData = window.customizeData || customizeData;
    if (!cData[key]) cData[key] = [];

    const overlay = document.createElement('div');
    overlay.className = 'popup-overlay';
    overlay.onclick = (e) => { if (e.target === overlay) closePopup(); };

    const box = document.createElement('div');
    box.className = 'popup-box';
    box.innerHTML = `
        <div class="popup-header">
            <span>${origName} 客製化設定</span>
            <div class="close-btn" onclick="closePopup()">✕</div>
        </div>
    `;

    for (let i = 0; i < qty; i++) {
        if (!cData[key][i]) {
            const defaultSingle = {};
            modifiers.filter(m => m.selectionType === 'single').forEach(m => {
                const defOpt = m.options.find(o => o.isDefault && !o.isOutOfStock) || m.options.find(o => !o.isOutOfStock) || m.options[0];
                if (defOpt) defaultSingle[m.slug] = defOpt.name;
            });
            cData[key][i] = { single: defaultSingle, multiple: {}, note: '' };
        }

        const currentPortion = cData[key][i];
        const section = document.createElement('div');
        section.className = 'modifier-section';

        let sectionInner = `<div style="font-weight: 900; color: var(--primary); font-size: 16px; margin-bottom: 12px;">第 ${i + 1} 份</div>`;

        modifiers.forEach(mod => {
            const reqBadge = mod.isRequired ? `<span class="modifier-required-badge">必選</span>` : `<span class="modifier-optional-badge">可選</span>`;
            sectionInner += `
                <div class="modifier-group-title">
                    <span>${mod.name}</span>
                    ${reqBadge}
                </div>
            `;

            const safeModSlug = mod.slug.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
            if (mod.selectionType === 'single') {
                sectionInner += `<div class="modifier-pills-row">`;
                mod.options.forEach(opt => {
                    const isOos = Boolean(opt.isOutOfStock);
                    const isSelected = (currentPortion.single && currentPortion.single[mod.slug] === opt.name);
                    const priceText = opt.price > 0 ? ` (+$${opt.price})` : '';
                    const oosBadge = isOos ? `<span class="modifier-oos-tag">已售完</span>` : '';
                    const safeOptName = opt.name.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
                    const safeKey = key.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
                    sectionInner += `
                        <div class="modifier-pill ${isSelected ? 'active' : ''} ${isOos ? 'disabled' : ''}" 
                             onclick="${isOos ? '' : `selectSingleModifier('${safeKey}', ${i}, '${safeModSlug}', '${safeOptName}', this)`}">
                            <span>${opt.name}${priceText}</span>${oosBadge}
                        </div>
                    `;
                });
                sectionInner += `</div>`;
            } else if (mod.selectionType === 'multiple') {
                sectionInner += `<div class="modifier-checkbox-grid">`;
                mod.options.forEach(opt => {
                    const isOos = Boolean(opt.isOutOfStock);
                    const isChecked = Boolean(currentPortion.multiple && currentPortion.multiple[opt.name]);
                    const priceText = isOos ? `<span class="modifier-oos-tag">已售完</span>` : (opt.price > 0 ? `+$${opt.price}` : '$0');
                    const safeOptName = opt.name.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
                    const safeKey = key.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
                    sectionInner += `
                        <div class="modifier-checkbox-chip ${isChecked ? 'active' : ''} ${isOos ? 'disabled' : ''}" 
                             onclick="${isOos ? '' : `toggleMultipleModifier('${safeKey}', ${i}, '${safeOptName}', this)`}">
                            <span>${opt.name}</span>
                            <span style="font-size: 12px; opacity: 0.85;">${priceText}</span>
                        </div>
                    `;
                });
                sectionInner += `</div>`;
            }
        });

        sectionInner += `
            <label style="font-size: 13px; font-weight: 800; color: var(--muted); display: block; margin: 14px 0 4px 0;">個別備註</label>
            <input type="text" maxlength="50" value="${(currentPortion.note || '').replace(/"/g, '&quot;')}" placeholder="例如：不要香菜、醬料分開裝" 
                   oninput="saveCustomNote('${key}', ${i}, this.value)">
        `;

        section.innerHTML = sectionInner;
        box.appendChild(section);
    }

    const okBtn = document.createElement('button');
    okBtn.innerText = '完成設定';
    okBtn.className = 'btn-send btn-customize-ok';
    okBtn.style.cssText = 'width:100%; margin-top:8px;';
    okBtn.onclick = () => { closePopup(); };
    box.appendChild(okBtn);

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

    updateCustomizeOkBtn(key);
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
window.toggleCustomize = toggleCustomize;
window.selectSingleModifier = selectSingleModifier;
window.toggleMultipleModifier = toggleMultipleModifier;
window.saveCustomNote = saveCustomNote;
window.closePopup = closePopup;
