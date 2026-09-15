-- Migration: 0056_seed_jiangjiejie_bundle_orders.sql
-- Description: Seed sample orders containing single-portion, multi-portion, and surcharged bundle snapshots for tenant 'jiangjiejie' (蔣姐姐鹹水雞)

-- 1. Insert Orders
INSERT INTO orders (
    key,
    tenant_id,
    user_id,
    customer_name,
    pickup_time,
    status,
    total_amount,
    order_content,
    note,
    dining_option,
    table_number,
    created_at,
    updated_at,
    display_key,
    business_date
) VALUES
(
    'J0916-T001',
    'jiangjiejie',
    'user_lin_001',
    '林小姐 (0912-345-678)',
    '12:30',
    'NEW',
    220,
    '1份 x 套餐 A (3隻鹹水雞翅+6樣菜)
   ↳ 配菜: 5. 蓮藕 x1、6. 高麗菜 x1、7. 花椰菜 x1、10. 小黃瓜 x1、15. 玉米筍 x1、1. 水晶藻 x1
1份 x 鹹水雞腿
  - 口味設定: 胡椒粉: 正常・辣椒: 小・雞肉: 去骨・蒜泥: 要',
    '外帶，請附免洗餐具',
    'takeaway',
    '-',
    datetime('now', '+8 hours', '-15 minutes'),
    datetime('now', '+8 hours', '-15 minutes'),
    'J0916-T001',
    date('now', '+8 hours')
),
(
    'J0916-D001',
    'jiangjiejie',
    'user_chen_002',
    '陳先生',
    '12:20',
    'ACCEPTED',
    270,
    '【內用】桌號：3
1份 x 套餐 B (1個鹹水雞胸+10樣菜)
   ↳ 配菜: 4. 魷魚花 x1、7. 花椰菜 x1、9. 四季豆 x1、10. 小黃瓜 x1、13. 杏鮑菇 x1、18. 豆干 x2、22. 米血 x1、2. 海帶芽 x1、27. 鵪鶉蛋 x1 (+$20)
  - 口味設定: 胡椒粉: 清淡・辣椒: 不要・蒜泥: 多・洋蔥: 要・特調檸檬汁: 各半',
    '現場內用',
    'dine_in',
    '3',
    datetime('now', '+8 hours', '-25 minutes'),
    datetime('now', '+8 hours', '-10 minutes'),
    'J0916-D001',
    date('now', '+8 hours')
),
(
    'J0916-T002',
    'jiangjiejie',
    'user_zhang_003',
    '張經理 (0988-776-655)',
    '12:45',
    'DONE',
    380,
    '2份 x 套餐 A (2隻煙燻雞翅+6樣菜)
   ↳ 第1份 配菜: 6. 高麗菜 x1、7. 花椰菜 x1、14. 甜不辣 x1、17. 豆皮 x1、5. 蓮藕 x1、1. 水晶藻 x1
   ↳ 第2份 配菜: 10. 小黃瓜 x1、13. 杏鮑菇 x1、27. 鵪鶉蛋 x1、29. 豬頭皮 x1、2. 海帶芽 x1、28. 豬脆腸 x1
1份 x 煙燻雞胸
  - 口味設定: 胡椒粉: 正常・辣椒: 微・香油: 多
  - 備註: 兩份套餐分開裝，感謝！',
    '兩份套餐分開裝，感謝！',
    'takeaway',
    '-',
    datetime('now', '+8 hours', '-40 minutes'),
    datetime('now', '+8 hours', '-5 minutes'),
    'J0916-T002',
    date('now', '+8 hours')
),
(
    'J0916-T003',
    'jiangjiejie',
    'user_wang_004',
    '王先生 (0933-221-100)',
    '11:50',
    'PICKED_UP',
    350,
    '1份 x 全家歡樂餐 (鹹水半隻+12樣菜)
   ↳ 配菜: 6. 高麗菜 x2、7. 花椰菜 x2、15. 玉米筍 x2、14. 甜不辣 x2、1. 水晶藻 x2、13. 杏鮑菇 x2
  - 口味設定: 胡椒粉: 正常・辣椒: 中・椒麻: 小麻・蔥: 多',
    '已於現場完成取餐',
    'takeaway',
    '-',
    datetime('now', '+8 hours', '-90 minutes'),
    datetime('now', '+8 hours', '-60 minutes'),
    'J0916-T003',
    date('now', '+8 hours')
)
ON CONFLICT(key) DO UPDATE SET
    status = excluded.status,
    total_amount = excluded.total_amount,
    order_content = excluded.order_content,
    note = excluded.note,
    pickup_time = excluded.pickup_time,
    updated_at = excluded.updated_at;

-- 2. Insert Order Items with Bundle Snapshots
DELETE FROM order_items WHERE tenant_id = 'jiangjiejie' AND order_key IN ('J0916-T001', 'J0916-D001', 'J0916-T002', 'J0916-T003');

-- Order 1 Items (J0916-T001)
INSERT INTO order_items (
    tenant_id,
    order_key,
    round_number,
    item_id,
    item_name,
    category_name,
    quantity,
    unit_price,
    subtotal,
    selected_options,
    bundle_snapshot_json,
    notes,
    created_at
) VALUES
(
    'jiangjiejie',
    'J0916-T001',
    1,
    'jj_combo_a1',
    '套餐 A (3隻鹹水雞翅+6樣菜)',
    '套餐類',
    1,
    150,
    150,
    '[]',
    '{"bundleRuleId":"rule_jj_combo_a1","portions":[{"portionIndex":0,"groups":[{"groupId":"side-dishes","groupName":"配菜","items":[{"itemId":"jj_veg_05","name":"5. 蓮藕","quantity":1,"price":0,"surcharge":0},{"itemId":"jj_veg_06","name":"6. 高麗菜","quantity":1,"price":0,"surcharge":0},{"itemId":"jj_veg_07","name":"7. 花椰菜","quantity":1,"price":0,"surcharge":0},{"itemId":"jj_veg_10","name":"10. 小黃瓜","quantity":1,"price":0,"surcharge":0},{"itemId":"jj_veg_15","name":"15. 玉米筍","quantity":1,"price":0,"surcharge":0},{"itemId":"jj_sf_01","name":"1. 水晶藻","quantity":1,"price":0,"surcharge":0}]}]}]}',
    '',
    datetime('now', '+8 hours', '-15 minutes')
),
(
    'jiangjiejie',
    'J0916-T001',
    1,
    'jj_chk_02',
    '鹹水雞腿',
    '雞肉類',
    1,
    70,
    70,
    '[]',
    NULL,
    '',
    datetime('now', '+8 hours', '-15 minutes')
),

-- Order 2 Items (J0916-D001, Dine-in with +$20 surcharge item)
(
    'jiangjiejie',
    'J0916-D001',
    1,
    'jj_combo_b',
    '套餐 B (1個鹹水雞胸+10樣菜)',
    '套餐類',
    1,
    250,
    270,
    '[]',
    '{"bundleRuleId":"rule_jj_combo_b","portions":[{"portionIndex":0,"groups":[{"groupId":"side-dishes","groupName":"配菜","items":[{"itemId":"jj_sf_04","name":"4. 魷魚花","quantity":1,"price":0,"surcharge":0},{"itemId":"jj_veg_07","name":"7. 花椰菜","quantity":1,"price":0,"surcharge":0},{"itemId":"jj_veg_09","name":"9. 四季豆","quantity":1,"price":0,"surcharge":0},{"itemId":"jj_veg_10","name":"10. 小黃瓜","quantity":1,"price":0,"surcharge":0},{"itemId":"jj_veg_13","name":"13. 杏鮑菇","quantity":1,"price":0,"surcharge":0},{"itemId":"jj_brs_18","name":"18. 豆干","quantity":2,"price":0,"surcharge":0},{"itemId":"jj_brs_22","name":"22. 米血","quantity":1,"price":0,"surcharge":0},{"itemId":"jj_sf_02","name":"2. 海帶芽","quantity":1,"price":0,"surcharge":0},{"itemId":"jj_oth_27","name":"27. 鵪鶉蛋","quantity":1,"price":0,"surcharge":20}]}]}]}',
    '',
    datetime('now', '+8 hours', '-25 minutes')
),

-- Order 3 Items (J0916-T002, 2 Portions Combo + Standalone Chicken)
(
    'jiangjiejie',
    'J0916-T002',
    1,
    'jj_combo_a2',
    '套餐 A (2隻煙燻雞翅+6樣菜)',
    '套餐類',
    2,
    150,
    300,
    '[]',
    '{"bundleRuleId":"rule_jj_combo_a2","portions":[{"portionIndex":0,"groups":[{"groupId":"side-dishes","groupName":"配菜","items":[{"itemId":"jj_veg_06","name":"6. 高麗菜","quantity":1,"price":0,"surcharge":0},{"itemId":"jj_veg_07","name":"7. 花椰菜","quantity":1,"price":0,"surcharge":0},{"itemId":"jj_oth_14","name":"14. 甜不辣","quantity":1,"price":0,"surcharge":0},{"itemId":"jj_brs_17","name":"17. 豆皮","quantity":1,"price":0,"surcharge":0},{"itemId":"jj_veg_05","name":"5. 蓮藕","quantity":1,"price":0,"surcharge":0},{"itemId":"jj_sf_01","name":"1. 水晶藻","quantity":1,"price":0,"surcharge":0}]}]},{"portionIndex":1,"groups":[{"groupId":"side-dishes","groupName":"配菜","items":[{"itemId":"jj_veg_10","name":"10. 小黃瓜","quantity":1,"price":0,"surcharge":0},{"itemId":"jj_veg_13","name":"13. 杏鮑菇","quantity":1,"price":0,"surcharge":0},{"itemId":"jj_oth_27","name":"27. 鵪鶉蛋","quantity":1,"price":0,"surcharge":0},{"itemId":"jj_oth_29","name":"29. 豬頭皮","quantity":1,"price":0,"surcharge":0},{"itemId":"jj_sf_02","name":"2. 海帶芽","quantity":1,"price":0,"surcharge":0},{"itemId":"jj_oth_28","name":"28. 豬脆腸","quantity":1,"price":0,"surcharge":0}]}]}]}',
    '兩份套餐分開裝，感謝！',
    datetime('now', '+8 hours', '-40 minutes')
),
(
    'jiangjiejie',
    'J0916-T002',
    1,
    'jj_chk_11',
    '煙燻雞胸',
    '雞肉類',
    1,
    80,
    80,
    '[]',
    NULL,
    '',
    datetime('now', '+8 hours', '-40 minutes')
),

-- Order 4 Items (J0916-T003, Completed Family Combo)
(
    'jiangjiejie',
    'J0916-T003',
    1,
    'jj_combo_family_1',
    '全家歡樂餐 (鹹水半隻+12樣菜)',
    '套餐類',
    1,
    350,
    350,
    '[]',
    '{"bundleRuleId":"rule_jj_combo_family_1","portions":[{"portionIndex":0,"groups":[{"groupId":"side-dishes","groupName":"配菜","items":[{"itemId":"jj_veg_06","name":"6. 高麗菜","quantity":2,"price":0,"surcharge":0},{"itemId":"jj_veg_07","name":"7. 花椰菜","quantity":2,"price":0,"surcharge":0},{"itemId":"jj_veg_15","name":"15. 玉米筍","quantity":2,"price":0,"surcharge":0},{"itemId":"jj_oth_14","name":"14. 甜不辣","quantity":2,"price":0,"surcharge":0},{"itemId":"jj_sf_01","name":"1. 水晶藻","quantity":2,"price":0,"surcharge":0},{"itemId":"jj_veg_13","name":"13. 杏鮑菇","quantity":2,"price":0,"surcharge":0}]}]}]}',
    '',
    datetime('now', '+8 hours', '-90 minutes')
);
