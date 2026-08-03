"use strict";
/* HallValla 7BOARDCTRL8U · Interacción de tablero y efectos de unidad */


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
  window.addEventListener("pointermove",handleBoardDragMove,true);
  window.addEventListener("pointerup",handleBoardDragEnd,true);
  window.addEventListener("pointercancel",handleBoardDragCancel,true);
  return true;
}
function startHandCardBoardDrag(ev,card,sourceEl){
  if(!card||card.type!=="unit")return false;
  const playState=getCardPlayState(card);
  if(!playState.canPlay)return false;
  boardDragState={kind:"hand-unit",cardId:card.id,pointerId:ev.pointerId,startX:ev.clientX,startY:ev.clientY,dragging:false,sourceEl};
  window.addEventListener("pointermove",handleBoardDragMove,true);
  window.addEventListener("pointerup",handleBoardDragEnd,true);
  window.addEventListener("pointercancel",handleBoardDragCancel,true);
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
    unitContextSelection=null;
    hideUnitContextMenu();
    dragMoveHighlights=getDragUnitMoveKeys(u);
    dragAttackHighlights=getDragUnitAttackKeys(u);
    dragSummonHighlights=[];
    setHint(`${u.name}: arrastra a una casilla verde para mover o sobre un rival rojo para atacar.`);
    boardDragGhost=makeBoardDragGhost(boardDragState.sourceEl,u.name);
    render();
  }else if(boardDragState.kind==="hand-unit"){
    const card=(privateState?.hand||[]).find(c=>c.id===boardDragState.cardId);
    if(!card){handleBoardDragCancel();return;}
    selectedCard=card;
    selectedUnitId=null;
    selectedUnitActionMode=null;
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
  window.removeEventListener("pointermove",handleBoardDragMove,true);
  window.removeEventListener("pointerup",handleBoardDragEnd,true);
  window.removeEventListener("pointercancel",handleBoardDragCancel,true);
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
  window.removeEventListener("pointermove",handleBoardDragMove,true);
  window.removeEventListener("pointerup",handleBoardDragEnd,true);
  window.removeEventListener("pointercancel",handleBoardDragCancel,true);
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
  if(boardSelectedCellTimer)clearTimeout(boardSelectedCellTimer);
  boardSelectedCellTimer=setTimeout(()=>{
    if(boardSelectedCellKey===getBoardCellKey(x,y)){
      boardSelectedCellKey="";
      updateBoardAimClasses();
    }
  },1200);
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
function getLegacyBoardPortraitPath(portrait){
  const raw=String(portrait||"");
  if(!raw)return raw;
  if(raw.includes("assets/cards/"))return raw.replace("assets/cards/","assets/board_cards/");
  return raw;
}

function getBoardPortraitPath(portrait,unitKey=""){
  const key=String(unitKey||"").trim().toLowerCase();
  return BOARD_PORTRAITS[key]||getLegacyBoardPortraitPath(portrait);
}

function getBoardPortraitFallbackPath(portrait,unitKey=""){
  const primary=getBoardPortraitPath(portrait,unitKey);
  const legacy=getLegacyBoardPortraitPath(portrait);
  /* Para retratos explícitos, el primer respaldo sigue siendo otro arte de tablero,
     nunca la carta de mano. El resto conserva el comportamiento anterior. */
  return primary!==legacy?legacy:String(portrait||"");
}

function getUnitPortraitHtml(u,depthLayer=false){
  if(isStealthedUnit(u)&&u.owner!==myPlayer)return `<span class="stealth-silhouette">?</span>`;
  const portrait=(u?.leader&&u?.leaderType&&LEADER_DATA[u.leaderType])?LEADER_DATA[u.leaderType].portrait:u?.portrait;
  if(portrait){
    const alt=escapeHtml(u.name||"Unidad");
    if(depthLayer){
      const boardPortrait=getBoardPortraitPath(portrait,u?.key);
      const boardFallback=getBoardPortraitFallbackPath(portrait,u?.key);
      const safeOriginal=String(boardFallback).replace(/&/g,"&amp;").replace(/"/g,"&quot;");
      return `<div class="unit-depth-stack"><img class="unit-depth-front board-cropped-art" src="${boardPortrait}" alt="${alt}" onerror="this.onerror=null;this.src='${safeOriginal}'"></div>`;
    }
    return `<img src="${portrait}" alt="${alt}">`;
  }
  return `<span>${u?.icon||"✦"}</span>`;
}

function getBoardUnitPortraitHtml(u){
  if(isStealthedUnit(u)&&u.owner!==myPlayer)return `<span class="stealth-silhouette">?</span>`;
  const portrait=(u?.leader&&u?.leaderType&&LEADER_DATA[u.leaderType])?LEADER_DATA[u.leaderType].portrait:u?.portrait;
  if(portrait){
    const alt=escapeHtml(u.name||"Unidad");
    const boardPortrait=getBoardPortraitPath(portrait,u?.key);
    const boardFallback=getBoardPortraitFallbackPath(portrait,u?.key);
    const safeOriginal=String(boardFallback).replace(/&/g,"&amp;").replace(/"/g,"&quot;");
    return `<div class="unit-portrait-stack"><img class="unit-card-bg-layer" src="${boardPortrait}" alt="" aria-hidden="true" onerror="this.onerror=null;this.src='${safeOriginal}'"><img class="unit-card-character-layer" src="${boardPortrait}" alt="${alt}" onerror="this.onerror=null;this.src='${safeOriginal}'"></div>`;
  }
  return `<span>${u?.icon||"✦"}</span>`;
}

function showUnit(u){
  if(!u)return;
  const inspector=$("inspector");
  if(inspector)inspector.className=`inspector ${getCardVisualClass(u)}`;
  $("inspectTitle").textContent=getEntityFullDisplayName(u);
  updateDetBattlePowerBadge($("inspectBattlePowerBadge"),u);
  $("inspectSub").innerHTML=renderDetIdentityHtml(u,u.owner===myPlayer?"Tu unidad":"Unidad rival");
  $("inspectArt").innerHTML=getUnitPortraitHtml(u);
  const stats=[["HP",`${getDisplayHp(u)}/${effectiveMaxHp(u)}`],["AT",effectiveAtk(u)],["GD",displayEffectiveGuard(u)],["DX",effectiveDex(u)],["AGI",effectiveAgi(u)],["MV",effectiveMov(u)],["RG",getUnitAttackRange(u)]];
  const inspectStatsEl=$("inspectStats");
  inspectStatsEl.innerHTML=renderDetStatButtons(stats,"inspect-stat");
  bindStatGuideClicks(inspectStatsEl);
  const fx=getUnitEffectText(u);
  const activeEntries=getUnitStatusEntries(u);
  const inspectTextEl=$("inspectText");
  inspectTextEl.innerHTML=`${renderDetAbilitiesHtml(u,fx)}${renderDetStatusesHtml(activeEntries,u)}${renderDetQuoteHtml(u)}${detailGuideButtonsHtml({showEffect:shouldShowEffectGuideButton(u,fx),showWeapon:true,showFormula:true,showLore:true,effectLabel:u.leader?'Ver líder':'Ver efecto',entity:u})}`;
  inspector._hvInspectedEntity=u;
  inspector._hvActiveStatuses=activeEntries;
  inspector._hvEffectText=fx;
  inspector._hvEffectTitle=`✦ Efecto de ${u.name}`;
  bindInspectorDetModalDelegation(inspector);
  bindEntityGuideButtons(inspectTextEl,u,{effectText:fx,effectTitle:`Efecto de ${u.name}`,statuses:activeEntries});
  bindStatusGuideDelegation(inspectTextEl,u,()=>activeEntries);
  applyRarityClassToElement(inspector,u);
  inspector.classList.add("show");
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
  unitContextSelection={unitId:u.id,x,y};
  selectedCard=null;
  selectedUnitId=u.id;
  selectedUnitActionMode=null;
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
  const options=getUnitContextOptions(u);
  const canMove=isMyTurn()&&u.owner===myPlayer&&isUnitMoveWindow(u)&&!isBattleEnded();
  const canAction=isMyTurn()&&u.owner===myPlayer&&isUnitActionWindow(u)&&!isBattleEnded();
  const slotMap={mov:"slot-top",def:"slot-left",effect:"slot-left-bottom",attk:"slot-right",det:"slot-bottom"};
  const portraitHtml=getUnitPortraitHtml(u);
  const hpLabel=String(getDisplayHp(u));
  const atkLabel=effectiveAtk(u);
  const guardLabel=displayEffectiveGuard(u);
  menu.innerHTML=`<div class="unit-context-star-shell"><div class="unit-context-core"><div class="unit-context-portrait">${portraitHtml}</div><div class="unit-context-mini-stats"><span>${hpLabel}</span><span>${atkLabel}</span><span>${guardLabel}</span></div><div class="unit-context-name">${escapeHtml(u.name||"Invocación")}</div><div class="unit-context-sub">${u.leader?"Líder":"Invocación"} · J${u.owner}</div></div>${options.map(o=>{
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
    requestAnimationFrame(()=>{
      const rect=menu.getBoundingClientRect();
      const margin=10;
      const vw=window.innerWidth||document.documentElement.clientWidth||0;
      const vh=window.innerHeight||document.documentElement.clientHeight||0;
      const clampedLeft=Math.min(Math.max(left,rect.width/2+margin),Math.max(rect.width/2+margin,vw-rect.width/2-margin));
      const clampedTop=Math.min(Math.max(top,rect.height/2+margin),Math.max(rect.height/2+margin,vh-rect.height/2-margin));
      menu.style.left=`${clampedLeft}px`;
      menu.style.top=`${clampedTop}px`;
    });
  }
  menu.classList.remove("hidden");
  menu.querySelectorAll(".unit-context-btn").forEach(btn=>btn.addEventListener("click",ev=>{
    ev.stopPropagation();
    handleUnitContextAction(btn.dataset.action);
  }));
}

function getUnitEffectMode(u){
  if(!u)return "passive";
  if(u.leader&&u.leaderType==="cavalry"&&getLeaderAbilityForOwner(u.owner)==="cavalry_call")return "self";
  if(u.leader&&u.leaderType==="archer"&&getLeaderAbilityForOwner(u.owner)==="arrow_rain")return "self";
  if(u.leader&&u.leaderType==="mage"&&getLeaderAbilityForOwner(u.owner)==="arcane_bolt")return "self";
  if(u.leader&&u.leaderType==="beastmaster"&&getLeaderAbilityForOwner(u.owner)==="prepare_hunt")return "passive";
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
  const template=(CARD_TEMPLATES||[]).find(c=>c.key==="cavalry")||{key:"cavalry",name:"Caballería ligera",type:"unit",icon:"🐎",portrait:CARD_PORTRAITS.cavalry,cost:2,hp:5,atk:4,guard:3,dex:4,agi:2,mov:3,range:1,text:"Carga desestabilizadora."};
  return makeUnit(makeCard(template,owner),x,y);
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
  let out=[...(units||[])],log="";
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
    log=`${liveCaster.name} lanza Descarga arcana: inflige 2 de daño directo al líder enemigo, ignorando Guardia y stats.`;
  }else if(liveCaster.leader&&liveCaster.leaderType==="archer"&&getLeaderAbilityForOwner(owner,units)==="arrow_rain"){
    if(liveCaster.arrowRainUsedTurn)return{success:false,reason:"Lluvia de flechas ya fue usada este turno."};
    const enemyIds=out.filter(it=>it.owner!==owner&&!it.leader&&it.hp>0).map(it=>it.id);
    if(!enemyIds.length)return{success:false,reason:"No hay unidades enemigas válidas para Lluvia de flechas."};
    const beforeRain=[...out];
    out=out.map(it=>{
      if(it.id===liveCaster.id)return{...it,acted:true,arrowRainUsedTurn:true};
      if(enemyIds.includes(it.id))return {...it,hp:(it.hp||0)-1,damagedThisTurn:true};
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
    const token=makeUnit(makeCard(SALADIN_TOKEN_CARD,owner),target.x,target.y);
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
  return{success:true,units:out,log};
}
async function activateUnitEffect(u,choice=null){
  if(!u||u.owner!==myPlayer||!isUnitActionWindow(u))return setHint(unitActionPhaseHint("EFFECT"));
  if(u.acted)return setHint(`${u.name} ya usó su acción este turno.`);
  const mode=getUnitEffectMode(u);
  if(mode==="passive")return setHint("Este efecto es pasivo o se activa automáticamente durante combate/turno.");
  let units=[...(publicState.units||[])];
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
  if(await finalizeBattle(result.units,result.log)){clearSelection();return;}
  await updatePublic({units:result.units,erictoGraveyard:result.erictoGraveyard||publicState?.erictoGraveyard||[],beastTraps:result.beastTraps||publicState.beastTraps||[]});
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