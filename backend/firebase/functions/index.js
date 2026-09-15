"use strict";

const { initializeApp } = require("firebase-admin/app");
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { logger } = require("firebase-functions");
const {
  ensureWallet,
  readEconomyState,
  applyWalletMutation
} = require("./lib/economy");

initializeApp();

const CALLABLE_OPTIONS = Object.freeze({
  region: "us-central1",
  maxInstances: 20,
  timeoutSeconds: 30,
  memory: "256MiB"
});

function requireAuth(request) {
  const uid = String(request?.auth?.uid || "").trim();
  if (!uid) throw new HttpsError("unauthenticated", "Debes iniciar sesión para usar la economía.");
  return uid;
}

function requireAdmin(request) {
  const uid = requireAuth(request);
  if (request?.auth?.token?.admin !== true) {
    throw new HttpsError("permission-denied", "Esta operación requiere privilegios de administrador.");
  }
  return uid;
}

/**
 * Crea una cartera vacía si aún no existe.
 * IMPORTANTE: el cliente no puede indicar saldos iniciales.
 */
exports.economyEnsureWallet = onCall(CALLABLE_OPTIONS, async request => {
  const uid = requireAuth(request);
  const state = await ensureWallet(uid);
  return { ok: true, version: state.version, wallet: state.wallet, updatedAt: state.updatedAt };
});

/**
 * Devuelve el saldo autoritativo del usuario autenticado.
 */
exports.economyGetWallet = onCall(CALLABLE_OPTIONS, async request => {
  const uid = requireAuth(request);
  const state = await readEconomyState(uid);
  if (!state) return { ok: true, initialized: false, wallet: null };
  return { ok: true, initialized: true, version: state.version, wallet: state.wallet, updatedAt: state.updatedAt };
});

/**
 * Herramienta administrativa para migraciones/correcciones controladas.
 * NO existe ningún endpoint público que acepte del jugador un delta arbitrario.
 * Para usarla, la cuenta debe tener el custom claim { admin: true }.
 */
exports.economyAdminAdjustWallet = onCall(CALLABLE_OPTIONS, async request => {
  const adminUid = requireAdmin(request);
  const targetUid = String(request?.data?.uid || "").trim();
  const operationId = String(request?.data?.operationId || "").trim();
  const reason = String(request?.data?.reason || "admin_adjustment").trim();
  const delta = request?.data?.delta;

  if (!targetUid) throw new HttpsError("invalid-argument", "uid es obligatorio.");

  try {
    const result = await applyWalletMutation({
      uid: targetUid,
      operationId,
      reason,
      delta,
      metadata: { adminUid }
    });
    logger.info("HallValla economy admin adjustment", { adminUid, targetUid, operationId, reason });
    return { ok: true, wallet: result.wallet };
  } catch (error) {
    if (error?.code === "INSUFFICIENT_FUNDS") {
      throw new HttpsError("failed-precondition", "La operación dejaría una moneda con saldo negativo.");
    }
    logger.error("HallValla economy admin adjustment failed", { adminUid, targetUid, operationId, error: String(error?.message || error) });
    throw new HttpsError("internal", "No se pudo aplicar el ajuste de economía.");
  }
});
