let API_URL = "https://script.google.com/macros/s/AKfycbxGK3SO5qM7EMkQx9Y9BuBeMNrH3sV3OAknikoHqW-k9mWJkfuAdRbboh9kvYv86Rr0/exec";

const BUSINESS_PHONE = "573043758278";
const DELIVERY_FEE = 0;
const MAX_QTY = 999999;
const MENU_FETCH_TIMEOUT_MS = 3800;
const MENU_CACHE_KEY = "chanchos_menu_cache_v1";
const MENU_PENDING_KEY = "chanchos_menu_pending_v1";
const EMAIL_AUTOFILL_PATTERN = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
const STATIC_PRODUCT_IMAGES = [];

const KNOWN_PRODUCT_IMAGES_BY_ID = {};

const IMAGE_CATEGORY_GROUPS = {};

const CATEGORY_DETECTION_ORDER = [];

const CATEGORY_ORDER = [
  "pizzas",
  "pizzas-especiales",
  "pizzas-familiares",
  "pizzas-premium",
  "combos",
  "entradas",
  "bebidas"
];

const CATEGORY_LABELS = {
  pizzas: "Pizzas",
  "pizzas-especiales": "Especiales",
  "pizzas-familiares": "Familiares",
  "pizzas-premium": "Premium",
  combos: "Combos",
  entradas: "Entradas",
  bebidas: "Bebidas"
};

const STOREFRONT_CATEGORY_MAP = {
  "tortas-personalizadas": "pizzas",
  "tortas-infantiles": "pizzas-especiales",
  "tortas-elegantes": "pizzas-premium",
  postres: "entradas",
  cupcakes: "pizzas-especiales",
  brownies: "combos",
  cheesecakes: "pizzas-familiares",
  "mini-postres": "entradas",
  "mesa-dulce": "combos",
  desayunos: "combos",
  macarons: "entradas",
  galletas: "entradas",
  toppers: "entradas"
};

const CATEGORIES_WITHOUT_EXTRAS = new Set([
  "bebidas"
]);

const demoMenu = {
  products: [
    {
      producto_id: "demo-pizza-pepperoni",
      categoria_id: "pizzas",
      nombre: "Pizza Pepperoni",
      precio: 32000,
      descripcion: "Pizza artesanal con mozzarella, salsa de la casa y pepperoni dorado.",
      imagen: "pizza1.png",
      orden: 1,
      activo: true
    },
    {
      producto_id: "demo-pizza-hawaiana",
      categoria_id: "pizzas",
      nombre: "Pizza Hawaiana",
      precio: 30000,
      descripcion: "Mozzarella, jamón, piña y salsa napolitana.",
      imagen: "pizza2.png",
      orden: 2,
      activo: true
    },
    {
      producto_id: "demo-pizza-especial",
      categoria_id: "pizzas-especiales",
      nombre: "Quicio Especial",
      precio: 42000,
      descripcion: "Combinación de carnes, vegetales frescos, mozzarella y borde dorado.",
      imagen: "pizza8.png",
      orden: 3,
      activo: true
    },
    {
      producto_id: "demo-combo",
      categoria_id: "combos",
      nombre: "Combo Pizza y Bebida",
      precio: 56000,
      descripcion: "Pizza mediana, bebida y entrada para compartir.",
      imagen: "pizza9.png",
      orden: 4,
      activo: true
    }
  ],
  extras: [
    { extra_id: "extra-queso", nombre: "Queso extra", precio: 5000, orden: 1, activo: true },
    { extra_id: "extra-borde", nombre: "Borde de queso", precio: 7000, orden: 2, activo: true },
    { extra_id: "extra-pepperoni", nombre: "Pepperoni extra", precio: 6000, orden: 3, activo: true },
    { extra_id: "extra-salsa", nombre: "Salsa de ajo", precio: 2500, orden: 4, activo: true }
  ]
};

const state = {
  products: [],
  extras: [],
  categories: [],
  cart: [],
  activeCategory: "",
  search: "",
  adminToken: "",
  adminProductCategory: "todas",
  adminProductSearch: "",
  editingProductId: "",
  editingExtraId: "",
  pendingMenuWrites: readPendingMenuWrites(),
  menuFingerprint: ""
};

const el = {
  categories: document.getElementById("categories"),
  catalog: document.getElementById("catalog"),
  search: document.getElementById("search"),
  refreshMenu: document.getElementById("refresh-menu"),
  bottomCart: document.getElementById("bottom-cart"),
  bottomMenu: document.getElementById("bottom-menu"),
  syncStatus: document.getElementById("sync-status"),
  cartCount: document.getElementById("cart-count"),
  floatingCart: document.getElementById("floating-cart"),
  floatingCount: document.getElementById("floating-count"),
  openCart: document.getElementById("open-cart"),
  closeCart: document.getElementById("close-cart"),
  cartDrawer: document.getElementById("cart-drawer"),
  cartItems: document.getElementById("cart-items"),
  cartSubtotal: document.getElementById("cart-subtotal"),
  cartTotal: document.getElementById("cart-total"),
  checkoutBtn: document.getElementById("checkout-btn"),
  clearCart: document.getElementById("clear-cart"),
  productModal: document.getElementById("product-modal"),
  modalContent: document.getElementById("modal-content"),
  modalClose: document.getElementById("modal-close"),
  checkoutModal: document.getElementById("checkout-modal"),
  checkoutClose: document.getElementById("checkout-close"),
  checkoutForm: document.getElementById("checkout-form"),
  step1: document.getElementById("step1"),
  step2: document.getElementById("step2"),
  nextStep1: document.getElementById("next-step1"),
  backStep2: document.getElementById("back-step2"),
  backToCart: document.getElementById("back-to-cart"),
  clientSummary: document.getElementById("client-summary"),
  addressLabel: document.getElementById("address-label"),
  paymentMethod: document.getElementById("payment-method"),
  transferInfo: document.getElementById("transfer-info"),
  cartDelivery: document.getElementById("cart-delivery"),
  cartTotalCheckout: document.getElementById("cart-total-checkout"),
  menuBtn: document.getElementById("menu-btn"),
  sideMenu: document.getElementById("side-menu"),
  closeMenu: document.getElementById("close-menu"),
  adminOpen: document.getElementById("admin-open"),
  adminOpenMenu: document.getElementById("admin-open-menu"),
  adminPanel: document.getElementById("admin-panel"),
  adminClose: document.getElementById("admin-close"),
  adminLogout: document.getElementById("admin-logout"),
  adminReload: document.getElementById("admin-reload"),
  adminLogin: document.getElementById("admin-login"),
  adminWorkspace: document.getElementById("admin-workspace"),
  adminToken: document.getElementById("admin-token"),
  adminUnlock: document.getElementById("admin-unlock"),
  productForm: document.getElementById("product-form"),
  productReset: document.getElementById("product-reset"),
  productCancel: document.getElementById("product-cancel"),
  productSubmitLabel: document.getElementById("product-submit-label"),
  productHasOptions: document.getElementById("product-has-options"),
  adminProductSearch: document.getElementById("admin-product-search"),
  productOptionsEditor: document.getElementById("product-options-editor"),
  adminProductCategories: document.getElementById("admin-product-categories"),
  productList: document.getElementById("admin-product-list"),
  extraForm: document.getElementById("extra-form"),
  extraReset: document.getElementById("extra-reset"),
  extraList: document.getElementById("admin-extra-list"),
  toast: document.getElementById("toast"),
  loader: document.getElementById("app-loader"),
  loaderTitle: document.getElementById("loader-title"),
  loaderText: document.getElementById("loader-text"),
  smartDialog: document.getElementById("smart-dialog"),
  smartDialogClose: document.getElementById("smart-dialog-close"),
  smartDialogKicker: document.getElementById("smart-dialog-kicker"),
  smartDialogTitle: document.getElementById("smart-dialog-title"),
  smartDialogMessage: document.getElementById("smart-dialog-message"),
  smartDialogField: document.getElementById("smart-dialog-field"),
  smartDialogInput: document.getElementById("smart-dialog-input"),
  smartDialogCancel: document.getElementById("smart-dialog-cancel"),
  smartDialogConfirm: document.getElementById("smart-dialog-confirm"),
  chatToggle: document.getElementById("chat-toggle"),
  chatPanel: document.getElementById("chat-panel"),
  chatClose: document.getElementById("chat-close"),
  chatMessages: document.getElementById("chat-messages"),
  chatForm: document.getElementById("chat-form"),
  chatInput: document.getElementById("chat-input")
};

document.addEventListener("DOMContentLoaded", init);

async function init() {
  resetCatalogSearch(false);
  bindEvents();
  bindAdminMoneyInputs();
  disableSearchAutofill();
  applyCachedMenu();
  renderAll();
  await loadMenu({ background: true });
  window.setTimeout(() => resetCatalogSearch(true), 0);
}

function bindEvents() {
  el.search.addEventListener("input", event => {
    state.search = sanitizeCatalogSearch(event.currentTarget.value);
    renderProducts();
  });

  el.refreshMenu.addEventListener("click", () => loadMenu({ force: true }));
  el.openCart.addEventListener("click", openCart);
  el.bottomCart.addEventListener("click", openCart);
  el.bottomMenu.addEventListener("click", openSideMenu);
  el.floatingCart.addEventListener("click", openCart);
  el.closeCart.addEventListener("click", closeCart);
  el.checkoutBtn.addEventListener("click", openCheckout);
  el.clearCart.addEventListener("click", clearCart);
  el.modalClose.addEventListener("click", closeProductModal);
  el.productModal.addEventListener("click", event => {
    if (event.target === el.productModal) closeProductModal();
  });

  el.checkoutClose.addEventListener("click", closeCheckout);
  el.checkoutModal.addEventListener("click", event => {
    if (event.target === el.checkoutModal) closeCheckout();
  });
  el.backToCart.addEventListener("click", () => {
    closeCheckout();
    openCart();
  });
  el.nextStep1.addEventListener("click", goToCheckoutStep2);
  el.backStep2.addEventListener("click", () => setCheckoutStep(1));
  el.checkoutForm.addEventListener("change", updateCheckoutControls);
  el.checkoutForm.addEventListener("submit", submitCheckout);

  el.menuBtn.addEventListener("click", openSideMenu);
  el.closeMenu.addEventListener("click", closeSideMenu);
  el.sideMenu.addEventListener("click", event => {
    if (event.target === el.sideMenu) closeSideMenu();
  });

  if (el.adminOpen?.tagName === "BUTTON") {
    el.adminOpen.addEventListener("click", openAdmin);
  }
  if (el.adminOpenMenu?.tagName === "BUTTON") {
    el.adminOpenMenu.addEventListener("click", () => {
      closeSideMenu();
      openAdmin();
    });
  }
  el.adminClose.addEventListener("click", closeAdmin);
  el.adminLogout.addEventListener("click", () => logoutAdmin(true));
  el.adminReload.addEventListener("click", () => loadMenu({ force: true }));
  el.adminUnlock.addEventListener("click", unlockAdmin);
  el.adminToken.addEventListener("keydown", event => {
    if (event.key === "Enter") unlockAdmin();
  });

  document.querySelectorAll("[data-admin-tab]").forEach(button => {
    button.addEventListener("click", () => setAdminTab(button.dataset.adminTab));
  });

  el.productForm.addEventListener("submit", saveProduct);
  el.productReset.addEventListener("click", resetProductForm);
  el.productCancel.addEventListener("click", resetProductForm);
  el.productHasOptions.addEventListener("change", () => {
    renderProductOptionsEditor(normalizeProductOptions(el.productForm.elements.opciones.value), el.productHasOptions.checked);
    updateEditedFields(el.productForm);
  });
  el.adminProductSearch.addEventListener("input", () => {
    state.adminProductSearch = el.adminProductSearch.value.trim().toLowerCase();
    renderAdminProducts();
  });
  el.extraForm.addEventListener("submit", saveExtra);
  el.extraReset.addEventListener("click", resetExtraForm);
  el.productForm.addEventListener("input", () => updateEditedFields(el.productForm));
  el.extraForm.addEventListener("input", () => updateEditedFields(el.extraForm));
  el.productForm.elements.activo.addEventListener("change", () => updateSwitchLabels());
  el.extraForm.elements.activo.addEventListener("change", () => updateSwitchLabels());
  el.chatToggle?.addEventListener("click", openChat);
  el.chatClose?.addEventListener("click", closeChat);
  el.chatForm?.addEventListener("submit", submitChat);
  document.querySelectorAll("[data-chat-question]").forEach(button => {
    button.addEventListener("click", () => handleChatQuestion(button.dataset.chatQuestion || ""));
  });

  window.addEventListener("keydown", event => {
    if (event.key === "Escape") {
      closeProductModal();
      closeCheckout();
      closeSideMenu();
    }
  });
}

async function loadMenu(options = {}) {
  const hasMenu = state.products.length || readCachedMenu();
  if (!options.background || !hasMenu) setSync("Sincronizando");
  const configuredUrl = API_URL.trim();

  if (!configuredUrl) {
    applyMenu(readCachedMenu() || demoMenu);
    setSync("Modo demo");
    return;
  }

  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), MENU_FETCH_TIMEOUT_MS);
  try {
    const url = new URL(configuredUrl);
    url.searchParams.set("action", "menu");
    url.searchParams.set("_", Date.now().toString());

    const response = await fetch(url.toString(), { method: "GET", cache: "no-store", signal: controller.signal });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const payload = await response.json();
    if (!payload.ok) throw new Error(payload.error || "Respuesta inválida");

    const remoteMenu = prepareFrontendMenu(payload.data || payload);
    cacheMenu(remoteMenu);
    applyMenu(remoteMenu, { force: options.force });
    setSync("Carta actualizada");
  } catch (error) {
    console.error(error);
    const cachedMenu = readCachedMenu();
    if (cachedMenu) {
      applyMenu(cachedMenu);
      setSync("Carta en cache");
      return;
    }

    applyMenu(demoMenu);
    setSync("Modo respaldo");
    toast("No se pudo sincronizar la carta. Se cargo una version de respaldo.");
  } finally {
    window.clearTimeout(timeoutId);
  }
}

function applyCachedMenu() {
  const cachedMenu = readCachedMenu();
  if (cachedMenu) {
    applyMenu(cachedMenu, { force: true });
    setSync("Carta en cache");
  }
}

function readCachedMenu() {
  try {
    const raw = localStorage.getItem(MENU_CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    console.warn("No se pudo leer cache de carta", error);
    return null;
  }
}

function cacheMenu(menu) {
  try {
    localStorage.setItem(MENU_CACHE_KEY, JSON.stringify(menu));
  } catch (error) {
    console.warn("No se pudo guardar cache de carta", error);
  }
}

function readPendingMenuWrites() {
  try {
    const raw = localStorage.getItem(MENU_PENDING_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function savePendingMenuWrites() {
  try {
    localStorage.setItem(MENU_PENDING_KEY, JSON.stringify(state.pendingMenuWrites.slice(-50)));
  } catch (error) {
    console.warn("No se pudo guardar cola local de carta", error);
  }
}

function queuePendingMenuWrite(action, data) {
  const pending = {
    action,
    data,
    id: data.product?.producto_id || data.producto_id || data.extra?.extra_id || data.extra_id || `${action}-${Date.now()}`,
    createdAt: Date.now()
  };
  state.pendingMenuWrites = state.pendingMenuWrites.filter(item => !(item.action === action && item.id === pending.id));
  state.pendingMenuWrites.push(pending);
  savePendingMenuWrites();
}

function applyPendingMenuWrites() {
  const fresh = [];
  state.pendingMenuWrites.forEach(pending => {
    if (Date.now() - pending.createdAt > 120000) return;
    if (pendingMenuWriteSynced(pending)) return;
    applyPendingMenuWrite(pending);
    fresh.push(pending);
  });
  state.pendingMenuWrites = fresh;
  savePendingMenuWrites();
}

function pendingMenuWriteSynced(pending) {
  const data = pending.data || {};
  if (pending.action === "deleteProduct") return !state.products.some(item => item.producto_id === data.producto_id);
  if (pending.action === "upsertProduct") return state.products.some(item => item.producto_id === data.product?.producto_id && sameMeaningfulJson(item, data.product));
  if (pending.action === "upsertExtra") return state.extras.some(item => item.extra_id === data.extra?.extra_id && sameMeaningfulJson(item, data.extra));
  return false;
}

function applyPendingMenuWrite(pending) {
  const data = pending.data || {};
  if (pending.action === "upsertProduct" && data.product) upsertStorefrontProduct(data.product, false);
  if (pending.action === "upsertExtra" && data.extra) upsertStorefrontExtra(data.extra, false);
  if (pending.action === "deleteProduct") state.products = state.products.filter(item => item.producto_id !== data.producto_id);
}

function prepareFrontendMenu(menu) {
  const products = normalizeProducts(menu.products || menu.productos || []).map((product, index) => ({
    ...product,
    categoria_id: normalizeStorefrontCategory(product.categoria_id),
    imagen: normalizeStorefrontImage(product, index)
  }));
  const extras = normalizeExtras(menu.extras || []);

  return { products, extras, updatedAt: menu.updatedAt || new Date().toISOString() };
}

function normalizeStorefrontCategory(categoryId) {
  const id = normalizeCategoryId(categoryId);
  if (CATEGORY_ORDER.includes(id)) return id;
  return STOREFRONT_CATEGORY_MAP[id] || "pizzas";
}

function normalizeStorefrontImage(product, index) {
  const explicit = String(product?.imagen || "").trim();
  if (/^pizza([1-8])\.png$/i.test(explicit)) return explicit;
  if (/^\.\/images\/pizza([1-8])\.png$/i.test(explicit)) return explicit;
  if (/^images\/pizza([1-8])\.png$/i.test(explicit)) return explicit;
  return `pizza${(index % 8) + 1}.png`;
}

function applyMenu(menu, options = {}) {
  const fingerprint = menuFingerprint(menu);
  if (!options.force && fingerprint && fingerprint === state.menuFingerprint) return;
  state.menuFingerprint = fingerprint;
  state.products = normalizeProducts(menu.products || menu.productos || []);
  state.extras = normalizeExtras(menu.extras || []);
  applyPendingMenuWrites();
  state.categories = buildCategories(state.products);
  state.activeCategory = state.categories.some(category => category.id === state.activeCategory)
    ? state.activeCategory
    : state.categories[0]?.id || "";
  renderAll();
}

function menuFingerprint(menu) {
  try {
    return JSON.stringify({
      products: menu.products || menu.productos || [],
      extras: menu.extras || []
    });
  } catch {
    return `${Date.now()}`;
  }
}

function renderAll() {
  renderCategories();
  renderProducts();
  renderCart();
  renderAdmin();
}

function renderCategories() {
  const available = getAvailableProducts();
  const counts = available.reduce((acc, product) => {
    acc[product.categoria_id] = (acc[product.categoria_id] || 0) + 1;
    return acc;
  }, {});

  el.categories.innerHTML = state.categories.map(category => {
    const count = counts[category.id] || 0;
    const active = category.id === state.activeCategory ? "active" : "";
    return `
      <button class="category-btn ${active}" type="button" data-category="${escapeAttr(category.id)}">
        <span class="category-icon" aria-hidden="true">${categoryIconTemplate(category.id)}</span>
        <span>${escapeHtml(category.label)}</span>
        <small>${count}</small>
      </button>
    `;
  }).join("");

  el.categories.querySelectorAll("[data-category]").forEach(button => {
    button.addEventListener("click", () => {
      state.activeCategory = button.dataset.category;
      renderCategories();
      renderProducts();
    });
  });
}

function renderProducts() {
  const products = getAvailableProducts().filter(product => {
    const categoryMatch = product.categoria_id === state.activeCategory;
    const text = `${product.nombre} ${product.descripcion} ${product.categoria_id}`.toLowerCase();
    return categoryMatch && (!state.search || text.includes(state.search));
  });

  if (!products.length) {
    el.catalog.innerHTML = `<div class="empty-state">No hay productos disponibles con ese filtro.</div>`;
    return;
  }

  el.catalog.innerHTML = products.map(product => {
    const image = resolveProductImage(product);
    const fallbackImage = productImageFallback(product);
    return `
      <article class="product-card">
        <div>
          ${image ? `<div class="product-visual"><img src="${escapeAttr(image)}" alt="${escapeAttr(product.nombre)}" loading="lazy" onerror="this.onerror=null;this.src='${escapeAttr(fallbackImage)}';"></div>` : productVisualTemplate(product)}
          <div class="product-meta">
            <span>${escapeHtml(labelFromId(product.categoria_id))}</span>
            <span class="product-rating">4.9</span>
          </div>
          <h3>${escapeHtml(product.nombre)}</h3>
          <p>${escapeHtml(product.descripcion || "Producto disponible para ordenar.")}</p>
        </div>
        <div class="product-footer">
          <span class="price">${formatMoney(product.precio)}</span>
          <button class="add-btn" type="button" aria-label="Agregar ${escapeAttr(product.nombre)}" data-add-product="${escapeAttr(product.producto_id)}">+</button>
        </div>
      </article>
    `;
  }).join("");

  el.catalog.querySelectorAll("[data-add-product]").forEach(button => {
    button.addEventListener("click", () => openProductModal(button.dataset.addProduct));
  });
}

function openProductModal(productId, cartIndex = null) {
  const product = state.products.find(item => item.producto_id === productId);
  if (!product) return;

  const cartItem = Number.isInteger(cartIndex) ? state.cart[cartIndex] : null;
  const productOptions = getProductOptions(product);
  const allowExtras = productAllowsExtras(product);
  let selectedOption = productOptions.find(option => option.id === cartItem?.option_id) || productOptions[0] || null;
  const selectedExtras = {};
  if (allowExtras) {
    (cartItem?.extras || []).forEach(extra => {
      selectedExtras[extra.extra_id] = { ...extra };
    });
  }

  const image = resolveProductImage({ ...product, imagen: selectedOption?.image || product.imagen });
  const fallbackImage = productImageFallback(product);
  let productQty = clampQuantity(cartItem?.qty || 1);

  el.modalContent.innerHTML = `
    ${image ? `<div class="modal-product-visual"><img src="${escapeAttr(image)}" alt="${escapeAttr(product.nombre)}" onerror="this.onerror=null;this.src='${escapeAttr(fallbackImage)}';"></div>` : productVisualTemplate(product, "modal-product-visual")}
    <div class="modal-title">
      <span class="eyebrow">${escapeHtml(labelFromId(product.categoria_id))}</span>
      <h2>${escapeHtml(product.nombre)}</h2>
      <p>${escapeHtml(product.descripcion || "")}</p>
      <strong class="price" id="selected-option-price">${formatMoney(getSelectedProductPrice(product, selectedOption))}</strong>
    </div>

    ${productOptions.length > 1 ? `
      <div class="option-list" role="radiogroup" aria-label="Opciones de ${escapeAttr(product.nombre)}">
        ${productOptions.map(option => optionRowTemplate(option, selectedOption)).join("")}
      </div>
    ` : ""}

    ${allowExtras ? `
      <div class="extras-list">
        ${getAvailableExtras().length ? getAvailableExtras().map(extra => extraRowTemplate(extra, selectedExtras[extra.extra_id]?.qty || 0)).join("") : `<div class="empty-state">No hay extras configurados.</div>`}
      </div>
    ` : ""}

    <div class="product-config">
      <label class="quantity-field">Cantidad
        <div class="quantity-stepper">
          <button type="button" id="product-qty-minus" aria-label="Disminuir cantidad">-</button>
          <span id="product-qty">${productQty}</span>
          <button type="button" id="product-qty-plus" aria-label="Aumentar cantidad">+</button>
        </div>
      </label>
      <button class="primary-btn" id="add-configured-product" type="button">${cartItem ? "Actualizar producto" : "Agregar al carrito"} <span id="modal-total"></span></button>
    </div>
  `;

  const qtyLabel = document.getElementById("product-qty");
  const totalLabel = document.getElementById("modal-total");
  const optionPriceLabel = document.getElementById("selected-option-price");

  const updateTotal = () => {
    qtyLabel.textContent = productQty;
    if (optionPriceLabel) optionPriceLabel.textContent = formatMoney(getSelectedProductPrice(product, selectedOption));
    const extrasTotal = Object.values(selectedExtras).reduce((sum, extra) => sum + moneyToBigInt(extra.precio) * qtyToBigInt(extra.qty), 0n);
    totalLabel.textContent = formatMoney(moneyToBigInt(getSelectedProductPrice(product, selectedOption)) * qtyToBigInt(productQty) + extrasTotal);
  };

  el.modalContent.querySelectorAll("[data-product-option]").forEach(input => {
    input.addEventListener("change", () => {
      selectedOption = productOptions.find(option => option.id === input.value) || selectedOption;
      updateTotal();
    });
  });

  if (allowExtras) {
    el.modalContent.querySelectorAll("[data-extra-plus]").forEach(button => {
      button.addEventListener("click", () => {
        const extra = getAvailableExtras().find(item => item.extra_id === button.dataset.extraPlus);
        if (!extra) return;
        selectedExtras[extra.extra_id] = selectedExtras[extra.extra_id] || { ...extra, qty: 0 };
        selectedExtras[extra.extra_id].qty = clampQuantity(selectedExtras[extra.extra_id].qty + 1);
        button.parentElement.querySelector("[data-extra-qty]").textContent = selectedExtras[extra.extra_id].qty;
        updateTotal();
      });
    });

    el.modalContent.querySelectorAll("[data-extra-minus]").forEach(button => {
      button.addEventListener("click", () => {
        const extraId = button.dataset.extraMinus;
        if (!selectedExtras[extraId]) return;
        selectedExtras[extraId].qty = clampQuantity(selectedExtras[extraId].qty - 1, 0);
        if (selectedExtras[extraId].qty <= 0) delete selectedExtras[extraId];
        button.parentElement.querySelector("[data-extra-qty]").textContent = selectedExtras[extraId]?.qty || 0;
        updateTotal();
      });
    });
  }

  document.getElementById("product-qty-minus").addEventListener("click", () => {
    productQty = clampQuantity(productQty - 1);
    updateTotal();
  });
  document.getElementById("product-qty-plus").addEventListener("click", () => {
    productQty = clampQuantity(productQty + 1);
    updateTotal();
  });

  document.getElementById("add-configured-product").addEventListener("click", () => {
    const extras = allowExtras ? Object.values(selectedExtras)
      .filter(extra => extra.qty > 0)
      .map(extra => ({
        extra_id: extra.extra_id,
        nombre: extra.nombre,
        precio: moneyToNumber(extra.precio),
        qty: clampQuantity(extra.qty)
      })) : [];

    const item = {
      cart_id: cartItem?.cart_id || makeId("cart"),
      product_id: product.producto_id,
      title: product.nombre,
      category: product.categoria_id,
      option_id: selectedOption?.id || "",
      option_label: selectedOption?.label || "",
      price: getSelectedProductPrice(product, selectedOption),
      qty: productQty,
      extras
    };

    if (cartItem) {
      state.cart[cartIndex] = item;
    } else {
      addToCart(item);
    }

    renderCart();
    closeProductModal();
    openCart();
  });

  updateTotal();
  openLayer(el.productModal);
}

function productVisualTemplate(product, className = "product-visual") {
  const label = labelFromId(product.categoria_id).split(" ").slice(0, 2).join(" ");
  return `
    <div class="${className} product-visual-placeholder" aria-hidden="true">
      <img src="${escapeAttr(productImageFallback(product))}" alt="">
      <span>${escapeHtml(label)}</span>
    </div>
  `;
}

function categoryIconTemplate(id) {
  const icons = {
    pizzas: `
      <path d="M4 19 19 4l1 16-16-1z"/>
      <path d="M8 17c2.5-4.5 5.5-7.5 10-10"/>
      <circle cx="13" cy="12" r="1"/>
      <circle cx="16" cy="16" r="1"/>
    `,
    "pizzas-especiales": `
      <path d="M5 18c2-6 6-10 13-13"/>
      <path d="M5 18h14L18 5"/>
      <circle cx="11" cy="13" r="1"/>
      <circle cx="15" cy="15" r="1"/>
    `,
    "pizzas-familiares": `
      <circle cx="12" cy="12" r="8"/>
      <path d="M12 4v16M4 12h16M6.5 6.5l11 11M17.5 6.5l-11 11"/>
    `,
    "pizzas-premium": `
      <path d="M12 4l7 6-7 10-7-10 7-6z"/>
      <path d="M8 10h8"/>
      <path d="M10 10l2 10 2-10"/>
    `,
    combos: `
      <path d="M5 7h8v12H5z"/>
      <path d="M15 10h4v9h-4z"/>
      <path d="M7 5h4v2H7z"/>
    `,
    entradas: `
      <path d="M5 14c3-5 9-5 14 0"/>
      <path d="M6 14h12l-2 5H8z"/>
      <path d="M9 10l1-3M13 10l2-3"/>
    `,
    bebidas: `
      <path d="M8 5h8l-1 15H9L8 5z"/>
      <path d="M7 9h10"/>
      <path d="M10 5l1-3h5"/>
    `
  };

  return `
    <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
      ${icons[id] || icons.pizzas}
    </svg>
  `;
}

function extraRowTemplate(extra, qty) {
  return `
    <div class="extra-row">
      <div>
        <strong>${escapeHtml(extra.nombre)}</strong>
        <small>${formatMoney(extra.precio)}</small>
      </div>
      <div class="extra-controls">
        <button type="button" data-extra-minus="${escapeAttr(extra.extra_id)}">-</button>
        <span data-extra-qty>${qty}</span>
        <button type="button" data-extra-plus="${escapeAttr(extra.extra_id)}">+</button>
      </div>
    </div>
  `;
}

function optionRowTemplate(option, selectedOption) {
  const checked = option.id === selectedOption?.id ? "checked" : "";
  return `
    <label class="option-row">
      <input type="radio" name="product-option" value="${escapeAttr(option.id)}" data-product-option ${checked}>
      <span>
        <strong>${escapeHtml(option.label)}</strong>
        <small>${formatMoney(option.price)}</small>
      </span>
    </label>
  `;
}

function addToCart(item) {
  const sameItem = state.cart.find(cartItem => (
    cartItem.product_id === item.product_id &&
    cartItem.option_id === item.option_id &&
    JSON.stringify(cartItem.extras) === JSON.stringify(item.extras)
  ));

  if (sameItem) {
    sameItem.qty = clampQuantity(sameItem.qty + item.qty);
  } else {
    item.qty = clampQuantity(item.qty);
    state.cart.push(item);
  }
}

function renderCart() {
  const totals = getCartTotals();
  const totalQty = state.cart.reduce((sum, item) => sum + clampQuantity(item.qty), 0);

  el.cartCount.textContent = totalQty;
  el.floatingCount.textContent = totalQty;
  el.floatingCart.classList.toggle("hidden", totalQty === 0);
  el.cartSubtotal.textContent = formatMoney(totals.subtotal);
  el.cartTotal.textContent = formatMoney(totals.subtotal);

  if (!state.cart.length) {
    el.cartItems.innerHTML = `<div class="empty-state">Tu selección está vacía.</div>`;
    return;
  }

  el.cartItems.innerHTML = state.cart.map((item, index) => {
    const extras = item.extras || [];
    const optionText = item.option_label ? `Opcion: ${item.option_label}` : "";
    const extrasText = extras.length
      ? extras.map(extra => `${clampQuantity(extra.qty)}x ${extra.nombre} ${formatMoney(extra.precio)}`).join(", ")
      : "Sin extras";
    return `
      <article class="cart-item">
        <div>
          <h3>${escapeHtml(item.title)}</h3>
          ${optionText ? `<small>${escapeHtml(optionText)}</small>` : ""}
          <small>${escapeHtml(extrasText)}</small>
          <small>Total linea: ${formatMoney(getItemTotal(item))}</small>
        </div>
        <div>
          <div class="qty-controls">
            <button type="button" data-cart-minus="${index}">-</button>
            <span>${clampQuantity(item.qty)}</span>
            <button type="button" data-cart-plus="${index}">+</button>
          </div>
          <div class="cart-line-actions">
            <button class="secondary-btn" type="button" data-cart-edit="${index}">Editar</button>
            <button class="danger-btn" type="button" data-cart-remove="${index}">Quitar</button>
          </div>
        </div>
      </article>
    `;
  }).join("");

  el.cartItems.querySelectorAll("[data-cart-plus]").forEach(button => {
    button.addEventListener("click", () => changeCartQty(Number(button.dataset.cartPlus), 1));
  });
  el.cartItems.querySelectorAll("[data-cart-minus]").forEach(button => {
    button.addEventListener("click", () => changeCartQty(Number(button.dataset.cartMinus), -1));
  });
  el.cartItems.querySelectorAll("[data-cart-remove]").forEach(button => {
    button.addEventListener("click", () => removeCartItem(Number(button.dataset.cartRemove)));
  });
  el.cartItems.querySelectorAll("[data-cart-edit]").forEach(button => {
    button.addEventListener("click", () => {
      const index = Number(button.dataset.cartEdit);
      const item = state.cart[index];
      closeCart();
      openProductModal(item.product_id, index);
    });
  });
}

function changeCartQty(index, delta) {
  const item = state.cart[index];
  if (!item) return;
  item.qty = clampQuantity(item.qty + delta, 0);
  if (item.qty <= 0) state.cart.splice(index, 1);
  renderCart();
}

function removeCartItem(index) {
  state.cart.splice(index, 1);
  renderCart();
}

async function clearCart() {
  if (!state.cart.length) return;
  const ok = await smartConfirm({
    title: "Vaciar carrito",
    message: "Se quitaran todos los productos agregados al pedido.",
    confirmText: "Vaciar carrito",
    danger: true
  });
  if (!ok) return;
  state.cart = [];
  renderCart();
}

function openCheckout() {
  if (!state.cart.length) {
    toast("Agrega al menos un producto antes de pedir.");
    return;
  }
  closeCart();
  el.checkoutForm.reset();
  setCheckoutStep(1);
  updateCheckoutControls();
  openLayer(el.checkoutModal);
}

function goToCheckoutStep2() {
  const name = el.checkoutForm.elements.name.value.trim();
  const phone = el.checkoutForm.elements.phone.value.trim();

  if (!name || !phone) {
    toast("Completa nombre y teléfono para continuar.");
    return;
  }

  el.clientSummary.textContent = `${name} - ${phone}`;
  setCheckoutStep(2);
  updateCheckoutControls();
}

function setCheckoutStep(step) {
  el.step1.classList.toggle("active", step === 1);
  el.step2.classList.toggle("active", step === 2);
}

function updateCheckoutControls() {
  const method = el.checkoutForm.querySelector("input[name='method']:checked")?.value || "recoger";
  const payment = el.paymentMethod.value;
  const delivery = method === "domicilio" ? DELIVERY_FEE : 0;
  const total = getCartTotals().subtotal + moneyToBigInt(delivery);

  el.addressLabel.classList.toggle("hidden", method !== "domicilio");
  el.checkoutForm.elements.address.required = method === "domicilio";
  el.transferInfo.classList.toggle("hidden", !payment);
  el.cartDelivery.textContent = formatMoney(delivery);
  el.cartTotalCheckout.textContent = formatMoney(total);
}

async function submitCheckout(event) {
  event.preventDefault();
  const form = el.checkoutForm;
  const name = form.elements.name.value.trim();
  const phone = form.elements.phone.value.trim();
  const method = form.querySelector("input[name='method']:checked")?.value || "recoger";
  const address = form.elements.address.value.trim();
  const payment = form.elements.payment.value;
  const notes = form.elements.notes.value.trim();

  if (!name || !phone || !payment) {
    toast("Revisa los datos obligatorios.");
    return;
  }

  if (method === "domicilio" && !address) {
    toast("Agrega la dirección para el domicilio.");
    return;
  }

  const delivery = method === "domicilio" ? DELIVERY_FEE : 0;
  const subtotal = getCartTotals().subtotal;
  const total = subtotal + moneyToBigInt(delivery);
  const deliveryText = method === "recoger"
    ? "Sin costo (recoge en el local)"
    : formatMoney(delivery);
  const lines = [
    "\uD83E\uDDFE *Resumen de la orden*",
    "",
    "\uD83D\uDC64 *Datos del cliente*",
    `Nombre: ${name}`,
    `Teléfono: ${phone}`,
    "",
    "\uD83D\uDCCD *Entrega*",
    `Modalidad: ${method === "domicilio" ? "Domicilio" : "Recoger en el local"}`,
    ...(method === "domicilio" ? [`Dirección: ${address}`] : ["Sede para recoger: Por confirmar"]),
    `Forma de pago: ${formatBudgetLabel(payment)}`,
    "",
    "\uD83C\uDF55 *Pedido*"
  ];

  state.cart.forEach(item => {
    const qty = clampQuantity(item.qty);
    const optionText = item.option_label ? ` (${item.option_label})` : "";
    lines.push(`- ${qty} x ${item.title}${optionText} - ${formatMoney(moneyToBigInt(item.price) * qtyToBigInt(qty))}`);
    if ((item.extras || []).length) {
      item.extras.forEach(extra => {
        const extraQty = clampQuantity(extra.qty);
        lines.push(`  + ${extraQty} x ${extra.nombre} - ${formatMoney(moneyToBigInt(extra.precio) * qtyToBigInt(extraQty))}`);
      });
    }
  });

  lines.push("");
  lines.push("\uD83D\uDCB0 *Totales*");
  lines.push(`Subtotal: ${formatMoney(subtotal)}`);
  lines.push(`Domicilio: ${deliveryText}`);
  lines.push(`Total estimado: ${formatMoney(total)}`);
  lines.push("");
  lines.push("\uD83D\uDCDD *Notas*");
  lines.push(`Notas: ${notes}`);

  const order = {
    cliente: name,
    telefono: phone,
    metodo: method,
    direccion: address,
    pago: formatBudgetLabel(payment),
    notas: notes,
    subtotal: Number(subtotal),
    domicilio: delivery,
    total: Number(total),
    items: state.cart.map(item => ({
      producto_id: item.producto_id,
      nombre: item.title,
      opcion: item.option_label || "",
      precio: Number(item.price || 0),
      cantidad: clampQuantity(item.qty),
      extras: item.extras || []
    }))
  };

  const quoteUrl = `https://wa.me/${BUSINESS_PHONE}?text=${encodeURIComponent(lines.join("\n"))}`;
  void recordOrder(order);
  window.open(quoteUrl, "_blank", "noopener,noreferrer");

  state.cart = [];
  renderCart();
  closeCheckout();
}

async function recordOrder(order) {
  if (!API_URL.trim()) return;

  try {
    const response = await fetch(API_URL.trim(), {
      method: "POST",
      keepalive: true,
      body: JSON.stringify({
        action: "createOrder",
        order
      })
    });
    const payload = await response.json();
    if (!response.ok || !payload.ok) throw new Error(payload.error || `HTTP ${response.status}`);
  } catch (error) {
    console.warn("No se pudo registrar el pedido en la API", error);
  }
}

function formatBudgetLabel(value) {
  const labels = {
    "por-definir": "Por confirmar",
    nequi: "Nequi",
    transferencia: "Transferencia",
    efectivo: "Efectivo"
  };
  return labels[value] || value || "Por confirmar";
}

function openChat() {
  if (!el.chatPanel) return;
  el.chatPanel.classList.remove("hidden");
  el.chatToggle?.setAttribute("aria-expanded", "true");
  if (!el.chatMessages?.children.length) {
    addChatMessage("bot", "Hola, soy el asistente de Quicio - Caprichos. Puedo ayudarte a elegir una pizza, revisar categorías, preparar tu pedido o llevarte a WhatsApp.");
  }
}

function closeChat() {
  el.chatPanel?.classList.add("hidden");
  el.chatToggle?.setAttribute("aria-expanded", "false");
}

function submitChat(event) {
  event.preventDefault();
  const question = el.chatInput?.value.trim() || "";
  if (!question) return;
  el.chatInput.value = "";
  handleChatQuestion(question);
}

function handleChatQuestion(question) {
  openChat();
  addChatMessage("user", question);
  window.setTimeout(() => addChatMessage("bot", buildChatAnswer(question)), 160);
}

function buildChatAnswer(question) {
  const text = normalizeImageKey(question);
  const categories = state.categories.map(category => category.label).slice(0, 6).join(", ");
  const featured = getAvailableProducts().slice(0, 4).map(product => product.nombre).join(", ");

  if (/(pedid|precio|valor|cuanto|whatsapp|wp)/.test(text)) {
    return "Para pedir bien, cuéntanos la hora del pedido, la dirección o si recoges, el tamaño, el sabor, los extras, la cantidad de personas y la forma de pago. Puedes agregar productos a la selección y tocar Pedir por WhatsApp para enviar el mensaje listo.";
  }

  if (/(dato|informacion|necesit|pedido|fecha)/.test(text)) {
    return "Los datos clave son: hora del pedido, dirección o recogida, cantidad de personas, sabores preferidos, extras, bebidas y cualquier indicación especial.";
  }

  if (/(combo|entrada|bebida|familiar|premium|especial)/.test(text)) {
    return "Sí, Quicio - Caprichos maneja pizzas, especiales, familiares, premium, combos, entradas y bebidas. Puedes revisar la carta y agregar lo que quieras a la selección.";
  }

  if (/(categoria|carta|producto|menu)/.test(text)) {
    return `La carta tiene categorías como ${categories || "pizzas, especiales y combos"}. Algunas ideas destacadas: ${featured || "pizzas artesanales y combos para compartir"}.`;
  }

  if (/(foto|referencia|ingrediente|sabor)/.test(text)) {
    return "Puedes pedir recomendaciones por sabor: clásica, carnes, pollo, vegetariana, premium o familiar. También puedes indicar ingredientes que quieras evitar.";
  }

  return "Claro. Para ayudarte mejor, dime si buscas una pizza clásica, especial, familiar, premium o un combo completo. También puedes seleccionar productos y enviarlos por WhatsApp.";
}

function addChatMessage(role, message) {
  if (!el.chatMessages) return;
  const bubble = document.createElement("div");
  bubble.className = `chat-bubble ${role}`;
  bubble.textContent = message;
  el.chatMessages.appendChild(bubble);
  el.chatMessages.scrollTop = el.chatMessages.scrollHeight;
}

function openAdmin() {
  updateAdminSessionUi();
  openLayer(el.adminPanel);
}

function closeAdmin() {
  logoutAdmin(false);
  closeLayer(el.adminPanel);
}

function unlockAdmin(showToast = true) {
  const token = el.adminToken.value.trim();
  if (!token) {
    toast("Ingresa la contraseña de administrador.");
    return;
  }
  state.adminToken = token;
  el.adminLogin.classList.add("hidden");
  el.adminWorkspace.classList.remove("hidden");
  el.adminLogout.classList.remove("hidden");
  renderAdmin();
  if (showToast) toast("Panel listo para editar.");
}

function logoutAdmin(showToast = true) {
  state.adminToken = "";
  el.adminToken.value = "";
  resetProductForm();
  resetExtraForm();
  updateAdminSessionUi();
  if (showToast) toast("Sesión administrativa cerrada.");
}

function updateAdminSessionUi() {
  const loggedIn = Boolean(state.adminToken);
  el.adminLogin.classList.toggle("hidden", loggedIn);
  el.adminWorkspace.classList.toggle("hidden", !loggedIn);
  el.adminLogout.classList.toggle("hidden", !loggedIn);
  if (!loggedIn) el.adminToken.value = "";
}

function setAdminTab(tab) {
  document.querySelectorAll("[data-admin-tab]").forEach(button => {
    button.classList.toggle("active", button.dataset.adminTab === tab);
  });
  document.getElementById("admin-products").classList.toggle("active", tab === "products");
  document.getElementById("admin-extras").classList.toggle("active", tab === "extras");
}

function renderAdmin() {
  renderAdminProductCategories();
  renderAdminProducts();
  renderAdminExtras();
}

function renderAdminProductCategories() {
  if (!el.adminProductCategories) return;
  const categories = buildCategories(state.products);
  const selectedExists = state.adminProductCategory === "todas" || categories.some(category => category.id === state.adminProductCategory);
  if (!selectedExists) state.adminProductCategory = "todas";

  const buttons = [
    { id: "todas", label: "Todas", count: state.products.length },
    ...categories.map(category => ({
      ...category,
      count: state.products.filter(product => product.categoria_id === category.id).length
    }))
  ];

  el.adminProductCategories.innerHTML = buttons.map(category => {
    const active = category.id === state.adminProductCategory ? "active" : "";
    return `<button class="admin-filter-btn ${active}" type="button" data-admin-product-category="${escapeAttr(category.id)}">${escapeHtml(category.label)} <span>${category.count}</span></button>`;
  }).join("");

  el.adminProductCategories.querySelectorAll("[data-admin-product-category]").forEach(button => {
    button.addEventListener("click", () => {
      state.adminProductCategory = button.dataset.adminProductCategory;
      state.adminProductSearch = "";
      el.adminProductSearch.value = "";
      renderAdminProductCategories();
      renderAdminProducts();
    });
  });
}

function renderAdminProducts() {
  if (!el.productList) return;
  const products = [...state.products]
    .filter(product => state.adminProductCategory === "todas" || product.categoria_id === state.adminProductCategory)
    .filter(product => {
      const text = `${product.nombre} ${product.descripcion} ${product.categoria_id}`.toLowerCase();
      return !state.adminProductSearch || text.includes(state.adminProductSearch);
    })
    .sort(sortAdminProducts);
  el.productList.innerHTML = products.map(product => `
    <article class="admin-row ${product.activo ? "" : "inactive"}">
      <div>
        <h3>${escapeHtml(product.nombre)} - ${formatMoney(product.precio)}</h3>
        <p>${escapeHtml(labelFromId(product.categoria_id))} | ${product.activo ? "activo" : "producto agotado"}${product.opciones.length ? ` | opciones: ${escapeHtml(product.opciones.map(option => `${option.label} ${formatMoney(option.price)}`).join(", "))}` : ""}</p>
      </div>
      <div class="admin-row-actions">
        <button class="secondary-btn" type="button" data-edit-product="${escapeAttr(product.producto_id)}">Editar</button>
        <button class="danger-btn admin-delete-btn" type="button" data-delete-product="${escapeAttr(product.producto_id)}">Eliminar</button>
      </div>
    </article>
  `).join("") || `<div class="empty-state">No hay productos cargados en esta categoría.</div>`;

  el.productList.querySelectorAll("[data-edit-product]").forEach(button => {
    button.addEventListener("click", () => fillProductForm(button.dataset.editProduct));
  });
  el.productList.querySelectorAll("[data-delete-product]").forEach(button => {
    button.addEventListener("click", () => deleteProduct(button.dataset.deleteProduct));
  });
}

function renderAdminExtras() {
  if (!el.extraList) return;
  const extras = [...state.extras].sort(sortByOrderThenName);
  el.extraList.innerHTML = extras.map(extra => `
    <article class="admin-row ${extra.activo ? "" : "inactive"}">
      <div>
        <h3>${escapeHtml(extra.nombre)} - ${formatMoney(extra.precio)}</h3>
        <p>orden ${extra.orden || 0} | ${extra.activo ? "activo" : "inactivo"}</p>
      </div>
      <div class="admin-row-actions">
        <button class="secondary-btn" type="button" data-edit-extra="${escapeAttr(extra.extra_id)}">Editar</button>
        <button class="danger-btn admin-delete-btn" type="button" data-toggle-extra="${escapeAttr(extra.extra_id)}">${extra.activo ? "Eliminar" : "Restaurar"}</button>
      </div>
    </article>
  `).join("") || `<div class="empty-state">No hay extras cargados.</div>`;

  el.extraList.querySelectorAll("[data-edit-extra]").forEach(button => {
    button.addEventListener("click", () => fillExtraForm(button.dataset.editExtra));
  });
  el.extraList.querySelectorAll("[data-toggle-extra]").forEach(button => {
    button.addEventListener("click", () => toggleExtra(button.dataset.toggleExtra));
  });
}

function fillProductForm(productId) {
  const product = state.products.find(item => item.producto_id === productId);
  if (!product) return;
  state.editingProductId = product.producto_id;
  setFormValues(el.productForm, product);
  renderProductOptionsEditor(product.opciones, product.opciones.length > 0);
  el.productForm.elements.activo.checked = product.activo;
  updateSwitchLabels();
  updateProductFormMode();
  markFormEditing(el.productForm, true);
  el.productForm.scrollIntoView({ behavior: "smooth", block: "center" });
}

function fillExtraForm(extraId) {
  const extra = state.extras.find(item => item.extra_id === extraId);
  if (!extra) return;
  state.editingExtraId = extra.extra_id;
  setFormValues(el.extraForm, extra);
  el.extraForm.elements.activo.checked = extra.activo;
  updateSwitchLabels();
  markFormEditing(el.extraForm, true);
  el.extraForm.scrollIntoView({ behavior: "smooth", block: "center" });
}

function resetProductForm() {
  state.editingProductId = "";
  el.productForm.reset();
  el.productForm.elements.activo.checked = true;
  el.productForm.elements.producto_id.value = "";
  el.productForm.elements.orden.value = "0";
  renderProductOptionsEditor([], false);
  updateSwitchLabels();
  updateProductFormMode();
  markFormEditing(el.productForm, false);
}

function updateProductFormMode() {
  const editing = Boolean(state.editingProductId);
  el.productSubmitLabel.textContent = editing ? "Actualizar producto" : "Guardar producto";
  el.productCancel.classList.toggle("hidden", !editing);
}

function resetExtraForm() {
  state.editingExtraId = "";
  el.extraForm.reset();
  el.extraForm.elements.activo.checked = true;
  el.extraForm.elements.extra_id.value = "";
  el.extraForm.elements.orden.value = "0";
  updateSwitchLabels();
  markFormEditing(el.extraForm, false);
}

function updateSwitchLabels() {
  const productSwitchLabel = el.productForm.elements.activo?.nextElementSibling;
  if (productSwitchLabel) {
    productSwitchLabel.textContent = el.productForm.elements.activo.checked ? "Activo" : "Producto Agotado";
  }

  const extraSwitchLabel = el.extraForm.elements.activo?.nextElementSibling;
  if (extraSwitchLabel) {
    extraSwitchLabel.textContent = el.extraForm.elements.activo.checked ? "Activo" : "Agotado";
  }
}

function renderProductOptionsEditor(options = [], forceVisible = false) {
  const normalizedOptions = normalizeProductOptions(options);
  const priceLabel = el.productForm.elements.precio?.closest("label");
  const editorOptions = normalizedOptions.length ? normalizedOptions : getDefaultProductOptions();
  const isVisible = Boolean(forceVisible);
  el.productHasOptions.checked = isVisible;

  if (!isVisible) {
    el.productForm.elements.opciones.value = "";
    el.productForm.elements.precio.required = true;
    priceLabel?.classList.remove("hidden");
    el.productOptionsEditor.classList.add("hidden");
    el.productOptionsEditor.innerHTML = "";
    return;
  }

  el.productForm.elements.precio.required = false;
  priceLabel?.classList.add("hidden");
  el.productOptionsEditor.classList.remove("hidden");
  el.productOptionsEditor.innerHTML = `
    <div class="admin-options-title">Opciones del producto</div>
    ${editorOptions.map((option, index) => `
      <div class="admin-option-row" data-option-row data-option-id="${escapeAttr(option.id)}">
        <label>Opción
          <input type="text" autocomplete="off" value="${escapeAttr(option.label)}" data-option-label>
        </label>
        <label>Precio
          <input type="text" inputmode="numeric" autocomplete="off" value="${option.price > 0 ? escapeAttr(formatMoney(option.price)) : ""}" placeholder="$ 0" data-option-price>
        </label>
        <button class="danger-btn option-remove-btn ${index < 2 ? "hidden" : ""}" type="button" data-remove-option>Quitar</button>
      </div>
    `).join("")}
    <button class="secondary-btn option-add-btn" type="button" data-add-option>Agregar opción</button>
  `;

  el.productOptionsEditor.querySelectorAll("[data-option-price]").forEach(input => {
    input.addEventListener("input", () => {
      formatAdminMoneyInput(input);
      syncProductOptionsFromEditor();
      updateEditedFields(el.productForm);
    });
    input.addEventListener("blur", () => {
      formatAdminMoneyInput(input);
      syncProductOptionsFromEditor();
    });
  });

  el.productOptionsEditor.querySelectorAll("[data-option-label]").forEach(input => {
    input.addEventListener("input", () => {
      syncProductOptionsFromEditor();
      updateEditedFields(el.productForm);
    });
  });

  el.productOptionsEditor.querySelectorAll("[data-remove-option]").forEach(button => {
    button.addEventListener("click", () => {
      button.closest("[data-option-row]")?.remove();
      syncProductOptionsFromEditor();
      updateEditedFields(el.productForm);
    });
  });

  el.productOptionsEditor.querySelector("[data-add-option]")?.addEventListener("click", () => {
    addProductOptionRow();
    syncProductOptionsFromEditor();
    updateEditedFields(el.productForm);
  });

  syncProductOptionsFromEditor();
}

function syncProductOptionsFromEditor() {
  if (!el.productOptionsEditor || el.productOptionsEditor.classList.contains("hidden") || !el.productHasOptions.checked) {
    el.productForm.elements.opciones.value = "";
    return;
  }

  const updatedOptions = [...el.productOptionsEditor.querySelectorAll("[data-option-row]")].map((row, index) => {
    const label = row.querySelector("[data-option-label]")?.value.trim() || "";
    const price = moneyToNumber(row.querySelector("[data-option-price]")?.value || "");
    return {
      id: row.dataset.optionId || makeOptionId(label, index),
      label,
      price
    };
  }).filter(option => option.label && option.price > 0);

  el.productForm.elements.opciones.value = updatedOptions.length ? JSON.stringify(updatedOptions) : "";
  if (updatedOptions[0]) {
    el.productForm.elements.precio.value = formatMoney(updatedOptions[0].price);
  }
}

function getDefaultProductOptions() {
  const basePrice = moneyToNumber(el.productForm.elements.precio?.value || "");
  return [
    { id: "opt-personal", label: "Personal", price: basePrice },
    { id: "opt-familiar", label: "Familiar", price: 0 }
  ];
}

function addProductOptionRow() {
  const button = el.productOptionsEditor.querySelector("[data-add-option]");
  if (!button) return;

  const index = el.productOptionsEditor.querySelectorAll("[data-option-row]").length;
  const wrapper = document.createElement("div");
  wrapper.className = "admin-option-row";
  wrapper.dataset.optionRow = "";
  wrapper.dataset.optionId = `opt-${Date.now()}-${index}`;
  wrapper.innerHTML = `
    <label>Opción
      <input type="text" autocomplete="off" value="Opción ${index + 1}" data-option-label>
    </label>
    <label>Precio
      <input type="text" inputmode="numeric" autocomplete="off" placeholder="$ 0" data-option-price>
    </label>
    <button class="danger-btn option-remove-btn" type="button" data-remove-option>Quitar</button>
  `;

  button.before(wrapper);
  wrapper.querySelector("[data-option-label]")?.addEventListener("input", () => {
    syncProductOptionsFromEditor();
    updateEditedFields(el.productForm);
  });
  wrapper.querySelector("[data-option-price]")?.addEventListener("input", event => {
    formatAdminMoneyInput(event.currentTarget);
    syncProductOptionsFromEditor();
    updateEditedFields(el.productForm);
  });
  wrapper.querySelector("[data-option-price]")?.addEventListener("blur", event => {
    formatAdminMoneyInput(event.currentTarget);
    syncProductOptionsFromEditor();
  });
  wrapper.querySelector("[data-remove-option]")?.addEventListener("click", () => {
    wrapper.remove();
    syncProductOptionsFromEditor();
    updateEditedFields(el.productForm);
  });
}

function makeOptionId(label, index) {
  return `opt-${slugify(label || `opcion-${index + 1}`)}`;
}

async function saveProduct(event) {
  event.preventDefault();
  syncProductOptionsFromEditor();
  const data = getFormObject(el.productForm);
  const productOptions = normalizeProductOptions(data.opciones);
  if (el.productHasOptions.checked && productOptions.length < 2) {
    toast("Completa al menos dos opciones con nombre y precio.");
    return;
  }
  const product = normalizeProduct({
    ...data,
    producto_id: data.producto_id || state.editingProductId || makeId("prod"),
    activo: el.productForm.elements.activo.checked
  });

  upsertStorefrontProduct(product);
  queuePendingMenuWrite("upsertProduct", { product });
  resetProductForm();
  resetCatalogSearch(false);
  renderAll();
  cacheCurrentMenu();
  const saved = await postAdmin("upsertProduct", { product });
  if (saved) scheduleMenuRefresh();
}

async function saveExtra(event) {
  event.preventDefault();
  const data = getFormObject(el.extraForm);
  const extra = normalizeExtra({
    ...data,
    extra_id: data.extra_id || state.editingExtraId || makeId("extra"),
    activo: el.extraForm.elements.activo.checked
  });

  upsertStorefrontExtra(extra);
  queuePendingMenuWrite("upsertExtra", { extra });
  resetExtraForm();
  resetCatalogSearch(false);
  renderAll();
  cacheCurrentMenu();
  const saved = await postAdmin("upsertExtra", { extra });
  if (saved) scheduleMenuRefresh();
}

async function deleteProduct(productId) {
  const product = state.products.find(item => item.producto_id === productId);
  if (!product) return;
  const confirmed = await smartConfirm({
    title: "Eliminar producto",
    message: `"${product.nombre}" se eliminara definitivamente de la carta.`,
    confirmText: "Eliminar",
    danger: true
  });
  if (!confirmed) return;

  state.products = state.products.filter(item => item.producto_id !== productId);
  queuePendingMenuWrite("deleteProduct", { producto_id: productId, hardDelete: true });
  if (state.editingProductId === productId) resetProductForm();
  resetCatalogSearch(false);
  renderAll();
  cacheCurrentMenu();
  const saved = await postAdmin("deleteProduct", { producto_id: productId, hardDelete: true });
  if (saved) scheduleMenuRefresh();
}

async function toggleExtra(extraId) {
  const extra = state.extras.find(item => item.extra_id === extraId);
  if (!extra) return;
  const updated = { ...extra, activo: !extra.activo };
  upsertStorefrontExtra(updated);
  queuePendingMenuWrite("upsertExtra", { extra: updated });
  renderAll();
  cacheCurrentMenu();
  const saved = await postAdmin("upsertExtra", { extra: updated });
  if (saved) scheduleMenuRefresh();
}

async function postAdmin(action, data) {
  if (!API_URL.trim()) {
    toast("Configura API_URL antes de guardar cambios reales.");
    return false;
  }
  if (!state.adminToken) {
    updateAdminSessionUi();
    toast("Inicia sesión en el panel administrativo.");
    return false;
  }

  try {
    const response = await fetch(API_URL.trim(), {
      method: "POST",
      body: JSON.stringify({
        action,
        token: state.adminToken,
        password: state.adminToken,
        ...data
      })
    });

    const payload = await response.json();
    if (!response.ok || !payload.ok) throw new Error(payload.error || `HTTP ${response.status}`);
    toast("La carta quedo actualizada correctamente.");
    return true;
  } catch (error) {
    console.error(error);
    toast(`No se pudo guardar: ${error.message}`);
    return false;
  }
}

function upsertStorefrontProduct(product, rebuildCategories = true) {
  const index = state.products.findIndex(item => item.producto_id === product.producto_id);
  if (index >= 0) {
    state.products[index] = product;
  } else {
    state.products = [product, ...state.products];
  }
  state.products = normalizeProducts(state.products);
  if (rebuildCategories) state.categories = buildCategories(state.products);
}

function upsertStorefrontExtra(extra) {
  const index = state.extras.findIndex(item => item.extra_id === extra.extra_id);
  if (index >= 0) {
    state.extras[index] = extra;
  } else {
    state.extras = [extra, ...state.extras];
  }
  state.extras = normalizeExtras(state.extras);
}

function cacheCurrentMenu() {
  cacheMenu({
    products: state.products,
    extras: state.extras,
    updatedAt: new Date().toISOString()
  });
}

function scheduleMenuRefresh() {
  window.clearTimeout(scheduleMenuRefresh.timer);
  scheduleMenuRefresh.timer = window.setTimeout(() => loadMenu({ background: true }), 1200);
}

function normalizeProducts(products) {
  return products
    .map(normalizeProduct)
    .filter(product => product.producto_id && product.nombre)
    .sort(sortByOrderThenName);
}

function normalizeProduct(product) {
  return {
    producto_id: String(product.producto_id || product.id || makeId("prod")).trim(),
    categoria_id: normalizeCategoryId(product.categoria_id || product.category || "general"),
    nombre: String(product.nombre || product.title || "").trim(),
    precio: moneyToNumber(product.precio ?? product.price),
    descripcion: String(product.descripcion || product.desc || "").trim(),
    imagen: String(product.imagen || product.image || "").trim(),
    opciones: normalizeProductOptions(product.opciones ?? product.options ?? product.sizes),
    orden: moneyToNumber(product.orden),
    activo: toBool(product.activo)
  };
}

function normalizeProductOptions(value) {
  let raw = value;
  if (typeof raw === "string") {
    const text = raw.trim();
    if (!text) return [];
    try {
      raw = JSON.parse(text);
    } catch {
      return [];
    }
  }

  if (!Array.isArray(raw)) return [];

  return raw
    .map((option, index) => ({
      id: String(option.id || option.option_id || makeId("opcion")).trim(),
      label: String(option.label || option.nombre || option.name || `Opcion ${index + 1}`).trim(),
      price: moneyToNumber(option.price ?? option.precio),
      image: String(option.image || option.imagen || "").trim()
    }))
    .filter(option => option.id && option.label && option.price > 0);
}

function getProductOptions(product) {
  return Array.isArray(product.opciones) ? product.opciones : [];
}

function getSelectedProductPrice(product, selectedOption) {
  return selectedOption?.price || product.precio;
}

function normalizeExtras(extras) {
  return extras
    .map(normalizeExtra)
    .filter(extra => extra.extra_id && extra.nombre)
    .sort(sortByOrderThenName);
}

function normalizeExtra(extra) {
  return {
    extra_id: String(extra.extra_id || extra.id || makeId("extra")).trim(),
    nombre: String(extra.nombre || extra.name || "").trim(),
    precio: moneyToNumber(extra.precio ?? extra.price),
    orden: moneyToNumber(extra.orden),
    activo: toBool(extra.activo)
  };
}

function buildCategories(products) {
  const ids = [...new Set(products.filter(product => product.activo).map(product => product.categoria_id).filter(Boolean))];
  return ids
    .sort((a, b) => categoryOrderIndex(a) - categoryOrderIndex(b) || labelFromId(a).localeCompare(labelFromId(b), "es"))
    .map(id => ({ id, label: labelFromId(id) }));
}

function getAvailableProducts() {
  return state.products.filter(product => product.activo);
}

function getAvailableExtras() {
  return state.extras.filter(extra => extra.activo);
}

function productAllowsExtras(product) {
  return !CATEGORIES_WITHOUT_EXTRAS.has(normalizeCategoryId(product.categoria_id));
}

function resolveProductImage(product) {
  const explicit = resolveImagePath(product.imagen);
  if (/^\.\/images\/pizza([1-8])\.png$/i.test(explicit)) return explicit;

  const known = getKnownProductImage(product);
  const knownImage = known ? resolveImagePath(known) : "";
  if (/^\.\/images\/pizza([1-8])\.png$/i.test(knownImage)) return knownImage;

  return productImageFallback(product);
}

function productImageFallback(product) {
  const order = moneyToNumber(product?.orden);
  const index = order > 0 ? ((order - 1) % 8) + 1 : 1;
  return `./images/pizza${index}.png`;
}

function resolveImagePath(value) {
  const image = String(value || "").trim();
  if (!image) return "";
  if (/^https?:\/\//i.test(image) || image.startsWith("data:")) return image;
  if (image.startsWith("./") || image.startsWith("images/")) return image;
  return `./images/${image}`;
}

function getKnownProductImage(product) {
  const productId = normalizeKnownProductId(product.producto_id || product.id);
  const known = KNOWN_PRODUCT_IMAGES_BY_ID[productId];
  if (!known) return "";

  const sameCategory = normalizeCategoryId(product.categoria_id) === normalizeCategoryId(known.category);
  if (!sameCategory) return "";

  const currentName = compactImageKey(product.nombre);
  const knownName = compactImageKey(known.name);
  const sameProduct = currentName && knownName && (currentName.includes(knownName) || knownName.includes(currentName));
  return sameProduct ? known.image : "";
}

function normalizeKnownProductId(value) {
  return String(value || "").trim().replace(/^prod-/i, "");
}

function normalizeImageKey(value) {
  return String(value || "")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function compactImageKey(value) {
  return normalizeImageKey(value).replace(/\s+/g, "");
}

function getImageTokens(value) {
  return normalizeImageKey(value)
    .split(" ")
    .filter(token => token.length > 2 && !["con", "del", "las", "los", "para"].includes(token));
}

function detectCategoryFamily(categoryId, productName = "") {
  const categoryKey = normalizeImageKey(categoryId);
  const categoryCompact = compactImageKey(categoryId);
  const nameKey = normalizeImageKey(productName);
  const nameCompact = compactImageKey(productName);

  const categoryFamily = CATEGORY_DETECTION_ORDER.find(family => {
    const group = IMAGE_CATEGORY_GROUPS[family];
    return group.aliases.some(alias => {
      const aliasKey = normalizeImageKey(alias);
      const aliasCompact = compactImageKey(alias);
      return categoryKey.split(" ").includes(aliasKey) ||
        categoryCompact.includes(aliasCompact);
    });
  });

  if (categoryFamily) return categoryFamily;

  return CATEGORY_DETECTION_ORDER.find(family => {
    const group = IMAGE_CATEGORY_GROUPS[family];
    return group.aliases.some(alias => {
      const aliasKey = normalizeImageKey(alias);
      const aliasCompact = compactImageKey(alias);
      return nameKey.split(" ").includes(aliasKey) ||
        nameCompact.includes(aliasCompact);
    });
  }) || "";
}

function detectImageFamilies(imageKey, imageCompact) {
  return new Set(CATEGORY_DETECTION_ORDER.filter(family => {
    const group = IMAGE_CATEGORY_GROUPS[family];
    return group.aliases.some(alias => imageMatchesTerm(imageKey, imageCompact, alias));
  }));
}

function imageMatchesTerm(imageKey, imageCompact, term) {
  const termKey = normalizeImageKey(term);
  const termCompact = compactImageKey(term);
  return imageKey.split(" ").includes(termKey) || imageCompact.includes(termCompact);
}

function hasCategoryConflict(productFamily, imageFamilies) {
  if (!imageFamilies.size || imageFamilies.has(productFamily)) return false;
  return [...imageFamilies].some(family => family !== productFamily);
}

function getCartTotals() {
  return {
    subtotal: state.cart.reduce((sum, item) => sum + getItemTotal(item), 0n)
  };
}

function getItemTotal(item) {
  const extrasTotal = (item.extras || []).reduce((sum, extra) => {
    return sum + moneyToBigInt(extra.precio) * qtyToBigInt(extra.qty);
  }, 0n);
  return moneyToBigInt(item.price) * qtyToBigInt(item.qty) + extrasTotal;
}

function openCart() {
  openLayer(el.cartDrawer);
}

function closeCart() {
  closeLayer(el.cartDrawer);
}

function closeProductModal() {
  closeLayer(el.productModal);
}

function closeCheckout() {
  closeLayer(el.checkoutModal);
}

function openSideMenu() {
  el.sideMenu.classList.remove("hidden");
  el.sideMenu.setAttribute("aria-hidden", "false");
  window.requestAnimationFrame(() => el.sideMenu.classList.add("is-open"));
}

function closeSideMenu() {
  el.sideMenu.classList.remove("is-open");
  el.sideMenu.setAttribute("aria-hidden", "true");
  window.setTimeout(() => {
    if (!el.sideMenu.classList.contains("is-open")) {
      el.sideMenu.classList.add("hidden");
    }
  }, 260);
}

function openLayer(node) {
  node.classList.remove("hidden");
  node.setAttribute("aria-hidden", "false");
}

function closeLayer(node) {
  node.classList.add("hidden");
  node.setAttribute("aria-hidden", "true");
}

function smartConfirm(options = {}) {
  return openSmartDialog({ ...options, mode: "confirm" });
}

function smartPrompt(options = {}) {
  return openSmartDialog({ ...options, mode: "prompt" });
}

function openSmartDialog(options = {}) {
  return new Promise(resolve => {
    const mode = options.mode || "confirm";
    const isPrompt = mode === "prompt";
    el.smartDialogKicker.textContent = options.kicker || "Quicio - Caprichos";
    el.smartDialogTitle.textContent = options.title || "Confirmar acción";
    el.smartDialogMessage.textContent = options.message || "Revisa la información antes de continuar.";
    el.smartDialogCancel.textContent = options.cancelText || "Cancelar";
    el.smartDialogConfirm.textContent = options.confirmText || "Continuar";
    el.smartDialogConfirm.classList.toggle("danger-btn", Boolean(options.danger));
    el.smartDialogConfirm.classList.toggle("primary-btn", !options.danger);
    el.smartDialogField.classList.toggle("hidden", !isPrompt);
    el.smartDialogField.childNodes[0].textContent = options.label || "Respuesta";
    el.smartDialogInput.value = options.value || "";
    el.smartDialogInput.placeholder = options.placeholder || "";
    el.smartDialogInput.inputMode = options.inputMode || "text";

    const finish = value => {
      document.removeEventListener("keydown", handleKeys);
      el.smartDialogClose.removeEventListener("click", cancel);
      el.smartDialogCancel.removeEventListener("click", cancel);
      el.smartDialogConfirm.removeEventListener("click", accept);
      el.smartDialog.removeEventListener("click", backdrop);
      closeLayer(el.smartDialog);
      resolve(value);
    };
    const cancel = () => finish(isPrompt ? "" : false);
    const accept = () => finish(isPrompt ? el.smartDialogInput.value : true);
    const backdrop = event => {
      if (event.target === el.smartDialog) cancel();
    };
    const handleKeys = event => {
      if (event.key === "Escape") cancel();
      if (event.key === "Enter" && (isPrompt || document.activeElement !== el.smartDialogCancel)) {
        event.preventDefault();
        accept();
      }
    };

    el.smartDialogClose.addEventListener("click", cancel);
    el.smartDialogCancel.addEventListener("click", cancel);
    el.smartDialogConfirm.addEventListener("click", accept);
    el.smartDialog.addEventListener("click", backdrop);
    document.addEventListener("keydown", handleKeys);
    openLayer(el.smartDialog);
    window.setTimeout(() => (isPrompt ? el.smartDialogInput : el.smartDialogConfirm).focus(), 40);
  });
}

function setSync(text) {
  el.syncStatus.textContent = text;
}

function showLoader(title = "Sincronizando carta", text = "Estamos preparando la información.") {
  showLoader.count = (showLoader.count || 0) + 1;
  el.loaderTitle.textContent = title;
  el.loaderText.textContent = text;
  el.loader.classList.remove("hidden");
  el.loader.setAttribute("aria-hidden", "false");
}

function hideLoader() {
  showLoader.count = Math.max(0, (showLoader.count || 0) - 1);
  if (showLoader.count > 0) return;
  el.loader.classList.add("hidden");
  el.loader.setAttribute("aria-hidden", "true");
}

function toast(message) {
  el.toast.textContent = message;
  el.toast.classList.add("show");
  window.clearTimeout(toast.timer);
  toast.timer = window.setTimeout(() => el.toast.classList.remove("show"), 3600);
}

function setFormValues(form, values) {
  Object.entries(values).forEach(([key, value]) => {
    if (form.elements[key] && form.elements[key].type !== "checkbox") {
      form.elements[key].value = key === "opciones" && Array.isArray(value)
        ? JSON.stringify(value)
        : key === "precio" && value != null && String(value).trim() !== ""
        ? formatMoney(value)
        : value ?? "";
    }
  });
  updateEditedFields(form);
}

function getFormObject(form) {
  return Object.fromEntries(new FormData(form).entries());
}

function resetCatalogSearch(shouldRender = true) {
  state.search = "";
  if (el.search) el.search.value = "";
  if (shouldRender) renderProducts();
}

function disableSearchAutofill() {
  if (!el.search) return;
  const harden = () => {
    const nonce = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
    el.search.setAttribute("autocomplete", "off");
    el.search.setAttribute("autocorrect", "off");
    el.search.setAttribute("autocapitalize", "none");
    el.search.setAttribute("spellcheck", "false");
    el.search.setAttribute("inputmode", "search");
    el.search.setAttribute("enterkeyhint", "search");
    el.search.setAttribute("name", `q_${nonce}`);
    el.search.setAttribute("id", "search");
    el.search.setAttribute("data-lpignore", "true");
    el.search.setAttribute("data-1p-ignore", "true");
    el.search.setAttribute("data-form-type", "other");
    el.search.setAttribute("aria-autocomplete", "none");
    el.search.setAttribute("readonly", "readonly");
  };

  harden();
  window.setTimeout(() => {
    el.search.removeAttribute("readonly");
    stripEmailAutofill(true);
  }, 250);

  window.setTimeout(() => harden(), 0);
  window.setTimeout(() => stripEmailAutofill(true), 600);
  window.setTimeout(() => stripEmailAutofill(true), 1400);

  el.search.addEventListener("focus", () => {
    el.search.removeAttribute("readonly");
    stripEmailAutofill(true);
  });

  el.search.addEventListener("blur", () => {
    stripEmailAutofill(false);
    harden();
  });

  el.search.addEventListener("paste", event => {
    const text = event.clipboardData?.getData("text") || "";
    if (looksLikeEmailAutofill(text)) {
      event.preventDefault();
      stripEmailAutofill(true);
      toast("El buscador no acepta correos ni autocompletado.");
    }
  });

  el.search.addEventListener("beforeinput", event => {
    if (looksLikeEmailAutofill(event.data || "")) {
      event.preventDefault();
      stripEmailAutofill(true);
    }
  });
}

function sanitizeCatalogSearch(value) {
  const text = String(value || "");
  if (looksLikeEmailAutofill(text)) {
    stripEmailAutofill(true);
    return "";
  }

  return text.replace(/@/g, "").trim().toLowerCase();
}

function stripEmailAutofill(shouldRender = false) {
  if (!el.search) return;
  const value = el.search.value || "";
  if (!looksLikeEmailAutofill(value) && !value.includes("@")) {
    state.search = value.trim().toLowerCase();
    return;
  }

  el.search.value = "";
  state.search = "";
  if (shouldRender) renderProducts();
}

function looksLikeEmailAutofill(value) {
  const text = String(value || "").trim();
  return EMAIL_AUTOFILL_PATTERN.test(text) || /@/.test(text);
}

function bindAdminMoneyInputs() {
  [el.productForm, el.extraForm].forEach(form => {
    const input = form?.elements?.precio;
    if (!input) return;
    input.addEventListener("input", () => formatAdminMoneyInput(input));
    input.addEventListener("blur", () => formatAdminMoneyInput(input));
  });
}

function formatAdminMoneyInput(input) {
  const amount = moneyToNumber(input.value);
  input.value = amount > 0 ? formatMoney(amount) : "";
}

function markFormEditing(form, isEditing) {
  form.classList.toggle("editing", isEditing);
  if (!isEditing) {
    form.querySelectorAll(".field-editing").forEach(label => label.classList.remove("field-editing"));
    return;
  }
  updateEditedFields(form);
}

function updateEditedFields(form) {
  const isEditing = form.classList.contains("editing");
  form.querySelectorAll("label").forEach(label => {
    const field = label.querySelector("input:not([type='hidden']):not([type='checkbox']), textarea, select");
    label.classList.toggle("field-editing", Boolean(isEditing && field && String(field.value || "").trim()));
  });
}

function sortByOrderThenName(a, b) {
  return moneyToNumber(a.orden) - moneyToNumber(b.orden) || String(a.nombre).localeCompare(String(b.nombre), "es");
}

function sortAdminProducts(a, b) {
  return categoryOrderIndex(a.categoria_id) - categoryOrderIndex(b.categoria_id) || sortByOrderThenName(a, b);
}

function formatMoney(value) {
  const amount = typeof value === "bigint" ? value : moneyToBigInt(value);
  return `$ ${amount.toLocaleString("es-CO")}`;
}

function moneyToNumber(value) {
  if (typeof value === "number" && Number.isFinite(value)) return Math.max(0, Math.round(value));
  const cleaned = String(value ?? "0").replace(/[^\d-]/g, "");
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? Math.max(0, Math.round(parsed)) : 0;
}

function moneyToBigInt(value) {
  if (typeof value === "bigint") return value < 0n ? 0n : value;
  const cleaned = String(value ?? "0").replace(/[^\d-]/g, "");
  if (!cleaned || cleaned === "-") return 0n;
  try {
    const parsed = BigInt(cleaned);
    return parsed < 0n ? 0n : parsed;
  } catch {
    return BigInt(moneyToNumber(value));
  }
}

function qtyToBigInt(value) {
  return BigInt(clampQuantity(value));
}

function clampQuantity(value, min = 1, max = MAX_QTY) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return min;
  return Math.min(max, Math.max(min, parsed));
}

function toBool(value) {
  if (typeof value === "boolean") return value;
  const normalized = String(value ?? "true").trim().toLowerCase();
  return !["false", "0", "no", "inactivo", "inactive"].includes(normalized);
}

function makeId(prefix) {
  const random = globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `${prefix}-${random}`.toLowerCase();
}

function slugify(value) {
  return String(value || "general")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "general";
}

function normalizeCategoryId(value) {
  const id = slugify(value);
  return id;
}

function sameMeaningfulJson(a, b) {
  return JSON.stringify(normalizeComparable(a)) === JSON.stringify(normalizeComparable(b));
}

function normalizeComparable(value) {
  if (Array.isArray(value)) return value.map(normalizeComparable);
  if (!value || typeof value !== "object") return value;
  return Object.keys(value)
    .sort()
    .reduce((acc, key) => {
      if (["updatedAt", "actualizado"].includes(key)) return acc;
      acc[key] = normalizeComparable(value[key]);
      return acc;
    }, {});
}

function categoryOrderIndex(id) {
  const index = CATEGORY_ORDER.indexOf(id);
  return index === -1 ? CATEGORY_ORDER.length : index;
}

function labelFromId(value) {
  const id = normalizeCategoryId(value);
  if (CATEGORY_LABELS[id]) return CATEGORY_LABELS[id];
  return String(id || "general")
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, char => char.toUpperCase());
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[char]));
}

function escapeAttr(value) {
  return escapeHtml(value).replace(/`/g, "&#96;");
}

function cssEscape(value) {
  if (globalThis.CSS?.escape) return CSS.escape(String(value));
  return String(value).replace(/["\\]/g, "\\$&");
}
