"use strict";
/* HallValla STAGE8PRIV1 · Interacción de tablero y efectos de unidad */

const STEALTH_BOARD_MASK_SRC="assets/effects/status/stealth/stealth_smoke.webp";
function isStealthHiddenFromViewer(u){
  return !!u&&typeof isStealthedUnit==="function"&&isStealthedUnit(u)&&u.owner!==myPlayer;
}
function getStealthBoardCoverHtml(){
  return `<span class="stealth-board-cover" aria-label="Presencia Oculta · Sigilo"><img src="${STEALTH_BOARD_MASK_SRC}" alt="" aria-hidden="true" draggable="false"></span>`;
}
function getStealthContextPortraitHtml(){
  return `<span class="stealth-context-cover" aria-label="Presencia Oculta · Sigilo"><img src="${STEALTH_BOARD_MASK_SRC}" alt="" aria-hidden="true" draggable="false"></span>`;
}

let boardDragListenerDisposers=[];
function unbindBoardDragWindowListeners(){
  const disposers=boardDragListenerDisposers.splice(0);
  disposers.forEach(dispose=>{try{dispose();}catch(_){ }});
}
function bindBoardDragWindowListeners(){
  unbindBoardDragWindowListeners();
  if(typeof isBattleLifecycleActive==="function"&&isBattleLifecycleActive()){
    boardDragListenerDisposers.push(
      battleOwnEventListener(window,"pointermove",handleBoardDragMove,true,"board-drag-move"),
      battleOwnEventListener(window,"pointerup",handleBoardDragEnd,true,"board-drag-end"),
      battleOwnEventListener(window,"pointercancel",handleBoardDragCancel,true,"board-drag-cancel")
    );
    return;
  }
  window.addEventListener("pointermove",handleBoardDragMove,true);
  window.addEventListener("pointerup",handleBoardDragEnd,true);
  window.addEventListener("pointercancel",handleBoardDragCancel,true);
  boardDragListenerDisposers.push(
    ()=>window.removeEventListener("pointermove",handleBoardDragMove,true),
    ()=>window.removeEventListener("pointerup",handleBoardDragEnd,true),
    ()=>window.removeEventListener("pointercancel",handleBoardDragCancel,true)
  );
}
function clearBattleBoardInteractionState(){
  unbindBoardDragWindowListeners();
  boardDragState=null;
  if(boardDragGhost){try{boardDragGhost.remove();}catch(_){ }boardDragGhost=null;}
  dragSummonHighlights=[];
  document.body?.classList?.remove("hv-dragging-board");
  boardHoverCellKey="";
  boardSelectedCellKey="";
  if(boardSelectedCellTimer){battleClearTimeout(boardSelectedCellTimer);boardSelectedCellTimer=null;}
  cancelBoardLongPressDetail();
}


let boardLongPressDetailState=null;
let boardLongPressDetailTimer=null;
let lastBoardLongPressDetailAt=0;
const BOARD_LONG_PRESS_DETAIL_MS=560;
function cancelBoardLongPressDetail(){
  boardLongPressDetailState=null;
  if(boardLongPressDetailTimer){battleClearTimeout(boardLongPressDetailTimer);boardLongPressDetailTimer=null;}
}
function beginBoardLongPressDetail(ev,u){
  if(!ev||!u||ev.pointerType==="mouse")return;
  cancelBoardLongPressDetail();
  boardLongPressDetailState={pointerId:ev.pointerId,startX:ev.clientX,startY:ev.clientY,unitId:u.id};
  boardLongPressDetailTimer=battleSetTimeout(()=>{
    const state=boardLongPressDetailState;
    boardLongPressDetailTimer=null;
    boardLongPressDetailState=null;
    if(!state)return;
    const live=getUnit(state.unitId);
    if(!live)return;
    lastBoardLongPressDetailAt=Date.now();
    if(navigator.vibrate)try{navigator.vibrate(18);}catch(_){ }
    showUnit(live);
  },BOARD_LONG_PRESS_DETAIL_MS,"board-long-press-detail");
}
function trackBoardLongPressDetailMove(ev){
  const state=boardLongPressDetailState;
  if(!state||!ev||ev.pointerId!==state.pointerId)return;
  if(Math.max(Math.abs(ev.clientX-state.startX),Math.abs(ev.clientY-state.startY))>10)cancelBoardLongPressDetail();
}
function consumeRecentBoardLongPressDetail(ev){
  if(Date.now()-lastBoardLongPressDetailAt>700)return false;
  if(ev){ev.preventDefault();ev.stopPropagation();}
  return true;
}

function getBoardCellFromPoint(clientX,clientY){
  const el=document.elementFromPoint(clientX,clientY);
  const cell=el&&el.closest?el.closest(".cell"):null;
  const grid=$("grid");
  if(!cell||!grid||!grid.contains(cell))return null;
  const x=Number(cell.dataset.x),y=Number(cell.dataset.y);
  if(!Number.isFinite(x)||!Number.isFinite(y))return null;
  return {x,y,unit:getUnitAt(x,y)};
}
function clearBoardDragVisuals({rerender=true}={}){
  dragSummonHighlights=[];
  if(boardDragGhost){boardDragGhost.remove();boardDragGhost=null;}
  document.body.classList.remove("hv-dragging-board");
  if(rerender&&publicState)render();
}
function makeBoardDragGhost(sourceEl,label=""){
  const ghost=sourceEl&&sourceEl.cloneNode?sourceEl.cloneNode(true):document.createElement("div");
  ghost.classList.add("hv-board-drag-ghost");
  ghost.style.left="-999px";
  ghost.style.top="-999px";
  ghost.setAttribute("aria-hidden","true");
  if(label)ghost.title=label;
  document.body.appendChild(ghost);
  return ghost;
}
function moveBoardDragGhost(ev){
  if(!boardDragGhost)return;
  boardDragGhost.style.left=`${ev.clientX}px`;
  boardDragGhost.style.top=`${ev.clientY}px`;
}
function startHandCardBoardDrag(ev,card,sourceEl){
  if(!card||card.type!=="unit")return false;
  const playState=getCardPlayState(card);
  if(!playState.canPlay)return false;
  boardDragState={kind:"hand-unit",cardId:card.id,pointerId:ev.pointerId,startX:ev.clientX,startY:ev.clientY,dragging:false,sourceEl};
  bindBoardDragWindowListeners();
  return true;
}
function beginBoardDragVisual(ev){
  if(!boardDragState||boardDragState.dragging)return;
  const dx=Math.abs(ev.clientX-boardDragState.startX),dy=Math.abs(ev.clientY-boardDragState.startY);
  if(Math.max(dx,dy)<8)return;
  const card=(privateState?.hand||[]).find(c=>c.id===boardDragState.cardId);
  if(!card){handleBoardDragCancel();return;}
  cancelBoardLongPressDetail();
  boardDragState.dragging=true;
  document.body.classList.add("hv-dragging-board");
  selectedCard=card;
  selectedUnitId=null;
  unitContextSelection=null;
  hideUnitContextMenu();
  closeHandForBoardFocus();
  dragSummonHighlights=summonZones(myPlayer);
  highlights=[...dragSummonHighlights];
  highlightType="summon";
  setHint(`${card.name}: suéltala en cualquier casilla amarilla libre de tu mitad del campo.`);
  boardDragGhost=makeBoardDragGhost(boardDragState.sourceEl,card.name);
  render();
  moveBoardDragGhost(ev);
}
function handleBoardDragMove(ev){
  if(!boardDragState||ev.pointerId!==boardDragState.pointerId)return;
  beginBoardDragVisual(ev);
  if(boardDragState?.dragging){ev.preventDefault();moveBoardDragGhost(ev);}
}
async function handleBoardDragEnd(ev){
  if(!boardDragState||ev.pointerId!==boardDragState.pointerId)return;
  unbindBoardDragWindowListeners();
  const state=boardDragState;
  boardDragState=null;
  if(!state.dragging)return;
  ev.preventDefault();
  lastBoardDragEndedAt=Date.now();
  const drop=getBoardCellFromPoint(ev.clientX,ev.clientY);
  if(!drop){clearBoardDragVisuals();if(typeof hallvallaRtReleaseHandFocus==="function")hallvallaRtReleaseHandFocus();setHint("Arrastre cancelado.");return;}
  try{
    const card=(privateState?.hand||[]).find(c=>c.id===state.cardId);
    const moveKey=`${drop.x},${drop.y}`;
    clearBoardDragVisuals({rerender:false});
    if(!card){clearSelection();return;}
    selectedCard=card;
    if(!drop.unit&&summonZones(myPlayer).includes(moveKey)){
      await playCardOn(drop.x,drop.y,null);
      return;
    }
    clearSelection();
    setHint("Casilla inválida para invocación: usa una casilla libre de tu mitad del campo.");
  }catch(err){
    console.warn("[HallValla] Error en arrastre de invocación:",err);
    clearSelection();
    setHint("No se pudo completar la invocación.");
  }
}
function handleBoardDragCancel(){
  unbindBoardDragWindowListeners();
  boardDragState=null;
  clearBoardDragVisuals();
  if(typeof hallvallaRtReleaseHandFocus==="function")hallvallaRtReleaseHandFocus();
  setHint("Arrastre cancelado.");
}

function getBoardCellKey(x,y){return `${x},${y}`;}
function updateBoardAimClasses(){
  const grid=$("grid");
  if(!grid)return;
  grid.querySelectorAll(".cell.board-hover,.cell.board-selected").forEach(cell=>{
    const key=getBoardCellKey(cell.dataset.x,cell.dataset.y);
    cell.classList.toggle("board-hover",key===boardHoverCellKey);
    cell.classList.toggle("board-selected",key===boardSelectedCellKey);
  });
  if(boardHoverCellKey){
    const hover=grid.querySelector(`.cell[data-x="${boardHoverCellKey.split(",")[0]}"][data-y="${boardHoverCellKey.split(",")[1]}"]`);
    if(hover)hover.classList.add("board-hover");
  }
  if(boardSelectedCellKey){
    const selected=grid.querySelector(`.cell[data-x="${boardSelectedCellKey.split(",")[0]}"][data-y="${boardSelectedCellKey.split(",")[1]}"]`);
    if(selected)selected.classList.add("board-selected");
  }
}
function setBoardHoverCell(x,y){
  const key=Number.isFinite(x)&&Number.isFinite(y)?getBoardCellKey(x,y):"";
  if(boardHoverCellKey===key)return;
  boardHoverCellKey=key;
  updateBoardAimClasses();
}
function flashBoardSelectedCell(x,y){
  if(!Number.isFinite(x)||!Number.isFinite(y))return;
  boardSelectedCellKey=getBoardCellKey(x,y);
  if(boardSelectedCellTimer)battleClearTimeout(boardSelectedCellTimer);
  boardSelectedCellTimer=battleSetTimeout(()=>{
    if(boardSelectedCellKey===getBoardCellKey(x,y)){
      boardSelectedCellKey="";
      updateBoardAimClasses();
    }
  },1200,"board-selected-cell");
  updateBoardAimClasses();
}

async function cellClick(x,y){
  const u=getUnitAt(x,y);
  if(selectedCard)return playCardOn(x,y,u);
  if(u)return openUnitContextMenu(u,x,y);
  selectedUnitId=null;
  unitContextSelection=null;
  hideUnitContextMenu();
}


function getUnitPortraitHtml(u,depthLayer=false){
  if(isStealthHiddenFromViewer(u))return getStealthContextPortraitHtml();
  const alt=escapeHtml(u?.name||"Unidad");
  if(u?.leader){
    const portrait=String(u?.portrait||"")||((u?.leaderType&&LEADER_DATA[u.leaderType])?LEADER_DATA[u.leaderType].portrait:"");
    if(!portrait)return `<span>${u?.icon||"✦"}</span>`;
    const fallbackAttr=buildAssetFallbackAttr([getAssetWarningImageSrc()],`${u?.name||"Unidad"} · líder`);
    return depthLayer?`<div class="unit-depth-stack"><img class="unit-depth-front board-cropped-art" src="${portrait}" alt="${alt}" ${fallbackAttr}></div>`:`<img src="${portrait}" alt="${alt}" ${fallbackAttr}>`;
  }

  const cardCandidates=getResolvedCardPortraitCandidates(u);
  if(!cardCandidates.length)return `<span>${u?.icon||"✦"}</span>`;

  if(depthLayer){
    const candidates=hvUniqueAssetValues([
      ...getResolvedFieldFigureCandidates(u),
      getAssetWarningImageSrc()
    ]);
    const start=candidates.shift()||getAssetWarningImageSrc();
    const fallbackAttr=buildAssetFallbackAttr(candidates,`${u?.name||"Unidad"} · figura 3D`);
    return `<div class="unit-depth-stack"><img class="unit-depth-front board-cropped-art" src="${start}" alt="${alt}" ${fallbackAttr}></div>`;
  }

  const start=cardCandidates[0];
  const fallbackAttr=buildAssetFallbackAttr([...cardCandidates.slice(1),getAssetWarningImageSrc()],`${u?.name||"Unidad"} · carta`);
  return `<img src="${start}" alt="${alt}" ${fallbackAttr}>`;
}

function getBoardUnitPortraitHtml(u){
  if(isStealthHiddenFromViewer(u))return getStealthContextPortraitHtml();
  if(u?.leader){
    const portrait=String(u?.portrait||"")||((u?.leaderType&&LEADER_DATA[u.leaderType])?LEADER_DATA[u.leaderType].portrait:"");
    if(!portrait)return `<span>${u?.icon||"✦"}</span>`;
    const alt=escapeHtml(u.name||"Unidad");
    const fallbackAttr=buildAssetFallbackAttr([getAssetWarningImageSrc()],`${u?.name||"Unidad"} · líder`);
    return `<img src="${portrait}" alt="${alt}" ${fallbackAttr}>`;
  }
  // PERF6A: las invocaciones del tablero se dibujan exclusivamente con field_figures.
  // El marco, HUD e iconos viven fuera de unit-portrait y permanecen intactos.
  return "";
}

function showUnit(u){
  if(!u)return;
  if(isStealthHiddenFromViewer(u)){
    hideCardInspectModal();
    setHint("Presencia Oculta · Sigilo: solo el dueño de esta unidad puede consultar su DET mientras permanezca oculta.");
    return;
  }
  cardInspectSelection=null;
  const fx=getUnitEffectText(u);
  const activeEntries=getUnitStatusEntries(u);
  const ownerLabel=u.owner===myPlayer?"Tu unidad · en campo":"Unidad rival · en campo";
  const modal=openUnifiedDetEntity(u,{
    mode:"field",
    ownerLabel,
    live:true,
    statuses:activeEntries,
    visualHtml:getUnitPortraitHtml(u),
    reasonText:getUnifiedDetProgressText(u),
    allowPlay:false
  });
  if(modal){
    modal.classList.add("field-unit-detail-modal");
    modal._hvEffectText=fx;
    modal._hvEffectTitle=`✦ Efecto de ${u.name}`;
  }
}

function hideUnitContextMenu(){
  const menu=$("unitContextMenu");
  if(menu)menu.classList.add("hidden");
}
function openUnitContextMenu(u,x,y){
  if(!u)return;
  if(isStealthHiddenFromViewer(u)){
    unitContextSelection=null;
    selectedUnitId=null;
    
    
    highlights=[];
    hideUnitContextMenu();
    hideCardInspectModal();
    setHint("Presencia Oculta · Sigilo: la identidad, estadísticas y DET de esta unidad están ocultos para el rival.");
    return;
  }
  unitContextSelection={unitId:u.id,x,y};
  selectedCard=null;
  selectedUnitId=u.id;
  highlights=[];
  highlightType="move";
  hideCardInspectModal();
  render();
  setHint(`${u.name}: DET disponible.`);
}
const hallvallaUnitContextDelegatedMenus=new WeakSet();
function ensureUnitContextMenuDelegation(menu){
  if(!menu||hallvallaUnitContextDelegatedMenus.has(menu))return;
  hallvallaUnitContextDelegatedMenus.add(menu);
  menu.addEventListener("click",ev=>{
    const btn=ev.target&&ev.target.closest?ev.target.closest(".unit-context-btn[data-action]"):null;
    if(!btn||!menu.contains(btn))return;
    ev.stopPropagation();
    handleUnitContextAction(btn.dataset.action);
  });
}
function renderUnitContextMenu(){
  const menu=$("unitContextMenu");
  if(!menu)return;
  ensureUnitContextMenuDelegation(menu);
  if(!unitContextSelection||!publicState){menu.classList.add("hidden");return;}
  const u=getUnit(unitContextSelection.unitId);
  if(!u){menu.classList.add("hidden");return;}
  if(isStealthHiddenFromViewer(u)){
    unitContextSelection=null;
    menu.classList.add("hidden");
    return;
  }
  const markup=`<div class="unit-context-star-shell unit-context-actions-only unit-context-actions-count-1 unit-context-no-effect"><button class="unit-context-btn unit-context-action-det" data-action="det" aria-label="DET" title="Detalles"><img class="unit-context-action-art" src="assets/ui/context_menu/det.webp" alt="" aria-hidden="true"><span class="unit-context-action-text">DET</span></button></div>`;
  if(menu.__hvContextMarkup!==markup){menu.innerHTML=markup;menu.__hvContextMarkup=markup;}
  const clock=$("turnTimerHud");
  if(clock){
    const r=clock.getBoundingClientRect();
    let left=r.left+r.width/2;
    let top=r.bottom+12;
    menu.style.left=`${left}px`;
    menu.style.top=`${top}px`;
    battleRequestAnimationFrame(()=>{
      const rect=menu.getBoundingClientRect();
      const margin=10;
      const vw=window.innerWidth||document.documentElement.clientWidth||0;
      const vh=window.innerHeight||document.documentElement.clientHeight||0;
      const clampedLeft=Math.min(Math.max(left,rect.width/2+margin),Math.max(rect.width/2+margin,vw-rect.width/2-margin));
      const maxTop=Math.max(margin,vh-rect.height-margin);
      const clampedTop=Math.min(Math.max(top,margin),maxTop);
      menu.style.left=`${clampedLeft}px`;
      menu.style.top=`${clampedTop}px`;
    },"unit-context-clock-anchor");
  }
  menu.classList.remove("hidden");
}


function getAcolyteEffectRange(caster){return Math.max(1,Number(caster?.effectRange||3)+Number(getEquipmentRangeBonus(caster)||0));}
function getAcolytePurifiableStatuses(unit){
  if(!unit)return[];
  const out=[];
  const add=(key,label,active)=>{if(active)out.push({key,label});};
  add("bleed","Sangrado",hasBleeding(unit));
  add("poison","Veneno",Number(unit.poisonTurns||0)>0||Number(unit.poisonDamage||0)>0||!!unit.noHealWhilePoisoned);
  add("burn","Quemadura",Number(unit.burnTurns||0)>0||Number(unit.burnDamage||0)>0);
  add("veil_curse","Cuenta regresiva mortal",hasVeilCurse(unit));
  add("fear","Miedo",!!unit.fearWindowKey||!!unit.fearSourceName);
  add("atk","Reducción de Ataque",Number(unit.tempAtkDebuff||0)>0||Number(unit.hannibalAtkDebuff||0)>0);
  add("guard","Reducción de Guardia",Number(unit.tempGuardBuff||0)<0||Number(unit.tempGuardDebuff||0)>0);
  add("dex","Reducción de Destreza",Number(unit.tempDexDebuff||0)>0||!!unit.saboteadorDexZeroWindowKey);
  add("agi","Reducción de Agilidad",Number(unit.tempAgiDebuff||0)>0);
  add("mov","Reducción de Movimiento",Number(unit.tempMovDebuff||0)>0||Number(unit.genghisMovDebuff||0)>0||Number(unit.hannibalMovDebuff||0)>0);
  add("stun","Aturdimiento",!!unit.rhinoStunnedWindowKey||!!unit.stunnedUntilWindowKey);
  add("lock","Bloqueo de acciones",!!unit.noMoveWindowKey||!!unit.noAttackWindowKey||!!unit.noDefWindowKey||!!unit.noCounterWindowKey);
  add("silence","Silencio",!!unit.silencedWindowKey);
  add("curse","Maldición",!!unit.noHealWindowKey||!!unit.noReductionWindowKey||!!unit.ignoreGuardNextDamageWindowKey||!!unit.doubleNextDamageWindowKey);
  add("naval","Bloqueo Naval",!!unit.yiSunDebuffed);
  return out;
}
function purifyAcolyteStatus(unit,statusKey){
  const n={...(unit||{})};
  const del=(...keys)=>keys.forEach(key=>delete n[key]);
  if(statusKey==="bleed")del("bleedDamage","bleedSourceName","bleedCyclesRemaining","bleedTurns","bleedSource");
  else if(statusKey==="poison")del("poisonDamage","poisonTurns","poisonStage","poisonBaseDamage","poisonMaxDamage","poisonPersistent","poisonSourceId","poisonSourceName","poisonSource","noHealWhilePoisoned");
  else if(statusKey==="burn")del("burnTurns","burnDamage","burnPersistent","burnSourceName","burnSource");
  else if(statusKey==="veil_curse")return clearVeilCurseStatus(n);
  else if(statusKey==="fear"){
    n.tempAtkDebuff=Math.max(0,Number(n.tempAtkDebuff||0)-3);del("fearWindowKey","fearSourceName","lionFearAppliedWindowKey");
  }else if(statusKey==="atk"){
    n.tempAtkDebuff=0;del("hannibalAtkDebuff","hannibalAtkDebuffWindowKey","hannibalAtkDebuffSource");
  }else if(statusKey==="guard"){
    if(Number(n.tempGuardBuff||0)<0)n.tempGuardBuff=0;n.tempGuardDebuff=0;
  }else if(statusKey==="dex"){
    n.tempDexDebuff=0;del("saboteadorDexZeroWindowKey","saboteadorDexZeroSource");
  }else if(statusKey==="agi")n.tempAgiDebuff=0;
  else if(statusKey==="mov"){
    n.tempMovDebuff=0;del("tempMovDebuffSource","genghisMovDebuff","genghisMovDebuffWindowKey","genghisMovDebuffSource","hannibalMovDebuff","hannibalMovDebuffWindowKey","hannibalMovDebuffSource");
  }else if(statusKey==="stun")del("rhinoStunnedWindowKey","stunnedUntilWindowKey");
  else if(statusKey==="lock")del("noMoveWindowKey","noAttackWindowKey","noDefWindowKey","noCounterWindowKey");
  else if(statusKey==="silence")del("silencedWindowKey");
  else if(statusKey==="curse")del("noHealWindowKey","noReductionWindowKey","ignoreGuardNextDamageWindowKey","doubleNextDamageWindowKey");
  else if(statusKey==="naval"){
    n.tempDexDebuff=Math.max(0,Number(n.tempDexDebuff||0)-4);
    if(Number(n.tempGuardBuff||0)<0)n.tempGuardBuff=Math.min(0,Number(n.tempGuardBuff||0)+4);
    del("yiSunDebuffed");
  }
  return n;
}
function getAcolyteEligibleCorpses(caster,graveyard=publicState?.erictoGraveyard||[]){
  if(!caster)return applyHallvallaValueHooks("acolyte.eligibleCorpses",[],{caster,graveyard});
  const corpses=normalizeErictoGraveyard(graveyard).filter(rec=>{
    const snap=rec?.snapshot||{};
    return !rec.used&&Number(rec.originalOwner||snap.owner||0)===Number(caster.owner)&&!snap.leader&&!snap.token&&!snap.tokenSummon&&!snap.fieldGeneratedSummon&&!snap.solomonSummon&&!snap.reanimated&&!snap.resurrectedByHealer&&!snap.principal&&!snap.principalStart;
  });
  return applyHallvallaValueHooks("acolyte.eligibleCorpses",corpses,{caster,graveyard});
}
function getAcolyteResurrectionCells(caster,units=publicState?.units||[]){return getAdjacentFreeCells(caster,units);}
function getAcolyteTemplateForCorpse(record){
  const key=String(record?.snapshot?.key||record?.key||"");
  const pools=[CARD_TEMPLATES||[],BASIC_MAGIC_TRAP_PACK||[],IMPROVED_MAGIC_TRAP_PACK||[],LEGENDARY_TRAP_CARDS||[],Object.values(ADVENTURE_SPECIALS||{}),LEGENDARY_ALLY_CARDS||[],BEAST_CARD_TEMPLATES||[]];
  for(const pool of pools){const found=(pool||[]).find(c=>c?.key===key&&c?.type==="unit");if(found)return found;}
  return null;
}
function makeAcolyteResurrectedUnit(caster,record,cell){
  const template=getAcolyteTemplateForCorpse(record);
  let revived;
  if(template){
    revived=makeUnit({...makeCard(template,caster.owner),summonOrigin:"hand",fieldGeneratedSummon:false,tokenSummon:false},cell.x,cell.y);
  }else{
    const clean=resetErictoReanimatedTransientState(record?.snapshot||{});
    revived={...clean,id:uid8(),owner:caster.owner,x:cell.x,y:cell.y,nexoX:cell.x,nexoY:cell.y,summonOrigin:"hand",fieldGeneratedSummon:false,tokenSummon:false,reanimated:false};
  }
  const maxHp=Math.max(1,Number(revived.maxHp||record?.snapshot?.maxHp||record?.snapshot?.hp||1));
  const baseGuard=Math.max(0,Number(revived.baseGuard??revived.guard??0));
  return {...revived,id:uid8(),owner:caster.owner,originalOwner:Number(record?.originalOwner||caster.owner),x:cell.x,y:cell.y,nexoX:cell.x,nexoY:cell.y,hp:Math.max(1,Math.ceil(maxHp/2)),maxHp,baseGuard,guard:baseGuard,moved:false,movedSpaces:0,acted:false,defenseModeReady:false,damagedThisWindow:false,summonOrigin:"hand",fieldGeneratedSummon:false,tokenSummon:false,reanimated:false,resurrectedByHealer:true,resurrectedFromGraveId:record.graveId,resurrectedOriginalUnitId:record.originalUnitId,hallvallaReadyOnSummon:true,summonedWindowKey:publicState?.combatWindowKey||"",summonedWindowIndex:publicState?.combatWindowIndex||0,summonedRuntimeMode:getRuntimeMode?.()||"continuous"};
}
function applyAcolyteHealerEffectState(caster,choice,units=publicState?.units||[]){
  const live=(units||[]).find(u=>u.id===caster?.id)||caster;if(!live)return{success:false,reason:"No hay Acólita sanadora activa."};
  const technique=String(choice?.technique||"");const points=getUnitServicePoints(live);let out=[...(units||[])],log="",statusFxEvent=null,floatFxEvent=null,battleFxEvent=null;
  if(technique==="transfer"){
    const target=out.find(u=>u.id===choice?.targetId);if(!target||target.leader||dist(live,target)>getAcolyteEffectRange(live))return{success:false,reason:"Objetivo fuera de rango o inválido."};
    if(target.owner===live.owner){
      if(target.noHealWindowKey===publicState?.combatWindowKey||target.noHealWhilePoisoned)return{success:false,reason:`${target.name} no puede curarse ahora.`};
      const max=Math.max(1,Number(effectiveMaxHp(target)||target.maxHp||target.hp||1));if(Number(target.hp||0)>=max)return{success:false,reason:"La unidad aliada ya tiene la Vida completa."};
      const transferHeal=Math.max(1,getEquipmentHealingMultiplier(live));const actualTransferHeal=Math.min(transferHeal,Math.max(0,max-Number(target.hp||0)));
      out=out.map(u=>u.id===target.id?{...u,hp:Math.min(max,Number(u.hp||0)+transferHeal)}:u.id===live.id?{...u,acted:true}:u);const healedTarget=out.find(u=>u.id===target.id)||target;battleFxEvent=makeMagicFxEvent(live,healedTarget,"heal",{type:"heal",spellKey:"acolyte_transfer_heal",effectAction:"heal",hit:true});statusFxEvent=makeStatusFxEvent("heal",healedTarget,actualTransferHeal);floatFxEvent=makeFloatFxEvent("heal",healedTarget,actualTransferHeal,{iconText:"✚"});log=`${live.name} usa Transferencia vital: ${target.name} recupera ${actualTransferHeal} Vida.`;
    }else{
      if(isStealthedUnit(target))return{success:false,reason:"No puede seleccionar una unidad enemiga con Sigilo."};
      const before=[...out];const transferDamage=Math.max(1,getEquipmentDamageMultiplier(live));let actualTransferDamage=transferDamage;out=out.map(u=>{if(u.id===target.id){const protectedDamage=applyDirectHpDamageWithEquipment(u,transferDamage);actualTransferDamage=protectedDamage.damage;return protectedDamage.unit;}return u.id===live.id?{...u,acted:true}:u;});out=applyLegendaryFatalSaves(out,[target.id]).filter(u=>Number(u.hp||0)>0);const blood=applyBloodVictoryForDeaths(before,out);out=blood.units;const survivor=out.find(u=>u.id===target.id);battleFxEvent=makeMagicFxEvent(live,survivor||target,"arcane",{type:"spell",spellKey:"acolyte_transfer_damage",effectAction:"drain",hit:true});statusFxEvent=survivor?makeStatusFxEvent("damage",survivor,actualTransferDamage):null;floatFxEvent=makeFloatFxEvent("damage",survivor||target,actualTransferDamage,{iconText:"✦"});log=`${live.name} usa Transferencia vital: ${target.name} pierde ${actualTransferDamage} Vida directamente.${blood.logs.length?` ${blood.logs.join(" ")}`:""}`;
    }
    return{success:true,units:out,log,honorCost:2,serviceGain:1,battleFxEvent,statusFxEvent,floatFxEvent,clockKillCreditOwner:live.owner};
  }
  if(technique==="purify"){
    if(points<50)return{success:false,reason:"Purificación requiere 50 puntos de servicio."};const target=out.find(u=>u.id===choice?.targetId);if(!target||target.leader||target.owner!==live.owner||dist(live,target)>getAcolyteEffectRange(live))return{success:false,reason:"Aliado inválido o fuera de rango."};const statuses=getAcolytePurifiableStatuses(target);const chosen=statuses.find(st=>st.key===choice?.statusKey);if(!chosen)return{success:false,reason:"El estado elegido ya no está presente."};out=out.map(u=>u.id===target.id?purifyAcolyteStatus(u,chosen.key):u.id===live.id?{...u,acted:true}:u);const purifiedTarget=out.find(u=>u.id===target.id)||target;battleFxEvent=makeMagicFxEvent(live,purifiedTarget,"heal",{type:"heal",spellKey:"acolyte_purify",effectAction:"cleanse",hit:true});statusFxEvent=makeStatusFxEvent("cleanse",purifiedTarget,0);floatFxEvent=makeFloatFxEvent("heal",purifiedTarget,0,{iconText:"◇",labelText:"PURIFICA"});log=`${live.name} usa Purificación: elimina ${chosen.label} de ${target.name}.`;return{success:true,units:out,log,honorCost:3,serviceGain:1,battleFxEvent,statusFxEvent,floatFxEvent};
  }
  if(technique==="resurrect"){
    if(points<100)return{success:false,reason:"Resurrección requiere 100 puntos de servicio."};const grave=normalizeErictoGraveyard(publicState?.erictoGraveyard||[]);const rec=getAcolyteEligibleCorpses(live,grave).find(r=>r.graveId===choice?.graveId);const cell=getAcolyteResurrectionCells(live,out).find(c=>c.x===Number(choice?.x)&&c.y===Number(choice?.y));if(!rec||!cell)return{success:false,reason:"El cadáver o la casilla ya no están disponibles."};let revived=makeAcolyteResurrectedUnit(live,rec,cell);if(ownerHasUnit(live.owner===1?2:1,"yi_sun_sin",out))revived={...revived,tempDexDebuff:Number(revived.tempDexDebuff||0)+4,tempGuardBuff:Number(revived.tempGuardBuff||0)-4,yiSunDebuffed:true};out=out.map(u=>u.id===live.id?{...u,acted:true}:u).concat(revived);const lion=applyAfricanLionFearAura(out);out=lion.units;const nextGrave=grave.map(r=>r.graveId===rec.graveId?{...r,used:true,usedByAcolyteId:live.id,usedWindowKey:publicState?.combatWindowKey||""}:r);log=`${live.name} usa Resurrección: ${rec.name} vuelve con ${revived.hp}/${revived.maxHp} Vida, sin debuffs y como invocada desde la mano. Puede actuar este turno.${lion.logs.length?` ${lion.logs.join(" ")}`:""}`;battleFxEvent=makeMagicFxEvent(live,revived,"heal",{type:"heal",spellKey:"acolyte_resurrect",effectAction:"resurrect",impactScale:1.25,hit:true});return{success:true,units:out,log,honorCost:4,serviceGain:1,erictoGraveyard:nextGrave,battleFxEvent,statusFxEvent:lion.statusFxEvent||makeStatusFxEvent("heal",revived,revived.hp),floatFxEvent:lion.floatFxEvent||makeFloatFxEvent("heal",revived,revived.hp,{iconText:"✚",labelText:"REGRESA"})};
  }
  return{success:false,reason:"Capacidad curativa inválida."};
}
function getUnitEffectMode(u){
  if(!u)return "passive";
  if(u.leader&&u.leaderType==="beastmaster"&&getLeaderAbilityForOwner(u.owner)==="prepare_hunt")return "passive";
  if(u.key==="acolyte_healer")return "choice";
  if(["african_lion","black_raven","ericto"].includes(u.key))return "self";
  if(["richard_lionheart","saladin","sun_tzu","subotai"].includes(u.key))return "target";
  return "passive";
}
function getAdjacentFreeCells(unit,units=publicState?.units||[]){
  if(!unit)return[];
  const spots=[];
  for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++){
    if((units||[]).some(it=>it.x===x&&it.y===y))continue;
    if(dist(unit,{x,y})<=1)spots.push({x,y,cellTarget:true});
  }
  return spots;
}
function makeLightCavalryToken(owner,x,y){
  const template=(CARD_TEMPLATES||[]).find(c=>c.key==="cavalry")||{key:"cavalry",assetKey:"cavalry_light",assetBucket:"basic",name:"Caballería ligera",type:"unit",icon:"🐎",portrait:CARD_PORTRAITS.cavalry,cost:2,hp:5,atk:4,guard:3,dex:4,agi:5,mov:3,range:1,text:"Carga desestabilizadora."};
  const card=makeCard({...template,assetKey:"cavalry_light",assetBucket:"basic"},owner);
  const token=makeUnit({...card,summonOrigin:"field_effect",fieldGeneratedSummon:true,tokenSummon:true},x,y);
  return {...token,assetKey:"cavalry_light",assetBucket:"basic",fieldFigure:"assets/field_figures_light/basic/cavalry_light.webp",tokenSummon:true};
}
function getEffectTargetOptions(caster,units=publicState?.units||[]){
  if(!caster)return[];
  const owner=caster.owner;
  if(caster.leader&&((caster.leaderType==="cavalry"&&getLeaderAbilityForOwner(owner,units)==="cavalry_call")||(caster.leaderType==="archer"&&getLeaderAbilityForOwner(owner,units)==="arrow_rain")||(caster.leaderType==="mage"&&getLeaderAbilityForOwner(owner,units)==="arcane_bolt"))){
    return[];
  }
  if(caster.leader&&caster.leaderType==="beastmaster"&&getLeaderAbilityForOwner(owner,units)==="prepare_hunt"){
    return[];
  }
  if(caster.key==="african_lion"){return [caster];}
  if(caster.key==="black_raven"){return [caster];}
  if(caster.key==="ericto"){
    if(caster.erictoUsedWindowKey===publicState?.combatWindowKey)return[];
    if(getErictoLinkedReanimated(caster,units).length>=getErictoMaxReanimated(caster))return[];
    if(!getAdjacentFreeCells(caster,units).length)return[];
    return getErictoEligibleCorpses(caster,publicState?.erictoGraveyard||[]).length?[caster]:[];
  }
  if(caster.key==="richard_lionheart"){
    return adjacentAllies(caster,units).filter(a=>a.id!==caster.id);
  }
  if(caster.key==="saladin"){
    if(units.some(it=>it.owner===owner&&it.key==="saladin_archer_cavalry"))return[];
    const spots=[];
    for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++){
      if(units.some(it=>it.x===x&&it.y===y))continue;
      if(dist(caster,{x,y})<=1)spots.push({x,y,cellTarget:true});
    }
    return spots;
  }
  if(caster.key==="sun_tzu"){
    if(caster.sunTzuUsedWindow)return[];
    return units.filter(a=>a.owner===owner&&a.id!==caster.id);
  }
  if(caster.key==="subotai"){
    if(caster.subotaiUsedWindow)return[];
    return units.filter(a=>a.owner===owner&&a.id!==caster.id);
  }
  return[];
}
function smartEffectScore(caster,target,units=publicState?.units||[]){
  if(!caster||!target)return-9999;
  const enemies=units.filter(u=>u.owner!==caster.owner&&u.hp>0);
  const enemyLeader=enemies.find(u=>u.leader);
  const missing=Math.max(0,effectiveMaxHp(target)-(target.hp||0));
  const nearbyEnemy=enemies.some(e=>dist(e,target)<=Math.max(1,e.range||1)+1);
  let score=0;
  if(target.leader)score-=85; // líder solo gana si no hay alternativas mejores
  if(caster.leader&&caster.leaderType==="beastmaster"){
    if(!target.cellTarget)return -9999;
    const enemyPressure=enemies.reduce((sum,e)=>sum+(Math.max(0,7-dist(target,e))*10),0);
    score+=enemyPressure+(enemyLeader?Math.max(0,8-dist(target,enemyLeader))*8:0)+45;
  }else if(caster.key==="richard_lionheart"){
    score+=missing*35+(target.atk||0)*5+(target.guard||0)*3;
    if(nearbyEnemy)score+=55;
    if((target.hp||0)<=2)score+=60;
  }else if(caster.key==="sun_tzu"){
    const canThreat=enemies.some(e=>dist(target,e)<=Math.max(target.range||1,e.range||1)+1);
    score+=(target.atk||0)*6+(target.dex||0)*3+(nearbyEnemy?45:0)+(canThreat?50:0);
    if(target.acted)score-=45;
  }else if(caster.key==="subotai"){
    const canReach=enemies.some(e=>dist(target,e)<=effectiveMov(target)+2+(target.range||1));
    score+=(target.atk||0)*6+(target.range||1)*4+(canReach?75:0);
    if(enemyLeader)score+=Math.max(0,10-dist(target,enemyLeader))*4;
    if(target.moved)score-=35;
  }else if(caster.key==="saladin"){
    if(!target.cellTarget)return-9999;
    score+=enemies.reduce((best,e)=>Math.max(best,Math.max(0,10-dist(target,e))*6+(e.leader?70:0)),0);
  }
  return score;
}
function chooseSmartEffectTarget(caster,units=publicState?.units||[]){
  const opts=getEffectTargetOptions(caster,units);
  if(!opts.length)return null;
  const nonLeader=opts.filter(o=>!o.leader);
  const pool=nonLeader.length?nonLeader:opts;
  return pool.map(o=>({target:o,score:smartEffectScore(caster,o,units)})).sort((a,b)=>b.score-a.score)[0]?.target||null;
}
function applyUnitEffectState(caster,choice,units=publicState?.units||[]){
  if(!caster)return{success:false,reason:"No hay unidad para activar."};
  const liveCaster=units.find(it=>it.id===caster.id)||caster;
  const owner=liveCaster.owner;
  const mode=getUnitEffectMode(liveCaster);
  const validTargets=getEffectTargetOptions(liveCaster,units);
  let target=choice;
  if(mode==="self"){
    target=liveCaster;
  }else if(liveCaster.key!=="ulysses"){
    const valid=validTargets.find(t=>t.cellTarget?target&&t.x===target.x&&t.y===target.y:target&&t.id===target.id);
    if(!valid)return{success:false,reason:"Objetivo inválido para este EFFECT."};
    target=valid;
  }
  let out=[...(units||[])],log="",battleFxEvent=null,stealthAreaDamageEvent=null;
  if(liveCaster.leader&&((liveCaster.leaderType==="cavalry"&&getLeaderAbilityForOwner(owner,units)==="cavalry_call")||(liveCaster.leaderType==="archer"&&getLeaderAbilityForOwner(owner,units)==="arrow_rain")||(liveCaster.leaderType==="mage"&&getLeaderAbilityForOwner(owner,units)==="arcane_bolt"))){
    return{success:false,reason:"Esta habilidad de líder se activa automáticamente al cerrar cada ciclo táctico de 10 s."};
  }
  if(liveCaster.leader&&liveCaster.leaderType==="beastmaster"&&getLeaderAbilityForOwner(owner,units)==="prepare_hunt"){
    return{success:false,reason:"Veneno de la Manada es una habilidad pasiva."};
  }else if(liveCaster.key==="african_lion"){
    const rev=revealStealthInRadius(out,owner,liveCaster,3,"Rugido del Rey");out=rev.units.map(it=>it.id===liveCaster.id?{...it,acted:true}:it);const detection=typeof makeStage8StealthDetectionEvent==="function"?makeStage8StealthDetectionEvent(owner,liveCaster,3,"Rugido del Rey"):null;log=detection?`${liveCaster.name} usa Rugido del Rey y barre el área en busca de Sigilo.`:`${liveCaster.name} usa Rugido del Rey y revela ${rev.count} unidad${rev.count===1?"":"es"} con Sigilo.`;return{success:true,units:out,log,battleFxEvent,stealthDetectionEvent:detection};
  }else if(liveCaster.key==="black_raven"){
    const rev=revealStealthInRadius(out,owner,liveCaster,2,"Ojo del Cazador");out=rev.units.map(it=>it.id===liveCaster.id?{...it,acted:true}:it);const detection=typeof makeStage8StealthDetectionEvent==="function"?makeStage8StealthDetectionEvent(owner,liveCaster,2,"Ojo del Cazador"):null;log=detection?`${liveCaster.name} usa Ojo del Cazador y inspecciona el área en busca de Sigilo.`:`${liveCaster.name} usa Ojo del Cazador y revela ${rev.count} unidad${rev.count===1?"":"es"} con Sigilo.`;return{success:true,units:out,log,battleFxEvent,stealthDetectionEvent:detection};
  }else if(liveCaster.key==="ericto"){
    if(liveCaster.erictoUsedWindowKey===publicState?.combatWindowKey)return{success:false,reason:"Ericto ya usó Necromancia de Farsalia durante este ciclo táctico."};
    const current=getErictoLinkedReanimated(liveCaster,out).length;
    const maximum=getErictoMaxReanimated(liveCaster);
    if(current>=maximum)return{success:false,reason:`Ericto ya controla el máximo de ${maximum} reanimado${maximum===1?"":"s"} para su rango.`};
    const graveyard=normalizeErictoGraveyard(publicState?.erictoGraveyard||[]);
    const cells=getAdjacentFreeCells(liveCaster,out);
    if(!cells.length)return{success:false,reason:"No hay una celda libre adyacente a Ericto."};
    const selection=choice||getBestErictoReanimationChoice(liveCaster,out,graveyard);
    if(!selection)return{success:false,reason:"No hay cadáveres disponibles para reanimar."};
    const record=getErictoEligibleCorpses(liveCaster,graveyard).find(r=>r.graveId===selection.graveId);
    const cell=cells.find(c=>c.x===Number(selection.x)&&c.y===Number(selection.y));
    if(!record||!cell)return{success:false,reason:"El cadáver o la celda elegida ya no están disponibles."};
    const revived=makeErictoReanimatedUnit(liveCaster,record,cell);
    const nextGraveyard=graveyard.map(r=>r.graveId===record.graveId?{...r,used:true,usedByErictoId:liveCaster.id,usedWindowKey:publicState?.combatWindowKey||""}:r);
    out=out.map(it=>it.id===liveCaster.id?{...it,acted:true,erictoUsedWindowKey:publicState?.combatWindowKey||""}:it).concat(revived);
    log=`${liveCaster.name} usa Necromancia de Farsalia: ${record.name} regresa con ${revived.hp}/${revived.maxHp} Vida bajo su control.`;
    return{success:true,units:out,log,erictoGraveyard:nextGraveyard};
  }else if(liveCaster.key==="richard_lionheart"){
    out=out.map(it=>{
      if(it.id===target.id){
        const previousStacks=it.richardBuffSource===liveCaster.id?Math.max(0,Number(it.richardBuffStacks||1)):0;
        return {...it,richardBuffSource:liveCaster.id,richardBuffStacks:previousStacks+1,hp:(it.hp||0)+2};
      }
      return it.id===liveCaster.id?{...it,acted:true}:it;
    });
    log=`${liveCaster.name} activa Corazón Indomable: ${target.name} gana +2 Vida máxima y +2 Vida actual mientras Richard siga en campo.`;
  }else if(liveCaster.key==="saladin"){
    const token=makeUnit({...makeCard(SALADIN_TOKEN_CARD,owner),summonOrigin:"field_effect",fieldGeneratedSummon:true,tokenSummon:true},target.x,target.y);
    out=out.map(it=>it.id===liveCaster.id?{...it,acted:true}:it).concat(token);
    log=`${liveCaster.name} activa Media Luna del Desierto e invoca una Caballería Arquera en ${target.x+1},${target.y+1}.`;
  }else if(liveCaster.key==="sun_tzu"){
    out=out.map(it=>it.id===target.id?{...it,tempDexBuff:(it.tempDexBuff||0)+4,tempGuardBuff:(it.tempGuardBuff||0)+4}:it.id===liveCaster.id?{...it,acted:true,sunTzuUsedWindow:true}:it);
    log=`${liveCaster.name} activa Arte de la Guerra: ${target.name} gana +4 Destreza y +4 Guardia durante este ciclo táctico.`;
  }else if(liveCaster.key==="subotai"){
    out=out.map(it=>it.id===target.id?{...it,tempMovBuff:(it.tempMovBuff||0)+2}:it.id===liveCaster.id?{...it,acted:true,subotaiUsedWindow:true}:it);
    log=`${liveCaster.name} activa Marcha de Mil Horizontes: ${target.name} gana +2 Movimiento durante este ciclo táctico.`;
  }else{
    return{success:false,reason:"Este efecto es pasivo o se activa automáticamente durante el combate."};
  }
  return{success:true,units:out,log,battleFxEvent,stealthAreaDamageEvent};
}


/*
-------------------------------------------------------------------------------
11_COMBAT_ENGINE_DEF_ENTRY
-------------------------------------------------------------------------------
*/
// DEF limpio: estado lógico solamente.
// No debe crear defenseFxEvent ni floatFxEvent.
// Esto evita el óvalo/bloque gigante que se generaba en la capa FX.
function handleUnitContextAction(action){
  const u=unitContextSelection?getUnit(unitContextSelection.unitId):null;
  if(!u)return hideUnitContextMenu();
  if(action!=="det")return;
  hideUnitContextMenu();
  showUnit(u);
}
