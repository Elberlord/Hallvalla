import {initializeApp} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {getDatabase,ref,set,update,get,onValue,remove,runTransaction,serverTimestamp} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
import {getAuth,signInAnonymously,onAuthStateChanged} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const BUILD = "7BOARDCTRL8X";
Object.assign(globalThis, {
  initializeApp,
  getDatabase,
  ref,
  set,
  update,
  get,
  onValue,
  remove,
  runTransaction,
  serverTimestamp,
  getAuth,
  signInAnonymously,
  onAuthStateChanged
});

const PARTS = [
  "01-boot-config.js",
  "02-assets-leaders.js",
  "03-runtime-clocks.js",
  "04-fx-audio-profile.js",
  "05-cards-specials-lore.js",
  "06-decks-units-combat-rules.js",
  "07-network-battle-state.js",
  "08-actions-inspector.js",
  "09-combat-turn-ai.js",
  "10-board-interactions.js",
  "11-render-battle-tutorial.js",
  "12-profile-shop-packs.js",
  "13-collection-deck-forge.js",
  "14-adventure-engine-ui.js",
  "15-settings-tuners-events.js",
  "16-exact-guides-mobile.js"
];

function loadClassicScript(file) {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `js/parts/${file}?v=${BUILD}`;
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
  globalThis.__HALLVALLA_BUILD__ = BUILD;
  console.info(`[HallValla] ${BUILD}: ${PARTS.length} módulos cargados correctamente.`);
} catch (error) {
  globalThis.__HALLVALLA_MODULAR_READY__ = false;
  console.error("[HallValla] Error durante el arranque modular:", error);
  const status = document.getElementById("lobbyStatus");
  if (status) status.textContent = `Error al cargar HallValla: ${error.message}`;
  throw error;
}
