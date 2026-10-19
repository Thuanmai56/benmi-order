# Checklist cho một release staff ordering

Mỗi task có một bản điền riêng. Ô chưa xác minh vẫn để trống; `N/A` phải có lý do. Không bỏ qua baseline đang fail để chuyển task.

## Phiếu thay đổi

- Task / PR:
- Hành vi duy nhất được thay đổi:
- Base `main` SHA / release SHA:
- Worker version / Pages deployment trước và sau:
- Schema migration, capability và môi trường bị tác động:
- Bằng chứng kiểm thử (`summary.json`, log, screenshot):
- Người xác nhận / thời điểm / phạm vi được phép thực hiện:

## A. Trước khi bắt đầu

- [ ] Người dùng đã xác nhận task này; task trước có kết quả và trạng thái rõ ràng.
- [ ] Nhánh release xuất phát từ `main` mới nhất; đã đối chiếu SHA remote.
- [ ] Diff chỉ gồm hành vi của task, test và tài liệu cần thiết; không mang code cũ ghi đè các bản sửa hiện tại.
- [ ] Đã ghi rõ API, dữ liệu, cờ, query dùng chung, POS và in có thể bị ảnh hưởng.
- [ ] Dùng Node 24; `npm ci` ở root và backend; browser được cài từ phiên bản Playwright trong lockfile.

## B. Trước push / PR / merge

- [ ] `npm run test:release` đạt toàn bộ 17 suite; lưu log, trạng thái từng suite và mã thoát.
- [ ] Test order identity chạy với schema nền `0057`, tenant mặc định đóng; test dữ liệu fixture không thay production.
- [ ] Có test riêng cho hành vi mới và lỗi chính của task; mock không thay thế kiểm thử D1 transaction khi thay thao tác ghi.
- [ ] Nếu sửa `js/*.js` hoặc CSS frontend, đã bump version trong tất cả HTML sử dụng asset và chạy frontend check.
- [ ] Xác minh URL API và D1 của preview/dev/staging trước thao tác QA. Preview không tự được xem là môi trường test.
- [ ] Đã rà pipeline thực tế: push `main` có thể tự deploy cả Pages lẫn Worker. Cấu hình Workers Builds cũ đã được xử lý bằng task được duyệt trước release runtime.
- [ ] Người dùng xác nhận thay đổi cụ thể và tác động auto-deploy trước push/merge. Không coi việc CI được thêm vào repo là branch protection đã được bật.

## C. Nếu có schema hoặc dữ liệu

- [ ] Kiểm tra lại schema và migration ledger của đúng database; phân loại khác biệt R00, bao gồm các file đã chạy nhưng không có trong `main`.
- [ ] Đã rà số migration trên các môi trường/nhánh; không dùng lại `0061`, không lấy `0068` chỉ vì `main` dừng ở `0067`.
- [ ] Migration bổ sung, có thể chạy cùng code cũ; không sửa file đã chạy, apply lại `0057` hoặc apply hàng loạt pending migration.
- [ ] Nếu tên trigger đã tồn tại, đã kiểm tra định nghĩa thực tế; `IF NOT EXISTS` không được dùng để che một định nghĩa sai.
- [ ] Đã kiểm thử trên fixture baseline tương thích production và trên trạng thái schema đích; có kế hoạch xử lý môi trường lệch schema.
- [ ] Người dùng xác nhận riêng database, SQL/migration và phạm vi tác động trước khi chạy từ xa.

## D. Trước mở capability demo

- [ ] Tenant đích chính xác là `blab_demo`; không đổi tenant ID, không hardcode tenant vào business logic.
- [ ] Kiểm tra lại cờ của toàn bộ tenant; chỉ demo được phép mở năng lực của release này.
- [ ] Schema → backend → frontend đã đúng thứ tự; code mới giữ đóng cho đến khi đủ thành phần.
- [ ] API từ chối tenant sai, thiếu quyền, session tenant khác, client cũ và truy cập URL trực tiếp; lỗi D1 không cho phép ghi.
- [ ] Tạo đơn/gọi thêm: giá server, transaction đầy đủ, retry cùng request ID và không tạo trùng; 20 lần lặp cho mỗi ca tranh chấp chính.
- [ ] Tranh chấp với thanh toán/hủy không ghi đè tổng tiền, không mở lại trạng thái kết thúc; POS xử lý `409` bằng tải và xác nhận lại.
- [ ] Chỉ dùng synthetic data local/staging hoặc demo theo phạm vi đã được duyệt. Không tự xử lý hai đơn staff staging hiện có.
- [ ] Đã diễn tập tắt riêng capability, đọc/xử lý đơn đang mở và rollback bản tương thích; ghi rõ mốc không được rollback vượt qua.
- [ ] Với in tự động: kiểm thử máy thật; chống in trùng theo đơn/lượt/trạm; lỗi in không tạo retry vô hạn; chỉ in món của lượt mới.
- [ ] Người dùng xác nhận riêng snapshot cờ trước/sau và phạm vi bật demo.

## E. Kết thúc task

- [ ] Đối soát số đơn, items, tổng tiền, bàn và idempotency request; không sai tenant hoặc có đơn trùng.
- [ ] Không có regression luồng khách/LINE/POS/in cũ và lỗi 5xx mới liên quan thay đổi; bất thường latency đã được giải thích.
- [ ] Ghi lại commit, migration, cờ, artifact, kết quả, hạn chế và đường rollback.
- [ ] Cập nhật tracker; dừng chờ người dùng xác nhận trước task tiếp theo.

## Điều kiện dừng

Dừng khi có sai tenant, sai tiền, trùng đơn, mất món, ghi đè thanh toán, in lặp, feature mở ngoài demo hoặc regression luồng cũ. Đóng quyền gây lỗi theo thao tác được duyệt; giữ đường xử lý đơn đang mở. Lỗi code dùng chung cần rollback code, không chỉ tắt UI. Không xóa dữ liệu hoặc khôi phục cả D1 để xử lý một lỗi tính năng.

Sau khi ghi đơn staff, không rollback về trước nền bảo vệ R13 khi còn đơn mở. Việc duyệt kết quả một task không tự cấp quyền deploy, migration hoặc mở cờ của task sau.
