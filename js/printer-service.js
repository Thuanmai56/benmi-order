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
        return getTenantIdFromUrl();
      }
      const params = new URLSearchParams(window.location.search);
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
      if (this.isNative && plugin) {
        try {
          // Explicitly trigger native permission popup if not granted yet
          if (typeof plugin.checkPermissions === 'function' && typeof plugin.requestPermissions === 'function') {
            try {
              const check = await plugin.checkPermissions();
              if (check && check.bluetooth !== 'granted') {
                console.log('[PrinterService] Requesting Bluetooth permissions via Capacitor bridge...');
                await plugin.requestPermissions({ permissions: ['bluetooth'] });
              }
            } catch (permErr) {
              console.warn('[PrinterService] Permission check error, proceeding to native call:', permErr);
            }
          }

          if (typeof plugin.getPairedBluetoothDevices === 'function') {
            const res = await plugin.getPairedBluetoothDevices();
            return res;
          }
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

    // --- 5. RECEIPT BUILDERS & RASTER ENGINE ---
    async printCashierReceipt(order, config) {
      const base64Png = this.drawReceiptToCanvas(order, false, config.paperWidth || 80);
      return this.transmitReceiptBitmap(base64Png, config, `Cashier #${order.key}`);
    }

    async printKitchenTicket(order, config) {
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
        note: '這是一張測試列印單據，用於檢驗 TCP Socket 與中文/越文點陣排版。',
        createdAt: Date.now()
      };

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
        const brandName = (typeof window.currentTenantBrandName !== 'undefined' && window.currentTenantBrandName) || 'Benmi POS';
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

    async transmitReceiptBitmap(base64Png, config, logTitle) {
      const interfaceType = config.interface_type || 'network';
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
          console.log(`[PrinterService] 📡 Transmitting raster bitmap via Native Bluetooth SPP [${deviceName} (${macAddress})]...`);
          const res = await plugin.printBluetooth({
            macAddress: macAddress,
            base64Image: base64Png,
            paperWidth: paperWidth,
            autoCut: autoCut,
            timeoutMs: 8000
          });
          console.log(`[PrinterService] ✅ Native Bluetooth print success for [${logTitle}]:`, res);
          return res;
        } else {
          console.log(`[PrinterService] 🌐 Browser Simulator: Print job generated for [${logTitle}] -> Bluetooth ${deviceName} (${macAddress})`);
          this.openBrowserPreview(base64Png, logTitle, `Bluetooth: ${deviceName} (${macAddress})`, 'SPP');
          return { success: true, simulated: true, interface: 'bluetooth', macAddress };
        }
      } else {
        // Network TCP Socket
        const ip = (config.ip || '').trim();
        const port = parseInt(config.port, 10) || 9100;

        if (!ip) {
          throw new Error('未設定印表機 IP 位址 (No printer IP address configured)');
        }

        if (this.isNative && plugin && typeof plugin.printBitmap === 'function') {
          console.log(`[PrinterService] 🚀 Transmitting raster bitmap via Native TCP Socket ${ip}:${port}...`);
          const res = await plugin.printBitmap({
            ip: ip,
            port: port,
            base64Image: base64Png,
            paperWidth: paperWidth,
            autoCut: autoCut,
            timeoutMs: 5000
          });
          console.log(`[PrinterService] ✅ Native print success for [${logTitle}]:`, res);
          return res;
        } else {
          console.log(`[PrinterService] 🌐 Browser Simulator: Print job generated for [${logTitle}] -> ${ip}:${port}`);
          this.openBrowserPreview(base64Png, logTitle, `Network IP: ${ip}`, port);
          return { success: true, simulated: true, interface: 'network', ip, port };
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
              <p style="color:#94a3b8;">Target: <b>${targetInfo}${portOrType ? ' :' + portOrType : ''}</b></p>
              <div style="background:#fff; padding:10px; border-radius:8px; box-shadow:0 4px 12px rgba(0,0,0,0.5);">
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
