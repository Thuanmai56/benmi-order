# Feature: Sửa tương thích menu cũ/mới trên POS và LIFF

Ngày: 2026-09-27. Loại: kế hoạch sửa lỗi và prompt thực thi cho model nhỏ hơn.
Kiến trúc: [PDP](/Users/duccao/Documents/benmi-order/docs/proposals/menu_compatibility_hardening/PDP.md).

## A. Chỉ dẫn cho model nhận việc

Bạn làm việc trong `/Users/duccao/Documents/benmi-order`. Đọc AGENTS.md ở root và backend; đọc các skill phù hợp khi sửa Worker/UI. Đây là tài liệu hướng dẫn, không phải bằng chứng rằng các thay đổi đã được thực hiện.

Thực hiện một bước T mỗi lần. Trước khi sửa: đọc code hiện tại, kiểm tra checkpoint và diff; không tin số dòng trong review cũ. Sau khi sửa: chạy test liên quan, cập nhật checkpoint và báo kết quả. Không tự spawn agent hoặc tạo task mới. Không commit/push/deploy hay thay DB remote chỉ vì tài liệu có phần rollout; tác vụ thực thi local và tác vụ triển khai là hai phạm vi riêng.

Giữ thay đổi đang có của người dùng. Tại thời điểm lập plan có bốn file proposal bị xóa trong worktree; không khôi phục hoặc đưa chúng vào phạm vi sửa.

Nếu chỉ có thời gian cho một bước, hoàn thành bước đó và ghi rõ còn gì; không ghi toàn bộ kế hoạch đã xong. Nếu hợp đồng dữ liệu gặp xung đột chưa giải quyết, ghi bằng chứng và câu hỏi cụ thể; tiếp tục phần độc lập, không đoán rồi thay đổi nghiệp vụ.

### Đầu ra sau mỗi bước

1. Những file đã sửa và hành vi thay đổi.
2. Test đã chạy, exit code và kết quả; phân biệt lỗi có sẵn với lỗi mới.
3. Một ví dụ input → output chứng minh lỗi đã sửa.
4. Bước tiếp theo và giới hạn chưa kiểm tra.
5. Cập nhật `docs/proposals/menu_compatibility_hardening/IMPLEMENTATION_STATUS.md` khi bắt đầu thực thi; không đánh dấu bằng suy đoán.

## B. Hợp đồng nghiệp vụ phải giữ

### B1. Bốn phạm vi độc lập

| Phạm vi | Nguồn | Áp dụng | Quy tắc |
|---|---|---|---|
| Danh mục | menu_categories + menu_items loại modifier | Mỗi phần món thuộc danh mục được gán | Giữ applied_modifiers và allow_customization hiện có |
| Riêng theo món | modifier_groups/options + item_modifier_links | Mỗi phần của món được gán | Cộng với nhóm danh mục, không ghi đè |
| Toàn đơn | menu_customizations | Một lần cho toàn giỏ | Không nhân phụ thu theo số món |
| Combo | menu_bundle_rules | Mỗi phần combo, các món thành phần | Cha và từng món con có tùy chỉnh riêng; không tính hai lần |

- Tắt tùy chỉnh danh mục chỉ tắt kế thừa danh mục; nhóm riêng theo món vẫn hoạt động.
- `applied_modifiers = ['*']`: tất cả nhóm danh mục hợp lệ. `[]`: không có nhóm danh mục.
- Dữ liệu legacy null/rỗng phải được normalize nhất quán giữa món bán lẻ, combo và backend, theo hành vi catalog cũ; không để combo hiểu thành [] trong khi bán lẻ hiểu thành ['*'].
- Không hardcode tenant/slug/tên món mới. Không tự xóa compatibility cũ nếu chưa có test thay thế.
- Nhóm trùng tên nhưng ID khác là hai nhóm khác nhau; không dedupe bằng tên. Nhóm cùng định danh thực sự thì không render/tính hai lần.
- Không tự mở rộng phạm vi thành triển khai thư viện nhóm dùng chung nếu chưa có UI đó.

### B2. Quy tắc lựa chọn

- `effectiveMin = max(isRequired ? 1 : 0, minSelection ?? 0)`.
- Nhóm single tối đa 1; nhóm multiple theo maxSelection đã lưu. Giữ nghĩa legacy max=0 là không giới hạn nếu code hiện tại dùng nghĩa đó; frontend/backend phải thống nhất và có test.
- Validate số nguyên không âm, min không vượt max hữu hạn; từ chối cấu hình vô nghiệm mới. Không tự chỉnh dữ liệu legacy chỉ vì đọc lên.
- Không chọn option hết hàng. Nếu tất cả option của nhóm bắt buộc hết hàng: không auto-select option hết hàng, không thêm món; giải thích cụ thể nhóm bị chặn.
- Nhóm single optional cho phép bỏ chọn sau khi đã chọn, bằng thao tác rõ ràng.
- Hiển thị số cần chọn và lỗi tại đúng nhóm. Chọn đủ multiple bắt buộc phải xác nhận được.
- Khi sửa phần thứ N, báo lỗi và mở đúng phần thứ N; không luôn mở phần đầu.

### B3. Giá

- Tra giá bằng item/group/option ID trong tenant, không dùng tên làm khóa chính.
- Ví dụ bắt buộc: món 80 + phô mai 15 = 95; hai phần chỉ phần đầu thêm phô mai = 175.
- Hai món có option cùng tên giá 15 và 25 phải dùng đúng giá từng món.
- Hai nhóm multiple cùng có option tên “Thêm” phải chọn độc lập và tính đủ nếu chọn cả hai.
- Combo cha 100 + tùy chỉnh cha 5 + phụ thu món con 10 + tùy chỉnh món con 15 = 130. Hai phần combo như nhau + toàn đơn 20 = 280.
- Không thay thuật toán khuyến mãi danh mục. Giữ nguyên quy tắc hiện tại về món nào/phần giá nào hưởng khuyến mãi và test parity trước/sau.

## C. Hợp đồng dữ liệu đề xuất

Đây là phần bổ sung tương thích ngược; kiểm tra mọi nơi đọc/ghi trước khi đổi type.

### C1. Lựa chọn trong bộ nhớ frontend

Trong từng portion của customizeData, thêm biểu diễn chuẩn theo ID:

```json
{
  "selectionsVersion": 2,
  "selectedByGroup": {
    "item:group-1": ["option-1"],
    "category:group-2": ["option-2", "option-3"]
  },
  "note": "Ít sốt"
}
```

Khóa source + group ID tránh va chạm hai hệ bảng. Đây là state nội bộ; không bắt DB có cột mới. Adapter nhận `single`, `multiple`, và các trường legacy còn đang dùng; chỉ chuyển tên sang ID khi xác định duy nhất trong nhóm/món. Nếu dữ liệu mơ hồ hoặc option đã biến mất, yêu cầu chọn lại và giữ note/số lượng khi có thể. Không âm thầm coi giá không resolve được là 0.

### C2. Payload order mới

Mở rộng `OrderItemOption`, giữ trường hiển thị cũ để receipt/printer tiếp tục chạy:

```json
{
  "group": "Topping",
  "choice": "Phô mai",
  "price": 15,
  "source": "item",
  "groupId": "group-1",
  "optionId": "option-1",
  "portionIndex": 0
}
```

- Một option record biểu diễn một lần chọn trên một portion; không nhân thêm quantity lần nữa khi cộng mảng đã trải phẳng.
- Note vẫn có đường lưu riêng và không bị validator xem là modifier cần optionId.
- Combo child giữ snapshot hiện có, bổ sung `source` nếu cần phân biệt ID; không đổi groupId của nhóm chọn món thành groupId của modifier.
- Backend kiểm tra portionIndex, ownership, membership, sold-out, min/max và giá từ DB. Giá client chỉ dùng để phát hiện menu thay đổi; không ghi nhận như giá tin cậy.
- Payload cũ không ID được resolve theo ngữ cảnh item/group và tên khi duy nhất. Với payload legacy không đủ thông tin, trả lỗi yêu cầu tải lại/chọn lại khi cần xác minh; không đoán option và không cho bypass bằng cách bỏ ID.
- Dữ liệu đơn lịch sử được render từ snapshot, không bắt resolve qua menu hiện tại. Tạo/thêm/sửa món mới và chỉ đọc lịch sử là hai đường khác nhau.
- Thông báo lỗi cần code ổn định và group/item/portion tương ứng, không lộ dữ liệu tenant khác. Tên mã lỗi có thể theo convention sẵn có; ưu tiên reuse.

## D. Kế hoạch theo bước

### T0 — Baseline và fixture hồi quy

**Đọc:** schema, migration 0061, các file trong PDP, test menu-safety và test hiển thị combo.

**Thực hiện:**

- [ ] Ghi branch/HEAD và git status; tạo checkpoint.
- [ ] Chạy baseline các lệnh mục F, ghi chính xác pass/fail.
- [ ] Sửa fixture `scripts/test-menu-safety.cjs` để có schema mới. Ưu tiên apply migration 0061 thật trên schema nền tối thiểu phù hợp, không tạo mock bỏ qua SQL.
- [ ] Sửa assertion test bundle display nếu còn tìm implementation trong line.ts sau khi code đã chuyển vào modules/line/templates. Kiểm tra output thực tế, không chỉ tìm chuỗi trong file.
- [ ] Tạo fixture synthetic legacy/new/hybrid và tenant đối chứng; không sao chép đơn hàng/PII production.
- [ ] Thêm regression tái hiện ba lỗi đã chứng minh: cross-tenant write, item-specific price=0, required multiple không xác nhận được. Test thất bại ở code cũ là bằng chứng; không đổi expected sang hành vi sai.

**Gate:** phân biệt được test lỗi thời và lỗi sản phẩm. Test regression mới còn đỏ phải được ghi rõ sẽ xanh ở bước nào; không yêu cầu tất cả xanh ngay T0.

### T1 — Ownership và atomic menu write

**File:** menu.ts, test-menu-safety và test backend chuyên biệt nếu cần.

**Thực hiện:**

- [ ] Validate item_modifier_links: item và group phải cùng tenant của request.
- [ ] Với ID group/option gửi lên: kiểm tra nếu đã tồn tại thì thuộc đúng tenant; option thuộc đúng group. Trả lỗi trước khi ghi khi ID xung đột.
- [ ] Thêm điều kiện tenant vào các nhánh ON CONFLICT của group/option. Không chỉ thêm UUID rồi coi vấn đề đã xong.
- [ ] Tạo ID mới bằng cơ chế unique chuẩn; tránh Date.now + counter làm hai nhóm/option trùng nhau trong cùng request.
- [ ] Reject group/option ID lặp với cấu hình xung đột trong cùng payload. Giữ giới hạn shared-group hiện có nếu có, không tự thêm chức năng chia sẻ.
- [ ] Giữ toàn bộ ghi/xóa trong batch atomic; validation sai không được lưu một phần món khác.
- [ ] Phân biệt modifier_groups bị bỏ qua (giữ nguyên) và [] được gửi rõ (xóa liên kết của món này). Cleanup không xóa nhóm/option còn được món khác tham chiếu.
- [ ] Rà các đường rename, clone, stock-status của modifier mới: truyền ID khi có; không cập nhật nhầm tất cả option cùng tên. Giữ fallback cũ khi tên resolve duy nhất.
- [ ] Giữ invalidateBootstrapCache sau khi ghi thành công; không trả success nếu batch thất bại.

**Test:** A gửi group B; A gửi option B; option đúng tenant nhưng sai group; hai ID trùng trong payload; bỏ qua vs []; option hai nhóm cùng tên; batch lỗi giữa chừng; B byte-for-byte không đổi.

**Gate:** test ownership xanh, không sửa auth architecture ngoài phạm vi, không có đường ghi mới bỏ tenant condition.

### T2 — Bootstrap đầy đủ, cache và chống xóa nhầm

**File:** bootstrap.ts, orders-menu.js, HTML có script tương ứng, test bootstrap/editor.

**Thực hiện:**

- [ ] Chỉ trả menuComplete=true sau khi tất cả dữ liệu cần cho editor đã được nạp/parse thành công: catalog, customizations, item modifiers, bundle rules và rule phụ thuộc được sử dụng khi lưu.
- [ ] Kiểm tra success/results chứ không chỉ catch exception. Không có dòng dữ liệu là thành công; lỗi truy vấn không phải danh sách rỗng.
- [ ] Không cache response thiếu dữ liệu. POS chặn lưu và có retry; giữ draft đang có nếu refresh thất bại.
- [ ] Bổ sung version cho payload bootstrap và kiểm tra trước khi dùng cached response cũ. Cache thiếu version mới cần rebuild, không dùng để quyết định cấu hình rỗng.
- [ ] POS không serialize [] từ dữ liệu chưa được xác nhận đầy đủ. Nếu schema chưa migrate, trả trạng thái lỗi rõ ràng; không giả vờ menu trống.
- [ ] Bump cache-buster khi sửa JS.

**Test:** inject lỗi query item modifiers và bundle rules; core query vẫn OK nhưng menuComplete=false; KV.put không gọi; save disabled; retry thành công phục hồi; cache cũ bị bỏ qua; tenant không có nhóm vẫn complete=true.

**Gate:** không còn đường load thiếu → save [] → xóa liên kết.

### T3 — Chuẩn hóa resolver, lựa chọn và giá frontend

**File:** client-core.js, client-customizations.js, client-bundle.js, client-cart.js, client-checkout.js, index.html. Có thể thêm một module JS thuần nếu giúp tránh trùng logic; khai báo đúng thứ tự script.

**Thực hiện:**

- [ ] Tạo resolver nhóm hiệu lực của item theo ID, kết hợp item + category theo B1. Khi chỉ có tên từ caller cũ, resolve item trong đúng category trước.
- [ ] Tạo helper thuần: normalize selection legacy/v2, resolve selected options, validate group count, calculate portion extra. Đặt tên rõ và dùng lại giữa modal/cart/checkout.
- [ ] Chỉ giữ một implementation có thẩm quyền về tra giá. Loại bỏ tình trạng function getModifierPrice ở client-bundle.js ghi đè bản ở core theo thứ tự script.
- [ ] Dùng ID cho mọi lựa chọn mới theo C1. Tên chỉ phục vụ hiển thị và adapter cũ.
- [ ] Cập nhật popup total, cart total, food subtotal, buildStructuredCartItems, text receipt và copy/edit/remove portion để dùng cùng helper. Không quét mỗi tên trong global map.
- [ ] Giữ thông tin từng phần khi serialize, restore giỏ, chuyển edit mode. Đừng thêm/sửa dòng chỉ ở popup mà bỏ payload checkout.
- [ ] Sau refresh menu, option không còn hợp lệ phải được đánh dấu cần chọn lại; không silently giữ giá cũ hoặc chuyển thành miễn phí.
- [ ] Không sửa công thức promotion trong bước này; thêm test giữ kết quả cũ.

**Test:** toàn bộ ví dụ B3; cùng tên khác nhóm/món; note và 2 portions; bỏ portion đầu và reindex; legacy single/multiple; script load theo đúng index.html gồm client-bundle.js; không chỉ test core một mình.

**Gate:** số tiền popup = cart = structured payload trên fixture chuẩn; test phụ thu theo món xanh; script không ghi đè resolver mới.

### T4 — Required/min/max và UI POS/LIFF

**File:** client-customizations.js, client-checkout.js, orders-menu.js, orders-i18n.js, css/orders.css, index.css, orders.html, index.html.

**Thực hiện:**

- [ ] Cả nút xác nhận và submit dùng cùng validator theo B2; không kiểm tra mọi nhóm bằng draft.single.
- [ ] Không tự chọn option hết hàng làm fallback. Không cho default vượt max; cấu hình mới invalid cần báo tại editor.
- [ ] POS hiển thị/giữ min/max: nhóm multiple có ô tối thiểu/tối đa và giải thích; sửa tên không reset về 1/99. Single giữ max=1.
- [ ] Khi chọn min>0 nhưng isRequired=false, hiển thị nhất quán đây vẫn là yêu cầu số lượng; tránh badge “không bắt buộc” mâu thuẫn.
- [ ] Optional single bỏ chọn được. Nhóm multiple chặn quá max và báo còn thiếu bao nhiêu khi dưới min.
- [ ] Phân biệt trong editor “tùy chỉnh riêng của món” với “kế thừa danh mục”; nói rõ hai loại cộng dồn.
- [ ] Mọi nút/input/checkbox label POS có hit area >=48px; không chỉ phóng icon. Đảm bảo modal cuộn được và nút lưu không che nội dung.
- [ ] Thêm đầy đủ I18N vi/zh-TW cho UI POS và error UI mới tương ứng; không mở rộng thành dự án dịch toàn bộ LIFF.
- [ ] Kiểm tra escape tên nhóm/option trước innerHTML hoặc dùng textContent, dùng button/input có semantics cho control mới.

**Test:** required single/multiple; min2-max3; optional clear; empty required; sold-out defaults; min/max preserved sau load-edit-save-reload; POS đủ key hai ngôn ngữ.

**Gate:** required multiple xác nhận được khi hợp lệ; lỗi mở đúng nhóm/phần; không reset cấu hình khi chỉ sửa label.

### T5 — Combo dùng đầy đủ tùy chỉnh của món thành phần

**File:** bootstrap.ts, bundle-rules.ts, bundle-builder-v2.js, client-bundle.js nếu còn đường gọi, types/index.ts.

**Thực hiện:**

- [ ] Bootstrap cung cấp dữ liệu/lookup đủ để resolver lấy nhóm item + category của từng eligible item. Không phụ thuộc item có xuất hiện ở catalog bán lẻ hay không; kiểm tra cả pool có sẵn.
- [ ] Áp dụng cùng quy tắc allow_customization/applied_modifiers legacy cho bán lẻ và combo.
- [ ] optionsFor trong builder không chỉ đọc bootstrap.modifiers. Render đầy đủ nhóm món con, giá và stock.
- [ ] Mỗi lần chọn món con giữ state riêng; hai lần chọn cùng một món được chỉnh khác nhau nếu combo cho phép lặp.
- [ ] Tùy chỉnh combo cha dùng helper T3/T4; không lẫn với các nhóm chọn món con.
- [ ] Backend nạp cả bảng modifier legacy và item_modifier_links/groups/options để xác thực. Check tenant + item membership, required/min/max, stock và giá.
- [ ] Giữ rule v1/v2, fixed/choice, source category/item-list, repeat, surcharge hiện có. Không đổi ý nghĩa v1 chỉ để test dễ hơn.
- [ ] Kiểm tra categories bundle_pool nếu đã hỗ trợ: không hiện bán lẻ ngoài ý muốn; không mở rộng loại món con nếu không có test/thiết kế hiện hữu cho phép.
- [ ] Chặn nested combo như hiện tại, không bỏ validator để làm cho order thành công.

**Test:** một món bán lẻ và trong combo có cùng nhóm; child chỉ có item modifiers; child category disabled nhưng item modifiers vẫn có; repeat hai phần khác lựa chọn; fixed/choice/v1/v2; sold-out option; option ngoài nguồn; min/max child; parent + child surcharge không tính hai lần.

**Gate:** khách chọn đúng được checkout; request giả mạo option child bị backend từ chối; snapshot đầy đủ từng món con.

### T6 — Backend order contract và các luồng tạo/thêm/sửa

**File:** orders.ts, bundle-rules.ts, types/index.ts; module normalization/validation chung mới nếu cần; consumer snapshot bị ảnh hưởng.

**Thực hiện:**

- [ ] Triển khai C2 cùng legacy adapter, không buộc mọi đơn lịch sử phải có ID modifier.
- [ ] Truy vết createOrder, executeAppendOrderInternal, appendOrder, modifyOrder và caller gián tiếp. Mọi món mới/được thay đổi đều dùng validator chung; không chỉ bảo vệ endpoint tạo đơn.
- [ ] Backend xác thực nhóm riêng theo món và nhóm danh mục từ DB cho portion được đặt, gồm membership/stock/min/max; reject sai giá bằng lỗi có thể khôi phục ở client.
- [ ] Sửa ranh giới tính subtotal combo: validator không được so parent base + child extras với subtotal đã có parent modifiers rồi báo BUNDLE_PRICE_CHANGED sai. Xác định rõ phần nào chịu trách nhiệm cộng parent extras, chỉ cộng một lần.
- [ ] Tùy chỉnh toàn đơn kiểm tra lựa chọn tồn tại/stock/required và giữ threshold hiện có. Áp dụng một lần cho giao dịch theo semantics create/append/modify hiện hữu; không tự bắt khách chọn lại tùy chỉnh toàn đơn đã có khi append nếu flow cũ giữ lựa chọn đó.
- [ ] Giữ rules khuyến mãi, dine-in, thêm món, sold-out edit và cách bảo toàn dòng đơn không thay đổi. Không mở rộng thành viết lại pricing engine.
- [ ] Backend đi trước frontend: payload cũ hợp lệ resolve được phải tiếp tục thành công; payload mơ hồ trả lỗi reload rõ ràng, không rơi vào success giá 0.
- [ ] Lưu names/prices snapshot sau validation. Kiểm tra POS, LINE, history, bill, label vẫn đọc được trường cũ; không reprice đơn cũ theo menu mới.

**Test:** create/append/modify với modifier mới; legacy unique name; ambiguous name; foreign option; giả price; note-only; unknown option; portionIndex không hợp lệ; parent modifier paid trong combo; global addon chỉ cộng một lần; giữ nguyên lịch sử sau rename/xóa menu.

**Gate:** cùng lựa chọn có cùng tiền/nhãn trên LIFF → API → POS → hóa đơn; backend không tin giá client và không bypass bằng payload thiếu ID.

### T7 — Hồi quy tổng hợp và QA giao diện

**Thực hiện:**

- [ ] Chạy tất cả test mục F và các test đã thêm. Không dừng ở test source-string.
- [ ] QA với fixture mục E bằng browser trên local/dev phù hợp, không đặt đơn giả production.
- [ ] Phone viewport 375px và một viewport điện thoại lớn; tablet 768/1024px, portrait/landscape. Kiểm tra modal nhiều nhóm/option dài, scroll, bottom CTA, bàn phím nhập note.
- [ ] POS chuyển vi/zh-TW, không key thô/mixed language ở phần mới; control đủ 48px.
- [ ] Test save-reload và hai cửa sổ: cache cũ, menu thay giá, option vừa hết hàng. Không âm thầm xóa draft hoặc báo đã lưu khi thất bại.
- [ ] Đọc đơn lịch sử có combo/tùy chỉnh cũ, in preview nếu có; không in máy thật hoặc gửi LINE chỉ để test khi chưa có phạm vi đó.
- [ ] Ghi ảnh/chứng cứ kiểm tra và giới hạn: browser viewport không tương đương đã QA LINE/iPad thật.

**Gate:** ma trận E có bằng chứng pass hoặc giới hạn rõ; mọi lỗi P1 đóng; không bỏ test fail khỏi báo cáo.

### T8 — Bàn giao và chuẩn bị release

- [ ] Kiểm tra diff không chứa thay đổi ngoài scope; cache-buster đầy đủ.
- [ ] Báo sửa gì, test gì, migration cần gì, giới hạn gì; checkpoint tất cả bước phản ánh đúng thực tế.
- [ ] Ghi thứ tự schema → backend tương thích hai payload → frontend → QA dev/staging → production khi được giao triển khai.
- [ ] Đọc wrangler.jsonc để chọn môi trường. Staging hiện dùng --env test, không suy ra --env staging từ tên branch.
- [ ] Nếu đã có migration 0061 thì không chạy SQL ALTER trực tiếp lần nữa. Nếu cần schema thêm, migration mới không destructive; chỉ tạo khi giải pháp thực sự cần.
- [ ] Xác định bản rollback đã kiểm chứng, ưu tiên giữ bản sửa ownership và contract tương thích. Không DROP bảng mới hoặc reset dữ liệu tenant để rollback.

## E. Fixture và ma trận bắt buộc

Fixture dùng tên synthetic và cấu hình, không thêm điều kiện code theo tên fixture.

| ID | Dữ liệu | Kết quả cần kiểm tra |
|---|---|---|
| L1 | Tenant cũ: món thường, không modifier | Thêm một chạm, giá cũ, lưu không sinh nhóm mới |
| L2 | Legacy category single required + multiple optional | Nhóm/giá/default trước và sau tương đương |
| L3 | Legacy category multiple required | Chọn đủ xác nhận được, chọn thiếu bị chặn |
| L4 | Global radio/checkbox, paid, required, threshold | Áp dụng toàn đơn, thứ tự hiển thị giữ nguyên |
| L5 | Combo rule v1/v2, fixed/choice, repeat/non-repeat | Nguồn món và số lượng giữ nguyên |
| N1 | Chỉ item modifier paid | 80+15=95 trên mọi đầu ra |
| N2 | Item + category cùng áp dụng | Không mất nhóm, không ghi đè theo tên |
| N3 | Hai group/option trùng tên, giá khác | Chọn độc lập, giá chính xác |
| N4 | Min2/max3, single optional, all sold-out | Validate và thông báo đúng |
| N5 | Combo parent+child modifiers | Ví dụ 130/280 ở B3 chính xác |
| H1 | Tenant legacy được thêm item modifiers | Món khác không đổi; save-reload bảo toàn dữ liệu |
| S1 | Tenant A/B và ID nhóm/option xung đột | Reject, rollback toàn batch; B không đổi |
| S2 | Bootstrap partial failure + cached old response | Không cho save thiếu, không cache sai |
| O1 | Đơn cũ, append, modify sau đổi menu | Lịch sử giữ snapshot; lựa chọn mới xác thực |

## F. Lệnh kiểm tra

Chạy từ root, từng lệnh ghi kết quả riêng. Node cần hỗ trợ node:sqlite cho menu-safety; nếu runtime không hỗ trợ, dùng runtime hiện có phù hợp, không tự skip bài test.

```bash
npm run check
npm run test:menu-safety
npm test
node tests/test_customization_price_e2e.cjs
node tests/test_item_selection_modal_flow.cjs
node tests/test_menu_bundle_editor.cjs
node tests/test_bundle_stepper_v2.cjs
node tests/test_bundle_display_all_touchpoints.cjs
node tests/test_item_customization_note.cjs
node tests/test_order_identity.cjs
node tests/test_order_print_subtotal_bundle.cjs
```

Trong thư mục backend:

```bash
./node_modules/.bin/tsc --noEmit
```

Thêm lệnh chạy các regression mới vào checkpoint và script npm phù hợp. Không giả định test cũ bao phủ item modifiers chỉ vì tên có chữ customization.

Baseline tại review: frontend check, TypeScript, price legacy, item-selection, bundle-editor, bundle-stepper pass. Menu-safety fail do fixture thiếu schema 0061; bundle-display fail tại assertion tìm logic trong line.ts. Phải chạy lại, không coi thông tin này là kết quả của phiên thực thi.

## G. Tiêu chí hoàn thành toàn bộ

- [ ] Ownership group/option/link được kiểm chứng với ít nhất hai tenant.
- [ ] Tải thiếu không thể làm mất cấu hình khi save; bootstrap cache cũ được xử lý.
- [ ] Không còn tra giá lựa chọn mới chỉ theo tên; không còn function giá bị ghi đè theo thứ tự script.
- [ ] Món riêng, category, parent/child combo, global tính đúng phạm vi, đúng phần, đúng một lần.
- [ ] Required/min/max/default/sold-out đồng nhất giữa UI và backend.
- [ ] Lưu POS không reset min/max, ID hoặc cấu hình không sửa; vi/zh-TW và 48px đạt.
- [ ] Legacy payload/menu/history có test tương thích; không bỏ validation để giữ tương thích giả.
- [ ] Create/append/modify được kiểm tra, snapshot hiển thị trên các đầu ra liên quan.
- [ ] Các lệnh kiểm tra cần thiết pass; lỗi baseline đã xử lý đúng nguyên nhân.
- [ ] Có báo cáo QA và giới hạn kiểm chứng; không tuyên bố production an toàn nếu chưa kiểm tra rollout thực tế.

## H. Prompt giao cho model nhỏ hơn

```text
Đọc AGENTS.md, docs/specs/menu-compatibility-hardening.md và
docs/proposals/menu_compatibility_hardening/IMPLEMENTATION_STATUS.md nếu đã có.

Thực hiện bước T0; nếu checkpoint cho thấy T0 đã hoàn thành có bằng chứng,
thực hiện bước chưa hoàn thành đầu tiên. Chỉ xử lý một bước T trong lượt này.
Kiểm tra code hiện tại trước khi sửa. Giữ các thay đổi sẵn có của người dùng.
Không đổi semantics cộng item+category, không hardcode tenant, không migrate
dữ liệu legacy hàng loạt. Không dùng tên làm khóa lựa chọn mới. Không skip test
hoặc chỉ sửa expected để xanh. Không deploy/push/ghi DB remote.

Cuối lượt: cập nhật checkpoint với file đã sửa, lệnh test và kết quả,
ví dụ chứng minh hành vi đúng, phần chưa kiểm tra và bước tiếp theo.
Nếu bước có blocker, ghi rõ bằng chứng; không đánh dấu đã hoàn thành.
```
