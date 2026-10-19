// Durable cancellation inbox. Poll independently of /api/orders' ETag.
(function () {
  let requests = [], technicalAlerts = [], etag = '', tenant = '', fetching = false, loaded = false, offline = false;
  let selectedId = null, reasonRequestId = null, previousFocus = null, busy = false, settings = { enabled: false, review: .6, clear: .9 };
  const known = new Set();
  const el = id => document.getElementById(id);
  const tr = (key, params) => t('cancel' + key, params);
  const escape = value => escapeHtml(value);
  const pending = () => requests.filter(r => r.status === 'PENDING');
  const time = value => new Date(value).toLocaleString(window.currentLang === 'vi' ? 'vi-VN' : 'zh-TW');
  const badge = r => tr(r.customer_withdrew ? 'Withdrew' : r.clarity === 'clear' ? 'Clear' : r.clarity === 'unavailable' ? 'Unclassified' : 'Review');

  window.getPendingCancellation = key => pending().find(r => r.order_key === key) || null;
  window.renderCancellationBadge = key => {
    const r = window.getPendingCancellation(key);
    return r ? `<button type="button" class="tile-badge cancel-badge" data-cancel-request="${escape(r.id)}">${typeof POS_SVG !== 'undefined' && POS_SVG.alert ? POS_SVG.alert : ''}${escape(badge(r))}</button>` : '';
  };

  function renderBanner() {
    const banner = el('cancellation-banner');
    if (!banner) return;
    const count = pending().length, failed = requests.filter(r => r.notification_status === 'failed').length;
    banner.hidden = !count && !failed && !technicalAlerts.length && !offline;
    const label = el('cancellation-banner-label');
    if (label) {
      const icon = typeof POS_SVG !== 'undefined' && POS_SVG.alert ? POS_SVG.alert : '';
      const text = offline ? tr('Offline') : [count ? tr('Count', { count }) : '', failed ? tr('FailedCount', { count: failed }) : '', technicalAlerts.length ? tr('TechnicalCount', { count: technicalAlerts.length }) : ''].filter(Boolean).join(' · ');
      label.innerHTML = `${icon}<span>${escape(text)}</span>`;
    }
    const button = el('cancellation-banner-open');
    if (button) { button.textContent = tr('Open'); button.disabled = !requests.length && !technicalAlerts.length; }
    window.refreshCancellationReview();
  }

  window.refreshCancellationReview = function () {
    const summary = el('review-cancellation-summary');
    const r = window.getPendingCancellation(typeof reviewingOrder !== 'undefined' ? reviewingOrder?.key : null);
    if (summary) {
      summary.hidden = !r;
      summary.innerHTML = r ? `<span>${escape(tr('Hold'))}</span><button type="button" class="btn" data-cancel-request="${escape(r.id)}">${escape(tr('Open'))}</button>` : '';
    }
    ['review-actions', 'review-actions-accepted', 'review-actions-done', 'review-actions-waiting'].forEach(id => {
      const group = el(id);
      if (!group) return;
      group.querySelectorAll('button').forEach(button => {
        if (r) {
          if (button.dataset.cancelWasDisabled === undefined) button.dataset.cancelWasDisabled = String(button.disabled);
          button.disabled = true;
          button.title = tr('Hold');
        } else if (button.dataset.cancelWasDisabled !== undefined) {
          button.disabled = button.dataset.cancelWasDisabled === 'true';
          delete button.dataset.cancelWasDisabled;
          button.removeAttribute('title');
        }
      });
    });
  };

  window.fetchCancellationRequests = async function (force = false) {
    if (fetching) return;
    const nextTenant = getTenantIdFromUrl();
    if (!nextTenant) return;
    if (tenant !== nextTenant) { tenant = nextTenant; requests = []; technicalAlerts = []; etag = ''; loaded = false; known.clear(); selectedId = null; }
    const currentTenant = tenant;
    fetching = true;
    try {
      const headers = { 'X-Tenant-ID': currentTenant };
      if (etag && !force) headers['If-None-Match'] = etag;
      const response = await fetch(`${WORKER_BASE}/api/order-cancellation-requests?tenant_id=${encodeURIComponent(currentTenant)}`, { headers });
      if (response.status === 404) return; // New POS remains compatible before backend rollout.
      if (response.status === 304) { offline = false; renderBanner(); return; }
      if (!response.ok) throw new Error('CANCELLATION_SYNC_FAILED');
      const data = await response.json();
      if (currentTenant !== getTenantIdFromUrl()) return;
      if (!Array.isArray(data.requests)) throw new Error('CANCELLATION_BAD_FEED');
      const previousVersions = new Map(requests.map(r => [r.id, r.version]));
      requests = data.requests;
      technicalAlerts = Array.isArray(data.technicalAlerts) ? data.technicalAlerts : [];
      etag = response.headers.get('ETag') || '';
      let arrival = false;
      pending().forEach(r => { if (!known.has(r.id) && loaded) arrival = true; known.add(r.id); });
      if (arrival && typeof playTone === 'function') playTone(660, 220, 'sine', .16);
      loaded = true; offline = false;
      renderBanner();
      if (typeof renderAll === 'function') renderAll();
      if (el('cancellationModal')?.style.display === 'flex') renderDialog(previousVersions.get(selectedId) !== requests.find(r => r.id === selectedId)?.version);
    } catch {
      offline = true; renderBanner();
    } finally { fetching = false; }
  };

  function renderDialog(changed = false) {
    const body = el('cancellation-body');
    if (!body) return;
    const footer = el('cancellation-actions');
    if (footer) { footer.hidden = true; footer.innerHTML = ''; }
    const reason = reasonRequestId === selectedId ? el('cancellation-reason')?.value || '' : '';
    reasonRequestId = selectedId;
    const focusedId = document.activeElement?.id;
    const selectionStart = el('cancellation-reason')?.selectionStart;
    const title = el('cancellation-title');
    if (title) title.textContent = tr('Title');
    const close = el('cancellation-close');
    if (close) close.textContent = tr('Close');
    if (!selectedId) {
      const rows = requests.filter(r => r.status === 'PENDING' || r.notification_status === 'failed');
      const requestRows = rows.map(r => `<button type="button" class="cancel-request-row" data-cancel-request="${escape(r.id)}">
        <span><strong>#${escape(r.display_key)}</strong> · ${escape(r.customer_name)}</span><span>${escape(r.status === 'PENDING' ? badge(r) : tr('SendFailed'))}</span>
        <span>${escape(time(r.created_at))}</span></button>`).join('');
      const alertRows = technicalAlerts.map(a => `<article class="cancel-technical-alert"><p>${escape(tr('TechnicalMessage'))}</p>
        <p>#${escape(a.display_key)} · ${escape(time(a.created_at))}</p>
        <button type="button" class="btn" data-cancel-alert="${escape(a.id)}">${escape(tr('Acknowledge'))}</button></article>`).join('');
      body.innerHTML = requestRows || alertRows ? `<div class="cancel-request-list">${requestRows}</div>${alertRows}` : `<p>${escape(tr('Empty'))}</p>`;
      return;
    }
    const r = requests.find(item => item.id === selectedId);
    if (!r) { selectedId = null; renderDialog(); return; }
    const order = typeof latestOrders !== 'undefined' ? latestOrders.find(o => o.key === r.order_key) : null;
    const held = r.status === 'PENDING';
    const messages = Array.isArray(r.messages) ? r.messages : [];
    body.innerHTML = `<div class="cancel-detail-grid"><section class="cancel-order-context">
      <button type="button" class="btn btn-ghost" id="cancellation-back">${escape(tr('Back'))}</button>
      <h3>#${escape(r.display_key)}</h3><p>${escape(r.customer_name)}</p>
      <dl><dt>${escape(tr('OrderState'))}</dt><dd>${escape(cancelOrderState(r.order_status))}</dd>
      <dt>${escape(tr('Pickup'))}</dt><dd>${escape(r.pickup_time)}</dd><dt>${escape(tr('Total'))}</dt><dd>${escape(r.total_amount)}</dd></dl>
      ${r.selected_latest ? `<p class="cancel-latest-note">${escape(tr('Latest'))}</p>` : ''}
      <pre class="cancel-order-content">${escape(order?.content || '')}</pre>
    </section><section class="cancel-decision-panel"><p class="cancel-clarity">${escape(held ? badge(r) : tr('Status' + r.status))}</p>
      ${held && r.customer_withdrew ? `<p class="cancel-update-note" role="status">${escape(tr('WithdrewHint'))}</p>` : ''}
      ${changed ? `<p class="cancel-update-note" role="status">${escape(tr('Changed'))}</p>` : ''}
      <div class="cancel-message-list">${messages.map(m => `<article><time>${escape(time(m.event_at))}</time>
      <p>${escape(m.unsent ? tr('Unsent') : m.message_text || tr('Removed'))}</p></article>`).join('')}</div>
      <div id="cancellation-error" class="cancel-error" role="alert"></div>
      ${held ? `<p class="cancel-hold-note">${escape(tr('Hold'))}</p>
      <label for="cancellation-reason">${escape(tr('Reason'))}</label><textarea id="cancellation-reason" maxlength="500" rows="3">${escape(reason)}</textarea>` :
      `<p>${escape(r.resolution_reason || '')}</p><p role="status">${escape(tr(r.notification_status === 'sent' ? 'Sent' : r.notification_status === 'failed' ? 'SendFailed' : r.status === 'DISMISSED' || r.status === 'SUPERSEDED' ? 'NoSend' : 'Sending'))}</p>
      ${r.notification_status === 'failed' ? `<button type="button" class="btn" id="cancellation-retry">${escape(tr('Retry'))}</button>` : ''}`}
      </section></div>`;
    if (held && footer) {
      footer.hidden = false;
      footer.innerHTML = `<div class="cancel-decision-actions"><button type="button" class="btn cancel-approve" data-cancel-decision="APPROVED">${escape(tr('Approve'))}</button>
      <button type="button" class="btn" data-cancel-decision="DECLINED">${escape(tr('Decline'))}</button>
      <button type="button" class="btn btn-ghost" data-cancel-decision="DISMISSED">${escape(tr('Dismiss'))}</button></div>`;
      footer.querySelectorAll('[data-cancel-decision]').forEach(button => { button.disabled = busy; button.onclick = () => resolve(button.dataset.cancelDecision); });
    }
    const back = el('cancellation-back');
    if (back) back.onclick = () => { selectedId = null; renderDialog(); };
    const retry = el('cancellation-retry');
    if (retry) retry.onclick = async () => {
      retry.disabled = true;
      try {
        const response = await fetch(`${WORKER_BASE}/api/order-cancellation-requests/${encodeURIComponent(r.id)}/retry-notification?tenant_id=${encodeURIComponent(tenant)}`, { method: 'POST' });
        if (!response.ok) throw new Error();
        await window.fetchCancellationRequests(true);
      } catch { el('cancellation-error').textContent = tr('Failed'); retry.disabled = false; }
    };
    if (focusedId && el(focusedId)) {
      el(focusedId).focus();
      if (focusedId === 'cancellation-reason' && Number.isInteger(selectionStart)) el(focusedId).setSelectionRange(selectionStart, selectionStart);
    }
  }

  function cancelOrderState(status) {
    const keys = { NEW: 'New', ACCEPTED: 'Accepted', DONE: 'Ready', WAITING_CUSTOMER_CHANGE: 'Waiting', WAITING_CUSTOMER_REJECT: 'Waiting', REJECTED: 'Cancelled', PICKED_UP: 'Picked', PAID: 'Paid' };
    return tr('Order' + (keys[status] || 'Waiting'));
  }

  async function resolve(decision) {
    if (busy) return;
    const r = requests.find(item => item.id === selectedId);
    if (!r || r.status !== 'PENDING') return;
    const error = el('cancellation-error'), reason = el('cancellation-reason')?.value.trim() || '';
    if (decision === 'DECLINED' && !reason) { error.textContent = tr('ReasonRequired'); el('cancellation-reason')?.focus(); return; }
    if (decision === 'APPROVED' && !confirm(tr('Confirm', { order: r.display_key }))) return;
    const expected = r.version;
    busy = true; renderDialog();
    try {
      const response = await fetch(`${WORKER_BASE}/api/order-cancellation-requests/${encodeURIComponent(r.id)}/resolve?tenant_id=${encodeURIComponent(tenant)}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ decision, expected_version: expected, reason })
      });
      if (response.status === 409) {
        await window.fetchCancellationRequests(true);
        el('cancellation-error').textContent = tr('Conflict'); return;
      }
      if (!response.ok) throw new Error();
      if (typeof localOverrides !== 'undefined') delete localOverrides[r.order_key];
      if (typeof lastOrdersETag !== 'undefined') lastOrdersETag = '';
      await Promise.all([window.fetchCancellationRequests(true), fetchOrders()]);
    } catch { const node = el('cancellation-error'); if (node) node.textContent = tr('Failed'); }
    finally { busy = false; el('cancellation-actions')?.querySelectorAll('[data-cancel-decision]').forEach(button => { button.disabled = false; }); }
  }

  window.openCancellationRequests = function (id = null) {
    previousFocus = document.activeElement;
    selectedId = id;
    renderDialog();
    const modal = el('cancellationModal');
    if (modal) { modal.style.display = 'flex'; el('cancellation-close')?.focus(); }
  };
  window.closeCancellationRequests = function () {
    if (busy) return;
    const modal = el('cancellationModal');
    if (modal) modal.style.display = 'none';
    selectedId = null;
    if (previousFocus?.isConnected) previousFocus.focus();
  };
  async function acknowledgeAlert(button) {
    const currentTenant = tenant;
    button.disabled = true;
    try {
      const response = await fetch(`${WORKER_BASE}/api/order-cancellation-alerts/${encodeURIComponent(button.dataset.cancelAlert)}/acknowledge?tenant_id=${encodeURIComponent(currentTenant)}`, {
        method: 'POST', headers: { 'X-Tenant-ID': currentTenant }
      });
      if (!response.ok) throw new Error();
      await window.fetchCancellationRequests(true);
    } catch { button.disabled = false; button.textContent = tr('Failed'); }
  }
  document.addEventListener('click', event => {
    const alertButton = event.target.closest?.('[data-cancel-alert]');
    if (alertButton) { event.stopPropagation(); void acknowledgeAlert(alertButton); return; }
    const button = event.target.closest?.('[data-cancel-request]');
    if (button) { event.stopPropagation(); window.openCancellationRequests(button.dataset.cancelRequest); }
  }, true);
  document.addEventListener('keydown', event => {
    const modal = el('cancellationModal');
    if (!modal || modal.style.display !== 'flex') return;
    if (event.key === 'Escape') { event.preventDefault(); window.closeCancellationRequests(); }
    if (event.key === 'Tab') {
      const focusable = Array.from(modal.querySelectorAll('button:not(:disabled),textarea:not(:disabled)')).filter(node => node.getClientRects().length);
      const first = focusable[0], last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    }
  });
  window.renderCancellationUI = function () {
    document.querySelectorAll('[data-cancellation-i18n]').forEach(node => { node.textContent = tr(node.dataset.cancellationI18n); });
    renderBanner();
    if (selectedId || el('cancellationModal')?.style.display === 'flex') renderDialog();
  };
  window.setCancellationSettings = function (data) {
    settings = data.cancellationDetection || settings;
    const checkbox = el('cancellation-setting-enabled');
    if (checkbox) { checkbox.checked = !!settings.enabled; checkbox.disabled = !data.cancellationDetectionAvailable; }
    const hint = el('cancellation-setting-status');
    if (hint) hint.textContent = data.cancellationDetectionAvailable ? '' : tr('UnavailableSetting');
  };
  window.saveCancellationSetting = async function () {
    const checkbox = el('cancellation-setting-enabled');
    if (!checkbox) return;
    const enabled = checkbox.checked; checkbox.disabled = true;
    try {
      const response = await fetch(`${WORKER_BASE}/api/config?tenant_id=${encodeURIComponent(getTenantIdFromUrl())}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ cancellationDetection: { ...settings, enabled } })
      });
      if (!response.ok) throw new Error();
      settings.enabled = enabled; el('cancellation-setting-status').textContent = tr('Saved');
    } catch { checkbox.checked = !!settings.enabled; el('cancellation-setting-status').textContent = tr('SettingFailed'); }
    finally { checkbox.disabled = false; }
  };
  window.renderCancellationUI();
})();
