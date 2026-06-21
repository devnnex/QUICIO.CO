const SPREADSHEET_ID = "";
const ADMIN_PASSWORD = "5678";
const ADMIN_TOKEN = ADMIN_PASSWORD;
const MENU_CACHE_KEY = "chanchos_menu_cache_v1";
const ADMIN_CACHE_KEY = "chanchos_admin_cache_v2";
const ORDER_NUMBER_PROPERTY = "quicio_last_order_number";
const CACHE_SECONDS = 8;
const MAX_ROWS_PER_SHEET = 45000;

const CONFIG = {
  productos: {
    sheetName: "productos",
    idKey: "producto_id",
    headers: ["producto_id", "categoria_id", "nombre", "precio", "descripcion", "imagen", "opciones", "orden", "activo"]
  },
  extras: {
    sheetName: "extras",
    idKey: "extra_id",
    headers: ["extra_id", "nombre", "precio", "orden", "activo"]
  },
  orders: {
    sheetName: "orders",
    idKey: "order_id",
    headers: ["order_id", "order_number", "fecha", "cliente", "telefono", "metodo", "direccion", "pago", "subtotal", "domicilio", "total", "estado", "notas", "items"]
  },
  tables: {
    sheetName: "mesas",
    idKey: "table_id",
    headers: ["table_id", "nombre", "estado", "fecha_apertura", "fecha_cierre", "cajero", "items", "total"]
  },
  payments: {
    sheetName: "pagos",
    idKey: "payment_id",
    headers: ["payment_id", "table_id", "table_name", "origen", "fecha", "cajero", "metodo", "metodo_principal", "metodo_uno", "valor_uno", "metodo_dos", "valor_dos", "total", "estado", "notas", "items"]
  },
  inventory: {
    sheetName: "inventario",
    idKey: "inventory_id",
    headers: ["inventory_id", "nombre", "categoria", "cantidad", "unidad", "costo", "minimo", "activo", "actualizado"]
  },
  inventoryMovements: {
    sheetName: "movimientos_inventario",
    idKey: "movement_id",
    headers: ["movement_id", "inventory_id", "nombre", "cantidad", "unidad", "tipo", "fecha", "usuario"]
  },
  cashiers: {
    sheetName: "cajeros",
    idKey: "cashier_id",
    headers: ["cashier_id", "nombre", "correo", "clave", "rol", "activo", "ultimo_acceso"]
  }
};

function doGet(e) {
  try {
    var action = param_(e, "action", "menu");

    if (action === "menu" || action === "read") {
      return json_(cachedPayload_(MENU_CACHE_KEY, function() {
        return {
          ok: true,
          data: {
            products: readTable_(CONFIG.productos).map(normalizeProduct_).sort(sortByOrder_),
            extras: readTable_(CONFIG.extras).map(normalizeExtra_).sort(sortByOrder_),
            updatedAt: new Date().toISOString()
          }
        };
      }));
    }

    if (action === "ping") {
      return json_({ ok: true, data: { status: "online", updatedAt: new Date().toISOString() } });
    }

    if (action === "authInfo") {
      return json_({ ok: true, data: { hasBoss: hasBoss_(), updatedAt: new Date().toISOString() } });
    }

    if (action === "adminData") {
      validateSession_(param_(e, "token", ""));
      if (param_(e, "fresh", "") === "1") {
        return json_({ ok: true, data: buildAdminData_() });
      }
      return json_(cachedPayload_(ADMIN_CACHE_KEY, function() {
        return { ok: true, data: buildAdminData_() };
      }));
    }

    if (action === "ordersData") {
      validateSession_(param_(e, "token", ""));
      return json_({ ok: true, data: { orders: readOrders_(), updatedAt: new Date().toISOString() } });
    }

    return json_({ ok: false, error: "Acción GET no soportada: " + action });
  } catch (error) {
    return json_({ ok: false, error: errorMessage_(error) });
  }
}

function doPost(e) {
  var lock = LockService.getScriptLock();

  try {
    lock.waitLock(5000);
    var body = parseBody_(e);

    if (body.action === "createFirstBoss") {
      if (hasBoss_()) throw new Error("Ya existe un jefe registrado.");
      validateCashierCredentials_(body.correo, body.clave);
      var firstBoss = normalizeCashier_({
        nombre: body.nombre || "Jefe principal",
        correo: body.correo,
        clave: body.clave,
        rol: "jefe",
        activo: true,
        ultimo_acceso: new Date().toISOString()
      });
      upsert_(CONFIG.cashiers, firstBoss);
      clearDataCache_();
      return json_({ ok: true, data: { token: sessionToken_(firstBoss), user: publicCashier_(firstBoss) } });
    }

    if (body.action === "loginStaff") {
      var staff = loginStaff_(body.correo, body.clave);
      clearDataCache_();
      return json_({ ok: true, data: { token: sessionToken_(staff), user: publicCashier_(staff) } });
    }

    if (body.action === "upsertProduct" || body.action === "addProduct" || body.action === "editProduct") {
      validateSession_(body.password || body.token);
      var product = normalizeProduct_(body.product || body.producto || body);
      upsert_(CONFIG.productos, product);
      clearDataCache_();
      return json_({ ok: true, data: { product: product } });
    }

    if (body.action === "upsertExtra" || body.action === "addExtra" || body.action === "editExtra") {
      validateSession_(body.password || body.token);
      var extra = normalizeExtra_(body.extra || body);
      upsert_(CONFIG.extras, extra);
      clearDataCache_();
      return json_({ ok: true, data: { extra: extra } });
    }

    if (body.action === "deleteProduct") {
      validateSession_(body.password || body.token);
      var productId = required_(body.producto_id || body.product_id, "producto_id");
      deleteOrDeactivate_(CONFIG.productos, productId, body.hardDelete === true);
      clearDataCache_();
      return json_({ ok: true, data: { producto_id: productId } });
    }

    if (body.action === "deleteExtra") {
      validateSession_(body.password || body.token);
      var extraId = required_(body.extra_id, "extra_id");
      deleteOrDeactivate_(CONFIG.extras, extraId, body.hardDelete === true);
      clearDataCache_();
      return json_({ ok: true, data: { extra_id: extraId } });
    }

    if (body.action === "createOrder") {
      var order = normalizeOrder_(body.order || body);
      order.order_number = nextOrderNumberFast_();
      appendNew_(CONFIG.orders, order);
      clearDataCache_();
      return json_({ ok: true, data: { order: order } });
    }

    if (body.action === "updateOrderStatus") {
      validateSession_(body.password || body.token);
      var updatedOrder = updateOrderStatus_(required_(body.order_id, "order_id"), required_(body.estado, "estado"));
      clearDataCache_();
      return json_({ ok: true, data: { order: updatedOrder } });
    }

    if (body.action === "bulkUpdateOrderStatus") {
      validateSession_(body.password || body.token);
      var bulkResult = updateOrdersStatusBatch_(body.order_ids || [], required_(body.estado, "estado"));
      clearDataCache_();
      return json_({ ok: true, data: {
        updated_ids: bulkResult.updated_ids,
        missing_ids: bulkResult.missing_ids,
        operation_key: clean_(body.operation_key)
      } });
    }

    if (body.action === "upsertTable" || body.action === "createTable") {
      validateSession_(body.password || body.token);
      var table = normalizeTable_(body.table || body);
      upsert_(CONFIG.tables, table);
      clearDataCache_();
      return json_({ ok: true, data: { table: table } });
    }

    if (body.action === "checkoutTable") {
      validateSession_(body.password || body.token);
      var checkoutTable = normalizeTable_(body.table || {});
      var payment = normalizePayment_(body.payment || body);
      upsert_(CONFIG.payments, payment);
      upsert_(CONFIG.tables, checkoutTable);
      clearDataCache_();
      return json_({ ok: true, data: { table: checkoutTable, payment: payment } });
    }

    if (body.action === "cancelTable") {
      validateSession_(body.password || body.token);
      var canceledTable = normalizeTable_(body.table || {});
      upsert_(CONFIG.tables, canceledTable);
      clearDataCache_();
      return json_({ ok: true, data: { table: canceledTable } });
    }

    if (body.action === "deleteTable") {
      validateSession_(body.password || body.token);
      var tableId = required_(body.table_id, "table_id");
      deleteOrDeactivate_(CONFIG.tables, tableId, body.hardDelete === true);
      clearDataCache_();
      return json_({ ok: true, data: { table_id: tableId } });
    }

    if (body.action === "upsertInventory") {
      validateSession_(body.password || body.token);
      var item = normalizeInventory_(body.item || body);
      upsert_(CONFIG.inventory, item);
      clearDataCache_();
      return json_({ ok: true, data: { item: item } });
    }

    if (body.action === "recordInventoryMovement") {
      validateSession_(body.password || body.token);
      var movement = normalizeInventoryMovement_(body.movement || body);
      upsert_(CONFIG.inventoryMovements, movement);
      clearDataCache_();
      return json_({ ok: true, data: { movement: movement } });
    }

    if (body.action === "deleteInventory") {
      validateSession_(body.password || body.token);
      var inventoryId = required_(body.inventory_id, "inventory_id");
      deleteOrDeactivate_(CONFIG.inventory, inventoryId, body.hardDelete === true);
      clearDataCache_();
      return json_({ ok: true, data: { inventory_id: inventoryId } });
    }

    if (body.action === "upsertCashier") {
      validateSession_(body.password || body.token, "jefe");
      var cashierBody = body.cashier || body;
      validateCashierCredentials_(cashierBody.correo || cashierBody.email, cashierBody.clave || cashierBody.password);
      var cashier = normalizeCashier_(cashierBody);
      upsert_(CONFIG.cashiers, cashier);
      clearDataCache_();
      return json_({ ok: true, data: { cashier: cashier } });
    }

    if (body.action === "deleteCashier") {
      validateSession_(body.password || body.token, "jefe");
      var cashierId = required_(body.cashier_id, "cashier_id");
      deleteOrDeactivate_(CONFIG.cashiers, cashierId, body.hardDelete === true);
      clearDataCache_();
      return json_({ ok: true, data: { cashier_id: cashierId } });
    }

    if (body.action === "setup") {
      validateSession_(body.password || body.token, "jefe");
      Object.keys(CONFIG).forEach(function(key) {
        ensureSheet_(CONFIG[key]);
      });
      clearDataCache_();
      return json_({ ok: true, data: { message: "Hojas listas" } });
    }

    return json_({ ok: false, error: "Acción POST no soportada: " + body.action });
  } catch (error) {
    return json_({ ok: false, error: errorMessage_(error) });
  } finally {
    try {
      lock.releaseLock();
    } catch (ignored) {}
  }
}

function readTable_(tableConfig) {
  var sheets = tableSheets_(tableConfig);
  var rows = [];

  sheets.forEach(function(sheet) {
    var headers = getHeaders_(sheet, tableConfig.headers);
    var lastRow = sheet.getLastRow();
    if (lastRow < 2) return;

    var values = sheet.getRange(2, 1, lastRow - 1, headers.length).getValues();
    values.forEach(function(row) {
      if (!row.some(function(cell) { return String(cell).trim() !== ""; })) return;
      var item = {};
      headers.forEach(function(header, index) {
        item[header] = row[index];
      });
      rows.push(item);
    });
  });

  return rows;
}

function upsert_(tableConfig, item) {
  var found = findRowInAllSheets_(tableConfig, item[tableConfig.idKey]);
  var sheet = found.sheet || writableSheet_(tableConfig);
  var headers = getHeaders_(sheet, tableConfig.headers);
  var values = headers.map(function(header) {
    return item.hasOwnProperty(header) ? item[header] : "";
  });

  if (found.rowIndex > 0) {
    sheet.getRange(found.rowIndex, 1, 1, headers.length).setValues([values]);
  } else {
    sheet.appendRow(values);
  }
}

function appendNew_(tableConfig, item) {
  var sheet = writableSheet_(tableConfig);
  var headers = getHeaders_(sheet, tableConfig.headers);
  var values = headers.map(function(header) {
    return item.hasOwnProperty(header) ? item[header] : "";
  });
  sheet.appendRow(values);
}

function deleteOrDeactivate_(tableConfig, id, hardDelete) {
  var found = findRowInAllSheets_(tableConfig, id);
  if (!found.sheet || found.rowIndex < 1) throw new Error("No existe el registro: " + id);

  if (hardDelete) {
    found.sheet.deleteRow(found.rowIndex);
    return;
  }

  var headers = getHeaders_(found.sheet, tableConfig.headers);
  var activeColumn = headers.indexOf("activo") + 1;
  if (activeColumn < 1) throw new Error("Falta la columna activo");
  found.sheet.getRange(found.rowIndex, activeColumn).setValue(false);
}

function ensureSheet_(tableConfig, sheetName) {
  var spreadsheet = spreadsheet_();
  var targetName = sheetName || tableConfig.sheetName;
  var sheet = spreadsheet.getSheetByName(targetName);

  if (!sheet) {
    sheet = spreadsheet.insertSheet(targetName);
  }

  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, tableConfig.headers.length).setValues([tableConfig.headers]);
    sheet.setFrozenRows(1);
    return sheet;
  }

  var headers = getHeaders_(sheet, tableConfig.headers);
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.setFrozenRows(1);

  return sheet;
}

function writableSheet_(tableConfig) {
  var baseSheet = ensureSheet_(tableConfig);
  if (baseSheet.getLastRow() < MAX_ROWS_PER_SHEET) return baseSheet;

  var spreadsheet = spreadsheet_();
  var index = 2;
  var sheet;
  do {
    sheet = spreadsheet.getSheetByName(tableConfig.sheetName + "_" + index);
    if (!sheet) return ensureSheet_(tableConfig, tableConfig.sheetName + "_" + index);
    if (sheet.getLastRow() < MAX_ROWS_PER_SHEET) return ensureSheet_(tableConfig, sheet.getName());
    index += 1;
  } while (index < 100);

  throw new Error("No se pudo crear hoja continuacion para " + tableConfig.sheetName);
}

function tableSheets_(tableConfig) {
  var spreadsheet = spreadsheet_();
  var base = ensureSheet_(tableConfig);
  var prefix = tableConfig.sheetName + "_";
  var sheets = spreadsheet.getSheets().filter(function(sheet) {
    return sheet.getName() === tableConfig.sheetName || sheet.getName().indexOf(prefix) === 0;
  });
  if (!sheets.length) sheets = [base];
  return sheets.sort(function(a, b) {
    return a.getName().localeCompare(b.getName(), "es", { numeric: true });
  });
}

function findRowInAllSheets_(tableConfig, idValue) {
  var sheets = tableSheets_(tableConfig);
  for (var i = 0; i < sheets.length; i++) {
    var sheet = sheets[i];
    var headers = getHeaders_(sheet, tableConfig.headers);
    var rowIndex = findRow_(sheet, headers, tableConfig.idKey, idValue);
    if (rowIndex > 0) return { sheet: sheet, rowIndex: rowIndex };
  }
  return { sheet: null, rowIndex: -1 };
}

function getHeaders_(sheet, requiredHeaders) {
  var width = Math.max(sheet.getLastColumn(), requiredHeaders.length);
  var currentHeaders = sheet
    .getRange(1, 1, 1, width)
    .getValues()[0]
    .map(function(header) { return String(header).trim(); })
    .filter(function(header) { return header !== ""; });

  requiredHeaders.forEach(function(header) {
    if (currentHeaders.indexOf(header) === -1) currentHeaders.push(header);
  });

  return currentHeaders;
}

function findRow_(sheet, headers, idKey, idValue) {
  var idColumn = headers.indexOf(idKey) + 1;
  if (idColumn < 1) throw new Error("Falta la columna " + idKey);

  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return -1;

  var values = sheet.getRange(2, idColumn, lastRow - 1, 1).getValues();
  var needle = String(idValue).trim();

  for (var i = 0; i < values.length; i++) {
    if (String(values[i][0]).trim() === needle) return i + 2;
  }

  return -1;
}

function normalizeProduct_(product) {
  return {
    producto_id: clean_(product.producto_id || product.id || makeId_("prod")),
    categoria_id: slug_(product.categoria_id || product.category || "general"),
    nombre: required_(product.nombre || product.title, "nombre"),
    precio: number_(product.precio || product.price),
    descripcion: clean_(product.descripcion || product.desc),
    imagen: clean_(product.imagen || product.image),
    opciones: options_(product.opciones || product.options || product.sizes),
    orden: number_(product.orden),
    activo: bool_(product.activo)
  };
}

function options_(value) {
  if (!value) return "";

  if (Array.isArray(value)) {
    return JSON.stringify(value.map(function(option, index) {
      return {
        id: clean_(option.id || option.option_id || "opcion-" + (index + 1)),
        label: clean_(option.label || option.nombre || option.name || "Opcion " + (index + 1)),
        price: number_(option.price || option.precio),
        image: clean_(option.image || option.imagen)
      };
    }));
  }

  var text = clean_(value);
  if (!text) return "";

  try {
    var parsed = JSON.parse(text);
    return Array.isArray(parsed) ? options_(parsed) : "";
  } catch (ignored) {
    return text;
  }
}

function normalizeExtra_(extra) {
  return {
    extra_id: clean_(extra.extra_id || extra.id || makeId_("extra")),
    nombre: required_(extra.nombre || extra.name, "nombre"),
    precio: number_(extra.precio || extra.price),
    orden: number_(extra.orden),
    activo: bool_(extra.activo)
  };
}

function normalizeOrder_(order) {
  var now = new Date();
  var items = order.items || [];
  var itemsText = Array.isArray(items) ? JSON.stringify(items) : clean_(items);

  return {
    order_id: clean_(order.order_id || makeId_("ord")),
    order_number: number_(order.order_number),
    fecha: clean_(order.fecha || now.toISOString()),
    cliente: required_(order.cliente || order.name, "cliente"),
    telefono: required_(order.telefono || order.phone, "telefono"),
    metodo: clean_(order.metodo || order.method || "recoger"),
    direccion: clean_(order.direccion || order.address),
    pago: clean_(order.pago || order.payment),
    subtotal: number_(order.subtotal),
    domicilio: number_(order.domicilio || order.delivery),
    total: number_(order.total),
    estado: clean_(order.estado || "nuevo"),
    notas: clean_(order.notas || order.notes),
    items: itemsText
  };
}

function normalizeTable_(table) {
  var items = table.items || [];
  var itemsText = Array.isArray(items) ? JSON.stringify(items) : clean_(items || "[]");
  return {
    table_id: clean_(table.table_id || makeId_("mesa")),
    nombre: required_(table.nombre || table.table_name, "nombre mesa"),
    estado: clean_(table.estado || "abierta"),
    fecha_apertura: clean_(table.fecha_apertura || table.fecha || new Date().toISOString()),
    fecha_cierre: clean_(table.fecha_cierre),
    cajero: clean_(table.cajero || "Caja principal"),
    items: itemsText,
    total: number_(table.total || tableTotalFromItems_(itemsText))
  };
}

function normalizePayment_(payment) {
  var items = payment.items || [];
  var itemsText = Array.isArray(items) ? JSON.stringify(items) : clean_(items || "[]");
  return {
    payment_id: clean_(payment.payment_id || makeId_("pay")),
    table_id: clean_(payment.table_id),
    table_name: clean_(payment.table_name),
    origen: clean_(payment.origen || payment.table_name || "Mesa"),
    fecha: clean_(payment.fecha || new Date().toISOString()),
    cajero: clean_(payment.cajero || "Caja principal"),
    metodo: clean_(payment.metodo || payment.metodo_principal || "Efectivo"),
    metodo_principal: clean_(payment.metodo_principal || payment.metodo || "Efectivo"),
    metodo_uno: clean_(payment.metodo_uno),
    valor_uno: number_(payment.valor_uno),
    metodo_dos: clean_(payment.metodo_dos),
    valor_dos: number_(payment.valor_dos),
    total: number_(payment.total),
    estado: clean_(payment.estado || "pagado"),
    notas: clean_(payment.notas),
    items: itemsText
  };
}

function normalizeInventory_(item) {
  return {
    inventory_id: clean_(item.inventory_id || makeId_("inv")),
    nombre: required_(item.nombre || item.name, "nombre"),
    categoria: clean_(item.categoria || "General"),
    cantidad: number_(item.cantidad),
    unidad: clean_(item.unidad || "unidades"),
    costo: number_(item.costo),
    minimo: number_(item.minimo),
    activo: bool_(item.activo),
    actualizado: clean_(item.actualizado || new Date().toISOString())
  };
}

function normalizeInventoryMovement_(movement) {
  return {
    movement_id: clean_(movement.movement_id || makeId_("mov")),
    inventory_id: clean_(movement.inventory_id),
    nombre: clean_(movement.nombre || "Insumo"),
    cantidad: number_(movement.cantidad),
    unidad: clean_(movement.unidad),
    tipo: clean_(movement.tipo || "retiro"),
    fecha: clean_(movement.fecha || new Date().toISOString()),
    usuario: clean_(movement.usuario || movement.cajero || "Usuario")
  };
}

function normalizeCashier_(cashier) {
  return {
    cashier_id: clean_(cashier.cashier_id || makeId_("cash")),
    nombre: required_(cashier.nombre || cashier.name, "nombre"),
    correo: clean_(cashier.correo || cashier.email).toLowerCase(),
    clave: clean_(cashier.clave || cashier.password || cashier.pin),
    rol: clean_(cashier.rol || "cajero").toLowerCase(),
    activo: bool_(cashier.activo),
    ultimo_acceso: clean_(cashier.ultimo_acceso)
  };
}

function updateOrderStatus_(orderId, status) {
  var found = findRowInAllSheets_(CONFIG.orders, orderId);
  if (!found.sheet || found.rowIndex < 1) throw new Error("No existe la orden: " + orderId);

  var headers = getHeaders_(found.sheet, CONFIG.orders.headers);
  var statusColumn = headers.indexOf("estado") + 1;
  if (statusColumn < 1) throw new Error("Falta la columna estado");
  found.sheet.getRange(found.rowIndex, statusColumn).setValue(status);

  var row = found.sheet.getRange(found.rowIndex, 1, 1, headers.length).getValues()[0];
  var output = {};
  headers.forEach(function(header, index) {
    output[header] = row[index];
  });
  return output;
}

function updateOrdersStatusBatch_(orderIds, status) {
  var requested = {};
  orderIds.forEach(function(orderId) {
    var id = clean_(orderId);
    if (id) requested[id] = true;
  });
  var requestedIds = Object.keys(requested);
  if (!requestedIds.length) throw new Error("Selecciona al menos una orden.");

  var updated = [];
  tableSheets_(CONFIG.orders).forEach(function(sheet) {
    var headers = getHeaders_(sheet, CONFIG.orders.headers);
    var idColumn = headers.indexOf("order_id") + 1;
    var statusColumn = headers.indexOf("estado") + 1;
    var lastRow = sheet.getLastRow();
    if (lastRow < 2 || idColumn < 1 || statusColumn < 1) return;
    var rowCount = lastRow - 1;
    var ids = sheet.getRange(2, idColumn, rowCount, 1).getValues();
    var statuses = sheet.getRange(2, statusColumn, rowCount, 1).getValues();
    var changed = false;
    ids.forEach(function(row, index) {
      var id = clean_(row[0]);
      if (!requested[id]) return;
      statuses[index][0] = clean_(status);
      updated.push(id);
      changed = true;
    });
    if (changed) sheet.getRange(2, statusColumn, rowCount, 1).setValues(statuses);
  });

  return {
    updated_ids: updated,
    missing_ids: requestedIds.filter(function(id) { return updated.indexOf(id) === -1; })
  };
}

function nextOrderNumber_() {
  var orders = readTable_(CONFIG.orders);
  var maxNumber = orders.reduce(function(max, order) {
    return Math.max(max, number_(order.order_number));
  }, 0);
  return Math.max(maxNumber, orders.length) + 1;
}

function nextOrderNumberFast_() {
  var properties = PropertiesService.getScriptProperties();
  var stored = number_(properties.getProperty(ORDER_NUMBER_PROPERTY));
  if (!stored) stored = nextOrderNumber_() - 1;
  var next = stored + 1;
  properties.setProperty(ORDER_NUMBER_PROPERTY, String(next));
  return next;
}

function readOrders_() {
  return readTable_(CONFIG.orders).map(normalizeOrderForOutput_).sort(function(a, b) {
    return number_(a.order_number) - number_(b.order_number) || new Date(a.fecha).getTime() - new Date(b.fecha).getTime();
  });
}

function buildAdminData_() {
  var products = readTable_(CONFIG.productos).map(normalizeProduct_).sort(sortByOrder_);
  var extras = readTable_(CONFIG.extras).map(normalizeExtra_).sort(sortByOrder_);
  var orders = readOrders_();
  var tables = readTable_(CONFIG.tables).map(normalizeTable_);
  var payments = readTable_(CONFIG.payments).map(normalizePayment_).sort(function(a, b) {
    return new Date(b.fecha).getTime() - new Date(a.fecha).getTime();
  });
  var inventory = readTable_(CONFIG.inventory).map(normalizeInventory_);
  var inventoryMovements = readTable_(CONFIG.inventoryMovements).map(normalizeInventoryMovement_).sort(function(a, b) {
    return new Date(b.fecha).getTime() - new Date(a.fecha).getTime();
  }).slice(0, 200);
  var cashiers = readTable_(CONFIG.cashiers).map(normalizeCashier_);

  var todayKey = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd");
  var todayOrders = orders.filter(function(order) {
    if (!order.fecha) return false;
    return Utilities.formatDate(new Date(order.fecha), Session.getScriptTimeZone(), "yyyy-MM-dd") === todayKey;
  });
  var todayPayments = payments.filter(function(payment) {
    if (!payment.fecha) return false;
    return Utilities.formatDate(new Date(payment.fecha), Session.getScriptTimeZone(), "yyyy-MM-dd") === todayKey;
  });

  var ordersRevenue = orders.reduce(function(sum, order) { return sum + number_(order.total); }, 0);
  var paymentsRevenue = payments.reduce(function(sum, payment) { return sum + number_(payment.total); }, 0);
  var revenue = ordersRevenue + paymentsRevenue;
  var todayRevenue = todayOrders.reduce(function(sum, order) { return sum + number_(order.total); }, 0) +
    todayPayments.reduce(function(sum, payment) { return sum + number_(payment.total); }, 0);
  var pending = orders.filter(function(order) {
    return ["nuevo", "pendiente", "confirmado", "en cocina", "preparando"].indexOf(clean_(order.estado).toLowerCase()) !== -1;
  }).length;

  return {
    products: products,
    extras: extras,
    orders: orders,
    tables: tables,
    payments: payments,
    inventory: inventory,
    inventoryMovements: inventoryMovements,
    cashiers: cashiers,
    kpis: {
      products: products.length,
      activeProducts: products.filter(function(product) { return product.activo; }).length,
      orders: orders.length,
      todayOrders: todayOrders.length,
      revenue: revenue,
      todayRevenue: todayRevenue,
      pending: pending,
      averageTicket: orders.length ? Math.round(ordersRevenue / orders.length) : 0,
      tableRevenue: paymentsRevenue,
      openTables: tables.length
    },
    updatedAt: new Date().toISOString()
  };
}

function normalizeOrderForOutput_(order) {
  return {
    order_id: clean_(order.order_id),
    order_number: number_(order.order_number),
    fecha: clean_(order.fecha),
    cliente: clean_(order.cliente),
    telefono: clean_(order.telefono),
    metodo: clean_(order.metodo),
    direccion: clean_(order.direccion),
    pago: clean_(order.pago),
    subtotal: number_(order.subtotal),
    domicilio: number_(order.domicilio),
    total: number_(order.total),
    estado: clean_(order.estado || "nuevo"),
    notas: clean_(order.notas),
    items: clean_(order.items)
  };
}

function tableTotalFromItems_(itemsText) {
  try {
    var items = JSON.parse(itemsText || "[]");
    if (!Array.isArray(items)) return 0;
    return items.reduce(function(sum, item) {
      return sum + number_(item.precio) * Math.max(1, number_(item.qty));
    }, 0);
  } catch (ignored) {
    return 0;
  }
}

function parseBody_(e) {
  if (!e || !e.postData || !e.postData.contents) return {};
  var raw = e.postData.contents;

  try {
    return JSON.parse(raw);
  } catch (ignored) {
    var data = {};
    raw.split("&").forEach(function(pair) {
      var parts = pair.split("=");
      var key = decodeURIComponent(parts[0] || "");
      var value = decodeURIComponent(parts.slice(1).join("=") || "");
      if (key) data[key] = value;
    });
    return data;
  }
}

function hasBoss_() {
  return readTable_(CONFIG.cashiers).some(function(row) {
    var cashier = normalizeCashierForAuth_(row);
    return cashier.activo && cashier.correo && cashier.clave && isBossRole_(cashier.rol);
  });
}

function loginStaff_(correo, clave) {
  var email = clean_(correo).toLowerCase();
  var password = clean_(clave);
  if (!email || !password) throw new Error("Escribe el correo y la contraseña.");

  var cashiers = readTable_(CONFIG.cashiers).map(normalizeCashierForAuth_);
  var staff = cashiers.find(function(cashier) {
    return cashier.correo === email;
  });
  if (!staff) throw new Error("El correo no existe o no está registrado.");
  if (!staff.activo) throw new Error("Usuario inactivo. Pide a un jefe que active este acceso.");
  if (String(staff.clave) !== String(password)) throw new Error("Contraseña incorrecta.");

  staff.ultimo_acceso = new Date().toISOString();
  upsert_(CONFIG.cashiers, staff);
  return staff;
}

function validateCashierCredentials_(correo, clave) {
  if (!clean_(correo)) throw new Error("Falta el correo del usuario.");
  if (clean_(clave).length < 4) throw new Error("La contraseña debe tener mínimo 4 caracteres.");
}

function validateSession_(token, requiredRole) {
  if (ADMIN_PASSWORD && String(token || "") === String(ADMIN_PASSWORD)) {
    return { cashier_id: "legacy-admin", nombre: "Administrador", correo: "", rol: "jefe", activo: true };
  }

  var user = verifySessionToken_(token);
  if (!user || !user.activo) throw new Error("Sesión inválida. Vuelve a iniciar sesión.");
  if (requiredRole && requiredRole === "jefe" && !isBossRole_(user.rol)) {
    throw new Error("Solo un jefe puede administrar usuarios.");
  }
  return user;
}

function sessionToken_(cashier) {
  var issuedAt = Date.now();
  var payload = [cashier.cashier_id, issuedAt].join(":");
  return payload + ":" + sign_(payload);
}

function verifySessionToken_(token) {
  var parts = clean_(token).split(":");
  if (parts.length !== 3) return null;
  var payload = parts[0] + ":" + parts[1];
  if (sign_(payload) !== parts[2]) return null;
  if (Date.now() - number_(parts[1]) > 1000 * 60 * 60 * 18) throw new Error("Sesión vencida. Vuelve a iniciar sesión.");

  var userId = parts[0];
  return readTable_(CONFIG.cashiers)
    .map(normalizeCashierForAuth_)
    .find(function(cashier) { return cashier.cashier_id === userId; }) || null;
}

function sign_(value) {
  var secret = String(ADMIN_PASSWORD || ADMIN_TOKEN || "chanchos");
  var bytes = Utilities.computeHmacSha256Signature(value, secret);
  return Utilities.base64EncodeWebSafe(bytes).replace(/=+$/g, "");
}

function normalizeCashierForAuth_(cashier) {
  return {
    cashier_id: clean_(cashier.cashier_id || makeId_("cash")),
    nombre: clean_(cashier.nombre || cashier.name || "Usuario"),
    correo: clean_(cashier.correo || cashier.email).toLowerCase(),
    clave: clean_(cashier.clave || cashier.password || cashier.pin),
    rol: clean_(cashier.rol || "cajero").toLowerCase(),
    activo: bool_(cashier.activo),
    ultimo_acceso: clean_(cashier.ultimo_acceso)
  };
}

function publicCashier_(cashier) {
  return {
    cashier_id: cashier.cashier_id,
    nombre: cashier.nombre,
    correo: cashier.correo,
    rol: cashier.rol,
    activo: cashier.activo,
    ultimo_acceso: cashier.ultimo_acceso
  };
}

function isBossRole_(role) {
  var value = clean_(role).toLowerCase();
  return value === "jefe" || value === "admin" || value === "administrador";
}

function spreadsheet_() {
  if (SPREADSHEET_ID) return SpreadsheetApp.openById(SPREADSHEET_ID);

  var activeSpreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  if (!activeSpreadsheet) throw new Error("No hay hoja activa. Coloca el ID de tu Google Sheet en SPREADSHEET_ID.");
  return activeSpreadsheet;
}

function json_(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}

function cachedPayload_(key, builder) {
  try {
    var cache = CacheService.getScriptCache();
    var cached = cache.get(key);
    if (cached) return JSON.parse(cached);

    var payload = builder();
    cache.put(key, JSON.stringify(payload), CACHE_SECONDS);
    return payload;
  } catch (error) {
    console.warn(error);
    return builder();
  }
}

function clearDataCache_() {
  try {
    CacheService.getScriptCache().removeAll([MENU_CACHE_KEY, ADMIN_CACHE_KEY]);
  } catch (error) {
    console.warn(error);
  }
}

function param_(e, key, fallback) {
  return e && e.parameter && e.parameter[key] ? String(e.parameter[key]) : fallback;
}

function sortByOrder_(a, b) {
  return number_(a.orden) - number_(b.orden) || clean_(a.nombre).localeCompare(clean_(b.nombre), "es");
}

function required_(value, label) {
  var output = clean_(value);
  if (!output) throw new Error("Falta el campo " + label);
  return output;
}

function clean_(value) {
  return String(value == null ? "" : value).trim();
}

function number_(value) {
  if (typeof value === "number" && isFinite(value)) return Math.max(0, Math.round(value));
  var parsed = Number(clean_(value).replace(/[^\d-]/g, ""));
  return isFinite(parsed) ? Math.max(0, Math.round(parsed)) : 0;
}

function bool_(value) {
  if (typeof value === "boolean") return value;
  var normalized = clean_(value || "true").toLowerCase();
  return ["false", "0", "no", "inactivo", "inactive", "archivado"].indexOf(normalized) === -1;
}

function slug_(value) {
  return clean_(value || "general")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "general";
}

function makeId_(prefix) {
  return prefix + "-" + Utilities.getUuid().toLowerCase();
}

function errorMessage_(error) {
  console.error(error);
  return error && error.message ? error.message : String(error);
}
