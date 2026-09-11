"use strict";

const crypto = require("node:crypto");
const { getDatabase } = require("firebase-admin/database");

const ECONOMY_SCHEMA_VERSION = 2;
const CURRENCIES = Object.freeze(["gold", "gems", "fragments"]);
const MAX_OPERATION_HISTORY = 160;

const XSOLLA_SANDBOX_CATALOG = Object.freeze({
  hallvalla_gems_1000: Object.freeze({
    type: "bundle",
    gems: 1000
  })
});

function cleanInt(value, fallback = 0) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.trunc(number);
}

function assertUid(uid) {
  const safe = String(uid || "").trim();
  if (!safe || safe.length > 160) throw new TypeError("UID inválido.");
  return safe;
}

function sanitizeOperationId(value) {
  const safe = String(value || "").trim();
  if (!/^[A-Za-z0-9:_-]{8,180}$/.test(safe)) {
    throw new TypeError("operationId inválido.");
  }
  return safe;
}

function sanitizeReason(value) {
  const safe = String(value || "").trim().slice(0, 80);
  if (!safe) throw new TypeError("reason es obligatorio.");
  return safe;
}

function sanitizeXsollaOrderId(value) {
  const safe = String(value ?? "").trim();
  if (!safe || safe.length > 180 || /[\u0000-\u001F\u007F]/.test(safe)) {
    throw new TypeError("orderId de Xsolla inválido.");
  }
  return safe;
}

function xsollaOrderKey(orderId) {
  const safeOrderId = sanitizeXsollaOrderId(orderId);
  return "o_" + crypto
    .createHash("sha256")
    .update(safeOrderId, "utf8")
    .digest("hex");
}

function normalizeWallet(raw) {
  const source = raw && typeof raw === "object" ? raw : {};
  return {
    gold: Math.max(0, cleanInt(source.gold, 0)),
    gems: Math.max(0, cleanInt(source.gems, 0)),
    fragments: Math.max(0, cleanInt(source.fragments, 0))
  };
}

function normalizeDelta(raw) {
  const source = raw && typeof raw === "object" ? raw : {};
  const delta = {};
  for (const key of CURRENCIES) {
    const amount = cleanInt(source[key], 0);
    if (amount !== 0) delta[key] = amount;
  }
  if (!Object.keys(delta).length) {
    throw new TypeError("La operación no cambia ninguna moneda.");
  }
  return delta;
}

function normalizeState(raw) {
  const source = raw && typeof raw === "object" ? raw : {};
  const operations =
    source.operations && typeof source.operations === "object"
      ? source.operations
      : {};
  const xsollaOrders =
    source.xsollaOrders && typeof source.xsollaOrders === "object"
      ? source.xsollaOrders
      : {};

  return {
    version: ECONOMY_SCHEMA_VERSION,
    wallet: normalizeWallet(source.wallet),
    operations: { ...operations },

    // IMPORTANTE:
    // Este registro NO se recorta con MAX_OPERATION_HISTORY.
    // Es la barrera permanente contra reusar un orderId de Xsolla.
    xsollaOrders: { ...xsollaOrders },

    updatedAt: Math.max(0, cleanInt(source.updatedAt, 0))
  };
}

function trimOperations(operations) {
  const entries = Object.entries(operations || {});
  if (entries.length <= MAX_OPERATION_HISTORY) return operations;
  entries.sort(
    (a, b) =>
      cleanInt(b[1]?.createdAt, 0) -
      cleanInt(a[1]?.createdAt, 0)
  );
  return Object.fromEntries(
    entries.slice(0, MAX_OPERATION_HISTORY)
  );
}

function recordRecentOperation(
  state,
  {
    operationId,
    reason,
    delta,
    now,
    metadata = null
  }
) {
  const safeOperationId = sanitizeOperationId(operationId);
  const safeReason = sanitizeReason(reason);
  const safeDelta = normalizeDelta(delta);

  state.operations[safeOperationId] = {
    createdAt: now,
    reason: safeReason,
    delta: safeDelta,
    walletAfter: { ...state.wallet },
    ...(metadata && typeof metadata === "object"
      ? { metadata }
      : {})
  };

  state.operations = trimOperations(state.operations);
}

function normalizeXsollaItems(rawItems) {
  if (!Array.isArray(rawItems) || rawItems.length !== 1) {
    throw new TypeError(
      "El pedido sandbox de Xsolla debe contener exactamente un artículo."
    );
  }

  return rawItems.map(item => {
    const sku = String(item?.sku || "").trim();
    const type = String(item?.type || "").trim();
    const quantity = cleanInt(item?.quantity, 0);

    if (!sku || !type) {
      throw new TypeError("Artículo de Xsolla inválido.");
    }

    if (quantity !== 1) {
      throw new TypeError(
        "La integración sandbox actual solo permite quantity=1."
      );
    }

    return { sku, type, quantity };
  });
}

function resolveXsollaSandboxGrant(rawItems) {
  const items = normalizeXsollaItems(rawItems);
  const item = items[0];
  const definition = XSOLLA_SANDBOX_CATALOG[item.sku];

  if (!definition) {
    throw new TypeError("SKU de Xsolla no autorizado.");
  }

  if (item.type !== definition.type) {
    throw new TypeError("Tipo de artículo de Xsolla no autorizado.");
  }

  return {
    items,
    sku: item.sku,
    quantity: item.quantity,
    gems: definition.gems
  };
}

async function ensureWallet(uid) {
  const safeUid = assertUid(uid);
  const ref = getDatabase().ref(`economy/${safeUid}`);
  const now = Date.now();

  const result = await ref.transaction(
    current => {
      if (
        current &&
        typeof current === "object" &&
        current.wallet
      ) {
        const normalized = normalizeState(current);
        const alreadyV2 =
          cleanInt(current.version, 0) ===
            ECONOMY_SCHEMA_VERSION &&
          current.xsollaOrders &&
          typeof current.xsollaOrders === "object";

        if (alreadyV2) return;
        return normalized;
      }

      return {
        version: ECONOMY_SCHEMA_VERSION,
        wallet: {
          gold: 0,
          gems: 0,
          fragments: 0
        },
        operations: {},
        xsollaOrders: {},
        updatedAt: now
      };
    },
    undefined,
    false
  );

  if (!result.committed) {
    const snapshot = await ref.get();
    return normalizeState(snapshot.val());
  }

  return normalizeState(result.snapshot.val());
}

async function readEconomyState(uid) {
  const safeUid = assertUid(uid);
  const snapshot = await getDatabase()
    .ref(`economy/${safeUid}`)
    .get();

  if (!snapshot.exists()) return null;
  return normalizeState(snapshot.val());
}

async function applyWalletMutation({
  uid,
  operationId,
  reason,
  delta,
  metadata = null
}) {
  const safeUid = assertUid(uid);
  const safeOperationId =
    sanitizeOperationId(operationId);
  const safeReason = sanitizeReason(reason);
  const safeDelta = normalizeDelta(delta);

  const ref = getDatabase().ref(
    `economy/${safeUid}`
  );

  const now = Date.now();
  let insufficientCurrency = "";

  const result = await ref.transaction(
    current => {
      const state = normalizeState(current);

      if (state.operations[safeOperationId]) {
        return state;
      }

      const nextWallet = { ...state.wallet };

      for (
        const [currency, amount]
        of Object.entries(safeDelta)
      ) {
        const nextValue =
          cleanInt(nextWallet[currency], 0) +
          amount;

        if (nextValue < 0) {
          insufficientCurrency = currency;
          return;
        }

        nextWallet[currency] = nextValue;
      }

      state.wallet = nextWallet;
      state.operations[safeOperationId] = {
        createdAt: now,
        reason: safeReason,
        delta: safeDelta,
        walletAfter: nextWallet,
        ...(metadata &&
        typeof metadata === "object"
          ? { metadata }
          : {})
      };

      state.operations =
        trimOperations(state.operations);

      state.updatedAt = now;
      return state;
    },
    undefined,
    false
  );

  if (!result.committed) {
    if (insufficientCurrency) {
      const error = new Error(
        `Saldo insuficiente: ${insufficientCurrency}.`
      );
      error.code = "INSUFFICIENT_FUNDS";
      throw error;
    }

    throw new Error(
      "La transacción de economía no pudo confirmarse."
    );
  }

  const state =
    normalizeState(result.snapshot.val());

  return {
    wallet: state.wallet,
    operation:
      state.operations[safeOperationId] ||
      null
  };
}

/**
 * Aplica un order_paid SANDBOX de Xsolla directamente sobre la
 * economía autoritativa.
 *
 * No existe modo producción aquí.
 * El catálogo se decide en servidor; el caller NO envía la cantidad
 * de gemas que quiere recibir.
 */
async function applyXsollaSandboxPaid({
  uid,
  orderId,
  items
}) {
  const safeUid = assertUid(uid);
  const safeOrderId =
    sanitizeXsollaOrderId(orderId);
  const orderKey =
    xsollaOrderKey(safeOrderId);
  const grant =
    resolveXsollaSandboxGrant(items);

  const ref = getDatabase().ref(
    `economy/${safeUid}`
  );

  const mutationId = crypto.randomUUID();
  const now = Date.now();

  const result = await ref.transaction(
    current => {
      const state = normalizeState(current);
      const existing =
        state.xsollaOrders[orderKey];

      if (existing) {
        return state;
      }

      state.wallet = {
        ...state.wallet,
        gems:
          cleanInt(state.wallet.gems, 0) +
          grant.gems
      };

      state.xsollaOrders[orderKey] = {
        provider: "xsolla",
        environment: "sandbox",
        status: "paid",
        sku: grant.sku,
        quantity: grant.quantity,
        creditedGems: grant.gems,
        paidAt: now,
        canceledAt: 0,
        createdByMutationId: mutationId,
        updatedAt: now
      };

      recordRecentOperation(state, {
        operationId:
          `xsolla:paid:${orderKey}`,
        reason: "xsolla_sandbox_paid",
        delta: { gems: grant.gems },
        now,
        metadata: {
          provider: "xsolla",
          environment: "sandbox",
          orderKey,
          sku: grant.sku
        }
      });

      state.updatedAt = now;
      return state;
    },
    undefined,
    false
  );

  if (!result.committed) {
    throw new Error(
      "No se pudo confirmar el pago sandbox de Xsolla."
    );
  }

  const state =
    normalizeState(result.snapshot.val());

  const order =
    state.xsollaOrders[orderKey];

  if (!order) {
    throw new Error(
      "El pedido sandbox no quedó registrado."
    );
  }

  const applied =
    order.createdByMutationId === mutationId;

  return {
    applied,
    reason: applied
      ? "first_paid"
      : order.status === "canceled"
        ? "already_canceled"
        : "duplicate_paid",
    status: order.status,
    wallet: state.wallet,
    orderKey
  };
}

/**
 * Aplica un order_canceled SANDBOX de Xsolla.
 *
 * Si el pago nunca llegó, crea un tombstone "canceled" para que un
 * order_paid tardío jamás acredite gemas.
 *
 * Si el usuario ya gastó parte de las gemas acreditadas, NO se
 * perdona silenciosamente la diferencia. Se devuelve un error.
 * La política definitiva de deuda/bloqueo se diseñará antes de
 * habilitar pagos reales.
 */
async function applyXsollaSandboxCanceled({
  uid,
  orderId,
  items
}) {
  const safeUid = assertUid(uid);
  const safeOrderId =
    sanitizeXsollaOrderId(orderId);
  const orderKey =
    xsollaOrderKey(safeOrderId);
  const grant =
    resolveXsollaSandboxGrant(items);

  const ref = getDatabase().ref(
    `economy/${safeUid}`
  );

  const mutationId = crypto.randomUUID();
  const now = Date.now();
  let insufficientGems = false;

  const result = await ref.transaction(
    current => {
      const state = normalizeState(current);
      const existing =
        state.xsollaOrders[orderKey];

      if (existing?.status === "canceled") {
        return state;
      }

      if (existing?.status === "paid") {
        const creditedGems = Math.max(
          0,
          cleanInt(existing.creditedGems, 0)
        );

        if (
          cleanInt(state.wallet.gems, 0) <
          creditedGems
        ) {
          insufficientGems = true;
          return;
        }

        state.wallet = {
          ...state.wallet,
          gems:
            cleanInt(state.wallet.gems, 0) -
            creditedGems
        };

        existing.status = "canceled";
        existing.canceledAt = now;
        existing.cancelMutationId =
          mutationId;
        existing.updatedAt = now;

        recordRecentOperation(state, {
          operationId:
            `xsolla:cancel:${orderKey}`,
          reason:
            "xsolla_sandbox_canceled",
          delta: {
            gems: -creditedGems
          },
          now,
          metadata: {
            provider: "xsolla",
            environment: "sandbox",
            orderKey,
            sku: existing.sku
          }
        });

        state.updatedAt = now;
        return state;
      }

      // Cancelación recibida antes que el pago:
      // el tombstone es permanente y bloqueará un paid tardío.
      state.xsollaOrders[orderKey] = {
        provider: "xsolla",
        environment: "sandbox",
        status: "canceled",
        sku: grant.sku,
        quantity: grant.quantity,
        creditedGems: 0,
        expectedGems: grant.gems,
        paidAt: 0,
        canceledAt: now,
        createdByCancelMutationId:
          mutationId,
        updatedAt: now
      };

      state.updatedAt = now;
      return state;
    },
    undefined,
    false
  );

  if (!result.committed) {
    if (insufficientGems) {
      const error = new Error(
        "No hay suficientes gemas autoritativas para revertir el pedido sandbox."
      );
      error.code =
        "XSOLLA_REVERSAL_INSUFFICIENT_GEMS";
      throw error;
    }

    throw new Error(
      "No se pudo confirmar la cancelación sandbox de Xsolla."
    );
  }

  const state =
    normalizeState(result.snapshot.val());

  const order =
    state.xsollaOrders[orderKey];

  if (!order) {
    throw new Error(
      "La cancelación sandbox no quedó registrada."
    );
  }

  const reversedPaid =
    order.cancelMutationId === mutationId;

  const canceledBeforePaid =
    order.createdByCancelMutationId ===
    mutationId;

  const applied =
    reversedPaid || canceledBeforePaid;

  return {
    applied,
    reason: reversedPaid
      ? "reversed_paid"
      : canceledBeforePaid
        ? "cancel_before_paid"
        : "duplicate_cancel",
    status: order.status,
    wallet: state.wallet,
    orderKey
  };
}

module.exports = {
  ECONOMY_SCHEMA_VERSION,
  ensureWallet,
  readEconomyState,
  applyWalletMutation,
  applyXsollaSandboxPaid,
  applyXsollaSandboxCanceled
};
