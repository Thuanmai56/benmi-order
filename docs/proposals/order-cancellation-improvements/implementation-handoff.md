# Cải thiện phát hiện hủy đơn — tài liệu bàn giao

Bản ưu tiên thị trường Đài Loan hiện tại: [taiwan-support.md](taiwan-support.md). Tiếng Trung phồn thể là thị trường kiểm thử chính; ngôn ngữ UI/phản hồi vẫn theo tenant.

## Mục tiêu và phạm vi

Sửa feature LINE cancellation hiện hữu: regex → Clef Flash → yêu cầu POS duyệt. Không tự hủy đơn bằng AI. Phạm vi release: staging, tenant đang bật `bsc`; production và các tenant khác không được tự bật. Bảo toàn working tree và lịch sử nhánh hiện tại; không reset/force-push.

## Các quyết định nghiệp vụ

- Kiểm tra tenant + LINE user + đơn hoạt động trước khi gọi AI. Mã đơn sai không thay bằng đơn khác; thiếu mã chọn đơn hoạt động mới nhất tại lúc nhận webhook.
- Trạng thái áp dụng: NEW, ACCEPTED, DONE, WAITING_CUSTOMER_CHANGE, WAITING_CUSTOMER_REJECT. Giữ ưu tiên pending_actions, receipt và các tin có cấu trúc hiện hữu.
- Hủy cả một đơn: clear/review đều giữ tiến trình đơn và chờ nhân viên.
- Không thể nhận món và không có phương án nhận khác: review. Bạn nhận hộ/lấy muộn/giao hàng không tạo yêu cầu mới.
- Có yêu cầu chờ + rút lại/khẳng định vẫn nhận: ghi dấu khách đổi ý, không tự bỏ hold; nhân viên phải xử lý.
- Tin hỏi tiến độ/cảm ơn/không liên quan: không đổi version, clarity, lịch sử yêu cầu; tiếp tục handler thông thường.
- Cả Clef và fallback lỗi sau ba lượt: technical alert riêng, không tạo cancellation request, không giữ đơn hoặc gửi lời xác nhận hủy. Yêu cầu hợp lệ đã tồn tại giữ nguyên.
- Unsend redacts nội dung; không đảo ngược quyết định đã commit. Không tự đóng các yêu cầu unavailable cũ bằng migration.

## Classifier và dữ liệu

Giữ noul; một inference ba câu hỏi: explicit_cancel (yêu cầu hủy rõ), possible_cancel (có thể không nhận được, không phải hủy trực tiếp), withdraw_cancel (rút lại yêu cầu đang chờ). Prompt xét tin hiện tại, phủ định, điều kiện, phương án nhận khác; tin khách là dữ liệu không phải chỉ dẫn. Input chỉ có tin hiện tại, trạng thái, pending flag và tối đa ba tin liên quan trước sự kiện, bỏ tin unsend.

Thứ tự: regex → kiểm tra schema cả ba điểm → xung đột hủy/rút lại đạt review thì review → withdrawal nếu pending → explicit >=clear thì clear, >=review thì review → possible >=review thì review → other. Mặc định review=.6, clear=.9, không giảm ngưỡng để chữa các lỗi đã biết. possible không bao giờ thành clear. Regex chỉ toàn câu; hỗ trợ dấu/không dấu và mẫu phủ định có lời mở đầu đổi ý, nhận hộ chắc chắn; câu ghép mâu thuẫn vẫn sang AI. Thêm Hủy/Huỷ/huy/取消/cancel độc lập.

Fallback nhãn CANCEL/POSSIBLE_CANCEL/WITHDRAW_CANCEL/OTHER; mọi hủy qua fallback chỉ review, nhãn sai là lỗi. Metadata: intent, ba scores, classifierVersion, reasonCode cùng source/probability/clarity cũ. Lưu trong event/request/message; log không chứa nguyên văn tin hay secrets. Độ trễ CLI khác độ trễ webhook→POS.

Migration mới 0067 thêm customer_withdrew, latest_event_id, decision_json và bảng technical alerts tenant/event unique, acknowledged_at, revision triggers. Không sửa migration0066. Sắp thứ tự ý định bằng (event_at,event_id); sự kiện cũ không thay ý định mới. Yêu cầu hủy mới hơn xóa marker đổi ý.

Feed GET /api/order-cancellation-requests bổ sung technicalAlerts, giữ requests/revision/ETag. POST /api/order-cancellation-alerts/:id/acknowledge scoped tenant, idempotent. Technical alerts không tham gia trigger hold.

## POS

Hiện Khách yêu cầu hủy/Cần xác nhận với khách/Khách thay đổi ý định. Đổi ý hiện lời nhắc đọc tin mới trước quyết định. Cảnh báo kỹ thuật riêng có đơn, thời gian, nút Đã xem; không có nút duyệt hủy. Giữ draft/focus và CAS conflict. Đủ vi/zh-TW, touch48px, bump cache-buster orders.html khi sửa JS/CSS.

## Kiểm thử và release gate

Bắt buộc: ba câu từng bỏ sót đều detect; câu screenshot review không clear; phương án nhận khác/điều kiện/chính sách/bỏ món không giữ đơn; pending progress vẫn phản hồi; withdrawal giữ xử lý thủ công; event trùng/đến muộn/unsend/CAS không trùng; lỗi AI không hold; alert acknowledgement đúng tenant; legacy không đổi.

Regression corpus216. Holdout120 khóa bằng SHA256 tại holdout-lock.json trước lần đánh giá đầu tiên:40 explicit,20 possible,40 negatives,20 pending, không dùng các câu holdout làm ví dụ prompt. Gate clear precision>=98%, combined recall>=95%, hard-negative false positives=0; ba lỗi đã biết và screenshot phải đúng. Không giảm gate/đổi nhãn để đạt. Các holdout thất bại được giữ lại thành audit/development. Prompt v7 chốt trước holdout thế hệ4; sau lần chạy đầu còn một false positive với câu nhận hộ, đã bổ sung guard regex toàn câu, không sửa prompt hay nhãn. Vì có điều chỉnh dựa trên kết quả, kết quả cuối là acceptance regression; không tuyên bố là ước lượng thống kê độc lập. Lịch sử lần chạy ghi ở verification.md. Corpus là tổng hợp, không phải chứng minh accuracy tin thực tế.

Lệnh: npm run test:order-cancellations; npm run test:pos-cancellations; npm run test:line-order-receipts; npm run check. Backend npm run check và npm run test:cli. npm run eval:cancellations; fixture/output chọn bằng CANCELLATION_EVAL_FIXTURE và CANCELLATION_EVAL_OUTPUT.

Release: test → eval → migration staging → backend cf deploy --mode test → POS Pages → kiểm tra config/feed/cache-buster, tenant duy nhất enabled. LINE thật cần người vận hành gửi từ tài khoản thực khách để xác minh quan sát đầu cuối; không giả mạo người dùng thật. Không tự mở production. Rollback: tắt detection qua config, giữ xử lý request và notification; không rollback schema phá dữ liệu hoặc quay lại bản tạo hold khi AI lỗi.

## Tài liệu nền

Implementation/runbook trước thay đổi: ../order-cancellation-requests/implementation.md. Kết quả thực thi và deployment mới ghi ở verification.md bên cạnh tài liệu này.
