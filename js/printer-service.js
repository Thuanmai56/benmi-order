// ==========================================================
// Benmi POS - Thermal Printer Service & Native Bridge
// Supports: Auto-Print on New Orders + Manual On-Demand Print
// Target Hardware: ESC/POS LAN/Wi-Fi Printers on Port 9100
// ==========================================================

(function (window) {
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
      feedBeforeCutMm: 80,
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
      feedBeforeCutMm: 100,
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

    formatPrintOptions(value) {
      if (!value) return '';
      if (typeof value === 'string') {
        try { return this.formatPrintOptions(JSON.parse(value)); } catch { return value; }
      }
      if (Array.isArray(value)) return value.map(option => typeof option === 'string' ? option : option.choice || option.name || '').filter(Boolean).join('、');
      return '';
    }

    parseOrderItems(order, expand = true) {
      const items = [];
      if (Array.isArray(order.items) && order.items.length > 0) {
        order.items.forEach(it => {
          const rawPrice = it.price ?? it.unit_price ?? it.unitPrice;
          const itemPrice = rawPrice != null ? (String(rawPrice).startsWith('$') ? String(rawPrice) : `$${rawPrice}`) : '';
          items.push({
            name: it.name || it.item_name || '餐點',
            quantity: Number(it.quantity) || 1,
            price: itemPrice,
            options: this.formatPrintOptions(it.options || it.selected_options),
            note: it.note || it.notes || '',
            round: it.round || (Number(order.roundCount || order.round_count) > 1 ? '[第' + (it.round_number || 1) + '輪]' : '')
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
            line.includes('Ghi chú') || line.includes('Thanh toán') || line.includes('Tổng cộng') ||
            line.includes('口味設定') || line.includes('Khẩu vị') || line.includes('Hương vị') ||
            line.startsWith('🧂') || line.startsWith('📦')
          ) {
            return;
          }
          if (line.startsWith('↳') || line.startsWith('-') || line.startsWith('+') || line.startsWith('•') || line.startsWith('－')) {
            if (currentItem) {
              const opt = line.replace(/^[↳\-+•－]\s*/, '').trim();
              currentItem.options = currentItem.options ? `${currentItem.options}、${opt}` : opt;
            }
          } else {
            const priceMatch = line.match(/\$[\d,.]+/);
            const itemPrice = priceMatch ? priceMatch[0] : '';
            const match = line.match(/^(\d+)\s*(?:份|x|X)\s*(?:x\s*)?(.+)$/) || line.match(/^(.+?)\s*[xX*]\s*(\d+)$/);
            if (match) {
              const qty = Number(match[1]) || Number(match[2]) || 1;
              const name = (match[2] || match[1] || line).replace(/\$[\d,.]+/g, '').trim();
              currentItem = { name, quantity: qty, price: itemPrice, options: '', note: '', round: currentRound };
              items.push(currentItem);
            } else {
              currentItem = { name: line.replace(/\$[\d,.]+/g, '').trim(), quantity: 1, price: itemPrice, options: '', note: '', round: currentRound };
              items.push(currentItem);
            }
          }
        });
      }

      if (items.length === 0) {
        items.push({ name: '特餐餐點', quantity: 1, price: '', options: '', note: '', round: '' });
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
    // Measure first, then paint at the required height so large fonts never clip.
    wrapPrintText(ctx, text, maxWidth) {
      const result = [];
      for (const paragraph of String(text ?? '').split('\n')) {
        let line = '';
        for (const char of paragraph) {
          const candidate = line + char;
          const width = typeof ctx.measureText === 'function'
            ? ctx.measureText(candidate).width : candidate.length * (parseFloat(ctx.font.match(/[\d.]+px/)?.[0]) || 24);
          if (line && width > maxWidth) {
            // Keep Latin words together when a previous space can wrap the row.
            const split = candidate.lastIndexOf(' ');
            if (split > 0 && /^[\x20-\x7e]+$/.test(candidate)) {
              result.push(candidate.slice(0, split + 1)); line = candidate.slice(split + 1);
            } else { result.push(line); line = char; }
          }
          else line = candidate;
        }
        result.push(line);
      }
      return result;
    }

    drawReceiptToCanvas(order, isKitchen, paperWidth = 80) {
      const width = Number(paperWidth) === 58 ? 384 : 576;
      // Keep only a small top/bottom quiet zone. The cutter feed is handled
      // after the raster payload, so a large canvas padding here wastes paper
      // at the beginning of every receipt.
      const padding = Number(paperWidth) === 58 ? 1 : 1;
      const available = width - padding * 2;
      const canvas = document.createElement('canvas');
      canvas.width = width;
      const ctx = canvas.getContext('2d');
      const operations = [];
      let y = padding;
      const row = (left, size, right = '', weight = 'bold', centered = false) => {
        const font = `${weight} ${size}px sans-serif`;
        ctx.font = font;
        const gap = 16;
        const rightWidth = right ? Math.min(available * 0.4,
          typeof ctx.measureText === 'function' ? ctx.measureText(String(right)).width : available * 0.4) : 0;
        const leftLines = this.wrapPrintText(ctx, left, available - (right ? rightWidth + gap : 0));
        const rightLines = right ? this.wrapPrintText(ctx, right, rightWidth) : [];
        const lineHeight = Math.ceil(size * 1.25);
        leftLines.forEach((text, i) => operations.push({
          text, x: centered ? width / 2 : padding,
          y: y + i * lineHeight, font, align: centered ? 'center' : 'left'
        }));
        rightLines.forEach((text, i) => operations.push({
          text, x: width - padding,
          y: y + i * lineHeight, font, align: 'right'
        }));
        y += Math.max(leftLines.length, rightLines.length) * lineHeight + 6;
      };
      const divider = () => { y += 8; operations.push({ line: true, y }); y += 16; };
      const brand = window.currentTenantBrandName || order.storeName || order.tenantName || '';
      if (brand) row(brand, 51, '', '900', true);
      if (isKitchen) row('廚房出餐聯', 45, '', '900', true);
      divider();
      row('#' + order.key, 39);
      row(order.diningOption === 'dine_in' ? '內用 桌號：' + (order.tableNumber || '-') : '外帶自取', 33);
      row('顧客：' + (order.customer || '顧客'), 29);
      row('時間：' + (order.time || ''), 29, '', 'normal');
      divider();
      for (const item of this.parseOrderItems(order, false)) {
        if (item.round) row(item.round, 30);
        row(item.quantity + ' x ' + item.name, isKitchen ? 42 : 36, isKitchen ? '' : item.price, '900');
        if (item.options) row('  ' + item.options, 30, '', 'normal');
        if (item.note) row('  ' + item.note, 30, '', 'normal');
      }
      if (order.note?.trim()) { divider(); row('備註：' + order.note, 29); }
      if (!isKitchen) {
        divider();
        row('應收總計', 48, '$' + (order.total ?? 0), '900');
        divider();
        // Keep the Chinese greeting and attribution on separate centered rows.
        // Sharing one row made both strings wrap on narrow 58 mm paper.
        row('謝謝光臨，祝您用餐愉快！', 25, '', 'normal', true);
        row('Powered by Blab', 22, '', 'normal', true);
      }
      canvas.height = Math.ceil(y + padding);
      const paint = canvas.getContext('2d');
      paint.fillStyle = '#fff';
      paint.fillRect(0, 0, width, canvas.height);
      paint.fillStyle = '#000';
      paint.textBaseline = 'top';
      for (const op of operations) {
        if (op.line) this.drawDashedLine(paint, padding, width - padding, op.y);
        else { paint.font = op.font; paint.textAlign = op.align; paint.fillText(op.text, op.x, op.y); }
      }
      return canvas.toDataURL('image/png');
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
      const dining = order.diningOption === 'dine_in' ? '桌:' + (order.tableNumber || '-') : '外帶';
      const body = this.parseOrderItems(order, false).map(item =>
        [item.quantity + ' x ' + item.name, item.options, item.note].filter(Boolean).join('\n')).join('\n');
      return this.drawStickerLayout(
        [window.currentTenantBrandName, '#' + order.key, dining].filter(Boolean).join(' '),
        [body, order.note].filter(Boolean).join('\n'),
        isKitchen ? (order.customer || '') : '應收總計：$' + (order.total ?? 0),
        widthMm, heightMm, dpi, [60, 60, 52]);
    }

    // Fixed paper: grow typography to the requested target, then fit all text.
    drawStickerLayout(header, body, footer, widthMm, heightMm, dpi, sizes) {
      const scale = dpi === 300 ? 300 / 203 : 1;
      const width = Math.round(widthMm * (dpi === 300 ? 11.811 : 8));
      const height = Math.round(heightMm * (dpi === 300 ? 11.811 : 8));
      const padding = Math.round(10 * scale);
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = '#000'; ctx.textBaseline = 'top'; ctx.textAlign = 'left';
      const available = width - padding * 2;
      const topHeight = Math.round((height - padding * 2) * 0.22);
      const bottomHeight = Math.round((height - padding * 2) * 0.18);
      const gap = Math.round(6 * scale);
      const draw = (text, top, boxHeight, target) => {
        let size = Math.round(target * scale);
        let lines;
        do {
          ctx.font = 'bold ' + size + 'px sans-serif';
          lines = this.wrapPrintText(ctx, text, available);
          if (lines.length * Math.ceil(size * 1.15) <= boxHeight) break;
          size--;
        } while (size > 1);
        const lineHeight = Math.ceil(size * 1.15);
        lines.forEach((line, i) => ctx.fillText(line, padding, top + i * lineHeight));
      };
      draw(header, padding, topHeight, sizes[0]);
      draw(body, padding + topHeight + gap, height - padding * 2 - topHeight - bottomHeight - gap * 2, sizes[1]);
      draw(footer, height - padding - bottomHeight, bottomHeight, sizes[2]);
      return canvas.toDataURL('image/png');
    }

    drawItemStickerToCanvas(item, orderContext, itemIdx, totalItems, widthMm = 40, heightMm = 30, dpi = 203) {
      const compact = widthMm <= 42;
      const dining = orderContext.diningOption === 'dine_in' ? '桌:' + (orderContext.tableNumber || '-') : '外帶';
      const header = '#' + orderContext.key + ' ' + dining + ' [' + itemIdx + '/' + totalItems + ']';
      const body = [item.name + ' x' + item.quantity, item.options, item.note].filter(Boolean).join('\n');
      const time = String(orderContext.time || '').match(/\d{1,2}:\d{2}/)?.[0] || '';
      return this.drawStickerLayout(header, body, (orderContext.customer || '顧客') + ' ' + time,
        widthMm, heightMm, dpi, compact ? [28, 60, 22] : [34, 75, 26]);
    }

    drawQuickNoteStickerToCanvas(text, orderContext = null, widthMm = 40, heightMm = 30, dpi = 203) {
      const compact = widthMm <= 42;
      const context = orderContext || {};
      const now = new Date();
      const time = String(context.time || '').match(/\d{1,2}:\d{2}/)?.[0]
        || String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
      return this.drawStickerLayout(context.key ? '#' + context.key : '備註',
        String(text || '').trim(), (window.currentTenantBrandName || '') + ' ' + time,
        widthMm, heightMm, dpi, compact ? [26, 72, 22] : [32, 90, 26]);
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
            feedBeforeCutMm: Number(config.feedBeforeCutMm) || 100,
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
            feedBeforeCutMm: Number(config.feedBeforeCutMm) || 100,
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
