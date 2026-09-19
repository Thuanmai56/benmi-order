import { Order, OrderItemInput } from '../../../types/index';
import { TenantContext } from '../../../types/tenant';

export function buildOrderFlexMessage(
  order: Order,
  tenantCtx?: TenantContext | null,
  items?: OrderItemInput[],
  customizations?: Array<{ label: string; value: string }>
): any {
  const brandColor = tenantCtx?.brandColor || "#059669";
  const isScheduled = tenantCtx?.allowScheduledPickup !== false;
  const isDineIn = order.diningOption === "dine_in" || ((order.content || "").includes("用餐方式：") && (order.content || "").includes("內用")) || (order.content || "").includes("【內用】");

  let tableNum = (order.tableNumber || "").trim();
  if (!tableNum || tableNum === "-") {
    const tableMatch = (order.content || "").match(/(?:桌號|Bàn)[：:\s]*([^\n\r,，()（）]+)/i) ||
      (order.note || "").match(/(?:桌號|Bàn)[：:\s]*([^\n\r,，()（）]+)/i);
    if (tableMatch) tableNum = tableMatch[1].trim();
  }
  tableNum = tableNum
    .replace(/^(?:桌號|Bàn)[：:\s]*/i, "")
    .replace(/[：:]/g, "")
    .replace(/[()（）]/g, "")
    .replace(/號桌/g, "")
    .replace(/桌/g, "")
    .trim();

  const diningLabel = isDineIn ? (tableNum && tableNum !== "-" ? `內用 (${tableNum} 桌)` : "內用 (現場製作)") : "外帶自取";
  const timeLabel = isDineIn ? "點餐時間" : (isScheduled ? "預計取餐時間" : "訂餐時間");

  // Extract and clean Global Customizations
  const flavorPills: string[] = [];
  const extraPills: string[] = [];

  const cleanItemVal = (v: string) =>
    v.replace(/（\s*[^）]*缺貨[^）]*）/g, '')
     .replace(/\(\s*[^)]*缺貨[^)]*\)/g, '')
     .trim();

  if (Array.isArray(customizations) && customizations.length > 0) {
    customizations.forEach(c => {
      const label = (c.label || '').replace(/✦/g, '').replace(/選擇|調整/g, '').replace(/\(朝天椒\)/g, '').replace(/（朝天椒）/g, '').trim();
      const val = cleanItemVal(c.value || '');
      if (label.includes('配料') || label.includes('加價') || label.includes('備註')) {
        extraPills.push(`${label}：${val}`);
      } else {
        flavorPills.push(val);
      }
    });
  } else if (order.content) {
    const lines = (order.content || "").split("\n");
    for (const rawLine of lines) {
      const l = rawLine.trim();
      if (l.includes("口味設定") || l.includes("客製化設定")) {
        const inlineFlavors = l.replace(/.*(?:口味設定|客製化設定)[：:]\s*/, '').replace(/[【】]/g, '').trim();
        if (inlineFlavors) {
          const parts = inlineFlavors.split(/[・·|]/).map(p => cleanItemVal(p.trim())).filter(Boolean);
          parts.forEach(p => {
            const pMatch = p.match(/([^：:]+)[：:]\s*(.+)/);
            if (pMatch) {
              const label = pMatch[1].replace(/✦/g, '').replace(/選擇|調整/g, '').replace(/\(朝天椒\)/g, '').replace(/（朝天椒）/g, '').trim();
              const val = cleanItemVal(pMatch[2].trim());
              if (label.includes('配料') || label.includes('加價')) {
                extraPills.push(`${label}：${val}`);
              } else {
                flavorPills.push(val);
              }
            } else {
              flavorPills.push(p);
            }
          });
        }
      }
      const match = l.match(/^[•\-*]\s*([^：:]+)[：:]\s*(.+)$/);
      if (match) {
        const label = match[1].replace(/✦/g, '').replace(/選擇|調整/g, '').replace(/\(朝天椒\)/g, '').replace(/（朝天椒）/g, '').trim();
        const val = cleanItemVal(match[2].trim());
        if (label.includes('配料') || label.includes('加價')) {
          extraPills.push(`${label}：${val}`);
        } else {
          flavorPills.push(val);
        }
      }
    }
  }

  const uniqueFlavors = Array.from(new Set(flavorPills.filter(Boolean)));
  const uniqueExtras = Array.from(new Set(extraPills.filter(Boolean)));

  // Format Items in a clean POS Table
  const itemComponents: any[] = [];
  const rawItems: OrderItemInput[] = Array.isArray(items) && items.length > 0 ? items : [];

  if (rawItems.length > 0) {
    let itemsSubtotalSum = 0;
    let bundleCategoryName = '';

    rawItems.slice(0, 30).forEach((it, idx) => {
      const itQty = Number(it.quantity) || 1;
      const itPrice = Number(it.price || it.unit_price) || 0;
      const itSubtotal = Number(it.subtotal) || (itPrice * itQty);
      const itName = it.name || "餐點";
      itemsSubtotalSum += itSubtotal;

      const catName = it.category || it.category_name || '';
      if (catName && (catName.includes('蔬菜') || catName.includes('配菜') || catName.includes('小菜') || catName.includes('組合'))) {
        bundleCategoryName = catName.split(' ')[0];
      }

      // Parse options / modifiers
      const optionTexts: string[] = [];
      const opts = it.options || it.selected_options;
      if (Array.isArray(opts)) {
        opts.forEach((o: any) => {
          if (typeof o === 'string' && o.trim()) {
            optionTexts.push(o.trim());
          } else if (o && typeof o === 'object') {
            const optName = o.choice || o.name || "";
            const optPrice = Number(o.price) || 0;
            if (optName) {
              optionTexts.push(optPrice > 0 ? `${optName} (+$${optPrice})` : optName);
            }
          }
        });
      } else if (typeof opts === 'string' && opts.trim()) {
        try {
          const parsed = JSON.parse(opts);
          if (Array.isArray(parsed)) {
            parsed.forEach((o: any) => {
              const optName = typeof o === 'string' ? o : (o.choice || o.name || "");
              const optPrice = Number(o.price) || 0;
              if (optName) optionTexts.push(optPrice > 0 ? `${optName} (+$${optPrice})` : optName);
            });
          }
        } catch {
          optionTexts.push(opts.trim());
        }
      }

      if (it.note && it.note.trim()) {
        optionTexts.push(it.note.trim());
      } else if (it.notes && it.notes.trim()) {
        optionTexts.push(it.notes.trim());
      }

      const isVi = (order.content || "").includes("Đợt") || (order.content || "").includes("Bàn số") || (order.content || "").includes("Mang về");

      // Parse bundle selections
      const rawBundle = it.bundleSelections || it.bundle_snapshot_json;
      let bundlePortions: any[] = [];
      if (rawBundle) {
        try {
          const bData = typeof rawBundle === 'string' ? JSON.parse(rawBundle) : rawBundle;
          bundlePortions = bData.portions || (Array.isArray(bData) ? (bData[0]?.groups ? bData : [{ groups: bData }]) : []);
        } catch (e) {
          console.warn("[buildOrderFlexMessage] Failed to parse bundle:", e);
        }
      }

      const itemBoxContents: any[] = [
        {
          type: "box",
          layout: "horizontal",
          alignItems: "center",
          contents: [
            {
              type: "text",
              text: itName,
              size: "sm",
              weight: "bold",
              color: "#1E293B",
              flex: 1,
              wrap: true
            },
            {
              type: "text",
              text: `x${itQty}`,
              size: "sm",
              color: "#64748B",
              flex: 0,
              margin: "md"
            },
            {
              type: "text",
              text: `$${itSubtotal}`,
              size: "sm",
              weight: "bold",
              color: "#0F172A",
              align: "end",
              flex: 0,
              margin: "md"
            }
          ]
        }
      ];

      if (bundlePortions.length > 0) {
        const bundleRows: any[] = [];
        bundlePortions.forEach((p: any, pIdx: number) => {
          const pNum = typeof p.portionIndex === 'number' ? p.portionIndex + 1 : pIdx + 1;
          const pPrefix = bundlePortions.length > 1 ? (isVi ? `Phần ${pNum}: ` : `第${pNum}份 `) : '';
          const groups = p.groups || [];
          groups.forEach((g: any) => {
            const groupName = g.groupName || g.group_name || (isVi ? 'Món kèm' : '搭配');
            (g.items || []).forEach((bi: any) => {
              const bName = bi.name || bi.item_name || '';
              const bQty = Number(bi.quantity) || 1;
              const bSur = Number(bi.surcharge || bi.price || 0);
              const label = `${pPrefix}${groupName}`;
              
              bundleRows.push({
                type: "box",
                layout: "horizontal",
                alignItems: "center",
                contents: [
                  {
                    type: "text",
                    text: label,
                    size: "xxs",
                    color: "#64748B",
                    flex: 2,
                    wrap: true
                  },
                  {
                    type: "text",
                    text: `${bName} x${bQty}`,
                    size: "xs",
                    color: "#1E293B",
                    weight: "bold",
                    flex: 3,
                    wrap: true
                  },
                  {
                    type: "text",
                    text: bSur > 0 ? `+$${bSur * bQty}` : " ",
                    size: "xs",
                    color: bSur > 0 ? "#0F172A" : "#64748B",
                    align: "end",
                    flex: 1
                  }
                ]
              });
            });
          });
        });

        if (bundleRows.length > 0) {
          itemBoxContents.push({
            type: "box",
            layout: "vertical",
            spacing: "xs",
            backgroundColor: "#F8FAFC",
            cornerRadius: "md",
            paddingAll: "8px",
            margin: "xs",
            contents: bundleRows
          });
        }
      }

      if (optionTexts.length > 0) {
        itemBoxContents.push({
          type: "text",
          text: `↳ ${optionTexts.join("、")}`,
          size: "xs",
          color: "#64748B",
          wrap: true,
          margin: "xs"
        });
      }

      itemComponents.push({
        type: "box",
        layout: "vertical",
        spacing: "none",
        margin: idx > 0 ? "md" : "none",
        contents: itemBoxContents
      });
    });

    const parsedTotal = Number(order.total) || 0;
    if (parsedTotal > 0 && itemsSubtotalSum > parsedTotal) {
      const discountAmount = itemsSubtotalSum - parsedTotal;
      const discountLabel = bundleCategoryName ? `${bundleCategoryName} 組合特惠` : "組合優惠折抵";
      itemComponents.push({
        type: "box",
        layout: "horizontal",
        alignItems: "center",
        backgroundColor: "#ECFDF5",
        cornerRadius: "md",
        paddingAll: "6px",
        margin: "md",
        contents: [
          {
            type: "text",
            text: `🏷️ ${discountLabel}`,
            size: "xs",
            weight: "bold",
            color: "#059669",
            flex: 1
          },
          {
            type: "text",
            text: `-$${discountAmount}`,
            size: "xs",
            weight: "bold",
            color: "#059669",
            align: "end",
            flex: 0
          }
        ]
      });
    }
  } else {
    // Fallback: Clean parse from order.content string
    const lines = (order.content || "").split("\n").map(l => l.trim()).filter(l => l.length > 0);
    const itemLines = lines.filter(l => {
      if (l.startsWith("[") || l.startsWith("【")) return false;
      if (l.includes("訂單編號") || l.includes("訂單內容") || l.includes("用餐方式") || l.includes("取餐時間") || l.includes("點餐時間") || l.includes("總金額") || l.includes("總備註") || l.includes("桌號") || l.includes("口味設定") || l.includes("客製化設定")) return false;
      if (l.startsWith("•") || l.startsWith("●") || l.startsWith("🧂") || l.startsWith("🧪") || l.startsWith("🎛️")) return false;
      return true;
    });

    itemLines.slice(0, 30).forEach((line, idx) => {
      const isOption = line.startsWith("↳") || line.startsWith("-") || line.startsWith("+") || line.startsWith("  ");
      const cleanLine = line.replace(/^[↳\-+]\s*/, "").replace(/[🍽️🛍️📦🎁🪑]/g, "").trim();

      if (isOption) {
        itemComponents.push({
          type: "text",
          text: `↳ ${cleanLine}`,
          size: "xs",
          color: "#64748B",
          wrap: true,
          margin: "xs"
        });
      } else {
        itemComponents.push({
          type: "text",
          text: cleanLine,
          size: "sm",
          weight: "bold",
          color: "#1E293B",
          wrap: true,
          margin: idx > 0 ? "md" : "none"
        });
      }
    });
  }

  return {
    type: "bubble",
    size: "kilo",
    body: {
      type: "box",
      layout: "vertical",
      paddingAll: "20px",
      spacing: "md",
      contents: [
        {
          type: "box",
          layout: "horizontal",
          contents: [
            { type: "text", text: "訂單明細", size: "xs", weight: "bold", color: "#64748B", flex: 0 },
            { type: "text", text: `#${order.displayKey || order.key}`, size: "sm", weight: "bold", color: "#059669", align: "end", flex: 1 }
          ]
        },
        {
          type: "box",
          layout: "horizontal",
          contents: [
            { type: "text", text: "用餐方式", size: "xs", color: "#64748B", flex: 0 },
            { type: "text", text: diningLabel, size: "sm", weight: "bold", color: isDineIn ? "#7C3AED" : "#059669", align: "end", flex: 1 }
          ]
        },
        { type: "separator", margin: "sm", color: "#E2E8F0" },
        {
          type: "box",
          layout: "vertical",
          spacing: "xs",
          contents: [
            { type: "text", text: "訂單品項", size: "xs", weight: "bold", color: "#64748B", margin: "xs" },
            ...itemComponents
          ]
        },
        ...(uniqueFlavors.length > 0 || uniqueExtras.length > 0 ? [
          { type: "separator", margin: "sm", color: "#E2E8F0" },
          {
            type: "box",
            layout: "vertical",
            backgroundColor: "#F8FAFC",
            cornerRadius: "md",
            paddingAll: "10px",
            spacing: "xs",
            contents: [
              {
                type: "text",
                text: "口味設定",
                size: "xxs",
                weight: "bold",
                color: "#94A3B8"
              },
              ...(uniqueFlavors.length > 0 ? [
                {
                  type: "text",
                  text: uniqueFlavors.join(" · "),
                  size: "xs",
                  weight: "bold",
                  color: "#1E293B",
                  wrap: true,
                  margin: "xs"
                }
              ] : []),
              ...uniqueExtras.map(ext => ({
                type: "text",
                text: ext,
                size: "xs",
                color: "#64748B",
                wrap: true,
                margin: "xs"
              }))
            ]
          }
        ] : []),
        ...(order.note && order.note.trim() ? [
          { type: "separator", margin: "sm", color: "#E2E8F0" },
          {
            type: "box",
            layout: "horizontal",
            contents: [
              { type: "text", text: "備註說明", size: "xs", color: "#64748B", flex: 0 },
              { type: "text", text: order.note.trim(), size: "xs", color: "#334155", wrap: true, align: "end", flex: 1 }
            ]
          }
        ] : []),
        { type: "separator", margin: "sm", color: "#E2E8F0" },
        {
          type: "box",
          layout: "horizontal",
          contents: [
            { type: "text", text: timeLabel, size: "xs", color: "#64748B", flex: 0 },
            { type: "text", text: String(order.time || "").replace(/\s*\([^)]*\)/g, '').trim(), size: "sm", weight: "bold", color: "#0F172A", align: "end", flex: 1, wrap: true }
          ]
        },
        {
          type: "box",
          layout: "horizontal",
          alignItems: "center",
          contents: [
            { type: "text", text: "總金額", size: "sm", weight: "bold", color: "#64748B", flex: 0 },
            { type: "text", text: `$${order.total}`, size: "xl", weight: "bold", color: "#059669", align: "end", flex: 1 }
          ]
        }
      ]
    },
    footer: {
      type: "box",
      layout: "vertical",
      paddingAll: "16px",
      spacing: "sm",
      contents: (() => {
        const liffBaseUrl = tenantCtx?.liffUrl || (tenantCtx?.liffId ? `https://liff.line.me/${tenantCtx.liffId}` : "https://liff.line.me/");
        const tenantId = tenantCtx?.tenantId || "benmi";
        const buttons: any[] = [];

        if (isDineIn) {
          const appendUrl = `${liffBaseUrl}?tenant_id=${encodeURIComponent(tenantId)}&parent_order_key=${encodeURIComponent(order.key)}&parent_display_key=${encodeURIComponent(order.displayKey || order.key)}&table_number=${encodeURIComponent(tableNum)}&mode=append`;
          buttons.push({
            type: "button",
            style: "primary",
            color: "#7C3AED",
            height: "sm",
            action: {
              type: "uri",
              label: "現場加點餐點",
              uri: appendUrl
            }
          });
        }

        buttons.push({
          type: "button",
          style: isDineIn ? "secondary" : "primary",
          color: isDineIn ? undefined : "#059669",
          height: "sm",
          action: {
            type: "postback",
            label: "查詢訂單進度",
            data: `action=check_progress&order_key=${order.key}`,
            displayText: "查詢訂單進度"
          }
        });

        return buttons;
      })()
    }
  };
}

export function buildProgressFlexMessage(order: Order, queueAheadCount: number, tenantCtx?: TenantContext | null): any {
  const isScheduled = tenantCtx?.allowScheduledPickup !== false;
  const isDineIn = order.diningOption === "dine_in" || (order.content || "").includes("📍 用餐方式：🍽️ 內用") || (order.content || "").includes("【內用】");
  const diningLabel = isDineIn ? "內用 (現場製作)" : "外帶自取";
  const timeLabel = isDineIn ? "點餐時間" : (isScheduled ? "預計取餐時間" : "訂餐時間");

  let statusTitle = "已收到訂單";
  let statusColor = "#059669";
  let queueText = "店家已收到您的訂單，店員將儘速為您確認！";

  if (order.status === "NEW") {
    statusTitle = "已收到訂單";
    statusColor = "#059669";
    queueText = "店家已收到您的訂單，店員將儘速為您確認！";
  } else if (order.status === "ACCEPTED") {
    statusTitle = "店家製作中";
    statusColor = "#2563EB";
    queueText = queueAheadCount > 0
      ? `前方還有 ${queueAheadCount} 張訂單正在排隊製作`
      : "您的餐點正由店家製作中！";
  } else if (order.status === "DONE") {
    statusTitle = isDineIn ? "餐點製作完成" : "餐點製作完成，可取餐！";
    statusColor = "#059669";
    queueText = isDineIn ? "" : "您的餐點已準備完畢，請儘快前來取餐！";
  } else if (order.status === "PICKED_UP") {
    statusTitle = isDineIn ? "已完成用餐" : "已完成取餐";
    statusColor = "#64748B";
    queueText = "感謝您的訂購，期待再次為您服務！";
  } else if (order.status === "WAITING_CUSTOMER_CHANGE" || order.status === "WAITING_CUSTOMER_REJECT") {
    statusTitle = "訂單微調確認中";
    statusColor = "#D97706";
    queueText = "請查看上方對話並回覆店家確認事項。";
  } else if (order.status === "REJECTED") {
    statusTitle = "訂單已取消";
    statusColor = "#DC2626";
    queueText = "該訂單已被取消。如有需要歡迎再次點餐。";
  }

  return {
    type: "bubble",
    size: "kilo",
    body: {
      type: "box",
      layout: "vertical",
      paddingAll: "20px",
      spacing: "md",
      contents: [
        {
          type: "box",
          layout: "horizontal",
          contents: [
            { type: "text", text: "訂單進度狀態", size: "xs", weight: "bold", color: "#64748B", flex: 0 },
            { type: "text", text: `#${order.displayKey || order.key}`, size: "sm", weight: "bold", color: "#0F172A", align: "end", flex: 1 }
          ]
        },
        {
          type: "text",
          text: statusTitle,
          weight: "bold",
          size: "lg",
          color: statusColor,
          wrap: true
        },
        ...(queueText ? [{
          type: "box",
          layout: "vertical",
          backgroundColor: "#F8FAFC",
          cornerRadius: "md",
          paddingAll: "12px",
          contents: [
            { type: "text", text: queueText, size: "sm", color: "#334155", wrap: true }
          ]
        }] : []),
        { type: "separator", margin: "sm", color: "#E2E8F0" },
        {
          type: "box",
          layout: "horizontal",
          contents: [
            { type: "text", text: "用餐方式", size: "xs", color: "#64748B", flex: 0 },
            { type: "text", text: diningLabel, size: "sm", weight: "bold", color: isDineIn ? "#7C3AED" : "#059669", align: "end", flex: 1 }
          ]
        },
        {
          type: "box",
          layout: "horizontal",
          contents: [
            { type: "text", text: timeLabel, size: "xs", color: "#64748B", flex: 0 },
            { type: "text", text: String(order.time || "").replace(/\s*\([^)]*\)/g, '').trim(), size: "sm", weight: "bold", color: "#0F172A", align: "end", flex: 1, wrap: true }
          ]
        },
        {
          type: "box",
          layout: "horizontal",
          alignItems: "center",
          contents: [
            { type: "text", text: "總金額", size: "sm", weight: "bold", color: "#64748B", flex: 0 },
            { type: "text", text: `$${order.total}`, size: "lg", weight: "bold", color: "#059669", align: "end", flex: 1 }
          ]
        }
      ]
    },
    footer: {
      type: "box",
      layout: "vertical",
      paddingAll: "16px",
      spacing: "sm",
      contents: (() => {
        const liffBaseUrl = tenantCtx?.liffUrl || (tenantCtx?.liffId ? `https://liff.line.me/${tenantCtx.liffId}` : "https://liff.line.me/");
        const tenantId = tenantCtx?.tenantId || "benmi";
        const tableNum = order.tableNumber || "";
        const buttons: any[] = [];

        if (isDineIn && (order.status === "NEW" || order.status === "ACCEPTED" || order.status === "DONE")) {
          const appendUrl = `${liffBaseUrl}?tenant_id=${encodeURIComponent(tenantId)}&parent_order_key=${encodeURIComponent(order.key)}&parent_display_key=${encodeURIComponent(order.displayKey || order.key)}&table_number=${encodeURIComponent(tableNum)}&mode=append`;
          buttons.push({
            type: "button",
            style: "primary",
            color: "#7C3AED",
            height: "sm",
            action: {
              type: "uri",
              label: "現場加點餐點",
              uri: appendUrl
            }
          });
        }

        buttons.push({
          type: "button",
          style: "secondary",
          height: "sm",
          action: {
            type: "postback",
            label: "重新整理進度",
            data: `action=check_progress&order_key=${order.key}`,
            displayText: "查詢訂單進度"
          }
        });

        return buttons;
      })()
    }
  };
}

export function buildAppendConfirmationFlexMessage(
  order: Order,
  newItemsText: string,
  addedAmount: number,
  roundNumber: number,
  tenantCtx?: TenantContext | null
): any {
  let rawTable = (order.tableNumber || "").trim();
  if (!rawTable || rawTable === "-") {
    const tableMatch = (order.content || "").match(/(?:桌號|Bàn)[：:\s]*([^\n\r,，()（）]+)/i) ||
      (order.note || "").match(/(?:桌號|Bàn)[：:\s]*([^\n\r,，()（）]+)/i);
    if (tableMatch) rawTable = tableMatch[1].trim();
  }

  rawTable = rawTable
    .replace(/^(?:桌號|Bàn)[：:\s]*/i, "")
    .replace(/[：:]/g, "")
    .replace(/[()（）]/g, "")
    .replace(/號桌/g, "")
    .replace(/桌/g, "")
    .trim();

  const displayTable = rawTable || "-";

  const contentLines = (newItemsText || "").split("\n").filter(l => l.trim().length > 0);
  const contentComponents = contentLines.slice(0, 30).map(line => {
    const isOption = line.startsWith("↳") || line.startsWith("-") || line.startsWith("+") || line.startsWith("  ");
    return {
      type: "text",
      text: line,
      size: isOption ? "xs" : "sm",
      color: isOption ? "#64748B" : "#1E293B",
      weight: isOption ? "regular" : "bold",
      wrap: true
    };
  });

  const liffBaseUrl = tenantCtx?.liffUrl || (tenantCtx?.liffId ? `https://liff.line.me/${tenantCtx.liffId}` : "https://liff.line.me/");
  const tenantId = tenantCtx?.tenantId || "benmi";

  return {
    type: "bubble",
    size: "kilo",
    body: {
      type: "box",
      layout: "vertical",
      paddingAll: "20px",
      spacing: "md",
      contents: [
        {
          type: "box",
          layout: "horizontal",
          contents: [
            { type: "text", text: `現場加點 (第 ${roundNumber} 輪)`, size: "xs", weight: "bold", color: "#7C3AED", flex: 0 },
            { type: "text", text: `#${order.displayKey || order.key}`, size: "sm", weight: "bold", color: "#0F172A", align: "end", flex: 1 }
          ]
        },
        {
          type: "box",
          layout: "horizontal",
          contents: [
            { type: "text", text: "桌號", size: "xs", color: "#64748B", flex: 0 },
            { type: "text", text: `${displayTable} 桌`, size: "sm", weight: "bold", color: "#7C3AED", align: "end", flex: 1 }
          ]
        },
        { type: "separator", margin: "sm", color: "#E2E8F0" },
        {
          type: "box",
          layout: "vertical",
          spacing: "xs",
          contents: [
            { type: "text", text: "本次加點品項", size: "xs", weight: "bold", color: "#64748B", margin: "xs" },
            ...contentComponents
          ]
        },
        ...(order.note ? [
          { type: "separator", margin: "sm", color: "#E2E8F0" },
          {
            type: "box",
            layout: "horizontal",
            contents: [
              { type: "text", text: "備註說明", size: "xs", color: "#64748B", flex: 0 },
              { type: "text", text: order.note, size: "xs", color: "#334155", wrap: true, align: "end", flex: 1 }
            ]
          }
        ] : []),
        { type: "separator", margin: "sm", color: "#E2E8F0" },
        {
          type: "box",
          layout: "horizontal",
          contents: [
            { type: "text", text: "本次加點金額", size: "xs", color: "#64748B", flex: 0 },
            { type: "text", text: `+$${addedAmount}`, size: "sm", weight: "bold", color: "#7C3AED", align: "end", flex: 1 }
          ]
        },
        {
          type: "box",
          layout: "horizontal",
          alignItems: "center",
          contents: [
            { type: "text", text: "累計總金額", size: "sm", weight: "bold", color: "#64748B", flex: 0 },
            { type: "text", text: `$${order.total}`, size: "xl", weight: "bold", color: "#059669", align: "end", flex: 1 }
          ]
        }
      ]
    },
    footer: {
      type: "box",
      layout: "vertical",
      paddingAll: "16px",
      spacing: "sm",
      contents: [
        {
          type: "button",
          style: "primary",
          color: "#7C3AED",
          height: "sm",
          action: {
            type: "uri",
            label: "再次加點",
            uri: `${liffBaseUrl}?tenant_id=${encodeURIComponent(tenantId)}&parent_order_key=${encodeURIComponent(order.key)}&parent_display_key=${encodeURIComponent(order.displayKey || order.key)}&table_number=${encodeURIComponent(rawTable || '')}&mode=append`
          }
        },
        {
          type: "button",
          style: "secondary",
          height: "sm",
          action: {
            type: "postback",
            label: "查詢訂單進度",
            data: `action=check_progress&order_key=${order.key}`,
            displayText: "查詢訂單進度"
          }
        }
      ]
    }
  };
}
