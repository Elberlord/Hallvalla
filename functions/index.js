"use strict";

const crypto = require("node:crypto");
const { initializeApp } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const {
  onCall,
  onRequest,
  HttpsError
} = require("firebase-functions/v2/https");
const {
  defineSecret
} = require("firebase-functions/params");
const { logger } = require("firebase-functions");

const {
  ensureWallet,
  readEconomyState,
  applyWalletMutation,
  applyXsollaSandboxPaid,
  applyXsollaSandboxCanceled
} = require("./lib/economy");

initializeApp();

const HALLVALLA_XSOLLA_BRIDGE_SECRET =
  defineSecret(
    "HALLVALLA_XSOLLA_BRIDGE_SECRET"
  );

const CALLABLE_OPTIONS = Object.freeze({
  region: "us-central1",
  maxInstances: 20,
  timeoutSeconds: 30,
  memory: "256MiB"
});

const XSOLLA_BRIDGE_OPTIONS = Object.freeze({
  region: "us-central1",
  maxInstances: 20,
  timeoutSeconds: 30,
  memory: "256MiB",
  secrets: [
    HALLVALLA_XSOLLA_BRIDGE_SECRET
  ]
});

function requireAuth(request) {
  const uid = String(
    request?.auth?.uid || ""
  ).trim();

  if (!uid) {
    throw new HttpsError(
      "unauthenticated",
      "Debes iniciar sesión para usar la economía."
    );
  }

  return uid;
}

function requireAdmin(request) {
  const uid = requireAuth(request);

  if (
    request?.auth?.token?.admin !== true
  ) {
    throw new HttpsError(
      "permission-denied",
      "Esta operación requiere privilegios de administrador."
    );
  }

  return uid;
}

function constantTimeEqualSecret(
  provided,
  expected
) {
  const left = Buffer.from(
    String(provided || ""),
    "utf8"
  );

  const right = Buffer.from(
    String(expected || ""),
    "utf8"
  );

  if (
    left.length === 0 ||
    left.length !== right.length
  ) {
    return false;
  }

  return crypto.timingSafeEqual(
    left,
    right
  );
}

function sendJson(
  response,
  status,
  body
) {
  response
    .status(status)
    .set(
      "Cache-Control",
      "no-store"
    )
    .json(body);
}

/**
 * Crea una cartera vacía si aún no existe.
 * IMPORTANTE: el cliente no puede indicar saldos iniciales.
 */
exports.economyEnsureWallet =
  onCall(
    CALLABLE_OPTIONS,
    async request => {
      const uid = requireAuth(request);
      const state =
        await ensureWallet(uid);

      return {
        ok: true,
        version: state.version,
        wallet: state.wallet,
        updatedAt: state.updatedAt
      };
    }
  );

/**
 * Devuelve el saldo autoritativo del usuario autenticado.
 */
exports.economyGetWallet =
  onCall(
    CALLABLE_OPTIONS,
    async request => {
      const uid = requireAuth(request);
      const state =
        await readEconomyState(uid);

      if (!state) {
        return {
          ok: true,
          initialized: false,
          wallet: null
        };
      }

      return {
        ok: true,
        initialized: true,
        version: state.version,
        wallet: state.wallet,
        updatedAt: state.updatedAt
      };
    }
  );

/**
 * Herramienta administrativa para migraciones/correcciones controladas.
 * NO existe ningún endpoint público que acepte del jugador un delta arbitrario.
 */
exports.economyAdminAdjustWallet =
  onCall(
    CALLABLE_OPTIONS,
    async request => {
      const adminUid =
        requireAdmin(request);

      const targetUid = String(
        request?.data?.uid || ""
      ).trim();

      const operationId = String(
        request?.data?.operationId || ""
      ).trim();

      const reason = String(
        request?.data?.reason ||
        "admin_adjustment"
      ).trim();

      const delta =
        request?.data?.delta;

      if (!targetUid) {
        throw new HttpsError(
          "invalid-argument",
          "uid es obligatorio."
        );
      }

      try {
        const result =
          await applyWalletMutation({
            uid: targetUid,
            operationId,
            reason,
            delta,
            metadata: {
              adminUid
            }
          });

        logger.info(
          "HallValla economy admin adjustment",
          {
            adminUid,
            targetUid,
            operationId,
            reason
          }
        );

        return {
          ok: true,
          wallet: result.wallet
        };
      } catch (error) {
        if (
          error?.code ===
          "INSUFFICIENT_FUNDS"
        ) {
          throw new HttpsError(
            "failed-precondition",
            "La operación dejaría una moneda con saldo negativo."
          );
        }

        logger.error(
          "HallValla economy admin adjustment failed",
          {
            adminUid,
            targetUid,
            operationId,
            error: String(
              error?.message || error
            )
          }
        );

        throw new HttpsError(
          "internal",
          "No se pudo aplicar el ajuste de economía."
        );
      }
    }
  );

/**
 * Puente SERVIDOR -> SERVIDOR para las pruebas sandbox de Xsolla.
 *
 * Seguridad:
 * - Solo POST.
 * - Exige un secret independiente de la clave de webhooks de Xsolla.
 * - Solo acepta mode=sandbox y dryRun=true.
 * - Vuelve a comprobar que el UID existe y no está deshabilitado.
 * - El catálogo y la cantidad de gemas se deciden en el backend.
 * - NO contiene ninguna ruta de producción.
 */
exports.xsollaSandboxEconomyBridge =
  onRequest(
    XSOLLA_BRIDGE_OPTIONS,
    async (request, response) => {
      if (request.method !== "POST") {
        response.set("Allow", "POST");
        return sendJson(
          response,
          405,
          {
            ok: false,
            error: "METHOD_NOT_ALLOWED"
          }
        );
      }

      const expectedSecret =
        HALLVALLA_XSOLLA_BRIDGE_SECRET.value();

      const providedSecret =
        request.get(
          "x-hallvalla-bridge-secret"
        ) || "";

      if (
        !constantTimeEqualSecret(
          providedSecret,
          expectedSecret
        )
      ) {
        logger.warn(
          "HallValla Xsolla bridge denied: invalid bridge secret"
        );

        return sendJson(
          response,
          401,
          {
            ok: false,
            error: "UNAUTHORIZED"
          }
        );
      }

      const body =
        request.body &&
        typeof request.body === "object"
          ? request.body
          : {};

      const action = String(
        body.action || ""
      ).trim();

      const mode = String(
        body.mode || ""
      ).trim();

      const dryRun =
        body.dryRun === true;

      const uid = String(
        body.uid || ""
      ).trim();

      const orderId = String(
        body.orderId ?? ""
      ).trim();

      const items =
        Array.isArray(body.items)
          ? body.items
          : [];

      if (
        mode !== "sandbox" ||
        dryRun !== true
      ) {
        logger.error(
          "HallValla Xsolla bridge blocked a non-sandbox request",
          {
            action,
            orderId,
            mode,
            dryRun
          }
        );

        return sendJson(
          response,
          403,
          {
            ok: false,
            error:
              "PRODUCTION_NOT_ENABLED"
          }
        );
      }

      if (
        action !== "paid" &&
        action !== "canceled"
      ) {
        return sendJson(
          response,
          400,
          {
            ok: false,
            error: "INVALID_ACTION"
          }
        );
      }

      if (!uid || !orderId) {
        return sendJson(
          response,
          400,
          {
            ok: false,
            error:
              "INVALID_REQUEST"
          }
        );
      }

      try {
        const firebaseUser =
          await getAuth().getUser(uid);

        if (
          !firebaseUser ||
          firebaseUser.disabled === true ||
          firebaseUser.uid !== uid
        ) {
          return sendJson(
            response,
            400,
            {
              ok: false,
              error: "INVALID_USER"
            }
          );
        }

        const result =
          action === "paid"
            ? await applyXsollaSandboxPaid({
                uid,
                orderId,
                items
              })
            : await applyXsollaSandboxCanceled({
                uid,
                orderId,
                items
              });

        logger.info(
          "HallValla Xsolla sandbox economy event",
          {
            action,
            orderId,
            applied: result.applied,
            reason: result.reason,
            orderStatus:
              result.status,
            walletGems:
              result.wallet.gems
          }
        );

        return sendJson(
          response,
          200,
          {
            ok: true,
            action,
            orderId,
            applied: result.applied,
            reason: result.reason,
            orderStatus:
              result.status,
            wallet: result.wallet
          }
        );
      } catch (error) {
        if (
          error?.code ===
          "auth/user-not-found"
        ) {
          return sendJson(
            response,
            400,
            {
              ok: false,
              error: "INVALID_USER"
            }
          );
        }

        if (
          error instanceof TypeError
        ) {
          logger.warn(
            "HallValla Xsolla sandbox request rejected",
            {
              action,
              orderId,
              error: String(
                error?.message || error
              )
            }
          );

          return sendJson(
            response,
            400,
            {
              ok: false,
              error:
                "INVALID_REQUEST"
            }
          );
        }

        if (
          error?.code ===
          "XSOLLA_REVERSAL_INSUFFICIENT_GEMS"
        ) {
          logger.error(
            "HallValla Xsolla sandbox reversal could not be completed",
            {
              action,
              orderId,
              code: error.code
            }
          );

          return sendJson(
            response,
            409,
            {
              ok: false,
              error:
                "REVERSAL_INSUFFICIENT_GEMS"
            }
          );
        }

        logger.error(
          "HallValla Xsolla sandbox economy bridge failed",
          {
            action,
            orderId,
            error: String(
              error?.message || error
            )
          }
        );

        return sendJson(
          response,
          500,
          {
            ok: false,
            error: "SERVER_ERROR"
          }
        );
      }
    }
  );
