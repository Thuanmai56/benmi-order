# PDP: Kiến Trúc Ứng Dụng Android Hybrid POS & Hệ Thống In Nhiệt ESC/POS (Tự Động & Thủ Công)

---

## 1. Tóm Tắt Điều Hành & Mục Tiêu (Executive Summary & Objectives)

### A. Bối Cảnh & Vấn Đề Hiện Tại (Problem Statement)
Nhân viên tại quầy hiện đang vận hành bảng quản lý đơn hàng POS (`orders.html`) qua trình duyệt web trên máy tính bảng (Tablet/iPad) hoặc máy tính bàn. Mặc dù giao diện web đáp ứng tốt việc hiển thị và nhận đơn theo thời gian thực, cơ chế in hóa đơn vật lý qua trình duyệt web tiêu chuẩn gặp phải các rào cản vận hành nghiêm trọng:
1. **Hộp thoại in gián đoạn (Browser Print Dialog)**: Lệnh in tiêu chuẩn của trình duyệt (`window.print()`) luôn mở popup xác nhận của hệ điều hành, yêu cầu nhân viên phải bấm thêm 1-2 bước thủ công cho mỗi đơn hàng, làm chậm tốc độ xử lý trong giờ cao điểm của quán.
2. **Hạn chế giao tiếp phần cứng trên Web**: Trình duyệt di động bị giới hạn bảo mật Sandbox, không thể mở trực tiếp luồng kết nối **TCP Socket (Cổng 9100)** tới các máy in nhiệt thương mại trong mạng nội bộ (LAN / Wi-Fi).
3. **Lỗi hiển thị ký tự (Encoding & Font Corruption)**: Các dòng máy in nhiệt ESC/POS thông dụng thường không tích hợp sẵn ROM ký tự tiếng Trung phồn thể (`zh-TW`) hoặc tiếng Việt có dấu (`vi`), dẫn đến tình trạng in ra ký tự rác (garbled `???`) nếu chỉ gửi văn bản thuần.

### B. Mục Tiêu Trong Phạm Vi (Goals / In-Scope)
- **Hỗ Trợ 2 Chế Độ In Linh Hoạt (Dual Trigger Modes)**:
  1. **Chế độ Tự Động (Auto-Print on New Order)**: Cứ có đơn hàng mới xuất hiện trên POS (khi polling / SSE phát hiện đơn `NEW`), hệ thống **tự động gửi lệnh in nhiệt ngay lập tức** (in Quầy và/hoặc in Bếp) mà không cần nhân viên chạm vào màn hình. Tích hợp bộ nhớ chống in trùng lặp (`Deduplication Set`) để đảm bảo mỗi đơn chỉ in đúng 1 lần duy nhất.
  2. **Chế độ Thủ Công (Manual / On-Demand Print)**: Hiển thị nút **In phiếu / In lại (補印 / 列印)** với biểu tượng máy in SVG trên từng thẻ đơn hàng (ở cả tab Đang xử lý, tab Lịch sử và Popup chi tiết đơn). Nhân viên có thể bấm chọn in lại đơn bất kỳ lúc nào.
- **In Không Tiếng Động (Zero-Touch Silent Printing)**: Truyền dữ liệu trực tiếp qua kết nối mạng nội bộ LAN/Wi-Fi TCP Socket (`[PRINTER_IP]:9100`), bỏ qua hoàn toàn mọi hộp thoại xác nhận của Android với độ trễ truyền tải `< 200ms`.
- **Hỗ Trợ 2 Trạm In Độc Lập (Dual-Station Routing)**:
  - **Máy in Quầy (Cashier Printer)**: In hóa đơn thanh toán đầy đủ cho khách (kèm giá tiền, chi tiết tùy biến, tổng tiền, phương thức thanh toán và mã QR).
  - **Máy in Bếp (Kitchen Printer)**: In phiếu chế biến cho bếp font chữ lớn (kèm số bàn/hình thức ăn, danh sách món, lưu ý gia vị/topping, **không hiện giá tiền**).
- **Bộ Xử Lý Đồ Họa Hybrid (Hybrid Rendering Engine)**:
  - **Chế độ Raster Bitmap (`GS v 0`)**: Chuyển đổi giao diện hóa đơn HTML/Canvas thành ảnh Bitmap đơn sắc 1-bit trong Native Java, đảm bảo **100% hiển thị sắc nét tiếng Trung phồn thể, tiếng Việt có dấu, logo thương hiệu và mã QR** trên mọi thương hiệu máy in (Epson, Xprinter, Rongta, Star, Sunmi).
  - **Chế độ Raw Text**: Truyền chuỗi byte tốc độ cao mã hóa `Big5` / `UTF-8` kèm các mã lệnh định dạng ESC/POS tiêu chuẩn.
- **Cô Lập Phạm Vi Tuyệt Đối (Strict Scope Separation)**: Đóng gói duy nhất mã nguồn giao diện Web Frontend vào thư mục con `apps/android-pos/`. Giữ nguyên 100% toàn bộ hệ thống Cloudflare Worker backend (`benmi-worker-official/`) chạy độc lập trên Cloudflare Edge.

### C. Ngoài Phạm Vi (Non-Goals / Out-of-Scope)
- Không can thiệp, chỉnh sửa cấu trúc Worker, cơ sở dữ liệu D1 hay Cloudflare KV backend.
- Không sử dụng giải pháp in qua đám mây trung gian (Cloud Print / MQTT broker). Toàn bộ luồng in diễn ra trực tiếp giữa máy tính bảng và máy in trong cùng mạng Wi-Fi/LAN của quán.

---

## 2. Bối Cảnh & Kiến Trúc Hệ Thống (System Architecture)

### Sơ Đồ Khối Tổng Thể (System Topology)

```mermaid
graph TD
    subgraph Cloudflare Edge Ecosystem [Độc Lập Trên Cloud - Giữ Nguyên 100%]
        Worker[Cloudflare Worker: benmi-worker-official]
        KV[(Workers KV: Cache & State)]
        D1[(Cloudflare D1: SQLite Database)]
        Worker --> KV
        Worker --> D1
    end

    subgraph Store Local Area Network [Mạng Nội Bộ Wi-Fi / LAN Tại Quán]
        subgraph Android Tablet POS [apps/android-pos]
            WebView[Capacitor Android WebView]
            PosUI[orders.html / js/orders-*.js]
            PrintBridge[TypeScript / JS Print Service]
            NativePlugin[ThermalPrinterPlugin.java]
            
            PosUI -->|1. Polling / SSE Cập Nhật Đơn Mới| Worker
            PosUI -->|2a. Tự Động In Khi Có Đơn Mới (Auto)| PrintBridge
            PosUI -->|2b. Bấm Nút In Thủ Công Trên Thẻ Đơn (Manual)| PrintBridge
            PrintBridge -->|3. Gọi Bridge Capacitor RPC| NativePlugin
        end

        subgraph Local Thermal Hardware [Cổng TCP Socket 9100]
            CashierPrinter[Máy In Quầy: 192.168.1.100:9100<br>Hóa Đơn Khách + Giá Tiền + Mã QR]
            KitchenPrinter[Máy In Bếp: 192.168.1.101:9100<br>Phiếu Làm Món + Topping + Chữ Lớn]
        end

        NativePlugin -->|Gửi Raw TCP Byte Stream| CashierPrinter
        NativePlugin -->|Gửi Raw TCP Byte Stream| KitchenPrinter
    end
```

---

## 3. Thiết Kế Chi Tiết Các Thành Phần (Detailed Component Design)

### A. Cấu Trúc Thư Mục Dự Án (Project Structure)

Ứng dụng Android được tổ chức trong thư mục con độc lập `apps/android-pos/` để không làm xáo trộn cấu trúc repository gốc:

```
benmi-order/
├── index.html                   # Menu đặt món khách hàng (Cloudflare Pages)
├── orders.html                  # Giao diện POS quản lý đơn hàng
├── css/ & js/                   # Toàn bộ mã nguồn Web Frontend
├── benmi-worker-official/       # Backend Cloudflare Worker (Giữ nguyên)
└── apps/
    └── android-pos/             # Dự án con Android Hybrid App (Capacitor)
        ├── package.json         # Khai báo thư viện @capacitor/core, @capacitor/android
        ├── capacitor.config.ts  # Cấu hình Capacitor (appId: com.benmi.pos)
        ├── build.sh             # Script đồng bộ web assets từ root vào dist/
        ├── src/                 # Print service & bridge
        │   └── services/
        │       ├── printerService.ts
        │       └── escposBuilder.ts
        └── android/             # Mã nguồn Native Android Studio
            ├── app/src/main/
            │   ├── AndroidManifest.xml
            │   └── java/com/benmi/pos/
            │       ├── MainActivity.java
            │       ├── ThermalPrinterPlugin.java
            │       └── EscPosBitmapConverter.java
```

---

## 4. Hai Chế Độ In (Auto-Print vs Manual Print)

### A. Chế Độ Tự Động In (Automatic Mode)
1. **Cơ Chế Kích Hoạt**:
   - Khi engine polling (`pollOrders()` trong `js/orders-core.js`) hoặc SSE nhận diện một đơn hàng mới (`status === 'NEW'`), hệ thống kiểm tra cấu hình `autoPrintNewOrders`:
     ```javascript
     if (printerSettings.autoPrintNewOrders && !isOrderAlreadyPrinted(order.key)) {
       triggerAutoPrint(order);
     }
     ```
2. **Bộ Nhớ Chống In Trùng (Deduplication Set)**:
   - Danh sách các mã đơn đã in được lưu trong `localStorage` dưới khóa `pos_printed_orders_${tenantId}` (giới hạn 500 đơn gần nhất).
   - Khi đơn hàng mới được gửi lệnh in thành công, mã đơn được thêm vào Set.
   - Khi polling chạy lại mỗi 5s hoặc khi nhân viên F5 tải lại trang, các đơn đã có trong Set sẽ **không bị in lại tự động**.

### B. Chế Độ In Thủ Công / In Lại (Manual / On-Demand Mode)
1. **Nút Bấm In Trên Thẻ Đơn Hàng**:
   - Trên mỗi thẻ đơn hàng (cả thẻ đơn Mới, Đang làm, Hoàn thành, và Lịch sử), bố trí nút **In (補印 / 列印)** kèm icon máy in SVG thanh lịch:
     ```html
     <button class="btn-print" onclick="PrinterService.printManual('${order.key}')" title="In phiếu">
       <svg class="icon-printer" ...></svg>
       <span>In phiếu</span>
     </button>
     ```
2. **Menu Tùy Chọn Khi In Thủ Công**:
   - Khi nhân viên bấm nút In, hệ thống cho phép:
     - In nhanh theo cấu hình mặc định (Quầy + Bếp).
     - Hoặc mở menu thả xuống: `[In Phiếu Bếp]`, `[In Hóa Đơn Quầy]`, `[In Cả Hai]`.

---

## 5. Native Android Plugin (`ThermalPrinterPlugin.java`)

Plugin Java tùy chỉnh chịu trách nhiệm mở kết nối TCP Socket trực tiếp với máy in trong mạng nội bộ, thiết lập thời gian chờ (Timeout) và xử lý lỗi ngắt kết nối:

```java
package com.benmi.pos;

import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.util.Base64;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.net.Socket;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

@CapacitorPlugin(name = "ThermalPrinter")
public class ThermalPrinterPlugin extends Plugin {
    private final ExecutorService executor = Executors.newFixedThreadPool(2);

    @PluginMethod
    public void printTcp(PluginCall call) {
        String ip = call.getString("ip");
        Integer port = call.getInt("port", 9100);
        String base64Data = call.getString("data");
        Integer timeoutMs = call.getInt("timeoutMs", 4000);

        if (ip == null || base64Data == null) {
            call.reject("Địa chỉ IP và dữ liệu in base64 là bắt buộc");
            return;
        }

        executor.execute(() -> {
            Socket socket = null;
            try {
                byte[] rawBytes = Base64.decode(base64Data, Base64.DEFAULT);
                socket = new Socket();
                socket.connect(new InetSocketAddress(ip, port), timeoutMs);
                socket.setSoTimeout(timeoutMs);

                OutputStream outputStream = socket.getOutputStream();
                outputStream.write(rawBytes);
                outputStream.flush();

                JSObject ret = new JSObject();
                ret.put("success", true);
                ret.put("ip", ip);
                call.resolve(ret);
            } catch (Exception e) {
                call.reject("Lỗi in nhiệt tới " + ip + ":" + port + " - " + e.getMessage(), e);
            } finally {
                if (socket != null) {
                    try { socket.close(); } catch (Exception ignored) {}
                }
            }
        });
    }

    @PluginMethod
    public void printBitmap(PluginCall call) {
        String ip = call.getString("ip");
        Integer port = call.getInt("port", 9100);
        String base64Image = call.getString("base64Image");
        Integer paperWidth = call.getInt("paperWidth", 80);
        Integer timeoutMs = call.getInt("timeoutMs", 5000);

        if (ip == null || base64Image == null) {
            call.reject("Địa chỉ IP và chuỗi ảnh base64 là bắt buộc");
            return;
        }

        executor.execute(() -> {
            Socket socket = null;
            try {
                byte[] decodedString = Base64.decode(base64Image, Base64.DEFAULT);
                Bitmap decodedBitmap = BitmapFactory.decodeByteArray(decodedString, 0, decodedString.length);
                byte[] escPosBytes = EscPosBitmapConverter.convertBitmapToEscPosRaster(decodedBitmap, paperWidth);

                socket = new Socket();
                socket.connect(new InetSocketAddress(ip, port), timeoutMs);
                socket.setSoTimeout(timeoutMs);

                OutputStream outputStream = socket.getOutputStream();
                outputStream.write(escPosBytes);
                outputStream.flush();

                JSObject ret = new JSObject();
                ret.put("success", true);
                call.resolve(ret);
            } catch (Exception e) {
                call.reject("Lỗi in bitmap tới " + ip + ": " + e.getMessage(), e);
            } finally {
                if (socket != null) {
                    try { socket.close(); } catch (Exception ignored) {}
                }
            }
        });
    }
}
```

---

## 6. Bộ Chuyển Đổi Raster Bitmap (`EscPosBitmapConverter.java`)

```java
package com.benmi.pos;

import android.graphics.Bitmap;
import android.graphics.Color;
import java.io.ByteArrayOutputStream;

public class EscPosBitmapConverter {
    public static byte[] convertBitmapToEscPosRaster(Bitmap bitmap, int paperWidthMm) {
        int targetWidth = (paperWidthMm == 58) ? 384 : 576;
        float scale = (float) targetWidth / bitmap.getWidth();
        int targetHeight = Math.round(bitmap.getHeight() * scale);

        Bitmap scaledBitmap = Bitmap.createScaledBitmap(bitmap, targetWidth, targetHeight, true);
        int widthBytes = (targetWidth + 7) / 8;
        int heightPixels = targetHeight;

        ByteArrayOutputStream stream = new ByteArrayOutputStream();

        // 1. Khởi tạo máy in: ESC @
        stream.write(0x1B);
        stream.write(0x40);

        // 2. Lệnh in Raster Bitmap: GS v 0 m xL xH yL yH
        stream.write(0x1D);
        stream.write(0x76);
        stream.write(0x30);
        stream.write(0x00); // Mode 0 (Normal)

        stream.write(widthBytes & 0xFF);
        stream.write((widthBytes >> 8) & 0xFF);
        stream.write(heightPixels & 0xFF);
        stream.write((heightPixels >> 8) & 0xFF);

        // 3. Chuyển đổi pixel sang 1-bit byte stream
        for (int y = 0; y < targetHeight; y++) {
            for (int xByte = 0; xByte < widthBytes; xByte++) {
                byte b = 0;
                for (int bit = 0; bit < 8; bit++) {
                    int x = xByte * 8 + bit;
                    if (x < targetWidth) {
                        int pixel = scaledBitmap.getPixel(x, y);
                        int r = Color.red(pixel);
                        int g = Color.green(pixel);
                        int bVal = Color.blue(pixel);
                        int luminance = (int) (0.299 * r + 0.587 * g + 0.114 * bVal);
                        if (luminance < 160) {
                            b |= (byte) (1 << (7 - bit));
                        }
                    }
                }
                stream.write(b);
            }
        }

        // 4. Đẩy giấy và cắt giấy: GS V 0
        stream.write(0x1B);
        stream.write(0x64);
        stream.write(0x04);
        stream.write(0x1D);
        stream.write(0x56);
        stream.write(0x00);

        return stream.toByteArray();
    }
}
```

---

## 7. Giao Diện Cài Đặt POS Settings (`orders-settings.js` / `orders.html`)

Trong tab Cài đặt của POS Dashboard, bổ sung khối cấu hình chuyên sâu:

```
┌─────────────────────────────────────────────────────────────┐
│ 🖨️ 印表機與列印設定 (Cài Đặt Máy In & Chế Độ In)            │
├─────────────────────────────────────────────────────────────┤
│ ❖ 列印模式 (Chế độ in):                                      │
│   [✓] 新訂單自動列印 (Tự động in khi có đơn mới)            │
│   [✓] 允許卡片手動補印 (Cho phép nút in thủ công trên thẻ)  │
│                                                             │
│ ❖ 櫃檯印表機 - 出客人明細聯 (Máy in Quầy - Hóa đơn khách):   │
│   [✓] 啟用 (Bật)                                             │
│   IP: [ 192.168.1.100 ]   Port: [ 9100 ]   紙張: (•) 80mm   │
│   [ 測試列印 - In Thử Nghiệm ]                               │
│                                                             │
│ ❖ 廚房印表機 - 出餐製作聯 (Máy in Bếp - Phiếu làm món):     │
│   [✓] 啟用 (Bật)                                             │
│   IP: [ 192.168.1.101 ]   Port: [ 9100 ]   紙張: (•) 80mm   │
│   [ 測試列印 - In Thử Nghiệm ]                               │
└─────────────────────────────────────────────────────────────┘
```

---

## 8. Kế Hoạch Triển Khai & Kiểm Thử

1. **Giai đoạn 1**: Khởi tạo thư mục `apps/android-pos/` và cài đặt `@capacitor/core`, `@capacitor/android`, `@capacitor/cli`.
2. **Giai đoạn 2**: Cài đặt plugin Java `ThermalPrinterPlugin.java` và `EscPosBitmapConverter.java`.
3. **Giai đoạn 3**: Viết `js/printer-service.js` với 2 hàm chính:
   - `PrinterService.handleNewIncomingOrder(order)`: Xử lý tự động in đơn mới kèm deduplication.
   - `PrinterService.printManual(orderKey, station)`: Xử lý in thủ công theo yêu cầu của nhân viên.
4. **Giai đoạn 4**: Tích hợp UI Cài đặt máy in vào `orders.html` và nút in trên các thẻ đơn hàng của `orders-live.js` và `orders-history.js`.
