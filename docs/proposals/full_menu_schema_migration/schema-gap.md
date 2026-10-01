# Báo cáo Khoảng cách Schema (Schema Gap Analysis)

- **Ngày thực hiện**: 2026-10-01
- **Database nguồn**: Cloudflare D1 Production (`blab-db-production` / `48479f91-eec7-4da2-b044-edaaf622f195`)
- **Tình trạng thực tế nguồn**:
  - Bảng canonical (`modifier_groups`, `modifier_options`, `category_modifier_links`, `item_modifier_links`) đang có **0 dòng** (hoàn toàn trống).
  - Toàn bộ dữ liệu menu options/customizations hiện tại của 14 tenants nằm ở các bảng legacy: `menu_customizations` (26 nhóm), `menu_customization_option_rules` (5 rules), `menu_categories` loại modifier/order_customization (20 danh mục) và 527 `menu_items`.

---

## 1. So sánh Cấu trúc Bảng Hiện tại vs Đích

### 1.1. Bảng Nhóm Tuỳ chọn (`modifier_groups`)

| Cột hiện có trong DDL | Kiểu dữ liệu | Default | Nguồn map sang | Trạng thái Gap |
|---|---|---|---|---|
| `id` | `TEXT PRIMARY KEY` | - | `menu_customizations.id` hoặc `menu_categories.id` (prefix `mg_` hoặc deterministic UUID) | Đã có |
| `tenant_id` | `TEXT NOT NULL` | - | `tenant_id` nguồn | Đã có |
| `name` | `TEXT NOT NULL` | - | `title` (customization) hoặc `name` (category) | Đã có |
| `selection_type` | `TEXT NOT NULL` | `'single'` | `radio`→`single`, `checkbox`→`multiple`, `combo_drink` | Đã có |
| `is_required` | `INTEGER NOT NULL` | `0` | `is_required` nguồn | Đã có |
| `min_selection` | `INTEGER NOT NULL` | `0` | `min_selection` nguồn | Đã có |
| `max_selection` | `INTEGER NOT NULL` | `1` | `max_selection` nguồn | Đã có |
| `sort_order` | `INTEGER NOT NULL` | `0` | `sort_order` nguồn | Đã có |
| `scope` | `TEXT` | `'item'` | `'order'` (nếu từ customization), `'category'` (nếu từ modifier category) | Đã có (migration 0063) |
| `created_at` | `DATETIME` | `CURRENT_TIMESTAMP` | Giữ nguyên timestamp nguồn nếu có | Đã có |
| `updated_at` | `DATETIME` | `CURRENT_TIMESTAMP` | Timestamp copy | Đã có |
| **`source_metadata_json`** | `TEXT NOT NULL` | `'{}'` | **CHƯA CÓ**. Cần để lưu `legacy_id`, `key`, `slug`, `short_name`, `source_type` (`menu_customizations` vs `menu_categories`) | **CẦN THÊM (ADD COLUMN)** |

---

### 1.2. Bảng Lựa chọn Chi tiết (`modifier_options`)

| Cột hiện có trong DDL | Kiểu dữ liệu | Default | Nguồn map sang | Trạng thái Gap |
|---|---|---|---|---|
| `id` | `TEXT PRIMARY KEY` | - | Option ID hoặc deterministic hash theo snapshot | Đã có |
| `tenant_id` | `TEXT NOT NULL` | - | `tenant_id` nguồn | Đã có |
| `group_id` | `TEXT NOT NULL` | - | ID nhóm đích | Đã có (FK tới `modifier_groups`) |
| `name` | `TEXT NOT NULL` | - | `name` từ option JSON hoặc `menu_items.name` | Đã có |
| `price` | `INTEGER NOT NULL` | `0` | `price` / `surcharge` | Đã có (Kiểm tra numeric affinity, không làm tròn) |
| `is_default` | `INTEGER NOT NULL` | `0` | `is_default` / `isDefault` | Đã có |
| `sort_order` | `INTEGER NOT NULL` | `0` | Thứ tự trong JSON array hoặc `menu_items.sort_order` | Đã có |
| `out_of_stock_until` | `DATETIME` | `NULL` | `out_of_stock_until` nếu nguồn có timestamp | Đã có |
| `created_at` | `DATETIME` | `CURRENT_TIMESTAMP` | Timestamp | Đã có |
| `updated_at` | `DATETIME` | `CURRENT_TIMESTAMP` | Timestamp | Đã có |
| **`sub_options_json`** | `TEXT NOT NULL` | `'[]'` | **CHƯA CÓ**. Đang có 68 options có mảng `sub_options` (ví dụ `去骨` -> `去皮`, `特調檸檬汁` -> `[少, 正常, 多]`). Nếu không có cột này, 100% dữ liệu sub-options sẽ bị mất. | **CẦN THÊM (ADD COLUMN)** |
| **`eligibility_rules_json`** | `TEXT NOT NULL` | `'[]'` | **CHƯA CÓ**. Đang có 5 rules ngưỡng đơn hàng (`menu_customization_option_rules`) của tenant `jiangjiejie`. Cần cột này để bảo toàn nguyên trạng rule. | **CẦN THÊM (ADD COLUMN)** |
| **`is_out_of_stock`** | `INTEGER NOT NULL` | `0` | **CHƯA CÓ**. Nguồn `options_json` có cờ boolean `is_out_of_stock` độc lập với deadline timestamp. | **CẦN THÊM (ADD COLUMN)** |
| **`description`** | `TEXT` | `NULL` | **CHƯA CÓ**. Các options sao chép từ `menu_items` có trường `description`. | **CẦN THÊM (ADD COLUMN)** |
| **`source_metadata_json`** | `TEXT NOT NULL` | `'{}'` | **CHƯA CÓ**. Lưu provenance, source item id, raw aliases. | **CẦN THÊM (ADD COLUMN)** |

---

### 1.3. Bảng Liên kết Danh mục (`category_modifier_links`)

- Cột hiện có: `tenant_id`, `category_id`, `group_id`, `sort_order` (PK: `tenant_id, category_id, group_id`).
- FK: `category_id` references `menu_categories(id)`, `group_id` references `modifier_groups(id)`.
- Gap: Cấu trúc đã đầy đủ để materialize các liên kết từ `applied_modifiers`.
- Quy tắc giải quyết `applied_modifiers`:
  - `allow_customization = 0` hoặc `applied_modifiers = '[]'`: Không sinh link.
  - `applied_modifiers = '["*"]'` hoặc rỗng (và `allow_customization = 1`): Liên kết tất cả modifier groups thuộc scope `category` của tenant đó.
  - Danh sách cụ thể chứa ID (như `mod_hs_guoshao_addons`, `cat_tns_spicy`) hoặc Slug (như `guoshao-addons`, `customizations-general`, `spicy`, `lettuce`, `topping`): Tra cứu ngược trong tenant để map sang `group_id` tương ứng.

---

### 1.4. Bảng Liên kết Món Ăn (`item_modifier_links`)

- Cột hiện có: `tenant_id`, `item_id`, `group_id`, `sort_order` (PK: `tenant_id, item_id, group_id`).
- Hiện tại trong DB nguồn: 0 dòng.
- Quy tắc: Giữ nguyên, không tự động suy diễn liên kết món mới từ tên gọi.

---

## 2. Kế hoạch DDL Additive Tối thiểu (Task T04)

Tạo một migration additive mới (dự kiến `0064_add_modifier_migration_metadata.sql`):
```sql
-- Additive columns for modifier_groups
ALTER TABLE modifier_groups ADD COLUMN source_metadata_json TEXT NOT NULL DEFAULT '{}';

-- Additive columns for modifier_options
ALTER TABLE modifier_options ADD COLUMN sub_options_json TEXT NOT NULL DEFAULT '[]';
ALTER TABLE modifier_options ADD COLUMN eligibility_rules_json TEXT NOT NULL DEFAULT '[]';
ALTER TABLE modifier_options ADD COLUMN is_out_of_stock INTEGER NOT NULL DEFAULT 0;
ALTER TABLE modifier_options ADD COLUMN description TEXT DEFAULT NULL;
ALTER TABLE modifier_options ADD COLUMN source_metadata_json TEXT NOT NULL DEFAULT '{}';
```

## 3. Kết luận Task T01
- Không có va chạm ID (0 collisions) và không có JSON lỗi (0 invalid JSON).
- Đã xác định rõ ràng toàn bộ 26 customizations, 20 modifier categories, 5 rules và 23 specific/wildcard applied_modifiers bindings.
- Đã xác định chính xác danh sách các cột thiếu (Schema Gap).
- Đủ điều kiện kết thúc Task T01 và chuyển sang Task T02 (Tạo snapshot nhất quán và dựng database riêng biệt).
