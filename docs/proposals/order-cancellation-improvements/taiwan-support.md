# Ưu tiên tiếng Trung Đài Loan — 2026-10-14

## Thay đổi

Classifier `clef-cancellation-v8-tw` ưu tiên tiếng Trung phồn thể và cách nhắn LINE thường dùng tại Đài Loan. Tiếng Việt, tiếng Anh và input chữ giản thể/lỗi gõ nhỏ vẫn được hỗ trợ. Prompt có ví dụ Đài Loan cho cả ba câu hỏi và fallback dùng cùng định nghĩa.

- Hủy cả đơn: 退單、撤單、刪單、訂錯間、訂重複、後面那筆; phân biệt với hủy riêng một món/topping.
- Không thể nhận món: 不會過去拿了 khác 晚點過去拿. Bạn/người nhà nhận hộ, đổi giao hàng và lấy muộn giữ ý nghĩa vẫn muốn nhận món.
- Rút yêu cầu: 不取消了，照做 / 餐還是要，朋友代拿. Chỉ đánh dấu khách đổi ý khi đã có request chờ, không tự bỏ hold.
- Câu hỏi tiến độ/chính sách/điều kiện không tạo yêu cầu hủy; không dùng từ 取消 xuất hiện trong một câu làm kết luận.
- Regex chỉ toàn câu, hỗ trợ lời xin lỗi, lịch sự, chữ full-width/khoảng trắng và các mẫu phồn thể rõ ràng. Câu có item/điều kiện/mâu thuẫn vẫn sang AI. Không chuyển toàn bộ Chinese input sang giản thể và không ép ngôn ngữ phản hồi của tenant khác.
- POS và LINE vẫn dùng ngôn ngữ tenant, với bản zh-TW sẵn có. Không sửa frontend/schema/config tenant hoặc ngưỡng .6/.9 trong lần cập nhật này.

## Đánh giá và giới hạn

| Bộ | Ca | Clear precision | Combined recall | False positives | Gate |
|---|---:|---:|---:|---:|---|
| Đài Loan development |120|100%|100%|0|Đạt|
| Đài Loan holdout chưa dùng để sửa prompt |80|100%|100%|0|Đạt|
| Regression đa ngôn ngữ |216|100%|100%|0|Đạt|
| Acceptance đa ngôn ngữ trước đây |120|100%|98,39%|0|Đạt|

Bộ development v7 trước sửa cũng đạt gate; không tuyên bố độ chính xác tăng từ một baseline yếu. V8 tăng độ bao phủ thuật ngữ và guard regex Đài Loan, giảm một số lượt AI cho câu chắc chắn, và bổ sung validation chưa dùng chỉnh sửa. Development/holdout được lưu riêng; holdout khóa SHA256 trước lượt chạy đầu, không đổi prompt theo kết quả của holdout này.

Trong mỗi bộ Đài Loan có một câu gián tiếp nhận nhãn nội bộ cancel thay vì possible_cancel; cả hai vẫn là clarity=review, không bị nâng clear, nên hành vi POS đúng. Acceptance đa ngôn ngữ có một câu Việt bị bỏ sót: “Em nghĩ không nhận được đơn đã đặt này.” score possible=.5977 dưới .6; không hạ ngưỡng để chữa. Recall nhóm Việt trong bộ đó95,65%, nhóm zh-TW100%.

Thêm báo cáo per-locale và gate riêng zh-TW khi có ít nhất10 ca positive, tránh tổng điểm nhiều ngôn ngữ che lỗi thị trường chính. Input không có locale rõ được thống kê und thay vì đoán chắc tiếng Anh. Scripts xác minh SHA256 cả holdout chung và holdout Đài Loan.

36 test backend đạt, có regex phủ định/mâu thuẫn/item/phí hủy, giữ xử lý thủ công khi khách đổi ý, và phản hồi LINE phồn thể. TypeScript và6 test CLI đạt. Frontend không đổi nên không cần deploy Pages/cache-buster mới.

Báo cáo model thật nằm ở taiwan-evaluation-v8.json, taiwan-holdout-v8.json, cancellation-regression-v8.json, cancellation-acceptance-v8.json. Các fixture là tổng hợp do tác giả tạo, không phải dữ liệu thực khách hoặc chứng minh accuracy thực tế. Đây là tiếng Trung dùng trong hội thoại, không phải nhận diện giọng nói hay hỗ trợ đầy đủ mọi phương ngữ Đài Loan.

## Release và QA

Đã deploy backend staging: Worker `23a96663-8152-4cc5-918d-29e074ffc6a0`; chỉ tenant bsc đang bật, production không mở. Kiểm tra live: config/feed HTTP200, ETag304, review=.6 và clear=.9. Migration0067 và POS hiện hữu giữ nguyên. Không push/force-push Git.

QA LINE từ tài khoản có đơn vẫn cần người vận hành: 這單幫我退掉; 臨時有事，這餐可能領不了; 我晚點去拿; 不取消了，照做; 只取消飲料; 退單要收費嗎. Không giả mạo webhook thực khách để thử và không tự resolve đơn thật.
