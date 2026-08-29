# PDP: Cơ Chế Thiết Lập Combo & Giá Khuyến Mãi Theo Nhóm Danh Mục (Universal Category Bundle Pricing Engine)

---

## 1. Tóm Tắt Điều Hành & Mục Tiêu (Executive Summary & Objectives)

### A. Vấn Đề Nghiệp Vụ (Problem Statement)
Trong ngành F&B, các mô hình bán lẻ (như quán ăn vặt, quán xiên que, quán gà rán, quán đồ nguội/xúc xích, hoặc quán **干城鹹水雞 - BSC**) thường có chương trình khuyến mãi theo nhóm sản phẩm đồng giá hoặc phụ kiện:
- **Ví dụ thực tế tại BSC**: Nhóm `蔬菜/配菜` (Rau & Phụ kiện) có hơn 25 món đồng giá $35/phần. Khách mua 1 phần lẻ tính **$35**, nhưng mua **bất kỳ 3 phần** trong nhóm đó sẽ được tính giá combo **$100** (thay vì $105, giảm $5 cho mỗi 3 phần).
- **Vấn đề kỹ thuật**: Nếu viết code hardcode cho riêng quán BSC (`if (tenantId === 'bsc' && slug === 'veggie')`), hệ thống sẽ vi phạm nghiêm trọng nguyên tắc cốt lõi **1,000+ Multi-Tenant Scalability (Zero Hardcoding)**. Mọi quán khác khi cần áp dụng chương trình tương tự ("Mua 3 bánh mì $200", "Mua 5 xiên que $120", "Mua 2 ly nước $50") sẽ không thể tái sử dụng.

### B. Mục Tiêu Cốt Lõi (In-Scope Goals)
1. **Cơ chế Tổng Quát & Config-Driven 100%**: Thiết kế trường `pricing_rules` dạng JSON trong bảng `menu_categories`. Mọi quán trên nền tảng có thể bật tính năng combo nhóm cho bất kỳ danh mục nào chỉ bằng 1 dòng cấu hình trong CSDL D1.
2. **Thuật Toán Phân Bổ Combo Tổng Quát (Universal Bundle Calculation)**:
   - Hỗ trợ tính đúng cho mọi số lượng $N$:
     - $N = 1 \rightarrow 1 \times \$35 = \$35$
     - $N = 2 \rightarrow 2 \times \$35 = \$70$
     - $N = 3 \rightarrow 1 \text{ combo } = \$100 \text{ (Tiết kiệm \$5)}$
     - $N = 4 \rightarrow 1 \text{ combo (\$100)} + 1 \text{ lẻ (\$35)} = \$135$
     - $N = 5 \rightarrow 1 \text{ combo (\$100)} + 2 \text{ lẻ (\$70)} = \$170$
     - $N = 6 \rightarrow 2 \text{ combo} = \$200 \text{ (Tiết kiệm \$10)}$
   - Hỗ trợ cả trường hợp các món trong cùng nhóm có đơn giá khác nhau trong tương lai (sắp xếp giảm dần, ưu tiên món giá cao vào combo để bảo vệ quyền lợi tối đa cho khách hàng).
3. **Hiển Thị Minh Bạch & Tối Ưu UX**:
   - Hiển thị nhãn ưu đãi rõ ràng trên danh mục menu: `1份$35 / 3份$100`.
   - Trong giỏ hàng (Cart) và Popup chi tiết, hiển thị chi tiết từng món khách chọn, kèm dòng tóm tắt số combo và số tiền tiết kiệm được: `蔬菜/配菜 3份組合特惠 $100 (已省 $5)`.
4. **Đồng Bộ Dữ Liệu Toàn Hệ Thống**:
   - Backend Cloudflare Worker lưu đúng `total_amount` đã chiết khấu vào D1 database.
   - Tin nhắn LINE Flex Message, Receipt POS và Google Sheets thể hiện chính xác tổng tiền và chi tiết đơn hàng.

---

## 2. Kiến Trúc Cơ Sở Dữ Liệu & Mô Hình Dữ Liệu (Data Architecture)

### A. Mở Rộng Bảng `menu_categories` (Cloudflare D1)

Thêm cột `pricing_rules TEXT` (JSON) vào bảng `menu_categories` thông qua D1 Migration:

```sql
-- Migration: 0043_add_pricing_rules_to_menu_categories.sql
ALTER TABLE menu_categories ADD COLUMN pricing_rules TEXT;

-- Cấu hình cho danh mục Rau của BSC: Mua 3 món bất kỳ giá 100đ
UPDATE menu_categories 
SET pricing_rules = '{"type":"bundle_n","bundle_qty":3,"bundle_price":100,"promo_label":"3份$100"}'
WHERE id = 'bsc_veggie' AND tenant_id = 'bsc';
```

### B. Cấu Trúc JSON Schema Của `pricing_rules`

```typescript
export interface CategoryBundlePricingRule {
  type: 'bundle_n' | 'tiered';   // Loại combo: 'bundle_n' (N món giá X) hoặc 'tiered' (đa bậc)
  bundle_qty: number;             // Số lượng món để tạo thành 1 combo (ví dụ: 3)
  bundle_price: number;           // Giá trọn gói cho 1 combo (ví dụ: 100)
  promo_label?: string;           // Nhãn hiển thị ngắn gọn (ví dụ: "3份$100")
}
```

---

## 3. Thuật Toán Tính Giá Combo Tổng Quát (Core Calculation Engine)

Hàm tính toán thuần túy (Pure Function) dùng chung cho cả Frontend (`js/client-checkout.js` / `index.html`) và Backend (`benmi-worker-official`):

```typescript
export interface CategoryCartItem {
  itemId: string;
  name: string;
  price: number;
  qty: number;
}

export interface BundleCalculationResult {
  categoryTotal: number;       // Tổng tiền thực tế sau khi áp dụng combo
  regularTotal: number;        // Tổng tiền gốc nếu tính theo giá lẻ từng món
  discountAmount: number;      // Số tiền khách tiết kiệm được (regularTotal - categoryTotal)
  bundleCount: number;         // Số lượng combo hoàn chỉnh (ví dụ: 2 combo)
  remainderCount: number;      // Số lượng món lẻ chưa đủ combo (ví dụ: 1 món lẻ)
}

export function calculateCategoryBundleSubtotal(
  rule: CategoryBundlePricingRule | null,
  items: CategoryCartItem[]
): BundleCalculationResult {
  const regularTotal = items.reduce((sum, item) => sum + (item.price * item.qty), 0);
  const totalQty = items.reduce((sum, item) => sum + item.qty, 0);

  // 1. Nếu danh mục không có cấu hình combo hoặc số lượng < số lượng tối thiểu của combo
  if (!rule || !rule.bundle_qty || rule.bundle_qty <= 0 || !rule.bundle_price || totalQty < rule.bundle_qty) {
    return {
      categoryTotal: regularTotal,
      regularTotal,
      discountAmount: 0,
      bundleCount: 0,
      remainderCount: totalQty
    };
  }

  // 2. Tính số lượng combo và số món lẻ thừa ra
  const bundleCount = Math.floor(totalQty / rule.bundle_qty);
  const remainderCount = totalQty % rule.bundle_qty;

  // 3. Mở rộng danh sách giá từng phần ăn đơn lẻ và sắp xếp giảm dần
  // (Đảm bảo các món giá cao nhất được gom vào combo trước để khách tiết kiệm tối đa)
  const flattenedPrices: number[] = [];
  items.forEach(item => {
    for (let i = 0; i < item.qty; i++) {
      flattenedPrices.push(item.price);
    }
  });
  flattenedPrices.sort((a, b) => b - a);

  // 4. Tính tổng tiền: (Số combo * Giá combo) + (Tổng giá của các món lẻ thừa lại)
  let categoryTotal = bundleCount * rule.bundle_price;
  const remainderPrices = flattenedPrices.slice(bundleCount * rule.bundle_qty);
  categoryTotal += remainderPrices.reduce((sum, p) => sum + p, 0);

  const discountAmount = Math.max(0, regularTotal - categoryTotal);

  return {
    categoryTotal,
    regularTotal,
    discountAmount,
    bundleCount,
    remainderCount
  };
}
```

---

## 4. Tích Hợp Giao Diện Người Dùng (UI/UX Integration)

### A. Hiển Thị Menu Danh Mục (`index.html`)
- Khi `bootstrapData.catalog` trả về danh mục có `pricingRules`, hệ thống tự động render:
  - Tên danh mục: `蔬菜/配菜`
  - Tag ưu đãi nổi bật: `<span class="promo-pill">3份 $100</span>`

### B. Giỏ Hàng & Tóm Tắt Đơn Hàng (`cart-summary`)
Khi khách chọn các món trong nhóm `蔬菜/配菜` (ví dụ: `1x 娃娃菜`, `1x 豬耳朵`, `1x 蓮藕片` $\rightarrow$ Tổng 3 món):
```
--------------------------------------------------
蔬菜/配菜 (3份組合特惠)
  ↳ 1x 娃娃菜 ($35)
  ↳ 1x 豬耳朵 ($35)
  ↳ 1x 蓮藕片 ($35)
  小計：$100 (原價 $105，已省 $5)
--------------------------------------------------
```

### C. Đơn Hàng POS & Hóa Đơn In Nhiệt
- POS hiển thị chính xác tên từng món để bếp chế biến.
- Dòng tổng tiền và chi tiết đơn thể hiện số tiền thực thu chuẩn xác `$100`.

---

## 5. Kế Hoạch Triển Khai Từng Bước (Execution Plan)

1. **Bước 1 (D1 Database Migration)**:
   - Tạo `0043_add_pricing_rules_to_menu_categories.sql`.
   - Thêm cột `pricing_rules` vào `menu_categories` và cập nhật dữ liệu cho `bsc_veggie`.
2. **Bước 2 (Backend API & Bootstrap)**:
   - Cập nhật `benmi-worker-official/src/modules/bootstrap.ts` để phân tích `pricing_rules` và trả về `pricingRules: { bundle_qty: 3, bundle_price: 100 }` trong JSON bootstrap.
3. **Bước 3 (Frontend Cart Calculation)**:
   - Cập nhật hàm `updateTotal()` trong `index.html` và `buildStructuredCartItems()` trong `js/client-checkout.js` tích hợp hàm tính combo `calculateCategoryBundleSubtotal`.
4. **Bước 4 (Kiểm Thử & Release)**:
   - Kiểm thử các ca: 1 món ($35), 2 món ($70), 3 món ($100), 4 món ($135), 6 món ($200).
   - Release từ `dev` $\rightarrow$ `staging` $\rightarrow$ `production`.
