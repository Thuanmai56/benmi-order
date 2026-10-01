# Kế hoạch copy dữ liệu menu cũ sang schema mới

Ngày: 2026-10-01. Trạng thái: kế hoạch, chưa thực hiện thay đổi database.

**Hướng dẫn cho session AI mới:** Đọc toàn bộ tài liệu này trước khi thực hiện. Đây là tài liệu bàn giao độc lập; không cần lịch sử hội thoại. Phạm vi hiện tại là COPY DỮ LIỆU, không phải chuyển ứng dụng sang schema mới. Các phần cuối cung cấp ngữ cảnh, đường dẫn code, hợp đồng script, cách xử lý xung đột và checklist từng bước. Nếu chỉ được yêu cầu đọc/review kế hoạch, không tự thực thi; nếu được yêu cầu thực hiện, bắt đầu T01, tiếp tục các task không phụ thuộc thông tin còn thiếu, và chỉ hỏi nguồn/đích khi chưa có lựa chọn trong session mới.

## Phạm vi và kết quả cần đạt

Tạo bản dữ liệu canonical tương đương với dữ liệu menu cũ tại một thời điểm xác định. Giữ nguyên dữ liệu nguồn, dữ liệu canonical có sẵn và code ứng dụng. Có thể bổ sung các cột cần thiết, SQL/script chuyển dữ liệu và báo cáo kiểm chứng. Không thực hiện cutover, đổi API/UI, triển khai chức năng mới hoặc xoá legacy.

Kế hoạch này thay thế phạm vi thực thi rộng trong PDP trước cho đợt công việc hiện tại. Các ý tưởng đổi scope, nhóm phụ dạng quan hệ, include/exclude và thiết kế lại bundle được để ngoài đợt copy này.

Đích mặc định của lần chạy đầu là database riêng được khôi phục từ snapshot, có schema tương ứng môi trường nguồn. Chưa chọn dev/staging/production làm đích ghi trực tiếp. Cần chốt nguồn và đích trước task ghi dữ liệu từ xa; inventory 2026-09-28 chỉ là thông tin lịch sử, không được dùng làm baseline của lần chạy mới.

## Lưu ý đã xác nhận từ code

`src/modules/modifier-library.ts` đọc tất cả canonical groups/options/links, đối chiếu alias bằng ID hoặc `mg_` + ID. `bootstrap.ts` cũng đọc canonical relations. Do đó thêm records vào canonical tables đang hoạt động có thể đổi kết quả API/UI mà không sửa code; không thể mặc định việc copy là vô hình với ứng dụng.

Migration `0063_clean_customizations_and_category_links.sql` có DELETE dữ liệu legacy. Không chạy lại toàn bộ migration cũ để chuẩn bị schema. Task schema chỉ bổ sung phần còn thiếu dựa trên schema thực tế và migration ledger của database đích.

## Dữ liệu được copy

| Nguồn | Đích | Cách xử lý |
|---|---|---|
| `menu_customizations` | `modifier_groups` | Giữ identity qua mapping; chuyển title/type/order/required và phạm vi đã xác minh |
| `menu_customizations.options_json` | `modifier_options` | Tách option thành dòng; giữ giá/default/order/OOS và metadata |
| `menu_categories` loại modifier | `modifier_groups` | Sao chép nhóm; nguồn vẫn còn nguyên |
| `menu_items` thuộc modifier category | `modifier_options` | Sao chép từng lựa chọn và metadata |
| Legacy `applied_modifiers` và cơ chế áp dụng | `category_modifier_links` | Giải ID/slug trong tenant; phân biệt null/rỗng/wildcard theo hành vi nguồn |
| Liên kết item đã có | `item_modifier_links` | Giữ nguyên; không suy ra liên kết mới từ tên món/nhóm |
| `menu_customization_option_rules` và rule trong option JSON | Cột JSON mới trên canonical option | Lưu đủ các rule nguồn, trạng thái và metadata; không xây engine rule mới |
| Catalog categories/items, bundle rules và config hiện có | Các bảng hiện có | Giữ nguyên. Khi clone database thì được mang sang cùng snapshot, không nhân đôi món trong cùng DB |
| Canonical groups/options đã có, ví dụ Size | Các bản ghi hiện có | Không copy lại, không ghi đè tự động |

## Các cột bổ sung dự kiến

Chốt DDL sau inventory. Các tên dưới đây là đề xuất cho đợt copy, không phải cột đã tồn tại.

| Bảng | Cột dự kiến | Dữ liệu cần giữ |
|---|---|---|
| `modifier_options` | `sub_options_json TEXT NOT NULL DEFAULT '[]'` | Giữ nguyên nội dung/thứ tự lựa chọn phụ; chưa chuyển thành nhóm con |
| `modifier_options` | `eligibility_rules_json TEXT NOT NULL DEFAULT '[]'` | Bản sao rule gồm type, subtotal, basis, error message, active và dấu vết nguồn; không tự loại rule inactive |
| `modifier_options` | `is_out_of_stock INTEGER NOT NULL DEFAULT 0` | Cờ hết hàng độc lập nếu nguồn có boolean; giữ thêm deadline hiện có, không bịa ngày hết hàng |
| `modifier_options` | `description TEXT` | Description từ option dạng menu item nếu có dữ liệu |
| `modifier_groups` và `modifier_options` | `source_metadata_json TEXT NOT NULL DEFAULT '{}'` | Các trường nguồn chưa có biểu diễn đích, ví dụ legacy key/slug/short_name hoặc thuộc tính khác được phát hiện |

Chỉ thêm cột thiếu và có dữ liệu cần lưu. Core fields đã có như scope, selection type, min/max, price, default, sort order, deadline không thêm lại. Metadata JSON là vùng lưu bảo toàn dữ liệu của đợt copy; nó chưa đồng nghĩa ứng dụng mới đã hỗ trợ mọi trường đó. Lưu raw snapshot riêng để luôn có thể đối chiếu với dữ liệu ban đầu.

Tiền không được làm tròn/đổi đơn vị trong đợt này. Kiểm tra numeric affinity và giá trị thực của cột price trên database đích; nếu có giá thập phân phải chứng minh round-trip không mất giá trị trước khi apply.

## Các task nhỏ

### T01 — Chốt nguồn/đích và kiểm kê read-only

- Đọc schema thật (tables, columns, indexes, FK, migrations đã apply).
- Liệt kê tenants, groups/options/rules/bindings, canonical có sẵn, invalid JSON, orphan, alias candidates và collision.
- Đọc semantics của legacy bindings từ code hiện hành để phân biệt null, rỗng, wildcard, ID và slug; không chạy hay sửa code ứng dụng.
- Đầu ra: `inventory.json`, `schema-gap.md`, danh sách nguồn và database đích được chọn.
- Hoàn tất khi mọi nguồn menu có số lượng/kiểu dữ liệu và mọi field có đích lưu dự kiến hoặc được đánh dấu chưa giải quyết.

### T02 — Tạo snapshot nhất quán và bản database riêng

- Xuất snapshot nguồn và canonical hiện có, kèm thời điểm/checksum. Dùng phương thức snapshot nhất quán hoặc khung thời gian dừng sửa menu; export nhiều truy vấn rời khi đang có thay đổi không được coi là baseline nhất quán.
- Khôi phục vào database riêng cho lần chạy đầu; hạn chế dữ liệu ngoài menu theo nhu cầu FK, bảo vệ snapshot có thông tin nhạy cảm nếu phải clone toàn DB.
- Đầu ra: manifest snapshot và database thử copy có tên/ID cụ thể.
- Hoàn tất khi số dòng và checksum khớp snapshot. Phụ thuộc T01.

### T03 — Chốt mapping từng field và identity

- Mỗi nguồn group/option có một mapping tenant + source kind + source identity → target ID; options thiếu ID dùng source group + vị trí trong snapshot, không dùng tên làm identity.
- Giữ canonical ID có sẵn khi đã chứng minh cùng entity. ID/prefix giống nhau chỉ là ứng viên, chưa đủ bằng chứng.
- So toàn bộ core fields, metadata, options và links trước khi ghép; khác biệt đi vào conflict report. Không ghi đè canonical có sẵn để ép hai bản giống nhau.
- Phân loại root scope và bindings từ nguồn. Nếu scope đơn không biểu diễn đủ quan hệ hỗn hợp, giữ đầy đủ links/source metadata và ghi rõ giới hạn; không tự đổi semantics schema trong đợt này.
- Đầu ra: `field-mapping.md`, `id-map.json`, `conflicts.json`.
- Hoàn tất khi không có field bị bỏ âm thầm và có mapping rõ cho toàn bộ dataset được phép copy. Phụ thuộc T01–T02.

### T04 — Viết DDL bổ sung tối thiểu

- Tạo migration additive chỉ chứa các cột đã chốt qua T03; kiểm tra schema/migration ledger để tránh ADD COLUMN lặp.
- Không chạy các seed hoặc cleanup migrations cũ, không DROP/DELETE dữ liệu nguồn.
- Apply vào database riêng, kiểm tra dữ liệu cũ và default trên canonical records có sẵn không làm mất giá trị.
- Đầu ra: migration SQL và báo cáo schema trước/sau. Phụ thuộc T03.

### T05 — Viết script preview copy

- Đọc snapshot, tạo kế hoạch insert groups/options/links và metadata; giữ rule JSON nguồn đầy đủ, ghi rõ khi rule bảng và JSON có giá trị mâu thuẫn.
- Phân loại `insert`, `already_equal`, `conflict`, `unresolved` theo bản ghi. Dừng trước apply nếu nhóm dự kiến copy chưa đủ mapping.
- Lưu manifest có source hash, target ID và giá trị/hash dự kiến sau copy để nhận diện records do lần chạy tạo.
- Đầu ra: script chạy dry-run mặc định và `copy-preview.json`. Phụ thuộc T03–T04.

### T06 — Copy vào database riêng

- Áp dụng kế hoạch theo tenant và batch nhỏ; có checkpoint để resume, không tự overwrite conflict.
- Apply từ snapshot cố định; kiểm tra đích không thay đổi so với preview, chống race bằng transaction/constraint thích hợp.
- Nếu không thể hoàn thành tenant, báo trạng thái partial và danh sách batch đã commit; không báo tenant thành công sớm.
- Chạy lại phải tạo 0 bản ghi mới cho cùng snapshot; canonical records tồn tại trước không đổi.
- Đầu ra: manifest các records đã insert, checkpoint và execution report. Phụ thuộc T05.

### T07 — Đối chiếu dữ liệu sau copy

- So group/option fields, options order, defaults, min/max, scope, price, OOS flags/deadlines, sub-options, rule fields/active, descriptions và metadata.
- Kiểm tra FK, tenant ownership, link counts/identities, options chưa có binding và dữ liệu nguồn không bị sửa/xoá.
- Kiểm tra canonical có sẵn, catalog products, category config và bundle config vẫn tương đương baseline.
- Báo số liệu expected/actual theo mapping; không dùng so row counts đơn thuần vì nhiều nguồn có thể đã trùng entity canonical.
- Đầu ra: `data-parity-report.json`, report chạy lại, report source/canonical-existing unchanged.
- Hoàn tất khi 0 chênh lệch chưa giải thích và 0 record bị bỏ. Phụ thuộc T06.

### T08 — Đánh giá đích vận hành và bàn giao

- Bàn giao snapshot, DDL, script, mapping, preview và parity report; ghi rõ đây là dữ liệu copy tại timestamp, chưa đồng bộ liên tục.
- Nếu cần ghi sang dev/staging/production đang chạy, trước tiên dùng code hiện tại trên bản database riêng để so kết quả read/serialization và đánh giá liệu existing save path có ghi đè/drop fields mới. Có thể chạy kiểm tra mà không sửa code.
- Vì canonical tables đã được ứng dụng đọc, nếu copy làm đổi hành vi thì giữ kết quả ở DB riêng hoặc trì hoãn ghi live; không hứa live UI giữ nguyên chỉ vì không đổi code.
- Chỉ thực hiện trên môi trường được chọn rõ sau khi điều kiện dữ liệu và ảnh hưởng vận hành đã đạt. Không đưa rollout/cutover ứng dụng vào task này.
- Hoàn tất khi người sử dụng nhận được dataset canonical đã kiểm chứng và biết database/timestamp, giới hạn và cách chạy lại. Phụ thuộc T07.

Thứ tự: T01 → T02 → T03 → T04 → T05 → T06 → T07 → T08. Mỗi task có thể giao riêng và phải bàn giao output trước khi bắt đầu task phụ thuộc.

## Rerun, rollback và dữ liệu thay đổi sau copy

- Không sửa dataset nguồn để giải conflict. Ghi quyết định mapping rõ ràng rồi dry-run lại.
- Cùng snapshot chạy lại phải không tạo bản sao trùng. Nếu nguồn được sửa sau snapshot, đó là lần copy mới; không tự đồng bộ/ghi đè trong đợt này.
- Trên DB riêng có thể restore snapshot để làm lại. Trên DB hoạt động, rollback chỉ được xoá records manifest chứng minh do lần copy tạo, vẫn có hash giống sau copy và không có references mới; xoá children/links trước parents. Nếu bị chỉnh sửa hoặc được tham chiếu thêm thì báo conflict, không xoá.
- Giữ cột additive sau rollback dữ liệu, không drop cột chỉ để hoàn tác một lần copy.

## Nghiệm thu phạm vi này

1. Không thay đổi source code chạy của ứng dụng, frontend assets hoặc API contracts; không deploy ứng dụng.
2. Không sửa/xoá dữ liệu legacy; canonical có sẵn không bị ghi đè.
3. Dữ liệu menu cũ có bản tương đương trong schema mới, gồm metadata chưa được runtime sử dụng, hoặc report chặn hoàn tất nếu còn record chưa map được.
4. Có snapshot, provenance/ID mapping, dry-run, resume, rerun và báo cáo kiểm chứng dữ liệu.
5. Không coi lần copy này là migrate hoàn toàn ứng dụng hoặc đồng bộ hai schema lâu dài.

## Context đầy đủ cho session tiếp theo

### Sản phẩm và nguyên nhân công việc

Repository: `/Users/duccao/Documents/benmi-order`. Đây là nền tảng đặt món/POS nhiều tenant, dùng Cloudflare Worker, D1 (SQLite) và KV bootstrap cache. POS quản lý menu ở `orders.html` và `js/orders-menu.js`; khách đặt món qua `index.html` và client scripts. Worker nằm trong `benmi-worker-official/`.

Menu đang có ba nguồn tuỳ chọn: customizations JSON cũ, category/item giả lập modifier, và canonical relational tables. Trước đây UI bỏ sót nhóm chỉ có canonical data, ví dụ nhóm Size gán riêng vào combo 套餐 A của tenant jiangjiejie. Các sự cố khác gồm checkbox áp dụng không khớp dữ liệu, lưu trả 400 và xử lý alias ID chưa thống nhất. Những sự cố đó là bối cảnh; nhiệm vụ lần này không phải sửa UI, API hoặc lỗi 400.

Người dùng đã chọn thu hẹp công việc: tạo bản sao dữ liệu cũ trong schema mới trước. Việc đổi luồng runtime, thiết kế lại ERD hoặc bỏ legacy thuộc đợt sau. Đề xuất nhóm phụ dạng quan hệ cha-con đã được thảo luận nhưng người dùng yêu cầu tạm bỏ qua; dùng JSON để bảo toàn sub-options trong đợt copy.

### Quyền hạn/phạm vi thay đổi file

Được tạo/cập nhật các công cụ copy độc lập, SQL bổ sung schema, tài liệu, kiểm tra dữ liệu và tests cho công cụ. “Chưa đổi code” được hiểu là không sửa code chạy của sản phẩm. Không sửa `src/modules/*`, `js/*`, HTML/CSS, contracts, cấu hình deployment hoặc logic nghiệp vụ chỉ để làm copy dễ hơn. Không deploy Worker/Pages, chuyển flag đọc/ghi hoặc xoá legacy.

Chưa có nguồn/đích remote được chọn trong yêu cầu hiện tại. Có thể đọc repository, viết công cụ, dùng fixtures synthetic và local isolated SQLite trước. Không tự chọn production làm đích hoặc dùng ID DB được ghi trong tài liệu như một lệnh ghi đã được cho phép. Khi người dùng đã xác định môi trường ở session mới, không hỏi lại cùng nội dung.

### Môi trường tham khảo từ cấu hình repository

| Môi trường | D1 name | D1 ID | Wrangler env |
|---|---|---|---|
| Dev | `blab-db-dev` | `40b67d8a-29e0-40c1-9ce2-b76f76864e95` | `dev` |
| Staging | `blab-db-test` | `c0152835-7d42-4545-8cb4-6658dfc7e97d` | `test` |
| Production | `blab-db-production` | `48479f91-eec7-4da2-b044-edaaf622f195` | default |

Đây là cấu hình quan sát ngày 2026-10-01; kiểm tra lại file `benmi-worker-official/wrangler*` trước mọi thao tác. Phân biệt config repository với tài khoản Cloudflare thực tế. Dùng skill Cloudflare/Wrangler hiện có khi chạy thao tác D1; kiểm tra cú pháp CLI của phiên bản đang dùng. Không chép mù lệnh deploy/apply từ AGENTS.md vào đợt công việc này.

### Trạng thái tài liệu và bằng chứng

- `PDP.md` cùng thư mục là kế hoạch cutover rộng trước đây, chỉ dùng tham khảo. Phạm vi của `DATA_COPY_PLAN.md` được ưu tiên cho đợt hiện tại.
- `docs/proposals/modifier_source_unification/PDP.md`, `audit.sql`, `inventory-dev.json`, `inventory-production.json` là điều tra cũ ngày 2026-09-28. Không dùng làm bằng chứng database hiện tại.
- Inventory cũ ghi dev 17 canonical groups, 8 legacy customizations chưa có counterpart, 16 modifier categories; production 0 canonical groups, 25 legacy customizations chưa có counterpart, 18 modifier categories. Số liệu không đủ để chứng minh field parity.
- Ví dụ Size cũ: `mg_1790486239369_1` gán `jj_combo_a1`, có 2 options trên dev. Đây là case kiểm tra nếu còn tồn tại, không phải ID để hardcode migration.
- Session lập kế hoạch chỉ đọc code và tạo tài liệu; chưa chạy inventory remote mới, DDL hoặc copy. Không báo các task đã xong vì chúng có checkbox hoặc mô tả trong tài liệu.

## Danh sách file cần đọc trước khi viết script

Các đường dẫn dưới đây tương đối với repository root. Đọc AGENTS.md và các chỉ dẫn nằm trong thư mục con nếu có. Đọc code hiện tại thay vì tin mô tả cũ khi hai bên khác nhau.

| File | Mục đích đọc |
|---|---|
| `benmi-worker-official/migrations/0001_initialize_menu_tables.sql` | Catalog PK/FK, REAL price, sort order, description/OOS |
| `benmi-worker-official/migrations/0011_enhance_menu_categories_for_modifiers.sql` | Modifier category, selection constraints; có cả giá trị legacy `combo_drink` trong chú thích |
| `benmi-worker-official/migrations/0029_add_category_customization.sql` | Cách bổ sung allow_customization |
| `benmi-worker-official/migrations/0031_add_category_applied_modifiers.sql` | Binding cũ |
| `benmi-worker-official/migrations/0037_seed_bsc_menu.sql` | Customizations table và JSON sub_options ví dụ |
| `benmi-worker-official/migrations/0049_create_universal_bundle_and_threshold_rules.sql` | Option rule fields, bundle config; có seed dữ liệu, không chạy lại |
| `benmi-worker-official/migrations/0061_unified_bundle_and_customization_schema.sql` | Canonical groups/options/item links |
| `benmi-worker-official/migrations/0063_clean_customizations_and_category_links.sql` | Category links/scope; có DELETE, không replay |
| `benmi-worker-official/src/modules/bootstrap.ts` | Cách runtime giải legacy defaults, scope, OOS, applied_modifiers, category types và option rules |
| `benmi-worker-official/src/modules/modifier-library.ts` | Alias `id`/`mg_` + ID; canonical records chưa represented vẫn xuất hiện |
| `benmi-worker-official/src/modules/menu.ts` | Existing write paths có thể chạm dữ liệu canonical; chỉ đọc, không sửa |
| `benmi-worker-official/src/modules/orders.ts` | Rule applicability/defaults mà lưu trữ mới cần giữ được |
| `benmi-worker-official/src/modules/bundle-rules.ts` | References từ bundle sang catalog/modifier |
| `js/client-menu.js`, `js/orders-menu.js` | Hình dạng sub-options và cách hiểu apply/defaults; chỉ đọc |
| `scripts/copy_tenant_prod_to_dev.mjs` | Công cụ cũ có DELETE dữ liệu đích và hardwired môi trường; không phù hợp copy additive và không được chạy nguyên trạng |

Đọc thêm migrations có ALTER TABLE liên quan bằng `rg`; các migrations nền không chứng minh schema database thực tế đã apply tới đâu. Với DB nguồn/đích, lấy `sqlite_schema`, `PRAGMA table_info`, `foreign_key_list`, `index_list`, migration ledger và kiểu runtime `typeof(price)`.

## Mapping field cần hiện thực

| Nguồn | Đích | Quy tắc |
|---|---|---|
| customization `title` | group `name` | Giữ Unicode và nội dung; không trim/đổi tên âm thầm |
| customization `type` | group `selection_type` | `radio`→`single`, `checkbox`→`multiple`; giá trị khác báo unresolved |
| customization `key` | group `source_metadata_json` | Giữ key gốc để truy vết và map rules; không dùng tên hiển thị thay thế |
| modifier category `name`, `selection_type`, `is_required`, `min_selection`, `max_selection`, `sort_order` | Group core fields | Đối chiếu persisted và effective values; nếu runtime biến đổi, lưu cả dữ liệu gốc và quy tắc suy ra |
| category `slug`, `short_name`, thuộc tính chưa có cột đích | group metadata | Giữ dữ liệu, không dùng slug làm ID mới mặc định |
| option JSON `name`, `price`/`surcharge`, `is_default`/`isDefault` | Option core fields | Nếu các alias cùng tồn tại và khác nhau thì báo conflict; không ưu tiên tuỳ ý |
| option `id` | canonical option ID qua mapping | Legacy option ID có thể chỉ unique trong group; allocator phải xét tenant, source kind và group identity |
| thứ tự JSON array | option `sort_order` | Giữ ordinal; nếu JSON có sort field khác thứ tự array, ghi rõ consumer thực sự dùng gì |
| `sub_options`/`subOptions` | `sub_options_json` | Giữ array và phần tử như nguồn; không loại duplicate hoặc đổi string thành nhóm |
| boolean OOS + timestamp | flag mới + `out_of_stock_until` | Lưu raw flag/deadline; tính effective availability tại cùng snapshot time khi so sánh |
| rule table fields | `eligibility_rules_json` | Map bằng tenant + customization key + source option identity; name fallback chỉ khi xác định duy nhất và lưu provenance |
| inline `min_order_amount`, `minOrderSubtotal`, `thresholdBasis`, `ruleErrorMessage` | rules/metadata JSON | Lưu nguyên aliases/source; nếu khác rule table, report conflict, không mất một phía |
| timestamps nguồn | timestamps/metadata | Giữ timestamp nguồn có thật; nếu timestamp tạo đích khác nguồn, lưu cả hai và định nghĩa cách compare |

Không gán cứng max=99, default option đầu tiên, scope=order hoặc min=0 cho mọi legacy record. Nếu field không tồn tại, chỉ dùng giá trị suy ra đã được xác minh từ consumer, kèm `derived_from` trong metadata/report. Giá trị không xác định phải được báo, không đổi thành zero/null tuỳ tiện.

Trong bootstrap hiện tại có các quy ước cũ cần kiểm kê: `allow_customization=0` cho danh sách áp dụng rỗng; khi field apply rỗng có thể nhận wildcard `['*']`; slug topping có thể làm selection_type hiệu dụng khác cột database; required modifier có thể chọn option đầu làm default. Session phải xác nhận hành vi thực tế và đưa vào migration mapping có bằng chứng. Không mở rộng các quy ước đó thành hardcode theo tenant hoặc hardcode cho mọi slug trong tool.

Không coi `bundle_pool`, catalog hoặc danh mục heading toàn đơn là modifier chỉ vì tên giống. Giữ mọi category chưa phân loại trong unresolved report. Những liên kết chưa từng được lưu trực tiếp chỉ được materialize nếu chứng minh được từ semantics nguồn tại snapshot; không bịa item links từ title/description.

## Hợp đồng công cụ và đầu ra đề xuất

Tên file dưới đây là đề xuất để AI triển khai, hiện chưa tồn tại:

```text
scripts/menu-data-copy/
  README.md
  cli.mjs
  inventory.mjs
  mapping.mjs
  preview.mjs
  apply.mjs
  verify.mjs
  fixtures/
docs/proposals/full_menu_schema_migration/
  DATA_COPY_PLAN.md
  field-mapping.md
  schema-gap.md
  progress.md
```

Có thể gộp modules nếu công cụ nhỏ; không tạo abstraction/framework không cần thiết. Chọn local SQLite hoặc D1 adapter phù hợp runtime hiện có và tái sử dụng dependencies sẵn có khi được. SQL/schema metadata phải được kiểm tra; không nội suy payload menu vào shell command. Dùng parameter binding hoặc file SQL escape đúng theo SQLite; file snapshot/output không commit chứa tenant credentials hay dữ liệu ngoài scope.

CLI tối thiểu có các thao tác `inventory`, `preview`, `apply`, `verify`; command và flags cụ thể do triển khai quyết định nhưng phải đáp ứng:

- Preview mặc định không ghi; apply phải yêu cầu run ID, snapshot, mapping/plan hash và target identifier rõ ràng.
- Khi execute, kiểm tra target thực tế khớp plan: database ID/path, môi trường, schema fingerprint, snapshot hash và tenant set.
- Mỗi report có `run_id`, `generated_at`, source/target identity, commit SHA tool, snapshot hash, schema fingerprints và tổng số theo tenant.
- Chỉ cho một writer migration trên database riêng. Nếu hỗ trợ remote batching, kiểm tra cơ chế transaction thực của D1 trước; không giả định shell SQL `BEGIN` hoạt động giống SQLite local.
- Stop khi source/target baseline hoặc plan thay đổi, thay vì bỏ qua và dùng preview cũ.

Metadata provenance ví dụ:

```json
{
  "version": 1,
  "sources": [{
    "kind": "menu_customizations.options_json",
    "group_id": "legacy_group_1",
    "option_id": null,
    "ordinal": 0,
    "raw_fields": {"sub_options": ["Không muối"]}
  }],
  "derived_fields": []
}
```

Mapping record ví dụ (ID chỉ minh hoạ):

```json
{
  "tenant_id": "tenant_example",
  "source_kind": "customization_option",
  "source_group_id": "legacy_group_1",
  "source_option_key": "snapshot_ordinal:0",
  "target_table": "modifier_options",
  "target_id": "copy_option_stable_identifier",
  "action": "insert",
  "source_hash": "...",
  "expected_target_hash": "..."
}
```

Mapping và checkpoint phải bền qua restart. Có thể dùng các JSON manifest với ghi file atomic trên local disk; chưa cần thêm table audit vào production. ID không được random lại mỗi lần retry. Các options thiếu ID dùng identity theo snapshot; nếu snapshot mới đổi thứ tự phải remap/conflict, không coi ordinal là identity bền qua mọi phiên bản menu.

Artifacts dữ liệu của mỗi run:

```text
<private-output>/<run-id>/
  source-manifest.json
  schema-source.json
  schema-target-before.json
  inventory.json
  id-map.json
  conflicts.json
  copy-preview.json
  inserted-records.json
  checkpoint.json
  execution-report.json
  data-parity-report.json
  rerun-report.json
```

Chỉ commit báo cáo tổng hợp đã loại dữ liệu nhạy cảm. Người dùng cần biết đường dẫn snapshot riêng và cách dùng lại; không để snapshot duy nhất trong thư mục tạm dễ mất.

## Chính sách đối với canonical đã tồn tại

Đây là copy additive. Dữ liệu canonical có trước giữ nguyên, kể cả khi legacy có vẻ mới hơn. Không dùng `INSERT OR REPLACE`, upsert cập nhật mọi cột, xoá options rồi insert lại, hoặc tự sửa group để resolve conflict.

| Trạng thái | Hành động |
|---|---|
| Chưa có entity đích, ID không đụng | Insert và ghi manifest |
| Entity đích tương đương đầy đủ | `already_equal`, tái sử dụng mapping |
| Có bản canonical nhưng field/link khác legacy | Conflict, giữ nguyên cả hai nguồn |
| Core fields bằng nhau nhưng thiếu sub-options/rules/metadata trên record canonical có sẵn | `needs_enrichment`; không giả vờ `already_equal` |
| Không chứng minh được hai records cùng entity | Unresolved; không tự hợp nhất theo tên/prefix |
| Cùng target ID đang thuộc tenant/entity khác | Collision; không overwrite; lập target ID/mapping khác khi identity đã rõ |

`needs_enrichment` cần quyết định rõ trước apply: mặc định đợt này không cập nhật records canonical tồn tại trước. Lưu payload thiếu vào report và đánh dấu chưa hoàn tất. Nếu người dùng sau đó cho phép chỉ điền cột mới của entity đã chứng minh tương đương, preview phải liệt kê đúng các cell, hash trước/sau và rollback giá trị cũ; tuyệt đối không đổi core fields. Không tạo group canonical thứ hai để né conflict vì sẽ nhân đôi entity.

DDL thêm cột có default làm records cũ có thêm giá trị mặc định; báo cáo “unchanged” phải so cột tồn tại trước DDL riêng với cột bổ sung. Không báo hash toàn row giữ nguyên khi hình dạng row đã thay đổi.

## Bộ kiểm tra bắt buộc của công cụ copy

Viết tests tập trung vào tính đúng của chuyển dữ liệu, không cần test lại UI sản phẩm. Dùng fixtures synthetic cùng cấu trúc dữ liệu thật đã khảo sát.

| Case | Kết quả cần chứng minh |
|---|---|
| Radio/checkbox, optional/required, min/max | Mapping đúng, không sửa defaults không có bằng chứng |
| JSON options thiếu ID; hai options cùng tên | Cả hai được giữ, ID ổn định khi rerun cùng snapshot |
| Sub-options tiếng Trung/Việt, ký tự nháy/newline | Nội dung và thứ tự giữ nguyên; SQL/shell không hỏng |
| Giá zero/thập phân, phụ thu và aliases mâu thuẫn | Không làm tròn; conflict được phát hiện |
| OOS flag true, deadline tương lai/quá khứ, deadline invalid | Raw values giữ đúng, invalid bị báo, so effective state tại cùng thời điểm |
| Rule table và inline rule, inactive rules | Giữ đủ và trace nguồn, không drop hoặc ghi đè rule |
| Category allow=0, apply null/empty/[]/*/CSV/JSON | Materialized links đúng theo semantics đã ghi |
| Direct/prefixed alias, canonical-only Size, canonical có sẵn thiếu metadata | Không tạo trùng/overwrite; needs_enrichment được báo |
| Cùng source option ID ở hai group/tenant | ID đích không va chạm, không link sai tenant |
| Nhóm chưa có option hoặc chưa gán | Không bị cleanup tự động |
| Bundle pool/catalog/bundle rule | Không bị coi là modifier hoặc bị biến đổi |
| Failure giữa batch, resume, rerun | Không insert trùng, report partial rõ, số liệu thành công chỉ tính batch commit |
| Target thay đổi sau preview | Apply bị chặn; không ghi dựa trên stale plan |

Nếu run có conflict hoặc records unresolved, có thể kiểm thử subset không lỗi trên database riêng nhưng phải ghi rõ `partial`; không báo full copy hoàn tất. Output cuối phải có số lượng từng trạng thái theo tenant và liên kết report lỗi.

## Quy trình bắt đầu session mới

1. Đọc tài liệu này và AGENTS.md; xác nhận user hiện yêu cầu execute hay chỉ review.
2. Chạy `git status --short`, xác định branch/commit; giữ nguyên thay đổi đang có. Không reset/clean để chuẩn bị migration.
3. Đọc các file/schema ở trên. Ghi khác biệt so với tài liệu; không mặc định migration số 0063 là migration mới nhất.
4. Tạo `progress.md` ghi task đang làm, bằng chứng/outputs và các quyết định còn thiếu.
5. Nếu nguồn/đích chưa rõ, hỏi một lần tên môi trường nguồn và nơi đặt bản copy; trong lúc chờ vẫn làm schema mapping và fixtures local.
6. Thực hiện T01–T08 theo dependency. Cập nhật progress sau mỗi task. Chỉ chuyển task ghi dữ liệu khi input/snapshot/mapping/target tương ứng đầy đủ.
7. Nếu dừng do conflict, báo cụ thể tenant/source ID, field khác nhau, khả năng giải quyết; không đưa ra câu hỏi chung chung “có tiếp tục không”.
8. Khi kết thúc, báo task nào đã hoàn thành, database thực sự đã ghi, snapshot timestamp, số bản ghi insert/equal/conflict/needs_enrichment/unresolved, trạng thái tests/verify/rerun và đường dẫn artifacts. Chưa deploy/code-cutover là phạm vi đã chọn, không phải task bị bỏ dở.

## Prompt khởi động có thể gửi kèm tài liệu

> Hãy thực hiện kế hoạch trong `docs/proposals/full_menu_schema_migration/DATA_COPY_PLAN.md`. Mục tiêu duy nhất là duplicate dữ liệu menu legacy sang canonical schema và thêm các cột tối thiểu để giữ đủ dữ liệu. Không thay đổi code ứng dụng, không cutover, không triển khai chức năng sub-options mới, không xoá nguồn hoặc ghi đè canonical có sẵn. Đọc context và các file được liệt kê, rồi thực hiện từng task với output/acceptance criteria. Bắt đầu bằng inventory và dry-run; nếu chưa biết nguồn/đích thì hỏi rõ và tiếp tục công việc local độc lập. Không coi thông tin DB trong tài liệu là lệnh ghi production. Bàn giao mapping, snapshot, tool copy, báo cáo kiểm chứng và các conflict còn tồn tại; chỉ báo hoàn tất khi các điều kiện nghiệm thu thực sự đạt.
