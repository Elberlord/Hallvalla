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
import {firebaseConfig as hallvallaFirebaseConfig} from "../firebase-config.js?h=7d86f726043e";

const BUILD = "20260919.217";
const RESOURCE_HASHES = Object.freeze({"account/auth.js":"e3ddf342dc91","account/friends.js":"2962e102ec26","account/profile-shop-packs.js":"48c0e5c52761","adventure/campaign-data.js":"05f550c6d1e0","adventure/engine-ui.js":"891dc52a7b6b","battle/actions-inspector.js":"971cffb211bd","battle/board-interactions.js":"ee53dca48b0e","battle/combat-turn-ai.js":"c57fbac155bb","battle/render-battle-tutorial.js":"e052c6b0458f","config/ui-canonical.js":"7a2a785bfcb2","core/assets-leaders.js":"2ad329a8058a","core/boot-config.js":"67778a826385","core/fx-audio-profile.js":"4d9661363f4d","core/runtime-clocks.js":"02d34f6951ed","dev/battle-calibrators.js":"a2842f44f64b","dev/det-layout-editor.js":"6d68c784a9d7","dev/missions-calibrator.js":"e59f1726fba6","dev/universal-layout-editor.js":"02d0151f5ef4","dragon/contracts.js":"f85382152b4e","dragon/egg.js":"a3df7e88a7ba","features/adventure/index.js":"846648e49b0a","features/forge/index.js":"784a7fbef7a2","features/pve/adaptive-campaign.js":"a095a338fff3","features/pve/adaptive-expert-log.js":"610e55a0a47d","features/pve/ai-deck-doctrine.js":"24e342a402c2","features/pvp/index.js":"c4458baa8860","features/shop/index.js":"4fe46c5bc3f0","forge/deck-builder.js":"0ade337a6794","game/cards-specials-lore.js":"b9b5c31cd800","game/decks-units-combat-rules.js":"11990fa6eff4","game/unit-load-profiles.js":"07b5f30da94e","input/gamepad-controls.js":"6a81a03c09e5","layout/battle.js":"f805d683e94e","layout/forge-bridge.js":"4e9c3f1f59fc","layout/universal-runtime.js":"076160d454fe","network/battle-state.js":"d7dad1b63449","realtime/experimental.js":"b7be39ca76e3","render/field-figures-3d.js":"f0e52063c31a","system/exact-guides-mobile.js":"543fc00d19ad","system/settings-events.js":"07f5e2372edf"});
const DECLARED_BUILD = document.querySelector('meta[name="hallvalla-version"]')?.content || "";
if (DECLARED_BUILD !== BUILD) {
  console.warn(`[HallValla] Versión transitoria: index=${DECLARED_BUILD || "sin declarar"}, loader=${BUILD}. Se continúa para evitar bloquear el arranque durante propagación/caché.`);
}
globalThis.__HALLVALLA_BUILD__ = BUILD;
globalThis.__HALLVALLA_BUILD_VERSION__ = `v9_ARCH_${BUILD}`;

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
// Se conservan en el ZIP y solo pueden habilitarse de forma explícita con ?dev.
const DEV_TOOLS_ENABLED = (() => {
  try {
    const params=new URLSearchParams(globalThis.location?.search || "");
    if(!params.has("dev"))return false;
    const value=String(params.get("dev")??"").trim().toLowerCase();
    return value===""||value==="1"||value==="true";
  } catch (_) { return false; }
})();
globalThis.__HALLVALLA_DEV_TOOLS__ = DEV_TOOLS_ENABLED;
/*
   CONTRATO DEV=PROD:
   ?dev NO cambia el runtime visual ni activa una hoja de estilo alternativa.
   El juego base siempre se identifica como producción; ?dev únicamente monta
   herramientas superpuestas mediante data-hv-dev-tools. Así cualquier ajuste
   se realiza sobre exactamente el mismo DOM/CSS/asset/layout que verá el jugador.
*/
document.documentElement.dataset.hvRuntime = "prod";
if(DEV_TOOLS_ENABLED)document.documentElement.dataset.hvDevTools = "on";
else {
  delete document.documentElement.dataset.hvDevTools;
  // Guardia de producción: aunque un DOM/cache previo haya dejado nodos DEV,
  // el juego normal nunca debe exponer calibradores ni el lanzador HV DEV.
  const purgeDevUi=()=>{
    document.querySelectorAll("#hvDevToolsHubLauncher,#hvDevToolsHub,#hvUniversalLayoutTuner").forEach(n=>n.remove());
    document.querySelectorAll("[data-hv-dev-tool]").forEach(n=>n.style.setProperty("display","none","important"));
  };
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",purgeDevUi,{once:true});else purgeDevUi();
}

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
// solo se inicializan con ?dev. El cargador no elimina archivos para evitar regresiones.
const CORE_PARTS = [
  "config/ui-canonical.js",
  "core/boot-config.js",
  "core/assets-leaders.js",
  "core/runtime-clocks.js",
  "core/fx-audio-profile.js",
  "game/cards-specials-lore.js",
  "game/unit-load-profiles.js",
  "adventure/campaign-data.js",
  "game/decks-units-combat-rules.js",
  "network/battle-state.js",
  "battle/actions-inspector.js",
  "battle/combat-turn-ai.js",
  "battle/board-interactions.js",
  "battle/render-battle-tutorial.js",
  "account/profile-shop-packs.js",
  "account/auth.js",
  "account/friends.js",
  "forge/deck-builder.js",
  "adventure/engine-ui.js",
  "dragon/contracts.js",
  "dragon/egg.js",
  "render/field-figures-3d.js",
  "system/settings-events.js",
  "system/exact-guides-mobile.js",
  "input/gamepad-controls.js",
  "realtime/experimental.js",
  "layout/universal-runtime.js"
];

/* STAGE10 · Feature loading real + caché de sesión ---------------------------
   Cada subsistema pesado tiene un único bundle de entrada. El bundle se
   descarga una sola vez por sesión y el Service Worker lo conserva para
   visitas futuras. Una carga fallida nunca se marca como READY. */
const FEATURE_PARTS = Object.freeze({
  "pve": [
    "features/pve/ai-deck-doctrine.js",
    "features/pve/adaptive-campaign.js",
    "features/pve/adaptive-expert-log.js"
  ],
  "pvp": [
    "features/pvp/index.js"
  ],
  "shop": [
    "features/shop/index.js"
  ],
  "forge": [
    "features/forge/index.js"
  ],
  "adventure": [
    "features/adventure/index.js"
  ],
  "battle-layout": [
    "layout/battle.js"
  ],
  "forge-layout": [
    "layout/forge-bridge.js"
  ],
  "hvdev": [
    "dev/battle-calibrators.js",
    "dev/missions-calibrator.js",
    "dev/det-layout-editor.js",
    "dev/universal-layout-editor.js"
  ]
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
  return `js/${safe}?h=${encodeURIComponent(hash)}&v=${encodeURIComponent(BUILD)}`;
}
function loadClassicScript(file) {
  const safe=String(file||"").trim();
  if(!safe)return Promise.resolve(false);
  if(loadedParts.has(safe))return Promise.resolve(true);
  if(partLoadPromises.has(safe))return partLoadPromises.get(safe);
  const task=new Promise((resolve, reject) => {
    const script = document.createElement("script");
    const relative=safe;
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
  if(safe==="hvdev"&&!DEV_TOOLS_ENABLED)throw new Error("HVDEV solo está disponible con ?dev");
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
installAsyncFeatureProxy("openForgeHub","forge");
installAsyncFeatureProxy("closeForgeHub","forge");
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

/* Stage 10.2 · layout de combate lazy en producción.
   El preset visual NO es una herramienta DEV: se carga solo cuando el tablero
   se vuelve visible. El editor continúa exclusivamente dentro de hvdev.js. */
function installLazyBattleLayoutRuntime(){
  if(DEV_TOOLS_ENABLED)return;
  const shell=document.getElementById("gameShell");
  if(!shell)return;
  let pending=null;
  const ensure=()=>{
    if(shell.classList.contains("hidden"))return;
    if(hvIsFeatureLoaded("battle-layout")){
      requestAnimationFrame(()=>globalThis.hallvallaBattleLayout?.apply?.());
      return;
    }
    if(pending)return;
    pending=hvEnsureFeature("battle-layout")
      .then(()=>requestAnimationFrame(()=>globalThis.hallvallaBattleLayout?.apply?.()))
      .catch(error=>console.error("[HallValla][BattleLayout] No se pudo aplicar el layout aprobado:",error))
      .finally(()=>{pending=null;});
  };
  new MutationObserver(ensure).observe(shell,{attributes:true,attributeFilter:["class"]});
  ensure();
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
  for (const file of CORE_PARTS) await loadClassicScript(file);
  installLazyAdventureWrapper();
  bindLazyPvpEntry("onlineBtn");
  installLazyBattleLayoutRuntime();
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
