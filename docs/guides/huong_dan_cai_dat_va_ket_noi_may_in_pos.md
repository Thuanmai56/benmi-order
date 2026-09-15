# Hướng Dẫn Cài Đặt & Cấu Hình Máy In Bill Nhiệt (ESC/POS) Cho Tablet POS Benmi

Tài liệu này hướng dẫn chi tiết từ A - Z quy trình cài đặt ứng dụng Android POS lên máy tính bảng (Lenovo Tab M8, Samsung Tab, iPad...) và thiết lập kết nối in tự động / thủ công với máy in hoá đơn nhiệt (Thermal Printer) tại quầy thu ngân và khu vực bếp.

---

## 1. Cài Đặt Ứng Dụng Benmi POS Lên Tablet Android

### Bước 1: Tải file cài đặt APK
- File cài đặt ứng dụng nằm tại thư mục:
  `apps/android-pos/benmi-pos-v1.0.apk`
- Gửi file này qua **Zalo / Telegram / Google Drive / Email** tới máy tính bảng tại quán.

### Bước 2: Cho phép cài đặt từ nguồn ngoài (nếu có hỏi)
1. Mở file `benmi-pos-v1.0.apk` trên Tablet.
2. Nếu máy hiện thông báo *"Bảo mật / Cài đặt ứng dụng không rõ nguồn gốc"*:
   - Bấm **Cài đặt (Settings)** -> Bật nút gạt **"Cho phép từ nguồn này" (Allow from this source)**.
3. Bấm **Cài đặt (Install)** và chờ khoảng 5 giây hoàn tất.

### Bước 3: Mở ứng dụng & Cấp quyền
- Mở app **Benmi POS** trên màn hình chính.
- Bấm nút xanh **"🚀 Bắt đầu nhận đơn (Bật chuông báo)"**.

---

## 2. Chuẩn Bị & Xác Định Địa Chỉ IP Của Máy In Nhiệt

Hệ thống hỗ trợ tất cả các dòng máy in nhiệt chuẩn **ESC/POS** kết nối qua mạng **LAN (Cáp mạng RJ45)** hoặc **Wi-Fi** (như Epson, Xprinter, Sunmi, Rongta, Zywell, Gprinter, Birch... khổ giấy 80mm hoặc 58mm).

### 📌 Quy tắc quan trọng nhất:
> **Máy tính bảng POS và Máy in nhiệt BẮT BUỘC phải kết nối chung 1 mạng Wi-Fi / Router của quán.**

---

### 🖨️ Cách lấy địa chỉ IP của Máy In (In phiếu Self-Test):
Mỗi máy in có sẵn tính năng tự in ra địa chỉ IP của nó trong 3 giây:

1. **Tắt nguồn** máy in (công tắc bên hông hoặc phía sau).
2. Dùng 1 ngón tay **nhấn và giữ chặt nút FEED** (nút đẩy giấy ở mặt trên máy in).
3. Tay kia **bật công tắc nguồn ON** (vẫn giữ chặt nút FEED).
4. Chờ **3 giây** khi máy in kêu tiếng *"Bíp"* hoặc bắt đầu chạy giấy thì **thả tay ra**.
5. Máy in sẽ tự động in ra 1 tờ phiếu kỹ thuật (**Self-Test Report**):
   - Tìm dòng chữ: **`IP Address:`** (Ví dụ: `192.168.1.100` hoặc `192.168.0.88`).
   - Cổng kết nối tiêu chuẩn luôn là: **`9100`**.

---

## 3. Cấu Hình Máy In Trên Ứng Dụng POS

1. Trên màn hình Tablet POS, bấm vào menu **`⚙️ Cài đặt` (Settings)** ở góc trên bên phải.
2. Chọn mục **`🖨️ Máy in nhiệt & Xuất bill`** ở danh mục bên trái.

### A. Cấu hình Máy In Quầy Thu Ngân (Cashier Printer):
- **Bật máy in**: Tích chọn **`[✓] Bật`**.
- **Địa chỉ IP**: Nhập đúng IP máy in thu ngân vừa lấy ở mục 2 (Ví dụ: `192.168.1.100`).
- **Cổng kết nối (Port)**: Mặc định là **`9100`**.
- **Khổ giấy**: Chọn **`80mm`** (chuẩn phổ biến) hoặc `58mm` (khổ nhỏ).
- **Tự động cắt giấy**: Tích chọn **`[✓]`**.

### B. Cấu hình Máy In Bếp / Pha Chế (Kitchen Printer):
*(Nếu quán có máy in riêng đặt trong bếp)*
- **Bật máy in**: Tích chọn **`[✓] Bật`**.
- **Địa chỉ IP**: Nhập IP máy in bếp (Ví dụ: `192.168.1.101`).
- **Cổng kết nối (Port)**: **`9100`**.
- **Khổ giấy**: Chọn **`80mm`** hoặc `58mm`.
- **Tự động cắt giấy**: Tích chọn **`[✓]`**.

### C. Chế độ In Tự Động (Auto-Print):
- Bật tuỳ chọn: **`[✓] Tự động in khi có đơn hàng mới`**.
- Khi bật chế độ này: Cứ mỗi khi khách đặt món trên LINE / Web, máy in sẽ **tự động nhảy bill trong 0.2 giây** mà nhân viên không cần chạm vào màn hình.
- Hệ thống đã tích hợp cơ chế **chống in trùng lặp (Deduplication)**, đảm bảo mỗi đơn chỉ tự in 1 lần duy nhất.

4. Bấm nút **`💾 Lưu cài đặt máy in`**.

---

## 4. Kiểm Thử (Test Print) & Vận Hành

### Bước 1: Test thử kết nối
- Tại trang cài đặt, bấm nút **`🖨️ In thử (Thu ngân)`** hoặc **`🖨️ In thử (Bếp)`**.
- Máy in thực tế sẽ phát ra tiếng cắt giấy và in ngay phiếu mẫu test kiểm tra font chữ tiếng Việt, tiếng Trung và nét vẽ bảng.

### Bước 2: In lại thủ công (Re-print) khi cần
- **Tại màn hình Đơn hàng trực tiếp (Live Orders)**: Trên mỗi thẻ đơn hàng đều có nút biểu tượng **🖨️ In bill**.
- **Tại màn hình Lịch sử đơn (History)**: Mỗi đơn đã hoàn thành đều có nút **🖨️ In lại**.
- **Tại popup Chi tiết đơn hàng**: Có nút **🖨️ In hoá đơn** ở góc dưới.

---

## 5. Phân Biệt Nội Dung 2 Trạm In

| Tiêu chí | Bill Quầy Thu Ngân (Cashier) | Phiếu Bếp / Pha Chế (Kitchen) |
| :--- | :--- | :--- |
| **Tiêu đề** | Tên quán + `客 人 結 帳 聯` (Phiếu thanh toán) | `廚 房 出 餐 聯` (Phiếu báo chế biến) |
| **Số bàn / Hình thức** | Hiển thị rõ `【內用 桌號：88】` hoặc `【外帶自取】` | **In đậm cực to, viền đen nổi bật** để đầu bếp nhìn rõ từ xa |
| **Danh sách món** | Tên món + Số lượng + Tuỳ chọn (cay, đường, đá...) | **Tên món chữ to 28px** + Checkbox tuỳ chọn nguyên liệu |
| **Tiền bạc & Giá cả** | **Hiển thị đầy đủ** đơn giá & Tổng tiền thanh toán | **TUYỆT ĐỐI KHÔNG HIỂN THỊ GIÁ TIỀN** (tránh nhầm lẫn cho bếp) |
| **Ghi chú đơn** | Ghi chú của khách + Lời cảm ơn | **⚠️ GHI CHÚ BẾP VIỀN ĐẬM KHẨN CẤP** |

---

## 6. Xử Lý Sự Cố Thường Gặp (Troubleshooting)

### ❓ Lỗi 1: Bấm "In thử" nhưng máy in không phản hồi
1. **Kiểm tra dây cáp mạng LAN / Wi-Fi**:
   - Đảm bảo đèn mạng LAN phía sau máy in sáng đèn xanh/vàng nhấp nháy.
2. **Kiểm tra dải mạng Wi-Fi (Subnet IP)**:
   - Địa chỉ IP của Tablet và Máy in phải cùng dải 3 số đầu.
   - *Ví dụ đúng*: Tablet `192.168.1.15` và Máy in `192.168.1.100` (Cùng dải `192.168.1.x`).
   - *Nếu sai dải*: Nếu Router phát ra 2 tên Wi-Fi (Ví dụ `Wifi_Khach` và `Wifi_NoiBo`), hãy kết nối Tablet vào đúng Wi-Fi nội bộ của quán.
3. **Kiểm tra Port**: Đảm bảo Port luôn là **`9100`**.

### ❓ Lỗi 2: Máy in ra giấy trắng không có chữ
- Lắp ngược cuộn giấy nhiệt. Hãy mở nắp máy in, lật ngược cuộn giấy lại và đóng nắp.

### ❓ Lỗi 3: Chữ in bị mất nét hoặc đứt quãng
- Đầu in nhiệt bị bám bụi: Dùng bông gòn thấm cồn y tế nhẹ nhàng lau sạch thanh nhiệt ngang màu đen bên trong khay giấy.
