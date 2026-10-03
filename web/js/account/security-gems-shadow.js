"use strict";
/* HallValla · Security Phase 2B · Gem Shadow
   Shadow-only: NO cambia el saldo ni bloquea operaciones.
   Windows v1: firma local no extraíble + telemetría Firebase para detectar
   modificaciones directas de hallvalla_player_profile que eviten savePlayerProfile().
*/
(() => {
  const isWindows =
    /HallVallaWindows\//i.test(String(navigator.userAgent || "")) ||
    globalThis.__HALLVALLA_DESKTOP__ === "windows";
  if (!isWindows) return;

  const DB_NAME = "hallvalla-security-shadow-v1";
  const DB_VERSION = 1;
  const KEY_STORE = "keys";
  const STATE_STORE = "state";
  const HMAC_KEY_ID = "gems-hmac-v1";
  const STATE_PREFIX = "gems:";
  const encoder = new TextEncoder();

  let dbPromise = null;
  let checkBusy = false;
  let sealBusy = false;
  let legitimateWriteUntil = 0;

  function openShadowDb() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const database = req.result;
        if (!database.objectStoreNames.contains(KEY_STORE)) database.createObjectStore(KEY_STORE);
        if (!database.objectStoreNames.contains(STATE_STORE)) database.createObjectStore(STATE_STORE);
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error || new Error("IndexedDB no disponible."));
    });
    return dbPromise;
  }

  async function idbGet(storeName, key) {
    const database = await openShadowDb();
    return new Promise((resolve, reject) => {
      const tx = database.transaction(storeName, "readonly");
      const req = tx.objectStore(storeName).get(key);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error || new Error("No se pudo leer IndexedDB."));
    });
  }

  async function idbPut(storeName, key, value) {
    const database = await openShadowDb();
    return new Promise((resolve, reject) => {
      const tx = database.transaction(storeName, "readwrite");
      const req = tx.objectStore(storeName).put(value, key);
      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error || new Error("No se pudo escribir IndexedDB."));
    });
  }

  async function ensureHmacKey() {
    let key = await idbGet(KEY_STORE, HMAC_KEY_ID);
    if (key) return key;
    key = await crypto.subtle.generateKey(
      { name: "HMAC", hash: "SHA-256", length: 256 },
      false,
      ["sign", "verify"]
    );
    await idbPut(KEY_STORE, HMAC_KEY_ID, key);
    return key;
  }

  function bytesToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let text = "";
    for (const byte of bytes) text += String.fromCharCode(byte);
    return btoa(text);
  }

  function base64ToBytes(value) {
    const text = atob(String(value || ""));
    const bytes = new Uint8Array(text.length);
    for (let i = 0; i < text.length; i++) bytes[i] = text.charCodeAt(i);
    return bytes;
  }

  function payloadFor(uid, gems) {
    return `hallvalla-gems-shadow-v1|${String(uid)}|${Math.max(0, Math.trunc(Number(gems) || 0))}`;
  }

  async function signValue(key, uid, gems) {
    const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(payloadFor(uid, gems)));
    return bytesToBase64(signature);
  }

  async function verifyValue(key, uid, gems, signature) {
    try {
      return await crypto.subtle.verify(
        "HMAC",
        key,
        base64ToBytes(signature),
        encoder.encode(payloadFor(uid, gems))
      );
    } catch (_) {
      return false;
    }
  }

  function currentUid() {
    return String(auth?.currentUser?.uid || "").trim();
  }

  function readRawProfile() {
    try {
      const parsed = JSON.parse(localStorage.getItem("hallvalla_player_profile") || "null");
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch (_) {
      return {};
    }
  }

  function currentSnapshot() {
    const profile = readRawProfile();
    return {
      gems: Math.max(0, Math.trunc(Number(profile.gems) || 0)),
      name: String(profile.name || auth?.currentUser?.displayName || "Jugador").trim().slice(0, 24) || "Jugador"
    };
  }

  function signalId(prefix = "gemshadow") {
    const uid = currentUid().slice(0, 8).replace(/[^A-Za-z0-9]/g, "");
    return `${prefix}_${Date.now()}_${uid}_${Math.random().toString(36).slice(2, 8)}`;
  }

  async function emitSignal({ code, severity = "high", expectedGems, observedGems, evidence }) {
    const uid = currentUid();
    if (!uid) return false;
    const current = currentSnapshot();
    const expected = Math.max(0, Math.trunc(Number(expectedGems) || 0));
    const observed = Math.max(0, Math.trunc(Number(observedGems) || 0));
    const id = signalId(code === "gems_shadow_selftest_v1" ? "shadowtest" : "gemshadow");
    const payload = {
      signalId: id,
      uid,
      playerName: current.name,
      code: String(code || "gems_shadow_integrity_v1").slice(0, 64),
      severity: ["low", "medium", "high", "critical"].includes(severity) ? severity : "high",
      expectedGems: expected,
      observedGems: observed,
      delta: observed - expected,
      source: "windows_hmac_shadow_v1",
      client: "windows",
      build: String(globalThis.__HALLVALLA_BUILD__ || "unknown").slice(0, 64),
      evidence: String(evidence || "").slice(0, 500),
      createdAt: Date.now(),
      status: "open",
      reviewedAt: 0,
      reviewedBy: "",
      adminNote: ""
    };
    await set(ref(db, `community/securitySignals/${uid}/${id}`), payload);
    console.warn("[HallValla][GemShadow] Señal enviada:", payload.code, payload.delta);
    return true;
  }

  async function sealCurrent(reason = "baseline") {
    if (sealBusy) return false;
    const uid = currentUid();
    if (!uid) return false;
    sealBusy = true;
    try {
      const { gems } = currentSnapshot();
      const key = await ensureHmacKey();
      const signature = await signValue(key, uid, gems);
      await idbPut(STATE_STORE, STATE_PREFIX + uid, {
        version: 1,
        uid,
        gems,
        signature,
        sealedAt: Date.now(),
        reason: String(reason || "baseline").slice(0, 40)
      });
      return true;
    } catch (error) {
      console.warn("[HallValla][GemShadow] No se pudo sellar el saldo:", error);
      return false;
    } finally {
      sealBusy = false;
    }
  }

  async function checkCurrent(reason = "timer") {
    if (checkBusy || Date.now() < legitimateWriteUntil) return false;
    const uid = currentUid();
    if (!uid) return false;
    checkBusy = true;
    try {
      const state = await idbGet(STATE_STORE, STATE_PREFIX + uid);
      if (!state || state.uid !== uid || !state.signature) {
        return await sealCurrent("initial");
      }

      const key = await ensureHmacKey();
      const stateValid = await verifyValue(key, uid, state.gems, state.signature);
      const current = currentSnapshot();

      if (!stateValid) {
        const sent = await emitSignal({
          code: "gems_shadow_state_invalid_v1",
          severity: "critical",
          expectedGems: state.gems,
          observedGems: current.gems,
          evidence: `La firma interna de vigilancia no coincide. Motivo de chequeo: ${reason}.`
        });
        if (sent) await sealCurrent("after_state_invalid");
        return sent;
      }

      if (current.gems !== Number(state.gems)) {
        const sent = await emitSignal({
          code: "gems_shadow_integrity_v1",
          severity: "high",
          expectedGems: Number(state.gems),
          observedGems: current.gems,
          evidence: `El saldo cambió fuera del flujo normal savePlayerProfile(). Chequeo: ${reason}.`
        });
        if (sent) await sealCurrent("after_mismatch");
        return sent;
      }

      return true;
    } catch (error) {
      console.warn("[HallValla][GemShadow] Chequeo pendiente:", error);
      return false;
    } finally {
      checkBusy = false;
    }
  }

  async function selfTest() {
    const uid = currentUid();
    if (!uid) throw new Error("Inicia sesión antes de probar la vigilancia.");
    const current = currentSnapshot();
    const key = await ensureHmacKey();
    const signature = await signValue(key, uid, current.gems);
    const fakeGems = current.gems + 777;
    const incorrectlyAccepted = await verifyValue(key, uid, fakeGems, signature);
    if (incorrectlyAccepted) throw new Error("La prueba HMAC no detectó la alteración simulada.");
    await sealCurrent("selftest_baseline");
    await emitSignal({
      code: "gems_shadow_selftest_v1",
      severity: "medium",
      expectedGems: current.gems,
      observedGems: fakeGems,
      evidence: "Prueba controlada: se validó una alteración simulada de +777 gemas sin modificar el saldo real del jugador."
    });
    return { ok: true, expectedGems: current.gems, simulatedGems: fakeGems };
  }

  function wrapLegitimateProfileSave() {
    if (typeof savePlayerProfile !== "function" || savePlayerProfile.__hvGemShadowWrapped) return;
    const original = savePlayerProfile;
    const wrapped = function(profile) {
      legitimateWriteUntil = Date.now() + 1500;
      const result = original.apply(this, arguments);
      Promise.resolve().then(() => sealCurrent("profile_save"));
      return result;
    };
    wrapped.__hvGemShadowWrapped = true;
    wrapped.__hvOriginal = original;
    savePlayerProfile = wrapped;
    globalThis.savePlayerProfile = wrapped;
  }

  function wrapCloudRestore() {
    if (typeof hallvallaApplyCloudStorage !== "function" || hallvallaApplyCloudStorage.__hvGemShadowWrapped) return;
    const original = hallvallaApplyCloudStorage;
    const wrapped = function(storage) {
      legitimateWriteUntil = Date.now() + 2500;
      const result = original.apply(this, arguments);
      Promise.resolve().then(() => sealCurrent("cloud_restore"));
      return result;
    };
    wrapped.__hvGemShadowWrapped = true;
    wrapped.__hvOriginal = original;
    hallvallaApplyCloudStorage = wrapped;
    globalThis.hallvallaApplyCloudStorage = wrapped;
  }

  wrapLegitimateProfileSave();
  wrapCloudRestore();

  onAuthStateChanged(auth, user => {
    if (!user) return;
    setTimeout(() => void checkCurrent("auth_ready"), 1800);
  });

  setInterval(() => void checkCurrent("timer"), 4000);
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) setTimeout(() => void checkCurrent("visibility"), 250);
  }, { passive: true });

  Object.assign(globalThis, {
    hallvallaGemShadowCheck: checkCurrent,
    hallvallaGemShadowSealCurrent: sealCurrent,
    hallvallaGemShadowSelfTest: selfTest
  });

  console.info("[HallValla][GemShadow] Vigilancia Windows activa en modo SHADOW. No modifica economía.");
})();
