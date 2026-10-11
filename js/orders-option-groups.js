/* One isolated draft and route stack for product / shared option-group editing. */
(() => {
  const translations = {
    vi: {
      ugProduct: "Chỉnh sửa món",
      ugNewProduct: "Thêm món",
      ugGroup: "Chỉnh sửa nhóm",
      ugNewGroup: "Thêm nhóm tùy chọn",
      ugDetails: "Thông tin",
      ugName: "Tên",
      ugCategory: "Phân loại",
      ugPrice: "Giá bán",
      ugBadge: "Nhãn",
      ugGroups: "Nhóm tùy chọn",
      ugRules: "Quy tắc",
      ugRequired: "Bắt buộc chọn ít nhất một lựa chọn",
      ugMin: "Số lượng tối thiểu",
      ugMax: "Số lượng tối đa",
      ugRepeat: "Cho phép chọn nhiều phần của cùng một lựa chọn",
      ugIncluded: "Có sẵn trong món",
      ugOptions: "Lựa chọn",
      ugLinked: "Món áp dụng",
      ugLink: "Liên kết món",
      ugAdd: "Thêm lựa chọn",
      ugAddGroup: "Thêm nhóm",
      ugFromProducts: "Từ món có sẵn",
      ugFromProductsHelp: "Chọn món trong thực đơn và đặt phụ thu riêng.",
      ugCustom: "Tùy chọn tự tạo",
      ugCustomHelp: "Tạo lựa chọn mới cho nhóm này.",
      ugSurcharge: "Phụ thu trong nhóm",
      ugRetail: "Giá bán lẻ",
      ugQuantity: "Số phần có sẵn",
      ugDefault: "Chọn sẵn",
      ugInherited: "Từ phân loại",
      ugDefaults: "Dùng lại mặc định",
      ugOwn: "Danh sách riêng cho món",
      ugChoose: "Chọn",
      ugSearch: "Tìm kiếm",
      ugAll: "Tất cả phân loại",
      ugSaveProduct: "Lưu món",
      ugSaveGroup: "Lưu nhóm",
      ugApply: "Áp dụng",
      ugBack: "Quay lại",
      ugClose: "Đóng",
      ugDelete: "Xóa",
      ugCancel: "Tiếp tục chỉnh",
      ugDiscard: "Bỏ thay đổi",
      ugUnsaved: "Bạn có thay đổi chưa lưu.",
      ugError: "Chưa lưu được. Dữ liệu của bạn vẫn được giữ lại.",
      ugConflict:
        "Dữ liệu đã được cập nhật ở nơi khác. Đóng bản nháp và tải lại trước khi lưu.",
      ugInvalid: "Kiểm tra tên, giá và quy tắc chọn.",
      ugInsufficient: "Danh sách lựa chọn chưa đủ số lượng tối thiểu của nhóm.",
      ugAffected: "Thay đổi áp dụng cho {count} món",
      ugEmpty: "Chưa có lựa chọn",
      ugRemoveGroup: "Gỡ nhóm khỏi món",
      ugSoldOut: "Hết món",
      ugPhoto: "Ảnh món",
      ugUploading: "Đang tải ảnh…",
      ugSaving: "Đang lưu…",
      ugCycle: "Liên kết này tạo vòng lặp giữa các món.",
      ugSub: "Lựa chọn con",
      ugSources: "Tự động lấy món từ phân loại",
      ugSourceHint: "Nhóm luôn có các món trong phân loại đã chọn.",
      ugRemove: "Gỡ",
      ugDeleteConfirm: "Xóa đối tượng này và các liên kết của nó?",
      ugOrderGroups: "Tùy chọn cho cả đơn",
      ugAdvanced: "Cấu hình khác",
      ugDescription: "Mô tả",
      ugCategoryLinks: "Áp dụng mặc định cho phân loại",
      ugMinimumSubtotal: "Giá trị món tối thiểu để chọn",
      ugRuleMessage: "Thông báo khi chưa đủ điều kiện",
      ugLocalStock: "Tạm ngừng lựa chọn trong nhóm",
      ugRemovePhoto: "Gỡ ảnh",
      ugRecommended: "Món đề xuất",
      ugInUse: "Món đang được dùng làm lựa chọn. Gỡ liên kết trước khi xóa.",
    },
    "zh-TW": {
      ugProduct: "編輯餐點",
      ugNewProduct: "新增餐點",
      ugGroup: "編輯選項群組",
      ugNewGroup: "新增選項群組",
      ugDetails: "詳細資料",
      ugName: "名稱",
      ugCategory: "分類",
      ugPrice: "售價",
      ugBadge: "標籤",
      ugGroups: "選項群組",
      ugRules: "選擇規則",
      ugRequired: "顧客必須選擇至少一個選項",
      ugMin: "最少選擇數量",
      ugMax: "最多選擇數量",
      ugRepeat: "允許重複選擇同一選項",
      ugIncluded: "餐點已包含的內容",
      ugOptions: "選項",
      ugLinked: "適用餐點",
      ugLink: "連結餐點",
      ugAdd: "新增選項",
      ugAddGroup: "新增群組",
      ugFromProducts: "從現有餐點選擇",
      ugFromProductsHelp: "從菜單選取餐點並設定群組內的加價。",
      ugCustom: "自訂選項",
      ugCustomHelp: "為此群組建立新的選項。",
      ugSurcharge: "群組內加價",
      ugRetail: "單點售價",
      ugQuantity: "已包含份數",
      ugDefault: "預設選取",
      ugInherited: "來自分類",
      ugDefaults: "恢復預設",
      ugOwn: "此餐點專用選項",
      ugChoose: "選擇",
      ugSearch: "搜尋",
      ugAll: "所有分類",
      ugSaveProduct: "儲存餐點",
      ugSaveGroup: "儲存群組",
      ugApply: "套用",
      ugBack: "返回",
      ugClose: "關閉",
      ugDelete: "刪除",
      ugCancel: "繼續編輯",
      ugDiscard: "放棄變更",
      ugUnsaved: "您有尚未儲存的變更。",
      ugError: "儲存失敗，您的編輯內容仍然保留。",
      ugConflict: "資料已在其他地方更新。請關閉草稿並重新載入後再儲存。",
      ugInvalid: "請檢查名稱、價格及選擇規則。",
      ugInsufficient: "選項數量不足以符合群組的最少選擇數量。",
      ugAffected: "變更將套用至 {count} 個餐點",
      ugEmpty: "尚無選項",
      ugRemoveGroup: "從餐點移除群組",
      ugSoldOut: "已售完",
      ugPhoto: "餐點圖片",
      ugUploading: "正在上傳圖片…",
      ugSaving: "正在儲存…",
      ugCycle: "此連結會造成餐點之間的循環。",
      ugSub: "子選項",
      ugSources: "自動加入分類中的餐點",
      ugSourceHint: "群組會持續包含所選分類中的餐點。",
      ugRemove: "移除",
      ugDeleteConfirm: "刪除此項目及其連結？",
      ugOrderGroups: "整筆訂單選項",
      ugAdvanced: "其他設定",
      ugDescription: "說明",
      ugCategoryLinks: "分類預設群組",
      ugMinimumSubtotal: "選取所需的最低餐點金額",
      ugRuleMessage: "未符合條件時的提示",
      ugLocalStock: "暫停此群組內的選項",
      ugRemovePhoto: "移除圖片",
      ugRecommended: "推薦餐點",
      ugInUse: "此餐點仍被選項群組使用，請先移除連結再刪除。",
    },
  };
  for (const lang of Object.keys(translations))
    Object.assign(I18N[lang], translations[lang]);
  const esc = (value) =>
    String(value ?? "").replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
  const clone = (value) => JSON.parse(JSON.stringify(value));
  const tr = (key, args) => t(key, args);
  let catalog = null,
    state = null,
    selectedGroup = null,
    returnFocus = null;
  const uid = (kind) =>
    `${getTenantIdFromUrl()}_${kind}_${crypto.randomUUID()}`;
  const groupById = (id) => catalog.groups.find((g) => g.id === id);
  const productById = (id) => catalog.products.find((p) => p.id === id);
  function options(group) {
    const result = clone(group.options || []);
    for (const source of group.sources || [])
      for (const p of catalog.products) {
        if (
          (source.type === "category"
            ? p.category_id === (source.refId || source.categoryId)
            : source.itemIds?.includes(p.id)) &&
          !result.some((o) => o.productId === p.id)
        )
          result.push({
            id: `source:${group.id}:${p.id}`,
            productId: p.id,
            price: Number(group.metadata?.legacySurcharges?.[p.id] || 0),
            quantity: 1,
            fromSource: true,
          });
      }
    return result.map((o) => {
      const p = productById(o.productId);
      return {
        ...o,
        name: p?.name || o.name,
        retailPrice: p?.price,
        isOutOfStock:
          o.isOutOfStock ||
          Boolean(
            p?.is_out_of_stock ||
            (p?.out_of_stock_until &&
              Date.parse(p.out_of_stock_until) > Date.now()),
          ),
      };
    });
  }
  function productGroups(product) {
    const direct = product.links || [];
    const inherited = catalog.categoryLinks.filter(
      (l) =>
        l.categoryId === product.categoryId &&
        !direct.some((d) => d.groupId === l.groupId),
    );
    return [...direct, ...inherited]
      .filter((l) => !l.disabled)
      .map((l) => ({
        group: groupById(l.groupId),
        link: l,
        inherited: !direct.includes(l),
      }))
      .filter((v) => v.group && v.group.scope !== "order");
  }
  function insufficient(group, link) {
    const available = options(group).filter(
      (o) => !Array.isArray(link.optionIds) || link.optionIds.includes(o.id),
    );
    const count = group.included
      ? available.reduce((n, o) => n + Number(o.quantity || 1), 0)
      : available.length;
    return group.included
      ? count !== group.minSelection || !count
      : group.minSelection > 0 &&
          (!count || (!group.allowRepeats && count < group.minSelection));
  }
  function rule(group) {
    return `${tr("ugChoose")} ${group.minSelection === group.maxSelection ? group.minSelection : `${group.minSelection}–${group.maxSelection}`}`;
  }
  function affectedIds(group) {
    const ids =
      group.itemIds ||
      catalog.links
        .filter((l) => l.groupId === group.id && !l.disabled)
        .map((l) => l.itemId);
    const cats =
      group.categoryIds ||
      catalog.categoryLinks
        .filter((l) => l.groupId === group.id)
        .map((l) => l.categoryId);
    return [...new Set([
      ...ids,
      ...catalog.products
        .filter(
          (p) =>
            cats.includes(p.category_id) &&
            !catalog.links.some(
              (l) => l.groupId === group.id && l.itemId === p.id && l.disabled,
            ),
        )
        .map((p) => p.id),
    ])];
  }
  const affected = (group) => affectedIds(group).length;
  const btn = (action, label, attrs = "") =>
    `<button type="button" data-action="${action}" ${attrs}>${esc(tr(label))}</button>`;
  const field = (key, label, value, type = "text", extra = "") =>
    `<label class="ug-field"><span>${esc(tr(label))}</span><input data-field="${key}" type="${type}" value="${esc(value)}" ${extra}></label>`;
  const toggle = (key, label, value) =>
    `<label class="ug-rule"><span>${esc(tr(label))}</span><input type="checkbox" role="switch" data-field="${key}" ${value ? "checked" : ""}></label>`;
  const stepper = (key, label, value, min = 0) =>
    `<div class="ug-rule"><label for="ug-${key}">${esc(tr(label))}</label><div class="ug-stepper">${btn("step", "ugRemove", `data-key="${key}" data-delta="-1" aria-label="${esc(tr(label))} −"`)}<input id="ug-${key}" aria-label="${esc(tr(label))}" data-field="${key}" type="number" min="${min}" max="999" value="${value}"><button type="button" data-action="step" data-key="${key}" data-delta="1" aria-label="${esc(tr(label))} +">+</button></div></div>`;
  const row = (action, title, sub, attrs = "") =>
    `<button type="button" class="ug-row" data-action="${action}" ${attrs}><span><strong>${esc(title)}</strong>${sub ? `<small>${esc(sub)}</small>` : ""}</span><span aria-hidden="true">›</span></button>`;
  function ensureDrawer() {
    let el = document.getElementById("unified-menu-drawer");
    if (el) return el;
    el = document.createElement("div");
    el.id = "unified-menu-drawer";
    el.className = "ug-overlay";
    el.hidden = true;
    el.innerHTML =
      '<section class="ug-drawer" role="dialog" aria-modal="true" aria-labelledby="ug-title" tabindex="-1"><header></header><div class="ug-body"></div><footer></footer></section>';
    el.addEventListener("click", (event) => {
      if (event.target === el) close();
      const target = event.target.closest("[data-action]");
      if (target) action(target.dataset.action, target);
    });
    el.addEventListener("input", (event) => input(event.target));
    el.addEventListener("change", (event) => {
      if (event.target.type === "checkbox" || event.target.tagName === "SELECT")
        input(event.target);
    });
    el.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        close();
      }
      if (event.key === "Tab") {
        const elements = [
          ...el.querySelectorAll(
            "button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea",
          ),
        ].filter((e) => e.getClientRects().length);
        const first = elements[0],
          last = elements.at(-1);
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    });
    document.body.appendChild(el);
    return el;
  }
  function open(kind, draft) {
    returnFocus = document.activeElement;
    state = {
      kind,
      draft,
      original: JSON.stringify(draft),
      stack: [],
      route: { page: kind },
      busy: false,
      error: "",
      scroll: 0,
    };
    const el = ensureDrawer();
    el.hidden = false;
    for (const sibling of document.body.children)
      if (sibling !== el && !sibling.inert) {
        sibling.dataset.ugInert = "1";
        sibling.inert = true;
      }
    document.body.classList.add("ug-open");
    render();
  }
  function finish() {
    ensureDrawer().hidden = true;
    state = null;
    document.body.classList.remove("ug-open");
    document.querySelectorAll("[data-ug-inert]").forEach((el) => {
      el.inert = false;
      delete el.dataset.ugInert;
    });
    returnFocus?.focus();
  }
  function close() {
    if (!state || state.busy) return;
    if (JSON.stringify(state.draft) !== state.original || state.stack.length) {
      state.confirm = "discard";
      render();
    } else finish();
  }
  function push(route) {
    state.stack.push({
      route: state.route,
      scroll: ensureDrawer().querySelector(".ug-body").scrollTop,
    });
    state.route = route;
    state.error = "";
    render();
  }
  function back() {
    const prev = state.stack.pop();
    if (!prev) return;
    state.route = prev.route;
    state.error = "";
    render(prev.scroll);
  }
  function render(scroll = 0) {
    if (!state) return;
    const el = ensureDrawer(),
      d = state.draft,
      r = state.route;
    let title = tr(state.kind === "product" ? "ugProduct" : "ugGroup"),
      body = "";
    if (r.page === "group" && d.included)
      d.minSelection = d.maxSelection = options(d).reduce(
        (n, o) => n + Number(o.quantity || 1),
        0,
      );
    if (r.page === "product") {
      const catOptions = catalog.categories
        .filter((c) => c.category_type === "catalog" || !c.category_type)
        .map(
          (c) =>
            `<option value="${esc(c.id)}" ${d.categoryId === c.id ? "selected" : ""}>${esc(c.name)}</option>`,
        )
        .join("");
      body = `<section class="ug-photo"><div class="ug-photo-frame"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8" cy="8" r="1.5"/><path d="m3 17 6-6 4 4 3-3 5 5"/></svg><img ${d.imageKey === "" && !d.imageDraft ? "hidden" : ""} src="${esc(d.imageDraft || `${WORKER_BASE}/api/image?tenant_id=${encodeURIComponent(getTenantIdFromUrl())}&name=${encodeURIComponent(d.imageKey || d.name)}`)}" alt="" onerror="this.hidden=true"></div><div><label class="ug-upload">${esc(tr("ugPhoto"))}<input type="file" accept="image/*" data-field="photo"></label>${btn("remove-photo", "ugRemovePhoto")}</div></section>${field("name", "ugName", d.name)}<label class="ug-field"><span>${esc(tr("ugCategory"))}</span><select data-field="categoryId">${catOptions}</select></label>${field("price", "ugPrice", d.price, "number", 'min="0" step="0.01"')}${field("badgeText", "ugBadge", d.badgeText)}${toggle("isRecommended", "ugRecommended", d.isRecommended)}<section><div class="ug-section-title"><h3>${esc(tr("ugGroups"))}</h3>${btn("groups", "ugAddGroup")}</div><div class="ug-list">`;
      const groups = productGroups(d);
      body +=
        groups
          .map(({ group: g, link, inherited }) =>
            row(
              "subset",
              g.name,
              `${rule(g)} · ${link.optionIds ? `${options(g).filter((o) => link.optionIds.includes(o.id)).length}/${options(g).length}` : options(g).length} ${tr("ugOptions").toLowerCase()}${inherited ? " · " + tr("ugInherited") : ""}${insufficient(g, link) ? " · " + tr("ugInsufficient") : ""}`,
              `data-id="${esc(g.id)}"`,
            ),
          )
          .join("") || `<p class="ug-muted">${esc(tr("ugEmpty"))}</p>`;
      body +=
        "</div></section>" +
        (!d.isNew ? btn("delete", "ugDelete", 'class="ug-danger"') : "");
    } else if (r.page === "group") {
      body = `<section><h3>${esc(tr("ugDetails"))}</h3>${field("name", "ugName", d.name)}</section><section><h3>${esc(tr("ugRules"))}</h3><div class="ug-list">${toggle("required", "ugRequired", d.minSelection > 0)}${stepper("minSelection", "ugMin", d.minSelection)}${stepper("maxSelection", "ugMax", d.maxSelection, 1)}</div><div class="ug-list">${toggle("allowRepeats", "ugRepeat", d.allowRepeats)}${toggle("included", "ugIncluded", d.included)}</div></section><section><div class="ug-section-title"><h3>${esc(tr("ugOptions"))} (${options(d).length})</h3>${btn("add-option", "ugAdd")}</div><div class="ug-list">${
        options(d)
          .map((o) =>
            row(
              "option",
              o.name,
              `${o.productId ? `${tr("ugRetail")} $${o.retailPrice} · ` : ""}+$${o.price}`,
              `data-id="${esc(o.id)}"`,
            ),
          )
          .join("") || `<p class="ug-muted">${esc(tr("ugEmpty"))}</p>`
      }</div></section><section><div class="ug-section-title"><h3>${esc(tr("ugLinked"))} (${affected(d)})</h3>${btn("linked", "ugLink")}</div><div class="ug-linked">${affectedIds(d).map((id) => `<div>${esc(productById(id)?.name || "")}${!d.itemIds.includes(id) ? ` <small class="ug-muted">· ${esc(tr("ugInherited"))}</small>` : ""}</div>`).join("") || `<span class="ug-muted">${esc(tr("ugEmpty"))}</span>`}</div></section><details><summary>${esc(tr("ugCategoryLinks"))}</summary>${catalog.categories
        .filter((c) => c.category_type === "catalog")
        .map(
          (c) =>
            `<label class="ug-check"><input type="checkbox" data-category-link="${esc(c.id)}" ${d.categoryIds.includes(c.id) ? "checked" : ""}>${esc(c.name)}</label>`,
        )
        .join(
          "",
        )}</details><details><summary>${esc(tr("ugSources"))}</summary><p class="ug-muted">${esc(tr("ugSourceHint"))}</p>${catalog.categories.map((c) => `<label class="ug-check"><input type="checkbox" data-source="${esc(c.id)}" ${(d.sources || []).some((s) => (s.refId || s.categoryId) === c.id) ? "checked" : ""}>${esc(c.name)}</label>`).join("")}</details>${!d.isNew ? btn("delete", "ugDelete", 'class="ug-danger"') : ""}`;
    } else if (r.page === "groups") {
      title = tr("ugAddGroup");
      body =
        search() +
        `<div class="ug-list">${catalog.groups
          .filter((g) => g.scope !== "order")
          .map((g) =>
            check(
              g.id,
              g.name,
              `${rule(g)} · ${options(g)
                .map((o) => o.name)
                .join("、")}`,
              r.ids.includes(g.id),
              "group",
            ),
          )
          .join("")}</div>`;
    } else if (r.page === "subset") {
      const g = groupById(r.id);
      title = g.name;
      body = `<p class="ug-muted">${esc(rule(g))} · ${esc(tr(r.optionIds === null ? "ugDefaults" : "ugOwn"))}</p>${btn("defaults", "ugDefaults")}<div class="ug-list">${options(
        g,
      )
        .map((o) =>
          check(
            o.id,
            o.name,
            `+$${o.price}${o.isOutOfStock ? " · " + tr("ugSoldOut") : ""}`,
            r.optionIds === null || r.optionIds.includes(o.id),
            "subset",
          ),
        )
        .join(
          "",
        )}</div>${btn("remove-group", "ugRemoveGroup", 'class="ug-danger"')}`;
    } else if (r.page === "add-option") {
      title = tr("ugAdd");
      body =
        (d.scope === "order"
          ? ""
          : row("products", tr("ugFromProducts"), tr("ugFromProductsHelp"))) +
        row("custom", tr("ugCustom"), tr("ugCustomHelp"));
    } else if (r.page === "products" || r.page === "linked") {
      title = tr(r.page === "products" ? "ugFromProducts" : "ugLink");
      body =
        search() +
        `<select class="ug-filter" data-field="filter"><option value="">${esc(tr("ugAll"))}</option>${catalog.categories.map((c) => `<option value="${esc(c.id)}">${esc(c.name)}</option>`).join("")}</select><div class="ug-list">${catalog.products.map((p) => {
          const inherited = r.page === "linked" && !r.ids.includes(p.id) && affectedIds(d).includes(p.id);
          return check(p.id, p.name, inherited ? tr("ugInherited") : `${tr("ugRetail")} $${p.price}`, inherited || r.ids.includes(p.id), "product", p.category_id, inherited);
        }).join("")}</div>`;
    } else if (r.page === "option") {
      const o = r.option;
      title = tr(o.productId ? "ugFromProducts" : "ugCustom");
      const p = productById(o.productId);
      body =
        (p
          ? `<div class="ug-product-summary"><strong>${esc(p.name)}</strong><small>${esc(tr("ugRetail"))} $${p.price}</small></div>`
          : field("option.name", "ugName", o.name)) +
        field(
          "option.price",
          "ugSurcharge",
          o.price,
          "number",
          'min="0" step="0.01"',
        ) +
        (d.included
          ? stepper("option.quantity", "ugQuantity", o.quantity, 1)
          : "") +
        toggle("option.isDefault", "ugDefault", o.isDefault) +
        `<details><summary>${esc(tr("ugAdvanced"))}</summary>${field("option.description", "ugDescription", o.description || "")}${toggle("option.isLocallyOutOfStock", "ugLocalStock", o.isLocallyOutOfStock)}${field("eligibility.min_order_subtotal", "ugMinimumSubtotal", (o.eligibilityRules || []).find((r) => r.rule_type === "min_order_subtotal")?.min_order_subtotal || 0, "number", 'min="0" step="0.01"')}${field("eligibility.error_message", "ugRuleMessage", (o.eligibilityRules || []).find((r) => r.rule_type === "min_order_subtotal")?.error_message || "")}<h3>${esc(tr("ugSub"))}</h3>${(o.subOptions || []).map((s, i) => `<div class="ug-sub-option">${field(`sub.${i}.name`, "ugName", typeof s === "string" ? s : s.name)}${field(`sub.${i}.price`, "ugSurcharge", s.price || 0, "number", 'min="0" step="0.01"')}${btn("remove-sub", "ugRemove", `data-index="${i}"`)}</div>`).join("")}${btn("add-sub", "ugAdd")}</details>${btn("remove-option", "ugRemove", 'class="ug-danger"')}`;
    }
    if (state.confirm)
      body = `<p>${esc(tr(state.confirm === "discard" ? "ugUnsaved" : "ugDeleteConfirm"))}</p>${btn("continue", "ugCancel")}${btn(state.confirm === "discard" ? "discard" : "confirm-delete", state.confirm === "discard" ? "ugDiscard" : "ugDelete", 'class="ug-danger"')}`;
    el.querySelector("header").innerHTML =
      `${state.stack.length ? btn("back", "ugBack") : ""}<h2 id="ug-title" tabindex="-1">${esc(title)}</h2>${btn("close", "ugClose", 'class="ug-close"')}`;
    el.querySelector(".ug-body").innerHTML = body;
    el.querySelector("footer").innerHTML =
      `<p class="ug-error" role="alert">${esc(state.error)}</p>${state.kind === "group" && !state.stack.length ? `<p class="ug-muted">${esc(tr("ugAffected", { count: affected(d) }))}</p>` : ""}${state.confirm ? "" : btn(state.stack.length ? "apply" : "save", state.busy ? "ugSaving" : state.stack.length ? "ugApply" : state.kind === "product" ? "ugSaveProduct" : "ugSaveGroup", `class="ug-primary" ${state.busy ? "disabled" : ""}`)}`;
    if (r.page === "group" && d.included)
      el.querySelectorAll(
        '[data-field="required"],[data-field="minSelection"],[data-field="maxSelection"],[data-field="allowRepeats"],.ug-stepper button',
      ).forEach((b) => (b.disabled = true));
    el.querySelector(".ug-body").scrollTop = scroll;
    el.querySelector("#ug-title").focus({ preventScroll: true });
    el.querySelectorAll('.ug-stepper button[data-delta="-1"]').forEach(
      (b) => (b.textContent = "−"),
    );
  }
  const search = () =>
    `<input class="ug-search" type="search" data-field="search" placeholder="${esc(tr("ugSearch"))}" aria-label="${esc(tr("ugSearch"))}">`;
  const check = (id, name, sub, checked, kind, category = "", disabled = false) =>
    `<label class="ug-check" data-search="${esc(name.toLowerCase())}" data-category="${esc(category)}"><input type="checkbox" data-check="${kind}" value="${esc(id)}" ${checked ? "checked" : ""} ${disabled ? "disabled" : ""}><span><strong>${esc(name)}</strong><small>${esc(sub)}</small></span></label>`;
  function input(el) {
    if (!state || state.busy) return;
    const r = state.route,
      d = state.draft,
      key = el.dataset.field;
    if (key === "search" || key === "filter") {
      const root = ensureDrawer(),
        q = root.querySelector('[data-field="search"]').value.toLowerCase(),
        cat = root.querySelector('[data-field="filter"]')?.value;
      root.querySelectorAll("[data-search]").forEach((row) => {
        row.hidden =
          !row.dataset.search.includes(q) ||
          Boolean(cat && row.dataset.category !== cat);
      });
      return;
    }
    if (el.dataset.check) {
      let list =
        el.dataset.check === "subset"
          ? (r.optionIds ?? options(groupById(r.id)).map((o) => o.id))
          : r.ids;
      list = list.filter((id) => id !== el.value);
      if (el.checked) list.push(el.value);
      if (el.dataset.check === "subset") r.optionIds = list;
      else r.ids = list;
      return;
    }
    if (el.dataset.categoryLink) {
      d.categoryIds = d.categoryIds.filter(
        (id) => id !== el.dataset.categoryLink,
      );
      if (el.checked) d.categoryIds.push(el.dataset.categoryLink);
      return;
    }
    if (el.dataset.source) {
      d.sources = d.sources.filter(
        (s) => (s.refId || s.categoryId) !== el.dataset.source,
      );
      if (el.checked)
        d.sources.push({ type: "category", categoryId: el.dataset.source });
      return;
    }
    if (key === "photo") {
      photo(el.files[0]);
      return;
    }
    if (!key) return;
    const value =
      el.type === "checkbox"
        ? el.checked
        : el.type === "number"
          ? Number(el.value)
          : el.value;
    if (key === "required") {
      d.minSelection = value ? Math.max(1, d.minSelection) : 0;
      d.maxSelection = Math.max(d.maxSelection, d.minSelection);
      render();
      return;
    }
    if (key.startsWith("eligibility.")) {
      r.option.eligibilityRules = r.option.eligibilityRules || [];
      let rule = r.option.eligibilityRules.find(
        (v) => v.rule_type === "min_order_subtotal",
      );
      if (!rule) {
        rule = {
          rule_type: "min_order_subtotal",
          min_order_subtotal: 0,
          threshold_basis: "merchandise_subtotal",
        };
        r.option.eligibilityRules.push(rule);
      }
      rule[key.slice(12)] = value;
    } else if (key.startsWith("option.")) r.option[key.slice(7)] = value;
    else if (key.startsWith("sub.")) {
      const [, i, k] = key.split(".");
      if (typeof r.option.subOptions[i] === "string")
        r.option.subOptions[i] = { name: r.option.subOptions[i], price: 0 };
      r.option.subOptions[i][k] = value;
    } else d[key] = value;
  }
  function action(name, el) {
    if (!state || state.busy) return;
    const d = state.draft,
      r = state.route;
    if (name === "close") return close();
    if (name === "back") return back();
    if (name === "discard") return finish();
    if (name === "continue") {
      state.confirm = null;
      return render();
    }
    if (name === "remove-photo") {
      d.imageDraft = null;
      d.imageKey = "";
      return render();
    }
    if (name === "groups")
      return push({
        page: "groups",
        ids: productGroups(d).map((v) => v.group.id),
      });
    if (name === "subset") {
      const link = d.links.find((l) => l.groupId === el.dataset.id);
      return push({
        page: "subset",
        id: el.dataset.id,
        optionIds: clone(link?.optionIds ?? null),
      });
    }
    if (name === "defaults") {
      r.optionIds = null;
      return render();
    }
    if (name === "remove-group") {
      d.links = d.links.filter((l) => l.groupId !== r.id);
      d.links.push({ groupId: r.id, optionIds: null, disabled: true });
      return back();
    }
    if (name === "add-option") return push({ page: "add-option" });
    if (name === "products") return push({ page: "products", ids: [] });
    if (name === "linked") return push({ page: "linked", ids: [...d.itemIds] });
    if (name === "custom")
      return push({
        page: "option",
        option: {
          id: uid("option"),
          name: "",
          price: 0,
          productId: null,
          quantity: 1,
          isDefault: false,
          subOptions: [],
          eligibilityRules: [],
        },
      });
    if (name === "option") {
      return push({
        page: "option",
        option: clone(options(d).find((o) => o.id === el.dataset.id)),
      });
    }
    if (name === "step") {
      const key = el.dataset.key;
      const target = ensureDrawer().querySelector(`[data-field="${key}"]`);
      target.value = Math.max(
        Number(target.min || 0),
        Number(target.value) + Number(el.dataset.delta),
      );
      input(target);
      return;
    }
    if (name === "add-sub") {
      r.option.subOptions = r.option.subOptions || [];
      r.option.subOptions.push({ name: "", price: 0 });
      return render();
    }
    if (name === "remove-sub") {
      r.option.subOptions.splice(Number(el.dataset.index), 1);
      return render();
    }
    if (name === "remove-option") {
      d.options = d.options.filter((o) => o.id !== r.option.id);
      return back();
    }
    if (name === "delete") {
      state.confirm = "delete";
      return render();
    }
    if (name === "confirm-delete") return save(true);
    if (name === "save") return save();
    if (name === "apply") {
      if (r.page === "groups") {
        d.links = d.links.filter((l) => r.ids.includes(l.groupId));
        for (const id of r.ids) {
          let l = d.links.find((l) => l.groupId === id);
          if (l) l.disabled = false;
          else if (
            !catalog.categoryLinks.some(
              (l) => l.groupId === id && l.categoryId === d.categoryId,
            )
          )
            d.links.push({ groupId: id, optionIds: null, disabled: false });
        }
        for (const l of catalog.categoryLinks.filter(
          (l) => l.categoryId === d.categoryId && !r.ids.includes(l.groupId),
        ))
          d.links.push({ groupId: l.groupId, optionIds: null, disabled: true });
      }
      if (r.page === "subset") {
        const g = groupById(r.id),
          count = g.included
            ? options(g)
                .filter(
                  (o) => r.optionIds === null || r.optionIds.includes(o.id),
                )
                .reduce((n, o) => n + Number(o.quantity || 1), 0)
            : (r.optionIds?.length ?? options(g).length);
        if (
          (g.included && count !== g.minSelection) ||
          (g.minSelection > 0 &&
            (!count || (!g.allowRepeats && count < g.minSelection)))
        ) {
          state.error = tr("ugInsufficient");
          return render();
        }
        d.links = d.links.filter((l) => l.groupId !== r.id);
        if (
          r.optionIds !== null ||
          !catalog.categoryLinks.some(
            (l) => l.groupId === r.id && l.categoryId === d.categoryId,
          )
        )
          d.links.push({
            groupId: r.id,
            optionIds: r.optionIds,
            disabled: false,
          });
      }
      if (r.page === "linked") d.itemIds = r.ids;
      if (r.page === "products") {
        for (const id of r.ids)
          if (!options(d).some((o) => o.productId === id))
            d.options.push({
              id: uid("option"),
              productId: id,
              name: productById(id).name,
              price: 0,
              quantity: 1,
              subOptions: [],
              eligibilityRules: [],
            });
        back();
        return back();
      }
      if (r.page === "option") {
        if (
          (!r.option.productId && !r.option.name.trim()) ||
          !Number.isFinite(r.option.price) ||
          r.option.price < 0
        ) {
          state.error = tr("ugInvalid");
          return render();
        }
        r.option.fromSource = false;
        const index = d.options.findIndex((o) => o.id === r.option.id);
        if (index >= 0) d.options[index] = r.option;
        else d.options.push(r.option);
        back();
        if (state.route.page === "add-option") return back();
        return;
      }
      return back();
    }
  }
  async function photo(file) {
    if (!file?.type.startsWith("image/")) return;
    const bitmap = await createImageBitmap(file),
      scale = Math.min(1, 900 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas
      .getContext("2d")
      .drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    state.draft.imageKey = `product:${state.draft.id}`;
    state.draft.imageDraft = canvas.toDataURL("image/webp", 0.85);
    render();
  }
  async function save(remove = false) {
    const d = state.draft;
    if (
      !remove &&
      (!d.name.trim() ||
        (state.kind === "product" &&
          (!Number.isFinite(d.price) || d.price < 0)) ||
        (state.kind === "group" &&
          (d.minSelection < 0 || d.maxSelection < Math.max(1, d.minSelection))))
    ) {
      state.error = tr("ugInvalid");
      return render();
    }
    if (
      !remove &&
      state.kind === "product" &&
      productGroups(d).some(({ group, link }) => insufficient(group, link))
    ) {
      state.error = tr("ugInsufficient");
      return render();
    }
    state.busy = true;
    state.error = "";
    render();
    try {
      const res = await fetch(
        `${WORKER_BASE}/api/menu/${state.kind === "product" ? "product" : "option-group"}?tenant_id=${encodeURIComponent(getTenantIdFromUrl())}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...d, delete: remove }),
        },
      );
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "MENU_SAVE_FAILED");
      const kind = state.kind;
      catalog = result.catalog;
      if (d.imageDraft && !remove) {
        const imageRes = await fetch(
          `${WORKER_BASE}/api/image?tenant_id=${encodeURIComponent(getTenantIdFromUrl())}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: d.imageKey, dataUri: d.imageDraft }),
          },
        );
        if (!imageRes.ok) {
          d.revision = catalog.products.find(
            (p) => p.id === d.id,
          )?.menu_revision;
          throw new Error("IMAGE_SAVE_FAILED");
        }
      }
      rebase(kind, d.id, remove);
      finish();
      renderMenuCategories();
      renderMenuCategoryEditor(activeCategoryIndex);
      checkMenuDirty();
    } catch (error) {
      state.busy = false;
      state.error = tr(
        error.message === "PRODUCT_IS_LINKED"
          ? "ugInUse"
          : error.message.startsWith("INVALID_")
            ? "ugInvalid"
            : error.message === "MENU_CONFLICT"
              ? "ugConflict"
              : error.message.includes("CYCLE")
                ? "ugCycle"
                : error.message.includes("INSUFFICIENT")
                  ? "ugInsufficient"
                  : "ugError",
      );
      render();
    }
  }
  function rebase(kind, id, remove) {
    const saved = JSON.parse(savedMenuSnapshot || "[]");
    for (const data of [currentMenuData, saved]) {
      if (kind === "product") {
        let old, oldCategory, oldIndex;
        for (const c of data) {
          const i = c.items?.findIndex((p) => p.id === id);
          if (i >= 0) {
            oldCategory = c;
            oldIndex = i;
            old = c.items.splice(i, 1)[0];
            break;
          }
        }
        const p = productById(id);
        if (p && !remove) {
          const c = data.find(
            (c) => (c.databaseId || c.catId) === p.category_id,
          );
          c?.items.splice(c === oldCategory ? oldIndex : c.items.length, 0, {
            ...old,
            id: p.id,
            name: p.name,
            originalName: p.name,
            price: p.price,
            badgeText: p.badge_text || "",
            isRecommended: Boolean(p.is_recommended),
            imageKey: p.image_key,
            itemType: "standard",
            bundleRule: null,
            modifierGroups: [],
            menuRevision: p.menu_revision,
          });
        }
      } else
        for (const c of data)
          if (c.groups) {
            const i = c.groups.findIndex((g) => (g.canonicalId || g.id) === id);
            if (i >= 0) {
              if (remove) c.groups.splice(i, 1);
              else {
                const g = groupById(id);
                c.groups[i] = {
                  ...c.groups[i],
                  title: g.name,
                  options: g.options,
                  minSelection: g.minSelection,
                  maxSelection: g.maxSelection,
                  isRequired: g.minSelection > 0,
                };
              }
            }
          }
    }
    savedMenuSnapshot = canonicalMenuSnapshot(saved);
  }
  window.UnifiedMenu = {
    get enabled() {
      return Boolean(catalog);
    },
    imageKey(catId, name) {
      return catalog?.products.find(
        (p) =>
          p.name === name &&
          (p.category_id === catId ||
            catalog.categories.some(
              (c) => c.id === p.category_id && c.slug === catId,
            )),
      )?.image_key;
    },
    groupCount(id) {
      const p = productById(id);
      return p
        ? productGroups({
            categoryId: p.category_id,
            links: catalog.links.filter((l) => l.itemId === id),
          }).length
        : 0;
    },
    async load() {
      const res = await fetch(
        `${WORKER_BASE}/api/menu/options?tenant_id=${encodeURIComponent(getTenantIdFromUrl())}`,
      );
      if (!res.ok) throw new Error("MENU_UNAVAILABLE");
      catalog = await res.json();
    },
    product(cIdx, iIdx) {
      syncMenuDataFromDOM();
      const c = currentMenuData[cIdx],
        local = c?.items?.[iIdx],
        p = local ? productById(local.id) : null;
      if (!c) return;
      open("product", {
        id: local?.id || uid("product"),
        isNew: !p,
        name: local?.name || "",
        price: Number(local?.price || 0),
        categoryId: p?.category_id || c.databaseId || c.catId,
        badgeText: local?.badgeText || "",
        isRecommended: local?.isRecommended || false,
        revision: Number(p?.menu_revision || 0),
        links: clone(catalog.links.filter((l) => l.itemId === local?.id)),
        imageKey:
          p?.image_key ??
          (local ? `${c.id}_${local.originalName || local.name}` : null),
      });
    },
    group(id) {
      const g = groupById(id);
      open(
        "group",
        g
          ? {
              ...clone(g),
              isNew: false,
              categoryIds: catalog.categoryLinks
                .filter((l) => l.groupId === id)
                .map((l) => l.categoryId),
              itemIds: catalog.links
                .filter((l) => l.groupId === id && !l.disabled)
                .map((l) => l.itemId),
            }
          : {
              id: uid("group"),
              isNew: true,
              name: "",
              minSelection: 0,
              maxSelection: 1,
              allowRepeats: false,
              included: false,
              options: [],
              sources: [],
              labels: {},
              revision: 0,
              itemIds: [],
              categoryIds: [],
            },
      );
    },
    sidebar() {
      if (!catalog || menuSidebarTab !== "options") return false;
      const root = document.getElementById("menu-categories");
      if (!root) return false;
      root.innerHTML =
        btn("new-group", "ugNewGroup") +
        catalog.groups
          .map(
            (g) =>
              `<button class="menu-option-card ${selectedGroup === g.id ? "active" : ""}" data-group="${esc(g.id)}"><span class="menu-option-card-content"><strong>${esc(g.name)}${g.scope === "order" ? " · " + esc(tr("ugOrderGroups")) : ""}</strong><small>${options(g).length} ${esc(tr("ugOptions"))}</small></span><span>›</span></button>`,
          )
          .join("");
      root.querySelector("[data-action]").onclick = () => this.group();
      root.querySelectorAll("[data-group]").forEach(
        (b) =>
          (b.onclick = () => {
            selectedGroup = b.dataset.group;
            this.sidebar();
            this.workspace();
          }),
      );
      this.workspace();
      return true;
    },
    workspace() {
      if (!catalog || menuSidebarTab !== "options") return false;
      const root = document.getElementById("menu-editor-body");
      if (!root) return true;
      const group =
        groupById(selectedGroup) ||
        catalog.groups.find((g) => g.scope !== "order");
      selectedGroup = group?.id;
      for (const id of [
        "btn-category-rename",
        "btn-category-delete",
        "btn-menu-create-unified",
      ]) {
        const b = document.getElementById(id);
        if (b) b.style.display = "none";
      }
      document.getElementById("menu-editor-title").textContent =
        group?.name || tr("ugGroups");
      root.classList.remove("is-catalog");
      root.innerHTML = group
        ? `<div class="ug-workspace"><div class="ug-section-title"><h3>${esc(group.name)}</h3>${btn("edit", "ugGroup")}</div><p class="ug-muted">${esc(rule(group))} · ${esc(tr("ugAffected", { count: affected(group) }))}</p><div class="ug-list">${options(
            group,
          )
            .map(
              (o) =>
                `<div class="ug-row"><span><strong>${esc(o.name)}</strong><small>${o.productId ? `${esc(tr("ugRetail"))} <s>$${o.retailPrice}</s> · ` : ""}+$${o.price}</small></span>${o.isOutOfStock ? `<span>${esc(tr("ugSoldOut"))}</span>` : ""}</div>`,
            )
            .join("")}</div></div>`
        : "";
      root
        .querySelector('[data-action="edit"]')
        ?.addEventListener("click", () => this.group(group.id));
      return true;
    },
  };
})();
