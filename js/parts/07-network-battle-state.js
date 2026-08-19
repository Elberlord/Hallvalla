"use strict";
/* HallValla STAGE8PRIV1 · Estado de red, creación de partidas y Firebase */
function hallvallaSanitizeFirebaseValue(value){
  const shared=globalThis.__HALLVALLA_SANITIZE_FIREBASE_VALUE__;
  if(typeof shared==="function")return shared(value);
  if(typeof value==="undefined")return undefined;
  if(value===null)return null;
  if(Array.isArray(value))return Array.from(value,item=>{
    const clean=hallvallaSanitizeFirebaseValue(item);
    return typeof clean==="undefined"?null:clean;
  });
  if(typeof value==="object"){
    const clean={};
    Object.entries(value).forEach(([key,item])=>{
      const safe=hallvallaSanitizeFirebaseValue(item);
      if(typeof safe!=="undefined")clean[key]=safe;
    });
    return clean;
  }
  return value;
}

const GAME_PRIVATE_PLAYER_KEYS=Object.freeze({1:"player1",2:"player2"});
function getGamePrivatePlayerKey(player){
  const safePlayer=Number(player);
  const key=GAME_PRIVATE_PLAYER_KEYS[safePlayer];
  if(!key)throw new Error(`[HallValla] Jugador privado inválido: ${player}`);
  return key;
}
function getGamePrivatePlayerPath(code,player){
  const safeCode=String(code||"").trim();
  if(!safeCode)throw new Error("[HallValla] No se puede resolver una ruta privada de partida sin código de partida.");
  return `games/${safeCode}/private/${getGamePrivatePlayerKey(player)}`;
}
function getGamePrivatePlayerRef(code,player){
  return ref(db,getGamePrivatePlayerPath(code,player));
}

/* --------------------------------------------------------------------------
   ETAPA 8 · PRIVACIDAD REAL DE SIGILO / OCULTO
   --------------------------------------------------------------------------
   Contrato de red:
   - Una unidad que siga bajo Sigilo NO viaja dentro de /public/units.
   - Su estado completo vive solamente en /private/playerN/stealthBoard/units.
   - El dueño recompone su vista local mezclando public + su bóveda privada.
   - El rival jamás recibe id, key, nombre, estadísticas ni coordenadas de esa
     unidad a través del snapshot público.
   - Los FX que dependan de una unidad aún oculta se redaccionan en public y se
     conserva la versión completa únicamente en la rama privada del dueño.
   -------------------------------------------------------------------------- */
const HALLVALLA_STAGE8_PRIVACY_MODE="stealth_private_v1";
const HALLVALLA_STAGE8_STEALTH_SCHEMA="hallvalla-stealth-private-v1";
const HALLVALLA_STAGE8_FX_KEYS=Object.freeze(["battleFxEvent","defenseFxEvent","dodgeFxEvent","statusFxEvent","floatFxEvent"]);
let networkPublicStateRaw=null;
let stage8PrivacyReconcileInFlight=false;
let stage8AreaDamageReconcileInFlight=false;
let stage8LastDetectionEventId="";
let stage8LastAreaDamageEventId="";

function isStage8PrivateStealthMode(state=publicState){
  return !!state&&state.mode==="online"&&state.privacyMode===HALLVALLA_STAGE8_PRIVACY_MODE;
}
function normalizeStage8StealthVaultUnits(value){
  if(Array.isArray(value))return value.filter(Boolean);
  if(value&&typeof value==="object")return Object.values(value).filter(Boolean);
  return [];
}
function getStage8OwnStealthVaultUnits(priv=privateState,owner=myPlayer){
  const safeOwner=Number(owner||0);
  if(!safeOwner)return[];
  return normalizeStage8StealthVaultUnits(priv?.stealthBoard?.units).filter(u=>u&&Number(u.owner)===safeOwner&&isStealthedUnit(u));
}
function stage8StealthUnitsToObject(units=[]){
  const out={};
  for(const unit of units||[]){
    if(!unit||!unit.id)continue;
    const key=String(unit.id).replace(/[.#$\[\]\/]/g,"_");
    out[key]=unit;
  }
  return Object.keys(out).length?out:null;
}
function stage8FxTouchesHiddenUnit(event,hiddenIds){
  if(!event||typeof event!=="object"||Array.isArray(event)||!hiddenIds?.size)return false;
  return [event.attackerId,event.targetId,event.unitId].some(id=>id&&hiddenIds.has(String(id)));
}
function redactStage8PrivateFxEvent(event){
  if(!event||typeof event!=="object"||Array.isArray(event))return event;
  return {
    eventId:String(event.eventId||`${Date.now()}_${Math.random().toString(36).slice(2,8)}`),
    type:"private_stealth",
    privateStealthEvent:true
  };
}
function composeStage8ViewerPublicState(rawPublic,priv=privateState,owner=myPlayer){
  if(!rawPublic||!isStage8PrivateStealthMode(rawPublic))return rawPublic;
  const visibleUnits=Array.isArray(rawPublic.units)?rawPublic.units:[];
  const ownHidden=getStage8OwnStealthVaultUnits(priv,owner);
  const byId=new Map();
  for(const unit of visibleUnits){if(unit?.id)byId.set(String(unit.id),unit);}
  for(const unit of ownHidden){if(unit?.id)byId.set(String(unit.id),unit);}
  const out={...rawPublic,units:[...byId.values()]};
  const privateEvents=priv?.stealthBoard?.privateEvents||{};
  for(const key of HALLVALLA_STAGE8_FX_KEYS){
    const publicEvent=rawPublic?.[key];
    const privateEvent=privateEvents?.[key];
    if(publicEvent?.privateStealthEvent===true&&privateEvent?.eventId&&String(privateEvent.eventId)===String(publicEvent.eventId||"")){
      out[key]=privateEvent;
    }
  }
  return out;
}
function projectStage8StealthPatchForNetwork(sourcePatch={},owner=myPlayer){
  const patch={...(sourcePatch||{})};
  if(!isStage8PrivateStealthMode(publicState)&&patch.privacyMode!==HALLVALLA_STAGE8_PRIVACY_MODE){
    return{publicPatch:patch,privatePatch:{},visibilityUnits:Array.isArray(patch.units)?patch.units:(publicState?.units||[])};
  }
  const safeOwner=Number(owner||0);
  const visibilityUnits=Array.isArray(patch.units)?patch.units:(publicState?.units||[]);
  const hiddenUnits=(Array.isArray(visibilityUnits)?visibilityUnits:[]).filter(u=>u&&!u.leader&&isStealthedUnit(u));
  const ownHidden=hiddenUnits.filter(u=>Number(u.owner)===safeOwner);
  const hiddenIds=new Set(hiddenUnits.map(u=>String(u.id||"")).filter(Boolean));
  const ownHiddenIds=new Set(ownHidden.map(u=>String(u.id||"")).filter(Boolean));
  const publicPatch={...patch};
  const privatePatch={};
  if(Array.isArray(patch.units)){
    publicPatch.units=patch.units.filter(u=>!u||u.leader||!isStealthedUnit(u));
    privatePatch["stealthBoard/schema"]=HALLVALLA_STAGE8_STEALTH_SCHEMA;
    privatePatch["stealthBoard/units"]=stage8StealthUnitsToObject(ownHidden);
    privatePatch["stealthBoard/updatedAt"]=Date.now();
  }
  for(const key of HALLVALLA_STAGE8_FX_KEYS){
    if(!Object.prototype.hasOwnProperty.call(patch,key))continue;
    const event=patch[key];
    if(stage8FxTouchesHiddenUnit(event,hiddenIds)){
      publicPatch[key]=redactStage8PrivateFxEvent(event);
      if(stage8FxTouchesHiddenUnit(event,ownHiddenIds))privatePatch[`stealthBoard/privateEvents/${key}`]=event;
    }else{
      privatePatch[`stealthBoard/privateEvents/${key}`]=null;
    }
  }
  return{publicPatch,privatePatch,visibilityUnits};
}
globalThis.__HALLVALLA_STAGE8_PRIVACY_DEBUG__=()=>{
  const raw=networkPublicStateRaw||null;
  const rawUnits=Array.isArray(raw?.units)?raw.units:[];
  const ownHidden=getStage8OwnStealthVaultUnits(privateState,myPlayer);
  const composed=composeStage8ViewerPublicState(raw,privateState,myPlayer);
  return{
    enabled:isStage8PrivateStealthMode(raw),
    privacyMode:String(raw?.privacyMode||""),
    publicUnitCount:rawUnits.length,
    publicHiddenUnitCount:rawUnits.filter(u=>isStealthedUnit(u)).length,
    privateOwnHiddenUnitCount:ownHidden.length,
    viewerUnitCount:Array.isArray(composed?.units)?composed.units.length:0,
    invariantPublicContainsNoStealth:rawUnits.every(u=>!isStealthedUnit(u))
  };
};

function makeStage8StealthAreaDamageEvent(sourceOwner,targetOwner,payload={}){
  if(!isStage8PrivateStealthMode(publicState))return null;
  const safeSource=Number(sourceOwner||0),safeTarget=Number(targetOwner||0);
  if(!safeSource||!safeTarget||safeSource===safeTarget)return null;
  const kind=String(payload.kind||"");
  if(!["global_direct_hp","cell_direct_hp","cell_guard_damage","cell_attack_damage"].includes(kind))return null;
  const event={
    eventId:`${Date.now()}_${Math.random().toString(36).slice(2,8)}`,
    sourceOwner:safeSource,targetOwner:safeTarget,kind,
    label:String(payload.label||"Daño de área").slice(0,96),
    turnKey:String(publicState?.turnKey||"")
  };
  if(kind==="global_direct_hp")event.damage=Math.max(0,Number(payload.damage||0));
  if(kind==="cell_direct_hp"||kind==="cell_guard_damage"||kind==="cell_attack_damage"){
    event.cells=(Array.isArray(payload.cells)?payload.cells:[]).map(cell=>({
      x:Number(cell.x),y:Number(cell.y),damage:Math.max(0,Number(cell.damage||0)),
      pushDx:Number(cell.pushDx||0),pushDy:Number(cell.pushDy||0),pushSteps:Math.max(0,Number(cell.pushSteps||0))
    })).filter(cell=>Number.isFinite(cell.x)&&Number.isFinite(cell.y)&&cell.damage>0).slice(0,64);
    event.element=String(payload.element||"");
    event.sourceName=String(payload.sourceName||payload.label||"Daño de área").slice(0,96);
    event.sourceKey=String(payload.sourceKey||"");
    event.dragonStage=String(payload.dragonStage||"");
    event.statusStacks=Math.max(0,Number(payload.statusStacks||0));
    event.attackScore=Math.max(0,Number(payload.attackScore||0));
    event.defenderAgi=Number(payload.defenderAgi||0);
    event.applyBeastmasterVenom=!!payload.applyBeastmasterVenom;
  }
  return event;
}

function makeStage8StealthDetectionEvent(detectorOwner,center,radius,reason="detección"){
  if(!isStage8PrivateStealthMode(publicState))return null;
  const x=Number(center?.x),y=Number(center?.y);
  if(!Number.isFinite(x)||!Number.isFinite(y))return null;
  return{
    eventId:`${Date.now()}_${Math.random().toString(36).slice(2,8)}`,
    detectorOwner:Number(detectorOwner||0),
    center:{x,y},
    radius:Math.max(0,Number(radius||0)),
    reason:String(reason||"detección").slice(0,96),
    turnKey:String(publicState?.turnKey||"")
  };
}
async function maybeResolveStage8StealthAreaDamage(){
  if(stage8AreaDamageReconcileInFlight||!gameId||!isStage8PrivateStealthMode(networkPublicStateRaw||publicState)||!privateState)return false;
  const owner=Number(myPlayer||0);
  if(!owner)return false;
  const raw=networkPublicStateRaw||publicState;
  const event=raw?.stealthAreaDamageEvent||null;
  if(!event?.eventId||Number(event.targetOwner||0)!==owner||Number(event.sourceOwner||0)===owner)return false;
  const eventId=String(event.eventId);
  const privateAck=String(privateState?.stealthBoard?.lastAreaDamageEventId||"");
  if(eventId===privateAck||eventId===stage8LastAreaDamageEventId)return false;
  stage8LastAreaDamageEventId=eventId;
  let hidden=getStage8OwnStealthVaultUnits(privateState,owner);
  const hitIds=[];
  if(String(event.kind||"")==="global_direct_hp"){
    const damage=Math.max(0,Number(event.damage||0));
    if(damage>0){
      hidden=hidden.map(unit=>{
        if(!canReceiveUntargetedAreaEffect(unit))return unit;
        hitIds.push(String(unit.id||""));
        const result=typeof applyDirectHpDamageWithEquipment==="function"?applyDirectHpDamageWithEquipment(unit,damage):{unit:{...unit,hp:Number(unit.hp||0)-damage}};
        return {...result.unit,damagedThisTurn:true};
      });
    }
  }else if(String(event.kind||"")==="cell_direct_hp"){
    const cellMap=new Map((Array.isArray(event.cells)?event.cells:[]).map(cell=>[`${Number(cell.x)},${Number(cell.y)}`,cell]));
    hidden=hidden.map(unit=>{
      if(!canReceiveUntargetedAreaEffect(unit))return unit;
      const cell=cellMap.get(`${Number(unit.x)},${Number(unit.y)}`);
      if(!cell)return unit;
      const damage=Math.max(0,Number(cell.damage||0));
      if(damage<=0)return unit;
      hitIds.push(String(unit.id||""));
      const result=typeof applyDirectHpDamageWithEquipment==="function"?applyDirectHpDamageWithEquipment(unit,damage):{unit:{...unit,hp:Number(unit.hp||0)-damage}};
      return {...result.unit,damagedThisTurn:true};
    });
  }else if(String(event.kind||"")==="cell_guard_damage"){
    const cellMap=new Map((Array.isArray(event.cells)?event.cells:[]).map(cell=>[`${Number(cell.x)},${Number(cell.y)}`,cell]));
    const attackerRef={name:String(event.sourceName||event.label||"Daño de área"),key:String(event.sourceKey||""),owner:Number(event.sourceOwner||0),dragonElement:String(event.element||""),dragonStage:String(event.dragonStage||"adult")};
    hidden=hidden.map(unit=>{
      if(!canReceiveUntargetedAreaEffect(unit))return unit;
      const cell=cellMap.get(`${Number(unit.x)},${Number(unit.y)}`);
      if(!cell)return unit;
      const damage=Math.max(0,Number(cell.damage||0));
      if(damage<=0)return unit;
      hitIds.push(String(unit.id||""));
      let next=typeof applyGuardDamage==="function"?applyGuardDamage(unit,damage):{...unit,hp:Number(unit.hp||0)-damage};
      next={...next,damagedThisTurn:true};
      if(Number(next.hp||0)>0&&Number(event.statusStacks||0)>0&&typeof applyDragonCompanionElementStatus==="function"){
        next=applyDragonCompanionElementStatus(next,attackerRef,Number(event.statusStacks||0),publicState);
      }
      return next;
    });
  }else if(String(event.kind||"")==="cell_attack_damage"){
    const cellMap=new Map((Array.isArray(event.cells)?event.cells:[]).map(cell=>[`${Number(cell.x)},${Number(cell.y)}`,cell]));
    const visible=Array.isArray(raw?.units)?raw.units:[];
    const attackerRef={name:String(event.sourceName||event.label||"Impacto de área"),key:String(event.sourceKey||""),owner:Number(event.sourceOwner||0)};
    const nextHidden=[...hidden];
    for(let i=0;i<nextHidden.length;i++){
      const unit=nextHidden[i];
      if(!canReceiveUntargetedAreaEffect(unit))continue;
      const cell=cellMap.get(`${Number(unit.x)},${Number(unit.y)}`);
      if(!cell)continue;
      const attackScore=Math.max(0,Number(event.attackScore||0));
      const defenseScore=typeof getDefenseEvasionScore==="function"?Math.max(0,Number(getDefenseEvasionScore(unit,{defenderAgi:Number(event.defenderAgi||0)})||0)):0;
      if(attackScore<defenseScore)continue;
      let damage=Math.max(0,Number(cell.damage||0));
      if(typeof reduceDamageForHoneyBadger==="function")damage=reduceDamageForHoneyBadger(unit,damage);
      if(damage<=0)continue;
      hitIds.push(String(unit.id||""));
      let next=typeof applyGuardDamage==="function"?applyGuardDamage(unit,damage):{...unit,hp:Number(unit.hp||0)-damage};
      const hpLoss=Math.max(0,Number(next?.lastHpLoss||0));
      delete next.lastGuardLoss;delete next.lastHpLoss;
      next={...next,damagedThisTurn:hpLoss>0||!!next.damagedThisTurn};
      if(hpLoss>0&&event.applyBeastmasterVenom&&typeof applyBeastmasterVenomToTarget==="function"){
        next=(typeof isPoisonImmuneUnit==="function"&&isPoisonImmuneUnit(next)&&typeof clearPoisonStatus==="function")?clearPoisonStatus(next):applyBeastmasterVenomToTarget(next,attackerRef,5);
      }
      const steps=Math.max(0,Number(cell.pushSteps||0)),dx=Math.sign(Number(cell.pushDx||0)),dy=Math.sign(Number(cell.pushDy||0));
      for(let step=0;step<steps&&Number(next.hp||0)>0;step++){
        const nx=Number(next.x||0)+dx,ny=Number(next.y||0)+dy;
        if(nx<0||nx>=COLS||ny<0||ny>=ROWS)break;
        const occupied=visible.some(u=>u&&Number(u.hp||0)>0&&Number(u.x)===nx&&Number(u.y)===ny)||nextHidden.some((u,j)=>j!==i&&u&&Number(u.hp||0)>0&&Number(u.x)===nx&&Number(u.y)===ny);
        if(occupied)break;
        next={...next,x:nx,y:ny};
      }
      nextHidden[i]=next;
    }
    hidden=nextHidden;
  }
  if(hitIds.length&&typeof applyLegendaryFatalSaves==="function")hidden=applyLegendaryFatalSaves(hidden,hitIds);
  hidden=hidden.filter(unit=>Number(unit.hp||0)>0);
  stage8AreaDamageReconcileInFlight=true;
  try{
    return await updatePrivate({
      "stealthBoard/schema":HALLVALLA_STAGE8_STEALTH_SCHEMA,
      "stealthBoard/units":stage8StealthUnitsToObject(hidden),
      "stealthBoard/lastAreaDamageEventId":eventId,
      "stealthBoard/updatedAt":Date.now()
    });
  }finally{
    stage8AreaDamageReconcileInFlight=false;
  }
}

async function maybeResolveStage8StealthDetectionAndAura(){
  if(stage8PrivacyReconcileInFlight||!gameId||!isStage8PrivateStealthMode(networkPublicStateRaw||publicState)||!privateState)return false;
  const owner=Number(myPlayer||0);
  if(!owner)return false;
  const hidden=getStage8OwnStealthVaultUnits(privateState,owner);
  if(!hidden.length)return false;
  const raw=networkPublicStateRaw||publicState;
  const visible=Array.isArray(raw?.units)?raw.units:[];
  const detection=raw?.stealthDetectionEvent||null;
  const revealIds=new Set();
  let reason="detección";
  let detectionEventId="";
  if(detection?.eventId&&Number(detection.detectorOwner||0)!==owner&&String(detection.eventId)!==stage8LastDetectionEventId){
    detectionEventId=String(detection.eventId);
    stage8LastDetectionEventId=detectionEventId;
    const center=detection.center||{};
    const radius=Math.max(0,Number(detection.radius||0));
    reason=String(detection.reason||"detección");
    for(const unit of hidden){if(dist(unit,center)<=radius)revealIds.add(String(unit.id));}
  }
  const enemyMongols=visible.filter(u=>u&&u.key==="mongol_explorer"&&Number(u.hp||0)>0&&Number(u.owner)!==owner);
  if(enemyMongols.length){
    for(const unit of hidden){
      if(enemyMongols.some(m=>dist(m,unit)<=2)){revealIds.add(String(unit.id));reason="Ojos de la estepa";}
    }
  }
  if(!revealIds.size){
    if(detectionEventId){
      try{await update(ref(db,`games/${gameId}/public`),{stealthDetectionAck:{eventId:detectionEventId,owner,count:0,at:Date.now()}});}catch(_){ }
    }
    return false;
  }
  const merged=composeStage8ViewerPublicState(raw,privateState,owner);
  const nextUnits=(merged?.units||[]).map(u=>revealIds.has(String(u.id||""))?revealUnit(u,reason):u);
  stage8PrivacyReconcileInFlight=true;
  try{
    const count=revealIds.size;
    const patch={
      units:nextUnits,
      stealthDetectionAck:{eventId:detectionEventId||`aura_${Date.now()}`,owner,count,at:Date.now()},
      log:[`${count} presencia${count===1?"":"s"} oculta${count===1?"":"s"} ${count===1?"fue revelada":"fueron reveladas"} por ${reason}.`,...(raw?.log||[])].slice(0,18)
    };
    return await updatePublic(patch);
  }finally{
    stage8PrivacyReconcileInFlight=false;
  }
}

/* El lobby PvP legacy fue eliminado del runtime. */

function getStealthUnitsForSharedVisibility(units=publicState?.units||[]){
  return (Array.isArray(units)?units:[]).filter(u=>u&&!u.leader&&isStealthedUnit(u));
}
function sanitizeSharedStealthText(text,units=publicState?.units||[]){
  let out=String(text??"");
  for(const hiddenUnit of getStealthUnitsForSharedVisibility(units)){
    const name=String(hiddenUnit.name||"").trim();
    if(!name||!out.includes(name))continue;
    if(isStage8PrivateStealthMode(publicState)){
      return `J${Number(hiddenUnit.owner||0)||"?"}: una presencia oculta realizó una acción.`;
    }
    out=out.split(name).join("Presencia oculta");
  }
  return out;
}
function sanitizeSharedStealthFxEvent(event,units=publicState?.units||[]){
  if(!event||typeof event!=="object"||Array.isArray(event))return event;
  const hiddenById=new Map(getStealthUnitsForSharedVisibility(units).map(u=>[String(u.id||""),u]));
  const out={...event};
  const attackerHidden=hiddenById.has(String(out.attackerId||""));
  const targetHidden=hiddenById.has(String(out.targetId||""));
  const unitHidden=hiddenById.has(String(out.unitId||""));
  if(attackerHidden){
    // No destruimos claves visuales/sonoras: el mismo evento lo consume también
    // el dueño de la unidad. Solo se neutraliza metadata textual compartida.
    out.attackerName="Presencia oculta";
    out.attackerText="";
  }
  if(targetHidden)out.targetName="Presencia oculta";
  if(unitHidden)out.unitName="Presencia oculta";
  return out;
}
function sanitizeSharedStealthPatch(patch,units=publicState?.units||[]){
  const out={...(patch||{})};
  if(Array.isArray(out.log))out.log=out.log.map(line=>sanitizeSharedStealthText(line,units));
  if(typeof out.aiActionText==="string")out.aiActionText=sanitizeSharedStealthText(out.aiActionText,units);
  for(const key of ["battleFxEvent","defenseFxEvent","dodgeFxEvent","statusFxEvent","floatFxEvent"]){
    if(out[key])out[key]=sanitizeSharedStealthFxEvent(out[key],units);
  }
  return out;
}

const BATTLE_RESULT_SPLASH_DURATION_MS=4300;
function isHiddenUnitCard(card){
  return !!card&&(card.hiddenUnitTag==="unit"||card.type==="unit");
}
function countHiddenUnitCards(cards=[]){
  return (cards||[]).reduce((count,card)=>count+(isHiddenUnitCard(card)?1:0),0);
}
function countHiddenUnitReserveFromState(state={}){
  return countHiddenUnitCards([...(state?.deck||[]),...(state?.hand||[])]);
}
function getOwnerHasHiddenUnits(owner,state=publicState){
  const safeOwner=Number(owner||0);
  if(!safeOwner||!state)return null;
  if(state.mode==="adventure"){
    if(safeOwner===2){
      const ai=state.adventureAiState||{};
      return countHiddenUnitCards([...(ai.deck||[]),...(ai.hand||[])])>0;
    }
    if(safeOwner===Number(myPlayer)&&privateState){
      return countHiddenUnitReserveFromState(privateState)>0;
    }
  }
  if(safeOwner===Number(myPlayer)&&privateState){
    return countHiddenUnitReserveFromState(privateState)>0;
  }
  const raw=state.playerStats?.[safeOwner]?.hasHiddenUnits;
  if(raw===null||typeof raw==="undefined")return null;
  return raw===true;
}
function isOwnerOutOfUnits(owner,units=publicState?.units||[],state=publicState){
  if(hasLivingNonLeaderUnitsForOwner(owner,units))return false;
  const hasHiddenUnits=getOwnerHasHiddenUnits(owner,state);
  return hasHiddenUnits===false;
}
function getUnitExhaustionOutcome(units=publicState?.units||[],state=publicState){
  if(!state||state.mode==="tutorial")return null;
  const p1Out=isOwnerOutOfUnits(1,units,state);
  const p2Out=isOwnerOutOfUnits(2,units,state);
  if(!p1Out&&!p2Out)return null;
  const p1Leader=(units||[]).find(u=>u.owner===1&&u.leader)||null;
  const p2Leader=(units||[]).find(u=>u.owner===2&&u.leader)||null;
  if(p1Out&&p2Out)return{ended:true,winner:0,loser:0,p1Leader,p2Leader,reason:"unit_exhaustion_draw"};
  if(p1Out)return{ended:true,winner:2,loser:1,p1Leader,p2Leader,reason:"unit_exhaustion"};
  return{ended:true,winner:1,loser:2,p1Leader,p2Leader,reason:"unit_exhaustion"};
}
function getUnitExhaustionOutcomeText(outcome){
  if(!outcome||!String(outcome.reason||"").startsWith("unit_exhaustion"))return "";
  if(outcome.reason==="unit_exhaustion_draw")return "Ambos jugadores se quedaron sin unidades en el mazo, la mano y el campo. La partida termina en empate.";
  return `J${outcome.loser} se quedó sin unidades en el mazo, la mano y el campo. Gana J${outcome.winner}.`;
}
let unitExhaustionFinalizeLock=false;
async function maybeFinalizeUnitExhaustionFromPublicState(){
  if(unitExhaustionFinalizeLock||!gameId||!publicState||isBattleEnded()||publicState.mode==="tutorial")return false;
  if(publicState.mode!=="adventure"&&Number(publicState.currentPlayer||0)!==Number(myPlayer||0))return false;
  const exhaustionState=publicState.mode==="adventure"?(networkPublicStateRaw||publicState):publicState;
  const visibleUnits=publicState.units||exhaustionState.units||[];
  const outcome=getUnitExhaustionOutcome(visibleUnits,exhaustionState);
  if(!outcome?.ended)return false;
  unitExhaustionFinalizeLock=true;
  try{
    return await finalizeBattle(visibleUnits,"",exhaustionState);
  }finally{
    unitExhaustionFinalizeLock=false;
  }
}
function normalizeHiddenUnitStatsPatch(patch){
  const out={...(patch||{})};
  for(const owner of [1,2]){
    const key=`playerStats/${owner}`;
    if(!out[key]||typeof out[key]!=="object"||Array.isArray(out[key]))continue;
    let hasHiddenUnits=out[key].hasHiddenUnits;
    if(hasHiddenUnits===null||typeof hasHiddenUnits==="undefined"){
      if(owner===Number(myPlayer)&&privateState)hasHiddenUnits=countHiddenUnitReserveFromState(privateState)>0;
      else hasHiddenUnits=publicState?.playerStats?.[owner]?.hasHiddenUnits;
    }
    if(hasHiddenUnits!==null&&typeof hasHiddenUnits!=="undefined"){
      out[key]={...out[key],hasHiddenUnits:hasHiddenUnits===true};
    }
  }
  if(out.adventureAiState&&typeof out.adventureAiState==="object"&&publicState?.mode==="adventure"){
    const nextAi={...(publicState?.adventureAiState||{}),...out.adventureAiState};
    out["playerStats/2/hasHiddenUnits"]=countHiddenUnitCards([...(nextAi.deck||[]),...(nextAi.hand||[])])>0;
  }
  return out;
}
function getBattleOutcomeSplashElement(){
  let overlay=document.getElementById("battleOutcomeSplash");
  if(overlay)return overlay;
  overlay=document.createElement("div");
  overlay.id="battleOutcomeSplash";
  overlay.className="battle-outcome-splash";
  overlay.setAttribute("aria-live","assertive");
  overlay.setAttribute("aria-atomic","true");
  overlay.innerHTML='<img class="battle-outcome-splash-art" alt=""><div class="battle-outcome-draw-text" aria-hidden="true">EMPATE</div><div class="battle-outcome-actions" aria-hidden="true"><button class="battle-outcome-action primary" type="button" data-battle-outcome-action="map">Ir al mapa</button><button class="battle-outcome-action primary" type="button" data-battle-outcome-action="retry">Volver a intentarlo</button><button class="battle-outcome-action ghost" type="button" data-battle-outcome-action="home">Ir a Home</button></div>';
  const actions=overlay.querySelector(".battle-outcome-actions");
  if(actions){
    actions.addEventListener("click",ev=>{
      const btn=ev.target.closest("[data-battle-outcome-action]");
      if(!btn)return;
      const action=btn.dataset.battleOutcomeAction||"";
      btn.disabled=true;
      if(action==="map")showAdventureMapFromResult();
      else if(action==="retry")retryCurrentAdventureBattle();
      else if(action==="home")backToMainMenu();
    });
  }
  document.body.appendChild(overlay);
  return overlay;
}
function hideBattleOutcomeSplash(immediate=false){
  battleClearTimeout(showBattleOutcomeSplash._timer);
  const overlay=document.getElementById("battleOutcomeSplash");
  if(!overlay)return;
  overlay.classList.remove("show","victory","defeat","draw","awaiting-action");
  const actions=overlay.querySelector(".battle-outcome-actions");
  if(actions){
    actions.setAttribute("aria-hidden","true");
    actions.querySelectorAll("button").forEach(btn=>{btn.hidden=false;btn.disabled=false;});
  }
  if(immediate)overlay.remove();
}
function showBattleOutcomeSplash(result,{adventure=false}={}){
  const overlay=getBattleOutcomeSplashElement();
  const img=overlay.querySelector(".battle-outcome-splash-art");
  const drawText=overlay.querySelector(".battle-outcome-draw-text");
  const actions=overlay.querySelector(".battle-outcome-actions");
  overlay.classList.remove("show","victory","defeat","draw","awaiting-action");
  battleClearTimeout(showBattleOutcomeSplash._timer);
  if(actions){
    actions.setAttribute("aria-hidden","true");
    actions.querySelectorAll("button").forEach(btn=>{btn.hidden=false;btn.disabled=false;});
  }
  void overlay.offsetWidth;
  if(result==="draw"){
    overlay.classList.add("draw");
    if(img){img.removeAttribute("src");img.alt="";}
    if(drawText)drawText.setAttribute("aria-hidden","false");
    overlay.setAttribute("aria-label","Empate");
  }else{
    const victory=result==="victory";
    overlay.classList.add(victory?"victory":"defeat");
    if(img){
      img.src=victory?"assets/ui/battle_results/victory_blue.webp":"assets/ui/battle_results/defeat_red.webp";
      img.alt=victory?"Has ganado la partida":"Has sido derrotado";
    }
    if(drawText)drawText.setAttribute("aria-hidden","true");
    overlay.setAttribute("aria-label",victory?"Has ganado la partida":"Has sido derrotado");
  }
  if(adventure&&actions){
    const mapBtn=actions.querySelector('[data-battle-outcome-action="map"]');
    const retryBtn=actions.querySelector('[data-battle-outcome-action="retry"]');
    if(mapBtn)mapBtn.hidden=result!=="victory";
    if(retryBtn)retryBtn.hidden=result==="victory";
    actions.setAttribute("aria-hidden","false");
    overlay.classList.add("awaiting-action");
  }
  overlay.classList.add("show");
  if(!adventure){
    showBattleOutcomeSplash._timer=battleSetTimeout(()=>{showBattleOutcomeSplash._timer=null;hideBattleOutcomeSplash(false);},BATTLE_RESULT_SPLASH_DURATION_MS+120,"battle-outcome-splash");
  }
}
async function normalizePublicPatchBeforeCommit(sourcePatch={},options={}){
  const beforeUnits=Array.isArray(publicState?.units)?publicState.units:[];
  let cleanPatch={...(sourcePatch||{})};
  if(Array.isArray(cleanPatch.units)){
    const baseGraveyard=Array.isArray(cleanPatch.erictoGraveyard)?cleanPatch.erictoGraveyard:(publicState?.erictoGraveyard||[]);
    cleanPatch.erictoGraveyard=captureErictoGraveyard(baseGraveyard,beforeUnits,cleanPatch.units);
    const solomonLife=await resolveSolomonLifecycle(beforeUnits,cleanPatch.units);
    const erictoLife=resolveErictoLifecycle(solomonLife.units);
    const mongolAura=applyMongolExplorerAura(erictoLife.units);
    cleanPatch.units=mongolAura.units;
    const lifeLogs=[...(solomonLife.logs||[]),...(erictoLife.logs||[]),...(mongolAura.count?[`Ojos de la estepa revela ${mongolAura.count} unidad${mongolAura.count===1?"":"es"} con Sigilo.`]:[])];
    if(lifeLogs.length)cleanPatch.log=[...lifeLogs,...(cleanPatch.log||publicState?.log||[])].slice(0,18);
  }
  delete cleanPatch._clockKillCreditOwner;
  delete cleanPatch._clockKillCreditMode;
  delete cleanPatch._clockKillIgnoreIds;
  cleanPatch=normalizeHiddenUnitStatsPatch(cleanPatch);
  if(options.sanitizeFirebase===true)cleanPatch=hallvallaSanitizeFirebaseValue(cleanPatch)||{};
  return{patch:cleanPatch,beforeUnits};
}
async function updatePublic(patch){
  if(isTurnWriteBlockedByExpiredClock())return false;
  const writeGameId=gameId;
  const writeLifecycleToken=getBattleLifecycleToken();
  const writeContextActive=()=>writeGameId&&gameId===writeGameId&&isBattleLifecycleTokenActive(writeLifecycleToken);
  if(!writeContextActive())return false;
  const sourcePatch=patch||{};
  const normalized=await normalizePublicPatchBeforeCommit(sourcePatch);
  const beforeUnits=normalized.beforeUnits;
  const cleanPatch=normalized.patch;
  const accountMasteryKillAfter=Array.isArray(cleanPatch.units)?[...(cleanPatch.units||[])]:null;
  const localFullPatch={...cleanPatch};
  const privacyProjection=projectStage8StealthPatchForNetwork(cleanPatch,myPlayer);
  const sharedVisibilityUnits=privacyProjection.visibilityUnits;
  let publicWritePatch=sanitizeSharedStealthPatch(privacyProjection.publicPatch,sharedVisibilityUnits);
  publicWritePatch=hallvallaSanitizeFirebaseValue(publicWritePatch)||{};
  const privateStealthPatch=hallvallaSanitizeFirebaseValue(privacyProjection.privatePatch)||{};
  if(!writeContextActive())return false;
  if(hallvallaIsLocalTestGame()){
    const prevPublic=publicState?JSON.parse(JSON.stringify(publicState)):null;
    publicState=hallvallaApplyLocalPatch(publicState,localFullPatch);
    if(accountMasteryKillAfter){
      if(typeof registerAccountMasterySummonsFromUnitDiff==="function")registerAccountMasterySummonsFromUnitDiff(beforeUnits,accountMasteryKillAfter);
      if(typeof registerAccountMasteryKillsFromUnitDiff==="function")registerAccountMasteryKillsFromUnitDiff(beforeUnits,accountMasteryKillAfter,sourcePatch);
    }
    render();syncBattleMusic();maybePlayBattleFx(prevPublic,publicState);maybeProcessVeilCurseKillEvent(prevPublic,publicState);maybeShowBattleResult();void maybeFinalizeUnitExhaustionFromPublicState();maybeStartTurn();maybeTriggerAdventureAI();return true;
  }
  if(isStage8PrivateStealthMode(publicState)&&Object.keys(privateStealthPatch).length){
    const rootPatch={};
    for(const [key,value] of Object.entries(publicWritePatch))rootPatch[`public/${key}`]=value;
    for(const [key,value] of Object.entries(privateStealthPatch))rootPatch[`private/${getGamePrivatePlayerKey(myPlayer)}/${key}`]=value;
    await update(ref(db,`games/${writeGameId}`),rootPatch);
  }else{
    await update(ref(db,`games/${writeGameId}/public`),publicWritePatch);
  }
  if(accountMasteryKillAfter){
    if(typeof registerAccountMasterySummonsFromUnitDiff==="function")registerAccountMasterySummonsFromUnitDiff(beforeUnits,accountMasteryKillAfter);
    if(typeof registerAccountMasteryKillsFromUnitDiff==="function")registerAccountMasteryKillsFromUnitDiff(beforeUnits,accountMasteryKillAfter,sourcePatch);
  }
  return true;
}
let pvpStep6fAtomicActionInFlight=false;
function isPvpStep6fAtomicActionMode(state=publicState){
  return !!state&&state.mode==="online"&&state.phase==="active"&&state.pvpAtomicActionMode==="multipath_v1"&&state.pvpStep6fMode==="unit_summon_only";
}
async function commitPvpStep6fAtomicAction(publicPatch={},privatePatch={}){
  if(pvpStep6fAtomicActionInFlight)return false;
  if(!gameId||!publicState||!privateState||!isPvpStep6fAtomicActionMode(publicState))return false;
  if(Number(publicState.currentPlayer||0)!==Number(myPlayer||0))return false;
  pvpStep6fAtomicActionInFlight=true;
  const writeGameId=gameId;
  const writePlayer=Number(myPlayer||0);
  const accountMasteryBeforeUnits=Array.isArray(publicState?.units)?[...publicState.units]:[];
  const accountMasterySourcePatch={...(publicPatch||{})};
  const lifecycleToken=getBattleLifecycleToken();
  const stillActive=()=>gameId===writeGameId&&Number(myPlayer||0)===writePlayer&&isBattleLifecycleTokenActive(lifecycleToken);
  try{
    if(!stillActive())return false;
    const cleanPrivateBase=hallvallaSanitizeFirebaseValue(privatePatch||{})||{};
    let nextPrivate=hallvallaApplyLocalPatch(privateState||{},cleanPrivateBase);
    const fullPublicPatch=(await normalizePublicPatchBeforeCommit(publicPatch||{},{sanitizeFirebase:true})).patch;
    const privacyProjection=projectStage8StealthPatchForNetwork(fullPublicPatch,writePlayer);
    const sharedVisibilityUnits=privacyProjection.visibilityUnits;
    let cleanPublic=sanitizeSharedStealthPatch(privacyProjection.publicPatch,sharedVisibilityUnits);
    cleanPublic=hallvallaSanitizeFirebaseValue(cleanPublic)||{};
    const cleanPrivate={...cleanPrivateBase,...(hallvallaSanitizeFirebaseValue(privacyProjection.privatePatch)||{})};
    nextPrivate=hallvallaApplyLocalPatch(privateState||{},cleanPrivate);
    const statsKey=`playerStats/${writePlayer}`;
    const hasHiddenUnits=countHiddenUnitReserveFromState(nextPrivate)>0;
    if(cleanPublic[statsKey]&&typeof cleanPublic[statsKey]==="object"&&!Array.isArray(cleanPublic[statsKey])){
      cleanPublic[statsKey]={...cleanPublic[statsKey],hasHiddenUnits};
    }else{
      cleanPublic[`playerStats/${writePlayer}/hasHiddenUnits`]=hasHiddenUnits;
    }
    const rootPatch={};
    for(const [key,value] of Object.entries(cleanPublic))rootPatch[`public/${key}`]=value;
    for(const [key,value] of Object.entries(cleanPrivate))rootPatch[`private/${getGamePrivatePlayerKey(writePlayer)}/${key}`]=value;
    if(!Object.keys(rootPatch).length)return true;
    if(!stillActive())return false;
    await update(ref(db,`games/${writeGameId}`),rootPatch);
    if(!stillActive())return false;
    privateState=nextPrivate;
    publicState=hallvallaApplyLocalPatch(publicState,fullPublicPatch);
    networkPublicStateRaw=networkPublicStateRaw?hallvallaApplyLocalPatch(networkPublicStateRaw,cleanPublic):networkPublicStateRaw;
    if(Array.isArray(fullPublicPatch?.units)){
      if(typeof registerAccountMasterySummonsFromUnitDiff==="function")registerAccountMasterySummonsFromUnitDiff(accountMasteryBeforeUnits,fullPublicPatch.units);
      if(typeof registerAccountMasteryKillsFromUnitDiff==="function")registerAccountMasteryKillsFromUnitDiff(accountMasteryBeforeUnits,fullPublicPatch.units,accountMasterySourcePatch);
    }
    render();
    return true;
  }catch(error){
    console.error("[HallValla][PVP 6F] Falló commit atómico multipath:",error);
    setHint("No se pudo confirmar la acción PvP. No se aplicó parcialmente.");
    return false;
  }finally{
    pvpStep6fAtomicActionInFlight=false;
  }
}
async function commitGameplayAction({publicPatch={},privatePatch={}}={}){
  if(isTurnWriteBlockedByExpiredClock())return false;
  if(isPvpStep6fAtomicActionMode(publicState))return commitPvpStep6fAtomicAction(publicPatch,privatePatch);
  // Aventura/Tutorial conservan el flujo histórico.
  if(Object.keys(publicPatch||{}).length&&!(await updatePublic(publicPatch)))return false;
  if(Object.keys(privatePatch||{}).length&&!(await updatePrivate(privatePatch)))return false;
  return true;
}
async function updatePrivate(patch){
  if(isTurnWriteBlockedByExpiredClock())return false;
  const writeGameId=gameId;
  const writePlayer=myPlayer;
  const writeLifecycleToken=getBattleLifecycleToken();
  const writeContextActive=()=>writeGameId&&gameId===writeGameId&&myPlayer===writePlayer&&isBattleLifecycleTokenActive(writeLifecycleToken);
  if(!writeContextActive())return false;
  const cleanPatch=hallvallaSanitizeFirebaseValue(patch||{})||{};
  const nextPrivate=hallvallaApplyLocalPatch(privateState||{},cleanPatch);
  const hiddenUnits=countHiddenUnitReserveFromState(nextPrivate);
  const summaryPatch={[`playerStats/${myPlayer}/hasHiddenUnits`]:hiddenUnits>0};
  const applyLocalProjection=()=>{
    privateState=nextPrivate;
    const projectedPublic=publicState?hallvallaApplyLocalPatch(publicState,summaryPatch):publicState;
    if(projectedPublic)publicState=projectedPublic;
  };
  if(hallvallaIsLocalTestGame()){
    applyLocalProjection();
    render();void maybeFinalizeUnitExhaustionFromPublicState();maybeStartTurn();maybeTriggerAdventureAI();
    return true;
  }
  applyLocalProjection();
  await update(getGamePrivatePlayerRef(writeGameId,writePlayer),cleanPatch);
  if(!writeContextActive())return false;
  await update(ref(db,`games/${writeGameId}/public`),summaryPatch);
  return true;
}
function hasLivingNonLeaderUnitsForOwner(owner,units=publicState?.units||[]){
  return (units||[]).some(u=>u&&u.owner===owner&&!u.leader&&Number(u.hp||0)>0);
}
function getBattleOutcome(units=publicState?.units||[],state=publicState){
  const p1Leader=(units||[]).find(u=>u.owner===1&&u.leader);
  const p2Leader=(units||[]).find(u=>u.owner===2&&u.leader);
  if(!p1Leader&&!p2Leader)return{ended:true,winner:0,loser:0,p1Leader:null,p2Leader:null};
  if(!p1Leader)return{ended:true,winner:2,loser:1,p1Leader:null,p2Leader};
  if(!p2Leader)return{ended:true,winner:1,loser:2,p1Leader,p2Leader:null};
  const exhausted=getUnitExhaustionOutcome(units,state);
  if(exhausted)return exhausted;
  return{ended:false,p1Leader,p2Leader};
}
async function finalizeBattle(units,actionLog="",stateOverride=null){
  if(!gameId||!publicState||isBattleEnded())return false;
  const state=stateOverride||publicState;
  const outcome=getBattleOutcome(units,state);
  if(!outcome.ended)return false;
  clearSelection();
  const baseLogs=[];
  if(actionLog)baseLogs.push(actionLog);
  const unitExhaustionText=getUnitExhaustionOutcomeText(outcome);
  if(unitExhaustionText)baseLogs.push(unitExhaustionText);
  if(state.mode==="adventure"){
    baseLogs.push(outcome.winner===1?`Has ganado ${state.adventureBattleTitle||"la batalla"}. La misión avanza.`:`Has caído en ${state.adventureBattleTitle||"la batalla"}. Puedes reintentar.`);
  }else if(!unitExhaustionText){
    baseLogs.push(outcome.winner?`La partida terminó. Gana J${outcome.winner}.`:"La partida terminó en un estado sin líderes.");
  }
  const nextStats1={...(state.playerStats?.[1]||{}),hp:outcome.p1Leader?.hp||0};
  const nextStats2={...(state.playerStats?.[2]||{}),hp:outcome.p2Leader?.hp||0};
  recordLocalLeaderBattleOutcome(outcome,state.mode||"pvp");
  const endedAt=Date.now();
  const finalPatch={...getDuelClockHandoffPatch(state),units,phase:"ended",battleEnded:true,winner:outcome.winner,loser:outcome.loser,endedAt,currentPlayer:0,stalemateNoPlay:null,[`playerStats/1`]:nextStats1,[`playerStats/2`]:nextStats2,log:[...baseLogs,...(state.log||[])].slice(0,18)};
  const wrote=await updatePublic(finalPatch);
  if(wrote&&state.mode==="online"&&typeof globalThis.hvPvpRankingRecordResult==="function"){
    try{await globalThis.hvPvpRankingRecordResult({...state,...finalPatch},gameId);}catch(error){console.warn("[HallValla][PvP Ranking] El duelo terminó, pero el registro de ranking deberá reintentarse desde el snapshot final.",error);}
  }
  return !!wrote;
}function resetBattleState(){
  networkPublicStateRaw=null;
  stage8PrivacyReconcileInFlight=false;
  stage8AreaDamageReconcileInFlight=false;
  stage8LastDetectionEventId="";
  stage8LastAreaDamageEventId="";
  if(typeof resetBattleRenderScheduler==="function")resetBattleRenderScheduler();
  if(typeof resetHallvallaBoardRenderCache==="function")resetHallvallaBoardRenderCache();
  endBattleLifecycle("resetBattleState");
  unsubPub=null;
  unsubPriv=null;
  if(typeof clearBattleBoardInteractionState==="function")clearBattleBoardInteractionState();
  unitExhaustionFinalizeLock=false;
  resetNoPlayableAutoAdvanceState();
  resetFieldAutoAdvanceState();
  resetAdventureAiScheduling();
  stopTurnTimerLoop();
  clearBattleTransientUiState();
  selectedCard=null;
  selectedUnitId=null;
  selectedUnitActionMode=null;
  selectedUnitEffectChoice=null;
  cardInspectSelection=null;
  unitContextSelection=null;
  hideUnitContextMenu();
  highlights=[];
  highlightType="move";
  handOpen=true;
  actionsCollapsed=false;
  handManualCloseKey="";
  publicState=null;
  privateState=null;
  gameId=null;
  myPlayer=null;
  shownBattleResultKey="";
  lastBattleFxKey="";
  lastDemigodSummonKey="";
  lastEventSplashKey="";
  eventSplashHistory=[];
  nearDeathSoundPlayedKeys=new Set();
  clearBattleFxLayer();
  clearEventSplashOverlay();
  hideBattleOutcomeSplash(true);
  hideDemigodSummonPresentation();
  if(aiWatchdogTimer){battleClearInterval(aiWatchdogTimer);aiWatchdogTimer=null;}
}
function leaveCurrentGame(){
  if(unsubPub){unsubPub();unsubPub=null}
  if(unsubPriv){unsubPriv();unsubPriv=null}
  resetBattleState();
  if(typeof globalThis.__HALLVALLA_RELEASE_BATTLE_DOM__==="function")globalThis.__HALLVALLA_RELEASE_BATTLE_DOM__();
  clearBasicTutorialTargetHighlight();
  const tutorialCoach=$("basicTutorialCoach");if(tutorialCoach)tutorialCoach.classList.add("hidden");
  $("adventurePanel").classList.add("hidden");
  globalThis.__HALLVALLA_RELEASE_ADVENTURE_DOM__?.();
  $("onlineLobby").classList.add("hidden");
  $("gameShell").classList.add("hidden");
  $("mainMenu").classList.remove("hidden");
  renderHomeProgress();syncBattleMusic();
}
function maybeShowBattleResult(){
  const result=(()=>{
    if(!publicState||publicState.phase!=="ended"||!publicState.endedAt)return;
    const resultKey=`${gameId}:${publicState.endedAt}`;
    if(shownBattleResultKey===resultKey)return;
    shownBattleResultKey=resultKey;
    const draw=Number(publicState.winner||0)===0;
    const win=!draw&&Number(publicState.winner||0)===Number(myPlayer||0);
    if(!draw)tryPlaySound(win?"victory":"defeat",.95);
    stopMusic(false);
    const adventure=publicState.mode==="adventure";
    showBattleOutcomeSplash(draw?"draw":(win?"victory":"defeat"),{adventure});
    if(!adventure&&publicState.mode==="online"&&typeof globalThis.hvPvpRankingRecordResult==="function"){
      void globalThis.hvPvpRankingRecordResult(publicState,gameId);
    }
    if(adventure)completeAdventureBattleOnce(publicState);
  })();
  runHallvallaEffectHooks("battle.resultChecked",{state:publicState});
  return result;
}
/* Crear/Unirse PvP viven únicamente en el módulo clean-room. */

function extractPrincipalCardsFromDeck(cards=[],principalKeys=[],principalSlots=DECK_RULES.maxPrincipalSlots){
  const deck=[...(cards||[])];
  const requested=[];
  (Array.isArray(principalKeys)?principalKeys:[principalKeys]).forEach(key=>{const safe=String(key||"");if(safe&&!requested.includes(safe))requested.push(safe);});
  const principalCards=[];
  requested.slice(0,principalSlots).forEach(key=>{
    const index=deck.findIndex(card=>card?.key===key&&card.type==="unit");
    if(index>=0)principalCards.push(deck.splice(index,1)[0]);
  });
  return{deck,principalCards,principalKeys:principalCards.map(card=>card.key)};
}

function extractPrincipalsFromInitialState(initial={},principalKeys=[],principalSlots=DECK_RULES.maxPrincipalSlots){
  let deck=[...(initial.deck||[])],hand=[...(initial.hand||[])];
  const requested=[];
  (Array.isArray(principalKeys)?principalKeys:[principalKeys]).forEach(key=>{const safe=String(key||"");if(safe&&!requested.includes(safe))requested.push(safe);});
  const principalCards=[];
  requested.slice(0,principalSlots).forEach(key=>{
    let index=hand.findIndex(card=>card?.key===key&&card.type==="unit");
    if(index>=0){
      principalCards.push(hand.splice(index,1)[0]);
      if(deck.length)hand.push(deck.shift());
      return;
    }
    index=deck.findIndex(card=>card?.key===key&&card.type==="unit");
    if(index>=0)principalCards.push(deck.splice(index,1)[0]);
  });
  return{deck,hand,principalCards,principalKeys:principalCards.map(card=>card.key)};
}

function prepareAiPrincipalInitialState(battle,initial){
  const principalSlots=getAiPrincipalSlotsForBattle(battle);
  if(principalSlots<=0)return{...initial,principalSlots:0,principalCards:[],principalKeys:[],principalCard:null,principalKey:""};
  const keys=getAiPrincipalKeysForBattle(battle,initial);
  const result=extractPrincipalsFromInitialState(initial,keys,principalSlots);
  return{...result,principalSlots,principalCard:result.principalCards[0]||null,principalKey:result.principalKeys[0]||""};
}
function getPrincipalStartCell(owner,units=[],slotIndex=0){
  const y=owner===1?Math.max(0,ROWS-2):Math.min(ROWS-1,1);
  const center=Math.floor(COLS/2);
  const preferred=[center,center-1,center+1];
  const first=preferred[Math.max(0,Math.min(DECK_RULES.maxPrincipalSlots-1,Number(slotIndex)||0))];
  const xs=[first,...preferred,0,COLS-1].filter((x,index,arr)=>x>=0&&x<COLS&&arr.indexOf(x)===index);
  const occupied=new Set((units||[]).map(u=>`${u.x},${u.y}`));
  const x=xs.find(value=>!occupied.has(`${value},${y}`));
  return Number.isFinite(x)?{x,y}:null;
}
function makeStartingPrincipalUnit(card,owner,leaderType,units=[],slotIndex=0){
  if(!card||card.type!=="unit")return null;
  const cell=getPrincipalStartCell(owner,units,slotIndex);
  if(!cell)return null;
  const unit=makeUnit({...card,owner,leaderType,summonOrigin:"principal",fieldGeneratedSummon:true},cell.x,cell.y);
  const principal={...unit,principal:true,principalStart:true,principalSlot:slotIndex+1,summonOrigin:"principal",fieldGeneratedSummon:true,summonedTurnKey:"opening",summonedTurn:0,summonedPhase:"opening",hallvallaReadyOnSummon:true};
  return applyHallvallaValueHooks("principal.makeUnit",principal,{card,owner,leaderType,units,slotIndex});
}
function makeStartingPrincipalUnits(cards=[],owner,leaderType,units=[],principalSlots=(cards||[]).length){
  runHallvallaEffectHooks("principal.beforeMakeUnits",{cards,owner,leaderType,units,principalSlots});
  const out=[];
  (cards||[]).slice(0,principalSlots).forEach((card,index)=>{
    const unit=makeStartingPrincipalUnit(card,owner,leaderType,[...(units||[]),...out],index);
    if(unit)out.push(unit);
  });
  return out;
}
function applyStartingPrincipalEntryEffects(units=[]){
  let out=[...(units||[])],logs=[];
  out=out.map(unit=>{
    if(!unit?.principal||unit.leader)return unit;
    const enemyYi=out.some(other=>other&&!other.leader&&other.owner!==unit.owner&&other.key==="yi_sun_sin"&&other.hp>0);
    if(!enemyYi)return unit;
    logs.push(`Bloqueo Naval: ${unit.name} comienza con -4 DX y -4 Guardia hasta su próximo turno.`);
    return{...unit,tempDexDebuff:(unit.tempDexDebuff||0)+4,tempGuardBuff:(unit.tempGuardBuff||0)-4,yiSunDebuffed:true};
  });
  const lion=applyAfricanLionFearAura(out);
  out=lion.units;
  logs.push(...(lion.logs||[]));
  return{units:out,logs,statusFxEvent:lion.statusFxEvent||null,floatFxEvent:lion.floatFxEvent||null};
}

async function startAdventure(specialKey,battleId=ADVENTURE_GUARDIAN_BATTLE.id){
  if(!(await ensureFirebaseAuthReady("adventure")))return;
  const leaderType=getSelectedLeaderType();
  if(!leaderType){requireLeaderSelection(true);return}
  const leaderLevel=getLocalLeaderLevel(leaderType);
  const leaderAbility=getLocalLeaderAbility(leaderType);
  const leaderStats=getLeaderBattleStats(leaderType,leaderLevel,leaderAbility);
  const specialTemplate=ADVENTURE_SPECIALS[specialKey];
  if(!specialTemplate)return;
  let battle=getAdventureBattle(battleId)||ADVENTURE_GUARDIAN_BATTLE;
  if(typeof isAdventureMapBattleCompleted==="function"&&isAdventureMapBattleCompleted(battle)){
    await hvAlert("Esta batalla ya fue completada. Avanza al siguiente encuentro del mapa.","Batalla completada");
    openAdventureMap(specialKey);
    return;
  }
  if(battle.isGuardian&&typeof ensureInitialLeaderStarterCollection==="function"){
    ensureInitialLeaderStarterCollection(leaderType,specialKey);
  }
  let beastmasterEntry=null;
  let beastmasterEntryCharged=false;
  if(!isBattleUnlocked(battle)){await hvAlert("Esta batalla está bloqueada. Completa primero la batalla anterior o el mapa requerido.","Batalla bloqueada");openAdventureMap(specialKey);return;}
  const code=`ADV${code4()}`;
  // El primer espacio de Personaje Principal y la edición de mazo se desbloquean
  // al derrotar al Hechicero guardián. Antes de esa victoria, el mazo inicial tiene
  // 20 cartas de robo y ninguna unidad comienza desplegada gratuitamente.
  const playerPrincipalUnlocked=canAccessDecks();
  // La prueba del Hechicero nunca usa Personaje Principal, incluso si se repite después.
  const playerPrincipalSlots=battle.isGuardian?0:(playerPrincipalUnlocked?getPrincipalSlotsForLeaderLevel(leaderLevel):0);
  const playerRequiredDeckSize=getDeckSizeForPrincipalSlots(playerPrincipalSlots);
  const starterLocked=!playerPrincipalUnlocked;
  const mustUseStarterAdventureDeck=!!battle.isGuardian||battle.id===ADVENTURE_GUARDIAN_BATTLE.id||starterLocked;
  const rawPlayerBase=mustUseStarterAdventureDeck
    ? shuffle(getStarterAdventureDeckTemplates(specialKey,playerPrincipalSlots,leaderType).map(card=>makeCard(card,1,leaderType)))
    : makeDeck(1,leaderType,{principalSlots:playerPrincipalSlots});
  const playerDeckValidation=validateDeckList(rawPlayerBase,playerPrincipalSlots);
  if(!playerDeckValidation.valid){
    await hvAlert(playerDeckValidation.errors.join(" "),"Mazo inválido");
    if(!mustUseStarterAdventureDeck)openDeckBuilder();
    return;
  }
  const requestedPlayerPrincipals=playerPrincipalSlots<=0
    ? []
    : (mustUseStarterAdventureDeck
      ? chooseFallbackAiPrincipalKeys({deck:rawPlayerBase,hand:[]},[],playerPrincipalSlots)
      : sanitizePrincipalKeysForDeck(getSavedPrincipalKeys(),rawPlayerBase,playerPrincipalSlots));
  if(!mustUseStarterAdventureDeck){
    const principalValidation=validatePrincipalSelection(requestedPlayerPrincipals,rawPlayerBase,playerPrincipalSlots);
    if(!principalValidation.valid){await hvAlert(principalValidation.errors.join(" "),"Faltan Personajes Principales");openDeckBuilder();return;}
  }
  const playerPrincipalPrep=extractPrincipalCardsFromDeck(rawPlayerBase,requestedPlayerPrincipals,playerPrincipalSlots);
  if(playerPrincipalPrep.principalCards.length!==playerPrincipalSlots||playerPrincipalPrep.deck.length!==DECK_RULES.drawDeckSize){
    await hvAlert(`Tu líder está en ${getPrincipalTierSummary(leaderLevel)}. El mazo debe contener ${playerRequiredDeckSize} cartas totales: ${playerPrincipalSlots} principal${playerPrincipalSlots===1?"":"es"} y ${DECK_RULES.drawDeckSize} cartas para robar.`,"Mazo inválido");
    if(!mustUseStarterAdventureDeck)openDeckBuilder();
    return;
  }
  if(battle.beastEvent&&!HALLVALLA_LOCALHOST_TEST_MODE){
    const entryCost=Math.max(0,Number(battle.entryGoldCost||BEASTMASTER_DUEL_GOLD_COST)||0);
    const profile=getPlayerProfile();
    if((profile.gold||0)<entryCost){
      await hvAlert(`Necesitas ${entryCost} de oro para desafiar al Señor de las Bestias. Tienes ${profile.gold||0}.`,`Oro insuficiente`);
      return;
    }
    try{
      beastmasterEntry=await reserveBeastmasterGlobalDuel();
    }catch(error){
      console.error("[HallValla] No se pudo reservar el duelo global del Beastmaster:",error);
      await hvAlert("No se pudo registrar este intento en el contador global del Señor de las Bestias. No se descontó oro. Inténtalo otra vez.","Evento no disponible");
      return;
    }
    profile.gold=Math.max(0,(profile.gold||0)-entryCost);
    savePlayerProfile(profile);
    renderPlayerProfile(profile);
    beastmasterEntryCharged=entryCost>0;
    battle={
      ...battle,
      beastmasterGlobalDuelNumber:beastmasterEntry.duelNumber,
      beastmasterGlobalBlock:beastmasterEntry.blockNumber,
      beastmasterGlobalBlockPosition:beastmasterEntry.blockPosition,
      beastmasterYoungDragon:!!beastmasterEntry.youngDragon,
      beastmasterYoungDragonElement:beastmasterEntry.youngDragon?getBeastmasterYoungDragonElement(beastmasterEntry.duelNumber):"",
      beastmasterEntryGoldCost:entryCost
    };
  }
  if(battle.dragonContract&&!HALLVALLA_LOCALHOST_TEST_MODE){
    const entryCost=Math.max(0,Number(battle.entryGoldCost)||0);
    const profile=getPlayerProfile();
    if((profile.gold||0)<entryCost){
      await hvAlert(`Necesitas ${entryCost} de oro para desafiar a ${battle.enemyName}. Tienes ${profile.gold||0}.`,`Oro insuficiente`);
      return;
    }
    profile.gold=Math.max(0,(profile.gold||0)-entryCost);
    savePlayerProfile(profile);
    renderPlayerProfile(profile);
    battle={...battle,dragonContractEntryGoldCost:entryCost};
  }
  const playerBattleDrawDeck=injectLeaderEquipmentIntoDrawDeck(playerPrincipalPrep.deck,leaderType,1);
  const playerDraw=drawCards(playerBattleDrawDeck,[],4);
  const playerDeck=playerDraw.deck;
  const playerHand=playerDraw.hand;
  const adaptivePlayerSnapshot=typeof buildAdventureAdaptivePlayerSnapshot==="function"
    ?buildAdventureAdaptivePlayerSnapshot(rawPlayerBase,playerPrincipalPrep.principalKeys||[])
    :null;
  const enemyLeaderType=battle.enemyLeaderType||"mage";
  const enemyLeaderLevel=getAdventureEnemyLeaderLevel(battle,leaderLevel);
  const enemyLeaderAbility=enemyLeaderLevel>=5?(battle.enemyLeaderAbility||getLeaderDefaultLevel5Ability(enemyLeaderType)):"";
  const enemyLeaderStats=getLeaderBattleStats(enemyLeaderType,enemyLeaderLevel,enemyLeaderAbility);
  const adaptiveCampaignBattle=typeof isAdventureAdaptiveCampaignBattle==="function"&&isAdventureAdaptiveCampaignBattle(battle);
  const adaptiveLearningBattle=typeof isAdventureAdaptiveLearningBattle==="function"&&isAdventureAdaptiveLearningBattle(battle);
  const adaptiveMagePilot=typeof isAdaptiveMagePilotBattle==="function"&&isAdaptiveMagePilotBattle(battle,enemyLeaderType);
  const adaptiveExperience=adaptiveLearningBattle&&typeof getAdaptiveCampaignMemory==="function"?getAdaptiveCampaignMemory():null;
  const enemyDeckBattle=adaptiveCampaignBattle?{...battle,adaptivePlayerSnapshot}:battle;
  const enemyRawInitial=makeEnemyDeckForBattle(enemyDeckBattle,enemyLeaderType);
  const enemyPrepared=prepareAiPrincipalInitialState(enemyDeckBattle,enemyRawInitial);
  // El Hechicero conserva Cañón Arcano como núcleo adaptativo. No se inyecta
  // Foco Estabilizador automáticamente porque sustituiría cartas fuera del constructor global.
  const enemyInitial=adaptiveMagePilot?enemyPrepared:injectLeaderEquipmentIntoInitialState(enemyPrepared,enemyLeaderType,2);
  const chapterForBattle=getAdventureChapterForBattle(battle)||ADVENTURE_CHAPTER_1_1;
  let startingUnits=[
    makeLeader(1,Math.floor(COLS/2),ROWS-1,leaderType,leaderLevel,leaderAbility),
    makeAdventureEnemyLeader(battle,enemyLeaderType,enemyLeaderLevel,enemyLeaderAbility)
  ];
  const playerPrincipalUnits=makeStartingPrincipalUnits(playerPrincipalPrep.principalCards,1,leaderType,startingUnits,playerPrincipalSlots);
  startingUnits.push(...playerPrincipalUnits);
  const enemyPrincipalUnits=makeStartingPrincipalUnits(enemyInitial.principalCards||[],2,enemyLeaderType,startingUnits,enemyInitial.principalSlots||0);
  startingUnits.push(...enemyPrincipalUnits);
  const entryEffects=applyStartingPrincipalEntryEffects(startingUnits);
  startingUnits=entryEffects.units;
  const principalLogs=[];
  if(playerPrincipalUnits.length)principalLogs.push(`Tus Personajes Principales son ${playerPrincipalUnits.map(u=>u.name).join(", ")}: comienzan convocados sin pagar Honor.`);
  if(enemyPrincipalUnits.length)principalLogs.push(`Personajes Principales enemigos: ${enemyPrincipalUnits.map(u=>u.name).join(", ")}, ya convocados al iniciar.`);
  if(battle.beastEvent){
    principalLogs.push(`El Beastmaster iguala tu nivel ${leaderLevel}; todas sus unidades y principales entran con Maestría ${romanUnitRank(UNIT_MASTERY_MAX_RANK)}.`);
    if(battle.beastmasterGlobalDuelNumber)principalLogs.push(`Duelo global del Beastmaster #${battle.beastmasterGlobalDuelNumber}. Entrada pagada: ${battle.beastmasterEntryGoldCost||BEASTMASTER_DUEL_GOLD_COST} de oro.`);
    if(battle.beastmasterYoungDragon)principalLogs.push(`Hito global cada ${BEASTMASTER_YOUNG_DRAGON_INTERVAL} duelos: el Beastmaster incorporó un Dragón Joven de ${dragonElementLabel?.(battle.beastmasterYoungDragonElement)||battle.beastmasterYoungDragonElement} a su mazo.`);
  }
  principalLogs.push(...entryEffects.logs);
  const playerProfileName=getLocalProfileName();
  const pub={
    code,boardRows:ROWS,boardCols:COLS,mode:"adventure",
    adventureChapter:battle.isGuardian?"guardian_gate":chapterForBattle.id,
    adventureChapterTitle:battle.isGuardian?"Prueba del guardián":`${chapterForBattle.number} ${chapterForBattle.title}`,
    adventureIsGuardian:!!battle.isGuardian,adventureBattleId:battle.id,adventureBattleNum:battle.num,adventureBattleTitle:battle.title,adventureBattleXp:battle.xp,
    adventureEnemyName:battle.enemyName,adventureEnemyLeaderPortrait:battle.enemyLeaderPortrait||"",
    adventureAdaptiveCampaign:!!adaptiveCampaignBattle,adventureAdaptiveLearning:!!adaptiveLearningBattle,adventureAdaptiveMage:!!adaptiveMagePilot,
    adventureAdaptivePlayerSnapshot:adaptiveLearningBattle?adaptivePlayerSnapshot:null,
    adventureAdaptiveExperienceBattles:Math.max(0,Number(adaptiveExperience?.battlesAnalyzed||0)),
    adventureAdaptiveRarityCap:adaptiveCampaignBattle?(typeof isAdaptiveMap1Battle==="function"&&isAdaptiveMap1Battle(battle)?(battle.id==="battle5"?"Richard: básicas + núcleo especial":"Solo básicas"):(typeof isAdaptiveMap2Battle==="function"&&isAdaptiveMap2Battle(battle)?"Mapa 2: básicas + excepciones guionizadas":"Núcleo del encuentro + counters básicos")):"",
    adventureAiLevel:ADVENTURE_AI_BEST_SKILL_LEVEL,adventureAiDrawBonus:battle.aiDrawBonus||0,adventureAiHonorBonus:battle.aiHonorBonus||0,
    adventureAiStyle:adaptiveMagePilot?"Cañón Arcano · adaptación global":(adaptiveCampaignBattle?`${battle.aiStyle||"Máxima"} · adaptación global`:(battle.aiStyle||"Máxima")),
    adventureEnemyUnitMasteryRank:battle.beastEvent?UNIT_MASTERY_MAX_RANK:0,
    beastmasterGlobalDuelNumber:battle.beastmasterGlobalDuelNumber||0,
    beastmasterGlobalBlock:battle.beastmasterGlobalBlock||0,
    beastmasterGlobalBlockPosition:battle.beastmasterGlobalBlockPosition||0,
    beastmasterYoungDragon:!!battle.beastmasterYoungDragon,
    beastmasterYoungDragonElement:battle.beastmasterYoungDragonElement||"",
    beastmasterEntryGoldCost:battle.beastmasterEntryGoldCost||0,
    adventureSpecial:specialKey,
    principalSlots:{1:playerPrincipalSlots,2:enemyInitial.principalSlots||0},
    adventurePrincipalKeys:{1:playerPrincipalPrep.principalKeys||[],2:enemyInitial.principalKeys||[]},
    adventureAiState:{deck:enemyInitial.deck,hand:enemyInitial.hand,honor:0,maxHonor:0,lastTurnStarted:"",skipFirstTurnDraw:true,principalSlots:enemyInitial.principalSlots||0,principalKeys:enemyInitial.principalKeys||[],principalKey:enemyInitial.principalKey||""},
    createdAt:Date.now(),currentPlayer:1,turn:1,phase:"active",turnPhase:"draw",turnKey:"1-1",turnStartedAt:serverTimestamp(),
    clockRulesetVersion:CLOCK_RULESET_VERSION,playerClockMs:{1:DUEL_TIME_LIMIT_MS,2:DUEL_TIME_LIMIT_MS},
    playerSlots:{player1Uid:uid,player2Uid:"ADVENTURE_AI"},
    playerNames:{1:playerProfileName,2:cleanPlayerName(battle.enemyName||"")||LEADER_DATA[enemyLeaderType]?.name||"Rival"},
    playerLeaders:{1:leaderType,2:enemyLeaderType},playerLeaderLevels:{1:leaderLevel,2:enemyLeaderLevel},playerLeaderAbilities:{1:leaderAbility,2:enemyLeaderAbility},
    playerStats:{1:{hp:leaderStats.hp,honor:0,maxHonor:0,deck:playerDeck.length,hand:playerHand.length,hasHiddenUnits:countHiddenUnitCards([...playerDeck,...playerHand])>0},2:{hp:enemyLeaderStats.hp,honor:0,maxHonor:0,deck:enemyInitial.deck.length,hand:enemyInitial.hand.length,hasHiddenUnits:countHiddenUnitCards([...(enemyInitial.deck||[]),...(enemyInitial.hand||[])])>0}},
    erictoGraveyard:[],units:startingUnits,statusFxEvent:entryEffects.statusFxEvent||null,floatFxEvent:entryEffects.floatFxEvent||null,
    log:[...principalLogs,`${battle.beastEvent?"Evento":(battle.isGuardian?"Prueba previa":"Aventura "+chapterForBattle.number)}: ${battle.title}. Rival: ${battle.enemyName}. IA táctica máxima desde el primer duelo. Recompensa: ${getBattleRewardLabel(battle)}.`].slice(0,18)
  };
  const privatePayload={ownerUid:uid,leaderType,leaderLevel,leaderAbility,adventureSpecial:specialKey,adventureBattleId:battle.id,deck:playerDeck,hand:playerHand,honor:0,maxHonor:0,lastTurnStarted:"",skipFirstTurnDraw:true,principalSlots:playerPrincipalSlots,principalKeys:playerPrincipalPrep.principalKeys||[],principalKey:playerPrincipalPrep.principalKeys?.[0]||""};
  if(HALLVALLA_LOCALHOST_TEST_MODE){
    pub.code=`LOCAL${code4()}`;
    pub.localhostVisualTest=true;
    pub.log=["Modo local: prueba visual en tablero real sin Firebase.",...(pub.log||[])].slice(0,18);
    enterLocalGame(pub,privatePayload,1);
    return;
  }
  try{
    await set(ref(db,`games/${code}/public`),pub);
    await set(getGamePrivatePlayerRef(code,1),privatePayload);
  }catch(error){
    try{await remove(ref(db,`games/${code}`));}catch(_){}
    if(battle.beastEvent&&beastmasterEntryCharged){
      const refundProfile=getPlayerProfile();
      refundProfile.gold=(refundProfile.gold||0)+Math.max(0,Number(battle.beastmasterEntryGoldCost||BEASTMASTER_DUEL_GOLD_COST)||0);
      savePlayerProfile(refundProfile);
      renderPlayerProfile(refundProfile);
    }
    console.error("[HallValla] No se pudo crear la batalla de aventura:",error);
    await hvAlert(battle.beastEvent?"No se pudo crear el duelo del Señor de las Bestias. Se devolvieron los 100 de oro.":"No se pudo crear la batalla de aventura. Inténtalo de nuevo.","Error al crear batalla");
    return;
  }
  $("adventurePanel").classList.add("hidden");
  enterGame(code,1);
}

let lastFirebaseListenerErrorKey="";
function handleBattleListenerError(label,e){
  const key=`${label}:${e?.name||"Error"}:${e?.message||String(e||"")}`;
  if(lastFirebaseListenerErrorKey!==key){
    lastFirebaseListenerErrorKey=key;
    console.error(`[HallValla] Error controlado en listener ${label}:`,e);
  }
  setHint("Hubo un tropiezo cargando el duelo. Recarga la página si el tablero no responde.");
}
function safeBattleTick(label,fn){
  try{fn();}
  catch(e){handleBattleListenerError(label,e);}
}
function enterLocalGame(pub,priv,player=1){
  networkPublicStateRaw=null;
  stage8PrivacyReconcileInFlight=false;
  stage8LastDetectionEventId="";
  if(typeof resetBattleRenderScheduler==="function")resetBattleRenderScheduler();
  if(typeof resetHallvallaBoardRenderCache==="function")resetHallvallaBoardRenderCache();
  const nextGameId=pub?.code||`LOCAL${code4()}`;
  beginBattleLifecycle({code:nextGameId,player,source:"local"});
  if(typeof clearBattleBoardInteractionState==="function")clearBattleBoardInteractionState();
  gameId=nextGameId;
  myPlayer=player;
  publicState=pub;
  syncBoardDimensionsFromState(publicState);
  privateState=priv;
  shownBattleResultKey="";
  resetAdventureAiScheduling();
  clearBattleTransientUiState();
  lastBattleFxKey="";
  lastDemigodSummonKey="";
  lastFirebaseListenerErrorKey="";
  nearDeathSoundPlayedKeys=new Set();
  resetNoPlayableAutoAdvanceState();
  resetFieldAutoAdvanceState();
  clearBattleFxLayer();
  hideDemigodSummonPresentation();
  if(aiWatchdogTimer){battleClearInterval(aiWatchdogTimer);aiWatchdogTimer=null}
  $("onlineLobby")?.classList.add("hidden");
  $("mainMenu")?.classList.add("hidden");
  $("adventurePanel")?.classList.add("hidden");
  globalThis.__HALLVALLA_RELEASE_ADVENTURE_DOM__?.();
  globalThis.hvHydrateAssetGroup?.("battle");
  $("gameShell")?.classList.remove("hidden");
  stopMusic(true);
  if(unsubPub){try{unsubPub();}catch(_){ }unsubPub=null}
  if(unsubPriv){try{unsubPriv();}catch(_){ }unsubPriv=null}
  stopTurnTimerLoop();
  startTurnTimerLoop();
  render();
  setHint("Modo local de prueba: tablero real sin Firebase. Ajusta Rareza CTRL aquí mismo.");
  maybeStartTurn();
  aiWatchdogTimer=battleSetInterval(()=>{safeBattleTick("localAiWatchdog",()=>{if(publicState?.mode==="adventure"&&publicState.currentPlayer===2&&!isBattleEnded())maybeTriggerAdventureAI();});},1800,"adventure-ai-watchdog-local");
}
function enterGame(code,player){
  networkPublicStateRaw=null;
  stage8PrivacyReconcileInFlight=false;
  stage8LastDetectionEventId="";
  if(typeof resetBattleRenderScheduler==="function")resetBattleRenderScheduler();
  if(typeof resetHallvallaBoardRenderCache==="function")resetHallvallaBoardRenderCache();
  beginBattleLifecycle({code,player,source:"firebase"});
  if(typeof clearBattleBoardInteractionState==="function")clearBattleBoardInteractionState();
  gameId=code;
  myPlayer=player;
  shownBattleResultKey="";
  resetAdventureAiScheduling();
  clearBattleTransientUiState();
  lastBattleFxKey="";
  lastDemigodSummonKey="";
  lastFirebaseListenerErrorKey="";
  nearDeathSoundPlayedKeys=new Set();
  resetNoPlayableAutoAdvanceState();
  resetFieldAutoAdvanceState();
  clearBattleFxLayer();
  hideDemigodSummonPresentation();
  if(aiWatchdogTimer){battleClearInterval(aiWatchdogTimer);aiWatchdogTimer=null}
  $("onlineLobby")?.classList.add("hidden");
  $("mainMenu")?.classList.add("hidden");
  if($("adventurePanel")?.classList.contains("hidden"))globalThis.__HALLVALLA_RELEASE_ADVENTURE_DOM__?.();
  globalThis.hvHydrateAssetGroup?.("battle");
  $("gameShell")?.classList.remove("hidden");
  stopMusic(true);
  if(unsubPub)unsubPub();
  if(unsubPriv)unsubPriv();
  stopTurnTimerLoop();
  startTurnTimerLoop();
  const lifecycleToken=getBattleLifecycleToken();
  unsubPub=battleOwnDisposable(onValue(ref(db,`games/${code}/public`),snap=>{
    if(!isBattleLifecycleTokenActive(lifecycleToken))return;
    safeBattleTick("public",()=>{
    const val=snap.val();
    if(!val){
      publicState=null;
      setHint("El duelo no existe o fue borrado de Firebase.");
      return;
    }
    const prevPublic=publicState?JSON.parse(JSON.stringify(publicState)):null;
    networkPublicStateRaw=val;
    publicState=composeStage8ViewerPublicState(networkPublicStateRaw,privateState,player);
    syncBoardDimensionsFromState(publicState);
    render();
    syncBattleMusic();
    maybePlayBattleFx(prevPublic,publicState);
    maybeProcessVeilCurseKillEvent(prevPublic,publicState);
    
    maybeShowBattleResult();
    void maybeFinalizeUnitExhaustionFromPublicState();
    void maybeResolveStage8StealthAreaDamage();
    void maybeResolveStage8StealthDetectionAndAura();
    maybeStartTurn();
    maybeTriggerAdventureAI();
    });
  },e=>handleBattleListenerError("public:onValue",e)),"firebase","battle-public");
  unsubPriv=battleOwnDisposable(onValue(getGamePrivatePlayerRef(code,player),snap=>{
    if(!isBattleLifecycleTokenActive(lifecycleToken))return;
    safeBattleTick("private",()=>{
    const val=snap.val();
    if(!val){
      privateState=null;
      if(typeof requestBattleRender==="function")requestBattleRender("firebase-private-empty");else render();
      setHint("Esperando datos privados del jugador...");
      return;
    }
    const prevPublic=publicState?JSON.parse(JSON.stringify(publicState)):null;
    privateState=val;
    if(networkPublicStateRaw)publicState=composeStage8ViewerPublicState(networkPublicStateRaw,privateState,player);
    if(typeof requestBattleRender==="function")requestBattleRender("firebase-private");else render();
    if(prevPublic&&publicState)maybePlayBattleFx(prevPublic,publicState);
    maybeShowBattleResult();
    void maybeResolveStage8StealthAreaDamage();
    void maybeResolveStage8StealthDetectionAndAura();
    maybeStartTurn();
    maybeTriggerAdventureAI();
    });
  },e=>handleBattleListenerError("private:onValue",e)),"firebase","battle-private");
  aiWatchdogTimer=battleSetInterval(()=>{
    safeBattleTick("aiWatchdog",()=>{
      if(publicState?.mode==="adventure"&&publicState.currentPlayer===2&&!isBattleEnded())maybeTriggerAdventureAI();
    });
  },1800,"adventure-ai-watchdog");
}
function maybeTriggerAdventureAI(){
  if(!gameId||!publicState||publicState.mode!=="adventure"||publicState.currentPlayer!==2||isBattleEnded())return;
  const key=`${gameId}:${publicState.turnKey||""}:${publicState.turn||0}`;
  if(aiTurnLock||lastAiTurnKey===key)return;
  aiTurnLock=true;
  lastAiTurnKey=key;
  const lifecycleToken=getBattleLifecycleToken();
  const scheduledGameId=gameId;
  if(adventureAiActionTimer){battleClearTimeout(adventureAiActionTimer);adventureAiActionTimer=null;}
  adventureAiActionTimer=battleSetTimeout(async()=>{
    adventureAiActionTimer=null;
    if(!isBattleLifecycleTokenActive(lifecycleToken)||gameId!==scheduledGameId){aiTurnLock=false;return;}
    try{await adventureEnemyTurn();}
    catch(e){
      if(!isBattleLifecycleTokenActive(lifecycleToken)||gameId!==scheduledGameId)return;
      handleBattleListenerError("turno IA",e);
      lastAiTurnKey=key;
      setHint("La IA encontró un tropiezo. Recuperando el turno automáticamente para J1.");
      try{
        if(!isBattleLifecycleTokenActive(lifecycleToken)||gameId!==scheduledGameId)return;
        const nextTurn=(publicState?.turn||1)+1;
        await update(ref(db,`games/${scheduledGameId}/public`),{currentPlayer:1,turn:nextTurn,turnPhase:"draw",turnKey:`${nextTurn}-1`,turnStartedAt:serverTimestamp(),[`playerClockMs/2`]:getCommittedDuelClockMs(publicState,2,Date.now()),log:["Sistema: la IA tuvo un tropiezo y el turno fue recuperado para J1.",...(publicState?.log||[])].slice(0,18)});
      }catch(recoverError){console.warn("[HallValla] No se pudo recuperar automáticamente el turno de IA:",recoverError);}
    }
    finally{aiTurnLock=false;}
  },650,"adventure-ai-action");
}
async function maybeStartTurn(){
  if(!publicState||!privateState||!isMyTurn()||isBattleEnded())return;
  if(publicState.mode==="tutorial"&&publicState.tutorialBasic&&typeof isBasicTutorialInitialDrawBlocked==="function"&&isBasicTutorialInitialDrawBlocked())return;
  if(privateState.lastTurnStarted===publicState.turnKey)return;
  if(turnStartLock)return;
  turnStartLock=true;
  try{
    const firstTurnNoDraw=privateState.skipFirstTurnDraw===true;
    const baseDrawCount=firstTurnNoDraw?0:2;
    const merlinDrawBonus=getMerlinDrawBonus(myPlayer,publicState.units||[]);
    const handBeforeDraw=(privateState.hand||[]).length;
    const deckBeforeDraw=(privateState.deck||[]).length;
    const drawn=drawCards(privateState.deck||[],privateState.hand||[],baseDrawCount+merlinDrawBonus);
    const actualDrawCount=Math.max(0,drawn.hand.length-handBeforeDraw);
    const actualMerlinDraw=Math.min(merlinDrawBonus,Math.max(0,deckBeforeDraw-baseDrawCount));
    const rawHonorGain=(publicState.turn||1)>3?2:1;
    const recharge=getResourceRecharge(privateState.maxHonor||0,rawHonorGain);
    const honorGain=recharge.gain;
    const maxHonor=recharge.maxHonor;
    const honor=recharge.honor;
    const turnPrivatePatch={deck:drawn.deck,hand:drawn.hand,honor,maxHonor,lastTurnStarted:publicState.turnKey,skipFirstTurnDraw:false};
    const atomicOnlineTurnStart=isPvpStep6fAtomicActionMode(publicState);
    // PvP online: private draw/Honor + public turn state must land in one Firebase multipath update.
    // Keeping them separate can mark lastTurnStarted privately while public stays in Draw, stranding J2.
    if(!atomicOnlineTurnStart&&!(await updatePrivate(turnPrivatePatch)))return;
    let units=restoreTurnGuardForOwner(publicState.units||[],myPlayer).map(u=>u.owner===myPlayer?clearTurnTempStatsForOwnerUnit(u,publicState.turnKey):u);units=units.map(u=>u.owner===myPlayer&&u.key==="achilles"?{...u,hp:Math.min(effectiveMaxHp(u),u.hp+1)}:u);
    const heroicEdgeStart=applyHeroicEdgeStartHealing(units,myPlayer);
    units=heroicEdgeStart.units;
    const startTurnBeforeEffects=[...units];
    const startTrap=resolveStartTurnLegendaryTraps(units,myPlayer,publicState.turnKey);
    units=startTrap.units;
    const bleedStart=applyBleedingToOwnerAtTurnStart(units,myPlayer);
    units=bleedStart.units;
    const startBloodVictory=applyBloodVictoryForDeaths(startTurnBeforeEffects,units);
    units=startBloodVictory.units;
    const lionFearStart=applyAfricanLionFearAura(units);
    units=lionFearStart.units;
    const merlinDrawLogs=actualMerlinDraw>0?[`Visión de los Tiempos: Merlín permite a J${myPlayer} robar 1 carta adicional de su mazo.`]:[];
    const startLogs=[...merlinDrawLogs,...(heroicEdgeStart.logs||[]),...(startTrap.logs||[]),...(bleedStart.logs||[]),...(startBloodVictory.logs||[]),...(lionFearStart.logs||[])];
    if(startLogs.length&&await finalizeBattle(units,startLogs.join(" ")))return;
    const playerStatsUpdate={hp:units.find(u=>u.owner===myPlayer&&u.leader)?.hp||0,honor,maxHonor,deck:drawn.deck.length,hand:drawn.hand.length};
    if(actualDrawCount>0){tryPlaySound("draw_card",.50);battleSetTimeout(()=>tryPlaySound("mana_charge",.42),120,"turn-mana-charge");}else tryPlaySound("mana_charge",.42);
    const resourceLabel=getResourceLabel(myPlayer);
    const honorCapText=maxHonor>=RESOURCE_MAX_CAP?" (tope 10)":""; 
    const merlinDrawText=actualMerlinDraw>0?" Visión de los Tiempos añade 1 carta adicional.":(merlinDrawBonus>0?" Visión de los Tiempos se activa, pero el mazo no tiene una carta adicional disponible.":"");
    const logText=firstTurnNoDraw
      ?`J${myPlayer} Draw Phase: ${resourceLabel} máximo +${honorGain}${honorCapText}, recarga a ${honor}. Mano antes del efecto: ${handBeforeDraw} cartas.${merlinDrawText} Mano actual: ${drawn.hand.length}. Pasa a Main Phase.`
      :`J${myPlayer} Draw Phase: ${resourceLabel} máximo +${honorGain}${honorCapText}, recarga a ${honor} y roba ${actualDrawCount} carta${actualDrawCount===1?"":"s"}.${merlinDrawText} Pasa a Main Phase.`;
    const turnPublicPatch={
      units,
      _clockKillCreditMode:"opposite-owner",
      legendaryTraps:startTrap.traps||getActiveLegendaryTraps(),
      turnPhase:"main",
      [`playerStats/${myPlayer}`]:playerStatsUpdate,
      statusFxEvent:lionFearStart.statusFxEvent||bleedStart.statusFxEvent||startTrap.statusFxEvent||null,
      floatFxEvent:lionFearStart.floatFxEvent||bleedStart.floatFxEvent||startTrap.floatFxEvent||null,
      honorRechargeEvent:{key:`${publicState.turnKey}-${myPlayer}-${honorGain}-${maxHonor}`,owner:myPlayer,gain:honorGain,honor,maxHonor,resourceLabel:getResourceLabel(myPlayer,{caps:true}),turnKey:publicState.turnKey,at:Date.now()},
      log:[logText,...startLogs,...(publicState.log||[])].slice(0,18)
    };
    if(atomicOnlineTurnStart){
      if(!(await commitPvpStep6fAtomicAction(turnPublicPatch,turnPrivatePatch)))return;
    }else if(!(await updatePublic(turnPublicPatch)))return;
  }finally{turnStartLock=false}
}