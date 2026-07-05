# PDP: Nhiệm vụ 1.0 - Chuyển đổi sang TypeScript và Tách Module cho Benmi Worker

Tài liệu này trình bày thiết kế kỹ thuật chi tiết, cấu trúc thư mục mới và lộ trình triển khai từng bước cho việc chuyển đổi mã nguồn Cloudflare Worker của Benmi từ JavaScript sang TypeScript, đồng thời phân rã file monolithic `worker.js` thành các module độc lập.

---

## 1. Mục tiêu & Phạm vi

### Mục tiêu
*   **TypeScript hóa:** Chuyển đổi 100% mã nguồn backend sang TypeScript sử dụng cấu hình nghiêm ngặt (`strict: true`) và `@cloudflare/workers-types`.
*   **Phân rã Monolith:** Chia nhỏ file [worker.js](file:///Users/duccao/Documents/benmi-order/benmi-worker-official/src/worker.js) (1040 dòng) thành các file module đơn nhiệm để phục vụ việc phát triển tính năng đa hộ thuê (multi-tenant) dễ dàng.
*   **Định nghĩa kiểu dữ liệu nghiệp vụ:** Tạo các interface chuẩn cho `Order`, `Menu`, `StoreConfig` nhằm tránh lỗi kiểu dữ liệu lúc runtime.

### Phạm vi ảnh hưởng
*   Mã nguồn backend trong thư mục `benmi-worker-official`.
*   Cấu hình Wrangler (`wrangler.jsonc`) - thay đổi điểm chạy chính (`main`) sang file TS mới.
*   *Lưu ý:* Nhiệm vụ này **không thay đổi logic nghiệp vụ** và **không thay đổi giao diện Frontend**. Tất cả các API routes hiện tại phải hoạt động giống hệt 100%.

---

## 2. Kiến trúc Thư mục Mới

Mã nguồn mới sẽ được tổ chức theo cấu trúc module phân lớp rõ ràng:

```text
benmi-worker-official/
  ├── src/
  │    ├── index.ts                 # Entry point của Worker, xử lý routing chính
  │    ├── modules/                 # Chứa logic nghiệp vụ cốt lõi
  │    │     ├── auth.ts            # Xử lý mật khẩu dashboard & tạo link tạm thời (templink)
  │    │     ├── config.ts          # Lấy/cập nhật cấu hình cửa hàng
  │    │     ├── line.ts            # Tiếp nhận Line Webhook & gửi tin nhắn qua Line API
  │    │     ├── menu.ts            # Lấy/cập nhật thực đơn
  │    │     └── orders.ts          # Quản lý vòng đời đơn hàng (tạo, cập nhật, lưu trữ)
  │    ├── integrations/            # Kết nối với các bên thứ ba (APIs ngoại vi)
  │    │     ├── googleSheets.ts    # Xuất đơn hàng ra Google Sheets
  │    │     └── openRouter.ts      # Gọi AI bằng OpenRouter
  │    ├── utils/                   # Hàm tiện ích dùng chung
  │    │     └── http.ts            # Xử lý CORS và helper trả về JSON Response
  │    └── types/                   # Định nghĩa kiểu dữ liệu TypeScript
  │          ├── env.ts             # Định nghĩa bindings (KV, Secrets, Env vars)
  │          └── index.ts           # Định nghĩa các thực thể (Order, Menu, Config, v.v.)
  ├── tsconfig.json                 # Cấu hình compiler TypeScript
  ├── package.json                  # Cấu hình dependencies mới
  └── wrangler.jsonc                # Cập nhật đường dẫn file chạy chính
```

---

## 3. Thiết lập Kiểu dữ liệu (TypeScript Types & Interfaces)

### 3.1 Cấu hình Môi trường (`src/types/env.ts`)
```typescript
export interface Env {
  // Bindings
  ORDER_STATE: KVNamespace;

  // Secrets & Env Variables
  LINE_CHANNEL_TOKEN?: string;
  LIFF_ID?: string;
  LIFF_URL?: string;
  OPENROUTER_API_KEY?: string;
  OPENROUTER_MODEL?: string;
  GOOGLE_SHEETS_URL?: string;
}
```

### 3.2 Kiểu Dữ liệu Nghiệp vụ (`src/types/index.ts`)
```typescript
export interface Order {
  key: string;
  customer: string;
  time: string; // Định dạng pickup time "YYYY-MM-DD HH:mm"
  content: string;
  status: 'NEW' | 'ACCEPTED' | 'DONE' | 'PICKED_UP' | 'WAITING_CUSTOMER_CHANGE' | 'WAITING_CUSTOMER_REJECT' | 'REJECTED';
  createdAt: number;
  userId: string;
  total: number;
  reason?: string;
  note?: string;
}

export interface MenuItem {
  id: string;
  name: string;
  price: number;
  category: 'small' | 'large' | 'combo' | 'drink' | string;
  available: boolean;
  description?: string;
}

export interface Menu {
  categories: string[];
  items: MenuItem[];
}

export interface StoreConfig {
  operatingHours?: {
    start: string;
    end: string;
  };
  liffId?: string | null;
}
```

---

## 4. Kế hoạch Phân rã File (Module Breakdown)

### 1. `src/utils/http.ts`
Chứa các hàm tiện ích về HTTP:
*   `corsHeaders()`: Trả về headers CORS dùng chung.
*   `json(data: any, status?: number)`: Trả về `Response` định dạng JSON kèm theo CORS headers.

### 2. `src/integrations/googleSheets.ts`
Chứa hàm `syncToGoogleSheets(order: Order, env: Env)`.

### 3. `src/integrations/openRouter.ts`
Chứa hàm `callAI(prompt: string, env: Env)`.

### 4. `src/modules/config.ts`
Chứa các hàm:
*   `getConfig(env: Env)`
*   `updateConfig(request: Request, env: Env)`

### 5. `src/modules/menu.ts`
Chứa các hàm:
*   `getMenu(env: Env)`
*   `updateMenu(request: Request, env: Env)`

### 6. `src/modules/auth.ts`
Chứa các hàm xử lý xác thực:
*   `handleAuth(request: Request, env: Env, url: URL)`
*   `handleAuthChange(request: Request, env: Env)`
*   `handleCreateTempLink(request: Request, env: Env)`
*   `handleVerifyTempLink(request: Request, env: Env)`

### 7. `src/modules/orders.ts`
Quản lý trạng thái và lưu trữ đơn hàng:
*   `createOrder(request: Request, env: Env)`
*   `updateOrder(request: Request, env: Env, ctx: ExecutionContext)`
*   `getOrders(env: Env)`
*   `saveOrder(env: Env, order: Order)`
*   `getPendingMap(env: Env, userId: string)`

### 8. `src/modules/line.ts`
Xử lý toàn bộ logic webhook của LINE và tin nhắn phản hồi:
*   `handleLineWebhook(request: Request, env: Env, ctx: ExecutionContext)`
*   `pushLineMessage(userId: string, text: string, env: Env)`
*   `replyText(replyToken: string, text: string, env: Env)`
*   `replyWithLiffRedirect(replyToken: string, userId: string, env: Env)`
*   `normalizeCustomerReply(text: string)`
*   `handleQuickReply(text: string)`

### 9. `src/index.ts`
Là Router chính tiếp nhận mọi request HTTP và định tuyến tới module xử lý tương ứng:
```typescript
import { Env } from './types/env';
import { corsHeaders } from './utils/http';
import { handleLineWebhook } from './modules/line';
import { createOrder, updateOrder, getOrders } from './modules/orders';
import { getConfig, updateConfig } from './modules/config';
import { getMenu, updateMenu } from './modules/menu';
import { handleAuth, handleAuthChange, handleCreateTempLink, handleVerifyTempLink } from './modules/auth';

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders() });
    }

    if (request.method === "POST" && (path === "/webhook" || path === "/")) {
      return handleLineWebhook(request, env, ctx);
    }
    if (request.method === "POST" && path === "/api/create") return createOrder(request, env);
    if (request.method === "POST" && path === "/api/update") return updateOrder(request, env, ctx);
    if (request.method === "GET" && path === "/api/orders") return getOrders(env);
    if (request.method === "GET" && path === "/api/config") return getConfig(env);
    if (request.method === "POST" && path === "/api/config") return updateConfig(request, env);
    if (request.method === "GET" && path === "/api/menu") return getMenu(env);
    if (request.method === "POST" && path === "/api/menu") return updateMenu(request, env);
    if ((request.method === "POST" || request.method === "GET") && path === "/api/auth") return handleAuth(request, env, url);
    if (request.method === "POST" && path === "/api/auth/change") return handleAuthChange(request, env);
    if (request.method === "POST" && path === "/api/auth/templink") return handleCreateTempLink(request, env);
    if (request.method === "GET" && path === "/api/auth/templink") return handleVerifyTempLink(request, env);

    return new Response("Not Found", { status: 404, headers: corsHeaders() });
  }
};
```

---

## 5. Kế hoạch triển khai từng bước

### Bước 1: Chuẩn bị Môi trường & Dependencies
1.  Cài đặt các thư viện devDependencies vào dự án `benmi-worker-official`:
    *   `typescript`
    *   `@cloudflare/workers-types`
2.  Tạo file cấu hình `tsconfig.json`.
3.  Cập nhật file `wrangler.jsonc` thay thế `"main": "src/worker.js"` bằng `"main": "src/index.ts"`.

### Bước 2: Tạo các file Định nghĩa Kiểu dữ liệu
1.  Tạo file `src/types/env.ts` cho môi trường.
2.  Tạo file `src/types/index.ts` chứa các interface nghiệp vụ (`Order`, `Menu`, v.v.).

### Bước 3: Di chuyển và Tách file
Di chuyển tuần tự mã nguồn từ file [worker.js](file:///Users/duccao/Documents/benmi-order/benmi-worker-official/src/worker.js) sang các file TypeScript tương ứng như phân tích tại Mục 4.

### Bước 4: Sửa lỗi Kiểu dữ liệu (TypeScript Compile Fixes)
Khắc phục các lỗi về kiểu dữ liệu khi compile (như xử lý kiểu dữ liệu của `Request.json()`, `KVNamespace.get()`, ép kiểu trạng thái đơn hàng, v.v.).

### Bước 5: Chạy kiểm thử Local & Deploy thử nghiệm
1.  Chạy `npm run dev` để chạy thử nghiệm local và kiểm thử các API bằng postman/curl.
2.  Deploy thử lên Cloudflare Workers thông qua `npm run deploy`.

---

## 6. Kế hoạch Xác minh & Kiểm thử (Verification Plan)

### Kiểm thử Tự động (TypeScript compiler)
Chạy lệnh kiểm tra cú pháp và kiểu dữ liệu:
```bash
npx tsc --noEmit
```
*Yêu cầu:* Lệnh trên phải chạy thành công không sinh ra bất kỳ lỗi nào.

### Kiểm thử Thủ công (Manual APIs Test)
Thực hiện gọi thử các API chính thông qua `curl` trên local server:

1.  **Lấy Thực đơn (Menu):**
    ```bash
    curl -X GET http://localhost:8787/api/menu
    ```
2.  **Lấy Cấu hình (Config):**
    ```bash
    curl -X GET http://localhost:8787/api/config
    ```
3.  **Xem danh sách đơn hàng:**
    ```bash
    curl -X GET http://localhost:8787/api/orders
    ```
