"use strict";
/* HallValla 7BOARDCTRL8AD · Render de batalla, HUD y tutorial */



/*
-------------------------------------------------------------------------------
09_RENDER_CORE
-------------------------------------------------------------------------------
*/
function render(){if(!publicState)return;syncBoardDimensionsFromState(publicState);if(Array.isArray(publicState.units))publicState={...publicState,units:syncLeaderHpBonuses(publicState.units)};syncHandAutoClose();scheduleAutoAdvanceIfNoPlayableHand();scheduleAutoAdvanceIfFieldActionsExhausted();renderHud();renderTurnTimerHud();renderTurnHonorHud();renderRivalHonorHud();renderBoard();renderUnitContextMenu();renderHand();renderLog();renderDetail();renderBattleChrome();if(publicState.mode==="tutorial")renderBasicTutorialCoach();if(publicState.mode==="adventure"&&publicState.currentPlayer!==myPlayer&&publicState.aiActionText)setHint(publicState.aiActionText);const hb=$("handBtn");if(hb)hb.classList.toggle("selected",handOpen);maybeShowPhaseAnnouncement();maybeShowHonorRecharge();maybeShowBattleResult()}function renderBattleChrome(){const battlefield=document.querySelector(".battlefield");if(battlefield)battlefield.classList.toggle("hand-open",!!handOpen);const side=document.querySelector(".side");if(side)side.classList.toggle("actions-collapsed",!!actionsCollapsed);const btn=$("toggleActionsBtn");if(btn){btn.textContent=actionsCollapsed?"Acciones ▴":"Acciones ▾";btn.setAttribute("aria-expanded",String(!actionsCollapsed));}const mobileActionsBtn=$("mobileToggleActionsBtn");if(mobileActionsBtn){mobileActionsBtn.textContent=actionsCollapsed?"Acciones ▴":"Acciones ▾";mobileActionsBtn.setAttribute("aria-expanded",String(!actionsCollapsed));}const sound=$("battleToggleSoundBtn");if(sound)sound.textContent=gameSettings.sound?"Audio general: ON":"Audio general: OFF";const musicBtn=$("battleToggleMusicBtn");if(musicBtn)musicBtn.textContent=gameSettings.music?"Música: ON":"Música: OFF";const sfxBtn=$("battleToggleSfxBtn");if(sfxBtn)sfxBtn.textContent=gameSettings.sfx?"Efectos: ON":"Efectos: OFF";const musicSlider=$("battleMusicVolume");const musicValue=$("battleMusicVolumeValue");const musicPct=getVolumePercent(gameSettings.musicVolume,.32);if(musicSlider){musicSlider.value=String(musicPct);musicSlider.disabled=!gameSettings.sound||!gameSettings.music;}if(musicValue)musicValue.textContent=`${musicPct}%`;const sfxSlider=$("battleSfxVolume");const sfxValue=$("battleSfxVolumeValue");const sfxPct=getVolumePercent(gameSettings.sfxVolume,.58);if(sfxSlider){sfxSlider.value=String(sfxPct);sfxSlider.disabled=!gameSettings.sound||!gameSettings.sfx;}if(sfxValue)sfxValue.textContent=`${sfxPct}%`;}

function getHonorStateForOwner(owner,{preferPrivate=false}={}){
  if(!publicState||!owner)return{owner:0,honor:0,maxHonor:0,label:"HONOR",hidden:true};
  const st=publicState.playerStats?.[owner]||{};
  const canUsePrivate=preferPrivate&&owner===myPlayer&&privateState;
  const privateHonor=canUsePrivate?Number(privateState.honor||0):null;
  const privateMax=canUsePrivate?Number(privateState.maxHonor||0):null;
  const rawMax=privateMax!==null?privateMax:Number(st.maxHonor||0);
  const maxHonor=capResourceMax(rawMax);
  const rawHonor=privateHonor!==null?privateHonor:Number(st.honor||0);
  const honor=capResourceAmount(rawHonor,maxHonor);
  return{owner,honor,maxHonor,label:getResourceLabel(owner,{caps:true}),hidden:isBattleEnded()||!gameId||!publicState.playerStats?.[owner]};
}
function getVisibleHonorState(){
  const owner=myPlayer||publicState?.currentPlayer||1;
  return getHonorStateForOwner(owner,{preferPrivate:true});
}
function getRivalHonorState(){
  if(!publicState)return{owner:0,honor:0,maxHonor:0,label:"HONOR",hidden:true};
  const localOwner=myPlayer||publicState.currentPlayer||1;
  const rivalOwner=localOwner===1?2:1;
  return getHonorStateForOwner(rivalOwner,{preferPrivate:false});
}
function renderTurnHonorHud(){
  const hud=$("turnHonorHud"),value=$("turnHonorHudValue"),labelEl=hud?hud.querySelector(".turn-honor-label"):null;
  if(!hud||!value)return;
  const st=getVisibleHonorState();
  hud.classList.toggle("hidden",!!st.hidden);
  if(labelEl)labelEl.textContent=st.label||"HONOR";
  value.textContent=`${st.honor}/${st.maxHonor}`;
  hud.title=`${getHudPlayerDisplayName(st.owner)} · ${st.label||"HONOR"} ${st.honor}/${st.maxHonor}`;
}
function renderRivalHonorHud(){
  const hud=$("rivalHonorHud"),value=$("rivalHonorHudValue"),labelEl=hud?hud.querySelector(".turn-honor-label"):null;
  if(!hud||!value)return;
  const st=getRivalHonorState();
  hud.classList.toggle("hidden",!!st.hidden);
  if(labelEl)labelEl.textContent=st.label||"HONOR";
  value.textContent=`${st.honor}/${st.maxHonor}`;
  const rivalName=getHudPlayerDisplayName(st.owner)||"Rival";
  hud.setAttribute("aria-label",`${st.label||"Honor"} de ${rivalName}: ${st.honor} de ${st.maxHonor}`);
  hud.title=`${rivalName} · ${st.label||"HONOR"} ${st.honor}/${st.maxHonor}`;
}
function pulseTurnHonorHud(){
  const hud=$("turnHonorHud");
  if(!hud)return;
  hud.classList.remove("pulse");
  void hud.offsetWidth;
  hud.classList.add("pulse");
}
function maybeShowHonorRecharge(){
  const ev=publicState?.honorRechargeEvent;
  if(!ev||ev.owner!==myPlayer||ev.key===lastHonorRechargeKey)return;
  lastHonorRechargeKey=ev.key;
  const modal=$("honorRechargeModal");
  if(!modal)return;
  const maxHonor=capResourceMax(ev.maxHonor||0),honor=capResourceAmount(ev.honor||0,maxHonor),gain=Math.max(0,Math.min(Number(ev.gain||0),RESOURCE_MAX_CAP));
  const resourceLabel=ev.resourceLabel||getResourceLabel(ev.owner,{caps:true});
  modal.innerHTML=`<span class="honor-recharge-main">+${gain} ${resourceLabel}</span><span class="honor-recharge-sub">${resourceLabel} ${honor}/${maxHonor}</span>`;
  modal.classList.remove("show");
  void modal.offsetWidth;
  modal.classList.add("show");
  pulseTurnHonorHud();
  if(honorRechargeTimer)clearTimeout(honorRechargeTimer);
  honorRechargeTimer=setTimeout(()=>{modal.classList.remove("show");pulseTurnHonorHud();},2550);
}
function renderHud(){
  [1,2].forEach(p=>{
    const st=publicState.playerStats?.[p]||{hp:0,honor:0,deck:0,hand:0};
    const leader=getLeader(p);
    const nameEl=$("p"+p+"HudName");
    if(nameEl)nameEl.textContent=getHudPlayerDisplayName(p);

    const lifeEl=$("p"+p+"Life");
    const honorEl=$("p"+p+"Honor");
    const deckEl=$("p"+p+"Deck");
    const handEl=$("p"+p+"Hand");
    if(lifeEl)lifeEl.textContent=leader?Math.max(0,leader.hp):st.hp||0;
    if(honorEl){const maxHonor=capResourceMax(st.maxHonor||0);honorEl.textContent=`${capResourceAmount(st.honor||0,maxHonor)}/${maxHonor}`;}
    if(deckEl)deckEl.textContent=st.deck||0;
    if(handEl)handEl.textContent=st.hand||0;

    const b=$("p"+p+"Badge");
    if(b){
      const ended=isBattleEnded();
      b.textContent=ended?(publicState.winner===p?"Ganó":"Fin"):publicState.currentPlayer===p?"Turno":"Espera";
      b.style.color=ended?(publicState.winner===p?"#8bffb8":"#d7c3a2"):publicState.currentPlayer===p?"#ffd166":"#d7c3a2";
    }
  });
  const banner=$("phaseBanner");
  if(banner)banner.textContent=isBattleEnded()?(publicState.winner===myPlayer?"VICTORIA":"DERROTA"):(isMyTurn()?`TU TURNO · ${turnPhaseLabel()}`:`ESPERA · ${turnPhaseLabel()}`);
}


function getUnitStatusEntries(u){
  if(!u)return [];
  const entries=[];
  const add=(label,name,desc,kind="neutral",icon="generic",extra={})=>entries.push({label,name,desc,kind,icon,...extra});
  const n=v=>Number(v||0);
  if(u.reanimated){
    const source=(publicState?.units||[]).find(x=>x.id===u.reanimatedByErictoId&&x.key==="ericto"&&Number(x.hp||0)>0);
    add(`Reanimado`,`Reanimado por Ericto`,`Esta unidad regresó mediante Necromancia de Farsalia${source?` de ${source.name}`:""}. Conserva su identidad, estadísticas y habilidades, pero desaparecerá si su Ericto abandona el campo.`,"buff dex-buff","control");
  }
  if(u.resurrectedByHealer)add(`Resucitado`,`Resurrección curativa`,`Esta unidad regresó mediante la Acólita sanadora con la mitad de su Vida, sin debuffs y tratada como una invocación desde la mano. Puede actuar el turno en que regresa, pero este mismo cadáver no puede volver a resucitarse.`,"buff hp-buff","hp");
  if(u.key==="acolyte_healer"){
    const points=getUnitServicePoints(u),tier=getAcolyteServiceTier(u);
    add(`${points} servicio`,`Puntos de servicio`,`Progreso permanente de apoyo. Nivel de servicio ${tier}: ${points<50?"Transferencia vital disponible; Purificación se desbloquea en 50.":points<100?"Purificación desbloqueada; Resurrección se desbloquea en 100.":"Purificación y Resurrección desbloqueadas."}` ,"buff hp-buff","hp");
  }
  if(u.key==="hattori_hanzo"&&!u.hanzoContractConsumed)add(`Contrato`,`Contrato preparado`,`La primera unidad enemiga que Hattori Hanzō ataque desde Sigilo recibirá automáticamente el Contrato del Shogun: +3 DX y +2 AT para Hanzō, -3 Guardia para el objetivo y sin contraataque. No se activa contra líderes.` ,"buff dex-buff","control");
  if(n(u.tempMovDebuff)>0)add(`-${n(u.tempMovDebuff)} MOV`,`Movimiento reducido`,`Movimiento reducido hasta el inicio de su próximo turno.${u.tempMovDebuffSource?` Origen: ${u.tempMovDebuffSource}.`:""}`,"debuff mov-debuff","debuff");
  if(getGenghisMovDebuff(u)>0)add(`-${getGenghisMovDebuff(u)} MOV`,`Horda de la Estepa`,`Movimiento reducido por Gengis Kan hasta su próximo turno.${u.genghisMovDebuffSource?` Origen: ${u.genghisMovDebuffSource}.`:""}`,"debuff mov-debuff","debuff");
  if(getHannibalMovDebuff(u)>0)add(`-${getHannibalMovDebuff(u)} MOV`,`Trampa de Cannas`,`Movimiento reducido por Hannibal Barca hasta su próximo turno.${u.hannibalMovDebuffSource?` Origen: ${u.hannibalMovDebuffSource}.`:""}`,"debuff mov-debuff","debuff");
  if(n(u.permMov)>0)add(`+${n(u.permMov)} MOV`,`Movimiento permanente`,`Movimiento permanente mientras la unidad siga en campo.` ,"buff mov-buff","buff");
  if(n(u.tempMovBuff)>0)add(`+${n(u.tempMovBuff)} MOV`,`Movimiento aumentado`,`Movimiento aumentado este turno o hasta que el efecto expire.`,"buff mov-buff","buff");
  if(n(u.buffAtk)>0)add(`+${n(u.buffAtk)} AT`,`Ataque aumentado`,`Ataque aumentado temporalmente por magia o efecto.`,"buff atk-buff","buff");
  if(n(u.permAtk)>0)add(`+${n(u.permAtk)} AT`,`Ataque permanente`,n(u.bloodVictoryBuffs)>0?`Ataque aumentado por Victoria sangrienta (${n(u.bloodVictoryBuffs)} caída${n(u.bloodVictoryBuffs)===1?"":"s"} aliada${n(u.bloodVictoryBuffs)===1?"":"s"}). Permanece mientras la unidad esté en campo.`:`Ataque permanente acumulado.`,"buff atk-buff","buff");
  if(n(u.tempAtkBuff)>0)add(`+${n(u.tempAtkBuff)} AT`,`Ataque aumentado`,n(u.warCryBuffs)>0?`Ataque aumentado por Grito de Guerra (${n(u.warCryBuffs)} acumulación${n(u.warCryBuffs)===1?"":"es"}). Se limpia al inicio del próximo turno del dueño.`:`Ataque aumentado por efecto temporal.`,"buff atk-buff","buff");
  if(n(u.tempAtkDebuff)>0)add(`-${n(u.tempAtkDebuff)} AT`,`Ataque reducido`,`Ataque reducido por efecto temporal.`,"debuff atk-debuff","debuff");
  if(getHannibalAtkDebuff(u)>0)add(`-${getHannibalAtkDebuff(u)} AT`,`Trampa de Cannas`,`Ataque reducido por Hannibal Barca hasta su próximo turno.${u.hannibalAtkDebuffSource?` Origen: ${u.hannibalAtkDebuffSource}.`:""}`,"debuff atk-debuff","debuff");
  if(getKhalidAttackPenalty(u)>0)add(`-${getKhalidAttackPenalty(u)} AT`,`Espada Invicta`,`Penalización acumulada de Khalid por ataques encadenados. Se restaura al inicio de su próximo turno.`,"debuff atk-debuff","debuff");
  if(n(u.tempDexBuff)>0)add(`+${n(u.tempDexBuff)} DX`,`Destreza aumentada`,n(u.coverFireBuffs)>0?`Destreza aumentada por Fuego de cobertura (${n(u.coverFireBuffs)} acumulación${n(u.coverFireBuffs)===1?"":"es"}). Se limpia al inicio del próximo turno del dueño.`:`Destreza aumentada por efecto temporal.`,"buff dex-buff","buff");
  const igaDexForced=!!(u.saboteadorDexZeroTurnKey&&u.saboteadorDexZeroTurnKey===publicState?.turnKey);
  const legacyIgaDexHack=!!(u.saboteadorDexZeroTurnKey&&n(u.tempDexDebuff)>=90);
  if(igaDexForced)add(`DX 0`,`Escape Forzado`,`La Destreza de esta unidad está forzada a 0 hasta el final del turno actual.${u.saboteadorDexZeroSource?` Origen: ${u.saboteadorDexZeroSource}.`:""}`,"debuff dex-debuff","debuff");
  if(n(u.tempDexDebuff)>0&&!legacyIgaDexHack)add(`-${n(u.tempDexDebuff)} DX`,`Destreza reducida`,`Destreza reducida por presión, trampa o efecto temporal.`,"debuff dex-debuff","debuff");
  if(n(u.tempAgiBuff)>0)add(`+${n(u.tempAgiBuff)} AGI`,`Agilidad aumentada`,`Agilidad aumentada por efecto temporal.`,"buff agi-buff","buff");
  if(n(u.tempAgiDebuff)>0)add(`-${n(u.tempAgiDebuff)} AGI`,`Agilidad reducida`,`Agilidad reducida por efecto temporal.`,"debuff agi-debuff","debuff");
  if(blackRavenAgiAura(u)<0)add(`-2 AGI`,`Graznido Inquietante`,`Aura pasiva del Cuervo Negro: esta unidad enemiga está en rango 2 y pierde -2 AGI mientras permanezca en el aura.`,"debuff agi-debuff","debuff");
  if(cuChulainnFearAura(u)<0)add(`-3 AT`,`Alma de Dragón`,`Aura de Cú Chulainn: esta unidad enemiga está en rango 1 y pierde 3 AT por Miedo mientras permanezca en el aura.`,"debuff atk-debuff","debuff");
  if(africanLionAllyAtkAura(u)>0)add(`+2 AT`,`Liderazgo de Manada`,`Pasiva del León Africano: esta unidad aliada está en rango 2 y obtiene +2 AT.`,"buff atk-buff","buff");
  const hectorAtkPenalty=Math.abs(hectorEnemyAtkAura(u));
  if(hectorAtkPenalty>0)add(`-${hectorAtkPenalty} AT`,`Muralla de Troya`,`Pasiva de Héctor: esta unidad enemiga está en rango 1. Pierde 1 AT por cada enemigo en rango 1 de Héctor.`,"debuff atk-debuff","debuff");
  const achillesGuardBonus=achillesConcentrationGuard(u);
  if(achillesGuardBonus>0)add(`+${achillesGuardBonus} GD`,`Concentración del Pélida`,`Aquiles tiene 2 o más enemigos adyacentes y obtiene +6 Guardia.`,"buff guard-buff","buff");
  if(n(u.tempGuardBuff)>0)add(`+${n(u.tempGuardBuff)} GD`,`Guardia aumentada`,n(u.steelWallBuffs)>0?`Guardia aumentada por Muro de acero (${n(u.steelWallBuffs)} acumulación${n(u.steelWallBuffs)===1?"":"es"}). Se limpia al inicio del próximo turno del dueño.`:`Guardia temporal adicional.`,"buff guard-buff","buff");
  if(n(u.tempGuardBuff)<0)add(`${n(u.tempGuardBuff)} GD`,`Guardia reducida`,`Guardia reducida por trampa o efecto temporal.`,"debuff guard-debuff","debuff");
  if(n(u.warningRuneGuard)>0)add(`◆ +${n(u.warningRuneGuard)} GD`,`Runa de advertencia`,`La próxima vez que esta unidad sea atacada, obtiene +${n(u.warningRuneGuard)} Guardia durante ese combate y la runa se consume.${u.warningRuneCardName?` Origen: ${u.warningRuneCardName}.`:""}`,"buff guard-buff","buff");
  if(u.defenseModeReady)add(`DEF +2 GD`,`Guardia defensiva`,`Postura defensiva: +2 Guardia y el primer ataque que reciba tiene -10% precisión. Se consume con ese ataque o al inicio de su próximo turno, lo que ocurra primero.`,"buff guard-buff","defense");
  const evasionSpent=getEvasionPressure(u);
  if(evasionSpent>0&&!u.leader)add(`-${evasionSpent} EVA`,`Evasión reducida`,`Destreza/Agilidad gastadas por atacar o por presión de ataques recibidos. Se restaura al inicio de su próximo turno.`,"debuff eva-debuff","debuff");
  if(hasBleeding(u))add(`Sangrado`,`Sangrado`,`Sangrado: pierde ${u.bleedDamage||1} Vida al inicio de su turno${getBleedTurnsText(u)}${u.bleedTurnsRemaining?` (${u.bleedTurnsRemaining} turno${u.bleedTurnsRemaining===1?"":"s"} restante${u.bleedTurnsRemaining===1?"":"s"})`:""}.${u.bleedSourceName?` Origen: ${u.bleedSourceName}.`:""}`,"debuff bleed","bleed");
  if(hasActiveBlessedArmor(u))add(`1ra muerte negada`,`Armadura bendita`,`La primera muerte del líder fue negada. Su vida quedó en 1 y no puede perder Vida durante el resto de este turno.`,"buff guard-buff","buff");
  if(u.leader&&u.leaderType==="archer"&&u.leaderAbility==="arrow_rain")add(`Lluvia 1/turno`,`Lluvia de flechas`,`Habilidad Nv.5 activa: una vez por turno puede infligir 1 daño directo a todas las unidades enemigas, ignorando Guardia y stats.`,"buff dex-buff","buff");
  if(u.leader&&u.leaderType==="mage"&&u.leaderAbility==="arcane_bolt")add(`Descarga arcana`,`Descarga arcana`,`Habilidad Nv.5 activa: una vez por turno puede infligir 2 de daño directo al líder enemigo, ignorando Guardia y stats de combate.`,"buff dex-buff","buff");
  if(n(u.poisonTurns)>0&&n(u.poisonDamage)>0)add(`Veneno ${n(u.poisonDamage)}`,`Veneno`,`Veneno: pierde ${n(u.poisonDamage)} Vida al inicio de su turno durante ${n(u.poisonTurns)} turno(s). El daño se duplica en cada tick hasta que termine el efecto.`,"debuff poison","poison");
  if(n(u.burnTurns)>0&&n(u.burnDamage)>0)add(`Quemadura ${n(u.burnDamage)}`,`Quemadura`,`Quemadura: pierde ${n(u.burnDamage)} Vida directa al final de cada turno durante ${n(u.burnTurns)} turno(s). Ignora Guardia y no afecta líderes.`,"debuff burn","burn");
  if(isRhinoStunnedNow(u))add(`Aturdido`,`Aturdido por Impacto`,`No puede moverse, defenderse ni atacar durante el turno afectado. Su Guardia se mantiene igual y su Destreza/Agilidad quedan a la mitad.`,"debuff lock","lock");
  if(u.noMoveTurnKey&&u.noMoveTurnKey===publicState?.turnKey)add(`No mover`,`Movimiento bloqueado`,`No puede moverse este turno.`,"debuff lock","lock");
  if(u.noAttackTurnKey&&u.noAttackTurnKey===publicState?.turnKey)add(`No atacar`,`Ataque bloqueado`,`No puede atacar este turno.`,"debuff lock","lock");
  if(u.noDefTurnKey&&u.noDefTurnKey===publicState?.turnKey)add(`No DEF`,`Defensa bloqueada`,`No puede usar DEF este turno.`,"debuff lock","lock");
  if(u.noCounterTurnKey&&u.noCounterTurnKey===publicState?.turnKey)add(`No contraataque`,`Contraataque bloqueado`,`No puede contraatacar este turno.`,"debuff lock","lock");
  if(u.silencedTurnKey&&u.silencedTurnKey===publicState?.turnKey)add(`Silencio`,`Silencio`,`Silenciada: no puede activar efectos este turno.`,"debuff silence","silence");
  if(u.noHealTurnKey&&u.noHealTurnKey===publicState?.turnKey)add(`No cura`,`Curación bloqueada`,`No puede recibir curación este turno.`,"debuff curse","curse");
  if(u.noReductionTurnKey&&u.noReductionTurnKey===publicState?.turnKey)add(`Sin reducción`,`Reducción bloqueada`,`No puede usar reducciones especiales de daño este turno.`,"debuff curse","curse");
  if(u.ignoreGuardNextDamageTurnKey&&u.ignoreGuardNextDamageTurnKey===publicState?.turnKey)add(`Sin guardia`,`Guardia ignorada`,`El próximo daño contra esta unidad ignora Guardia.`,"debuff guard-debuff","debuff");
  if(u.doubleNextDamageTurnKey&&u.doubleNextDamageTurnKey===publicState?.turnKey)add(`Daño x2`,`Daño duplicado`,`El próximo daño recibido se duplica.`,"debuff curse","curse");
  if(u.noHealWhilePoisoned)add(`No cura`,`Curación bloqueada`,`No puede curarse mientras dure el veneno.`,"debuff poison","poison");
  if(u.richardBuffSource)add(`+2 Vida`,`Vida aumentada`,`Vida máxima y actual aumentada mientras Richard siga en campo.`,"buff hp-buff","hp");
  if(u.convertedByTrap)add(`Control`,`Control alterado`,`Unidad convertida temporalmente por trampa legendaria.`,"debuff curse","control");
  if(hasVeilCurse(u)){const count=Math.max(1,Number(u.veilCurseTurnsRemaining||1));add(`Cuenta ${count}`,`Cuenta regresiva mortal`,`Al final de cada turno propio baja 1. Cuando llegue a 0, esta unidad caerá derrotada. Puede eliminarse con Purificación. Fuente: ${u.veilCurseSourceName||"Morgana"}.`,"debuff curse","curse",{hiddenOnBoard:true});}
  return entries;
}

function getUnitStatusSealShortText(entry){
  const label=String(entry?.label||"").trim();
  if(!label)return "";
  const signed=label.match(/[+-]?\d+/);
  if(signed)return signed[0];
  const poison=label.match(/Veneno\s*(\d+)/i);
  if(poison)return poison[1];
  if(/sangrado/i.test(label))return "!";
  if(/silencio/i.test(label))return "!";
  if(/no\s+/i.test(label))return "×";
  if(/control/i.test(label))return "✦";
  return "";
}
function isHelpfulStatusEntry(entry){
  const kind=String(entry?.kind||"");
  const icon=String(entry?.icon||"");
  return kind.includes("buff")||icon==="buff"||icon==="hp";
}
function renderUnitStatusSeal(entry,idx=0){
  const kind=escapeHtml(entry?.kind||"neutral");
  const shortText=getUnitStatusSealShortText(entry);
  const title=escapeHtml(`${entry?.name||entry?.label||"Estado"}: ${entry?.desc||""}`.trim());
  return `<button class="unit-status-bubble unit-status-seal ${kind}" type="button" data-status-index="${idx}" title="${title}" aria-label="${title}"><span class="unit-status-seal-ring" aria-hidden="true"></span><span class="unit-status-seal-core">${getStatusEntryIconHtml(entry)}</span>${shortText?`<span class="unit-status-seal-stack">${escapeHtml(shortText)}</span>`:""}</button>`;
}
function getUnitStatusBubblesHtml(u){
  if(!u)return "";
  const entries=getUnitStatusEntries(u).filter(entry=>!entry.hiddenOnBoard);
  if(!entries.length)return "";
  const helpful=[];
  const harmful=[];
  entries.forEach(entry=>{(isHelpfulStatusEntry(entry)?helpful:harmful).push(entry);});
  const left=harmful.slice(0,4);
  const right=helpful.slice(0,4);
  let remaining=[...harmful.slice(4),...helpful.slice(4)];
  while(remaining.length&&(left.length<4||right.length<4)){
    if(left.length<4&&remaining.length)left.push(remaining.shift());
    if(right.length<4&&remaining.length)right.push(remaining.shift());
  }
  if(!right.length&&left.length>2)right.push(...left.splice(2));
  if(!left.length&&right.length>2)left.push(...right.splice(0,Math.min(2,right.length-1)));
  const extra=remaining.length;
  const leftHtml=left.map((entry,idx)=>renderUnitStatusSeal(entry,idx)).join("");
  const rightHtml=right.map((entry,idx)=>renderUnitStatusSeal(entry,left.length+idx)).join("");
  return `<div class="unit-status-bubbles unit-status-seals">${leftHtml?`<div class="status-seal-rail left">${leftHtml}</div>`:""}${rightHtml?`<div class="status-seal-rail right">${rightHtml}</div>`:""}${extra>0?`<div class="unit-status-seal-extra" title="${extra} estado(s) adicional(es). Abre DET para ver todos.">+${extra}</div>`:""}</div>`;
}


function renderLeaderStatusSeal(entry,idx=0){
  const kind=escapeHtml(entry?.kind||"neutral");
  const shortText=getUnitStatusSealShortText(entry);
  const title=escapeHtml(`${entry?.name||entry?.label||"Estado"}: ${entry?.desc||""}`.trim());
  return `<button class="leader-status-seal unit-status-seal ${kind}" type="button" data-status-index="${idx}" title="${title}" aria-label="${title}" onclick="return openLeaderStatusModalFromSeal(this,event)"><span class="unit-status-seal-ring" aria-hidden="true"></span><span class="unit-status-seal-core">${getStatusEntryIconHtml(entry)}</span>${shortText?`<span class="unit-status-seal-stack">${escapeHtml(shortText)}</span>`:""}</button>`;
}

function getLeaderStatusBubblesHtml(u){
  if(!u)return "";
  const entries=getUnitStatusEntries(u);
  if(!entries.length)return "";
  const visible=entries.slice(0,4);
  const extra=Math.max(0,entries.length-visible.length);
  const seals=visible.map((entry,idx)=>renderLeaderStatusSeal(entry,idx)).join("");
  return `<span class="leader-status-bubbles">${seals}${extra>0?`<span class="leader-status-extra" title="${extra} estado(s) adicional(es). Abre DET para ver todos.">+${extra}</span>`:""}</span>`;
}









function getUnitTopLeftText(u){
  if(!u)return "";
  if(u.leader){
    const st=publicState?.playerStats?.[u.owner]||{};
    return `${Number(st.honor||0)}/${Number(st.maxHonor||0)}`;
  }
  if(isUnitServiceProgression(u))return String(getUnitServicePoints(u));
  return romanUnitRank(getUnitMasteryRank(u));
}
function getUnitTopLeftTitle(u){
  if(!u)return "";
  if(u.leader){
    const st=publicState?.playerStats?.[u.owner]||{};
    return `${getResourceLabel(u.owner)} disponible: ${Number(st.honor||0)}/${Number(st.maxHonor||0)}`;
  }
  if(isUnitServiceProgression(u))return `Puntos de servicio de ${u.name}: ${getUnitServicePoints(u)}. Purificación se desbloquea en 50 y Resurrección en 100. Esta progresión no usa bajas ni concede Vida máxima.`;
  const rank=getUnitMasteryRank(u);
  const bonus=getUnitMasteryHpBonusByRank(rank);
  return `Rango de maestría de ${u.name}: ${romanUnitRank(rank)} · ${getUnitMasteryProgressText(u)} · Bonus actual: +${bonus} Vida máxima. Máximo: Rango X.`;
}
function getUnitAuxStatData(u){
  if(!u)return {text:"",kind:"guard",title:""};
  if(u.leader){
    const guard=displayEffectiveGuard(u);
    return {text:String(guard),kind:"guard",title:`Guardia/armadura actual: ${guard}${u?.defenseModeReady?" (incluye +2 por DEF)":""}`};
  }
  const activeOwner=Number(publicState?.currentPlayer||0);
  if(activeOwner&&activeOwner===Number(u.owner)){
    const precisionScore=Math.max(0,Number(getAttackPrecisionScore(u,{})||0));
    return {text:String(precisionScore),kind:"precision",title:`Precisión disponible actual: ${precisionScore}. Se calcula con Destreza + Agilidad menos lo gastado este turno.`};
  }
  const evasionScore=Math.max(0,Number(getAvailableEvasionScore(u,{})||0));
  return {text:String(evasionScore),kind:"eva",title:`Evasión disponible actual: ${evasionScore}. Se calcula con Destreza + Agilidad menos presión o gasto del turno.`};
}
function getUnitPrimaryBoardStatData(u){
  if(!u)return {text:"",kind:"attack",label:"AT",title:""};
  const activeOwner=Number(publicState?.currentPlayer||0);
  const unitOwner=Number(u?.owner||0);
  const isOwnerTurn=!!(activeOwner&&unitOwner&&activeOwner===unitOwner);
  if(isOwnerTurn){
    const atk=Math.max(0,effectiveAtk(u));
    return {text:String(atk),kind:"attack",label:"AT",title:`AT actual: ${atk}. Turno del dueño de la unidad; este espacio muestra cuánto pega al atacar.`};
  }
  const guard=displayEffectiveGuard(u);
  return {text:String(guard),kind:"guard",label:"GD",title:`GD actual: ${guard}${u?.defenseModeReady?" (incluye +2 por DEF)":""}. Turno rival; este espacio muestra cuánto resiste antes de perder Vida.`};
}
function makeSafeBadgeIdPart(value){
  return String(value==null?"":value).replace(/[^a-zA-Z0-9_-]/g,"_")||"hp";
}
function getHpHeartBadgeHtml(u,scope="unit"){
  if(!u)return "";
  const hp=Math.max(0,Number(getDisplayHp(u)||0));
  const max=Math.max(1,Number(effectiveMaxHp(u)||u.maxHp||hp||1));
  const pct=clamp(Math.round((hp/max)*100),0,100);
  const tier=pct<=35?"low":pct<=65?"mid":"high";
  const uid=`${scope}_${makeSafeBadgeIdPart(u.id||u.key||u.name||"hp")}`;
  const clipId=`hpHeartClip_${uid}`;
  const fillId=`hpHeartFill_${uid}`;
  const waveY=(84 - (pct*0.66)).toFixed(2);
  const fillY=(86 - (pct*0.68)).toFixed(2);
  const fillH=(pct*0.68).toFixed(2);
  const frameHref='assets/ui/hp_heart_frame_overlay.webp?v=2';
  const title=escapeHtml(`Vida actual: ${hp}/${max}`);
  const heartInner="M50 87 C45 83 39 78 31 70 C20 59 15 48 15 37 C15 25 23 15 35 15 C42 15 47 19 50 24 C53 19 58 15 65 15 C77 15 85 25 85 37 C85 48 80 59 69 70 C61 78 55 83 50 87 Z";
  return `<span class="hp-heart-badge hp-heart-badge-${escapeHtml(scope)} ${tier}" title="${title}" aria-label="${title}">
    <svg class="hp-heart-svg" viewBox="0 0 100 100" aria-hidden="true" focusable="false">
      <defs>
        <clipPath id="${clipId}"><path d="${heartInner}"/></clipPath>
        <linearGradient id="${fillId}" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#ff9a9a"/>
          <stop offset="12%" stop-color="#ff4b4b"/>
          <stop offset="54%" stop-color="#e01010"/>
          <stop offset="100%" stop-color="#7b0505"/>
        </linearGradient>
      </defs>
      <path d="${heartInner}" fill="rgba(18,6,7,.92)"/>
      <path d="${heartInner}" fill="none" stroke="rgba(255,255,255,.07)" stroke-width="1.2"/>
      <rect class="hp-heart-fill" x="14" y="${fillY}" width="72" height="${fillH}" fill="url(#${fillId})" clip-path="url(#${clipId})"/>
      <path class="hp-heart-wave" d="M17 ${waveY} C25 ${Number(waveY)-1.6}, 31 ${Number(waveY)+2.6}, 40 ${Number(waveY)+0.8} S56 ${Number(waveY)-1.3}, 66 ${Number(waveY)+0.9} S79 ${Number(waveY)+1.5}, 84 ${Number(waveY)+0.7}" fill="none" stroke="rgba(255,238,238,.95)" stroke-width="1.8" stroke-linecap="round" clip-path="url(#${clipId})"/>
      <circle class="hp-heart-medallion-core" cx="70.6" cy="68.2" r="12.2" fill="#1b0f0b"/>
      <circle class="hp-heart-medallion-ring" cx="70.6" cy="68.2" r="11.3" fill="none" stroke="rgba(236,194,90,.34)" stroke-width="1.2"/>
      <image class="hp-heart-frame-img" href="${frameHref}" x="0" y="0" width="100" height="100" preserveAspectRatio="xMidYMid meet"/>
      <text x="70.6" y="73.2" text-anchor="middle" class="hp-heart-number">${escapeHtml(String(hp))}</text>
    </svg>
  </span>`;
}

function getGuardBadgeHtml(u,scope="unit"){
  if(!u)return "";
  const guard=Math.max(0,Number(displayEffectiveGuard(u)||0));
  const broken=guard<=0;
  const title=escapeHtml(`Guardia actual: ${guard}${u?.defenseModeReady?" (incluye +2 por DEF)":""}`);
  const frameHref='assets/ui/guard_shield_emblem.webp?v=1';
  return `<span class="guard-emblem-badge guard-emblem-badge-${escapeHtml(scope)} ${broken?"is-broken":"is-intact"}" title="${title}" aria-label="${title}">
    <span class="guard-emblem-shell" aria-hidden="true">
      <img class="guard-emblem-img" src="${frameHref}" alt="" draggable="false"/>
      <span class="guard-emblem-crack crack-1"></span>
      <span class="guard-emblem-crack crack-2"></span>
      <span class="guard-emblem-crack crack-3"></span>
      <span class="guard-emblem-crack crack-4"></span>
      <span class="guard-emblem-shard shard-1"></span>
      <span class="guard-emblem-shard shard-2"></span>
      <span class="guard-emblem-medallion"><b>${escapeHtml(String(guard))}</b></span>
    </span>
  </span>`;
}
function getAttackBadgeHtml(u,scope="unit"){
  if(!u)return "";
  const atk=Math.max(0,Number(effectiveAtk(u)||0));
  const title=escapeHtml(`Ataque actual: ${atk}`);
  const frameHref='assets/ui/attack_sword_emblem.webp?v=1';
  return `<span class="attack-emblem-badge attack-emblem-badge-${escapeHtml(scope)}" title="${title}" aria-label="${title}">
    <span class="attack-emblem-shell" aria-hidden="true">
      <img class="attack-emblem-img" src="${frameHref}" alt="" draggable="false"/>
      <span class="attack-emblem-medallion"><b>${escapeHtml(String(atk))}</b></span>
    </span>
  </span>`;
}
function getFieldStatBadgeHtml(kind,value,titleText=""){
  const safeKind=kind==="precision"?"precision":"eva";
  const numeric=Math.max(0,Number(value||0));
  const title=escapeHtml(titleText||`${safeKind==="precision"?"Precisión":"Evasión"} actual: ${numeric}`);
  const frameHref=safeKind==="precision"?'assets/ui/precision_crosshair_emblem.webp?v=2':'assets/ui/evasion_rogue_emblem.webp?v=2';
  return `<span class="field-stat-emblem-badge field-stat-emblem-${safeKind}" title="${title}" aria-label="${title}">
    <span class="field-stat-emblem-shell" aria-hidden="true">
      <img class="field-stat-emblem-img" src="${frameHref}" alt="" draggable="false"/>
      <span class="field-stat-emblem-medallion"><b>${escapeHtml(String(numeric))}</b></span>
    </span>
  </span>`;
}
function getPrecisionBadgeHtml(u){
  if(!u)return "";
  const precisionScore=Math.max(0,Number(getAttackPrecisionScore(u,{})||0));
  const title=`Precisión disponible actual: ${precisionScore}. Se calcula con Destreza + Agilidad menos lo gastado este turno.`;
  return getFieldStatBadgeHtml("precision",precisionScore,title);
}
function getEvasionBadgeHtml(u){
  if(!u)return "";
  const evasionScore=Math.max(0,Number(getAvailableEvasionScore(u,{})||0));
  const title=`Evasión disponible actual: ${evasionScore}. Se calcula con Destreza + Agilidad menos presión o gasto del turno.`;
  return getFieldStatBadgeHtml("eva",evasionScore,title);
}
function getUnitBottomFrameHtml(u){
  if(!u)return "";
  const aux=getUnitAuxStatData(u);
  const primary=getUnitPrimaryBoardStatData(u);
  const topLeftText=getUnitTopLeftText(u);
  const topLeftTitle=getUnitTopLeftTitle(u);
  const primaryHtml=primary.kind==="guard"
    ? `<span class="unit-stat-orb stat-orb-atk stat-orb-primary guard stat-badge-guard-wrap" data-board-stat="${escapeHtml(primary.label)}" title="${escapeHtml(primary.title)}">${getGuardBadgeHtml(u,"unit-primary")}</span>`
    : primary.kind==="attack"
      ? `<span class="unit-stat-orb stat-orb-atk stat-orb-primary attack stat-badge-atk-wrap" data-board-stat="${escapeHtml(primary.label)}" title="${escapeHtml(primary.title)}">${getAttackBadgeHtml(u,"unit-primary")}</span>`
      : `<span class="unit-stat-orb stat-orb-atk stat-orb-primary ${escapeHtml(primary.kind)}" data-board-stat="${escapeHtml(primary.label)}" title="${escapeHtml(primary.title)}"><b>${escapeHtml(primary.text)}</b></span>`;
  const auxHtml=aux.kind==="guard"
    ? `<span class="unit-stat-orb stat-orb-aux guard stat-badge-guard-wrap" title="${escapeHtml(aux.title)}">${getGuardBadgeHtml(u,"unit-aux")}</span>`
    : aux.kind==="precision"
      ? `<span class="unit-stat-orb stat-orb-aux precision stat-badge-precision-wrap" title="${escapeHtml(aux.title)}">${getPrecisionBadgeHtml(u,"unit-aux")}</span>`
      : aux.kind==="eva"
        ? `<span class="unit-stat-orb stat-orb-aux eva stat-badge-eva-wrap" title="${escapeHtml(aux.title)}">${getEvasionBadgeHtml(u,"unit-aux")}</span>`
        : `<span class="unit-stat-orb stat-orb-aux ${escapeHtml(aux.kind)}" title="${escapeHtml(aux.title)}"><b>${escapeHtml(aux.text)}</b></span>`;
  return `<div class="unit-ornate-ui">
    <span class="unit-stat-orb stat-orb-cost" title="${escapeHtml(topLeftTitle)}"><b>${escapeHtml(topLeftText)}</b></span>
    <span class="unit-hp-heart-anchor">${getHpHeartBadgeHtml(u,"unit")}</span>
    ${primaryHtml}
    ${auxHtml}
  </div>`;
}

function isBoardUnitFullyExhausted(u){
  if(!u||u.leader||u.owner!==myPlayer)return false;
  if(!isMyTurn()||!isActionPhase())return false;
  const blockedMove=!!(u.noMoveTurnKey&&u.noMoveTurnKey===publicState?.turnKey);
  const canMove=isMulanExecutionMoveReady(u)||(!u.acted&&!u.moved&&!blockedMove);
  const canAttack=canUnitDeclareAttack(u);
  const blockedDef=!!(u.noDefTurnKey&&u.noDefTurnKey===publicState?.turnKey);
  const canDef=isUnitActionWindow(u)&&!u.acted&&!u.defenseModeReady&&!blockedDef&&!isMulanExecutionMoveReady(u);
  const canEffect=isUnitActionWindow(u)&&unitHasContextEffect(u)&&!u.acted&&!isMulanExecutionMoveReady(u)&&!isMulanExecutionChoiceReady(u);
  return !(canMove||canAttack||canDef||canEffect);
}
function getVeilCurseCountdownHtml(u){
  if(!hasVeilCurse(u))return "";
  const count=Math.max(1,Number(u.veilCurseTurnsRemaining||1));
  const critical=count===1?" critical":"";
  const title=escapeHtml(`Cuenta regresiva mortal: ${count}. Al llegar a 0, ${u.name||"la unidad"} caerá derrotada. Purificación puede eliminarla.`);
  return `<span class="veil-curse-countdown${critical}" title="${title}" aria-label="${title}"><span class="veil-curse-countdown-aura" aria-hidden="true"></span><span class="veil-curse-countdown-number">${count}</span></span>`;
}


function getPersistentUnitElementFxHtml(u){
  if(!u||u.leader)return "";
  const frostTurns=Math.max(0,Number(u.dragonFrostTurns||0));
  const hardFrozen=!!u.frozenSource&&u.noAttackTurnKey===publicState?.turnKey;
  const frozen=hardFrozen||frostTurns>0;
  const cursed=typeof hasVeilCurse==="function"?hasVeilCurse(u):Number(u.veilCurseTurnsRemaining||0)>0;
  const html=[];
  if(frozen)html.push(`<span class="unit-persistent-element-fx frozen${hardFrozen?" hard-frozen":" frost"}" aria-hidden="true"><img src="assets/effects/status/frozen/frozen_aura_01.webp" alt="" draggable="false"></span>`);
  if(cursed)html.push('<span class="unit-persistent-element-fx curse" aria-hidden="true"><img src="assets/effects/status/curse/curse_aura_01.webp" alt="" draggable="false"></span>');
  return html.join("");
}

function getBoardTeamMarkerHtml(u){
  if(!u)return "";
  const relation=u.owner===myPlayer?"ally":"enemy";
  const label=relation==="ally"?"Unidad aliada":"Unidad rival";
  return `<span class="unit-team-marker ${relation}" title="${label}" aria-label="${label}"></span>`;
}

function renderBoard(){
  const grid=$("grid");
  if(!grid.dataset.boardTargetDelegateBound){
    grid.dataset.boardTargetDelegateBound="1";
    grid.addEventListener("pointerup",ev=>{
      if(!shouldDirectBoardTarget())return;
      const cell=ev.target&&ev.target.closest?ev.target.closest(".cell"):null;
      if(!cell||!grid.contains(cell))return;
      const x=Number(cell.dataset.x),y=Number(cell.dataset.y);
      if(Number.isFinite(x)&&Number.isFinite(y))handleDirectBoardTargetEvent(ev,x,y);
    },true);
  }
  grid.innerHTML="";
  for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++){
    const cell=document.createElement("div");
    cell.className="cell";
    const coordinate=document.createElement("span");
    coordinate.className="board-cell-coordinate";
    coordinate.textContent=`${String.fromCharCode(65+x)}${y+1}`;
    coordinate.setAttribute("aria-hidden","true");
    cell.appendChild(coordinate);
    const key=`${x},${y}`;
    const tacticalClasses=getTacticalPreviewClasses(x,y);
    if(tacticalClasses.length)cell.classList.add(...tacticalClasses);
    if(key===boardHoverCellKey)cell.classList.add("board-hover");
    if(key===boardSelectedCellKey)cell.classList.add("board-selected");
    if(highlights.includes(key))cell.classList.add(highlightType==="attack"?"attackable":highlightType==="summon"?"summonable":"valid");
    const trap=getCellBeastTrapAt(x,y);
    if(trap){const m=document.createElement("div");m.className=`beast-trap-marker ${trap.owner===1?"p1":"p2"}`;m.title=trap.owner===myPlayer?trap.cardName:"Trampa de cacería";m.textContent=trap.owner===myPlayer?(trap.trapKey==="covered_pit"?"🕳️":trap.trapKey==="rope_cage"?"🪢":trap.trapKey==="blood_bait"?"🥩":"🪤"):"?";cell.appendChild(m);}
    const u=getUnitAt(x,y);
    if(u&&!u.leader){
      const c=document.createElement("div");
      const stealthed=isStealthedUnit(u);
      const exhaustedClass=isBoardUnitFullyExhausted(u)?"unit-exhausted":"";
      const visualUnitKey=stealthed?"stealth":String(u.key||"unit").replace(/[^a-z0-9_-]/gi,"-").toLowerCase();
      const principalClass=!stealthed&&u.principal?"principal-unit":"";
      const rarityClass=stealthed?"":getCardVisualClass(u);
      c.className=`unit-card unit-key-${visualUnitKey} ${u.owner===1?"p1":"p2"} ${u.owner===myPlayer?"ally":"enemy"} ${exhaustedClass} ${principalClass} ${stealthed?"unit-stealthed":""} ${rarityClass}`;
      c.dataset.unitKey=stealthed?"stealth":String(u.key||"").trim().toLowerCase();
      c.dataset.visibilityTag=stealthed?"stealth":"visible";
      c.classList.toggle("unit-invisible-to-viewer",stealthed);
      if(stealthed){
        c.innerHTML=getStealthBoardCoverHtml();
      }else{
        const fieldFigureHtml=typeof getFieldFigureHtml==="function"?getFieldFigureHtml(u):"";
        const persistentElementFxHtml=getPersistentUnitElementFxHtml(u);
        c.innerHTML=`<div class="unit-frame-skin" aria-hidden="true"></div><div class="unit-frame-rarity" aria-hidden="true"></div><div class="unit-portrait">${getBoardUnitPortraitHtml(u)}</div>${fieldFigureHtml}${persistentElementFxHtml}${getVeilCurseCountdownHtml(u)}${getUnitStatusBubblesHtml(u)}${getUnitBottomFrameHtml(u)}${getBoardTeamMarkerHtml(u)}${u.principal?`<span class="unit-principal-badge" title="Personaje Principal" aria-label="Personaje Principal">★</span>`:""}`;
      }
      const unitStatusEntries=stealthed?[]:getUnitStatusEntries(u);
      c.querySelectorAll(".unit-status-seal[data-status-index]").forEach(btn=>{
        btn.addEventListener("pointerdown",ev=>{ev.stopPropagation();},true);
        btn.addEventListener("pointerup",ev=>{ev.stopPropagation();},true);
        btn.addEventListener("click",ev=>{
          ev.preventDefault();
          ev.stopPropagation();
          const entry=unitStatusEntries[Number(btn.dataset.statusIndex||0)];
          if(entry)openStatusGuideModal(entry,u);
        });
      });
      c.title=stealthed?"Presencia Oculta · Sigilo":`${u.name}${u.principal?" · Personaje Principal":""} · HP ${getDisplayHp(u)}/${effectiveMaxHp(u)} · AT ${effectiveAtk(u)}`;
      c.dataset.x=String(x);
      c.dataset.y=String(y);
      c.addEventListener("pointerdown",ev=>{
        if(startUnitBoardDrag(ev,u,c)){ev.preventDefault();ev.stopPropagation();return;}
        ev.stopPropagation();
      },true);
      c.addEventListener("pointerup",ev=>{
        // Blindaje global de objetivos: cualquier unidad renderizada en el tablero
        // resuelve su celda directamente cuando hay carta/ATTK/MOV/EFFECT activo.
        // Así ninguna capa visual, retrato, burbuja o móvil puede tragarse el toque.
        if(handleDirectBoardTargetEvent(ev,x,y))return;
      },true);
      c.addEventListener("contextmenu",ev=>{
        ev.preventDefault();
        ev.stopPropagation();
        openUnitContextMenu(u,x,y);
      });
      c.addEventListener("click",ev=>{
        if(handleDirectBoardTargetEvent(ev,x,y))return;
        ev.stopPropagation();
        openUnitContextMenu(u,x,y);
      });
      cell.appendChild(c);
    }
    cell.dataset.x=String(x);
    cell.dataset.y=String(y);
    cell.addEventListener("pointerenter",()=>setBoardHoverCell(x,y));
    cell.addEventListener("pointermove",()=>setBoardHoverCell(x,y));
    cell.addEventListener("pointerleave",()=>setBoardHoverCell(NaN,NaN));
    cell.addEventListener("pointerdown",()=>flashBoardSelectedCell(x,y));
    cell.addEventListener("click",ev=>{
      flashBoardSelectedCell(x,y);
      if(shouldDirectBoardTarget())return handleDirectBoardTargetEvent(ev,x,y);
      cellClick(x,y);
    });
    grid.appendChild(cell);
  }
  renderLeaderBases();
  if(typeof applyFieldFigureSettingsToRenderedUnits==="function")applyFieldFigureSettingsToRenderedUnits();
}

function ensureLeaderBasesLayer(){
  const battlefield=document.querySelector(".battlefield");
  if(!battlefield)return null;
  let layer=document.getElementById("leaderBasesLayer");
  if(!layer){
    layer=document.createElement("div");
    layer.id="leaderBasesLayer";
    layer.className="leader-bases-layer";
    battlefield.appendChild(layer);
  }
  if(!layer.dataset.boundLeaderBaseClicks){
    layer.dataset.boundLeaderBaseClicks="1";
    layer.addEventListener("pointerdown",ev=>{
      const proxy=ev.target&&ev.target.closest?ev.target.closest(".leader-cell-proxy"):null;
      if(proxy){
        flashBoardSelectedCell(Number(proxy.dataset.x),Number(proxy.dataset.y));
        ev.stopPropagation();
        return;
      }
      const base=ev.target&&ev.target.closest?ev.target.closest(".leader-base"):null;
      const u=base?getUnit(base.dataset.leaderId):null;
      if(u&&startUnitBoardDrag(ev,u,base)){ev.preventDefault();ev.stopPropagation();return;}
      const hit=ev.target&&ev.target.closest?ev.target.closest(".leader-base,.leader-base-hitbox,.unit-status-seal"):null;
      if(hit)ev.stopPropagation();
    },true);
    layer.addEventListener("click",ev=>{
      const seal=ev.target&&ev.target.closest?ev.target.closest(".leader-status-seal[data-status-index],.unit-status-seal[data-status-index]"):null;
      if(seal){
        const btn=seal.closest(".leader-base");
        const u=btn?getUnit(btn.dataset.leaderId):null;
        const entry=u?getUnitStatusEntries(u)[Number(seal.dataset.statusIndex||0)]:null;
        ev.preventDefault();
        ev.stopPropagation();
        if(entry&&u)openStatusGuideModal(entry,u);
        return;
      }
      const hit=ev.target&&ev.target.closest?ev.target.closest(".leader-base,.leader-base-hitbox,.leader-cell-proxy"):null;
      const base=hit&&hit.classList.contains("leader-base")?hit:hit?hit.closest(".leader-base"):null;
      const source=base||hit;
      if(!source)return;
      const u=getUnit(source.dataset.leaderId);
      const x=Number(source.dataset.x),y=Number(source.dataset.y);
      if(handleDirectBoardTargetEvent(ev,x,y))return;
      ev.preventDefault();
      ev.stopPropagation();
      flashBoardSelectedCell(x,y);
      if(u)openUnitContextMenu(u,x,y);
    },true);
    layer.addEventListener("contextmenu",ev=>{
      const hit=ev.target&&ev.target.closest?ev.target.closest(".leader-base,.leader-base-hitbox,.leader-cell-proxy"):null;
      const base=hit&&hit.classList.contains("leader-base")?hit:hit?hit.closest(".leader-base"):null;
      const source=base||hit;
      if(!source)return;
      ev.preventDefault();
      ev.stopPropagation();
      const u=getUnit(source.dataset.leaderId);
      if(u)openUnitContextMenu(u,Number(source.dataset.x),Number(source.dataset.y));
    },true);
    if(!layer.dataset.boundLeaderCellProxyResize){
      layer.dataset.boundLeaderCellProxyResize="1";
      let proxyResizeFrame=0;
      const refreshLeaderCellProxies=()=>{
        if(proxyResizeFrame)cancelAnimationFrame(proxyResizeFrame);
        proxyResizeFrame=requestAnimationFrame(()=>{
          proxyResizeFrame=0;
          syncLeaderCellProxies();
        });
      };
      window.addEventListener("resize",refreshLeaderCellProxies,{passive:true});
      window.addEventListener("orientationchange",refreshLeaderCellProxies,{passive:true});
    }
  }
  return layer;
}

/*
-------------------------------------------------------------------------------
10_UNIT_LEADER_RENDER
-------------------------------------------------------------------------------
*/
function syncLeaderCellProxies(){
  const layer=document.getElementById("leaderBasesLayer");
  const battlefield=document.querySelector(".battlefield");
  const grid=$("grid");
  if(!layer||!battlefield||!grid||!publicState)return;
  layer.querySelectorAll(".leader-cell-proxy").forEach(el=>el.remove());
  const battlefieldRect=battlefield.getBoundingClientRect();
  (publicState.units||[]).filter(u=>u&&u.leader&&u.hp>0).forEach(u=>{
    const cell=grid.querySelector(`.cell[data-x="${u.x}"][data-y="${u.y}"]`);
    if(!cell)return;
    const rect=cell.getBoundingClientRect();
    if(rect.width<=0||rect.height<=0)return;
    const proxy=document.createElement("span");
    proxy.className="leader-cell-proxy";
    proxy.dataset.leaderId=u.id;
    proxy.dataset.x=String(u.x);
    proxy.dataset.y=String(u.y);
    proxy.setAttribute("aria-hidden","true");
    proxy.style.left=`${rect.left-battlefieldRect.left}px`;
    proxy.style.top=`${rect.top-battlefieldRect.top}px`;
    proxy.style.width=`${rect.width}px`;
    proxy.style.height=`${rect.height}px`;
    layer.appendChild(proxy);
  });
}

function renderLeaderBases(){
  const layer=ensureLeaderBasesLayer();
  if(!layer||!publicState)return;
  const leaders=(publicState.units||[]).filter(u=>u&&u.leader&&u.hp>0).sort((a,b)=>a.owner-b.owner);
  layer.innerHTML=leaders.map(u=>{
    const side=u.owner===1?"south":"north";
    const key=`${u.x},${u.y}`;
    const isMarked=highlights.includes(key);
    const classes=["leader-base",`leader-base-${side}`,`leader-base-${u.leaderType||"leader"}`,u.owner===1?"p1":"p2",u.owner===myPlayer?"ally":"enemy",isMarked?"leader-targetable":""].filter(Boolean).join(" ");
    /*
      Los líderes fijos NO renderizan getUnitStatusBubblesHtml(u).
      Motivo: al activar DEF, ese HUD de estados entraba dentro del token 3D del líder,
      deformaba el layout, encogía el retrato, creaba el óvalo fantasma y podía empujar
      los stats hacia la zona del líder rival.
      La lógica de DEF sigue viva: displayEffectiveGuard(u) mantiene el +2 GD y
      renderDetail() sigue mostrando el estado al abrir DET.
    */
    return `<div class="${classes}" role="button" tabindex="0" data-leader-id="${escapeHtml(u.id)}" data-x="${u.x}" data-y="${u.y}" title="${escapeHtml(u.name)}" aria-label="Abrir acciones de ${escapeHtml(u.name)}"><span class="leader-base-hitbox" aria-hidden="true"></span><span class="leader-base-token"><span class="leader-base-aura"></span><span class="leader-base-portrait">${getUnitPortraitHtml(u,true)}</span><span class="leader-base-pedestal"></span></span>${getLeaderStatusBubblesHtml(u)}<span class="leader-base-stats"><span class="leader-heart-slot">${getHpHeartBadgeHtml(u,"leader")}</span><b class="atk leader-atk-badge-wrap" title="Ataque">${getAttackBadgeHtml(u,"leader")}</b><b class="gd leader-guard-badge-wrap" title="Guardia">${getGuardBadgeHtml(u,"leader")}</b></span></div>`;
  }).join("");
  syncLeaderCellProxies();
  requestAnimationFrame(syncLeaderCellProxies);
}

function getCardVisualClass(card){
  const parts=[];
  const type=String(card?.type||"unit").toLowerCase();
  const key=String(card?.key||"").toLowerCase();
  const rarity=String(card?.rarity||card?.rareza||"").toLowerCase();
  if(type==="spell"||card?.spell)parts.push("card-type-spell");
  else if(type==="trap"||card?.trap)parts.push("card-type-trap");
  else if(type==="equipment")parts.push("card-type-equipment");
  else parts.push("card-type-unit");

  if(rarity.includes("astral"))parts.push("card-rarity-astral","card-rarity-demigod");
  else if(rarity.includes("legend"))parts.push("card-rarity-legendary");
  else if(rarity.includes("semid")||rarity.includes("demigod"))parts.push("card-rarity-demigod");
  else if(rarity.includes("mít")||rarity.includes("mitic")||rarity.includes("mythic"))parts.push("card-rarity-mythic");
  else if(rarity.includes("épic")||rarity.includes("epic"))parts.push("card-rarity-epic");
  else if(rarity.includes("gloriosa")||rarity.includes("glorious"))parts.push("card-rarity-glorious");
  else if(rarity.includes("heroica")||rarity.includes("heroic")||card?.special||["mulan","wallace"].includes(key))parts.push("card-rarity-heroic");
  else if(rarity.includes("poco")||rarity.includes("improved")||key.endsWith("_plus"))parts.push("card-rarity-improved");
  else parts.push("card-rarity-basic");

  if(["richard_lionheart"].includes(key))parts.push("card-rarity-glorious");
  if(card?.spell)parts.push(`card-spell-${card.spell}`);
  if(card?.trap)parts.push("card-type-trap");
  return [...new Set(parts)].join(" ");
}

function applyRarityClassToElement(el,card){
  if(!el)return;
  const classes=["card-rarity-basic","card-rarity-improved","card-rarity-heroic","card-rarity-epic","card-rarity-glorious","card-rarity-mythic","card-rarity-legendary","card-rarity-demigod","card-rarity-astral"];
  el.classList.remove(...classes);
  const visual=String(getCardVisualClass(card)||"");
  classes.forEach(cls=>{if(visual.includes(cls))el.classList.add(cls);});
}

function cardTypeLabel(card){
  if(card?.dragonCompanion)return "Criatura";
  if(card?.type==="unit")return card.special?"Leyenda":"Unidad";
  if(card?.type==="trap")return "Trampa";
  if(card?.type==="equipment")return "Equipo";
  if(card?.spell==="damage")return "Daño";
  if(card?.spell==="buff")return "Impulso";
  if(card?.spell==="shield")return "Guardia";
  return card?.type==="spell"?"Magia":"Carta";
}
function handQuickStats(card){
  const shownCost=getCardCostDisplayValue(card,card?.owner||myPlayer);
  if(card?.type==="unit")return `Costo ${shownCost} · AT ${card.atk||0} · HP ${card.hp||0}`;
  return `Costo ${shownCost}`;
}
function renderHand(){$("handDrawer").classList.toggle("open",handOpen);const hand=privateState?.hand||[];const playableCount=getPlayableCardsInHand().length;const phaseStatus=isMyTurn()?` · ${turnPhaseLabel()}`:"";const status=isMyTurn()?` · ${playableCount} jugable${playableCount===1?"":"s"}`:"";$("handInfo").textContent=`${getResourceLabel(myPlayer)} ${privateState?.honor||0}/${privateState?.maxHonor||0} · ${hand.length} cartas${status}${phaseStatus}`;$("handRow").innerHTML=hand.map(c=>{const playState=getCardPlayState(c);return `<div class="hand-card hand-card-visual ${getCardVisualClass(c)} ${playState.canPlay?"":"not-playable"} ${selectedCard?.id===c.id?"selected":""}" data-id="${c.id}" title="${escapeHtml(`${playState.reason} ${getCardCostExplanation(c,c?.owner||myPlayer,publicState?.units||[])}`)}"><div class="hand-art-wrap">${getCardVisualHtml(c,"hand-icon hand-art")}</div><div class="hand-card-footer"><div class="hand-name">${escapeHtml(c.name)}</div><div class="hand-quick-row"><span class="hand-stats">${handQuickStats(c)}</span></div></div></div>`}).join("");[...document.querySelectorAll(".hand-card")].forEach(el=>{el.setAttribute("draggable","false");el.querySelectorAll("img").forEach(img=>img.setAttribute("draggable","false"));el.addEventListener("dragstart",ev=>{ev.preventDefault();ev.stopPropagation();});el.addEventListener("pointerdown",ev=>{const card=hand.find(c=>c.id===el.dataset.id);if(card&&startHandCardBoardDrag(ev,card,el)){ev.preventDefault();ev.stopPropagation();try{el.setPointerCapture?.(ev.pointerId)}catch(_){}}});el.addEventListener("click",ev=>{if(Date.now()-lastBoardDragEndedAt<450){ev.preventDefault();ev.stopPropagation();return;}const card=hand.find(c=>c.id===el.dataset.id);if(card)showCardInspectModal(card)})})}
function renderLog(){const el=$("log");if(!el)return;const history=(Array.isArray(eventSplashHistory)?eventSplashHistory:[]).slice(0,5);el.classList.toggle("is-empty",history.length===0);el.setAttribute("aria-hidden",String(history.length===0));el.innerHTML=history.map(item=>{const cfg=getEventSplashConfig(item?.type);if(!cfg)return "";return `<div class="event-history-item ${cfg.className}" title="${escapeHtml(cfg.title)}"><div class="event-history-art-wrap"><img class="event-history-art" src="${cfg.image}" alt="${escapeHtml(cfg.title)}"></div><span class="event-history-icon-badge"><img src="${cfg.icon||cfg.image}" alt="" aria-hidden="true"></span><span class="event-history-title">${escapeHtml(cfg.title)}</span></div>`}).join("")}
function renderDetail(){
  const detailEl=$("detail");
  // DETAIL HUD REMOVED: el panel #detail ya no existe en index.html.
  // Esta salida evita errores cuando render() intenta actualizarlo.
  if(!detailEl)return;
  const isAdventure=publicState?.mode==="adventure";
  if(selectedCard){
    const cardStats=selectedCard.type==="unit"
      ? [["Costo",getCardCostDisplayValue(selectedCard,selectedCard?.owner||myPlayer)],["AT",selectedCard.atk||0],["HP",selectedCard.hp||0],["GD",selectedCard.guard||0],["DX",selectedCard.dex||0],["AGI",selectedCard.agi||0],["MV",selectedCard.mov||0],["RG",getCardDisplayRange(selectedCard)]]
      : [["Costo",getCardCostDisplayValue(selectedCard,selectedCard?.owner||myPlayer)]];
    const effectText=normalizeSaboteadorRuleText(selectedCard,selectedCard.text||selectedCard.effectText||selectedCard.ability||"").trim();
    detailEl.innerHTML=`<p><b>${selectedCard.icon} ${selectedCard.name}</b></p><div class="detail-helper-note">Toca un stat o un botón para ver la explicación.</div>${resourceDetailHtml(selectedCard.owner||myPlayer,{compact:true})}${detailStatGridHtml(cardStats)}${detailGuideButtonsHtml({showEffect:shouldShowEffectGuideButton(selectedCard,effectText),showWeapon:selectedCard.type==="unit",showFormula:true,showLore:selectedCard.type==="unit",effectLabel:'Ver efecto de la carta',entity:selectedCard})}`;
    bindStatGuideClicks(detailEl);
    bindEntityGuideButtons(detailEl,selectedCard,{effectText,effectTitle:`Efecto de ${selectedCard.name}`});
    return;
  }
  if(selectedUnitId){
    const u=getUnit(selectedUnitId);
    if(u){
      const fx=getUnitEffectText(u);
      const activeEntries=getUnitStatusEntries(u);
      const unitStats=[["HP",`${getDisplayHp(u)}/${effectiveMaxHp(u)}`],["AT",effectiveAtk(u)],["GD",displayEffectiveGuard(u)],["DX",effectiveDex(u)],["AGI",effectiveAgi(u)],["MV",effectiveMov(u)],["RG",getUnitAttackRange(u)]];
      detailEl.innerHTML=`<p><b>${u.icon} ${u.name}</b></p><p>${u.leader?`Líder · ${getLeaderProgressText(u.leaderType||"warrior",u.leaderLevel||1,u.leaderAbility||"")}`:`Nexo ${u.nexoX+1},${u.nexoY+1}`}</p>${u.leader?resourceDetailHtml(u.owner,{compact:true}):""}<div class="detail-helper-note">Toca un stat, el efecto o un estado para revisar su explicación.</div>${detailStatGridHtml(unitStats)}${detailStatusButtonsHtml(activeEntries)}${detailGuideButtonsHtml({showEffect:shouldShowEffectGuideButton(u,fx),showWeapon:true,showFormula:true,showLore:!u.leader,effectLabel:u.leader?'Ver líder':'Ver efecto',entity:u})}`;
      bindStatGuideClicks(detailEl);
      bindEntityGuideButtons(detailEl,u,{effectText:fx,effectTitle:`Efecto de ${u.name}`,statuses:activeEntries});
      return;
    }
  }
  const modeLine=isAdventure?`<p><b>Modo:</b> Aventura contra IA</p><p><b>Batalla:</b> ${escapeHtml(publicState?.adventureBattleTitle||"Aventura")}</p>`:`<p><b>Jugador:</b> ${myPlayer||"?"}</p><p><b>Código:</b> ${gameId||"..."}</p><p><b>Modo:</b> Online</p>`;
  detailEl.innerHTML=`${modeLine}<p>Líder elegido: ${LEADER_DATA[getSelectedLeaderType()]?.name||"sin elegir"}. Guerrero mejora infantería pesada según nivel de buff. Arquero mejora arqueras según nivel de buff. Hechicero reduce costo y aumenta efecto de magias según nivel de buff.</p>${resourceDetailHtml(myPlayer||1,{compact:false})}<p>Toca una carta o unidad para ver sus detalles: el costo usa HONOR normalmente, pero con Hechicero se muestra y se consume como MANA.</p>`
}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[m]))}

function ensureHallVallaModal(){
  let modal=$("hvModal");
  if(modal)return modal;
  modal=document.createElement("div");
  modal.id="hvModal";
  modal.className="hv-modal hidden";
  modal.innerHTML=`<div class="hv-modal-card"><h2 id="hvModalTitle">Información</h2><p id="hvModalMessage"></p><div id="hvModalActions" class="hv-modal-actions"></div></div>`;
  document.body.appendChild(modal);
  return modal;
}
function hvDialog(message,{title="Información",confirmText="Aceptar",cancelText="Cancelar",showCancel=false,danger=false}={}){
  return new Promise(resolve=>{
    const modal=ensureHallVallaModal();
    const titleEl=$("hvModalTitle"),messageEl=$("hvModalMessage"),actions=$("hvModalActions");
    if(titleEl)titleEl.textContent=title;
    if(messageEl)messageEl.textContent=message;
    if(actions){
      actions.innerHTML="";
      if(showCancel){
        const cancel=document.createElement("button");
        cancel.type="button";
        cancel.className="btn ghost";
        cancel.textContent=cancelText;
        cancel.addEventListener("click",()=>{modal.classList.add("hidden");resolve(false);},{once:true});
        actions.appendChild(cancel);
      }
      const ok=document.createElement("button");
      ok.type="button";
      ok.className=danger?"btn danger":"btn primary";
      ok.textContent=confirmText;
      ok.addEventListener("click",()=>{modal.classList.add("hidden");resolve(true);},{once:true});
      actions.appendChild(ok);
    }
    modal.classList.remove("hidden");
  });
}
function hvAlert(message,title="Información"){return hvDialog(message,{title,confirmText:"Aceptar"});}
function hvConfirm(message,title="Confirmar",confirmText="Aceptar",cancelText="Cancelar",danger=false){return hvDialog(message,{title,confirmText,cancelText,showCancel:true,danger});}

function markStatsTutorialSeen(){
  try{localStorage.setItem(HALLVALLA_STATS_TUTORIAL_KEY,"true");}catch(e){}
}
function hasSeenStatsTutorial(){
  try{return localStorage.getItem(HALLVALLA_STATS_TUTORIAL_KEY)==="true";}catch(e){return false;}
}

function hasSeenBasicBattleTutorial(){try{return localStorage.getItem(HALLVALLA_BASIC_TUTORIAL_KEY)==="true";}catch(e){return true;}}
function markBasicBattleTutorialSeen(){try{localStorage.setItem(HALLVALLA_BASIC_TUTORIAL_KEY,"true");}catch(e){}}
function ensureBasicTutorialGate(){
  let modal=$("basicTutorialGate");
  if(modal)return modal;
  modal=document.createElement("div");
  modal.id="basicTutorialGate";
  modal.className="basic-tutorial-gate hidden";
  modal.innerHTML=`
    <div class="basic-tutorial-gate-card">
      <div class="basic-tutorial-kicker">Primer entrenamiento</div>
      <h2>Aprende HallValla en una batalla guiada</h2>
      <p>Juega una práctica corta con 4 cartas. Aprenderás a abrir la mano, convocar, pasar fases, mover, defender, atacar y entender PREC/EVA sin entrar todavía a una partida completa.</p>
      <div class="basic-tutorial-list">
        <span>🃏 Mano y mazo: cómo usar tus cartas.</span>
        <span>✨ Convocar: baja unidades al tablero usando Honor/Mana.</span>
        <span>🟩 Movimiento y defensa: elige acciones de unidad.</span>
        <span>⚔️ Ataque, rango, precisión y evasión: cómo se decide el golpe.</span>
      </div>
      <div class="basic-tutorial-actions">
        <button id="basicTutorialSkipBtn" class="btn ghost" type="button">Omitir por ahora</button>
        <button id="basicTutorialStartBtn" class="btn primary" type="button">Iniciar tutorial</button>
      </div>
    </div>`;
  document.body.appendChild(modal);
  return modal;
}
function showBasicTutorialGate({force=false}={}){
  return new Promise(resolve=>{
    if(!force&&hasSeenBasicBattleTutorial()){resolve(false);return;}
    const modal=ensureBasicTutorialGate();
    const finish=async(start)=>{
      modal.classList.add("hidden");
      markBasicBattleTutorialSeen();
      resolve(start);
      if(start)await startBasicTutorialBattle();
    };
    const skip=$("basicTutorialSkipBtn");
    const start=$("basicTutorialStartBtn");
    if(skip)skip.onclick=()=>finish(false);
    if(start)start.onclick=()=>finish(true);
    modal.classList.remove("hidden");
  });
}
function maybeShowBasicTutorialGate(){
  if(hasSeenBasicBattleTutorial())return;
  setTimeout(()=>showBasicTutorialGate({force:false}),1200);
}
function getTutorialCardTemplate(key){
  const card=getStarterBasicCardByKey(key);
  return card?{...card}:null;
}
async function startBasicTutorialBattle(){
  if(!(await ensureFirebaseAuthReady("tutorial")))return;
  basicTutorialCoachStep=0;
  basicTutorialProgressStep=0;
  basicTutorialFlags={cardInspected:false,handMinimized:false,unitMenuOpened:false,detOpened:false,weaponGuideOpened:false,attackMade:false,completionHandled:false};
  clearBasicTutorialTargetHighlight();
  const leaderType=getSelectedLeaderType()||"warrior";
  const leaderLevel=getLocalLeaderLevel(leaderType)||1;
  const leaderAbility=getLocalLeaderAbility(leaderType)||"";
  const leaderStats=getLeaderBattleStats(leaderType,leaderLevel,leaderAbility);
  const code=`TUT${code4()}`;
  const handKeys=["archer","spearman","guardian","arcane_adept"];
  const hand=handKeys.map(k=>getTutorialCardTemplate(k)).filter(Boolean).map(card=>makeCard(card,1,leaderType));
  const deck=[];
  const enemyLeaderType="warrior";
  const enemyLeaderStats=getLeaderBattleStats(enemyLeaderType,1,"");
  const enemyTargetCard={...getTutorialCardTemplate("guardian"),owner:2,leaderType:enemyLeaderType};
  const enemyTarget=makeUnit(enemyTargetCard,Math.floor(COLS/2),2);
  enemyTarget.name="Guardia de práctica";
  enemyTarget.hp=3;
  enemyTarget.maxHp=3;
  enemyTarget.guard=2;
  enemyTarget.baseGuard=2;
  enemyTarget.dex=2;
  enemyTarget.agi=1;
  enemyTarget.acted=true;
  enemyTarget.moved=true;
  const pub={
    code,
    boardRows:ROWS,
    boardCols:COLS,
    mode:"tutorial",
    tutorialBasic:true,
    createdAt:Date.now(),
    currentPlayer:1,
    turn:1,
    phase:"active",
    turnPhase:"main",
    turnKey:"1-1",
    turnStartedAt:serverTimestamp(),
    clockRulesetVersion:CLOCK_RULESET_VERSION,
    playerClockMs:{1:DUEL_TIME_LIMIT_MS,2:DUEL_TIME_LIMIT_MS},
    playerSlots:{player1Uid:uid,player2Uid:"TUTORIAL_DUMMY"},
    playerNames:{1:getLocalProfileName(),2:"Instructor de práctica"},
    playerLeaders:{1:leaderType,2:enemyLeaderType},
    playerLeaderLevels:{1:leaderLevel,2:1},
    playerLeaderAbilities:{1:leaderAbility,2:""},
    playerStats:{1:{hp:leaderStats.hp,honor:10,maxHonor:10,deck:deck.length,hand:hand.length},2:{hp:enemyLeaderStats.hp,honor:0,maxHonor:0,deck:0,hand:0}},
    erictoGraveyard:[],
    units:[
      makeLeader(1,Math.floor(COLS/2),ROWS-1,leaderType,leaderLevel,leaderAbility),
      makeLeader(2,Math.floor(COLS/2),0,enemyLeaderType,1,""),
      enemyTarget
    ],
    log:["Tutorial básico: abre la mano, convoca una unidad y sigue las instrucciones del instructor."]
  };
  await set(ref(db,`games/${code}/public`),pub);
  await set(getPvpPrivatePlayerRef(code,1),{ownerUid:uid,leaderType,leaderLevel,leaderAbility,deck,hand,honor:10,maxHonor:10,lastTurnStarted:"1-1",skipFirstTurnDraw:false});
  const main=$("mainMenu");if(main)main.classList.add("hidden");
  enterGame(code,1);
}
function ensureBasicTutorialCoach(){
  let coach=$("basicTutorialCoach");
  if(coach)return coach;
  coach=document.createElement("div");
  coach.id="basicTutorialCoach";
  coach.className="basic-tutorial-coach hidden";
  coach.innerHTML=`
    <div class="basic-tutorial-coach-card">
      <div class="basic-tutorial-coach-top">
        <div><div id="basicTutorialStepText" class="basic-tutorial-step">Paso 1/9</div><h3 id="basicTutorialCoachTitle">Tutorial</h3></div>
        <div class="basic-tutorial-coach-tools"><button id="basicTutorialGuideBtn" class="basic-tutorial-mini-btn" type="button">?</button><button id="basicTutorialCloseCoachBtn" class="basic-tutorial-mini-btn" type="button">Ocultar</button></div>
      </div>
      <p id="basicTutorialCoachBody"></p>
      <div id="basicTutorialCoachHint" class="basic-tutorial-hint"></div>
      <div class="basic-tutorial-objective"><span>OBJETIVO</span><b id="basicTutorialObjectiveText"></b></div>
      <div class="basic-tutorial-progress-track"><i id="basicTutorialProgressBar"></i></div>
      <div class="basic-tutorial-coach-buttons"><button id="basicTutorialPrevBtn" class="basic-tutorial-mini-btn" type="button">Revisar anterior</button><button id="basicTutorialNextBtn" class="basic-tutorial-mini-btn primary" type="button" disabled>Completa el objetivo</button></div>
    </div>`;
  document.body.appendChild(coach);
  ensureBasicTutorialFocusRing();
  on("basicTutorialCloseCoachBtn","click",()=>coach.classList.add("hidden"));
  on("basicTutorialGuideBtn","click",()=>showTutorialQuickGuide());
  on("basicTutorialPrevBtn","click",()=>{basicTutorialCoachStep=Math.max(0,basicTutorialCoachStep-1);renderBasicTutorialCoach(true);});
  on("basicTutorialNextBtn","click",()=>{if(basicTutorialCoachStep<basicTutorialProgressStep){basicTutorialCoachStep++;renderBasicTutorialCoach(true);}});
  return coach;
}
function ensureBasicTutorialFocusRing(){let ring=$("basicTutorialFocusRing");if(ring)return ring;ring=document.createElement("div");ring.id="basicTutorialFocusRing";ring.className="basic-tutorial-focus-ring hidden";document.body.appendChild(ring);return ring;}
let basicTutorialCurrentTarget=null;
let basicTutorialFlags={cardInspected:false,handMinimized:false,unitMenuOpened:false,detOpened:false,weaponGuideOpened:false,attackMade:false,completionHandled:false};
function clearBasicTutorialTargetHighlight(){if(basicTutorialCurrentTarget&&basicTutorialCurrentTarget.classList)basicTutorialCurrentTarget.classList.remove("tutorial-target-active");basicTutorialCurrentTarget=null;const ring=$("basicTutorialFocusRing");if(ring)ring.classList.add("hidden");}
function getBasicTutorialPlayerUnits(){return (publicState?.units||[]).filter(u=>u&&u.owner===myPlayer&&!u.leader&&u.hp>0);}
function getBasicTutorialEnemyUnit(){return (publicState?.units||[]).find(u=>u&&u.owner!==myPlayer&&!u.leader&&u.hp>0)||null;}
function getBasicTutorialUnitContextButton(action){return document.querySelector(`#unitContextMenu .unit-context-btn[data-action="${action}"]`);}
function getBasicTutorialBoardUnitEl(unit){if(!unit)return null;return document.querySelector(`.unit-card[data-x="${unit.x}"][data-y="${unit.y}"]`)||document.querySelector(`.leader-base[data-x="${unit.x}"][data-y="${unit.y}"]`)||null;}
function getBasicTutorialTargetElement(step){if(!step)return null;try{const el=typeof step.targetResolver==="function"?step.targetResolver():null;return el&&el.nodeType===1?el:null;}catch(e){return null;}}
function getTutorialRewardedSteps(){try{return new Set(JSON.parse(localStorage.getItem(HALLVALLA_BASIC_TUTORIAL_REWARDS_KEY)||"[]"));}catch(e){return new Set();}}
function awardBasicTutorialStep(stepIndex){const rewarded=getTutorialRewardedSteps();if(rewarded.has(stepIndex))return;rewarded.add(stepIndex);try{localStorage.setItem(HALLVALLA_BASIC_TUTORIAL_REWARDS_KEY,JSON.stringify([...rewarded]));}catch(e){}const profile=getPlayerProfile();profile.gold=(profile.gold||0)+5;savePlayerProfile(profile);renderPlayerProfile(profile);}
function setBasicTutorialComplete(){try{localStorage.setItem(HALLVALLA_BASIC_TUTORIAL_COMPLETE_KEY,"true");localStorage.setItem(HALLVALLA_BASIC_TUTORIAL_KEY,"true");localStorage.setItem(HALLVALLA_BASIC_TUTORIAL_STEP_KEY,"9");}catch(e){}renderHomeProgress();}
function isBasicTutorialComplete(){try{return localStorage.getItem(HALLVALLA_BASIC_TUTORIAL_COMPLETE_KEY)==="true";}catch(e){return false;}}
function syncBasicTutorialProgress(){
  if(!publicState||publicState.mode!=="tutorial")return;
  let progress=basicTutorialProgressStep;
  while(progress<BASIC_TUTORIAL_STEPS.length){const done=typeof BASIC_TUTORIAL_STEPS[progress]?.done==="function"?!!BASIC_TUTORIAL_STEPS[progress].done():false;if(!done)break;awardBasicTutorialStep(progress);progress++;}
  if(progress!==basicTutorialProgressStep){basicTutorialProgressStep=Math.min(progress,BASIC_TUTORIAL_STEPS.length-1);basicTutorialCoachStep=basicTutorialProgressStep;try{localStorage.setItem(HALLVALLA_BASIC_TUTORIAL_STEP_KEY,String(progress));}catch(e){} }
  const won=publicState.phase==="ended"&&publicState.winner===1;
  if(won&&!basicTutorialFlags.completionHandled){basicTutorialFlags.completionHandled=true;awardBasicTutorialStep(8);setBasicTutorialComplete();setTimeout(async()=>{await hvAlert("Tutorial Básico completado. Ganaste 45 de oro en total y Misiones quedó activado.","Entrenamiento completado");backToMainMenu();openMissionsPanel();},450);}
}
function applyBasicTutorialTarget(step){clearBasicTutorialTargetHighlight();const el=getBasicTutorialTargetElement(step);const ring=ensureBasicTutorialFocusRing();if(!el||!ring)return;basicTutorialCurrentTarget=el;el.classList.add("tutorial-target-active");const rect=el.getBoundingClientRect();const pad=8;ring.style.left=`${Math.max(6,rect.left-pad)}px`;ring.style.top=`${Math.max(6,rect.top-pad)}px`;ring.style.width=`${Math.max(28,rect.width+(pad*2))}px`;ring.style.height=`${Math.max(28,rect.height+(pad*2))}px`;ring.classList.remove("hidden");}
function showTutorialQuickGuide(){hvAlert("MANO: pulsa Mano para abrir o minimizar.\nCONVOCAR: elige una carta y una casilla válida.\nDET: consulta estadísticas, efectos y arma.\nMOV: desplaza según MV.\nATTK: ataca dentro del RG.\nUNIDAD AGOTADA: se oscurece cuando no conserva acciones.\nVICTORIA: derrota al líder rival.","Guía rápida");}
document.addEventListener("click",ev=>{if(!publicState||publicState.mode!=="tutorial")return;const t=ev.target;if(t.closest?.("#handRow .hand-card"))basicTutorialFlags.cardInspected=true;if(t.closest?.("#handBtn")&&handOpen)basicTutorialFlags.handMinimized=true;if(t.closest?.(".unit-card")||t.closest?.(".leader-base"))basicTutorialFlags.unitMenuOpened=true;if(t.closest?.('[data-action="det"]'))basicTutorialFlags.detOpened=true;if(t.closest?.(".guide-weapon-btn")||t.closest?.(".weapon-class-pill"))basicTutorialFlags.weaponGuideOpened=true;if(t.closest?.('[data-action="attk"]')||t.closest?.(".cell.attackable"))basicTutorialFlags.attackMade=true;},true);
const BASIC_TUTORIAL_STEPS=[
 {title:"1. Mano y menú de carta",body:"Abre Mano, toca una carta para ver su menú y luego minimiza la mano.",objective:"Revisa una carta y cierra la mano.",hint:"La mano no debe tapar el campo cuando ya terminaste de consultarla.",targetResolver:()=>$('handBtn'),done:()=>basicTutorialFlags.cardInspected&&basicTutorialFlags.handMinimized},
 {title:"2. Convocar una unidad",body:"Abre Mano, selecciona una unidad y colócala en una casilla válida cerca de tu líder.",objective:"Convoca 1 unidad aliada.",hint:"Las casillas válidas se iluminan.",targetResolver:()=>document.querySelector('.cell.summonable')||document.querySelector('#handRow .hand-card:not(.not-playable)')||$('handBtn'),done:()=>getBasicTutorialPlayerUnits().length>0},
 {title:"3. Iconos y efectos",body:"Toca la unidad convocada. Observa Vida, Ataque, Guardia, Precisión, Evasión y sus badges de estado.",objective:"Abre el menú de una unidad en juego.",hint:"El punto azul identifica una unidad aliada; el rojo, una enemiga.",targetResolver:()=>getBasicTutorialBoardUnitEl(getBasicTutorialPlayerUnits()[0]),done:()=>basicTutorialFlags.unitMenuOpened},
 {title:"4. Modal DET",body:"Pulsa DET. Allí ves arte, costo, estadísticas, efecto, estados activos y lectura táctica.",objective:"Abre DET desde la unidad.",hint:"Cierra DET para continuar sin perder el turno.",targetResolver:()=>getBasicTutorialUnitContextButton('det')||getBasicTutorialBoardUnitEl(getBasicTutorialPlayerUnits()[0]),done:()=>basicTutorialFlags.detOpened},
 {title:"5. Armas",body:"En DET pulsa la pastilla de arma para consultar su ventaja y desventaja.",objective:"Abre la información de arma.",hint:"La ventaja de arma aplica +5 DX durante ese combate.",targetResolver:()=>document.querySelector('.guide-weapon-btn,.weapon-class-pill')||getBasicTutorialUnitContextButton('det')||getBasicTutorialBoardUnitEl(getBasicTutorialPlayerUnits()[0]),done:()=>basicTutorialFlags.weaponGuideOpened},
 {title:"6. Movimiento",body:"Avanza a Action Phase, toca tu unidad, pulsa MOV y elige una casilla verde.",objective:"Mueve una unidad aliada.",hint:"MV indica cuántas casillas puede recorrer.",targetResolver:()=>getBasicTutorialUnitContextButton('mov')||$('endBtn')||getBasicTutorialBoardUnitEl(getBasicTutorialPlayerUnits()[0]),done:()=>getBasicTutorialPlayerUnits().some(u=>u.moved)},
 {title:"7. Atacar y reconocer rivales",body:"Las unidades enemigas llevan punto rojo. Pulsa ATTK y selecciona una unidad enemiga dentro del rango.",objective:"Declara un ataque contra una unidad enemiga.",hint:"RG marca la distancia máxima del ataque.",targetResolver:()=>getBasicTutorialUnitContextButton('attk')||getBasicTutorialBoardUnitEl(getBasicTutorialEnemyUnit()),done:()=>{const e=getBasicTutorialEnemyUnit();return !e||Number(e.hp)<3;}},
 {title:"8. Unidad sin acciones",body:"Cuando una unidad ya gastó sus acciones disponibles se oscurece. No podrá volver a actuar hasta su próximo turno.",objective:"Deja una unidad aliada sin acciones disponibles.",hint:"El oscurecimiento evita confundir unidades listas con agotadas.",targetResolver:()=>getBasicTutorialBoardUnitEl(getBasicTutorialPlayerUnits()[0]),done:()=>getBasicTutorialPlayerUnits().some(u=>u.acted&&u.moved)},
 {title:"9. Cómo ganar",body:"Derrota al líder rival. Protege tu propio líder y usa unidades, magias y trampas para reducir su Vida a 0.",objective:"Derrota al líder de práctica.",hint:"No podrás terminar el tutorial hasta ganar el combate.",targetResolver:()=>getBasicTutorialBoardUnitEl((publicState?.units||[]).find(u=>u.owner!==myPlayer&&u.leader)),done:()=>publicState?.phase==='ended'&&publicState?.winner===1}
];
let basicTutorialCoachStep=0;
let basicTutorialProgressStep=0;
function renderBasicTutorialCoach(forceShow=false){
  if(!publicState||publicState.mode!=="tutorial"){clearBasicTutorialTargetHighlight();return;}
  const coach=ensureBasicTutorialCoach();syncBasicTutorialProgress();const step=BASIC_TUTORIAL_STEPS[basicTutorialCoachStep]||BASIC_TUTORIAL_STEPS[0];
  setText("basicTutorialStepText",`Paso ${basicTutorialCoachStep+1}/${BASIC_TUTORIAL_STEPS.length}`);setText("basicTutorialCoachTitle",step.title);setText("basicTutorialCoachBody",step.body);setText("basicTutorialCoachHint",step.hint||"");setText("basicTutorialObjectiveText",step.objective||"");
  const bar=$("basicTutorialProgressBar");if(bar)bar.style.width=`${Math.max(5,((basicTutorialProgressStep+1)/BASIC_TUTORIAL_STEPS.length)*100)}%`;
  const prevBtn=$("basicTutorialPrevBtn"),nextBtn=$("basicTutorialNextBtn");if(prevBtn)prevBtn.disabled=basicTutorialCoachStep<=0;if(nextBtn){const canReview=basicTutorialCoachStep<basicTutorialProgressStep;nextBtn.disabled=!canReview;nextBtn.textContent=canReview?"Volver al objetivo actual":"Completa el objetivo";}
  if(forceShow||coach.classList.contains("hidden"))coach.classList.remove("hidden");requestAnimationFrame(()=>applyBasicTutorialTarget(step));
}

function ensureStatsTutorialModal(){
  let modal=$("statsTutorialModal");
  if(modal)return modal;
  modal=document.createElement("div");
  modal.id="statsTutorialModal";
  modal.className="stats-tutorial-modal hidden";
  modal.innerHTML=`
    <div class="stats-tutorial-card">
      <div class="stats-tutorial-head">
        <div>
          <div class="stats-tutorial-kicker">Mini tutorial</div>
          <h2>Stats básicos de HallValla</h2>
        </div>
        <button id="statsTutorialCloseX" class="stats-tutorial-x" type="button" aria-label="Cerrar tutorial">×</button>
      </div>
      <p class="stats-tutorial-intro">Antes del primer duelo, aprende qué significa cada número. No necesitas memorizarlo todo: piensa en esto como tu brújula de batalla.</p>
      <div class="stats-tutorial-grid">
        <div class="stats-tutorial-stat"><b>HP / Vida</b><span>Cuánto daño puede resistir la unidad antes de caer.</span></div>
        <div class="stats-tutorial-stat"><b>AT / Ataque</b><span>Daño base que causa al atacar. Más AT significa golpes más fuertes.</span></div>
        <div class="stats-tutorial-stat"><b>GD / Guardia</b><span>Amortigua el daño recibido durante el turno. Se consume antes de la Vida y se restaura al inicio del turno de su dueño si la unidad sobrevive.</span></div>
        <div class="stats-tutorial-stat"><b>DX / Destreza</b><span>Técnica de combate. En ataque suma a la precisión; en defensa suma a la evasión.</span></div>
        <div class="stats-tutorial-stat"><b>AGI / Agilidad</b><span>Velocidad táctica. También suma a precisión y evasión, por eso las unidades ágiles golpean y esquivan mejor.</span></div>
        <div class="stats-tutorial-stat"><b>MV / Movimiento</b><span>Cuántas casillas puede moverse una unidad durante su acción.</span></div>
        <div class="stats-tutorial-stat"><b>RG / Rango</b><span>Distancia máxima de ataque. Rango 1 es cuerpo a cuerpo.</span></div>
        <div class="stats-tutorial-stat"><b>Costo / Honor/Mana</b><span>Recurso necesario para jugar cartas. Con Hechicero se muestra como Mana; con otros líderes, como Honor.</span></div>
      </div>
      <div class="stats-tutorial-leaders">
        <b>Fórmula de precisión y evasión</b>
        <span>PREC/EVA = DX + AGI - stats gastados este turno. Atacar consume solo la precisión necesaria para superar la evasión disponible del objetivo. Recibir ataques reduce más la evasión. La reserva vuelve al inicio del próximo turno del dueño. Contra líderes, el golpe impacta fijo y la Guardia absorbe daño primero.</span>
      </div>
      <div class="stats-tutorial-leaders">
        <b>Recuerda los líderes</b>
        <span>Guerrero mejora solo infantería pesada. Arquero mejora solo arqueras. Hechicero mejora solo magias.</span>
      </div>
      <div class="stats-tutorial-actions">
        <button id="statsTutorialLaterBtn" class="btn ghost" type="button">Ver luego</button>
        <button id="statsTutorialOkBtn" class="btn primary" type="button">Entendido, continuar</button>
      </div>
    </div>`;
  document.body.appendChild(modal);
  return modal;
}
function showStatsTutorial({force=false,onDone=null}={}){
  return new Promise(resolve=>{
    if(!force&&hasSeenStatsTutorial()){
      if(typeof onDone==="function")onDone();
      resolve(false);
      return;
    }
    const modal=ensureStatsTutorialModal();
    const finish=(seen)=>{
      modal.classList.add("hidden");
      if(seen)markStatsTutorialSeen();
      if(typeof onDone==="function")onDone();
      resolve(seen);
    };
    const ok=$("statsTutorialOkBtn");
    const later=$("statsTutorialLaterBtn");
    const x=$("statsTutorialCloseX");
    if(ok)ok.onclick=()=>finish(true);
    if(later)later.onclick=()=>finish(false);
    if(x)x.onclick=()=>finish(false);
    modal.classList.remove("hidden");
  });
}
function runFirstTimeTutorialBefore(action){
  return showStatsTutorial({force:false,onDone:action});
}

function openBattleMenu(){const panel=$("battleMenuPanel");if(panel){panel.classList.remove("hidden");renderBattleChrome();}}
function closeBattleMenu(){const panel=$("battleMenuPanel");if(panel)panel.classList.add("hidden");}
function toggleBattleActions(){actionsCollapsed=!actionsCollapsed;renderBattleChrome();}
function toggleBattleSound(){gameSettings.sound=!gameSettings.sound;saveGameSettings();if(!gameSettings.sound)stopMusic(false);else refreshAudioState();renderBattleChrome();}
function toggleBattleMusic(){gameSettings.music=!gameSettings.music;if(gameSettings.music&&clampAudioVolume(gameSettings.musicVolume,.32)<=0)gameSettings.musicVolume=.32;saveGameSettings();refreshAudioState();renderBattleChrome();}
function toggleBattleSfx(){gameSettings.sfx=!gameSettings.sfx;if(gameSettings.sfx&&clampAudioVolume(gameSettings.sfxVolume,.58)<=0)gameSettings.sfxVolume=.58;saveGameSettings();renderBattleChrome();if(gameSettings.sound&&gameSettings.sfx)tryPlaySound("button_click",.25);}
function setBattleMusicVolume(value){
  const vol=clampAudioVolume(Number(value)/100,.32);
  gameSettings.musicVolume=vol;
  if(vol>0)gameSettings.music=true;
  saveGameSettings();
  if(currentMusic){try{currentMusic.volume=vol;}catch(e){}}
  if(gameSettings.sound&&gameSettings.music)syncBattleMusic();
  renderBattleChrome();
}
function setBattleSfxVolume(value){
  const vol=clampAudioVolume(Number(value)/100,.58);
  gameSettings.sfxVolume=vol;
  if(vol>0)gameSettings.sfx=true;
  saveGameSettings();
  renderBattleChrome();
}
async function resetCurrentDuelFromMenu(){
  closeBattleMenu();
  if(!gameId||!publicState){return;}
  if(publicState.mode==="adventure"){
    if(await hvConfirm("¿Reiniciar este duelo de aventura desde el inicio?","Reiniciar duelo","Reiniciar","Cancelar",true))retryCurrentAdventureBattle();
    return;
  }
  await hvAlert("Para no romper la partida del otro jugador, el reinicio directo queda reservado para aventura contra IA. En online, salgan al menú y creen una sala nueva cuando ambos estén listos.","Reinicio online bloqueado");
}
async function leaveCurrentGameFromMenu(){
  closeBattleMenu();
  if(!gameId){leaveCurrentGame();return;}
  if(await hvConfirm("¿Salir del duelo y volver al menú principal?","Salir del duelo","Salir","Cancelar"))leaveCurrentGame();
}
