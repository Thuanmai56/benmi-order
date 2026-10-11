/* Canonical option groups use the existing cart/receipt snapshot envelope. */
(() => {
  let context = null;
  const esc = (v) =>
    String(v ?? "").replace(
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
  const vi = () =>
    (typeof currentLocale !== "undefined"
      ? currentLocale
      : document.documentElement.lang) === "vi";
  const msg = (zh, vn) => (vi() ? vn : zh);
  const options = (g) => g.eligibleItems || g.options || [];
  const minimum = (g) =>
    g.included
      ? options(g).reduce((n, o) => n + Number(o.quantity || 1), 0)
      : Number(g.minSelection ?? g.minQuantity ?? 0);
  const maximum = (g) =>
    g.included ? minimum(g) : Number(g.maxSelection ?? g.maxQuantity ?? 1);
  function merchandiseSubtotal() {
    let sum = Object.keys(cart || {}).reduce((n, key) => {
      const info = resolveCatalogItem(key);
      return (
        n +
        Number(info?.targetItem?.price ?? info?.basePrice ?? info?.price ?? 0) *
          Number(cart[key] || 0)
      );
    }, 0);
    if (context && context.index >= Number(cart[context.key] || 0))
      sum += Number(context.price);
    return sum;
  }
  const unavailable = (o) =>
    o.isOutOfStock ||
    (o.eligibilityRules || []).some(
      (r) => Number(r.min_order_subtotal || 0) > merchandiseSubtotal(),
    );
  function defaults(groups, saved = []) {
    return groups.map((g) => {
      const old = saved.find(
        (s) => s.groupId === g.id || s.groupId === g.metadata?.legacyGroupId,
      );
      return {
        groupId: g.id,
        groupName: g.name,
        items: old
          ? old.items.flatMap((s) =>
              Array.from({ length: Number(s.quantity || 1) }, () => {
                const o = options(g).find(
                  (o) =>
                    o.id === (s.optionId || s.itemId) ||
                    o.productId === s.itemId,
                );
                return o ? make(o, s) : s;
              }),
            )
          : options(g)
              .filter((o) => !unavailable(o) && (g.included || o.isDefault))
              .flatMap((o) =>
                Array.from(
                  { length: g.included ? Number(o.quantity || 1) : 1 },
                  () => make(o),
                ),
              ),
      };
    });
  }
  function restore(rule, saved = [], legacy = {}, legacyProductChoice = "") {
    const selections = [...saved];
    for (const g of rule.groups) {
      if (
        selections.some(
          (v) => v.groupId === g.id || v.groupId === g.metadata?.legacyGroupId,
        )
      )
        continue;
      const aliases = [
        g.id,
        g.metadata?.source_id,
        g.metadata?.slug,
        g.metadata?.legacy_key,
        g.name,
      ].filter(Boolean);
      const selected = aliases.map((id) => legacy.single?.[id]).find(Boolean);
      const multiple = aliases
        .map((id) => legacy.multiple?.[id])
        .find((v) => Array.isArray(v));
      const choices = options(g).filter(
        (o) =>
          o.name === selected ||
          multiple?.includes(o.name) ||
          legacy.multiple?.[o.name] === true ||
          (!g.included && maximum(g) === 1 && o.productId && o.name === legacyProductChoice),
      );
      if (choices.length)
        selections.push({
          groupId: g.id,
          items: choices.map((o) => ({
            optionId: o.id,
            itemId: o.productId || o.id,
            quantity: 1,
          })),
        });
    }
    return defaults(rule.groups, selections);
  }
  function make(o, s = {}) {
    return {
      itemId: o.productId || o.id,
      optionId: o.id,
      name: o.name,
      quantity: 1,
      surcharge: Number(o.price || 0),
      groups: defaults(
        o.optionGroups || [],
        s.groups ||
          (o.optionGroups || []).map((g) => ({
            groupId: g.id,
            items: (s.modifiers || [])
              .filter((m) => m.groupId === g.id)
              .map((m) => ({
                optionId:
                  m.optionId || options(g).find((v) => v.name === m.name)?.id,
                quantity: 1,
              })),
          })),
      ),
      subOptions: s.subOptions || [],
    };
  }
  function extra(groups) {
    return groups.reduce(
      (sum, g) =>
        sum +
        g.items.reduce(
          (n, i) =>
            n +
            (i.surcharge +
              extra(i.groups || []) +
              (i.subOptions || []).reduce(
                (s, o) => s + Number(o.price || 0),
                0,
              )) *
              Number(i.quantity || 1),
          0,
        ),
      0,
    );
  }
  function invalid(groups, saved) {
    if (!saved || saved.length !== groups.length) return true;
    return groups.some((g) => {
      const selections = saved.find((s) => s.groupId === g.id)?.items || [],
        count = selections.reduce((sum, i) => sum + Number(i.quantity || 1), 0);
      if (count < minimum(g) || count > maximum(g)) return true;
      if (
        !g.allowRepeats &&
        !g.included &&
        new Set(selections.map((s) => s.optionId)).size !== selections.length
      )
        return true;
      if (
        g.included &&
        options(g).some(
          (o) =>
            selections.filter((s) => s.optionId === o.id).length !==
            Number(o.quantity || 1),
        )
      )
        return true;
      return selections.some((i) => {
        const o = options(g).find((o) => o.id === (i.optionId || i.itemId));
        return (
          !o ||
          unavailable(o) ||
          Number(o.price || 0) !== i.surcharge ||
          invalid(o.optionGroups || [], i.groups || [])
        );
      });
    });
  }
  function drawGroups(groups, selections, path = []) {
    return groups
      .map((g, gi) => {
        const selection = selections[gi];
        const key = [...path, gi].join(".");
        const count = selection.items.length;
        return `<section class="uoc-group"><h3>${esc(g.name)} <small>${minimum(g) === maximum(g) ? minimum(g) : `${minimum(g)}–${maximum(g)}`} · ${count}/${maximum(g)}</small></h3>${options(
          g,
        )
          .map((o, oi) => {
            const chosen = selection.items.filter(
              (s) => s.optionId === o.id,
            ).length;
            return `<div class="uoc-choice ${unavailable(o) ? "is-oos" : ""}"><button type="button" data-choose="${key}" data-option="${oi}" ${unavailable(o) || g.included ? "disabled" : ""} aria-pressed="${chosen > 0}"><span>${esc(o.name)}<small>+$${Number(o.price || 0)}${o.isOutOfStock ? " · " + msg("已售完", "Hết món") : unavailable(o) ? " · " + esc((o.eligibilityRules || []).find((r) => r.min_order_subtotal > merchandiseSubtotal())?.error_message || msg("未達最低餐點金額", "Chưa đạt giá trị món tối thiểu")) : ""}</small></span><span>${g.included ? `×${chosen}` : g.allowRepeats ? "+" : chosen ? "✓" : "○"}</span></button>${g.allowRepeats && !g.included && chosen ? `<button type="button" data-minus="${key}" data-option="${oi}" aria-label="${msg("減少", "Giảm")} ${esc(o.name)}">− ${chosen}</button>` : ""}</div>`;
          })
          .join("")}${selection.items
          .map((item, si) => {
            const o = options(g).find((o) => o.id === item.optionId);
            if (!o) return "";
            const nested = drawGroups(o.optionGroups || [], item.groups, [
              ...path,
              gi,
              si,
            ]);
            const sub = (o.subOptions || [])
              .map(
                (s, i) =>
                  `<label class="uoc-sub"><input type="checkbox" data-sub="${[...path, gi, si].join(".")}" data-index="${i}" ${s.isOutOfStock || s.isOos ? "disabled" : ""} ${(item.subOptions || []).some((v) => (v.id || v.name) === (s.id || s.name || s)) ? "checked" : ""}><span>${esc(s.name || s)} +$${Number(s.price || 0)}</span></label>`,
              )
              .join("");
            return nested || sub
              ? `<div class="uoc-nested"><h4>${esc(item.name)}${g.allowRepeats ? ` · ${si + 1}` : ""}</h4>${nested}${sub}</div>`
              : "";
          })
          .join("")}</section>`;
      })
      .join("");
  }
  function root() {
    let el = document.getElementById("unified-option-modal");
    if (el) return el;
    el = document.createElement("div");
    el.id = "unified-option-modal";
    el.className = "uoc-overlay";
    el.hidden = true;
    el.innerHTML =
      '<section class="uoc-panel" role="dialog" aria-modal="true" aria-labelledby="uoc-title"><header><h2 id="uoc-title" tabindex="-1"></h2><button type="button" data-close>×</button></header><div class="uoc-body"></div><footer><p role="alert"></p><button type="button" data-confirm></button></footer></section>';
    el.addEventListener("click", (event) => {
      if (event.target === el || event.target.closest("[data-close]"))
        return close();
      const b = event.target.closest("[data-choose],[data-minus]");
      if (b) {
        const key = b.dataset.choose || b.dataset.minus;
        const { group, selection } = locate(key);
        const o = options(group)[Number(b.dataset.option)];
        const idx = selection.items.findIndex((s) => s.optionId === o.id);
        if (b.dataset.minus) {
          if (idx >= 0) selection.items.splice(idx, 1);
        } else if (!group.allowRepeats && idx >= 0)
          selection.items.splice(idx, 1);
        else if (maximum(group) === 1) selection.items = [make(o)];
        else if (selection.items.length < maximum(group))
          selection.items.push(make(o));
        render();
      }
      if (event.target.closest("[data-confirm]")) confirm();
    });
    el.addEventListener("change", (event) => {
      const input = event.target;
      if (!input.dataset.sub) return;
      const nums = input.dataset.sub.split(".").map(Number),
        si = nums.pop();
      const { group, selection } = locate(nums.join("."));
      const item = selection.items[si],
        o = options(group).find((o) => o.id === item.optionId),
        s = o.subOptions[Number(input.dataset.index)],
        id = s.id || s.name || s;
      item.subOptions = item.subOptions.filter((s) => (s.id || s.name) !== id);
      if (input.checked)
        item.subOptions.push({
          id,
          name: s.name || s,
          price: Number(s.price || 0),
        });
      render();
    });
    el.addEventListener("keydown", (event) => {
      if (event.key === "Escape") close();
      if (event.key === "Tab") {
        const list = [
            ...el.querySelectorAll("button:not(:disabled),input"),
          ].filter((e) => e.getClientRects().length),
          first = list[0],
          last = list.at(-1);
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    });
    document.body.appendChild(el);
    return el;
  }
  function locate(path) {
    const indexes = path.split(".").map(Number);
    let groups = context.rule.groups,
      selections = context.groups;
    while (indexes.length > 1) {
      const gi = indexes.shift(),
        si = indexes.shift();
      const item = selections[gi].items[si],
        o = options(groups[gi]).find((o) => o.id === item.optionId);
      groups = o.optionGroups;
      selections = item.groups;
    }
    const gi = indexes[0];
    return { group: groups[gi], selection: selections[gi] };
  }
  function render() {
    const el = root(),
      body = el.querySelector(".uoc-body"),
      scroll = body.scrollTop;
    el.querySelector("h2").textContent = context.name;
    body.innerHTML = drawGroups(context.rule.groups, context.groups);
    body.scrollTop = scroll;
    const b = el.querySelector("[data-confirm]");
    b.textContent = `${msg("確認", "Xác nhận")} · $${Number(context.price) + extra(context.groups)}`;
    el.querySelector("[data-close]").setAttribute(
      "aria-label",
      msg("關閉", "Đóng"),
    );
  }
  function close() {
    root().hidden = true;
    document.querySelectorAll("[data-uoc-inert]").forEach((el) => {
      el.inert = false;
      delete el.dataset.uocInert;
    });
    const focus = context?.focus;
    context = null;
    document.body.style.overflow = "";
    focus?.focus();
  }
  function receipt(groups) {
    return groups.map((g) => ({
      ...g,
      items: g.items.map((i) => {
        const nested = receipt(i.groups || []);
        return {
          ...i,
          price: 0,
          groups: nested,
          modifiers: [
            ...nested.flatMap((g) =>
              g.items.map((i) => ({
                groupId: g.groupId,
                name: `${i.name}${i.quantity > 1 ? ` ×${i.quantity}` : ""}${i.modifiers?.length ? ` (${i.modifiers.map((m) => m.name).join("、")})` : ""}`,
                price:
                  (i.surcharge +
                    (i.modifiers || []).reduce(
                      (s, m) => s + Number(m.price || 0),
                      0,
                    )) *
                  i.quantity,
              })),
            ),
            ...(i.subOptions || []),
          ],
        };
      }),
    }));
  }
  function confirm() {
    if (invalid(context.rule.groups, context.groups)) {
      root().querySelector('[role="alert"]').textContent = msg(
        "請完成所有必選項目",
        "Vui lòng chọn đủ các nhóm bắt buộc",
      );
      return;
    }
    const { key, index, cat, name } = context;
    window.bundleCartData = window.bundleCartData || {};
    window.bundleCartData[key] = window.bundleCartData[key] || [];
    if (window.customizeData?.[key]?.[index]) {
      const old = window.customizeData[key][index];
      window.customizeData[key][index] = {
        single: {},
        multiple: {},
        note: old.note || "",
      };
    }
    window.bundleCartData[key][index] = {
      portionIndex: index,
      groups: receipt(context.groups),
    };
    cart[key] = Math.max(Number(cart[key] || 0), index + 1);
    const qty = document.getElementById(`qty-${cat}-${name}`);
    if (qty) qty.textContent = String(cart[key]);
    const b = document.getElementById(`bundle-edit-btn-${cat}-${name}`);
    if (b) b.style.display = "flex";
    close();
    updateTotal();
  }
  window.UnifiedOptions = {
    restore,
    open(cat, name, index) {
      const key = cat + "_" + name,
        info = resolveCatalogItem(key),
        rule = info.bundleRule || info.targetItem?.bundleRule;
      index = Number.isInteger(index) ? index : Number(cart[key] || 0);
      context = {
        key,
        cat,
        name,
        rule,
        index,
        price: info.targetItem?.price ?? info.price ?? 0,
        groups: restore(
          rule,
          window.bundleCartData?.[key]?.[index]?.groups,
          window.customizeData?.[key]?.[index],
          window.comboDrinkData?.[name]?.[index],
        ),
        focus: document.activeElement,
      };
      root().hidden = false;
      for (const el of document.body.children)
        if (el !== root() && !el.inert) {
          el.dataset.uocInert = "1";
          el.inert = true;
        }
      document.body.style.overflow = "hidden";
      render();
      root().querySelector("h2").focus();
    },
    valid(rule, portion) {
      return !invalid(rule.groups, portion?.groups);
    },
  };
})();
