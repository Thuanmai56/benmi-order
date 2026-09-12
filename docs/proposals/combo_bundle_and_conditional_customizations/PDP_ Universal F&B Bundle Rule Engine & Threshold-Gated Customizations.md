# PDP: Universal F&B Bundle Rule Engine & Threshold-Gated Customizations

**Trạng thái:** ĐỀ XUẤT  
**Phạm vi:** Customer LIFF/Menu, POS Menu Configuration, Order Worker, Cloudflare D1/KV  
**Loại thay đổi:** Architecture / Data Model / Order Validation / UX  
**Mục tiêu:** Xây dựng một engine cấu hình Combo/Set Meal đủ linh hoạt cho nhiều mô hình F&B mà không cần hardcode tenant hoặc migration schema mỗi khi xuất hiện một loại combo mới.

---

# 1. Tóm tắt điều hành

Hệ thống hiện cần hỗ trợ hai nhóm nghiệp vụ:

1. **Combo / Set Meal có các lựa chọn món con bắt buộc**
2. **Customization chỉ hợp lệ khi tổng giá trị đơn đạt một ngưỡng nhất định**

Yêu cầu ban đầu của `jiangjiejie` tương đối đơn giản:

> Một combo cần chọn đúng 6 món từ nhiều category.

Tuy nhiên, nếu thiết kế engine chỉ dựa trên:

```text
bundle
└── selection_count = 6
```

thì abstraction này chỉ giải quyết được một dạng combo phẳng.

Trong thực tế F&B, combo có thể có nhiều cấu trúc khác nhau:

```text
Quán A
└── Chọn 6 món bất kỳ từ 5 category

Quán B — Bento
├── Chọn 1 món chính
├── Chọn 2 món phụ
└── Chọn 1 nước

Quán C — Lẩu
├── Chọn 1 nước lẩu
├── Chọn 3 phần thịt
└── Rau: không giới hạn
```

Do đó PDP này không coi:

```text
Bundle = choose N items
```

mà coi:

```text
Bundle
└── 1..N Selection Groups

Selection Group
├── minimum quantity
├── maximum quantity
├── allowed sources
├── duplicate policy
└── pricing policy
```

Để tránh schema explosion khi business rule tiếp tục thay đổi, PDP sử dụng kiến trúc hybrid:

- **Relational tables** quản lý identity, tenant ownership, lifecycle, version và lookup.
- **Versioned JSON configuration** biểu diễn cấu trúc bundle linh hoạt.
- **D1 là source of truth.**
- **KV/bootstrap chỉ là read model phục vụ UI.**
- **Client không được tin cậy về giá hoặc tính hợp lệ của bundle.**
- **Worker luôn load rule và menu authoritative từ D1, validate lại và tự tính giá trước khi ghi order.**

Thiết kế này giữ được tính linh hoạt của JSON nhưng tránh biến JSON thành một blob không kiểm soát bằng cách áp dụng:

- schema version;
- runtime schema validation;
- stable item/category/option IDs;
- server-side validation;
- immutable order snapshots.

---

# 2. Bối cảnh và vấn đề hiện tại

Hệ thống hiện đã có:

- menu category và menu item;
- category pricing rules;
- global `menu_customizations`;
- `order_items.selected_options`;
- tenant bootstrap được cache trong KV;
- client tự xây structured items và gửi order về Worker.

Cơ chế combo hiện tại chủ yếu phục vụ một số flow cụ thể và chưa cung cấp một domain model tổng quát cho set meal. Ngoài ra, order flow hiện vẫn nhận `price`, `subtotal` và `total` do client tính.

Điều này tạo ra hai vấn đề.

## 2.1 Bundle rule chưa đủ expressive

Một cấu trúc như:

```text
selection_count = 6
allowed_categories = [...]
```

chỉ biểu diễn được:

> Chọn N món từ một pool phẳng.

Nó không biểu diễn tự nhiên được:

```text
1 main + 2 side + 1 drink
```

hoặc:

```text
1 soup + 3 meat + unlimited vegetables
```

Nếu tiếp tục mở rộng relational schema theo từng business case, chúng ta có nguy cơ phải lần lượt thêm:

```text
bundle_groups
min_quantity
max_quantity
included_quantity
max_per_category
max_per_item
pricing_type
...
```

và migration schema mỗi khi product xuất hiện một rule mới.

## 2.2 Client hiện chưa phải trust boundary phù hợp

Client có thể bị chỉnh sửa và gửi:

```json
{
  "price": 100,
  "subtotal": 100,
  "total": 150
}
```

trong khi giá thực tế từ menu có thể khác.

Do đó:

- giá client chỉ là hint;
- bundle selection client chỉ là request;
- subtotal client không được dùng làm authority;
- threshold `$150` phải dựa trên subtotal Worker tự tính từ dữ liệu authoritative.

PDP trước cũng đã xác định Worker phải kiểm tra lại menu item, category, inventory, price, bundle và customization rule trước khi ghi order.

---

# 3. Mục tiêu

## 3.1 In scope

### Universal Bundle Rule Engine

Hỗ trợ một món có thể định nghĩa nhiều selection group.

Ví dụ:

```text
Bento
├── Main: exactly 1
├── Side: exactly 2
└── Drink: exactly 1
```

Mỗi group có thể cấu hình:

- số lượng tối thiểu;
- số lượng tối đa;
- unlimited;
- cho phép chọn lặp;
- source item/category hợp lệ;
- pricing behaviour;
- display label;
- thứ tự render.

Không có runtime condition như:

```javascript
if (tenantId === "jiangjiejie") { ... }
```

hoặc:

```javascript
if (item.name.includes("套餐")) { ... }
```

### Server-authoritative order validation

Worker phải:

1. Resolve tenant.
2. Load item authoritative.
3. Load bundle rule authoritative.
4. Validate bundle selections.
5. Validate customization option.
6. Resolve modifier price.
7. Check stock.
8. Recalculate merchandise subtotal.
9. Check threshold.
10. Persist order.

### Threshold-Gated Customization

Ví dụ:

```text
特調檸檬汁
├── 不要          no restriction
├── 全部          min subtotal = $150
├── 各半          min subtotal = $150
└── 試吃          min subtotal = $150
```

Rule phải reference option bằng stable ID, không dựa vào label hiển thị.

### Backward compatibility

Tenant không có bundle rule mới tiếp tục hoạt động như hiện tại.

Order cũ vẫn render được.

---

# 4. Ngoài phạm vi

PDP này chưa giải quyết:

- tax;
- delivery fee;
- coupon redesign;
- inventory theo gram/nguyên liệu;
- dynamic recipe/BOM;
- time-based promotion;
- rule scripting tùy ý;
- arbitrary boolean expression engine;
- combo phụ thuộc ngày trong tuần;
- nested bundle vô hạn.

Không xây một general-purpose rules language ở phase này.

---

# 5. Design Principles

## 5.1 D1 là source of truth

KV dùng để:

```text
D1
 ↓
Bootstrap Read Model
 ↓
KV
 ↓
Client
```

Nhưng khi submit:

```text
Client
 ↓
Order Worker
 ↓
D1 authoritative lookup
 ↓
Validation
 ↓
Pricing
 ↓
Order persistence
```

KV không được dùng làm authority cuối cùng cho:

- price;
- active status;
- stock;
- bundle validity;
- threshold validity.

---

## 5.2 Identity dùng relational model

Những dữ liệu có lifecycle rõ ràng vẫn dùng column relational:

```text
id
tenant_id
parent_item_id
schema_version
is_active
created_at
updated_at
```

---

## 5.3 Behaviour có độ biến thiên cao dùng versioned JSON

Bundle structure sẽ nằm trong:

```text
config_json
```

thay vì mỗi semantics mới đều trở thành một database column.

---

## 5.4 JSON không phải arbitrary JSON

Mọi `config_json`:

- phải có `schema_version`;
- phải validate bằng schema tại write path;
- phải validate lại khi read;
- unknown version bị từ chối;
- không được chứa JavaScript expression hoặc executable code.

---

# 6. Domain Model

Domain model chính:

```text
Menu Item
    │
    │ 0..1
    ▼
Bundle Rule
    │
    ├── Selection Group
    │      ├── min
    │      ├── max
    │      ├── allowRepeat
    │      ├── sources[]
    │      └── pricing
    │
    ├── Selection Group
    │
    └── ...
```

Một bundle không có `selection_count` global.

Mỗi group có constraint riêng.

---

# 7. Database Design

## 7.1 `menu_bundle_rules`

```sql
CREATE TABLE menu_bundle_rules (
    id TEXT PRIMARY KEY,

    tenant_id TEXT NOT NULL,
    parent_item_id TEXT NOT NULL,

    schema_version INTEGER NOT NULL,
    config_json TEXT NOT NULL,

    is_active INTEGER NOT NULL DEFAULT 1
        CHECK (is_active IN (0, 1)),

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (tenant_id)
        REFERENCES tenants(id)
        ON DELETE CASCADE,

    FOREIGN KEY (parent_item_id)
        REFERENCES menu_items(id)
        ON DELETE CASCADE,

    UNIQUE (tenant_id, parent_item_id)
);

CREATE INDEX idx_menu_bundle_rules_lookup
ON menu_bundle_rules (
    tenant_id,
    parent_item_id,
    is_active
);
```

Không lưu:

```text
selection_count
allowed_categories
allow_repeat
```

thành column ở bundle level.

Các field đó thuộc domain configuration.

---

# 8. Bundle Rule Schema v1

## 8.1 TypeScript model

```typescript
export interface BundleRuleV1 {
  version: 1;

  groups: BundleSelectionGroupV1[];
}

export interface BundleSelectionGroupV1 {
  id: string;

  label: {
    "zh-TW"?: string;
    vi?: string;
  };

  minQuantity: number;

  /**
   * null = unlimited
   */
  maxQuantity: number | null;

  allowRepeat: boolean;

  sources: BundleSourceV1[];

  pricing: BundlePricingV1;

  sortOrder?: number;
}

export type BundleSourceV1 =
  | {
      type: "category";
      categoryId: string;
    }
  | {
      type: "item";
      itemId: string;
    };

export type BundlePricingV1 =
  | {
      type: "included";
    }
  | {
      type: "item_price";
    };
```

---

# 9. Ví dụ nghiệp vụ

## 9.1 Quán A — Flat Combo

> Chọn đúng 6 món từ 5 category.

```json
{
  "version": 1,
  "groups": [
    {
      "id": "side-dishes",
      "label": {
        "zh-TW": "請選擇 6 樣配菜",
        "vi": "Chọn 6 món ăn kèm"
      },
      "minQuantity": 6,
      "maxQuantity": 6,
      "allowRepeat": true,
      "sources": [
        {
          "type": "category",
          "categoryId": "cat_seafood"
        },
        {
          "type": "category",
          "categoryId": "cat_vegetables"
        },
        {
          "type": "category",
          "categoryId": "cat_offal"
        },
        {
          "type": "category",
          "categoryId": "cat_braised"
        },
        {
          "type": "category",
          "categoryId": "cat_other"
        }
      ],
      "pricing": {
        "type": "included"
      }
    }
  ]
}
```

---

## 9.2 Quán B — Bento

> 1 main + 2 side + 1 drink.

```json
{
  "version": 1,
  "groups": [
    {
      "id": "main",
      "label": {
        "zh-TW": "選擇主餐",
        "vi": "Chọn món chính"
      },
      "minQuantity": 1,
      "maxQuantity": 1,
      "allowRepeat": false,
      "sources": [
        {
          "type": "category",
          "categoryId": "cat_main_dishes"
        }
      ],
      "pricing": {
        "type": "included"
      },
      "sortOrder": 10
    },
    {
      "id": "side",
      "label": {
        "zh-TW": "選擇 2 樣配菜",
        "vi": "Chọn 2 món phụ"
      },
      "minQuantity": 2,
      "maxQuantity": 2,
      "allowRepeat": false,
      "sources": [
        {
          "type": "category",
          "categoryId": "cat_side_dishes"
        }
      ],
      "pricing": {
        "type": "included"
      },
      "sortOrder": 20
    },
    {
      "id": "drink",
      "label": {
        "zh-TW": "選擇飲料",
        "vi": "Chọn nước uống"
      },
      "minQuantity": 1,
      "maxQuantity": 1,
      "allowRepeat": false,
      "sources": [
        {
          "type": "category",
          "categoryId": "cat_drinks"
        }
      ],
      "pricing": {
        "type": "included"
      },
      "sortOrder": 30
    }
  ]
}
```

Không cần thay database schema để hỗ trợ Bento.

---

## 9.3 Quán C — Lẩu

> 1 soup + 3 meat + unlimited vegetables.

```json
{
  "version": 1,
  "groups": [
    {
      "id": "soup-base",
      "label": {
        "zh-TW": "選擇湯底",
        "vi": "Chọn nước lẩu"
      },
      "minQuantity": 1,
      "maxQuantity": 1,
      "allowRepeat": false,
      "sources": [
        {
          "type": "category",
          "categoryId": "cat_soup"
        }
      ],
      "pricing": {
        "type": "included"
      }
    },
    {
      "id": "meat",
      "label": {
        "zh-TW": "選擇 3 份肉品",
        "vi": "Chọn 3 phần thịt"
      },
      "minQuantity": 3,
      "maxQuantity": 3,
      "allowRepeat": true,
      "sources": [
        {
          "type": "category",
          "categoryId": "cat_meat"
        }
      ],
      "pricing": {
        "type": "included"
      }
    },
    {
      "id": "vegetables",
      "label": {
        "zh-TW": "蔬菜",
        "vi": "Rau"
      },
      "minQuantity": 0,
      "maxQuantity": null,
      "allowRepeat": true,
      "sources": [
        {
          "type": "category",
          "categoryId": "cat_vegetables"
        }
      ],
      "pricing": {
        "type": "included"
      }
    }
  ]
}
```

Quy ước:

```text
maxQuantity = null
```

có nghĩa là không có upper bound ở rule level.

---

# 10. Pricing Model v1

Phase đầu hỗ trợ hai pricing mode.

## 10.1 Included

```json
{
  "type": "included"
}
```

Món con không làm tăng subtotal.

Ví dụ:

```text
Bento $150
  Chicken
  Egg
  Tofu
  Tea

Total = $150
```

---

## 10.2 Item Price

```json
{
  "type": "item_price"
}
```

Mỗi selection tính theo giá authoritative của item tại D1.

Ví dụ:

```text
Hotpot Set      $300
Extra Beef       $80
Extra Vegetable  $30

Total = $410
```

---

## 10.3 Không hỗ trợ trong v1

Ví dụ:

> Hai topping đầu miễn phí, topping thứ ba trở đi tính giá.

Rule này chưa nằm trong v1.

Khi có requirement thật, có thể tạo:

```text
BundleRuleV2
```

thay vì thêm database column.

Ví dụ tương lai:

```json
{
  "pricing": {
    "type": "included_then_item_price",
    "includedQuantity": 2
  }
}
```

Không migration relational schema.

---

# 11. Rule Versioning

Database lưu:

```text
schema_version = 1
```

và JSON cũng có:

```json
{
  "version": 1
}
```

Worker phải đảm bảo hai giá trị khớp nhau.

Pseudo-code:

```typescript
function parseBundleRule(
  schemaVersion: number,
  rawConfig: string
): BundleRule {
  const config = JSON.parse(rawConfig);

  switch (schemaVersion) {
    case 1:
      return BundleRuleV1Schema.parse(config);

    default:
      throw new UnsupportedBundleRuleVersionError(
        schemaVersion
      );
  }
}
```

Rule mới không được silently interpreted bởi code cũ.

---

# 12. Stable IDs

Không dùng:

```text
"海裡"
"時蔬"
"套餐"
"全部"
```

làm business key.

Rule phải reference:

```text
categoryId
itemId
optionId
```

Label chỉ phục vụ display.

Điều này tránh rule bị hỏng nếu merchant đổi:

```text
時蔬
```

thành:

```text
新鮮時蔬
```

PDP trước cũng xác định category/option label không nên được dùng làm key cho rule.

---

# 13. Bootstrap Read Model

Client không cần trực tiếp hiểu database representation.

Worker serialize rule thành read model.

Ví dụ:

```json
{
  "id": "combo_bento_01",
  "name": "精選便當",
  "price": 150,

  "bundleRule": {
    "id": "rule_bento_01",
    "version": 1,

    "groups": [
      {
        "id": "main",
        "label": "選擇主餐",
        "minQuantity": 1,
        "maxQuantity": 1,
        "allowRepeat": false,

        "eligibleItems": [
          {
            "id": "item_chicken",
            "name": "雞肉",
            "categoryId": "cat_main",
            "isOutOfStock": false
          },
          {
            "id": "item_beef",
            "name": "牛肉",
            "categoryId": "cat_main",
            "isOutOfStock": false
          }
        ]
      }
    ]
  }
}
```

Bootstrap có thể pre-resolve eligible items để client không phải tự join category.

KV vẫn được dùng để giữ menu render nhanh.

---

# 14. Frontend UX

Nếu item không có `bundleRule`:

```text
+ button
→ add to cart như hiện tại
```

Nếu có:

```text
+ button
→ mở Bundle Builder
```

Ví dụ Bento:

```text
精選便當

主餐
已選 0 / 1

[雞肉] [牛肉] [豬肉]


配菜
已選 1 / 2

[-] 1 [蛋] [+]
[-] 0 [豆腐] [+]


飲料
已選 0 / 1

[茶] [可樂]
```

Submit chỉ enable khi tất cả required groups hợp lệ.

Validation frontend chỉ để UX.

Frontend không phải authority.

---

# 15. Quantity > 1

Nếu khách mua:

```text
2 × Bento
```

không nên flatten thành:

```text
main = 2
side = 4
drink = 2
```

mà không biết selection thuộc phần nào.

Client nên giữ từng portion:

```json
{
  "itemId": "combo_bento",
  "quantity": 2,

  "bundleInstances": [
    {
      "instanceId": "instance-1",
      "groups": [...]
    },
    {
      "instanceId": "instance-2",
      "groups": [...]
    }
  ]
}
```

Điều này cho phép:

```text
Bento #1
  Chicken
  Egg
  Tofu
  Tea

Bento #2
  Beef
  Soup
  Egg
  Coke
```

và dễ sửa từng set riêng biệt.

---

# 16. Order Request Contract

Client mới gửi:

```json
{
  "uuid": "client-order-uuid",

  "items": [
    {
      "lineId": "line-1",
      "itemId": "combo_bento",
      "quantity": 1,

      "bundleInstances": [
        {
          "instanceId": "instance-1",

          "groups": [
            {
              "groupId": "main",
              "selections": [
                {
                  "itemId": "item_chicken",
                  "quantity": 1
                }
              ]
            },
            {
              "groupId": "side",
              "selections": [
                {
                  "itemId": "item_egg",
                  "quantity": 1
                },
                {
                  "itemId": "item_tofu",
                  "quantity": 1
                }
              ]
            },
            {
              "groupId": "drink",
              "selections": [
                {
                  "itemId": "item_tea",
                  "quantity": 1
                }
              ]
            }
          ]
        }
      ]
    }
  ]
}
```

Client có thể vẫn gửi:

```text
price
subtotal
total
```

để backward-compatible.

Worker **không sử dụng chúng làm authoritative values**.

---

# 17. Server Validation Pipeline

Worker xử lý order theo thứ tự:

```text
Request
 ↓
Resolve tenant
 ↓
Validate payload shape
 ↓
Batch load parent items
 ↓
Load bundle rules
 ↓
Resolve selected child items
 ↓
Validate bundle structure
 ↓
Validate stock
 ↓
Resolve modifiers
 ↓
Calculate authoritative subtotal
 ↓
Validate customization thresholds
 ↓
Persist atomically
```

---

# 18. Bundle Validation

Với mỗi `bundleInstance`:

## 18.1 Group existence

```text
groupId
```

phải tồn tại trong rule.

Unknown group:

```json
{
  "code": "INVALID_BUNDLE_GROUP"
}
```

---

## 18.2 Quantity constraints

Tính:

```text
selectedQuantity
=
sum(selection.quantity)
```

Validation:

```typescript
selectedQuantity >= group.minQuantity
```

và nếu:

```typescript
group.maxQuantity !== null
```

thì:

```typescript
selectedQuantity <= group.maxQuantity
```

---

## 18.3 Eligible source

Mỗi child item phải thuộc ít nhất một source hợp lệ.

Ví dụ:

```json
{
  "type": "category",
  "categoryId": "cat_meat"
}
```

thì Worker check:

```text
child.category_id === cat_meat
```

Không tin category ID do client tự gửi.

---

## 18.4 Duplicate policy

Nếu:

```json
{
  "allowRepeat": false
}
```

thì:

```text
quantity > 1
```

cho cùng một item là invalid.

---

## 18.5 Inventory

Worker validate:

- parent item active;
- parent item available;
- child item active;
- child item không hết hàng.

---

# 19. Server-Authoritative Pricing

Worker không dùng:

```typescript
data.total
item.price
item.subtotal
```

để quyết định số tiền lưu.

Thay vào đó:

```typescript
serverSubtotal =
  parentItems
  + paidBundleSelections
  + paidModifiers;
```

PDP hiện tại đã xác định client-supplied price/total phải được bỏ qua khi Worker tính giá.

---

# 20. Threshold-Gated Customization

Bundle engine và threshold rule là hai domain khác nhau.

Bundle có độ biến thiên cao nên sử dụng versioned JSON.

Threshold rule đơn giản, queryable và có stable identity, nên tiếp tục dùng relational model.

## 20.1 Stable option ID

Ví dụ:

```json
{
  "id": "lemon_all",
  "name": "全部",
  "price": 0
}
```

---

## 20.2 Schema

```sql
CREATE TABLE menu_customization_option_rules (
    id TEXT PRIMARY KEY,

    tenant_id TEXT NOT NULL,

    customization_key TEXT NOT NULL,
    option_id TEXT NOT NULL,

    rule_type TEXT NOT NULL
        DEFAULT 'min_order_subtotal',

    min_order_subtotal REAL NOT NULL
        CHECK (min_order_subtotal >= 0),

    threshold_basis TEXT NOT NULL
        DEFAULT 'merchandise_subtotal_after_pricing',

    error_message TEXT,

    is_active INTEGER NOT NULL DEFAULT 1
        CHECK (is_active IN (0, 1)),

    created_at DATETIME NOT NULL
        DEFAULT CURRENT_TIMESTAMP,

    updated_at DATETIME NOT NULL
        DEFAULT CURRENT_TIMESTAMP,

    UNIQUE (
      tenant_id,
      customization_key,
      option_id,
      rule_type
    )
);
```

---

# 21. Threshold Calculation

Threshold `$150` sử dụng:

```text
authoritative merchandise subtotal
```

sau:

- parent item pricing;
- bundle paid selections;
- paid modifiers;

trước:

- delivery fee;
- external payment adjustment;
- tip;
- unrelated payment fee.

Ví dụ:

```text
Bento        $130
Extra Beef    $20

Merchandise subtotal = $150
```

Option requiring `$150` được phép.

---

# 22. Threshold UX

Client bootstrap:

```json
{
  "id": "lemon_all",
  "name": "全部",
  "price": 0,

  "restriction": {
    "type": "min_order_subtotal",
    "amount": 150
  }
}
```

Frontend có thể hiển thị:

```text
全部
滿 $150 可選
```

Nếu subtotal client hiện tại = `$100`:

```text
還差 $50 即可選擇
```

Nếu user giảm cart sau khi đã chọn option:

```text
⚠ 此選項需滿 $150
```

và khóa submit.

Nhưng Worker vẫn validate lại.

---

# 23. Error Contract

## Bundle incomplete

```json
{
  "code": "BUNDLE_GROUP_QUANTITY_NOT_MET",
  "message": "請完成套餐選擇",
  "details": {
    "itemId": "combo_bento",
    "instanceId": "instance-1",
    "groupId": "side",
    "minQuantity": 2,
    "maxQuantity": 2,
    "actualQuantity": 1
  }
}
```

## Invalid child

```json
{
  "code": "BUNDLE_ITEM_NOT_ELIGIBLE",
  "details": {
    "groupId": "main",
    "itemId": "item_coke"
  }
}
```

## Threshold

```json
{
  "code": "MIN_ORDER_SUBTOTAL_NOT_MET",
  "message": "選擇此調味方式時，訂單金額需滿 $150",
  "details": {
    "optionId": "lemon_all",
    "requiredSubtotal": 150,
    "actualSubtotal": 120
  }
}
```

---

# 24. Order Persistence

Phase 1 ưu tiên giữ persistence đơn giản.

Không tạo ngay:

```text
order_bundles
order_bundle_selections
```

trừ khi analytics/reporting thực sự cần relational query.

Thay vào đó thêm snapshot JSON ở parent `order_items`.

Ví dụ:

```sql
ALTER TABLE order_items
ADD COLUMN bundle_snapshot_json TEXT;
```

Snapshot:

```json
{
  "ruleId": "bundle-rule-bento",
  "schemaVersion": 1,

  "instances": [
    {
      "instanceId": "instance-1",

      "groups": [
        {
          "groupId": "main",
          "label": "選擇主餐",

          "selections": [
            {
              "itemId": "item_chicken",
              "itemName": "雞肉",
              "categoryId": "cat_main",
              "categoryName": "主餐",
              "quantity": 1,
              "unitPrice": 0
            }
          ]
        }
      ]
    }
  ]
}
```

Snapshot phải lưu display name tại thời điểm đặt đơn để menu thay đổi sau đó không làm thay đổi lịch sử.

---

# 25. Tại sao chưa normalize order bundle?

Normalized tables có lợi cho analytics, nhưng phase hiện tại requirement chính là:

- validate order;
- hiển thị kitchen/POS;
- receipt;
- LINE;
- customer cart.

JSON snapshot đáp ứng các requirement này với độ phức tạp thấp hơn.

Nếu tương lai có query thường xuyên:

```text
Bao nhiêu phần chicken được chọn trong bundle tháng này?
```

có thể bổ sung normalized event/projection sau.

Không cần buộc write model hiện tại phải tối ưu sẵn cho một analytics requirement chưa tồn tại.

---

# 26. POS / Kitchen / LINE Rendering

Render từ snapshot:

```text
1x 精選便當 $150
   ↳ 主餐: 雞肉 x1
   ↳ 配菜: 蛋 x1, 豆腐 x1
   ↳ 飲料: 茶 x1
```

Hotpot:

```text
1x 火鍋套餐 $350
   ↳ 湯底: 麻辣 x1
   ↳ 肉品: 牛肉 x2, 豬肉 x1
   ↳ 蔬菜: 高麗菜 x2, 白菜 x1
```

Existing UI đã có khả năng render hierarchical lines bằng ký hiệu `↳`, vì vậy format này tương thích tốt với hướng hiển thị hiện tại.

---

# 27. POS Configuration

Ở item editor:

```text
[ ] Enable Bundle
```

Khi bật:

```text
Selection Groups

Group 1
Name: Main Dish
Minimum: 1
Maximum: 1
Allow Repeat: No

Sources:
[x] Main Dish category


Group 2
Name: Side Dish
Minimum: 2
Maximum: 2
Allow Repeat: No

Sources:
[x] Side category


Group 3
Name: Drink
Minimum: 1
Maximum: 1
Allow Repeat: No

Sources:
[x] Drinks
```

POS không expose raw JSON mặc định.

UI serialize form thành `BundleRuleV1`.

Advanced JSON editor có thể cân nhắc cho admin nội bộ nhưng không nằm trong phase đầu.

---

# 28. Write Path Validation

`POST /api/menu` phải validate bundle config trước khi ghi.

Ví dụ:

```typescript
const parsed = BundleRuleV1Schema.safeParse(input);

if (!parsed.success) {
  return json(
    {
      code: "INVALID_BUNDLE_RULE",
      details: parsed.error.flatten()
    },
    400
  );
}
```

Sau đó validate referential integrity bằng application logic:

- source category thuộc cùng tenant;
- source item thuộc cùng tenant;
- parent item thuộc tenant;
- không self-reference bất hợp lý;
- không duplicate group ID.

---

# 29. Cache Invalidation

Sau mọi thay đổi:

```text
menu item
bundle rule
customization rule
```

phải invalidate:

```text
tenant:{tenantId}:bootstrap
```

Client có thể nhận thêm:

```json
{
  "schemaVersion": 3,
  "generatedAt": "..."
}
```

để debug stale bootstrap.

---

# 30. Security

Mọi lookup phải scope theo authoritative tenant.

Không được:

```sql
SELECT * FROM menu_items WHERE id = ?
```

mà thiếu tenant scope nếu ID không bảo đảm globally trusted.

Ưu tiên:

```sql
WHERE tenant_id = ?
AND id = ?
```

Ngoài ra:

- bind parameters;
- giới hạn request body;
- giới hạn item count;
- giới hạn bundle instances;
- giới hạn group count;
- giới hạn selection count;
- reject malformed JSON;
- không execute expression từ config;
- escape labels ở HTML/LINE;
- giữ UUID idempotency.

---

# 31. Observability

Structured log:

```text
event=order_rule_validation
tenant_id=<tenant>
order_uuid=<uuid>
parent_item_id=<item>
bundle_rule_id=<rule>
bundle_schema_version=1
client_total=<number>
server_total=<number>
validation_code=<code|null>
validation_latency_ms=<number>
```

Metrics:

```text
bundle_validation_failed_total
bundle_item_not_eligible_total
bundle_quantity_invalid_total
customization_threshold_failed_total
order_client_server_total_mismatch_total
bundle_rule_parse_failed_total
bootstrap_cache_hit_total
bootstrap_cache_miss_total
```

Alert khi:

- rule parse error > 0;
- client/server price mismatch tăng mạnh;
- order rejection tăng mạnh sau rollout;
- latency validation tăng bất thường.

---

# 32. Rollout Strategy

## Phase 0 — Inventory

Xác định:

- tenant ID;
- combo item IDs;
- category IDs;
- customization IDs;
- customization option IDs;
- rule thực tế của merchant.

Không seed bằng display name.

---

## Phase 1 — Additive schema

Thêm:

```text
menu_bundle_rules
menu_customization_option_rules
order_items.bundle_snapshot_json
```

Không thay đổi behaviour cũ.

---

## Phase 2 — Backend read/write support

Worker:

- parse BundleRuleV1;
- bootstrap serialization;
- POS write;
- cache invalidation.

Feature vẫn off.

---

## Phase 3 — Server authoritative pricing

Refactor `createOrder()`:

```text
client prices
   ↓
ignored as authority

D1 prices
   ↓
server subtotal
```

Việc này nên được test riêng trước khi bật bundle enforcement.

---

## Phase 4 — Frontend

Deploy:

- Bundle Builder;
- threshold UX;
- order snapshot rendering;
- POS configuration UI.

---

## Phase 5 — Seed rules

Seed bundle config cho tenant mục tiêu.

Ví dụ Jiangjiejie:

```text
套餐 A
group side-dishes
min = 6
max = 6
```

---

## Phase 6 — Shadow validation

Worker chạy:

```text
legacy result
vs
new validator result
```

nhưng chưa reject order.

Log:

```text
would_reject=true
reason=BUNDLE_GROUP_QUANTITY_NOT_MET
```

---

## Phase 7 — Enforcement

Bật lần lượt:

```text
dev
→ staging
→ production tenant flag
```

Sau đó mới mở rộng sang tenant khác.

---

# 33. Feature Flags

Đề xuất:

```text
bundle_rule_engine_v1
server_authoritative_order_pricing_v1
customization_threshold_v1
```

Có thể rollout độc lập.

---

# 34. Rollback

Nếu Bundle UI có vấn đề:

```text
disable bundle_rule_engine_v1
```

Nếu threshold có vấn đề:

```text
disable customization_threshold_v1
```

Không rollback schema.

Rule và snapshots vẫn giữ lại.

Nếu KV stale:

```text
delete tenant bootstrap key
```

nhưng KV invalidation không thay thế server validation.

---

# 35. Test Plan

## 35.1 Flat combo

```text
required = exactly 6
```

Test:

- 5 → reject;
- 6 → pass;
- 7 → reject;
- item ngoài category → reject;
- out-of-stock item → reject.

---

## 35.2 Bento

```text
main 1
side 2
drink 1
```

Test:

```text
1 / 2 / 1 → pass
0 / 2 / 1 → reject
1 / 1 / 1 → reject
1 / 3 / 1 → reject
1 / 2 / 0 → reject
```

---

## 35.3 Hotpot

```text
soup = 1
meat = 3
vegetable = unlimited
```

Test:

```text
1 / 3 / 0  → pass
1 / 3 / 10 → pass
0 / 3 / 4  → reject
1 / 2 / 4  → reject
```

---

## 35.4 Duplicate

`allowRepeat = false`:

```text
Chicken ×2
```

→ reject.

`allowRepeat = true`:

```text
Chicken ×2
```

→ pass nếu quantity limit vẫn hợp lệ.

---

## 35.5 Multiple bundle quantity

```text
2 × Bento
```

phải có:

```text
2 bundle instances
```

và mỗi instance phải independently valid.

Không cho instance 1 thiếu main nhưng instance 2 chọn 2 main để bù tổng.

---

## 35.6 Tampered price

Client gửi:

```text
combo price = $1
total = $150
```

Server vẫn lấy D1 price.

Stored order total phải bằng server calculation.

---

## 35.7 Threshold

```text
subtotal = 149
option = lemon_all
```

→ reject.

```text
subtotal = 150
```

→ pass.

---

## 35.8 Cross-tenant

Tenant A gửi child item ID của Tenant B.

→ reject.

---

## 35.9 Stale bootstrap

Client đang dùng rule version cũ.

Worker dùng current D1 rule.

Nếu payload không còn hợp lệ:

→ reject với typed error và frontend refresh bootstrap.

---

# 36. Alternatives Considered

## A. Flat relational `selection_count`

```text
Bundle
selection_count = N
categories[]
```

### Ưu điểm

- đơn giản;
- query dễ;
- nhanh implement.

### Nhược điểm

Không model tự nhiên được:

```text
1 main + 2 side + 1 drink
```

hoặc:

```text
1 soup + 3 meat + unlimited vegetables
```

### Quyết định

Không chọn làm universal domain model.

---

## B. Fully normalized relational rule graph

Ví dụ:

```text
menu_bundle_rules
menu_bundle_groups
menu_bundle_group_sources
menu_bundle_group_pricing
...
```

### Ưu điểm

- FK mạnh;
- query SQL tốt;
- reporting tốt.

### Nhược điểm

Business rule thay đổi có thể dẫn đến:

- thêm column;
- thêm table;
- migration;
- object graph ngày càng phức tạp.

### Quyết định

Không dùng làm cấu trúc chính ở phase này.

---

## C. JSON trực tiếp trong `menu_items`

### Ưu điểm

- ít table;
- nhanh implement.

### Nhược điểm

Lifecycle rule bị gắn chặt vào item;
khó version/enable/disable riêng;
khó audit metadata.

### Quyết định

Không lưu trực tiếp trong `menu_items`.

Dùng dedicated:

```text
menu_bundle_rules
```

nhưng `config_json` vẫn giữ flexibility.

---

## D. Hybrid Relational + Versioned JSON

### Ưu điểm

- flexible;
- schema migration ít;
- stable identity;
- versionable;
- tenant-safe;
- server validation mạnh;
- UI data-driven.

### Nhược điểm

- cần application-level schema validation;
- relational FK không thể validate mọi ID bên trong JSON;
- SQL analytics trực tiếp trên rule khó hơn.

### Quyết định

**Chọn.**

---

# 37. Các invariant bắt buộc

Architecture được coi là đúng khi các invariant sau luôn giữ:

### Invariant 1

Client không quyết định giá cuối cùng.

### Invariant 2

Client không quyết định bundle hợp lệ.

### Invariant 3

Rule không phụ thuộc display label.

### Invariant 4

Một bundle có thể có nhiều independent selection groups.

### Invariant 5

Thêm một loại cấu trúc combo mới hợp lý không mặc định yêu cầu DDL migration.

### Invariant 6

Order lưu snapshot đủ để render chính xác sau khi menu/rule thay đổi.

### Invariant 7

Tenant A không thể reference menu/rule của tenant B.

### Invariant 8

Unknown bundle schema version phải fail closed.

---

# 38. Open Questions

Trước khi implementation cần xác nhận:

1. `unlimited` có thật sự được phép trong UI hay cần một hard safety cap?
2. Có cho phép một item nằm trong nhiều selection group của cùng bundle không?
3. Một group có thể source trực tiếp cả category và individual item đồng thời không?
4. Bundle item có được làm child của bundle khác trong v1 không?
5. Khi `quantity > 1`, UX sẽ bắt người dùng cấu hình từng phần riêng hay có chức năng “copy lựa chọn từ phần trước”?
6. Jiangjiejie có cho phép chọn lặp cùng một side dish không?
7. Paid bundle selection có requirement ngay ở phase 1 hay chỉ cần `included`?
8. Threshold `$150` chính thức dựa trên merchandise subtotal sau modifier nhưng trước delivery/payment fee hay không?

---

# 39. Implementation Plan

### PR 1 — Data Model

- `menu_bundle_rules`;
- customization option stable IDs;
- `menu_customization_option_rules`;
- `bundle_snapshot_json`.

### PR 2 — Bundle Schema

- `BundleRuleV1`;
- runtime validator;
- parser/version dispatcher;
- tenant reference validation.

### PR 3 — Bootstrap

- load rule;
- resolve eligible items;
- serialize read model;
- invalidate KV.

### PR 4 — POS Write Path

- Bundle Group editor;
- min/max;
- sources;
- repeat policy;
- pricing mode;
- rule validation.

### PR 5 — Server Order Authority

- D1 menu lookup;
- authoritative pricing;
- bundle validation;
- stock validation;
- threshold validation;
- typed errors.

### PR 6 — Customer UX

- Bundle Builder;
- multiple groups;
- quantity/instances;
- threshold UX;
- cart edit.

### PR 7 — POS / LINE / Receipt

- render snapshot;
- hierarchical child rows.

### PR 8 — Tenant Seed & Shadow Mode

- inventory IDs;
- seed rule;
- shadow validation;
- observe mismatch.

### PR 9 — Enforcement

- staging QA;
- production tenant rollout;
- observability;
- rollback verification.

---

# 40. Kết luận

Universal F&B Bundle Engine không nên được model như:

```text
choose N items from categories
```

vì đây chỉ là một trường hợp cụ thể.

Abstraction phù hợp hơn là:

```text
Bundle
  → Selection Groups
      → Quantity Constraints
      → Eligible Sources
      → Duplicate Policy
      → Pricing Policy
```

Những phần ổn định của domain như:

```text
tenant
item ownership
rule identity
rule lifecycle
version
```

được lưu relational.

Những phần có độ biến thiên cao như cấu trúc selection group được lưu trong một **versioned, schema-validated JSON configuration**.

Client sử dụng rule để render UX nhưng không phải trust boundary.

Worker luôn:

```text
load authoritative data
→ validate
→ calculate price
→ validate threshold
→ persist snapshot
```

Nhờ đó hệ thống có thể bắt đầu với:

```text
Jiangjiejie: chọn 6 món
```

nhưng không tự đóng kiến trúc vào riêng requirement đó.

Cùng một engine có thể biểu diễn:

```text
6 món bất kỳ
1 main + 2 side + 1 drink
1 soup + 3 meat + unlimited vegetables
```

mà không cần hardcode tenant và không cần thay đổi relational schema cho từng loại combo mới.