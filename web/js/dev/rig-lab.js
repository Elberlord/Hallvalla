"use strict";
/* HallValla · Rig Lab DEV · Stage 5C-B0
   Laboratorio visual aislado: no escribe Firebase, no altera mazos ni batallas. */
(()=>{
  "use strict";

  if(globalThis.__HALLVALLA_DEV_TOOLS__!==true)return;

  function queryEnabled(){
    try{
      const p=new URLSearchParams(location.search);
      if(!p.has("riglab"))return false;
      const v=String(p.get("riglab")??"").trim().toLowerCase();
      return v===""||v==="1"||v==="true";
    }catch(_){return false;}
  }
  if(!queryEnabled())return;

  const LAB_ID="hvRigLab";
  const UNIT_ID="hv-rig-lab-unit";
  const TARGET_ID="hv-rig-lab-target";
  let moveTick=0;
  let currentUnit=null;

  function esc(value){
    return String(value??"").replace(/[&<>"']/g,ch=>({
      "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
    })[ch]);
  }

  function registered(){
    const rigs=globalThis.HALLVALLA_UNIT_RIGS||{};
    return Object.values(rigs).filter(Boolean);
  }

  function makeUnit(manifest){
    return {
      id:UNIT_ID,
      key:String(manifest?.key||"unit"),
      name:String(manifest?.name||manifest?.key||"Unidad"),
      owner:1,
      hp:10,maxHp:10,atk:5,guard:5,dex:5,agi:5,mov:2,range:1,
      x:moveTick%2,y:0,
      leader:false,
      rigLab:true
    };
  }

  function cleanupMotion(el){
    if(!el)return;
    [
      "data-hv-motion","data-hv-motion-token","data-hv-action","data-hv-action-token",
      "data-hv-attack-style","data-hv-attack-personality","data-hv-reaction",
      "data-hv-reaction-token","data-hv-spawn","data-hv-spawn-token",
      "data-hv-recovery","data-hv-recovery-token"
    ].forEach(a=>el.removeAttribute(a));
    el.dataset.hvMotion="idle";
  }

  function renderSelected(){
    const root=document.getElementById(LAB_ID);
    const select=root?.querySelector("#hvRigLabSelect");
    const card=root?.querySelector("#hvRigLabUnit");
    const meta=root?.querySelector("#hvRigLabMeta");
    if(!root||!select||!card)return;

    const rigs=registered();
    const manifest=rigs.find(r=>String(r.key)===String(select.value))||rigs[0];
    if(!manifest){
      card.innerHTML="<b>No hay rigs registrados.</b>";
      if(meta)meta.textContent="Sin manifiestos.";
      return;
    }
    currentUnit=makeUnit(manifest);
    card.dataset.unitId=UNIT_ID;
    card.dataset.unitKey=currentUnit.key;
    card.className="unit-card hv-rig-lab-unit";

    let html="";
    try{
      html=typeof globalThis.getFieldFigureHtml==="function"
        ?globalThis.getFieldFigureHtml(currentUnit)
        :"";
    }catch(error){
      html=`<div class="hv-rig-lab-error">${esc(error?.message||error)}</div>`;
    }
    card.innerHTML=html||`<div class="hv-rig-lab-error">No se pudo renderizar ${esc(currentUnit.name)}.</div>`;
    cleanupMotion(card);
    try{
      if(typeof globalThis.hvSyncUnitVisualMotion==="function"){
        globalThis.hvSyncUnitVisualMotion(card,currentUnit,{x:0,y:0});
      }
    }catch(_){}

    const family=typeof globalThis.hvGetRigFamily==="function"
      ?globalThis.hvGetRigFamily(manifest.family)
      :null;
    const validation=typeof globalThis.hvValidateRigManifest==="function"
      ?globalThis.hvValidateRigManifest(manifest.key)
      :null;
    if(meta){
      meta.textContent=[
        currentUnit.name,
        `key=${manifest.key}`,
        `family=${manifest.family||"sin familia"}`,
        `enabled=${manifest.enabled===true}`,
        family?`topology=${family.topology}`:"",
        validation?`contract=${validation.ok?"OK":"FALTA "+(validation.missing||[]).join(",")}`:""
      ].filter(Boolean).join(" · ");
    }
  }

  function action(kind){
    const card=document.getElementById("hvRigLabUnit");
    const target=document.getElementById("hvRigLabTarget");
    if(!card||!currentUnit)return;
    const targetUnit={id:TARGET_ID,key:"rig_lab_target",name:"Objetivo",owner:2,hp:10,x:5,y:0};

    try{
      if(kind==="idle"){
        cleanupMotion(card);
      }else if(kind==="move"){
        moveTick+=1;
        currentUnit.x=moveTick%2;
        globalThis.hvSyncUnitVisualMotion?.(card,currentUnit,{x:currentUnit.x,y:0});
      }else if(kind==="attack"){
        globalThis.hvPlayUnitAttackMotion?.(currentUnit,targetUnit,{source:"rig-lab"});
      }else if(["hit","guard","dodge"].includes(kind)){
        globalThis.hvPlayUnitReactionMotion?.(currentUnit,kind,targetUnit);
      }else if(kind==="summon"){
        globalThis.hvPlayUnitSummonMotion?.(card,currentUnit);
      }else if(kind==="death"){
        globalThis.hvPlayUnitDeathMotion?.(card);
      }
    }catch(error){
      const meta=document.getElementById("hvRigLabMeta");
      if(meta)meta.textContent=`ERROR ${kind}: ${error?.message||error}`;
    }
  }

  function mount(){
    if(document.getElementById(LAB_ID))return;

    const style=document.createElement("style");
    style.id="hvRigLabStyle";
    style.textContent=`
      #${LAB_ID}{position:fixed;inset:18px;z-index:2147483000;background:rgba(7,10,18,.96);
        border:1px solid rgba(255,255,255,.25);border-radius:18px;color:#fff;font-family:Arial,sans-serif;
        display:grid;grid-template-rows:auto auto 1fr auto;gap:12px;padding:16px;box-sizing:border-box}
      #${LAB_ID} *{box-sizing:border-box}
      #${LAB_ID} .hv-rig-lab-head{display:flex;align-items:center;gap:12px;flex-wrap:wrap}
      #${LAB_ID} h2{margin:0;font-size:20px}
      #${LAB_ID} select,#${LAB_ID} button{background:#151d2d;color:#fff;border:1px solid #53627d;
        border-radius:10px;padding:8px 12px;font-weight:700}
      #${LAB_ID} button{cursor:pointer}
      #${LAB_ID} .hv-rig-lab-meta{font-size:12px;opacity:.85;min-height:18px}
      #${LAB_ID} .hv-rig-lab-stage{position:relative;min-height:330px;border-radius:16px;
        border:1px dashed rgba(255,255,255,.22);overflow:hidden;background:radial-gradient(circle at center,#263145 0,#111725 58%,#070a12 100%)}
      #${LAB_ID} .hv-rig-lab-unit{position:absolute!important;left:50%!important;top:52%!important;
        width:150px!important;height:190px!important;transform:translate(-50%,-50%)!important;
        overflow:visible!important;pointer-events:none!important}
      #${LAB_ID} .hv-rig-lab-target{position:absolute;right:12%;top:50%;width:12px;height:12px;
        border-radius:50%;background:#ff6b6b;opacity:.5}
      #${LAB_ID} .hv-rig-lab-controls{display:flex;gap:8px;flex-wrap:wrap}
      #${LAB_ID} .hv-rig-lab-error{padding:12px;background:#411;color:#fff}
      @media(max-width:700px){#${LAB_ID}{inset:6px;padding:10px}#${LAB_ID} .hv-rig-lab-stage{min-height:280px}}
    `;
    document.head.appendChild(style);

    const root=document.createElement("section");
    root.id=LAB_ID;
    root.dataset.hvDevTool="rig-lab";
    const rigs=registered();
    const options=rigs.map(r=>`<option value="${esc(r.key)}">${esc(r.name||r.key)} · ${esc(r.family||"")}</option>`).join("");
    root.innerHTML=`
      <div class="hv-rig-lab-head">
        <h2>HallValla · Rig Lab</h2>
        <select id="hvRigLabSelect">${options}</select>
        <button type="button" data-rig-action="reload">Recargar piloto</button>
        <button type="button" data-rig-action="close">Cerrar</button>
      </div>
      <div id="hvRigLabMeta" class="hv-rig-lab-meta"></div>
      <div class="hv-rig-lab-stage">
        <div id="hvRigLabUnit" class="unit-card hv-rig-lab-unit"></div>
        <div id="hvRigLabTarget" class="hv-rig-lab-target"></div>
      </div>
      <div class="hv-rig-lab-controls">
        <button type="button" data-rig-action="idle">Idle</button>
        <button type="button" data-rig-action="move">Move</button>
        <button type="button" data-rig-action="attack">Attack</button>
        <button type="button" data-rig-action="hit">Hit</button>
        <button type="button" data-rig-action="guard">Guard</button>
        <button type="button" data-rig-action="dodge">Dodge</button>
        <button type="button" data-rig-action="summon">Summon</button>
        <button type="button" data-rig-action="death">Death</button>
      </div>`;
    document.body.appendChild(root);

    root.querySelector("#hvRigLabSelect")?.addEventListener("change",renderSelected);
    root.addEventListener("click",ev=>{
      const btn=ev.target?.closest?.("button[data-rig-action]");
      if(!btn)return;
      const a=btn.dataset.rigAction;
      if(a==="close"){root.remove();style.remove();return;}
      if(a==="reload"){renderSelected();return;}
      action(a);
    });
    renderSelected();
  }

  globalThis.hvOpenRigLab=mount;
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",mount,{once:true});
  else mount();
})();
