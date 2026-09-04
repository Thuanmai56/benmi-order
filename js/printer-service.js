// ==========================================================
// Benmi POS - Thermal Printer Service & Native Bridge
// Supports: Auto-Print on New Orders + Manual On-Demand Print
// Target Hardware: ESC/POS LAN/Wi-Fi Printers on Port 9100
// ==========================================================

(function(window) {
  'use strict';

  const DEFAULT_SETTINGS = {
    autoPrintNewOrders: false,
    cashier: {
      enabled: true,
      interface_type: 'network', // 'network' | 'bluetooth'
      protocol: 'esc_pos',        // 'esc_pos' | 'tspl'
      tspl_label_size: '100x150', // '100x150' | '76x130' | '50x30' | 'custom'
      tspl_custom_width_mm: 100,
      tspl_custom_height_mm: 150,
      tspl_mode: 'summary',       // 'summary' | 'item_stickers'
      tspl_dpi: 203,              // 203 | 300
      tspl_x_offset_mm: 0,        // Horizontal offset mm
      tspl_y_offset_mm: 0,        // Vertical offset mm
      ip: '192.168.1.100',
      port: 9100,
      mac_address: '',
      device_name: '',
      paperWidth: 80,
      autoCut: true
    },
    kitchen: {
      enabled: true,
      interface_type: 'network', // 'network' | 'bluetooth'
      protocol: 'esc_pos',        // 'esc_pos' | 'tspl'
      tspl_label_size: '40x30',   // '100x150' | '76x130' | '50x30' | '40x30' | 'custom'
      tspl_custom_width_mm: 40,
      tspl_custom_height_mm: 30,
      tspl_mode: 'item_stickers', // 'summary' | 'item_stickers'
      tspl_dpi: 203,              // 203 | 300
      tspl_x_offset_mm: 0,        // Horizontal offset mm
      tspl_y_offset_mm: 0,        // Vertical offset mm
      ip: '192.168.1.101',
      port: 9100,
      mac_address: '',
      device_name: '',
      paperWidth: 80,
      autoCut: true
    }
  };

  class PrinterService {
    constructor() {
      this.isNative = this.checkIsNative();
      console.log(`[PrinterService] Initialized. Native Bridge: ${this.isNative ? 'ACTIVE ✅' : 'BROWSER FALLBACK 🌐'}`);
    }

    checkIsNative() {
      return !!(
        window.Capacitor &&
        window.Capacitor.isPluginAvailable &&
        window.Capacitor.isPluginAvailable('ThermalPrinter')
      );
    }

    getPlugin() {
      if (window.Capacitor && window.Capacitor.Plugins) {
        return window.Capacitor.Plugins.ThermalPrinter;
      }
      return null;
    }

    // --- 1. SETTINGS & STORAGE (Multi-Tenant isolated) ---
    getTenantId() {
      if (typeof getTenantIdFromUrl === 'function') {
        const tid = getTenantIdFromUrl();
        if (tid) return tid;
      }
      if (typeof window !== 'undefined' && window.__INITIAL_TENANT_ID) {
        return window.__INITIAL_TENANT_ID;
      }
      if (typeof localStorage !== 'undefined') {
        const saved = localStorage.getItem('pos_device_tenant_id');
        if (saved && saved.trim()) return saved.trim();
      }
      const params = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
      return params.get('tenant') || params.get('tenant_id') || 'benmi';
    }

    getSettings() {
      const tenantId = this.getTenantId();
      const storageKey = `pos_printer_settings_${tenantId}`;
      try {
        const raw = localStorage.getItem(storageKey);
        if (raw) {
          const parsed = JSON.parse(raw);
          return {
            autoPrintNewOrders: parsed.autoPrintNewOrders ?? DEFAULT_SETTINGS.autoPrintNewOrders,
            cashier: { ...DEFAULT_SETTINGS.cashier, ...(parsed.cashier || {}) },
            kitchen: { ...DEFAULT_SETTINGS.kitchen, ...(parsed.kitchen || {}) }
          };
        }
      } catch (e) {
        console.warn('[PrinterService] Failed to load settings:', e);
      }
      return JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
    }

    async getPairedBluetoothDevices() {
      const plugin = this.getPlugin();
      if (this.isNative && plugin && typeof plugin.getPairedBluetoothDevices === 'function') {
        try {
          const res = await plugin.getPairedBluetoothDevices();
          return res;
        } catch (e) {
          console.error('[PrinterService] Failed to get paired Bluetooth devices:', e);
          throw e;
        }
      }
      // Browser fallback simulated devices
      return {
        supported: false,
        enabled: false,
        devices: [
          { name: 'Xprinter XP-58IIH (Simulated)', address: '00:11:22:33:44:55', type: 1 },
          { name: 'Epson TM-T88VI-BT (Simulated)', address: 'AA:BB:CC:DD:EE:FF', type: 1 }
        ]
      };
    }

    saveSettings(newSettings) {
      const tenantId = this.getTenantId();
      const storageKey = `pos_printer_settings_${tenantId}`;
      try {
        localStorage.setItem(storageKey, JSON.stringify(newSettings));
        return true;
      } catch (e) {
        console.error('[PrinterService] Failed to save settings:', e);
        return false;
      }
    }

    // --- 2. DEDUPLICATION SET (Prevent duplicate auto-printing) ---
    getPrintedOrders() {
      const tenantId = this.getTenantId();
      const storageKey = `pos_printed_orders_${tenantId}`;
      try {
        const raw = localStorage.getItem(storageKey);
        return raw ? JSON.parse(raw) : [];
      } catch (e) {
        return [];
      }
    }

    isOrderAlreadyPrinted(orderKey) {
      if (!orderKey) return false;
      const printedList = this.getPrintedOrders();
      return printedList.includes(orderKey);
    }

    markOrderAsPrinted(orderKey) {
      if (!orderKey) return;
      const tenantId = this.getTenantId();
      const storageKey = `pos_printed_orders_${tenantId}`;
      try {
        let list = this.getPrintedOrders();
        if (!list.includes(orderKey)) {
          list.push(orderKey);
          if (list.length > 500) {
            list = list.slice(list.length - 500);
          }
          localStorage.setItem(storageKey, JSON.stringify(list));
        }
      } catch (e) {
        console.warn('[PrinterService] Failed to mark order printed:', e);
      }
    }

    // --- 3. AUTO-PRINT TRIGGER ---
    async handleIncomingOrders(ordersList) {
      const settings = this.getSettings();
      if (!settings.autoPrintNewOrders) return;
      if (!Array.isArray(ordersList) || ordersList.length === 0) return;

      for (const order of ordersList) {
        const status = (order.status || '').toUpperCase();
        if (status === 'NEW' && !this.isOrderAlreadyPrinted(order.key)) {
          console.log(`[PrinterService] 🖨️ Auto-printing new incoming order #${order.key}...`);
          try {
            await this.printDualStation(order);
            this.markOrderAsPrinted(order.key);
          } catch (err) {
            console.error(`[PrinterService] Auto-print failed for #${order.key}:`, err);
          }
        }
      }
    }

    // --- 4. PRINT DISPATCHERS ---
    async printDualStation(order) {
      const settings = this.getSettings();
      const tasks = [];

      const isCashierConfigured = settings.cashier.enabled && (
        settings.cashier.interface_type === 'bluetooth' ? !!settings.cashier.mac_address : !!settings.cashier.ip
      );
      const isKitchenConfigured = settings.kitchen.enabled && (
        settings.kitchen.interface_type === 'bluetooth' ? !!settings.kitchen.mac_address : !!settings.kitchen.ip
      );

      if (isCashierConfigured) {
        tasks.push(this.printCashierReceipt(order, settings.cashier));
      }
      if (isKitchenConfigured) {
        tasks.push(this.printKitchenTicket(order, settings.kitchen));
      }

      if (tasks.length === 0) {
        console.warn('[PrinterService] No printer stations are enabled in settings.');
        return { success: false, reason: 'NO_PRINTERS_ENABLED' };
      }

      const results = await Promise.allSettled(tasks);
      return results;
    }

    async printManual(orderKey, stationTarget = 'all') {
      const order = this.resolveOrder(orderKey);
      if (!order) {
        if (typeof showToast === 'function') showToast(`❌ 找不到訂單 #${orderKey}`);
        return;
      }

      const settings = this.getSettings();
      const tasks = [];

      if ((stationTarget === 'all' || stationTarget === 'cashier') && settings.cashier.enabled) {
        tasks.push(this.printCashierReceipt(order, settings.cashier));
      }
      if ((stationTarget === 'all' || stationTarget === 'kitchen') && settings.kitchen.enabled) {
        tasks.push(this.printKitchenTicket(order, settings.kitchen));
      }

      if (tasks.length === 0) {
        if (typeof showToast === 'function') showToast('⚠️ 請先在設定中啟用印表機');
        return;
      }

      try {
        if (typeof showToast === 'function') showToast(`🖨️ 正在列印訂單 #${orderKey}...`);
        await Promise.all(tasks);
        this.markOrderAsPrinted(orderKey);
        if (typeof showToast === 'function') showToast(`✅ 訂單 #${orderKey} 列印完成！`);
      } catch (err) {
        console.error('[PrinterService] Manual print failed:', err);
        if (typeof showToast === 'function') showToast(`❌ 列印失敗: ${err.message || err}`);
      }
    }

    async printFullOrder(orderKey) {
      return this.printManual(orderKey, 'all');
    }

    async printCashierOnly(orderKey) {
      return this.printManual(orderKey, 'cashier');
    }

    async printSingleItemSticker(orderKey, itemIndex) {
      const order = this.resolveOrder(orderKey);
      if (!order) {
        if (typeof showToast === 'function') showToast(`❌ 找不到訂單 #${orderKey}`);
        return;
      }
      const items = this.parseOrderItems(order);
      const idx = parseInt(itemIndex, 10);
      if (isNaN(idx) || idx < 0 || idx >= items.length) {
        if (typeof showToast === 'function') showToast('❌ 找不到該項餐點');
        return;
      }
      const targetItem = items[idx];
      const settings = this.getSettings();
      const config = (settings.kitchen && settings.kitchen.enabled) ? settings.kitchen : settings.cashier;
      if (!config || !config.enabled) {
        if (typeof showToast === 'function') showToast('⚠️ 請先在設定中啟用印表機');
        return;
      }

      const dim = this.resolveLabelDimensions(config);
      try {
        if (typeof showToast === 'function') showToast(`🏷️ 正在列印「${targetItem.name}」貼紙...`);
        const png = this.drawItemStickerToCanvas(targetItem, order, idx + 1, items.length, dim.widthMm, dim.heightMm, dim.dpi);
        await this.transmitReceiptBitmap(png, config, `Single Sticker #${order.key} (${idx + 1}/${items.length})`);
        if (typeof showToast === 'function') {
          const successMsg = (typeof t === 'function' && t('printSingleItemSuccess', { name: targetItem.name })) || `✅ 已列印「${targetItem.name}」貼紙！`;
          showToast(successMsg);
        }
      } catch (err) {
        console.error('[PrinterService] Single item print failed:', err);
        if (typeof showToast === 'function') showToast(`❌ 列印失敗: ${err.message || err}`);
      }
    }

    async printQuickModifierSticker(text, orderContext = null) {
      const cleanText = String(text || '').trim();
      if (!cleanText) return;

      const settings = this.getSettings();
      const config = (settings.kitchen && settings.kitchen.enabled) ? settings.kitchen : settings.cashier;
      if (!config || !config.enabled) {
        if (typeof showToast === 'function') showToast('⚠️ 請先在設定中啟用印表機');
        return;
      }

      const dim = this.resolveLabelDimensions(config);
      try {
        if (typeof showToast === 'function') {
          const printingMsg = (typeof t === 'function' && t('quickStickerPrinting')) || `🏷️ 正在列印備註貼紙: 「${cleanText}」...`;
          showToast(printingMsg);
        }
        const png = this.drawQuickNoteStickerToCanvas(cleanText, orderContext, dim.widthMm, dim.heightMm, dim.dpi);
        await this.transmitReceiptBitmap(png, config, `Quick Note Sticker: ${cleanText}`);
        if (typeof showToast === 'function') {
          const successMsg = (typeof t === 'function' && t('quickStickerSuccess', { text: cleanText })) || `✅ 已出標籤: 「${cleanText}」！`;
          showToast(successMsg);
        }
      } catch (err) {
        console.error('[PrinterService] Quick note print failed:', err);
        if (typeof showToast === 'function') showToast(`❌ 列印失敗: ${err.message || err}`);
      }
    }

    resolveOrder(orderKey) {
      if (typeof latestOrders !== 'undefined' && Array.isArray(latestOrders)) {
        const found = latestOrders.find(o => String(o.key) === String(orderKey));
        if (found) return found;
      }
      if (typeof historyOrders !== 'undefined' && Array.isArray(historyOrders)) {
        const found = historyOrders.find(o => String(o.key) === String(orderKey));
        if (found) return found;
      }
      if (typeof reviewingOrder !== 'undefined' && reviewingOrder && String(reviewingOrder.key) === String(orderKey)) {
        return reviewingOrder;
      }
      return null;
    }

    resolveLabelDimensions(config) {
      const preset = config.tspl_label_size || '100x150';
      const dpi = parseInt(config.tspl_dpi, 10) === 300 ? 300 : 203;
      const xOffsetMm = Number(config.tspl_x_offset_mm) || 0;
      const yOffsetMm = Number(config.tspl_y_offset_mm) || 0;

      let widthMm = 100;
      let heightMm = 150;

      if (preset === '100x150') { widthMm = 100; heightMm = 150; }
      else if (preset === '76x130') { widthMm = 76; heightMm = 130; }
      else if (preset === '50x30') { widthMm = 50; heightMm = 30; }
      else if (preset === '40x30') { widthMm = 40; heightMm = 30; }
      else if (preset === 'custom') {
        widthMm = parseInt(config.tspl_custom_width_mm, 10) || 100;
        heightMm = parseInt(config.tspl_custom_height_mm, 10) || 150;
      }

      return { widthMm, heightMm, dpi, xOffsetMm, yOffsetMm };
    }

    parseOrderItems(order, expand = true) {
      const items = [];
      if (Array.isArray(order.items) && order.items.length > 0) {
        order.items.forEach(it => {
          items.push({
            name: it.name || it.item_name || '餐點',
            quantity: Number(it.quantity) || 1,
            options: Array.isArray(it.options) ? it.options.join('、') : (it.options || it.selected_options || ''),
            note: it.note || it.notes || '',
            round: it.round || ''
          });
        });
      } else {
        // Fallback: parse lines from content
        const lines = (order.content || '').split('\n').map(l => l.trim()).filter(l => l.length > 0);
        let currentItem = null;
        let currentRound = '';
        lines.forEach(line => {
          if ((line.startsWith('[第') || line.startsWith('[Đợt')) && line.endsWith(']')) {
            currentRound = line;
            return;
          }
          if (
            line.startsWith('----') || line.startsWith('====') || line.includes('【') ||
            line.includes('訂單') || line.includes('總金額') || line.includes('總計') ||
            line.includes('時間') || line.includes('用餐方式') || line.includes('桌號') ||
            line.includes('聯絡電話') || line.includes('備註') || line.includes('付款') ||
            line.includes('取餐') || line.startsWith('📍') || line.startsWith('📞') ||
            line.startsWith('👤') || line.startsWith('📝') || line.startsWith('💰') ||
            line.includes('Hình thức') || line.includes('Bàn số') || line.includes('Số bàn') ||
            line.includes('Ghi chú') || line.includes('Thanh toán') || line.includes('Tổng cộng')
          ) {
            return;
          }
          if (line.startsWith('↳') || line.startsWith('-') || line.startsWith('+') || line.startsWith('•') || line.startsWith('－')) {
            if (currentItem) {
              const opt = line.replace(/^[↳\-+•－]\s*/, '').trim();
              currentItem.options = currentItem.options ? `${currentItem.options}、${opt}` : opt;
            }
          } else {
            const match = line.match(/^(\d+)\s*(?:份|x|X)\s*(?:x\s*)?(.+)$/) || line.match(/^(.+?)\s*[xX*]\s*(\d+)$/);
            if (match) {
              const qty = Number(match[1]) || Number(match[2]) || 1;
              const name = (match[2] || match[1] || line).replace(/\$[\d,]+/g, '').trim();
              currentItem = { name, quantity: qty, options: '', note: '', round: currentRound };
              items.push(currentItem);
            } else {
              currentItem = { name: line.replace(/\$[\d,]+/g, '').trim(), quantity: 1, options: '', note: '', round: currentRound };
              items.push(currentItem);
            }
          }
        });
      }

      if (items.length === 0) {
        items.push({ name: '特餐餐點', quantity: 1, options: '', note: '', round: '' });
      }

      if (!expand) {
        return items;
      }

      // If expand is true: expand each quantity unit into an individual sticker item
      const expanded = [];
      items.forEach(it => {
        const qty = Math.max(1, parseInt(it.quantity, 10) || 1);
        for (let q = 0; q < qty; q++) {
          expanded.push({
            ...it,
            quantity: 1,
            originalQty: qty,
            unitIndex: q + 1
          });
        }
      });
      return expanded;
    }

    // --- 5. RECEIPT & LABEL BUILDERS ---
    async printCashierReceipt(order, config) {
      if (config.protocol === 'tspl') {
        const dim = this.resolveLabelDimensions(config);
        if (config.tspl_mode === 'item_stickers') {
          const items = this.parseOrderItems(order);
          const tasks = items.map((it, idx) => {
            const png = this.drawItemStickerToCanvas(it, order, idx + 1, items.length, dim.widthMm, dim.heightMm, dim.dpi);
            return this.transmitReceiptBitmap(png, config, `Sticker #${order.key} (${idx + 1}/${items.length})`);
          });
          return Promise.all(tasks);
        } else {
          const base64Png = this.drawOrderLabelToCanvas(order, false, dim.widthMm, dim.heightMm, dim.dpi);
          return this.transmitReceiptBitmap(base64Png, config, `TSPL Label #${order.key}`);
        }
      }
      const base64Png = this.drawReceiptToCanvas(order, false, config.paperWidth || 80);
      return this.transmitReceiptBitmap(base64Png, config, `Cashier #${order.key}`);
    }

    async printKitchenTicket(order, config) {
      if (config.protocol === 'tspl') {
        const dim = this.resolveLabelDimensions(config);
        if (config.tspl_mode === 'item_stickers') {
          const items = this.parseOrderItems(order);
          const tasks = items.map((it, idx) => {
            const png = this.drawItemStickerToCanvas(it, order, idx + 1, items.length, dim.widthMm, dim.heightMm, dim.dpi);
            return this.transmitReceiptBitmap(png, config, `Kitchen Sticker #${order.key} (${idx + 1}/${items.length})`);
          });
          return Promise.all(tasks);
        } else {
          const base64Png = this.drawOrderLabelToCanvas(order, true, dim.widthMm, dim.heightMm, dim.dpi);
          return this.transmitReceiptBitmap(base64Png, config, `Kitchen TSPL Label #${order.key}`);
        }
      }
      const base64Png = this.drawReceiptToCanvas(order, true, config.paperWidth || 80);
      return this.transmitReceiptBitmap(base64Png, config, `Kitchen #${order.key}`);
    }

    async testPrint(stationType, targetConfig = null) {
      const config = targetConfig || (stationType === 'kitchen' ? this.getSettings().kitchen : this.getSettings().cashier);
      const isKitchen = stationType === 'kitchen';

      const mockOrder = {
        key: 'TEST-01',
        customer: '測試列印員',
        diningOption: 'dine_in',
        tableNumber: '88',
        time: new Date().toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', hour12: false }),
        content: '2份 x 測試招牌特餐\n   ↳ 大辣、不加蔥\n1份 x 鮮奶茶',
        total: 180,
        note: '這是一張測試列印單據，用於檢驗 TCP Socket / 藍牙 / TSPL 排版。',
        createdAt: Date.now()
      };

      if (config.protocol === 'tspl') {
        const dim = this.resolveLabelDimensions(config);
        if (config.tspl_mode === 'item_stickers') {
          const mockItem = { name: '測試招牌特餐', quantity: 2, options: '大辣、不加蔥', note: '少冰' };
          const base64Png = this.drawItemStickerToCanvas(mockItem, mockOrder, 1, 2, dim.widthMm, dim.heightMm, dim.dpi);
          return this.transmitReceiptBitmap(base64Png, config, `Test-${stationType}-TSPL-Sticker`);
        } else {
          const base64Png = this.drawOrderLabelToCanvas(mockOrder, isKitchen, dim.widthMm, dim.heightMm, dim.dpi);
          return this.transmitReceiptBitmap(base64Png, config, `Test-${stationType}-TSPL-Label`);
        }
      }

      const base64Png = this.drawReceiptToCanvas(mockOrder, isKitchen, config.paperWidth || 80);
      return this.transmitReceiptBitmap(base64Png, config, `Test-${stationType}`);
    }

    // --- 6. PURE HTML5 CANVAS RECEIPT PAINTER (Zero-Taint, 100% Crisp Typography) ---
    drawReceiptToCanvas(order, isKitchen, paperWidth = 80) {
      const widthPx = paperWidth === 58 ? 384 : 576;
      const padding = paperWidth === 58 ? 16 : 24;
      const contentWidth = widthPx - (padding * 2);

      const canvas = document.createElement('canvas');
      canvas.width = widthPx;
      canvas.height = 1600; // Temp allocation
      const ctx = canvas.getContext('2d');

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, widthPx, canvas.height);
      ctx.fillStyle = '#000000';
      ctx.textBaseline = 'top';

      let y = padding;

      // 1. Header
      if (isKitchen) {
        ctx.font = 'bold 30px sans-serif';
        ctx.textAlign = 'center';
        ctx.lineWidth = 3;
        ctx.strokeRect(padding, y, contentWidth, 54);
        ctx.fillText('廚 房 出 餐 聯', widthPx / 2, y + 12);
        y += 66;

        ctx.fillRect(padding, y, contentWidth, 52);
        ctx.fillStyle = '#ffffff';
        ctx.font = '900 32px sans-serif';
        const diningLabel = order.diningOption === 'dine_in' ? `【內用 桌號：${order.tableNumber || '-'}】` : '【外帶自取】';
        ctx.fillText(diningLabel, widthPx / 2, y + 10);
        ctx.fillStyle = '#000000';
        y += 62;

        ctx.textAlign = 'left';
        ctx.font = 'bold 22px sans-serif';
        ctx.fillText(`單號：#${order.key}`, padding, y);
        ctx.textAlign = 'right';
        ctx.fillText(`時間：${order.time || ''}`, widthPx - padding, y);
        y += 32;
      } else {
        const brandName = (typeof window.currentTenantBrandName !== 'undefined' && window.currentTenantBrandName) || 'Blab POS';
        ctx.font = '900 34px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(brandName, widthPx / 2, y);
        y += 44;

        ctx.font = 'bold 22px sans-serif';
        ctx.fillText('客 人 結 帳 聯', widthPx / 2, y);
        y += 32;

        ctx.lineWidth = 2;
        this.drawDashedLine(ctx, padding, widthPx - padding, y);
        y += 14;

        ctx.textAlign = 'left';
        ctx.font = 'bold 26px sans-serif';
        ctx.fillText(`單號：#${order.key}`, padding, y);
        ctx.textAlign = 'right';
        const diningLabel = order.diningOption === 'dine_in' ? `內用 桌號：${order.tableNumber || '-'}` : '外帶自取';
        ctx.fillText(diningLabel, widthPx - padding, y);
        y += 36;

        ctx.textAlign = 'left';
        ctx.font = '19px sans-serif';
        ctx.fillText(`顧客：${order.customer || '顧客'}`, padding, y);
        ctx.textAlign = 'right';
        ctx.fillText(`時間：${order.time || ''}`, widthPx - padding, y);
        y += 28;
      }

      this.drawDashedLine(ctx, padding, widthPx - padding, y);
      y += 16;

      // 2. Items Section
      ctx.textAlign = 'left';
      ctx.font = 'bold 22px sans-serif';
      ctx.fillText(isKitchen ? '【製作品項】' : '【訂單品項】', padding, y);
      y += 32;

      const lines = (order.content || '').split('\n').filter(l => l.trim());
      for (const line of lines) {
        const isModifier = line.includes('↳') || line.startsWith('  ') || line.startsWith('\t');
        if (isModifier) {
          ctx.font = isKitchen ? 'bold 22px sans-serif' : '20px sans-serif';
          ctx.fillStyle = '#222222';
          ctx.fillText(line.trim(), padding + 22, y);
          ctx.fillStyle = '#000000';
          y += 28;
        } else {
          y += 4;
          ctx.font = isKitchen ? '900 28px sans-serif' : '900 24px sans-serif';
          ctx.fillText(line.trim(), padding, y);
          y += 34;
        }
      }

      y += 8;
      this.drawDashedLine(ctx, padding, widthPx - padding, y);
      y += 16;

      // 3. Notes
      if (order.note && order.note.trim()) {
        ctx.font = isKitchen ? 'bold 22px sans-serif' : 'bold 19px sans-serif';
        ctx.fillText(`備註：${order.note}`, padding, y);
        y += 32;
        this.drawDashedLine(ctx, padding, widthPx - padding, y);
        y += 16;
      }

      // 4. Totals (Cashier ONLY - strictly omitted for Kitchen)
      if (!isKitchen) {
        ctx.font = '900 32px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('應收總計：', padding, y);
        ctx.textAlign = 'right';
        ctx.fillText(`$${order.total || 0}`, widthPx - padding, y);
        y += 44;

        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(padding, y);
        ctx.lineTo(widthPx - padding, y);
        ctx.stroke();
        y += 16;

        ctx.textAlign = 'center';
        ctx.font = '18px sans-serif';
        ctx.fillText('謝謝光臨，祝您用餐愉快！', widthPx / 2, y);
        y += 28;
      }

      y += 24; // Bottom buffer

      // Create final cropped canvas
      const finalCanvas = document.createElement('canvas');
      finalCanvas.width = widthPx;
      finalCanvas.height = y;
      const finalCtx = finalCanvas.getContext('2d');
      finalCtx.drawImage(canvas, 0, 0, widthPx, y, 0, 0, widthPx, y);

      return finalCanvas.toDataURL('image/png');
    }

    drawDashedLine(ctx, x1, x2, y) {
      ctx.save();
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      ctx.moveTo(x1, y);
      ctx.lineTo(x2, y);
      ctx.stroke();
      ctx.restore();
    }

    // --- 7. TSPL CANVAS PAINTERS (Order Summary Label & Individual Cup/Item Stickers) ---
    drawOrderLabelToCanvas(order, isKitchen, widthMm = 100, heightMm = 150, dpi = 203) {
      const dotsPerMm = dpi === 300 ? 11.81 : 8.0;
      const scaleRatio = dpi === 300 ? 1.476 : 1.0;
      const widthPx = Math.round(Math.max(100, widthMm * dotsPerMm));
      const heightPx = Math.round(Math.max(100, heightMm * dotsPerMm));
      const padding = Math.round(20 * scaleRatio);
      const contentWidth = widthPx - (padding * 2);

      const canvas = document.createElement('canvas');
      canvas.width = widthPx;
      canvas.height = heightPx;
      const ctx = canvas.getContext('2d');

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, widthPx, heightPx);
      ctx.fillStyle = '#000000';
      ctx.strokeStyle = '#000000';
      ctx.textBaseline = 'top';

      let y = padding;

      // 1. Header & Brand
      const brandName = (typeof window.currentTenantBrandName !== 'undefined' && window.currentTenantBrandName) || 'Blab POS';
      ctx.font = `900 ${Math.round(30 * scaleRatio)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(brandName, widthPx / 2, y);
      y += Math.round(38 * scaleRatio);

      // Order Title Box
      ctx.fillRect(padding, y, contentWidth, Math.round(44 * scaleRatio));
      ctx.fillStyle = '#ffffff';
      ctx.font = `bold ${Math.round(24 * scaleRatio)}px sans-serif`;
      const diningLabel = order.diningOption === 'dine_in' ? `【內用 桌號：${order.tableNumber || '-'}】` : '【外帶自取訂單】';
      ctx.fillText(diningLabel, widthPx / 2, y + Math.round(8 * scaleRatio));
      ctx.fillStyle = '#000000';
      y += Math.round(54 * scaleRatio);

      // Order Key & Time
      ctx.textAlign = 'left';
      ctx.font = `900 ${Math.round(28 * scaleRatio)}px sans-serif`;
      ctx.fillText(`單號：#${order.key}`, padding, y);
      ctx.textAlign = 'right';
      ctx.font = `bold ${Math.round(18 * scaleRatio)}px sans-serif`;
      ctx.fillText(`${order.time || ''}`, widthPx - padding, y + Math.round(6 * scaleRatio));
      y += Math.round(36 * scaleRatio);

      this.drawDashedLine(ctx, padding, widthPx - padding, y);
      y += Math.round(12 * scaleRatio);

      // Items
      const items = this.parseOrderItems(order, false);
      ctx.textAlign = 'left';
      items.slice(0, 10).forEach(it => {
        if (y > heightPx - Math.round(140 * scaleRatio)) return;
        ctx.font = `bold ${Math.round(20 * scaleRatio)}px sans-serif`;
        ctx.fillText(`${it.quantity}份 x ${it.name}`, padding, y);
        y += Math.round(24 * scaleRatio);
        if (it.options) {
          ctx.font = `${Math.round(15 * scaleRatio)}px sans-serif`;
          ctx.fillText(`   ↳ ${it.options}`, padding, y);
          y += Math.round(20 * scaleRatio);
        }
      });

      // Notes & Total at bottom
      y = Math.max(y + Math.round(10 * scaleRatio), heightPx - Math.round(120 * scaleRatio));
      this.drawDashedLine(ctx, padding, widthPx - padding, y);
      y += Math.round(12 * scaleRatio);

      if (order.note && order.note.trim()) {
        ctx.font = `bold ${Math.round(16 * scaleRatio)}px sans-serif`;
        ctx.fillText(`備註：${order.note.slice(0, 30)}`, padding, y);
        y += Math.round(24 * scaleRatio);
      }

      if (!isKitchen) {
        ctx.font = `900 ${Math.round(26 * scaleRatio)}px sans-serif`;
        ctx.fillText('總計：', padding, y);
        ctx.textAlign = 'right';
        ctx.fillText(`$${order.total || 0}`, widthPx - padding, y);
      }

      return canvas.toDataURL('image/png');
    }

    drawItemStickerToCanvas(item, orderContext, itemIdx, totalItems, widthMm = 40, heightMm = 30, dpi = 203) {
      const dotsPerMm = dpi === 300 ? 11.81 : 8.0;
      const scaleRatio = dpi === 300 ? 1.476 : 1.0;
      const widthPx = Math.round(Math.max(50, widthMm * dotsPerMm));
      const heightPx = Math.round(Math.max(30, heightMm * dotsPerMm));
      const isCompact = widthMm <= 42;
      // Generous safe padding to prevent cutting off text on edge
      const padding = Math.round((isCompact ? 10 : 14) * scaleRatio);

      const canvas = document.createElement('canvas');
      canvas.width = widthPx;
      canvas.height = heightPx;
      const ctx = canvas.getContext('2d');

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, widthPx, heightPx);
      ctx.fillStyle = '#000000';
      ctx.strokeStyle = '#000000';
      ctx.textBaseline = 'top';

      let y = padding;

      // 1. Top row: Order Key & Table & Item Index (e.g. #260830-01  桌:12  [1/3])
      ctx.font = `bold ${Math.round((isCompact ? 14 : 17) * scaleRatio)}px sans-serif`;
      ctx.textAlign = 'left';
      ctx.fillText(`#${orderContext.key}`, padding, y);

      ctx.textAlign = 'center';
      const diningShort = orderContext.diningOption === 'dine_in' ? `桌:${orderContext.tableNumber || '-'}` : '外帶';
      ctx.fillText(diningShort, widthPx / 2, y);

      ctx.textAlign = 'right';
      ctx.fillText(`[${itemIdx}/${totalItems}]`, widthPx - padding, y);
      y += Math.round((isCompact ? 18 : 22) * scaleRatio);

      // Clean divider line (minimalist separator, no harsh box border)
      ctx.lineWidth = Math.max(1, Math.round(1 * scaleRatio));
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(widthPx - padding, y);
      ctx.stroke();
      y += Math.round((isCompact ? 6 : 8) * scaleRatio);

      // 2. Dish / Drink Title (Large Bold)
      ctx.textAlign = 'left';
      ctx.font = `900 ${Math.round((isCompact ? 20 : 25) * scaleRatio)}px sans-serif`;
      ctx.fillText(`${item.name}`, padding, y);
      ctx.textAlign = 'right';
      ctx.fillText(`x${item.quantity}`, widthPx - padding, y);
      y += Math.round((isCompact ? 26 : 30) * scaleRatio);

      // 3. Modifiers / Options
      if (item.options || item.note) {
        ctx.textAlign = 'left';
        ctx.font = `bold ${Math.round((isCompact ? 13 : 15) * scaleRatio)}px sans-serif`;
        const optText = (item.options ? item.options : '') + (item.note ? ` (${item.note})` : '');
        ctx.fillText(`↳ ${optText.slice(0, isCompact ? 18 : 24)}`, padding, y);
        y += Math.round((isCompact ? 16 : 20) * scaleRatio);
      }

      // 4. Bottom row: Customer & Time
      y = heightPx - padding - Math.round((isCompact ? 14 : 18) * scaleRatio);
      ctx.font = `${Math.round((isCompact ? 11 : 13) * scaleRatio)}px sans-serif`;
      ctx.textAlign = 'left';
      ctx.fillText(`顧客:${orderContext.customer || '顧客'}`, padding, y);
      ctx.textAlign = 'right';
      ctx.fillText(`${orderContext.time || ''}`, widthPx - padding, y);

      return canvas.toDataURL('image/png');
    }

    drawQuickNoteStickerToCanvas(text, orderContext = null, widthMm = 40, heightMm = 30, dpi = 203) {
      const dotsPerMm = dpi === 300 ? 11.81 : 8.0;
      const scaleRatio = dpi === 300 ? 1.476 : 1.0;
      const widthPx = Math.round(Math.max(50, widthMm * dotsPerMm));
      const heightPx = Math.round(Math.max(30, heightMm * dotsPerMm));
      const isCompact = widthMm <= 42;
      const padding = Math.round((isCompact ? 10 : 14) * scaleRatio);

      const canvas = document.createElement('canvas');
      canvas.width = widthPx;
      canvas.height = heightPx;
      const ctx = canvas.getContext('2d');

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, widthPx, heightPx);
      ctx.fillStyle = '#000000';
      ctx.strokeStyle = '#000000';
      ctx.textBaseline = 'top';

      let y = padding;

      // 1. Top row: Note / Order info
      ctx.font = `bold ${Math.round((isCompact ? 13 : 16) * scaleRatio)}px sans-serif`;
      ctx.textAlign = 'left';
      const orderKey = orderContext && orderContext.key ? `#${orderContext.key}` : '【備註貼紙 / GHI CHÚ】';
      ctx.fillText(orderKey, padding, y);

      ctx.textAlign = 'right';
      const diningShort = (orderContext && orderContext.diningOption === 'dine_in')
        ? `桌:${orderContext.tableNumber || '-'}`
        : ((orderContext && orderContext.diningOption === 'takeaway') ? '外帶' : '補印');
      ctx.fillText(diningShort, widthPx - padding, y);
      y += Math.round((isCompact ? 18 : 22) * scaleRatio);

      // Divider line
      ctx.lineWidth = Math.max(1, Math.round(1 * scaleRatio));
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(widthPx - padding, y);
      ctx.stroke();
      y += Math.round((isCompact ? 8 : 12) * scaleRatio);

      // 2. Main Note Text (Centered, Bold, Large)
      ctx.textAlign = 'center';
      const displayNote = String(text || '').trim();
      const fontSize = displayNote.length > 8
        ? Math.round((isCompact ? 18 : 22) * scaleRatio)
        : Math.round((isCompact ? 24 : 30) * scaleRatio);
      ctx.font = `900 ${fontSize}px sans-serif`;
      ctx.fillText(displayNote, widthPx / 2, y);

      // 3. Bottom row: Timestamp
      y = heightPx - padding - Math.round((isCompact ? 13 : 16) * scaleRatio);
      ctx.font = `${Math.round((isCompact ? 11 : 13) * scaleRatio)}px sans-serif`;
      ctx.textAlign = 'left';
      ctx.fillText('Blab POS', padding, y);
      ctx.textAlign = 'right';
      const now = new Date();
      const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      ctx.fillText(orderContext && orderContext.time ? orderContext.time : timeStr, widthPx - padding, y);

      return canvas.toDataURL('image/png');
    }

    async transmitReceiptBitmap(base64Png, config, logTitle) {
      const interfaceType = config.interface_type || 'network';
      const protocol = config.protocol || 'esc_pos';
      const dim = this.resolveLabelDimensions(config);
      const paperWidth = parseInt(config.paperWidth, 10) || 80;
      const autoCut = config.autoCut !== false;
      const plugin = this.getPlugin();

      if (interfaceType === 'bluetooth') {
        const macAddress = (config.mac_address || '').trim();
        const deviceName = config.device_name || macAddress || 'Bluetooth Printer';

        if (!macAddress) {
          throw new Error('未選擇藍牙印表機 (Please select a paired Bluetooth printer)');
        }

        if (this.isNative && plugin && typeof plugin.printBluetooth === 'function') {
          console.log(`[PrinterService] 📡 Transmitting ${protocol.toUpperCase()} raster bitmap via Native Bluetooth SPP [${deviceName} (${macAddress})]...`);
          const res = await plugin.printBluetooth({
            macAddress: macAddress,
            base64Image: base64Png,
            protocol: protocol,
            paperWidth: paperWidth,
            autoCut: autoCut,
            labelWidthMm: dim.widthMm,
            labelHeightMm: dim.heightMm,
            dpi: dim.dpi,
            xOffsetMm: dim.xOffsetMm,
            yOffsetMm: dim.yOffsetMm,
            timeoutMs: 8000
          });
          console.log(`[PrinterService] ✅ Native Bluetooth print success for [${logTitle}]:`, res);
          return res;
        } else {
          console.log(`[PrinterService] 🌐 Browser Simulator: Print job generated for [${logTitle}] -> Bluetooth ${deviceName} (${macAddress}) [${protocol.toUpperCase()}]`);
          this.openBrowserPreview(base64Png, logTitle, `Bluetooth: ${deviceName} (${macAddress})`, `Protocol: ${protocol.toUpperCase()}`);
          return { success: true, simulated: true, interface: 'bluetooth', protocol, macAddress };
        }
      } else {
        // Network TCP Socket
        const ip = (config.ip || '').trim();
        const port = parseInt(config.port, 10) || 9100;

        if (!ip) {
          throw new Error('未設定印表機 IP 位址 (No printer IP address configured)');
        }

        if (this.isNative && plugin && typeof plugin.printBitmap === 'function') {
          console.log(`[PrinterService] 🚀 Transmitting ${protocol.toUpperCase()} raster bitmap via Native TCP Socket ${ip}:${port}...`);
          const res = await plugin.printBitmap({
            ip: ip,
            port: port,
            base64Image: base64Png,
            protocol: protocol,
            paperWidth: paperWidth,
            autoCut: autoCut,
            labelWidthMm: dim.widthMm,
            labelHeightMm: dim.heightMm,
            dpi: dim.dpi,
            xOffsetMm: dim.xOffsetMm,
            yOffsetMm: dim.yOffsetMm,
            timeoutMs: 5000
          });
          console.log(`[PrinterService] ✅ Native print success for [${logTitle}]:`, res);
          return res;
        } else {
          console.log(`[PrinterService] 🌐 Browser Simulator: Print job generated for [${logTitle}] -> ${ip}:${port} [${protocol.toUpperCase()}]`);
          this.openBrowserPreview(base64Png, logTitle, `Network IP: ${ip}:${port}`, `Protocol: ${protocol.toUpperCase()}`);
          return { success: true, simulated: true, interface: 'network', protocol, ip, port };
        }
      }
    }

    async testConnection(config) {
      const interfaceType = config.interface_type || 'network';
      const plugin = this.getPlugin();

      if (interfaceType === 'bluetooth') {
        const macAddress = (config.mac_address || '').trim();
        if (!macAddress) throw new Error('未選擇藍牙印表機 (No Bluetooth printer selected)');
        if (this.isNative && plugin && typeof plugin.testBluetoothConnection === 'function') {
          return await plugin.testBluetoothConnection({ macAddress });
        }
        return { success: true, simulated: true, macAddress };
      } else {
        const ip = (config.ip || '').trim();
        const port = parseInt(config.port, 10) || 9100;
        if (!ip) throw new Error('未輸入印表機 IP (No printer IP entered)');
        if (this.isNative && plugin && typeof plugin.testConnection === 'function') {
          return await plugin.testConnection({ ip, port, timeoutMs: 2500 });
        }
        return { success: true, simulated: true, ip, port };
      }
    }

    openBrowserPreview(base64Png, title, targetInfo, portOrType) {
      const previewWindow = window.open('', '_blank');
      if (previewWindow) {
        previewWindow.document.write(`
          <html>
            <head><title>Print Preview - ${title}</title></head>
            <body style="background:#1e293b; color:#fff; font-family:sans-serif; display:flex; flex-direction:column; align-items:center; padding:20px;">
              <h3>🖨️ Thermal Print Simulation (${title})</h3>
              <p style="color:#94a3b8;">Target: <b>${targetInfo}</b> | <span style="background:#059669; color:#fff; padding:2px 8px; border-radius:4px;">${portOrType || ''}</span></p>
              <div style="background:#fff; padding:10px; border-radius:8px; box-shadow:0 4px 12px rgba(0,0,0,0.5); max-width:90%;">
                <img src="${base64Png}" style="display:block; max-width:100%; height:auto;" />
              </div>
            </body>
          </html>
        `);
      }
    }
  }

  window.PrinterService = new PrinterService();

})(window);
