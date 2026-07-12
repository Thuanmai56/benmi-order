# PDP: Nhiệm vụ 2.1 - Tích hợp Groq API & Tối ưu hóa Gọi AI (Gói Miễn Phí)

Tài liệu này chi tiết hóa thiết kế kỹ thuật của **Task 1** trong kế hoạch khắc phục lỗi trễ và mất phản hồi của Webhook LINE. Mục tiêu chính là chuyển đổi dịch vụ AI chính sang Groq API, thiết lập cấu hình tối ưu hóa độ trễ, và hoàn thiện cơ chế tự động chuyển đổi dự phòng (fallback) sang OpenRouter trong trường hợp lỗi hoặc hết quota.

---

## 1. Mục tiêu & Phạm vi

### Mục tiêu
* **Chuyển đổi AI Provider**: Chuyển đổi kênh gọi AI mặc định sang **Groq API** (`https://api.groq.com/openai/v1/chat/completions`) sử dụng model miễn phí siêu nhanh `llama-3.1-8b-instant` (thời gian phản hồi dự kiến ~0.15s - 0.3s).
* **Cơ chế Fallback thông minh**: Tự động chuyển vùng gọi sang OpenRouter (`google/gemini-2.5-flash:free`) nếu Groq bị lỗi mạng, trả về mã lỗi HTTP 429 (Rate Limit) hoặc khi thiếu cấu hình API Key.
* **Tối ưu hóa Latency AI**: Cấu hình `temperature: 0` và giới hạn `max_tokens: 10` để tránh AI sinh từ dư thừa. Đồng thời loại bỏ việc thêm tiền tố bắt buộc dịch ngôn ngữ tiếng Phồn thể đối với các prompts phân loại ý định ngầm.
* **Tăng tính giám sát (Observability)**: Tích hợp cấu hình `traces` trong Cloudflare Worker và bổ sung timeout cứng 8 giây cho API.

### Phạm vi ảnh hưởng
* **Backend**: Tạo mới [groq.ts](file:///Users/duc.cao/Documents/learning/benmi-order/benmi-worker-official/src/integrations/groq.ts), xóa bỏ [openRouter.ts](file:///Users/duc.cao/Documents/learning/benmi-order/benmi-worker-official/src/integrations/openRouter.ts).
* **Định nghĩa kiểu**: Cập nhật [env.ts](file:///Users/duc.cao/Documents/learning/benmi-order/benmi-worker-official/src/types/env.ts) để hỗ trợ thêm các biến môi trường Groq.
* **Cấu hình**: Cập nhật [wrangler.jsonc](file:///Users/duc.cao/Documents/learning/benmi-order/benmi-worker-official/wrangler.jsonc).

---

## 2. Chi tiết Thiết kế Kỹ thuật

### 2.1 Cập nhật Biến môi trường (`src/types/env.ts`)
```typescript
export interface Env {
  ORDER_STATE: KVNamespace;

  LINE_CHANNEL_TOKEN?: string;
  LIFF_ID?: string;
  LIFF_URL?: string;
  
  // Tích hợp Groq mới (Kênh chính)
  GROQ_API_KEY?: string;
  GROQ_MODEL?: string;

  // Tích hợp OpenRouter cũ (Dùng làm kênh Fallback dự phòng)
  OPENROUTER_API_KEY?: string;
  OPENROUTER_MODEL?: string;
  
  GOOGLE_SHEETS_URL?: string;
}
```

### 2.2 Triển khai logic gọi AI chính & fallback (`src/integrations/groq.ts`)

File `groq.ts` mới sẽ cài đặt hàm `callAI()` để thực hiện gọi nối tiếp: Groq đầu tiên, nếu lỗi hoặc thiếu key sẽ gọi OpenRouter.

```typescript
import { Env } from '../types/env';

// Gọi Groq API (Kênh chính)
async function callGroq(prompt: string, env: Env, signal: AbortSignal): Promise<string | null> {
  if (!env.GROQ_API_KEY) {
    console.warn("[Benmi] callGroq: GROQ_API_KEY is missing");
    return null;
  }

  const model = env.GROQ_MODEL || "llama-3.1-8b-instant";
  const resp = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.GROQ_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: prompt }],
      temperature: 0,
      max_tokens: 10
    }),
    signal
  });

  if (!resp.ok) {
    const errorBody = await resp.text().catch(() => "");
    console.error(`[Benmi] callGroq FAILED: status=${resp.status} body=${errorBody}`);
    return null;
  }

  const result: any = await resp.json();
  return result?.choices?.[0]?.message?.content || null;
}

// Gọi OpenRouter API (Kênh Fallback)
async function callOpenRouterFallback(prompt: string, env: Env, signal: AbortSignal): Promise<string | null> {
  if (!env.OPENROUTER_API_KEY) {
    console.warn("[Benmi] callOpenRouterFallback: OPENROUTER_API_KEY is missing, no fallback possible");
    return null;
  }

  const model = env.OPENROUTER_MODEL || "google/gemini-2.5-flash:free";
  const resp = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: prompt }],
      temperature: 0,
      max_tokens: 10
    }),
    signal
  });

  if (!resp.ok) {
    const errorBody = await resp.text().catch(() => "");
    console.error(`[Benmi] callOpenRouterFallback FAILED: status=${resp.status} body=${errorBody}`);
    return null;
  }

  const result: any = await resp.json();
  return result?.choices?.[0]?.message?.content || null;
}

// Hàm Call AI chính (Bao bọc cả hai kênh)
export async function callAI(prompt: string, env: Env, timeoutMs: number = 8000): Promise<string | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const startTime = Date.now();
    // 1. Thử gọi Groq
    let result = await callGroq(prompt, env, controller.signal);
    
    // 2. Nếu Groq thất bại, tự động chuyển vùng gọi sang OpenRouter
    if (!result) {
      console.warn(`[Benmi] Groq failed. Falling back to OpenRouter...`);
      result = await callOpenRouterFallback(prompt, env, controller.signal);
      console.log(`[Benmi] OpenRouter fallback result in ${Date.now() - startTime}ms`);
    } else {
      console.log(`[Benmi] Groq call success in ${Date.now() - startTime}ms`);
    }

    clearTimeout(timeoutId);
    return result;
  } catch (e: any) {
    clearTimeout(timeoutId);
    if (e.name === "AbortError") {
      console.error(`[Benmi] callAI TIMEOUT after ${timeoutMs}ms`);
    } else {
      console.error("[Benmi] callAI EXCEPTION:", e.message);
    }
    return null;
  }
}
```

---

## 3. Kế hoạch Triển khai & Kiểm thử

### Các bước thực hiện
1. Tạo file `groq.ts` trong thư mục `src/integrations/`.
2. Sao chép logic cũ và tối ưu như thiết kế trên.
3. Thay thế các lệnh import `callAI` từ `openRouter` sang `groq` trong [line.ts](file:///Users/duc.cao/Documents/learning/benmi-order/benmi-worker-official/src/modules/line.ts).
4. Xóa file `openRouter.ts` để dọn dẹp dự án.
5. Cập nhật `wrangler.jsonc` để bật traces.
6. Thêm kiểu dữ liệu trong `env.ts`.

### Kiểm thử thủ công
1. Chạy `tsc --noEmit` để đảm bảo không lỗi kiểu TypeScript.
2. Thiết lập sai `GROQ_API_KEY` (hoặc để trống) và kiểm tra log xem hệ thống có tự động fallback thành công sang OpenRouter qua CLI log không.
3. Đo thời gian xử lý của Groq API xem có đạt mức tối ưu (< 300ms) khi gọi trực tiếp không.
