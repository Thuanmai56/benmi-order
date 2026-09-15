# Báo cáo readiness: dev lên main

**Ngày:** 15/09/2026  
**Phạm vi:** rebase `dev` lên `origin/main`, kiểm tra trước release production  
**Kết luận:** **CHƯA ĐƯỢC RELEASE**

## Trạng thái Git

- Rebase đã hoàn tất thành công trên `dev` tại commit `79a28c6c0386ee27a8d2801b41ef956510455e49`.
- Đã tạo nhánh dự phòng trước rebase: `codex/dev-before-release-rebase-20260915`.
- Rebase đã xử lý các xung đột liên quan order identity, customization, menu editor, in hóa đơn và startup modal.
- `dev` hiện đã lệch lịch sử với `origin/dev` (`ahead 144, behind 157`) do rebase; cần push bằng `--force-with-lease` sau khi được duyệt.
- Chưa merge hoặc push vào `main`.

## Kiểm tra đã đạt

- `npm test`: đạt; static analyzer, scope check và routing test đều đạt.
- `npx tsc --noEmit` trong `benmi-worker-official`: đạt.
- Customization editor test: đạt; đủ I18N `zh-TW`/`vi`, serialize 2 tầng và stock sync.
- Order identity suite: **17/17 đạt**; kiểm tra migration, retry idempotency, tenant scope, alias lookup, LINE legacy và immutable identity.
- Printer suite: **14/14 đạt** với mock TCP printer; ESC/POS, TSPL, 3 mức in và dedup đều đạt.
- Wrangler production `deploy --dry-run`: đạt; bundle 249.58 KiB, gzip 49.88 KiB.
- Cache-buster đã tăng trong `index.html` và `orders.html` lên `20260915_release_rebase_v1`.
- Không còn marker conflict; `git diff --check` sạch sau khi stage các thay đổi hiện tại.

## Rủi ro chặn release

1. **Sai/thiếu dữ liệu in món:** API `attachOrderPrintItems` hiện chỉ trả `item_name`, `quantity`, `unit_price`, `selected_options`, `notes`, `round_number`; không trả `subtotal` và snapshot bundle. `PrinterService.parseOrderItems()` ưu tiên `order.items`, nên combo hoặc phụ thu có thể thiếu chi tiết và tổng dòng in sai. Cần sửa và thêm test regression trước release.
2. **Chưa xác minh được D1 production:** `wrangler d1 migrations list blab-db-production --remote` bị Cloudflare từ chối với mã `7403` (account không hợp lệ hoặc không có quyền). Chưa thể xác nhận migration ledger, schema production hay trạng thái backfill.
3. **Chưa có browser E2E:** test Playwright/POS bị môi trường từ chối khởi chạy Chrome; cần chạy lại trên máy/CI có quyền mở Chrome.
4. **KV dev/staging dùng cùng namespace ID** trong `wrangler.jsonc`; cần xác nhận đây là chủ ý trước khi deploy staging/production để tránh cache chéo.
5. GitHub Actions hiện chỉ có các run PR-Agent trên commit cũ; chưa có CI run cho commit sau rebase.

## Điều kiện bắt buộc trước release

1. Sửa `order-print-items.ts`/printer mapping để bảo toàn `subtotal`, bundle selections và option surcharge; thêm test cho combo và phụ thu.
2. Chạy lại đầy đủ `npm test`, TypeScript, order identity, printer và browser E2E.
3. Có quyền Cloudflare hợp lệ để đọc migration production; đối chiếu migration ledger và D1 schema trước khi apply.
4. Xác nhận KV namespace isolation giữa dev, staging và production.
5. Push `dev` sau rebase bằng `git push --force-with-lease`, mở/kiểm tra PR vào `main`, chờ CI xanh, rồi mới merge.

## Rollback

Nhánh `codex/dev-before-release-rebase-20260915` giữ nguyên trạng `dev` trước rebase. Nếu cần khôi phục lịch sử local, dùng nhánh này để đối chiếu; không rewrite hoặc xóa dữ liệu D1 trong rollback.
