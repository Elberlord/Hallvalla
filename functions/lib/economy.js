"use strict";

const { getDatabase } = require("firebase-admin/database");

const ECONOMY_SCHEMA_VERSION = 1;
const CURRENCIES = Object.freeze(["gold", "gems", "fragments"]);
const MAX_OPERATION_HISTORY = 160;

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
  if (!Object.keys(delta).length) throw new TypeError("La operación no cambia ninguna moneda.");
  return delta;
}

function normalizeState(raw) {
  const source = raw && typeof raw === "object" ? raw : {};
  const operations = source.operations && typeof source.operations === "object" ? source.operations : {};
  return {
    version: ECONOMY_SCHEMA_VERSION,
    wallet: normalizeWallet(source.wallet),
    operations: { ...operations },
    updatedAt: Math.max(0, cleanInt(source.updatedAt, 0))
  };
}

function trimOperations(operations) {
  const entries = Object.entries(operations || {});
  if (entries.length <= MAX_OPERATION_HISTORY) return operations;
  entries.sort((a, b) => cleanInt(b[1]?.createdAt, 0) - cleanInt(a[1]?.createdAt, 0));
  return Object.fromEntries(entries.slice(0, MAX_OPERATION_HISTORY));
}

async function ensureWallet(uid) {
  const safeUid = assertUid(uid);
  const ref = getDatabase().ref(`economy/${safeUid}`);
  const now = Date.now();
  const result = await ref.transaction(current => {
    if (current && typeof current === "object" && current.wallet) return;
    return {
      version: ECONOMY_SCHEMA_VERSION,
      wallet: { gold: 0, gems: 0, fragments: 0 },
      operations: {},
      updatedAt: now
    };
  }, undefined, false);

  if (!result.committed) {
    const snapshot = await ref.get();
    return normalizeState(snapshot.val());
  }
  return normalizeState(result.snapshot.val());
}

async function readEconomyState(uid) {
  const safeUid = assertUid(uid);
  const snapshot = await getDatabase().ref(`economy/${safeUid}`).get();
  if (!snapshot.exists()) return null;
  return normalizeState(snapshot.val());
}

async function applyWalletMutation({ uid, operationId, reason, delta, metadata = null }) {
  const safeUid = assertUid(uid);
  const safeOperationId = sanitizeOperationId(operationId);
  const safeReason = sanitizeReason(reason);
  const safeDelta = normalizeDelta(delta);
  const ref = getDatabase().ref(`economy/${safeUid}`);
  const now = Date.now();

  let insufficientCurrency = "";
  const result = await ref.transaction(current => {
    const state = normalizeState(current);

    if (state.operations[safeOperationId]) {
      return state; // idempotencia: una misma operación jamás se cobra/acredita dos veces.
    }

    const nextWallet = { ...state.wallet };
    for (const [currency, amount] of Object.entries(safeDelta)) {
      const nextValue = cleanInt(nextWallet[currency], 0) + amount;
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
      ...(metadata && typeof metadata === "object" ? { metadata } : {})
    };
    state.operations = trimOperations(state.operations);
    state.updatedAt = now;
    return state;
  }, undefined, false);

  if (!result.committed) {
    if (insufficientCurrency) {
      const error = new Error(`Saldo insuficiente: ${insufficientCurrency}.`);
      error.code = "INSUFFICIENT_FUNDS";
      throw error;
    }
    throw new Error("La transacción de economía no pudo confirmarse.");
  }

  const state = normalizeState(result.snapshot.val());
  return {
    wallet: state.wallet,
    operation: state.operations[safeOperationId] || null
  };
}

module.exports = {
  ECONOMY_SCHEMA_VERSION,
  ensureWallet,
  readEconomyState,
  applyWalletMutation
};
