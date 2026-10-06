#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
const args = process.argv.slice(2);
function option(name) { const i=args.indexOf(name); return i<0 ? undefined : args[i+1]; }
const tenantId=option('--tenant');
const domain=option('--domain');
const expectedDomain=option('--expected-domain');
const expectedLiffId=option('--expected-liff-id');
if (!tenantId || !/^[a-zA-Z0-9_-]+$/.test(tenantId) || !['legacy','blabfood'].includes(domain) ||
    !['legacy','blabfood'].includes(expectedDomain) || !expectedLiffId) {
  console.error('Usage: node scripts/set-order-domain.mjs --tenant ID --domain legacy|blabfood --expected-domain legacy|blabfood --expected-liff-id ID [--legacy-endpoint URL] [--apply]');
  process.exit(1);
}
const payload={customerOrderDomain:domain,expectedCustomerOrderDomain:expectedDomain,expectedLiffId};
const legacyEndpoint=option('--legacy-endpoint');
if (legacyEndpoint) payload.legacyLiffEndpointUrl=legacyEndpoint;
const url=`https://benmi-worker-official.thuanmnc.workers.dev/api/admin/tenants/${tenantId}/order-domain`;
if (!args.includes('--apply')) {
  console.log(JSON.stringify({dryRun:true,method:'PATCH',url,payload},null,2));
} else {
  const keyPath=path.join(os.homedir(),'.config','benmi-order','order-domain-admin-key');
  const key=process.env.ORDER_DOMAIN_ADMIN_KEY || fs.readFileSync(keyPath,'utf8').trim();
  if (!key) throw new Error('Order domain admin key is unavailable');
  const response=await fetch(url,{method:'PATCH',headers:{'Content-Type':'application/json','X-Admin-Key':key},body:JSON.stringify(payload),signal:AbortSignal.timeout(15000)});
  console.log(`HTTP ${response.status}\n${await response.text()}`);
  if (!response.ok) process.exitCode=1;
}
