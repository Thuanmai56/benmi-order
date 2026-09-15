---
trigger: always_on
---

# Bắt Buộc Cập Nhật Version Cache-Buster Khi Sửa CSS / JS (Frontend Cache Busting Rule)

Mọi trình duyệt Web, LINE LIFF In-App Browser và WebView Android POS đều lưu cache tĩnh rất lâu. Để ngăn chặn lỗi chạy code cũ (stale code regression), luôn tuân thủ nghiêm ngặt các quy tắc sau:

### 1. Bắt buộc Bump Version khi có thay đổi
- Bất cứ khi nào tạo mới, sửa đổi CSS (`css/*.css`, `index.css`) hoặc JavaScript (`js/*.js`):
  - **BẮT BUỘC** phải cập nhật tham số `?v=...` tương ứng trong các file HTML gọi đến nó (`orders.html`, `index.html`, `marketplace.html`).
  - Tuyệt đối không để nguyên query version cũ khi logic code bên trong đã thay đổi.

### 2. Quy chuẩn Định dạng Version
- Sử dụng cú pháp ngày tháng kèm tên tính năng ngắn gọn:
  `?v=YYYYMMDD_[feature_slug]_v[N]`
  *(Ví dụ: `?v=20260912_item_price_v2` hoặc `?v=20260915_printer_auto_v1`)*.
- Khi chỉnh sửa một module trong kiến trúc POS (`orders.html`), khuyến nghị tăng đồng bộ version của cụm module liên quan để đảm bảo tính nhất quán.

### 3. Check trước khi Commit
- Khi chạy `git status` hoặc `git diff`: nếu thấy file `.js` hoặc `.css` được sửa đổi, hãy kiểm tra xem file `.html` tương ứng đã được bump version `?v=` hay chưa trước khi commit hoặc deploy.
