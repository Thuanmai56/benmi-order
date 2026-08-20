# Benmi & Multi-Tenant Order Platform Architecture & Deployment Guide

Tài liệu này mô tả chi tiết kiến trúc đa môi trường (**STAGING** và **PRODUCTION**), cấu trúc multi-tenant, cơ chế tự động nhận diện biến môi trường (Zero Manual Hardcode Config), và quy trình deploy cho hệ thống đặt món qua LINE LIFF & POS Dashboard.

---

## 1. Kiến Trúc Tổng Quan (System Architecture)

Hệ thống bao gồm 2 tầng chính:
- **FrontEnd (Cloudflare Pages):** Gồm trang đặt món khách hàng (`index.html`) và Bảng quản lý đơn hàng POS (`orders.html`), phân tách logic thành các module JS tinh gọn (`js/client-checkout.js`, `js/orders-core.js`, `js/orders-live.js`, `js/orders-menu.js`, v.v.).
- **BackEnd (Cloudflare Workers, D1 & KV):** Xử lý API, xác thực LINE Webhook, đồng bộ đơn hàng theo thời gian thực (ETag & Cache Optimization) và quản lý cấu hình từng quán (Multi-tenant).

```mermaid
graph TD
    subgraph github ["GitHub Repo: benmi-order"]
        BranchStaging["Branch: staging"]
        BranchMain["Branch: main"]
    end

    subgraph pages ["Cloudflare Pages (benmi-order.pages.dev)"]
        SubStaging["Môi trường STAGING:<br>staging.benmi-order.pages.dev"]
        SubProd["Môi trường PRODUCTION:<br>benmi-order.pages.dev"]
    end

    BranchStaging -- "auto deploy" --> SubStaging
    BranchMain -- "auto deploy" --> SubProd

    subgraph test_env ["Môi trường STAGING"]
        A1[LINE Account Test] <--> SubStaging
        SubStaging <--> C1["Worker STAGING:<br>platform-worker-staging.thuanmnc.workers.dev"]
        C1 <--> D1_DB[("D1 DB: blab-db-test")]
        C1 <--> KV1[("KV: ORDER_STATE (test)")]
    end

    subgraph prod_env ["Môi trường PRODUCTION"]
        A2[LINE Account Production] <--> SubProd
        SubProd <--> C2["Worker PRODUCTION:<br>benmi-worker-official.thuanmnc.workers.dev"]
        C2 <--> D2_DB[("D1 DB: blab-db-production")]
        C2 <--> KV2[("KV: ORDER_STATE (prod)")]
    end

    style github fill:#f5f5f5,stroke:#333,stroke-width:2px
    style pages fill:#fff3e0,stroke:#e65100,stroke-width:2px
    style test_env fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    style prod_env fill:#efebe9,stroke:#4e342e,stroke-width:2px
```

---

## 2. Bảng Tra Cứu Môi Trường & Tự Động Nhận Diện

Hệ thống sử dụng cơ chế **Tự động nhận diện môi trường (Dynamic Environment Resolution)**, lập trình viên và quản trị viên **không cần chỉnh sửa hardcode bất kỳ biến nào trong code** khi chuyển đổi giữa Staging và Production.

| Thông số | Môi trường STAGING | Môi trường PRODUCTION |
| :--- | :--- | :--- |
| **Domain FrontEnd** | [staging.benmi-order.pages.dev](https://staging.benmi-order.pages.dev) | [benmi-order.pages.dev](https://benmi-order.pages.dev) |
| **Worker API URL (`WORKER_BASE`)** | `https://platform-worker-staging.thuanmnc.workers.dev` | `https://benmi-worker-official.thuanmnc.workers.dev` |
| **Default Fallback LIFF ID** | `2009555608-DMioljsI` | `2009560906-c5taZfiY` |
| **Cơ sở dữ liệu D1** | `blab-db-test` | `blab-db-production` |
| **Branch GitHub tương ứng** | `staging` | `main` |

### Cơ chế Tự Động:
1. **`WORKER_BASE`**: Tự động trỏ sang `platform-worker-staging` khi chạy trên `localhost`, `127.0.0.1`, hoặc domain có chứa `staging`/`test`. Ngược lại tự động trỏ về `benmi-worker-official` trên Production.
2. **`liffId`**: Được nạp động trực tiếp từ cấu hình của từng tenant (`tenant_config` / `/api/tenant/bootstrap`). Nếu chưa có, tự động dùng fallback LIFF ID tương ứng với môi trường.
3. **Tenant Routing**: Hỗ trợ qua tham số URL `?tenant_id=<id>` (ví dụ `?tenant_id=benmi` hoặc `?tenant_id=zhadantongxue` hoặc `?tenant_id=jidangaodashu`).

---

## 3. Quy Trình Triển Khai Chuẩn (Standard Deployment Workflow)

```mermaid
flowchart TD
    Start([Bắt đầu phát triển]) --> CodeChange[Lập trình & Kiểm thử trên staging]
    CodeChange --> DeployWorkerTest["Deploy Worker Staging:<br>cd benmi-worker-official && npx wrangler deploy --env test"]
    DeployWorkerTest --> PushStaging["Push lên GitHub branch staging:<br>Cloudflare Pages tự deploy staging.benmi-order.pages.dev"]
    PushStaging --> VerifyTest{Kiểm thử trên Staging OK?}
    
    VerifyTest -- Có lỗi --> FixBug[Sửa lỗi]
    FixBug --> CodeChange
    
    VerifyTest -- OK, sẵn sàng Release --> ApplyD1Prod["1. Apply D1 Migrations Production:<br>npx wrangler d1 migrations apply blab-db-production --remote"]
    ApplyD1Prod --> DeployWorkerProd["2. Deploy Worker Production:<br>cd benmi-worker-official && npx wrangler deploy"]
    DeployWorkerProd --> MergeMain["3. Merge staging vào main & Push:<br>git checkout main && git merge staging && git push origin main"]
    MergeMain --> PagesProd["Cloudflare Pages tự động deploy Production benmi-order.pages.dev"]
    PagesProd --> End([Hoàn thành Deploy Production])
```

---

## 4. Hướng Dẫn Lệnh Deploy Chi Tiết

### A. Deploy lên STAGING:
```bash
# 1. Apply migration D1 Test / Staging (nếu có migration mới):
cd benmi-worker-official
npx wrangler d1 migrations apply blab-db-test --remote --env test

# 2. Deploy Worker Staging:
npx wrangler deploy --env test

# 3. Deploy FrontEnd Staging:
git add .
git commit -m "feat/fix: mô tả thay đổi"
git push origin staging
```

### B. Deploy lên PRODUCTION:
```bash
# 1. Apply migration D1 Production:
cd benmi-worker-official
npx wrangler d1 migrations apply blab-db-production --remote

# 2. Deploy Worker Production:
npx wrangler deploy

# 3. Merge & Deploy FrontEnd Production:
git checkout main
git merge staging
git push origin main
git checkout staging
```
