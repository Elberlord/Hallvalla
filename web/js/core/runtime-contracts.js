"use strict";
/*
===============================================================================
HALLVALLA · CONTRATOS CANÓNICOS DEL MOTOR CONTINUO
-------------------------------------------------------------------------------
El juego ya no tiene turnos de jugador. Este módulo es la frontera de
compatibilidad con snapshots v239 o anteriores que todavía serializan nombres
históricos como turnKey / turnPhase / *TurnKey.

Código nuevo debe usar:
  combatWindowKey      -> identificador de ventana periódica del motor.
  runtimeMode          -> "continuous" o "prebattle".
  combatWindowIndex    -> índice técnico de la ventana.
  combatWindowStartedAt-> timestamp de inicio de la ventana cuando existe.
  *WindowKey           -> expiración / activación única por ventana.
  damagedThisWindow    -> daño recibido en la ventana actual.
  *UsedWindow          -> consumo único por ventana.
  cyclesRemaining      -> cuentas periódicas restantes.

Los aliases históricos SOLO se generan en la frontera Firebase para permitir
una transición limpia entre clientes de builds consecutivos. Ninguna regla de
gameplay nueva debe depender de ellos.
===============================================================================
*/
const HALLVALLA_RUNTIME_MODE_CONTINUOUS="continuous";
const HALLVALLA_RUNTIME_MODE_PREBATTLE="prebattle";

function hallvallaLegacyRuntimeModeToCanonical(value){
  const mode=String(value||"").toLowerCase();
  return mode==="prebattle"?HALLVALLA_RUNTIME_MODE_PREBATTLE:HALLVALLA_RUNTIME_MODE_CONTINUOUS;
}
function hallvallaCanonicalRuntimeModeToLegacy(value){
  return String(value||"").toLowerCase()===HALLVALLA_RUNTIME_MODE_PREBATTLE?"prebattle":"realtime";
}
function getCombatWindowKey(state=(typeof publicState!=="undefined"?publicState:null)){
  return String(state?.combatWindowKey||state?.turnKey||"RT-1");
}
function getCombatWindowIndex(state=(typeof publicState!=="undefined"?publicState:null)){
  const direct=Number(state?.combatWindowIndex);
  if(Number.isFinite(direct)&&direct>=0)return Math.floor(direct);
  const legacy=Number(state?.turn);
  if(Number.isFinite(legacy)&&legacy>=0)return Math.floor(legacy);
  const match=getCombatWindowKey(state).match(/(\d+)$/);
  return match?Math.max(0,Number(match[1])||0):1;
}
function getRuntimeMode(state=(typeof publicState!=="undefined"?publicState:null)){
  if(state?.runtimeMode)return hallvallaLegacyRuntimeModeToCanonical(state.runtimeMode);
  return hallvallaLegacyRuntimeModeToCanonical(state?.turnPhase);
}
function nextCombatWindowKey(state=(typeof publicState!=="undefined"?publicState:null)){
  return `RTC-${Math.max(1,getCombatWindowIndex(state)+1)}`;
}
function currentOrNextCombatWindowKey(_owner,state=(typeof publicState!=="undefined"?publicState:null)){
  // En combate concurrente no existe jugador "en turno". Los bloqueos creados
  // por una acción se asocian a la ventana actual; el refresco periódico los
  // limpia/renueva al abrir la siguiente ventana.
  return getCombatWindowKey(state);
}

function normalizeHallvallaRuntimeRecord(source){
  if(!source||typeof source!=="object"||Array.isArray(source))return source;
  const out={...source};
  for(const [key,value] of Object.entries(source)){
    if(key.endsWith("TurnKey")){
      const canonical=`${key.slice(0,-7)}WindowKey`;
      if(out[canonical]===undefined)out[canonical]=value;
      delete out[key];
    }
    if(key.endsWith("UsedTurn")){
      const canonical=`${key.slice(0,-8)}UsedWindow`;
      if(out[canonical]===undefined)out[canonical]=value;
      delete out[key];
    }
  }
  if(out.damagedThisWindow===undefined&&out.damagedThisTurn!==undefined)out.damagedThisWindow=!!out.damagedThisTurn;
  if(out.summonedWindowIndex===undefined&&out.summonedTurn!==undefined)out.summonedWindowIndex=Number(out.summonedTurn||0);
  if(out.summonedRuntimeMode===undefined&&out.summonedPhase!==undefined)out.summonedRuntimeMode=hallvallaLegacyRuntimeModeToCanonical(out.summonedPhase);
  if(out.bleedCyclesRemaining===undefined&&out.bleedTurnsRemaining!==undefined)out.bleedCyclesRemaining=Math.max(0,Number(out.bleedTurnsRemaining||0));
  if(out.veilCurseCyclesRemaining===undefined&&out.veilCurseTurnsRemaining!==undefined)out.veilCurseCyclesRemaining=Math.max(0,Number(out.veilCurseTurnsRemaining||0));
  delete out.damagedThisTurn;
  delete out.summonedTurn;
  delete out.summonedPhase;
  delete out.bleedTurnsRemaining;
  delete out.veilCurseTurnsRemaining;
  return out;
}
function normalizeHallvallaUndeadRemain(source){
  if(!source||typeof source!=="object")return source;
  const out={...source};
  if(out.cyclesRemaining===undefined&&out.turnsRemaining!==undefined)out.cyclesRemaining=Math.max(0,Number(out.turnsRemaining||0));
  if(out.baseCycles===undefined&&out.baseTurns!==undefined)out.baseCycles=Math.max(0,Number(out.baseTurns||0));
  delete out.turnsRemaining;
  delete out.baseTurns;
  return out;
}
function normalizeHallvallaRuntimePatch(source={}){
  if(!source||typeof source!=="object")return source;
  const out={...source};
  if(out.combatWindowKey===undefined&&out.turnKey!==undefined)out.combatWindowKey=String(out.turnKey||"RT-1");
  if(out.runtimeMode===undefined&&out.turnPhase!==undefined)out.runtimeMode=hallvallaLegacyRuntimeModeToCanonical(out.turnPhase);
  if(out.combatWindowIndex===undefined&&out.turn!==undefined)out.combatWindowIndex=Math.max(0,Number(out.turn||0));
  if(out.combatWindowStartedAt===undefined&&out.turnStartedAt!==undefined)out.combatWindowStartedAt=out.turnStartedAt;
  delete out.turnKey;
  delete out.turnPhase;
  delete out.turn;
  delete out.turnStartedAt;
  delete out.currentPlayer;
  if(Array.isArray(out.units))out.units=out.units.map(normalizeHallvallaRuntimeRecord);
  if(Array.isArray(out.undeadRemains))out.undeadRemains=out.undeadRemains.map(normalizeHallvallaUndeadRemain);
  return out;
}
function normalizeHallvallaRuntimeState(source={}){
  return normalizeHallvallaRuntimePatch(source||{});
}

function expandHallvallaLegacyRuntimeRecord(source){
  if(!source||typeof source!=="object"||Array.isArray(source))return source;
  const out={...source};
  for(const [key,value] of Object.entries(source)){
    if(key.endsWith("WindowKey")){
      const legacy=`${key.slice(0,-9)}TurnKey`;
      if(out[legacy]===undefined)out[legacy]=value;
    }
    if(key.endsWith("UsedWindow")){
      const legacy=`${key.slice(0,-10)}UsedTurn`;
      if(out[legacy]===undefined)out[legacy]=value;
    }
  }
  if(out.damagedThisWindow!==undefined&&out.damagedThisTurn===undefined)out.damagedThisTurn=!!out.damagedThisWindow;
  if(out.summonedWindowIndex!==undefined&&out.summonedTurn===undefined)out.summonedTurn=Number(out.summonedWindowIndex||0);
  if(out.summonedRuntimeMode!==undefined&&out.summonedPhase===undefined)out.summonedPhase=hallvallaCanonicalRuntimeModeToLegacy(out.summonedRuntimeMode);
  if(out.bleedCyclesRemaining!==undefined&&out.bleedTurnsRemaining===undefined)out.bleedTurnsRemaining=Math.max(0,Number(out.bleedCyclesRemaining||0));
  if(out.veilCurseCyclesRemaining!==undefined&&out.veilCurseTurnsRemaining===undefined)out.veilCurseTurnsRemaining=Math.max(0,Number(out.veilCurseCyclesRemaining||0));
  return out;
}
function expandHallvallaLegacyUndeadRemain(source){
  if(!source||typeof source!=="object")return source;
  const out={...source};
  if(out.cyclesRemaining!==undefined&&out.turnsRemaining===undefined)out.turnsRemaining=Math.max(0,Number(out.cyclesRemaining||0));
  if(out.baseCycles!==undefined&&out.baseTurns===undefined)out.baseTurns=Math.max(0,Number(out.baseCycles||0));
  return out;
}
function expandHallvallaLegacyRuntimePatch(source={}){
  if(!source||typeof source!=="object")return source;
  const out={...source};
  if(out.combatWindowKey!==undefined&&out.turnKey===undefined)out.turnKey=String(out.combatWindowKey||"RT-1");
  if(out.runtimeMode!==undefined&&out.turnPhase===undefined)out.turnPhase=hallvallaCanonicalRuntimeModeToLegacy(out.runtimeMode);
  if(out.combatWindowIndex!==undefined&&out.turn===undefined)out.turn=Math.max(0,Number(out.combatWindowIndex||0));
  if(out.combatWindowStartedAt!==undefined&&out.turnStartedAt===undefined)out.turnStartedAt=out.combatWindowStartedAt;
  // currentPlayer ya no tiene semántica de gameplay. Se conserva únicamente
  // como sentinel wire=0 mientras conviven clientes anteriores a v240.
  if(out.currentPlayer===undefined&&(out.runtimeMode!==undefined||out.combatWindowKey!==undefined))out.currentPlayer=0;
  if(Array.isArray(out.units))out.units=out.units.map(expandHallvallaLegacyRuntimeRecord);
  if(Array.isArray(out.undeadRemains))out.undeadRemains=out.undeadRemains.map(expandHallvallaLegacyUndeadRemain);
  return out;
}

globalThis.HALLVALLA_RUNTIME_MODE_CONTINUOUS=HALLVALLA_RUNTIME_MODE_CONTINUOUS;
globalThis.getCombatWindowKey=getCombatWindowKey;
globalThis.getCombatWindowIndex=getCombatWindowIndex;
globalThis.getRuntimeMode=getRuntimeMode;
globalThis.nextCombatWindowKey=nextCombatWindowKey;
globalThis.currentOrNextCombatWindowKey=currentOrNextCombatWindowKey;
globalThis.normalizeHallvallaRuntimeRecord=normalizeHallvallaRuntimeRecord;
globalThis.normalizeHallvallaRuntimePatch=normalizeHallvallaRuntimePatch;
globalThis.normalizeHallvallaRuntimeState=normalizeHallvallaRuntimeState;
globalThis.expandHallvallaLegacyRuntimePatch=expandHallvallaLegacyRuntimePatch;
