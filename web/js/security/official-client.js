"use strict";

/*
 * HallValla · Official Client Identity · Security v146
 *
 * Esta capa NO contiene secretos.
 * Su función es identificar la build oficial y detectar configuraciones
 * accidentales/no canónicas antes de añadir verificaciones más fuertes.
 */
(() => {
  const OFFICIAL = Object.freeze({
    product: "HallValla",
    securityRevision: 1,
    securityChannel: "v146-security",
    firebaseProjectId: "hallvalla-online",
    androidApplicationId: "com.hallvalla.game",
    windowsProduct: "HallValla",
    officialWebHost: "elberlord.github.io"
  });

  function resolvePlatform() {
    try {
      const params = new URLSearchParams(location.search);

      if (
        params.get("desktop") === "windows" ||
        globalThis.__HALLVALLA_DESKTOP__ === "windows"
      ) {
        return "windows";
      }

      if (
        params.has("apk") ||
        typeof globalThis.HallVallaAndroid !== "undefined"
      ) {
        return "android";
      }
    } catch (_) {}

    return "web";
  }

  function resolveOriginState(platform) {
    const host = String(location.hostname || "").toLowerCase();

    if (platform === "windows") {
      return Object.freeze({
        host,
        expected:
          host === "localhost" ||
          host === "127.0.0.1"
      });
    }

    return Object.freeze({
      host,
      expected: host === OFFICIAL.officialWebHost
    });
  }

  let firebaseState = Object.freeze({
    checked: false,
    projectId: "",
    expected: false
  });

  function bindFirebase(config) {
    const projectId = String(config?.projectId || "").trim();

    firebaseState = Object.freeze({
      checked: true,
      projectId,
      expected: projectId === OFFICIAL.firebaseProjectId
    });

    if (!firebaseState.expected) {
      console.error(
        "[HallValla][SECURITY] Firebase no canónico detectado.",
        {
          esperado: OFFICIAL.firebaseProjectId,
          recibido: projectId || "(vacío)"
        }
      );
    }

    return firebaseState.expected;
  }

  function snapshot() {
    const platform = resolvePlatform();
    const origin = resolveOriginState(platform);

    return Object.freeze({
      product: OFFICIAL.product,
      securityRevision: OFFICIAL.securityRevision,
      securityChannel: OFFICIAL.securityChannel,
      platform,
      origin,
      firebase: firebaseState,
      official:
        origin.expected &&
        (!firebaseState.checked || firebaseState.expected)
    });
  }

  const api = Object.freeze({
    manifest: OFFICIAL,
    bindFirebase,
    snapshot
  });

  Object.defineProperty(
    globalThis,
    "__HALLVALLA_SECURITY__",
    {
      value: api,
      writable: false,
      configurable: false,
      enumerable: false
    }
  );

  document.documentElement.dataset.hvSecurity = "v146-r1";

  console.info(
    "[HallValla][SECURITY] Official Client Identity activa.",
    snapshot()
  );
})();