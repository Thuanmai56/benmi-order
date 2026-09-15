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
- Printer suite & Bundle Regression: **15/15 đạt**; `test_order_print_subtotal_bundle.cjs` xác thực bảo toàn `subtotal` lịch sử, render bundle snapshot và tách tem TSPL 40x30mm.
- Wrangler production `deploy --dry-run`: đạt; bundle 249.58 KiB, gzip 49.88 KiB.
- Cache-buster đã tăng trong `index.html` (`20260915_release_rebase_v1`) và `orders.html` (`20260915_print_subtotal_bundle_v1`).
- Không còn marker conflict; `git diff --check` sạch sau khi stage các thay đổi hiện tại.

## Rủi ro chặn release

1. ~~**Sai/thiếu dữ liệu in món:**~~ (ĐÃ KHẮC PHỤC): `attachOrderPrintItems` đã bổ sung `subtotal` và `bundle_snapshot_json`. `PrinterService.parseOrderItems()` đã ưu tiên `subtotal` lịch sử, format đầy đủ bundle selections vào options và tính fallback phụ thu chính xác. Đã bổ sung bộ test regression `tests/test_order_print_subtotal_bundle.cjs`.
2. **Đã xác minh D1 production:** migration ledger báo không còn migration áp dụng; schema production có `subtotal` và `bundle_snapshot_json`. Production hiện có 3.562 orders, 8.623 order items, 0 dòng thiếu `subtotal`, 49 dòng có bundle snapshot. Có 186 dòng có `subtotal` khác `unit_price * quantity`, nên việc đọc đúng subtotal lịch sử là cần thiết.
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
