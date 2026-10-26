"use strict";
/* HallValla v320  -  Cruceta: habilidades manuales de lider.
   No asigna órdenes a unidades. El motor y la seguridad validan cada uso. */
function hallvallaRtGetTacticalOrder(unit){
  if(!unit||!unit.id)return null;
  if(Number(unit.owner)===Number(myPlayer||1)&&globalThis.hvControlIsAuto?.())return null;
  const order=publicState?.hvPlayerUnitOrders?.[String(unit.id)]||null;
  if(!order||Number(order.owner)!==Number(unit.owner))return null;
  if(order.mode==='attack'&&!((publicState?.units||[]).some(u=>String(u.id)===String(order.targetId)&&Number(u.hp||0)>0)))return null;
  return order;
}
globalThis.hallvallaRtGetTacticalOrder=hallvallaRtGetTacticalOrder;
const hvLeaderMenu={open:false,category:"",index:0,busy:false,refresh:null};
const HV_LEADER_DEFENSIVE=new Set([
 "fortify_ranks","iron_shell","shared_guard","last_formation","last_bastion",
 "celestial_blessing","iron_banner","war_gallop","conqueror_breath","unstoppable_cavalry",
 "shadow_cloak","smoke_curtain","ancestral_hide","alpha_instinct","pack_howl",
 "war_cry","berserker_frenzy","uncontained_rage","poisoned_blades","double_dagger","order_offense"
]);
function hvLeaderMenuEscape(x){return String(x??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[c]);}
function hvLeaderMenuOwner(){return Number(myPlayer||1);}
function hvLeaderMenuBattle(){
 const shell=document.getElementById("gameShell");
 return !!(shell&&!shell.classList.contains("hidden")&&publicState&&!isBattleEnded()&&typeof isHallvallaRealtime==="function"&&isHallvallaRealtime());
}
function hvLeaderMenuSkills(category){
 const catalog=globalThis.HV_LEADER_NINE_SKILLS;
 const owner=hvLeaderMenuOwner(),units=publicState?.units||[];
 const leader=units.find(u=>u&&u.leader&&Number(u.owner)===owner&&Number(u.hp||0)>0);
 if(!leader||!catalog)return [];
 const now=typeof hallvallaRtNow==="function"?hallvallaRtNow():Date.now();
 return (catalog.catalog[leader.leaderType]||[]).map(entry=>{
   const state=catalog.manualStatus(units,owner,entry.id,now);
   return {...entry,state,category:HV_LEADER_DEFENSIVE.has(entry.id)?"defense":"offense"};
 }).filter(entry=>entry.category===category&&entry.state?.available);
}
function hvLeaderMenuEnsure(){
 const shell=document.getElementById("gameShell");if(!shell)return null;
 let panel=document.getElementById("hvLeaderSkillPanel");if(panel)return panel;
 const css=document.createElement("style");css.id="hvLeaderSkillPanelStyle";
 css.textContent=`#hvLeaderSkillPanel{position:absolute;right:1.8%;top:41%;width:min(310px,30%);max-height:54%;overflow-y:auto;z-index:180;box-sizing:border-box;border:1px solid #c5a467;background:rgba(12,20,35,.97);box-shadow:0 10px 25px #000b;border-radius:10px;padding:12px;color:#f2ead8;font-family:inherit;pointer-events:auto}#hvLeaderSkillPanel[hidden]{display:none!important}#hvLeaderSkillPanel button{cursor:pointer;color:inherit;font:inherit}#hvLeaderSkillPanel .hv-ls-title{font-weight:bold;font-size:13px;display:flex;justify-content:space-between;gap:7px;margin-bottom:10px}#hvLeaderSkillPanel .hv-ls-back{background:#283347;border:1px solid #9d8b69;border-radius:5px;padding:4px 8px;font-size:11px}#hvLeaderSkillPanel .hv-ls-choices{display:grid;gap:7px}#hvLeaderSkillPanel .hv-ls-choice{background:#222f46;border:1px solid #65768a;border-radius:6px;text-align:left;padding:8px;font-size:12px}#hvLeaderSkillPanel .hv-ls-choice.active{border-color:#f2cb76;background:#534329}#hvLeaderSkillPanel .hv-ls-small{display:block;color:#cac4b8;font-size:10px;margin-top:3px}#hvLeaderSkillPanel .hv-ls-info{font-size:11px;color:#dbc798;padding:7px 0}#hvLeaderSkillPanel .hv-ls-footer{font-size:10px;color:#b5bac8;margin-top:9px}#hvLeaderSkillPanel button:focus-visible{outline:2px solid #ffe19c}@media(max-width:720px){#hvLeaderSkillPanel{right:1%;top:39%;width:35%;max-height:58%;padding:7px}#hvLeaderSkillPanel .hv-ls-choice{padding:6px;font-size:11px}}`;
 document.head.appendChild(css);panel=document.createElement("section");panel.id="hvLeaderSkillPanel";panel.hidden=true;panel.setAttribute("role","group");panel.setAttribute("aria-label","Habilidades del lider");
 panel.addEventListener("click",ev=>{const b=ev.target.closest("button");if(!b)return;
   if(b.dataset.hvLsBack!==undefined){hvLeaderMenuBack();return;}
   if(b.dataset.hvLsCategory){hvLeaderMenuCategory(b.dataset.hvLsCategory);return;}
   if(b.dataset.hvLsIndex!==undefined){hvLeaderMenu.index=Number(b.dataset.hvLsIndex)||0;hvLeaderMenuConfirm();}
 });
 shell.appendChild(panel);return panel;
}
function hvLeaderMenuRender(){
 const panel=hvLeaderMenuEnsure();if(!panel)return;
 if(!hvLeaderMenu.open||!hvLeaderMenuBattle()||globalThis.hvControlIsAuto?.()){panel.hidden=true;return;}
 panel.hidden=false;
 const leader=(publicState?.units||[]).find(u=>u?.leader&&Number(u.owner)===hvLeaderMenuOwner());
 const title=hvLeaderMenu.category==="offense"?"OFENSIVAS":hvLeaderMenu.category==="defense"?"DEFENSIVAS":"HABILIDADES DEL LIDER";
 let content="";
 if(!hvLeaderMenu.category){
   content='<div class="hv-ls-choices"><button class="hv-ls-choice" data-hv-ls-category="offense">&#8593; Ofensivas</button><button class="hv-ls-choice" data-hv-ls-category="defense">&#8592; Defensivas y apoyo</button></div>';
 }else{
   const skills=hvLeaderMenuSkills(hvLeaderMenu.category);
   hvLeaderMenu.index=skills.length?Math.min(hvLeaderMenu.index,skills.length-1):0;
   content=skills.length?'<div class="hv-ls-choices">'+skills.map((entry,i)=>`<button class="hv-ls-choice${hvLeaderMenu.index===i?" active":""}" data-hv-ls-index="${i}"><strong>${hvLeaderMenuEscape(entry.name)}</strong><span class="hv-ls-small">1 MANA  -  ${hvLeaderMenuEscape(entry.desc)}</span></button>`).join("")+'</div>':'<div class="hv-ls-info">No hay habilidades listas. Las utilizadas reaparecerán al terminar su recarga.</div>';
 }
 const mana=Math.max(0,Number(privateState?.honor||0));
 panel.innerHTML=`<div class="hv-ls-title"><span>${hvLeaderMenuEscape(leader?.name||"Lider")}  -  ${title}</span><button class="hv-ls-back" data-hv-ls-back>B  -  Volver</button></div>${content}<div class="hv-ls-footer">Mana: ${mana}  -  Cruceta: seleccionar  -  A: activar  -  B: salir</div>`;
}
function hvLeaderMenuCategory(category){if(!hvLeaderMenu.open)return false;if(category!=="offense"&&category!=="defense")return false;hvLeaderMenu.category=category;hvLeaderMenu.index=0;hvLeaderMenuRender();return true;}
function hvLeaderMenuIsOpen(){return hvLeaderMenu.open;}
function hvLeaderMenuOpen(category=""){
 if(!hvLeaderMenuBattle()||globalThis.hvControlIsAuto?.())return false;
 hvLeaderMenu.open=true;hvLeaderMenu.category="";hvLeaderMenu.index=0;
 hvLeaderMenuRender();if(category)hvLeaderMenuCategory(category);
 if(hvLeaderMenu.refresh===null)hvLeaderMenu.refresh=setInterval(()=>{if(!hvLeaderMenu.open){clearInterval(hvLeaderMenu.refresh);hvLeaderMenu.refresh=null;return;}hvLeaderMenuRender();},250);
 return true;
}
function hvLeaderMenuDirection(dx,dy){
 if(!hvLeaderMenuBattle()||globalThis.hvControlIsAuto?.())return false;
 if(!hvLeaderMenu.open){if(dy<0)return hvLeaderMenuOpen("offense");if(dx<0)return hvLeaderMenuOpen("defense");return false;}
 if(!hvLeaderMenu.category){if(dy<0)return hvLeaderMenuCategory("offense");if(dx<0)return hvLeaderMenuCategory("defense");return true;}
 if(dx<0&&hvLeaderMenu.category!=="defense")return hvLeaderMenuCategory("defense");
 if(dx>0&&hvLeaderMenu.category!=="offense")return hvLeaderMenuCategory("offense");
 const skills=hvLeaderMenuSkills(hvLeaderMenu.category);
 if(skills.length&&dy)hvLeaderMenu.index=(hvLeaderMenu.index+(dy>0?1:-1)+skills.length)%skills.length;
 hvLeaderMenuRender();return true;
}
function hvLeaderMenuBack(){
 if(!hvLeaderMenu.open)return false;
 if(hvLeaderMenu.category){hvLeaderMenu.category="";hvLeaderMenu.index=0;hvLeaderMenuRender();return true;}
 hvLeaderMenu.open=false;const panel=document.getElementById("hvLeaderSkillPanel");if(panel)panel.hidden=true;return true;
}
function hvLeaderMenuConfirm(){
 if(!hvLeaderMenu.open||hvLeaderMenu.busy||globalThis.hvControlIsAuto?.())return true;
 if(!hvLeaderMenu.category)return true;
 const skills=hvLeaderMenuSkills(hvLeaderMenu.category),chosen=skills[hvLeaderMenu.index];if(!chosen)return true;
 const owner=hvLeaderMenuOwner(),mana=Math.max(0,Number(privateState?.honor||0));
 if(mana<1){setHint("Necesitas 1 MANA para activar la habilidad del lider.");return true;}
 const catalog=globalThis.HV_LEADER_NINE_SKILLS;
 const now=typeof hallvallaRtNow==="function"?hallvallaRtNow():Date.now();
 const before=[...(publicState?.units||[])];
 const outcome=catalog.manualActivate(before,owner,chosen.id,now,mana);
 if(!outcome?.changed){setHint(outcome?.reason||"La habilidad no tiene objetivos válidos.");hvLeaderMenuRender();return true;}
 hvLeaderMenu.busy=true;
 try{
   let units=outcome.units;
   if(typeof applyLegendaryFatalSaves==="function")units=applyLegendaryFatalSaves(units,units.filter(u=>Number(u.hp||0)<=0).map(u=>u.id));
   units=units.filter(u=>Number(u.hp||0)>0);
   const remaining=Math.max(0,mana-1);
   const publicPatch={units,battleFxEvent:outcome.battleFxEvent||null,
     [`playerStats/${owner}/honor`]:remaining,
     log:[`J${owner} activa ${chosen.name} por 1 MANA.`,...(outcome.logs||[]),...(publicState?.log||[])].slice(0,18)};
   const privatePatch={honor:remaining};
   hallvallaRtApplyImmediateCastState(publicPatch,privatePatch,before);
   if(publicState?.mode==="online")hallvallaRtQueueOnlineCastCheckpoint(publicPatch,privatePatch,`leader-skill:${chosen.id}`);
   setHint(`${chosen.name}: -1 MANA.`);
 }catch(error){console.error("[HallValla] Habilidad de lider",error);setHint("No se pudo activar la habilidad.");}
 finally{hvLeaderMenu.busy=false;hvLeaderMenuRender();}
 return true;
}
// La selección de unidades ya no abre el sistema anterior de órdenes.
function hallvallaRtTacticalSelectUnit(unit){return !!globalThis.hvControlOpenUnitOrders?.(unit);}
function hallvallaRtTacticalIsOpen(){return false;}
function hallvallaRtTacticalTargeting(){return false;}
Object.assign(globalThis,{hvLeaderMenuIsOpen,hvLeaderMenuOpen,hvLeaderMenuDirection,hvLeaderMenuConfirm,hvLeaderMenuBack,
 hallvallaRtTacticalSelectUnit,hallvallaRtTacticalIsOpen,hallvallaRtTacticalTargeting});
document.addEventListener("keydown",ev=>{
 if(ev.altKey||ev.ctrlKey||ev.metaKey||ev.target?.closest?.("input,textarea,select,[contenteditable='true']")||!hvLeaderMenuBattle())return;
 const dirs={ArrowUp:[0,-1],ArrowDown:[0,1],ArrowLeft:[-1,0],ArrowRight:[1,0]};
 if(dirs[ev.code]&&(hvLeaderMenu.open||ev.code==="ArrowUp"||ev.code==="ArrowLeft")){ev.preventDefault();ev.stopImmediatePropagation();hvLeaderMenuDirection(...dirs[ev.code]);}
 else if(ev.code==="Enter"&&hvLeaderMenu.open){ev.preventDefault();ev.stopImmediatePropagation();hvLeaderMenuConfirm();}
 else if((ev.code==="Escape"||ev.code==="Backspace")&&hvLeaderMenu.open){ev.preventDefault();ev.stopImmediatePropagation();hvLeaderMenuBack();}
},true);
// HallValla v327: selector compacto visible y autonomia opcional del lider.
// Este modulo no modifica los intervalos de ataque/movimiento ni el motor de dano.
const HV_CONTROL_MODE_KEY='hallvalla_control_mode_v327';
const hvControl={mode:'manual',session:'',autoBusy:false,ui:null,unitDialog:null,unitTimer:0,orderSignature:'',pending:null};
try{hvControl.mode=localStorage.getItem(HV_CONTROL_MODE_KEY)==='auto'?'auto':'manual';}catch(_){ }
function hvControlIsAuto(){return hvControl.mode==='auto';}
function hvControlEnsureUI(){
 const shell=document.getElementById('gameShell');if(!shell)return null;
 const existing=document.getElementById('hvModeControl');if(existing){hvControl.ui=existing;return existing;}
 if(!document.getElementById('hv327ModeStyle')){
  const css=document.createElement('style');css.id='hv327ModeStyle';
  css.textContent=`#hvModeControl{position:absolute;right:1.8%;top:30.5%;z-index:185;width:116px;box-sizing:border-box;display:flex;flex-direction:column;gap:3px;padding:6px;background:rgba(7,13,22,.95);border:1px solid #bb9651;border-radius:9px;box-shadow:0 8px 19px #000b;color:#dfc48b;pointer-events:auto;font-family:inherit}#hvModeControl[hidden]{display:none!important}#hvModeControl .hv-mode-title{text-align:center;letter-spacing:.5px;font-size:9px;font-weight:700}#hvModeControl .hv-mode-options{display:flex;gap:3px}#hvModeControl button{flex:1;min-width:0;padding:6px 3px;border-radius:5px;border:1px solid #7f6746;background:#182236;color:#d8c6a1;font-weight:700;font-size:10px;cursor:pointer;touch-action:manipulation}#hvModeControl button[aria-pressed="true"]{background:linear-gradient(#4a401d,#806128);border-color:#f4d47b;color:#fff8d2;box-shadow:0 0 8px #e5b9556b}#hvModeControl button:focus-visible{outline:2px solid #fff2be}#hvModeControl button.hv328-mode-pending{outline:2px solid #62d8ff!important;outline-offset:1px;box-shadow:0 0 12px #38c7ff99!important}#hvModeControl .hv328-mode-hint{font:700 8px/1.3 Arial,sans-serif;text-align:center;color:#bad8dc;letter-spacing:.1px}@media(max-width:720px){#hvModeControl{right:1%;top:30%;width:105px;padding:4px}#hvModeControl button{font-size:9px;padding:5px 2px}}`;
  document.head.appendChild(css);
 }
 const panel=document.createElement('div');panel.id='hvModeControl';panel.setAttribute('role','group');panel.setAttribute('aria-label','Modo de control del jugador');
 panel.innerHTML='<span class="hv-mode-title">CONTROL</span><span class="hv-mode-options"><button type="button" data-hv-mode="auto">AUTO</button><button type="button" data-hv-mode="manual">MANUAL</button></span><span class="hv328-mode-hint">SELECT: elegir</span>';
 panel.addEventListener('click',event=>{const button=event.target.closest('button[data-hv-mode]');if(button)hvControlSetMode(button.dataset.hvMode);});
 shell.appendChild(panel);hvControl.ui=panel;return panel;
}
function hvControlUpdateUI(){
 const panel=hvControlEnsureUI();if(!panel)return;
 panel.hidden=!hvLeaderMenuBattle();
 if(panel.hidden)return;
 panel.querySelectorAll('button[data-hv-mode]').forEach(button=>{const active=button.dataset.hvMode===hvControl.mode;button.setAttribute('aria-pressed',active?'true':'false');button.classList.toggle('hv328-mode-pending',button.dataset.hvMode===hvControl.pending);button.title=active?'Modo activo':'Cambiar a '+button.textContent;});
 const hint=panel.querySelector('.hv328-mode-hint');if(hint)hint.textContent=hvControl.pending?('START: confirmar '+hvControl.pending.toUpperCase()):'SELECT: elegir';
}
function hvControlSaveOrder(unit,mode,targetId=''){
 if(!unit||!unit.id||hvControlIsAuto()||Number(unit.owner)!==Number(myPlayer||1)||!hvLeaderMenuBattle())return false;
 const id=String(unit.id),orders={...(publicState?.hvPlayerUnitOrders||{})};
 if(mode==='free')delete orders[id];else orders[id]={mode,targetId:String(targetId||''),owner:Number(myPlayer||1)};
 const patch={hvPlayerUnitOrders:orders};
 hallvallaRtApplyImmediateCastState(patch,{},[]);
 if(publicState?.mode==='online')hallvallaRtQueueOnlineCastCheckpoint(patch,{},'tactical-order:'+id);
 return true;
}
function hvControlCloseUnitDialog(){
 if(hvControl.unitTimer){clearInterval(hvControl.unitTimer);hvControl.unitTimer=0;}
 hvControl.unitDialog?.remove();hvControl.unitDialog=null;hvControl.orderSignature='';
}
function hvControlSetMode(value){
 if(!['auto','manual'].includes(value)||!hvLeaderMenuBattle())return hvControl.mode;
 hvControl.pending=null;
 const was=hvControl.mode;
 hvControl.mode=value;
 try{localStorage.setItem(HV_CONTROL_MODE_KEY,value);}catch(_){ }
 if(value==='auto'){
  hvControlCloseUnitDialog();
  const old=publicState?.hvPlayerUnitOrders||{},orders={};
  for(const [id,order] of Object.entries(old))if(Number(order?.owner)!==Number(myPlayer||1))orders[id]=order;
  if(Object.keys(orders).length!==Object.keys(old).length){
   const patch={hvPlayerUnitOrders:orders};
   hallvallaRtApplyImmediateCastState(patch,{},[]);
   if(publicState?.mode==='online')hallvallaRtQueueOnlineCastCheckpoint(patch,{},'unit-orders:auto');
  }
  hvLeaderMenu.open=false;hvLeaderMenu.category='';
 }else if(was!==value||!hvLeaderMenu.open){
  hvLeaderMenu.open=true;hvLeaderMenu.category='';hvLeaderMenu.index=0;
  if(hvLeaderMenu.refresh===null)hvLeaderMenu.refresh=setInterval(()=>{if(!hvLeaderMenuBattle()||!hvLeaderMenu.open){clearInterval(hvLeaderMenu.refresh);hvLeaderMenu.refresh=null;return;}hvLeaderMenuRender();},350);
 }
 hvControlUpdateUI();hvLeaderMenuRender();
 try{if(was!==value)setHint(value==='auto'?'AUTO: lider y unidades actuan automaticamente.':'MANUAL: cruceta para lider y ordenes en unidades.');}catch(_){ }
 return value;
}
// SELECT propone un modo sin activarlo; START confirma y evita cambios involuntarios.
function hvControlCyclePending(){
 if(!hvLeaderMenuBattle()||hvControl.unitDialog)return false;
 const basis=hvControl.pending||hvControl.mode;
 hvControl.pending=basis==='manual'?'auto':'manual';
 hvControlUpdateUI();
 try{setHint('Modo '+hvControl.pending.toUpperCase()+' seleccionado. START para confirmar.');}catch(_){ }
 return true;
}
function hvControlHasPending(){return !!hvControl.pending;}
function hvControlConfirmPending(){
 if(!hvLeaderMenuBattle()||!hvControl.pending)return false;
 const selected=hvControl.pending;
 hvControl.pending=null;
 hvControlSetMode(selected);
 hvControlUpdateUI();
 try{setHint('Modo '+selected.toUpperCase()+' confirmado.');}catch(_){ }
 return true;
}
function hvControlSyncBattle(){
 const active=hvLeaderMenuBattle();
 const panel=hvControlEnsureUI();if(panel)panel.hidden=!active;
 if(!active){hvControl.session='';hvControl.pending=null;hvControlCloseUnitDialog();return;}
 const key=String(gameId||publicState?.code||'local')+':'+String(publicState?.createdAt||publicState?.battleStartedAt||'');
 if(hvControl.session!==key){
  hvControl.session=key;
  hvControl.pending=null;
  hvControlCloseUnitDialog();
  hvLeaderMenu.open=!hvControlIsAuto();hvLeaderMenu.category='';hvLeaderMenu.index=0;
  if(hvLeaderMenu.open){hvLeaderMenuRender();if(hvLeaderMenu.refresh===null)hvLeaderMenu.refresh=setInterval(()=>{if(!hvLeaderMenuBattle()||!hvLeaderMenu.open){clearInterval(hvLeaderMenu.refresh);hvLeaderMenu.refresh=null;return;}hvLeaderMenuRender();},350);}
 }
 hvControlUpdateUI();
}
function hvControlAutoCast(){
 if(!hvControlIsAuto()||!hvLeaderMenuBattle()||hvControl.autoBusy)return;
 const skills=globalThis.HV_LEADER_NINE_SKILLS;
 if(!skills||typeof skills.manualActivate!=='function'||typeof hallvallaRtApplyImmediateCastState!=='function')return;
 const pending=typeof hallvallaRtState!=='undefined'?(hallvallaRtState.onlinePendingCasts||[]):[];
 if(publicState?.mode==='online'&&pending.some(entry=>!entry.publicAck||!entry.privateAck))return;
 const owner=Number(myPlayer||1),mana=Math.max(0,Number(privateState?.honor||0));if(mana<1)return;
 const before=[...(publicState?.units||[])],leader=before.find(u=>u?.leader&&Number(u.owner)===owner&&Number(u.hp||0)>0);
 if(!leader)return;
 const now=typeof hallvallaRtNow==='function'?hallvallaRtNow():Date.now();
 let choice=null,outcome=null;
 for(const entry of skills.catalog?.[leader.leaderType]||[]){
  if(entry.mode==='passive'||!skills.manualStatus(before,owner,entry.id,now)?.available)continue;
  const candidate=skills.manualActivate(before,owner,entry.id,now,mana);
  if(candidate?.changed){choice=entry;outcome=candidate;break;}
 }
 if(!outcome)return;
 hvControl.autoBusy=true;
 try{
  let units=outcome.units;
  if(typeof applyLegendaryFatalSaves==='function')units=applyLegendaryFatalSaves(units,units.filter(u=>Number(u.hp||0)<=0).map(u=>u.id));
  units=units.filter(u=>Number(u.hp||0)>0);
  const remaining=mana-1;
  const patch={units,battleFxEvent:outcome.battleFxEvent||null,['playerStats/'+owner+'/honor']:remaining,
   log:['J'+owner+' AUTO: '+choice.name+' (-1 MANA).',...(outcome.logs||[]),...(publicState?.log||[])].slice(0,18)};
  const privatePatch={honor:remaining};
  hallvallaRtApplyImmediateCastState(patch,privatePatch,before);
  if(publicState?.mode==='online')hallvallaRtQueueOnlineCastCheckpoint(patch,privatePatch,'leader-auto:'+choice.id);
 }catch(error){console.warn('[HallValla v327] AUTO lider',error);}
 finally{hvControl.autoBusy=false;}
}
function hvControlUnitTargets(unit){
 return (publicState?.units||[]).filter(t=>t&&Number(t.hp||0)>0&&Number(t.owner)!==Number(unit.owner)&&
 !(typeof isStealthedUnit==='function'&&isStealthedUnit(t)&&!t.revealed));
}
function hvControlUnitOptions(unit){
 const key=String(unit?.key||'').toLowerCase(),support=!!(unit.healer||unit.reviver||unit.reanimator||/curand|sanador|healer|reviver/.test(key));
 const options=[{mode:'free',name:'Combate libre'},{mode:'defend',name:'Defender posicion'},
  {mode:'follow',name:'Seguir al lider'},{mode:'retreat',name:'Replegarse'}];
 if(!support&&unit.cannotAttack!==true)options.push({mode:'targets',name:/ninja|assassin|asesino/.test(key)?'Elegir victima':'Fijar enemigo'});
 return options;
}
function hvControlOpenUnitOrders(unit){
 if(hvControlIsAuto()||!hvLeaderMenuBattle()||!unit||unit.leader||Number(unit.owner)!==Number(myPlayer||1))return false;
 const id=String(unit.id||'');if(!id)return false;
 hvControlCloseUnitDialog();
 const shell=document.getElementById('gameShell');if(!shell)return false;
 const panel=document.createElement('section');panel.id='hvControlUnitDialog';
 panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');panel.setAttribute('aria-label','Ordenes tacticas de unidad');
 panel.style.cssText='position:absolute;right:1.8%;top:43%;z-index:240;width:min(305px,31%);max-height:54%;overflow:auto;background:#101a29;color:#f4e8cd;border:1px solid #c5a467;border-radius:9px;padding:10px;box-sizing:border-box;box-shadow:0 12px 28px #000b;pointer-events:auto;font:12px Arial,sans-serif';
 shell.appendChild(panel);hvControl.unitDialog=panel;
 let targetMode=false;
 const draw=()=>{
  if(!panel.isConnected)return;
  const live=(publicState?.units||[]).find(u=>String(u?.id)===id&&Number(u.hp||0)>0);
  if(!live||hvControlIsAuto()||!hvLeaderMenuBattle()){hvControlCloseUnitDialog();return;}
  const options=hvControlUnitOptions(live),targets=hvControlUnitTargets(live);
  const sig=JSON.stringify([targetMode,options.map(o=>o.mode),targets.map(u=>[u.id,u.name,u.hp])]);
  if(sig===hvControl.orderSignature)return;
  hvControl.orderSignature=sig;
  const buttons=targetMode?(targets.map(t=>`<button data-hv-target="${hvLeaderMenuEscape(t.id)}">${hvLeaderMenuEscape(t.name||t.key||'Enemigo')}</button>`).join('')||'<p>Sin enemigos visibles</p>'):
   options.map(o=>`<button data-hv-order="${o.mode}">${hvLeaderMenuEscape(o.name)}</button>`).join('');
  panel.innerHTML=`<b style="font-size:13px">${hvLeaderMenuEscape(live.name||'Unidad')} - ORDENES</b><div style="display:grid;gap:5px;margin-top:8px">${buttons}</div><button data-close="1" style="margin-top:9px">B - Volver</button>`;
  panel.querySelectorAll('button').forEach(b=>b.style.cssText='width:100%;background:#263753;color:#f4e8cd;border:1px solid #806c48;border-radius:5px;padding:7px;text-align:left;cursor:pointer;font:inherit');
 };
 panel.addEventListener('click',event=>{
  const button=event.target.closest('button');if(!button)return;
  if(button.hasAttribute('data-close')){hvControlCloseUnitDialog();return;}
  const live=(publicState?.units||[]).find(u=>String(u?.id)===id&&Number(u.hp||0)>0);if(!live)return;
  if(button.hasAttribute('data-hv-target')){hvControlSaveOrder(live,'attack',button.dataset.hvTarget);hvControlCloseUnitDialog();return;}
  const mode=button.dataset.hvOrder;
  if(mode==='targets'){targetMode=true;hvControl.orderSignature='';draw();return;}
  if(['free','defend','follow','retreat'].includes(mode)){hvControlSaveOrder(live,mode);hvControlCloseUnitDialog();}
 });
 draw();hvControl.unitTimer=setInterval(draw,500);
 return true;
}
Object.assign(globalThis,{hvControlIsAuto,hvControlSetMode,hvControlSyncBattle,hvControlOpenUnitOrders,hvControlCyclePending,hvControlHasPending,hvControlConfirmPending});
setInterval(()=>{try{hvControlSyncBattle();hvControlAutoCast();}catch(error){console.warn('[HallValla v327] Control',error);}},1200);
document.addEventListener('keydown',event=>{
 if(!hvControl.unitDialog||!['Escape','Backspace'].includes(event.code))return;
 event.preventDefault();event.stopImmediatePropagation();hvControlCloseUnitDialog();
},true);

