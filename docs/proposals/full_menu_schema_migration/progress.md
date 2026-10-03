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

---

## Tiến độ chuyển đổi từng Cụm Menu sang Schema Mới

### Cụm 1: Món cơ bản & Tùy chọn cấp Món / Danh mục (`scope = 'category' | 'item'`)
- **Trạng thái**: **HOÀN THÀNH 100% & ĐÃ DEPLOY DEV (2026-10-02)**.
- **Backend**:
  - `bootstrap.ts`: Loại bỏ hoàn toàn tổng hợp hardcode `benmi_spicy`, đọc trực tiếp `modifier_groups` từ `category_modifier_links` và `item_modifier_links`.
  - Phân bổ `modifierGroups` vào cả cấp `catalog` và cấp `item`.
- **Frontend**:
  - `client-core.js`, `client-customizations.js`, `bundle-builder-v2.js`: Đọc trực tiếp `cat.modifierGroups` và `item.modifierGroups`.
  - Bump cache-buster `?v=20261002_cluster1_modifiers_v1` trong `index.html`.
- **Kiểm thử**:
  - Viết suite `tests/test_cluster1_category_item_modifiers.cjs` (6 tests: 6/6 PASS).
  - Deploy worker dev & purge KV cache `tenant:benmi:bootstrap`.
  - Chạy E2E Live Audit đối chiếu 32/32 món giữa Dev và Prod: Khớp chính xác 100% (0 mismatches).

### Cụm 2: Combo / Bundle Đa Lựa Chọn & Phụ Thu (`menu_bundle_rules`)
- **Trạng thái**: **HOÀN THÀNH 100% (2026-10-02)**.
- **Backend**:
  - `bundle-rules.ts`:
    - Sửa cú pháp SQL strict mode `COALESCE(category_type, "catalog")` -> `'catalog'`.
    - Thêm batch query `category_modifier_links` và `modifier_groups` cho các món con trong combo.
    - Ánh xạ tùy biến món con theo thứ tự: (1) `item_modifier_links` -> (2) `category_modifier_links` -> (3) legacy fallback.
    - Cộng dồn chính xác phụ thu của món con (`extra`) và phụ thu của tùy chọn món con (`catOpt.price`, `itemOpt.price`) vào `surchargeTotal`.
    - Kiểm tra nghiêm ngặt `min_selection`, `max_selection`, `is_required`, `out_of_stock_until` của món con theo schema mới.
- **Frontend**:
  - `bundle-builder-v2.js`:
    - `optionsFor(source)` đọc modifier groups từ `window.getEffectiveItemModifierGroups(source)` và `cat.modifierGroups` (Schema Mới).
    - `bundleEditModifiers`: Render dialog tùy biến món con đầy đủ single/multiple options từ Schema Mới.
    - Lưu snapshot `bundleSelections.portions` và tính `bundleExtra` khớp 100% với backend validator.
- **Kiểm thử TDD**:
  - Tạo suite `tests/test_cluster2_combo_bundle_rules.cjs` (4 test cases + 3 edge-case tests: kiểm tra giá giả mạo `BUNDLE_PRICE_CHANGED`, thiếu tùy biến bắt buộc `BUNDLE_MODIFIER_REQUIRED`, tùy chọn hết hàng `BUNDLE_MODIFIER_NOT_ALLOWED`).
  - Toàn bộ 4/4 test cases PASSED.
  - Toàn bộ regression và static checks (`npm test`, `npm run test:cluster1`, `npm run test:cluster2`, `npm run test:menu-regression`, `npm run test:menu-safety`, `node scripts/check-frontend.js`) đều **PASSED 100%**.

### Cụm 3, 4, 5: Chuyển đổi Toàn diện sang Canonical Schema (Final Cutover Sprint)
- **Trạng thái**: **HOÀN THÀNH 100% & ĐÃ DEPLOY DEV (2026-10-02)**.
- **Phạm vi hoàn tất**:
  - **Cụm 3 (Tùy chọn cấp Đơn Hàng & Ngưỡng giá trị)**: Tùy biến cấp đơn hàng (`scope = 'order'`) và quy tắc điều kiện (`eligibility_rules_json`, `min_order_subtotal`) chuyển đổi 100% sang canonical schema.
  - **Cụm 4 (Sub-options lồng nhau)**: Tùy biến phân cấp 2 tầng (`sub_options_json`) hỗ trợ lựa chọn phụ thu phân cấp mượt mà từ menu client đến POS và lưu vết vào CSDL D1.
  - **Cụm 5 (POS Menu Hub Single-source Cutover)**: Cắt bỏ hoàn toàn dual-write vào `menu_customizations`, POS Menu Hub ghi trực tiếp 100% vào `modifier_groups` và `modifier_options`.
- **Backend**:
  - `bootstrap.ts`:
    - Graceful Cutover: Ưu tiên nạp từ `modifier_groups (scope = 'order')` kèm `sub_options_json` và `eligibility_rules_json`.
    - Phân giải danh sách `customizations` array từ schema mới cho menu client.
  - `orders.ts`:
    - `validateThresholdCustomizations`: Kiểm tra ngưỡng `min_order_subtotal` trực tiếp từ `modifier_options.eligibility_rules_json`.
    - `createOrder`: Đọc các tùy chọn bắt buộc từ `modifier_groups (scope = 'order')`.
    - `formatItemsToText`: Tự động nhận diện và định dạng phân cấp `Option Cha (Sub-option Con) (+$(base + sub))`.
  - `menu.ts`:
    - Loại bỏ lệnh ghi kép `INSERT INTO menu_customizations`. Mọi thao tác lưu tùy biến chỉ ghi vào `modifier_groups` và `modifier_options`.
    - Hỗ trợ lưu trữ `sub_options_json` và `eligibility_rules_json`.
  - `types/index.ts`:
    - Bổ sung `groupId`, `optionId`, `subOption: { id, name, price }` vào interface `OrderItemOption`.
- **Frontend**:
  - `client-customizations.js`:
    - Hiển thị badge ngưỡng đơn hàng `(滿 $X 可選)` nếu có `minOrderSubtotal`.
    - Render Inline Sub-chip Selector mượt mà ngay dưới option cha khi được chọn, tự chọn default sub-option và reset khi bỏ chọn.
    - Cộng dồn chính xác phụ thu của sub-option vào tổng tiền món.
  - `client-checkout.js`:
    - Đóng gói cấu trúc `subOption: { id, name, price }` vào payload gửi lên backend khi submit đơn hàng.
  - `client-core.js`:
    - Bảo vệ an toàn `typeof URLSearchParams !== 'undefined'` trong hàm `isDesktopOutsideLiff`.
  - `index.html`:
    - Bump cache-buster: `?v=20261002_cluster3_4_5_cutover_v1`.
- **Kiểm thử & Triển khai**:
  - Tạo suite `tests/test_cluster3_4_5_full_schema_cutover.cjs` (5/5 PASS).
  - Toàn bộ test suites vượt qua: `npm test` (10/10 PASS), `npm run test:cluster1` (6/6 PASS), `npm run test:cluster2` (4/4 PASS), `npm run test:cluster3-5` (5/5 PASS), `npm run test:menu-regression` (3/3 PASS), `npm run test:menu-safety` (38/38 PASS), `npm run check` (0 scope collisions, 0 errors).
  - Deploy worker dev thành công: `platform-worker-dev.thuanmnc.workers.dev` (Version ID: `9bd33e16-ea41-44de-8ae0-6574e33bdcfc`).
  - Purge KV bootstrap cache (`tenant:benmi:bootstrap`, `tenant:haoshiguoshao:bootstrap`).
  - Tạo đơn live kiểm thử thành công trên Dev: Đơn `HS1002-T002` (tenant `haoshiguoshao`), D1 DB lưu đầy đủ `subOption` metadata và `order_content` hiển thị chuẩn `意麵 (加蛋) (+$40)`.

### Dọn dẹp Nhóm Phantom `sec-flavor` (2026-10-03)
- **Vấn đề phát hiện**: Quán `jiangjiejie` bị dư nhóm `口味與客製化選擇` (0 lựa chọn) và `miyansuo` bị dư nhóm `加購服務 / 響應環保` (0 lựa chọn) trong phần Tùy chọn POS do `mapping.mjs` quét nhầm container ảo `category_type = 'order_customization'` trong `menu_categories`.
- **Khắc phục**:
  - Cập nhật [mapping.mjs](file:///Users/duccao/Documents/benmi-order/scripts/menu-data-copy/mapping.mjs): Loại trừ `category_type === 'order_customization'` và `slug === 'sec-flavor'`, đưa số lượng nhóm chuẩn hóa về đúng 44 nhóm thật.
  - Xóa 2 bản ghi phantom khỏi `blab-db-dev`: `mg_cat_jiangjiejie_jiangjiejie_sec-flavor` và `mg_cat_miyansuo_cat_mys_sec_flavor`.
  - Purge KV cache cho `tenant:jiangjiejie:bootstrap` và `tenant:miyansuo:bootstrap`.
  - Kiểm thử trực tiếp API: Bootstrap `jiangjiejie` trả về đúng 11 nhóm tùy chọn thật, `miyansuo` trả về đúng 1 nhóm thật, biến mất hoàn toàn nhóm rác 0 lựa chọn.

### Màn Hình Cài Đặt Thực Đơn Toàn Màn Hình & Bước Tùy Chọn Combo (2026-10-03)
- **1. UI Toàn Màn Hình Tablet-First Cho Thiết Lập Thực Đơn POS**:
  - Chuyển đổi popup modal `itemDetailModal` (Chi tiết món) thành giao diện `.order-detail-fullpage` toàn màn hình chuẩn iPad/Tablet POS tương tự `modal-bundle-editor`.
  - Bố cục 2 cột Master-Detail (`.item-detail-grid-body`):
    - Cột Trái: Thông tin cơ bản (Tên món, Giá bán, Ảnh đại diện trực quan, Nhãn nổi bật nhanh).
    - Cột Phải: Cài đặt nâng cao với 2 Thẻ Action Card lớn (`item-detail-action-card-lg`): Thẻ Tùy chọn riêng (`modifiers`) và Thẻ Combo (`bundle`).
  - Chuyển đổi modal `itemModifiersModal` (Gán tùy chọn món từ Thư viện) thành `.order-detail-fullpage` dạng lưới thẻ card responsive to rõ, touch target ≥ 48px.
  - Luồng điều hướng Stacked Flow: Menu -> Chi tiết món -> Tùy chọn / Combo, nút quay lại trở về đúng màn hình trước mà không mất dữ liệu tạm thời.
- **2. Tùy Chọn Suất Combo Trên Trang Đặt Món Khách (`index.html`)**:
  - Sửa `js/client-menu.js`: Nhận diện cả `item.modifierGroups` khi render thẻ món combo trên thực đơn, cập nhật đúng nhãn nút `調整搭配 / 加料`.
  - Nâng cấp `js/bundle-builder-v2.js`:
    - Tích hợp Tùy chọn suất combo thành **1 Bước / Tab riêng trong thanh điều hướng** (`bundle-step-nav`): `[ Món 1 (✓) ] [ Món 2 (✓) ] [ Tùy chọn suất (✓) ]`.
    - Khi ở tab tùy chọn suất, hiển thị giao diện tùy chọn to rõ, ẩn danh sách món chọn thành phần để tránh bị trôi tuột khỏi màn hình trên LINE LIFF.
    - Nút xác nhận `bundle-confirm-btn` chỉ bật sáng `ready` khi cả món thành phần và tùy chọn bắt buộc của combo đã hoàn thành; nếu thiếu tùy chọn bắt buộc sẽ thông báo và tự động chuyển sang tab tùy chọn.
- **3. Cache-Busting & Kiểm Thử**:
  - Bump version: `orders.html` (`?v=20261003_menu_fullscreen_v1`), `index.html` (`?v=20261003_combo_addons_step_v1`).
  - 100% test suites vượt qua: `npm test`, `npm run test:cluster1`, `npm run test:cluster2`, `npm run test:cluster3-5`, `npm run test:menu-safety`, `npm run test:order-identity`.

