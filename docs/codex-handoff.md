# Codex Handoff Notes

Use this file to help a future Codex session catch up quickly.

## Project Summary

This repo contains a Benmi food-ordering system:

- `index.html`: customer ordering page currently designed for LINE LIFF.
- `orders.html`: staff dashboard that polls orders every 5 seconds.
- `benmi-worker-official/src/worker.js`: Cloudflare Worker backend copied from the deployed Worker.
- `benmi-worker-official/wrangler.jsonc`: Cloudflare Worker config with KV binding `ORDER_STATE`.

## Current Backend Shape

The Worker uses Cloudflare KV for:

- Orders.
- Order index/cache.
- Menu.
- Store config.
- Pending LINE customer replies.
- Temporary dashboard auth links.

The current frontend calls:

```text
https://benmi-worker-official.thuanmnc.workers.dev
```

## Important Findings

- Dashboard write APIs exist but are not enforced by Worker-side auth.
- LINE webhook currently parses payloads without signature verification.
- Current customer order flow sends text through LINE LIFF, then the Worker parses that text.
- The proposed Zalo architecture should prefer direct JSON order creation instead of chat-text parsing.

## Docs Added

- `docs/current-architecture.md`: explains the existing Cloudflare + LINE architecture.
- `docs/zalo-cloudflare-proposal.md`: proposes the Zalo + Cloudflare replacement architecture.

## Recommended Next Steps

- Protect staff/dashboard write APIs in the Worker.
- Add webhook signature verification.
- Move hardcoded external URLs/secrets fully into Cloudflare secrets.
- For Zalo MVP, build signed order-session links and `POST /api/orders/create` JSON order creation.

