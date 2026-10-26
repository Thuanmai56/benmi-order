# LINE Pay v4 — Step 1: backend foundation

Status: implemented for local verification. No HTTP payment endpoints, frontend changes,
LINE Pay payment calls, scheduled jobs, remote migrations or deployment are included.
Base: `main` (`dd458af`); branch: `feat/linepay-v4-api`.

## Runtime and configuration

`cloudflare.config.ts` sets `LINE_PAY_ENABLED=false` in every mode. The separate
`LINE_PAY_DEPLOYMENT_ENV` binding is `dev`, `test` (including the staging alias), or
`production`. `assertLinePaySandboxRuntime` requires both `dev`/`test` and the exact
string `true`; missing bindings, truthy alternatives and production fail closed.
No environment secrets are provisioned by this step.

Future sandbox configuration needs:

| Setting | Storage | Meaning |
| --- | --- | --- |
| `LINE_PAY_ADMIN_KEY` | Worker secret or Secrets Store binding | Independent random admin key, 32–4096 characters; never the legacy admin fallback or store PIN. |
| `LINE_PAY_CREDENTIAL_KEY` | Worker secret or Secrets Store binding | Base64 encoding of 32 random bytes for AES-256-GCM. Keep it available for all historical credential versions. |
| Merchant channel ID/secret | Versioned credential row | LINE Pay merchant credentials, specific to a tenant. |
| `line_login_channel_id` | Merchant configuration row | LINE **Login** channel that issued the customer's LIFF access token. Configure explicitly; do not infer it from a LIFF ID or reuse the Pay/Messaging channel ID. |

LINE Login and Messaging channels must use the same LINE provider for user IDs on
existing orders to match. Customer APIs will reject orders without a matching owner;
anonymous orders and orders owned by another account are not payment candidates.
Changing public `tenant_config.features` cannot enable payments.

## Additive schema

Migration `0072_linepay_v4_foundation.sql` creates four empty tables:

- `linepay_merchant_configs`: one optional configuration per tenant, disabled by
  default, restricted to sandbox/TWD. Enabling requires a Login channel and a valid
  current credential reference. Absence of a row also means disabled.
- `linepay_merchant_credentials`: immutable merchant credential versions. The secret
  is an AES-GCM envelope `v1.<base64 nonce>.<base64 ciphertext + tag>`, bound to the
  tenant, credential version and Pay channel ID through authenticated additional data.
  A config is inserted disabled, its credential is inserted, then its current version
  can be selected. Credential rotation inserts a new version instead of overwriting history.
- `linepay_payments`: server order UUID, credential version, payer, immutable amount/
  currency snapshot, merchant order reference, callback hash, payment URLs and status.
  Composite foreign keys prohibit referencing another tenant's order or credentials.
  Transaction IDs are exact 19-digit TEXT values; payment amounts are positive safe integers.
- `linepay_operations`: REQUEST/CONFIRM/CHECK/REFUND operation journal with hashed
  idempotency key, request hash, claim/lease fields, provider result code and transaction ID.
  A key is unique within its tenant; its original operation and fingerprint cannot change.

Payment states are `CREATING`, `PENDING`, `CONFIRMING`, `PAID`, `REFUNDING`,
`REFUNDED`, `FAILED`, `CANCELLED`, `UNKNOWN`. One open/paid/unknown payment per
tenant/order is allowed; only FAILED/CANCELLED/REFUNDED release that slot. One
RUNNING/UNKNOWN operation per payment prevents a parallel money operation while
an outcome is unresolved. Reconciliation will resolve the original unknown operation
before allowing another mutation; it must not blindly retry it.

The migration adds a composite order identity index but changes no existing rows,
order statuses, totals or public response shapes. Existing writers keep working.
Financial records use restrictive foreign keys to retain history instead of cascading
away on deletion. Remote application remains a separate release action using `cf`.

Order/item mutation guards, authoritative eligibility/amount checks and provider-verified
status transitions belong to the Request/Confirm/Check API steps. The schema alone
does not implement those behaviors or claim that any payment has been collected.

## Internal interfaces for subsequent API steps

| Helper | Contract |
| --- | --- |
| `resolveLinePayTenantId(request)` | Require an explicit `tenant_id` query or `X-Tenant-ID` header. Reject duplicate/invalid/conflicting values; no legacy fallback tenant. |
| `loadLinePayTenantConfig(env, tenantId)` | Read active tenant and payment configuration directly from D1, fencing deleted/purging tenants. Return a disabled default for an unconfigured active tenant. No merchant secret or KV lookup. |
| `requireLinePayAdmin(request, env)` | Check only the dedicated `X-LinePay-Admin-Key`, using fixed-length hashes and Workers' native constant-time comparison. A missing/weak/broken configured secret returns 503; invalid credentials return 401. This authenticates the caller, not a tenant or money operation. |
| `requireLinePayCustomer(request, env, tenantId)` | Check runtime/config gates; verify Bearer token with LINE, require matching Login channel, positive lifetime and `profile` scope; retrieve the profile from LINE. Return `{tenantId,userId}` without trusting client profile data. |
| `loadOwnedLinePayOrder(env, customer, orderId)` | Require a server UUID and match tenant + authenticated user + active tenant in D1. Return `{orderId,orderKey,amount,status}`; missing, wrong-owner and cross-tenant orders all return 404. Receipt numbers are not accepted. |
| `encryptLinePayCredential` / `decryptLinePayCredential` | Read the encryption key from the binding, use a new 96-bit nonce for every encryption and reject modified ciphertext or mismatched tenant/version/channel. |
| `linePayErrorResponse(error)` | Return a machine error code with `Cache-Control: no-store` and `Referrer-Policy: no-referrer`; hide unexpected exceptions, upstream bodies, secrets and stacks. |

Future customer routes compose explicit tenant resolution, customer authentication and
ownership checks before reading/mutating a payment. Admin routes must authenticate,
resolve an active tenant and enforce runtime/operation gates separately; possession of
the admin key must never bypass sandbox restrictions. Every new route must catch
errors through `linePayErrorResponse`, avoiding the legacy router's fatal stack response.

LINE identity calls have a five-second timeout per call, deny redirects and bound
response bodies to 16 KiB. Invalid/expired/wrong-channel tokens return 401. Upstream
outages and malformed responses return a generic 503 without exposing provider errors.
There is no authentication cache and no payment network client in step 1.

## Validation

Use Node.js 24 LTS, `npm ci` at the root and in the backend, then:

```sh
npm run test:linepay-foundation
npm run check --prefix benmi-worker-official
npm run test:release
```

The foundation suite executes the real modules in workerd with local D1 and synthetic
data. LINE identity responses are mocked; no external customer or merchant account is used.
It covers legacy data preservation, default-off behavior, tenant/order/credential isolation,
immutable financial identity, exact transaction IDs, idempotency/operation exclusion,
production denial, admin authentication, LINE identity failures, ownership and AES-GCM tampering.
The suite is part of the existing release baseline.

Local verification on 2026-10-25 with Node.js 24.22.0: all 14 foundation test groups,
the Worker TypeScript check and all 19 release-baseline suites passed, including
Chromium/WebKit POS checks. Evidence is in the ignored local directory
`artifacts/release-baseline/2026-10-25T13-00-39-506Z/`.

The next delivery is only `PUT /api/admin/tenants/:tenantId/linepay` (step 2). Each
subsequent API will add its contract, handler and tests in a separate commit. Sandbox
payment E2E verification awaits the payment APIs and real sandbox credentials.

## References

- [LINE: using LIFF user data on the server](https://developers.line.biz/en/docs/liff/using-user-profile/)
- [LINE Login: verify access tokens and get profiles](https://developers.line.biz/en/reference/line-login/#verify-access-token)
- [LINE Pay Online API v4 and transaction IDs](https://developers-pay.line.me/online-api-v4/)
- [Cloudflare Workers Web Crypto](https://developers.cloudflare.com/workers/runtime-apis/web-crypto/)
- [Cloudflare D1 batch/transaction behavior](https://developers.cloudflare.com/d1/worker-api/d1-database/)
