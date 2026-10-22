# R02 — Kiểm tra CI ngày 22/10/2026 JST

PR: [#77](https://github.com/Thuanmai56/benmi-order/pull/77). Head đã kiểm thử: `9394433d21090b4a6ec856563d72cbbed3758cca`.

## Lần đầu: PR trỏ vào dev

[Run 39737036323](https://github.com/Thuanmai56/benmi-order/actions/runs/39737036323) checkout merge `52e1839` của dev `68bd215` và R02, đạt 14/18 suite. Migration capability và order identity đều đạt. Bốn suite lỗi là POS Chromium/WebKit (nút 42px, yêu cầu 48px), live mobile và detail scroll (fixture thiếu LegacyOrderAdapter). Không sửa hoặc bỏ qua các assertion này trong R02.

## Sau khi người dùng xác nhận đổi sang main

PR #77 đã chuyển sang main `c35c333`. Diff chỉ có 10 file R02. Không merge dev vào nhánh release.

- Baseline local chạy lại trên head `9394433`: 18/18 đạt; log tại `artifacts/release-baseline/2026-10-22T07-06-34-490Z/`.
- [Run 39738327308](https://github.com/Thuanmai56/benmi-order/actions/runs/39738327308) được kích hoạt bằng workflow_dispatch trên đúng nhánh/head R02: **18/18 đạt**. Main hiện là tổ tiên trực tiếp của nhánh này.
- GitHub vẫn hiển thị check pull_request cũ thất bại; workflow_dispatch không thay thế check gắn với bản merge PR cũ. Người dùng đã xác nhận commit/push bản cập nhật tài liệu để sinh event synchronize và chạy CI trên merge ref với main. Chưa coi PR đã qua cổng merge.

PR-Agent lỗi riêng: Gemini chính trả 503; fallback gemini-1.5-flash trả 404. Workers preview dev cũng còn check thất bại; chưa sửa pipeline trong R02.

Không thay code runtime, SQL, cờ tenant hoặc database để xử lý lần CI này. Chưa merge PR hoặc bắt đầu R03.
