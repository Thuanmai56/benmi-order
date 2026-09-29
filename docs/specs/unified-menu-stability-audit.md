# Prompt: Rà soát và sửa toàn bộ luồng menu, thống nhất UI cho dữ liệu cũ và mới

Bạn là kỹ sư chịu trách nhiệm sửa lỗi và hoàn thiện menu của Benmi Order. Hãy thực hiện công việc trong repository, không chỉ trả lời bằng đề xuất. Làm từng bước, có bằng chứng và kiểm thử. Đọc AGENTS.md trước khi sửa.

## 1. Kết quả cần đạt

- Một UI quản lý tuỳ chọn thống nhất cho mọi nguồn dữ liệu menu.
- Nhóm mới như Size của jiangjiejie có giao diện chỉnh sửa giống nhóm cũ như 加料選項 của benmi.
- Có thể gán nhóm tuỳ chọn cũ hoặc mới cho món hiện có hoặc món vừa tạo, nhấn Lưu, tải lại và vẫn thấy đúng liên kết.
- Sửa nguyên nhân HTTP 400 hiện tại, không bỏ validation để làm request thành công.
- Luồng lưu tương thích cả dữ liệu cũ và mới, có ranh giới rõ ràng để loại bỏ cơ chế cũ trong tương lai.
- Không mất nhóm, lựa chọn, mặc định, phụ thu, trạng thái hết hàng, giới hạn chọn, nhánh phụ, điều kiện áp dụng hoặc cấu hình combo.

Ưu tiên sửa tính đúng đắn và hoàn tất luồng đọc–chỉnh sửa–lưu–tải lại trước khi chỉnh thêm hình thức.

## 2. Hiện tượng người dùng xác nhận

1. Trong tab Tuỳ chọn, chọn nhóm mới hoặc nhóm cũ.
2. Tick để áp dụng nhóm đó cho một món mới.
3. Nhấn Lưu.
4. Cả hai trường hợp đều trả HTTP 400.

Chưa xác định được chính xác response error code và nguyên nhân của hai request này. Không suy đoán rằng chúng nhất thiết cùng nguyên nhân. Thu thập và tái hiện riêng từng trường hợp.

UI từng mắc các lỗi sau, cần kiểm tra hồi quy:
- Tuỳ chọn gán trực tiếp cho món không xuất hiện trong sidebar.
- Bấm Size mở modal riêng thay vì trình chỉnh sửa chung.
- Mọi checkbox danh mục bị bỏ tích do so sánh database ID với slug.
- Nhiều nhóm dùng chung tên hiển thị bị nhầm với cùng một nhóm.
- Tiêu đề bị lặp; khó nhìn món thuộc danh mục nào.
- Tuỳ chọn toàn đơn bị tách thành nhiều section trên trang khách hàng.

## 3. Bối cảnh dữ liệu: đọc kỹ trước khi sửa

Có ba cách biểu diễn đang cùng tồn tại:

| Nguồn | Bảng lưu | Đặc điểm |
|---|---|---|
| Nhóm tuỳ chỉnh cũ | menu_customizations | Có options_json chứa lựa chọn và metadata |
| Danh mục tuỳ chọn cũ | menu_categories với category_type=modifier; menu_items | Lựa chọn được lưu như menu item |
| Nhóm tuỳ chọn mới | modifier_groups; modifier_options | Liên kết qua item_modifier_links và category_modifier_links |

modifier_groups có scope order/category/item. Không mặc định rằng toàn bộ dữ liệu đã chuyển sang bảng mới.

Kiểm kê chỉ đọc ngày 2026-09-28, cần xác minh lại trước migration:
- Dev: 17 canonical groups; 8 menu_customizations chưa có canonical counterpart; 16 modifier categories cũ.
- Production: 0 canonical groups; 25 menu_customizations chưa có canonical counterpart; 18 modifier categories cũ.
- Dev jiangjiejie: nhóm `mg_1790486239369_1`, tên `Size`, scope=item, 2 lựa chọn, liên kết với item `jj_combo_a1` — 套餐 A (3隻鹹水雞翅+6樣菜).
- Đây là dữ liệu mẫu để xác minh, tuyệt đối không hardcode tenant hoặc ID này trong logic ứng dụng.

Đọc các báo cáo và SQL tại docs/proposals/modifier_source_unification/. Phân biệt dữ liệu đã đo được với đề xuất chưa triển khai.

## 4. Các thay đổi gần đây cần rà soát lại, không mặc định là đúng

- API `/api/menu/modifier-library` hợp nhất dữ liệu qua lớp tương thích, có source/sourceId/canonicalId.
- Sidebar chia hai nhóm mở mặc định: Gán cho toàn cục; Gán cho món.
- Canonical groups đang được chuyển sang editor model dùng chung với customizations.
- Một phần luồng lưu dùng `__customizations`; cần xem việc này có vô tình tạo bản ghi legacy mới cho canonical group không.
- Đã sửa một số nơi chuẩn hoá category ID và tiền tố `mg_`; chưa chứng minh mọi đường đọc/ghi nhất quán.
- Backend đã có thay đổi để giữ nhóm chưa được gán, thay cho tự động xoá nhóm không có liên kết.
- Kiểm tra menu-safety cuối được ghi nhận: 29/30 đạt. Test `T1: Omitted modifier_groups preserves links while [] explicitly removes them` thất bại vì kỳ vọng 0 nhưng thực tế 1. Chạy lại trên checkout hiện tại. Kiểm tra assertion đang nói về liên kết hay bản ghi nhóm: bỏ gán và xoá nhóm là hai thao tác khác nhau. Không sửa kỳ vọng chỉ để test xanh.

Một số thay đổi có thể đã được commit/deploy bởi task khác. Bắt đầu bằng git status, git log và đọc code hiện tại. Không reset hoặc ghi đè thay đổi chưa hiểu.

## 5. Các file và luồng cần lần theo

- js/orders-menu.js:
  - loadMenuData, renderMenuCategories, renderOrderCustomizationEditor.
  - toggleGroupAppliedCategory, toggleGroupAppliedItem, setCustomizationGroupScope.
  - serializeMenuData, getMenuDeletions, saveMenuData.
  - openItemModifiersModal, saveItemModifiersModal, thư viện import nhóm.
- benmi-worker-official/src/modules/menu.ts:
  - validateMenuUpdate, syncMenuToD1, updateMenu.
  - sở hữu ID, processedGroupIds, upsert options, xoá liên kết, xoá nhóm, transaction.
- benmi-worker-official/src/modules/modifier-library.ts.
- benmi-worker-official/src/modules/bootstrap.ts.
- js/client-menu.js và các luồng chọn modifier/checkout liên quan.
- js/orders-i18n.js, css/orders.css, orders.html, index.html.
- migrations 0061, 0063 và các migration bổ sung liên quan.
- scripts/test-menu-safety.cjs, scripts/test-modifier-library.cjs, tests/test_menu_compatibility_regression.cjs.

Không cần sửa tất cả file; chỉ sửa nơi có nguyên nhân hoặc cần thiết cho thiết kế nhất quán.

## 6. Trình tự bắt buộc

### Bước A — Tái hiện và chốt nguyên nhân 400

1. Xác nhận URL frontend, Worker và D1 thuộc cùng môi trường dev. Ghi version code nếu xác định được.
2. Tạo fixture dev riêng hoặc dữ liệu thử có thể phục hồi; tránh sửa món đang vận hành để thử.
3. Tái hiện riêng: nhóm cũ → món mới; nhóm canonical → món mới.
4. Ghi request payload, HTTP status, response JSON và log lỗi backend liên quan. Không ghi token hoặc dữ liệu khách hàng vào báo cáo.
5. Lần từ checkbox đến editor state, serializer, validator, kiểm tra ownership và câu SQL thất bại.
6. Viết regression test thất bại thể hiện nguyên nhân trước khi sửa. Nếu không thể tái hiện trên môi trường người dùng, tái hiện bằng fixture đầy đủ và nêu giới hạn bằng chứng.

Đặc biệt kiểm tra:
- ID món mới được tạo trước hay sau khi serialize các appliedItems?
- Thứ tự danh mục trong mảng có làm ID tạm chưa được thay thế trong phần đã serialize không?
- Cùng nhóm xuất hiện trong __customizations và item.modifier_groups với cấu hình/ID khác nhau không?
- Có chỗ tự thêm `mg_` trong khi chỗ khác dùng ID gốc không?
- Validator có yêu cầu prefix của legacy ID đối với canonical ID hợp lệ không?
- Option ID có thuộc nhóm/tenant khác không? Không coi cùng tên là cùng lựa chọn.
- Gán theo category dùng database ID, slug hay cả hai? Chuyển đổi ở đâu?
- Với nhóm cũ dạng modifier category, tick có chỉ cập nhật editor group nhưng serializer bỏ qua cấu hình/liên kết đó không?

### Bước B — Chốt hợp đồng dữ liệu dùng chung

Viết ngắn cấu trúc editor/API thống nhất trước khi sửa diện rộng. Tối thiểu gồm:
- Identity ổn định: id, tenant, source/sourceId và canonicalId nếu đã có.
- name, selectionType, isRequired, minSelection, maxSelection, sortOrder, scope.
- options: id, name, price, default, stock, sortOrder, nhánh phụ và điều kiện nếu có.
- categoryIds và itemIds dưới dạng ID ổn định.

Quy tắc:
- Một ID nhóm tương ứng một định nghĩa trong một lần lưu.
- Nhóm khác ID nhưng cùng tên vẫn là hai nhóm.
- Không thêm tiền tố để đoán identity tại các vị trí UI khác nhau.
- Không tự gộp các alias mâu thuẫn; báo lỗi rõ ràng và không ghi một phần.
- Giai đoạn cấp ID cho tất cả món/nhóm/lựa chọn mới phải hoàn thành trước giai đoạn tạo payload hoặc liên kết.
- Phân biệt bỏ qua trường, mảng rỗng để bỏ gán, và yêu cầu xoá nhóm rõ ràng.
- Nhóm chưa gán vẫn tồn tại trong thư viện và có thể chỉnh sửa.

Cấu trúc ví dụ để định hướng, không bắt buộc thay đổi tên field công khai đang dùng:

```json
{
  "id": "stable-group-id",
  "source": "canonical",
  "sourceId": "stable-group-id",
  "canonicalId": "stable-group-id",
  "name": "Size",
  "scope": "item",
  "selectionType": "single",
  "isRequired": false,
  "minSelection": 0,
  "maxSelection": 1,
  "categoryIds": [],
  "itemIds": ["stable-item-id"],
  "options": [
    {"id": "stable-option-id", "name": "Small", "price": 0, "isDefault": true}
  ]
}
```

### Bước C — Thống nhất UI

- [ ] Size và nhóm legacy sử dụng cùng renderer, cùng thao tác và cùng cách hiển thị dữ liệu gán.
- [ ] Bấm sidebar mở editor trong tab Tuỳ chọn; không tự mở modal riêng cho canonical group.
- [ ] Sidebar hiện cả nhóm chưa gán; chia theo scope, không theo bảng nguồn.
- [ ] Mỗi nhóm hiện đúng một lần theo identity; các nhóm cùng tên vẫn phân biệt được.
- [ ] Danh mục là từng thẻ riêng, món nằm trong thẻ; chọn danh mục chọn toàn bộ món.
- [ ] Danh mục có trạng thái chọn một phần khi chỉ chọn một số món; kiểm tra trạng thái DOM indeterminate.
- [ ] Bỏ một món khỏi danh mục đang chọn phải giữ các món còn lại đúng theo semantics đã chốt.
- [ ] Mở nhóm hoặc tải lại phải tự tích đúng dữ liệu đã lưu.
- [ ] Chuyển nhóm khi có sửa chưa lưu không được âm thầm mất dữ liệu.
- [ ] Modal cài đặt món dùng cùng định nghĩa nhóm; sửa ở một nơi thấy đúng ở nơi còn lại.
- [ ] Không làm mất thông tin default/min/max khi UI chung chưa có control cho trường đó.
- [ ] Nút/checkbox phù hợp tablet, vùng thao tác tối thiểu 48px; đầy đủ zh-TW và vi.
- [ ] Giữ nguyên việc gom tuỳ chọn toàn đơn thành một khối trên trang khách; nhãn combo vẫn đúng.

### Bước D — Hoàn thiện luồng ghi tương thích

- Dùng adapter riêng cho nguồn legacy; renderer không quyết định cách lưu theo nguồn.
- Canonical là hướng đích. Không lấy việc tạo thêm bản sao legacy làm giải pháp lâu dài cho canonical group.
- Nếu còn dual-write, ghi rõ lý do, nguồn nào ưu tiên và điều kiện bỏ dual-write; bảo đảm hai biểu diễn không lệch.
- Mọi kiểm tra ID và SQL phải cách ly tenant. Nhóm mới phải có ID hợp lệ, nhóm tồn tại phải được xác minh ownership.
- Không làm yếu validation. Phản hồi 400 cần chỉ ra field/group/item và lý do có thể xử lý, không lộ dữ liệu tenant khác.
- Lưu nguyên tử: lỗi ở một nhóm thì toàn bộ request không được ghi dở dang.
- Giữ nhóm khi bỏ liên kết cuối cùng. Xoá nhóm chỉ khi có thao tác xoá rõ ràng, xử lý các link liên quan trong cùng transaction.
- Lưu liên tiếp cùng payload không tạo thêm nhóm, option hoặc link.
- Invalidate bootstrap cache sau khi ghi thành công.
- Không đổi dữ liệu đơn hàng lịch sử hoặc cấu hình bundle ngoài phạm vi.

### Bước E — Chuẩn bị loại bỏ cơ chế cũ

Không cần xoá bảng cũ trong task sửa ổn định này. Cần có:
1. Bản đồ nguồn cũ → canonical theo tenant và ID, không theo tên.
2. Danh sách metadata chưa có nơi lưu tương đương ở schema mới.
3. Backfill có thể chạy lặp an toàn, báo cáo conflict, kế hoạch rollback.
4. Điều kiện chuyển reads/writes hoàn toàn: đủ nhóm, đủ lựa chọn/liên kết, field parity, round-trip đạt.
5. Danh sách phần tương thích còn lại và tiêu chí gỡ bỏ từng phần.

Không áp dụng migration production tự động. Hoàn tất và kiểm chứng trên dev trước.

## 7. Ma trận kiểm chứng tối thiểu

Thực hiện cho nhóm legacy customizations, legacy modifier category và canonical:

| Tình huống | Kết quả cần chứng minh |
|---|---|
| Gán món có sẵn | Lưu thành công; reload vẫn tích đúng |
| Gán món vừa tạo trong cùng lần lưu | ID được resolve đúng; không 400 hoặc dangling link |
| Danh mục mới + món mới + gán nhóm | Thứ tự serialization không làm sai liên kết |
| Gán toàn danh mục | Các món kế thừa đúng sau reload |
| Gán vài món trong danh mục | Chọn một phần đúng; không tự mở rộng thành toàn danh mục |
| Bỏ món khỏi danh mục đã chọn | Những món còn lại giữ trạng thái đúng |
| Bỏ gán cuối cùng | Nhóm còn trong sidebar; links rỗng |
| Một nhóm dùng chung nhiều món | Sửa một lần, cùng định nghĩa; không payload conflict |
| Hai nhóm cùng tên khác ID | Không tự gộp |
| Xoá nhóm rõ ràng | Xoá đúng nhóm và links; không hồi sinh từ item snapshot cũ |
| Save hai lần, reload | Không sinh ID/nhóm/option/link trùng |
| Đổi tên, giá, default, min/max | Không mất metadata khác |
| Hết hàng, nhánh phụ, điều kiện tối thiểu | Giữ nguyên sau round-trip |
| API trả dữ liệu thiếu/lỗi | Không cho lưu snapshot thiếu dẫn đến xoá dữ liệu |
| ID tenant khác | Bị từ chối; database không đổi |
| Một phần payload không hợp lệ | Transaction không ghi phần còn lại |
| Combo và trang khách hàng | Chọn modifier/bundle, tính phụ thu và hiển thị đúng |

Các lệnh nền tảng, kiểm tra package.json nếu có thay đổi:

```sh
npm run check
npm run test:menu-safety
node --test scripts/test-modifier-library.cjs
npm run test:menu-regression
./benmi-worker-official/node_modules/.bin/tsc --noEmit -p benmi-worker-official/tsconfig.json
```

Bổ sung regression tests có giá trị cho lỗi thực tế. Test không được chỉ lặp lại code implementation. Không chỉ dùng syntax check để kết luận UI/lưu menu hoạt động.

Chạy kiểm thử tích hợp bằng SQLite/D1 fixture và kiểm tra qua trình duyệt trên dev: tick → lưu → xác nhận response → reload → mở lại nhóm → đối chiếu DB/API. Không kết luận thành công từ toast hoặc HTTP 200 nếu dữ liệu đọc lại sai.

## 8. Quy tắc triển khai và báo cáo

- Giữ các chỉnh sửa UI đã được người dùng chấp nhận, trừ khi chúng gây lỗi hoặc cần điều chỉnh theo tiêu chí trên.
- Không hardcode theo tenant, tên Size, tên combo hoặc slug danh mục.
- Bump cache-buster cho mọi JS/CSS sửa theo AGENTS.md.
- Sau khi kiểm chứng đầy đủ, triển khai dev theo workflow của repo và xác nhận frontend thực sự dùng Worker dev cùng version mới.
- Không tự triển khai production trong task này.
- Không tuyên bố “xong” khi chỉ hiện Size trên sidebar hoặc khi API trả danh sách nhưng click/save/reload vẫn dùng luồng lỗi.
- Nếu bị chặn quyền truy cập, báo rõ bước nào thiếu bằng chứng; tiếp tục phần local độc lập có ích.

Báo cáo cuối phải có:
1. Nguyên nhân thực tế của từng HTTP 400, kèm error code/điều kiện tái hiện đã xác nhận.
2. Thay đổi data flow đọc và ghi; cách giữ tương thích legacy.
3. Kết quả từng nhóm tình huống quan trọng trong ma trận, đặc biệt legacy/new → món mới → save → reload.
4. Kiểm chứng dữ liệu không mất/trùng và tenant isolation.
5. Link dev, version đã triển khai và giới hạn còn lại nếu có.
6. Những việc còn cần làm để bỏ legacy, phân biệt rõ với công việc đã hoàn thành.

Bắt đầu bằng đọc code hiện tại và tái hiện lỗi 400. Hoàn thành việc sửa và kiểm chứng, không dừng ở bản kế hoạch.
