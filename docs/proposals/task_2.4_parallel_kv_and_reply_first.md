# PDP: Nhiệm vụ 2.4 - Đọc/Ghi dữ liệu Tối ưu & Dự phòng API Phản hồi (Reply-First & Push Fallback)

Tài liệu này chi tiết hóa thiết kế kỹ thuật của **Task 4** trong kế hoạch khắc phục lỗi trễ và mất phản hồi của Webhook LINE. Mục tiêu là loại bỏ độ trễ do các thao tác lưu trữ đồng bộ (KV operations) bằng cách đọc song song và trì hoãn việc ghi (Reply-First), đồng thời xây dựng cơ chế tự động gửi tin nhắn chủ động (Push API) dự phòng khi token phản hồi hết hạn.

---

## 1. Mục tiêu & Phạm vi

### Mục tiêu
* **Tối ưu hóa đọc dữ liệu (Parallel KV Reads)**: Thực hiện gom các thao tác đọc KV riêng rẽ cho trạng thái `draft`, `pending`, và `liff_redirected` thành một luồng duy nhất bằng `Promise.all` tại điểm bắt đầu xử lý tin nhắn để tiết kiệm thời gian đọc tuần tự.
* **Reply-First Pattern (Trả lời trước, ghi dữ liệu sau)**: Gửi tin nhắn phản hồi về cho LINE trước khi tiến hành cập nhật đơn hàng (`saveOrder`) hoặc xóa pending states, loại bỏ hoàn toàn độ trễ của việc lưu trữ dữ liệu (~150ms-250ms) khỏi trải nghiệm của khách hàng.
* **Ghi dữ liệu song song (Parallel Writes)**: Refactor `saveOrder` để đồng thời ghi file đơn hàng mới, cập nhật index chính, và dọn dẹp bộ nhớ đệm (cache) thay vì chờ đợi tuần tự từng bước.
* **Dự phòng token phản hồi hết hạn (Push Fallback)**: Khi AI phản hồi quá chậm làm `replyToken` hết hạn, hệ thống tự động bắt lỗi và sử dụng `pushLineMessage` gửi lại tin nhắn cho khách hàng qua ID để tránh mất tin.

### Phạm vi ảnh hưởng
* **Backend**:
  * [line.ts](file:///Users/duc.cao/Documents/learning/benmi-order/benmi-worker-official/src/modules/line.ts): Refactor cấu trúc đọc dữ liệu ở đầu luồng ngầm, thay đổi thứ tự gọi hàm trả lời và cập nhật KV, viết hàm send logic fallback.
  * [orders.ts](file:///Users/duc.cao/Documents/learning/benmi-order/benmi-worker-official/src/modules/orders.ts): Refactor hàm `saveOrder()` sử dụng `Promise.all`.

---

## 2. Chi tiết Thiết kế Kỹ thuật

### 2.1 Cải tiến đọc dữ liệu KV song song (`Promise.all`)
Thay vì gọi `await` nối tiếp:
```typescript
// Thiết kế cũ (Tốn thời gian):
const draftRaw = await env.ORDER_STATE.get(draftKey);
const pMap = await getPendingMap(env, userId);
const liffRedirect = await env.ORDER_STATE.get(`liff_redirected:${userId}`);
```

Chuyển đổi thành đọc song song:
```typescript
// Thiết kế mới (Tối ưu):
const [draftRaw, pendingRaw, liffRedirected] = await Promise.all([
  env.ORDER_STATE.get(draftKey),
  env.ORDER_STATE.get(pendingKey),
  env.ORDER_STATE.get(`liff_redirected:${userId}`)
]);
```

### 2.2 Cơ chế gửi tin phản hồi có dự phòng (Push Fallback)
```typescript
export async function sendLineReplyOrPush(
  replyToken: string, 
  userId: string, 
  text: string, 
  env: Env
): Promise<void> {
  const success = await replyText(replyToken, text, env);
  
  // Nếu replyToken hết hạn (hoặc lỗi kết nối), tự động gửi tin nhắn chủ động (Push Message API)
  if (!success && userId) {
    console.warn(`[Benmi] replyToken expired or failed. Falling back to pushLineMessage for user=${userId}`);
    await pushLineMessage(userId, text, env);
  }
}
```

### 2.3 Cấu trúc ghi dữ liệu song song trong `saveOrder` (`src/modules/orders.ts`)
```typescript
export async function saveOrder(env: Env, order: Order): Promise<void> {
  // 1. Ghi đơn hàng chính (Phải hoàn thành trước để đảm bảo tính toàn vẹn dữ liệu)
  await env.ORDER_STATE.put(`order:${order.key}`, JSON.stringify(order));

  // 2. Ghi index và cache view song song trong background
  await Promise.all([
    updateIndex(env, order.key),
    updateViewCache(env, order)
  ]);
}

async function updateIndex(env: Env, orderKey: string): Promise<void> {
  const indexRaw = await env.ORDER_STATE.get(ORDER_INDEX_LATEST);
  let keys: string[] = [];
  try { keys = indexRaw ? JSON.parse(indexRaw) : []; } catch { keys = []; }
  if (!Array.isArray(keys)) keys = [];
  if (!keys.includes(orderKey)) keys.unshift(orderKey);
  keys = keys.filter(Boolean);
  keys = [...new Set(keys)].slice(0, MAX_INDEX);
  await env.ORDER_STATE.put(ORDER_INDEX_LATEST, JSON.stringify(keys));
}

async function updateViewCache(env: Env, order: Order): Promise<void> {
  const cacheRaw = await env.ORDER_STATE.get("order_view:cache");
  let orders: Order[] = [];
  try { orders = cacheRaw ? JSON.parse(cacheRaw) : []; } catch { orders = []; }

  if (!cacheRaw || orders.length === 0) {
    await env.ORDER_STATE.delete("order_view:cache");
    return;
  }

  const idx = orders.findIndex(o => o.key === order.key);
  if (idx >= 0) {
    orders[idx] = order;
  } else {
    orders.unshift(order);
  }

  orders = orders.filter(Boolean).slice(0, MAX_INDEX);
  orders.sort((a, b) => (b?.createdAt || 0) - (a?.createdAt || 0));
  await env.ORDER_STATE.put("order_view:cache", JSON.stringify(orders));
}
```

---

## 3. Kế hoạch Triển khai & Kiểm thử

### Các bước thực hiện
1. Sửa hàm `saveOrder` trong `orders.ts` để tối ưu các bước lưu trữ song song.
2. Tích hợp hàm `sendLineReplyOrPush` vào `line.ts`.
3. Thay đổi thứ tự gọi hàm trong luồng xử lý: Gửi tin nhắn trước, gọi cập nhật KV/Google Sheets sau trong `ctx.waitUntil`.

### Kiểm thử
1. Đảm bảo mã nguồn biên dịch thành công mà không có lỗi TypeScript.
2. Kiểm tra log của Cloudflare xem có ghi nhận trường hợp `Fallback to pushLineMessage` khi giả lập thời gian trễ của AI lớn hơn 30 giây không.
