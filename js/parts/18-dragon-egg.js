"use strict";
/* HallValla 7BOARDCTRL8BX · Huevo, eclosión y crecimiento de dragones */

const DRAGON_COMPANION_ELEMENTS=["lightning","fire","ice"];
const DRAGON_COMPANION_STAGES=["egg","baby","young","adult"];
const DRAGON_STAGE_THRESHOLDS=Object.freeze({egg:1000,baby:5000,young:10000,adult:10000});
const DRAGON_ACTIVE_RECORD_KEY="hallvalla_active_dragon_companion_v1";
const DRAGON_GROWTH_BATTLE_KEY="hallvalla_dragon_growth_battle_v1";

const DRAGON_COMPANION_STATS=Object.freeze({
  lightning:Object.freeze({
    baby:Object.freeze({hp:20,guard:8,atk:10,dex:7,agi:6,mov:2,range:3}),
    young:Object.freeze({hp:30,guard:12,atk:15,dex:11,agi:9,mov:3,range:4}),
    adult:Object.freeze({hp:40,guard:16,atk:20,dex:14,agi:12,mov:4,range:5})
  }),
  fire:Object.freeze({
    baby:Object.freeze({hp:24,guard:10,atk:12,dex:6,agi:5,mov:1,range:3}),
    young:Object.freeze({hp:36,guard:15,atk:18,dex:9,agi:8,mov:2,range:4}),
    adult:Object.freeze({hp:48,guard:20,atk:24,dex:12,agi:10,mov:3,range:5})
  }),
  ice:Object.freeze({
    baby:Object.freeze({hp:28,guard:12,atk:9,dex:5,agi:4,mov:1,range:3}),
    young:Object.freeze({hp:42,guard:18,atk:14,dex:8,agi:6,mov:1,range:4}),
    adult:Object.freeze({hp:56,guard:24,atk:18,dex:10,agi:8,mov:2,range:5})
  })
});

const DRAGON_COMPANION_ASSETS=Object.freeze({
  egg:Object.freeze({hand:"assets/cards/beasts/dragon_egg.webp",field:"assets/field_figures/beasts/dragon_egg.webp"}),
  baby:Object.freeze({hand:"assets/cards/beasts/baby_dragon.webp",field:"assets/field_figures/beasts/baby_dragon.webp"}),
  young_lightning:Object.freeze({hand:"assets/cards/beasts/young_lightning_dragon.webp",field:"assets/field_figures/beasts/young_lightning_dragon.webp"}),
  young_fire:Object.freeze({hand:"assets/cards/beasts/young_fire_dragon.webp",field:"assets/field_figures/beasts/young_fire_dragon.webp"}),
  young_ice:Object.freeze({hand:"assets/cards/beasts/young_ice_dragon.webp",field:"assets/field_figures/beasts/young_ice_dragon.webp"}),
  adult_lightning:Object.freeze({hand:"assets/cards/beasts/adult_lightning_dragon.webp",field:"assets/field_figures/beasts/adult_lightning_dragon.webp"}),
  adult_fire:Object.freeze({hand:"assets/cards/beasts/adult_fire_dragon.webp",field:"assets/field_figures/beasts/adult_fire_dragon.webp"}),
  adult_ice:Object.freeze({hand:"assets/cards/beasts/adult_ice_dragon.webp",field:"assets/field_figures/beasts/adult_ice_dragon.webp"})
});

function dragonElementLabel(element){return{lightning:"Relámpago",fire:"Fuego",ice:"Hielo"}[element]||"Desconocido";}
function dragonStageLabel(stage){return{egg:"Huevo",baby:"Bebé",young:"Joven",adult:"Adulto"}[stage]||"Dragón";}
function dragonCardKey(stage,element="mystery"){
  if(stage==="egg")return"dragon_egg";
  if(stage==="baby")return`baby_${element}_dragon`;
  if(stage==="young")return`young_${element}_dragon`;
  return`adult_${element}_dragon`;
}
function isDragonCompanionKey(key){
  const safe=String(key||"");
  return safe==="dragon_egg"||/^(baby|young|adult)_(lightning|fire|ice)_dragon$/.test(safe);
}
function getDragonStageThreshold(stage){return DRAGON_STAGE_THRESHOLDS[stage]||10000;}
function normalizeDragonCompanionRecord(record,index=0){
  const source=record&&typeof record==="object"?record:{};
  let stage=DRAGON_COMPANION_STAGES.includes(source.stage)?source.stage:(source.hatched?"baby":"egg");
  let element=DRAGON_COMPANION_ELEMENTS.includes(source.element)?source.element:"mystery";
  if(stage!=="egg"&&element==="mystery")element=DRAGON_COMPANION_ELEMENTS.includes(source.sourceElement)?source.sourceElement:"lightning";
  const kills=Math.max(0,Math.floor(Number(source.kills||0)));
  const threshold=getDragonStageThreshold(stage);
  return{
    id:String(source.id||`dragon_companion_${index}_${Date.now()}`),
    sourceBattleId:String(source.sourceBattleId||""),
    sourceElement:DRAGON_COMPANION_ELEMENTS.includes(source.sourceElement)?source.sourceElement:"mystery",
    sourceType:String(source.sourceType||""),
    sourceGlobalDuel:Math.max(0,Math.floor(Number(source.sourceGlobalDuel||0))),
    stage,
    element,
    kills,
    ready:stage!=="adult"&&kills>=threshold,
    hatched:stage!=="egg",
    obtainedAt:Number(source.obtainedAt||Date.now()),
    evolvedAt:Number(source.evolvedAt||0)
  };
}
function getDragonCompanions(){
  try{return (JSON.parse(localStorage.getItem(DRAGON_EGG_STORAGE_KEY)||"[]")||[]).map(normalizeDragonCompanionRecord);}
  catch(e){return[];}
}
function saveDragonCompanions(records){
  const safe=(Array.isArray(records)?records:[]).map(normalizeDragonCompanionRecord);
  try{localStorage.setItem(DRAGON_EGG_STORAGE_KEY,JSON.stringify(safe));}catch(e){}
  return safe;
}
/* Mantiene compatibilidad con el módulo de contratos. */
getDragonEggs=function(){return getDragonCompanions();};
saveDragonEggs=function(records){return saveDragonCompanions(records);};

function makeDragonCompanionCard(stage,element){
  if(stage==="egg")return{
    key:"dragon_egg",name:"Huevo de Dragón",type:"unit",icon:"🥚",portrait:DRAGON_COMPANION_ASSETS.egg.hand,fieldFigure:DRAGON_COMPANION_ASSETS.egg.field,
    rarity:"Especial",special:true,beast:true,assetBucket:"beasts",personalCharacter:true,dragonCompanion:true,dragonEgg:true,dragonStage:"egg",dragonElement:"mystery",
    cost:2,hp:50,atk:0,guard:0,dex:0,agi:0,mov:0,range:0,immobile:true,cannotAttack:true,cannotDefend:true,
    text:"Personaje Personal opcional. No reemplaza al líder. Mientras permanezca vivo en el campo, todas las eliminaciones aliadas cuentan para su incubación. Si es destruido, no pierdes el duelo; conserva el progreso y deja de contar durante ese combate. Eclosiona al terminar un duelo después de alcanzar 1000 eliminaciones."
  };
  const stats=DRAGON_COMPANION_STATS[element][stage];
  const visualStage=stage==="baby"?"baby":`${stage}_${element}`;
  const stageName=dragonStageLabel(stage);
  const elementName=dragonElementLabel(element);
  const rarity=stage==="baby"?"Gloriosa":stage==="young"?"Mítica":"Astral";
  const threshold=stage==="baby"?5000:stage==="young"?10000:10000;
  const growthText=stage==="adult"?"Forma adulta completa.":`Evoluciona después del duelo al alcanzar ${threshold} eliminaciones acumuladas.`;
  return{
    key:dragonCardKey(stage,element),name:`Dragón ${stageName} de ${elementName}`,type:"unit",
    icon:element==="fire"?"🔥":element==="ice"?"❄️":"⚡",portrait:DRAGON_COMPANION_ASSETS[visualStage].hand,fieldFigure:DRAGON_COMPANION_ASSETS[visualStage].field,
    rarity,special:true,beast:true,assetBucket:"beasts",personalCharacter:true,dragonCompanion:true,dragonStage:stage,dragonElement:element,
    cost:stage==="adult"?10:stage==="young"?7:4,...stats,aerial:true,flight:true,
    text:`Vuelo: las unidades terrestres cuerpo a cuerpo y las trampas de suelo no pueden afectarlo. ${growthText}`
  };
}

const DRAGON_COMPANION_CARDS=[makeDragonCompanionCard("egg","mystery")];
for(const element of DRAGON_COMPANION_ELEMENTS){
  DRAGON_COMPANION_CARDS.push(makeDragonCompanionCard("baby",element));
  DRAGON_COMPANION_CARDS.push(makeDragonCompanionCard("young",element));
  DRAGON_COMPANION_CARDS.push(makeDragonCompanionCard("adult",element));
}
const DRAGON_COMPANION_CARD_BY_KEY=Object.freeze(Object.fromEntries(DRAGON_COMPANION_CARDS.map(card=>[card.key,card])));

(function registerDragonCompanionCards(){
  CARD_PORTRAITS.dragonEgg=DRAGON_COMPANION_ASSETS.egg.hand;
  CARD_PORTRAITS.babyDragon=DRAGON_COMPANION_ASSETS.baby.hand;
  for(const card of DRAGON_COMPANION_CARDS){
    const existing=CARD_TEMPLATES.find(item=>item&&item.key===card.key);
    if(existing)Object.assign(existing,card);else CARD_TEMPLATES.push(card);
    if(typeof CARD_VISUALS_BY_KEY!=="undefined")CARD_VISUALS_BY_KEY[card.key]={portrait:card.portrait,icon:card.icon};
  }
  globalThis.DRAGON_EGG_CARD=DRAGON_COMPANION_CARD_BY_KEY.dragon_egg;
  globalThis.DRAGON_COMPANION_CARDS=DRAGON_COMPANION_CARDS;
})();

function getDragonCompanionCardTemplate(key){return DRAGON_COMPANION_CARD_BY_KEY[String(key||"")]||null;}
function getDragonRecordCardKey(record){const safe=normalizeDragonCompanionRecord(record);return dragonCardKey(safe.stage,safe.element);}
function findDragonRecordForCardKey(key,records=getDragonCompanions()){
  return records.filter(record=>getDragonRecordCardKey(record)===String(key||"")).sort((a,b)=>a.obtainedAt-b.obtainedAt)[0]||null;
}
function getDragonRecordById(id,records=getDragonCompanions()){return records.find(record=>record.id===String(id||""))||null;}

function syncDragonCollectionFromRecords(records=getDragonCompanions()){
  if(typeof getPlayerCollection!=="function"||typeof savePlayerCollection!=="function")return;
  const counts={};
  records.forEach(record=>{const key=getDragonRecordCardKey(record);counts[key]=(counts[key]||0)+1;});
  const collection=getPlayerCollection();
  const nonDragon=(collection.cards||[]).filter(card=>!isDragonCompanionKey(card.key));
  Object.entries(counts).forEach(([key,qty])=>{
    const template=getDragonCompanionCardTemplate(key);
    if(template&&qty>0)nonDragon.push({...template,qty});
  });
  collection.cards=nonDragon;
  savePlayerCollection(collection);
  try{renderNotificationBadge?.();renderHomeProgress?.();}catch(e){}
}

/* Los contratos entregan un huevo real en colección y no predeterminan su elemento. */
grantDragonEgg=function(battle){
  const def=getDragonContractDefByBattle(battle);
  if(!def)return null;
  const records=getDragonCompanions();
  const record=normalizeDragonCompanionRecord({
    id:`dragon_egg_${Date.now()}_${Math.random().toString(36).slice(2,8)}`,
    sourceBattleId:battle.id,sourceElement:def.element,stage:"egg",element:"mystery",kills:0,obtainedAt:Date.now()
  });
  records.push(record);
  saveDragonCompanions(records);
  syncDragonCollectionFromRecords(records);
  return record;
};

function grantBeastmasterRareDragonEgg(source={}){
  const records=getDragonCompanions();
  const record=normalizeDragonCompanionRecord({
    id:`dragon_egg_beastmaster_${Date.now()}_${Math.random().toString(36).slice(2,8)}`,
    sourceBattleId:String(source?.adventureBattleId||source?.id||"beastmaster_annual_hunt"),
    sourceElement:"mystery",
    sourceType:"beastmaster_global_5000",
    sourceGlobalDuel:Math.max(0,Number(source?.beastmasterGlobalDuelNumber)||0),
    stage:"egg",element:"mystery",kills:0,obtainedAt:Date.now()
  });
  records.push(record);
  saveDragonCompanions(records);
  syncDragonCollectionFromRecords(records);
  return record;
}

function countDragonCardsInDeck(deck=[]){return(deck||[]).filter(card=>isDragonCompanionKey(card?.key)).length;}
const dragonOriginalMaxCopiesForCard=maxCopiesForCard;
maxCopiesForCard=function(card){return isDragonCompanionKey(card?.key)?3:dragonOriginalMaxCopiesForCard(card);};
const dragonOriginalValidateDeckList=validateDeckList;
validateDeckList=function(cards=[],principalSlots=getCurrentPrincipalSlots()){
  const result=dragonOriginalValidateDeckList(cards,principalSlots);
  const errors=[...(result.errors||[])];
  if(countDragonCardsInDeck(cards)>1)errors.push("Solo puedes llevar un Huevo o Dragón de cualquier etapa por mazo.");
  return{...result,errors,valid:errors.length===0};
};
const dragonOriginalValidatePrincipalSelection=validatePrincipalSelection;
validatePrincipalSelection=function(keys=[],deck=[],principalSlots=getCurrentPrincipalSlots()){
  const result=dragonOriginalValidatePrincipalSelection(keys,deck,principalSlots);
  const errors=[...(result.errors||[])];
  const dragonCards=(deck||[]).filter(card=>isDragonCompanionKey(card?.key));
  if(dragonCards.some(card=>!result.keys.includes(card.key)))errors.push("El Huevo o Dragón incluido en el mazo debe ocupar un espacio de Personaje Principal.");
  return{...result,errors,valid:errors.length===0};
};
const dragonOriginalAddCardToDeck=addCardToDeck;
addCardToDeck=function(cardKey){
  if(isDragonCompanionKey(cardKey)&&countDragonCardsInDeck(currentDeckDraft)>0){setHint("Solo puedes incluir un Huevo o Dragón por mazo.");return false;}
  return dragonOriginalAddCardToDeck(cardKey);
};
const dragonOriginalGetCraftLockReason=getCraftLockReason;
getCraftLockReason=function(card){
  if(isDragonCompanionKey(card?.key))return"Los huevos y dragones no se fabrican: se obtienen y evolucionan mediante los Contratos de las Bestias.";
  return dragonOriginalGetCraftLockReason(card);
};

function replaceDragonCardInSavedDeck(oldKey,newKey){
  const replacement=getDragonCompanionCardTemplate(newKey);
  if(!replacement)return;
  const deck=getSavedDeck();
  let changed=false;
  const nextDeck=deck.map(card=>{
    if(!changed&&card?.key===oldKey){changed=true;return{...replacement,qty:1};}
    return card;
  });
  if(changed)saveDeck(nextDeck);
  const principals=getSavedPrincipalKeys();
  const nextPrincipals=principals.map(key=>key===oldKey?newKey:key);
  if(nextPrincipals.some((key,index)=>key!==principals[index]))savePrincipalKeys(nextPrincipals);
}

function getLocalDragonOwner(){return Number(myPlayer||1);}
function setActiveDragonRecordId(id){
  try{id?sessionStorage.setItem(DRAGON_ACTIVE_RECORD_KEY,String(id)):sessionStorage.removeItem(DRAGON_ACTIVE_RECORD_KEY);}catch(e){}
}
function getActiveDragonRecordId(){try{return sessionStorage.getItem(DRAGON_ACTIVE_RECORD_KEY)||"";}catch(e){return"";}}
const dragonOriginalMakeStartingPrincipalUnit=makeStartingPrincipalUnit;
makeStartingPrincipalUnit=function(card,owner,leaderType,units=[],slotIndex=0){
  const unit=dragonOriginalMakeStartingPrincipalUnit(card,owner,leaderType,units,slotIndex);
  if(!unit||!isDragonCompanionKey(unit.key))return unit;
  const record=findDragonRecordForCardKey(unit.key);
  if(Number(owner)===getLocalDragonOwner()&&record)setActiveDragonRecordId(record.id);
  const threshold=getDragonStageThreshold(record?.stage||unit.dragonStage||"adult");
  return{
    ...unit,dragonCompanion:true,dragonCompanionId:record?.id||"",dragonStage:record?.stage||unit.dragonStage,
    dragonElement:record?.element||unit.dragonElement,dragonKills:Number(record?.kills||0),dragonThreshold:threshold,
    aerial:unit.key!=="dragon_egg",flight:unit.key!=="dragon_egg",immobile:unit.key==="dragon_egg",cannotAttack:unit.key==="dragon_egg",cannotDefend:unit.key==="dragon_egg"
  };
};
const dragonOriginalMakeStartingPrincipalUnits=makeStartingPrincipalUnits;
makeStartingPrincipalUnits=function(cards=[],owner,leaderType,units=[],principalSlots=(cards||[]).length){
  if(Number(owner)===getLocalDragonOwner())setActiveDragonRecordId("");
  return dragonOriginalMakeStartingPrincipalUnits(cards,owner,leaderType,units,principalSlots);
};


function getDragonCompanionStatusStacks(attacker){return attacker?.dragonStage==="baby"?1:2;}
function applyDragonCompanionElementStatus(unit,attacker,stacks=1,state=publicState){
  if(!unit||Number(unit.hp||0)<=0||!attacker)return unit;
  const def={element:attacker.dragonElement,enemyName:attacker.name};
  let next=dragonApplyElementStatus(unit,def,stacks,state);
  if(attacker.dragonElement==="ice"&&Number(next?.dragonFrostTurns||0)>0){
    const stage=attacker.dragonStage||"adult";
    const movPenalty=stage==="baby"?1:2;
    const agiPenalty=stage==="adult"?2:1;
    next={...next,dragonFrostMovPenalty:movPenalty,dragonFrostAgiPenalty:agiPenalty};
  }
  return next;
}
function getDragonCompanionAreaDamage(attacker,cell){
  const stage=attacker?.dragonStage||"adult";
  const element=attacker?.dragonElement||"lightning";
  if(element==="lightning"){
    const table={baby:[3,2],young:[4,3],adult:[5,4]}[stage]||[5,4];
    return Number(cell?.depth||0)>=2?table[1]:table[0];
  }
  const corner=Math.abs(Number(cell?.dx||0))+Math.abs(Number(cell?.dy||0))===2;
  if(element==="fire"){
    const table={baby:[3,2],young:[5,3],adult:[6,4]}[stage]||[6,4];
    return corner?table[1]:table[0];
  }
  const table={baby:[2,1],young:[3,2],adult:[4,3]}[stage]||[4,3];
  return corner?table[1]:table[0];
}
function applyDragonCompanionAttackEffects(units,attacker,target,context={}){
  let out=[...(units||[])];
  if(!attacker||!target||!isDragonCompanionKey(attacker.key)||attacker.key==="dragon_egg"||!context.hit){
    return{units:out,text:"",statusFxEvent:null,floatFxEvent:null};
  }
  const stacks=getDragonCompanionStatusStacks(attacker);
  let primary=out.find(unit=>unit.id===target.id&&Number(unit.hp||0)>0)||null;
  if(primary){
    out=out.map(unit=>unit.id===primary.id?applyDragonCompanionElementStatus(unit,attacker,stacks,context.state):unit);
    primary=out.find(unit=>unit.id===target.id)||primary;
  }
  const areaMode=Number(attacker.dragonCharge||0)>=2;
  if(!areaMode){
    const label=attacker.dragonElement==="fire"?"Quemadura":attacker.dragonElement==="ice"?"Escarcha":"Electrocución";
    return{units:out,text:` ${attacker.name} aplica ${label} ${stacks}.`,statusFxEvent:primary?makeStatusFxEvent(dragonElementFxType({element:attacker.dragonElement}),primary,1):null,floatFxEvent:null};
  }
  const cells=attacker.dragonElement==="lightning"?dragonCellsLightning3x3(attacker,target):dragonCellsCentered3x3(target);
  const unique=new Map(cells.filter(dragonInBounds).map(cell=>[`${cell.x},${cell.y}`,cell]));
  const secondaryIds=[];
  let firstAffected=null,totalSecondaryDamage=0;
  for(const cell of unique.values()){
    const victim=out.find(unit=>unit&&unit.id!==target.id&&Number(unit.owner)!==Number(attacker.owner)&&canReceiveUntargetedAreaEffect(unit)&&unit.x===cell.x&&unit.y===cell.y);
    if(!victim||secondaryIds.includes(victim.id))continue;
    const damage=getDragonCompanionAreaDamage(attacker,cell);
    out=out.map(unit=>{
      if(unit.id!==victim.id)return unit;
      let next=dragonApplyDamageToUnit(unit,damage);
      if(Number(next.hp||0)>0)next=applyDragonCompanionElementStatus(next,attacker,1,context.state);
      if(!firstAffected)firstAffected=next;
      return next;
    });
    secondaryIds.push(victim.id);totalSecondaryDamage+=damage;
  }
  const areaName=attacker.dragonElement==="fire"?"Erupción ígnea":attacker.dragonElement==="ice"?"Estallido glacial":"Tormenta dirigida";
  const stealthAreaDamageEvent=typeof makeStage8StealthAreaDamageEvent==="function"
    ?makeStage8StealthAreaDamageEvent(attacker.owner,target.owner,{kind:"cell_guard_damage",label:areaName,cells:[...unique.values()].map(cell=>({x:cell.x,y:cell.y,damage:getDragonCompanionAreaDamage(attacker,cell)})),element:attacker.dragonElement,sourceName:attacker.name,dragonStage:attacker.dragonStage,statusStacks:1})
    :null;
  return{
    units:out,
    text:` ${areaName}: el tercer ataque alcanza ${secondaryIds.length} objetivo${secondaryIds.length===1?" secundario":"s secundarios"} con daño atenuado.`,
    statusFxEvent:firstAffected?makeStatusFxEvent(dragonElementFxType({element:attacker.dragonElement}),firstAffected,1):(primary?makeStatusFxEvent(dragonElementFxType({element:attacker.dragonElement}),primary,1):null),
    floatFxEvent:firstAffected?makeFloatFxEvent("damage",firstAffected,totalSecondaryDamage||1):null,
    stealthAreaDamageEvent
  };
}

/* Escarcha escala con la edad del dragón: bebé -1/-1, joven -2 MOV/-1 AGI, adulto -2/-2. */
const dragonGrowthOriginalEffectiveAgi=effectiveAgi;
effectiveAgi=function(unit){
  let value=dragonGrowthOriginalEffectiveAgi(unit);
  if(Number(unit?.dragonFrostTurns||0)>0&&Number.isFinite(Number(unit?.dragonFrostAgiPenalty))){
    value+=Math.max(0,2-Number(unit.dragonFrostAgiPenalty));
  }
  return Math.max(0,value);
};
const dragonGrowthOriginalEffectiveMov=effectiveMov;
effectiveMov=function(unit){
  let value=dragonGrowthOriginalEffectiveMov(unit);
  if(Number(unit?.dragonFrostTurns||0)>0&&Number.isFinite(Number(unit?.dragonFrostMovPenalty))){
    value+=Math.max(0,2-Number(unit.dragonFrostMovPenalty));
  }
  return Math.max(0,value);
};

const dragonOriginalAttackUnit=attackUnit;
attackUnit=async function(attacker,defender){
  if(attacker?.key==="dragon_egg"||attacker?.cannotAttack)return setHint("El Huevo de Dragón no puede atacar.");
  return dragonOriginalAttackUnit(attacker,defender);
};
const dragonOriginalActivateDefenseStance=activateDefenseStance;
activateDefenseStance=async function(unit){
  if(unit?.key==="dragon_egg"||unit?.cannotDefend)return setHint("El Huevo de Dragón no puede usar DEF.");
  return dragonOriginalActivateDefenseStance(unit);
};

function getActiveLivingDragonUnit(state){
  const owner=getLocalDragonOwner();
  return(state?.units||[]).find(unit=>unit&&Number(unit.owner)===owner&&unit.principal&&isDragonCompanionKey(unit.key)&&Number(unit.hp||0)>0)||null;
}
function getNewEnemyDeaths(prevState,nextState){
  if(!prevState||!nextState)return[];
  const owner=getLocalDragonOwner();
  const nextById=new Map((nextState.units||[]).map(unit=>[unit.id,unit]));
  return(prevState.units||[]).filter(unit=>{
    if(!unit||unit.leader||Number(unit.owner)===owner||Number(unit.hp||0)<=0)return false;
    const after=nextById.get(unit.id);
    return!after||Number(after.hp||0)<=0;
  });
}
function addDragonProgress(recordId,amount){
  const records=getDragonCompanions();
  const index=records.findIndex(record=>record.id===recordId);
  if(index<0||amount<=0)return null;
  const record=records[index];
  if(record.stage==="adult")return record;
  const threshold=getDragonStageThreshold(record.stage);
  const nextKills=Math.min(threshold,Math.max(0,Number(record.kills||0)+Math.floor(amount)));
  records[index]={...record,kills:nextKills,ready:nextKills>=threshold};
  saveDragonCompanions(records);
  return records[index];
}
function maybeAccumulateDragonKills(prevState,nextState){
  if(!prevState||!nextState||nextState.mode==="tutorial"||nextState.phase==="ended")return;
  const dragon=getActiveLivingDragonUnit(nextState);
  if(!dragon)return;
  const deaths=getNewEnemyDeaths(prevState,nextState);
  if(!deaths.length)return;
  const recordId=dragon.dragonCompanionId||getActiveDragonRecordId()||findDragonRecordForCardKey(dragon.key)?.id;
  if(!recordId)return;
  const updated=addDragonProgress(recordId,deaths.length);
  if(!updated)return;
  const threshold=getDragonStageThreshold(updated.stage);
  setHint(`${dragon.name}: ${updated.kills}/${threshold} eliminaciones acumuladas${updated.ready?" · evolución preparada al terminar el duelo":""}.`);
  setTimeout(()=>{try{render?.();}catch(e){}},0);
}
const dragonOriginalMaybeProcessVeilCurseKillEvent=maybeProcessVeilCurseKillEvent;
maybeProcessVeilCurseKillEvent=function(prevState,nextState){
  const result=dragonOriginalMaybeProcessVeilCurseKillEvent(prevState,nextState);
  maybeAccumulateDragonKills(prevState,nextState);
  return result;
};

function evolveDragonRecord(record){
  const current=normalizeDragonCompanionRecord(record);
  if(!current.ready||current.stage==="adult")return null;
  const oldKey=getDragonRecordCardKey(current);
  let nextStage=current.stage,nextElement=current.element;
  if(current.stage==="egg"){
    nextStage="baby";
    nextElement=DRAGON_COMPANION_ELEMENTS[Math.floor(Math.random()*DRAGON_COMPANION_ELEMENTS.length)];
  }else if(current.stage==="baby")nextStage="young";
  else if(current.stage==="young")nextStage="adult";
  const next=normalizeDragonCompanionRecord({...current,stage:nextStage,element:nextElement,ready:false,hatched:true,evolvedAt:Date.now()});
  return{old:current,next,oldKey,newKey:getDragonRecordCardKey(next)};
}
function processDragonGrowthAfterBattle(state){
  if(!state||state.phase!=="ended"||!state.endedAt)return[];
  const battleKey=`${gameId||state.code||"local"}:${state.endedAt}`;
  try{if(localStorage.getItem(DRAGON_GROWTH_BATTLE_KEY)===battleKey)return[];localStorage.setItem(DRAGON_GROWTH_BATTLE_KEY,battleKey);}catch(e){}
  let activeId=getActiveDragonRecordId();
  const records=getDragonCompanions();
  if(!activeId){
    const owner=getLocalDragonOwner();
    const fieldDragon=(state.units||[]).find(unit=>unit&&Number(unit.owner)===owner&&unit.principal&&isDragonCompanionKey(unit.key));
    if(fieldDragon?.dragonCompanionId)activeId=fieldDragon.dragonCompanionId;
    if(!activeId){
      const principalKeys=[...(privateState?.principalKeys||[]),privateState?.principalKey].filter(Boolean);
      const dragonKey=principalKeys.find(isDragonCompanionKey);
      if(dragonKey)activeId=findDragonRecordForCardKey(dragonKey,records)?.id||"";
    }
  }
  if(!activeId)return[];
  const index=records.findIndex(record=>record.id===activeId);
  if(index<0)return[];
  const evolution=evolveDragonRecord(records[index]);
  if(!evolution)return[];
  records[index]=evolution.next;
  saveDragonCompanions(records);
  syncDragonCollectionFromRecords(records);
  replaceDragonCardInSavedDeck(evolution.oldKey,evolution.newKey);
  setActiveDragonRecordId("");
  const title=evolution.old.stage==="egg"?"El huevo ha eclosionado":`${dragonStageLabel(evolution.old.stage)} evolucionado`;
  const message=evolution.old.stage==="egg"
    ?`El Huevo de Dragón alcanzó 1000 eliminaciones y nació un Dragón Bebé de ${dragonElementLabel(evolution.next.element)}.`
    :`${dragonElementLabel(evolution.next.element)} alcanzó ${evolution.next.kills} eliminaciones y evolucionó a Dragón ${dragonStageLabel(evolution.next.stage)}.`;
  setTimeout(()=>hvAlert(message,title),260);
  return[evolution];
}
const dragonOriginalMaybeShowBattleResult=maybeShowBattleResult;
maybeShowBattleResult=function(){
  const result=dragonOriginalMaybeShowBattleResult();
  processDragonGrowthAfterBattle(publicState);
  return result;
};

function getDragonProgressRecordForUnit(unit){
  if(!unit||!isDragonCompanionKey(unit.key))return null;
  return getDragonRecordById(unit.dragonCompanionId||getActiveDragonRecordId())||findDragonRecordForCardKey(unit.key);
}
function getDragonProgressHtml(unit){
  const record=getDragonProgressRecordForUnit(unit);
  if(!record)return"";
  const threshold=getDragonStageThreshold(record.stage);
  const label=record.stage==="adult"?"ADULTO":`${record.kills}/${threshold}`;
  return`<span class="dragon-growth-badge ${record.ready?"is-ready":""}" title="Progreso dracónico: ${label}">${label}</span>`;
}
const dragonOriginalGetUnitStatusBubblesHtml=getUnitStatusBubblesHtml;
getUnitStatusBubblesHtml=function(unit){return`${dragonOriginalGetUnitStatusBubblesHtml(unit)}${getDragonProgressHtml(unit)}`;};

const dragonOriginalGetErictoEligibleCorpses=getErictoEligibleCorpses;
getErictoEligibleCorpses=function(ericto,graveyard=publicState?.erictoGraveyard||[]){
  return dragonOriginalGetErictoEligibleCorpses(ericto,graveyard).filter(record=>!isDragonCompanionKey(record?.snapshot?.key));
};
const dragonOriginalGetAcolyteEligibleCorpses=getAcolyteEligibleCorpses;
getAcolyteEligibleCorpses=function(caster,graveyard=publicState?.erictoGraveyard||[]){
  return dragonOriginalGetAcolyteEligibleCorpses(caster,graveyard).filter(record=>!isDragonCompanionKey(record?.snapshot?.key));
};

(function installDragonGrowthStyles(){
  if(document.getElementById("dragonGrowthStyles"))return;
  const style=document.createElement("style");
  style.id="dragonGrowthStyles";
  style.textContent=`
    .dragon-growth-badge{position:absolute;left:50%;top:4px;z-index:12;transform:translateX(-50%);padding:2px 6px;border:1px solid rgba(172,217,255,.78);border-radius:999px;background:rgba(4,14,28,.86);box-shadow:0 0 10px rgba(77,173,255,.45);color:#dff5ff;font-size:9px;font-weight:900;letter-spacing:.03em;white-space:nowrap;pointer-events:none}
    .dragon-growth-badge.is-ready{border-color:#ffd36a;background:rgba(42,24,3,.9);color:#fff0a5;box-shadow:0 0 14px rgba(255,189,50,.72);animation:dragonGrowthReady 1s ease-in-out infinite alternate}
    @keyframes dragonGrowthReady{from{transform:translateX(-50%) scale(1)}to{transform:translateX(-50%) scale(1.08)}}
  `;
  document.head.appendChild(style);
})();

/* Migra huevos antiguos y vuelve a construir las cantidades de colección. */
(function migrateDragonCompanions(){
  const records=saveDragonCompanions(getDragonCompanions());
  syncDragonCollectionFromRecords(records);
})();
