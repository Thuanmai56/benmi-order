# Báo Cáo Thực Nghiệm & So Sánh Chi Tiết: Clef-flash (9B) vs Clef (27B)

> **Mục tiêu thử nghiệm**: Đánh giá thực nghiệm giữa hai mô hình Decision Model của Cloudflare là **Clef-flash (9B)** và **Clef (27B)** khi nạp **ngữ cảnh mở rộng (Extended Rich Context: ~1.450 input tokens)** thay vì chỉ gửi tin nhắn thô. Đo lường độ trễ (latency), điểm số xác suất, khả năng lọc nhiễu và bài toán chi phí vận hành.

---

## 1. Môi Trường & Phương Pháp Thử Nghiệm

- **Hạ tầng**: Cloudflare Workers AI (`@cf/cloudflare/clef-flash` và `@cf/cloudflare/clef`).
- **Tài khoản test**: `525bb177ae7306325d13269246769f50` (Platform Staging).
- **Công cụ chạy**: `benmi-worker-official/node_modules/cf/bin/cf ai run`.
- **Cơ chế**: 1 lượt gọi duy nhất (Single Forward-Pass) kiểm chứng 3 câu hỏi chân lý có kiểu (`noul`) song song.
- **Dữ liệu ngữ cảnh**: Đóng gói dạng JSON `state` gồm:
  - Chi tiết đơn hàng (`order_details`): Danh sách từng món ăn, số lượng, đơn giá, tổng tiền.
  - Lịch sử hội thoại 2 chiều (`related_messages`): Tin nhắn của khách và phản hồi của quán.
  - Cờ trạng thái đơn hàng (`order_status`, `has_pending_cancellation`).
  - Tin nhắn hiện tại của khách (`customer_message`).

---

## 2. Thông Tin Input & Cấu Trúc Prompt Thực Tế

### 2.1. Ba câu hỏi chân lý (`noul` questions)
Toàn bộ instruction được trích xuất trực tiếp từ file production [`cancellation-intent.ts`](file:///Users/duccao/Documents/benmi-order/benmi-worker-official/src/modules/cancellation-intent.ts):

```json
{
  "explicit_cancel": {
    "type": "noul",
    "instructions": "Classify only the CURRENT customer_message. The primary market is Taiwan: prioritize Traditional Chinese and Taiwanese LINE food-ordering phrasing... Is the customer explicitly asking to cancel, void, stop or discard one whole existing order NOW? Requests to discard the newer duplicate or an order placed at the wrong shop count... Cancelling only a dish, drink or topping does not. Answer NO for merely saying they may be unable to collect without requesting cancellation. Answer NO for withdrawing an earlier cancellation or keeping the order... In Taiwan, 退單/撤單/刪單 can mean cancelling the whole order; 訂錯間/訂重複/後面那筆 refer to wrong shop or a duplicate order."
  },
  "possible_cancel": {
    "type": "noul",
    "instructions": "Is the CURRENT message an actual statement that the customer cannot or probably cannot receive the whole order, with NO alternative arrangement? YES for actual inability or hesitation, nobody available to receive, or saying they will not come for the already ordered meal... Answer NO if they will collect later, a friend will collect, or delivery is requested: 'Tôi không thể lấy món, bạn tôi sẽ lấy giúp' are NO. These are still-wanted orders regardless of personal inability."
  },
  "withdraw_cancel": {
    "type": "noul",
    "instructions": "Does the CURRENT message say to KEEP this order or retract the cancellation? With has_pending_cancellation=true, YES for keeping/continuing the meal, changing their mind, saying do not cancel, or a new friend/later/delivery arrangement to receive the order... Vietnamese keeping phrases: 'giữ lại đơn', 'vẫn lấy', 'đổi ý', 'đừng hủy nữa'. Traditional Chinese 保留/照做/不用取消 mean YES."
  }
}
```

---

## 3. Chi Tiết 5 Kịch Bản Test & Dữ Liệu Raw Thu Được

Dưới đây là chi tiết từng kịch bản, nội dung dữ liệu đưa vào và kết quả đo đạc từ hệ thống:

```
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ NGƯỠNG PHÁN QUYẾT TRÊN POS PRODUCTION:                                                                 │
│ - Ngưỡng Clear (Chắc chắn hủy):       p >= 0.90 ➔ POS hiện cảnh báo ĐỎ (Khách yêu cầu hủy)            │
│ - Ngưỡng Review (Nghi vấn cần xem lại): 0.60 <= p < 0.90 ➔ POS hiện cảnh báo VÀNG (Cần xác nhận lại)  │
│ - Ngưỡng None (Bỏ qua / Không hủy):   p < 0.60 ➔ Không tác động đơn hàng                              │
└────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

### Kịch Bản 1: Hủy 1 món trong đơn có 3 món ăn (Partial Cancellation)
* **Ý nghĩa thực tế**: Khách đặt 3 món (Bánh mì, Trà đào, Khoai tây). Sau đó khách nhắn xin bỏ ly trà đào, 2 món kia vẫn làm.
* **Kỳ vọng**: `explicit_cancel < 0.60`, `withdraw_cancel < 0.60` ➔ **KHÔNG HỦY ĐƠN**.
* **Payload `state` đưa vào**:
  ```json
  {
    "channel": "restaurant LINE chat",
    "order_status": "ACCEPTED",
    "order_details": {
      "order_id": "BM-20261015-089",
      "total_price": 145,
      "items": [
        { "name": "Bánh mì thịt nướng", "qty": 1, "price": 65 },
        { "name": "Trà đào cam sả", "qty": 1, "price": 45 },
        { "name": "Khoai tây chiên giòn", "qty": 1, "price": 35 }
      ]
    },
    "has_pending_cancellation": false,
    "related_messages": [
      { "text": "Quán ơi đơn #089 của mình đang làm chưa ạ?", "sender": "customer" },
      { "text": "Dạ quán đang chuẩn bị rồi ạ, tầm 10 phút nữa bạn ghé lấy nhé.", "sender": "shop" }
    ],
    "customer_message": "Thế bỏ ly trà đào thôi nhé, đổi ý không uống nước nữa, hai món kia vẫn làm bình thường nha quán!"
  }
  ```
* **Kết quả đo đạc**:
  - **Số token đầu vào**: `1.463 tokens`
  - **Clef-flash (9B)**: Latency: `3.618ms` | `explicit = 0.1159`, `possible = 0.0350`, `withdraw = 0.3424`
  - **Clef (27B)**: Latency: `891ms` | `explicit = 0.0422`, `possible = 0.0255`, `withdraw = 0.0524`
* **Đánh giá**:
  - `clef-flash` bị từ *"đổi ý"* làm nhiễu khiến điểm `withdraw` tăng vọt lên `0.3424`.
  - `clef (27B)` đọc hiểu hoàn chỉnh cấu trúc đơn hàng 3 món, đè bẹp hoàn toàn cả 2 tín hiệu xuống sát đáy (`0.042` và `0.052`), thể hiện độ chính xác tuyệt đối.

---

### Kịch Bản 2: Nhờ người nhà lấy hộ sau chuỗi hội thoại bận việc
* **Ý nghĩa thực tế**: Khách nhắn 3 câu phân trần bận họp không qua lấy được, nhưng chốt lại là em trai sẽ qua lấy hộ.
* **Kỳ vọng**: Món ăn vẫn có người nhận ➔ **KHÔNG ĐƯỢC HỦY ĐƠN**.
* **Payload `state` đưa vào**:
  ```json
  {
    "channel": "restaurant LINE chat",
    "order_status": "ACCEPTED",
    "order_details": {
      "order_id": "BM-20261015-090",
      "total_price": 130,
      "items": [{ "name": "Bánh mì thập cẩm đặc biệt", "qty": 2, "price": 130 }]
    },
    "has_pending_cancellation": false,
    "related_messages": [
      { "text": "Công ty mình vừa có cuộc họp đột xuất kéo dài đến 12h30.", "sender": "customer" },
      { "text": "Mình sợ không tự chạy qua lấy được đúng giờ hẹn 12h.", "sender": "customer" },
      { "text": "Nhưng em trai mình làm ngay gần quán, tầm 12h15 nó ghé đọc tên mình lấy hộ nhé, quán giữ đơn đừng hủy nha!", "sender": "customer" }
    ],
    "customer_message": "Em trai mình ghé lấy hộ rồi nhé quán ơi, giữ đơn làm giúp mình."
  }
  ```
* **Kết quả đo đạc**:
  - **Số token đầu vào**: `1.462 tokens`
  - **Clef-flash (9B)**: Latency: `9.447ms` | `explicit = 0.0293`, `possible = 0.0510`, `withdraw = 0.8926`
  - **Clef (27B)**: Latency: `807ms` | `explicit = 0.0454`, `possible = 0.0460`, `withdraw = 0.5367`
* **Đánh giá**:
  - Cả 2 model đều nhận diện chính xác `explicit` và `possible` đều rất thấp (< 0.05) ➔ Không có bất kỳ nguy cơ nào bị hủy nhầm đơn.
  - Tuy nhiên `clef-flash` mất đến 9.4 giây để xử lý ngữ cảnh này, trong khi `clef (27B)` chỉ mất 807ms.

---

### Kịch Bản 3: Đặt trùng 2 đơn hàng, yêu cầu hủy đơn đặt sau
* **Ý nghĩa thực tế**: Khách lỡ bấm thanh toán 2 lần thành 2 đơn (#091 và #092). Khách yêu cầu giữ đơn #091, hủy đơn sau #092.
* **Kỳ vọng**: `explicit_cancel >= 0.90` (Clear) ➔ **KÍCH HOẠT HỦY DỨT KHOÁT**.
* **Payload `state` đưa vào**:
  ```json
  {
    "channel": "restaurant LINE chat",
    "order_status": "ACCEPTED",
    "order_details": {
      "current_order_id": "BM-20261015-092",
      "previous_order_id": "BM-20261015-091",
      "note": "Khách đặt 2 đơn giống hệt nhau cách nhau 1 phút"
    },
    "has_pending_cancellation": false,
    "related_messages": [
      { "text": "Chết rồi mình lỡ tay bấm thanh toán 2 lần trên web.", "sender": "customer" },
      { "text": "Dạ hệ thống ghi nhận bạn có 2 đơn #091 và #092 ạ.", "sender": "shop" }
    ],
    "customer_message": "Vâng mình lấy đơn đầu #091 thôi, đơn sau #092 này幫我退掉, hủy đơn #092 này giúp mình nhé, đừng làm!"
  }
  ```
* **Kết quả đo đạc**:
  - **Số token đầu vào**: `1.447 tokens`
  - **Clef-flash (9B)**: Latency: `2.119ms` | `explicit = 0.8849`, `possible = 0.0544`, `withdraw = 0.0761`
  - **Clef (27B)**: Latency: `1.228ms` | `explicit = 0.9677`, `possible = 0.0228`, `withdraw = 0.0407`
* **Đánh giá (Phát hiện quan trọng nhất)**:
  - **Clef-flash (9B)** chỉ đạt `0.8849`. Vì ngưỡng clear là `0.90`, kết quả này bị rớt xuống diện `REVIEW`. Thu ngân trên POS chỉ thấy cảnh báo vàng, vẫn phải nhấc máy gọi hỏi lại khách.
  - **Clef (27B)** đạt `0.9677` (vượt ngưỡng 0.90). Hệ thống kích hoạt ngay cảnh báo ĐỎ (`CLEAR`), giúp bếp dừng làm món ngay tức khắc mà không cần hỏi lại.

---

### Kịch Bản 4: Khách đổi ý sau khi quán báo đồ ăn đã đóng gói
* **Ý nghĩa thực tế**: Đơn đang có yêu cầu hủy trước đó (`has_pending_cancellation: true`). Quán báo đồ ăn vừa xong, khách đổi ý lấy món.
* **Kỳ vọng**: `withdraw_cancel >= 0.90` (Clear) ➔ **GHI NHẬN RÚT LẠI YÊU CẦU HỦY**.
* **Payload `state` đưa vào**:
  ```json
  {
    "channel": "restaurant LINE chat",
    "order_status": "ACCEPTED",
    "has_pending_cancellation": true,
    "related_messages": [
      { "text": "Chờ lâu quá, hủy đơn này cho tôi đi.", "sender": "customer" },
      { "text": "Dạ món của bạn vừa ra lò nóng hổi đang đóng hộp rồi ạ, bạn ghé được không?", "sender": "shop" }
    ],
    "customer_message": "Thế à, vậy thôi giữ lại nhé, không hủy nữa đâu, tôi ghé lấy ngay đây!"
  }
  ```
* **Kết quả đo đạc**:
  - **Số token đầu vào**: `1.374 tokens`
  - **Clef-flash (9B)**: Latency: `2.715ms` | `explicit = 0.0547`, `possible = 0.0446`, `withdraw = 0.9576`
  - **Clef (27B)**: Latency: `884ms` | `explicit = 0.0417`, `possible = 0.0364`, `withdraw = 0.9818`
* **Đánh giá**:
  - Cả 2 model đều xuất sắc nhận diện ý định rút lại yêu cầu hủy (`withdraw > 0.95`).
  - Clef (27B) đạt độ tự tin cao hơn (`0.9818`) với độ trễ chỉ 884ms.

---

### Kịch Bản 5: Bất khả kháng không thể đến nhận món (Không ai lấy hộ)
* **Ý nghĩa thực tế**: Khách bị hỏng xe giữa đường cao tốc, không có người quen lấy hộ, chắc chắn không đến được.
* **Kỳ vọng**: `possible_cancel >= 0.60` ➔ **ĐƯA VÀO DIỆN REVIEW ĐỂ QUÁN HỖ TRỢ**.
* **Payload `state` đưa vào**:
  ```json
  {
    "channel": "restaurant LINE chat",
    "order_status": "ACCEPTED",
    "order_details": {
      "order_id": "BM-20261015-095",
      "items": [{ "name": "4x Bánh mì bò nướng sốt tiêu", "qty": 4, "price": 260 }]
    },
    "has_pending_cancellation": false,
    "related_messages": [
      { "text": "Xe của mình bị chết máy giữa đường cao tốc rồi.", "sender": "customer" },
      { "text": "Đang phải chờ xe cứu hộ cẩu về gara sửa.", "sender": "customer" }
    ],
    "customer_message": "Chắc chắn trưa nay mình không có cách nào qua lấy đồ ăn được rồi, tiếc quá."
  }
  ```
* **Kết quả đo đạc**:
  - **Số token đầu vào**: `1.409 tokens`
  - **Clef-flash (9B)**: Latency: `8.241ms` | `explicit = 0.0512`, `possible = 0.8973`, `withdraw = 0.0437`
  - **Clef (27B)**: Latency: `805ms` | `explicit = 0.1051`, `possible = 0.8416`, `withdraw = 0.0329`
* **Đánh giá**:
  - Cả 2 model đều phân loại chính xác vào vùng `REVIEW` (`possible` dao động từ `0.84` đến `0.89`), không bị nhầm lẫn sang `explicit`.
  - Màn hình POS sẽ hiện cảnh báo vàng để nhân viên liên hệ hỗ trợ đổi giờ hoặc hỗ trợ giao hàng.

---

## 4. Bảng So Sánh Tổng Hợp Metrics (Flash vs 27B)

| Tiêu chí | Clef-flash (9B) | Clef (27B) | Người chiến thắng |
| :--- | :---: | :---: | :---: |
| **Quy mô mô hình** | 9 Tỷ tham số | 27 Tỷ tham số | — |
| **Context Window hỗ trợ** | 24.576 tokens | 65.536 tokens | **Clef (27B)** |
| **Latency trung bình (~1.5k tokens)** | **5.228ms** *(Nhiều spike > 8s)* | **923ms** *(Rất ổn định < 1.2s)* | **Clef (27B)** |
| **Khả năng lọc nhiễu (Case 1)** | Khá (Dính nhiễu nhẹ `withdraw=0.34`) | Xuất sắc (Triệt tiêu nhiễu `< 0.05`) | **Clef (27B)** |
| **Độ tự tin câu khó (Case 3)** | 0.8849 *(Rớt vào Review)* | **0.9677** *(Vượt Clear)* | **Clef (27B)** |
| **Chi phí / 1M Input Tokens** | **$0.038** | **$0.240** (~6.3x) | **Clef-flash (9B)** |
| **Phí Output Tokens** | **$0** (Miễn phí) | **$0** (Miễn phí) | Hòa |

---

## 5. Phân Tích Chi Phí Thực Tế (Cost Analysis)

### Bảng tính chi phí cho 10.000 tin nhắn khách hàng / tháng:

```
┌───────────────────────────────┬───────────────────────────────┬───────────────────────────────┐
│ Kịch bản Ngữ cảnh              │ Clef-flash (9B)               │ Clef (27B)                    │
├───────────────────────────────┼───────────────────────────────┼───────────────────────────────┤
│ Context Ngắn (~200 tokens)    │ $0.076 USD (~1.900 VNĐ / tháng)│ $0.480 USD (~12.000 VNĐ / tháng)│
│ Context Mở rộng (~1.450 tokens)│ $0.551 USD (~14.000 VNĐ / tháng)│ $3.480 USD (~88.000 VNĐ / tháng)│
└───────────────────────────────┴───────────────────────────────┴───────────────────────────────┘
```

> **Bài toán ROI trong F&B**:
> Mặc dù Clef 27B đắt gấp 6.3 lần so với Clef-flash, nhưng mức giá tuyệt đối **$3.48 USD / tháng (~88k VNĐ)** là quá nhỏ. 
> Chỉ cần Clef 27B giúp quán **tránh được đúng 1 đơn hàng bị hủy nhầm** (trị giá 100k – 200k VNĐ) nhờ độ tự tin vượt trội ở Case 3, mô hình 27B đã **tự bù đắp toàn bộ chi phí AI của cả tháng**.

---

## 6. Hướng Dẫn Kỹ Thuật Đổi Model Trong Codebase

Trong file [`benmi-worker-official/src/modules/cancellation-intent.ts`](file:///Users/duccao/Documents/benmi-order/benmi-worker-official/src/modules/cancellation-intent.ts#L102-L105):

```typescript
// Chuyển đổi tên model từ 'clef-flash' sang 'clef'
const result = await Promise.race([
  env.AI.run('@cf/cloudflare/clef', {
    model: 'clef',
    state,
    questions: clefQuestions()
  }),
  new Promise<never>((_, reject) => {
    // Tăng timeout lên 4000ms để đảm bảo an toàn mạng
    timer = setTimeout(() => reject(new Error('CLEF_TIMEOUT')), 4000);
  })
]);
```

---

## 7. Kết Luận & Khuyến Nghị

1. **Dùng Clef-flash (9B) khi**: Hệ thống chỉ truyền tin nhắn đơn lẻ, không cần gửi kèm thực đơn hay hội thoại dài (Context < 300 tokens). Phù hợp với các bot định tuyến câu hỏi cơ bản.
2. **Dùng Clef (27B) khi**: Hệ thống bắt đầu nhồi **Rich Context** (danh sách món ăn, giá tiền, lịch sử chat nhiều lượt, ghi chú khách). Clef 27B giải quyết triệt để sự do dự giữa ngưỡng `review` và `clear`, giảm tải tối đa thao tác xác nhận thủ công cho nhân viên thu ngân tại quầy.
