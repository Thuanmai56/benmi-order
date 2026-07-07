# PDP: Nhiệm vụ 2.2 - Tối ưu hóa phản hồi bằng Bộ lọc Từ khóa Thủ công (Rule-based Filter)

Tài liệu này chi tiết hóa thiết kế kỹ thuật của **Task 2** trong kế hoạch khắc phục lỗi trễ và mất phản hồi của Webhook LINE. Mục tiêu chính là thiết lập một bộ lọc từ khóa thủ công siêu nhẹ (chạy trực tiếp trong bộ nhớ RAM, trễ ~0ms) nhằm xử lý ngay lập tức các tin nhắn chào hỏi thông thường hoặc có ý định đặt hàng quá rõ ràng mà không cần gọi qua AI API (Groq/OpenRouter), giúp tối ưu hóa latency và tiết kiệm tối đa quota API.

---

## 1. Mục tiêu & Phạm vi

### Mục tiêu
* **Tối ưu hóa Latency về 0ms**: Xử lý các câu chat thông dụng (chào hỏi, hỏi thông tin cơ bản, hoặc yêu cầu đặt bánh trực tiếp) ngay lập tức trong bộ nhớ RAM mà không cần chịu độ trễ mạng của AI API.
* **Tiết kiệm Quota API**: Giảm tải khoảng 60% - 80% lưu lượng cuộc gọi AI đối với những tin nhắn đơn giản.
* **Đảm bảo tính nhất quán (Deterministic)**: Tránh việc AI nhận dạng sai các từ khóa cực kỳ cơ bản.
* **Luồng chạy mềm (AI Fallback)**: Chỉ khi tin nhắn của người dùng phức tạp hoặc không khớp từ khóa lọc trước, hệ thống mới chuyển tiếp cho AI phân tích.

### Phạm vi ảnh hưởng
* **Backend**: Bổ sung hàm kiểm tra ý định từ khóa nhanh và tích hợp vào [line.ts](file:///Users/duc.cao/Documents/learning/benmi-order/benmi-worker-official/src/modules/line.ts).

---

## 2. Chi tiết Thiết kế Kỹ thuật

### 2.1 Cài đặt bộ lọc từ khóa (`src/modules/line.ts`)

Chúng ta sẽ khai báo một hàm lọc từ khóa `checkDirectIntent` và xuất khẩu nó để phục vụ kiểm thử:

```typescript
export function checkDirectIntent(text: string): "YES" | "NO" | null {
  const t = String(text || "").trim().toLowerCase();

  // 1. Nhóm từ khóa chắc chắn là muốn ĐẶT HÀNG (YES) -> Đi thẳng tới LIFF Link
  const yesKeywords = [
    "點餐", "我要點餐", "我要訂餐", "想訂餐", "開始點餐", "點餐連結", 
    "order", "đặt món", "đặt hàng", "muốn đặt", "chốt đơn", "menu", "thực đơn"
  ];
  if (yesKeywords.some(kw => t.includes(kw))) {
    return "YES";
  }

  // 2. Nhóm câu chào hỏi hoặc từ khóa ngắn chắc chắn KHÔNG phải đặt hàng (NO) -> Im lặng
  const noKeywords = [
    "你好", "哈囉", "hello", "hi", "xin chào", "cảm ơn", "謝謝", "thanks", "thank you",
    "địa chỉ", "giờ mở cửa", "營業時間", "地址", "外送"
  ];
  // Chỉ áp dụng NO khi câu chat ngắn (tránh trường hợp khách viết dài có chứa từ chào hỏi)
  if (noKeywords.some(kw => t.includes(kw)) && t.length < 15) {
    return "NO";
  }

  // 3. Không khớp từ khóa nào -> Trả về null để chuyển cho AI suy luận
  return null;
}
```

### 2.2 Tích hợp vào hàm Webhook chính (`src/modules/line.ts`)

Trước khi tiến hành gọi AI ngầm, hệ thống sẽ thực hiện kiểm tra qua bộ lọc:

```typescript
    // 2) Quick reply (Lọc giờ mở cửa, địa chỉ tĩnh trước tiên)
    const quick = handleQuickReply(userText);
    if (quick) {
      await replyText(replyToken, quick, env);
      continue;
    }

    // 2.5) Bộ lọc từ khóa thủ công nhanh (Rule-based Filter)
    const directIntent = checkDirectIntent(userText);
    if (directIntent === "YES") {
      await replyWithLiffRedirect(replyToken, userId, env);
      continue;
    } else if (directIntent === "NO") {
      // Im lặng, kết thúc vòng lặp để nhân viên tự chat tay
      continue;
    }

    // 3) AI fallback - Chỉ chạy khi không khớp bộ lọc từ khóa nhanh
    const aiPromise = async () => {
      // Gọi AI như cũ...
    }
```

---

## 3. Kế hoạch Triển khai & Kiểm thử

### Các bước thực hiện
1. Viết hàm `checkDirectIntent` trong `line.ts`.
2. Chèn bộ lọc này vào trước logic gọi AI fallback ở cuối hàm `handleLineWebhook()`.
3. Kiểm tra tính toàn vẹn kiểu và build.

### Kiểm thử thủ công
1. Sử dụng script `./test_webhook.sh` để gửi tin nhắn chào hỏi `"你好"` hoặc `"我要點餐"`.
2. Kiểm tra xem thời gian phản hồi có giảm xuống gần 100ms (do chưa tối ưu ngầm) hay không và đảm bảo không có cuộc gọi API nào sang Groq/OpenRouter được in ra trong log.
