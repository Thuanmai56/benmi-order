# R01 — Baseline hồi quy và checklist release

**Kết quả local: 17/17 suite đạt. CI Ubuntu lần đầu trên PR #74 đạt 16/17 suite do thiếu lịch sử Git. Bản sửa checkout đã kiểm chứng local và được người dùng xác nhận push; đang chờ kết quả CI ở commit mới.**

Người dùng đã cho phép bắt đầu R01, xác nhận “pussh nhánh”, rồi tự tạo PR #74 ngày 19/10/2026. Chưa có xác nhận merge, deploy thủ công, migration hoặc đổi cờ Cloudflare. Push nhánh có thể tạo Pages/Worker preview theo cấu hình Cloudflare. R02 chưa bắt đầu.

## Baseline và môi trường

- Nhánh: `codex/staff-order-r01-baseline`, tạo từ `main` đã đối chiếu remote.
- Base SHA: `512a642cde71a7a1626aa6d215fabbae858ae632`.
- Chạy 19/10/2026, 22:38:29–22:39:19 JST, khoảng 50 giây.
- Node `v24.22.0`, macOS arm64; `.nvmrc` và root package yêu cầu Node 24.
- Playwright khóa tại `1.64.1`, dùng Chromium revision `1248` và WebKit revision `2370` từ package, không tự chọn Chrome cài toàn máy.
- Đã cài sạch bằng `npm ci` ở cả root và backend; backend lockfile không thay đổi.
- 129 file ứng dụng/schema/config được fingerprint; không có thay đổi runtime so với base SHA. SHA-256: `f2b40c24f8246d0f38bbaffb641fb6b7b3443523a84c82a9d6a5a8ed39ade3e3`.

## Thay đổi đã chuẩn bị

1. Khai báo Playwright và thêm root lockfile để người khác/CI cài lại cùng dependency. Giữ `CHROME_PATH` cho chạy test riêng, nhưng release gate dùng browser đi kèm package đã khóa.
2. Thêm `npm run test:release`, chạy tuần tự 17 suite local, giới hạn thời gian từng suite, giữ kết quả cả khi có suite fail, thoát khác 0 khi có lỗi. Mỗi suite có log; toàn bộ run có `summary.json`, source fingerprint và hash input/lockfile.
3. Mở rộng test order identity bằng migration `0057` trên D1 local thật (Miniflare): giữ nguyên order/items, `source=legacy`, `table_id=null`, `revision=0`, và staff mặc định đóng cho cả hai tenant fixture. Các ca create/retry/append/status/history chạy tiếp trên schema đã bổ sung này, không dùng revision trigger của staging.
4. Thêm workflow `Release baseline`: Node 24, hai lần `npm ci`, cài Chromium/WebKit, chạy cùng lệnh release gate và giữ log/screenshot 14 ngày. Action được khóa bằng commit SHA; quyền chỉ `contents: read`; không có deployment step hoặc Cloudflare secret.
5. Thêm checklist cho scope/diff, baseline, cache-buster, môi trường API, schema, bật demo, tranh chấp, in và rollback. Mọi bước ngoài local vẫn có xác nhận riêng của người dùng.

Workflow chạy cho pull request vào `main/staging/dev`, push vào ba nhánh đó và manual dispatch. Người dùng đã mở PR #74, kích hoạt CI lần đầu trên Ubuntu: 16/17 suite đạt, test legacy thiếu lịch sử Git do shallow checkout. Chưa thay branch protection. Chi tiết: [r01-ci-check.md](./r01-ci-check.md).

## Kết quả kiểm chứng

| Suite | Kết quả | Phạm vi |
| --- | --- | --- |
| Frontend static | PASS | Cú pháp, global scope, khởi tạo script |
| Routing/lifecycle | PASS — 39 ca | Routing khách/LINE/domain, cô lập tenant và lifecycle |
| Worker types | PASS | TypeScript `--noEmit` |
| Cloudflare config | PASS — 6 ca | Đúng account/Worker/D1/KV theo môi trường, chặn chọn sai DB |
| Order identity | PASS — 19 ca | D1 local, schema `0057`, UUID, retry đồng thời, append/status/history |
| LINE receipts | PASS — 15 ca | Ghi nhận/gửi receipt, retry, ràng buộc người dùng/tenant |
| LIFF retry | PASS — 6 ca | Giới hạn retry, telemetry, lỗi kết nối |
| Menu safety | PASS — 16 ca | Update/delete, dữ liệu thiếu, rollback transaction, tenant isolation |
| Print identity | PASS | Mã hiển thị và dedup sau migration |
| Print items | PASS | Dữ liệu items cho in |
| Print sequence | PASS | Thứ tự bill/sticker và khả năng từng trạm |
| Print subtotals | PASS | Tổng tiền lịch sử, giá 0, phụ thu combo |
| Print canvas | PASS | Hóa đơn dài/ngắn, 58/80 mm, nội dung cuối |
| POS display Chromium | PASS | Hai ngôn ngữ × 7 viewport × 4 cỡ chữ, touch target, dialog, in, storage |
| POS display WebKit | PASS | Cùng ma trận hiển thị trên engine WebKit |
| POS live mobile | PASS | Hàng đợi, thao tác chạm, chuyển panel, scroll |
| POS detail scroll | PASS | Nút thao tác và cuộn chi tiết trên mobile/tablet/desktop |

Các suite Node test nêu số ca ở trên không có fail/skip. Kiểm tra cú pháp runner, parse YAML workflow, kiểm tra event/quyền/bước CI và `git diff --check` đều đạt.

Evidence đầy đủ local: `artifacts/release-baseline/2026-10-19T13-38-29-146Z/`, gồm 17 log, summary và screenshot Chromium/WebKit. Thư mục artifact nằm trong `.gitignore`; bản tóm tắt có hash log được lưu ở [r01-evidence.json](./r01-evidence.json).

## Chạy lại

Từ root repository với Node 24:

```sh
nvm use
npm ci
npm ci --prefix benmi-worker-official
npx --no-install playwright install chromium webkit
npm run test:release
```

Trên Ubuntu CI, cài browser bằng `npx --no-install playwright install --with-deps chromium webkit`. Browser của Playwright phụ thuộc phiên bản package; không dùng browser revision có sẵn của package khác. Tham khảo [Playwright browsers](https://playwright.dev/docs/browsers) và [CI setup](https://playwright.dev/docs/ci-intro).

## Giới hạn và cổng còn mở

- CI Ubuntu lần đầu có 16/17 suite đạt, chưa được coi là CI xanh. Người dùng đã xác nhận push bản sửa checkout `fetch-depth: 0`; cần kiểm tra lại CI ở commit mới, chưa áp dụng required check.
- Fixture dùng dữ liệu tổng hợp và các migration cần cho đường nghiệp vụ, bao gồm nền staff `0057`; không phải bản sao toàn bộ production DB. Chênh lệch ledger/schema R00 vẫn cần phân loại trước R02.
- Chưa kiểm thử các API staff mới, tắt/bật capability, race staff với thanh toán hoặc in trên thiết bị thật; các phần đó chưa được triển khai và thuộc release sau.
- Các test remote như `scripts/test-staging-orders.ts` không nằm trong gate. Những API/LINE/printer trong fixture được thay bằng local/stub; không dùng dữ liệu thật để kiểm chứng ghi.
- Worker auto-deploy bằng Wrangler, preview trỏ API theo hostname, cờ staging ngoài demo và hai đơn staff đang mở vẫn giữ nguyên trạng thái đã ghi ở R00. Chưa cấp quyền sửa các điểm đó.

R01 cung cấp baseline local và CI đã chạy lần đầu trên PR #74. Người dùng đã xác nhận push bản sửa checkout; cần kiểm chứng CI lại trước khi xét duyệt kết quả R01. Chưa merge hoặc chuyển sang task tiếp theo.
