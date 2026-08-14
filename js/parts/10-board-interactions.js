"use strict";
/* HallValla 7BOARDCTRL8AC · Interacción de tablero y efectos de unidad */

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
  dragMoveHighlights=[];
  dragAttackHighlights=[];
  dragSummonHighlights=[];
  document.body?.classList?.remove("hv-dragging-board");
  boardHoverCellKey="";
  boardSelectedCellKey="";
  if(boardSelectedCellTimer){battleClearTimeout(boardSelectedCellTimer);boardSelectedCellTimer=null;}
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
  dragMoveHighlights=[];
  dragAttackHighlights=[];
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
function getDragUnitMoveKeys(u){return moveZones(u);}
function getDragUnitAttackKeys(u){return getAttackableTargets(u).map(t=>`${t.x},${t.y}`);}
function startUnitBoardDrag(ev,u,sourceEl){
  if(!u||u.owner!==myPlayer||!isMyTurn()||isBattleEnded())return false;
  const canMoveNow=!u.leader&&getDragUnitMoveKeys(u).length>0;
  const canAttackNow=getDragUnitAttackKeys(u).length>0;
  if(!canMoveNow&&!canAttackNow)return false;
  boardDragState={kind:"unit",unitId:u.id,pointerId:ev.pointerId,startX:ev.clientX,startY:ev.clientY,dragging:false,sourceEl};
  bindBoardDragWindowListeners();
  return true;
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
  boardDragState.dragging=true;
  document.body.classList.add("hv-dragging-board");
  if(boardDragState.kind==="unit"){
    const u=getUnit(boardDragState.unitId);
    if(!u){handleBoardDragCancel();return;}
    selectedCard=null;
    selectedUnitId=u.id;
    selectedUnitActionMode=null;
    selectedUnitEffectChoice=null;
    unitContextSelection=null;
    hideUnitContextMenu();
    dragMoveHighlights=getDragUnitMoveKeys(u);
    dragAttackHighlights=getDragUnitAttackKeys(u);
    dragSummonHighlights=[];
    const stealthDrag=isStealthedUnit(u);
    setHint(stealthDrag?"Unidad con Sigilo: arrastra a una casilla verde para mover o sobre un rival rojo para atacar.":`${u.name}: arrastra a una casilla verde para mover o sobre un rival rojo para atacar.`);
    boardDragGhost=makeBoardDragGhost(boardDragState.sourceEl,stealthDrag?"Presencia Oculta · Sigilo":u.name);
    render();
  }else if(boardDragState.kind==="hand-unit"){
    const card=(privateState?.hand||[]).find(c=>c.id===boardDragState.cardId);
    if(!card){handleBoardDragCancel();return;}
    selectedCard=card;
    selectedUnitId=null;
    selectedUnitActionMode=null;
    selectedUnitEffectChoice=null;
    unitContextSelection=null;
    hideUnitContextMenu();
    closeHandForBoardFocus();
    dragMoveHighlights=[];
    dragAttackHighlights=[];
    dragSummonHighlights=summonZones(myPlayer);
    highlights=[...dragSummonHighlights];
    highlightType="summon";
    setHint(`${card.name}: suéltala en una casilla amarilla junto a tu líder para invocar.`);
    boardDragGhost=makeBoardDragGhost(boardDragState.sourceEl,card.name);
    render();
  }
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
  if(!state.dragging){return;}
  ev.preventDefault();
  lastBoardDragEndedAt=Date.now();
  const drop=getBoardCellFromPoint(ev.clientX,ev.clientY);
  if(!drop){clearBoardDragVisuals();setHint("Arrastre cancelado.");return;}
  try{
    if(state.kind==="unit"){
      const u=getUnit(state.unitId);
      if(!u){clearBoardDragVisuals();return;}
      const target=drop.unit;
      const moveKey=`${drop.x},${drop.y}`;
      clearBoardDragVisuals({rerender:false});
      if(target&&target.owner!==myPlayer&&getDragUnitAttackKeys(u).includes(moveKey)){
        selectedUnitId=u.id;selectedUnitActionMode="attk";
        await attackUnit(u.id,target.id);
        return;
      }
      if(!target&&getDragUnitMoveKeys(u).includes(moveKey)){
        selectedUnitId=u.id;selectedUnitActionMode="mov";
        await moveUnit(u,drop.x,drop.y);
        return;
      }
      clearSelection();
      setHint("Destino inválido: suelta en verde para mover o en rojo para atacar.");
    }else if(state.kind==="hand-unit"){
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
      setHint("Casilla inválida para invocación: suelta junto a tu líder.");
    }
  }catch(err){
    console.warn("[HallValla] Error en arrastre táctico:",err);
    clearSelection();
    setHint("No se pudo completar el arrastre táctico.");
  }
}
function handleBoardDragCancel(){
  unbindBoardDragWindowListeners();
  boardDragState=null;
  clearBoardDragVisuals();
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
  if(selectedUnitId){
    const s=getUnit(selectedUnitId);
    if(!s){clearSelection();return;}
    if(selectedUnitActionMode==="attk"){
      if(u&&u.owner!==myPlayer)return attackUnit(s.id,u.id);
      return setHint("ATTK: elige una unidad rival marcada en rojo.");
    }
    if(selectedUnitActionMode==="mov"){
      if(!u)return moveUnit(s,x,y);
      return setHint("MOV: elige una casilla verde vacía.");
    }
    if(selectedUnitActionMode==="effect"){
      if(s.key==="acolyte_healer"){
        if(!u)return setHint("EFFECT: elige una unidad marcada dentro del rango 3.");
        return activateUnitEffect(s,{technique:selectedUnitEffectChoice,targetId:u.id});
      }
      if(s.key==="saladin"||s.leaderType==="beastmaster"){
        if(u)return setHint("EFFECT: elige una casilla libre válida.");
        return activateUnitEffect(s,{x,y,cellTarget:true});
      }
      if(u&&u.owner===myPlayer)return activateUnitEffect(s,u);
      return setHint("EFFECT: elige una unidad aliada marcada.");
    }
    // Sin modo explícito, selectedUnitId solo representa inspección/contexto.
    // No auto-atacar ni auto-mover: eso bloqueaba DET en enemigos.
    if(u)return openUnitContextMenu(u,x,y);
    clearSelection();
    return;
  }
  if(u)return openUnitContextMenu(u,x,y);
  unitContextSelection=null;
  hideUnitContextMenu();
}






function getUnitPortraitHtml(u,depthLayer=false){
  if(isStealthHiddenFromViewer(u))return getStealthContextPortraitHtml();
  const alt=escapeHtml(u?.name||"Unidad");
  if(u?.leader){
    const portrait=(u?.leaderType&&LEADER_DATA[u.leaderType])?LEADER_DATA[u.leaderType].portrait:"";
    if(!portrait)return `<span>${u?.icon||"✦"}</span>`;
    const fallbackAttr=buildAssetFallbackAttr([getAssetWarningImageSrc()],`${u?.name||"Unidad"} · líder`);
    return depthLayer?`<div class="unit-depth-stack"><img class="unit-depth-front board-cropped-art" src="${portrait}" alt="${alt}" ${fallbackAttr}></div>`:`<img src="${portrait}" alt="${alt}" ${fallbackAttr}>`;
  }

  const cardCandidates=getResolvedCardPortraitCandidates(u);
  if(!cardCandidates.length)return `<span>${u?.icon||"✦"}</span>`;

  if(depthLayer){
    const candidates=hvUniqueAssetValues([
      ...getResolvedFieldFigureCandidates(u),
      ...getResolvedBoardPortraitCandidates(u),
      ...cardCandidates,
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
    const portrait=(u?.leaderType&&LEADER_DATA[u.leaderType])?LEADER_DATA[u.leaderType].portrait:"";
    if(!portrait)return `<span>${u?.icon||"✦"}</span>`;
    const alt=escapeHtml(u.name||"Unidad");
    const fallbackAttr=buildAssetFallbackAttr([getAssetWarningImageSrc()],`${u?.name||"Unidad"} · líder`);
    return `<img src="${portrait}" alt="${alt}" ${fallbackAttr}>`;
  }

  const alt=escapeHtml(u?.name||"Unidad");
  const boardCandidates=getResolvedBoardPortraitCandidates(u);
  const cardCandidates=getResolvedCardPortraitCandidates(u);
  const backgroundCandidates=hvUniqueAssetValues([...boardCandidates,...cardCandidates,getAssetWarningImageSrc()]);
  if(!backgroundCandidates.length)return `<span>${u?.icon||"✦"}</span>`;

  const separateFieldFigure=typeof getFieldFigureHtml==="function";
  const foregroundCandidates=hvUniqueAssetValues([
    ...(separateFieldFigure?[]:getResolvedFieldFigureCandidates(u)),
    ...boardCandidates,
    ...cardCandidates,
    getAssetWarningImageSrc()
  ]);
  const bgStart=backgroundCandidates.shift()||getAssetWarningImageSrc();
  const fgStart=foregroundCandidates.shift()||bgStart;
  const bgFallbackAttr=buildAssetFallbackAttr(backgroundCandidates,`${u?.name||"Unidad"} · board card`);
  const fgFallbackAttr=buildAssetFallbackAttr(foregroundCandidates,`${u?.name||"Unidad"} · personaje`);
  return `<div class="unit-portrait-stack"><img class="unit-card-bg-layer" src="${bgStart}" alt="" aria-hidden="true" ${bgFallbackAttr}><img class="unit-card-character-layer" src="${fgStart}" alt="${alt}" ${fgFallbackAttr}></div>`;
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

function unitHasContextEffect(u){
  if(!u)return false;
  return getUnitEffectMode(u)!=="passive";
}
function getUnitContextOptions(u){
  if(!u)return[];
  const mine=u.owner===myPlayer;
  const opts=[];
  if(mine){
    if(isMulanExecutionMoveReady(u)){
      opts.push({key:"mov",label:"MOV",hint:"Movimiento extra de ejecución: mueve 1 casilla."});
      opts.push({key:"det",label:"DET",hint:"Detalles"});
      return opts;
    }
    if(isMulanExecutionChoiceReady(u)){
      opts.push({key:"def",label:"DEF",hint:"Gasta la acción restante de Hua Lan en Guardia defensiva."});
      opts.push({key:"attk",label:"ATTK",hint:"Gasta la acción restante de Hua Lan en un ataque."});
      opts.push({key:"det",label:"DET",hint:"Detalles"});
      return opts;
    }
    if(!u.leader){
      const moveHint=u.acted?"Ya usó su acción":u.moved?"Ya se movió":isUnitMoveWindow(u)?"Mover ahora":"Mover en Action Phase";
      opts.push({key:"mov",label:"MOV",hint:moveHint});
    }
    opts.push({key:"def",label:"DEF",hint:(u.noDefTurnKey&&u.noDefTurnKey===publicState?.turnKey)?"No puede defenderse este turno":(u.defenseModeReady?"Ya está en guardia defensiva":(u.acted?"Ya usó su acción":"Postura defensiva: +2 GD y -10% precisión al primer ataque"))});
    if(unitHasContextEffect(u))opts.push({key:"effect",label:"EFFECT",hint:"Efecto"});
    opts.push({key:"attk",label:"ATTK",hint:isKhalidChainAttackReady(u)?"Espada Invicta: puede seguir atacando con penalización acumulada.":(u.acted?"Ya atacó o defendió":"Atacar en Action Phase")});
  }
  opts.push({key:"det",label:"DET",hint:"Detalles"});
  return opts;
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
    selectedUnitActionMode=null;
    selectedUnitEffectChoice=null;
    highlights=[];
    hideUnitContextMenu();
    hideCardInspectModal();
    setHint("Presencia Oculta · Sigilo: la identidad, estadísticas y DET de esta unidad están ocultos para el rival.");
    return;
  }
  unitContextSelection={unitId:u.id,x,y};
  selectedCard=null;
  selectedUnitId=u.id;
  selectedUnitActionMode=null;
  selectedUnitEffectChoice=null;
  highlights=[];
  highlightType="move";
  hideCardInspectModal();
  render();
  if(u.owner!==myPlayer){
    setHint(`${u.name}: abre DET desde la estrella táctica para revisar sus datos.`);
  }else{
    setHint(u.leader?`${u.name}: Base fija. Puede usar DEF, ATTK${unitHasContextEffect(u)?', EFFECT':''} o DET, pero no MOV.`:`${u.name}: elige MOV, DEF, ATTK${unitHasContextEffect(u)?', EFFECT':''} o DET desde la estrella táctica.`);
  }
}
function renderUnitContextMenu(){
  const menu=$("unitContextMenu");
  if(!menu)return;
  if(!unitContextSelection||!publicState){menu.classList.add("hidden");return;}
  const u=getUnit(unitContextSelection.unitId);
  if(!u){menu.classList.add("hidden");return;}
  if(isStealthHiddenFromViewer(u)){
    unitContextSelection=null;
    menu.classList.add("hidden");
    return;
  }
  const options=getUnitContextOptions(u);
  const canMove=isMyTurn()&&u.owner===myPlayer&&isUnitMoveWindow(u)&&!isBattleEnded();
  const canAction=isMyTurn()&&u.owner===myPlayer&&isUnitActionWindow(u)&&!isBattleEnded();
  const slotMap={mov:"slot-top",def:"slot-left",effect:"slot-left-bottom",attk:"slot-right",det:"slot-bottom"};
  const stealthMasked=isStealthedUnit(u);
  const portraitHtml=stealthMasked?getStealthContextPortraitHtml():getUnitPortraitHtml(u);
  const hpLabel=stealthMasked?"?":String(getDisplayHp(u));
  const atkLabel=stealthMasked?"?":effectiveAtk(u);
  const guardLabel=stealthMasked?"?":displayEffectiveGuard(u);
  const contextName=stealthMasked?"Unidad con Sigilo":(u.name||"Invocación");
  const contextSub=stealthMasked?`Presencia Oculta · J${u.owner}`:`${u.leader?"Líder":"Invocación"} · J${u.owner}`;
  menu.innerHTML=`<div class="unit-context-star-shell"><div class="unit-context-core"><div class="unit-context-portrait ${stealthMasked?"is-stealthed":""}">${portraitHtml}</div><div class="unit-context-mini-stats ${stealthMasked?"is-stealthed":""}"><span>${hpLabel}</span><span>${atkLabel}</span><span>${guardLabel}</span></div><div class="unit-context-name">${escapeHtml(contextName)}</div><div class="unit-context-sub">${escapeHtml(contextSub)}</div></div>${options.map(o=>{
    const mulanExecMove=isMulanExecutionMoveReady(u);
    const mulanExecChoice=isMulanExecutionChoiceReady(u);
    const disabled=(o.key==="mov"&&(!canMove||(!mulanExecMove&&(u.moved||u.acted))))||(o.key==="attk"&&(!canUnitDeclareAttack(u)))||(o.key==="effect"&&(!canAction||u.acted||mulanExecChoice||mulanExecMove))||(o.key==="def"&&(!canAction||(!mulanExecChoice&&u.acted)||u.defenseModeReady||mulanExecMove||(u.noDefTurnKey&&u.noDefTurnKey===publicState?.turnKey)));
    return `<button class="unit-context-btn ${slotMap[o.key]||"slot-top"}" data-action="${o.key}" ${disabled?"disabled":""} title="${escapeHtml(o.hint)}"><span>${o.label}</span></button>`;
  }).join("")}</div>`;
  const grid=$("grid");
  if(grid){
    const g=grid.getBoundingClientRect();
    const cellW=g.width/COLS, cellH=g.height/ROWS;
    let left=g.left+(unitContextSelection.x+.5)*cellW;
    let top=g.top+(unitContextSelection.y+.5)*cellH;
    if(u.leader){
      const base=document.querySelector(`.leader-base[data-leader-id="${CSS.escape(u.id)}"]`);
      if(base){const r=base.getBoundingClientRect();left=r.left+r.width/2;top=r.top+r.height/2;}
    }
    menu.style.left=`${left}px`;
    menu.style.top=`${top}px`;
    battleRequestAnimationFrame(()=>{
      const rect=menu.getBoundingClientRect();
      const margin=10;
      const vw=window.innerWidth||document.documentElement.clientWidth||0;
      const vh=window.innerHeight||document.documentElement.clientHeight||0;
      const clampedLeft=Math.min(Math.max(left,rect.width/2+margin),Math.max(rect.width/2+margin,vw-rect.width/2-margin));
      const clampedTop=Math.min(Math.max(top,rect.height/2+margin),Math.max(rect.height/2+margin,vh-rect.height/2-margin));
      menu.style.left=`${clampedLeft}px`;
      menu.style.top=`${clampedTop}px`;
    },"unit-context-clamp");
  }
  menu.classList.remove("hidden");
  menu.querySelectorAll(".unit-context-btn").forEach(btn=>btn.addEventListener("click",ev=>{
    ev.stopPropagation();
    handleUnitContextAction(btn.dataset.action);
  }));
}


const ACOLYTE_HEALER_EFFECT_COSTS=Object.freeze({transfer:2,purify:3,resurrect:4});
function getAcolyteEffectRange(caster){return Math.max(1,Number(caster?.effectRange||3)+Number(getEquipmentRangeBonus(caster)||0));}
function getAcolyteTransferTargets(caster,units=publicState?.units||[]){
  if(!caster)return[];
  const rg=getAcolyteEffectRange(caster);
  return (units||[]).filter(target=>{
    if(!target||target.leader||Number(target.hp||0)<=0||dist(caster,target)>rg)return false;
    if(target.owner===caster.owner){
      if(target.noHealTurnKey===publicState?.turnKey||target.noHealWhilePoisoned)return false;
      return Number(target.hp||0)<Number(effectiveMaxHp(target)||target.maxHp||target.hp||0);
    }
    return !isStealthedUnit(target);
  });
}
function getAcolytePurifiableStatuses(unit){
  if(!unit)return[];
  const out=[];
  const add=(key,label,active)=>{if(active)out.push({key,label});};
  add("bleed","Sangrado",hasBleeding(unit));
  add("poison","Veneno",Number(unit.poisonTurns||0)>0||Number(unit.poisonDamage||0)>0||!!unit.noHealWhilePoisoned);
  add("burn","Quemadura",Number(unit.burnTurns||0)>0||Number(unit.burnDamage||0)>0);
  add("veil_curse","Cuenta regresiva mortal",hasVeilCurse(unit));
  add("fear","Miedo",!!unit.fearTurnKey||!!unit.fearSourceName);
  add("atk","Reducción de Ataque",Number(unit.tempAtkDebuff||0)>0||Number(unit.hannibalAtkDebuff||0)>0);
  add("guard","Reducción de Guardia",Number(unit.tempGuardBuff||0)<0||Number(unit.tempGuardDebuff||0)>0);
  add("dex","Reducción de Destreza",Number(unit.tempDexDebuff||0)>0||!!unit.saboteadorDexZeroTurnKey);
  add("agi","Reducción de Agilidad",Number(unit.tempAgiDebuff||0)>0);
  add("mov","Reducción de Movimiento",Number(unit.tempMovDebuff||0)>0||Number(unit.genghisMovDebuff||0)>0||Number(unit.hannibalMovDebuff||0)>0);
  add("stun","Aturdimiento",!!unit.rhinoStunnedTurnKey||!!unit.stunnedUntilTurnKey);
  add("lock","Bloqueo de acciones",!!unit.noMoveTurnKey||!!unit.noAttackTurnKey||!!unit.noDefTurnKey||!!unit.noCounterTurnKey);
  add("silence","Silencio",!!unit.silencedTurnKey);
  add("curse","Maldición",!!unit.noHealTurnKey||!!unit.noReductionTurnKey||!!unit.ignoreGuardNextDamageTurnKey||!!unit.doubleNextDamageTurnKey);
  add("naval","Bloqueo Naval",!!unit.yiSunDebuffed);
  return out;
}
function purifyAcolyteStatus(unit,statusKey){
  const n={...(unit||{})};
  const del=(...keys)=>keys.forEach(key=>delete n[key]);
  if(statusKey==="bleed")del("bleedDamage","bleedSourceName","bleedTurnsRemaining","bleedTurns","bleedSource");
  else if(statusKey==="poison")del("poisonDamage","poisonTurns","poisonStage","poisonSourceId","poisonSourceName","poisonSource","noHealWhilePoisoned");
  else if(statusKey==="burn")del("burnTurns","burnDamage","burnSourceName","burnSource");
  else if(statusKey==="veil_curse")return clearVeilCurseStatus(n);
  else if(statusKey==="fear"){
    n.tempAtkDebuff=Math.max(0,Number(n.tempAtkDebuff||0)-3);del("fearTurnKey","fearSourceName","lionFearAppliedTurnKey");
  }else if(statusKey==="atk"){
    n.tempAtkDebuff=0;del("hannibalAtkDebuff","hannibalAtkDebuffTurnKey","hannibalAtkDebuffSource");
  }else if(statusKey==="guard"){
    if(Number(n.tempGuardBuff||0)<0)n.tempGuardBuff=0;n.tempGuardDebuff=0;
  }else if(statusKey==="dex"){
    n.tempDexDebuff=0;del("saboteadorDexZeroTurnKey","saboteadorDexZeroSource");
  }else if(statusKey==="agi")n.tempAgiDebuff=0;
  else if(statusKey==="mov"){
    n.tempMovDebuff=0;del("tempMovDebuffSource","genghisMovDebuff","genghisMovDebuffTurnKey","genghisMovDebuffSource","hannibalMovDebuff","hannibalMovDebuffTurnKey","hannibalMovDebuffSource");
  }else if(statusKey==="stun")del("rhinoStunnedTurnKey","stunnedUntilTurnKey");
  else if(statusKey==="lock")del("noMoveTurnKey","noAttackTurnKey","noDefTurnKey","noCounterTurnKey");
  else if(statusKey==="silence")del("silencedTurnKey");
  else if(statusKey==="curse")del("noHealTurnKey","noReductionTurnKey","ignoreGuardNextDamageTurnKey","doubleNextDamageTurnKey");
  else if(statusKey==="naval"){
    n.tempDexDebuff=Math.max(0,Number(n.tempDexDebuff||0)-4);
    if(Number(n.tempGuardBuff||0)<0)n.tempGuardBuff=Math.min(0,Number(n.tempGuardBuff||0)+4);
    del("yiSunDebuffed");
  }
  return n;
}
function getAcolytePurifyTargets(caster,units=publicState?.units||[]){
  if(!caster)return[];
  const rg=getAcolyteEffectRange(caster);
  return (units||[]).filter(target=>target&&!target.leader&&target.owner===caster.owner&&Number(target.hp||0)>0&&dist(caster,target)<=rg&&getAcolytePurifiableStatuses(target).length>0);
}
function getAcolyteEligibleCorpses(caster,graveyard=publicState?.erictoGraveyard||[]){
  if(!caster)return[];
  return normalizeErictoGraveyard(graveyard).filter(rec=>{
    const snap=rec?.snapshot||{};
    return !rec.used&&Number(rec.originalOwner||snap.owner||0)===Number(caster.owner)&&!snap.leader&&!snap.token&&!snap.tokenSummon&&!snap.fieldGeneratedSummon&&!snap.solomonSummon&&!snap.reanimated&&!snap.resurrectedByHealer&&!snap.principal&&!snap.principalStart;
  });
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
  return {...revived,id:uid8(),owner:caster.owner,originalOwner:Number(record?.originalOwner||caster.owner),x:cell.x,y:cell.y,nexoX:cell.x,nexoY:cell.y,hp:Math.max(1,Math.ceil(maxHp/2)),maxHp,baseGuard,guard:baseGuard,moved:false,movedSpaces:0,acted:false,defenseModeReady:false,damagedThisTurn:false,summonOrigin:"hand",fieldGeneratedSummon:false,tokenSummon:false,reanimated:false,resurrectedByHealer:true,resurrectedFromGraveId:record.graveId,resurrectedOriginalUnitId:record.originalUnitId,hallvallaReadyOnSummon:true,summonedTurnKey:publicState?.turnKey||"",summonedTurn:publicState?.turn||0,summonedPhase:getTurnPhase?.()||"actions"};
}
function chooseAcolyteTechnique(caster,units=publicState?.units||[],honor=0,graveyard=publicState?.erictoGraveyard||[]){
  const points=getUnitServicePoints(caster);
  const options=[
    {key:"transfer",title:"Transferencia vital",cost:2,desc:"Cura 1 a un aliado herido o causa 1 daño directo a un enemigo visible en rango 3.",unlocked:true,available:getAcolyteTransferTargets(caster,units).length>0},
    {key:"purify",title:"Purificación",cost:3,desc:"Elimina un estado negativo o maldición removible de un aliado en rango 3.",unlocked:points>=50,available:getAcolytePurifyTargets(caster,units).length>0},
    {key:"resurrect",title:"Resurrección",cost:4,desc:"Devuelve un aliado destruido con la mitad de su Vida en una casilla adyacente.",unlocked:points>=100,available:getAcolyteEligibleCorpses(caster,graveyard).length>0&&getAcolyteResurrectionCells(caster,units).length>0}
  ];
  return new Promise(resolve=>{
    const overlay=document.createElement("div");overlay.style.cssText="position:fixed;inset:0;z-index:999999;background:rgba(0,0,0,.84);display:flex;align-items:center;justify-content:center;padding:18px";
    const panel=document.createElement("div");panel.style.cssText="width:min(720px,96vw);background:#0b100d;border:2px solid #789d6d;border-radius:18px;padding:20px;color:#eef7eb;box-shadow:0 0 48px #000";
    panel.innerHTML=`<h2 style="margin:0 0 6px">Artes curativas · ${escapeHtml(caster.name)}</h2><p style="margin:0 0 16px;color:#c9dcc3">Puntos de servicio: <b>${points}</b> · ${getResourceLabel(caster.owner)} disponible: <b>${honor}</b>. Elige una capacidad; usarla consumirá la acción de la Acólita.</p><div data-options style="display:grid;gap:10px"></div><div style="display:flex;justify-content:flex-end;margin-top:16px"><button type="button" data-cancel style="padding:10px 16px;border-radius:9px;border:1px solid #777;background:#181b19;color:#eee">Cancelar</button></div>`;
    overlay.appendChild(panel);document.body.appendChild(overlay);
    const finish=value=>{overlay.remove();resolve(value);};
    options.forEach(opt=>{
      const disabled=!opt.unlocked||!opt.available||honor<opt.cost;
      const reason=!opt.unlocked?`Bloqueada: requiere ${opt.key==="purify"?50:100} puntos.`:!opt.available?"No hay objetivo válido.":honor<opt.cost?`Faltan ${opt.cost-honor} de ${getResourceLabel(caster.owner)}.`:"Disponible.";
      const b=document.createElement("button");b.type="button";b.disabled=disabled;
      b.innerHTML=`<b>${escapeHtml(opt.title)} · ${opt.cost} ${escapeHtml(getResourceLabel(caster.owner))}</b><br><small>${escapeHtml(opt.desc)}</small><br><small style="opacity:.78">${escapeHtml(reason)}</small>`;
      b.style.cssText=`padding:13px;text-align:left;border-radius:11px;border:1px solid ${disabled?"#4b504c":"#7fae71"};background:${disabled?"#171a18":"#162317"};color:${disabled?"#777":"#f2fff0"};cursor:${disabled?"not-allowed":"pointer"}`;
      if(!disabled)b.onclick=()=>finish(opt.key);
      panel.querySelector('[data-options]').appendChild(b);
    });
    panel.querySelector('[data-cancel]').onclick=()=>finish(null);overlay.onclick=e=>{if(e.target===overlay)finish(null);};
  });
}
function chooseAcolytePurificationStatus(target){
  const statuses=getAcolytePurifiableStatuses(target);if(!statuses.length)return Promise.resolve(null);
  return new Promise(resolve=>{
    const overlay=document.createElement("div");overlay.style.cssText="position:fixed;inset:0;z-index:999999;background:rgba(0,0,0,.84);display:flex;align-items:center;justify-content:center;padding:18px";
    const panel=document.createElement("div");panel.style.cssText="width:min(560px,94vw);background:#0b100d;border:2px solid #789d6d;border-radius:18px;padding:20px;color:#eef7eb";
    panel.innerHTML=`<h2 style="margin:0 0 6px">Purificar a ${escapeHtml(target.name)}</h2><p style="margin:0 0 14px;color:#c9dcc3">Elige exactamente un estado que será eliminado.</p><div data-list style="display:grid;gap:8px"></div><div style="display:flex;justify-content:flex-end;margin-top:14px"><button data-cancel type="button">Cancelar</button></div>`;
    overlay.appendChild(panel);document.body.appendChild(overlay);const finish=v=>{overlay.remove();resolve(v);};
    statuses.forEach(st=>{const b=document.createElement("button");b.type="button";b.textContent=st.label;b.style.cssText="padding:11px;border-radius:9px;border:1px solid #789d6d;background:#162317;color:#fff;text-align:left";b.onclick=()=>finish(st.key);panel.querySelector('[data-list]').appendChild(b);});
    panel.querySelector('[data-cancel]').onclick=()=>finish(null);overlay.onclick=e=>{if(e.target===overlay)finish(null);};
  });
}
function chooseAcolyteResurrectionChoice(caster,units=publicState?.units||[],graveyard=publicState?.erictoGraveyard||[]){
  const corpses=getAcolyteEligibleCorpses(caster,graveyard),cells=getAcolyteResurrectionCells(caster,units);if(!corpses.length||!cells.length)return Promise.resolve(null);
  return new Promise(resolve=>{
    const overlay=document.createElement("div");overlay.style.cssText="position:fixed;inset:0;z-index:999999;background:rgba(0,0,0,.84);display:flex;align-items:center;justify-content:center;padding:18px";
    const panel=document.createElement("div");panel.style.cssText="width:min(820px,96vw);max-height:88vh;overflow:auto;background:#0b100d;border:2px solid #789d6d;border-radius:18px;padding:20px;color:#eef7eb";
    panel.innerHTML=`<h2 style="margin:0 0 6px">Resurrección</h2><p style="margin:0 0 16px;color:#c9dcc3">Elige un aliado destruido y una casilla libre adyacente. Volverá con la mitad de su Vida, sin debuffs y podrá actuar este turno.</p><div data-corpses style="display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:10px"></div><h3>Casilla de retorno</h3><div data-cells style="display:flex;flex-wrap:wrap;gap:8px"></div><div style="display:flex;justify-content:flex-end;gap:10px;margin-top:18px"><button data-cancel type="button">Cancelar</button><button data-confirm type="button" disabled>Resucitar</button></div>`;
    overlay.appendChild(panel);document.body.appendChild(overlay);let corpse=null,cell=null;const confirm=panel.querySelector('[data-confirm]');const sync=()=>confirm.disabled=!(corpse&&cell);const finish=v=>{overlay.remove();resolve(v);};
    corpses.forEach(rec=>{const b=document.createElement("button");b.type="button";const max=Math.max(1,Number(rec.snapshot?.maxHp||rec.snapshot?.hp||1));b.innerHTML=`<b>${escapeHtml(rec.name||"Unidad caída")}</b><br><small>Vida de retorno: ${Math.ceil(max/2)}/${max} · PB ${Number(rec.battlePower)||"—"}</small>`;b.style.cssText="padding:12px;text-align:left;border-radius:10px;border:1px solid #617a5a;background:#142016;color:#f3fff1";b.onclick=()=>{panel.querySelectorAll('[data-corpses] button').forEach(x=>x.style.outline='none');b.style.outline='3px solid #8fc681';corpse=rec;sync();};panel.querySelector('[data-corpses]').appendChild(b);});
    cells.forEach(c=>{const b=document.createElement("button");b.type="button";b.textContent=`${c.x+1}, ${c.y+1}`;b.onclick=()=>{panel.querySelectorAll('[data-cells] button').forEach(x=>x.style.outline='none');b.style.outline='3px solid #8fc681';cell=c;sync();};panel.querySelector('[data-cells]').appendChild(b);});
    panel.querySelector('[data-cancel]').onclick=()=>finish(null);confirm.onclick=()=>finish({technique:"resurrect",graveId:corpse.graveId,x:cell.x,y:cell.y});overlay.onclick=e=>{if(e.target===overlay)finish(null);};
  });
}
function applyAcolyteHealerEffectState(caster,choice,units=publicState?.units||[]){
  const live=(units||[]).find(u=>u.id===caster?.id)||caster;if(!live)return{success:false,reason:"No hay Acólita sanadora activa."};
  const technique=String(choice?.technique||"");const points=getUnitServicePoints(live);let out=[...(units||[])],log="",statusFxEvent=null,floatFxEvent=null,battleFxEvent=null;
  if(technique==="transfer"){
    const target=out.find(u=>u.id===choice?.targetId);if(!target||target.leader||dist(live,target)>getAcolyteEffectRange(live))return{success:false,reason:"Objetivo fuera de rango o inválido."};
    if(target.owner===live.owner){
      if(target.noHealTurnKey===publicState?.turnKey||target.noHealWhilePoisoned)return{success:false,reason:`${target.name} no puede curarse ahora.`};
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
    if(points<100)return{success:false,reason:"Resurrección requiere 100 puntos de servicio."};const grave=normalizeErictoGraveyard(publicState?.erictoGraveyard||[]);const rec=getAcolyteEligibleCorpses(live,grave).find(r=>r.graveId===choice?.graveId);const cell=getAcolyteResurrectionCells(live,out).find(c=>c.x===Number(choice?.x)&&c.y===Number(choice?.y));if(!rec||!cell)return{success:false,reason:"El cadáver o la casilla ya no están disponibles."};let revived=makeAcolyteResurrectedUnit(live,rec,cell);if(ownerHasUnit(live.owner===1?2:1,"yi_sun_sin",out))revived={...revived,tempDexDebuff:Number(revived.tempDexDebuff||0)+4,tempGuardBuff:Number(revived.tempGuardBuff||0)-4,yiSunDebuffed:true};out=out.map(u=>u.id===live.id?{...u,acted:true}:u).concat(revived);const lion=applyAfricanLionFearAura(out);out=lion.units;const nextGrave=grave.map(r=>r.graveId===rec.graveId?{...r,used:true,usedByAcolyteId:live.id,usedTurnKey:publicState?.turnKey||""}:r);log=`${live.name} usa Resurrección: ${rec.name} vuelve con ${revived.hp}/${revived.maxHp} Vida, sin debuffs y como invocada desde la mano. Puede actuar este turno.${lion.logs.length?` ${lion.logs.join(" ")}`:""}`;battleFxEvent=makeMagicFxEvent(live,revived,"heal",{type:"heal",spellKey:"acolyte_resurrect",effectAction:"resurrect",impactScale:1.25,hit:true});return{success:true,units:out,log,honorCost:4,serviceGain:1,erictoGraveyard:nextGrave,battleFxEvent,statusFxEvent:lion.statusFxEvent||makeStatusFxEvent("heal",revived,revived.hp),floatFxEvent:lion.floatFxEvent||makeFloatFxEvent("heal",revived,revived.hp,{iconText:"✚",labelText:"REGRESA"})};
  }
  return{success:false,reason:"Capacidad curativa inválida."};
}
function chooseSmartAcolyteChoice(caster,units=publicState?.units||[],graveyard=publicState?.erictoGraveyard||[],honor=0){
  const points=getUnitServicePoints(caster);
  if(points>=100&&honor>=4){
    const corpses=getAcolyteEligibleCorpses(caster,graveyard);
    const cells=getAcolyteResurrectionCells(caster,units);
    if(corpses.length&&cells.length){
      const rec=[...corpses].sort((a,b)=>(Number(b.battlePower)||0)-(Number(a.battlePower)||0))[0];
      const enemyLeader=(units||[]).find(u=>u.owner!==caster.owner&&u.leader&&u.hp>0);
      const cell=[...cells].sort((a,b)=>enemyLeader?dist(a,enemyLeader)-dist(b,enemyLeader):0)[0];
      return {technique:"resurrect",graveId:rec.graveId,x:cell.x,y:cell.y,cost:4,score:170+(Number(rec.battlePower)||0)};
    }
  }
  const wounded=getAcolyteTransferTargets(caster,units).filter(t=>t.owner===caster.owner);
  if(honor>=2&&wounded.length){
    const target=[...wounded].sort((a,b)=>(effectiveMaxHp(b)-b.hp)-(effectiveMaxHp(a)-a.hp)||getUnitBattlePower(b)-getUnitBattlePower(a))[0];
    return {technique:"transfer",targetId:target.id,cost:2,score:100+(effectiveMaxHp(target)-target.hp)*25};
  }
  if(points>=50&&honor>=3){
    const targets=getAcolytePurifyTargets(caster,units);
    if(targets.length){
      const target=[...targets].sort((a,b)=>getAcolytePurifiableStatuses(b).length-getAcolytePurifiableStatuses(a).length||getUnitBattlePower(b)-getUnitBattlePower(a))[0];
      const status=getAcolytePurifiableStatuses(target)[0];
      return {technique:"purify",targetId:target.id,statusKey:status.key,cost:3,score:110+getAcolytePurifiableStatuses(target).length*15};
    }
  }
  const enemies=getAcolyteTransferTargets(caster,units).filter(t=>t.owner!==caster.owner);
  if(honor>=2&&enemies.length){
    const target=[...enemies].sort((a,b)=>Number(a.hp||0)-Number(b.hp||0)||getUnitBattlePower(b)-getUnitBattlePower(a))[0];
    return {technique:"transfer",targetId:target.id,cost:2,score:Number(target.hp||0)<=1?145:55};
  }
  return null;
}
async function spendUnitEffectHonor(cost){
  const amount=Math.max(0,Number(cost||0));const maxHonor=capResourceMax(privateState?.maxHonor||0);const current=capResourceAmount(privateState?.honor||0,maxHonor);if(current<amount)return false;const honor=current-amount;await updatePrivate({honor,maxHonor});await updatePublic({[`playerStats/${myPlayer}`]:{...(publicState?.playerStats?.[myPlayer]||{}),hp:getLeader(myPlayer)?.hp||0,honor,maxHonor,deck:(privateState?.deck||[]).length,hand:(privateState?.hand||[]).length}});pulseTurnHonorHud();return true;
}
function getUnitEffectMode(u){
  if(!u)return "passive";
  if(u.leader&&u.leaderType==="cavalry"&&getLeaderAbilityForOwner(u.owner)==="cavalry_call")return "self";
  if(u.leader&&u.leaderType==="archer"&&getLeaderAbilityForOwner(u.owner)==="arrow_rain")return "self";
  if(u.leader&&u.leaderType==="mage"&&getLeaderAbilityForOwner(u.owner)==="arcane_bolt")return "self";
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
  const template=(CARD_TEMPLATES||[]).find(c=>c.key==="cavalry")||{key:"cavalry",assetKey:"cavalry_light",assetBucket:"basic",name:"Caballería ligera",type:"unit",icon:"🐎",portrait:CARD_PORTRAITS.cavalry,cost:2,hp:5,atk:4,guard:3,dex:4,agi:2,mov:3,range:1,text:"Carga desestabilizadora."};
  const card=makeCard({...template,assetKey:"cavalry_light",assetBucket:"basic"},owner);
  const token=makeUnit({...card,summonOrigin:"field_effect",fieldGeneratedSummon:true,tokenSummon:true},x,y);
  return {...token,assetKey:"cavalry_light",assetBucket:"basic",boardPortrait:"assets/board_cards/basic/cavalry_light.webp",fieldFigure:"assets/field_figures/basic/cavalry_light.webp",tokenSummon:true};
}
function getEffectTargetOptions(caster,units=publicState?.units||[]){
  if(!caster)return[];
  const owner=caster.owner;
  if(caster.leader&&caster.leaderType==="cavalry"&&getLeaderAbilityForOwner(owner,units)==="cavalry_call"){
    if(caster.cavalryCallUsedTurn)return[];
    return getAdjacentFreeCells(caster,units).length?[caster]:[];
  }
  if(caster.leader&&caster.leaderType==="archer"&&getLeaderAbilityForOwner(owner,units)==="arrow_rain"){
    if(caster.arrowRainUsedTurn)return[];
    return (units||[]).some(it=>it.owner!==owner&&!it.leader&&it.hp>0)?[caster]:[];
  }
  if(caster.leader&&caster.leaderType==="mage"&&getLeaderAbilityForOwner(owner,units)==="arcane_bolt"){
    if(caster.arcaneBoltUsedTurn)return[];
    return (units||[]).some(it=>it.owner!==owner&&it.leader&&it.hp>0)?[caster]:[];
  }
  if(caster.leader&&caster.leaderType==="beastmaster"&&getLeaderAbilityForOwner(owner,units)==="prepare_hunt"){
    return[];
  }
  if(caster.key==="african_lion"){return [caster];}
  if(caster.key==="black_raven"){return [caster];}
  if(caster.key==="ericto"){
    if(caster.erictoUsedTurnKey===publicState?.turnKey)return[];
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
    if(caster.sunTzuUsedTurn)return[];
    return units.filter(a=>a.owner===owner&&a.id!==caster.id);
  }
  if(caster.key==="subotai"){
    if(caster.subotaiUsedTurn)return[];
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
  let out=[...(units||[])],log="",battleFxEvent=null;
  if(liveCaster.leader&&liveCaster.leaderType==="mage"&&getLeaderAbilityForOwner(owner,units)==="arcane_bolt"){
    if(liveCaster.arcaneBoltUsedTurn)return{success:false,reason:"Descarga arcana ya fue usada este turno."};
    const enemyLeader=out.find(it=>it.owner!==owner&&it.leader&&it.hp>0);
    if(!enemyLeader)return{success:false,reason:"No hay líder enemigo válido para Descarga arcana."};
    out=out.map(it=>{
      if(it.id===liveCaster.id)return{...it,acted:true,arcaneBoltUsedTurn:true};
      if(it.id===enemyLeader.id)return resolveBlessedArmorTransition(it,{...it,hp:(it.hp||0)-2,damagedThisTurn:true});
      return it;
    });
    out=applyLegendaryFatalSaves(out,[enemyLeader.id]);
    out=out.filter(it=>it.hp>0);
    battleFxEvent=makeMagicFxEvent(liveCaster,out.find(it=>it.id===enemyLeader.id)||enemyLeader,"arcane",{type:"spell",spellKey:"arcane_bolt",effectAction:"damage",impactScale:1.15,hit:true});
    log=`${liveCaster.name} lanza Descarga arcana: inflige 2 de daño directo al líder enemigo, ignorando Guardia y stats.`;
  }else if(liveCaster.leader&&liveCaster.leaderType==="archer"&&getLeaderAbilityForOwner(owner,units)==="arrow_rain"){
    if(liveCaster.arrowRainUsedTurn)return{success:false,reason:"Lluvia de flechas ya fue usada este turno."};
    const enemyIds=out.filter(it=>it.owner!==owner&&!it.leader&&it.hp>0).map(it=>it.id);
    if(!enemyIds.length)return{success:false,reason:"No hay unidades enemigas válidas para Lluvia de flechas."};
    const beforeRain=[...out];
    out=out.map(it=>{
      if(it.id===liveCaster.id)return{...it,acted:true,arrowRainUsedTurn:true};
      if(enemyIds.includes(it.id))return applyDirectHpDamageWithEquipment(it,1).unit;
      return it;
    });
    out=applyLegendaryFatalSaves(out,enemyIds);
    out=out.filter(it=>it.hp>0);
    const bloodVictoryResult=applyBloodVictoryForDeaths(beforeRain,out);
    out=bloodVictoryResult.units;
    log=`${liveCaster.name} lanza Lluvia de flechas: inflige 1 daño directo a ${enemyIds.length} unidad${enemyIds.length===1?"":"es"} enemiga${enemyIds.length===1?"":"s"}.${bloodVictoryResult.logs.length?` ${bloodVictoryResult.logs.join(" ")}`:""}`;
  }else if(liveCaster.leader&&liveCaster.leaderType==="cavalry"&&getLeaderAbilityForOwner(owner,units)==="cavalry_call"){
    if(liveCaster.cavalryCallUsedTurn)return{success:false,reason:"El Llamado de la carga ya fue usado este turno."};
    const spots=getAdjacentFreeCells(liveCaster,out).slice(0,3);
    if(!spots.length)return{success:false,reason:"No hay espacio junto al líder para convocar Caballería Ligera."};
    const tokens=spots.map(s=>makeLightCavalryToken(owner,s.x,s.y));
    out=out.map(it=>it.id===liveCaster.id?{...it,acted:true,cavalryCallUsedTurn:true}:it).concat(tokens);
    log=`${liveCaster.name} activa Llamado de la carga: convoca ${tokens.length} Caballería${tokens.length===1?" Ligera":"s Ligeras"} junto a él.`;
  }else if(liveCaster.leader&&liveCaster.leaderType==="beastmaster"&&getLeaderAbilityForOwner(owner,units)==="prepare_hunt"){
    return{success:false,reason:"Veneno de la Manada es una habilidad pasiva."};
  }else if(liveCaster.key==="african_lion"){
    const rev=revealStealthInRadius(out,owner,liveCaster,3,"Rugido del Rey");out=rev.units.map(it=>it.id===liveCaster.id?{...it,acted:true}:it);log=`${liveCaster.name} usa Rugido del Rey y revela ${rev.count} unidad${rev.count===1?"":"es"} con Sigilo.`;
  }else if(liveCaster.key==="black_raven"){
    const rev=revealStealthInRadius(out,owner,liveCaster,2,"Ojo del Cazador");out=rev.units.map(it=>it.id===liveCaster.id?{...it,acted:true}:it);log=`${liveCaster.name} usa Ojo del Cazador y revela ${rev.count} unidad${rev.count===1?"":"es"} con Sigilo.`;
  }else if(liveCaster.key==="ericto"){
    if(liveCaster.erictoUsedTurnKey===publicState?.turnKey)return{success:false,reason:"Ericto ya usó Necromancia de Farsalia este turno."};
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
    const nextGraveyard=graveyard.map(r=>r.graveId===record.graveId?{...r,used:true,usedByErictoId:liveCaster.id,usedTurnKey:publicState?.turnKey||""}:r);
    out=out.map(it=>it.id===liveCaster.id?{...it,acted:true,erictoUsedTurnKey:publicState?.turnKey||""}:it).concat(revived);
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
    out=out.map(it=>it.id===target.id?{...it,tempDexBuff:(it.tempDexBuff||0)+4,tempGuardBuff:(it.tempGuardBuff||0)+4}:it.id===liveCaster.id?{...it,acted:true,sunTzuUsedTurn:true}:it);
    log=`${liveCaster.name} activa Arte de la Guerra: ${target.name} gana +4 Destreza y +4 Guardia temporal hasta su próximo turno.`;
  }else if(liveCaster.key==="subotai"){
    out=out.map(it=>it.id===target.id?{...it,tempMovBuff:(it.tempMovBuff||0)+2}:it.id===liveCaster.id?{...it,acted:true,subotaiUsedTurn:true}:it);
    log=`${liveCaster.name} activa Marcha de Mil Horizontes: ${target.name} gana +2 Movimiento este turno.`;
  }else{
    return{success:false,reason:"Este efecto es pasivo o se activa automáticamente durante combate/turno."};
  }
  return{success:true,units:out,log,battleFxEvent};
}
async function activateUnitEffect(u,choice=null){
  if(!u||u.owner!==myPlayer||!isUnitActionWindow(u))return setHint(unitActionPhaseHint("EFFECT"));
  if(u.acted)return setHint(`${u.name} ya usó su acción este turno.`);
  const mode=getUnitEffectMode(u);
  if(mode==="passive")return setHint("Este efecto es pasivo o se activa automáticamente durante combate/turno.");
  let units=[...(publicState.units||[])];
  if(u.key==="acolyte_healer"){
    if(!choice){
      const honor=Math.max(0,Number(privateState?.honor||0));
      const technique=await chooseAcolyteTechnique(u,units,honor,publicState?.erictoGraveyard||[]);
      if(!technique)return setHint("EFFECT de la Acólita cancelado.");
      if(technique==="resurrect"){
        choice=await chooseAcolyteResurrectionChoice(u,units,publicState?.erictoGraveyard||[]);
        if(!choice)return setHint("Resurrección cancelada.");
      }else{
        const opts=technique==="purify"?getAcolytePurifyTargets(u,units):getAcolyteTransferTargets(u,units);
        if(!opts.length)return setHint("No hay objetivos válidos para esa capacidad.");
        selectedUnitEffectChoice=technique;
        selectedUnitId=u.id;
        selectedUnitActionMode="effect";
        highlights=opts.map(t=>`${t.x},${t.y}`);
        highlightType=technique==="transfer"?"move":"move";
        setHint(technique==="purify"?"Purificación: elige un aliado marcado; después escogerás qué estado eliminar.":"Transferencia vital: elige un aliado herido para curar 1 o un enemigo visible para causar 1 daño directo.");
        render();
        return;
      }
    }
    if(choice?.technique==="purify"&&!choice.statusKey){
      const target=units.find(it=>it.id===choice.targetId);
      if(!target)return setHint("El objetivo ya no está disponible.");
      const statusKey=await chooseAcolytePurificationStatus(target);
      if(!statusKey)return setHint("Purificación cancelada.");
      choice={...choice,statusKey};
    }
    const previewCost=ACOLYTE_HEALER_EFFECT_COSTS[String(choice?.technique||"")]||0;
    if(Number(privateState?.honor||0)<previewCost)return setHint(`No tienes ${getResourceLabel(myPlayer)} suficiente para esa capacidad.`);
    let result=applyAcolyteHealerEffectState(u,choice,units);
    if(!result.success)return setHint(result.reason||"No se pudo usar la capacidad curativa.");
    if(!(await spendUnitEffectHonor(result.honorCost)))return setHint(`No tienes ${getResourceLabel(myPlayer)} suficiente.`);
    const beforePoints=getUnitServicePoints(u);
    const serviceResult=registerLocalUnitServicePoint(u,result.serviceGain||1)||{key:getUnitMasteryKey(u),name:u.name,beforePoints,afterPoints:beforePoints+(result.serviceGain||1),gain:result.serviceGain||1,unlockedPurification:beforePoints<50&&beforePoints+(result.serviceGain||1)>=50,unlockedResurrection:beforePoints<100&&beforePoints+(result.serviceGain||1)>=100};
    result.units=applyUnitServicePointsToUnits(result.units,u,serviceResult);
    result.log+=` Puntos de servicio: ${serviceResult.afterPoints}.${unitServiceUnlockText(serviceResult)}`;
    await updatePublic({units:result.units,erictoGraveyard:result.erictoGraveyard||publicState?.erictoGraveyard||[],battleFxEvent:result.battleFxEvent||null,statusFxEvent:result.statusFxEvent||null,floatFxEvent:result.floatFxEvent||null,_clockKillCreditOwner:result.clockKillCreditOwner||myPlayer});
    await pushLog(result.log);
    clearSelection();
    return;
  }
  if(u.key==="ericto"&&!choice){
    const opts=getEffectTargetOptions(u,units);
    if(!opts.length){
      const max=getErictoMaxReanimated(u),current=getErictoLinkedReanimated(u,units).length;
      if(current>=max)return setHint(`Ericto ya controla el máximo de ${max} reanimado${max===1?"":"s"} para su rango.`);
      if(!getAdjacentFreeCells(u,units).length)return setHint("Ericto necesita una celda libre adyacente para reanimar.");
      return setHint("No hay cadáveres disponibles: cada unidad solo puede reanimarse una vez por duelo.");
    }
    choice=await chooseErictoReanimationChoice(u,units,publicState?.erictoGraveyard||[]);
    if(!choice)return setHint("Necromancia cancelada.");
  }
  if(mode==="target"&&!choice){
    const opts=getEffectTargetOptions(u,units);
    if(!opts.length)return setHint(u.key==="saladin"?"Saladino necesita una casilla adyacente libre y no controlar otra Caballería Arquera.":"No hay objetivo válido para este EFFECT.");
    highlights=opts.map(t=>`${t.x},${t.y}`);
    highlightType=u.key==="saladin"?"summon":"move";
    selectedUnitId=u.id;
    selectedUnitActionMode="effect";
    setHint(u.key==="saladin"?"EFFECT: elige una casilla libre adyacente para invocar la Caballería Arquera.":`EFFECT: elige el aliado que recibirá ${u.name}.`);
    render();
    return;
  }
  const result=applyUnitEffectState(u,choice,units);
  if(!result.success)return setHint(result.reason||"No se pudo activar el efecto.");
  if(getBattleOutcome(result.units).ended&&result.battleFxEvent)await updatePublic({battleFxEvent:result.battleFxEvent});
  if(await finalizeBattle(result.units,result.log)){clearSelection();return;}
  await updatePublic({units:result.units,erictoGraveyard:result.erictoGraveyard||publicState?.erictoGraveyard||[],beastTraps:result.beastTraps||publicState.beastTraps||[],battleFxEvent:result.battleFxEvent||null});
  await pushLog(result.log);
  clearSelection();
}


/*
-------------------------------------------------------------------------------
11_COMBAT_ENGINE_DEF_ENTRY
-------------------------------------------------------------------------------
*/
// DEF limpio: estado lógico solamente.
// No debe crear defenseFxEvent ni floatFxEvent.
// Esto evita el óvalo/bloque gigante que se generaba en la capa FX.
async function activateDefenseStance(u){
  if(!u||u.owner!==myPlayer||!isMyTurn())return setHint("Solo puedes usar DEF con tus invocaciones.");
  if(!isUnitActionWindow(u))return setHint(unitActionPhaseHint("DEF"));
  if(u.acted)return setHint(`${u.name} ya usó su acción ofensiva este turno.`);
  if(u.defenseModeReady)return setHint(`${u.name} ya está en guardia defensiva.`);
  if(u.noDefTurnKey&&u.noDefTurnKey===publicState?.turnKey)return setHint(`${u.name} no puede defenderse este turno.`);
  const units=(publicState?.units||[]).map(it=>it.id===u.id?{...it,acted:true,defenseModeReady:true,mulanExecutionChoiceReady:false,mulanExecutionMoveReady:false}:it);
  clearSelection();
  await updatePublic({
    units,
    defenseFxEvent:null,
    floatFxEvent:null
  });
  await pushLog(`J${myPlayer} pone a ${u.name} en Guardia defensiva: +2 Guardia y el primer ataque que reciba tiene -10% precisión. Dura hasta recibir ese ataque o hasta el inicio de su próximo turno.`);
}
function handleUnitContextAction(action){
  const u=unitContextSelection?getUnit(unitContextSelection.unitId):null;
  if(!u)return hideUnitContextMenu();
  if(action==="det"){
    hideUnitContextMenu();
    showUnit(u);
    return;
  }
  if(isBattleEnded())return setHint("La batalla ya terminó.");
  if(!isMyTurn()||u.owner!==myPlayer)return setHint("Solo puedes usar acciones de tus invocaciones.");
  if(action==="mov"&&!isUnitMoveWindow(u))return setHint(unitActionPhaseHint("MOV"));
  if((action==="attk"||action==="effect")&&!isUnitActionWindow(u))return setHint(unitActionPhaseHint(action.toUpperCase()));
  if(action==="def"&&!isUnitActionWindow(u))return setHint(unitActionPhaseHint("DEF"));
  if(action==="def"&&u.noDefTurnKey&&u.noDefTurnKey===publicState?.turnKey)return setHint(`${u.name} no puede defenderse este turno.`);
  selectedCard=null;
  selectedUnitId=u.id;
  selectedUnitActionMode=action;
  unitContextSelection=null;
  hideUnitContextMenu();
  if(action==="mov"){
    if(u.acted)return setHint(`${u.name} ya usó su acción este turno. Puede moverse antes de DEF/ATTK/EFFECT, pero no después.`);
    if(u.moved)return setHint(`${u.name} ya se movió este turno.`);
    highlights=moveZones(u);
    highlightType="move";
    setHint(`MOV: elige una casilla verde para mover a ${u.name}.`);
  }else if(action==="attk"){
    const live=getLiveUnitRef(u);
    if(live.acted)return setHint(`${live.name} ya atacó o defendió este turno.`);
    highlights=attackZones(live);
    highlightType="attack";
    if(!highlights.length){
      const rg=getUnitAttackRange(live);
      setHint(`ATTK: ${live.name} está listo para atacar, pero no tiene enemigos dentro de RG ${rg}.`);
    }else{
      setHint(`ATTK: elige un objetivo rojo para atacar con ${live.name}.`);
    }
  }else if(action==="def"){
    activateDefenseStance(u);
    return;
  }else if(action==="effect"){
    activateUnitEffect(u);
    return;
  }
  render();
}
