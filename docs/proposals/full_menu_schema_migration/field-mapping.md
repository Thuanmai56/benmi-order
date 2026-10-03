# Bảng Quy chiếu Mapping Dữ liệu (Field Mapping Specification)

- **Thời điểm sinh**: 2026-10-03T05:05:55.128Z
- **Snapshot Run ID**: `snap_2026-10-01T11-56-30-635Z`
- **Tổng số Groups map**: 44 nhóm
- **Tổng số Options map**: 169 lựa chọn
- **Tổng số Category Links map**: 24 liên kết
- **Tổng số Conflicts / Unresolved**: 0

---

## 1. Định danh Nhóm Tuỳ chọn (Group Identity Mapping)

| Nguồn | Identity Nguồn | Target Group ID | Tên hiển thị | Selection Type | Scope |
|---|---|---|---|---|---|
| `menu_customizations` | `demo_flavor` | `mg_cust_blab_demo_demo_flavor` | ✦ 口味選擇 | `single` | `order` |
| `menu_customizations` | `demo_salt` | `mg_cust_blab_demo_demo_salt` | ✦ 鹹度調整 | `single` | `order` |
| `menu_customizations` | `demo_spicy` | `mg_cust_blab_demo_demo_spicy` | ✦ 辣度選擇 (朝天椒) | `single` | `order` |
| `menu_customizations` | `demo_ingredients` | `mg_cust_blab_demo_demo_ingredients` | ✦ 配料調整 | `multiple` | `order` |
| `menu_customizations` | `demo_addons` | `mg_cust_blab_demo_demo_addons` | ✦ 加價配料 (選加) | `multiple` | `order` |
| `menu_customizations` | `custom_mod_jj_pepper` | `mg_cust_jiangjiejie_custom_mod_jj_pepper` | 胡椒粉 | `single` | `order` |
| `menu_customizations` | `custom_mod_jj_chili` | `mg_cust_jiangjiejie_custom_mod_jj_chili` | 辣椒（朝天椒） | `single` | `order` |
| `menu_customizations` | `custom_mod_jj_ma` | `mg_cust_jiangjiejie_custom_mod_jj_ma` | 椒麻（青花椒） | `single` | `order` |
| `menu_customizations` | `custom_mod_jj_onion` | `mg_cust_jiangjiejie_custom_mod_jj_onion` | 洋蔥 | `single` | `order` |
| `menu_customizations` | `custom_mod_jj_garlic` | `mg_cust_jiangjiejie_custom_mod_jj_garlic` | 蒜泥 | `single` | `order` |
| `menu_customizations` | `custom_mod_jj_scallion` | `mg_cust_jiangjiejie_custom_mod_jj_scallion` | 蔥 | `single` | `order` |
| `menu_customizations` | `custom_mod_jj_sesame_oil` | `mg_cust_jiangjiejie_custom_mod_jj_sesame_oil` | 芝麻香油 | `single` | `order` |
| `menu_customizations` | `custom_mod_jj_veg_soup` | `mg_cust_jiangjiejie_custom_mod_jj_veg_soup` | 蔬菜湯 | `single` | `order` |
| `menu_customizations` | `custom_mod_jj_chicken_prep` | `mg_cust_jiangjiejie_custom_mod_jj_chicken_prep` | 雞肉 | `single` | `order` |
| `menu_customizations` | `custom_mod_jj_lemon_juice` | `mg_cust_jiangjiejie_custom_mod_jj_lemon_juice` | 特調檸檬汁 | `single` | `order` |
| `menu_customizations` | `hjh_custom_sauce` | `mg_cust_dapinglin_hjh_custom_sauce` | ✦ 醬汁選擇 | `single` | `order` |
| `menu_customizations` | `hjh_custom_spicy` | `mg_cust_dapinglin_hjh_custom_spicy` | ✦ 辣度選擇 | `single` | `order` |
| `menu_customizations` | `hjh_custom_seasoning` | `mg_cust_dapinglin_hjh_custom_seasoning` | ✦ 配料調整 | `multiple` | `order` |
| `menu_customizations` | `custom_jiangjiejie_group_mtzvqwy1` | `mg_cust_jiangjiejie_custom_jiangjiejie_group_mtzvqwy1` | 孩子分袋調味 | `single` | `order` |
| `menu_customizations` | `bsc_flavor` | `mg_cust_bsc_bsc_flavor` | ✦ 口味選擇 | `single` | `order` |
| `menu_customizations` | `bsc_salt` | `mg_cust_bsc_bsc_salt` | ✦ 鹹度調整 | `single` | `order` |
| `menu_customizations` | `bsc_spicy` | `mg_cust_bsc_bsc_spicy` | ✦ 辣度選擇 (朝天椒) | `single` | `order` |
| `menu_customizations` | `bsc_ingredients` | `mg_cust_bsc_bsc_ingredients` | ✦ 配料調整 | `multiple` | `order` |
| `menu_customizations` | `bsc_addons` | `mg_cust_bsc_bsc_addons` | ✦ 加價配料 (選加) | `multiple` | `order` |
| `menu_customizations` | `custom_blab_demo_group_mud2onv1` | `mg_cust_blab_demo_custom_blab_demo_group_mud2onv1` | test | `single` | `order` |
| `menu_customizations` | `custom_mys_bag` | `mg_cust_miyansuo_custom_mys_bag` | ✦ 響應環保 / 提袋加購 | `single` | `order` |
| `menu_categories.modifier` | `cat_topping` | `mg_cat_benmi_cat_topping` | 加料選項 | `single` | `category` |
| `menu_categories.modifier` | `cat_zd_spicy` | `mg_cat_zhadantongxue_cat_zd_spicy` | 加辣選項 | `single` | `category` |
| `menu_categories.modifier` | `cat_zd_egg` | `mg_cat_zhadantongxue_cat_zd_egg` | 雞蛋選項 | `single` | `category` |
| `menu_categories.modifier` | `cat_zd_lettuce` | `mg_cat_zhadantongxue_cat_zd_lettuce` | 生菜選項 | `single` | `category` |
| `menu_categories.modifier` | `cat_zd_topping` | `mg_cat_zhadantongxue_cat_zd_topping` | 加料選項 | `multiple` | `category` |
| `menu_categories.modifier` | `cat_wwb_custom_general` | `mg_cat_weiweibao_cat_wwb_custom_general` | 客製化 (Tùy chọn chung) | `multiple` | `category` |
| `menu_categories.modifier` | `cat_wwb_custom_noodle` | `mg_cat_weiweibao_cat_wwb_custom_noodle` | 客製化 - 干米線專用 (Tùy chọn bún) | `multiple` | `category` |
| `menu_categories.modifier` | `cat_wwb_combo_drink` | `mg_cat_weiweibao_cat_wwb_combo_drink` | 套餐加購飲料 (Mua kèm bánh mì - Đồng giá 50元) | `single` | `category` |
| `menu_categories.modifier` | `cat_xx_spicy` | `mg_cat_xiaolan_cat_xx_spicy` | 辣度選擇 | `single` | `category` |
| `menu_categories.modifier` | `cat_xx_custom` | `mg_cat_xiaolan_cat_xx_custom` | 客製選項 (不加配料) | `multiple` | `category` |
| `menu_categories.modifier` | `cat_xx_topping` | `mg_cat_xiaolan_cat_xx_topping` | 加料選項 | `multiple` | `category` |
| `menu_categories.modifier` | `benmi_spicy` | `mg_cat_benmi_benmi_spicy` | 辣度 (Độ cay) | `single` | `category` |
| `menu_categories.modifier` | `cat_tns_spicy` | `mg_cat_thuyngason_cat_tns_spicy` | 辣度選擇 (Độ cay) | `single` | `category` |
| `menu_categories.modifier` | `cat_tns_custom` | `mg_cat_thuyngason_cat_tns_custom` | 客製選項 (Tùy chọn bỏ nguyên liệu) | `multiple` | `category` |
| `menu_categories.modifier` | `cat_tns_topping` | `mg_cat_thuyngason_cat_tns_topping` | 加料選項 (Thêm đồ) | `multiple` | `category` |
| `menu_categories.modifier` | `blab_demo_cat-mtfz94iw` | `mg_cat_blab_demo_blab_demo_cat-mtfz94iw` | 加辣 | `single` | `category` |
| `menu_categories.modifier` | `mod_hs_noodle_type` | `mg_cat_haoshiguoshao_mod_hs_noodle_type` | 麵體選擇 (必選1項) | `single` | `category` |
| `menu_categories.modifier` | `mod_hs_guoshao_addons` | `mg_cat_haoshiguoshao_mod_hs_guoshao_addons` | 加料加價購 (可複選) | `multiple` | `category` |

---

## 2. Quy tắc Định danh Lựa chọn (Option Identity Allocation)

- **Options có ID sẵn**: Sử dụng hàm băm xác định `generateTargetId('opt', tenant, group_id, opt.id)`. ID luôn ổn định 100% qua mọi lần chạy lại.
- **Options không có ID (ví dụ: bsc, dapinglin)**: Sử dụng thứ tự phần tử tại thời điểm snapshot `generateTargetId('opt', tenant, group_id, 'idx_' + idx)`.
- **Options từ Menu Items**: Sử dụng `generateTargetId('opt_item', tenant, category_id, item.id)`.

---

## 3. Bảo toàn Dữ liệu Sub-options và Rules

- **Sub-options**: Được serialized nguyên vẹn vào cột JSON `sub_options_json`.
- **Option Rules**: Tích hợp các rules từ bảng `menu_customization_option_rules` và inline rules thành mảng JSON trong cột `eligibility_rules_json`.
- **Provenance / Traceability**: Mọi bản ghi group và option đều mang trường `source_metadata_json` lưu rõ bảng gốc, ID gốc và thứ tự snapshot.

---

## 4. Xử lý Mâu thuẫn (Conflicts / Unresolved Report)

**Không phát hiện mâu thuẫn hay token không giải được (0 conflicts)!**
