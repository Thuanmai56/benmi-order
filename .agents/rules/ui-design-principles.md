---
trigger: always_on
---

# Triết Lý Thiết Kế Giao Diện (UI/UX Design Philosophy)

Khi thực hiện thiết kế, chỉnh sửa layout, CSS hoặc thêm tính năng mới trên giao diện web, luôn tuân thủ nghiêm ngặt thứ tự ưu tiên thiết bị sau:

### 1. Bảng Quản Lý Đơn Hàng (`orders.html` / `orders.css` / Dashboard POS)
- **Ưu tiên 1 (Chính - Tablet-first)**: 
  - Tối ưu trải nghiệm sử dụng trên **Tablet / iPad** (màn hình cảm ứng đặt tại quầy của quán).
  - Nút bấm, thao tác chạm to rõ, dễ bấm nhanh bằng ngón tay, modal/popup và layout dạng cột/lưới tối ưu cho tỷ lệ màn hình máy tính bảng ngang & dọc.
- **Ưu tiên 2**: Responsive hoàn chỉnh cho **Desktop / PC**.
- **Ưu tiên 3**: Responsive cho **Mobile**.
- **Nguyên tắc Đa Ngôn Ngữ (I18N Support)**:
  - `orders.html` hỗ trợ chuyển đổi đa ngôn ngữ (**繁體中文 `zh-TW`** và **Tiếng Việt `vi`**).
  - Mọi thành phần UI mới (nút bấm, tiêu đề, modal, thông báo alert, tooltip, placeholder) **BẮT BUỘC** phải khai báo đầy đủ key trong cả 2 từ điển `I18N["zh-TW"]` và `I18N["vi"]`, đồng thời ánh xạ trong hàm `applyLanguageToDOM()`.
  - **Tuyệt đối không pha trộn ngôn ngữ**: Từ điển `zh-TW` chỉ chứa tiếng Trung phồn thể thuần túy (không chèn thêm phụ đề/chú thích tiếng Việt như `(Mở quán)`), và từ điển `vi` chứa tiếng Việt chuẩn xác cho POS.

### 2. Trang Thực Đơn & Đặt Món Cho Khách (`index.html` / `index.css` / Menu LIFF)
- **Ưu tiên 1 (Chính - Mobile-first)**:
  - Tối ưu trải nghiệm sử dụng trên **Điện thoại di động (Mobile / LINE LIFF In-App Browser)**.
  - Thao tác 1 tay thuận tiện, cuộn mượt mà, layout dọc tinh gọn, giỏ hàng cố định dưới đáy màn hình, thời gian tải nhanh và giao diện thanh toán liền mạch.
- **Ưu tiên 2**: Responsive cho **Tablet & PC**.

---

### 3. Phong Cách Thiết Kế Tối Giản & Quy Chuẩn Icon (Minimalist Iconography)

- **A. Triết lý thiết kế tối giản, trang nhã (Minimalist & Elegant UI)**:
  - Ưu tiên sự tinh gọn, hiện đại, khoảng đệm (spacing/white-space) thông thoáng và phân cấp thị giác rõ ràng bằng typography (độ đậm nhạt `font-weight`, màu sắc phân cấp `#111111` vs `#666666`).
  - Tránh thiết kế rườm rà, chật chội làm che khuất nội dung chính (tên món, tên phân loại, giá tiền).

- **B. Nghiêm cấm emoji/icon trẻ con (No Childish / Cluttered Icons)**:
  - **Tuyệt đối tránh** chèn các emoji hình ảnh trẻ con hoặc rườm rà như: ghế (`🪑`), dấu cộng (`➕`), túi xách (`🛍️`), gói hàng (`📦`), hộp quà (`🎁`)... vào các tiêu đề, nhãn thông báo, receipt POS hoặc LINE Flex Message.

- **C. Quy chuẩn Icon cách điệu & Bản quyền thương mại (Commercial-Safe SVG Icons)**:
  - Khi cần biểu tượng trực quan, **bắt buộc** dùng icon dạng vector SVG cách điệu nét mảnh (stroke-width 2.0 ~ 2.2px, đơn sắc hoặc màu trung tính hài hòa), tương tự hệ thống SVG icon địa chỉ, giờ mở cửa ở `index.html`.
  - **100% Miễn phí mục đích thương mại**: Mọi SVG icon nhúng vào codebase phải lấy từ các thư viện mã nguồn mở có giấy phép thương mại tự do (như **Lucide Icons**, **Feather Icons**, **Tabler Icons**, **Heroicons** theo giấy phép MIT/Apache 2.0/CC0). Tuyệt đối không dùng icon có bản quyền hạn chế.

- **D. Định dạng LINE Flex Message & Thẻ POS**:
  - Tiêu đề nhóm / nhãn mô tả sử dụng chữ thường (regular weight), màu xám thanh lịch (`#666666`), kích thước vừa phải.
  - Dành độ in đậm (`weight: bold`) và màu sắc tương phản cao cho món ăn, số lượng và tổng tiền chính.
  - Sử dụng đường kẻ mờ (`separator`) hoặc khoảng trống `margin` để phân tách khu vực, thay vì dùng icon trang trí.

