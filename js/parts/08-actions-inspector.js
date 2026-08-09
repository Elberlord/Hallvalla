"use strict";
/* HallValla 7BOARDCTRL8AC · Acciones, selección, inspector y guías tácticas */

function summonZones(player){const l=getLeader(player);if(!l)return[];const res=[];for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++){if(getUnitAt(x,y))continue;if(dist(l,{x,y})<=1)res.push(`${x},${y}`)}return res}
function isFreshSummonedThisTurn(u){return !!(u&&u.summonedTurnKey&&publicState?.turnKey&&u.summonedTurnKey===publicState.turnKey&&u.owner===publicState.currentPlayer)}
function normalizeFreshSummonsForActionPhase(units,player,turnKey){
  return (units||[]).map(u=>{
    if(!u||u.leader||u.owner!==player||!turnKey||u.summonedTurnKey!==turnKey)return u;
    return {...u,hallvallaReadyOnSummon:true,acted:false,moved:false,movedSpaces:0,lastMoveStraightDistance:0,lastMoveDistance:0,lastMoveDx:0,lastMoveDy:0,lastMoveTurnKey:""};
  });
}
function isUnitActionWindow(u){return !!(u&&isMyTurn()&&u.owner===myPlayer&&isActionPhase())}
function isUnitMoveWindow(u){return !!(u&&!u.leader&&isUnitActionWindow(u))}
function unitActionPhaseHint(action="acción"){return `En HallValla, las invocaciones usan ${action} en Action Phase, incluso si fueron invocadas este mismo turno.`}
function getLiveUnitRef(unitOrId,units=publicState?.units||[]){
  const id=typeof unitOrId==="string"?unitOrId:unitOrId?.id;
  return (id?(units||[]).find(u=>u.id===id):null)||((unitOrId&&typeof unitOrId==="object")?unitOrId:null);
}
function getUnitAttackRange(u){
  // Las clases cuerpo a cuerpo no pueden heredar RG 2/3 por coincidencias de texto
  // ni por unidades antiguas guardadas con datos corruptos.
  if(isLanceUnitCardLike(u))return 1;
  const cls=String(getWeaponClassForCard(u)||"").toLowerCase();
  if(!u?.leader&&MELEE_RANGE_ONE_CLASSES.has(cls)&&!hasExplicitRangedWeapon(u))return 1;
  const baseRange=Number(u?.range||1)||1;
  const bonus=getLeaderBonus(u);
  const arcaneLink=getArcaneAdeptLinkBonus(u);
  let range=baseRange+Number(bonus.range||0)+Number(arcaneLink.range||0)+Number(getEquipmentRangeBonus(u)||0)-Number(u?.tempRangeDebuff||0);
  if(!u?.leader&&cls==="bow")range=Math.min(4,range);
  return Math.max(1,range);
}
function isMulanExecutionMoveReady(u){return !!(u&&u.key==="mulan"&&u.mulanExecutionMoveReady);}
function isMulanExecutionChoiceReady(u){return !!(u&&u.key==="mulan"&&u.mulanExecutionChoiceReady);}
function isKhalidChainAttackReady(u){return !!(u&&u.key==="khalid_ibn_al_walid"&&u.khalidChainReady);}
function getKhalidAttackPenalty(u){return u?.key==="khalid_ibn_al_walid"?Math.max(0,Number(u.khalidAttackPenalty||0)):0;}
function getGenghisMovDebuff(u){return u&&u.genghisMovDebuffTurnKey&&u.genghisMovDebuffTurnKey===publicState?.turnKey?Math.max(1,Number(u.genghisMovDebuff||1)):0;}
function getHannibalMovDebuff(u){return u&&u.hannibalMovDebuffTurnKey&&u.hannibalMovDebuffTurnKey===publicState?.turnKey?Math.max(1,Number(u.hannibalMovDebuff||1)):0;}
function getHannibalAtkDebuff(u){return u&&u.hannibalAtkDebuffTurnKey&&u.hannibalAtkDebuffTurnKey===publicState?.turnKey?Math.max(1,Number(u.hannibalAtkDebuff||1)):0;}
function canUnitDeclareAttack(u){
  const live=getLiveUnitRef(u);
  if(!live)return false;
  if(!isMyTurn()||!isActionPhase()||live.owner!==myPlayer)return false;
  if(live.acted&&!isMulanExecutionChoiceReady(live)&&!isKhalidChainAttackReady(live))return false;
  if(live.noAttackTurnKey&&live.noAttackTurnKey===publicState?.turnKey)return false;
  return true;
}
function getAttackableTargets(u,units=publicState?.units||[]){
  const live=getLiveUnitRef(u,units);
  if(!canUnitDeclareAttack(live))return[];
  const rg=getUnitAttackRange(live)+(live.key==="bengal_tiger"&&isStealthedUnit(live)?2:0);
  return (units||[]).filter(t=>t&&t.id!==live.id&&t.owner!==live.owner&&(t.hp===undefined||t.hp>0)&&dist(live,t)<=rg&&canTargetStealth(live,t)&&canUnitAttackTarget(live,t)&&(!(t.aerial)||(getUnitAttackRange(live)>3||live.antiaerial)));
}
function moveZones(u){const live=getLiveUnitRef(u);if(!live||!isUnitMoveWindow(live))return[];const mulanExecMove=isMulanExecutionMoveReady(live);if(!mulanExecMove&&(live.moved||live.acted))return[];if(!mulanExecMove&&live.noMoveTurnKey&&live.noMoveTurnKey===publicState?.turnKey)return[];const res=[];const maxMove=mulanExecMove?1:effectiveMov(live);for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++){if(x===live.x&&y===live.y)continue;if(getUnitAt(x,y))continue;if(dist(live,{x,y})<=maxMove)res.push(`${x},${y}`)}return res}
function attackZones(u){return getAttackableTargets(u).map(t=>`${t.x},${t.y}`)}
function attackRangeCells(u){
  if(!u)return[];
  const rg=getUnitAttackRange(u);
  const res=[];
  for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++){
    if(x===u.x&&y===u.y)continue;
    if(dist(u,{x,y})<=rg)res.push(`${x},${y}`);
  }
  return res;
}
function getTacticalPreviewClasses(x,y){
  const dragKey=`${x},${y}`;
  if(dragMoveHighlights.includes(dragKey)&&dragAttackHighlights.includes(dragKey))return["mixed-range-preview"];
  if(dragMoveHighlights.includes(dragKey))return["move-range-preview"];
  if(dragAttackHighlights.includes(dragKey))return["attack-range-preview"];
  if(dragSummonHighlights.includes(dragKey))return["summonable"];
  if(selectedCard||selectedUnitActionMode||!unitContextSelection||!publicState)return[];
  const u=getUnit(unitContextSelection.unitId);
  if(!u)return[];
  const key=`${x},${y}`;
  const attackSet=new Set(attackRangeCells(u));

  // Lectura de amenaza enemiga: al tocar una unidad rival, el tablero muestra
  // SIEMPRE sus casillas de ataque desde su posición actual, aunque no sea tu turno
  // o no estemos en Action Phase. Sirve para planear sin tener que adivinar.
  if(u.owner!==myPlayer){
    if(!attackSet.has(key))return[];
    return [u.acted?"enemy-acted-threat-preview":"enemy-threat-preview"];
  }

  const moveSet=new Set((isUnitMovePhase()&&!u.moved)?moveZones(u):[]);
  if(u.acted&&attackSet.has(key))return["acted-range-preview"];
  if(u.moved&&attackSet.has(key))return["attack-range-preview"];
  if(moveSet.has(key)&&attackSet.has(key))return["mixed-range-preview"];
  if(moveSet.has(key))return["move-range-preview"];
  if(attackSet.has(key))return["attack-range-preview"];
  return[];
}
function clearSelection(){selectedCard=null;selectedUnitId=null;selectedUnitActionMode=null;selectedUnitEffectChoice=null;cardInspectSelection=null;unitContextSelection=null;hideUnitContextMenu();hideCardInspectModal();highlights=[];highlightType="move";dragMoveHighlights=[];dragAttackHighlights=[];dragSummonHighlights=[];render()}
function getCardPlayState(card){
  if(!card)return{canPlay:false,reason:"Carta no disponible."};
  if(isBattleEnded())return{canPlay:false,reason:"La batalla ya terminó."};
  if(!isMyTurn())return{canPlay:false,reason:"No es tu turno."};
  if(!isHandPlayPhase())return{canPlay:false,reason:`Solo puedes jugar cartas desde la mano en Main Phase o Last Phase. Fase actual: ${turnPhaseLabel()}.`};
  const honor=capResourceAmount(privateState?.honor||0,privateState?.maxHonor||0);
  if(honor<effectiveCardCost(card,myPlayer))return{canPlay:false,reason:`Necesitas ${effectiveCardCost(card,myPlayer)} ${getResourceLabel(myPlayer)}. Tienes ${honor}.`};
  if(card.type==="unit"&&summonZones(myPlayer).length===0)return{canPlay:false,reason:"No hay casillas libres junto a tu líder."};
  if(card.type==="equipment"&&!isEquipmentCardAllowedForLeader(card,getLeaderTypeForOwner(myPlayer)))return{canPlay:false,reason:`${card.name} solo puede usarse con ${getEquipmentLeaderLabel(card)}.`};
  if(card.type==="equipment"&&!(publicState.units||[]).some(u=>canEquipCardToUnit(card,u,myPlayer,publicState.units||[])))return{canPlay:false,reason:"No tienes una unidad compatible disponible para equipar."};
  if(card.spell==="damage"&&!(publicState.units||[]).some(u=>u.owner!==myPlayer))return{canPlay:false,reason:"No hay objetivos rivales para este hechizo."};
  if(card.spell==="buff"&&!(publicState.units||[]).some(u=>u.owner===myPlayer))return{canPlay:false,reason:"No hay unidades aliadas para potenciar."};
  if((card.spell==="shield"||card.trap==="guard")&&!(publicState.units||[]).some(u=>u.owner===myPlayer))return{canPlay:false,reason:"No hay unidades aliadas para proteger."};
  if(card.spell==="heal"&&!(publicState.units||[]).some(u=>canHealOrCleanseUnit(u,myPlayer)))return{canPlay:false,reason:"No hay unidades aliadas heridas o con estados curables."};
  if(card.trap==="slow"&&!(publicState.units||[]).some(u=>u.owner!==myPlayer&&!u.leader))return{canPlay:false,reason:"No hay invocaciones rivales válidas para esta trampa."};
  if(card.trap==="legendary_mark"&&getActiveLegendaryTraps().some(t=>t.owner===myPlayer&&t.cardKey===card.key))return{canPlay:false,reason:"Ya tienes esta Trampa Legendaria activa."};
  if(card.trap==="legendary_mark"&&!hasValidLegendaryTrapTarget(card,myPlayer,publicState.units||[],publicState))return{canPlay:false,reason:"No hay unidades rivales que cumplan las condiciones de esta Trampa Legendaria."};
  return{canPlay:true,reason:"Lista para jugar."};
}
function getPlayableCardsInHand(){
  const hand=privateState?.hand||[];
  if(!publicState||!privateState||!isMyTurn()||isBattleEnded())return[];
  return hand.filter(c=>getCardPlayState(c).canPlay);
}
function hasPlayableCardsInHand(){return getPlayableCardsInHand().length>0}
function hasAvailableFieldMoves(player=myPlayer){
  if(!publicState||isBattleEnded())return false;
  return (publicState.units||[]).some(u=>u.owner===player&&!u.moved&&moveZones(u).length>0);
}
function canPlayCardWithSnapshot(card,honor,phase,units,player){
  if(!card)return false;
  if(!(phase==="main"||phase==="last"))return false;
  if((honor||0)<(typeof effectiveCardCost==="function"?effectiveCardCost(card,player):(card.cost||0)))return false;
  const unitsList=units||[];
  const unitAt=(x,y)=>unitsList.find(u=>u.x===x&&u.y===y);
  const leader=unitsList.find(u=>u.owner===player&&u.leader);
  const hasSummonZone=()=>{
    if(!leader)return false;
    for(let yy=0;yy<ROWS;yy++)for(let xx=0;xx<COLS;xx++){
      if(unitAt(xx,yy))continue;
      if(Math.max(Math.abs(leader.x-xx),Math.abs(leader.y-yy))<=1)return true;
    }
    return false;
  };
  if(card.type==="unit")return hasSummonZone();
  if(card.type==="equipment"){
    const leader=unitsList.find(u=>u.owner===player&&u.leader&&u.hp>0);
    return !!leader&&isEquipmentCardAllowedForLeader(card,leader.leaderType)&&unitsList.some(u=>canEquipCardToUnit(card,u,player,unitsList));
  }
  if(card.spell==="damage")return unitsList.some(u=>u.owner!==player);
  if(card.spell==="buff")return unitsList.some(u=>u.owner===player);
  if(card.spell==="shield"||card.trap==="guard")return unitsList.some(u=>u.owner===player);
  if(card.spell==="heal")return unitsList.some(u=>{
    const max=(typeof effectiveMaxHp==="function"?effectiveMaxHp(u):(u.maxHp||u.hp||0));
    return u.owner===player&&!u.noHealWhilePoisoned&&((u.hp||0)<max||hasCurableStatus(u));
  });
  if(card.trap==="slow")return unitsList.some(u=>u.owner!==player&&!u.leader);
  if(card.trap==="legendary_mark")return hasValidLegendaryTrapTarget(card,player,unitsList,publicState);
  return true;
}
function handHasPlayableWithSnapshot(hand,honor,phase,units,player){
  return (hand||[]).some(c=>canPlayCardWithSnapshot(c,honor,phase,units,player));
}
function resetNoPlayableAutoAdvanceState(){
  if(noPlayableAutoAdvanceTimer){clearTimeout(noPlayableAutoAdvanceTimer);noPlayableAutoAdvanceTimer=null;}
  noPlayableAutoAdvanceKey="";
  noPlayableAutoAdvanceLock=false;
}
function getNoPlayableAutoAdvanceKey(){
  const phase=getTurnPhase();
  const handSignature=(privateState?.hand||[]).map(c=>c.id||c.key||c.name||"card").join("|");
  return `${gameId||"no-game"}:${publicState?.turnKey||"no-turn"}:${myPlayer||0}:${phase}:${privateState?.honor||0}:${handSignature}`;
}
function scheduleAutoAdvanceIfNoPlayableHand(delayMs=520){
  if(!gameId||!publicState||!privateState||isBattleEnded())return;
  if(publicState.mode==="tutorial")return;
  if(!isMyTurn()||!isHandPlayPhase())return;
  if(privateState.lastTurnStarted!==publicState.turnKey)return;
  const inspectModal=$("cardInspectModal");
  const inspectOpen=!!(inspectModal&&!inspectModal.classList.contains("hidden"));
  if(selectedCard||inspectOpen)return;
  if(hasPlayableCardsInHand())return;

  const phaseAtSchedule=getTurnPhase();
  const key=getNoPlayableAutoAdvanceKey();
  if(noPlayableAutoAdvanceLock||noPlayableAutoAdvanceKey===key)return;
  if(noPlayableAutoAdvanceTimer){clearTimeout(noPlayableAutoAdvanceTimer);noPlayableAutoAdvanceTimer=null;}
  noPlayableAutoAdvanceKey=key;

  noPlayableAutoAdvanceTimer=setTimeout(async()=>{
    noPlayableAutoAdvanceTimer=null;
    let advanced=false;
    try{
      if(!gameId||!publicState||!privateState||isBattleEnded())return;
      if(publicState.mode==="tutorial")return;
      if(!isMyTurn()||getTurnPhase()!==phaseAtSchedule)return;
      if(privateState.lastTurnStarted!==publicState.turnKey)return;
      const inspectModal=$("cardInspectModal");
      const inspectOpen=!!(inspectModal&&!inspectModal.classList.contains("hidden"));
      if(selectedCard||inspectOpen||hasPlayableCardsInHand())return;

      noPlayableAutoAdvanceLock=true;
      handOpen=false;
      handManualCloseKey="";
      clearSelection();

      if(phaseAtSchedule==="main"){
        const readyUnits=normalizeFreshSummonsForActionPhase(publicState.units||[],myPlayer,publicState.turnKey||"");
        await updatePublic({
          units:readyUnits,
          turnPhase:"actions",
          log:[`J${myPlayer} no tiene cartas jugables en Main Phase: avanza automáticamente a Action Phase.`,...(publicState.log||[])].slice(0,18)
        });
        setHint("No tienes cartas jugables. Action Phase iniciada automáticamente.");
        advanced=true;
        return;
      }

      if(phaseAtSchedule==="last"){
        await updatePublic({
          turnPhase:"end",
          log:[`J${myPlayer} no tiene cartas jugables en Last Phase: pasa automáticamente a End Phase.`,...(publicState.log||[])].slice(0,18)
        });
        await finishTurn();
        advanced=true;
      }
    }catch(e){
      console.warn("[HallValla] Auto avance por ausencia de cartas jugables falló:",e);
      setHint("No se pudo avanzar automáticamente. Usa el botón de fase para continuar.");
    }finally{
      noPlayableAutoAdvanceLock=false;
      if(!advanced&&noPlayableAutoAdvanceKey===key)noPlayableAutoAdvanceKey="";
    }
  },Math.max(120,Number(delayMs)||520));
}
function scheduleAutoAdvanceIfHandEmptyAfterPlay(handSnapshot,honorSnapshot){
  if(!gameId||!publicState||!privateState||!isMyTurn()||!isHandPlayPhase())return;
  const phaseAtPlay=getTurnPhase();
  if(handHasPlayableWithSnapshot(handSnapshot,honorSnapshot,phaseAtPlay,publicState.units||[],myPlayer))return;
  scheduleAutoAdvanceIfNoPlayableHand(260);
}
function resetFieldAutoAdvanceState(){
  if(fieldAutoAdvanceTimer){clearTimeout(fieldAutoAdvanceTimer);fieldAutoAdvanceTimer=null;}
  fieldAutoAdvanceKey="";
  fieldAutoAdvanceLock=false;
}
function hasLegalFieldActionForUnit(unit,units=publicState?.units||[]){
  const u=getLiveUnitRef(unit,units);
  if(!u||u.owner!==myPlayer||!isMyTurn()||!isActionPhase()||isBattleEnded())return false;

  const mulanExecMove=isMulanExecutionMoveReady(u);
  const mulanExecChoice=isMulanExecutionChoiceReady(u);
  const blockedDef=!!(u.noDefTurnKey&&u.noDefTurnKey===publicState?.turnKey);

  // MOV solo cuenta cuando existe al menos una celda legal real.
  const canMove=!u.leader&&moveZones(u).length>0;

  // ATTK solo cuenta cuando existe al menos un objetivo que el ataque sí puede resolver.
  const canAttack=getAttackableTargets(u,units).length>0;

  // La elección posterior a la ejecución de Hua Lan permite ATTK o DEF aunque acted ya sea true.
  const canDef=isUnitActionWindow(u)&&(!u.acted||mulanExecChoice)&&!u.defenseModeReady&&!blockedDef&&!mulanExecMove;

  // EFFECT solo cuenta si no es pasivo y tiene un objetivo/activación realmente disponible.
  const canEffect=isUnitActionWindow(u)&&!u.acted&&!mulanExecMove&&!mulanExecChoice&&unitHasContextEffect(u)&&getEffectTargetOptions(u,units).length>0;

  if(mulanExecMove)return canMove;
  if(mulanExecChoice)return canAttack||canDef;
  return canMove||canAttack||canDef||canEffect;
}
function hasAvailableFieldActions(player=myPlayer){
  if(!publicState||isBattleEnded()||!isMyTurn()||!isActionPhase())return false;
  const units=publicState.units||[];
  return units.some(u=>u&&u.owner===player&&(u.hp===undefined||u.hp>0)&&hasLegalFieldActionForUnit(u,units));
}
function getFieldAutoAdvanceKey(){
  const unitSignature=(publicState?.units||[]).map(u=>[
    u.id||"",u.owner||0,u.x??"",u.y??"",u.hp??"",u.leader?1:0,
    u.moved?1:0,u.acted?1:0,u.defenseModeReady?1:0,
    u.noMoveTurnKey||"",u.noAttackTurnKey||"",u.noDefTurnKey||"",
    u.mulanExecutionMoveReady?1:0,u.mulanExecutionChoiceReady?1:0,
    u.khalidChainReady?1:0,u.cavalryCallUsedTurn?1:0,u.arrowRainUsedTurn?1:0,
    u.arcaneBoltUsedTurn?1:0,u.sunTzuUsedTurn?1:0,u.subotaiUsedTurn?1:0,
    u.stealth?1:0,u.revealed?1:0,u.aerial?1:0
  ].join(",")).join(";");
  return `${gameId||"no-game"}:${publicState?.turnKey||"no-turn"}:${myPlayer||0}:actions:${unitSignature}`;
}
function scheduleAutoAdvanceIfFieldActionsExhausted(delayMs=720){
  if(!gameId||!publicState||!privateState||isBattleEnded()||publicState.mode==="tutorial"||!isMyTurn()||!isActionPhase()){
    if(!fieldAutoAdvanceLock)resetFieldAutoAdvanceState();
    return;
  }
  if(privateState.lastTurnStarted!==publicState.turnKey)return;
  if(hasAvailableFieldActions(myPlayer)){
    if(!fieldAutoAdvanceLock)resetFieldAutoAdvanceState();
    return;
  }

  const key=getFieldAutoAdvanceKey();
  if(fieldAutoAdvanceLock||fieldAutoAdvanceKey===key)return;
  if(fieldAutoAdvanceTimer){clearTimeout(fieldAutoAdvanceTimer);fieldAutoAdvanceTimer=null;}
  fieldAutoAdvanceKey=key;

  fieldAutoAdvanceTimer=setTimeout(async()=>{
    fieldAutoAdvanceTimer=null;
    let advanced=false;
    try{
      if(!gameId||!publicState||!privateState||isBattleEnded())return;
      if(publicState.mode==="tutorial"||!isMyTurn()||!isActionPhase())return;
      if(privateState.lastTurnStarted!==publicState.turnKey)return;
      if(hasAvailableFieldActions(myPlayer))return;
      if(getFieldAutoAdvanceKey()!==key)return;

      fieldAutoAdvanceLock=true;
      handOpen=false;
      handManualCloseKey="";
      clearSelection();
      setHint("Ya no quedan acciones legales en el campo. Avanzando automáticamente...");
      await advanceTurnPhase();
      advanced=true;
    }catch(e){
      console.warn("[HallValla] Auto avance por acciones de campo agotadas falló:",e);
      setHint("No se pudo avanzar automáticamente. Usa Siguiente fase para continuar.");
    }finally{
      fieldAutoAdvanceLock=false;
      if(!advanced&&fieldAutoAdvanceKey===key)fieldAutoAdvanceKey="";
    }
  },Math.max(180,Number(delayMs)||720));
}
function getHandAvailabilityKey(){
  const ids=(privateState?.hand||[]).map(c=>c.id).join("|");
  return `${gameId||"no-game"}:${publicState?.turnKey||"no-turn"}:${privateState?.honor||0}:${ids}`;
}
function syncHandAutoClose(){
  if(!publicState||!privateState)return;
  if(!isMyTurn()||!isHandPlayPhase()){handOpen=false;return;}
  if(selectedCard)return;
  const modal=$("cardInspectModal");
  const inspectOpen=modal&&!modal.classList.contains("hidden");
  if(inspectOpen)return;
  const handCount=(privateState?.hand||[]).length;
  const hasPlayable=hasPlayableCardsInHand();
  const availabilityKey=getHandAvailabilityKey();
  const mobileStartPreview=isMobileBattleViewport()&&shouldAutoOpenHand()&&handCount>0;
  if(!hasPlayable&&!mobileStartPreview){handOpen=false;return;}
  if(shouldAutoOpenHand()&&!handOpen&&handManualCloseKey!==availabilityKey)handOpen=true;
}
function cardInspectStats(card){
  const base=[["Costo",getCardCostDisplayValue(card,card?.owner||myPlayer)]];
  if(card.type==="unit")base.push(["AT",card.atk||0],["HP",card.hp||0],["GD",card.guard||0],["DX",getCardDisplayDex(card)],["AGI",card.agi||0],["MV",card.mov||0],["RG",getCardDisplayRange(card)]);
  else{
    if(card.damage)base.push(["Daño",card.damage]);
    if(card.buff)base.push(["AT +",card.buff]);
    if(card.guard)base.push(["GD +",card.guard]);
    if(card.slow)base.push(["MV -",card.slow]);
    if(card.heal)base.push(["Heal",card.heal]);
  }
  return base;
}
function normalizeStatKey(label){return String(label||"").toLowerCase().replace(/\s+/g,"").replace(/[+\-]/g,"");}
function statHelpText(label){
  const key=normalizeStatKey(label);
  if(key==="costo")return "Costo real que se paga al jugar la carta. Puede cambiar por el líder Hechicero o por cada Saboteador de Iga enemigo vivo; por ejemplo, 4 (2+2) significa costo base 2 más 2 de Sabotaje.";
  if(key==="at"||key==="ataque")return "Ataque: daño base del golpe. Si el ataque acierta, primero presiona la Guardia enemiga y solo el daño sobrante baja HP.";
  if(key==="hp"||key==="vida")return "Vida: resistencia real de la unidad. Si llega a 0, sale del campo.";
  if(key==="gd"||key==="guardia")return "Guardia: amortigua el daño recibido durante el turno. El daño consume Guardia antes de tocar la Vida; al iniciar el turno de su dueño, la Guardia se restaura si la unidad sobrevivió.";
  if(key==="dx"||key==="destreza")return "Destreza: técnica del golpe. En ataque suma a la precisión; en defensa ayuda a la evasión.";
  if(key==="agi"||key==="agilidad")return "Agilidad: rapidez táctica. En ataque ayuda a conectar el golpe; en defensa ayuda a esquivar.";
  if(key==="mv"||key==="mov"||key==="movimiento")return "Movimiento: cantidad de casillas que puede avanzar al usar MOV.";
  if(key==="rg"||key==="rango")return "Rango: distancia máxima desde la que puede atacar. Rango 1 es cuerpo a cuerpo.";
  if(key==="daño")return "Daño: cantidad de daño que intenta aplicar una magia, trampa o efecto.";
  if(key==="heal"||key==="curación"||key==="curacion")return "Curación: HP que recupera el objetivo sin superar su vida máxima.";
  return "Valor de juego de esta carta.";
}
function weaponGuideData(entity){
  if(entity&&!entity.spell&&!entity.trap&&!entity.leader){
    const cls=getWeaponClassForCard(entity);
    const clsLabel=WEAPON_CLASS_LABELS[cls]||"Sin clase";
    const wins=getWeaponAdvantageTargets(entity);
    const loses=getWeaponDisadvantageSources(entity);
    const weaponText=getEntityWeaponText(entity);
    const winText=wins.length?wins.join(", "):"ninguna clase directa";
    const loseText=loses.length?loses.join(", "):"ninguna clase directa";
    const extra=isLanceUnitCardLike(entity)
      ?" Regla de lanza: tiene RG 1 fijo. La primera vez por turno que una unidad enemiga de cuerpo a cuerpo con RG 1 la ataca desde una casilla adyacente, ataca antes que ella. Las unidades con RG 2 o más no activan esta reacción. Contra Caballería conserva +5 DX y Anticaballería si el combate es cuerpo a cuerpo."
      :"";
    return {
      title:`Arma de ${entity.name||"la unidad"}: ${clsLabel}`,
      short:`Arma mostrada en DET: ${weaponText}. Clase táctica real: ${clsLabel}.`,
      formula:`Ventaja contra: ${winText}. Desventaja contra: ${loseText}. Si esta unidad ataca a una clase sobre la que tiene ventaja, gana +${WEAPON_ADVANTAGE_DEX_BONUS} DX durante ese combate.${extra}`,
      example:`Lectura rápida: ${entity.name||"esta unidad"} vence tácticamente a ${winText}; debe cuidarse de ${loseText}.`
    };
  }
  const key=String(entity?.key||"").toLowerCase();
  const name=String(entity?.name||"").toLowerCase();
  const text=String(entity?.text||entity?.effectText||entity?.ability||"");
  const range=Number(entity?.range??getCardDisplayRange(entity)??1)||1;
  const atk=Number(entity?.atk||0)||0;
  const guard=Number(entity?.guard??entity?.baseGuard??0)||0;
  const dex=Number(entity?.dex||0)||0;
  const agi=Number(entity?.agi||0)||0;
  const isSpell=entity?.type==="spell"||!!entity?.spell;
  const isTrap=entity?.type==="trap"||!!entity?.trap;
  if(isSpell)return {title:"Canalizador mágico",short:"Esta carta no usa arma física: usa magia, bendición, maldición o energía táctica.",formula:"Ventaja: puede cambiar el combate sin depender del rango normal de una unidad. Normalmente elige un objetivo válido y aplica daño, curación, Guardia, movimiento reducido o mejora temporal.",example:`${entity?.name||"Magia"}: ${text||"resuelve su efecto al jugarse."}`};
  if(isTrap)return {title:"Trampa / recurso táctico",short:"Esta carta no usa arma física: prepara una condición o castigo táctico.",formula:"Ventaja: castiga una acción enemiga, marca un objetivo o altera una estadística sin jugar como unidad común.",example:`${entity?.name||"Trampa"}: ${text||"se activa cuando se cumple su condición."}`};
  if(entity?.leader){
    const lt=String(entity.leaderType||"").toLowerCase();
    if(lt==="archer")return {title:"Arco de líder",short:"Arma de mando a distancia. Permite presionar desde lejos sin entrar siempre al choque cuerpo a cuerpo.",formula:"Ventaja: el líder arquero combina rango, precisión y apoyo a arqueras. Sus golpes de líder aciertan automáticamente según la regla actual de líder.",example:"Útil para proteger distancia, rematar unidades dañadas y potenciar arqueras con AT/DX/AGI."};
    if(lt==="mage")return {title:"Báculo / foco arcano",short:"No gana por fuerza bruta: controla el ritmo de las magias.",formula:"Ventaja: reduce costos y aumenta efectos mágicos por nivel de buff. Su arma real es acelerar el spellbook.",example:"Un hechicero fuerte convierte magias baratas en cambios grandes de tablero."};
    return {title:"Espada de mando",short:"Arma de líder cuerpo a cuerpo. Sirve para sostener la línea y fortalecer infantería pesada.",formula:"Ventaja: el líder guerrero pelea de cerca y mejora Vida/Guardia de unidades defensivas. Sus golpes de líder aciertan automáticamente según la regla actual de líder.",example:"Ideal para avanzar con lanceros, guardianes y unidades que quieran aguantar intercambio."};
  }
  if(key==="cavalry"||name.includes("caballería")||name.includes("caballeria"))return {title:"Espada de caballería",short:"Arma de carga. No está hecha para quedarse quieta: gana valor cuando entra con impulso.",formula:"Ventaja: aunque pertenece a la clase táctica Caballería, esta unidad ataca con espada. Si se mueve 3+ espacios y ataca cuerpo a cuerpo, desestabiliza al objetivo y le baja AGI durante ese combate.",example:"Úsala para flanquear, castigar arqueros o rematar unidades que quedaron fuera de formación. Cuidado con lanceros: son su respuesta natural."};
  if(isAxeUnitCardLike(entity)||key==="berserker"||name.includes("berserker"))return {title:"Hacha / arma de dos manos",short:"Arma pesada de ruptura. No modifica la Destreza base de la unidad.",formula:`Ventaja táctica: Hacha supera Espada. Cuando esta unidad ataca a una unidad de Espada, recibe +${WEAPON_ADVANTAGE_DEX_BONUS} DX solamente durante ese combate. Contra cualquier otra clase conserva su DX normal.`,example:"Un Berserker contra William Wallace obtiene +5 DX temporal por Hacha > Espada. Contra un Lancero no recibe esa bonificación."};
  if(key==="spearman"||name.includes("lancero"))return {title:"Lanza y escudo",short:"Arma defensiva de control que castiga entradas cuerpo a cuerpo.",formula:"Ventaja: tiene RG 1 fijo. La primera vez por turno que una unidad enemiga con RG 1 lo ataca cuerpo a cuerpo desde una casilla adyacente, ataca antes que ella. No reacciona contra arqueras ni otras unidades con RG 2 o más. Es especialmente peligroso contra Caballería en combate cuerpo a cuerpo.",example:"Colócalo en el frente para bloquear unidades cuerpo a cuerpo; los ataques de rango pueden hostigarlo sin activar Formación de picas."};
  if(key==="archer"||name.includes("arquera")||name.includes("arquero"))return {title:"Arco",short:"Arma de hostigamiento. Hace daño desde distancia y obliga al rival a moverse mal.",formula:"Ventaja: ataca fuera del cuerpo a cuerpo. Además, su disparo puede reducir MOV del objetivo, cortando persecuciones o retiradas.",example:"Una arquera bien colocada gana valor si dispara sin quedar atrapada al siguiente turno."};
  if(key==="guardian"||name.includes("guardián")||name.includes("guardian")||name.includes("piedra"))return {title:"Escudo pesado",short:"Arma defensiva. No busca matar rápido: busca absorber, bloquear y romper el ritmo del rival.",formula:"Ventaja: mucha Guardia y efectos que bajan AGI/MOV. Sirve como muro para que tus unidades frágiles trabajen detrás.",example:"Si el rival gasta ataques en él y no lo elimina, la Guardia volverá y el intercambio puede salirte gratis."};
  if(key==="scout"||name.includes("asesina"))return {title:"Dagas curvas y veneno",short:"Arma de ejecución. No pelea limpio: entra, atraviesa defensa y deja sangrado.",formula:"Ventaja: sus ataques ignoran Guardia/defensa. Si logra tocar HP, aplica Sangrado y el objetivo pierde 1 Vida al inicio de su turno.",example:"Úsala contra objetivos con mucha Guardia pero poca Vida. Es una aguja venenosa, no un martillo."};
  if(name.includes("samur")||name.includes("musashi")||name.includes("tomoe"))return {title:"Katana / arma samurái",short:"Arma de precisión. Premia entrar en el combate correcto y no malgastar el ataque.",formula:"Ventaja: suele combinar buena técnica con daño confiable. Revisa DX/AGI para saber si su golpe será consistente contra unidades evasivas.",example:"Busca objetivos donde tu precisión sea alta o donde el rival ya perdió Guardia."};
  if(range>=3)return {title:"Arma a distancia",short:"Ataca desde lejos. Su valor está en pegar sin recibir contraataque inmediato.",formula:"Ventaja: mientras mantenga distancia, puede forzar al rival a gastar movimiento antes de responder. DX y AGI definen qué tan confiable será el disparo.",example:"Protege esta unidad con frontales para que pueda disparar varios turnos."};
  if(range===2)return {title:"Arma de alcance medio",short:"Golpea más lejos que una espada común, pero todavía necesita buena posición.",formula:"Ventaja: puede atacar desde una casilla extra, controlar pasillos y amenazar sin exponerse tanto al cuerpo a cuerpo.",example:"Ideal para pelear detrás de un tanque o cubrir una línea estrecha."};
  if(atk>=7)return {title:"Arma pesada cuerpo a cuerpo",short:"Mucho daño, poca sutileza. Quiere romper una pieza importante cuando por fin llega.",formula:"Ventaja: AT alto castiga Guardia baja o unidades lentas. Debilidad: si tiene poco MOV o AGI, necesita apoyo para alcanzar buenos objetivos.",example:"No la mandes sola al centro si el rival puede kitearla o rodearla."};
  if(guard>=5)return {title:"Arma defensiva / escudo",short:"Su equipo está pensado para aguantar más que para borrar enemigos rápido.",formula:"Ventaja: absorbe daño, protege casillas y compra turnos. Mientras sobreviva, su Guardia puede restaurarse en su turno.",example:"Excelente para formar pared delante de arqueros o líderes."};
  if(dex+agi>=7)return {title:"Arma ligera",short:"Equipo rápido y técnico. Depende de precisión, evasión y buenos objetivos.",formula:"Ventaja: DX + AGI alto mejora la probabilidad de acertar y también la evasión al defender.",example:"Úsala para atacar objetivos lentos o entrar donde una unidad pesada fallaría."};
  return {title:"Arma cuerpo a cuerpo",short:"Equipo estándar para intercambiar golpes a corta distancia.",formula:"Ventaja: simple y confiable. Revisa AT para daño, GD para aguante, y DX + AGI para saber si conectará el golpe.",example:"Si no tiene mucho rango, necesita buena posición antes de atacar."};
}
function weaponSummaryHtml(entity){
  const data=weaponGuideData(entity);
  return `<div class="weapon-summary"><b>Arma:</b> ${escapeHtml(data.title)}<br><span>${escapeHtml(data.short)}</span></div>`;
}
function openSpearmanTacticalGuide(){
  let modal=$("spearmanTacticalModal");
  if(!modal){
    modal=document.createElement("div");
    modal.id="spearmanTacticalModal";
    modal.className="spearman-tactical-modal hidden";
    modal.innerHTML=`<div class="spearman-tactical-card" role="dialog" aria-modal="true" aria-labelledby="spearmanTacticalTitle">
      <div class="spearman-tactical-head">
        <div class="spearman-tactical-title-wrap">
          <img src="assets/ui/det_icons/weapon_spear.webp" alt="" class="spearman-tactical-main-icon">
          <div><div class="spearman-tactical-kicker">CLASE TÁCTICA</div><h2 id="spearmanTacticalTitle">LANZA</h2></div>
        </div>
        <button id="spearmanTacticalClose" class="spearman-tactical-x" type="button" aria-label="Cerrar">×</button>
      </div>
      <div class="spearman-tactical-matchups">
        <div class="spearman-matchup-row disadvantage">
          <span class="spearman-matchup-icon"><img src="assets/ui/det_icons/weapon_sword.webp" alt="Espada"></span>
          <div><b>DESVENTAJA CONTRA</b><strong>Espada / infantería</strong><p>La Espada tiene ventaja táctica sobre la Lanza y recibe +${WEAPON_ADVANTAGE_DEX_BONUS} Destreza al atacarla durante ese combate.</p></div>
        </div>
        <div class="spearman-matchup-row advantage">
          <span class="spearman-matchup-icon"><img src="assets/ui/det_icons/weapon_cavalry.webp" alt="Caballería"></span>
          <div><b>VENTAJA CONTRA</b><strong>Caballería</strong><p>La Lanza tiene ventaja táctica contra Caballería y recibe +${WEAPON_ADVANTAGE_DEX_BONUS} Destreza al atacarla durante ese combate.</p></div>
        </div>
      </div>
      <button id="spearmanTacticalOk" class="spearman-tactical-ok" type="button">ENTENDIDO</button>
    </div>`;
    document.body.appendChild(modal);
    const close=()=>modal.classList.add("hidden");
    $("spearmanTacticalClose").onclick=close;
    $("spearmanTacticalOk").onclick=close;
    modal.addEventListener("click",ev=>{if(ev.target===modal)close();});
  }
  modal.classList.remove("hidden");
}
function openWeaponGuide(entity){
  if(isLanceUnitCardLike(entity)){
    openSpearmanTacticalGuide();
    return;
  }
  const data=weaponGuideData(entity);
  openStatGuideModal({...data,short:"",title:`⚜ ${data.title}`});
}
function statGuideData(label=""){
  if(label&&typeof label==="object")return label;
  const key=normalizeStatKey(label);
  const base={title:"⌁ PREC/EVA",short:"Precisión y evasión usan la misma reserva táctica: DX + AGI. Esa reserva se desgasta durante el turno actual y se restaura al inicio del próximo turno del dueño.",formula:"Precisión disponible = DX + AGI - stats gastados este turno. Evasión disponible = DX + AGI - stats gastados este turno. Al atacar, la unidad gasta solo la precisión necesaria para superar la evasión disponible del objetivo. Al defender, cada ataque recibido reduce más su evasión disponible.",example:"Ejemplo: una unidad con DX 6 + AGI 4 tiene 10. Si ataca a un rival con 4 de evasión disponible, gasta 4 y conserva 6 para defenderse. Si luego recibe ataques, esa reserva baja más. Contra líderes el golpe impacta fijo: no se consume precisión y la Guardia del líder absorbe daño primero."};
  const map={
    formula:base,
    "prec/eva":base,
    "prec eva":base,
    precision:base,
    evasión:base,
    evasion:base,
    costo:{title:"✦ Costo / Honor/Mana",short:"Recurso necesario para jugar la carta desde la mano.",formula:"Si tu Honor/Mana actual es menor que el costo, la carta no se puede jugar.",example:"Costo 3 necesita al menos 3 de recurso disponible."},
    at:{title:"⚔ AT / Ataque",short:"Daño base que la unidad intenta causar cuando golpea.",formula:"Daño que entra = AT del atacante, más o menos modificadores. Luego ese daño choca contra la Guardia del defensor.",example:"AT 5 contra GD 2 consume 2 de Guardia y causa 3 de daño a Vida, salvo efectos especiales."},
    ataque:{title:"⚔ AT / Ataque",short:"Daño base que la unidad intenta causar cuando golpea.",formula:"Daño que entra = AT del atacante, más o menos modificadores. Luego ese daño choca contra la Guardia del defensor.",example:"AT 5 contra GD 2 consume 2 de Guardia y causa 3 de daño a Vida, salvo efectos especiales."},
    hp:{title:"♥ HP / Vida",short:"Resistencia real de la unidad.",formula:"Cuando HP llega a 0, la unidad sale del campo. La Guardia puede evitar que el daño toque el HP.",example:"Una unidad con 2 HP y 0 Guardia cae si recibe 2 de daño a Vida."},
    vida:{title:"♥ HP / Vida",short:"Resistencia real de la unidad.",formula:"Cuando HP llega a 0, la unidad sale del campo. La Guardia puede evitar que el daño toque el HP.",example:"Una unidad con 2 HP y 0 Guardia cae si recibe 2 de daño a Vida."},
    gd:{title:"🛡 GD / Guardia",short:"Armadura temporal. Amortigua daño durante el turno y se restaura al inicio del turno de su dueño si la unidad sobrevive.",formula:"Daño a Vida = Daño recibido - Guardia disponible. La Guardia consumida baja durante ese turno. Al iniciar el turno de su dueño se restaura a su valor base más buffs activos.",example:"Si recibes 4 de daño con 3 GD, pierdes 3 GD y solo 1 HP. Si sobrevives, tu GD vuelve al iniciar tu próximo turno."},
    guardia:{title:"🛡 GD / Guardia",short:"Armadura temporal. Amortigua daño durante el turno y se restaura al inicio del turno de su dueño si la unidad sobrevive.",formula:"Daño a Vida = Daño recibido - Guardia disponible. La Guardia consumida baja durante ese turno. Al iniciar el turno de su dueño se restaura a su valor base más buffs activos.",example:"Si recibes 4 de daño con 3 GD, pierdes 3 GD y solo 1 HP. Si sobrevives, tu GD vuelve al iniciar tu próximo turno."},
    dx:{title:"⌁ DX / Destreza",short:"Técnica. Sirve para precisión al atacar y evasión al defender.",formula:"DX se suma con AGI para crear la reserva PREC/EVA del turno. Al atacar, el golpe primero presiona/consume EVA del defensor y luego se compara contra la EVA restante. Al atacar o recibir presión, la reserva gastada vuelve al inicio del próximo turno del dueño.",example:"Una unidad técnica puede conservar defensa si ataca a objetivos con poca evasión, porque solo gasta lo necesario."},
    destreza:{title:"⌁ DX / Destreza",short:"Técnica. Sirve para precisión al atacar y evasión al defender.",formula:"DX se suma con AGI para crear la reserva PREC/EVA del turno. Al atacar, el golpe primero presiona/consume EVA del defensor y luego se compara contra la EVA restante. Al atacar o recibir presión, la reserva gastada vuelve al inicio del próximo turno del dueño.",example:"Una unidad técnica puede conservar defensa si ataca a objetivos con poca evasión, porque solo gasta lo necesario."},
    agi:{title:"➤ AGI / Agilidad",short:"Velocidad. Suma tanto para conectar ataques como para esquivarlos.",formula:"AGI se suma con DX para crear la reserva PREC/EVA del turno. Al atacar, el golpe primero presiona/consume EVA del defensor y luego se compara contra la EVA restante. Atacar y recibir presión gastan reserva; se restaura al inicio del próximo turno del dueño.",example:"Un asesino ágil puede atacar y aún conservar defensa si el objetivo exigía poca evasión."},
    agilidad:{title:"➤ AGI / Agilidad",short:"Velocidad. Suma tanto para conectar ataques como para esquivarlos.",formula:"AGI se suma con DX para crear la reserva PREC/EVA del turno. Al atacar, el golpe primero presiona/consume EVA del defensor y luego se compara contra la EVA restante. Atacar y recibir presión gastan reserva; se restaura al inicio del próximo turno del dueño.",example:"Un asesino ágil puede atacar y aún conservar defensa si el objetivo exigía poca evasión."},
    mv:{title:"» MV / Movimiento",short:"Casillas que puede avanzar al usar MOV.",formula:"Una unidad puede moverse hasta su MV en fases donde MOV esté permitido. Efectos temporales pueden subir o bajar ese número.",example:"MV 4 permite avanzar hasta 4 casillas libres."},
    mov:{title:"» MV / Movimiento",short:"Casillas que puede avanzar al usar MOV.",formula:"Una unidad puede moverse hasta su MV en fases donde MOV esté permitido. Efectos temporales pueden subir o bajar ese número.",example:"MV 4 permite avanzar hasta 4 casillas libres."},
    movimiento:{title:"» MV / Movimiento",short:"Casillas que puede avanzar al usar MOV.",formula:"Una unidad puede moverse hasta su MV en fases donde MOV esté permitido. Efectos temporales pueden subir o bajar ese número.",example:"MV 4 permite avanzar hasta 4 casillas libres."},
    rg:{title:"◎ RG / Rango",short:"Distancia máxima de ataque.",formula:"Puedes atacar objetivos dentro de RG. Rango 1 es cuerpo a cuerpo; rango 3 o más permite atacar desde más lejos.",example:"RG 3 puede atacar a un enemigo a 3 casillas."},
    rango:{title:"◎ RG / Rango",short:"Distancia máxima de ataque.",formula:"Puedes atacar objetivos dentro de RG. Rango 1 es cuerpo a cuerpo; rango 3 o más permite atacar desde más lejos.",example:"RG 3 puede atacar a un enemigo a 3 casillas."}
  };
  return map[key]||base;
}
function openStatGuideModal(label=""){
  const data=statGuideData(label);
  let modal=$("statGuideModal");
  if(!modal){
    modal=document.createElement("div");
    modal.id="statGuideModal";
    modal.className="stat-guide-modal hidden";
    modal.innerHTML=`<div class="stat-guide-card"><div class="stat-guide-head"><div><div class="stat-guide-kicker">Guía de reglas</div><h2 id="statGuideTitle"></h2></div><button id="statGuideClose" class="stat-guide-x" type="button" aria-label="Cerrar guía">×</button></div><p id="statGuideShort" class="stat-guide-short"></p><div class="stat-guide-box"><b>Regla / fórmula</b><span id="statGuideFormula"></span></div><div class="stat-guide-box"><b>Ejemplo</b><span id="statGuideExample"></span></div><div class="stat-guide-actions"><button id="statGuideCombatBtn" class="btn ghost" type="button">Ver precisión/evasión</button><button id="statGuideOk" class="btn primary" type="button">Entendido</button></div></div>`;
    document.body.appendChild(modal);
    const close=()=>modal.classList.add("hidden");
    $("statGuideClose").onclick=close;
    $("statGuideOk").onclick=close;
    $("statGuideCombatBtn").onclick=()=>openStatGuideModal("formula");
    modal.addEventListener("click",ev=>{if(ev.target===modal)close();});
  }
  $("statGuideTitle").textContent=data.title;
  const statGuideShortEl=$("statGuideShort");
  if(statGuideShortEl){
    const shortText=String(data.short||"").trim();
    statGuideShortEl.textContent=shortText;
    statGuideShortEl.hidden=!shortText;
  }
  $("statGuideFormula").textContent=data.formula||"";
  const exampleEl=$("statGuideExample");
  if(exampleEl){
    const exampleText=String(data.example||"").trim();
    exampleEl.textContent=exampleText;
    const exampleBox=exampleEl.closest(".stat-guide-box");
    if(exampleBox)exampleBox.hidden=!exampleText;
  }
  const combatBtn=$("statGuideCombatBtn");
  if(combatBtn)combatBtn.hidden=Boolean(data.hideCombatButton);
  // Modal genérico: no depende de una carta específica.
  applyRarityClassToElement(modal,data?.card||null);
  modal.classList.remove("hidden");
}
function bindStatGuideClicks(container){
  if(!container)return;
  container.querySelectorAll("[data-stat]").forEach(el=>{
    el.addEventListener("click",ev=>{ev.stopPropagation();openStatGuideModal(el.dataset.stat||el.textContent||"");});
  });
}
function detailStatGridHtml(stats){
  return `<div class="detail-stat-grid">${stats.map(([l,v])=>`<button class="detail-stat-chip stat-click" type="button" data-stat="${escapeHtml(l)}"><span>${escapeHtml(String(l))}</span><strong>${escapeHtml(String(v))}</strong></button>`).join("")}</div>`;
}

function normalizeEffectGuideKey(entity){
  return String(entity?.key||entity?.name||"").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/[^a-z0-9_]+/g,"_");
}
function getLeaderExactEffectGuideData(entity){
  const type=String(entity?.leaderType||"warrior").toLowerCase();
  const data=LEADER_DATA[type]||LEADER_DATA.warrior;
  const level=normalizeLeaderLevel(entity?.leaderLevel||getLocalLeaderLevel(type)||1);
  const tier=getLeaderBuffTierFromLevel(level);
  const abilityKey=normalizeLeaderAbilityKey(entity?.leaderAbility||getLeaderDefaultLevel5Ability(type)||"");
  const abilityData=level>=5?getLeaderAbilityData(abilityKey):null;
  const buff=LEADER_BUFF_TABLE[type]?.[tier]||{};
  const leaderStats=getLeaderBattleStats(type,level,entity?.leaderAbility||"");
  const meta={
    warrior:{
      target:"Infantería pesada aliada",
      affected:"Afecta a unidades aliadas que el sistema reconoce como infantería pesada: Guardián de piedra, Lancero solar y otras cartas marcadas como guardianes, paladines, knights o infantería pesada.",
      notAffected:"No afecta arqueras, magias, caballería ligera, asesinos, bestias ni al propio líder.",
      buff:`+${buff.hp||0} Vida máxima y +${buff.guard||0} Guardia base a cada infantería pesada aliada. La Vida extra se añade al entrar o al sincronizar el campo; la Guardia se usa como reserva de armadura del turno.`,
      passive:`Muralla de unidades: mientras este líder tenga al menos una unidad aliada viva en el campo, los ataques de unidades enemigas no bajan la Vida del líder. La Guardia puede recibir daño, pero la Vida queda protegida contra ataques de unidades. Hechizos, trampas y efectos de líderes sí pueden dañar al líder normalmente.`,
      example:"Si el Guerrero tiene un Guardián aliado vivo y una unidad enemiga le pega al líder, ese ataque no baja la Vida del líder. Si no queda ninguna unidad aliada viva, la protección se apaga."
    },
    archer:{
      target:"Arqueras aliadas",
      affected:"Afecta a unidades aliadas reconocidas como arqueras, principalmente Arquera del desierto y cartas cuyo nombre/texto/clase indiquen arquera, arquero, arco, flecha o archer.",
      notAffected:"No afecta infantería pesada, caballería ligera, asesinos, bestias, magias ni al propio líder.",
      buff:`+${buff.atk||0} AT, +${buff.dex||0} DX, +${buff.agi||0} AGI${buff.range?` y +${buff.range} RG`:""} a cada arquera aliada.`,
      passive:"El bonus mejora disparo, alcance y presión táctica. El efecto propio de la Arquera del desierto sigue teniendo su regla exacta: solo reduce MOV si hace al menos 1 daño real a Vida/HP.",
      example:"Una Arquera con este líder puede pegar desde más lejos y conectar mejor, pero si su disparo solo rompe Guardia y no toca Vida, no aplica el -1 MOV."
    },
    mage:{
      target:"Magias aliadas",
      affected:"Afecta a cartas de tipo magia/hechizo jugadas por el dueño de este líder.",
      notAffected:"No afecta unidades normales, arqueras, bestias, caballería ni ataques básicos. Tampoco cambia el costo de invocar unidades.",
      buff:`Las magias cuestan -${buff.costReduction||0} recurso y sus valores numéricos de efecto suben +${buff.effectBonus||0}. Esto aplica a daño, curación, buffs o escudos cuando la carta tenga un campo numérico compatible.`,
      passive:"El recurso del Hechicero se muestra como MANA. La reducción de costo no baja de 0. Si una magia no tiene objetivo válido, la mejora no la vuelve jugable automáticamente.",
      example:"Una magia de daño con costo 3 y daño 2, con buff -2 costo/+4 efecto, pasa a costar 1 y hacer 6 de daño si tiene objetivo válido."
    },
    axe:{
      target:"Unidades de hacha / berserkers aliados",
      affected:"Afecta a unidades aliadas reconocidas como hacha, principalmente Berserker del norte y cartas con icono/texto/nombre de hacha o axe.",
      notAffected:"No afecta espadas, lanzas, arqueras, caballería, magias, bestias ni al propio líder.",
      buff:`+${buff.atk||0} AT y +${buff.dex||0} DX a cada unidad de hacha aliada.`,
      passive:"Grito de Guerra: cuando una unidad aliada rompe toda la Guardia enemiga, el equipo aliado puede recibir presión ofensiva extra según la regla de combate vigente. La habilidad Nv.5 del Caudillo añade además Victoria sangrienta.",
      example:"Un Berserker bajo este líder se vuelve un rompearmaduras: pega más fuerte y tiene más Destreza para conectar sus ataques."
    },
    cavalry:{
      target:"Caballería ligera aliada",
      affected:"Afecta a Caballería ligera aliada y unidades marcadas como cavalry o Caballería Arquera de Saladino.",
      notAffected:"No afecta infantería pesada, arqueras normales, asesinos, bestias, magias ni al propio líder.",
      buff:`+${buff.mov||0} MOV y +${buff.agi||0} AGI${buff.atk?` y +${buff.atk} AT`:""} a cada caballería ligera aliada.`,
      passive:"El bonus ayuda a cargar, reposicionarse y aprovechar efectos que dependen de moverse antes de atacar. La Caballería ligera puede activar su carga si se movió 3 o más espacios antes de atacar cuerpo a cuerpo.",
      example:"Con más MOV, la Caballería ligera llega más fácil a los 3 espacios necesarios para activar Carga desestabilizadora."
    },
    assassin:{
      target:"Asesinos aliados",
      affected:"Afecta a unidades aliadas reconocidas como asesinos, principalmente Asesina del desierto y cartas con nombre de asesina/asesino.",
      notAffected:"No afecta guerreros pesados, arqueras, caballería, bestias, magias ni al propio líder.",
      buff:`+${buff.agi||0} AGI, +${buff.dex||0} DX${buff.atk?` y +${buff.atk} AT`:""} a cada asesino aliado.`,
      passive:"El bonus aumenta sus stats de combate. Con la habilidad Nv.5 Niebla de sangre, los asesinos aliados ignoran Guardia al atacar y gastan solo la mitad de PREC/EVA cuando el sistema les cobre ese desgaste.",
      example:"La Asesina del desierto se vuelve más difícil de esquivar y más difícil de alcanzar. Si además está activa Niebla de sangre, su daño atraviesa Guardia."
    },
    beastmaster:{
      target:"Bestias aliadas",
      affected:"Afecta a unidades aliadas marcadas como bestia: Tejón Mielero, Puercoespín, Jabalí Salvaje, Cuervo Negro, Serpiente, Búfalo, Halcón, Taipán, León, Tigre, Rinoceronte y futuras bestias.",
      notAffected:"No afecta humanos, arqueras, magias, caballería común, asesinos ni al propio líder.",
      buff:`+${buff.atk||0} AT y +${buff.agi||0} AGI a cada bestia aliada.`,
      passive:"La mejora vuelve a las bestias más agresivas y móviles. Con la habilidad Nv.5 Veneno de la Manada, cualquier unidad aliada que cause daño real a HP aplica Veneno, incluso si no es bestia.",
      example:"Un Jabalí o Tigre bajo este líder golpea más fuerte. Si está activa Veneno de la Manada, el daño real a HP también deja veneno."
    }
  }[type]||{};
  const abilityLine=abilityData
    ? `${abilityData.name}: ${abilityData.desc||abilityData.short}`
    : level>=5
      ? "Este líder está en nivel 5 o más, pero no tiene una habilidad Nv.5 activa reconocida."
      : "La habilidad especial Nv.5 todavía no está desbloqueada para este líder.";
  return {
    title:`✦ Efecto exacto: ${entity?.name||data.name}`,
    short:`${data.name} · Nivel ${level} · Tier de buff ${tier}. Este modal explica qué mejora, a quién afecta y qué hace su efecto especial.`,
    formula:`Stats del líder:
• HP ${leaderStats.hp} · AT ${leaderStats.atk} · GD ${getLeaderGuard(type,level)} · RG ${getLeaderRange(type,level)}

A quién afecta el buff:
• ${meta.target||"Aliados compatibles"}

Cómo los reconoce el sistema:
• ${meta.affected||"Solo cartas compatibles con este líder."}

Qué NO afecta:
• ${meta.notAffected||"Cartas fuera de su categoría."}

Buff actual por tier ${tier}:
• ${meta.buff||"Sin buff de categoría visible."}

Efecto / regla especial del líder:
• ${meta.passive||"Este líder usa la regla especial de líder: sus ataques y ataques contra él resuelven el golpe de forma directa, y la Guardia reduce daño."}

Habilidad Nv.5:
• ${abilityLine}`,
    example:meta.example||"Revisa la categoría de la unidad antes de asumir que recibe el buff. Si no pertenece al grupo del líder, no recibe esos stats.",
    card:entity
  };
}
function getExactEffectGuideDataLegacy7haj(entity,effectText=""){
  if(entity?.leader)return getLeaderExactEffectGuideData(entity);
  const name=entity?.name||"Esta unidad";
  const raw=String(effectText||getUnitEffectText(entity)||entity?.text||entity?.effectText||entity?.ability||"").trim();
  const key=normalizeEffectGuideKey(entity);
  const isUnit=entity?.type==="unit"||(!entity?.spell&&!entity?.trap);
  const generic={
    title:`✦ Efecto exacto: ${name}`,
    short:raw?`Esta ventana explica cuándo se activa y qué pasa realmente con ${name}.`:`${name} no tiene una habilidad especial visible.`,
    formula:raw||"Sin efecto especial visible.",
    example:isUnit?"Regla general: si un efecto dice que debe hacer daño real, significa daño a Vida/HP. Si la Guardia absorbe todo, ese efecto no se activa.":"Lee el objetivo y el momento de uso antes de jugar la carta.",
    card:entity
  };
  const systemLines=[];
  if(isUnit){
    const weapon=getWeaponClassForCard(entity);
    if(weapon)systemLines.push(`Clase de arma real: ${WEAPON_CLASS_LABELS?.[weapon]||weapon}. Ventaja de arma: Espada > Lanza, Lanza > Caballería, Caballería > Arco, Arco > Hacha y Bestia, Hacha > Espada y Bestia > Caballería. Si esta unidad tiene ventaja al atacar, gana +${WEAPON_ADVANTAGE_DEX_BONUS} DX durante ese combate.`);
    if(isSwordUnitCardLike(entity))systemLines.push("Regla global de espada: esta carta recibe +3 Guardia base si todavía no está aplicado en sus stats.");
    if(isArcherWeaponUnitCardLike(entity))systemLines.push("Regla global de arco: esta carta recibe +1 RG base si todavía no está aplicado en sus stats. El rango efectivo de arqueros no líderes se limita por el sistema.");
    if(isLanceUnitCardLike(entity))systemLines.push("Regla global de lanza: tiene RG 1 fijo y, la primera vez por turno que una unidad enemiga de cuerpo a cuerpo con RG 1 la ataque desde una casilla adyacente, ataca primero. No responde contra unidades con RG 2 o más. Anticaballería también es innata: en combate cuerpo a cuerpo, atacando o defendiendo, la Caballería rival queda con Guardia 0 y AGI 0 durante ese combate.");
    const mode=getUnitEffectMode(entity);
    systemLines.push(mode==="passive"?"Botón EFFECT oculto: este efecto no se activa manualmente; se ejecuta automáticamente cuando se cumple su condición.":`Botón EFFECT visible: esta unidad sí tiene uso manual (${mode==="self"?"autoobjetivo":"objetivo/casilla"}), si hay objetivo válido y no gastó acción.`);
    systemLines.push("Daño real: si un efecto exige daño real, debe bajar Vida/HP; romper Guardia no basta.");
  }
  const systemNote=systemLines.length?`\n\nReglas reales del sistema aplicadas a esta carta:\n• ${systemLines.join("\n• ")}`:"";
  const map={
    cavalry:{short:"Unidad de presión. Su efecto castiga al objetivo cuando entra en combate después de una carga larga.",formula:`Condición:
• Debe moverse 3 o más espacios este turno.
• Luego debe declarar un ataque cuerpo a cuerpo.

Resultado:
• El objetivo recibe -3 AGI solo durante ese combate.
• Esa reducción ayuda a que el ataque sea más fácil de conectar.`,example:"Si se mueve solo 1 o 2 casillas, no activa Carga desestabilizadora."},
    berserker:{short:"Unidad agresiva de hacha que rompe Guardia al declarar ataque cuerpo a cuerpo.",formula:`Ruptura brutal:
• Al declarar ataque cuerpo a cuerpo, el objetivo recibe -3 Guardia durante ese combate.
• La reducción ocurre antes de calcular el daño contra Guardia.
• Si la Guardia restante no alcanza, el sobrante baja Vida/HP.

Regla táctica de hacha:
• No modifica la Destreza base de la carta.
• Si ataca a una unidad de Espada, obtiene +5 DX solamente durante ese combate.

Resolución de ataque:
• El efecto no garantiza daño por sí mismo.
• El ataque debe resolverse como cualquier ataque normal.`,example:"Berserker contra Espada: obtiene +5 DX temporal por ventaja de arma y aplica Ruptura brutal. Contra otra clase no recibe ese +5."},
    spearman:{short:"Unidad defensiva de picas, especializada en responder antes del impacto y detener cargas de Caballería.",formula:`FORMACIÓN DE PICAS:
• El Lancero Solar tiene RG 1 fijo. La primera vez por turno que una unidad enemiga de cuerpo a cuerpo con RG 1 lo ataca desde una casilla adyacente, el Lancero Solar ataca antes que ella. No se activa contra arqueras ni otras unidades con RG 2 o más.
• Formación de picas reúne la antigua regla general de lanza de esta unidad; ya no se muestra como un efecto separado.

ANTICABALLERÍA:
• Cuando combate cuerpo a cuerpo contra una unidad de Caballería, ya sea atacando o defendiendo, esa Caballería tiene Guardia 0 y AGI 0 durante ese combate.`,example:"Una Caballería de RG 1 que entra cuerpo a cuerpo queda sin Guardia ni AGI y puede activar Formación de picas. Una Arquera con RG 2 o más no activa Formación de picas."},
    archer:{short:"Unidad de rango. Su debuff solo entra si el disparo realmente hiere la Vida enemiga.",formula:`Condición:
• Debe atacar a distancia.
• El ataque debe causar al menos 1 daño a Vida/HP.

Resultado:
• El objetivo recibe -1 MOV hasta el final de su próximo turno.
• No acumulable.

Importante:
• Si falla, no aplica MOV.
• Si la Guardia absorbe todo el daño, no aplica MOV.`,example:"Arquera AT 3 contra Guardia 3: baja Guardia, pero no baja Vida, por lo tanto no reduce MOV."},
    arcane_adept:{short:"Unidad mágica. Aplica estados negativos cuando logra herir Vida y también puede responder a distancia.",formula:`Ruptura Arcana:
• Si causa al menos 1 daño directo a Vida de una unidad enemiga, aplica un estado negativo aleatorio.

Respuesta Mística:
• Puede contraatacar ataques de rango.

Vínculo Arcano:
• Si está junto al líder Hechicero aliado, recibe bonus según el tier del líder.`,example:"Si el ataque solo rompe Guardia y no baja Vida, Ruptura Arcana no aplica estado negativo."},
    acolyte_healer:{short:"Unidad mágica de apoyo que convierte Honor en curación, limpieza o resurrección y progresa mediante puntos de servicio.",formula:`TRANSFERENCIA VITAL · 0 puntos
• Coste: 2 Honor.
• Rango de efecto: 3.
• Aliado herido: recupera 1 Vida.
• Enemigo visible: pierde 1 Vida directamente.
• No afecta líderes.

PURIFICACIÓN · 50 puntos
• Coste: 3 Honor.
• Elimina exactamente un estado negativo o maldición removible de un aliado en rango 3.

RESURRECCIÓN · 100 puntos
• Coste: 4 Honor.
• Devuelve un aliado destruido en una casilla libre adyacente.
• Vuelve con media Vida máxima, redondeada hacia arriba, sin debuffs y como jugada desde la mano.
• Puede actuar ese mismo turno.

PROGRESO
• Cada uso exitoso concede 1 punto de servicio permanente.
• No progresa mediante bajas ni recibe Vida máxima por esta progresión.`,example:"A 50 puntos desbloquea Purificación; a 100 desbloquea Resurrección."},
    guardian:{short:"Tanque de control. Reduce la AGI del enemigo y puede afectar movimiento si el objetivo está débil de Guardia.",formula:`Condición principal:
• Debe declarar ataque cuerpo a cuerpo.

Resultado base:
• El objetivo recibe -3 AGI durante ese combate.

Condición adicional:
• Si el objetivo tiene Guardia 2 o menos, también recibe -1 AT y -1 MOV hasta el final de su próximo turno.`,example:"Sirve para encerrar objetivos que ya perdieron buena parte de su Guardia."},
    scout:{short:"Asesina. Aplica Sangrado cuando logra daño real a HP.",formula:`Asesinato preciso: • Sus ataques siguen la Guardia normal. • No ignora Guardia por sí sola. • Solo ignora Guardia si su dueño tiene Maestro de Sombras Nv.5 con Niebla de sangre activa.  Sangrado: • Si logra hacer daño a HP, el objetivo queda con Sangrado. • Sangrado causa 1 daño al inicio del turno del objetivo. • El Sangrado permanece hasta que la unidad sea curada o destruida. • El daño de Sangrado ignora Guardia.`,example:"Si solo baja Guardia y no hace daño a HP, no aplica Sangrado."},
    mulan:{short:"Unidad de ejecución. Premia el posicionamiento detrás de la línea enemiga y puede encadenar una acción limitada tras destruir.",formula:`Ataque por la espalda:
• Hua Lan debe atacar desde una de las tres casillas inmediatamente detrás del objetivo: diagonal izquierda, recta o diagonal derecha, siempre hacia el lado del líder rival.
• Atacar desde un costado o desde el frente no activa el efecto.
• Si cumple la posición, obtiene +6 AT durante ese combate.
• El ataque sigue las reglas normales de combate.

Después de destruir:
• Si destruye una unidad con su ataque normal, puede moverse 1 casilla extra.
• Luego debe elegir ATK o DEF. Esa elección consume su acción restante.
• Después queda sin más acciones ese turno.`,example:"No es daño gratis: debe resolver su ataque aunque esté bien posicionada."},
    wallace:{short:"Unidad resistente. Tiene una supervivencia única contra daño fatal.",formula:`Condición:
• La primera vez que William Wallace recibiría daño fatal.

Resultado:
• No cae.
• Sobrevive y queda con 1 Vida.

Límite:
• Solo ocurre una vez.`,example:"Después de gastar Último Aliento, el próximo daño fatal sí puede destruirlo."},
    honey_badger:{short:"Bestia tanque molesta. Reduce daño, ignora veneno y obliga al enemigo a prestarle atención.",formula:`Armadura Natural:
• Cada vez que recibe daño, reduce ese daño en 1.

Inmune al Veneno:
• No puede recibir Veneno ni daño causado por Veneno.

Bestia Irritante:
• Enemigos adyacentes tienen -1 DX si atacan a otra unidad que no sea el Tejón.

Mordida Fastidiosa:
• Si hace daño real, el objetivo pierde -1 MOV en su próximo turno.`,example:"Si el Tejón no hace daño a Vida, Mordida Fastidiosa no reduce MOV."},
    porcupine:{short:"Bestia defensiva. Castiga ataques cuerpo a cuerpo contra él.",formula:`Espinas Defensivas:
• Cuando una unidad enemiga lo ataca cuerpo a cuerpo, el atacante recibe 2 daño directo después del combate.
• Esto ocurre aunque el atacante no le cause daño al Puercoespín.

Miedo:
• Después de activar Espinas, otras unidades enemigas adyacentes al Puercoespín tienen 25% de recibir Miedo.
• Miedo reduce AT en 3 hasta el próximo turno de esa unidad.`,example:"Atacarlo cuerpo a cuerpo tiene costo incluso si logras bloquear su daño."},
    wild_boar:{short:"Bestia de carga. Necesita moverse antes de atacar para activar su presión.",formula:`Carga Brusca:
• Si se movió 2 o más casillas antes de atacar, gana +1 AT.

Empuje Salvaje:
• Si hace daño real con Carga Brusca, empuja al objetivo 1 casilla si hay espacio.`,example:"Si no hay espacio detrás del objetivo, puede hacer daño pero no empujar."},
    black_raven:{short:"Bestia de utilidad. Revela Sigilo y debilita Agilidad en área.",formula:`Ojo del Cazador:
• EFFECT revela unidades enemigas con Sigilo en radio 2.

Graznido Inquietante:
• Aura pasiva. Las unidades enemigas en rango 2 alrededor del Cuervo pierden -2 AGI mientras permanezcan dentro del aura.`,example:"El Cuervo no necesita hacer daño para que su aura de AGI moleste en radio 2."},
    constrictor_snake:{short:"Bestia de control. Castiga objetivos que ya tienen movimiento reducido.",formula:`Constricción:
• Si hace daño real, el objetivo pierde -1 MOV y -1 AGI hasta su próximo turno.

Agarre:
• Si el objetivo ya tenía MOV reducido, no podrá moverse en su próximo turno.`,example:"Primero hiere, luego reduce. Si la Guardia bloquea todo el daño, Constricción no entra."},
    inland_taipan:{short:"Bestia venenosa letal. Su veneno escala según el tipo de objetivo.",formula:`Mordida Letal:
• Si hace daño real, aplica Veneno.
• El valor de Veneno puede variar según el objetivo.
• Si una unidad normal ya estaba envenenada y recibe Veneno otra vez, muere.
• Los líderes sí pueden ser envenenados, pero siguen reglas menos letales que una unidad normal.`,example:"La mordida debe tocar Vida/HP. Si solo pega en Guardia, no aplica Veneno."},
    peregrine_falcon:{short:"Bestia aérea. Es difícil de alcanzar y premia ataques después de moverse mucho.",formula:`Aéreo:
• Solo unidades con rango mayor a 3 o Antiaéreo pueden atacarlo.

Ataque en Picada:
• Si se movió 3 o más casillas antes de atacar, siempre golpea y hace 3 daño.
• No usa PREC/EVA: no puede ser evadido por el objetivo.
• Aplica la regla propia del ataque en picada indicada por la carta.`,example:"Si no se movió lo suficiente, no obtiene el golpe garantizado de Picada."},
    african_lion:{short:"Bestia alfa. Revela Sigilo y controla enemigos cercanos con Miedo.",formula:`Rugido del Rey:
• EFFECT revela unidades enemigas con Sigilo en radio 3.

Presencia Alfa:
• Enemigos en rango 1 alrededor del León reciben Miedo.
• Miedo reduce AT según indique el estado.`,example:"El León funciona como centro de presión: castiga a quienes se acercan demasiado."},
    bengal_tiger:{short:"Bestia asesina. Usa Sigilo para entrar, saltar y aplicar daño persistente.",formula:`Sigilo de Depredador:
• No puede ser objetivo directo mientras esté oculto.

Salto de Emboscada:
• Desde Sigilo puede atacar con +2 alcance de movimiento.

Desgarro:
• Su efecto de daño persistente depende de hacer daño real según la regla de la carta.`,example:"Si el Tigre revela su posición, pierde parte de su protección táctica."},
    white_rhino:{short:"Bestia de impacto. Tiene una embestida enorme, pero queda vulnerable después.",formula:`Embestida Devastadora:
• Si se mueve 2 casillas en línea recta antes de atacar, usa AT 22.

Después de embestir:
• Impacte o no, queda expuesto según la penalización indicada por su carta/código.`,example:"Es un golpe de martillo: muy fuerte, pero necesita línea recta y buen momento."},
    african_elephant:{short:"Bestia colosal. Su carga frontal golpea el centro, barre los laterales, empuja y puede pisotear a quien no tenga retirada.",formula:`Arremetida Colosal — activación exacta:
• Debe moverse exactamente 1 celda en línea recta hacia el frente.
• La celda de movimiento debe acercarlo directamente al mismo enemigo que atacará.
• Debe atacar inmediatamente después, sin moverse lateralmente, retroceder, cambiar de objetivo ni realizar otra acción.

Objetivo principal:
• Gana +6 AT durante ese ataque: AT total 22.
• El objetivo pierde 4 AGI para evadir durante ese combate.
• Si impacta, es empujado hasta 2 celdas.
• Si no puede retroceder, recibe 8 de daño directo de Pisoteo.

Frente lateral:
• Los enemigos situados inmediatamente a ambos lados del objetivo central reciben un impacto independiente de AT 10.
• También pierden 4 AGI para evadir, no contraatacan y son empujados 1 celda si hay espacio.

Después de cargar:
• El Elefante avanza sobre la celda liberada cuando queda libre.
• Pierde 2 GD hasta el inicio de su próximo turno.
• No queda Aturdido.`,example:"No basta con haberse movido: debe avanzar exactamente de frente hacia el mismo objetivo y atacarlo inmediatamente."},
    richard_lionheart:{short:"Leyenda de soporte. Fortalece la Vida de un aliado adyacente mientras permanezca en campo.",formula:`Condición:
• Una vez por turno, Richard puede elegir un aliado adyacente.

Resultado:
• Ese aliado obtiene +2 Vida máxima y +2 Vida actual.
• El bonus dura mientras Richard siga en campo.`,example:"Si Richard cae, el soporte de Vida puede perderse."},
    saladin:{short:"Leyenda de invocación. Crea presión con una Caballería Arquera especial.",formula:`Condición:
• Una vez por turno.
• Saladino debe estar en campo.
• No debes controlar ya una Caballería Arquera de Saladino.

Resultado:
• Invoca una Caballería Arquera en una casilla libre adyacente válida.`,example:"Si no hay casilla libre o ya existe su Caballería Arquera, no puede invocarla."},
    african_buffalo:{short:"Bestia reactiva. Su cornada ocurre antes del ataque cuerpo a cuerpo enemigo.",formula:`Instinto de Cornada:
• Cuando una unidad enemiga adyacente declara un ataque cuerpo a cuerpo contra el Búfalo Africano, el Búfalo hace 2 daño directo primero.
• Si ese daño destruye al atacante, el ataque enemigo se cancela.
• Si el atacante sobrevive, el combate continúa normalmente.

Importante:
• Solo se activa contra ataques cuerpo a cuerpo adyacentes.
• No necesita que el Búfalo ataque primero.
• El daño es directo a Vida/HP.`,example:"Si una unidad con 2 Vida intenta atacarlo cuerpo a cuerpo, puede caer antes de golpear."},
    shaka_zulu:{short:"Leyenda de formación. Premia atacar objetivos rodeados por tus aliados.",formula:`Cuernos del Búfalo:
• Mientras Shaka Zulu esté en campo, si una unidad aliada ataca a un enemigo adyacente a otro aliado tuyo, el atacante obtiene +1 AT durante ese combate.
• Si el objetivo está adyacente a 2 o más aliados tuyos, el objetivo recibe además -2 AGI durante ese combate.

Regla de lanza:
• Puede contraatacar una vez por turno si sobrevive.
• Su reacción de lanza solo se activa contra atacantes cuerpo a cuerpo con RG 1 situados en una casilla adyacente.`,example:"No basta con atacar: debes tener aliados rodeando o presionando al objetivo."},
    yi_sun_sin:{short:"Leyenda de bloqueo. Castiga invocaciones enemigas al entrar.",formula:`Bloqueo Naval:
• Mientras Yi Sun-sin esté en campo, las unidades enemigas invocadas entran con -1 DX y -1 MOV durante su primer turno.

Importante:
• Afecta unidades nuevas del enemigo.
• No reduce unidades que ya estaban en el campo antes de que Yi Sun-sin aplicara la presión.
• Es una penalización temporal de entrada.`,example:"Una unidad rival recién invocada queda con menos DX y menos movilidad para ese primer turno."},
    simo_hayha:{short:"Francotirador de ejecución. Cada golpe final le permite desaparecer antes del siguiente disparo.",formula:`Muerte Blanca:
• Cuando Simo derrota directamente a una unidad enemiga con uno de sus ataques, obtiene Sigilo.
• Al declarar su siguiente ataque pierde Sigilo, aunque el disparo falle o no destruya al objetivo.
• Si ese nuevo ataque derrota a otra unidad, recupera Sigilo inmediatamente.
• Puede repetir este ciclo tantas veces como consiga golpes finales.

Sigilo actual:
• No puede ser seleccionado como objetivo directo mientras permanezca oculto.
• El rival ve una presencia oculta en su casilla, pero no el retrato ni la identidad normal.
• Detectores y efectos de revelación pueden quitarle Sigilo.`,example:"Simo elimina una unidad, obtiene Sigilo, dispara de nuevo y queda expuesto; si ese disparo vuelve a eliminar una unidad, recupera Sigilo."},
    boudica:{short:"Leyenda de venganza. Se fortalece cuando cae un aliado.",formula:`Ira de Iceni:
• Una vez por turno, cuando una unidad aliada es derrotada, Boudica obtiene +2 AT.
• Si el aliado derrotado era especial/legendario, también obtiene +1 MOV.
• El buff queda como bonus temporal según el sistema de limpieza de turnos.

Importante:
• Se activa por caída aliada, no por ataque propio.
• Solo una vez por turno.`,example:"Si pierdes una unidad especial, Boudica gana ataque y movimiento para responder."},
    ulysses:{short:"Leyenda táctica. Al atacar, mejora la formación aliada cercana.",formula:`Estratega de Ítaca:
• Cuando Ulises ataca, todas las unidades aliadas en radio 2 alrededor de él obtienen +1 Guardia y +1 MOV.
• No afecta líderes.
• No afecta al propio Ulises.
• El bonus de MOV dura hasta el próximo turno del dueño.

Importante:
• Se activa cuando Ulises declara/realiza ataque, no desde el botón EFFECT.`,example:"Atacar con Ulises cerca de tu formación puede preparar un avance defensivo del resto de tus unidades."},
    joan_of_arc:{short:"Leyenda protectora. Reduce daño aliado una vez por turno y puede dejar Guardia extra.",formula:`Llama de Orléans:
• Una vez por turno, cuando un aliado vaya a recibir daño, Juana reduce ese daño en 3.
• Si después de esa reducción el aliado queda en 1 Vida, obtiene +8 Guardia.
• No se activa si la unidad afectada tiene bloqueada la reducción de daño.

Importante:
• La reducción se consume automáticamente.
• Protege aliados, no aumenta el daño de Juana.`,example:"Puede convertir daño letal en supervivencia al límite."},
    leonidas:{short:"Leyenda de formación defensiva. Mejora básicos cercanos y puede castigar a quien lo derriba.",formula:`Última Formación:
• Si Leónidas está adyacente a una unidad aliada básica, ambos reciben +2 Guardia.
• Las unidades básicas aliadas adyacentes a Leónidas también reciben este bonus.

Última resistencia:
• Si Leónidas cae y el atacante no cae por el castigo, queda marcado como usado.
• Si el castigo destruye al atacante, Leónidas puede quedar con 1 Vida según la regla de salvamento del código.

Regla de lanza:
• Puede contraatacar una vez por turno si sobrevive.`,example:"Funciona mejor pegado a unidades básicas, formando un muro."},
    nasu_no_yoichi:{short:"Arquero de distancia. Debilita Guardia desde rango largo.",formula:`Marca del Abanico:
• Si Nasu ataca a distancia desde rango 3 o más, el objetivo recibe -1 Guardia durante ese combate.
• Si además causa daño real a Vida/HP, el código deja una reducción de Guardia persistente adicional sobre el objetivo.

Regla de arco:
• Recibe +1 RG base.`,example:"Nasu debe atacar desde lejos para abrir la Guardia del objetivo."},
    tomoe_gozen:{short:"Caballería de presión. Necesita moverse antes de atacar.",formula:`Jinete de la Luna Cortante:
• Si Tomoe se movió 2 o más casillas este turno antes de atacar, el objetivo recibe -2 AGI durante ese combate.
• Si el objetivo tiene RG 2 o más, Tomoe obtiene +1 AT durante ese combate.

Importante:
• Si no se movió al menos 2 casillas, no activa la penalización.
• Es Caballería para reglas de arma y anticaballería.`,example:"Úsala como golpe móvil contra unidades de rango o unidades que dependen de AGI."},
    hannibal_barca:{short:"Leyenda de cerco. Castiga enemigos que quedan atrapados junto a varios aliados de Hannibal.",formula:`Trampa de Cannas:
• Una vez por turno, cuando una unidad enemiga queda adyacente a 2 o más unidades aliadas de Hannibal, esa unidad pierde -1 AT y -1 MOV hasta su próximo turno.
• La penalización se guarda con duración de próximo turno del dueño del objetivo.

Importante:
• Depende de posición.
• Se activa por quedar adyacente a una formación, no por daño.`,example:"Si empujas o atraes una unidad enemiga junto a dos aliados de Hannibal, queda debilitada."},
    subotai:{short:"Leyenda de movilidad. Da movimiento extra a un aliado y puede repetir objetivo en turnos seguidos.",formula:`Marcha de Mil Horizontes:
• Una vez por turno, elige una unidad aliada.
• Esa unidad obtiene +2 MOV este turno.
• Puede usarse sobre la misma unidad en turnos seguidos.

Uso:
• Es un EFFECT manual con objetivo aliado.
• No puede usarse si Subotai ya lo usó este turno.`,example:"Sirve para reposicionar una amenaza o alcanzar un ataque que normalmente no llegaba."},
    lu_bu:{short:"Leyenda de ejecución. Gana Ataque permanente al destruir, con límite.",formula:`Furia de la Alabarda:
• La primera vez por turno que Lü Bu destruye una unidad enemiga, obtiene +1 AT permanente.
• El aumento permanente tiene límite de +3 por esta regla.
• Solo ocurre si la unidad enemiga cae por su ataque.

Regla de lanza:
• Puede contraatacar una vez por turno si sobrevive.`,example:"Lü Bu escala si logra remates, pero no gana AT infinito."},
    ragnar_lodbrok:{short:"Leyenda saqueadora. Se cura al herir objetivos importantes.",formula:`Saqueo del Norte:
• Una vez por turno, si Ragnar hace daño real a un líder, estructura o unidad con más Vida máxima que él, recupera 1 Vida.
• Debe causar daño a Vida/HP.
• Si solo rompe Guardia, no se cura.

Regla de espada:
• Recibe +3 Guardia base.`,example:"Ragnar se sostiene mejor atacando objetivos grandes o líderes."},
    el_cid:{short:"Leyenda duelista. Mejora al defenderse contra enemigos con más Ataque.",formula:`Campeador:
• Cuando El Cid es atacado por una unidad con mayor AT que él, obtiene +2 DX y +2 Guardia durante ese combate.
• No se activa cuando El Cid es quien ataca.

Regla de espada:
• Recibe +3 Guardia base.`,example:"No se activa contra enemigos con AT igual o menor que el suyo."},
    spartacus:{short:"Leyenda de rebelión. Mejora unidades básicas contra cartas especiales.",formula:`Romper Cadenas:
• Mientras Espartaco esté en campo, tus unidades básicas obtienen +1 AT cuando atacan cartas especiales/legendarias.
• El bonus se aplica al atacante básico durante ese combate.

Importante:
• No mejora cartas especiales.
• No se activa si el objetivo no es especial.`,example:"Convierte unidades básicas en amenaza contra leyendas."},
    sun_tzu:{short:"Leyenda de soporte táctico. Su EFFECT mejora DX y Guardia de un aliado.",formula:`Arte de la Guerra:
• Una vez por turno, elige una unidad aliada.
• Ese aliado obtiene +1 DX y +1 Guardia.
• No puede usarse si Sun Tzu ya lo usó este turno.

Uso:
• Es un EFFECT manual con objetivo aliado.`,example:"Úsalo antes de un ataque clave o para reforzar una unidad que va a recibir presión."},
    hector_troy:{short:"Leyenda de aura defensiva/ofensiva. Debilita enemigos que se agrupan junto a él.",formula:`Muralla de Troya:
• Aura pasiva.
• Cuenta cuántas unidades enemigas están en rango 1 de Héctor.
• Cada una de esas unidades enemigas pierde AT igual a esa cantidad.
• La penalización aparece como estado/debuff mientras estén cerca.

Regla de lanza:
• Puede contraatacar una vez por turno si sobrevive.`,example:"Si 3 enemigos rodean a Héctor, cada uno puede perder 3 AT mientras siga en esa zona."},
    beowulf:{short:"Leyenda cazamonstruos. Gana fuerza contra objetivos con más Vida máxima.",formula:`Matador de Monstruos:
• Cuando Beowulf ataca a una unidad con mayor Vida máxima que él, obtiene +3 AT durante ese combate.
• Si destruye a ese objetivo, recupera 2 Vida.
• La curación no supera su Vida máxima efectiva.

Regla de espada:
• Recibe +3 Guardia base.`,example:"Especialmente útil contra tanques, bestias grandes o semidioses con mucha Vida."},
    miyamoto_musashi:{short:"Leyenda de contraataque. Responde en cuerpo a cuerpo cuando evade o sobrevive herido.",formula:`Dos Cielos:
• Una vez por turno, si Musashi evade un ataque cuerpo a cuerpo, contraataca inmediatamente con +2 AT.
• Si recibe daño real y sobrevive a un ataque cuerpo a cuerpo, también puede contraatacar.
• Si ese contraataque hace daño real, puede aplicar Sangrado según la resolución del combate.

Regla de espada:
• Recibe +3 Guardia base.`,example:"No es un ataque manual extra: se activa como respuesta defensiva durante combate cuerpo a cuerpo."},
    khalid_ibn_al_walid:{short:"Leyenda de cadena. Puede seguir atacando tras destruir, pero cada ataque encadenado se vuelve más pesado.",formula:`Espada Invicta:
• Cuando Khalid destruye una unidad enemiga con un ataque, puede volver a atacar si sigue vivo.
• Cada ataque encadenado aplica una penalización acumulada de -2 AT.
• La penalización se muestra como presión de ataque y se resta en combate.

Regla de espada:
• Recibe +3 Guardia base.`,example:"Puede barrer unidades heridas, pero cada remate hace que el siguiente golpe sea menos fuerte."},
    attila_hun:{short:"Leyenda de terror. Debilita enemigos heridos por debajo de la mitad de Vida.",formula:`Azote de Imperios:
• Mientras Atila esté en campo, los enemigos con la mitad o menos de su Vida máxima pierden -3 Guardia y -3 AGI.
• Es un aura global contra enemigos heridos.
• No afecta líderes.

Regla de arco:
• Recibe +1 RG base.
• También está clasificado como Caballería para ventaja de arma.`,example:"Atila vuelve vulnerables a las unidades que ya están a media Vida o menos."},
    genghis_khan:{short:"Leyenda de conquista. Al destruir, debilita a enemigos cercanos.",formula:`Horda de la Estepa:
• Cuando Gengis Kan destruye una unidad enemiga, todas las unidades enemigas no líderes en radio 2 pierden -2 Guardia.
• Además reciben -1 MOV hasta su próximo turno.
• Solo se activa si el objetivo destruido no era líder.

Regla de espada:
• Recibe +3 Guardia base.`,example:"Después de un remate, abre a las unidades cercanas para el resto de tu ofensiva."},
    alexander_magnus:{short:"Leyenda de muro. Premia bloquear ataques sin perder Vida.",formula:`Muro de Macedonia:
• Mientras Alejandro Magno esté en campo, una unidad aliada que recibe un ataque y bloquea sin perder Vida gana +1 Vida máxima y +1 Vida actual.
• El aumento ocurre sobre la unidad que defendió.
• No se activa si recibió daño real a Vida/HP.

Regla de lanza:
• Puede contraatacar una vez por turno si sobrevive.`,example:"Si la Guardia absorbe todo el daño, la unidad puede crecer en Vida."},
    julius_caesar:{short:"Leyenda de disciplina. Debilita el primer ataque enemigo de cada turno.",formula:`Disciplina de las Legiones:
• Mientras Julio César esté en campo, la primera vez por turno que una unidad enemiga ataque a una unidad de su dueño, ese atacante recibe -2 AT y -1 DX durante ese combate.
• La regla se marca como usada en César.
• No se repite hasta que se limpie en un nuevo turno.

Regla de espada:
• Recibe +3 Guardia base.`,example:"El primer ataque enemigo contra tu línea bajo César llega más débil y menos preciso."},
    cu_chulainn:{short:"Semidiós de furia. Se vuelve más fuerte herido y puede contraatacar cuerpo a cuerpo.",formula:`Furia del Sabueso:
• Mientras Cú Chulainn tenga la mitad o menos de su Vida máxima, obtiene +5 AT y +5 AGI.

Contraataque del Sabueso:
• Una vez por turno, cuando recibe un ataque cuerpo a cuerpo y sobrevive, puede contraatacar.

Regla de lanza:
• Puede contraatacar una vez por turno si sobrevive.`,example:"Herido se vuelve más peligroso, no más débil."},
    gilgamesh:{short:"Semidiós de presencia. Debilita enemigos adyacentes y reduce daño de ataques a distancia.",formula:`Peso del Rey de Uruk:
• Los enemigos adyacentes a Gilgamesh reciben -3 AT y -3 AGI.
• Si Gilgamesh recibe daño de proyectiles, arqueros o ataques mágicos a distancia, reduce ese daño en 2.
• La reducción no aplica si tiene bloqueadas reducciones especiales.

Regla de espada:
• Recibe +3 Guardia base.`,example:"Acercarse a Gilgamesh debilita el ataque y la AGI del enemigo."},
    arjuna:{short:"Semidiós arquero. Puede repetir un disparo fallido una vez por turno.",formula:`Flecha del Dharma:
• Una vez por turno, cuando Arjuna falla un ataque a distancia, puede repetir el intento con +6 DX.
• Si acierta con esa repetición, provoca Veneno.
• La repetición se marca como usada ese turno.

Regla de arco:
• Recibe +1 RG base.`,example:"Su primer fallo a distancia no siempre termina el ataque: puede tener una segunda oportunidad mejorada."},
    achilles:{short:"Semidiós ofensivo. Primer ataque más fuerte, Guardia por concentración y curación al inicio.",formula:`Cólera del Pélida:
• La primera vez por turno que Aquiles ataca, obtiene +2 AT durante ese combate.

Concentración del Pélida:
• Si Aquiles tiene 2 o más enemigos adyacentes, obtiene +6 Guardia.

Sangre del Pélida:
• Al inicio de tu turno, Aquiles recupera 1 Vida sin superar su máximo.`,example:"Aquiles quiere estar en el centro del choque, pero su primer ataque del turno es el más fuerte."},
    saladin_archer_cavalry:{short:"Unidad token de Saladino. Funciona como caballería arquera rápida.",formula:`Origen:
• Es invocada por Media Luna del Desierto de Saladino.
• No se juega desde la mano normalmente.

Reglas:
• Cuenta como Caballería para reglas de arma y anticaballería.
• Cuenta como arquera para Regla de arco: recibe +1 RG base.
• Puede aprovechar movilidad alta para presión de rango.`,example:"Si un Lancero solar la recibe cuerpo a cuerpo, puede aplicarle Anticaballería por ser Caballería."}
  };
  const custom=map[key];
  if(custom)return {...generic,...custom,formula:`${custom.formula||generic.formula}${systemNote}`,title:`✦ Efecto exacto: ${name}`,card:entity};
  const sections=getEntityAbilitySections(entity,raw);
  if(sections.length){
    return {...generic,formula:`${sections.map(sec=>`${sec.title}:
• ${sec.body}`).join("\n\n")}${systemNote}`,example:"Si una habilidad dice 'si hace daño real', debe causar daño a Vida/HP. Si solo baja Guardia, esa parte no se activa."};
  }
  return {...generic,formula:`${generic.formula}${systemNote}`};
}
function openExactEntityEffectGuide(entity,effectText="",effectTitle=""){
  const data=getExactEffectGuideData(entity,effectText);
  if(effectTitle)data.title=`✦ ${effectTitle}`;
  openStatGuideModal(data);
}

function shouldShowEffectGuideButton(entity,effectText=""){
  if(!String(effectText||"").trim())return false;
  // Las unidades pasivas/automáticas ya muestran sus reglas en la lista de EFECTOS.
  // No necesitan botón "Ver efecto", porque no se activan manualmente.
  if(entity&&(entity.type==="unit"||(!entity.spell&&!entity.trap&&!entity.leader&&entity.key))){
    return getUnitEffectMode(entity)!=="passive";
  }
  // Líderes, hechizos y trampas sí pueden conservar el botón informativo.
  return true;
}

function detailGuideButtonsHtml({showEffect=false,showWeapon=false,showFormula=true,showLore=false,effectLabel="Ver efecto",entity=null}={}){
  const chips=[];
  if(showEffect)chips.push(`<div class="detail-guide-chip"><button class="detail-token-btn guide-effect-btn" type="button" aria-label="${escapeHtml(effectLabel)}"><img class="det-btn-img" src="assets/ui/det_icons/trigger.webp" alt="${escapeHtml(effectLabel)}"></button><span>${escapeHtml(effectLabel)}</span></div>`);
  if(showWeapon){
    const weaponIcon=entity?getWeaponClassIcon(entity):"assets/ui/det_icons/tactical.webp";
    chips.push(`<div class="detail-guide-chip"><button class="detail-token-btn guide-weapon-btn" type="button" aria-label="Arma / ventaja y desventaja" title="Arma / ventaja y desventaja"><img class="det-btn-img" src="${weaponIcon}" alt=""></button><span>Arma / ventaja y desventaja</span></div>`);
  }
  if(showFormula)chips.push(`<div class="detail-guide-chip"><button class="detail-token-btn guide-formula-btn" type="button" aria-label="PREC / EVA"><img class="det-btn-img" src="assets/ui/det_icons/dexterity.webp" alt="PREC / EVA"></button><span>PREC / EVA</span></div>`);
  if(showLore)chips.push(`<div class="detail-guide-chip"><button class="detail-token-btn guide-lore-btn" type="button" aria-label="Conóceme"><img class="det-btn-img" src="assets/ui/det_icons/lore.webp" alt="Conóceme"></button><span>Conóceme</span></div>`);
  return chips.length?`<div class="detail-guide-row">${chips.join("")}</div>`:"";
}
function detailStatusButtonsHtml(entries=[]){
  if(!entries.length)return "";
  return `<div class="detail-guide-block"><div class="detail-guide-caption">Estados activos</div><div class="detail-chip-row">${entries.map((entry,idx)=>`<div class="detail-status-chip"><button class="guide-status-btn det-status-icon-btn" type="button" data-status-index="${idx}" aria-label="${escapeHtml(entry.name||entry.label||"Estado")}">${getStatusEntryIconHtml(entry)}</button><span>${escapeHtml(entry.name||entry.label||"Estado")}</span></div>`).join("")}</div></div>`;
}
function openStatusGuideModal(entry={},entity=null){
  if(!entry)return;
  const label=entry.name||entry.label||"Estado activo";
  const rawKind=String(entry.kind||entry.icon||"").toLowerCase();
  const isBuff=rawKind.includes("buff")||["buff","defense","guard","hp"].includes(String(entry.icon||""));
  const isDebuff=rawKind.includes("debuff")||["debuff","bleed","poison","burn","paralysis","silence","curse","lock","control"].includes(String(entry.icon||""));
  openStatGuideModal({
    title:`${getStatusEntryGlyph(entry)} ${label}`,
    short:entity?.name?`${entity.name} tiene este ${isBuff?"buff":isDebuff?"debuff":"estado"} activo.`:`${isBuff?"Buff":isDebuff?"Debuff":"Estado"} activo.`,
    formula:entry.desc||"Estado activo sin descripción adicional.",
    example:entry.extra||"Todos los estados activos son clickeables desde DET y desde sus iconos sobre la unidad para revisar qué modifican."
  });
}

function bindStatusGuideDelegation(container,entity,getStatuses){
  if(!container)return;
  container._hvStatusGuideEntity=entity;
  container._hvStatusGuideGetter=getStatuses;
  if(container.dataset.statusGuideDelegationBound)return;
  container.dataset.statusGuideDelegationBound="1";
  container.addEventListener("click",ev=>{
    const btn=ev.target&&ev.target.closest?ev.target.closest(".guide-status-btn,.det-status-row,[data-status-index]"):null;
    if(!btn||!container.contains(btn))return;
    const idx=Number(btn.dataset.statusIndex);
    if(!Number.isFinite(idx))return;
    const statuses=typeof container._hvStatusGuideGetter==="function"?container._hvStatusGuideGetter():[];
    const entry=statuses[idx];
    if(!entry)return;
    ev.preventDefault();
    ev.stopPropagation();
    openStatusGuideModal(entry,container._hvStatusGuideEntity||entity);
  },true);
}

function closeDetLayoutTunerPanelForGuide(){
  document.getElementById("hvDetLayoutTunerPanel")?.classList.add("hidden");
}
function resolveDetGuideTarget(container,ev){
  if(!container||!ev?.target?.closest)return null;
  const target=ev.target.closest([
    '.guide-formula-btn',
    '.guide-lore-btn',
    '.guide-weapon-btn',
    '.guide-effect-btn',
    '.guide-ability-btn',
    '.det-effect-seal',
    '.det-tactical-seal',
    '.guide-status-btn',
    '.det-status-row',
    '.det-status-icon-btn',
    '.det-stat-icon-btn',
    '.stat-click',
    '[data-stat]'
  ].join(','));
  return target&&container.contains(target)?target:null;
}
function runDetGuideAction(container,target,{entity=null,statuses=[],effectText="",effectTitle=""}={}){
  if(!target||target.disabled)return false;
  closeDetLayoutTunerPanelForGuide();
  if(target.matches('[data-stat],.stat-click,.det-stat-icon-btn')){
    openStatGuideModal(target.dataset.stat||target.dataset.statRow||target.getAttribute('aria-label')||target.textContent||'formula');
    return true;
  }
  if(target.matches('.guide-formula-btn')){
    openStatGuideModal('formula');
    return true;
  }
  if(target.matches('.guide-weapon-btn,.det-tactical-seal')){
    openWeaponGuide(entity);
    return true;
  }
  if(target.matches('.guide-lore-btn')){
    openUnitLoreModal(entity);
    return true;
  }
  if(target.matches('.guide-effect-btn')){
    openExactEntityEffectGuide(entity,effectText||getUnitEffectText(entity)||'',effectTitle||`Efecto exacto de ${entity?.name||'la carta'}`);
    return true;
  }
  if(target.matches('.guide-ability-btn,.det-effect-seal')){
    openStatGuideModal({
      title:target.dataset.abilityTitle||target.getAttribute('aria-label')||'Efecto',
      short:"",
      formula:target.dataset.abilityText||'Sin explicación adicional.',
      example:"",
      hideCombatButton:true
    });
    return true;
  }
  if(target.matches('.guide-status-btn,.det-status-row,.det-status-icon-btn')||target.hasAttribute('data-status-index')){
    const idx=Number(target.dataset.statusIndex);
    if(!Number.isFinite(idx))return false;
    const entry=statuses[idx];
    if(!entry)return false;
    openStatusGuideModal(entry,entity);
    return true;
  }
  return false;
}
function bindInspectorDetModalDelegation(inspector){
  if(!inspector||inspector.dataset.detModalDelegationBound)return;
  inspector.dataset.detModalDelegationBound="1";
  inspector.addEventListener('click',ev=>{
    const target=resolveDetGuideTarget(inspector,ev);
    if(!target||target.closest('#inspectClose'))return;
    const handled=runDetGuideAction(inspector,target,{
      entity:inspector._hvInspectedEntity||null,
      statuses:Array.isArray(inspector._hvActiveStatuses)?inspector._hvActiveStatuses:[],
      effectText:inspector._hvEffectText||'',
      effectTitle:inspector._hvEffectTitle||''
    });
    if(!handled)return;
    ev.preventDefault();
    ev.stopPropagation();
  },false);
}
function bindCardInspectDetModalDelegation(modal){
  if(!modal||modal.dataset.detModalDelegationBound)return;
  modal.dataset.detModalDelegationBound="1";
  modal.addEventListener('click',ev=>{
    const target=resolveDetGuideTarget(modal,ev);
    if(!target||target.closest('#cardInspectX,#cardInspectCancel,#cardInspectPlay'))return;
    const handled=runDetGuideAction(modal,target,{
      entity:modal._hvInspectedEntity||null,
      statuses:Array.isArray(modal._hvActiveStatuses)?modal._hvActiveStatuses:[],
      effectText:modal._hvEffectText||'',
      effectTitle:modal._hvEffectTitle||''
    });
    if(!handled)return;
    ev.preventDefault();
    ev.stopPropagation();
  },false);
}

function bindEntityGuideButtons(container,entity,{effectText="",effectTitle="",statuses=[]}={}){
  if(!container)return;
  const effectBtn=container.querySelector('.guide-effect-btn');
  if(effectBtn)effectBtn.addEventListener('click',ev=>{
    ev.stopPropagation();
    openExactEntityEffectGuide(entity,effectText,effectTitle||`Efecto exacto de ${entity?.name||'la carta'}`);
  });
  const weaponBtn=container.querySelector('.guide-weapon-btn');
  if(weaponBtn)weaponBtn.addEventListener('click',ev=>{ev.stopPropagation();openWeaponGuide(entity);});
  const formulaBtn=container.querySelector('.guide-formula-btn');
  if(formulaBtn)formulaBtn.addEventListener('click',ev=>{ev.stopPropagation();openStatGuideModal('formula');});
  const loreBtn=container.querySelector('.guide-lore-btn');
  if(loreBtn)loreBtn.addEventListener('click',ev=>{
    ev.stopPropagation();
    openUnitLoreModal(entity);
  });
  container.querySelectorAll('.guide-status-btn, .det-status-row').forEach(btn=>btn.addEventListener('click',ev=>{
    ev.stopPropagation();
    const idx=Number(btn.dataset.statusIndex||0);
    const entry=statuses[idx];
    if(!entry)return;
    openStatusGuideModal(entry,entity);
  }));
  container.querySelectorAll('.guide-ability-btn').forEach(btn=>btn.addEventListener('click',ev=>{
    ev.stopPropagation();
    const kind=btn.dataset.abilityKind||"effect";
    const meta=getDetAbilityMeta(kind);
    openStatGuideModal({
      title:btn.dataset.abilityTitle||'Efecto',
      short:"",
      formula:btn.dataset.abilityText||'Sin explicación adicional.',
      example:"",
      hideCombatButton:true
    });
  }));
}
function statHelpHtml(stats){
  const seen=new Set();
  return stats.map(([label])=>{
    const clean=String(label||"");
    const key=clean.toLowerCase();
    if(seen.has(key))return "";
    seen.add(key);
    return `<div class="stat-help-line"><b>${escapeHtml(clean)}</b>: ${escapeHtml(statHelpText(clean))}</div>`;
  }).join("");
}
function cardRuleHelpHtml(card){
  const stats=cardInspectStats(card);
  let lines=statHelpHtml(stats);
  const effectText=normalizeSaboteadorRuleText(card,card?.text||card?.effectText||card?.ability||"");
  if(effectText)lines+=`<div class="stat-help-line"><b>Efecto</b>: ${escapeHtml(effectText)}</div>`;
  if(card?.type==="unit")lines+=weaponSummaryHtml(card);
  const weaponBtn=card?.type==="unit"?`<button id="cardWeaponGuideBtn" class="btn ghost full stat-guide-inline-btn" type="button">Ver arma y ventaja táctica</button>`:"";
  return `<div class="stat-help-box"><div class="stat-help-title">Guía rápida</div>${lines}${weaponBtn}</div>`;
}
function unitRuleHelpHtml(u){
  const stats=[["HP",`${getDisplayHp(u)}/${effectiveMaxHp(u)}`],["AT",effectiveAtk(u)],["GD",displayEffectiveGuard(u)],["DX",effectiveDex(u)],["AGI",effectiveAgi(u)],["MV",effectiveMov(u)],["RG",getUnitAttackRange(u)]];
  let lines=statHelpHtml(stats);
  const effectText=getUnitEffectText(u);
  if(effectText)lines+=`<div class="stat-help-line"><b>Destreza/Efecto</b>: ${escapeHtml(effectText)}</div>`;
  else lines+=`<div class="stat-help-line"><b>Destreza/Efecto</b>: si la unidad tiene una habilidad especial, aquí se explica cuándo y cómo aplica.</div>`;
  lines+=weaponSummaryHtml(u);
  return `<div class="stat-help-box"><div class="stat-help-title">Guía rápida</div>${lines}<button id="unitWeaponGuideBtn" class="btn ghost full stat-guide-inline-btn" type="button">Ver arma y ventaja táctica</button></div>`;
}
function closeHandForBoardFocus(){
  handOpen=false;
  handManualCloseKey=getHandAvailabilityKey();
  const drawer=$("handDrawer");
  if(drawer)drawer.classList.remove("open");
  const hb=$("handBtn");
  if(hb)hb.classList.remove("selected");
}
function getCardVisualHtml(card,variant="hand-icon") {
  const portrait=getResolvedCardPortraitSource(card);
  if(portrait){
    const alt=escapeHtml(card?.name||"Carta");
    const fallbackAttr=buildAssetFallbackAttr([getAssetWarningImageSrc()],`${card?.name||"Carta"} · carta`);
    return `<div class="${variant} card-portrait"><img src="${portrait}" alt="${alt}" ${fallbackAttr}></div>`;
  }
  return `<div class="${variant}"><span>${card?.icon||"✦"}</span></div>`;
}

function parseCardInspectLevelProgress(rawText=""){
  const raw=String(rawText||"").trim();
  const fallback={raw,visible:false,rank:"I",current:0,total:0,remaining:0,progress:0};
  if(!raw)return fallback;
  const main=raw.match(/NIVEL\s+([IVXLCDM]+|\d+)\s*[·\-–—]?\s*(\d+)\s*\/\s*(\d+)/i);
  if(!main){
    const levelOnly=raw.match(/NIVEL\s+([IVXLCDM]+|\d+)/i);
    return {...fallback,visible:!!levelOnly,rank:(levelOnly?.[1]||'I').toUpperCase()};
  }
  const rank=String(main[1]||'I').toUpperCase();
  const current=Math.max(0,Number(main[2]||0));
  const total=Math.max(0,Number(main[3]||0));
  const remainingMatch=raw.match(/faltan\s+(\d+)/i);
  const maxed=/nivel m[aá]ximo|rango m[aá]ximo/i.test(raw);
  const remaining=maxed?0:Math.max(0,Number(remainingMatch?.[1]??Math.max(0,total-current)));
  const progress=total>0?Math.max(0,Math.min(100,(current/total)*100)):0;
  return {raw,visible:true,rank,current,total,remaining,progress,maxed};
}
function getUnifiedDetProgressText(entity){
  try{
    if(!entity)return "";
    if(entity.leader){
      const level=Math.max(1,Number(entity.leaderLevel||1));
      return `NIVEL ${level}`;
    }
    if(entity.type!=="unit")return "";
    if(entity.owner!==undefined&&typeof myPlayer!=="undefined"&&Number(entity.owner)!==Number(myPlayer)){
      const enemyRank=Math.max(1,Number(entity.masteryRank||1));
      const rankText=typeof romanUnitRank==="function"?romanUnitRank(enemyRank):String(enemyRank);
      return `NIVEL ${rankText}`;
    }
    if(typeof getDeckBuilderDetProgressText==="function"){
      const direct=getDeckBuilderDetProgressText(entity);
      if(direct)return direct;
    }
    if(typeof getUnitMasteryRecord!=="function"||typeof getUnitMasteryRankFromKills!=="function"||typeof getUnitMasteryKillsForRank!=="function")return "NIVEL I";
    const record=getUnitMasteryRecord(entity);
    const kills=Math.max(0,Math.floor(Number(record?.kills||0)));
    const rank=Math.max(1,Number(getUnitMasteryRankFromKills(kills)||1));
    const maxRank=typeof UNIT_MASTERY_MAX_RANK==="number"?UNIT_MASTERY_MAX_RANK:10;
    const rankText=typeof romanUnitRank==="function"?romanUnitRank(rank):String(rank);
    if(rank>=maxRank)return `NIVEL ${rankText} · ${kills} muertes · nivel máximo`;
    const next=Math.max(kills,Math.floor(Number(getUnitMasteryKillsForRank(rank+1)||kills)));
    return `NIVEL ${rankText} · ${kills}/${next} muertes · faltan ${Math.max(0,next-kills)}`;
  }catch(error){
    console.warn('[HallValla] No se pudo calcular el progreso del DET unificado:',error);
    return "";
  }
}
function getUnifiedDetCopiesText(entity){
  try{
    if(!entity?.key)return "—";
    let owned=Number(entity.qty||0);
    if(typeof getCollectionCardsExpanded==="function"){
      const found=getCollectionCardsExpanded().find(card=>card?.key===entity.key);
      if(found)owned=Number(found.qty||0);
    }
    if(typeof maxCopiesForCard==="function")return `${Math.max(0,owned)}/${Math.max(1,Number(maxCopiesForCard(entity)||1))}`;
    return owned>0?String(owned):"—";
  }catch(_){return "—";}
}
function getUnifiedDetStateText(entity,mode="card",statuses=[]){
  if(mode==="field"){
    const side=entity?.owner===myPlayer?'ALIADA':'RIVAL';
    const active=Array.isArray(statuses)?statuses.length:0;
    return active>0?`EN CAMPO · ${side} · ${active} EST.`:`EN CAMPO · ${side}`;
  }
  if(mode==="pack")return "REVELADA";
  if(mode==="hand")return "EN MANO";
  try{
    if(typeof getCollectionCardsExpanded==="function"&&entity?.key){
      const found=getCollectionCardsExpanded().find(card=>card?.key===entity.key);
      const owned=Number(found?.qty||entity?.qty||0);
      return owned>0?"DESBLOQUEADA":"BLOQUEADA";
    }
  }catch(_){ }
  return entity?.type==="unit"?"DISPONIBLE":"CARTA";
}
function getUnifiedDetPrecEvaText(entity,{live=false}={}){
  if(!entity||entity.leader)return "FIJO";
  try{
    if(live&&typeof getBaseEvasionScore==="function"){
      const total=Math.max(0,Number(getBaseEvasionScore(entity)||0));
      const spent=typeof getEvasionPressure==="function"?Math.max(0,Number(getEvasionPressure(entity)||0)):0;
      return `${Math.max(0,total-spent)}/${total}`;
    }
    const dx=Number(entity.dex??entity.dx??0);
    const agi=Number(entity.agi??0);
    return String(Math.max(0,dx+agi));
  }catch(_){return "—";}
}
function syncUnifiedDetCoreFields(entity,{mode="card",live=false,statuses=[]}={}){
  const typeEl=$("detTypeValue"),rarityEl=$("detRarityValue"),stateEl=$("detStateValue"),copiesEl=$("detCopiesValue");
  const weaponBtn=$("detWeaponValue"),precBtn=$("detPrecEvaValue"),loreBtn=$("detLoreValue");
  if(typeEl)typeEl.textContent=entity?.leader?'LÍDER':(typeof getEntityTypeLabel==="function"?getEntityTypeLabel(entity):(entity?.type||'—'));
  if(rarityEl)rarityEl.textContent=typeof getDetDisplayRarity==="function"?getDetDisplayRarity(entity):(entity?.rarity||'—');
  if(stateEl)stateEl.textContent=getUnifiedDetStateText(entity,mode,statuses);
  if(copiesEl)copiesEl.textContent=getUnifiedDetCopiesText(entity);
  if(weaponBtn){
    const img=weaponBtn.querySelector('img'),value=weaponBtn.querySelector('span');
    const canWeapon=!!entity&&(entity.type==='unit'||entity.leader);
    weaponBtn.disabled=!canWeapon;
    weaponBtn.classList.toggle('is-disabled',!canWeapon);
    if(img)img.src=canWeapon&&typeof getWeaponClassIcon==="function"?getWeaponClassIcon(entity):'assets/ui/det_icons/tactical.webp';
    if(value)value.textContent=canWeapon&&typeof getWeaponClassLabel==="function"?getWeaponClassLabel(entity):'—';
  }
  if(precBtn){
    const value=precBtn.querySelector('span');
    precBtn.disabled=!(entity&&(entity.type==='unit'||entity.leader));
    precBtn.classList.toggle('is-disabled',precBtn.disabled);
    if(value)value.textContent=getUnifiedDetPrecEvaText(entity,{live});
  }
  if(loreBtn){
    const canLore=!!entity&&(entity.type==='unit'||entity.leader);
    loreBtn.disabled=!canLore;
    loreBtn.classList.toggle('is-disabled',!canLore);
    const value=loreBtn.querySelector('span');if(value)value.textContent=canLore?'ABRIR':'—';
  }
}
function syncCardInspectTemplateUi(progressText=null){
  const modal=$("cardInspectModal");
  if(!modal)return;
  const levelPanel=$("detLevelPanel");
  const rankEl=$("detLevelRank");
  const fillEl=$("detLevelProgressFill");
  const textEl=$("detLevelProgressText");
  const subEl=$("detLevelProgressSub");
  const reasonEl=$("cardInspectReason");
  const raw=progressText??modal._hvLevelProgressText??reasonEl?.textContent??"";
  const data=parseCardInspectLevelProgress(raw);
  if(levelPanel)levelPanel.classList.toggle('is-empty',!data.visible);
  if(rankEl)rankEl.textContent=`NIVEL ${data.rank||'I'}`;
  if(fillEl)fillEl.style.width=`${Number.isFinite(data.progress)?data.progress:0}%`;
  if(textEl)textEl.textContent=data.visible&&data.total>0?`${data.current} / ${data.total}`:(data.visible?'—':'Sin progreso');
  if(subEl)subEl.textContent=data.visible?(data.maxed?'nivel máximo':(data.total>0?`faltan ${data.remaining}`:'progreso no disponible')):'';
  const favBtn=$("detFavoriteToggle");
  const favStar=favBtn?.querySelector('.det-favorite-star');
  if(favBtn&&favStar){
    const active=favBtn.classList.contains('is-active');
    favStar.textContent=active?'★':'☆';
  }
}
function getUnifiedDetStats(entity,{live=false}={}){
  if(live&&entity){
    if(entity.leader)return [["HP",`${getDisplayHp(entity)}/${effectiveMaxHp(entity)}`],["AT",effectiveAtk(entity)],["GD",displayEffectiveGuard(entity)],["DX",0],["AGI",0],["MV",effectiveMov(entity)],["RG",getUnitAttackRange(entity)]];
    return [["HP",`${getDisplayHp(entity)}/${effectiveMaxHp(entity)}`],["AT",effectiveAtk(entity)],["GD",displayEffectiveGuard(entity)],["DX",effectiveDex(entity)],["AGI",effectiveAgi(entity)],["MV",effectiveMov(entity)],["RG",getUnitAttackRange(entity)]];
  }
  return cardInspectStats(entity);
}
function openUnifiedDetEntity(entity,{mode="card",ownerLabel="",live=false,statuses=[],visualHtml="",reasonText="",allowPlay=false,playState=null}={}){
  if(!entity)return null;
  const modal=$("cardInspectModal");
  if(!modal)return null;
  modal.className=`card-inspect-modal hidden unified-det-modal det-v32-unified unified-det-${mode} ${getCardVisualClass(entity)}`;
  const title=$("cardInspectTitle"),sub=$("cardInspectSub"),visual=$("cardInspectVisual"),stats=$("cardInspectStats"),text=$("cardInspectText"),reason=$("cardInspectReason"),play=$("cardInspectPlay"),cancel=$("cardInspectCancel"),battlePowerBadge=$("cardInspectBattlePowerBadge");
  if(title)title.textContent=getEntityFullDisplayName(entity);
  updateDetBattlePowerBadge(battlePowerBadge,entity);
  if(sub)sub.innerHTML=renderDetIdentityHtml(entity,ownerLabel);
  if(visual)visual.innerHTML=visualHtml||(live&&typeof getUnitPortraitHtml==="function"?getUnitPortraitHtml(entity):getCardVisualHtml(entity,"card-inspect-portrait"));
  if(stats)stats.innerHTML=renderDetStatButtons(getUnifiedDetStats(entity,{live}),"card-inspect-stat");
  const effectText=live?getUnitEffectText(entity):normalizeSaboteadorRuleText(entity,entity.text||entity.effectText||entity.ability||"").trim();
  if(text)text.innerHTML=`${renderDetAbilitiesHtml(entity,effectText)}${renderDetStatusesHtml(statuses,entity)}${renderDetQuoteHtml(entity)}${detailGuideButtonsHtml({showEffect:shouldShowEffectGuideButton(entity,effectText),showWeapon:entity.type==='unit'||entity.leader,showFormula:entity.type==='unit'||entity.leader,showLore:entity.type==='unit'||entity.leader,effectLabel:entity.leader?'Ver líder':(live?'Ver efecto':'Ver efecto de la carta'),entity})}`;
  modal._hvInspectedEntity=entity;
  modal._hvActiveStatuses=Array.isArray(statuses)?statuses:[];
  modal._hvEffectText=effectText;
  modal._hvEffectTitle=`Efecto de ${entity.name||'la carta'}`;
  modal._hvLevelProgressText=getUnifiedDetProgressText(entity);
  bindCardInspectDetModalDelegation(modal);
  syncUnifiedDetCoreFields(entity,{mode,live,statuses});
  if(reason)reason.textContent=reasonText||modal._hvLevelProgressText||'';
  const actions=modal.querySelector('.card-inspect-actions');
  if(actions)actions.classList.toggle('hidden',!allowPlay);
  if(cancel){cancel.textContent=allowPlay?'Cancelar':'Cerrar';cancel.classList.toggle('hidden',!allowPlay);}
  if(play){
    play.classList.toggle('hidden',!allowPlay);
    if(allowPlay){const state=playState||getCardPlayState(entity);play.disabled=!state.canPlay;play.textContent=state.canPlay?'Jugar':'No jugable';}
    else play.disabled=true;
  }
  syncCardInspectTemplateUi(modal._hvLevelProgressText);
  modal.classList.remove("hidden");
  if(typeof queueHvDetDirectRefresh==="function")queueHvDetDirectRefresh();
  return modal;
}
function showCardInspectModal(card){
  if(!card)return;
  tryPlaySound("card_select",.45);
  closeHandForBoardFocus();
  cardInspectSelection=card;
  const state=getCardPlayState(card);
  const costLine=getCardCostExplanation(card,card?.owner||myPlayer,publicState?.units||[]);
  const reasonText=state.canPlay?`Lista para jugar. ${costLine}`:`${state.reason} ${costLine}`;
  if(!openUnifiedDetEntity(card,{mode:"hand",ownerLabel:"Carta en mano",live:false,statuses:[],reasonText,allowPlay:true,playState:state}))return selectCard(card);
}
function showPackRevealCardDetail(card){
  if(!card)return;
  const hydrated=hydrateCardVisualData({...card});
  cardInspectSelection=null;
  const modal=openUnifiedDetEntity(hydrated,{mode:"pack",ownerLabel:"Carta revelada en el sobre",live:false,statuses:[],reasonText:"Vista DET de la carta revelada. Cierra este panel para volver al sobre.",allowPlay:false});
  if(modal)modal.classList.add("pack-reveal-detail-modal");
}
function hideCardInspectModal(){const modal=$("cardInspectModal");if(modal)modal.classList.add("hidden")}
function playInspectedCard(){
  const card=cardInspectSelection;
  if(!card)return hideCardInspectModal();
  const state=getCardPlayState(card);
  if(!state.canPlay){setHint(state.reason);return;}
  hideCardInspectModal();
  tryPlaySound("card_play",.70);
  selectCard(card);
}
function selectCard(card){if(isBattleEnded())return setHint("La batalla ya terminó.");if(!isMyTurn())return setHint("No es tu turno.");if(!isHandPlayPhase())return setHint("Solo puedes jugar cartas desde la mano en Main Phase o Last Phase.");if((privateState.honor||0)<effectiveCardCost(card,myPlayer))return setHint(`No tienes ${getResourceLabel(myPlayer)} suficiente.`);selectedCard=card;selectedUnitId=null;selectedUnitActionMode=null;selectedUnitEffectChoice=null;unitContextSelection=null;hideUnitContextMenu();closeHandForBoardFocus();if(card.type==="unit"){highlights=summonZones(myPlayer);highlightType="summon";setHint("Elige una casilla junto a tu líder para invocar.")}else if(card.type==="equipment"){highlights=(publicState.units||[]).filter(u=>canEquipCardToUnit(card,u,myPlayer,publicState.units||[])).map(u=>`${u.x},${u.y}`);highlightType="move";setHint(`Elige una unidad de ${card.equipmentGroup||"la especialización"} para equipar ${card.name}.`)}else if(card.spell==="damage"){highlights=(publicState.units||[]).filter(u=>u.owner!==myPlayer&&canDirectlyTarget(card,u)).map(u=>`${u.x},${u.y}`);highlightType="attack";setHint("Elige un objetivo rival para el hechizo.")}else if(card.spell==="buff"){highlights=(publicState.units||[]).filter(u=>u.owner===myPlayer).map(u=>`${u.x},${u.y}`);highlightType="move";setHint(`Elige una unidad aliada para recibir +${effectiveCardValue(card,"buff")} AT.`)}else if(card.spell==="shield"){highlights=(publicState.units||[]).filter(u=>u.owner===myPlayer).map(u=>`${u.x},${u.y}`);highlightType="move";setHint(`Elige una unidad aliada para recibir +${effectiveCardValue(card,"guard")} GUARDIA durante 2 turnos (tu turno actual y el próximo turno rival).`)}else if(card.trap==="guard"){highlights=(publicState.units||[]).filter(u=>u.owner===myPlayer).map(u=>`${u.x},${u.y}`);highlightType="move";setHint(`Elige una unidad aliada para colocar ${card.name}. La próxima vez que sea atacada obtendrá +${effectiveCardValue(card,"guard")} GUARDIA durante ese combate.`)}else if(card.spell==="heal"){highlights=(publicState.units||[]).filter(u=>canReceiveHealFromCard(card,u,myPlayer)).map(u=>`${u.x},${u.y}`);highlightType="move";setHint(cardCleanseEnabled(card)?`Elige una unidad aliada herida o con estado curable para curar ${effectiveCardValue(card,"heal")} HP y limpiar Sangrado/Veneno normal.`:`Elige una unidad aliada herida para curar ${effectiveCardValue(card,"heal")} HP.`)}else if(card.trap==="beast_cell"){highlights=[];for(let yy=0;yy<ROWS;yy++)for(let xx=0;xx<COLS;xx++){if(!getUnitAt(xx,yy)&&!getCellBeastTrapAt(xx,yy))highlights.push(`${xx},${yy}`);}highlightType="summon";setHint(`Elige una celda libre para colocar ${card.name}.`)}else if(card.trap==="beast_target"){const leader=getLeader(myPlayer)||{x:0,y:0};highlights=(publicState.units||[]).filter(u=>u.owner!==myPlayer&&!u.leader&&dist(leader,u)<=3&&canTargetStealth(card,u)).map(u=>`${u.x},${u.y}`);highlightType="attack";setHint(`Elige una unidad enemiga en rango 3 para ${card.name}.`)}else if(card.trap==="reveal_stealth"){highlights=[];for(let yy=0;yy<ROWS;yy++)for(let xx=0;xx<COLS;xx++)highlights.push(`${xx},${yy}`);highlightType="attack";setHint(`Elige el centro del área para revelar Sigilo.`)}else if(card.trap==="slow"){highlights=(publicState.units||[]).filter(u=>u.owner!==myPlayer&&!u.leader&&canTargetStealth(card,u)).map(u=>`${u.x},${u.y}`);highlightType="attack";setHint(`Elige una invocación rival para reducir MOV en ${effectiveCardValue(card,"slow")}.`)}else if(card.trap==="legendary_mark"){highlights=(publicState.units||[]).filter(u=>u.owner!==myPlayer&&!u.leader&&canTargetStealth(card,u)&&canMarkWithLegendaryTrap(card,u)).map(u=>`${u.x},${u.y}`);highlightType="attack";setHint(`Elige la unidad enemiga que quedará marcada por ${card.name}.`)}render()}
function selectUnit(u){
  if(!u)return;
  return openUnitContextMenu(u,u.x,u.y);
}
function clearCurableStatuses(u){
  if(!u)return u;
  const next={...u};
  delete next.bleedDamage;
  delete next.bleedSourceName;
  delete next.bleedTurnsRemaining;
  delete next.poisonDamage;
  delete next.poisonTurns;
  delete next.noHealWhilePoisoned;
  return next;
}
function hasCurableStatus(u){
  if(!u)return false;
  const poisoned=Number(u.poisonTurns||0)>0&&Number(u.poisonDamage||0)>0&&!u.noHealWhilePoisoned;
  return hasBleeding(u)||poisoned;
}
function canHealOrCleanseUnit(u,owner=null){
  if(!u)return false;
  if(owner!==null&&u.owner!==owner)return false;
  if(u.noHealTurnKey&&u.noHealTurnKey===publicState?.turnKey)return false;
  if(u.noHealWhilePoisoned)return false;
  return (u.hp||0)<effectiveMaxHp(u)||hasCurableStatus(u);
}
function cardCleanseEnabled(card){
  return !(card&&card.spell==="heal"&&card.cleanse===false);
}
function canReceiveHealFromCard(card,u,owner=null){
  if(!u)return false;
  if(owner!==null&&u.owner!==owner)return false;
  if(u.noHealTurnKey&&u.noHealTurnKey===publicState?.turnKey)return false;
  if(u.noHealWhilePoisoned)return false;
  return cardCleanseEnabled(card)?((u.hp||0)<effectiveMaxHp(u)||hasCurableStatus(u)):((u.hp||0)<effectiveMaxHp(u));
}
function consumeWarningRuneOnAttack(units,defender){
  if(!defender)return {units,defender,guardBonus:0,triggered:false,text:""};
  const live=(units||[]).find(u=>u.id===defender.id)||defender;
  const guardBonus=Math.max(0,Number(live.warningRuneGuard||0));
  if(guardBonus<=0)return {units,defender:live,guardBonus:0,triggered:false,text:""};
  const cardName=live.warningRuneCardName||"Runa de advertencia";
  const nextUnits=(units||[]).map(u=>u.id===live.id?(()=>{const n={...u};delete n.warningRuneGuard;delete n.warningRuneCardName;return n;})():u);
  const nextDefender=nextUnits.find(u=>u.id===live.id)||live;
  return {
    units:nextUnits,
    defender:nextDefender,
    guardBonus,
    triggered:true,
    text:` ${cardName}: ${live.name} activa la runa y obtiene +${guardBonus} GUARDIA durante este combate.`
  };
}
const STATUS_ICON_ASSET_PATHS={
  buff:"assets/ui/status_icons/status_buff.webp",
  debuff:"assets/ui/status_icons/status_debuff.webp",
  bleed:"assets/ui/status_icons/status_bleed.webp",
  poison:"assets/ui/status_icons/status_poison.webp",
  burn:"assets/ui/status_icons/status_burn.webp",
  paralysis:"assets/ui/status_icons/status_paralysis.webp",
  silence:"assets/ui/status_icons/status_silence.webp",
  curse:"assets/ui/status_icons/status_curse.webp",
  lock:"assets/ui/status_icons/status_lock.webp",
  defense:"assets/ui/status_icons/status_defense.webp",
  guard:"assets/ui/status_icons/status_guard.webp",
  hp:"assets/ui/status_icons/status_hp.webp",
  control:"assets/ui/status_icons/status_control.webp",
  generic:"assets/ui/status_icons/status_generic.webp"
};
function getStatusAssetKey(entry={}){
  const icon=String(entry?.icon||"").toLowerCase();
  const kind=String(entry?.kind||"").toLowerCase();
  const name=String(`${entry?.name||""} ${entry?.label||""}`).toLowerCase();
  if(icon&&STATUS_ICON_ASSET_PATHS[icon])return icon;
  if(kind.includes("bleed")||name.includes("sangrado"))return "bleed";
  if(kind.includes("poison")||name.includes("veneno"))return "poison";
  if(kind.includes("burn")||name.includes("quem")||name.includes("fuego"))return "burn";
  if(kind.includes("silence")||name.includes("silencio"))return "silence";
  if(kind.includes("curse")||name.includes("mald")||name.includes("cura")||name.includes("reducción")||name.includes("duplicado"))return "curse";
  if(kind.includes("lock")||name.includes("bloque")||name.includes("aturdido")||name.includes("no mover")||name.includes("no atacar"))return "lock";
  if(kind.includes("guard")||name.includes("guardia")||name.includes("defens"))return "defense";
  if(kind.includes("hp")||name.includes("vida"))return "hp";
  if(kind.includes("control")||name.includes("control"))return "control";
  if(kind.includes("debuff")||name.includes("reduc")||name.includes("pierde")||name.includes("evasión reducida"))return "debuff";
  if(kind.includes("buff")||name.includes("aument")||name.includes("gana"))return "buff";
  return "generic";
}
function getStatusEntryIconHtml(entry){
  const key=getStatusAssetKey(entry);
  const src=STATUS_ICON_ASSET_PATHS[key]||STATUS_ICON_ASSET_PATHS.generic;
  const label=escapeHtml(entry?.name||entry?.label||"Estado");
  return `<span class="status-icon status-icon-asset status-icon-${escapeHtml(key)}" role="img" aria-label="${label}"><span class="status-icon-bg" aria-hidden="true"></span><img class="status-icon-img" src="${escapeHtml(src)}" alt="" loading="lazy" decoding="async"></span>`;
}
async function playCardOn(x,y,target){if(isBattleEnded())return setHint("La batalla ya terminó.");if(!isHandPlayPhase())return setHint("Solo puedes colocar o resolver cartas de mano en Main Phase o Last Phase.");const card=selectedCard;if(!card)return;if((privateState.honor||0)<effectiveCardCost(card,myPlayer))return setHint(`No tienes ${getResourceLabel(myPlayer)} suficiente.`);let units=[...(publicState.units||[])];if(card.type==="unit"){if(!summonZones(myPlayer).includes(`${x},${y}`))return setHint("Casilla inválida para invocación.");const summonCostInfo=getCardCostBreakdown(card,myPlayer,units);const paidCostText=getPaidSummonCostText(card,myPlayer,units);let newUnit=makeUnit({...card,summonOrigin:"hand",fieldGeneratedSummon:false},x,y);if(ownerHasUnit(myPlayer===1?2:1,"yi_sun_sin",units)){newUnit={...newUnit,tempDexDebuff:(newUnit.tempDexDebuff||0)+4,tempGuardBuff:(newUnit.tempGuardBuff||0)-4,yiSunDebuffed:true};}units.push(newUnit);const lionFearSummon=applyAfricanLionFearAura(units);units=lionFearSummon.units;await updatePublic({units,statusFxEvent:lionFearSummon.statusFxEvent||null,floatFxEvent:lionFearSummon.floatFxEvent||null});await removeCardAndPay(card,summonCostInfo.effective);await pushLog([`J${myPlayer} invoca ${card.name} y ${paidCostText}. Puede moverse, defender o atacar este mismo turno.${newUnit.yiSunDebuffed?" Bloqueo Naval: entra con -4 DX y -4 Guardia hasta su próximo turno.":""}`,...lionFearSummon.logs].join(" "));setHint(`${card.name} fue invocada por ${summonCostInfo.effective} ${getResourceLabel(myPlayer)}.${summonCostInfo.sabotageStacks>0?` Sabotaje añadió +${summonCostInfo.sabotageStacks}.`:""} Puede actuar este mismo turno.`);if(newUnit.key==="hattori_hanzo")setHint("Hattori Hanzō ingresa con Sigilo. Contrato del Shogun se activará automáticamente contra la primera unidad enemiga que ataque desde Sigilo.");}else if(card.type==="equipment"){if(!target||!canEquipCardToUnit(card,target,myPlayer,units))return setHint(`Elige una unidad compatible con ${getEquipmentLeaderLabel(card)}.`);units=units.map(u=>u.id===target.id?equipCardOnUnit(card,u):u);await updatePublic({units,floatFxEvent:makeFloatFxEvent("buff",units.find(u=>u.id===target.id)||target,0,{iconText:card.icon||"✦",labelText:"EQUIPO"})});await removeCardAndPay(card);await pushLog(`J${myPlayer} equipa ${card.name} a ${target.name}.`);setHint(`${target.name} ahora lleva ${card.name}.`);}else if(card.spell==="damage"){if(!target||target.owner===myPlayer||!canDirectlyTarget(card,target))return setHint("Elige un objetivo rival visible. Las unidades con Sigilo no pueden ser objetivo directo.");tryPlaySound(card.key==="fireball"?"attack_fire_magic":"spell_damage",card.key==="fireball"?.86:.72);const spellDamage=reduceDamageForHoneyBadger(target,effectiveCardValue(card,"damage"));const appliesBurn=card.key==="fireball"&&!target.leader;const appliesSandSlow=card.key==="bolt"&&!target.leader;const sandSlowAmount=Math.max(0,Number(card.slowPermanent||0));const spellFxCaster=getLeader(myPlayer)||units.find(u=>u.owner===myPlayer&&u.leader);const spellMagicKind=card.key==="fireball"?"fire":(card.key==="bolt"||String(card.key||"").includes("sand_curse")?"sand":"arcane");const spellBattleFxEvent=spellFxCaster?makeMagicFxEvent(spellFxCaster,target,spellMagicKind,{type:"spell",spellKey:card.key,effectAction:"damage",skipLaunchSound:true,impactScale:card.key==="fireball"?1.12:1,hit:true}):null;const beforeSpellDamage=[...units];let actualSpellDamage=spellDamage;units=units.map(u=>{if(u.id!==target.id)return u;const protectedDamage=applyDirectHpDamageWithEquipment(u,spellDamage);actualSpellDamage=protectedDamage.damage;return protectedDamage.unit;});units=applyLegendaryFatalSaves(units,[target.id]);const fatalSaveTriggered=!!units.find(u=>u.id===target.id&&u.hp>0)&&Number(target.hp||0)-actualSpellDamage<=0;units=units.map(u=>{if(u.id!==target.id||u.hp<=0)return u;let next=u;if(appliesBurn)next=applyBurnToUnit(next,card.name,card.burnTurns||2,card.burnDamage||1);if(appliesSandSlow)next={...next,mov:Math.max(0,Number(next.mov||0)-sandSlowAmount)};return next;}).filter(u=>u.hp>0);const bloodVictoryResult=applyBloodVictoryForDeaths(beforeSpellDamage,units);units=bloodVictoryResult.units;const actionLog=`J${myPlayer} usa ${card.name}: ${target.name} recibe ${actualSpellDamage} daño${target.key==="honey_badger"?" tras Armadura Natural":""}${fatalSaveTriggered?". Último Aliento evita la derrota":""}${appliesBurn&&units.some(u=>u.id===target.id)?" y queda con Quemadura: +1 daño directo al final de cada turno durante 2 turnos":""}${appliesSandSlow&&units.some(u=>u.id===target.id)?` y pierde -${sandSlowAmount} MOV permanente`:""}.${bloodVictoryResult.logs.length?` ${bloodVictoryResult.logs.join(" ")}`:""}`;await updatePublic({units,_clockKillCreditOwner:myPlayer,battleFxEvent:spellBattleFxEvent,floatFxEvent:makeFloatFxEvent("damage", units.find(u=>u.id===target.id)||target,actualSpellDamage),statusFxEvent:appliesBurn?makeStatusFxEvent("burn_apply", units.find(u=>u.id===target.id)||target,1):(card.key==="fireball"&&target.leader?makeStatusFxEvent("fire_impact", units.find(u=>u.id===target.id)||target,0):(appliesSandSlow?makeStatusFxEvent("debuff", units.find(u=>u.id===target.id)||target, sandSlowAmount):null))});await removeCardAndPay(card);if(!(await finalizeBattle(units,actionLog)))await pushLog(actionLog)}else if(card.spell==="buff"){if(!target||target.owner!==myPlayer)return setHint("Elige una unidad aliada.");tryPlaySound("spell_cast",.66);const bhTrap=resolveBuffHealLegendaryTraps(target,"buff",units);units=bhTrap.cancel?bhTrap.units:units.map(u=>u.id===target.id?{...u,buffAtk:(u.buffAtk||0)+effectiveCardValue(card,"buff")}:u);await updatePublic({units,legendaryTraps:bhTrap.traps,floatFxEvent:bhTrap.floatFxEvent||(bhTrap.cancel?null:makeFloatFxEvent("buff", units.find(u=>u.id===target.id)||target,effectiveCardValue(card,"buff"),{iconText:"▲"})),statusFxEvent:bhTrap.statusFxEvent||null});await removeCardAndPay(card);await pushLog(bhTrap.cancel?bhTrap.logs.join(" "):`J${myPlayer} usa ${card.name}: ${target.name} gana +${effectiveCardValue(card,"buff")} AT este turno.`)}else if(card.spell==="shield"){if(!target||target.owner!==myPlayer)return setHint("Elige una unidad aliada.");tryPlaySound("spell_cast",.66);const bhTrap=resolveBuffHealLegendaryTraps(target,"Guardia/buff",units);units=bhTrap.cancel?bhTrap.units:units.map(u=>u.id===target.id?{...u,tempGuardBuff:(u.tempGuardBuff||0)+effectiveCardValue(card,"guard")}:u);await updatePublic({units,legendaryTraps:bhTrap.traps,floatFxEvent:bhTrap.floatFxEvent||(bhTrap.cancel?null:makeFloatFxEvent("guard_buff", units.find(u=>u.id===target.id)||target,effectiveCardValue(card,"guard"),{iconText:"🛡"})),statusFxEvent:bhTrap.statusFxEvent||null});await removeCardAndPay(card);await pushLog(bhTrap.cancel?bhTrap.logs.join(" "):`J${myPlayer} usa ${card.name}: ${target.name} gana +${effectiveCardValue(card,"guard")} GUARDIA durante 2 turnos (tu turno actual y el próximo turno rival).`)}else if(card.trap==="guard"){if(!target||target.owner!==myPlayer)return setHint("Elige una unidad aliada.");tryPlaySound("trap_trigger",.66);const bhTrap=resolveBuffHealLegendaryTraps(target,"Guardia/buff",units);units=bhTrap.cancel?bhTrap.units:units.map(u=>u.id===target.id?{...u,warningRuneGuard:effectiveCardValue(card,"guard"),warningRuneCardName:card.name}:u);await updatePublic({units,legendaryTraps:bhTrap.traps,floatFxEvent:bhTrap.floatFxEvent||(bhTrap.cancel?null:makeFloatFxEvent("guard_buff", units.find(u=>u.id===target.id)||target,effectiveCardValue(card,"guard"),{iconText:"◆",labelText:"RUNA"})),statusFxEvent:bhTrap.statusFxEvent||null});await removeCardAndPay(card);await pushLog(bhTrap.cancel?bhTrap.logs.join(" "):`J${myPlayer} coloca ${card.name} sobre ${target.name}. La próxima vez que sea atacada obtendrá +${effectiveCardValue(card,"guard")} GUARDIA durante ese combate.`)}else if(card.spell==="heal"){if(!target||target.owner!==myPlayer)return setHint(cardCleanseEnabled(card)?"Elige una unidad aliada herida o con estado curable.":"Elige una unidad aliada herida.");if(!canReceiveHealFromCard(card,target,myPlayer))return setHint(cardCleanseEnabled(card)?"Esa unidad no está herida ni tiene estados curables.":"Esa unidad no está herida.");tryPlaySound("spell_cast",.66);if(target.noHealTurnKey===publicState.turnKey||target.noHealWhilePoisoned)return setHint(`${target.name} no puede curarse ahora.`);const healAmount=effectiveCardValue(card,"heal");const canCleanse=cardCleanseEnabled(card);const hadCurableStatus=canCleanse&&hasCurableStatus(target);const actualHeal=Math.max(0,Math.min(effectiveMaxHp(target),(target.hp||0)+healAmount)-(target.hp||0));const bhTrap=resolveBuffHealLegendaryTraps(target,"curación",units);const healFxCaster=getLeader(myPlayer)||units.find(u=>u.owner===myPlayer&&u.leader);const healBattleFxEvent=!bhTrap.cancel&&healFxCaster?makeMagicFxEvent(healFxCaster,target,"heal",{type:"heal",spellKey:card.key,effectAction:canCleanse?"cleanse":"heal",skipLaunchSound:true,hit:true}):null;units=bhTrap.cancel?bhTrap.units:units.map(u=>u.id===target.id?(canCleanse?clearCurableStatuses({...u,hp:Math.min(effectiveMaxHp(u),(u.hp||0)+healAmount)}):{...u,hp:Math.min(effectiveMaxHp(u),(u.hp||0)+healAmount)}):u);await updatePublic({units,legendaryTraps:bhTrap.traps,battleFxEvent:healBattleFxEvent,floatFxEvent:bhTrap.floatFxEvent||(bhTrap.cancel?null:makeFloatFxEvent("heal", units.find(u=>u.id===target.id)||target,actualHeal,{iconText:"✚",labelText:hadCurableStatus&&actualHeal<=0?"LIMPIA":""})),statusFxEvent:bhTrap.statusFxEvent||null});await removeCardAndPay(card);await pushLog(bhTrap.cancel?bhTrap.logs.join(" "):`J${myPlayer} usa ${card.name}: ${target.name} ${actualHeal>0?`cura ${actualHeal} HP`:"no recupera HP"}${hadCurableStatus?" y limpia Sangrado/Veneno normal":""}.`)}else if(card.trap==="beast_cell"){if(target)return setHint("Elige una celda libre para la trampa.");if(getCellBeastTrapAt(x,y))return setHint("Ya hay una trampa de cacería en esa celda.");tryPlaySound("trap_trigger",.68);await updatePublic({beastTraps:[...getBeastTraps(),makeBeastTrap(card,myPlayer,x,y)]});await removeCardAndPay(card);await pushLog(`J${myPlayer} coloca ${card.name} en una celda de cacería.`)}else if(card.trap==="beast_target"){if(!target||target.owner===myPlayer||target.leader||!canTargetStealth(card,target))return setHint("Elige una invocación rival válida.");const leader=getLeader(myPlayer)||{x:0,y:0};if(dist(leader,target)>3)return setHint("Objetivo fuera de rango 3 del líder.");tryPlaySound("trap_trigger",.70);units=units.map(u=>u.id===target.id?{...u,tempAgiDebuff:(u.tempAgiDebuff||0)+2}:u);await updatePublic({units,floatFxEvent:makeFloatFxEvent("debuff", units.find(u=>u.id===target.id)||target,2,{iconText:"▼"})});await removeCardAndPay(card);await pushLog(`J${myPlayer} usa ${card.name}: ${target.name} pierde -2 AGI hasta el final del turno.`)}else if(card.trap==="reveal_stealth"){tryPlaySound("trap_trigger",.70);const rev=revealStealthInRadius(units,myPlayer,{x,y},card.radius||2,card.name);await updatePublic({units:rev.units});await removeCardAndPay(card);await pushLog(`J${myPlayer} usa ${card.name}: revela ${rev.count} unidad${rev.count===1?"":"es"} con Sigilo en el área.`)}else if(card.trap==="slow"){if(!target||target.owner===myPlayer||target.leader||!canTargetStealth(card,target))return setHint("Elige una invocación rival.");tryPlaySound("trap_trigger",.70);const slowAmount=effectiveCardValue(card,"slow");const agiSlow=Number(card.agiSlow||0);units=units.map(u=>{
        if(u.id!==target.id)return u;
        const current=Number(u.tempMovDebuff||0);
        const next={...u,tempMovDebuff:Math.max(current,slowAmount),tempMovDebuffSource:slowAmount>=current?card.name:(u.tempMovDebuffSource||card.name)};
        if(agiSlow>0){next.tempAgiDebuff=(Number(next.tempAgiDebuff||0)+agiSlow);next.tempAgiDebuffSource=card.name;}
        return next;
      });await updatePublic({units,floatFxEvent:makeFloatFxEvent("debuff", units.find(u=>u.id===target.id)||target,slowAmount,{iconText:"▼"})});await removeCardAndPay(card);await pushLog(`J${myPlayer} activa ${card.name}: ${target.name} pierde ${slowAmount} MOV${agiSlow>0?` y ${agiSlow} AGI`:""} hasta su próximo turno. DET mostrará el origen del debuff.`)}else if(card.trap==="legendary_mark"){if(!canMarkWithLegendaryTrap(card,target))return setHint("Ese objetivo no cumple las condiciones de esta Trampa Legendaria.");tryPlaySound("trap_trigger",.74);const trap=makeTrapMark(card,target,myPlayer);await updatePublic({legendaryTraps:[...getActiveLegendaryTraps(),trap]});await removeCardAndPay(card);await pushLog(`J${myPlayer} coloca ${card.name} sobre ${target.name} (${getUnitTrapTierLabel(target)}). La trampa esperará su condición.`);setHint(`${target.name} quedó marcado por ${card.name}.`)}clearSelection()}
