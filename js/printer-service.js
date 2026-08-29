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
      ip: '192.168.1.100',
      port: 9100,
      paperWidth: 80,
      autoCut: true
    },
    kitchen: {
      enabled: true,
      ip: '192.168.1.101',
      port: 9100,
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

      if (settings.cashier.enabled && settings.cashier.ip) {
        tasks.push(this.printCashierReceipt(order, settings.cashier));
      }
      if (settings.kitchen.enabled && settings.kitchen.ip) {
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
      const html = this.buildCashierReceiptHTML(order, config.paperWidth);
      return this.renderAndPrintHTML(html, config, `Cashier #${order.key}`);
    }

    async printKitchenTicket(order, config) {
      const html = this.buildKitchenTicketHTML(order, config.paperWidth);
      return this.renderAndPrintHTML(html, config, `Kitchen #${order.key}`);
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

      const html = isKitchen
        ? this.buildKitchenTicketHTML(mockOrder, config.paperWidth || 80)
        : this.buildCashierReceiptHTML(mockOrder, config.paperWidth || 80);

      return this.renderAndPrintHTML(html, config, `Test-${stationType}`);
    }

    // --- 6. HTML RECEIPT TEMPLATES (Clean, High-Contrast for Thermal Bitmap) ---
    buildCashierReceiptHTML(order, paperWidth = 80) {
      const widthPx = paperWidth === 58 ? 384 : 576;
      const brandName = (typeof window.currentTenantBrandName !== 'undefined' && window.currentTenantBrandName) || 'Benmi POS';
      const isDineIn = order.diningOption === 'dine_in';
      const diningLabel = isDineIn ? `【內用 桌號：${order.tableNumber || '-'}】` : '【外帶自取】';
      const dateStr = order.time || new Date().toLocaleTimeString('zh-TW');

      const itemsHTML = this.formatOrderContentToHTML(order.content, false);
      const totalDisplay = (order.total != null && order.total > 0) ? `$${order.total}` : '-';

      return `
        <div style="width: ${widthPx}px; background:#fff; color:#000; font-family: 'Noto Sans TC', sans-serif, monospace; padding: 12px 16px; box-sizing: border-box; font-size: 22px; line-height: 1.4;">
          <div style="text-align: center; margin-bottom: 8px;">
            <div style="font-size: 32px; font-weight: 900; letter-spacing: 1px;">${brandName}</div>
            <div style="font-size: 20px; font-weight: 700; margin-top: 4px;">客 人 結 帳 聯</div>
          </div>
          <div style="border-top: 2px dashed #000; margin: 8px 0;"></div>
          
          <div style="display: flex; justify-content: space-between; font-weight: 800; font-size: 26px;">
            <div>單號：#${order.key}</div>
            <div>${diningLabel}</div>
          </div>
          <div style="font-size: 19px; color: #333; margin-top: 4px;">
            <div>顧客：${order.customer || '顧客'}</div>
            <div>時間：${dateStr}</div>
          </div>
          
          <div style="border-top: 2px dashed #000; margin: 8px 0;"></div>
          <div style="font-size: 20px; font-weight: 800; margin-bottom: 6px;">【訂單品項】</div>
          ${itemsHTML}
          
          <div style="border-top: 2px dashed #000; margin: 8px 0;"></div>
          ${order.note ? `<div style="font-size: 19px; font-weight: 700; margin-bottom: 6px;">備註：${order.note}</div>` : ''}
          <div style="display: flex; justify-content: space-between; align-items: center; font-size: 30px; font-weight: 900; margin-top: 6px;">
            <div>應收總計：</div>
            <div>${totalDisplay}</div>
          </div>
          
          <div style="border-top: 2px solid #000; margin: 12px 0 6px 0;"></div>
          <div style="text-align: center; font-size: 18px; font-weight: 600;">謝謝光臨，祝您用餐愉快！</div>
          <div style="height: 24px;"></div>
        </div>
      `;
    }

    buildKitchenTicketHTML(order, paperWidth = 80) {
      const widthPx = paperWidth === 58 ? 384 : 576;
      const isDineIn = order.diningOption === 'dine_in';
      const diningLabel = isDineIn ? `【內用 桌號：${order.tableNumber || '-'}】` : '【外帶自取】';
      const dateStr = order.time || new Date().toLocaleTimeString('zh-TW');
      const itemsHTML = this.formatOrderContentToHTML(order.content, true);

      return `
        <div style="width: ${widthPx}px; background:#fff; color:#000; font-family: 'Noto Sans TC', sans-serif, monospace; padding: 12px 16px; box-sizing: border-box; font-size: 24px; line-height: 1.45;">
          <div style="text-align: center; border: 3px solid #000; padding: 6px 0; margin-bottom: 8px;">
            <div style="font-size: 34px; font-weight: 1000; letter-spacing: 2px;">廚 房 出 餐 聯</div>
            <div style="font-size: 30px; font-weight: 900; margin-top: 2px;">#${order.key}</div>
          </div>
          
          <div style="font-size: 32px; font-weight: 1000; text-align: center; margin: 8px 0; background: #000; color: #fff; padding: 4px 0;">
            ${diningLabel}
          </div>
          
          <div style="display: flex; justify-content: space-between; font-size: 19px; font-weight: 700; margin-bottom: 6px;">
            <div>顧客：${order.customer || '顧客'}</div>
            <div>時間：${dateStr}</div>
          </div>
          
          <div style="border-top: 3px solid #000; margin: 8px 0;"></div>
          ${itemsHTML}
          
          <div style="border-top: 3px solid #000; margin: 8px 0;"></div>
          ${order.note ? `<div style="font-size: 24px; font-weight: 900; margin-top: 4px; border: 2px dashed #000; padding: 6px;">⚠️ 廚房備註：${order.note}</div>` : ''}
          <div style="height: 30px;"></div>
        </div>
      `;
    }

    formatOrderContentToHTML(content, isKitchen = false) {
      if (!content) return '<div style="color:#666;">(無品項內容)</div>';
      const lines = content.split('\n').filter(l => l.trim().length > 0);
      let html = '<div style="display: flex; flex-direction: column; gap: 8px;">';

      lines.forEach(line => {
        const trimmed = line.trim();
        if (trimmed.startsWith('↳') || trimmed.startsWith('✦') || trimmed.startsWith('-')) {
          // Modifier/Customization note line
          html += `<div style="font-size: ${isKitchen ? '22px' : '18px'}; font-weight: 700; margin-left: 18px; color: #111;">${trimmed}</div>`;
        } else {
          // Main item line
          html += `
            <div style="display: flex; justify-content: space-between; font-size: ${isKitchen ? '28px' : '23px'}; font-weight: 900; margin-top: 6px; border-bottom: 1px dotted #ccc; padding-bottom: 3px;">
              <div>${trimmed}</div>
            </div>
          `;
        }
      });

      html += '</div>';
      return html;
    }

    // --- 7. RENDERING PIPELINE: HTML -> Canvas -> Base64 -> Native Thermal Socket ---
    async renderAndPrintHTML(htmlString, config, logTitle = 'PrintJob') {
      const plugin = this.getPlugin();
      const ip = config.ip ? config.ip.trim() : '';
      const port = Number(config.port) || 9100;
      const paperWidth = Number(config.paperWidth) || 80;
      const autoCut = config.autoCut !== false;

      if (!ip) {
        throw new Error('未設定印表機 IP 位址');
      }

      console.log(`[PrinterService] 🎨 Rendering [${logTitle}] for ${ip}:${port} (${paperWidth}mm)...`);

      // 1. Render HTML in an offscreen container to measure & draw on HTML5 Canvas
      const base64Png = await this.renderHtmlToPngBase64(htmlString, paperWidth);

      // 2. Transmit via Native Android Plugin over TCP Socket
      if (this.isNative && plugin) {
        console.log(`[PrinterService] 🚀 Sending raster bitmap to Native Socket ${ip}:${port}...`);
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
        // Fallback for Web Browser Testing (Open print preview or download)
        console.log(`[PrinterService] 🌐 Browser Simulator: Print job generated successfully for [${logTitle}] -> ${ip}:${port}`);
        this.openBrowserPreview(base64Png, logTitle, ip, port);
        return { success: true, simulated: true, ip, port };
      }
    }

    renderHtmlToPngBase64(htmlString, paperWidth = 80) {
      return new Promise((resolve, reject) => {
        try {
          const widthPx = paperWidth === 58 ? 384 : 576;
          const container = document.createElement('div');
          container.style.position = 'fixed';
          container.style.left = '-9999px';
          container.style.top = '-9999px';
          container.style.width = `${widthPx}px`;
          container.style.backgroundColor = '#ffffff';
          container.innerHTML = htmlString;
          document.body.appendChild(container);

          // Use SVG foreignObject rasterization or direct canvas painting
          setTimeout(() => {
            const heightPx = Math.max(100, container.offsetHeight);
            const svgXml = `
              <svg xmlns="http://www.w3.org/2000/svg" width="${widthPx}" height="${heightPx}">
                <foreignObject width="100%" height="100%">
                  <div xmlns="http://www.w3.org/1999/xhtml">
                    ${htmlString}
                  </div>
                </foreignObject>
              </svg>
            `;

            const img = new Image();
            const svgBlob = new Blob([svgXml], { type: 'image/svg+xml;charset=utf-8' });
            const url = URL.createObjectURL(svgBlob);

            img.onload = () => {
              const canvas = document.createElement('canvas');
              canvas.width = widthPx;
              canvas.height = heightPx;
              const ctx = canvas.getContext('2d');
              ctx.fillStyle = '#ffffff';
              ctx.fillRect(0, 0, widthPx, heightPx);
              ctx.drawImage(img, 0, 0);

              const dataUrl = canvas.toDataURL('image/png');
              URL.revokeObjectURL(url);
              document.body.removeChild(container);
              resolve(dataUrl);
            };

            img.onerror = (err) => {
              URL.revokeObjectURL(url);
              document.body.removeChild(container);
              reject(new Error('Failed to rasterize receipt HTML to image: ' + err));
            };

            img.src = url;
          }, 60);
        } catch (err) {
          reject(err);
        }
      });
    }

    openBrowserPreview(base64Png, title, ip, port) {
      const previewWindow = window.open('', '_blank');
      if (previewWindow) {
        previewWindow.document.write(`
          <html>
            <head><title>Print Preview - ${title}</title></head>
            <body style="background:#1e293b; color:#fff; font-family:sans-serif; display:flex; flex-direction:column; align-items:center; padding:20px;">
              <h3>🖨️ Thermal Print Simulation (${title})</h3>
              <p style="color:#94a3b8;">Target IP: <b>${ip}:${port}</b></p>
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
