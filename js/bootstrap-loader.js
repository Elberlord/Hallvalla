import {initializeApp} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getDatabase,
  ref,
  set as firebaseSet,
  update as firebaseUpdate,
  get,
  onValue,
  remove,
  runTransaction as firebaseRunTransaction,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
import {getAuth,signInAnonymously,onAuthStateChanged} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {firebaseConfig as hallvallaFirebaseConfig} from "../firebase-config.js?v=7BOARDCTRL8CMSFX1C2GF1UB1C3DR1UI2FORGE4ASSETDRAWER1OWNFILTER1-PVPREBUILDSTEP6I2-PVP-RANKING-STATS-STAGE7RENDER1-STAGE8PRIV1-STAGE9CLEAN1-RANKINGACT1-PVE2XP1-PROFILEDEV1-MASTERAI1-FUMAKOTARO1-AOESTEALTH1-20260815H";

const BUILD = "7BOARDCTRL8CMSFX1C2GF1UB1C3DR1UI2FORGE4ASSETDRAWER1OWNFILTER1-PVPREBUILDSTEP6I2-PVP-RANKING-STATS-STAGE7RENDER1-STAGE8PRIV1-STAGE9CLEAN1-RANKINGACT1-PVE2XP1-PROFILEDEV1-MASTERAI1-FUMAKOTARO1-AOESTEALTH1";
const CACHE_BUILD = "7BOARDCTRL8CMSFX1C2GF1UB1C3DR1UI2FORGE4ASSETDRAWER1OWNFILTER1-PVPREBUILDSTEP6I2-PVP-RANKING-STATS-STAGE7RENDER1-STAGE8PRIV1-STAGE9CLEAN1-RANKINGACT1-PVE2XP1-PROFILEDEV1-MASTERAI1-FUMAKOTARO1-AOESTEALTH1-20260815H";
const DECLARED_BUILD = document.querySelector('meta[name="hallvalla-version"]')?.content || "";
if (DECLARED_BUILD !== BUILD) {
  throw new Error(`Versión inconsistente: index=${DECLARED_BUILD || "sin declarar"}, loader=${BUILD}`);
}
globalThis.__HALLVALLA_BUILD__ = BUILD;
globalThis.__HALLVALLA_BUILD_VERSION__ = `v8_MODULAR_${BUILD}`;
globalThis.__HALLVALLA_FIREBASE_CONFIG__ = hallvallaFirebaseConfig;

// Etapa 9: los calibradores internos no participan del runtime normal.
// Se conservan en el ZIP y pueden habilitarse de forma explícita con ?hvdev=1.
const DEV_TOOLS_ENABLED = (() => {
  try { return new URLSearchParams(globalThis.location?.search || "").get("hvdev") === "1"; }
  catch (_) { return false; }
})();
globalThis.__HALLVALLA_DEV_TOOLS__ = DEV_TOOLS_ENABLED;
document.documentElement.dataset.hvRuntime = DEV_TOOLS_ENABLED ? "dev" : "prod";

function sanitizeFirebaseValue(value, seen = new WeakSet()) {
  if (typeof value === "undefined") return undefined;
  if (value === null || typeof value !== "object") return value;
  if (seen.has(value)) throw new TypeError("Firebase no admite estructuras circulares.");
  seen.add(value);
  try {
    if (Array.isArray(value)) {
      return Array.from(value, item => {
        const clean = sanitizeFirebaseValue(item, seen);
        return typeof clean === "undefined" ? null : clean;
      });
    }
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) return value;
    const clean = {};
    for (const [key, item] of Object.entries(value)) {
      const safe = sanitizeFirebaseValue(item, seen);
      if (typeof safe !== "undefined") clean[key] = safe;
    }
    return clean;
  } finally {
    seen.delete(value);
  }
}

function requireFirebaseValue(value, operation) {
  const clean = sanitizeFirebaseValue(value);
  if (typeof clean === "undefined") {
    throw new TypeError(`${operation} recibió undefined como valor principal.`);
  }
  return clean;
}

function safeSet(reference, value) {
  return firebaseSet(reference, requireFirebaseValue(value, "set"));
}

function safeUpdate(reference, patch) {
  const clean = requireFirebaseValue(patch, "update");
  if (!clean || typeof clean !== "object" || Array.isArray(clean)) {
    throw new TypeError("update requiere un objeto de propiedades.");
  }
  return firebaseUpdate(reference, clean);
}

function safeRunTransaction(reference, updater, options) {
  if (typeof updater !== "function") throw new TypeError("runTransaction requiere una función actualizadora.");
  return firebaseRunTransaction(reference, current => {
    const next = updater(current);
    return typeof next === "undefined" ? undefined : sanitizeFirebaseValue(next);
  }, options);
}

globalThis.__HALLVALLA_SANITIZE_FIREBASE_VALUE__ = sanitizeFirebaseValue;
Object.assign(globalThis, {
  initializeApp,
  getDatabase,
  ref,
  set: safeSet,
  update: safeUpdate,
  get,
  onValue,
  remove,
  runTransaction: safeRunTransaction,
  serverTimestamp,
  getAuth,
  signInAnonymously,
  onAuthStateChanged
});

// Etapa 9: los módulos mixtos conservan su parte de runtime, pero sus editores/calibradores
// solo se inicializan con ?hvdev=1. El cargador no elimina archivos para evitar regresiones.
const CORE_PARTS = [
  "01-boot-config.js",
  "02-assets-leaders.js",
  "03-runtime-clocks.js",
  "04-fx-audio-profile.js",
  "05-cards-specials-lore.js",
  "06-decks-units-combat-rules.js",
  "07-network-battle-state.js",
  "07b-pvp-rebuild-clean-room.js",
  "07c-pvp-ranking.js",
  "08-actions-inspector.js",
  "09-combat-turn-ai.js",
  "10-board-interactions.js",
  "11-render-battle-tutorial.js",
  "12-profile-shop-packs.js",
  "13-collection-deck-forge.js",
  "14-adventure-engine-ui.js",
  "17-dragon-contracts.js",
  "18-dragon-egg.js",
  "19-field-figures-3d.js",
  "15-settings-tuners-events.js",
  "16-exact-guides-mobile.js",
  // Mantiene el aplicador de layout canónico de Forja; el editor interno se activa solo en DEV.
  "20-forge-direct-tuner.js"
];
const PARTS = CORE_PARTS;

function loadClassicScript(file) {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `js/parts/${file}?v=${CACHE_BUILD}`;
    script.async = false;
    script.dataset.hallvallaPart = file;
    script.onload = resolve;
    script.onerror = () => reject(new Error(`No se pudo cargar ${file}`));
    document.head.appendChild(script);
  });
}

try {
  for (const file of PARTS) await loadClassicScript(file);
  globalThis.__HALLVALLA_MODULAR_READY__ = true;
  console.info(`[HallValla] ${BUILD}: ${PARTS.length} módulos cargados correctamente (${DEV_TOOLS_ENABLED ? "DEV" : "PROD"}).`);
} catch (error) {
  globalThis.__HALLVALLA_MODULAR_READY__ = false;
  console.error("[HallValla] Error durante el arranque modular:", error);
  const status = document.getElementById("lobbyStatus");
  if (status) status.textContent = `Error al cargar HallValla: ${error.message}`;
  throw error;
}
