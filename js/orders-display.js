// Device-local POS typography. Load before CSS so saved sizes apply at first paint.
(function () {
  const storageKey = "pos_text_size";
  const sizes = ["auto", "standard", "large", "extra-large"];
  let selected = "auto";
  try {
    const saved = localStorage.getItem(storageKey);
    if (sizes.includes(saved)) selected = saved;
  } catch (e) { /* A blocked store must not prevent POS startup. */ }

  function syncControls() {
    document.querySelectorAll('input[name="pos-text-size"]').forEach(input => {
      input.checked = input.value === selected;
    });
  }

  function apply() {
    document.documentElement.setAttribute("data-pos-text-size", selected);
    syncControls();
    if (typeof window.syncLiveMobileView === "function") window.syncLiveMobileView();
  }

  window.getPOSTextScale = function () {
    if (selected === "extra-large") return 1.25;
    if (selected === "large" || (selected === "auto" && window.innerWidth >= 768)) return 1.125;
    return 1;
  };

  window.selectPOSTextSize = function (value) {
    if (!sizes.includes(value)) return;
    selected = value;
    try { localStorage.setItem(storageKey, selected); } catch (e) {}
    apply();
  };

  apply();
  document.addEventListener("DOMContentLoaded", syncControls);
  window.addEventListener("resize", apply, { passive: true });
  window.addEventListener("storage", event => {
    if (event.key !== storageKey && event.key !== null) return;
    selected = sizes.includes(event.newValue) ? event.newValue : "auto";
    apply();
  });
})();
