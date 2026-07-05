# 📒 Sổ Cái Dự Án (Project Ledger) — Benmi SaaS Migration

Tài liệu trung tâm theo dõi toàn bộ tiến trình chuyển đổi **Benmi Order** từ hệ thống đơn shop sang nền tảng **SaaS đa hộ thuê (Multi-Tenant)**.

> **Cập nhật lần cuối:** 2026-07-05

---

## Ký hiệu trạng thái

| Ký hiệu | Ý nghĩa |
|:---:|---|
| ⭐ | **Backlog** — Chưa bắt đầu, nằm trong kế hoạch |
| 🟡 | **In Progress** — Đang được thực hiện |
| ✅ | **Done** — Hoàn thành và đã xác minh |
| ⛔ | **Blocked** — Bị chặn bởi một dependency hoặc vấn đề khác |

---

## Tài liệu Chiến lược Tổng quan

| Tài liệu | Mô tả |
|---|---|
| [saas_migration_proposal.md](proposals/saas_migration_proposal.md) | Đề xuất tổng thể (PDP) về kiến trúc, lộ trình 3 giai đoạn và các quyết định chiến lược cho chuyển đổi SaaS |

---

## Tiến độ Tổng quan theo Giai đoạn

| Giai đoạn | Tên | Thời gian dự kiến | Tiến độ |
|:---:|---|---|:---:|
| 1 | Nền tảng & Bảo mật | Tháng 1–3 | 🟡 1/4 |
| 2 | Đa hộ thuê & Thời gian thực | Tháng 4–8 | ⭐ 0/4 |
| 3 | Hoàn thiện MVP SaaS | Tháng 9–12 | ⭐ 0/2 |

---

## Chi tiết Tiến độ từng Nhiệm vụ

### Giai đoạn 1: Nền tảng & Bảo mật

| # | Nhiệm vụ | Trạng thái | Tài liệu chi tiết | Ghi chú |
|:---:|---|:---:|---|---|
| 1.0 | Chuyển đổi sang TypeScript & Tách Module | ✅ | [task_1.0_typescript_refactor.md](proposals/task_1.0_typescript_refactor.md) | Hoàn thành 2026-07-04. TypeScript strict mode, 9 file module. |
| 1.1 | Gia cố xác thực Dashboard (Auth & Mật khẩu) | ⭐ | *Chưa có proposal* | Hash mật khẩu, auth middleware cho tất cả route ghi. |
| 1.2 | Xác thực chữ ký Webhook LINE | ⭐ | *Chưa có proposal* | HMAC-SHA256 verification qua Web Crypto API. |
| 1.3 | Đưa Secret ra khỏi mã nguồn | ⭐ | *Chưa có proposal* | Xóa hardcode token, dùng `wrangler secret put`. |

---

### Giai đoạn 2: Đa hộ thuê & Thời gian thực

| # | Nhiệm vụ | Trạng thái | Tài liệu chi tiết | Ghi chú |
|:---:|---|:---:|---|---|
| 2.1 | Phân tách dữ liệu KV bằng tiền tố (Prefixing) | ⭐ | *Chưa có proposal* | Thêm `tenant:${tenantId}:` vào mọi KV key. |
| 2.2 | Định tuyến Subdomain động & Static Assets | ⭐ | *Chưa có proposal* | Dùng chung frontend, routing qua Host header. |
| 2.3 | Di chuyển cơ sở dữ liệu sang Cloudflare D1 | ⭐ | *Chưa có proposal* | Shadow Write (KV + D1), schema có `tenant_id`. |
| 2.4 | Durable Objects & WebSocket (Real-time) | ⭐ | *Chưa có proposal* | Thay thế cơ chế polling 5 giây trên dashboard. |

---

### Giai đoạn 3: Hoàn thiện MVP SaaS

| # | Nhiệm vụ | Trạng thái | Tài liệu chi tiết | Ghi chú |
|:---:|---|:---:|---|---|
| 3.1 | Quy trình thiết lập shop thủ công & Cấu hình kênh Chat | ⭐ | *Chưa có proposal* | Seed script + trang cấu hình LINE/Zalo token. |
| 3.2 | Bộ chuyển đổi tin nhắn đa kênh (LINE & Zalo Adapter) | ⭐ | *Chưa có proposal* | `MessagingAdapter` abstraction layer. |

---

### Backlog (Sau 12 tháng)

| # | Nhiệm vụ | Trạng thái | Ghi chú |
|:---:|---|:---:|---|
| B.1 | Self-service Signup Portal | ⭐ | Trang đăng ký tài khoản tự động. |
| B.2 | Cổng thanh toán tự động (Momo/Stripe) | ⭐ | Thu phí thuê bao hàng tháng. |
| B.3 | Custom Domain per tenant | ⭐ | Cho phép shop dùng tên miền riêng. |
| B.4 | BI & Analytics Dashboard | ⭐ | Báo cáo phân tích chuyên sâu. |

---

## Các Quyết định Kiến trúc Quan trọng

Những quyết định đã được thảo luận và chốt trong các buổi CTO Review:

| # | Quyết định | Lựa chọn đã chốt | Ngày |
|:---:|---|---|:---:|
| 1 | Mô hình đa hộ thuê | Subdomain routing + Shared Worker (không dùng Tenant-per-Worker) | 2026-07-04 |
| 2 | Cơ sở dữ liệu | Hybrid: D1 (source of truth) + KV (cache & session) | 2026-07-04 |
| 3 | Cơ chế thời gian thực cho dashboard | Durable Objects + WebSocket (thay thế polling 5 giây) | 2026-07-04 |
| 4 | Xác thực dashboard | Giữ cơ chế mật khẩu + templink, hash password (không dùng JWT) | 2026-07-04 |
| 5 | Ngôn ngữ backend | TypeScript strict mode + Module splitting | 2026-07-04 |
| 6 | Onboarding tenant (pilot) | Thủ công qua seed script, mỗi shop tự cấu hình LINE OA + LIFF ID | 2026-07-04 |
| 7 | Quy mô pilot & Đội ngũ | < 10 shop, 1 solo developer, miễn phí trong giai đoạn pilot | 2026-07-04 |
