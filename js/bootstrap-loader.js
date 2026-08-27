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
  serverTimestamp,
  onDisconnect
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-database.js";
import {
  getAuth,
  onAuthStateChanged,
  EmailAuthProvider,
  GoogleAuthProvider,
  linkWithCredential,
  linkWithPopup,
  signInWithPopup,
  browserPopupRedirectResolver,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import {firebaseConfig as hallvallaFirebaseConfig} from "../firebase-config.js?h=e2d82e9b8a80";

const BUILD = "20260827.8";
const CACHE_BUILD = BUILD;
const RESOURCE_HASHES = Object.freeze({"parts/01-boot-config.js":"b328eb1856b5","parts/02-assets-leaders.js":"7c700e9b0da8","parts/03-runtime-clocks.js":"8b208ccee385","parts/04-fx-audio-profile.js":"a62f577b94ba","parts/05-cards-specials-lore.js":"8773a5ac69c3","parts/06-decks-units-combat-rules.js":"10471a305fff","parts/07-network-battle-state.js":"944b9d2f973f","parts/08-actions-inspector.js":"c4a273998d8e","parts/09-combat-turn-ai.js":"92c3265f3910","parts/10-board-interactions.js":"b9891f45393b","parts/11-render-battle-tutorial.js":"c56765f4522c","parts/12-profile-shop-packs.js":"b7be55c4c3d6","parts/12b-account-auth.js":"730360019682","parts/12c-friends.js":"2962e102ec26","parts/13-collection-deck-forge.js":"84b7449bb640","parts/14-adventure-engine-ui.js":"fdc1d01f971c","parts/15-settings-tuners-events.js":"169e4c57fff6","parts/16-exact-guides-mobile.js":"b0987418a824","parts/17-dragon-contracts.js":"d96c4f18732e","parts/18-dragon-egg.js":"1bc39b21d296","parts/19-field-figures-3d.js":"8cf4456fbb48","features/adventure.js":"ed0742a81163","features/forge-layout.js":"3aaf8ac2eb65","features/hvdev.js":"58fc514f1002","features/pve.js":"3eb0e46decaf","features/pvp.js":"d8f5980f506d","features/shop.js":"76ff462c9242"});
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
  onDisconnect,
  getAuth,
  onAuthStateChanged,
  EmailAuthProvider,
  GoogleAuthProvider,
  linkWithCredential,
  linkWithPopup,
  signInWithPopup,
  browserPopupRedirectResolver,
  signInWithEmailAndPassword,
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
  "09-combat-turn-ai.js",
  "10-board-interactions.js",
  "11-render-battle-tutorial.js",
  "12-profile-shop-packs.js",
  "12b-account-auth.js",
  "12c-friends.js",
  "13-collection-deck-forge.js",
  "14-adventure-engine-ui.js",
  "17-dragon-contracts.js",
  "18-dragon-egg.js",
  "19-field-figures-3d.js",
  "15-settings-tuners-events.js",
  "16-exact-guides-mobile.js",
];

const OPTIONAL_CORE_PARTS = new Set();

/* STAGE10 · Feature loading real + caché de sesión ---------------------------
   Cada subsistema pesado tiene un único bundle de entrada. El bundle se
   descarga una sola vez por sesión y el Service Worker lo conserva para
   visitas futuras. Una carga fallida nunca se marca como READY. */
const FEATURE_PARTS = Object.freeze({
  pve: ["features/pve.js"],
  pvp: ["features/pvp.js"],
  shop: ["features/shop.js"],
  adventure: ["features/adventure.js"],
  "forge-layout": ["features/forge-layout.js"],
  hvdev: ["features/hvdev.js"]
});
const FEATURE_ALIASES = Object.freeze({
  "pvp-ranking":"pvp"
});
const partLoadPromises = new Map();
const featureLoadPromises = new Map();
const loadedParts = new Set();
const loadedFeatures = new Set();

function hvFeatureName(feature){
  const raw=String(feature||"").trim();
  return FEATURE_ALIASES[raw]||raw;
}
function hvFeatureMetaWrite(feature,state,error=""){
  try{
    const key=`hallvalla_feature_${hvFeatureName(feature)}_v1`;
    localStorage.setItem(key,JSON.stringify({state,build:BUILD,at:Date.now(),error:String(error||"").slice(0,180)}));
  }catch(_){ }
}
function hvVersionedResourceUrl(relative){
  const safe=String(relative||"").replace(/^\/+/,"");
  const hash=RESOURCE_HASHES[safe]||BUILD;
  return `js/${safe}?h=${encodeURIComponent(hash)}`;
}
function loadClassicScript(file) {
  const safe=String(file||"").trim();
  if(!safe)return Promise.resolve(false);
  if(loadedParts.has(safe))return Promise.resolve(true);
  if(partLoadPromises.has(safe))return partLoadPromises.get(safe);
  const task=new Promise((resolve, reject) => {
    const script = document.createElement("script");
    const relative=safe.includes("/")?safe:`parts/${safe}`;
    script.src = hvVersionedResourceUrl(relative);
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
  const safe=hvFeatureName(feature);
  if(!safe)return false;
  if(safe==="hvdev"&&!DEV_TOOLS_ENABLED)throw new Error("HVDEV solo está disponible con ?hvdev=1");
  if(loadedFeatures.has(safe))return true;
  if(featureLoadPromises.has(safe))return featureLoadPromises.get(safe);
  const files=FEATURE_PARTS[safe];
  if(!files)throw new Error(`Feature JS desconocida: ${safe}`);
  hvFeatureMetaWrite(safe,"downloading");
  const task=(async()=>{
    for(const file of files)await loadClassicScript(file);
    loadedFeatures.add(safe);
    hvFeatureMetaWrite(safe,"ready");
    document.documentElement.dataset[`hvFeature${safe.replace(/[^a-z0-9]+(.)/gi,(_,c)=>String(c||"").toUpperCase())}`]="ready";
    console.info(`[HallValla][STAGE10] ${safe} READY (${files.join(", ")}).`);
    return true;
  })().catch(error=>{
    loadedFeatures.delete(safe);
    hvFeatureMetaWrite(safe,"failed",error?.message||error);
    console.error(`[HallValla][STAGE10] No se pudo cargar ${safe}:`,error);
    throw error;
  }).finally(()=>featureLoadPromises.delete(safe));
  featureLoadPromises.set(safe,task);
  return task;
}
function hvIsFeatureLoaded(feature){return loadedFeatures.has(hvFeatureName(feature));}
Object.assign(globalThis,{hvEnsureFeature,hvIsFeatureLoaded});

/* Proxies síncronos de enlace: permiten que los handlers legacy se registren
   sin cargar Shop/PvE. El trabajo real empieza únicamente al invocarlos. */
function installAsyncFeatureProxy(globalName,feature){
  if(typeof globalThis[globalName]==="function")return globalThis[globalName];
  let pendingInvocation=null;
  const proxy=(...args)=>{
    if(pendingInvocation)return pendingInvocation;
    pendingInvocation=(async()=>{
      await hvEnsureFeature(feature);
      const implementation=globalThis[globalName];
      if(typeof implementation!=="function"||implementation===proxy){
        throw new Error(`${globalName} no quedó disponible tras cargar ${feature}.`);
      }
      return implementation(...args);
    })().finally(()=>{pendingInvocation=null;});
    return pendingInvocation;
  };
  globalThis[globalName]=proxy;
  return proxy;
}
installAsyncFeatureProxy("openPackShop","shop");
installAsyncFeatureProxy("closePackShop","shop");
installAsyncFeatureProxy("adventureEnemyTurn","pve");
installAsyncFeatureProxy("openAdventureMap","adventure");
installAsyncFeatureProxy("showAdventureMapOnly","adventure");
installAsyncFeatureProxy("renderAdventureMap","adventure");
installAsyncFeatureProxy("openAdventureStory","adventure");
installAsyncFeatureProxy("showAdventureStage","adventure");
installAsyncFeatureProxy("nextAdventureStoryScene","adventure");
installAsyncFeatureProxy("showAdventureChoice","adventure");
installAsyncFeatureProxy("showAdventureWoundedIntro","adventure");
installAsyncFeatureProxy("showAdventureGuardianIntro","adventure");

function bindLazyPvpEntry(id){
  const node=document.getElementById(id);
  if(!node||node.dataset.hvLazyPvpBound==="1")return;
  node.dataset.hvLazyPvpBound="1";
  node.addEventListener("click",async event=>{
    if(hvIsFeatureLoaded("pvp"))return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if(node.getAttribute("aria-busy")==="true")return;
    node.setAttribute("aria-busy","true");
    try{
      await hvEnsureFeature("pvp");
      if(typeof globalThis.pvpRebuildStep6eOpen==="function")await globalThis.pvpRebuildStep6eOpen(event);
      else throw new Error("El punto de entrada PvP no quedó disponible después de cargar el módulo.");
    }catch(error){
      console.error("[HallValla][STAGE10] Falló la entrada lazy a PvP:",error);
      const status=document.getElementById("lobbyStatus");
      if(status)status.textContent=`No se pudo abrir VS Online: ${error.message}`;
    }finally{node.removeAttribute("aria-busy");}
  },true);
}

function installLazyAdventureWrapper(){
  const original=globalThis.startAdventure;
  if(typeof original!=="function"||original.__hvPveWrapped)return;
  const wrapped=async(...args)=>{
    await hvEnsureFeature("pve");
    return original(...args);
  };
  wrapped.__hvPveWrapped=true;
  wrapped.__hvOriginal=original;
  globalThis.startAdventure=wrapped;
}

/* Service Worker: Cache Storage controlado por HallValla. No precarga módulos
   opcionales. Solo guarda recursos que realmente fueron solicitados. */
async function hvRegisterServiceWorker(){
  if(!('serviceWorker' in navigator))return null;
  if(location.protocol!=="https:"&&location.hostname!=="localhost"&&location.hostname!=="127.0.0.1")return null;
  try{
    const registration=await navigator.serviceWorker.register(`service-worker.js?v=${BUILD}`,{scope:"./",updateViaCache:"none"});
    globalThis.__HALLVALLA_SW_REGISTRATION__=registration;
    return registration;
  }catch(error){
    console.warn("[HallValla][CACHE] Service Worker no disponible:",error);
    return null;
  }
}
void hvRegisterServiceWorker();

function hvRequestPersistentStorageOnce(){
  if(!navigator.storage?.persist)return;
  navigator.storage.persisted?.().then(already=>{
    if(already)return;
    return navigator.storage.persist();
  }).then(granted=>{if(typeof granted==="boolean")globalThis.__HALLVALLA_STORAGE_PERSISTENT__=granted;}).catch(()=>{});
}
document.addEventListener("pointerdown",hvRequestPersistentStorageOnce,{once:true,capture:true,passive:true});

try {
  for (const file of CORE_PARTS) {
    try{await loadClassicScript(file);}
    catch(error){
      if(!OPTIONAL_CORE_PARTS.has(file))throw error;
      console.warn(`[HallValla][AI] ${file} no pudo cargarse; continúa la IA legacy sin doctrinas V1.`,error);
    }
  }
  installLazyAdventureWrapper();
  bindLazyPvpEntry("onlineBtn");
  if(DEV_TOOLS_ENABLED)await hvEnsureFeature("hvdev");
  globalThis.__HALLVALLA_MODULAR_READY__ = true;
  globalThis.__HALLVALLA_CORE_PARTS__=[...CORE_PARTS];
  globalThis.__HALLVALLA_LAZY_FEATURES__=Object.keys(FEATURE_PARTS);
  console.info(`[HallValla] ${BUILD}: ${CORE_PARTS.length} módulos núcleo; bundles lazy=${Object.keys(FEATURE_PARTS).join(", ")} (${DEV_TOOLS_ENABLED ? "DEV" : "PROD"}).`);
} catch (error) {
  globalThis.__HALLVALLA_MODULAR_READY__ = false;
  console.error("[HallValla] Error durante el arranque modular:", error);
  const status = document.getElementById("lobbyStatus");
  if (status) status.textContent = `Error al cargar HallValla: ${error.message}`;
  throw error;
}
