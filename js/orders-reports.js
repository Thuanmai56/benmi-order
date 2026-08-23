/**
 * Benmi POS - Product Sales & Item-Level Analytics Module (orders-reports.js)
 * High-performance, tablet-first analytics dashboard for multi-tenant stores.
 */

let currentReportRange = 'today';
let cachedReportData = null;
let isReportLoading = false;

function selectReportRange(range) {
  if (currentReportRange === range && cachedReportData) return;
  currentReportRange = range;
  
  document.querySelectorAll('.report-range-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.range === range);
    if (btn.dataset.range === range) {
      btn.style.background = 'var(--primary, #00b900)';
      btn.style.color = '#ffffff';
      btn.style.fontWeight = '900';
    } else {
      btn.style.background = 'transparent';
      btn.style.color = 'var(--text, #1e293b)';
      btn.style.fontWeight = '600';
    }
  });

  fetchReportData(range);
}

function refreshReportData() {
  fetchReportData(currentReportRange, true);
}

async function fetchReportData(range = 'today', forceRefresh = false) {
  const container = document.getElementById("reports-table-container");
  if (!container) return;

  if (isReportLoading) return;
  isReportLoading = true;

  if (!cachedReportData || forceRefresh) {
    container.innerHTML = `
      <div style="padding:48px 20px; text-align:center; color:var(--muted, #64748b);">
        <div class="spinner" style="width:32px; height:32px; border:3px solid #e2e8f0; border-top-color:var(--primary, #00b900); border-radius:50%; margin:0 auto 12px; animation:spin 0.8s linear infinite;"></div>
        <div style="font-weight:700; font-size:15px;">${t('loading')}</div>
      </div>
    `;
  }

  try {
    const tenantId = typeof currentTenantId !== "undefined" && currentTenantId ? currentTenantId : "benmi";
    const res = await fetch(`/api/reports/items-analytics?tenant_id=${encodeURIComponent(tenantId)}&range=${encodeURIComponent(range)}`, {
      headers: {
        "Accept": "application/json",
        "X-Tenant-ID": tenantId
      }
    });

    if (!res.ok) {
      throw new Error(`API error: ${res.status}`);
    }

    const data = await res.json();
    cachedReportData = data;
    renderReports(data);
  } catch (err) {
    console.error("[orders-reports] Failed to fetch report data:", err);
    container.innerHTML = `
      <div style="padding:40px 20px; text-align:center; color:#ef4444;">
        <div style="font-size:28px; margin-bottom:8px;">⚠️</div>
        <div style="font-weight:800; font-size:16px; margin-bottom:4px;">${t('processFail')}</div>
        <button class="btn btn-ghost" onclick="refreshReportData()" style="margin-top:12px; font-weight:700;">🔄 ${t('btnRefreshReports') || 'Thử lại'}</button>
      </div>
    `;
  } finally {
    isReportLoading = false;
  }
}

function renderReports(data) {
  if (!data) return;

  // 1. Update KPI Summary Cards
  const topItemNameEl = document.getElementById("kpi-top-item-name");
  const topItemSalesEl = document.getElementById("kpi-top-item-sales");
  const totalSoldEl = document.getElementById("kpi-total-sold");
  const totalRevEl = document.getElementById("kpi-total-revenue");
  const totalOrdersEl = document.getElementById("kpi-total-orders");
  const dateRangeEl = document.getElementById("kpi-date-range");
  const itemCountEl = document.getElementById("reports-item-count");

  if (data.topItem) {
    if (topItemNameEl) topItemNameEl.innerText = data.topItem.itemName;
    if (topItemSalesEl) topItemSalesEl.innerText = `${data.topItem.totalQuantity} ${t('portionUnit') || '份'} · $${data.topItem.totalSales.toLocaleString()}`;
  } else {
    if (topItemNameEl) topItemNameEl.innerText = "-";
    if (topItemSalesEl) topItemSalesEl.innerText = "-";
  }

  if (totalSoldEl) totalSoldEl.innerText = `${(data.totalItemsSold || 0).toLocaleString()} ${t('portionUnit') || '份'}`;
  if (totalRevEl) totalRevEl.innerText = `$${(data.totalRevenue || 0).toLocaleString()}`;
  if (totalOrdersEl) totalOrdersEl.innerText = `${(data.totalOrders || 0).toLocaleString()} ${t('orderUnit') || '單'}`;
  if (dateRangeEl) {
    dateRangeEl.innerText = (data.startDate === data.endDate) ? data.startDate : `${data.startDate} ~ ${data.endDate}`;
  }

  const items = Array.isArray(data.items) ? data.items : [];
  if (itemCountEl) itemCountEl.innerText = `${items.length} ${t('itemUnit') || '品項'}`;

  // 2. Render Table
  const container = document.getElementById("reports-table-container");
  if (!container) return;

  if (items.length === 0) {
    container.innerHTML = `
      <div style="padding:60px 20px; text-align:center; color:var(--muted, #64748b);">
        <div style="font-size:36px; margin-bottom:10px;">📊</div>
        <div style="font-weight:800; font-size:17px; color:#475569;">${t('emptyReports')}</div>
        <div style="font-size:13.5px; margin-top:4px; color:#94a3b8;">${t('reportsSub')}</div>
      </div>
    `;
    return;
  }

  const maxQty = Math.max(...items.map(it => it.totalQuantity || 1));
  const totalSoldAll = data.totalItemsSold || 1;

  let html = `
    <table style="width:100%; border-collapse:collapse; text-align:left; font-size:14.5px;">
      <thead>
        <tr style="background:#f8fafc; border-bottom:1.5px solid #e2e8f0; color:#64748b; font-weight:800; font-size:13px; text-transform:uppercase; letter-spacing:0.5px;">
          <th style="padding:14px 16px; width:70px; text-align:center;">${t('colRank')}</th>
          <th style="padding:14px 16px; min-width:200px;">${t('colItem')}</th>
          <th style="padding:14px 16px; width:120px;">${t('colCategory')}</th>
          <th style="padding:14px 16px; width:110px; text-align:right;">${t('colQuantity')}</th>
          <th style="padding:14px 16px; width:120px; text-align:right;">${t('colSales')}</th>
          <th style="padding:14px 16px; width:180px;">${t('colRatio')}</th>
          <th style="padding:14px 16px; min-width:220px;">${t('colOptions')}</th>
        </tr>
      </thead>
      <tbody>
  `;

  items.forEach((item, idx) => {
    const rank = idx + 1;
    let rankBadge = `<span style="font-weight:800; color:#64748b;">#${rank}</span>`;
    if (rank === 1) rankBadge = `<span style="background:#fef3c7; color:#b45309; font-weight:900; padding:3px 8px; border-radius:8px; border:1px solid #fde68a;">🥇 1</span>`;
    else if (rank === 2) rankBadge = `<span style="background:#f1f5f9; color:#475569; font-weight:900; padding:3px 8px; border-radius:8px; border:1px solid #cbd5e1;">🥈 2</span>`;
    else if (rank === 3) rankBadge = `<span style="background:#ffedd5; color:#c2410c; font-weight:900; padding:3px 8px; border-radius:8px; border:1px solid #fed7aa;">🥉 3</span>`;

    const ratioPercent = ((item.totalQuantity / totalSoldAll) * 100).toFixed(1);
    const barPercent = Math.round((item.totalQuantity / maxQty) * 100);

    // Options breakdown tags
    let optionsHtml = '<span style="color:#cbd5e1;">-</span>';
    if (item.optionsBreakdown && Object.keys(item.optionsBreakdown).length > 0) {
      const topOpts = Object.entries(item.optionsBreakdown)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 4);
      optionsHtml = topOpts.map(([name, cnt]) => 
        `<span style="display:inline-block; background:#f1f5f9; color:#334155; font-size:12px; font-weight:700; padding:2px 7px; border-radius:6px; margin:2px 4px 2px 0; border:1px solid #e2e8f0;">${escapeHtml(name)} <b style="color:var(--primary, #00b900);">x${cnt}</b></span>`
      ).join("");
    }

    html += `
      <tr style="border-bottom:1px solid #f1f5f9; transition:background 0.15s ease;" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background='transparent'">
        <td style="padding:14px 16px; text-align:center;">${rankBadge}</td>
        <td style="padding:14px 16px;">
          <div style="font-weight:900; font-size:16px; color:#0f172a;">${escapeHtml(item.itemName)}</div>
          <div style="font-size:12px; color:#64748b; margin-top:2px;">xuất hiện trong ${item.orderAppearances} ${t('orderUnit') || 'đơn'}</div>
        </td>
        <td style="padding:14px 16px;">
          <span style="background:#e0e7ff; color:#4338ca; font-size:12px; font-weight:800; padding:3px 8px; border-radius:6px;">${escapeHtml(item.categoryName || 'Món')}</span>
        </td>
        <td style="padding:14px 16px; text-align:right;">
          <span style="font-weight:900; font-size:17px; color:#0284c7;">${item.totalQuantity.toLocaleString()}</span>
          <span style="font-size:12px; color:#64748b; margin-left:2px;">${t('portionUnit') || '份'}</span>
        </td>
        <td style="padding:14px 16px; text-align:right; font-weight:900; font-size:16px; color:#16a34a;">
          $${item.totalSales.toLocaleString()}
        </td>
        <td style="padding:14px 16px;">
          <div style="display:flex; align-items:center; gap:8px;">
            <div style="flex:1; background:#e2e8f0; height:8px; border-radius:4px; overflow:hidden;">
              <div style="background:var(--primary, #00b900); width:${barPercent}%; height:100%; border-radius:4px;"></div>
            </div>
            <span style="font-size:12px; font-weight:800; color:#475569; width:42px; text-align:right;">${ratioPercent}%</span>
          </div>
        </td>
        <td style="padding:14px 16px;">
          <div style="display:flex; flex-wrap:wrap; align-items:center;">
            ${optionsHtml}
          </div>
        </td>
      </tr>
    `;
  });

  html += `
      </tbody>
    </table>
  `;

  container.innerHTML = html;
}
