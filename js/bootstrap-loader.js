import {initializeApp} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
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
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-database.js";
import {
  getAuth,
  signInAnonymously,
  onAuthStateChanged,
  EmailAuthProvider,
  GoogleAuthProvider,
  linkWithCredential,
  linkWithPopup,
  signInWithPopup,
  browserPopupRedirectResolver,
  signInWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  signOut
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import {firebaseConfig as hallvallaFirebaseConfig} from "../firebase-config.js?v=20260823.3";

const BUILD = "20260825.6";
const CACHE_BUILD = BUILD;
const DECLARED_BUILD = document.querySelector('meta[name="hallvalla-version"]')?.content || "";
if (DECLARED_BUILD !== BUILD) {
  throw new Error(`Versión inconsistente: index=${DECLARED_BUILD || "sin declarar"}, loader=${BUILD}`);
}
globalThis.__HALLVALLA_BUILD__ = BUILD;
globalThis.__HALLVALLA_BUILD_VERSION__ = `v8_MODULAR_${BUILD}`;

/* PERF5 · Señal de visibilidad para pausar únicamente loops CSS cosméticos. */
function hvSyncDocumentVisibility(){
  document.documentElement.classList.toggle("hv-document-hidden", document.hidden);
}
hvSyncDocumentVisibility();
document.addEventListener("visibilitychange", hvSyncDocumentVisibility, {passive:true});

/* PERF6B · Perfil automático para hardware móvil limitado.
   No modifica reglas, timers, hitboxes ni sincronización. Solo activa
   optimizaciones visuales/runtime que no cambian información de gameplay.
   ?hvperf=lite fuerza el perfil; ?hvperf=full lo desactiva para comparar. */
function hvResolvePerformanceProfile(){
  let forced="";
  try{forced=String(new URLSearchParams(location.search).get("hvperf")||"").toLowerCase();}catch(_){ }
  const coarse=globalThis.matchMedia?.("(pointer:coarse)")?.matches===true;
  const memory=Number(navigator.deviceMemory||0);
  const cores=Number(navigator.hardwareConcurrency||0);
  const lowMemory=memory>0&&memory<=4;
  const lowCpu=cores>0&&cores<=4;
  const mobileFallback=coarse&&!memory&&!cores&&Math.min(screen.width||innerWidth,screen.height||innerHeight)<=900;
  const lite=forced==="lite"?true:forced==="full"?false:(coarse&&(lowMemory||lowCpu||mobileFallback));
  const profile=lite?"lite":"full";
  document.documentElement.dataset.hvPerf=profile;
  globalThis.__HALLVALLA_PERF_PROFILE__={profile,coarse,deviceMemory:memory||null,hardwareConcurrency:cores||null,forced:forced||null};
  return profile;
}
hvResolvePerformanceProfile();

globalThis.__HALLVALLA_FIREBASE_CONFIG__ = hallvallaFirebaseConfig;


/* PERF1 · Assets estáticos bajo demanda ------------------------------------
   Los <img> de sistemas ocultos arrancan con data-hv-src, sin src real.
   Cada pantalla hidrata únicamente su grupo cuando va a utilizarlo.
   Esta capa no toca reglas, estado de combate ni sincronización Firebase. */
const hvAssetGroupLoads = new Map();
function hvDeferredAssetNodes(group){
  const safe=String(group||"").trim();
  if(!safe)return [];
  return [...document.querySelectorAll(`[data-hv-asset-group="${CSS.escape(safe)}"][data-hv-src]`)];
}
function hvLoadDeferredImage(img){
  if(!(img instanceof HTMLImageElement))return Promise.resolve(false);
  const deferred=String(img.dataset.hvSrc||"").trim();
  if(!deferred)return Promise.resolve(false);
  const current=String(img.getAttribute("src")||"").trim();
  if(!current)img.src=deferred;
  if(img.complete && img.naturalWidth>0)return Promise.resolve(true);
  return new Promise(resolve=>{
    const done=()=>{img.removeEventListener("load",done);img.removeEventListener("error",done);resolve(img.naturalWidth>0);};
    img.addEventListener("load",done,{once:true});
    img.addEventListener("error",done,{once:true});
  });
}
function hvHydrateAssetGroup(group){
  const safe=String(group||"").trim();
  if(!safe)return Promise.resolve([]);
  const nodes=hvDeferredAssetNodes(safe);
  if(!nodes.length)return Promise.resolve([]);
  const previous=hvAssetGroupLoads.get(safe);
  if(previous && nodes.every(img=>String(img.getAttribute("src")||"").trim()))return previous;
  const task=Promise.all(nodes.map(hvLoadDeferredImage));
  hvAssetGroupLoads.set(safe,task);
  return task;
}
/* PERF3 · Prefetch contextual de baja prioridad ----------------------------
   A diferencia de hidratar un <img>, <link rel="prefetch"> permite preparar
   el recurso en caché sin forzar su decodificación inmediata. Esto evita
   recuperar latencia a costa de volver a inflar la memoria gráfica móvil. */
const hvContextPrefetchLinks=new Map();
function hvInferPrefetchAs(url){
  const clean=String(url||"").split("?")[0].toLowerCase();
  if(/\.(png|jpe?g|webp|gif|avif|svg)$/.test(clean))return "image";
  if(/\.(mp3|ogg|wav|m4a|aac)$/.test(clean))return "audio";
  if(/\.css$/.test(clean))return "style";
  if(/\.js$/.test(clean))return "script";
  return "";
}
function hvPrefetchUrl(url,asHint=""){
  const href=String(url||"").trim();
  if(!href)return false;
  if(hvContextPrefetchLinks.has(href))return true;
  const link=document.createElement("link");
  link.rel="prefetch";
  link.href=href;
  const as=String(asHint||"").trim()||hvInferPrefetchAs(href);
  if(as)link.as=as;
  link.setAttribute("fetchpriority","low");
  link.dataset.hvContextPrefetch="1";
  document.head.appendChild(link);
  hvContextPrefetchLinks.set(href,link);
  return true;
}
function hvPrefetchUrls(urls,asHint=""){
  const unique=[...new Set((Array.isArray(urls)?urls:[urls]).map(v=>String(v||"").trim()).filter(Boolean))];
  return unique.map(url=>hvPrefetchUrl(url,asHint));
}
function hvPrefetchAssetGroup(group){
  const safe=String(group||"").trim();
  if(!safe)return Promise.resolve([]);
  const urls=hvDeferredAssetNodes(safe).map(img=>String(img.dataset.hvSrc||"").trim()).filter(Boolean);
  return Promise.resolve(hvPrefetchUrls(urls,"image"));
}
Object.assign(globalThis,{hvHydrateAssetGroup,hvPrefetchAssetGroup,hvPrefetchUrl,hvPrefetchUrls});

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
  onAuthStateChanged,
  EmailAuthProvider,
  GoogleAuthProvider,
  linkWithCredential,
  linkWithPopup,
  signInWithPopup,
  browserPopupRedirectResolver,
  signInWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  signOut
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
  "08-actions-inspector.js",
  "09a-ai-combat-engine.js",
  "09b-ai-tempo-engine.js",
  "09-combat-turn-ai.js",
  "10-board-interactions.js",
  "11-render-battle-tutorial.js",
  "12-profile-shop-packs.js",
  "12b-account-auth.js",
  "12a-ai-deck-doctrines.js",
  "13-collection-deck-forge.js",
  "14-adventure-engine-ui.js",
  "17-dragon-contracts.js",
  "18-dragon-egg.js",
  "19-field-figures-3d.js",
  "15-settings-tuners-events.js",
  "16-exact-guides-mobile.js"
];

/* PERF2 · Lazy loading real de JavaScript ----------------------------------
   Estos módulos dejan de formar parte del bootstrap obligatorio. Se cargan
   únicamente cuando el usuario entra al sistema que los necesita.
   No se fragmenta el motor de combate ni las reglas compartidas: solo UI y
   subsistemas con puntos de entrada claros y dependencias controladas. */
const OPTIONAL_CORE_PARTS = new Set(["09a-ai-combat-engine.js","09b-ai-tempo-engine.js","12a-ai-deck-doctrines.js"]);

const FEATURE_PARTS = Object.freeze({
  "pvp-ranking": ["07c-pvp-ranking.js"],
  "pvp": ["07b-pvp-rebuild-clean-room.js"],
  "forge-layout": ["20-forge-direct-tuner.js"]
});
const FEATURE_DEPENDENCIES = Object.freeze({
  "pvp": ["pvp-ranking"]
});
const partLoadPromises = new Map();
const featureLoadPromises = new Map();
const loadedParts = new Set();
const loadedFeatures = new Set();

function loadClassicScript(file) {
  const safe=String(file||"").trim();
  if(!safe)return Promise.resolve(false);
  if(loadedParts.has(safe))return Promise.resolve(true);
  if(partLoadPromises.has(safe))return partLoadPromises.get(safe);
  const task=new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `js/parts/${safe}?v=${CACHE_BUILD}`;
    script.async = false;
    script.dataset.hallvallaPart = safe;
    script.onload = () => { loadedParts.add(safe); resolve(true); };
    script.onerror = () => reject(new Error(`No se pudo cargar ${safe}`));
    document.head.appendChild(script);
  }).finally(()=>partLoadPromises.delete(safe));
  partLoadPromises.set(safe,task);
  return task;
}

async function hvEnsureFeature(feature){
  const safe=String(feature||"").trim();
  if(!safe)return false;
  if(loadedFeatures.has(safe))return true;
  if(featureLoadPromises.has(safe))return featureLoadPromises.get(safe);
  const files=FEATURE_PARTS[safe];
  if(!files)throw new Error(`Feature JS desconocida: ${safe}`);
  const task=(async()=>{
    for(const dependency of FEATURE_DEPENDENCIES[safe]||[])await hvEnsureFeature(dependency);
    for(const file of files)await loadClassicScript(file);
    loadedFeatures.add(safe);
    document.documentElement.dataset[`hvFeature${safe.replace(/[^a-z0-9]+(.)/gi,(_,c)=>String(c||"").toUpperCase())}`]="ready";
    console.info(`[HallValla][PERF2] Feature ${safe} cargada bajo demanda (${files.join(", ")}).`);
    return true;
  })().catch(error=>{
    loadedFeatures.delete(safe);
    console.error(`[HallValla][PERF2] No se pudo cargar feature ${safe}:`,error);
    throw error;
  }).finally(()=>featureLoadPromises.delete(safe));
  featureLoadPromises.set(safe,task);
  return task;
}
function hvIsFeatureLoaded(feature){return loadedFeatures.has(String(feature||"").trim());}
Object.assign(globalThis,{hvEnsureFeature,hvIsFeatureLoaded});

function bindLazyPvpEntry(id){
  const node=document.getElementById(id);
  if(!node||node.dataset.hvLazyPvpBound==="1")return;
  node.dataset.hvLazyPvpBound="1";
  node.addEventListener("click",async event=>{
    if(hvIsFeatureLoaded("pvp"))return;
    event.preventDefault();
    event.stopImmediatePropagation();
    node.setAttribute("aria-busy","true");
    try{
      await hvEnsureFeature("pvp");
      if(typeof globalThis.pvpRebuildStep6eOpen==="function")await globalThis.pvpRebuildStep6eOpen(event);
      else throw new Error("El punto de entrada PvP no quedó disponible después de cargar el módulo.");
    }catch(error){
      console.error("[HallValla][PERF2] Falló la entrada lazy a PvP:",error);
      const status=document.getElementById("lobbyStatus");
      if(status)status.textContent=`No se pudo abrir VS Online: ${error.message}`;
    }finally{node.removeAttribute("aria-busy");}
  },true);
}

try {
  for (const file of CORE_PARTS) {
    try{await loadClassicScript(file);}
    catch(error){
      if(!OPTIONAL_CORE_PARTS.has(file))throw error;
      console.warn(`[HallValla][AI] ${file} no pudo cargarse; continúa la IA legacy sin doctrinas V1.`,error);
    }
  }
  bindLazyPvpEntry("onlineBtn");
  globalThis.__HALLVALLA_MODULAR_READY__ = true;
  globalThis.__HALLVALLA_CORE_PARTS__=[...CORE_PARTS];
  globalThis.__HALLVALLA_LAZY_FEATURES__=Object.keys(FEATURE_PARTS);
  console.info(`[HallValla] ${BUILD}: ${CORE_PARTS.length} módulos núcleo cargados; ${Object.keys(FEATURE_PARTS).length} features JS quedan bajo demanda (${DEV_TOOLS_ENABLED ? "DEV" : "PROD"}).`);
} catch (error) {
  globalThis.__HALLVALLA_MODULAR_READY__ = false;
  console.error("[HallValla] Error durante el arranque modular:", error);
  const status = document.getElementById("lobbyStatus");
  if (status) status.textContent = `Error al cargar HallValla: ${error.message}`;
  throw error;
}
