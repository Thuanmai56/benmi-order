# Principal Design Proposal (PDP): TSPL Thermal Label & Sticker Printer Integration (Aimo D520BT, Phomemo, Xprinter) Alongside ESC/POS

- **Status**: APPROVED (via `/grill-me` alignment)
- **Author**: Antigravity Principal Engineer
- **Target Subsystems**: `apps/android-pos/`, `js/printer-service.js`, `orders.html`, `js/orders-settings.js`, `js/orders-i18n.js`
- **Target Hardware**: Aimo D520BT, Xprinter Label (XP-365B, XP-420B), Phomemo, Munbyn, HPRT, Rongta Label

---

## 1. Executive Summary & Problem Statement

### A. Problem
The Benmi POS platform currently generates **ESC/POS** monochrome raster streams (`GS v 0`) designed for continuous thermal receipt paper (58mm/80mm) with auto-cutters. 

However, modern F&B operations and stores frequently utilize **Thermal Label / Sticker Printers** (such as the **Aimo D520BT**, Xprinter XP-365B, and Phomemo series) for:
1. **Delivery / Takeaway Bag Stickers** (dán lên túi giấy mang đi / hộp bánh).
2. **Drink & Cup Labels** (dán lên ly trà sữa, cà phê với chi tiết đường, đá, topping và số thứ tự món `1/3`, `2/3`).

These label printers operate on **TSPL (Taiwan Semiconductor Printing Language)** rather than ESC/POS. When an ESC/POS byte stream is sent to a TSPL printer like the Aimo D520BT over Bluetooth or Network, the printer ignores the commands and produces zero output.

### B. Solution
Introduce a robust, modular **Dual-Engine Thermal Printing Architecture**:
1. **Protocol Dispatcher**: Each station (Cashier / Kitchen) can independently choose **`ESC/POS (Hóa đơn / Receipt)`** or **`TSPL (Tem nhãn / Label)`**.
2. **Native TSPL Binary Rasterizer (`TsplBitmapConverter.java`)**: Encapsulates 1-bit monochrome bitmaps into standard TSPL commands (`SIZE`, `GAP`, `DIRECTION`, `CLS`, `BITMAP`, `PRINT 1,1`).
3. **Dual Print Layout Modes for TSPL**:
   - **Order Summary Label**: Complete order summary formatted for 76x130mm or 100x150mm (4x6") bag stickers.
   - **Individual Item / Cup Stickers**: Formatted for 50x30mm cup stickers with item name, quantity, table number, options/modifiers, and item index (`1/3`, `2/3`, `3/3`).
4. **Physical Dimensions & Presets**: Configurable label sizes with automatic 203 DPI dot calculations (`8 dots/mm`).

---

## 2. System Architecture & Component Design

```mermaid
graph TD
    Order[POS Order / Print Trigger] --> Dispatcher[js/printer-service.js Dispatcher]
    Dispatcher --> CheckProtocol{Station Protocol}
    
    CheckProtocol -->|ESC/POS| CanvasReceipt[Canvas 2D: Receipt Painter<br/>576px / 384px continuous]
    CheckProtocol -->|TSPL (Summary)| CanvasLabel[Canvas 2D: Order Label Painter<br/>100x150mm / 76x130mm]
    CheckProtocol -->|TSPL (Item Stickers)| CanvasCup[Canvas 2D: Cup / Item Sticker Painter<br/>50x30mm per item]
    
    CanvasReceipt --> NativeBridge[Capacitor Native Bridge: ThermalPrinterPlugin]
    CanvasLabel --> NativeBridge
    CanvasCup --> NativeBridge
    
    NativeBridge --> NativeCheck{Protocol in Java}
    NativeCheck -->|ESC/POS| EscConverter[EscPosBitmapConverter.java<br/>ESC @, GS v 0, GS V 0]
    NativeCheck -->|TSPL| TsplConverter[TsplBitmapConverter.java<br/>SIZE, GAP, CLS, BITMAP, PRINT 1,1]
    
    EscConverter --> Transport{Transport Interface}
    TsplConverter --> Transport
    
    Transport -->|Bluetooth SPP| BTSocket[Bluetooth RFCOMM Socket<br/>UUID: ...00805F9B34FB]
    Transport -->|Network TCP| TCPSocket[TCP Socket: Port 9100]
    
    BTSocket --> RealPrinter[Aimo D520BT / Xprinter / Sunmi]
    TCPSocket --> RealPrinter
```

---

## 3. TSPL Binary Command Specification

The TSPL standard utilizes ASCII parameters followed by binary monochrome bitmap streams.

### A. TSPL Header & Configuration
```tspl
SIZE {width_mm} mm, {height_mm} mm\r\n
GAP 2 mm, 0 mm\r\n
DIRECTION 1\r\n
CLS\r\n
BITMAP {x}, {y}, {width_bytes}, {height_dots}, 0, {binary_bytes}\r\n
PRINT 1, 1\r\n
```

### B. Bitmap Polarity & Inversion in TSPL
In TSPL `BITMAP x, y, width_bytes, height_dots, mode, bitmap_data`:
- Mode `0` (OVERWRITE): Bit `0` = White (No heat), Bit `1` = Black (Thermal heat applied).
- `width_bytes` = `(width_dots + 7) / 8`.
- Total binary bytes = `width_bytes * height_dots`.

---

## 4. Settings Data Schema

Station settings in `localStorage.pos_printer_settings_{tenantId}`:

```typescript
interface PrinterStationConfig {
  enabled: boolean;
  interface_type: 'network' | 'bluetooth'; // Network TCP vs Bluetooth SPP
  protocol: 'esc_pos' | 'tspl';           // ESC/POS vs TSPL
  tspl_label_size: '100x150' | '76x130' | '50x30' | 'custom';
  tspl_custom_width_mm?: number;
  tspl_custom_height_mm?: number;
  tspl_mode: 'summary' | 'item_stickers'; // Full order summary vs 1 sticker per dish/cup
  ip?: string;
  port?: number;
  mac_address?: string;
  device_name?: string;
  paperWidth?: number; // 80 or 58 for ESC/POS
  autoCut?: boolean;   // for ESC/POS
}
```

---

## 5. File Change Matrix

| Component / File | Purpose & Responsibility |
| :--- | :--- |
| [`apps/android-pos/android/app/src/main/java/com/benmi/pos/TsplBitmapConverter.java`](file:///Users/duccao/Documents/benmi-order/apps/android-pos/android/app/src/main/java/com/benmi/pos/TsplBitmapConverter.java) | **[NEW]** Native Java converter generating binary TSPL command payloads with DPI calculation. |
| [`apps/android-pos/android/app/src/main/java/com/benmi/pos/ThermalPrinterPlugin.java`](file:///Users/duccao/Documents/benmi-order/apps/android-pos/android/app/src/main/java/com/benmi/pos/ThermalPrinterPlugin.java) | **[MODIFY]** Accept `protocol: 'esc_pos' | 'tspl'`, `labelWidthMm`, `labelHeightMm`, routing to `TsplBitmapConverter`. |
| [`js/printer-service.js`](file:///Users/duccao/Documents/benmi-order/js/printer-service.js) | **[MODIFY]** Add TSPL label drawing methods (`drawOrderLabelToCanvas`, `drawItemStickersToCanvas`), update dispatcher and browser simulation. |
| [`orders.html`](file:///Users/duccao/Documents/benmi-order/orders.html) | **[MODIFY]** Add Protocol selector (`ESC/POS` vs `TSPL`), Label Size presets, and TSPL Mode controls for Cashier & Kitchen. |
| [`js/orders-settings.js`](file:///Users/duccao/Documents/benmi-order/js/orders-settings.js) | **[MODIFY]** Event listeners for protocol switching, loading/saving TSPL settings, and test print routing. |
| [`js/orders-i18n.js`](file:///Users/duccao/Documents/benmi-order/js/orders-i18n.js) | **[MODIFY]** Add bilingual translation keys for TSPL, Label Sizes, and Cup Sticker modes in `zh-TW` and `vi`. |
| [`tests/test_printer_system.js`](file:///Users/duccao/Documents/benmi-order/tests/test_printer_system.js) | **[MODIFY]** Unit test suite for TSPL payload generation, item sticker rendering, and hybrid station dispatching. |
