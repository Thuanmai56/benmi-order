# Yêu cầu hủy đơn qua LINE — triển khai

Bản cải thiện hiện tại và kết quả release: [implementation-handoff](../order-cancellation-improvements/implementation-handoff.md), [verification](../order-cancellation-improvements/verification.md). Các release trước bên dưới là lịch sử.

Flow mới nhận diện yêu cầu hủy **một đơn hoàn chỉnh**, giữ nguyên trạng thái đơn và chuyển POS duyệt. Đơn áp dụng: NEW, ACCEPTED, DONE (sẵn sàng lấy), WAITING_CUSTOMER_CHANGE và WAITING_CUSTOMER_REJECT. Flow trao đổi đã có pending_actions giữ quyền ưu tiên và hành vi hiện có.

## Routing và quyết định

- Mặc định webhook phải có chữ ký LINE hợp lệ và là chat một-một. Theo yêu cầu chủ dự án ngày 2026-10-14, staging dùng `LINE_WEBHOOK_SKIP_SIGNATURE=true`: bỏ kiểm tra chữ ký và cho phép bật detect khi chưa có channel secret. Dev/production không cấu hình cờ này, nên vẫn giữ kiểm tra mặc định. Tenant không bật detect vẫn dùng routing cũ.
- Receipt/gọi thêm/đổi món có cấu trúc được loại khỏi classifier. Sau các guard này, kiểm tra pending_actions rồi xác định đơn bằng tenant_id và LINE user_id.
- Mã UUID, mã phiếu thông thường hoặc `#mã` được đối chiếu với đơn của khách. Mã sai/trùng không được thay bằng một đơn khác. Không nêu mã thì chọn đơn hoạt động mới nhất, chụp lại key ở lúc nhận webhook.
- Regex toàn câu hỗ trợ hủy/phủ định/đổi ý và nhận hộ chắc chắn; câu mâu thuẫn vẫn sang AI. Clef một inference với ba noul: explicit_cancel, possible_cancel, withdraw_cancel. Input có tin hiện tại và tối đa ba tin liên quan trước sự kiện, bỏ tin unsend.
- Explicit score≥.9 clear, ≥.6 review; possible≥.6 chỉ review. Withdrawal với request chờ đánh dấu khách đổi ý, nhân viên vẫn phải xử lý. Tin unrelated không thêm vào request hoặc đổi version; tiếp tục routing cũ. Lưu đủ ba scores, intent, reason, version.
- Clef timeout3s/schema/lỗi → fallback4s. Fallback dùng CANCEL/POSSIBLE_CANCEL/WITHDRAW_CANCEL/OTHER, hủy luôn review. Sau3 lần classifier không dùng được, tạo technical alert riêng và tiếp tục routing thường; không tạo request giữ đơn hoặc lời xác nhận hủy. Request hợp lệ đã có không đổi.


## D1, Queue và thông báo

Migration `0067_cancellation_intent_improvements.sql` bổ sung metadata, marker đổi ý và technical alerts độc lập; `0066_order_cancellation_requests.sql` bổ sung cấu hình tenant, inbox event, request, tin nhắn liên quan, outbox notification, tombstone unsend và feed revision. Queue payload chỉ có kind, tenantId, id; nội dung khách nằm trong D1.

- Inbox chống event trùng; lease D1 chống hai consumer xử lý cùng job. Một request PENDING cho mỗi đơn, tin hủy/đổi ý tiếp theo thêm vào cùng request và tăng version; tin khác giữ nguyên request. Tin cũ không ghi đè mức nhận diện của tin mới.
- Duyệt/từ chối/dismiss sử dụng expected_version và resolution_token trong D1 batch. Chỉ kết quả đầu tiên được chấp nhận. Đồng ý chuyển đơn REJECTED và xóa pending_actions của chính đơn đó.
- Trigger D1 chặn chuyển ACCEPTED/DONE/PICKED_UP/PAID khi có request PENDING. Flow kết thúc đơn khác đóng request SUPERSEDED. Ràng buộc tồn tại ngay cả với POS cũ hoặc ghi stale.
- Phản hồi nhận yêu cầu dùng reply khi còn token; kết quả quán dùng push. Push giữ cùng X-Line-Retry-Key, retry tối đa 6 lượt và trong 23 giờ. Lỗi gửi không rollback kết quả đơn. “Đã gửi tới LINE” chỉ là API đã chấp nhận, không khẳng định khách đã đọc.
- Queue phân loại có retry/DLQ; cron có sẵn chạy mỗi phút phục hồi inbox/outbox chưa xong, kể cả enqueue thất bại. Việc xử lý DB hoặc LINE vẫn được lease bảo vệ.
- Unsend xóa nội dung; tombstone ngăn webhook đến muộn làm hiện lại tin đã thu hồi. Không đảo ngược quyết định hủy đã commit.
- Xóa lời nhắn trong request sau 30 ngày kể từ khi đóng. Nội dung inbox event đã xử lý xóa sau 24 giờ; giữ ID và metadata quyết định. Console không ghi nguyên văn tin nhắn trong flow mới.

## POS và API

POS polling request riêng mỗi 1,5 giây, ETag dùng revision của feed. Cảnh báo hiện mọi tab; badge và nút trên thẻ đơn mở bảng chi tiết. Cả cảnh báo chưa chắc đều chặn thao tác tiến đơn. Nút xử lý gồm đồng ý hủy, từ chối (bắt buộc lý do), không phải yêu cầu hủy. Modal không tự bật; âm ngắn chỉ khi request mới xuất hiện. Reload đọc lại trạng thái D1.

UI hỗ trợ vi/zh-TW, touch target 48px, escape/focus trap, hiển thị lời nhắn bằng escaping và bảo toàn lý do đang nhập khi feed cập nhật. Setting nằm trong “Thông tin cửa hàng”; ngưỡng chỉnh qua config API. Chưa bổ sung PIN/session xác thực POS theo quyết định của chủ dự án. Tenant scoping hiện tại không phải xác thực quyền người thao tác.

| API | Nội dung |
| --- | --- |
| GET /api/order-cancellation-requests | Request đang mở và request cập nhật trong 24 giờ; revision/ETag, lời nhắn, trạng thái gửi |
| POST /api/order-cancellation-requests/:id/resolve | `{decision: "APPROVED" / "DECLINED" / "DISMISSED", expected_version, reason}` |
| POST /api/order-cancellation-requests/:id/retry-notification | Gửi lại notification failed trong cửa sổ retry |
| POST /api/order-cancellation-alerts/:id/acknowledge | Xác nhận đã xem technical alert của tenant; không giữ đơn |
| POST /api/config | `{cancellationDetection: {enabled, review, clear}}`; invalidate tenant/bootstrap cache |

V1 feed ưu tiên pending, giới hạn 300 request/quán. Không có tự hoàn tiền hoặc xử lý bỏ riêng món. Request chưa được duyệt không tự hết hạn; cần nhân viên xử lý hoặc flow kết thúc đơn đóng lại.

## Release

1. Node 24 LTS. Nhánh triển khai: staging bắt đầu từ main `afcb161`; staging cũ giữ ở `backup/staging-before-ai-cancel-20261014`. Thay đổi LIFF chưa commit trên dev giữ trong stash `dev-wip-before-ai-cancel-20261014`.
2. Apply migration trước backend. `npm run db:migrations:apply:dev` / `npm run db:migrations:apply:staging` từ backend khi được yêu cầu release.
3. Tạo queue và DLQ cho từng môi trường trước deploy nếu CLI/account chưa tự provision: `order-cancellation-dev`, `order-cancellation-staging`, `order-cancellation-production` và hậu tố `-dlq`. Kiểm tra cú pháp bằng `cf cli search` / `cf ... --help`; không dùng Wrangler deploy.
4. `npm run check`, `npm run test:cli`, `npm run build:staging` trong backend; `npm test` và các test bổ sung phía dưới tại root.
5. Deploy backend và frontend, kiểm tra cache-buster. Global engine true trên dev/staging, false production. Tenant mặc định disabled trên mọi môi trường; bật qua settings/config sau khi xác minh channel secret và chạy QA LINE thật.
6. Khi release production, apply migration/queue trước, bật global engine và tenant được chọn sau. Kill switch `CANCELLATION_ENGINE_ENABLED=false` ngừng nhận diện mới; request đang mở vẫn được POS xử lý và outbox vẫn gửi.

### Staging release — 2026-10-14

- Đã apply 0064 (customer order domain), 0065 (LINE receipts) và 0066 (cancellation) vào blab-db-test, ghi ledger d1_migrations. Không chạy lại các seed migration cũ.
- Đã tạo queue order-cancellation-staging và DLQ; Worker platform-worker-staging có AI binding, queue producer/consumer và cron mỗi phút. Worker version hiện tại: `93c1cf27-d72d-4321-a379-dda773362028`.
- Pages deployment 86f7fafa-6d79-4cff-8a75-c4d8ac18c192 đã success, alias https://staging.benmi-order.pages.dev, uses_functions=true. Upload qua Pages API vì cf pages deploy chưa hỗ trợ legacy Pages; Pages Functions được compile bằng bundler đã có trong dự án.
- POS live BSC: https://staging.benmi-order.pages.dev/orders.html?tenant_id=bsc&env=staging. Browser smoke test: title 干城鹹水雞 POS, không có pageerror, script cancellation/cache-buster mới được load; config và request feed HTTP 200.
- Bot LINE staging: Blab staging (@593jyexl); webhook đang active ở https://platform-worker-staging.thuanmnc.workers.dev/webhook/bsc.
- **Đã bật detect riêng BSC** qua config API: enabled=true, review=0.6, clear=0.9. D1 xác nhận tenant duy nhất enabled là bsc. Theo yêu cầu tạm bỏ xác thực, staging dùng `LINE_WEBHOOK_SKIP_SIGNATURE=true`; chưa cần Channel Secret. Để khôi phục kiểm tra, cấu hình secret đúng kênh cho BSC, đổi cờ thành false hoặc gỡ cờ rồi deploy staging.
- Post-deploy: config/feed HTTP 200, enabled=true và available=true cho BSC; unsigned webhook với events=[] trả HTTP 200. Test flow 21 ca và test CLI 6 ca đạt, bao gồm bypass khi thiếu secret/chữ ký sai, kiểm tra sở hữu đơn và kiểm tra mặc định khi không bật bypass.
- Deploy trực tiếp Cloudflare. Chưa push hoặc force-push origin/staging (nhánh remote có lịch sử khác baseline main).

## Verification

- `npm run test:order-cancellations`: SQLite/D1 fixture cho regex, schema output, ownership, đơn kết thúc, chọn nhiều đơn, idempotency, version conflict, trạng thái bị chặn, signature, outage/retry, unsend đến sớm/trong lúc AI chạy và negotiation cũ.
- `npm run test:line-order-receipts`: regression receipt/create/append/modify và retry LINE.
- `npm run test:pos-cancellations`: cần package Playwright và Chromium; tùy chọn `PLAYWRIGHT_CHROMIUM_EXECUTABLE` chọn Chrome có sẵn. Test 1024×768, 768×1024, 390×844; mock API, chặn tiến đơn, giữ lý do, conflict, i18n, overflow và runtime errors.
- `npm run eval:cancellations`: cần cf auth đã đăng nhập; 216 câu tổng hợp có nhãn (200 câu baseline và 16 ca gián tiếp/đổi cách nhận đơn), không dùng dữ liệu khách. Gọi model thật; report mặc định `/tmp/benmi-cancellation-eval.json`. Gate precision nhóm rõ ràng ≥ 98%, recall tổng ≥ 95%, không false positive ở các ca phủ định/bỏ món gắn nhãn hardNegative.
- Corpus tổng hợp là gate kỹ thuật, chưa thay thế bộ tin nhắn thực tế đã được người vận hành gắn nhãn. SLA webhook→POS p95 ≤ 5 giây cần đo trên staging sau deploy, không suy ra từ test mock hoặc latency CLI.

Kết quả model thật ngày 2026-10-14 sau sửa câu gián tiếp: 216 câu, 194 lượt Clef và 22 lượt regex; clear precision 100%, combined recall 97,17%, hard-negative false positives 0. Câu “Tôi nghĩ tôi không thể lấy món” được đưa vào review với score 0,8039 trong evaluation. Provenance và hash corpus lưu trong `evaluation-summary.json`.

### Sửa bỏ sót câu không thể lấy món — 2026-10-14

D1 xác nhận tin đầu của đơn K1014-T001 đã tới webhook, nhưng Clef cũ chấm 0,4547 (dưới review=0,6) và event bị ignored; “Hủy” chấm 0,8897 và tạo review. Prompt mới phân biệt không nhận toàn bộ đơn với vẫn nhận qua bạn/lấy muộn/giao hàng. Ngưỡng tenant không thay đổi. Regression test flow 23 ca đạt.

Đã deploy bản sửa lên staging (Worker 93c1cf27-d72d-4321-a379-dda773362028). Đã xử lý lại đúng event bị bỏ sót khi đơn K1014-T001 vẫn NEW và request vẫn PENDING. Event đã done, Clef score 0,8039 / review; feed POS version 2 hiển thị đủ hai tin theo thứ tự thời gian: “Tôi nghĩ tôi không thể lấy món”, “Hủy”.
