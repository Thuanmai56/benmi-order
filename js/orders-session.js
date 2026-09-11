// Scope POS credentials to this platform origin and tenant. Store session tokens, never PINs.
(function installPosSessionTransport() {
  const nativeFetch = window.fetch.bind(window);
  const workerOrigin = new URL(WORKER_BASE).origin;
  const keyFor = tenant => `blab:pos-session:${workerOrigin}:${tenant}`;
  window.fetch = async function posFetch(input, init) {
    const url = new URL(typeof input === 'string' ? input : input.url, window.location.href);
    if (url.origin !== workerOrigin || !url.pathname.startsWith('/api/')) return nativeFetch(input, init);
    let tenant = url.searchParams.get('tenant_id') || url.searchParams.get('tenant') || getTenantIdFromUrl();
    const headers = new Headers(init?.headers || (typeof input !== 'string' ? input.headers : undefined));
    const token = sessionStorage.getItem(keyFor(tenant));
    if (token && !headers.has('Authorization')) headers.set('Authorization', `Bearer ${token}`);
    const response = await nativeFetch(input, { ...init, headers });
    if (url.pathname === '/api/auth' || url.pathname === '/api/auth/change') {
      const data = await response.clone().json().catch(() => null);
      if (response.ok && data?.session_token) {
        tenant = data.tenant_id || tenant;
        sessionStorage.setItem(keyFor(tenant), data.session_token);
      }
    } else if (response.status === 401) {
      const data = await response.clone().json().catch(() => null);
      if (data?.error === 'pos_session_required') {
        sessionStorage.removeItem(keyFor(tenant));
        if (typeof showStoreActivationModal === 'function') showStoreActivationModal();
      }
    }
    return response;
  };
})();
