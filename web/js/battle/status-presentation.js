"use strict";
/* HallValla · Presentación de estados de combate */

function getUnitStatusEntries(u){
  if(!u)return [];
  const entries=[];
  const add=(label,name,desc,kind="neutral",icon="generic",extra={})=>entries.push({label,name,desc:typeof hallvallaPublicGameplayText==="function"?hallvallaPublicGameplayText(desc):desc,kind,icon,...extra});
  const n=v=>Number(v||0);
  if(u.reanimated){
    const source=(publicState?.units||[]).find(x=>x.id===u.reanimatedByErictoId&&x.key==="ericto"&&Number(x.hp||0)>0);
    add(`Reanimado`,`Reanimado por Ericto`,`Esta unidad regresó mediante Necromancia de Farsalia${source?` de ${source.name}`:""}. Conserva su identidad, estadísticas y habilidades, pero desaparecerá si su Ericto abandona el campo.`,"buff dex-buff","control");
  }
  if(u.resurrectedByHealer)add(`Resucitado`,`Resurrección curativa`,`Esta unidad regresó mediante la Acólita sanadora con la mitad de su Vida, sin debuffs y tratada como una invocación desde la mano. Puede actuar inmediatamente al regresar, pero este mismo cadáver no puede volver a resucitarse.`,"buff hp-buff","hp");
  if(u.key==="acolyte_healer"){
    const points=getUnitServicePoints(u),tier=getAcolyteServiceTier(u);
    add(`${points} servicio`,`Puntos de servicio`,`Progreso permanente de apoyo. Nivel de servicio ${tier}: ${points<50?"Transferencia vital disponible; Purificación se desbloquea en 50.":points<100?"Purificación desbloqueada; Resurrección se desbloquea en 100.":"Purificación y Resurrección desbloqueadas."}` ,"buff hp-buff","hp");
  }
  if(u.key==="hattori_hanzo"&&!u.hanzoContractConsumed)add(`Contrato`,`Contrato preparado`,`La primera unidad enemiga que Hattori Hanzō ataque desde Sigilo recibirá automáticamente el Contrato del Shogun: +3 DX y +2 AT para Hanzō, -3 Guardia para el objetivo y sin contraataque. No se activa contra líderes.` ,"buff dex-buff","control");
  if(n(u.tempMovDebuff)>0)add(`-${n(u.tempMovDebuff)} MOV`,`Movimiento reducido`,`Movimiento reducido mientras permanezca activo el efecto.${u.tempMovDebuffSource?` Origen: ${u.tempMovDebuffSource}.`:""}`,"debuff mov-debuff","debuff");
  if(getGenghisMovDebuff(u)>0)add(`-${getGenghisMovDebuff(u)} MOV`,`Horda de la Estepa`,`Movimiento reducido por Gengis Kan mientras permanezca activo el efecto.${u.genghisMovDebuffSource?` Origen: ${u.genghisMovDebuffSource}.`:""}`,"debuff mov-debuff","debuff");
  if(getHannibalMovDebuff(u)>0)add(`-${getHannibalMovDebuff(u)} MOV`,`Trampa de Cannas`,`Movimiento reducido por Hannibal Barca mientras permanezca activo el efecto.${u.hannibalMovDebuffSource?` Origen: ${u.hannibalMovDebuffSource}.`:""}`,"debuff mov-debuff","debuff");
  if(n(u.permMov)>0)add(`+${n(u.permMov)} MOV`,`Movimiento permanente`,`Movimiento permanente mientras la unidad siga en campo.` ,"buff mov-buff","buff");
  if(n(u.tempMovBuff)>0)add(`+${n(u.tempMovBuff)} MOV`,`Movimiento aumentado`,`Movimiento aumentado temporalmente hasta que el efecto expire.`,"buff mov-buff","buff");
  if(n(u.buffAtk)>0)add(`+${n(u.buffAtk)} AT`,`Ataque aumentado`,`Ataque aumentado temporalmente por magia o efecto.`,"buff atk-buff","buff");
  if(n(u.permAtk)>0)add(`+${n(u.permAtk)} AT`,`Ataque permanente`,n(u.bloodVictoryBuffs)>0?`Ataque aumentado por Victoria sangrienta (${n(u.bloodVictoryBuffs)} caída${n(u.bloodVictoryBuffs)===1?"":"s"} aliada${n(u.bloodVictoryBuffs)===1?"":"s"}). Permanece mientras la unidad esté en campo.`:`Ataque permanente acumulado.`,"buff atk-buff","buff");
  if(n(u.tempAtkBuff)>0)add(`+${n(u.tempAtkBuff)} AT`,`Ataque aumentado`,n(u.warCryBuffs)>0?`Ataque aumentado por Grito de Guerra (${n(u.warCryBuffs)} acumulación${n(u.warCryBuffs)===1?"":"es"}). Se limpia automáticamente cuando expire el efecto.`:`Ataque aumentado por efecto temporal.`,"buff atk-buff","buff");
  if(n(u.tempAtkDebuff)>0)add(`-${n(u.tempAtkDebuff)} AT`,`Ataque reducido`,`Ataque reducido por efecto temporal.`,"debuff atk-debuff","debuff");
  if(getHannibalAtkDebuff(u)>0)add(`-${getHannibalAtkDebuff(u)} AT`,`Trampa de Cannas`,`Ataque reducido por Hannibal Barca mientras permanezca activo el efecto.${u.hannibalAtkDebuffSource?` Origen: ${u.hannibalAtkDebuffSource}.`:""}`,"debuff atk-debuff","debuff");
  if(getKhalidAttackPenalty(u)>0)add(`-${getKhalidAttackPenalty(u)} AT`,`Espada Invicta`,`Penalización acumulada de Khalid por ataques encadenados. Se limpia en la siguiente restauración periódica de combate.`,"debuff atk-debuff","debuff");
  if(n(u.tempDexBuff)>0)add(`+${n(u.tempDexBuff)} DX`,`Destreza aumentada`,n(u.coverFireBuffs)>0?`Destreza aumentada por Fuego de cobertura (${n(u.coverFireBuffs)} acumulación${n(u.coverFireBuffs)===1?"":"es"}). Se limpia automáticamente cuando expire el efecto.`:`Destreza aumentada por efecto temporal.`,"buff dex-buff","buff");
  const igaDexForced=!!(u.saboteadorDexZeroTurnKey&&u.saboteadorDexZeroTurnKey===publicState?.turnKey);
  const legacyIgaDexHack=!!(u.saboteadorDexZeroTurnKey&&n(u.tempDexDebuff)>=90);
  if(igaDexForced)add(`DX 0`,`Escape Forzado`,`La Destreza de esta unidad está forzada a 0 temporalmente.${u.saboteadorDexZeroSource?` Origen: ${u.saboteadorDexZeroSource}.`:""}`,"debuff dex-debuff","debuff");
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
  if(n(u.tempGuardBuff)>0)add(`+${n(u.tempGuardBuff)} GD`,`Guardia aumentada`,n(u.steelWallBuffs)>0?`Guardia aumentada por Muro de acero (${n(u.steelWallBuffs)} acumulación${n(u.steelWallBuffs)===1?"":"es"}). Se limpia automáticamente cuando expire el efecto.`:`Guardia temporal adicional.`,"buff guard-buff","buff");
  if(n(u.tempGuardBuff)<0)add(`${n(u.tempGuardBuff)} GD`,`Guardia reducida`,`Guardia reducida por trampa o efecto temporal.`,"debuff guard-debuff","debuff");
  if(n(u.warningRuneGuard)>0)add(`◆ +${n(u.warningRuneGuard)} GD`,`Runa de advertencia`,`La próxima vez que esta unidad sea atacada, obtiene +${n(u.warningRuneGuard)} Guardia durante ese combate y la runa se consume.${u.warningRuneCardName?` Origen: ${u.warningRuneCardName}.`:""}`,"buff guard-buff","buff");
  if(u.defenseModeReady)add(`DEF +2 GD`,`Guardia defensiva`,`Postura defensiva: +2 Guardia y mejora su defensa ante el primer ataque recibido. Se consume con ese ataque o cuando expire la postura, lo que ocurra primero.`,"buff guard-buff","defense");
  /* v168: Precisión/Evasión siguen existiendo como mecánica interna, pero su
     reserva/desgaste ya no se publica como badge de estado en el campo. */
  if(hasBleeding(u))add(`Sangrado`,`Sangrado`,`Sangrado: pierde ${u.bleedDamage||1} Vida periódicamente${getBleedDurationText(u)}.${u.bleedSourceName?` Origen: ${u.bleedSourceName}.`:""}`,"debuff bleed","bleed");
  if(hasActiveBlessedArmor(u))add(`1ra muerte negada`,`Armadura bendita`,`La primera muerte del líder fue negada. Su vida quedó en 1 y la protección temporal evita pérdida adicional de Vida mientras permanezca activa.`,"buff guard-buff","buff");
  if(u.leader&&u.leaderType==="archer"&&u.leaderAbility==="arrow_rain")add(`Auto`,`Lluvia de flechas`,`Habilidad Nv.5 automática: cuando se activa, si hay unidades enemigas a rango 3 o menos, inflige 1 daño directo a todas las que estén dentro de rango 3, ignorando Guardia y stats. También afecta Sigilo.`,"buff dex-buff","buff");
  if(u.leader&&u.leaderType==="mage"&&u.leaderAbility==="arcane_bolt")add(`Auto`,`Descarga arcana`,`Habilidad Nv.5 automática: cuando se activa, inflige 2 de daño directo al líder enemigo, ignorando Guardia y stats de combate.`,"buff dex-buff","buff");
  if((n(u.poisonTurns)>0||u.poisonPersistent)&&n(u.poisonDamage)>0)add(`Veneno ${n(u.poisonDamage)}`,`Veneno`,`Veneno persistente: pierde Vida en cada ciclo táctico. El daño progresa hasta su máximo y después continúa hasta que sea curado o la unidad muera.`,"debuff poison","poison");
  if((n(u.burnTurns)>0||u.burnPersistent)&&n(u.burnDamage)>0)add(`Quemadura ${n(u.burnDamage)}`,`Quemadura`,`Quemadura persistente: pierde ${n(u.burnDamage)} Vida directa por ciclo, ignora Guardia y no afecta líderes. No desaparece sola y mientras arde su Destreza es 0.`,"debuff burn","burn");
  if(isRhinoStunnedNow(u))add(`Aturdido`,`Aturdido por Impacto`,`No puede moverse, defenderse ni atacar mientras siga Aturdido. Su Guardia se mantiene igual y su Destreza/Agilidad quedan a la mitad.`,"debuff lock","lock");
  if(u.noMoveTurnKey&&u.noMoveTurnKey===publicState?.turnKey)add(`No mover`,`Movimiento bloqueado`,`No puede moverse mientras el bloqueo esté activo.`,"debuff lock","lock");
  if(u.noAttackTurnKey&&u.noAttackTurnKey===publicState?.turnKey)add(`No atacar`,`Ataque bloqueado`,`No puede atacar mientras el bloqueo esté activo.`,"debuff lock","lock");
  if(u.noDefTurnKey&&u.noDefTurnKey===publicState?.turnKey)add(`No DEF`,`Defensa bloqueada`,`No puede usar defensa mientras el bloqueo esté activo.`,"debuff lock","lock");
  if(u.noCounterTurnKey&&u.noCounterTurnKey===publicState?.turnKey)add(`No contraataque`,`Contraataque bloqueado`,`No puede contraatacar mientras el bloqueo esté activo.`,"debuff lock","lock");
  if(u.silencedTurnKey&&u.silencedTurnKey===publicState?.turnKey)add(`Silencio`,`Silencio`,`Silenciada: no puede activar efectos mientras el bloqueo esté activo.`,"debuff silence","silence");
  if(u.noHealTurnKey&&u.noHealTurnKey===publicState?.turnKey)add(`No cura`,`Curación bloqueada`,`No puede recibir curación mientras el bloqueo esté activo.`,"debuff curse","curse");
  if(u.noReductionTurnKey&&u.noReductionTurnKey===publicState?.turnKey)add(`Sin reducción`,`Reducción bloqueada`,`No puede usar reducciones especiales de daño mientras el bloqueo esté activo.`,"debuff curse","curse");
  if(u.ignoreGuardNextDamageTurnKey&&u.ignoreGuardNextDamageTurnKey===publicState?.turnKey)add(`Sin guardia`,`Guardia ignorada`,`El próximo daño contra esta unidad ignora Guardia.`,"debuff guard-debuff","debuff");
  if(u.doubleNextDamageTurnKey&&u.doubleNextDamageTurnKey===publicState?.turnKey)add(`Daño x2`,`Daño duplicado`,`El próximo daño recibido se duplica.`,"debuff curse","curse");
  if(u.noHealWhilePoisoned)add(`No cura`,`Curación bloqueada`,`No puede curarse mientras dure el veneno.`,"debuff poison","poison");
  if(u.richardBuffSource)add(`+2 Vida`,`Vida aumentada`,`Vida máxima y actual aumentada mientras Richard siga en campo.`,"buff hp-buff","hp");
  if(u.convertedByTrap)add(`Control`,`Control alterado`,`Unidad convertida temporalmente por trampa legendaria.`,"debuff curse","control");
  if(hasVeilCurse(u)){const count=Math.max(1,Number(u.veilCurseTurnsRemaining||1));add(`Cuenta ${count}`,`Cuenta regresiva mortal`,`El contador baja periódicamente. Cuando llegue a 0, esta unidad caerá derrotada. Puede eliminarse con Purificación. Fuente: ${u.veilCurseSourceName||"Morgana"}.`,"debuff curse","curse",{hiddenOnBoard:true});}
  return applyHallvallaValueHooks("unit.statusEntries",entries,{unit:u});
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
  if(!u)return applyHallvallaValueHooks("unit.statusBubblesHtml","",{unit:u});
  const entries=getUnitStatusEntries(u).filter(entry=>!entry.hiddenOnBoard);
  if(!entries.length)return applyHallvallaValueHooks("unit.statusBubblesHtml","",{unit:u});
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
  const html=`<div class="unit-status-bubbles unit-status-seals">${leftHtml?`<div class="status-seal-rail left">${leftHtml}</div>`:""}${rightHtml?`<div class="status-seal-rail right">${rightHtml}</div>`:""}${extra>0?`<div class="unit-status-seal-extra" title="${extra} estado(s) adicional(es). Abre DET para ver todos.">+${extra}</div>`:""}</div>`;
  return applyHallvallaValueHooks("unit.statusBubblesHtml",html,{unit:u});
}


function renderLeaderStatusSeal(entry,idx=0){
  const kind=escapeHtml(entry?.kind||"neutral");
  const shortText=getUnitStatusSealShortText(entry);
  const title=escapeHtml(`${entry?.name||entry?.label||"Estado"}: ${entry?.desc||""}`.trim());
  // TARGETPRIORITY1: el click se resuelve por delegación en leaderBasesLayer.
  // No usar onclick inline: durante ATTK / carta / EFFECT el objetivo del tablero
  // debe tener prioridad sobre el modal informativo del estado.
  return `<button class="leader-status-seal unit-status-seal ${kind}" type="button" data-status-index="${idx}" title="${title}" aria-label="${title}"><span class="unit-status-seal-ring" aria-hidden="true"></span><span class="unit-status-seal-core">${getStatusEntryIconHtml(entry)}</span>${shortText?`<span class="unit-status-seal-stack">${escapeHtml(shortText)}</span>`:""}</button>`;
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









