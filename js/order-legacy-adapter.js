/* Compatibility boundary for historical text. New snapshots never enter here. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) { module.exports = api; module.exports.default = api; }
  else root.LegacyOrderAdapter = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function flavors(content) {
    const choices = [];
    let inSection = false;
    for (const source of String(content || '').split('\n')) {
      const line = source.trim();
      // Only explicit global-section boundaries establish scope. Bullet values
      // such as "Ống hút x1" are not item headers, regardless of their labels.
      const heading = line.match(/^(?:[🧂🧪🎛️【\s]*)(?:口味設定|客製化設定|客製設定|Khẩu vị|Hương vị|Tùy chọn khẩu vị)[：:]\s*(.*)$/u);
      if (heading) {
        inSection = true;
        if (heading[1]) for (const part of heading[1].replace(/】$/,'').split(/[・·|｜]/)) {
          const pair = part.trim().match(/^([^：:]+)[：:]\s*(.+)$/);
          if (pair) choices.push({label:pair[1].trim(),value:pair[2]});
        }
        continue;
      }
      if (!line) continue;
      const bullet = line.match(/^[•●*\-]\s*([^：:]+)[：:]\s*(.+)$/);
      if (inSection && bullet) { choices.push({label:bullet[1].trim(),value:bullet[2]}); continue; }
      inSection = false;
    }
    return choices;
  }
  function globalChoices(order) {
    if (Array.isArray(order.customizations)) return order.customizations.map(c=>({label:c.label || c.title || '',value:c.value || c.choice || ''}));
    return flavors(order.content || order.raw_content);
  }
  function receiptLines(content, noteKey) {
    const result = [], seen = new Set();
    let globalSection = false;
    for (const raw of String(content || '').split('\n')) {
      const line = raw.trim();
      if (!line) continue;
      if (/^(?:[🧂🧪🎛️【\s]*)(?:口味設定|客製化設定|客製設定)[：:]/u.test(line)) {globalSection=true;continue;}
      if (globalSection && /^[•●*\-]/.test(line)) continue;
      globalSection=false;
      const isOption=/^[↳\-+]/.test(line);
      const text=isOption ? line.replace(/^[↳\-+]\s*/, '') : line;
      if (!isOption) seen.clear();
      const key=isOption ? noteKey(text,true) : null;
      if (key !== null) {if(seen.has(key))continue;seen.add(key);}
      result.push({text,isOption});
    }
    return result;
  }
  return { flavors, globalChoices, receiptLines,
items(order, expand = true) {
      const items = [];
      if (Array.isArray(order.items) && order.items.length > 0) {
        order.items.forEach(it => {
          let rawPrice = it.price ?? it.unit_price ?? it.unitPrice;
          const itemName = it.name || it.item_name || '餐點';
          if ((rawPrice == null || rawPrice === '') && typeof lookupItemPrice === 'function') {
            rawPrice = lookupItemPrice(itemName);
          }
          const qty = Math.max(1, Number(it.quantity) || 1);
          const unitNum = rawPrice != null && rawPrice !== '' ? (Number(String(rawPrice).replace(/[^0-9.]/g, '')) || 0) : null;

          let lineTotal = null;
          if (it.subtotal != null && it.subtotal !== '' && !isNaN(Number(it.subtotal))) {
            lineTotal = Number(it.subtotal);
          } else if (unitNum != null && !isNaN(unitNum)) {
            let optExtra = 0;
            let rawOptions = it.options || it.selected_options;
            if (typeof rawOptions === 'string') {
              try { rawOptions = JSON.parse(rawOptions); } catch (e) {}
            }
            if (Array.isArray(rawOptions)) {
              rawOptions.forEach(opt => {
                if (opt && opt.price && Number(opt.price) > 0) {
                  optExtra += Number(opt.price);
                }
              });
            }
            let bundleExtra = 0;
            const bundleData = this.parseBundleSnapshotData(it.bundleSelections || it.bundle_snapshot_json);
            if (bundleData) {
              const portions = Array.isArray(bundleData.portions) ? bundleData.portions : (Array.isArray(bundleData) ? bundleData : null);
              if (portions) {
                portions.forEach(p => {
                  (p.groups || []).forEach(g => {
                    (g.items || []).forEach(bi => {
                      const sur = Number(bi.surcharge || 0) + (bi.modifiers || []).reduce((sum, mod) => sum + Number(mod.price || 0), 0);
                      if (sur > 0) {
                        const bQty = Number(bi.quantity) || 1;
                        bundleExtra += sur * bQty;
                      }
                    });
                  });
                });
              }
            }
            lineTotal = (unitNum * qty) + optExtra + bundleExtra;
          }

          const bundleData = this.parseBundleSnapshotData(it.bundleSelections || it.bundle_snapshot_json);
          const bundleOpts = this.extractBundleOptions(bundleData, qty);

          let baseOptions = it.options || it.selected_options;
          if (typeof baseOptions === 'string') {
            try { baseOptions = JSON.parse(baseOptions); } catch (e) {}
          }

          let combinedOptionsList = [];
          if (Array.isArray(baseOptions)) {
            combinedOptionsList = [...baseOptions, ...bundleOpts];
          } else if (typeof baseOptions === 'string' && baseOptions.trim()) {
            combinedOptionsList = [baseOptions, ...bundleOpts];
          } else {
            combinedOptionsList = bundleOpts;
          }

          // Defensive fallback: If no bundle snapshot was found AND this item has no options, check order.content
          const hasExistingOptions = combinedOptionsList.length > 0;
          if (!hasExistingOptions && order && order.content) {
            const contentLines = String(order.content).split('\n');
            let matchedItem = false;
            const fallbackOpts = [];
            for (const cLine of contentLines) {
              const trimmed = cLine.trim();
              if (!matchedItem && (trimmed.includes(itemName) || (trimmed.startsWith(qty + '份') && trimmed.includes(itemName)))) {
                matchedItem = true;
                continue;
              }
              if (matchedItem) {
                if (!trimmed.startsWith('↳') && !trimmed.startsWith('-') && !trimmed.startsWith('•') && trimmed.length > 0) {
                  break;
                }
                if (trimmed.startsWith('↳') || (trimmed.startsWith('-') && !trimmed.includes('口味設定') && !trimmed.includes('備註') && !trimmed.includes('Ghi chú') && !trimmed.includes('Khẩu vị') && !trimmed.includes('Hương vị'))) {
                  fallbackOpts.push(trimmed);
                }
              }
            }
            if (fallbackOpts.length > 0) {
              combinedOptionsList = [...combinedOptionsList, ...fallbackOpts];
            }
          }

          const itemPrice = lineTotal != null ? `$${lineTotal}` : (rawPrice != null && rawPrice !== '' ? (String(rawPrice).startsWith('$') ? String(rawPrice) : `$${rawPrice}`) : '');
          items.push({
            name: itemName,
            quantity: qty,
            price: itemPrice,
            unitPrice: unitNum != null ? `$${unitNum}` : '',
            options: this.formatPrintOptions(combinedOptionsList),
            baseOptions: this.formatPrintOptions(baseOptions ? (Array.isArray(baseOptions) ? baseOptions : [baseOptions]) : []),
            bundle_snapshot_json: it.bundle_snapshot_json || (it.bundleSelections ? (typeof it.bundleSelections === 'string' ? it.bundleSelections : JSON.stringify(it.bundleSelections)) : null),
            bundleData: bundleData,
            note: this.remainingItemNote(baseOptions, it.note || it.notes),
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
          const isSubOption = line.startsWith('↳') || line.startsWith('-') || line.startsWith('+') || line.startsWith('•') || line.startsWith('－');
          if (isSubOption) {
            if (currentItem) {
              const opt = line.replace(/^[↳\-+•－]\s*/, '').trim();
              const printOpt = this.stripPrintOptionSurcharges(opt);
              currentItem.options = currentItem.options ? `${currentItem.options}\n${printOpt}` : printOpt;
              const addMatch = opt.match(/(?:\(\s*\+\s*\$|\+\s*\$)(\d+(?:\.\d+)?)/);
              if (addMatch && currentItem._lineTotal != null) {
                currentItem._lineTotal += Number(addMatch[1]) || 0;
                currentItem.price = `$${currentItem._lineTotal}`;
              }
            }
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
          } else {
            const priceMatch = line.match(/\$[\d,.]+/);
            let rawNum = priceMatch ? Number(priceMatch[0].replace(/[^0-9.]/g, '')) : null;
            const match = line.match(/^(\d+)\s*(?:份|x|X)\s*(?:x\s*)?(.+)$/) || line.match(/^(.+?)\s*[xX*]\s*(\d+)$/);
            if (match) {
              const qty = Number(match[1]) || Number(match[2]) || 1;
              const name = (match[2] || match[1] || line).replace(/\$[\d,.]+/g, '').trim();
              if ((rawNum == null || isNaN(rawNum)) && name && typeof lookupItemPrice === 'function') {
                const lp = lookupItemPrice(name);
                if (lp != null) rawNum = Number(lp);
              }
              const totalNum = rawNum != null ? rawNum * qty : null;
              const itemPrice = totalNum != null ? `$${totalNum}` : '';
              currentItem = { name, quantity: qty, price: itemPrice, _lineTotal: totalNum, options: '', note: '', round: currentRound };
              items.push(currentItem);
            } else {
              const name = line.replace(/\$[\d,.]+/g, '').trim();
              if ((rawNum == null || isNaN(rawNum)) && name && typeof lookupItemPrice === 'function') {
                const lp = lookupItemPrice(name);
                if (lp != null) rawNum = Number(lp);
              }
              const itemPrice = rawNum != null ? `$${rawNum}` : '';
              currentItem = { name, quantity: 1, price: itemPrice, _lineTotal: rawNum, options: '', note: '', round: currentRound };
              items.push(currentItem);
            }
          }
        });
      }

      if (items.length === 0) {
        items.push({ name: '特餐餐點', quantity: 1, price: '', options: '', note: '', round: '' });
      }

      items.forEach(item => {
        const seenNotes = new Set();
        item.options = String(item.options || '').split('\n').filter(line => {
          const key = this.itemNoteKey(line, true);
          if (key === null) return true;
          if (seenNotes.has(key)) return false;
          seenNotes.add(key);
          return true;
        }).join('\n');
      });
      if (!expand) {
        return items;
      }

      // If expand is true: expand each quantity unit into an individual sticker item
      const expanded = [];
      items.forEach(it => {
        const qty = Math.max(1, parseInt(it.quantity, 10) || 1);
        const parsedPortions = (typeof parsePortionCustomizations === 'function')
          ? parsePortionCustomizations(it.options)
          : null;

        for (let q = 0; q < qty; q++) {
          let unitOptions = it.options;
          if (parsedPortions && parsedPortions.portions && parsedPortions.portions.length > 0) {
            const matchedPortion = parsedPortions.portions[q];
            const pChips = matchedPortion ? matchedPortion.chips : [];
            const common = (parsedPortions.commonChips && parsedPortions.commonChips.length > 0)
              ? parsedPortions.commonChips
              : [];
            const combinedChips = [...common, ...pChips];
            unitOptions = combinedChips.length > 0 ? combinedChips.join('、') : '';
          }

          expanded.push({
            ...it,
            options: unitOptions,
            quantity: 1,
            originalQty: qty,
            unitIndex: q + 1
          });
        }
      });
      return expanded;
    }
  };
});
