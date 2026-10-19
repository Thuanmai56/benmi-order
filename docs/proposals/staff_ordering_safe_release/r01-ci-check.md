# R01 — Kiểm tra CI lần đầu trên PR #74

**CI lần đầu đạt 16/17 suite trên Ubuntu. Người dùng đã xác nhận push bản sửa checkout; cần kiểm chứng lần CI ở commit mới trước khi duyệt R01.**

- PR: [#74](https://github.com/Thuanmai56/benmi-order/pull/74), head `f33bdd3afc1dadc67c093c9a159b8f956438f390`, base `main`.
- Run: [Release baseline #39263731942](https://github.com/Thuanmai56/benmi-order/actions/runs/39263731942).
- Node `v24.21.0`, `linux-x64`, runner Ubuntu 24.04.
- Application fingerprint trùng baseline local: `f2b40c24f8246d0f38bbaffb641fb6b7b3443523a84c82a9d6a5a8ed39ade3e3` (129 file).
- Artifact đã tải về `artifacts/release-baseline/github-39263731942/` và được giữ ngoài Git.

## Kết quả và nguyên nhân

16 suite đạt, gồm frontend, TypeScript, cấu hình Cloudflare, routing/lifecycle, LINE, menu, năm nhóm in và cả bốn nhóm browser Chromium/WebKit/live/detail. Artifact được upload thành công dù test có lỗi.

Suite `order-identity` dừng ở ca tương thích Worker cũ. Test đọc `orders.ts` và `line.ts` tại commit `2e3600b723091d71650db96cba17b761c53493ef` bằng `git show`. Checkout mặc định của Actions chỉ có lịch sử nông nên Git trả `fatal: invalid object name '2e3600b'`.

Đây là thiếu cấu hình history ở workflow R01, không phải bằng chứng lỗi nghiệp vụ của các assertion phía sau; hai ca legacy cuối vẫn phải chạy và đạt trước khi duyệt. Không skip hoặc sửa expectation để làm CI xanh.

## Bản sửa đã được xác nhận

Trong bước `actions/checkout`, thêm `fetch-depth: 0` và comment giải thích nhu cầu test code cũ. Giữ nguyên các assertion, quyền `contents: read`, `persist-credentials: false`, các dependency và command kiểm thử.

Đã kiểm chứng local sau thay đổi:

- Commit cũ là ancestor của HEAD và chứa đủ cả hai file được test.
- `npm run test:order-identity`: đủ **19/19 ca đạt**, bao gồm hai ca legacy cuối.
- YAML giữ quyền đọc, lấy đủ lịch sử; `git diff --check` đạt.

Ngày 19/10/2026, người dùng xác nhận “push” cho bản sửa này. Sau push cần đối chiếu đúng head SHA mới, đợi đủ 17/17 suite đạt trên Ubuntu và xem artifact trước khi xét R01 hoàn tất. Việc xác nhận không cấp quyền merge hoặc thay cấu hình Cloudflare.

## Các check khác

- Pages preview: thành công ở head đã push.
- Worker preview: lỗi đã biết do lệnh `npx wrangler preview --env dev` yêu cầu block `previews`; không sửa pipeline này trong bản checkout fix.
- PR-Agent: run `39263731445` thất bại do Gemini trả quota `RESOURCE_EXHAUSTED`; model fallback `gemini-1.5-flash` trả 404. Đây là lỗi dịch vụ/cấu hình của bot, không phải kết luận review code. Chưa đổi model, secret hoặc workflow PR-Agent.

Chưa merge, thay đổi môi trường Cloudflare hoặc bắt đầu R02.
