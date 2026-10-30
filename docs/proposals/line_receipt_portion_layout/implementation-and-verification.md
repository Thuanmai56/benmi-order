# Kết quả triển khai LINE receipt theo từng phần

Ngày 2026-10-30. Nhánh `codex/line-receipt-portions`, base main `b7178b8` đã pull từ origin trước khi sửa. Báo cáo ghi nhận kết quả kiểm thử trước commit/push; chưa deploy. Các thay đổi skill tenant-menu-seeder và seed `dafobenwan.sql` có sẵn trong workspace được giữ nguyên.

## Thay đổi đã hoàn tất

- `js/line-order-presentation.js`: helper pure dùng chung browser/Worker; snapshot đọc trực tiếp `detailLine.portions`; hỗ trợ legacy bundle object/JSON/array, options và ghi chú có prefix theo phần. Nhãn nhóm/lựa chọn, thứ tự, modifiers và lựa chọn con giữ theo dữ liệu.
- Mỗi phần khác cấu hình có box/heading riêng; một phần không có heading thừa. Các phần liên tiếp chỉ gộp khi dữ liệu đủ và identity/name/quantity/price/children/note giống hoàn toàn. Không gộp xuyên item/round hoặc thay đổi index gốc.
- LINE Flex create, legacy append và legacy modify dùng cùng renderer. Snapshot append vẫn chỉ hiện vòng mới; modify giữ các vòng khác. Các legacy/new rounds giữ đúng thứ tự nguồn.
- Subtotal bằng 0 được giữ; unknown legacy unit price ghi rõ đơn giá. Snapshot discount lấy giá trị đã commit, không suy ngược sai khi có phụ thu toàn đơn.
- Checkout dùng layout mới ở text người đọc. Payload `content`/`appended_content` gửi API và đường fallback tạo đơn cũ giữ format canonical trước đây; POS và máy in không phải đọc format text mới. Header/marker protocol hiện có được giữ nguyên.
- Bỏ cắt im lặng ở 30 mục; Flex dài được phân bubble/carousel theo byte UTF-8. Receipt nhiều message gửi tối đa 5 mỗi lần; nếu còn thì có postback xem tiếp, kiểm tra cả tenant và LINE user từ receipt đã lưu. Reply/push/retry/cron vẫn đọc cùng payload đã commit.
- Text LIFF kèm marker vượt 5.000 ký tự dùng Push receipt đã lưu trước khi thử gửi message quá giới hạn.
- Sửa printer parse JSON scalar làm mất display name `123`; bump asset versions trong index/orders. Thêm npm script `test:line-order-layout` và suite vào release gate.
- Test cũ `test_item_customization_note.cjs` có assertion CSS lỗi trên main trước thay đổi; đã chuyển sang kiểm tra note đúng phần và không lặp bằng DOM, giữ nguyên runtime POS.

## Kiểm chứng tự động

**Lần targeted cuối: 66 tests pass, 0 fail, 0 skipped/todo**, gồm LINE delivery/layout, snapshot create→append→modify, ghi chú, bản in, identity, bundle tại các điểm hiển thị, giá tùy chọn cùng tên và sold-out modify.

`npm run check`, backend `tsc --noEmit`, `npm run check:cache-busters` và `git diff --check` đều đạt. Browser static loader xác nhận module mới được tải đúng thứ tự, không xung đột global.

**Full release gate: 23/28 suite pass.** Các menu compatibility tests, component tests Chromium/WebKit, menu runtime và full-page menu Chromium/WebKit đều pass. Gate chưa đạt vì các lỗi sau:

| Suite lỗi | Nguyên nhân | Đối chiếu main sạch |
| --- | --- | --- |
| pos-display-chromium | Long identifier làm `.tile-info`/text tràn ngang | Tái hiện cùng width 191, scrollWidth 392 |
| pos-display-webkit | Long identifier làm nội dung POS tràn ngang | Tái hiện cùng lỗi |
| pos-tablet-layout-webkit | Nút paid bị clip tại viewport 960 / vi / auto | Tái hiện cùng hai nút lỗi |
| pos-detail-scroll | Khoảng cách nút tới đáy 75.015625px, test yêu cầu 80px | Tái hiện cùng giá trị |
| menu-static-contracts | 16 font-size px trong orders-menu.css vi phạm scale contract | Tái hiện cùng 16 khai báo; các test khác trong suite đạt |

Các lỗi trên được chạy riêng trên worktree detached `b7178b8`, dùng cùng phiên bản Playwright/browser; không sửa CSS/menu/POS để che lỗi gate. Worktree tạm đã được dọn. Không có bằng chứng các lỗi này do thay đổi LINE gây ra; release gate vẫn phải được xử lý trước phát hành.

Full gate chạy trước bổ sung test/fix dùng explicit snapshot discount và bắt lỗi mạng trang tiếp theo; đã chạy lại toàn bộ targeted 66 test cùng type/cache checks sau các thay đổi cuối. Không chạy lặp full release gate trong quá trình sửa nhỏ.

Evidence tại `artifacts/release-baseline/2026-10-30T11-06-09-123Z/`:

- `summary.json`: kết quả 28 suite, logs và provenance full gate.
- `final-verification.json`, `final-targeted.log`: kết quả cuối và hashes file sau targeted run.
- `main-*.log`: bằng chứng lỗi giống nhau trên main sạch; `main-stale-note-test.log` xác nhận assertion CSS cũ đã lỗi trước đó.
- `preview.html`, `preview.png`: bản xem trước cục bộ sinh từ Flex JSON thật của fixture; renderer HTML chỉ để review phân nhóm, không thay thế LINE thật.
- `flex.json`: message fixture có thể đưa vào LINE Flex Simulator/validate API. `text.txt`: phần danh sách món dạng text.

## Phần còn lại trước phát hành

Điều chỉnh theo phản hồi sau bản xem trước: mỗi nhóm tùy chọn dùng một hàng Flex có nhãn bên trái và toàn bộ lựa chọn nối bằng `、` bên phải; nội dung dài tự wrap trong cột phải. Ghi chú món chuyển ngay dưới tên món với nhãn `品項備註` / `Ghi chú món`, ghi chú phần vẫn thuộc phần tương ứng. Đã bump cache-buster helper lên `20261030_line_portions_v2`. Bộ targeted cho lần chỉnh này đạt 55/55 test, bao gồm hai test mới về danh sách lựa chọn chung hàng và vị trí ghi chú món; frontend static, backend typecheck và cache-buster check đều đạt. Chưa chạy lại full gate cho thay đổi bố cục nhỏ; kết quả và các lỗi baseline đã ghi ở trên vẫn là tham chiếu release.

1. Xử lý 5 suite baseline nêu trên và nghiệm thu release gate theo workflow dự án.
2. Deploy backend dev trước frontend để hỗ trợ receipt nhiều trang; QA staging và validate API với kênh QA đã chọn. Chưa có lần gửi tin LINE thật hoặc validate API sử dụng channel token trong đợt làm việc này.
3. QA LINE iOS/Android, cỡ chữ thường/lớn, trường hợp 2 combo khác nhau và đơn dài. Bản preview cục bộ không đảm bảo pixel rendering giống LINE.
4. Rollback chỉ renderer/checkout khi cần; giữ delivery/page reader tương thích `receipt-pages` trong cửa sổ retry của những receipt đã commit. Không replay receipt sent, không sửa snapshot lịch sử.

Tinh chỉnh khoảng trắng theo phản hồi tiếp theo: spacing/margin của phần giảm từ `sm` xuống `xs`, padding từ 8px xuống 6px; khoảng cách giữa món giảm từ `md` xuống `sm`, body của receipt create/append dùng padding 16px và spacing `sm`. Cache-buster helper tăng lên `20261030_line_portions_v3`. Đã chạy lại 55/55 targeted tests, frontend static, backend typecheck và cache-buster check, tất cả đạt; bản preview cục bộ đã được tạo lại.

Khoảng trắng separator được tinh chỉnh tiếp: receipt create/append đặt margin 4px trên separator và margin 4px trên khối ngay sau separator, bỏ margin thừa ở tiêu đề danh sách món. Áp dụng theo [quy tắc margin ghi đè spacing của LINE](https://developers.line.biz/en/docs/messaging-api/flex-message-layout/#margin-property-of-components). Bộ targeted 55 tests và backend typecheck đã đạt; bản preview cục bộ được cập nhật để mô phỏng margin theo đúng trục bố cục và không cộng trùng spacing.
