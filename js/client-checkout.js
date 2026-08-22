/**
 * client-checkout.js
 * Quản lý quy trình đặt hàng, kiểm tra hợp lệ, hẹn giờ lấy món và gửi đơn hàng.
 */

// Append Mode Global State
window.isAppendMode = false;
window.parentOrderKey = null;
window.appendTableNumber = null;

function getUrlParamsWithLiffState() {
    const rawSearch = window.location.search;
    const directParams = new URLSearchParams(rawSearch);
    
    // 1. Kiểm tra liff.state nếu LINE mã hóa tham số vào liff.state
    const liffState = directParams.get('liff.state');
    if (liffState) {
        try {
            const decoded = decodeURIComponent(liffState);
            const queryPart = decoded.includes('?') ? decoded.split('?')[1] : decoded;
            const stateParams = new URLSearchParams(queryPart);
            if (stateParams.has('parent_order_key') || stateParams.has('mode') || stateParams.has('table_number')) {
                return stateParams;
            }
        } catch (e) {
            console.warn("Failed to parse liff.state:", e);
        }
    }

    // 2. Kiểm tra hash nếu tham số được truyền sau dấu #
    if (window.location.hash) {
        try {
            const hashPart = window.location.hash.substring(1);
            const hashParams = new URLSearchParams(hashPart);
            if (hashParams.has('parent_order_key') || hashParams.has('mode') || hashParams.has('table_number')) {
                return hashParams;
            }
        } catch (e) {}
    }

    return directParams;
}

function initAppendModeIfPresent() {
    const urlParams = getUrlParamsWithLiffState();
    const parentOrderKey = urlParams.get('parent_order_key');
    const paramTableNumber = urlParams.get('table_number');
    const mode = urlParams.get('mode');

    if (parentOrderKey && (mode === 'append' || mode === 'add')) {
        window.isAppendMode = true;
        window.parentOrderKey = parentOrderKey;
        window.appendTableNumber = paramTableNumber || '';

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

        // Lock table number input
        const tableInput = document.getElementById('dinein-table-number');
        if (tableInput && paramTableNumber) {
            tableInput.value = paramTableNumber;
            tableInput.readOnly = true;
            tableInput.style.backgroundColor = '#f3f4f6';
            tableInput.style.color = '#5b21b6';
            tableInput.style.cursor = 'not-allowed';
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

    const bannerEl = document.getElementById('append-mode-banner');
    if (bannerEl) bannerEl.style.display = 'none';

    // Khôi phục ô nhập số bàn
    const tableInput = document.getElementById('dinein-table-number');
    if (tableInput) {
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

// 8. Định dạng nội dung tin nhắn đơn hàng
function formatOrderTextMessage(orderNum, dateInput, timeInput, currentTotal, mainNote) {
    const zhNumbers = ['第一份', '第二份', '第三份', '第四份', '第五份', '第六份', '第七份', '第八份', '第九份', '第十份'];
    let msg = `[${document.getElementById('store-name')?.innerText || '線上'} 點餐]\n訂單編號：${orderNum}\n📦 訂單內容：\n`;

    for (let key in cart) {
        if (cart[key] > 0) {
            let [catSlug, origName] = key.split('_');
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
                            if (c.multiple[t]) parts.push(`加${t}`);
                        }
                    }
                    if (c.topping && c.topping !== '') parts.push('加' + c.topping);
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

// 8.1 Định dạng danh sách món cho luồng Gọi thêm (không kèm tiền tổng hoặc mã đơn ảo)
function formatAppendItemsOnlyText() {
    const lines = [];
    for (let key in cart) {
        if (cart[key] > 0) {
            let [catSlug, origName] = key.split('_');
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
                            if (c.multiple[t]) parts.push(`加${t}`);
                        }
                    }
                    if (c.topping && c.topping !== '') parts.push('加' + c.topping);
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
        // Kiểm tra bắt buộc nhập số bàn khi ăn tại quán
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
        // Tắt hẹn giờ cho 外帶 -> Lấy ngày giờ thực tế
        const { dateStr, timeStr } = formatTaiwanDateTime(twNow);
        dateInput = dateStr;
        timeInput = timeStr;

        // Nếu quán đang đóng cửa -> Hỏi xác nhận đặt trước
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
        // Bật hẹn giờ cho 外帶 -> Yêu cầu chọn ngày & giờ
        dateInput = document.getElementById('pickup-date') ? document.getElementById('pickup-date').value : '';
        timeInput = document.getElementById('pickup-time') ? document.getElementById('pickup-time').value : '';

        if (!dateInput || !timeInput) {
            highlightMissingPickupTime();
            return;
        }

        const [pYear, pMonth, pDay] = dateInput.split('-').map(Number);
        const [pHour, pMin] = timeInput.split(':').map(Number);
        const selectedDateTime = new Date(pYear, pMonth - 1, pDay, pHour, pMin, 0);

        if (selectedDateTime < twNow) {
            return customAlert('不能選擇過去的時間，請重新選擇取餐時間');
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

// 10. Thực thi API Create Order
async function doSubmitOrderExecution(dateInput, timeInput) {
    if (isSubmitting) return;

    const submitBtn = document.getElementById('btn-submit');
    isSubmitting = true;
    let orderSubmittedSuccessfully = false;

    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerText = '處理中...';
        submitBtn.style.cursor = 'not-allowed';
        submitBtn.style.opacity = '0.7';
    }

    // Thiết lập Timeout 8s tự động hủy request nếu mạng đơ
    const abortController = new AbortController();
    const timeoutId = setTimeout(() => abortController.abort(), 8000);

    try {
        const tenantId = getTenantIdFromUrl();

        // Kiểm tra đăng nhập LIFF nếu trong môi trường LINE
        if (typeof liff !== 'undefined') {
            try {
                if (liff.isInClient() && liff.isLoggedIn && !liff.isLoggedIn()) {
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

        // 10.1 Xử lý riêng cho luồng 加點餐點 (Append Mode)
        if (window.isAppendMode && window.parentOrderKey) {
            const rawItemsText = formatAppendItemsOnlyText();
            const appendPayload = {
                parent_order_key: window.parentOrderKey,
                user_id: userId,
                customer_name: customerName,
                appended_content: rawItemsText,
                appended_total: currentTotal,
                note: mainNote,
                tenant_id: tenantId
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

            orderSubmittedSuccessfully = true;

            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.innerText = '加點已送出';
                submitBtn.style.cursor = 'not-allowed';
                submitBtn.style.opacity = '0.6';
            }

            // Gửi tin nhắn xác nhận vào chat LINE (Không chứa từ khóa tạo đơn mới để tránh webhook bắt nhầm)
            if (typeof liff !== 'undefined' && liff.isInClient) {
                try {
                    if (liff.isInClient() && typeof liff.sendMessages === 'function') {
                        const notePart = mainNote ? `\n📝 備註：${mainNote}` : '';
                        const appendChatMsg = `[加點成功 #${window.parentOrderKey}]\n🍽️ 現場加點品項：\n${rawItemsText}${notePart}\n\n💰 本次加點：+$${currentTotal}`;
                        await liff.sendMessages([{ type: 'text', text: appendChatMsg }]);
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
            const orderNum = generateOrderNumber();
            const mainNote = document.getElementById('note') ? document.getElementById('note').value : '';
            const msg = formatOrderTextMessage(orderNum, dateInput, timeInput, currentTotal, mainNote);

            if (typeof liff !== 'undefined' && liff.isInClient && liff.isInClient() && typeof liff.sendMessages === 'function') {
                await liff.sendMessages([{ type: 'text', text: msg }]);
                orderSubmittedSuccessfully = true;

                if (submitBtn) {
                    submitBtn.disabled = true;
                    submitBtn.innerText = '訂單已送出';
                    submitBtn.style.cursor = 'not-allowed';
                    submitBtn.style.opacity = '0.6';
                }

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
