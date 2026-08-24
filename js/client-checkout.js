/**
 * client-checkout.js
 * Quản lý quy trình đặt hàng, kiểm tra hợp lệ, hẹn giờ lấy món và gửi đơn hàng.
 */

// Append Mode Global State
window.isAppendMode = false;
window.parentOrderKey = null;
window.appendTableNumber = null;

function getUrlParamsWithLiffState() {
    const merged = new URLSearchParams();

    // 1. Kiểm tra direct query search params
    const directParams = new URLSearchParams(window.location.search);
    for (const [k, v] of directParams.entries()) {
        if (k !== 'liff.state') merged.set(k, v);
    }
    
    // 2. Kiểm tra liff.state nếu LINE mã hóa tham số vào liff.state
    const liffState = directParams.get('liff.state');
    if (liffState) {
        try {
            const decoded = decodeURIComponent(liffState);
            const queryPart = decoded.includes('?') ? decoded.split('?')[1] : decoded;
            const stateParams = new URLSearchParams(queryPart);
            for (const [k, v] of stateParams.entries()) {
                merged.set(k, v);
            }
        } catch (e) {
            console.warn("Failed to parse liff.state:", e);
        }
    }

    // 3. Kiểm tra hash nếu tham số được truyền sau dấu #
    if (window.location.hash) {
        try {
            const hashRaw = window.location.hash.substring(1);
            const hashDecoded = decodeURIComponent(hashRaw);
            const hashQuery = hashDecoded.includes('?') ? hashDecoded.split('?')[1] : hashDecoded;
            const hashParams = new URLSearchParams(hashQuery);
            for (const [k, v] of hashParams.entries()) {
                merged.set(k, v);
            }
        } catch (e) {}
    }

    return merged;
}

function initAppendModeIfPresent() {
    const urlParams = getUrlParamsWithLiffState();
    let parentOrderKey = urlParams.get('parent_order_key');
    let paramTableNumber = urlParams.get('table_number');
    let mode = urlParams.get('mode');

    // Check sessionStorage fallback if page reloaded
    if (!parentOrderKey) {
        try {
            parentOrderKey = sessionStorage.getItem('benmi_append_parent');
            paramTableNumber = sessionStorage.getItem('benmi_append_table') || paramTableNumber;
            if (parentOrderKey) mode = 'append';
        } catch (e) {}
    }

    if (parentOrderKey && (mode === 'append' || mode === 'add')) {
        window.isAppendMode = true;
        window.parentOrderKey = parentOrderKey;
        window.appendTableNumber = paramTableNumber || '';
        try {
            sessionStorage.setItem('benmi_append_parent', parentOrderKey);
            if (paramTableNumber) sessionStorage.setItem('benmi_append_table', paramTableNumber);
        } catch (e) {}

        // Show Banner
        const bannerEl = document.getElementById('append-mode-banner');
        if (bannerEl) {
            bannerEl.style.display = 'flex';
            const tableEl = document.getElementById('append-mode-table');
            if (tableEl) tableEl.innerText = paramTableNumber ? `桌號 ${paramTableNumber}` : '現場內用';
            const keyEl = document.getElementById('append-mode-key');
            if (keyEl) keyEl.innerText = `#${parentOrderKey}`;
        }

        // Lock Dining Option to Dine-In
        if (typeof setCustomerDiningOption === 'function') {
            setCustomerDiningOption('dine_in');
        }
        const toggleWrapper = document.getElementById('dining-option-wrapper');
        if (toggleWrapper) toggleWrapper.style.display = 'none';
        const checkoutToggleGroup = document.getElementById('checkout-dining-option-group');
        if (checkoutToggleGroup) checkoutToggleGroup.style.display = 'none';

        // Hide table number input in append mode (table is already bound to parent order)
        const tableGroup = document.getElementById('dinein-table-input-group');
        if (tableGroup) tableGroup.style.display = 'none';

        const tableInput = document.getElementById('dinein-table-number');
        if (tableInput && paramTableNumber) {
            tableInput.value = paramTableNumber;
        }

        // Update submit button text
        const submitBtn = document.getElementById('btn-submit');
        if (submitBtn) {
            submitBtn.innerText = '確認加點';
        }
    }
}

function cancelAppendMode() {
    window.isAppendMode = false;
    window.parentOrderKey = null;
    window.appendTableNumber = null;
    try {
        sessionStorage.removeItem('benmi_append_parent');
        sessionStorage.removeItem('benmi_append_table');
    } catch(e) {}

    const bannerEl = document.getElementById('append-mode-banner');
    if (bannerEl) bannerEl.style.display = 'none';

    // Khôi phục ô nhập số bàn
    const tableGroup = document.getElementById('dinein-table-input-group');
    if (tableGroup && window.currentDiningOption === 'dine_in') {
        tableGroup.style.display = 'block';
    }
    const tableInput = document.getElementById('dinein-table-number');
    if (tableInput) {
        tableInput.value = '';
        tableInput.readOnly = false;
        tableInput.style.backgroundColor = '#fff';
        tableInput.style.color = '#1e1b4b';
        tableInput.style.cursor = 'text';
    }

    // Khôi phục bộ chuyển đổi Dine-In / Takeaway
    if (typeof applyPickupConfig === 'function') applyPickupConfig();
    if (typeof updateFooterButtonState === 'function') updateFooterButtonState();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAppendModeIfPresent);
} else {
    initAppendModeIfPresent();
}

// 1. Kiểm tra vị trí hiển thị của khu vực thanh toán
function isCheckoutSectionVisible() {
    const el = document.getElementById('sec-checkout');
    if (!el) return true;
    const rect = el.getBoundingClientRect();
    const windowHeight = (window.innerHeight || document.documentElement.clientHeight);
    return (rect.top <= windowHeight * 0.85);
}

// 2. Cập nhật trạng thái chữ trên nút cố định ở chân trang
function updateFooterButtonState() {
    const btn = document.getElementById('btn-submit');
    if (!btn || btn.disabled || isSubmitting) return;

    if (window.isAppendMode) {
        btn.innerText = '確認加點';
        return;
    }

    if (isCheckoutSectionVisible()) {
        btn.innerText = '確認下單';
    } else {
        btn.innerText = '前往結帳 ➔';
    }
}

// 3. Xử lý hành vi bấm nút chân trang 2 bước
function handleFooterAction() {
    const hasItem = Object.values(cart || {}).some(q => q > 0);
    if (!hasItem) return customAlert('請先選擇餐點品項加入購物車');

    // Bước 1: Nếu chưa ở khu vực thanh toán -> cuộn mượt xuống
    if (!isCheckoutSectionVisible()) {
        scrollToSec('sec-checkout');
        const checkoutSec = document.getElementById('sec-checkout');
        if (checkoutSec) {
            checkoutSec.style.transition = 'box-shadow 0.3s ease, border-color 0.3s ease';
            checkoutSec.style.boxShadow = '0 0 0 3px var(--primary), 0 10px 25px rgba(0,0,0,0.1)';
            setTimeout(() => { checkoutSec.style.boxShadow = ''; }, 1500);
        }
        updateFooterButtonState();
        return;
    }

    // Bước 2: Khi đã ở khu vực thanh toán -> Gửi đơn
    submitOrder();
}

// 4. Hiệu ứng làm nổi bật ô nhập giờ khi khách quên chọn
function highlightMissingPickupTime() {
    const pickupSec = document.getElementById('pickup-time-section') || document.getElementById('sec-checkout');
    if (pickupSec) {
        pickupSec.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    const timeEl = document.getElementById('pickup-time');
    if (timeEl) {
        timeEl.classList.add('attention-pulse');
        const removePulse = () => {
            timeEl.classList.remove('attention-pulse');
            timeEl.removeEventListener('focus', removePulse);
            timeEl.removeEventListener('change', removePulse);
            timeEl.removeEventListener('click', removePulse);
        };
        timeEl.addEventListener('focus', removePulse);
        timeEl.addEventListener('change', removePulse);
        timeEl.addEventListener('click', removePulse);
        setTimeout(() => {
            try { timeEl.focus(); } catch (e) { }
        }, 400);
    }
    customAlert('⚠️ 請選擇預計取餐時間 🕒');
}

// 5. Xác định ca mở cửa tiếp theo khi quán đang đóng cửa
function getNextOpeningInfo(twNow) {
    if (!storeConfig || !storeConfig.operatingHours) {
        return { timeStr: '11:00', dayText: '今日' };
    }
    const currentDay = twNow.getDay();
    const currentHours = twNow.getHours() + twNow.getMinutes() / 60;
    const daysName = ["週日", "週一", "週二", "週三", "週四", "週五", "週六"];

    // 1. Kiểm tra các ca sau trong cùng ngày
    const todayShifts = storeConfig.operatingHours[currentDay] || [];
    for (const shift of todayShifts) {
        const [sH, sM] = shift.start.split(':').map(Number);
        if (sH + sM / 60 > currentHours) {
            return { timeStr: shift.start, dayText: '今日' };
        }
    }

    // 2. Tìm ngày mở cửa gần nhất tiếp theo
    for (let offset = 1; offset <= 7; offset++) {
        const nextDay = (currentDay + offset) % 7;
        const shifts = storeConfig.operatingHours[nextDay] || [];
        if (shifts.length > 0) {
            const dayLabel = offset === 1 ? '明日' : `${daysName[nextDay]}`;
            return { timeStr: shifts[0].start, dayText: dayLabel };
        }
    }
    return { timeStr: '11:00', dayText: '開店' };
}

// 6. Hộp thoại xác nhận tùy biến
function customConfirm(htmlMsg, onConfirm, onCancel = null) {
    const alertBox = document.getElementById('custom-alert');
    const msgEl = document.getElementById('custom-alert-message');
    if (!alertBox || !msgEl) {
        if (confirm(htmlMsg.replace(/<[^>]*>/g, ' '))) {
            if (onConfirm) onConfirm();
        } else {
            if (onCancel) onCancel();
        }
        return;
    }

    msgEl.innerHTML = `
        <div>${htmlMsg}</div>
        <div style="display: flex; gap: 10px; margin-top: 20px;">
            <button id="custom-confirm-cancel" style="flex: 1; padding: 12px; border-radius: 12px; border: 1.5px solid #e5e7eb; background: #fff; color: #4b5563; font-weight: 800; cursor: pointer;">
                取消
            </button>
            <button id="custom-confirm-ok" style="flex: 1; padding: 12px; border-radius: 12px; border: none; background: var(--primary); color: #fff; font-weight: 900; cursor: pointer;">
                確認送出
            </button>
        </div>
    `;

    alertBox.style.display = 'flex';

    // Ẩn nút OK mặc định của alert
    const defaultOkBtn = alertBox.querySelector('.btn-alert-close');
    if (defaultOkBtn) defaultOkBtn.style.display = 'none';

    document.getElementById('custom-confirm-ok').onclick = () => {
        alertBox.style.display = 'none';
        if (defaultOkBtn) defaultOkBtn.style.display = 'block';
        if (onConfirm) onConfirm();
    };

    document.getElementById('custom-confirm-cancel').onclick = () => {
        alertBox.style.display = 'none';
        if (defaultOkBtn) defaultOkBtn.style.display = 'block';
        if (onCancel) onCancel();
    };
}

// 7. Sinh mã đơn hàng chuẩn gọn (10 ký tự: {PREFIX}{MMDD}-{SUFFIX}, ví dụ: B0822-7K9M)
const ORDER_ID_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

function generateBase32Suffix(length = 4) {
    let suffix = "";
    for (let i = 0; i < length; i++) {
        const idx = Math.floor(Math.random() * ORDER_ID_ALPHABET.length);
        suffix += ORDER_ID_ALPHABET[idx];
    }
    return suffix;
}

function generateOrderNumber() {
    const now = getTaiwanDate();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const tenantId = getTenantIdFromUrl();

    let prefix = 'B';
    if (typeof storeConfig !== 'undefined' && storeConfig && storeConfig.orderPrefix) {
        prefix = storeConfig.orderPrefix.toUpperCase();
    } else {
        prefix = tenantId ? tenantId.charAt(0).toUpperCase() : 'B';
    }

    const suffix = generateBase32Suffix(4);
    return `${prefix}${month}${day}-${suffix}`;
}

// 8. Hàm phân giải khóa giỏ hàng chính xác theo danh mục và tên món
function parseCartKey(key) {
    if (!key) return { catSlug: '', origName: '', itemName: '' };
    if (typeof bootstrapData !== 'undefined' && bootstrapData && bootstrapData.catalog) {
        for (const cat of bootstrapData.catalog) {
            const prefix = `${cat.slug}_`;
            if (key.startsWith(prefix)) {
                const name = key.substring(prefix.length);
                return { catSlug: cat.slug, origName: name, itemName: name };
            }
        }
    }
    const idx = key.indexOf('_');
    if (idx === -1) {
        return { catSlug: '', origName: key, itemName: key };
    }
    const name = key.substring(idx + 1);
    return {
        catSlug: key.substring(0, idx),
        origName: name,
        itemName: name
    };
}

function formatGlobalCustomizationsText() {
    if (typeof bootstrapData === 'undefined' || !bootstrapData || !bootstrapData.customizations || bootstrapData.customizations.length === 0) return "";
    const parts = [];

    bootstrapData.customizations.forEach(group => {
        if (group.type === 'radio') {
            const checkedRadio = document.querySelector(`input[name="opt-${group.key}"]:checked`);
            if (checkedRadio) {
                const val = checkedRadio.value;
                const subOpts = [];
                const subContainer = document.querySelector(`.sub-option-container[data-parent-flavor="${val}"]`);
                if (subContainer) {
                    subContainer.querySelectorAll('input.sub-opt-chk:checked').forEach(chk => {
                        subOpts.push(chk.value);
                    });
                }
                const subPart = subOpts.length > 0 ? ` (${subOpts.join('、')})` : '';
                parts.push(`${group.title.replace(/^✦\s*/, '')}：${val}${subPart}`);
            }
        } else if (group.type === 'checkbox') {
            const checkedBoxes = Array.from(document.querySelectorAll(`input[name="opt-${group.key}"]:checked`));
            if (checkedBoxes.length > 0) {
                const boxVals = checkedBoxes.map(chk => {
                    const p = Number(chk.getAttribute('data-price')) || 0;
                    return p > 0 ? `${chk.value}(+$${p})` : chk.value;
                });
                parts.push(`${group.title.replace(/^✦\s*/, '')}：${boxVals.join('、')}`);
            }
        }
    });

    return parts.length > 0 ? `【${parts.join(' | ')}】` : "";
}

// 8.1 Định dạng nội dung tin nhắn đơn hàng
function formatOrderTextMessage(orderNum, dateInput, timeInput, currentTotal, mainNote) {
    const zhNumbers = ['第一份', '第二份', '第三份', '第四份', '第五份', '第六份', '第七份', '第八份', '第九份', '第十份'];
    let msg = `[${document.getElementById('store-name')?.innerText || '線上'} 點餐]\n訂單編號：${orderNum}\n`;

    const globalFlavor = formatGlobalCustomizationsText();
    if (globalFlavor) {
        msg += `🧪 口味設定：${globalFlavor}\n`;
    }

    msg += `📦 訂單內容：\n`;

    for (let key in cart) {
        if (cart[key] > 0) {
            const { catSlug, origName } = parseCartKey(key);
            msg += `\n${cart[key]}份 x ${origName}`;

            if (catSlug === 'combo') {
                let drinks = comboDrinkData[origName] || [];
                let drinkCounts = {};
                drinks.slice(0, cart[key]).forEach(d => { drinkCounts[d] = (drinkCounts[d] || 0) + 1; });
                let drinkStr = Object.entries(drinkCounts).map(([n, c]) => `${n} x${c}`).join('、');
                if (drinkStr) msg += `\n   ↳ 飲料：${drinkStr}`;
            }

            if (customizeData[key]) {
                customizeData[key].slice(0, cart[key]).forEach((c, i) => {
                    const parts = [];
                    if (c.single) {
                        for (let s in c.single) {
                            if (c.single[s] && c.single[s] !== '不辣' && c.single[s] !== '不需要') {
                                parts.push(c.single[s]);
                            }
                        }
                    }
                    if (c.multiple) {
                        for (let t in c.multiple) {
                            if (c.multiple[t]) {
                                const addP = (typeof modPriceMap !== 'undefined' && modPriceMap[t]) ? modPriceMap[t] : 0;
                                if (addP > 0) {
                                    parts.push(`${t} (+$${addP})`);
                                } else {
                                    parts.push(t);
                                }
                            }
                        }
                    }
                    if (c.topping && c.topping !== '') parts.push(c.topping);
                    if (c.spicy && c.spicy !== '不辣') parts.push(c.spicy);
                    if (c.note && c.note.trim() !== '') parts.push(c.note.trim());

                    if (parts.length > 0) {
                        let zhIdx = zhNumbers[i] || `第 ${i + 1} 份`;
                        msg += `\n   ↳ ${zhIdx}: ${parts.join(', ')}`;
                    }
                });
            }
        }
    }

    const isDineIn = (window.currentDiningOption === 'dine_in');
    const tableInput = document.getElementById('dinein-table-number');
    const tableNumber = (isDineIn && tableInput) ? tableInput.value.trim() : '';

    const diningLabel = isDineIn ? (tableNumber ? `🍽️ 內用 (桌號：${tableNumber})` : '🍽️ 內用') : '🛍️ 外帶';
    msg += `\n📍 用餐方式：${diningLabel}`;

    if (isDineIn) {
        msg += `\n\n🕒 點餐時間：${dateInput} ${timeInput}`;
        if (tableNumber) {
            msg += `\n🪑 用餐桌號：${tableNumber}`;
        }
    } else {
        const isScheduledEnabled = !(storeConfig && storeConfig.allowScheduledPickup === false);
        const timeLabel = isScheduledEnabled ? '取餐時間' : '訂餐時間';
        msg += `\n\n🕒 ${timeLabel}：${dateInput} ${timeInput}`;
    }
    if (mainNote) msg += `\n📝 總備註：${mainNote}`;
    msg += `\n💰 總金額：$${currentTotal}`;

    return msg;
}

// 8.2 Định dạng danh sách món cho luồng Gọi thêm (không kèm tiền tổng hoặc mã đơn ảo)
function formatAppendItemsOnlyText() {
    const lines = [];
    for (let key in cart) {
        if (cart[key] > 0) {
            const { catSlug, origName } = parseCartKey(key);
            lines.push(`${cart[key]}份 x ${origName}`);

            if (catSlug === 'combo') {
                let drinks = comboDrinkData[origName] || [];
                let drinkCounts = {};
                drinks.slice(0, cart[key]).forEach(d => { drinkCounts[d] = (drinkCounts[d] || 0) + 1; });
                let drinkStr = Object.entries(drinkCounts).map(([n, c]) => `${n} x${c}`).join('、');
                if (drinkStr) lines.push(`   ↳ 飲料：${drinkStr}`);
            }

            if (customizeData[key]) {
                customizeData[key].slice(0, cart[key]).forEach((c, i) => {
                    const parts = [];
                    if (c.single) {
                        for (let s in c.single) {
                            if (c.single[s] && c.single[s] !== '不辣' && c.single[s] !== '不需要') {
                                parts.push(c.single[s]);
                            }
                        }
                    }
                    if (c.multiple) {
                        for (let t in c.multiple) {
                            if (c.multiple[t]) {
                                const addP = (typeof modPriceMap !== 'undefined' && modPriceMap[t]) ? modPriceMap[t] : 0;
                                if (addP > 0) {
                                    parts.push(`${t} (+$${addP})`);
                                } else {
                                    parts.push(t);
                                }
                            }
                        }
                    }
                    if (c.topping && c.topping !== '') parts.push(c.topping);
                    if (c.spicy && c.spicy !== '不辣') parts.push(c.spicy);
                    if (c.customText && c.customText.trim() !== '') parts.push(c.customText.trim());

                    if (parts.length > 0) {
                        const prefixLabel = cart[key] > 1 ? `第${i + 1}份` : '';
                        lines.push(`   ↳ ${prefixLabel}${parts.join('、')}`);
                    }
                });
            }
        }
    }
    return lines.join('\n');
}

// 8.3 Xây dựng mảng items có cấu trúc để phục vụ lưu trữ CSDL & Báo cáo
function buildStructuredCartItems() {
    const items = [];
    for (let key in cart) {
        if (cart[key] > 0) {
            const { catSlug, origName } = parseCartKey(key);
            const qty = cart[key];
            
            let basePrice = 0;
            let categoryName = catSlug || "Món";
            if (typeof bootstrapData !== 'undefined' && bootstrapData && bootstrapData.catalog) {
                for (const cat of bootstrapData.catalog) {
                    if (cat.items) {
                        for (const itm of cat.items) {
                            if (itm.name === origName || itm.id === key) {
                                basePrice = Number(itm.price) || 0;
                                categoryName = cat.name || catSlug;
                                break;
                            }
                        }
                    }
                }
            }

            const options = [];
            const cust = customizeData[key];
            if (cust && Array.isArray(cust)) {
                cust.slice(0, qty).forEach((c, idx) => {
                    if (!c) return;
                    if (c.single) {
                        for (let s in c.single) {
                            if (c.single[s] && c.single[s] !== '不辣' && c.single[s] !== '不需要') {
                                options.push({ group: s, choice: c.single[s], price: 0 });
                            }
                        }
                    }
                    if (c.multiple) {
                        for (let t in c.multiple) {
                            if (c.multiple[t]) {
                                const addP = (typeof modPriceMap !== 'undefined' && modPriceMap[t]) ? modPriceMap[t] : 0;
                                options.push({ group: '客製化', choice: t, price: addP });
                            }
                        }
                    }
                    if (c.topping && c.topping !== '') {
                        options.push({ group: '客製化', choice: c.topping, price: 0 });
                    }
                    if (c.spicy && c.spicy !== '不辣') {
                        options.push({ group: '辣度', choice: c.spicy, price: 0 });
                    }
                    if (c.customText && c.customText.trim() !== '') {
                        options.push({ group: '備註', choice: c.customText.trim(), price: 0 });
                    }
                });
            }

            if (catSlug === 'combo' && comboDrinkData[origName]) {
                const drinks = comboDrinkData[origName].slice(0, qty);
                drinks.forEach(d => {
                    options.push({ group: '飲料', choice: d, price: 0 });
                });
            }

            items.push({
                itemId: key,
                name: origName,
                category: categoryName,
                quantity: qty,
                price: basePrice,
                subtotal: basePrice * qty,
                options: options
            });
        }
    }
    return items;
}

function isPickupTimeValid(dateTime) {
    if (typeof isStoreOpen === 'function') {
        return isStoreOpen(dateTime);
    }
    return true;
}

// 9. Thực thi gửi đơn hàng với Timeout 8s & Bảo vệ nút bấm
async function submitOrder() {
    if (isSubmitting) return;

    if (storeConfig && storeConfig.storeStatus === 'paused') {
        return customAlert('店家目前暫停接單中，暫時無法下單，敬請見諒！');
    }

    const hasItem = Object.values(cart || {}).some(q => q > 0);
    if (!hasItem) return customAlert('請先選擇餐點品項加入購物車');

    const twNow = getTaiwanDate();
    const isDineIn = (window.currentDiningOption === 'dine_in');
    const isScheduledEnabled = !(storeConfig && storeConfig.allowScheduledPickup === false);
    let dateInput = "";
    let timeInput = "";

    if (isDineIn) {
        if (!window.isAppendMode) {
            const tableInput = document.getElementById('dinein-table-number');
            const tableNumber = tableInput ? tableInput.value.trim() : '';
            if (!tableNumber) {
                if (tableInput) {
                    tableInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    tableInput.focus();
                    tableInput.classList.add('attention-pulse');
                    setTimeout(() => tableInput.classList.remove('attention-pulse'), 1500);
                }
                return customAlert('請填寫您的用餐桌號，方便門市人員為您送餐！');
            }
        }

        const { dateStr, timeStr } = formatTaiwanDateTime(twNow);
        dateInput = dateStr;
        timeInput = timeStr;

        if (!isStoreOpen(twNow)) {
            const nextInfo = getNextOpeningInfo(twNow);
            customConfirm(
                `<div style="font-size: 16px; font-weight: 900; margin-bottom: 8px;">🌙 店家目前休息中</div>` +
                `<div style="font-size: 14px; color: #4b5563; line-height: 1.5;">` +
                `店家預計於 <b>${nextInfo.dayText} ${nextInfo.timeStr}</b> 開始接單製作。<br>` +
                `您確定要現在預先送出內用訂單嗎？` +
                `</div>`,
                () => { doSubmitOrderExecution(dateInput, timeInput); }
            );
            return;
        }
    } else if (!isScheduledEnabled) {
        const { dateStr, timeStr } = formatTaiwanDateTime(twNow);
        dateInput = dateStr;
        timeInput = timeStr;

        if (!isStoreOpen(twNow)) {
            const nextInfo = getNextOpeningInfo(twNow);
            customConfirm(
                `<div style="font-size: 16px; font-weight: 900; margin-bottom: 8px;">🌙 店家目前休息中</div>` +
                `<div style="font-size: 14px; color: #4b5563; line-height: 1.5;">` +
                `店家預計於 <b>${nextInfo.dayText} ${nextInfo.timeStr}</b> 開始接單製作。<br>` +
                `您確定要現在預先送出訂單嗎？` +
                `</div>`,
                () => { doSubmitOrderExecution(dateInput, timeInput); }
            );
            return;
        }
    } else {
        dateInput = document.getElementById('pickup-date') ? document.getElementById('pickup-date').value : '';
        timeInput = document.getElementById('pickup-time') ? document.getElementById('pickup-time').value : '';

        if (!dateInput || !timeInput) {
            highlightMissingPickupTime();
            return;
        }

        const [pYear, pMonth, pDay] = dateInput.split('-').map(Number);
        const [pHour, pMin] = timeInput.split(':').map(Number);
        const selectedDateTime = new Date(pYear, pMonth - 1, pDay, pHour, pMin, 0);

        const diffMinutes = (selectedDateTime.getTime() - twNow.getTime()) / (1000 * 60);

        if (diffMinutes < -5) {
            return customAlert('取餐時間不能早於當前時間');
        }

        if (!isPickupTimeValid(selectedDateTime)) {
            return customAlert('所選的取餐時間非營業時間，請重新選擇！');
        }

        if (storeConfig && storeConfig.storeStatus === 'busy') {
            const { dateStr: todayStr } = formatTaiwanDateTime(twNow);
            if (dateInput === todayStr) {
                const minAllowedTime = new Date(twNow.getTime() + 60 * 60000);
                if (selectedDateTime < minAllowedTime) {
                    const { timeStr: minTimeStr } = formatTaiwanDateTime(minAllowedTime);
                    return customAlert(`目前門市繁忙，最快可取餐時間為 ${minTimeStr}（需至少 1 小時後）`);
                }
            }
        }
    }

    doSubmitOrderExecution(dateInput, timeInput);
}

// 10. Hàm nội bộ thực thi POST dữ liệu
async function doSubmitOrderExecution(dateInput, timeInput) {
    isSubmitting = true;
    const submitBtn = document.getElementById('btn-submit') || document.getElementById('submit-btn');
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerText = '處理中...';
        submitBtn.style.cursor = 'not-allowed';
        submitBtn.style.opacity = '0.7';
    }

    const abortController = new AbortController();
    const timeoutId = setTimeout(() => abortController.abort(), 8000);

    try {
        const tenantId = getTenantIdFromUrl();

        if (typeof liff !== 'undefined') {
            try {
                if (liff.isLoggedIn && !liff.isLoggedIn()) {
                    if (storeConfig && Array.isArray(storeConfig.features) && storeConfig.features.includes('mobile_only') && liff.isInClient && !liff.isInClient()) {
                        if (typeof openDesktopQrModal === 'function') {
                            openDesktopQrModal();
                        } else {
                            customAlert('請使用手機 LINE 掃碼點餐');
                        }
                        isSubmitting = false;
                        if (submitBtn) {
                            submitBtn.disabled = false;
                            submitBtn.innerText = '確認下單';
                            submitBtn.style.cursor = 'pointer';
                            submitBtn.style.opacity = '1';
                        }
                        return;
                    }

                    const storageKey = `cart_save_${tenantId}`;
                    localStorage.setItem(storageKey, JSON.stringify({ cart, customizeData, comboDrinkData }));
                    liff.login({ redirectUri: window.location.href });
                    return;
                }
            } catch (liffAuthErr) {
                console.warn("LIFF Auth check ignored:", liffAuthErr);
            }
        }

        let customerName = "顧客";
        let userId = "guest_" + Date.now();

        if (typeof liff !== 'undefined' && liff.getProfile) {
            try {
                const profile = await liff.getProfile();
                if (profile) {
                    customerName = profile.displayName || customerName;
                    userId = profile.userId || userId;
                }
            } catch (e) { }
        }

        const currentTotal = typeof updateTotal === 'function' ? updateTotal() : 0;
        const orderNum = generateOrderNumber();
        const mainNote = document.getElementById('note') ? document.getElementById('note').value : '';
        const msg = formatOrderTextMessage(orderNum, dateInput, timeInput, currentTotal, mainNote);
        const isDineIn = (window.currentDiningOption === 'dine_in');
        const tableInput = document.getElementById('dinein-table-number');
        const tableNumber = (isDineIn && tableInput) ? tableInput.value.trim() : '';
        const structuredItems = buildStructuredCartItems();

        // 10.1 Xử lý riêng cho luồng 加點餐點 (Append Mode)
        if (window.isAppendMode && window.parentOrderKey) {
            const rawItemsText = formatAppendItemsOnlyText();
            const tableInput = document.getElementById('dinein-table-number');
            const currentTable = (tableInput && tableInput.value.trim()) || window.appendTableNumber || window.currentTableNumber || '';
            const appendPayload = {
                parent_order_key: window.parentOrderKey,
                user_id: userId,
                customer_name: customerName,
                appended_content: rawItemsText,
                appended_total: currentTotal,
                table_number: currentTable || undefined,
                note: mainNote,
                tenant_id: tenantId,
                items: structuredItems
            };

            const res = await fetch(`${WORKER_BASE}/api/orders/append?tenant_id=${tenantId}`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-Tenant-ID": tenantId
                },
                body: JSON.stringify(appendPayload),
                signal: abortController.signal
            });

            clearTimeout(timeoutId);

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.error || `API returned status ${res.status}`);
            }

            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.innerText = '加點已送出';
                submitBtn.style.cursor = 'not-allowed';
                submitBtn.style.opacity = '0.6';
            }

            if (typeof liff !== 'undefined' && liff.isInClient) {
                try {
                    if (liff.isInClient() && typeof liff.sendMessages === 'function') {
                        const tablePart = currentTable ? `\n桌號：${currentTable}` : '';
                        const notePart = mainNote ? `\n📝 備註：${mainNote}` : '';
                        const appendChatMsg = `[加點 #${window.parentOrderKey}]${tablePart}\n現場加點品項：\n${rawItemsText}${notePart}\n\n💰 加點金額：+$${currentTotal}`;
                        await liff.sendMessages([{ type: 'text', text: appendChatMsg }]);
                    }
                } catch (liffMsgErr) {
                    console.warn("liff.sendMessages notice:", liffMsgErr);
                }
            }

            cart = {};
            customizeData = {};
            comboDrinkData = {};
            try {
                sessionStorage.removeItem('benmi_append_parent');
                sessionStorage.removeItem('benmi_append_table');
            } catch(e) {}
            if (typeof updateTotal === 'function') updateTotal();

            customAlert(`
                <div style="margin-bottom: 16px;">
                    <div style="width: 60px; height: 60px; margin: 0 auto; background: #faf5ff; border: 2px solid #c084fc; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 28px;">
                        🍽️
                    </div>
                </div>
                <div style="font-size: 19px; font-weight: 900; color: #111827; margin-bottom: 6px;">加點送出成功！</div>
                <div style="font-size: 14.5px; line-height: 1.5; color: #4b5563;">店家已收到您的加點品項，將立即為您製作 🙏</div>
            `, () => {
                if (typeof closeAndExitLiff === 'function') closeAndExitLiff();
            });

            return;
        }

        const orderPayload = {
            key: orderNum,
            userId: userId,
            customer: customerName,
            time: `${dateInput} ${timeInput}`,
            dining_option: isDineIn ? 'dine_in' : 'takeaway',
            table_number: tableNumber || undefined,
            content: msg.split('\n\n🕒')[0].replace(/\[.*?點餐\]\n/g, '').replace('[Benmi 點餐]\n', ''),
            total: currentTotal,
            note: mainNote,
            tenant_id: tenantId,
            items: structuredItems,
            liffFallback: false
        };

        const res = await fetch(`${WORKER_BASE}/api/create?tenant_id=${tenantId}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-Tenant-ID": tenantId
            },
            body: JSON.stringify(orderPayload),
            signal: abortController.signal
        });

        clearTimeout(timeoutId);

        if (!res.ok) throw new Error(`API returned status ${res.status}`);

        orderSubmittedSuccessfully = true;

        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerText = '訂單已送出';
            submitBtn.style.cursor = 'not-allowed';
            submitBtn.style.opacity = '0.6';
        }

        // Tùy chọn: Gửi tin nhắn vào chat LINE nếu đang mở trong LINE App
        if (typeof liff !== 'undefined' && liff.isInClient) {
            try {
                if (liff.isInClient() && typeof liff.sendMessages === 'function') {
                    await liff.sendMessages([{ type: 'text', text: msg }]);
                }
            } catch (liffMsgErr) {
                console.warn("liff.sendMessages notice:", liffMsgErr);
            }
        }

        // Xóa sạch giỏ hàng khi thành công
        cart = {};
        customizeData = {};
        comboDrinkData = {};
        if (typeof updateTotal === 'function') updateTotal();

        customAlert(`
            <div style="margin-bottom: 16px;">
                <div style="width: 60px; height: 60px; margin: 0 auto; background: #ecfdf5; border: 2px solid #a7f3d0; border-radius: 50%; display: flex; align-items: center; justify-content: center;">
                    <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                </div>
            </div>
            <div style="font-size: 19px; font-weight: 900; color: #111827; margin-bottom: 6px;">訂單已送出成功！</div>
            <div style="font-size: 14.5px; line-height: 1.5; color: #4b5563;">店家已收到您的訂單，您可以直接在LINE查看訂單狀態 🙏</div>
        `, () => {
            if (typeof closeAndExitLiff === 'function') closeAndExitLiff();
        });

    } catch (err) {
        clearTimeout(timeoutId);
        console.warn("Primary API flow failed, falling back to LINE message flow:", err);

        try {
            const currentTotal = typeof updateTotal === 'function' ? updateTotal() : 0;
            const mainNote = document.getElementById('note') ? document.getElementById('note').value : '';

            if (typeof liff !== 'undefined' && liff.isInClient && liff.isInClient() && typeof liff.sendMessages === 'function') {
                if (window.isAppendMode && window.parentOrderKey) {
                    const rawItemsText = formatAppendItemsOnlyText();
                    const tableInput = document.getElementById('dinein-table-number');
                    const currentTable = (tableInput && tableInput.value.trim()) || window.appendTableNumber || window.currentTableNumber || '';
                    const tablePart = currentTable ? `\n桌號：${currentTable}` : '';
                    const notePart = mainNote ? `\n📝 備註：${mainNote}` : '';
                    const appendChatMsg = `[加點 #${window.parentOrderKey}]${tablePart}\n現場加點品項：\n${rawItemsText}${notePart}\n\n💰 加點金額：+$${currentTotal}`;
                    await liff.sendMessages([{ type: 'text', text: appendChatMsg }]);
                } else {
                    const orderNum = generateOrderNumber();
                    const msg = formatOrderTextMessage(orderNum, dateInput, timeInput, currentTotal, mainNote);
                    await liff.sendMessages([{ type: 'text', text: msg }]);
                }
                orderSubmittedSuccessfully = true;

                if (submitBtn) {
                    submitBtn.disabled = true;
                    submitBtn.innerText = window.isAppendMode ? '加點已送出' : '訂單已送出';
                    submitBtn.style.cursor = 'not-allowed';
                    submitBtn.style.opacity = '0.6';
                }

                cart = {};
                customizeData = {};
                comboDrinkData = {};
                try {
                    sessionStorage.removeItem('benmi_append_parent');
                    sessionStorage.removeItem('benmi_append_table');
                } catch(e) {}
                if (typeof updateTotal === 'function') updateTotal();

                customAlert(`
                    <div style="margin-bottom: 16px;">
                        <div style="width: 60px; height: 60px; margin: 0 auto; background: #ecfdf5; border: 2px solid #a7f3d0; border-radius: 50%; display: flex; align-items: center; justify-content: center;">
                            <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                                <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>
                        </div>
                    </div>
                    <div style="font-size: 19px; font-weight: 900; color: #111827; margin-bottom: 6px;">訂單已送出成功！</div>
                    <div style="font-size: 14.5px; line-height: 1.5; color: #4b5563;">店家已收到您的訂單，您可以直接在LINE查看訂單狀態 🙏</div>
                `, () => {
                    if (typeof closeAndExitLiff === 'function') closeAndExitLiff();
                });
            } else {
                throw err;
            }
        } catch (liffErr) {
            const errorMsg = (err.name === 'AbortError') ? '連線逾時（網路較慢），請重新點擊送出' : (err.message || '連線逾時');
            customAlert(`⚠️ 訂單送出失敗：<br><br><span style="color:#ef4444; font-weight:700;">${errorMsg}</span><br><br>請檢查網路後再次點擊確認下單。`);
        }
    } finally {
        clearTimeout(timeoutId);
        // Luôn giải phóng khóa nút bấm nếu đơn hàng chưa hoàn tất
        if (!orderSubmittedSuccessfully) {
            isSubmitting = false;
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerText = '確認下單';
                submitBtn.style.cursor = 'pointer';
                submitBtn.style.opacity = '1';
            }
        }
    }
}
