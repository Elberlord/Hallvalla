"use strict";
/* HallValla 7BOARDCTRL8BH · Arranque, Firebase y utilidades DOM */


/* ==========================================================
   7HBE · limpieza real de banderas viejas de prueba
   ========================================================== */
(function(){
  const KEYS=[
    "hv_rarity_debug_force_hand",
    "hv_rarity_debug_card_key",
    "hv_rarity_real_controls",
    "hv_extra_glow_controls_7hax",
    "hv_master_glow_controls_7hba",
    "hvForcedFirstHandCard",
    "hvForceFirstHandCard",
    "hallvalla_forced_first_hand_card",
    "hallvallaForcedFirstHandCard",
    "rarityControlForcedCard",
    "hv_rarity_forced_card",
    "hvRarityForcedCard",
    "forcedOpeningCard",
    "forcedFirstCard"
  ];
  try{
    KEYS.forEach(k=>{
      localStorage.removeItem(k);
      sessionStorage.removeItem(k);
    });
  }catch(_){}
})();

/*
================================================================================
HALLVALLA ORGANIZED V2
================================================================================
Código dividido en módulos secuenciales para GitHub Pages.

REGLA DE ESTA VERSIÓN:
- No se borran cartas.
- No se elimina aventura.
- No se cambia Firebase todavía.
- No se convierte el juego en demo.
- DEF no debe crear FX global.
- guard_buff / defend_stance no deben pintar overlays del tablero.

MAPA INTERNO DEL SCRIPT:
01_BOOT_CONFIG_IMPORTS       Firebase, constantes globales, helpers DOM.
02_ASSET_DATABASE            portraits, líderes, cartas, rutas de assets.
03_LEADER_SYSTEM             niveles, buffs, habilidades Nv.5.
04_RUNTIME_STATE_PHASES      estado global, fases, turnos, selección.
05_FX_ENGINE                 FX centralizado, defensa, dodge, status, destroy.
06_AUDIO_SETTINGS            audio, música, sfx, settings.
07_CARD_DATABASE             cartas base, bestias, especiales, aventura.
08_PROFILE_COLLECTION_DECK   perfil, colección, deck, progreso.
09_RENDER_CORE               render principal, grid, board, HUD.
10_UNIT_LEADER_RENDER        render de unidades, líderes y modales.
11_COMBAT_ENGINE             movimiento, ataque, daño, guardia, DEF.
12_CARD_EFFECTS              spells, buffs, curación, efectos especiales.
13_AI_ENGINE                 IA local/adventure/online.
14_ADVENTURE_ENGINE          aventura, recompensas, historia.
15_UI_EVENTS_BOOT            listeners, navegación, inicialización.

IMPORTANTE:
Los módulos conservan el orden original para proteger las dependencias entre
const, let, funciones e inicializadores.
================================================================================
*/


/*
-------------------------------------------------------------------------------
01_BOOT_CONFIG_IMPORTS
-------------------------------------------------------------------------------
*/

const firebaseConfig=globalThis.__HALLVALLA_FIREBASE_CONFIG__;
if(!firebaseConfig?.apiKey||!firebaseConfig?.databaseURL){
  throw new Error("Configuración Firebase ausente o incompleta.");
}
const app=initializeApp(firebaseConfig),db=getDatabase(app),auth=getAuth(app);
const FIELD_BOARD_TUNER_KEY="hallvalla_field_board_tuner_v4_final_100_5x7";
const BATTLE_CLOCK_TUNER_KEY="hallvalla_battle_clock_tuner_v3_restored_positions";
const FIELD_BOARD_DEFAULTS=Object.freeze({rows:7,cols:5,cardScale:100});
const FIELD_BOARD_LIMITS=Object.freeze({rows:[4,12],cols:[3,10],cardScale:[45,150]});
function clampFieldBoardNumber(value,min,max,fallback){
  const n=Number(value);
  return Number.isFinite(n)?Math.max(min,Math.min(max,Math.round(n))):fallback;
}
function readFieldBoardPreferences(){
  try{
    const saved=JSON.parse(localStorage.getItem(FIELD_BOARD_TUNER_KEY)||"{}")||{};
    return{
      rows:clampFieldBoardNumber(saved.rows,...FIELD_BOARD_LIMITS.rows,FIELD_BOARD_DEFAULTS.rows),
      cols:clampFieldBoardNumber(saved.cols,...FIELD_BOARD_LIMITS.cols,FIELD_BOARD_DEFAULTS.cols),
      cardScale:clampFieldBoardNumber(saved.cardScale,...FIELD_BOARD_LIMITS.cardScale,FIELD_BOARD_DEFAULTS.cardScale)
    };
  }catch(_){return{...FIELD_BOARD_DEFAULTS};}
}
const FIELD_BOARD_INITIAL=readFieldBoardPreferences();
let ROWS=FIELD_BOARD_INITIAL.rows,COLS=FIELD_BOARD_INITIAL.cols;
const $=id=>document.getElementById(id);

/* E40 · Registro canónico de extensiones -----------------------------------
   Los subsistemas opcionales registran hooks explícitos en el núcleo en vez
   de reemplazar funciones ya definidas (monkey-patching). */
const HALLVALLA_HOOKS=new Map();
let hallvallaHookSequence=0;
function registerHallvallaHook(name,handler,options={}){
  const key=String(name||"").trim();
  if(!key||typeof handler!=="function")throw new TypeError("registerHallvallaHook requiere nombre y función.");
  const entry={id:String(options?.id||`${key}:${hallvallaHookSequence+1}`),priority:Number(options?.priority||0),sequence:++hallvallaHookSequence,handler};
  const list=HALLVALLA_HOOKS.get(key)||[];
  if(list.some(item=>item.id===entry.id))throw new Error(`Hook duplicado: ${entry.id}`);
  list.push(entry);
  list.sort((a,b)=>(a.priority-b.priority)||(a.sequence-b.sequence));
  HALLVALLA_HOOKS.set(key,list);
  return()=>{const current=HALLVALLA_HOOKS.get(key)||[];const next=current.filter(item=>item!==entry);if(next.length)HALLVALLA_HOOKS.set(key,next);else HALLVALLA_HOOKS.delete(key);};
}
function applyHallvallaValueHooks(name,value,context={}){let next=value;for(const entry of HALLVALLA_HOOKS.get(String(name||""))||[]){const candidate=entry.handler(next,context);if(candidate!==undefined)next=candidate;}return next;}
function resolveHallvallaOverride(name,context={}){for(const entry of HALLVALLA_HOOKS.get(String(name||""))||[]){const result=entry.handler(context);if(result&&result.handled===true)return result;}return{handled:false,value:undefined};}
async function resolveHallvallaAsyncOverride(name,context={}){for(const entry of HALLVALLA_HOOKS.get(String(name||""))||[]){const result=await entry.handler(context);if(result&&result.handled===true)return result;}return{handled:false,value:undefined};}
function runHallvallaEffectHooks(name,context={}){for(const entry of HALLVALLA_HOOKS.get(String(name||""))||[])entry.handler(context);}
function getHallvallaHookSnapshot(){return Object.fromEntries([...HALLVALLA_HOOKS.entries()].map(([name,list])=>[name,list.map(({id,priority,sequence})=>({id,priority,sequence}))]));}
Object.assign(globalThis,{registerHallvallaHook,applyHallvallaValueHooks,resolveHallvallaOverride,resolveHallvallaAsyncOverride,runHallvallaEffectHooks,getHallvallaHookSnapshot});
function syncBoardDimensionsFromState(state){
  const nextRows=clampFieldBoardNumber(state?.boardRows,...FIELD_BOARD_LIMITS.rows,FIELD_BOARD_DEFAULTS.rows);
  const nextCols=clampFieldBoardNumber(state?.boardCols,...FIELD_BOARD_LIMITS.cols,FIELD_BOARD_DEFAULTS.cols);
  ROWS=nextRows;
  COLS=nextCols;
  const root=document.documentElement;
  root.style.setProperty("--hv-board-rows",String(ROWS));
  root.style.setProperty("--hv-board-cols",String(COLS));
  if(typeof syncFieldBoardTunerControls==="function")syncFieldBoardTunerControls();
}
function on(id,event,handler){
  const el=$(id);
  if(!el){console.warn(`[HallValla] Elemento no encontrado: #${id}`);return null;}
  el.addEventListener(event,handler);
  return el;
}
function setText(id,value){const el=$(id);if(el)el.textContent=value;}
let lastBoardTargetTapAt=0;
function shouldDirectBoardTarget(){return !!(selectedCard||selectedUnitActionMode);}
function handleDirectBoardTargetEvent(ev,x,y){
  if(!shouldDirectBoardTarget())return false;
  const now=Date.now();
  if(ev&&ev.type==="click"&&now-lastBoardTargetTapAt<350){
    ev.preventDefault();
    ev.stopPropagation();
    return true;
  }
  lastBoardTargetTapAt=now;
  if(ev){ev.preventDefault();ev.stopPropagation();}
  cellClick(x,y);
  return true;
}

