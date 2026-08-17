// ==========================================
// Benmi POS - Module: Menu Editor & Stock
// ==========================================

let currentMenuData = null;   // Array form for editor
let rawMenuData = null;       // Original object form from API
let activeCategoryIndex = -1;
let isMenuDirty = false;

const BENMI_CATS = [
  { id: "small", label: "小麵包 (Bánh mì nhỏ)" },
  { id: "large", label: "大麵包 (Bánh mì lớn)" },
  { id: "combo", label: "套餐 (Combo + Nước)" },
  { id: "drinks", label: "單點飲料 (Đồ uống)" },
  { id: "topping", label: "加料 (Topping)" }
];

function markMenuDirty() {
  isMenuDirty = true;
  const btn = document.querySelector("#view-menu .btn-primary");
  if (btn) {
    btn.style.backgroundColor = "var(--brand-red)";
    btn.innerText = "Lưu thay đổi (Chưa lưu *)";
  }
}

function clearMenuDirty() {
  isMenuDirty = false;
  const btn = document.querySelector("#view-menu .btn-primary");
  if (btn) {
    btn.style.backgroundColor = ""; // revert to CSS default
    btn.innerText = "Lưu thay đổi (Lưu Menu)";
  }
}

function openMenuSettings() {
  activeTab = "menu";
  document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
  document.querySelectorAll(".content").forEach(c => c.style.display = "none");
  const viewMenu = document.getElementById("view-menu");
  if (viewMenu) viewMenu.style.display = "block";
  if (!currentMenuData) loadMenuData();
}

async function loadMenuData() {
  const bodyEl = document.getElementById("menu-editor-body");
  if (bodyEl) bodyEl.innerHTML = `<div style="text-align:center; padding: 22px; color:#999;">Đang tải menu...</div>`;
  try {
    const tenantId = getTenantIdFromUrl();
    const res = await fetch(`${WORKER_BASE}/api/tenant/bootstrap?tenant_id=${tenantId}&_t=${Date.now()}`);
    if (!res.ok) throw new Error("Failed to load bootstrap");
    const data = await res.json();

    const categories = [];
    if (data.catalog) {
      data.catalog.forEach(cat => {
        categories.push({
          id: cat.slug,
          title: cat.name,
          items: cat.items.map(it => ({
            name: it.name,
            price: it.price,
            isOos: it.isOutOfStock,
            originalName: it.name
          }))
        });
      });
    }
    if (data.modifiers) {
      data.modifiers.forEach(mod => {
        if (!categories.some(c => c.id === mod.slug)) {
          categories.push({
            id: mod.slug,
            title: `[Tùy biến] ${mod.name}`,
            items: mod.options.map(opt => ({
              name: opt.name,
              price: opt.price,
              isOos: opt.isOutOfStock,
              originalName: opt.name
            }))
          });
        }
      });
    }

    currentMenuData = categories.length > 0 ? categories : BENMI_CATS.map(cat => ({
      id: cat.id,
      title: cat.label,
      items: []
    }));

    activeCategoryIndex = -1;
    renderMenuCategories();
    if (bodyEl) bodyEl.innerHTML = `<div style="text-align:center; padding: 22px; color:#999;">請先從左側選擇分類</div>`;
    const titleEl = document.getElementById("menu-editor-title");
    if (titleEl) titleEl.innerText = "分類項目";
  } catch (e) {
    console.warn("Bootstrap load failed, falling back to legacy /api/menu:", e);
    try {
      const res = await fetch(`${WORKER_BASE}/api/menu?tenant_id=${getTenantIdFromUrl()}&_t=${Date.now()}`);
      if (!res.ok) throw new Error("Failed to load");
      rawMenuData = await res.json();
      currentMenuData = BENMI_CATS.map(cat => ({
        id: cat.id,
        title: cat.label,
        items: Object.entries(rawMenuData[cat.id] || {}).map(([name, price]) => {
          const isOos = rawMenuData.out_of_stock && rawMenuData.out_of_stock.includes(`${cat.id}:${name}`);
          return { name, price, isOos, originalName: name };
        })
      }));
      activeCategoryIndex = -1;
      renderMenuCategories();
      if (bodyEl) bodyEl.innerHTML = `<div style="text-align:center; padding: 22px; color:#999;">請先從左側選擇分類</div>`;
      const titleEl = document.getElementById("menu-editor-title");
      if (titleEl) titleEl.innerText = "分類項目";
    } catch (err2) {
      alert("無法載入菜單資料：" + err2.message);
    }
  }
}

function renderMenuCategories() {
  const container = document.getElementById("menu-categories");
  if (!container) return;
  container.innerHTML = "";
  if (!currentMenuData) return;
  currentMenuData.forEach((cat, index) => {
    const div = document.createElement("div");
    div.style.cssText = `
      padding: 16px; border-bottom: 1px solid #eee; cursor: pointer; font-weight: 1000; font-size: 16px;
      background: ${activeCategoryIndex === index ? '#f3f4f6' : '#fff'};
      border-left: 4px solid ${activeCategoryIndex === index ? 'var(--brand-red)' : 'transparent'};
      display: flex; justify-content: space-between; align-items: center;
    `;
    div.innerHTML = `
      <span>${escapeHtml(cat.title)}</span>
      <span style="font-size: 13px; font-weight: 900; color: var(--muted);">${cat.items.length} 項</span>
    `;
    div.onclick = () => {
      syncMenuDataFromDOM();
      activeCategoryIndex = index;
      renderMenuCategories();
      renderMenuCategoryEditor(index);
    };
    container.appendChild(div);
  });
}

function renderMenuCategoryEditor(index) {
  if (!currentMenuData || !currentMenuData[index]) return;
  const cat = currentMenuData[index];
  const titleEl = document.getElementById("menu-editor-title");
  if (titleEl) titleEl.innerText = cat.title + " (全部 " + cat.items.length + " 項)";

  const container = document.getElementById("menu-editor-body");
  if (!container) return;
  container.innerHTML = "";

  let draggedItemIndex = null;

  cat.items.forEach((item, iIdx) => {
    const row = document.createElement("div");
    row.style.cssText = "background: #fff; border: 1px solid var(--border); border-radius: 12px; padding: 14px; margin-bottom: 12px; display: flex; align-items: center; gap: 12px; transition: opacity 0.2s; cursor: grab;";
    row.draggable = true;

    row.addEventListener("dragstart", (e) => {
      draggedItemIndex = iIdx;
      e.dataTransfer.effectAllowed = "move";
      setTimeout(() => row.style.opacity = "0.4", 0);
    });
    row.addEventListener("dragend", () => { row.style.opacity = "1"; });
    row.addEventListener("dragover", (e) => {
      e.preventDefault();
      row.style.border = "2px dashed var(--primary)";
    });
    row.addEventListener("dragleave", () => {
      row.style.border = "1px solid var(--border)";
    });
    row.addEventListener("drop", (e) => {
      e.preventDefault();
      row.style.border = "1px solid var(--border)";
      if (draggedItemIndex !== null && draggedItemIndex !== iIdx) {
        syncMenuDataFromDOM();
        const arr = currentMenuData[index].items;
        const moved = arr.splice(draggedItemIndex, 1)[0];
        arr.splice(iIdx, 0, moved);
        markMenuDirty();
        renderMenuCategoryEditor(index);
      }
    });

    const oosBg = item.isOos ? '#fee2e2' : '#d1fae5';
    const oosColor = item.isOos ? '#b91c1c' : '#065f46';
    const oosBorder = item.isOos ? '#fca5a5' : '#6ee7b7';
    const oosText = item.isOos ? '🔴 Hết' : '🟢 Còn';

    row.innerHTML = `
      <div style="color: #ccc; font-size: 22px; cursor: grab; flex-shrink:0;">☰</div>
      <input type="text" value="${escapeHtml(item.name)}" data-name-cidx="${index}" data-name-iidx="${iIdx}" oninput="markMenuDirty()"
        style="flex: 2; min-width: 120px; font-size: 17px; font-weight: 900; padding: 10px; border: 1px solid #ccc; border-radius: 8px; font-family:inherit; box-sizing:border-box;">
      <label style="display:flex; align-items:center; gap:6px; font-weight:900; flex-shrink:0;">
        <span style="font-size:18px;">$</span>
        <input type="number" value="${item.price !== null && item.price !== undefined ? item.price : ''}" data-cidx="${index}" data-iidx="${iIdx}" oninput="markMenuDirty()"
          placeholder="隱藏" style="width: 90px; font-size: 17px; font-weight: 900; padding: 10px; border: 1px solid #ccc; border-radius: 8px; font-family:inherit; box-sizing:border-box;">
      </label>
      <button class="btn" style="padding: 8px 14px; font-size:14px; flex-shrink:0; background: ${oosBg}; color: ${oosColor}; border: 1px solid ${oosBorder}; border-radius: 8px; font-weight: 900;"
        onclick="openStockModal(${index}, ${iIdx})">${oosText}</button>
      <button class="btn btn-ghost" style="padding: 8px 14px; font-size:14px; flex-shrink:0;" onclick="openImageModal('${cat.id}', '${escapeHtml(item.name)}')">📷 Ảnh</button>
      <button class="btn btn-ghost" style="padding: 8px 14px; color: var(--brand-red); font-size:14px; flex-shrink:0;" onclick="removeMenuItemAt(${index}, ${iIdx})">刪除</button>
    `;
    container.appendChild(row);
  });
}

function removeMenuItemAt(cIdx, iIdx) {
  if (confirm("確定要刪除這個項目嗎?")) {
    syncMenuDataFromDOM();
    currentMenuData[cIdx].items.splice(iIdx, 1);
    markMenuDirty();
    renderMenuCategoryEditor(cIdx);
    renderMenuCategories();
  }
}

function addNewMenuItem() {
  if (activeCategoryIndex < 0 || !currentMenuData) return;
  syncMenuDataFromDOM();
  currentMenuData[activeCategoryIndex].items.unshift({ name: "新項目", price: 0 });
  markMenuDirty();
  renderMenuCategoryEditor(activeCategoryIndex);
  renderMenuCategories();
}

function syncMenuDataFromDOM() {
  if (!currentMenuData) return;
  document.querySelectorAll("#menu-editor-body input[data-name-cidx]").forEach(inp => {
    const cIdx = parseInt(inp.getAttribute("data-name-cidx"), 10);
    const iIdx = parseInt(inp.getAttribute("data-name-iidx"), 10);
    if (currentMenuData[cIdx] && currentMenuData[cIdx].items[iIdx]) {
      currentMenuData[cIdx].items[iIdx].name = inp.value;
    }
  });
  document.querySelectorAll("#menu-editor-body input[data-cidx]").forEach(inp => {
    const cIdx = parseInt(inp.getAttribute("data-cidx"), 10);
    const iIdx = parseInt(inp.getAttribute("data-iidx"), 10);
    const val = inp.value.trim() === "" ? null : parseInt(inp.value, 10);
    if (currentMenuData[cIdx] && currentMenuData[cIdx].items[iIdx]) {
      currentMenuData[cIdx].items[iIdx].price = val;
    }
  });
}

async function saveMenuData() {
  if (!currentMenuData) return;
  if (!confirm("確定要儲存所有變更嗎？這會直接即時影響顧客端點餐頁面。")) return;
  syncMenuDataFromDOM();

  // Convert back to Benmi object format
  const output = {};
  currentMenuData.forEach(cat => {
    output[cat.id] = {};
    cat.items.forEach(item => {
      if (item.name && item.name.trim() !== "" && item.price !== null) {
        output[cat.id][item.name.trim()] = item.price;
      }
    });
  });

  const btn = document.querySelector("#view-menu .btn-primary");
  const oldText = btn ? btn.innerText : "";
  if (btn) { btn.innerText = "儲存中..."; btn.disabled = true; }

  try {
    const res = await fetch(`${WORKER_BASE}/api/menu?tenant_id=${getTenantIdFromUrl()}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(output)
    });
    if (!res.ok) throw new Error("API returned " + res.status);
    clearMenuDirty();
    alert("儲存成功！");
    renderMenuCategories();
  } catch (e) {
    alert("儲存失敗：" + e.message);
  } finally {
    if (btn) { btn.innerText = "Lưu thay đổi (Lưu Menu)"; btn.disabled = false; }
  }
}

async function restoreDefaultMenu() {
  if (!confirm("Bạn có chắc chắn muốn KHÔI PHỤC MENU về trạng thái gốc mặc định không? Tất cả các món bạn đã sửa sẽ bị ghi đè!")) return;

  const DEFAULT_MENU = {
    small: { "燒肉": 56, "火腿": 56, "雞肉": 68, "烤肉": 72, "雙層烤肉": 78, "綜合": 79 },
    large: { "燒肉": 80, "火腿": 80, "雞肉": 100, "烤肉": 105, "雙層烤肉": 115, "綜合": 130 },
    combo: {
      "1 大燒肉+飲料": 90, "2 大火腿+飲料": 90, "3 大雞肉+飲料": 118, "4 大烤肉+飲料": 128,
      "5 大雙層烤肉+飲料": 135, "6 大綜合+飲料": 142, "7 小燒肉+飲料": 77, "8 小雞肉+飲料": 88,
      "9 小烤肉+飲料": 95, "10 小雙層烤肉+飲料": 99, "11 小綜合+飲料": 100
    },
    drinks: { "越南咖啡": 48, "豆漿": 37, "紅茶": 37, "可樂": 37, "雪碧": 37 },
    topping: { "起司": 15, "火腿": 20, "燒肉": 20, "烤肉": 25, "雞肉": 25 }
  };

  try {
    const res = await fetch(`${WORKER_BASE}/api/menu?tenant_id=${getTenantIdFromUrl()}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(DEFAULT_MENU)
    });
    if (!res.ok) throw new Error("API returned " + res.status);
    alert("Đã khôi phục menu gốc thành công!");
    loadMenuData(); // Reload from server
  } catch (e) {
    alert("Lỗi khi khôi phục menu: " + e.message);
  }
}

// --- Image Management ---
let currentImageItemName = null;

async function openImageModal(categoryId, itemName) {
  currentImageItemName = `${categoryId}_${itemName}`;
  document.getElementById("image-modal-title").innerText = `Ảnh: ${itemName}`;
  document.getElementById("image-preview").style.display = "none";
  document.getElementById("btn-delete-image").style.display = "none";
  document.getElementById("image-status").innerText = "Đang kiểm tra ảnh...";

  document.getElementById("imageModal").style.display = "flex";

  try {
    const res = await fetch(`${WORKER_BASE}/api/image_list?tenant_id=${getTenantIdFromUrl()}&_t=${Date.now()}`);
    if (res.ok) {
      const list = await res.json();
      if (list.includes(currentImageItemName)) {
        document.getElementById("image-preview").src = `${WORKER_BASE}/api/image?tenant_id=${getTenantIdFromUrl()}&name=${encodeURIComponent(currentImageItemName)}&_t=${Date.now()}`;
        document.getElementById("image-preview").style.display = "block";
        document.getElementById("btn-delete-image").style.display = "block";
        document.getElementById("image-status").innerText = "Món này đã có ảnh";
      } else {
        document.getElementById("image-status").innerText = "Món này chưa có ảnh";
      }
    }
  } catch (e) {
    document.getElementById("image-status").innerText = "Lỗi khi tải ảnh";
  }
}

function handleImageSelect(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function (e) {
    const img = new Image();
    img.onload = function () {
      // Resize if too large
      const MAX_WIDTH = 800;
      const MAX_HEIGHT = 800;
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > MAX_WIDTH) {
          height *= MAX_WIDTH / width;
          width = MAX_WIDTH;
        }
      } else {
        if (height > MAX_HEIGHT) {
          width *= MAX_HEIGHT / height;
          height = MAX_HEIGHT;
        }
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, width, height);

      // Get base64 (webp is usually smaller)
      const dataUri = canvas.toDataURL("image/webp", 0.8);
      uploadImage(dataUri);
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
  event.target.value = ''; // reset
}

async function uploadImage(dataUri) {
  document.getElementById("image-status").innerText = "Đang tải ảnh lên...";
  try {
    const res = await fetch(`${WORKER_BASE}/api/image?tenant_id=${getTenantIdFromUrl()}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: currentImageItemName, dataUri })
    });
    if (!res.ok) throw new Error("Upload failed");

    document.getElementById("image-preview").src = dataUri;
    document.getElementById("image-preview").style.display = "block";
    document.getElementById("btn-delete-image").style.display = "block";
    document.getElementById("image-status").innerText = "Tải ảnh thành công!";
  } catch (e) {
    alert("Lỗi tải ảnh: " + e.message);
    document.getElementById("image-status").innerText = "Lỗi khi tải ảnh";
  }
}

async function deleteItemImage() {
  if (!confirm("Bạn có chắc muốn xóa ảnh này?")) return;
  document.getElementById("image-status").innerText = "Đang xóa ảnh...";
  try {
    const res = await fetch(`${WORKER_BASE}/api/image?tenant_id=${getTenantIdFromUrl()}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: currentImageItemName })
    });
    if (!res.ok) throw new Error("Delete failed");

    document.getElementById("image-preview").style.display = "none";
    document.getElementById("btn-delete-image").style.display = "none";
    document.getElementById("image-status").innerText = "Món này chưa có ảnh";
  } catch (e) {
    alert("Lỗi xóa ảnh: " + e.message);
  }
}

// --- Stock Management ---
let currentStockCidx = null;
let currentStockIidx = null;

function openStockModal(cIdx, iIdx) {
  // Lưu lại các thay đổi người dùng đang nhập dở trên input
  syncMenuDataFromDOM();

  currentStockCidx = cIdx;
  currentStockIidx = iIdx;

  const item = currentMenuData[cIdx].items[iIdx];
  document.getElementById("stock-modal-title").innerText = `Kho hàng: ${item.name}`;

  // Set values
  const statusSelect = document.getElementById("stock-status-select");
  statusSelect.value = item.isOos ? "out_of_stock" : "in_stock";

  // Reset duration & date
  document.getElementById("stock-duration-select").value = "today";
  document.getElementById("oos-until-date").value = "";

  handleStockStatusChange();

  document.getElementById("stockModal").style.display = "flex";
}

function closeStockModal() {
  document.getElementById("stockModal").style.display = "none";
  currentStockCidx = null;
  currentStockIidx = null;
}

function handleStockStatusChange() {
  const status = document.getElementById("stock-status-select").value;
  const optionsContainer = document.getElementById("oos-options-container");
  if (status === "out_of_stock") {
    optionsContainer.style.display = "block";
  } else {
    optionsContainer.style.display = "none";
  }
  handleStockDurationChange();
}

function handleStockDurationChange() {
  const duration = document.getElementById("stock-duration-select").value;
  const dateContainer = document.getElementById("oos-date-container");
  const status = document.getElementById("stock-status-select").value;

  if (status === "out_of_stock" && duration === "multiple_days") {
    dateContainer.style.display = "block";
  } else {
    dateContainer.style.display = "none";
  }
}

async function saveStockStatus() {
  if (currentStockCidx === null || currentStockIidx === null) return;

  // Đồng bộ dữ liệu hiện tại từ DOM
  syncMenuDataFromDOM();

  const categorySlug = currentMenuData[currentStockCidx].id;
  const item = currentMenuData[currentStockCidx].items[currentStockIidx];
  const status = document.getElementById("stock-status-select").value;
  const duration = document.getElementById("stock-duration-select").value;
  const untilDate = document.getElementById("oos-until-date").value;

  if (status === "out_of_stock" && duration === "multiple_days" && !untilDate) {
    alert("Vui lòng chọn ngày khôi phục bán!");
    return;
  }

  const body = {
    category_slug: categorySlug,
    name: item.originalName || item.name,
    status: status,
    duration: duration,
    until_date: untilDate ? `${untilDate}T04:00:00+07:00` : null
  };

  try {
    const res = await fetch(`${WORKER_BASE}/api/menu/stock-status?tenant_id=${getTenantIdFromUrl()}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      const errData = await res.json();
      throw new Error(errData.error || "Update failed");
    }

    // Cập nhật local state
    item.isOos = (status === "out_of_stock");

    const targetCidx = currentStockCidx;
    closeStockModal();
    renderMenuCategoryEditor(targetCidx);
  } catch (e) {
    alert("Lỗi cập nhật trạng thái kho: " + e.message);
  }
}
