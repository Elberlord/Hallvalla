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
const HALLVALLA_BUILD_VERSION=`v8_MODULAR_${globalThis.__HALLVALLA_BUILD__||"7BOARDCTRL8BH"}`;
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
function showEl(id){const el=$(id);if(el)el.classList.remove("hidden");}
function hideEl(id){const el=$(id);if(el)el.classList.add("hidden");}