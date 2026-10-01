# Menu Data Copy Tool Suite

Bộ công cụ độc lập phục vụ kế hoạch sao chép dữ liệu menu cũ (`menu_customizations`, `menu_categories` loại modifier, `applied_modifiers`, v.v.) sang schema mới (`modifier_groups`, `modifier_options`, `category_modifier_links`, `item_modifier_links`).

## Nguyên tắc cốt lõi
1. **Không sửa code runtime**: Không thay đổi bất kỳ file nào trong `benmi-worker-official/src/`, `js/`, `index.html`, `orders.html`.
2. **Không ghi đè (Additive-only)**: Không sử dụng `INSERT OR REPLACE` hay xoá canonical records hiện có.
3. **An toàn dữ liệu**: Nguồn production chỉ được truy vấn READ-ONLY. Quá trình copy ban đầu chỉ thực hiện trên database / snapshot riêng biệt (Local SQLite hoặc test DB cô lập).
4. **Kiểm soát định danh**: Mapping rõ ràng `tenant + source kind + source identity -> target ID`. Bảo toàn thứ tự, giá trị số thực (không làm tròn giá), options JSON con (`sub_options_json`) và rule JSON (`eligibility_rules_json`).

## Cấu trúc các module
- `cli.mjs`: CLI điều phối chính với các lệnh `inventory`, `snapshot`, `mapping`, `preview`, `apply`, `verify`.
- `inventory.mjs`: Trích xuất schema, thống kê bản ghi, phát hiện invalid JSON, orphan records, collisions từ nguồn.
- `mapping.mjs`: Xây dựng bảng quy chiếu ID ổn định (deterministic UUID/ID hash) và trường dữ liệu.
- `preview.mjs`: Sinh kế hoạch insert chi tiết (dry-run) và kiểm tra mâu thuẫn (`copy-preview.json`).
- `apply.mjs`: Thực thi batch copy vào database đích độc lập.
- `verify.mjs`: Đối chiếu parity 100% giữa dữ liệu nguồn và dữ liệu đích sau copy.
