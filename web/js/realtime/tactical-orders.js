"use strict";
/* HallValla v318 · Ordenes tacticas opcionales. No altera el motor de ataque, habilidades ni MOV. */
const HV_TACTICAL_OPTIONS=Object.freeze({
  offense:{title:"OFENSIVA",items:{up:{mode:"attack",label:"Eliminar objetivo",target:true},left:{mode:"priority",label:"Priorizar objetivo",target:true}}},
  defense:{title:"DEFENSA",items:{up:{mode:"defend",label:"Defender posicion"},left:{mode:"retreat",label:"Retirada"}}},
  movement:{title:"MOVIMIENTO",items:{up:{mode:"follow",label:"Seguir al lider"},left:{mode:"retreat",label:"Reagruparse"}}},
  general:{title:"GENERAL",items:{up:{mode:"auto",label:"Automatico"}}}
});
const HV_TACTICAL_DIRECTIONS=Object.freeze({up:"offense",left:"defense",right:"movement",down:"general"});
const HV_TACTICAL_GLYPHS=Object.freeze({up:"↑",down:"↓",left:"←",right:"→"});
const HV_TACTICAL_LABELS=Object.freeze({auto:"Automatico",attack:"Eliminar objetivo",priority:"Priorizar objetivo",defend:"Defender posicion",follow:"Seguir al lider",retreat:"Retirada"});
const hvTacticalUi={unitId:"",category:"",pending:null,targeting:false};

function hallvallaRtGetTacticalOrder(unit){
  if(!unit||unit.leader)return null;
  const id=String(unit.id||"");
  const own=Number(unit.owner)===Number(myPlayer);
  const fromPrivate=own?privateState?.rtTacticalOrders?.[id]:null;
  const order=fromPrivate||publicState?.rtTacticalOrders?.[id]||null;
  if(!order||order.mode==="auto"||!HV_TACTICAL_LABELS[order.mode])return null;
  if(order.mode==="attack"||order.mode==="priority"){
    const target=(publicState?.units||[]).find(u=>u&&String(u.id)===String(order.targetId)&&Number(u.owner)!==Number(unit.owner)&&Number(u.hp||0)>0);
    if(!target||typeof hallvallaRtVisibleEnemy==="function"&&!hallvallaRtVisibleEnemy(unit,target))return null;
  }
  return order;
}
globalThis.hallvallaRtGetTacticalOrder=hallvallaRtGetTacticalOrder;

function hallvallaRtTacticalSelectedUnit(){
  const u=(publicState?.units||[]).find(v=>String(v.id)===hvTacticalUi.unitId&&Number(v.hp||0)>0);
  return u&&u.owner===myPlayer&&!u.leader?u:null;
}
function hallvallaRtTacticalIsOpen(){return !!hvTacticalUi.unitId;}
function hallvallaRtTacticalTargeting(){return !!(hvTacticalUi.unitId&&hvTacticalUi.targeting);}

function hallvallaRtTacticalEnsureUi(){
  const shell=document.getElementById("gameShell");if(!shell)return null;
  let panel=document.getElementById("hvTacticalPanel");
  if(panel)return panel;
  const style=document.createElement("style");style.id="hvTacticalStyles";
  style.textContent=`#hvTacticalPanel{position:absolute;right:2.2%;top:15%;width:min(316px,34%);z-index:160;box-sizing:border-box;border:1px solid #b99c61;background:rgba(13,18,29,.96);box-shadow:0 9px 24px rgba(0,0,0,.65);border-radius:10px;padding:11px;color:#f2ead8;font-family:inherit;pointer-events:auto}
#hvTacticalPanel[hidden]{display:none!important}#hvTacticalPanel button{font:inherit;cursor:pointer;color:inherit}#hvTacticalPanel .hv-t-header{display:flex;align-items:center;justify-content:space-between;gap:8px;font-size:12px;font-weight:bold;margin-bottom:9px}
#hvTacticalPanel .hv-t-close{background:transparent;border:1px solid #80765e;border-radius:5px;padding:3px 7px}#hvTacticalPanel .hv-t-state{color:#d8b979;font-size:11px;margin:5px 0 9px}
#hvTacticalPanel .hv-t-grid{display:grid;grid-template-columns:1fr 1fr;gap:6px}#hvTacticalPanel .hv-t-opt{background:#252f41;border:1px solid #6f7788;border-radius:6px;padding:8px 5px;min-height:36px;font-size:11px;text-align:center}
#hvTacticalPanel .hv-t-opt.active{border-color:#f6cb71;background:#55402a}#hvTacticalPanel .hv-t-opt:focus-visible,#hvTacticalPanel .hv-t-close:focus-visible{outline:2px solid #ffdf9e}
#hvTacticalPanel .hv-t-guide{font-size:10px;color:#bcbec5;line-height:1.5;margin-top:9px}#hvTacticalPanel .hv-t-confirm{width:100%;margin-top:8px;padding:7px;background:#4a673b;border:1px solid #97ad82;border-radius:5px;font-size:12px}
#hvTacticalPanel .hv-t-confirm[disabled]{opacity:.5;cursor:default}#hvTacticalPanel .hv-t-target{color:#ffd37a;font-size:12px;padding:9px;background:#322b24;border-radius:5px;line-height:1.5}
@media (max-width:720px){#hvTacticalPanel{right:1%;top:9%;width:39%;padding:7px}#hvTacticalPanel .hv-t-opt{font-size:10px;padding:5px 2px;min-height:28px}#hvTacticalPanel .hv-t-guide{font-size:9px}}`;
  document.head.appendChild(style);
  panel=document.createElement("section");panel.id="hvTacticalPanel";panel.hidden=true;panel.setAttribute("role","group");panel.setAttribute("aria-label","Ordenes tacticas de unidad");
  panel.addEventListener("click",ev=>{
    const button=ev.target.closest("button");if(!button)return;
    const dir=button.dataset.hvTacticalDir;
    if(dir){hallvallaRtTacticalDirection({up:[0,-1],down:[0,1],left:[-1,0],right:[1,0]}[dir][0],{up:[0,-1],down:[0,1],left:[-1,0],right:[1,0]}[dir][1]);return;}
    if(button.dataset.hvTacticalConfirm!==undefined)hallvallaRtTacticalConfirm();
    if(button.dataset.hvTacticalBack!==undefined)hallvallaRtTacticalBack();
  });
  shell.appendChild(panel);return panel;
}
function hallvallaRtTacticalRender(){
  const panel=hallvallaRtTacticalEnsureUi();if(!panel)return;
  const u=hallvallaRtTacticalSelectedUnit();if(!u){hvTacticalUi.unitId="";panel.hidden=true;return;}
  panel.hidden=false;
  const order=hallvallaRtGetTacticalOrder(u);
  const escapeText=(s)=>typeof escapeHtml==="function"?escapeHtml(String(s)):String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"})[c]);
  const heading=hvTacticalUi.category?HV_TACTICAL_OPTIONS[hvTacticalUi.category]?.title:"ORDENES TACTICAS";
  let body="",buttons="";
  if(hvTacticalUi.targeting){
    body=`<div class="hv-t-target">Selecciona un enemigo visible con el puntero o tocandolo en el campo. A confirma el objetivo señalado.</div>`;
  }else{
    const opts=hvTacticalUi.category?HV_TACTICAL_OPTIONS[hvTacticalUi.category]?.items:null;
    const entries=opts||{up:{label:"Ofensiva"},left:{label:"Defensa"},right:{label:"Movimiento"},down:{label:"General"}};
    for(const dir of ["up","left","right","down"]){const item=entries[dir];if(!item)continue;const selected=item.mode&&hvTacticalUi.pending?.mode===item.mode;
      buttons+=`<button type="button" data-hv-tactical-dir="${dir}" class="hv-t-opt${selected?" active":""}">${HV_TACTICAL_GLYPHS[dir]} ${escapeText(item.label)}</button>`;}
    body=`<div class="hv-t-grid">${buttons}</div>`;
    if(hvTacticalUi.pending)body+='<button type="button" class="hv-t-confirm" data-hv-tactical-confirm> A · Confirmar orden</button>';
  }
  panel.innerHTML=`<div class="hv-t-header"><span>${escapeText(u.name)} · ${heading}</span><button type="button" class="hv-t-close" data-hv-tactical-back aria-label="Volver">B · Volver</button></div><div class="hv-t-state">Orden actual: ${escapeText(order?HV_TACTICAL_LABELS[order.mode]:"Automatico")}</div>${body}<div class="hv-t-guide">Cruceta: categoria/opcion · A: confirmar · B: volver · Y: DET</div>`;
}
function hallvallaRtTacticalSelectUnit(unitOrId){
  const u=typeof unitOrId==="object"?unitOrId:(publicState?.units||[]).find(v=>String(v.id)===String(unitOrId));
  if(!u||u.leader||Number(u.owner)!==Number(myPlayer)||Number(u.hp||0)<=0||!isHallvallaRealtime())return false;
  hvTacticalUi.unitId=String(u.id);hvTacticalUi.category="";hvTacticalUi.pending=null;hvTacticalUi.targeting=false;
  if(typeof hideCardInspectModal==="function")hideCardInspectModal();
  hallvallaRtTacticalRender();return true;
}
function hallvallaRtTacticalDirection(dx,dy){
  if(!hallvallaRtTacticalIsOpen()||hvTacticalUi.targeting)return false;
  const dir=Math.abs(dx)>=Math.abs(dy)?(dx<0?"left":"right"):(dy<0?"up":"down");
  if(!dx&&!dy)return false;
  if(!hvTacticalUi.category){hvTacticalUi.category=HV_TACTICAL_DIRECTIONS[dir];hvTacticalUi.pending=null;}
  else{const selection=HV_TACTICAL_OPTIONS[hvTacticalUi.category]?.items[dir];if(!selection)return true;hvTacticalUi.pending=selection;}
  hallvallaRtTacticalRender();return true;
}
function hallvallaRtTacticalBack(){
  if(!hallvallaRtTacticalIsOpen())return false;
  if(hvTacticalUi.targeting){hvTacticalUi.targeting=false;hvTacticalUi.pending=null;}
  else if(hvTacticalUi.pending)hvTacticalUi.pending=null;
  else if(hvTacticalUi.category)hvTacticalUi.category="";
  else hvTacticalUi.unitId="";
  const panel=document.getElementById("hvTacticalPanel");if(!hvTacticalUi.unitId){if(panel)panel.hidden=true;return true;}
  hallvallaRtTacticalRender();return true;
}
async function hallvallaRtTacticalWriteOrder(unit,mode,targetId=""){
  const old=publicState?.rtTacticalOrders?.[unit.id];
  const privateHidden=typeof isStage8PrivateStealthMode==="function"&&isStage8PrivateStealthMode(publicState)&&typeof isStealthedUnit==="function"&&isStealthedUnit(unit)&&!unit.revealed;
  const node={mode,owner:Number(unit.owner),targetId:targetId||"",at:Date.now()};
  const key="rtTacticalOrders";
  if(privateHidden){privateState={...(privateState||{}),[key]:{...(privateState?.[key]||{}),[unit.id]:node}};}
  else{publicState={...(publicState||{}),[key]:{...(publicState?.[key]||{}),[unit.id]:node}};}
  try{
    if(publicState?.mode==="online"){
      const scope=privateHidden?`private/${getGamePrivatePlayerKey(myPlayer)}`:"public";
      if(!gameId||!db)throw Error("Partida PvP no disponible");
      // Escritura pequeña: no publicar el array de unidades ni el tablero privado.
      await update(ref(db,`games/${gameId}/${scope}/${key}/${unit.id}`),node);
    }
    if(typeof requestBattleRender==="function")requestBattleRender("tactical-order");
    if(typeof hallvallaRtScheduleLocalSnapshot==="function")hallvallaRtScheduleLocalSnapshot(false);
    setHint(`${unit.name}: ${HV_TACTICAL_LABELS[mode]}.`);
    return true;
  }catch(error){
    if(privateHidden){const entries={...(privateState?.[key]||{})};delete entries[unit.id];privateState={...privateState,[key]:entries};}
    else{const entries={...(publicState?.[key]||{})};if(old)entries[unit.id]=old;else delete entries[unit.id];publicState={...publicState,[key]:entries};}
    console.warn("[HallValla][Tactica] orden no sincronizada",error);setHint("No se pudo sincronizar la orden tactica. Intenta de nuevo.");return false;
  }
}
async function hallvallaRtTacticalApplyOrder(targetId=""){
  const unit=hallvallaRtTacticalSelectedUnit(),item=hvTacticalUi.pending;
  if(!unit||!item)return false;
  const mode=item.mode;
  if(item.target&&!targetId)return false;
  if(item.target){const target=(publicState?.units||[]).find(v=>String(v.id)===String(targetId));
    if(!target||Number(target.owner)===Number(myPlayer)||Number(target.hp||0)<=0||typeof isStealthHiddenFromViewer==="function"&&isStealthHiddenFromViewer(target)){
      setHint("Selecciona un enemigo visible y vivo.");return false;
    }
  }
  const ok=await hallvallaRtTacticalWriteOrder(unit,mode,targetId);
  if(ok){hvTacticalUi.unitId="";hvTacticalUi.category="";hvTacticalUi.pending=null;hvTacticalUi.targeting=false;const panel=document.getElementById("hvTacticalPanel");if(panel)panel.hidden=true;}
  return ok;
}
function hallvallaRtTacticalConfirm(){
  if(!hallvallaRtTacticalIsOpen())return false;
  if(hvTacticalUi.targeting)return true;
  const item=hvTacticalUi.pending;if(!item)return true;
  if(item.target){hvTacticalUi.targeting=true;hallvallaRtTacticalRender();return true;}
  void hallvallaRtTacticalApplyOrder();return true;
}
function hallvallaRtTacticalTargetAt(x,y){
  if(!hallvallaRtTacticalTargeting())return false;
  const u=typeof getUnitAt==="function"?getUnitAt(x,y):null;
  if(!u||typeof isStealthHiddenFromViewer==="function"&&isStealthHiddenFromViewer(u)||Number(u.owner)===Number(myPlayer)||Number(u.hp||0)<=0){setHint("Marca un enemigo visible para aplicar la orden.");return true;}
  void hallvallaRtTacticalApplyOrder(String(u.id));return true;
}
function hallvallaRtTacticalGamepadTarget(){
  if(!hallvallaRtTacticalTargeting())return false;
  let cell=null;
  if(typeof hvGamepadPointerTarget==="function")cell=hvGamepadPointerTarget()?.closest?.("#grid .cell")||null;
  if(!cell&&typeof hvGamepadState!=="undefined"&&Number.isFinite(hvGamepadState.boardX)&&Number.isFinite(hvGamepadState.boardY))return hallvallaRtTacticalTargetAt(hvGamepadState.boardX,hvGamepadState.boardY);
  if(cell)return hallvallaRtTacticalTargetAt(Number(cell.dataset.x),Number(cell.dataset.y));
  setHint("Apunta al enemigo con el stick derecho y pulsa A.");return true;
}
function hallvallaRtTacticalDet(){const u=hallvallaRtTacticalSelectedUnit();if(!u)return false;if(typeof showUnit==="function")showUnit(u);return true;}
// Paridad de teclado: flechas para ordenar y Entrar para confirmar, sin interceptar campos de texto.
document.addEventListener("keydown",ev=>{
  if(!hallvallaRtTacticalIsOpen()||ev.altKey||ev.ctrlKey||ev.metaKey)return;
  if(ev.target?.closest?.("input,textarea,select,[contenteditable='true']"))return;
  const dirs={ArrowUp:[0,-1],ArrowDown:[0,1],ArrowLeft:[-1,0],ArrowRight:[1,0]};
  if(dirs[ev.code]&&!hvTacticalUi.targeting){ev.preventDefault();ev.stopImmediatePropagation();hallvallaRtTacticalDirection(...dirs[ev.code]);return;}
  if(ev.code==="Enter"&&!hvTacticalUi.targeting){ev.preventDefault();ev.stopImmediatePropagation();hallvallaRtTacticalConfirm();return;}
  if(ev.code==="Escape"||ev.code==="Backspace"){ev.preventDefault();ev.stopImmediatePropagation();hallvallaRtTacticalBack();return;}
  if(ev.code==="KeyY"){ev.preventDefault();ev.stopImmediatePropagation();hallvallaRtTacticalDet();}
},true);
Object.assign(globalThis,{hallvallaRtTacticalSelectUnit,hallvallaRtTacticalIsOpen,hallvallaRtTacticalTargeting,hallvallaRtTacticalDirection,hallvallaRtTacticalBack,hallvallaRtTacticalConfirm,hallvallaRtTacticalTargetAt,hallvallaRtTacticalGamepadTarget,hallvallaRtTacticalDet});
