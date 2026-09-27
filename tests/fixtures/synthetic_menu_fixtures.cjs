/**
 * Synthetic Menu Fixtures for Compatibility & Hardening Test Suite
 * Defined in PDP Section 5 & Spec Section E (L1-L5, N1-N5, H1, S1-S2, O1)
 * Uses purely synthetic, anonymous data — zero production PII.
 */

const FIXTURE_LEGACY = {
  tenantId: 'syn_legacy',
  brandName: 'Synthetic Legacy Store',
  // L1: Standard item, 0 modifiers, fast 1-tap add
  itemL1: {
    id: 'item_l1_plain',
    name: 'Bánh Mì Truyền Thống',
    category_id: 'cat_l1_catalog',
    category_slug: 'food',
    price: 50,
    item_type: 'standard'
  },
  // L2: Category single required + multiple optional
  categoryL2: {
    id: 'cat_l2_drinks',
    slug: 'drinks',
    name: 'Đồ Uống Danh Mục',
    allow_customization: 1,
    applied_modifiers: JSON.stringify(['*'])
  },
  catModifiersL2: [
    {
      id: 'mod_l2_ice',
      slug: 'ice_level',
      name: 'Lượng đá',
      selectionType: 'single',
      isRequired: true,
      minSelection: 1,
      maxSelection: 1,
      options: [
        { id: 'opt_ice_normal', name: 'Đá bình thường', price: 0, isDefault: true },
        { id: 'opt_ice_less', name: 'Ít đá', price: 0 },
        { id: 'opt_ice_none', name: 'Không đá', price: 0 }
      ]
    },
    {
      id: 'mod_l2_topping',
      slug: 'drink_toppings',
      name: 'Topping tùy chọn',
      selectionType: 'multiple',
      isRequired: false,
      minSelection: 0,
      maxSelection: 3,
      options: [
        { id: 'opt_top_boba', name: 'Trân châu trắng', price: 10 },
        { id: 'opt_top_jelly', name: 'Thạch dừa', price: 10 }
      ]
    }
  ],
  // L3: Category multiple required (min 1, max 2)
  catModifierL3RequiredMultiple: {
    id: 'mod_l3_required_multiple',
    slug: 'must_pick_sides',
    name: 'Món ăn kèm bắt buộc',
    selectionType: 'multiple',
    isRequired: true,
    minSelection: 1,
    maxSelection: 2,
    options: [
      { id: 'opt_side_fries', name: 'Khoai tây chiên', price: 15 },
      { id: 'opt_side_salad', name: 'Salad nhỏ', price: 15 },
      { id: 'opt_side_soup', name: 'Súp rau củ', price: 20 }
    ]
  },
  // L4: Global Order Customizations (menu_customizations)
  globalCustomizationsL4: [
    {
      id: 'custom_syn_legacy_cutlery',
      key: 'cutlery',
      title: 'Dụng cụ ăn dùng một lần',
      type: 'radio',
      is_required: 1,
      options: [
        { name: 'Cần lấy đũa/thìa', price: 0 },
        { name: 'Không lấy đũa/thìa', price: 0 }
      ]
    },
    {
      id: 'custom_syn_legacy_bag',
      key: 'thermal_bag',
      title: 'Túi giữ nhiệt giao hàng',
      type: 'checkbox',
      is_required: 0,
      options: [
        { name: 'Thêm túi giữ nhiệt', price: 20 }
      ]
    }
  ],
  // L5: Combo rules (v1/v2 fixed/choice, repeat/non-repeat)
  comboL5: {
    item: {
      id: 'combo_l5_set',
      name: 'Combo Trưa Tiết Kiệm',
      price: 90,
      item_type: 'bundle'
    },
    bundleRule: {
      id: 'rule_l5_combo',
      tenant_id: 'syn_legacy',
      name: 'Combo Trưa Tiết Kiệm',
      rule_version: 'v2',
      pricing_type: 'fixed_discount',
      base_price: 90,
      groups: [
        {
          groupId: 'grp_main',
          groupName: 'Món chính',
          minChoices: 1,
          maxChoices: 1,
          allowRepeat: false,
          items: [
            { itemId: 'item_l1_plain', name: 'Bánh Mì Truyền Thống', surcharge: 0 }
          ]
        },
        {
          groupId: 'grp_drink',
          groupName: 'Đồ uống kèm',
          minChoices: 1,
          maxChoices: 1,
          allowRepeat: false,
          items: [
            { itemId: 'item_drink_tea', name: 'Trà Chanh', surcharge: 5 }
          ]
        }
      ]
    }
  }
};

const FIXTURE_NEW = {
  tenantId: 'syn_new',
  brandName: 'Synthetic Modern Store',
  // N1: Item-specific paid modifier (80 + 15 = 95)
  itemN1: {
    id: 'item_n1_burger',
    name: 'Bò Phô Mai Burger',
    category_id: 'cat_new_western',
    price: 80,
    item_type: 'standard',
    modifier_groups: [
      {
        id: 'mg_n1_extra_cheese',
        name: 'Thêm Phô Mai Đặc Biệt',
        selection_type: 'single',
        isRequired: false,
        minSelection: 0,
        maxSelection: 1,
        options: [
          { id: 'opt_n1_cheese_slice', name: 'Phô mai lát', price: 15, isDefault: false }
        ]
      }
    ]
  },
  // N2: Item + Category both applied on the same item (additive, non-overriding)
  itemN2: {
    id: 'item_n2_combo_target',
    name: 'Gà Nướng Mật Ong',
    category_id: 'cat_new_chicken',
    price: 90,
    modifier_groups: [
      {
        id: 'mg_n2_item_level',
        name: 'Xốt ướp riêng của món',
        selection_type: 'single',
        isRequired: true,
        options: [
          { id: 'opt_n2_spicy_honey', name: 'Mật ong cay', price: 10 }
        ]
      }
    ]
  },
  categoryN2: {
    id: 'cat_new_chicken',
    slug: 'chicken',
    name: 'Gà Nướng Chảo',
    allow_customization: 1,
    applied_modifiers: JSON.stringify(['mod_cat_drinks'])
  },
  categoryModifiersN2: [
    {
      id: 'mod_cat_drinks',
      slug: 'chicken_sides',
      name: 'Phần ăn kèm danh mục',
      selectionType: 'single',
      isRequired: true,
      options: [
        { id: 'opt_cat_coleslaw', name: 'Bắp cải trộn', price: 5 }
      ]
    }
  ],
  // N3: Two groups/options with identical names but different IDs and different prices
  itemN3A: {
    id: 'item_n3_a',
    name: 'Món Nhẹ A',
    price: 60,
    modifier_groups: [
      {
        id: 'mg_n3_group_a',
        name: 'Thêm',
        selection_type: 'single',
        options: [
          { id: 'opt_n3_a_extra', name: 'Thêm', price: 15 }
        ]
      }
    ]
  },
  itemN3B: {
    id: 'item_n3_b',
    name: 'Món Nhẹ B',
    price: 70,
    modifier_groups: [
      {
        id: 'mg_n3_group_b',
        name: 'Thêm',
        selection_type: 'single',
        options: [
          { id: 'opt_n3_b_extra', name: 'Thêm', price: 25 }
        ]
      }
    ]
  },
  // N4: Min 2 / Max 3, Single optional clear, all sold-out options group
  itemN4: {
    id: 'item_n4_rules',
    name: 'Món Kiểm Thử Ràng Buộc',
    price: 100,
    modifier_groups: [
      {
        id: 'mg_n4_min2_max3',
        name: 'Chọn từ 2 đến 3 vị',
        selection_type: 'multiple',
        isRequired: true,
        minSelection: 2,
        maxSelection: 3,
        options: [
          { id: 'opt_n4_v1', name: 'Vị Dâu', price: 0 },
          { id: 'opt_n4_v2', name: 'Vị Xoài', price: 0 },
          { id: 'opt_n4_v3', name: 'Vị Đào', price: 0 },
          { id: 'opt_n4_v4', name: 'Vị Nho', price: 0 }
        ]
      },
      {
        id: 'mg_n4_single_optional',
        name: 'Tùy chọn không bắt buộc (bỏ chọn được)',
        selection_type: 'single',
        isRequired: false,
        minSelection: 0,
        maxSelection: 1,
        options: [
          { id: 'opt_n4_opt_sauce', name: 'Xốt tỏi đen', price: 10 }
        ]
      },
      {
        id: 'mg_n4_all_soldout',
        name: 'Nhóm tất cả hết hàng',
        selection_type: 'single',
        isRequired: true,
        options: [
          { id: 'opt_n4_sold1', name: 'Tạm ngưng 1', price: 0, out_of_stock_until: '2099-01-01T00:00:00Z' },
          { id: 'opt_n4_sold2', name: 'Tạm ngưng 2', price: 0, out_of_stock_until: '2099-01-01T00:00:00Z' }
        ]
      }
    ]
  },
  // N5: Combo parent + child modifiers (B3: Parent 100 + parent mod 5 + child surcharge 10 + child mod 15 = 130; 2 portions + global 20 = 280)
  comboN5: {
    parentItem: {
      id: 'combo_n5_grand',
      name: 'Đại Tiệc Combo',
      price: 100,
      item_type: 'bundle',
      modifier_groups: [
        {
          id: 'mg_n5_parent_mod',
          name: 'Hộp Quà Sang Trọng (Cha)',
          selection_type: 'single',
          options: [
            { id: 'opt_n5_box', name: 'Hộp quà nơ đỏ', price: 5 }
          ]
        }
      ]
    },
    childItem: {
      id: 'item_n5_sub_steak',
      name: 'Bít Tết Sốt Tiêu (Con)',
      price: 120,
      modifier_groups: [
        {
          id: 'mg_n5_child_mod',
          name: 'Tùy Chọn Món Con',
          selection_type: 'single',
          options: [
            { id: 'opt_n5_rare_sauce', name: 'Sốt kem nấm đặc biệt', price: 15 }
          ]
        }
      ]
    },
    bundleRule: {
      id: 'rule_n5_grand',
      tenant_id: 'syn_new',
      name: 'Đại Tiệc Combo',
      base_price: 100,
      groups: [
        {
          groupId: 'grp_n5_entree',
          groupName: 'Món chính thượng hạng',
          minChoices: 1,
          maxChoices: 1,
          items: [
            { itemId: 'item_n5_sub_steak', name: 'Bít Tết Sốt Tiêu (Con)', surcharge: 10 }
          ]
        }
      ]
    }
  }
};

const FIXTURE_HYBRID = {
  tenantId: 'syn_hybrid',
  brandName: 'Synthetic Hybrid Store',
  // H1: Legacy tenant that adds item-level modifiers to one item, other items untouched
  existingLegacyItems: [
    { id: 'item_h1_untouched_1', name: 'Mì Xào Giòn', price: 65, category_id: 'cat_h1_food' },
    { id: 'item_h1_untouched_2', name: 'Cơm Rang Dưa Bò', price: 70, category_id: 'cat_h1_food' }
  ],
  enhancedItemWithModifiers: {
    id: 'item_h1_enhanced',
    name: 'Phở Đặc Biệt (Có tùy chỉnh riêng)',
    price: 85,
    category_id: 'cat_h1_food',
    modifier_groups: [
      {
        id: 'mg_h1_beef_cut',
        name: 'Loại thịt bò',
        selection_type: 'single',
        isRequired: true,
        options: [
          { id: 'opt_h1_taibap', name: 'Tái bắp hoa', price: 20 },
          { id: 'opt_h1_gau', name: 'Gầu giòn', price: 15 }
        ]
      }
    ]
  }
};

const FIXTURE_CONTROL = {
  // S1: Tenant A and Tenant B for cross-tenant conflict & ownership checks
  tenantA: {
    tenantId: 'ctrl_tenant_a',
    item: { id: 'ctrl_a_item', name: 'Món Quán A', price: 100 },
    modifierGroup: {
      id: 'mg_ctrl_a_exclusive',
      name: 'Nhóm Quán A',
      options: [{ id: 'opt_ctrl_a_1', name: 'Option A1', price: 10 }]
    }
  },
  tenantB: {
    tenantId: 'ctrl_tenant_b',
    item: { id: 'ctrl_b_item', name: 'Món Quán B', price: 200 },
    modifierGroup: {
      id: 'mg_ctrl_b_secret',
      name: 'Bí Quyết Quán B (CẤM GHI ĐÈ)',
      options: [{ id: 'opt_ctrl_b_1', name: 'Option B1 Bảo Mật', price: 99 }]
    }
  },
  // O1: Historical order snapshot vs active modified menu
  orderO1Snapshot: {
    id: 'ord_syn_historical_001',
    tenant_id: 'syn_legacy',
    customerName: 'Khách Lịch Sử',
    total_amount: 95,
    items: [
      {
        name: 'Món Cũ Đã Xóa Khỏi Menu',
        quantity: 1,
        price: 80,
        subtotal: 95,
        options: [
          { group: 'Topping Cũ', choice: 'Trân Châu Hoàng Kim', price: 15 }
        ]
      }
    ]
  }
};

module.exports = {
  FIXTURE_LEGACY,
  FIXTURE_NEW,
  FIXTURE_HYBRID,
  FIXTURE_CONTROL
};
