# Tiến độ thực hiện Kế hoạch Copy Dữ liệu Menu cũ sang Schema mới

Ngày bắt đầu: 2026-10-01
Môi trường nguồn: Production (`blab-db-production` / `48479f91-eec7-4da2-b044-edaaf622f195`) — CHỈ ĐỌC (Read-Only)
Môi trường đích ban đầu: Local SQLite / Database độc lập phục vụ kiểm tra và xác minh
Trạng thái: Đang thực hiện T01

---

## Danh sách Task và Trạng thái

- [x] **Khởi tạo & Khảo sát**: Đọc DATA_COPY_PLAN.md, AGENTS.md, kiểm tra git status (branch `dev`, commit `9f68ad4`), xác nhận phạm vi với user.
- [x] **T01 — Chốt nguồn/đích và kiểm kê read-only**:
  - [x] Đọc schema thật từ remote production (tables, columns, indexes, FK, applied migrations).
  - [x] Đọc semantics legacy bindings từ code hiện hành.
  - [x] Kiểm kê chi tiết tenants (14), groups (26 customizations + 20 modifier categories), options, rules (5), bindings (23 specific/wildcard), orphan (0), collision (0).
  - [x] Xuất `inventory.json`, `schema-gap.md`.
- [x] **T02 — Tạo snapshot nhất quán và bản database riêng**:
  - [x] Xuất snapshot JSON của 11 bảng liên quan từ production kèm SHA256 checksum/timestamp (`snap_2026-10-01T11-56-30-635Z`).
  - [x] Khôi phục 100% vào local isolated SQLite database (`latest_isolated_target.db`), đối chiếu khớp số dòng toàn diện.
- [x] **T03 — Chốt mapping từng field và identity**:
  - [x] Lập quy tắc mapping chi tiết tenant + source kind + source identity → target ID (deterministic hash).
  - [x] Xuất `field-mapping.md`, `id-map.json` (46 groups, 169 options, 24 category links), `conflicts.json` (0 conflicts).
- [x] **T04 — Viết DDL bổ sung tối thiểu**:
  - [x] Tạo file migration additive `0064_add_modifier_migration_metadata.sql` thêm các cột dự kiến (`source_metadata_json`, `sub_options_json`, `eligibility_rules_json`, `is_out_of_stock`, `description`).
  - [x] Apply lên local isolated DB (`latest_isolated_target.db`), xác minh 100% dữ liệu gốc không suy chuyển.
- [x] **T05 — Viết script preview copy**:
  - [x] Xây dựng script dry-run preview `preview.mjs` phân loại hành động theo từng record.
  - [x] Chạy dry-run, sinh `copy-preview.json` (239 inserts: 46 groups, 169 options, 24 links; 0 conflict, 0 unresolved).
- [x] **T06 — Copy vào database riêng**:
  - [x] Chạy apply từng tenant và batch qua transaction trên local isolated DB (`latest_isolated_target.db`).
  - [x] 11/11 tenants thành công: chèn 46 groups, 169 options, 24 category links.
  - [x] Lưu checkpoint, `inserted-records.json`, `execution-report.json`.
  - [x] Kiểm tra rerun: 239/239 records đạt `already_equal`, 0 duplicate.
- [x] **T07 — Đối chiếu dữ liệu sau copy**:
  - [x] Chạy script `verify.mjs` đối chiếu 100% chi tiết:
    - 46/46 `modifier_groups` khớp 100%.
    - 169/169 `modifier_options` khớp 100%.
    - 13/13 options có `sub_options_json` khớp 100%.
    - 5/5 options có `eligibility_rules_json` khớp 100%.
    - 24/24 `category_modifier_links` khớp 100%.
    - 0 lỗi foreign keys (`PRAGMA foreign_key_check`).
    - 4/4 bảng nguồn (`menu_categories`, `menu_items`, `menu_customizations`, `menu_customization_option_rules`) được bảo toàn 100% nguyên vẹn.
    - 0 discrepancies (0 lỗi chênh lệch).
  - [x] Sinh `data-parity-report.json`.
- [x] **T08 — Đánh giá đích vận hành và bàn giao**:
  - [x] Đã hoàn thành bộ công cụ hoàn chỉnh tại `scripts/menu-data-copy/` (`cli.mjs`, `inventory.mjs`, `snapshot.mjs`, `mapping.mjs`, `preview.mjs`, `apply.mjs`, `verify.mjs`).
  - [x] Tạo file migration additive chuẩn Cloudflare D1 `benmi-worker-official/migrations/0064_add_modifier_migration_metadata.sql`.
  - [x] Toàn bộ artifacts và dataset canonical đã được kiểm chứng lưu trữ tại `docs/proposals/full_menu_schema_migration/artifacts/`.
  - [x] Báo cáo nghiệm thu bàn giao cho người dùng.

---

## Nhật ký Đồng Bộ Nguyên Trạng Toàn Diện Production sang Dev (`blab-db-dev`) — 2026-10-01

1. **Yêu cầu & Phạm vi**:
   - Copy nguyên trạng 100% dữ liệu menu và canonical modifier từ Production (`blab-db-production`) sang Dev (`blab-db-dev`).
   - Dọn sạch các dữ liệu thử nghiệm cũ trên Dev ở các bảng menu.
   - **Bảo toàn tuyệt đối**: Toàn bộ cấu hình nhạy cảm trên Dev (`line_channel_token`, `line_channel_secret`, `liff_id`, `liff_url`, `groq_api_key`, `groq_model`, `openrouter_api_key`, `openrouter_model`), không để lộ hay ghi đè credentials/tokens/keys giữa các môi trường.
   - Giữ nguyên các đơn hàng hiện có trên Dev (`orders` 2211 dòng).

2. **Thực thi (`scripts/menu-data-copy/full-sync-prod-to-dev.mjs`)**:
   - Migration additive: `0064_add_modifier_migration_metadata.sql` đã apply thành công trên remote `blab-db-dev`.
   - Sao lưu toàn bộ credentials của 14 tenants hiện tại trên Dev.
   - Dọn sạch dữ liệu cũ/thử nghiệm trên các bảng menu Dev (`item_modifier_links`, `category_modifier_links`, `modifier_options`, `modifier_groups`, `menu_bundle_rules`, `menu_customization_option_rules`, `menu_customizations`, `menu_items`, `menu_categories`, `tenant_config`).
   - Nạp nguyên trạng từ Production và khôi phục sensitive configs Dev:
     - `tenants`: 15 rows (cập nhật 14 tenants chính thức + giữ tenant dev).
     - `tenant_config`: 14 rows (100% giữ LIFF ID dev `2011224566-kLLdMjkq` và LINE tokens dev, 0 leak prod keys).
     - `menu_categories`: 82 rows (khớp 100% Production).
     - `menu_items`: 527 rows (khớp 100% Production, nạp qua 6 batch an toàn).
     - `menu_customizations`: 26 rows (khớp 100% Production).
     - `menu_customization_option_rules`: 5 rows (khớp 100% Production).
     - `menu_bundle_rules`: 31 rows (khớp 100% Production).
     - `modifier_groups`: 46 rows (schema mới chuẩn canonical).
     - `modifier_options`: 169 rows (schema mới chuẩn canonical, đầy đủ metadata).
     - `category_modifier_links`: 24 rows (schema mới chuẩn canonical).

3. **Kiểm tra Đối chiếu & Toàn vẹn (Post-Verification)**:
   - Foreign Keys (`PRAGMA foreign_key_check`): **HỢP LỆ 100% (0 lỗi trên toàn bộ bảng menu)**.
   - Trạng thái đơn hàng (`orders`): **2,211 đơn hàng nguyên vẹn**.
   - Cấu hình KV Cache (`ORDER_STATE`): Sạch sẽ, sẵn sàng bootstrap cache mới khi truy cập menu.
   - Static Check (`npm run check`): **PASSED 100%**.


