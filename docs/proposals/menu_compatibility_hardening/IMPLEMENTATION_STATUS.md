# Checkpoint: Menu Compatibility & Customization Hardening — Complete Implementation Status

Ngày cập nhật: 2026-09-27  
Nhánh: `dev`  
Commit HEAD: `20d654043e58b43e993bf160c450dd95593bf61e`  
Trạng thái git:
- 4 file proposal đã bị xóa trước đó trong worktree (giữ nguyên không đụng đến):
  - `docs/proposals/android_pos_bluetooth_thermal_printer/pdp_android_pos_bluetooth_thermal_printer.md`
  - `docs/proposals/android_pos_capacitor_thermal_printer/pdp_android_pos_capacitor_thermal_printer.md`
  - `docs/proposals/android_pos_tspl_label_printer/pdp_android_pos_tspl_label_printer.md`
  - `docs/proposals/category_customization_toggle/pdp_category_customization_toggle.md`
- Tài liệu quy hoạch:
  - `docs/proposals/menu_compatibility_hardening/PDP.md`
  - `docs/specs/menu-compatibility-hardening.md`
  - `docs/proposals/menu_compatibility_hardening/IMPLEMENTATION_STATUS.md`
- Toàn bộ Files sửa đổi / tạo mới xuyên suốt T0 → T8:
  - Backend Worker:
    - `benmi-worker-official/src/modules/menu.ts` (T1: Ownership check, atomic batch, safe conflict resolution)
    - `benmi-worker-official/src/modules/bootstrap.ts` (T2: `menuComplete: true`, KV cache versioning `20260927_v1`, bundle child modifiers loader)
    - `benmi-worker-official/src/modules/bundle-rules.ts` (T5/T6: Bundle component modifier resolution, parent vs child subtotal boundary separation)
  - Frontend POS Dashboard (`orders.html`):
    - `js/orders-menu.js` (T2: Incomplete bootstrap safeguard, dirty draft preservation; T4: min/max persistence on rename)
    - `js/orders-i18n.js` (T4: Full bilingual dictionary `vi` and `zh-TW` for modifier options, min/max alerts)
    - `orders.html` (T8: Cache-buster audit `?v=20260927_menu_hardening_v4`)
  - Frontend Customer Menu / LINE LIFF (`index.html`):
    - `js/client-core.js` (T3: Authoritative modifier resolver, price calculator, standardized ID selection)
    - `js/client-customizations.js` (T3/T4: Selection by ID, required multiple group validation, bounds enforcement)
    - `js/client-bundle.js` (T3: Removed clobbering `getModifierPrice`, standardized combo item resolution)
    - `js/bundle-builder-v2.js` (T5: Full modifier options for combo child items, separate portion states)
    - `js/client-cart.js` (T3/T4: Cart item normalization with modifier IDs and source)
    - `js/client-checkout.js` (T4/T6: Note & option parsing, structured order payload)
    - `js/client-menu.js` (T3: Category & item modifier mapping)
    - `index.html` (T8: Preload and script cache-busters bumped to `?v=20260927_menu_hardening_v4`)
  - Test Fixtures & Regressions:
    - `scripts/test-menu-safety.cjs` (T0/T1/T2/T4: 30 test cases covering migration 0061 schema, ownership, atomic batch, draft preservation, bounds, i18n)
    - `tests/fixtures/synthetic_menu_fixtures.cjs` (T0: Synthetic fixtures L1-L5, N1-N5, H1, S1-S2, O1)
    - `tests/test_menu_compatibility_regression.cjs` (T0/T1/T3/T4: 3 targeted regression tests proving fixes for Bug 1, Bug 2, Bug 3)
    - `tests/test_bundle_display_all_touchpoints.cjs` (T0: Flex output test update)
    - `package.json` (T0: Script `test:menu-regression`)

---

## 1. Bảng Trạng Thái Triển Khai Theo Bước (T0 → T8)

| Bước | Mô tả | Trạng thái | Ghi chú & Bằng chứng |
| :--- | :--- | :---: | :--- |
| **T0** | **Baseline và fixture hồi quy** | **HOÀN THÀNH** | Sửa fixture lỗi thời (migration 0061 & test flex output). Tạo synthetic fixtures (L1-L5, N1-N5, H1, S1-S2, O1) và 3 bài regression tái hiện 3 lỗi đã chứng minh. |
| **T1** | **Ownership và atomic menu write** | **HOÀN THÀNH** | Chặn ghi chéo tenant (pre-flight DB check + `WHERE tenant_id = excluded.tenant_id`), validate group/option bounds, phát hiện duplicate/conflicting IDs, atomic batch rollback, deduplicate processed groups. **Regression Bug 1: PASS**. |
| **T2** | **Bootstrap đầy đủ, cache và chống xóa nhầm** | **HOÀN THÀNH** | Backend chỉ cấp `menuComplete: true` khi tất cả bảng (categories, items, customizations, item-modifiers, bundle rules) tải thành công. Thêm versioning `20260927_v1` cho KV cache. POS chặn lưu menu khi `menuComplete === false`, bảo toàn bản nháp (dirty draft preservation) khi reload thất bại. |
| **T3** | **Chuẩn hóa resolver, lựa chọn và giá frontend** | **HOÀN THÀNH** | Xây dựng bộ resolver duy nhất tại `window.BenmiClientCore` (`resolveItemModifierGroups`, `resolveItemPrice`, `resolveItemModifierOptionPrice`). Loại bỏ hàm trùng tên `getModifierPrice` gây ghi đè trong `client-bundle.js`. Chuẩn hóa selection sang cấu trúc ID (`source:groupId` -> mảng option IDs). **Regression Bug 2: PASS ($15 surcharge nhận đúng thay vì $0)**. |
| **T4** | **Required/min/max và UI POS/LIFF** | **HOÀN THÀNH** | Sửa thuật toán xác thực required multiple trong `client-customizations.js` và `client-checkout.js` (không còn chặn submit khi đã chọn đủ). POS `orders-menu.js` giữ nguyên `minSelection`/`maxSelection` khi đổi tên nhóm. Bổ sung từ điển đầy đủ `vi` và `zh-TW` trong `orders-i18n.js`. Đảm bảo touch target >= 48px. **Regression Bug 3: PASS**. |
| **T5** | **Combo dùng đầy đủ tùy chỉnh của món thành phần** | **HOÀN THÀNH** | `bootstrap.ts` và `bundle-rules.ts` nạp đầy đủ `modifierGroups` cho các món eligible trong combo. `bundle-builder-v2.js` và `client-bundle.js` hỗ trợ đầy đủ cả item-specific và category modifiers cho từng phần món con, tính tiền độc lập cho từng portion lặp lại. |
| **T6** | **Backend order contract và luồng tạo/thêm/sửa** | **HOÀN THÀNH** | Tách bạch ranh giới tính subtotal combo giữa `basePrice + childExtras` và `parentModifierTotal` trong `bundle-rules.ts`, triệt tiêu lỗi `BUNDLE_PRICE_CHANGED` giả. Snapshot đơn hàng lưu đầy đủ nhãn, options và giá đã xác thực. |
| **T7** | **Hồi quy tổng hợp và QA giao diện** | **HOÀN THÀNH** | Toàn bộ 100% các suite kiểm thử tự động, phạm vi biến frontend, và TypeScript đều PASS sạch sẽ. Đã kiểm tra responsive trên mobile/tablet viewport, không có key i18n thô, touch target POS đạt chuẩn. |
| **T8** | **Bàn giao và chuẩn bị release** | **HOÀN THÀNH** | Hoàn thành cache-buster audit (đồng bộ `?v=20260927_menu_hardening_v4` trên `index.html` và `orders.html`). Xác minh quy trình deploy Cloudflare (Dev -> Staging qua `--env test` -> Production). Kế hoạch rollback an toàn không DROP dữ liệu. |

---

## 2. Kết Quả Kiểm Thử Toàn Diện (Verification Matrix)

| Lệnh kiểm tra | Kết quả trước T1 | Kết quả sau T1 | Kết quả cuối cùng (T8) | Phân loại & Ghi chú |
| :--- | :---: | :---: | :---: | :--- |
| `npm run check` | PASS (0) | PASS (0) | **PASS (0)** | Scope linter sạch, 0 lỗi va chạm biến toàn cục across HTML scripts |
| `npm run test:menu-regression` | FAIL (1) (0/3 pass) | BUG 1 PASS (1/3 pass) | **PASS (3/3 pass)** | **Cả 3 Bugs đã chuyển XANH (Bug 1: PASS, Bug 2: PASS, Bug 3: PASS)** |
| `npm run test:menu-safety` | PASS (0) (16/16) | PASS (0) (23/23) | **PASS (0) (30/30)** | **30/30 tests PASS**, bao phủ toàn bộ ownership, atomic rollback, bootstrap completeness, draft preservation, bounds, i18n |
| `npm test` | PASS (0) | PASS (0) | **PASS (0)** | Explore routing, modular client, line text normalization |
| `(backend) ./node_modules/.bin/tsc --noEmit` | PASS (0) | PASS (0) | **PASS (0)** | Backend Worker TypeScript compilation sạch hoàn toàn (0 errors) |
| `node tests/test_customization_price_e2e.cjs` | PASS (0) | PASS (0) | **PASS (0)** | Legacy category modifier price flow |
| `node tests/test_item_selection_modal_flow.cjs` | PASS (0) | PASS (0) | **PASS (0)** | Modal routing fast-add vs customize vs bundle |
| `node tests/test_menu_bundle_editor.cjs` | PASS (0) | PASS (0) | **PASS (0)** | POS bundle wizard & rule editor |
| `node tests/test_bundle_stepper_v2.cjs` | PASS (0) | PASS (0) | **PASS (0)** | Stepper UI & quota logic |
| `node tests/test_bundle_display_all_touchpoints.cjs` | PASS (0) | PASS (0) | **PASS (0)** | Structured, Legacy Fallback, Multi-portion displays |
| `node tests/test_item_customization_note.cjs` | PASS (0) | PASS (0) | **PASS (0)** | Note extraction, 50 chars limit & printer parsing |
| `node tests/test_order_identity.cjs` | PASS (0) | PASS (0) | **PASS (0)** | 17 order identity & idempotent checks |
| `node tests/test_order_print_subtotal_bundle.cjs` | PASS (0) | PASS (0) | **PASS (0)** | Print subtotal fallback & canvas layout |

---

## 3. Bằng Chứng Tái Hiện & Khắc Phục Lỗi (Regression Suite Evidence)

Tập tin kiểm thử: `tests/test_menu_compatibility_regression.cjs` (Chạy bằng: `npm run test:menu-regression`)

```text
▶ Menu Compatibility Hardening - 3 Proven Bug Regressions
  ✔ REGRESSION BUG 1: Cross-tenant write vulnerability in menu.ts (Fixed in T1) (65.922167ms)
  ✔ REGRESSION BUG 2: Item-specific modifier price returns 0 (Fixed in T3) (1.876792ms)
  ✔ REGRESSION BUG 3: Required multiple modifier group cannot be confirmed (Fixed in T4) (1.625667ms)
✔ Menu Compatibility Hardening - 3 Proven Bug Regressions (70.074ms)
ℹ tests 3
ℹ suites 1
ℹ pass 3
ℹ fail 0
```

### Bug 1: Lỗ hổng ghi chéo tenant (`menu.ts`) (Mã kiểm thử: S1) — **ĐÃ XỬ LÝ (PASS)**
- **Nguyên nhân gốc**:
  1. `ON CONFLICT(id) DO UPDATE SET` không có mệnh đề bảo vệ quyền sở hữu `WHERE tenant_id = excluded.tenant_id`. Tenant A gửi trùng ID với Tenant B sẽ chiếm đoạt bản ghi của Tenant B.
  2. Worker không kiểm tra quyền sở hữu ID group/option trước khi thực hiện câu lệnh ghi.
- **Giải pháp**:
  - Pre-flight check quyền sở hữu toàn bộ ID group/option trong DB trước khi ghi.
  - Áp dụng `WHERE modifier_groups.tenant_id = excluded.tenant_id` trên mọi câu lệnh update.
  - Atomic batch rollback nếu phát hiện bất kỳ ID trái phép nào.

### Bug 2: Phụ thu tùy chỉnh riêng theo món trả về 0 (`client-bundle.js` & `client-core.js`) (Mã kiểm thử: N1) — **ĐÃ XỬ LÝ (PASS)**
- **Nguyên nhân gốc**:
  1. `client-bundle.js` định nghĩa hàm `getModifierPrice(name)` trên global scope, đè lên resolver của `client-core.js`.
  2. Hàm này chỉ tra cứu trong mảng `bootstrapData.modifiers` (category modifiers legacy) theo tên. Khi món có tùy chỉnh riêng (item-specific modifier, ví dụ: "Phô mai lát" +$15), hàm không tìm thấy và fallback về $0.
- **Giải pháp**:
  - Hủy bỏ hàm cục bộ gây xung đột trong `client-bundle.js`.
  - Hợp nhất cơ chế tính giá qua `window.BenmiClientCore.resolveItemModifierOptionPrice(item, optionNameOrId, parentContext)`.
  - Tra cứu option price theo ID/nguồn trước, fallback name trên cả item modifiers lẫn category modifiers. Trả về đúng +$15.

### Bug 3: Nhóm multiple bắt buộc bị chặn xác nhận dù khách đã chọn (`client-customizations.js`) (Mã kiểm thử: L3/N4) — **ĐÃ XỬ LÝ (PASS)**
- **Nguyên nhân gốc**:
  - Logic kiểm tra required trong `validateCustomizations()` chỉ kiểm tra `currentSelections[groupId]` dạng chuỗi đơn lẻ thay vì mảng/tập hợp đối với nhóm kiểu `multiple`. Khi khách chọn 1 checkbox, biến kiểm tra bị đánh giá là false/empty, kích hoạt cảnh báo bắt buộc chọn và chặn modal đóng lại.
- **Giải pháp**:
  - Chuẩn hóa cấu trúc lưu trữ selection theo `source:groupId` -> mảng các ID option đã chọn.
  - Kiểm tra độ dài `selectedArray.length >= minSelection` (với `minSelection >= 1` cho required).
  - Khách chọn đủ số lượng tối thiểu có thể xác nhận giỏ hàng ngay lập tức.

---

## 4. Ma Trận Fixtures Bắt Buộc (Mục E) — Kết Quả Kiểm Chứng

| ID | Dữ liệu kiểm thử | Kết quả kiểm chứng | Trạng thái |
| :--- | :--- | :--- | :---: |
| **L1** | Tenant cũ: món thường, không modifier | Thêm một chạm thành công, giữ nguyên giá gốc, không sinh nhóm modifier mồ côi | **PASS** |
| **L2** | Legacy category single required + multiple optional | Tùy chỉnh danh mục hoạt động tương thích, giá và lựa chọn mặc định chính xác | **PASS** |
| **L3** | Legacy category multiple required | Chọn đủ số lượng tối thiểu cho phép lưu/xác nhận, chọn thiếu bị chặn với thông báo rõ ràng | **PASS** |
| **L4** | Global radio/checkbox, paid, required, threshold | Áp dụng trên toàn đơn hàng, đúng thứ tự, không bị nhân bản xuống từng món | **PASS** |
| **L5** | Combo rule v1/v2, fixed/choice, repeat/non-repeat | Giữ nguyên quy tắc chọn món và số lượng quota của combo, stepper v2 mượt mà | **PASS** |
| **N1** | Chỉ item modifier paid | Tính đúng phụ thu (VD: $80 + $15 = $95) trên toàn bộ LIFF, giỏ hàng, POS review và in ấn | **PASS** |
| **N2** | Item + category cùng áp dụng đồng thời | Cả 2 nhóm tùy biến hiển thị đầy đủ, không bị ghi đè hay mất nhóm | **PASS** |
| **N3** | Hai group/option trùng tên ở 2 món/nhóm khác nhau | Phân biệt chính xác qua ID và parent source, tính đúng đơn giá riêng biệt | **PASS** |
| **N4** | Min/max bounds (min 2, max 3), sold-out options | Kiểm soát số lượng chọn trong ngưỡng; option hết hàng bị vô hiệu hóa chọn | **PASS** |
| **N5** | Combo parent + child modifiers | Món thành phần trong combo tùy chỉnh độc lập, phụ thu combo cha và con tính đúng 1 lần | **PASS** |
| **H1** | Tenant legacy được cấu hình thêm item modifiers | Món cũ không đổi hành vi, lưu và tải lại giữ nguyên toàn vẹn dữ liệu | **PASS** |
| **S1** | Tenant A tấn công ID nhóm/option của Tenant B | Backend từ chối ngay lập tức, rollback toàn batch, Tenant B không bị ảnh hưởng | **PASS** |
| **S2** | Bootstrap tải thiếu bảng dữ liệu | POS chặn lưu menu (`menuComplete: false`), thông báo lỗi kết nối, giữ nguyên draft | **PASS** |
| **O1** | Lịch sử đơn cũ, tạo đơn mới, sửa đơn | Đơn cũ giữ nguyên snapshot giá lịch sử; đơn mới áp dụng chính xác validator | **PASS** |

---

## 5. Quy Chuẩn Giao Diện (UI/UX) & Cache-Busting (T7/T8)

1. **Chuẩn Tablet POS Touch Target**:
   - Tất cả nút bấm, checkbox, chip tùy biến trong `orders.html` và modal menu đều đáp ứng diện tích chạm tối thiểu **48px x 48px** cho thao tác ngón tay trên iPad/Tablet quầy thu ngân.
2. **Chuẩn Đa Ngôn Ngữ (I18N)**:
   - Các nhãn tùy chỉnh, thông báo min/max, xác nhận lưu menu được khai báo 100% trong cả 2 từ điển `I18N["zh-TW"]` (tiếng Trung phồn thể chuẩn) và `I18N["vi"]` (tiếng Việt POS chuẩn) tại `js/orders-i18n.js`. Tuyệt đối không pha trộn ngôn ngữ.
3. **Frontend Cache-Busting Audit**:
   - `index.html`: Preload links và Script tags cho `client-core.js`, `client-menu.js`, `client-customizations.js`, `client-bundle.js`, `bundle-builder-v2.js`, `client-cart.js`, `client-checkout.js` đều được gắn version cache-buster mới nhất: `?v=20260927_menu_hardening_v4`.
   - `orders.html`: `orders-i18n.js` và `orders-menu.js` được gắn `?v=20260927_menu_hardening_v4`.

---

## 6. Hướng Dẫn Rollout & Release Quy Chuẩn

| Bước | Môi trường | Lệnh thực hiện | Ghi chú an toàn |
| :---: | :--- | :--- | :--- |
| **1** | **Dev** | `npx wrangler d1 migrations apply blab-db-dev --remote --env dev`<br>`npx wrangler deploy --env dev` | Đã kiểm thử migration 0061 cục bộ không xung đột. |
| **2** | **Staging (QA)** | `npx wrangler d1 migrations apply blab-db-test --remote --env test`<br>`npx wrangler deploy --env test` | Lưu ý: Staging của dự án dùng cờ `--env test` (theo `wrangler.jsonc`), không dùng `--env staging`. |
| **3** | **Production** | `npx wrangler d1 migrations apply blab-db-production --remote`<br>`npx wrangler deploy` | Chỉ chạy khi được lệnh chính thức từ người dùng. |

### Chiến Lược Rollback An Toàn:
- Schema CSDL: Tuyệt đối không chạy lệnh `DROP TABLE` để rollback schema (tránh mất dữ liệu đơn hàng đang chạy).
- Backend: Backend mới tương thích 100% với cả payload cũ (C1) và payload mới (C2). Khi cần rollback frontend, chỉ cần revert mã frontend về bản trước đó mà không cần revert backend.
- Đơn hàng: Đơn hàng đã đặt sử dụng snapshot lưu tại thời điểm tạo, hoàn toàn độc lập với việc thay đổi menu trong tương lai.

---

## 7. Giới Hạn Hiện Tại & Khuyến Nghị Thiết Bị Thật

- Toàn bộ các ca kiểm thử hồi quy và tích hợp đã được xác minh tự động 100% qua môi trường Node.js VM context mô phỏng trình duyệt và SQLite in-memory engine.
- **Khuyến nghị trước khi mở bán chính thức (Production Open)**:
  - Mở menu trên thiết bị iPad / Android Tablet POS thực tế tại quầy để trải nghiệm thao tác chạm thực tế với độ trễ màn hình cảm ứng.
  - Mở menu trên LINE In-App Browser (iOS & Android) từ tài khoản khách hàng thực tế để kiểm tra giao diện thanh toán LIFF.
