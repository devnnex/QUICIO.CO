const API_URL = "https://script.google.com/macros/s/AKfycbxGK3SO5qM7EMkQx9Y9BuBeMNrH3sV3OAknikoHqW-k9mWJkfuAdRbboh9kvYv86Rr0/exec";
const ADMIN_CACHE_KEY = "chanchos_admin_cache_v2";
const ADMIN_PENDING_KEY = "chanchos_admin_pending_v1";
const API_TIMEOUT_MS = 18000;
const API_REALTIME_POLL_MS = 1000;

const state = {
  token: sessionStorage.getItem("chanchos_admin_token") || "",
  cashierSession: JSON.parse(sessionStorage.getItem("chanchos_cashier_session") || "null"),
  hasBoss: true,
  loginMode: "login",
  products: [],
  extras: [],
  orders: [],
  tables: [],
  payments: [],
  inventory: [],
  inventoryMovements: JSON.parse(localStorage.getItem("chanchos_inventory_movements_v1") || "[]"),
  cashiers: [],
  pendingWrites: readPendingWrites(),
  kpis: {},
  activeKpiDetail: "",
  incomeSourceFilter: "todos",
  incomeDateFilter: "hoy",
  inventoryMovementSearch: "",
  orderFilter: "todas",
  selectedOrderIds: new Set(),
  activeView: location.hash?.replace("#", "") || "mesas",
  productCategoryFilter: "todas",
  selectedTableId: localStorage.getItem("chanchos_selected_table") || "",
  dispatchSearch: "",
  knownOrderIds: new Set(),
  liveOrdersReady: false,
  pollTimer: null,
  syncInProgress: false,
  orderSyncInProgress: false,
  pendingFlushInProgress: false,
  soundReady: false
};

const el = {
  navLinks: document.querySelectorAll("[data-view]"),
  loginGate: document.getElementById("login-gate"),
  loginForm: document.getElementById("login-form"),
  loginModeLabel: document.getElementById("login-mode-label"),
  loginTitle: document.getElementById("login-title"),
  loginCopy: document.getElementById("login-copy"),
  loginSubmit: document.getElementById("login-submit"),
  loginHelper: document.getElementById("login-helper"),
  loginError: document.getElementById("login-error"),
  loginPasswordToggle: document.getElementById("login-password-toggle"),
  firstBossName: document.getElementById("first-boss-name"),
  sidebarChat: document.getElementById("sidebar-chat"),
  sidebarChatTitle: document.getElementById("sidebar-chat-title"),
  sidebarChatMessages: document.getElementById("sidebar-chat-messages"),
  sidebarChatForm: document.getElementById("sidebar-chat-form"),
  sidebarChatClose: document.getElementById("sidebar-chat-close"),
  sessionRole: document.getElementById("session-role"),
  sessionUser: document.getElementById("session-user"),
  logout: document.getElementById("logout-admin"),
  reload: document.getElementById("reload-admin"),
  status: document.getElementById("dashboard-status"),
  orderFilter: document.getElementById("order-status-filter"),
  ordersList: document.getElementById("orders-list"),
  selectAllOrders: document.getElementById("select-all-orders"),
  selectedOrdersCount: document.getElementById("selected-orders-count"),
  bulkOrderStatus: document.getElementById("bulk-order-status"),
  applyBulkOrderStatus: document.getElementById("apply-bulk-order-status"),
  productsTable: document.getElementById("products-table"),
  productCategoryStrip: document.getElementById("product-category-strip"),
  extrasTable: document.getElementById("extras-table"),
  inventoryTable: document.getElementById("inventory-table"),
  inventoryKpis: document.getElementById("inventory-kpis"),
  inventoryMovements: document.getElementById("inventory-movements"),
  inventoryMovementSearch: document.getElementById("inventory-movement-search"),
  incomeList: document.getElementById("income-list"),
  incomeSourceFilter: document.getElementById("income-source-filter"),
  incomeDateFilter: document.getElementById("income-date-filter"),
  cashiersTable: document.getElementById("cashiers-table"),
  productSubmit: document.getElementById("product-submit"),
  productForm: document.getElementById("product-form"),
  extraForm: document.getElementById("extra-form"),
  inventoryForm: document.getElementById("inventory-form"),
  cashierForm: document.getElementById("cashier-form"),
  newProduct: document.getElementById("new-product"),
  newExtra: document.getElementById("new-extra"),
  newInventory: document.getElementById("new-inventory"),
  newCashier: document.getElementById("new-cashier"),
  tableForm: document.getElementById("table-form"),
  quickExpenseForm: document.getElementById("quick-expense-form"),
  tablesGrid: document.getElementById("tables-grid"),
  selectedTableTitle: document.getElementById("selected-table-title"),
  tableTicket: document.getElementById("table-ticket"),
  dispatchSearch: document.getElementById("dispatch-search"),
  dispatchProducts: document.getElementById("dispatch-products"),
  backToTables: document.getElementById("back-to-tables"),
  openCheckout: document.getElementById("open-checkout"),
  printReceipt: document.getElementById("print-receipt"),
  checkoutModal: document.getElementById("checkout-modal"),
  checkoutClose: document.getElementById("checkout-close"),
  checkoutForm: document.getElementById("table-checkout-form"),
  checkoutTitle: document.getElementById("checkout-table-title"),
  checkoutTotal: document.getElementById("checkout-total"),
  mixedPaymentFields: document.getElementById("mixed-payment-fields"),
  cancelTable: document.getElementById("cancel-table"),
  smartDialog: document.getElementById("smart-dialog"),
  smartDialogClose: document.getElementById("smart-dialog-close"),
  smartDialogKicker: document.getElementById("smart-dialog-kicker"),
  smartDialogTitle: document.getElementById("smart-dialog-title"),
  smartDialogMessage: document.getElementById("smart-dialog-message"),
  smartDialogField: document.getElementById("smart-dialog-field"),
  smartDialogInput: document.getElementById("smart-dialog-input"),
  smartDialogCancel: document.getElementById("smart-dialog-cancel"),
  smartDialogConfirm: document.getElementById("smart-dialog-confirm"),
  toast: document.getElementById("toast"),
  newOrderAlert: document.getElementById("new-order-alert"),
  newOrderAlertClose: document.getElementById("new-order-alert-close"),
  newOrderAlertOpen: document.getElementById("new-order-alert-open"),
  newOrderAlertTitle: document.getElementById("new-order-alert-title"),
  newOrderAlertDetail: document.getElementById("new-order-alert-detail"),
  notificationPermission: document.getElementById("notification-permission-btn"),
  notificationPermissionLabel: document.getElementById("notification-permission-label"),
  alertSound: document.getElementById("order-alert-sound")
};

document.addEventListener("DOMContentLoaded", init);

function init() {
  bindEvents();
  updateNotificationPermissionUi();
  applyCachedAdminData();
  setActiveView(state.activeView);
  updateSessionUi();
  loadAuthInfo();
  if (state.token) {
    hideLoginGate();
    loadAdminData();
    startOrderPolling();
  } else {
    showLoginGate();
    renderAll();
  }
}

function bindEvents() {
  el.navLinks.forEach(link => {
    link.addEventListener("click", event => {
      event.preventDefault();
      setActiveView(link.dataset.view);
    });
  });

  el.loginForm.addEventListener("submit", submitLogin);
  el.loginForm.addEventListener("input", clearLoginError);
  el.loginPasswordToggle?.addEventListener("click", toggleLoginPassword);
  el.logout.addEventListener("click", logoutAdmin);

  el.reload.addEventListener("click", () => {
    unlockSound();
    loadAdminData();
    startOrderPolling();
  });

  el.orderFilter.addEventListener("change", () => {
    state.orderFilter = el.orderFilter.value;
    renderOrders();
  });
  el.selectAllOrders?.addEventListener("change", toggleAllVisibleOrders);
  el.bulkOrderStatus?.addEventListener("change", () => updateBulkOrderToolbar());
  el.applyBulkOrderStatus?.addEventListener("click", applyBulkOrderStatus);
  el.newOrderAlertClose?.addEventListener("click", hideNewOrderAlert);
  el.newOrderAlertOpen?.addEventListener("click", openNewOrders);
  el.notificationPermission?.addEventListener("click", enableAdminAlerts);
  document.addEventListener("pointerdown", unlockSound, { once: true });
  document.addEventListener("keydown", unlockSound, { once: true });

  el.incomeSourceFilter?.addEventListener("change", () => {
    state.incomeSourceFilter = el.incomeSourceFilter.value;
    renderKpis();
    renderIncome();
  });

  el.incomeDateFilter?.addEventListener("change", () => {
    state.incomeDateFilter = el.incomeDateFilter.value;
    renderKpis();
    renderIncome();
  });

  el.inventoryMovementSearch?.addEventListener("input", () => {
    state.inventoryMovementSearch = el.inventoryMovementSearch.value;
    renderInventoryMovements();
  });

  el.dispatchSearch.addEventListener("input", () => {
    state.dispatchSearch = el.dispatchSearch.value;
    renderDispatchProducts();
  });
  el.backToTables?.addEventListener("click", showTablesOverview);
  document.querySelectorAll("[data-plan-whatsapp]").forEach(button => {
    button.addEventListener("click", () => openPlanWhatsApp(button.dataset.planWhatsapp));
  });
  document.querySelectorAll("[data-open-assistant]").forEach(button => {
    button.addEventListener("click", () => openSidebarAssistant(button.dataset.openAssistant));
  });
  el.sidebarChatClose?.addEventListener("click", closeSidebarAssistant);
  el.sidebarChatForm?.addEventListener("submit", handleSidebarAssistantQuestion);

  el.tableForm.addEventListener("submit", createTable);
  el.quickExpenseForm.addEventListener("submit", addQuickExpenseToTable);
  el.openCheckout.addEventListener("click", openTableCheckout);
  el.printReceipt.addEventListener("click", printSelectedReceipt);
  el.checkoutClose.addEventListener("click", closeCheckout);
  el.checkoutModal.addEventListener("click", event => {
    if (event.target === el.checkoutModal) closeCheckout();
  });
  el.checkoutForm.addEventListener("submit", checkoutTable);
  el.cancelTable.addEventListener("click", cancelSelectedTable);
  el.checkoutForm.addEventListener("input", handlePaymentInput);
  el.checkoutForm.addEventListener("change", handlePaymentInput);

  el.productForm.addEventListener("submit", saveProduct);
  el.extraForm.addEventListener("submit", saveExtra);
  el.inventoryForm.addEventListener("submit", saveInventoryItem);
  el.cashierForm.addEventListener("submit", saveCashier);

  document.querySelectorAll(".dashboard-main [data-assistant-form]").forEach(form => {
    form.addEventListener("submit", handleAssistantQuestion);
  });
  document.querySelectorAll(".dashboard-main .assistant-panel").forEach(panel => {
    panel.classList.add("assistant-collapsed");
    panel.querySelector(".panel-heading")?.addEventListener("click", () => {
      panel.classList.toggle("is-open");
      panel.classList.toggle("assistant-collapsed", !panel.classList.contains("is-open"));
    });
  });

  document.querySelectorAll("[data-kpi-detail]").forEach(card => {
    card.setAttribute("role", "button");
    card.tabIndex = 0;
    card.addEventListener("click", () => {
      card.classList.remove("is-clicked");
      void card.offsetWidth;
      card.classList.add("is-clicked");
      showKpiDetail(card.dataset.kpiDetail);
    });
    card.addEventListener("keydown", event => {
      if (!["Enter", " "].includes(event.key)) return;
      event.preventDefault();
      card.click();
    });
    card.addEventListener("animationend", () => card.classList.remove("is-clicked"));
  });

  bindSmartInternalScroll();

  [el.productForm, el.extraForm, el.inventoryForm, el.cashierForm].forEach(form => {
    form.addEventListener("input", () => updateFormChecks(form));
    form.addEventListener("change", () => updateFormChecks(form));
  });
  bindAdminMoneyInputs();

  document.querySelectorAll("[data-collapse-form]").forEach(button => {
    button.addEventListener("click", () => {
      const form = document.getElementById(button.dataset.collapseForm);
      if (form) collapseForm(form);
    });
  });

  el.newProduct.addEventListener("click", () => openFormForCreate(el.productForm, "producto"));
  el.newExtra.addEventListener("click", () => openFormForCreate(el.extraForm, "extra"));
  el.newInventory.addEventListener("click", () => openFormForCreate(el.inventoryForm, "insumo"));
  el.newCashier.addEventListener("click", () => openFormForCreate(el.cashierForm, "cajero"));

  document.addEventListener("visibilitychange", () => {
    if (!document.hidden && state.token) {
      flushPendingWrites();
      loadAdminData({ silent: true });
    }
  });
  window.addEventListener("online", flushPendingWrites);
  window.setInterval(flushPendingWrites, 15000);
}

function setActiveView(view) {
  const allowed = ["mesas", "resumen", "ordenes", "carta", "extras", "inventario", "cajeros", "planes"];
  state.activeView = allowed.includes(view) ? view : "mesas";
  if (state.activeView === "cajeros" && state.cashierSession && !isBossUser()) state.activeView = "mesas";
  document.body.dataset.adminView = state.activeView;
  el.navLinks.forEach(link => link.classList.toggle("active", link.dataset.view === state.activeView));
  history.replaceState(null, "", `#${state.activeView}`);
}

async function loadAuthInfo() {
  try {
    const url = new URL(API_URL);
    url.searchParams.set("action", "authInfo");
    url.searchParams.set("_", Date.now().toString());
    const response = await fetchWithTimeout(url.toString(), { cache: "no-store" });
    const payload = await response.json();
    if (!response.ok || !payload.ok) throw new Error(payload.error || `HTTP ${response.status}`);
    state.hasBoss = payload.data?.hasBoss !== false;
    updateLoginMode();
  } catch (error) {
    console.warn("No se pudo verificar estado de login", error);
    state.hasBoss = true;
    updateLoginMode();
  }
}

function updateLoginMode() {
  state.loginMode = state.hasBoss ? "login" : "createBoss";
  const creating = state.loginMode === "createBoss";
  el.loginModeLabel.textContent = creating ? "Primer acceso" : "Acceso seguro";
  el.loginTitle.textContent = creating ? "Crear jefe principal" : "Entrar al panel";
  el.loginCopy.textContent = creating
    ? "No hay jefe registrado. Crea el primer usuario principal para administrar el negocio."
    : "Ingresa con el correo y la contraseña creados para el equipo.";
  el.loginSubmit.textContent = creating ? "Crear jefe" : "Entrar";
  el.loginHelper.textContent = creating ? "Quicio - Caprichos Admin v4.0 | Primer acceso principal" : "Quicio - Caprichos Admin v4.0";
  el.firstBossName.classList.toggle("hidden", !creating);
  el.loginForm.elements.nombre.required = creating;
}

function showLoginError(message) {
  if (!el.loginError) return;
  el.loginError.textContent = message;
  el.loginError.classList.remove("hidden");
}

function clearLoginError() {
  if (!el.loginError) return;
  el.loginError.textContent = "";
  el.loginError.classList.add("hidden");
}

function loginErrorMessage(error) {
  const text = String(error?.message || "").trim();
  if (/correo/i.test(text) && /no existe|registrado|encontr/i.test(text)) return "Ese correo no está registrado.";
  if (/contrasena|clave/i.test(text) && /incorrect/i.test(text)) return "La contraseña es incorrecta.";
  if (/inactivo|desactiv/i.test(text)) return "Este usuario está inactivo. Pide a un jefe que lo active.";
  if (/correo/i.test(text) && /contrasena|clave/i.test(text)) return "Revisa el correo y la contraseña.";
  return text || "No pudimos validar el acceso. Intenta de nuevo.";
}

function toggleLoginPassword() {
  const input = el.loginForm.elements.clave;
  const showing = input.type === "text";
  input.type = showing ? "password" : "text";
  el.loginPasswordToggle.setAttribute("aria-pressed", String(!showing));
  el.loginPasswordToggle.setAttribute("aria-label", showing ? "Mostrar contraseña" : "Ocultar contraseña");
  input.focus();
}

async function submitLogin(event) {
  event.preventDefault();
  clearLoginError();
  const data = getFormObject(el.loginForm);
  const correo = String(data.correo || "").trim().toLowerCase();
  const clave = String(data.clave || "").trim();
  const nombre = String(data.nombre || "").trim();
  if (!correo) {
    showLoginError("El correo está vacío o mal escrito.");
    el.loginForm.elements.correo.focus();
    return;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) {
    showLoginError("El correo está mal escrito.");
    el.loginForm.elements.correo.focus();
    return;
  }
  if (!clave) {
    showLoginError("La contraseña está vacía.");
    el.loginForm.elements.clave.focus();
    return;
  }

  el.loginSubmit.disabled = true;
  el.loginSubmit.textContent = state.loginMode === "createBoss" ? "Creando..." : "Entrando...";
  try {
    const action = state.loginMode === "createBoss" ? "createFirstBoss" : "loginStaff";
    const response = await fetchWithTimeout(API_URL, {
      method: "POST",
      body: JSON.stringify({ action, correo, clave, nombre })
    });
    const payload = await response.json();
    if (!response.ok || !payload.ok) throw new Error(payload.error || `HTTP ${response.status}`);
    startSession(payload.data);
    hideLoginGate();
    unlockSound();
    setStatus("Cargando panel...");
    loadAdminData({ silent: true });
    startOrderPolling();
    toast(`Bienvenido, ${state.cashierSession.nombre}.`);
  } catch (error) {
    console.warn("Validacion de acceso pendiente", error);
    const message = loginErrorMessage(error);
    showLoginError(message);
    toast(message);
  } finally {
    el.loginSubmit.disabled = false;
    updateLoginMode();
  }
}

function startSession(data = {}) {
  state.token = data.token || "";
  state.cashierSession = data.user || data.cashier || null;
  sessionStorage.setItem("chanchos_admin_token", state.token);
  sessionStorage.setItem("chanchos_cashier_session", JSON.stringify(state.cashierSession));
  updateSessionUi();
  applyRoleAccess();
  flushPendingWrites();
}

function logoutAdmin() {
  state.token = "";
  state.cashierSession = null;
  sessionStorage.removeItem("chanchos_admin_token");
  sessionStorage.removeItem("chanchos_cashier_session");
  window.clearInterval(state.pollTimer);
  updateSessionUi();
  showLoginGate();
  setStatus("Sesión cerrada. Inicia sesión para continuar.");
}

function showLoginGate() {
  document.body.classList.add("login-open");
  el.loginGate.classList.add("is-visible");
  el.loginGate.setAttribute("aria-hidden", "false");
  window.setTimeout(() => el.loginForm.elements.correo?.focus(), 80);
}

function hideLoginGate() {
  document.body.classList.remove("login-open");
  el.loginGate.classList.remove("is-visible");
  el.loginGate.setAttribute("aria-hidden", "true");
}

function updateSessionUi() {
  const user = state.cashierSession;
  el.sessionRole.textContent = user ? labelFromId(user.rol || "cajero") : "Sesión";
  el.sessionUser.textContent = user ? user.nombre || user.correo || "Usuario" : "Sin iniciar";
  applyRoleAccess();
}

function sessionStatusText() {
  const user = state.cashierSession;
  if (!user) return "Inicia sesión para cargar el panel.";
  return `Última sesión: ${formatDateTime(user.ultimo_acceso || new Date().toISOString())}`;
}

function applyRoleAccess() {
  const canManageUsers = !state.cashierSession || isBossUser();
  el.navLinks.forEach(link => {
    if (link.dataset.view === "cajeros") link.classList.toggle("hidden", !canManageUsers);
  });
  if (el.newCashier) el.newCashier.disabled = !canManageUsers;
  if (el.cashierForm) el.cashierForm.classList.toggle("hidden", !canManageUsers);
  if (state.activeView === "cajeros" && !canManageUsers) setActiveView("mesas");
}

function isBossUser() {
  const role = normalize(state.cashierSession?.rol || "");
  return role === "jefe" || role === "admin" || role === "administrador";
}

async function loadAdminData(options = {}) {
  if (!state.token) {
    setStatus("Inicia sesión para cargar el panel.");
    return;
  }
  if (state.syncInProgress && options.silent) return;

  if (!options.silent) setStatus("Actualizando información...");
  state.syncInProgress = true;
  try {
    const url = new URL(API_URL);
    url.searchParams.set("action", "adminData");
    url.searchParams.set("token", state.token);
    url.searchParams.set("fresh", "1");
    url.searchParams.set("_", Date.now().toString());
    const response = await fetchWithTimeout(url.toString(), { cache: "no-store" });
    const payload = await response.json();
    if (!response.ok || !payload.ok) throw new Error(payload.error || `HTTP ${response.status}`);

    hydrateAdminData(payload.data);
    applyPendingWrites();
    flushPendingWrites();
    cacheAdminData();
    renderSyncedData(options);
    if (!options.silent) setStatus(sessionStatusText());
  } catch (error) {
    console.warn("Actualización en segundo plano pendiente", error);
    setStatus("Panel listo con información guardada.");
  } finally {
    state.syncInProgress = false;
  }
}

function hydrateAdminData(data = {}) {
  const nextOrders = normalizeOrdersForAdmin(data.orders || []);
  notifyIfNewOrders(nextOrders);
  state.products = normalizeProductsForAdmin(data.products || state.products);
  state.extras = normalizeExtrasForAdmin(data.extras || state.extras);
  state.orders = nextOrders;
  state.tables = mergePendingTables(normalizeTables(data.tables || state.tables));
  state.payments = normalizePayments(data.payments || state.payments);
  state.inventory = normalizeInventory(data.inventory || state.inventory);
  state.inventoryMovements = mergeInventoryMovements(data.inventoryMovements || []);
  localStorage.setItem("chanchos_inventory_movements_v1", JSON.stringify(state.inventoryMovements.slice(0, 200)));
  state.cashiers = normalizeCashiers(data.cashiers || state.cashiers);
  state.kpis = data.kpis || {};
  applyRoleAccess();
  if (!state.selectedTableId || !state.tables.some(table => table.table_id === state.selectedTableId)) {
    state.selectedTableId = state.tables[0]?.table_id || "";
  }
}

function readPendingWrites() {
  try {
    const raw = localStorage.getItem(ADMIN_PENDING_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function savePendingWrites() {
  try {
    localStorage.setItem(ADMIN_PENDING_KEY, JSON.stringify(state.pendingWrites.slice(-80)));
  } catch (error) {
    console.warn("No se pudo guardar cola local admin", error);
  }
}

function queuePendingWrite(action, data) {
  const pending = {
    action,
    data,
    id: pendingIdFor(action, data),
    createdAt: Date.now()
  };
  state.pendingWrites = state.pendingWrites.filter(item => !(item.action === action && item.id === pending.id));
  state.pendingWrites.push(pending);
  savePendingWrites();
  return pending;
}

function pendingIdFor(action, data = {}) {
  if (action === "bulkUpdateOrderStatus") return data.operation_key || `${data.estado}:${[...(data.order_ids || [])].sort().join(",")}`;
  if (data.product?.producto_id || data.producto_id) return data.product?.producto_id || data.producto_id;
  if (data.extra?.extra_id || data.extra_id) return data.extra?.extra_id || data.extra_id;
  if (data.item?.inventory_id || data.inventory_id) return data.item?.inventory_id || data.inventory_id;
  if (data.cashier?.cashier_id || data.cashier_id) return data.cashier?.cashier_id || data.cashier_id;
  if (data.table?.table_id) return data.table.table_id;
  if (data.table_id) return data.table_id;
  if (data.payment?.payment_id) return data.payment.payment_id;
  if (data.order_id) return data.order_id;
  return `${action}-${Date.now()}`;
}

function applyPendingWrites() {
  const fresh = [];
  state.pendingWrites.forEach(pending => {
    if (!pendingAlreadySynced(pending)) applyPendingWrite(pending);
    fresh.push(pending);
  });
  state.pendingWrites = fresh;
  savePendingWrites();
}

async function flushPendingWrites() {
  if (!state.token || !state.pendingWrites.length || state.pendingFlushInProgress) return;
  state.pendingFlushInProgress = true;
  const queue = [...state.pendingWrites];
  const queueKeys = new Set(queue.map(item => `${item.action}:${item.id}`));
  const remaining = [];
  try {
    for (const pending of queue) {
      try {
        await postAdmin(pending.action, pending.data);
      } catch (error) {
        console.warn("Guardado en cola pendiente", error);
        remaining.push(pending);
      }
    }
    const stillCurrent = new Set(state.pendingWrites.map(item => `${item.action}:${item.id}`));
    const validRemaining = remaining.filter(item => stillCurrent.has(`${item.action}:${item.id}`));
    const addedWhileSending = state.pendingWrites.filter(item => !queueKeys.has(`${item.action}:${item.id}`));
    state.pendingWrites = dedupePendingWrites([...validRemaining, ...addedWhileSending]);
    savePendingWrites();
    cacheAdminData();
    if (state.pendingWrites.length) schedulePendingRetry();
  } finally {
    state.pendingFlushInProgress = false;
  }
}

function schedulePendingRetry() {
  window.clearTimeout(schedulePendingRetry.timer);
  schedulePendingRetry.attempt = Math.min((schedulePendingRetry.attempt || 0) + 1, 5);
  const delay = Math.min(1200 * (2 ** (schedulePendingRetry.attempt - 1)), 12000);
  schedulePendingRetry.timer = window.setTimeout(() => flushPendingWrites(), delay);
}

function dedupePendingWrites(items) {
  const map = new Map();
  items.forEach(item => map.set(`${item.action}:${item.id}`, item));
  return [...map.values()].slice(-80);
}

function pendingAlreadySynced(pending) {
  const data = pending.data || {};
  if (pending.action === "deleteProduct") return !state.products.some(item => item.producto_id === data.producto_id);
  if (pending.action === "deleteExtra") return !state.extras.some(item => item.extra_id === data.extra_id);
  if (pending.action === "deleteInventory") return !state.inventory.some(item => item.inventory_id === data.inventory_id);
  if (pending.action === "deleteCashier") return !state.cashiers.some(item => item.cashier_id === data.cashier_id);
  if (pending.action === "deleteTable") return !state.tables.some(item => item.table_id === data.table_id);
  if (pending.action === "checkoutTable") return state.payments.some(item => item.payment_id === data.payment?.payment_id);
  if (pending.action === "updateOrderStatus") {
    const order = state.orders.find(item => item.order_id === data.order_id);
    return order && normalize(order.estado) === normalize(data.estado);
  }
  if (pending.action === "bulkUpdateOrderStatus") {
    return (data.order_ids || []).every(orderId => {
      const order = state.orders.find(item => item.order_id === orderId);
      return order && normalize(order.estado) === normalize(data.estado);
    });
  }
  if (pending.action === "upsertProduct") return state.products.some(item => item.producto_id === data.product?.producto_id && sameMeaningfulJson(item, data.product));
  if (pending.action === "upsertExtra") return state.extras.some(item => item.extra_id === data.extra?.extra_id && sameMeaningfulJson(item, data.extra));
  if (pending.action === "upsertInventory") return state.inventory.some(item => item.inventory_id === data.item?.inventory_id && sameMeaningfulJson(item, data.item));
  if (pending.action === "upsertCashier") return state.cashiers.some(item => item.cashier_id === data.cashier?.cashier_id && sameMeaningfulJson(item, data.cashier));
  if (pending.action === "upsertTable" || pending.action === "cancelTable") return state.tables.some(item => item.table_id === data.table?.table_id && sameMeaningfulJson(item, data.table));
  if (pending.action === "recordInventoryMovement") return state.inventoryMovements.some(item => item.movement_id === data.movement?.movement_id);
  return false;
}

function applyPendingWrite(pending) {
  const data = pending.data || {};
  if (pending.action === "upsertProduct" && data.product) upsertLocal("products", "producto_id", data.product);
  if (pending.action === "upsertExtra" && data.extra) upsertLocal("extras", "extra_id", data.extra);
  if (pending.action === "upsertInventory" && data.item) upsertLocal("inventory", "inventory_id", data.item);
  if (pending.action === "upsertCashier" && data.cashier) upsertLocal("cashiers", "cashier_id", data.cashier);
  if ((pending.action === "upsertTable" || pending.action === "cancelTable") && data.table) upsertLocal("tables", "table_id", data.table);
  if (pending.action === "recordInventoryMovement" && data.movement) upsertLocal("inventoryMovements", "movement_id", data.movement);
  if (pending.action === "checkoutTable") {
    if (data.payment) upsertLocal("payments", "payment_id", data.payment);
    if (data.table) upsertLocal("tables", "table_id", data.table);
  }
  if (pending.action === "deleteProduct") state.products = state.products.filter(item => item.producto_id !== data.producto_id);
  if (pending.action === "deleteExtra") state.extras = state.extras.filter(item => item.extra_id !== data.extra_id);
  if (pending.action === "deleteInventory") state.inventory = state.inventory.filter(item => item.inventory_id !== data.inventory_id);
  if (pending.action === "deleteCashier") state.cashiers = state.cashiers.filter(item => item.cashier_id !== data.cashier_id);
  if (pending.action === "deleteTable") state.tables = state.tables.filter(item => item.table_id !== data.table_id);
  if (pending.action === "updateOrderStatus") {
    const order = state.orders.find(item => item.order_id === data.order_id);
    if (order) order.estado = data.estado;
  }
  if (pending.action === "bulkUpdateOrderStatus") {
    const ids = new Set(data.order_ids || []);
    state.orders.forEach(order => {
      if (ids.has(order.order_id)) order.estado = data.estado;
    });
  }
}

function mergePendingTables(remoteTables) {
  const tableWrites = state.pendingWrites
    .filter(pending => pending.action === "upsertTable" && pending.data?.table)
    .map(pending => pending.data.table);
  if (!tableWrites.length) return remoteTables;

  const localById = new Map(state.tables.map(table => [table.table_id, table]));
  const pendingById = new Map(tableWrites.map(table => [table.table_id, table]));
  const merged = remoteTables.map(remoteTable => {
    const pendingTable = pendingById.get(remoteTable.table_id);
    if (!pendingTable) return remoteTable;

    const localTable = localById.get(remoteTable.table_id);
    const localItems = tableItems(localTable);
    const pendingItems = tableItems(pendingTable);
    const remoteItems = tableItems(remoteTable);
    const shouldKeepLocal = localItems.length || pendingItems.length || !sameMeaningfulJson(remoteItems, pendingItems);
    return shouldKeepLocal ? { ...remoteTable, ...pendingTable, items: pendingItems.length ? pendingItems : localItems } : remoteTable;
  });

  pendingById.forEach((table, tableId) => {
    if (!merged.some(item => item.table_id === tableId)) merged.push(table);
  });
  return merged;
}

function applyCachedAdminData() {
  try {
    const raw = localStorage.getItem(ADMIN_CACHE_KEY);
    if (!raw) return;
    const data = JSON.parse(raw);
    hydrateAdminData(data);
    applyPendingWrites();
    state.knownOrderIds = new Set(state.orders.map(order => String(order.order_id || "")));
    state.liveOrdersReady = state.orders.length > 0;
    renderAll();
    setStatus("Panel listo con información guardada.");
  } catch (error) {
    console.warn("No se pudo cargar cache admin", error);
  }
}

function cacheAdminData() {
  try {
    localStorage.setItem(ADMIN_CACHE_KEY, JSON.stringify({
      products: state.products,
      extras: state.extras,
      orders: state.orders,
      tables: state.tables,
      payments: state.payments,
      inventory: state.inventory,
      inventoryMovements: state.inventoryMovements,
      cashiers: state.cashiers,
      kpis: state.kpis,
      updatedAt: new Date().toISOString()
    }));
  } catch (error) {
    console.warn("No se pudo guardar cache admin", error);
  }
}

function renderAll() {
  renderKpis();
  renderIncome();
  renderOrders();
  renderProducts();
  renderExtras();
  renderTables();
  renderTableTicket();
  renderDispatchProducts();
  renderInventory();
  renderInventoryMovements();
  renderCashiers();
  seedAssistantMessages();
}

function renderSyncedData(options = {}) {
  if (!(options.silent && state.activeView === "mesas" && hasPendingTableWrite())) {
    renderAll();
    return;
  }

  renderKpis();
  renderIncome();
  renderOrders();
  renderProducts();
  renderExtras();
  renderDispatchProducts();
  renderInventory();
  renderInventoryMovements();
  renderCashiers();
  seedAssistantMessages();
}

function hasPendingTableWrite(tableId = state.selectedTableId) {
  return state.pendingWrites.some(pending => {
    if (pending.action !== "upsertTable") return false;
    if (!tableId) return true;
    return pending.data?.table?.table_id === tableId;
  });
}

function renderKpis() {
  syncActiveKpiCards();

  const tableRevenue = state.payments
    .filter(payment => normalize(payment.estado) === "pagado")
    .reduce((sum, payment) => sum + moneyToNumber(payment.total), 0);
  const openTables = state.tables.filter(table => normalize(table.estado || "abierta") === "abierta" && tableTotal(table) > 0).length;
  const allIncome = incomeEntries();
  const visibleEntries = filteredIncomeEntries();
  const totalRevenue = allIncome.reduce((sum, entry) => sum + moneyToNumber(entry.total), 0);
  const todayEntries = incomeEntries().filter(entry => isToday(entry.fecha));
  const todayRevenue = todayEntries.reduce((sum, entry) => sum + moneyToNumber(entry.total), 0);
  const pendingOrders = state.orders.filter(order => ["nuevo", "pendiente", "confirmado", "en cocina", "preparando"].includes(normalize(order.estado))).length;
  const tablePayments = state.payments.filter(payment => normalize(payment.estado) === "pagado").length;
  const appOrders = state.orders.length;
  const appOrdersRevenue = state.orders.reduce((sum, order) => sum + moneyToNumber(order.total), 0);

  setText("kpi-today-revenue", formatMoney(todayRevenue));
  setText("kpi-today-orders", `${todayEntries.length} ventas realizadas`);
  setText("kpi-revenue", formatMoney(totalRevenue));
  setText("kpi-orders", incomeSourceSummary(allIncome));
  setText("kpi-open-tables", appOrders);
  document.getElementById("kpi-open-tables")?.nextElementSibling && (document.getElementById("kpi-open-tables").nextElementSibling.textContent = `Whatsapp/App ${formatMoney(appOrdersRevenue)}`);
  setText("kpi-table-revenue", formatMoney(tableRevenue));
  document.getElementById("kpi-table-revenue")?.nextElementSibling && (document.getElementById("kpi-table-revenue").nextElementSibling.textContent = `${tablePayments} pagos de mesa`);
  setText("kpi-pending", pendingOrders);
  document.getElementById("kpi-pending")?.nextElementSibling && (document.getElementById("kpi-pending").nextElementSibling.textContent = `${pendingOrders} órdenes pendientes`);
}

function renderIncome() {
  if (!el.incomeList) return;
  const entries = filteredIncomeEntries();
  const total = entries.reduce((sum, entry) => sum + moneyToNumber(entry.total), 0);
  el.incomeList.innerHTML = entries.length ? `
    <div class="income-total-line">
      <span>${entries.length} movimientos</span>
      <strong>${formatMoney(total)}</strong>
    </div>
    ${entries.map(entry => `
      <article class="income-row income-${escapeAttr(entry.source)}">
        <div>
          <h3>${escapeHtml(entry.title)}</h3>
          <p>${escapeHtml(entry.detail)}</p>
          <small>${escapeHtml(formatDateTime(entry.fecha))} | ${escapeHtml(entry.cajero || "Caja")}</small>
        </div>
        <span class="status-pill income-badge income-${escapeAttr(entry.source)}">${escapeHtml(entry.sourceLabel)}</span>
        <strong>${formatMoney(entry.total)}</strong>
      </article>
    `).join("")}
  ` : `<div class="empty-state">No hay ingresos para este filtro.</div>`;
}

function incomeEntries() {
  const orderEntries = state.orders
    .filter(order => moneyToNumber(order.total) > 0)
    .map(order => ({
      id: order.order_id,
      source: "ordenes",
      sourceLabel: "Orden",
      title: order.cliente || `Orden #${order.order_number || ""}`,
      detail: orderItemsLabel(order.items),
      fecha: order.fecha,
      cajero: "Venta externa",
      total: order.total
    }));
  const tableEntries = state.payments
    .filter(payment => normalize(payment.estado) === "pagado")
    .map(payment => ({
      id: payment.payment_id,
      source: "mesas",
      sourceLabel: "Mesa",
      title: payment.origen || payment.table_name || "Mesa",
      detail: `${payment.metodo || "Pago"}${payment.notas ? ` | ${payment.notas}` : ""}`,
      fecha: payment.fecha,
      cajero: payment.cajero,
      total: payment.total
    }));
  return [...tableEntries, ...orderEntries].sort((a, b) => new Date(b.fecha || 0) - new Date(a.fecha || 0));
}

function filteredIncomeEntries() {
  return incomeEntries()
    .filter(entry => state.incomeSourceFilter === "todos" || entry.source === state.incomeSourceFilter)
    .filter(entry => incomeDateMatches(entry.fecha));
}

function incomeDateMatches(value) {
  if (state.incomeDateFilter === "todos") return true;
  const date = new Date(value || 0);
  if (Number.isNaN(date.getTime())) return false;
  const now = new Date();
  if (state.incomeDateFilter === "hoy") return isToday(value);
  const weekAgo = new Date(now);
  weekAgo.setDate(now.getDate() - 7);
  return date >= weekAgo;
}

function isToday(value) {
  const date = new Date(value || 0);
  return !Number.isNaN(date.getTime()) && date.toDateString() === new Date().toDateString();
}

function incomeSourceSummary(entries) {
  const tableCount = entries.filter(entry => entry.source === "mesas").length;
  const orderCount = entries.filter(entry => entry.source === "ordenes").length;
  if (!entries.length) return "Sin ingresos en este filtro";
  if (state.incomeSourceFilter === "mesas") return `${tableCount} ventas de mesas`;
  if (state.incomeSourceFilter === "ordenes") return `${orderCount} ventas de órdenes`;
  return `${entries.length} ingresos: ${tableCount} mesas · ${orderCount} órdenes`;
}

function showKpiDetail(type) {
  state.activeKpiDetail = type;
  syncActiveKpiCards();
  if (type === "today") {
    state.incomeDateFilter = "hoy";
    state.incomeSourceFilter = "todos";
    el.incomeDateFilter.value = "hoy";
    el.incomeSourceFilter.value = "todos";
    renderKpis();
    renderIncome();
    toast("Mostrando ingresos realizados hoy.");
    return;
  }
  if (type === "total") {
    state.incomeDateFilter = "todos";
    state.incomeSourceFilter = "todos";
    el.incomeDateFilter.value = "todos";
    el.incomeSourceFilter.value = "todos";
    renderKpis();
    renderIncome();
    toast("Mostrando todos los ingresos.");
    return;
  }
  if (type === "tables") {
    state.incomeDateFilter = "todos";
    state.incomeSourceFilter = "ordenes";
    el.incomeDateFilter.value = "todos";
    el.incomeSourceFilter.value = "ordenes";
    renderKpis();
    renderIncome();
    toast("Mostrando ingresos de Whatsapp/App.");
    return;
  }
  if (type === "cash") {
    state.incomeDateFilter = "todos";
    state.incomeSourceFilter = "mesas";
    el.incomeDateFilter.value = "todos";
    el.incomeSourceFilter.value = "mesas";
    renderKpis();
    renderIncome();
    toast("Mostrando ingresos de mesas.");
    return;
  }
  if (type === "pending") {
    setActiveView("ordenes");
    state.orderFilter = "pendientes";
    el.orderFilter.value = "pendientes";
    renderOrders();
    toast("Mostrando órdenes pendientes.");
  }
}

function syncActiveKpiCards() {
  document.querySelectorAll("[data-kpi-detail]").forEach(card => {
    card.classList.toggle("is-active", card.dataset.kpiDetail === state.activeKpiDetail);
  });
}

function renderOrders() {
  const orders = state.orders
    .filter(order => {
      if (state.orderFilter === "todas") return true;
      if (state.orderFilter === "pendientes") return ["nuevo", "pendiente", "confirmado", "en cocina", "preparando"].includes(normalize(order.estado));
      const status = normalize(order.estado || "nuevo");
      if (state.orderFilter === "en cocina") return ["en cocina", "cocina", "preparando"].includes(status);
      if (state.orderFilter === "despachado") return ["despachado"].includes(status);
      if (state.orderFilter === "entregado") return status === "entregado";
      if (state.orderFilter === "cancelado") return ["cancelado", "anulado"].includes(status);
      return status === normalize(state.orderFilter);
    })
    .sort(sortOrdersAscending);

  el.ordersList.innerHTML = orders.length ? `
    <div class="crud-table orders-table">
      <div class="crud-head">
        <span></span><span>#</span><span>Cliente</span><span>Pedido</span><span>Total</span><span>Estado</span><span>Siguiente paso</span>
      </div>
      ${orders.map(order => `
        <article class="crud-row order-row ${isNewOrder(order) ? "new-order" : ""}">
          <label class="order-selector" aria-label="Seleccionar orden ${escapeAttr(order.order_number || order.displayNumber)}">
            <input type="checkbox" data-select-order="${escapeAttr(order.order_id)}" ${state.selectedOrderIds.has(order.order_id) ? "checked" : ""}>
            <span></span>
          </label>
          <strong class="order-number">${escapeHtml(order.order_number || order.displayNumber)}</strong>
          <div>
            <h3>${escapeHtml(order.cliente || "Cliente")}</h3>
            <p>${escapeHtml(formatDate(order.fecha))}</p>
            <div class="order-mini-badges">
              <span>${escapeHtml(order.telefono || "Sin teléfono")}</span>
              <span>${escapeHtml(labelFromId(order.metodo || "recoger"))}</span>
              <span>${escapeHtml(order.pago || "Pago por confirmar")}</span>
            </div>
          </div>
          <p>${escapeHtml(orderItemsLabel(order.items))}</p>
          <strong>${formatMoney(order.total)}</strong>
          <span class="status-pill order-status ${escapeAttr(orderStatusClass(order.estado))}">${escapeHtml(orderStatusLabel(order.estado))}</span>
          <div class="row-actions">
            <button class="secondary-btn" type="button" data-status="${escapeAttr(order.order_id)}">${escapeHtml(nextOrderStatusLabel(order.estado))}</button>
          </div>
        </article>
      `).join("")}
    </div>
  ` : `<div class="empty-state">Aún no hay órdenes registradas.</div>`;

  el.ordersList.querySelectorAll("[data-status]").forEach(button => {
    button.addEventListener("click", () => cycleOrderStatus(button.dataset.status));
  });
  el.ordersList.querySelectorAll("[data-select-order]").forEach(input => {
    input.addEventListener("change", () => {
      if (input.checked) state.selectedOrderIds.add(input.dataset.selectOrder);
      else state.selectedOrderIds.delete(input.dataset.selectOrder);
      updateBulkOrderToolbar(orders);
    });
  });
  updateBulkOrderToolbar(orders);
}

function toggleAllVisibleOrders() {
  const visibleIds = [...el.ordersList.querySelectorAll("[data-select-order]")].map(input => input.dataset.selectOrder);
  visibleIds.forEach(orderId => {
    if (el.selectAllOrders.checked) state.selectedOrderIds.add(orderId);
    else state.selectedOrderIds.delete(orderId);
  });
  renderOrders();
}

function updateBulkOrderToolbar(visibleOrders) {
  const selectedCount = state.selectedOrderIds.size;
  if (el.selectedOrdersCount) el.selectedOrdersCount.textContent = `${selectedCount} seleccionada${selectedCount === 1 ? "" : "s"}`;
  if (el.applyBulkOrderStatus) el.applyBulkOrderStatus.disabled = !selectedCount || !el.bulkOrderStatus?.value;
  const visibleIds = (visibleOrders || []).map(order => order.order_id);
  const checkedVisible = visibleIds.filter(id => state.selectedOrderIds.has(id)).length;
  if (el.selectAllOrders) {
    el.selectAllOrders.checked = Boolean(visibleIds.length && checkedVisible === visibleIds.length);
    el.selectAllOrders.indeterminate = checkedVisible > 0 && checkedVisible < visibleIds.length;
  }
}

function applyBulkOrderStatus() {
  const orderIds = [...state.selectedOrderIds].filter(orderId => state.orders.some(order => order.order_id === orderId));
  const estado = el.bulkOrderStatus?.value;
  if (!orderIds.length || !estado) return;

  state.orders.forEach(order => {
    if (state.selectedOrderIds.has(order.order_id)) order.estado = estado;
  });
  const data = {
    order_ids: orderIds,
    estado,
    operation_key: `bulk-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
  };
  queueBulkOrderWrite(data);
  state.selectedOrderIds.clear();
  el.bulkOrderStatus.value = "";
  cacheAdminData();
  renderOrders();
  renderKpis();
  renderIncome();
  toast(`${orderIds.length} órdenes actualizadas. Guardando en segundo plano...`);
  sendBulkOrderWrite(data);
}

function queueBulkOrderWrite(data) {
  const changingIds = new Set(data.order_ids || []);
  const rebuilt = [];
  state.pendingWrites.forEach(pending => {
    if (pending.action === "updateOrderStatus" && changingIds.has(pending.data?.order_id)) return;
    if (pending.action !== "bulkUpdateOrderStatus") {
      rebuilt.push(pending);
      return;
    }
    const remainingIds = (pending.data?.order_ids || []).filter(orderId => !changingIds.has(orderId));
    if (!remainingIds.length) return;
    const nextData = { ...pending.data, order_ids: remainingIds, operation_key: `${pending.data.operation_key}-remaining` };
    rebuilt.push({ ...pending, data: nextData, id: pendingIdFor("bulkUpdateOrderStatus", nextData) });
  });
  state.pendingWrites = rebuilt;
  queuePendingWrite("bulkUpdateOrderStatus", data);
}

function sendBulkOrderWrite(data) {
  if (!state.token) return;
  postAdmin("bulkUpdateOrderStatus", data)
    .then(() => {
      state.pendingWrites = state.pendingWrites.filter(item => !(item.action === "bulkUpdateOrderStatus" && item.id === pendingIdFor("bulkUpdateOrderStatus", data)));
      savePendingWrites();
      schedulePendingRetry.attempt = 0;
    })
    .catch(error => {
      console.warn("Cambio masivo guardado para reintento", error);
      schedulePendingRetry();
    });
}

function renderProducts() {
  renderProductCategoryStrip();
  const products = state.productCategoryFilter === "todas"
    ? state.products
    : state.products.filter(product => product.categoria_id === state.productCategoryFilter);

  el.productsTable.innerHTML = products.length ? `
    <div class="crud-table products-table">
      <div class="crud-head">
        <span>Foto</span><span>Producto</span><span>Categoria</span><span>Precio</span><span>Estado</span><span>Acciones</span>
      </div>
      ${products.map(product => `
        <article class="crud-row product-table-row ${product.activo ? "" : "inactive"}">
          <img class="admin-product-thumb" src="${escapeAttr(productVisualImage(product))}" alt="" onerror="this.onerror=null;this.src='./images/pizza1.png';">
          <div><h3>${escapeHtml(product.nombre)}</h3><p>${escapeHtml(product.descripcion || "Producto de la carta")} | orden ${Number(product.orden || 0)}</p></div>
          <span>${escapeHtml(labelFromId(product.categoria_id))}</span>
          <strong>${formatMoney(product.precio)}</strong>
          <span class="status-pill">${product.activo ? "Activo" : "Inactivo"}</span>
          <div class="row-actions">
            <button class="secondary-btn" type="button" data-edit-product="${escapeAttr(product.producto_id)}">Editar</button>
            <button class="danger-btn" type="button" data-delete-product="${escapeAttr(product.producto_id)}">Eliminar</button>
          </div>
        </article>
      `).join("")}
    </div>
  ` : `<div class="empty-state">No hay productos en esta categoría.</div>`;

  el.productsTable.querySelectorAll("[data-edit-product]").forEach(button => {
    button.addEventListener("click", () => fillProductForm(button.dataset.editProduct));
  });
  el.productsTable.querySelectorAll("[data-delete-product]").forEach(button => {
    button.addEventListener("click", () => deleteProduct(button.dataset.deleteProduct));
  });
}

function renderProductCategoryStrip() {
  const counts = state.products.reduce((acc, product) => {
    const key = product.categoria_id || "general";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  const categories = [
    { id: "todas", label: "Todas", count: state.products.length },
    ...Object.keys(counts)
      .sort((a, b) => labelFromId(a).localeCompare(labelFromId(b), "es"))
      .map(id => ({ id, label: labelFromId(id), count: counts[id] }))
  ];
  if (!categories.some(category => category.id === state.productCategoryFilter)) {
    state.productCategoryFilter = "todas";
  }
  el.productCategoryStrip.innerHTML = categories.map(category => `
    <button class="category-chip ${category.id === state.productCategoryFilter ? "active" : ""}" type="button" data-product-category="${escapeAttr(category.id)}">
      ${escapeHtml(category.label)} <span>${category.count}</span>
    </button>
  `).join("");
  el.productCategoryStrip.querySelectorAll("[data-product-category]").forEach(button => {
    button.addEventListener("click", () => {
      state.productCategoryFilter = button.dataset.productCategory;
      renderProducts();
    });
  });
}

function renderExtras() {
  el.extrasTable.innerHTML = state.extras.length ? `
    <div class="crud-table extras-table">
      <div class="crud-head">
        <span>Extra</span><span>Precio</span><span>Estado</span><span>Acciones</span>
      </div>
      ${state.extras.map(extra => `
        <article class="crud-row ${extra.activo ? "" : "inactive"}">
          <div><h3>${escapeHtml(extra.nombre)}</h3><p>Disponible para pedidos y mesas</p></div>
          <strong>${formatMoney(extra.precio)}</strong>
          <span class="status-pill">${extra.activo ? "Activo" : "Inactivo"}</span>
          <div class="row-actions">
            <button class="secondary-btn" type="button" data-edit-extra="${escapeAttr(extra.extra_id)}">Editar</button>
            <button class="danger-btn" type="button" data-delete-extra="${escapeAttr(extra.extra_id)}">Eliminar</button>
          </div>
        </article>
      `).join("")}
    </div>
  ` : `<div class="empty-state">No hay extras cargados.</div>`;

  el.extrasTable.querySelectorAll("[data-edit-extra]").forEach(button => {
    button.addEventListener("click", () => fillExtraForm(button.dataset.editExtra));
  });
  el.extrasTable.querySelectorAll("[data-delete-extra]").forEach(button => {
    button.addEventListener("click", () => deleteExtra(button.dataset.deleteExtra));
  });
}

function renderTables() {
  const tables = state.tables.slice().sort((a, b) => String(a.nombre).localeCompare(String(b.nombre), "es", { numeric: true }));
  el.tablesGrid.innerHTML = tables.length ? tables.map(table => {
    const total = tableTotal(table);
    const isSelected = table.table_id === state.selectedTableId;
    const hasAccount = total > 0;
    return `
      <article class="table-card ${isSelected ? "active" : ""} ${hasAccount ? "has-account" : "is-free"}">
        <button class="table-card-main" type="button" data-table="${escapeAttr(table.table_id)}">
          <span>${escapeHtml(table.nombre)}</span>
          <strong>${formatMoney(total)}</strong>
          <small>${hasAccount ? `${tableItems(table).length} consumos | ${escapeHtml(table.cajero || cashierName())}` : "Mesa libre"}</small>
        </button>
        <div class="table-card-actions">
          <button class="table-door-btn" type="button" data-open-table="${escapeAttr(table.table_id)}" aria-label="Abrir productos para ${escapeAttr(table.nombre)}" title="Abrir productos"><span aria-hidden="true"></span></button>
          <button type="button" data-edit-table="${escapeAttr(table.table_id)}">Editar</button>
          <button type="button" data-delete-table="${escapeAttr(table.table_id)}">Eliminar</button>
        </div>
      </article>
    `;
  }).join("") : `<div class="empty-state">Crea la primera mesa para empezar a tomar pedidos internos.</div>`;

  el.tablesGrid.querySelectorAll("[data-table]").forEach(button => {
    button.addEventListener("click", () => selectTable(button.dataset.table));
    button.addEventListener("dblclick", () => openTableDispatch(button.dataset.table));
  });
  el.tablesGrid.querySelectorAll("[data-open-table]").forEach(button => {
    button.addEventListener("click", () => openTableDispatch(button.dataset.openTable));
  });
  el.tablesGrid.querySelectorAll("[data-edit-table]").forEach(button => {
    button.addEventListener("click", () => editTableName(button.dataset.editTable));
  });
  el.tablesGrid.querySelectorAll("[data-delete-table]").forEach(button => {
    button.addEventListener("click", () => deleteTable(button.dataset.deleteTable));
  });
}

function renderTableTicket() {
  const table = selectedTable();
  if (!table) {
    el.selectedTableTitle.textContent = "Selecciona una mesa";
    el.tableTicket.innerHTML = `<div class="empty-state">Elige o crea una mesa para agregar consumo.</div>`;
    el.openCheckout.disabled = true;
    el.printReceipt.disabled = true;
    return;
  }

  const items = tableItems(table);
  const total = tableTotal(table);
  el.selectedTableTitle.textContent = table.nombre;
  el.openCheckout.disabled = total <= 0;
  el.printReceipt.disabled = total <= 0;
  el.tableTicket.innerHTML = `
    <div class="ticket-meta">
      <span>Atiende: ${escapeHtml(table.cajero || cashierName())}</span>
      <span>Inicio: ${escapeHtml(formatDate(table.fecha_apertura || table.fecha))}</span>
    </div>
    ${items.length ? items.map(item => `
      <div class="ticket-row">
        <div>
          <strong>${escapeHtml(item.nombre)}</strong>
          <small>${item.qty} x ${formatMoney(item.precio)}</small>
        </div>
        <div class="ticket-actions">
          <button class="icon-btn" type="button" data-dec-item="${escapeAttr(item.line_id)}">-</button>
          <button class="icon-btn" type="button" data-inc-item="${escapeAttr(item.line_id)}">+</button>
          <button class="icon-btn danger" type="button" data-remove-item="${escapeAttr(item.line_id)}">x</button>
        </div>
        <strong>${formatMoney(lineTotal(item))}</strong>
      </div>
    `).join("") : `<div class="empty-state">Esta mesa está libre. Agrega productos desde el despacho.</div>`}
    <div class="ticket-total"><span>Total mesa</span><strong>${formatMoney(total)}</strong></div>
  `;

  el.tableTicket.querySelectorAll("[data-dec-item]").forEach(button => {
    button.addEventListener("click", () => adjustTableItem(button.dataset.decItem, -1));
  });
  el.tableTicket.querySelectorAll("[data-inc-item]").forEach(button => {
    button.addEventListener("click", () => adjustTableItem(button.dataset.incItem, 1));
  });
  el.tableTicket.querySelectorAll("[data-remove-item]").forEach(button => {
    button.addEventListener("click", () => removeTableItem(button.dataset.removeItem));
  });
}

function renderDispatchProducts() {
  const term = normalize(state.dispatchSearch);
  const products = state.products
    .filter(product => product.activo)
    .filter(product => !term || normalize(`${product.nombre} ${product.descripcion} ${product.categoria_id}`).includes(term))
    .slice(0, 80);

  const extras = state.extras
    .filter(extra => extra.activo)
    .filter(extra => !term || normalize(extra.nombre).includes(term))
    .slice(0, 20);

  el.dispatchProducts.innerHTML = [
    ...products.map(product => dispatchProductTemplate(product, "product")),
    ...extras.map(extra => dispatchProductTemplate({
      producto_id: extra.extra_id,
      nombre: extra.nombre,
      precio: extra.precio,
      descripcion: "Extra para la mesa",
      orden: extra.orden,
      imagen: "pizza8.png"
    }, "extra"))
  ].join("") || `<div class="empty-state">No encontramos productos activos con esa búsqueda.</div>`;

  el.dispatchProducts.querySelectorAll("[data-add-menu-item]").forEach(button => {
    button.addEventListener("click", () => addMenuItemToTable(button.dataset.addMenuItem, button.dataset.itemType));
  });
}

function dispatchProductTemplate(product, type) {
  return `
    <article class="dispatch-card">
      <img src="${escapeAttr(productVisualImage(product))}" alt="" onerror="this.onerror=null;this.src='./images/pizza1.png';">
      <div>
        <h3>${escapeHtml(product.nombre)}</h3>
        <p>${escapeHtml(product.descripcion || "Producto listo para mesa")}</p>
      </div>
      <strong>${formatMoney(product.precio)}</strong>
      <button class="primary-btn" type="button" data-add-menu-item="${escapeAttr(product.producto_id)}" data-item-type="${escapeAttr(type)}">Agregar</button>
    </article>
  `;
}

function renderInventory() {
  renderInventoryKpis();
  el.inventoryTable.innerHTML = state.inventory.length ? `
    <div class="crud-table inventory-table">
      <div class="crud-head"><span>Insumo</span><span>Cantidad</span><span>Mínimo</span><span>Costo</span><span>Producción</span><span>Estado</span><span>Acciones</span></div>
      ${state.inventory.map(item => `
        <article class="crud-row ${item.activo ? "" : "inactive"} ${moneyToNumber(item.cantidad) <= moneyToNumber(item.minimo) ? "low-stock" : ""}">
          <div><h3>${escapeHtml(item.nombre)}</h3><p>${escapeHtml(item.categoria || "Inventario general")}</p></div>
          <strong>${escapeHtml(item.cantidad)} ${escapeHtml(item.unidad || "")}</strong>
          <span>${escapeHtml(item.minimo || 0)} ${escapeHtml(item.unidad || "")}</span>
          <strong>${formatMoney(item.costo)}</strong>
          <div class="stock-controls">
            <button class="icon-btn danger" type="button" data-stock-out="${escapeAttr(item.inventory_id)}">-</button>
            <button class="icon-btn" type="button" data-stock-in="${escapeAttr(item.inventory_id)}">+</button>
          </div>
          <span class="status-pill">${moneyToNumber(item.cantidad) <= moneyToNumber(item.minimo) ? "Revisar" : item.activo ? "Activo" : "Archivado"}</span>
          <div class="row-actions">
            <button class="secondary-btn" type="button" data-edit-inventory="${escapeAttr(item.inventory_id)}">Editar</button>
            <button class="danger-btn" type="button" data-delete-inventory="${escapeAttr(item.inventory_id)}">Eliminar</button>
          </div>
        </article>
      `).join("")}
    </div>
  ` : `<div class="empty-state">Agrega insumos para controlar compras y alertas de stock.</div>`;

  el.inventoryTable.querySelectorAll("[data-edit-inventory]").forEach(button => {
    button.addEventListener("click", () => fillInventoryForm(button.dataset.editInventory));
  });
  el.inventoryTable.querySelectorAll("[data-delete-inventory]").forEach(button => {
    button.addEventListener("click", () => deleteInventoryItem(button.dataset.deleteInventory));
  });
  el.inventoryTable.querySelectorAll("[data-stock-out]").forEach(button => {
    button.addEventListener("click", () => moveInventoryStock(button.dataset.stockOut, -1));
  });
  el.inventoryTable.querySelectorAll("[data-stock-in]").forEach(button => {
    button.addEventListener("click", () => moveInventoryStock(button.dataset.stockIn, 1));
  });
}

function renderInventoryKpis() {
  if (!el.inventoryKpis) return;
  const active = state.inventory.filter(item => item.activo);
  const low = active.filter(item => moneyToNumber(item.cantidad) <= moneyToNumber(item.minimo));
  const outMovements = state.inventoryMovements.filter(move => move.tipo === "retiro");
  const recent = outMovements[0];
  el.inventoryKpis.innerHTML = `
    <button class="inventory-kpi" type="button" data-inventory-kpi="active"><span>Activos</span><strong>${active.length}</strong><small>insumos en control</small></button>
    <button class="inventory-kpi" type="button" data-inventory-kpi="low"><span>Alertas</span><strong>${low.length}</strong><small>por debajo del mínimo</small></button>
    <button class="inventory-kpi" type="button" data-inventory-kpi="moves"><span>Retiros</span><strong>${outMovements.length}</strong><small>${recent ? formatDateTime(recent.fecha) : "sin movimientos"}</small></button>
  `;
  el.inventoryKpis.querySelectorAll("[data-inventory-kpi]").forEach(button => {
    button.addEventListener("click", () => showInventoryKpiDetail(button.dataset.inventoryKpi));
  });
}

function renderInventoryMovements() {
  if (!el.inventoryMovements) return;
  const term = normalize(state.inventoryMovementSearch);
  const moves = state.inventoryMovements
    .filter(move => !term || normalize(`${move.nombre} ${move.usuario} ${move.tipo} ${move.cantidad}`).includes(term))
    .slice(0, 40);
  el.inventoryMovements.innerHTML = moves.length ? moves.map(move => `
    <article class="movement-row">
      <div>
        <h3>${escapeHtml(move.nombre)}</h3>
        <p>${escapeHtml(move.tipo === "retiro" ? "Salida a producción" : "Entrada o ajuste")} | ${escapeHtml(move.cantidad)} ${escapeHtml(move.unidad || "")}</p>
        <small>${escapeHtml(formatDateTime(move.fecha))} | ${escapeHtml(move.usuario || "Usuario")}</small>
      </div>
      <strong>${move.tipo === "retiro" ? "-" : "+"}${escapeHtml(move.cantidad)}</strong>
    </article>
  `).join("") : `<div class="empty-state">No hay movimientos recientes.</div>`;
}

async function moveInventoryStock(itemId, direction) {
  const item = state.inventory.find(row => row.inventory_id === itemId);
  if (!item) return;
  const verb = direction < 0 ? "retirar para producción" : "agregar al inventario";
  const raw = await smartPrompt({
    title: direction < 0 ? "Retiro a producción" : "Entrada de inventario",
    message: `Cantidad a ${verb} de ${item.nombre}.`,
    label: "Cantidad",
    value: "1",
    confirmText: direction < 0 ? "Revisar retiro" : "Revisar entrada",
    inputMode: "decimal"
  });
  if (!raw) return;
  const amount = moneyToNumber(raw);
  if (!amount) {
    toast("Escribe una cantidad valida.");
    return;
  }
  if (direction < 0 && moneyToNumber(item.cantidad) < amount) {
    toast("No hay suficiente cantidad para retirar.");
    return;
  }
  const confirmed = await smartConfirm({
    title: "Confirmar movimiento",
    message: `${amount} ${item.unidad || ""} de ${item.nombre} se va a ${verb}.`,
    confirmText: "Confirmar"
  });
  if (!confirmed) return;
  item.cantidad = Math.max(0, moneyToNumber(item.cantidad) + amount * direction);
  item.actualizado = new Date().toISOString();
  recordInventoryMovement(item, amount, direction < 0 ? "retiro" : "entrada");
  persistAndRender("upsertInventory", { item }, direction < 0 ? "Retiro registrado." : "Entrada registrada.");
}

function recordInventoryMovement(item, amount, tipo) {
  const movement = {
    movement_id: makeId("mov"),
    inventory_id: item.inventory_id,
    nombre: item.nombre,
    cantidad: amount,
    unidad: item.unidad || "",
    tipo,
    fecha: new Date().toISOString(),
    usuario: cashierName()
  };
  state.inventoryMovements = [movement, ...state.inventoryMovements].slice(0, 200);
  localStorage.setItem("chanchos_inventory_movements_v1", JSON.stringify(state.inventoryMovements));
  if (state.token) {
    postAdmin("recordInventoryMovement", { movement }).catch(error => {
      queuePendingWrite("recordInventoryMovement", { movement });
      console.warn("Movimiento pendiente en segundo plano", error);
    });
  } else {
    queuePendingWrite("recordInventoryMovement", { movement });
  }
}

function showInventoryKpiDetail(type) {
  const active = state.inventory.filter(item => item.activo).length;
  const low = state.inventory.filter(item => item.activo && moneyToNumber(item.cantidad) <= moneyToNumber(item.minimo)).length;
  const withdrawals = state.inventoryMovements.filter(move => move.tipo === "retiro").length;
  const messages = {
    active: `Tienes ${active} insumos activos para producción.`,
    low: `${low} insumos necesitan revisión por stock mínimo.`,
    moves: `Hay ${withdrawals} retiros registrados recientemente. Mira el panel de movimientos para fecha, hora y usuario.`
  };
  toast(messages[type] || "Detalle de inventario listo.");
}

function seedAssistantMessages() {
  ["ingresos", "mesas", "carta", "inventario"].forEach(section => {
    const box = document.getElementById(`assistant-${section}-messages`);
    if (!box || box.dataset.ready) return;
    box.dataset.ready = "true";
    box.innerHTML = `<div class="assistant-message">Hola, puedo ayudarte con ${assistantSectionLabel(section)} usando los datos visibles de esta sección.</div>`;
  });
}

function openSidebarAssistant(section = state.activeView) {
  const assistantSection = normalizeAssistantSection(section);
  el.sidebarChat.dataset.section = assistantSection;
  el.sidebarChatTitle.textContent = assistantName(assistantSection);
  el.sidebarChat.classList.remove("hidden");
  el.sidebarChat.setAttribute("aria-hidden", "false");
  if (!el.sidebarChatMessages.dataset.section || el.sidebarChatMessages.dataset.section !== assistantSection) {
    el.sidebarChatMessages.dataset.section = assistantSection;
    el.sidebarChatMessages.innerHTML = `<div class="assistant-message">Hola, soy ${assistantName(assistantSection)}. Estoy listo para ayudarte con ${assistantSectionLabel(assistantSection)}.</div>`;
  }
  window.setTimeout(() => el.sidebarChatForm.elements.question?.focus(), 80);
}

function closeSidebarAssistant() {
  el.sidebarChat.classList.add("hidden");
  el.sidebarChat.setAttribute("aria-hidden", "true");
}

function handleSidebarAssistantQuestion(event) {
  event.preventDefault();
  const section = el.sidebarChat.dataset.section || normalizeAssistantSection(state.activeView);
  const input = el.sidebarChatForm.elements.question;
  const question = String(input.value || "").trim();
  if (!question) return;
  el.sidebarChatMessages.insertAdjacentHTML("beforeend", `<div class="assistant-message user">${escapeHtml(question)}</div>`);
  el.sidebarChatMessages.insertAdjacentHTML("beforeend", `<div class="assistant-message">${escapeHtml(answerAssistant(section, question))}</div>`);
  input.value = "";
  el.sidebarChatMessages.scrollTop = el.sidebarChatMessages.scrollHeight;
}

function normalizeAssistantSection(section) {
  if (section === "resumen") return "ingresos";
  if (section === "extras") return "carta";
  if (["mesas", "ingresos", "carta", "inventario"].includes(section)) return section;
  return "ingresos";
}

function assistantName(section) {
  if (section === "ingresos") return "Asistente Ingresos";
  if (section === "mesas") return "Asistente Mesas";
  if (section === "carta") return "Asistente Carta";
  if (section === "inventario") return "Asistente Inventario";
  return "Asistente Quicio - Caprichos";
}

function handleAssistantQuestion(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const section = form.dataset.assistantForm;
  const input = form.elements.question;
  const question = String(input.value || "").trim();
  if (!question) return;
  const box = document.getElementById(`assistant-${section}-messages`);
  if (!box) return;
  box.insertAdjacentHTML("beforeend", `<div class="assistant-message user">${escapeHtml(question)}</div>`);
  box.insertAdjacentHTML("beforeend", `<div class="assistant-message">${escapeHtml(answerAssistant(section, question))}</div>`);
  input.value = "";
  box.scrollTop = box.scrollHeight;
}

function answerAssistant(section, question) {
  const q = normalize(question);
  if (section === "ingresos") {
    const entries = filteredIncomeEntries();
    const total = entries.reduce((sum, entry) => sum + moneyToNumber(entry.total), 0);
    const top = entries[0];
    if (q.includes("mesa")) return `En el filtro actual hay ${entries.filter(entry => entry.source === "mesas").length} ingresos de mesas. Total visible: ${formatMoney(total)}.`;
    if (q.includes("orden")) return `En el filtro actual hay ${entries.filter(entry => entry.source === "ordenes").length} ingresos por órdenes.`;
    return top ? `Veo ${entries.length} movimientos por ${formatMoney(total)}. El más reciente es ${top.title}, registrado ${formatDateTime(top.fecha)}.` : "No hay ingresos visibles con este filtro.";
  }
  if (section === "mesas") {
    const open = state.tables.filter(table => tableTotal(table) > 0);
    const table = selectedTable();
    if (table && q.includes("esta")) return `${table.nombre} tiene ${tableItems(table).length} lineas y suma ${formatMoney(tableTotal(table))}.`;
    return `${open.length} mesas tienen cuenta activa. La suma abierta es ${formatMoney(open.reduce((sum, table) => sum + tableTotal(table), 0))}.`;
  }
  if (section === "carta") {
    const active = state.products.filter(product => product.activo);
    const inactive = state.products.length - active.length;
    return `La carta tiene ${state.products.length} productos: ${active.length} activos y ${inactive} ocultos. Puedes filtrar por categoría y editar uno; al tocar editar, el formulario sube automáticamente.`;
  }
  if (section === "inventario") {
    const low = state.inventory.filter(item => item.activo && moneyToNumber(item.cantidad) <= moneyToNumber(item.minimo));
    const last = state.inventoryMovements[0];
    return last ? `Hay ${low.length} alertas de stock. El último movimiento fue ${last.tipo} de ${last.cantidad} ${last.unidad} en ${last.nombre}, por ${last.usuario}, ${formatDateTime(last.fecha)}.` : `Hay ${low.length} alertas de stock y todavía no hay retiros recientes registrados.`;
  }
  return "Puedo ayudarte revisando los datos actuales de esta sección.";
}

function assistantSectionLabel(section) {
  if (section === "ingresos") return "los ingresos";
  if (section === "mesas") return "las mesas";
  if (section === "carta") return "la carta";
  if (section === "inventario") return "el inventario";
  return "esta sección";
}

function renderCashiers() {
  el.cashiersTable.innerHTML = state.cashiers.length ? `
    <div class="crud-table cashiers-table">
      <div class="crud-head"><span>Usuario</span><span>Rol</span><span>Estado</span><span>Último acceso</span><span>Acciones</span></div>
      ${state.cashiers.map(cashier => `
        <article class="crud-row ${cashier.activo ? "" : "inactive"}">
          <div><h3>${escapeHtml(cashier.nombre)}</h3><p>${escapeHtml(cashier.correo || "Sin correo")}</p></div>
          <strong>${escapeHtml(labelFromId(cashier.rol || "cajero"))}</strong>
          <span class="status-pill">${cashier.activo ? "Activo" : "Inactivo"}</span>
          <span>${escapeHtml(formatDate(cashier.ultimo_acceso))}</span>
          <div class="row-actions">
            <button class="secondary-btn" type="button" data-edit-cashier="${escapeAttr(cashier.cashier_id)}">Editar</button>
            <button class="danger-btn" type="button" data-delete-cashier="${escapeAttr(cashier.cashier_id)}">Eliminar</button>
          </div>
        </article>
      `).join("")}
    </div>
  ` : `<div class="empty-state">Crea cajeros con correo y contraseña para controlar los accesos.</div>`;

  el.cashiersTable.querySelectorAll("[data-edit-cashier]").forEach(button => {
    button.addEventListener("click", () => fillCashierForm(button.dataset.editCashier));
  });
  el.cashiersTable.querySelectorAll("[data-delete-cashier]").forEach(button => {
    button.addEventListener("click", () => deleteCashier(button.dataset.deleteCashier));
  });
}

function createTable(event) {
  event.preventDefault();
  const data = getFormObject(el.tableForm);
  const table = {
    table_id: makeId("mesa"),
    nombre: data.table_name.trim(),
    estado: "abierta",
    fecha_apertura: new Date().toISOString(),
    cajero: cashierName(),
    items: []
  };
  state.tables = [table, ...state.tables];
  state.selectedTableId = table.table_id;
  localStorage.setItem("chanchos_selected_table", state.selectedTableId);
  el.tableForm.reset();
  renderTables();
  renderTableTicket();
  persistTableQuietly(table);
  toast("Mesa creada.");
}

function addQuickExpenseToTable(event) {
  event.preventDefault();
  const table = selectedTable();
  if (!table) {
    toast("Primero selecciona o crea una mesa.");
    return;
  }
  const data = getFormObject(el.quickExpenseForm);
  const amount = moneyToNumber(data.expense_amount);
  if (!amount) {
    toast("Escribe el valor del gasto.");
    return;
  }
  const items = tableItems(table);
  items.push({
    line_id: makeId("gasto"),
    source_id: "gasto-rapido",
    tipo: "gasto",
    nombre: data.expense_name.trim() || "Gasto de mesa",
    precio: amount,
    qty: 1
  });
  table.items = items;
  table.estado = "abierta";
  table.cajero = cashierName();
  el.quickExpenseForm.reset();
  persistAndRender("upsertTable", { table }, "Gasto agregado a la mesa.");
}

function selectTable(tableId) {
  state.selectedTableId = tableId;
  localStorage.setItem("chanchos_selected_table", tableId);
  renderTables();
  renderTableTicket();
}

function openTableDispatch(tableId) {
  state.selectedTableId = tableId;
  localStorage.setItem("chanchos_selected_table", tableId);
  renderTables();
  renderTableTicket();
  showTableDispatch();
}

function showTableDispatch() {
  document.querySelector(".admin-view-tables")?.classList.add("dispatch-mode");
  window.setTimeout(() => el.dispatchSearch?.focus(), 160);
}

function showTablesOverview() {
  document.querySelector(".admin-view-tables")?.classList.remove("dispatch-mode");
}

function bindSmartInternalScroll() {
  const selector = ".table-ticket, .products-table, .income-list, .inventory-movements, .assistant-messages, .dispatch-products, .crud-table";
  document.addEventListener("wheel", event => {
    const scroller = event.target.closest?.(selector);
    if (!scroller) return;
    const canScroll = scroller.scrollHeight > scroller.clientHeight || scroller.scrollWidth > scroller.clientWidth;
    if (!canScroll) return;
    const vertical = Math.abs(event.deltaY) >= Math.abs(event.deltaX);
    const delta = vertical ? event.deltaY : event.deltaX;
    const max = vertical ? scroller.scrollHeight - scroller.clientHeight : scroller.scrollWidth - scroller.clientWidth;
    const current = vertical ? scroller.scrollTop : scroller.scrollLeft;
    const atStart = current <= 0;
    const atEnd = current >= max - 1;
    const wantsPageScroll = (delta < 0 && atStart) || (delta > 0 && atEnd);

    if (!wantsPageScroll) {
      event.stopPropagation();
    }
  }, { passive: false });
}

function openPlanWhatsApp(planValue) {
  const [planName, planPrice] = String(planValue || "").split("|");
  const message = [
    "Hola, quiero implementar el sistema administrativo para mi negocio.",
    `Estoy interesado en el plan: ${planName || "Plan seleccionado"}.`,
    `Valor: ${planPrice || "por confirmar"}.`,
    "Me gustaría recibir información para iniciar la implementación y coordinar los siguientes pasos."
  ].join("\n");
  window.open(`https://wa.me/573246394689?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
}

async function editTableName(tableId) {
  const table = state.tables.find(item => item.table_id === tableId);
  if (!table) return;
  const nextName = await smartPrompt({
    title: "Editar mesa",
    message: "Escribe el nuevo nombre para identificar esta mesa.",
    label: "Nombre de la mesa",
    value: table.nombre,
    confirmText: "Actualizar"
  });
  if (!nextName || !nextName.trim() || nextName.trim() === table.nombre) return;
  table.nombre = nextName.trim();
  persistAndRender("upsertTable", { table }, "Mesa actualizada.");
}

async function deleteTable(tableId) {
  const table = state.tables.find(item => item.table_id === tableId);
  if (!table) return;
  if (tableTotal(table) > 0) {
    toast("Primero libera o paga la cuenta antes de eliminar la mesa.");
    return;
  }
  const confirmed = await smartConfirm({
    title: "Eliminar mesa",
    message: `${table.nombre} se eliminara manualmente del salon.`,
    confirmText: "Eliminar",
    danger: true
  });
  if (!confirmed) return;
  state.tables = state.tables.filter(item => item.table_id !== tableId);
  if (state.selectedTableId === tableId) {
    state.selectedTableId = state.tables[0]?.table_id || "";
    localStorage.setItem("chanchos_selected_table", state.selectedTableId);
  }
  persistAndRender("deleteTable", { table_id: tableId, hardDelete: true }, "Mesa eliminada.");
}

function addMenuItemToTable(itemId, type) {
  const table = selectedTable();
  if (!table) {
    toast("Primero selecciona o crea una mesa.");
    return;
  }
  const source = type === "extra"
    ? state.extras.find(extra => extra.extra_id === itemId)
    : state.products.find(product => product.producto_id === itemId);
  if (!source) return;

  const items = tableItems(table);
  const existing = items.find(item => item.source_id === itemId);
  if (existing) {
    existing.qty += 1;
  } else {
    items.push({
      line_id: makeId("line"),
      source_id: itemId,
      tipo: type,
      nombre: source.nombre,
      precio: moneyToNumber(source.precio),
      qty: 1
    });
  }
  table.items = items;
  table.estado = "abierta";
  table.cajero = cashierName();
  renderTables();
  renderTableTicket();
  persistTableQuietly(table);
}

function adjustTableItem(lineId, delta) {
  const table = selectedTable();
  if (!table) return;
  const items = tableItems(table);
  const item = items.find(row => row.line_id === lineId);
  if (!item) return;
  item.qty = Math.max(0, moneyToNumber(item.qty) + delta);
  table.items = items.filter(row => row.qty > 0);
  renderTables();
  renderTableTicket();
  persistTableQuietly(table);
}

function removeTableItem(lineId) {
  const table = selectedTable();
  if (!table) return;
  table.items = tableItems(table).filter(item => item.line_id !== lineId);
  renderTables();
  renderTableTicket();
  persistTableQuietly(table);
}

function openTableCheckout() {
  const table = selectedTable();
  if (!table || tableTotal(table) <= 0) {
    toast("La mesa no tiene consumo para pagar.");
    return;
  }
  el.checkoutForm.reset();
  el.checkoutTitle.textContent = `Pago de ${table.nombre}`;
  el.checkoutTotal.textContent = formatMoney(tableTotal(table));
  syncPaymentFields();
  openLayer(el.checkoutModal);
}

function closeCheckout() {
  closeLayer(el.checkoutModal);
}

async function checkoutTable(event) {
  event.preventDefault();
  const table = selectedTable();
  if (!table) return;
  const total = tableTotal(table);
  const data = getFormObject(el.checkoutForm);
  const primary = data.method_primary || "Efectivo";
  const isMixed = primary === "Pago mixto";
  const payment = {
    payment_id: makeId("pay"),
    table_id: table.table_id,
    table_name: table.nombre,
    origen: `Mesa ${table.nombre}`,
    fecha: new Date().toISOString(),
    cajero: cashierName(),
    metodo: isMixed ? `${data.method_one}: ${formatMoney(data.amount_one)} + ${data.method_two}: ${formatMoney(data.amount_two)}` : primary,
    metodo_principal: primary,
    metodo_uno: isMixed ? data.method_one : primary,
    valor_uno: isMixed ? moneyToNumber(data.amount_one) : total,
    metodo_dos: isMixed ? data.method_two : "",
    valor_dos: isMixed ? moneyToNumber(data.amount_two) : 0,
    total,
    estado: "pagado",
    notas: data.notes || "",
    items: JSON.stringify(tableItems(table))
  };

  if (isMixed && payment.valor_uno + payment.valor_dos !== total) {
    toast("El pago mixto debe completar exactamente el total.");
    syncPaymentFields();
    return;
  }

  const shouldPrintReceipt = await smartConfirm({
    title: "Pago confirmado",
    message: "¿Deseas imprimir el recibo de esta mesa ahora?",
    confirmText: "Imprimir recibo",
    cancelText: "Solo guardar"
  });
  if (shouldPrintReceipt) printReceiptForTable(table);
  state.payments = [payment, ...state.payments];
  table.estado = "pagada";
  table.fecha_cierre = new Date().toISOString();
  table.items = [];
  closeCheckout();
  showTablesOverview();
  renderAll();
  persistCheckoutQuietly(table, payment);
  toast("Mesa pagada y liberada.");
}

async function cancelSelectedTable() {
  const table = selectedTable();
  if (!table) return;
  const confirmed = await smartConfirm({
    title: "Cancelar mesa",
    message: "La cuenta se liberara sin registrar ingreso en caja.",
    confirmText: "Cancelar mesa",
    danger: true
  });
  if (!confirmed) return;
  table.estado = "cancelada";
  table.fecha_cierre = new Date().toISOString();
  table.items = [];
  closeCheckout();
  showTablesOverview();
  persistAndRender("cancelTable", { table }, "Mesa cancelada y liberada.");
}

function handlePaymentInput(event) {
  const changedName = event?.target?.name || "";
  syncPaymentFields(changedName);
}

function syncPaymentFields(changedName = "") {
  const table = selectedTable();
  const total = tableTotal(table);
  const form = el.checkoutForm;
  const primary = form.elements.method_primary.value;
  const mixed = primary === "Pago mixto";
  el.mixedPaymentFields.classList.toggle("active", mixed);
  if (!mixed) return;

  const oneInput = form.elements.amount_one;
  const twoInput = form.elements.amount_two;
  const one = moneyToNumber(oneInput.value);
  const two = moneyToNumber(twoInput.value);

  if (changedName === "amount_two") {
    oneInput.value = formatMoney(Math.max(0, total - two));
  } else {
    twoInput.value = formatMoney(Math.max(0, total - one));
  }
}

function printSelectedReceipt() {
  const table = selectedTable();
  if (!table || tableTotal(table) <= 0) {
    toast("La mesa no tiene consumo para imprimir.");
    return;
  }
  printReceiptForTable(table);
}

function printReceiptForTable(table) {
  const printWindow = window.open("", "_blank", "width=900,height=1100");
  if (!printWindow) {
    toast("Permite ventanas emergentes para imprimir el recibo.");
    return;
  }
  const rows = tableItems(table).map(item => `
    <tr><td>${escapeHtml(item.qty)} x ${escapeHtml(item.nombre)}</td><td>${formatMoney(lineTotal(item))}</td></tr>
  `).join("");
  printWindow.document.write(`
    <!doctype html><html><head><title>Recibo ${escapeHtml(table.nombre)}</title>
    <style>
      @page{size:A4;margin:6mm}
      *{box-sizing:border-box;text-transform:uppercase;letter-spacing:.4px}
      body{margin:0;padding:0;color:#000;background:#fff;font-family:"Courier New",monospace;font-size:18px;font-weight:800;line-height:1.28}
      .receipt{width:100%;min-height:100%;padding:6mm}
      h1{font-size:34px;margin:0 0 4px;text-align:center;font-weight:900}
      .brand{display:grid;place-items:center;gap:8px;text-align:center;border-bottom:3px dashed #000;padding-bottom:14px}
      .brand img{width:150px;height:150px;object-fit:contain}
      .meta{border-bottom:3px dashed #000;margin:16px 0;padding-bottom:14px}
      table{width:100%;border-collapse:collapse;margin:18px 0}
      td{border-bottom:2px dotted #888;padding:10px 0;vertical-align:top}
      td:last-child{text-align:right;white-space:nowrap}
      .total{border:3px dashed #000;margin-top:22px;padding:18px;font-size:38px;font-weight:900;text-align:center}
      .small{color:#000;font-size:16px;text-align:center;margin-top:22px}
    </style>
    </head><body>
    <div class="receipt">
    <div class="brand"><img src="./images/logo.png" alt=""><h1>Quicio - Caprichos</h1><div class="small">BGA · BCA · OCAÑA · 304 375 8278</div></div>
    <p class="meta"><strong>${escapeHtml(table.nombre)}</strong><br>Atiende: ${escapeHtml(table.cajero || cashierName())}<br>${escapeHtml(formatDateTime(new Date().toISOString()))}</p>
    <table>${rows}</table>
    <p class="total">Total<br>${formatMoney(tableTotal(table))}</p>
    <p class="small">Gracias por tu compra.<br>Conserve este recibo.</p>
    </div>
    <script>window.onload=function(){window.print();};<\/script>
    </body></html>
  `);
  printWindow.document.close();
}

function fillProductForm(productId) {
  const product = state.products.find(item => item.producto_id === productId);
  if (!product) return;
  openEditorForm(el.productForm, `Editando: ${product.nombre}`);
  setFormValues(el.productForm, {
    producto_id: product.producto_id,
    categoria_id: product.categoria_id,
    nombre: product.nombre,
    precio: formatMoney(product.precio),
    descripcion: product.descripcion,
    imagen: product.imagen,
    opciones: formatProductOptionsForInput(product.opciones),
    orden: product.orden,
    activo: String(Boolean(product.activo))
  });
  updateSubmitLabels(el.productForm);
  updateFormChecks(el.productForm);
  setActiveView("carta");
  el.productForm.scrollIntoView({ behavior: "smooth", block: "start" });
}

function fillExtraForm(extraId) {
  const extra = state.extras.find(item => item.extra_id === extraId);
  if (!extra) return;
  openEditorForm(el.extraForm, `Editando: ${extra.nombre}`);
  setFormValues(el.extraForm, {
    extra_id: extra.extra_id,
    nombre: extra.nombre,
    precio: formatMoney(extra.precio),
    orden: extra.orden,
    activo: String(Boolean(extra.activo))
  });
  updateFormChecks(el.extraForm);
  setActiveView("extras");
}

function fillInventoryForm(itemId) {
  const item = state.inventory.find(row => row.inventory_id === itemId);
  if (!item) return;
  openEditorForm(el.inventoryForm, `Editando: ${item.nombre}`);
  setFormValues(el.inventoryForm, {
    inventory_id: item.inventory_id,
    nombre: item.nombre,
    categoria: item.categoria,
    cantidad: item.cantidad,
    unidad: item.unidad,
    costo: formatMoney(item.costo),
    minimo: item.minimo,
    activo: String(Boolean(item.activo))
  });
  updateFormChecks(el.inventoryForm);
}

function fillCashierForm(cashierId) {
  const cashier = state.cashiers.find(row => row.cashier_id === cashierId);
  if (!cashier) return;
  openEditorForm(el.cashierForm, `Editando: ${cashier.nombre}`);
  setFormValues(el.cashierForm, {
    cashier_id: cashier.cashier_id,
    nombre: cashier.nombre,
    correo: cashier.correo,
    clave: cashier.clave,
    rol: cashier.rol || "cajero",
    activo: String(Boolean(cashier.activo))
  });
  updateFormChecks(el.cashierForm);
}

async function saveProduct(event) {
  event.preventDefault();
  const data = getFormObject(el.productForm);
  const editing = Boolean(data.producto_id);
  const product = {
    producto_id: data.producto_id || makeId("prod"),
    categoria_id: data.categoria_id,
    nombre: data.nombre,
    precio: moneyToNumber(data.precio),
    descripcion: data.descripcion,
    imagen: data.imagen || suggestedProductImage(),
    opciones: parseFriendlyOptions(data.opciones),
    orden: moneyToNumber(data.orden),
    activo: data.activo === "true"
  };
  upsertLocal("products", "producto_id", product);
  collapseForm(el.productForm);
  await persistAndRender("upsertProduct", { product }, editing ? "Producto actualizado." : "Producto agregado.");
}

async function saveExtra(event) {
  event.preventDefault();
  const data = getFormObject(el.extraForm);
  const extra = {
    extra_id: data.extra_id || makeId("extra"),
    nombre: data.nombre,
    precio: moneyToNumber(data.precio),
    orden: moneyToNumber(data.orden),
    activo: data.activo === "true"
  };
  upsertLocal("extras", "extra_id", extra);
  collapseForm(el.extraForm);
  await persistAndRender("upsertExtra", { extra }, "Extra guardado.");
}

async function saveInventoryItem(event) {
  event.preventDefault();
  const data = getFormObject(el.inventoryForm);
  const item = {
    inventory_id: data.inventory_id || makeId("inv"),
    nombre: data.nombre,
    categoria: data.categoria,
    cantidad: moneyToNumber(data.cantidad),
    unidad: data.unidad,
    costo: moneyToNumber(data.costo),
    minimo: moneyToNumber(data.minimo),
    activo: data.activo === "true",
    actualizado: new Date().toISOString()
  };
  upsertLocal("inventory", "inventory_id", item);
  collapseForm(el.inventoryForm);
  await persistAndRender("upsertInventory", { item }, "Insumo guardado.");
}

async function saveCashier(event) {
  event.preventDefault();
  if (!isBossUser()) {
    toast("Solo un jefe puede crear o editar usuarios.");
    return;
  }
  const data = getFormObject(el.cashierForm);
  const correo = String(data.correo || "").trim().toLowerCase();
  const clave = String(data.clave || "").trim();
  if (!correo || !clave || clave.length < 4) {
    toast("Escribe un correo y una contraseña de mínimo 4 caracteres.");
    return;
  }
  const cashier = {
    cashier_id: data.cashier_id || makeId("cash"),
    nombre: data.nombre,
    correo,
    clave,
    rol: data.rol || "cajero",
    activo: data.activo === "true",
    ultimo_acceso: ""
  };
  upsertLocal("cashiers", "cashier_id", cashier);
  collapseForm(el.cashierForm);
  await persistAndRender("upsertCashier", { cashier }, "Cajero guardado.");
}

async function deleteProduct(productId) {
  const confirmed = await smartConfirm({
    title: "Eliminar producto",
    message: "Este producto dejara de aparecer en la carta.",
    confirmText: "Eliminar",
    danger: true
  });
  if (!confirmed) return;
  state.products = state.products.filter(product => product.producto_id !== productId);
  await persistAndRender("deleteProduct", { producto_id: productId, hardDelete: true }, "Producto eliminado.");
}

async function deleteExtra(extraId) {
  const confirmed = await smartConfirm({
    title: "Eliminar extra",
    message: "Este extra dejara de estar disponible en la carta.",
    confirmText: "Eliminar",
    danger: true
  });
  if (!confirmed) return;
  state.extras = state.extras.filter(extra => extra.extra_id !== extraId);
  await persistAndRender("deleteExtra", { extra_id: extraId, hardDelete: true }, "Extra eliminado.");
}

async function deleteInventoryItem(itemId) {
  const confirmed = await smartConfirm({
    title: "Eliminar insumo",
    message: "Este insumo saldra del control de inventario.",
    confirmText: "Eliminar",
    danger: true
  });
  if (!confirmed) return;
  state.inventory = state.inventory.filter(item => item.inventory_id !== itemId);
  await persistAndRender("deleteInventory", { inventory_id: itemId, hardDelete: true }, "Insumo eliminado.");
}

async function deleteCashier(cashierId) {
  if (!isBossUser()) {
    toast("Solo un jefe puede eliminar usuarios.");
    return;
  }
  const confirmed = await smartConfirm({
    title: "Eliminar cajero",
    message: "Este usuario perdera acceso al panel.",
    confirmText: "Eliminar",
    danger: true
  });
  if (!confirmed) return;
  state.cashiers = state.cashiers.filter(cashier => cashier.cashier_id !== cashierId);
  await persistAndRender("deleteCashier", { cashier_id: cashierId, hardDelete: true }, "Cajero eliminado.");
}

async function cycleOrderStatus(orderId) {
  const order = state.orders.find(item => item.order_id === orderId);
  const statuses = ["nuevo", "confirmado", "en cocina", "despachado"];
  const currentIndex = statuses.indexOf(normalize(order?.estado || "nuevo"));
  const nextStatus = statuses[(currentIndex + 1) % statuses.length];
  if (order) order.estado = nextStatus;
  await persistAndRender("updateOrderStatus", { order_id: orderId, estado: nextStatus }, "Estado actualizado.");
}

async function persistAndRender(action, data, successMessage) {
  const savingOverlay = showSectionSaving(action, data);
  queuePendingWrite(action, data);
  cacheAdminData();
  renderAll();
  toast(successMessage);
  if (!state.token) {
    window.setTimeout(() => hideSectionSaving(savingOverlay), 900);
    return;
  }
  postAdmin(action, data)
    .then(() => {
      state.pendingWrites = state.pendingWrites.filter(item => !(item.action === action && item.id === pendingIdFor(action, data)));
      savePendingWrites();
      scheduleBackgroundRefresh();
    })
    .catch(error => {
      console.warn("Guardado pendiente en segundo plano", error);
    })
    .finally(() => {
      window.setTimeout(() => hideSectionSaving(savingOverlay), 260);
    });
}

function persistTableQuietly(table) {
  const action = "upsertTable";
  const data = { table };
  const pending = queuePendingWrite(action, data);
  cacheAdminData();

  if (!state.token) return;
  persistTableQuietly.timers = persistTableQuietly.timers || new Map();
  window.clearTimeout(persistTableQuietly.timers.get(table.table_id));
  persistTableQuietly.timers.set(table.table_id, window.setTimeout(() => {
    postAdmin(action, data)
      .then(() => {
        state.pendingWrites = state.pendingWrites.filter(item => {
          return !(item.action === action && item.id === pending.id && item.createdAt === pending.createdAt);
        });
        savePendingWrites();
        cacheAdminData();
        scheduleBackgroundRefresh();
      })
      .catch(error => {
        console.warn("Mesa guardada localmente; backend pendiente", error);
      })
      .finally(() => {
        persistTableQuietly.timers.delete(table.table_id);
      });
  }, 180));
}

function persistCheckoutQuietly(table, payment) {
  const action = "checkoutTable";
  const data = { table, payment };
  const pending = queuePendingWrite(action, data);
  cacheAdminData();

  if (!state.token) return;
  postAdmin(action, data)
    .then(() => {
      state.pendingWrites = state.pendingWrites.filter(item => {
        return !(item.action === action && item.id === pending.id && item.createdAt === pending.createdAt);
      });
      savePendingWrites();
      cacheAdminData();
      scheduleBackgroundRefresh();
    })
    .catch(error => {
      console.warn("Pago de mesa guardado localmente; backend pendiente", error);
    });
}

function showSectionSaving(action, data = {}) {
  const target = savingTargetForAction(action, data);
  if (!target) return null;
  target.dataset.savingCount = String(moneyToNumber(target.dataset.savingCount) + 1);
  target.classList.add("section-saving");
  let overlay = target.querySelector(":scope > .section-saving-overlay");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.className = "section-saving-overlay";
    overlay.setAttribute("aria-hidden", "true");
    overlay.innerHTML = `
      <div class="triangle-loader" aria-hidden="true"><span></span><span></span><span></span></div>
      <strong>Guardando</strong>
    `;
    target.appendChild(overlay);
  }
  return { target, overlay };
}

function hideSectionSaving(handle) {
  if (!handle?.target) return;
  const nextCount = Math.max(0, moneyToNumber(handle.target.dataset.savingCount) - 1);
  handle.target.dataset.savingCount = String(nextCount);
  if (nextCount > 0) return;
  handle.target.classList.remove("section-saving");
  handle.overlay?.remove();
}

function savingTargetForAction(action, data = {}) {
  if (["upsertProduct", "deleteProduct"].includes(action)) return document.querySelector("#carta");
  if (["upsertExtra", "deleteExtra"].includes(action)) return document.querySelector("#extras");
  if (["upsertInventory", "deleteInventory", "recordInventoryMovement"].includes(action)) return document.querySelector("#inventario > .dashboard-panel");
  if (["upsertCashier", "deleteCashier"].includes(action)) return document.querySelector("#cajeros .dashboard-panel");
  if (["updateOrderStatus"].includes(action)) return document.querySelector("#ordenes");
  if (["checkoutTable", "cancelTable"].includes(action)) return document.querySelector("#mesas .selected-table-panel");
  if (["deleteTable"].includes(action)) return document.querySelector("#mesas .tables-layout > .dashboard-panel:first-child");
  if (action === "upsertTable") {
    const table = data.table || {};
    const hasItems = tableItems(table).length > 0;
    return document.querySelector(hasItems ? "#mesas .selected-table-panel" : "#mesas .tables-layout > .dashboard-panel:first-child");
  }
  return document.querySelector(".admin-view:not([style*='display: none']) .dashboard-panel");
}

function scheduleBackgroundRefresh() {
  window.clearTimeout(scheduleBackgroundRefresh.timer);
  scheduleBackgroundRefresh.timer = window.setTimeout(() => {
    if (state.token && !document.hidden) loadAdminData({ silent: true });
  }, 1400);
}

async function postAdmin(action, data) {
  const response = await fetchWithTimeout(API_URL, {
    method: "POST",
    body: JSON.stringify({
      action,
      token: state.token,
      password: state.token,
      cashier: state.cashierSession,
      ...data
    })
  });
  const payload = await response.json();
  if (!response.ok || !payload.ok) {
    throw new Error(payload.error || `HTTP ${response.status}`);
  }
}

function selectedTable() {
  return state.tables.find(table => table.table_id === state.selectedTableId);
}

function tableItems(table) {
  if (!table) return [];
  if (Array.isArray(table.items)) return table.items;
  try {
    const parsed = JSON.parse(table.items || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function tableTotal(table) {
  return tableItems(table).reduce((sum, item) => sum + lineTotal(item), 0);
}

function lineTotal(item) {
  return moneyToNumber(item.precio) * Math.max(1, moneyToNumber(item.qty));
}

function todayPaymentsTotal() {
  const today = new Date().toLocaleDateString("es-CO");
  return state.payments
    .filter(payment => normalize(payment.estado) === "pagado")
    .filter(payment => new Date(payment.fecha || 0).toLocaleDateString("es-CO") === today)
    .reduce((sum, payment) => sum + moneyToNumber(payment.total), 0);
}

function cashierName() {
  return state.cashierSession?.nombre || "Caja principal";
}

function openLayer(layer) {
  layer.classList.remove("hidden");
  layer.setAttribute("aria-hidden", "false");
}

function closeLayer(layer) {
  layer.classList.add("hidden");
  layer.setAttribute("aria-hidden", "true");
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
    el.smartDialogKicker.textContent = options.kicker || "Quicio - Caprichos Admin";
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

function upsertLocal(collection, idKey, item) {
  const index = state[collection].findIndex(current => current[idKey] === item[idKey]);
  if (index >= 0) {
    state[collection][index] = item;
  } else {
    state[collection] = [item, ...state[collection]];
  }
}

function normalizeProductsForAdmin(products) {
  return products.map((product, index) => ({
    producto_id: product.producto_id || makeId("prod"),
    categoria_id: product.categoria_id || "pizzas",
    nombre: product.nombre || "Producto Quicio",
    precio: moneyToNumber(product.precio),
    descripcion: product.descripcion || "",
    imagen: product.imagen || `pizza${(index % 8) + 1}.png`,
    opciones: product.opciones || "",
    orden: moneyToNumber(product.orden) || index + 1,
    activo: product.activo !== false && String(product.activo).toLowerCase() !== "false"
  })).sort(sortByOrderThenName);
}

function normalizeExtrasForAdmin(extras) {
  return extras.map((extra, index) => ({
    extra_id: extra.extra_id || makeId("extra"),
    nombre: extra.nombre || "Extra Quicio",
    precio: moneyToNumber(extra.precio),
    orden: moneyToNumber(extra.orden) || index + 1,
    activo: extra.activo !== false && String(extra.activo).toLowerCase() !== "false"
  })).sort(sortByOrderThenName);
}

function normalizeOrdersForAdmin(orders) {
  return orders
    .map((order, index) => ({
      ...order,
      displayNumber: moneyToNumber(order.order_number) || index + 1
    }))
    .sort(sortOrdersAscending)
    .map((order, index) => ({
      ...order,
      displayNumber: moneyToNumber(order.order_number) || index + 1
    }));
}

function normalizeTables(tables) {
  return tables.map((table, index) => ({
    table_id: table.table_id || makeId("mesa"),
    nombre: table.nombre || table.table_name || `Mesa ${index + 1}`,
    estado: table.estado || "abierta",
    fecha_apertura: table.fecha_apertura || table.fecha || new Date().toISOString(),
    fecha_cierre: table.fecha_cierre || "",
    cajero: table.cajero || "Caja principal",
    items: tableItems(table)
  }));
}

function normalizePayments(payments) {
  return payments.map(payment => ({
    payment_id: payment.payment_id || makeId("pay"),
    table_id: payment.table_id || "",
    table_name: payment.table_name || "",
    origen: payment.origen || payment.table_name || "Mesa",
    fecha: payment.fecha || new Date().toISOString(),
    cajero: payment.cajero || "Caja principal",
    metodo: payment.metodo || payment.metodo_principal || "Efectivo",
    metodo_principal: payment.metodo_principal || payment.metodo || "Efectivo",
    metodo_uno: payment.metodo_uno || "",
    valor_uno: moneyToNumber(payment.valor_uno),
    metodo_dos: payment.metodo_dos || "",
    valor_dos: moneyToNumber(payment.valor_dos),
    total: moneyToNumber(payment.total),
    estado: payment.estado || "pagado",
    notas: payment.notas || "",
    items: payment.items || "[]"
  }));
}

function normalizeInventory(items) {
  return items.map((item, index) => ({
    inventory_id: item.inventory_id || makeId("inv"),
    nombre: item.nombre || `Insumo ${index + 1}`,
    categoria: item.categoria || "General",
    cantidad: moneyToNumber(item.cantidad),
    unidad: item.unidad || "unidades",
    costo: moneyToNumber(item.costo),
    minimo: moneyToNumber(item.minimo),
    activo: item.activo !== false && String(item.activo).toLowerCase() !== "false",
    actualizado: item.actualizado || ""
  }));
}

function normalizeInventoryMovements(movements) {
  return movements.map(move => ({
    movement_id: move.movement_id || makeId("mov"),
    inventory_id: move.inventory_id || "",
    nombre: move.nombre || "Insumo",
    cantidad: moneyToNumber(move.cantidad),
    unidad: move.unidad || "",
    tipo: move.tipo || "retiro",
    fecha: move.fecha || new Date().toISOString(),
    usuario: move.usuario || move.cajero || "Usuario"
  })).sort((a, b) => new Date(b.fecha || 0) - new Date(a.fecha || 0));
}

function mergeInventoryMovements(serverMovements = []) {
  let localMovements = [];
  try {
    localMovements = JSON.parse(localStorage.getItem("chanchos_inventory_movements_v1") || "[]");
  } catch {
    localMovements = [];
  }
  const map = new Map();
  normalizeInventoryMovements([...serverMovements, ...localMovements]).forEach(move => {
    map.set(move.movement_id, move);
  });
  return [...map.values()]
    .sort((a, b) => new Date(b.fecha || 0) - new Date(a.fecha || 0))
    .slice(0, 200);
}

function normalizeCashiers(cashiers) {
  return cashiers.map(cashier => ({
    cashier_id: cashier.cashier_id || makeId("cash"),
    nombre: cashier.nombre || "Cajero",
    correo: String(cashier.correo || cashier.email || "").trim().toLowerCase(),
    clave: String(cashier.clave || cashier.password || ""),
    rol: cashier.rol || "cajero",
    activo: cashier.activo !== false && String(cashier.activo).toLowerCase() !== "false",
    ultimo_acceso: cashier.ultimo_acceso || ""
  }));
}

function sortOrdersAscending(a, b) {
  const byNumber = moneyToNumber(a.order_number) - moneyToNumber(b.order_number);
  if (byNumber) return byNumber;
  const byDate = new Date(a.fecha || 0).getTime() - new Date(b.fecha || 0).getTime();
  if (byDate) return byDate;
  return String(a.order_id || "").localeCompare(String(b.order_id || ""));
}

function sortByOrderThenName(a, b) {
  return moneyToNumber(a.orden) - moneyToNumber(b.orden) || String(a.nombre || "").localeCompare(String(b.nombre || ""), "es");
}

function orderStatusLabel(status) {
  const value = normalize(status || "nuevo");
  if (value === "confirmado") return "Confirmado";
  if (value === "en cocina" || value === "cocina" || value === "preparando") return "En cocina";
  if (value === "despachado" || value === "entregado") return "Despachado";
  if (value === "cancelado" || value === "anulado") return "Cancelado";
  return "Nuevo";
}

function orderStatusClass(status) {
  const value = normalize(status || "nuevo");
  if (value === "confirmado") return "is-confirmed";
  if (value === "en cocina" || value === "cocina" || value === "preparando") return "is-kitchen";
  if (value === "despachado" || value === "entregado") return "is-dispatched";
  return "is-new";
}

function nextOrderStatusLabel(status) {
  const value = normalize(status || "nuevo");
  if (value === "nuevo") return "Confirmar";
  if (value === "confirmado") return "Enviar a cocina";
  if (value === "en cocina" || value === "cocina" || value === "preparando") return "Despachar";
  return "Reabrir";
}

function notifyIfNewOrders(nextOrders) {
  const nextIds = new Set(nextOrders.map(order => String(order.order_id || "")));
  const newOrders = state.liveOrdersReady
    ? nextOrders.filter(order => order.order_id && !state.knownOrderIds.has(String(order.order_id)))
    : [];
  state.knownOrderIds = nextIds;
  if (!state.liveOrdersReady) {
    state.liveOrdersReady = true;
    return;
  }
  if (newOrders.length) {
    playOrderAlert();
    showNewOrderAlert(newOrders);
    showSystemOrderNotification(newOrders);
  }
}

function isNewOrder(order) {
  return ["nuevo", "pendiente"].includes(normalize(order.estado || "nuevo"));
}

function showNewOrderAlert(newOrders) {
  if (!el.newOrderAlert) return;
  const latest = newOrders[newOrders.length - 1];
  el.newOrderAlertTitle.textContent = newOrders.length === 1
    ? `Nueva orden #${latest.order_number || latest.displayNumber || ""}`
    : `${newOrders.length} órdenes nuevas`;
  el.newOrderAlertDetail.textContent = newOrders.length === 1
    ? `${latest.cliente || "Cliente"} · ${formatMoney(latest.total)}`
    : "Hay varios pedidos esperando revisión.";
  el.newOrderAlert.classList.remove("hidden");
  el.newOrderAlert.classList.remove("is-entering");
  void el.newOrderAlert.offsetWidth;
  el.newOrderAlert.classList.add("is-entering");
}

function hideNewOrderAlert() {
  el.newOrderAlert?.classList.add("hidden");
}

function openNewOrders() {
  setActiveView("ordenes");
  state.orderFilter = "nuevo";
  el.orderFilter.value = "nuevo";
  renderOrders();
  hideNewOrderAlert();
}

async function enableAdminAlerts() {
  await unlockSound();
  if ("Notification" in window && Notification.permission === "default") {
    await Notification.requestPermission().catch(() => "denied");
  }
  updateNotificationPermissionUi();
  if (state.soundReady && (!("Notification" in window) || Notification.permission === "granted")) {
    toast("Sonido y notificaciones activados.");
  } else if (state.soundReady) {
    toast("Sonido activo. Las notificaciones del navegador están bloqueadas.");
  }
}

function updateNotificationPermissionUi() {
  if (!el.notificationPermission || !el.notificationPermissionLabel) return;
  const notificationsGranted = !("Notification" in window) || Notification.permission === "granted";
  const fullyEnabled = state.soundReady && notificationsGranted;
  el.notificationPermission.classList.toggle("is-enabled", fullyEnabled);
  el.notificationPermission.classList.toggle("is-blocked", "Notification" in window && Notification.permission === "denied");
  el.notificationPermission.setAttribute("aria-pressed", String(fullyEnabled));
  el.notificationPermissionLabel.textContent = fullyEnabled
    ? "Avisos activos"
    : state.soundReady
      ? "Permitir notificaciones"
      : "Activar sonido y avisos";
}

function showSystemOrderNotification(newOrders) {
  if (!("Notification" in window) || Notification.permission !== "granted") return;
  const latest = newOrders[newOrders.length - 1];
  const notification = new Notification(newOrders.length === 1 ? "Nueva orden" : `${newOrders.length} órdenes nuevas`, {
    body: `${latest.cliente || "Cliente"} · ${formatMoney(latest.total)}`,
    icon: "./images/logo.png",
    tag: "quicio-new-order"
  });
  notification.onclick = () => {
    window.focus();
    openNewOrders();
    notification.close();
  };
}

function unlockSound() {
  if (!el.alertSound || state.soundReady) {
    updateNotificationPermissionUi();
    return Promise.resolve(state.soundReady);
  }
  el.alertSound.volume = 0.85;
  return el.alertSound.play()
    .then(() => {
      el.alertSound.pause();
      el.alertSound.currentTime = 0;
      state.soundReady = true;
      updateNotificationPermissionUi();
      return true;
    })
    .catch(() => {
      state.soundReady = false;
      updateNotificationPermissionUi();
      return false;
    });
}

function playOrderAlert() {
  if (!el.alertSound) return;
  el.alertSound.currentTime = 0;
  el.alertSound.play().catch(() => {
    toast("Nueva orden recibida. Activa el sonido con Entrar o Recargar.");
  });
}

function startOrderPolling() {
  window.clearInterval(state.pollTimer);
  if (state.token) loadOrdersRealtime();
  state.pollTimer = window.setInterval(() => {
    if (state.token) loadOrdersRealtime();
  }, API_REALTIME_POLL_MS);
}

async function loadOrdersRealtime() {
  if (!state.token || state.orderSyncInProgress) return;
  state.orderSyncInProgress = true;
  try {
    const url = new URL(API_URL);
    url.searchParams.set("action", "ordersData");
    url.searchParams.set("token", state.token);
    url.searchParams.set("_", Date.now().toString());
    const response = await fetchWithTimeout(url.toString(), { cache: "no-store" });
    const payload = await response.json();
    if (!response.ok || !payload.ok) throw new Error(payload.error || `HTTP ${response.status}`);
    const nextOrders = normalizeOrdersForAdmin(payload.data?.orders || []);
    notifyIfNewOrders(nextOrders);
    state.orders = nextOrders;
    applyPendingWrites();
    cacheAdminData();
    renderKpis();
    renderIncome();
    renderOrders();
  } catch (error) {
    console.warn("Consulta rápida de órdenes pendiente", error);
  } finally {
    state.orderSyncInProgress = false;
  }
}

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort("api-timeout"), API_TIMEOUT_MS);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch (error) {
    if (error.name === "AbortError" || controller.signal.aborted) {
      throw new Error("La conexión tardó más de lo esperado. Reintenta en unos segundos.");
    }
    throw error;
  } finally {
    window.clearTimeout(timeoutId);
  }
}

function friendlyNetworkError(error) {
  const message = String(error?.message || error || "");
  if (/aborted|abort|signal/i.test(message)) {
    return "La conexión tardó más de lo esperado. Reintenta en unos segundos.";
  }
  if (/Failed to fetch|NetworkError|Load failed/i.test(message)) {
    return "No hay respuesta de red. Se mantiene el trabajo local.";
  }
  return message || "No hubo respuesta de conexión.";
}

function setStatus(message) {
  el.status.textContent = message;
}

function toast(message) {
  el.toast.textContent = message;
  el.toast.classList.add("show");
  window.clearTimeout(toast.timer);
  toast.timer = window.setTimeout(() => el.toast.classList.remove("show"), 3200);
}

function setText(id, value) {
  const target = document.getElementById(id);
  if (target) target.textContent = value;
}

function setFormValues(form, values) {
  Object.entries(values).forEach(([key, value]) => {
    if (form.elements[key]) form.elements[key].value = value ?? "";
  });
  formatMoneyFieldsIn(form);
}

function resetForm(form) {
  form.reset();
  form.querySelectorAll("input[type='hidden']").forEach(input => {
    input.value = "";
  });
  updateFormChecks(form);
}

function openFormForCreate(form, entityLabel) {
  resetForm(form);
  if (form === el.productForm) form.elements.imagen.value = suggestedProductImage();
  if (form === el.cashierForm) {
    form.elements.rol.value = "cajero";
  }
  openEditorForm(form, `Nuevo ${entityLabel}`);
  form.querySelector("input:not([type='hidden']), textarea, select")?.focus();
}

function openEditorForm(form, title) {
  form.classList.remove("collapsed");
  form.dataset.editorTitle = title;
  updateSubmitLabels(form);
  updateFormChecks(form);
}

function collapseForm(form) {
  resetForm(form);
  form.classList.add("collapsed");
  form.dataset.editorTitle = "";
  updateSubmitLabels(form);
}

function updateSubmitLabels(form) {
  if (form === el.productForm && el.productSubmit) {
    el.productSubmit.textContent = form.elements.producto_id?.value ? "Actualizar producto" : "Agregar producto";
  }
}

function updateFormChecks(form) {
  form.querySelectorAll("label").forEach(label => {
    const field = label.querySelector("input:not([type='hidden']), textarea, select");
    if (!field) return;
    const hasValue = field.tagName === "SELECT" ? Boolean(field.value) : Boolean(String(field.value || "").trim());
    label.classList.toggle("field-ok", hasValue);
  });
}

function getFormObject(form) {
  return Object.fromEntries(new FormData(form).entries());
}

function bindAdminMoneyInputs() {
  document.querySelectorAll("input[name='precio'], input[name='costo'], input[name='expense_amount'], input[name='amount_one'], input[name='amount_two']").forEach(input => {
    input.addEventListener("input", () => formatMoneyInput(input));
    input.addEventListener("blur", () => formatMoneyInput(input));
  });
  el.productForm?.elements?.opciones?.addEventListener("blur", event => {
    event.currentTarget.value = formatFriendlyOptionsInput(event.currentTarget.value);
  });
}

function formatMoneyFieldsIn(form) {
  form.querySelectorAll("input[name='precio'], input[name='costo'], input[name='expense_amount'], input[name='amount_one'], input[name='amount_two']").forEach(formatMoneyInput);
  if (form === el.productForm && form.elements.opciones) {
    form.elements.opciones.value = formatFriendlyOptionsInput(form.elements.opciones.value);
  }
}

function formatMoneyInput(input) {
  const amount = moneyToNumber(input.value);
  input.value = amount > 0 ? formatMoney(amount) : "";
}

function parseFriendlyOptions(value) {
  const text = String(value || "").trim();
  if (!text) return "";
  try {
    const parsed = JSON.parse(text);
    return Array.isArray(parsed) ? JSON.stringify(parsed) : "";
  } catch {}

  const options = text
    .split(/\n|,/)
    .map(part => part.trim())
    .filter(Boolean)
    .map((part, index) => {
      const match = part.match(/^(.+?)(?::|-)\s*\$?\s*([\d.,]+)/);
      if (!match) return null;
      const label = match[1].trim();
      return {
        id: `opt-${slugify(label || `opcion-${index + 1}`)}`,
        label,
        price: moneyToNumber(match[2])
      };
    })
    .filter(Boolean);

  return options.length ? JSON.stringify(options) : "";
}

function formatProductOptionsForInput(value) {
  let raw = value;
  if (typeof raw === "string") {
    const text = raw.trim();
    if (!text) return "";
    try {
      raw = JSON.parse(text);
    } catch {
      return text;
    }
  }
  if (!Array.isArray(raw)) return "";
  return raw.filter(option => option && option.label).map(option => `${option.label}: ${formatMoney(option.price)}`).join(", ");
}

function formatFriendlyOptionsInput(value) {
  const text = String(value || "").trim();
  if (!text) return "";
  try {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) return formatProductOptionsForInput(parsed);
  } catch {}
  return text
    .split(/\n|,/)
    .map(part => part.trim())
    .filter(Boolean)
    .map(part => {
      const match = part.match(/^(.+?)(?::|-)\s*(?:COP\s*)?\$?\s*([\d.,]+)/i);
      if (!match) return part;
      return `${match[1].trim()}: ${formatMoney(match[2])}`;
    })
    .join(", ");
}

function orderItemsLabel(itemsValue) {
  try {
    const items = JSON.parse(itemsValue || "[]");
    if (!Array.isArray(items) || !items.length) return "Sin detalle de productos";
    return items.map(item => `${item.cantidad || item.qty || 1}x ${item.nombre || item.title || "Producto"}`).join(", ");
  } catch {
    return itemsValue || "Sin detalle de productos";
  }
}

function suggestedProductImage() {
  const nextIndex = (state.products.length % 8) + 1;
  return `pizza${nextIndex}.png`;
}

function productVisualImage(product) {
  const image = String(product?.imagen || "").trim();
  if (/^pizza([1-8])\.png$/i.test(image)) return `./images/${image}`;
  if (/^\.\/images\/pizza([1-8])\.png$/i.test(image)) return image;
  if (/^images\/pizza([1-8])\.png$/i.test(image)) return `./${image}`;
  const order = moneyToNumber(product?.orden);
  const index = order > 0 ? ((order - 1) % 8) + 1 : 1;
  return `./images/pizza${index}.png`;
}

function formatDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString("es-CO", { dateStyle: "short", timeStyle: "short" });
}

function formatDateTime(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString("es-CO", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
}

function formatMoney(value) {
  return `$ ${moneyToNumber(value).toLocaleString("es-CO")}`;
}

function moneyToNumber(value) {
  if (typeof value === "number" && Number.isFinite(value)) return Math.max(0, Math.round(value));
  const parsed = Number(String(value ?? "0").replace(/[^\d-]/g, ""));
  return Number.isFinite(parsed) ? Math.max(0, Math.round(parsed)) : 0;
}

function normalize(value) {
  return String(value || "").trim().toLowerCase();
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

function labelFromId(value) {
  return String(value || "general")
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, char => char.toUpperCase());
}

function makeId(prefix) {
  const random = globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `${prefix}-${random}`.toLowerCase();
}

function slugify(value) {
  return String(value || "opcion")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "opcion";
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
