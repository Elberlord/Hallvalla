"use strict";
/* HallValla v320 Â· Cruceta: habilidades manuales de lÃ­der.
   No asigna Ã³rdenes a unidades. El motor y la seguridad validan cada uso. */
function hallvallaRtGetTacticalOrder(){return null;}
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
 css.textContent=`#hvLeaderSkillPanel{position:absolute;right:1.8%;top:13%;width:min(344px,36%);z-index:180;box-sizing:border-box;border:1px solid #c5a467;background:rgba(12,20,35,.97);box-shadow:0 10px 25px #000b;border-radius:10px;padding:12px;color:#f2ead8;font-family:inherit;pointer-events:auto}#hvLeaderSkillPanel[hidden]{display:none!important}#hvLeaderSkillPanel button{cursor:pointer;color:inherit;font:inherit}#hvLeaderSkillPanel .hv-ls-title{font-weight:bold;font-size:13px;display:flex;justify-content:space-between;gap:7px;margin-bottom:10px}#hvLeaderSkillPanel .hv-ls-back{background:#283347;border:1px solid #9d8b69;border-radius:5px;padding:4px 8px;font-size:11px}#hvLeaderSkillPanel .hv-ls-choices{display:grid;gap:7px}#hvLeaderSkillPanel .hv-ls-choice{background:#222f46;border:1px solid #65768a;border-radius:6px;text-align:left;padding:8px;font-size:12px}#hvLeaderSkillPanel .hv-ls-choice.active{border-color:#f2cb76;background:#534329}#hvLeaderSkillPanel .hv-ls-small{display:block;color:#cac4b8;font-size:10px;margin-top:3px}#hvLeaderSkillPanel .hv-ls-info{font-size:11px;color:#dbc798;padding:7px 0}#hvLeaderSkillPanel .hv-ls-footer{font-size:10px;color:#b5bac8;margin-top:9px}#hvLeaderSkillPanel button:focus-visible{outline:2px solid #ffe19c}@media(max-width:720px){#hvLeaderSkillPanel{right:1%;top:8%;width:41%;padding:7px}#hvLeaderSkillPanel .hv-ls-choice{padding:6px;font-size:11px}}`;
 document.head.appendChild(css);panel=document.createElement("section");panel.id="hvLeaderSkillPanel";panel.hidden=true;panel.setAttribute("role","group");panel.setAttribute("aria-label","Habilidades del lÃ­der");
 panel.addEventListener("click",ev=>{const b=ev.target.closest("button");if(!b)return;
   if(b.dataset.hvLsBack!==undefined){hvLeaderMenuBack();return;}
   if(b.dataset.hvLsCategory){hvLeaderMenuCategory(b.dataset.hvLsCategory);return;}
   if(b.dataset.hvLsIndex!==undefined){hvLeaderMenu.index=Number(b.dataset.hvLsIndex)||0;hvLeaderMenuConfirm();}
 });
 shell.appendChild(panel);return panel;
}
function hvLeaderMenuRender(){
 const panel=hvLeaderMenuEnsure();if(!panel)return;
 if(!hvLeaderMenu.open||!hvLeaderMenuBattle()){hvLeaderMenu.open=false;panel.hidden=true;return;}
 panel.hidden=false;
 const leader=(publicState?.units||[]).find(u=>u?.leader&&Number(u.owner)===hvLeaderMenuOwner());
 const title=hvLeaderMenu.category==="offense"?"OFENSIVAS":hvLeaderMenu.category==="defense"?"DEFENSIVAS":"HABILIDADES DEL LÃDER";
 let content="";
 if(!hvLeaderMenu.category){
   content='<div class="hv-ls-choices"><button class="hv-ls-choice" data-hv-ls-category="offense">â†‘ Ofensivas</button><button class="hv-ls-choice" data-hv-ls-category="defense">â† Defensivas y apoyo</button></div>';
 }else{
   const skills=hvLeaderMenuSkills(hvLeaderMenu.category);
   hvLeaderMenu.index=skills.length?Math.min(hvLeaderMenu.index,skills.length-1):0;
   content=skills.length?'<div class="hv-ls-choices">'+skills.map((entry,i)=>`<button class="hv-ls-choice${hvLeaderMenu.index===i?" active":""}" data-hv-ls-index="${i}"><strong>${hvLeaderMenuEscape(entry.name)}</strong><span class="hv-ls-small">1 MANÃ Â· ${hvLeaderMenuEscape(entry.desc)}</span></button>`).join("")+'</div>':'<div class="hv-ls-info">No hay habilidades listas. Las utilizadas reaparecerÃ¡n al terminar su recarga.</div>';
 }
 const mana=Math.max(0,Number(privateState?.honor||0));
 panel.innerHTML=`<div class="hv-ls-title"><span>${hvLeaderMenuEscape(leader?.name||"LÃ­der")} Â· ${title}</span><button class="hv-ls-back" data-hv-ls-back>B Â· Volver</button></div>${content}<div class="hv-ls-footer">ManÃ¡: ${mana} Â· Cruceta: seleccionar Â· A: activar Â· B: salir</div>`;
}
function hvLeaderMenuCategory(category){if(!hvLeaderMenu.open)return false;if(category!=="offense"&&category!=="defense")return false;hvLeaderMenu.category=category;hvLeaderMenu.index=0;hvLeaderMenuRender();return true;}
function hvLeaderMenuIsOpen(){return hvLeaderMenu.open;}
function hvLeaderMenuOpen(category=""){
 if(!hvLeaderMenuBattle())return false;
 hvLeaderMenu.open=true;hvLeaderMenu.category="";hvLeaderMenu.index=0;
 hvLeaderMenuRender();if(category)hvLeaderMenuCategory(category);
 if(hvLeaderMenu.refresh===null)hvLeaderMenu.refresh=setInterval(()=>{if(!hvLeaderMenu.open){clearInterval(hvLeaderMenu.refresh);hvLeaderMenu.refresh=null;return;}hvLeaderMenuRender();},250);
 return true;
}
function hvLeaderMenuDirection(dx,dy){
 if(!hvLeaderMenuBattle())return false;
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
 if(!hvLeaderMenu.open||hvLeaderMenu.busy)return true;
 if(!hvLeaderMenu.category)return true;
 const skills=hvLeaderMenuSkills(hvLeaderMenu.category),chosen=skills[hvLeaderMenu.index];if(!chosen)return true;
 const owner=hvLeaderMenuOwner(),mana=Math.max(0,Number(privateState?.honor||0));
 if(mana<1){setHint("Necesitas 1 MANÃ para activar la habilidad del lÃ­der.");return true;}
 const catalog=globalThis.HV_LEADER_NINE_SKILLS;
 const now=typeof hallvallaRtNow==="function"?hallvallaRtNow():Date.now();
 const before=[...(publicState?.units||[])];
 const outcome=catalog.manualActivate(before,owner,chosen.id,now,mana);
 if(!outcome?.changed){setHint(outcome?.reason||"La habilidad no tiene objetivos vÃ¡lidos.");hvLeaderMenuRender();return true;}
 hvLeaderMenu.busy=true;
 try{
   let units=outcome.units;
   if(typeof applyLegendaryFatalSaves==="function")units=applyLegendaryFatalSaves(units,units.filter(u=>Number(u.hp||0)<=0).map(u=>u.id));
   units=units.filter(u=>Number(u.hp||0)>0);
   const remaining=Math.max(0,mana-1);
   const publicPatch={units,battleFxEvent:outcome.battleFxEvent||null,
     [`playerStats/${owner}/honor`]:remaining,
     log:[`J${owner} activa ${chosen.name} por 1 MANÃ.`,...(outcome.logs||[]),...(publicState?.log||[])].slice(0,18)};
   const privatePatch={honor:remaining};
   hallvallaRtApplyImmediateCastState(publicPatch,privatePatch,before);
   if(publicState?.mode==="online")hallvallaRtQueueOnlineCastCheckpoint(publicPatch,privatePatch,`leader-skill:${chosen.id}`);
   setHint(`${chosen.name}: -1 MANÃ.`);
 }catch(error){console.error("[HallValla] Habilidad de lÃ­der",error);setHint("No se pudo activar la habilidad.");}
 finally{hvLeaderMenu.busy=false;hvLeaderMenuRender();}
 return true;
}
// La selecciÃ³n de unidades ya no abre el sistema anterior de Ã³rdenes.
function hallvallaRtTacticalSelectUnit(){return false;}
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