# Production migration to Cloudflare cf — 2026-10-07

## Impact assessment

Operational impact is expected to be negligible. This release changes deployment tooling only and starts from production `main` commit `5f51651`; it excludes all unreleased `dev` features.

- No application source, frontend assets, database schema, or data changes.
- `cf migrate` converted the existing production configuration. Worker name, account, D1, KV, LIFF variables, Secrets Store references, compatibility date, and observability settings are preserved.
- Production Worker: `benmi-worker-official`; compatibility date: `2026-03-28`.
- All eight configured bindings match the live version. The additional ordinary secret `ORDER_DOMAIN_ADMIN_KEY` is retained by cf's `keepSecrets` upload behavior; verify it after deployment.
- Live JavaScript and the new build are identical after TypeScript parsing/printing removes comments and formatting. Both normalized SHA-256 hashes are `d6fad88f55b155da89e74dff92ac05df381b54d944be4e16c980b4e9d85d59b7`.
- Validation passed: six CLI/config tests, backend TypeScript check, frontend static check, production build, and prebuilt deployment dry run.
- Baseline health, menu, tenant bootstrap, and CORS OPTIONS requests succeeded. No D1 migrations or seed/copy scripts are part of this deployment.

Residual risk is the normal Worker deployment risk and using a beta CLI. Dependencies are pinned (`cf` 1.0.0-beta.12, internal Wrangler bundler 4.148.0); use Node.js 24. [Cloudflare migration documentation](https://developers.cloudflare.com/cf/wrangler/migrate/).

## Deployment and rollback

Previous production version: `76c0e90d-afb5-41f8-8fce-c18b259c5e6d` (100% traffic).

Deploy the verified build from `benmi-worker-official/`:

```sh
npx cf deploy --mode production --prebuilt --tag cf-cli-20261007 --message "CLI-only migration; production runtime and bindings unchanged"
```

If verification fails, restore the previous version:

```sh
CLOUDFLARE_ACCOUNT_ID=525bb177ae7306325d13269246769f50 npx cf workers deployments create --worker benmi-worker-official --strategy percentage --versions '[{"version_id":"76c0e90d-afb5-41f8-8fce-c18b259c5e6d","percentage":100}]'
```

Deployment result and verification are recorded below after the production operation.
