# Kết quả triển khai — 2026-10-14

Cập nhật tiếp theo ưu tiên tiếng Trung Đài Loan, Worker `23a96663-8152-4cc5-918d-29e074ffc6a0`: xem [taiwan-support.md](taiwan-support.md). Kết quả v7 bên dưới giữ làm lịch sử.

## Trạng thái release

- Nhánh làm việc: staging; bảo toàn các thay đổi feature đã có, chưa push hoặc force-push remote.
- Migration0067 đã apply vào blab-db-test và ghi d1_migrations. Không sửa0066; không tự đóng request cũ.
- Worker cuối: `2e5cf2e9-16cd-4da6-8bf1-e6ce9a28aa34`, platform-worker-staging. AI binding, queue producer/consumer và cron mỗi phút đã deploy thành công bằng `npm run deploy:staging` / cf.
- Pages: `b0a5f3e1-a6e0-4399-a8c9-a82b656036d7`, stage deploy success, uses_functions=true. Alias: https://staging.benmi-order.pages.dev.
- POS: https://staging.benmi-order.pages.dev/orders.html?tenant_id=bsc&env=staging. Cache-buster20261014_cancel_intent_v3.
- Tenant duy nhất bật detect: bsc. Ngưỡng review=.6, clear=.9. Signature bypass staging giữ theo yêu cầu trước; production không đổi.
- API config/feed200, fields customer_withdrew/technicalAlerts có mặt; không có alert kỹ thuật thật phát sinh trong kiểm tra. Acknowledge ID không tồn tại404.
- Phát hiện Cloudflare nén response thành weak ETag `W/"cancellation-5"`: sửa If-None-Match dùng weak comparison, hỗ trợ danh sách và `*`. API live đã trả304 khi revision không đổi.

## Kiểm thử

- 34 test backend SQLite/D1 đạt: ownership/status, regex, schema, retry/outage, request hold, legacy priority, CAS, unsend, thứ tự event cùng timestamp, khách đổi ý, tin unrelated không đổi request, technical alert/tenant ack, fallback và weak ETag.
- Test POS Playwright đạt trên1024×768,768×1024,390×844: touch48px, layout/overflow, draft, conflict, hai ngôn ngữ, marker đổi ý và ack alert không có nút duyệt hủy.
- npm test toàn bộ regression nền đạt; test LINE receipts14 ca đạt; CLI6 ca đạt; frontend static check và backend TypeScript đạt; git diff --check sạch.
- Smoke trên POS staging load cache-buster mới, không pageerror, đọc request hiện hữu. Chỉ đọc UI/API, không resolve đơn hoặc gửi tin khách thật để thử.

## Đánh giá Clef thật

Classifier `clef-cancellation-v7`, prompt SHA256 `79e147b830500a618da9878b17a46b46a125a2d0880bffd1dba39e7341d6cd98`.

| Bộ | Số ca | Clef calls | Clear precision | Combined recall | False positives |
|---|---:|---:|---:|---:|---:|
| Regression |216|192|100%|100%|0|
| Acceptance thế hệ4 |120|115|100%|100%|0|

Ba câu từng bỏ sót đều detect; câu screenshot chỉ review. Pending scenarios và indirect-clear checks không lỗi. Scores/intent/version/reason và hash pipeline lưu trong cancellation-regression-final.json, cancellation-acceptance-final.json; evaluation-summary.json giữ lịch sử các lượt fail.

Các số trên áp dụng cho dữ liệu tổng hợp, không phải accuracy tin khách thực tế. Holdout ban đầu thất bại đã được giữ nguyên nhãn thành development audits. Thế hệ4 chưa được xem khi prompt v7 chốt, nhưng sau lượt đầu có một false positive nhận hộ đã được sửa bằng regex toàn câu; báo cáo cuối vì vậy là acceptance regression, không phải thống kê độc lập hoàn toàn. Chưa giảm ngưỡng hoặc gate. Một corpus mới do người vận hành gắn nhãn nên được giữ ngoài quá trình chỉnh sửa trước rollout rộng.

## Giới hạn và kiểm tra LINE còn lại

Cần người vận hành gửi từ tài khoản thực khách có đơn: hủy trực tiếp; không thể nhận món; bạn nhận hộ; hỏi tiến độ khi có request; rút lại request; rồi kiểm tra POS. Không giả mạo event của khách thật hoặc tự duyệt request hiện hữu. Chưa đo SLA webhook→POS p95 bằng traffic thực tế. Các kiểm tra ownership/concurrency/outage thực hiện bằng fixture, model inference là thật.

## Vận hành và rollback

Tắt cancellationDetection.enabled cho tenant để ngừng nhận diện mới; giữ request đang chờ và notifications để nhân viên xử lý. Không rollback Worker về bản giữ đơn khi AI outage và không xóa schema/dữ liệu. Technical alert độc lập không giữ đơn, nhân viên xem LINE rồi bấm Đã xem. Request unavailable cũ phải xử lý thủ công; staging hiện không có request loại này đang chờ.

Pages CLI hiện chưa upload legacy Pages: đã dùng Pages API, upload4 tài nguyên đổi trong34 assets và tái sử dụng Functions bundle đã deploy sau kiểm tra middleware không đổi. Không dùng Wrangler deploy cho backend. cf build có diagnostic Docker daemon không chạy, nhưng build/upload/deploy Worker đều hoàn tất; không có thay đổi container.
