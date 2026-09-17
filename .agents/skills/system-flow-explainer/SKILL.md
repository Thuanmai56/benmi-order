---
name: system-flow-explainer
description: Structured methodology for investigating, tracing, and explaining system architecture, end-to-end data flows, lifecycle events, and trigger mechanisms. Activate when the user asks to list all flows leading to an action, explain how a subsystem works, trace API/webhook events, or break down complex codebase workflows.
---

# System Flow Explainer & Architecture Investigation Skill

Kỹ năng chuyên sâu hướng dẫn AI cách điều tra codebase toàn diện và cấu trúc câu trả lời chuẩn mực khi giải thích các luồng dữ liệu, sự kiện (events), trigger hoặc kiến trúc tính năng trong hệ thống.

---

## 1. Quy Trình Điều Tra Codebase (Investigation Phase)

Khi nhận được câu hỏi yêu cầu liệt kê hoặc giải thích các flow (ví dụ: *"List tất cả các flow gửi tin nhắn / cập nhật trạng thái / trigger sự kiện..."*), AI **bắt buộc** thực hiện tuần tự:

1. **Quét toàn diện các điểm phát sinh hành động (Source of Truth Search)**:
   - Tìm kiếm các hàm gửi/ghi dữ liệu cốt lõi (Core Sender/Mutator functions), ví dụ: `pushLineFlexMessage`, `replyLineFlexMessage`, `saveOrder`, `updateOrderStatus`, các API endpoints (`POST /api/...`), hàng đợi sự kiện.
   - Quét cả đường dẫn trực tiếp (API routes) và gián tiếp (Webhooks, Background Workers, Cron tasks, Event listeners, Client SDK triggers).
2. **Truy ngược nguồn gốc kích hoạt (Backtrace Triggers)**:
   - Truy ngược từ hàm thực thi lên các caller functions.
   - Xác định rõ tác nhân: Khách hàng (Mobile Webview / Desktop Browser), Nhân viên quầy (POS Tablet), Quản trị viên (Admin Portal), hay Tự động (Cron / Worker KV expiration / AI Intent).
3. **Phân tích nhánh điều kiện & Trường hợp biên (Edge Cases & Fallbacks)**:
   - Kiểm tra các câu lệnh `if/else`, cờ trạng thái (`isDesktop`, `diningOption`, `reason`...).
   - Kiểm tra cơ chế xử lý lỗi: Có fallback sang kênh khác không? Có bị nuốt lỗi (swallow error) hoặc retry không? Có race condition tiềm ẩn không?

---

## 2. Chuẩn Cấu Trúc Câu Trả Lời (The 4-Tier Response Framework)

Mọi câu trả lời giải thích luồng phải tuân thủ nghiêm ngặt mô hình 4 tầng sau:

### TẦNG 1: Khái niệm nền tảng & Bức tranh tổng thể (Mental Model & High-level Overview)
- **Định lượng tổng quát**: Nêu rõ tổng số flow tìm thấy và cách phân bổ (ví dụ: *Có tổng cộng 12 flow, chia thành 2 cơ chế truyền thông và 4 nhóm nghiệp vụ*).
- **Phân loại kỹ thuật cốt lõi**: Nêu rõ sự khác biệt bản chất kỹ thuật (ví dụ: PUSH tốn quota vs REPLY miễn phí; Đồng bộ vs Bất đồng bộ; Cache vs Database).
- **Sơ đồ trực quan (Mermaid Diagram)**: Bắt buộc vẽ sơ đồ luồng tổng quan thể hiện tương tác giữa các bên (`Client Layer -> Worker/Backend -> DB/KV/External Services -> End User`).

### TẦNG 2 & 3: Phân nhóm nghiệp vụ & Chi tiết từng Flow chuẩn hóa (Standardized Blueprint)
Không liệt kê danh sách phẳng từ 1 đến N. Bắt buộc gom nhóm theo Use Cases/Kịch bản thực tế. Mỗi flow phải trình bày đồng nhất theo khuôn mẫu:

#### Flow [Số]: [Tên kịch bản rõ ràng, súc tích]
- **Kích hoạt từ (Trigger)**: Hành động cụ thể của người dùng hoặc sự kiện hệ thống bắt đầu luồng.
- **Cơ chế truyền thông (Method / Mode)**: Giao thức/cơ chế kỹ thuật (PUSH, REPLY, SSE, HTTP POST, KV cache...). Nêu rõ có tốn chi phí/quota hay không.
- **Vị trí code (Code Reference)**: Đường dẫn file và số dòng code chính xác, tạo link markdown click được (`[file.ts: L123](file:///path/to/file.ts#L123)`).
- **Template / Payload xử lý**: Hàm dựng giao diện, payload JSON, hoặc biến đổi dữ liệu liên quan.
- **Nội dung & Tương tác (Content & Next Actions)**: Khách/Nhân viên nhìn thấy gì, các nút bấm dẫn đi đâu (URI, Postback, State change).
- **Cơ chế dự phòng & Rủi ro (Fallback & Edge Cases)**: Nếu bước này lỗi thì hệ thống xử lý ra sao (fallback text, retry, rollback DB...).
- **Lý do thiết kế (Architecture Rationale)**: Vì sao đoạn code này được thiết kế như vậy (ví dụ: hạn chế của trình duyệt, tối ưu quota, xử lý bất đồng bộ...).

### TẦNG 4: Bảng tra cứu tóm tắt & Nhận xét kiến trúc (Cheat-sheet & Architectural Insights)
1. **Bảng Cheat-Sheet tra cứu nhanh**:
   - Cột chuẩn: `#` | `Tên Flow` | `Trigger (Kích hoạt)` | `Cơ chế` | `Chi phí/Tác động` | `Hàm xử lý` | `File & Dòng code`.
2. **Nhận xét kiến trúc & Đề xuất (Insights & Optimization)**:
   - Đánh giá hiệu năng / chi phí (ví dụ: Tỷ lệ luồng miễn phí vs tốn phí).
   - Điểm nghẽn tiềm ẩn (Bottlenecks / Race conditions) hoặc cơ hội tái cấu trúc (Refactoring opportunities).

---

## 3. Nguyên Tắc Trình Bày & Format

- **Clickable Links**: Mọi file và dòng code phải dùng định dạng link markdown chuẩn `file:///...`.
- **Ngôn ngữ**: Tiếng Việt chuẩn kỹ thuật, gãy gọn, thuật ngữ chuyên ngành (Webhook, Postback, Push, Reply, Payload, KV, D1) giữ nguyên tiếng Anh để đảm bảo độ chính xác.
- **Tính chính xác (High Fidelity)**: Chỉ liệt kê những flow thực sự tồn tại trong code; flow nào bị comment out hoặc không còn gọi phải ghi chú rõ là `Deprecated / Unused`.
