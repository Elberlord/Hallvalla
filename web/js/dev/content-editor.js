/* HallValla · HV DEV · Editor de Contenido v1 */
(()=>{
  "use strict";
  if(globalThis.__HALLVALLA_DEV_TOOLS__!==true)return;

  const BRIDGE="http://127.0.0.1:8765";
  const DRAFT_KEY="hallvalla_content_editor_draft_v1";
  const $=(s,r=document)=>r.querySelector(s);
  const $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
  const esc=value=>String(value??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
  const slug=value=>String(value||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g,"_").replace(/^_+|_+$/g,"").slice(0,64)||"unidad_nueva";
  const title=value=>String(value||"").replace(/_/g," ").replace(/\b\w/g,ch=>ch.toUpperCase());
  const num=(value,fallback=0)=>Number.isFinite(Number(value))?Number(value):fallback;
  const generated=()=>globalThis.HALLVALLA_CONTENT_GENERATED||{registries:{},unitOverrides:{},units:[],skills:[],assignments:{}};

  const REGISTRY_DEFAULTS={
    types:[
      {id:"unit",name:"Unidad"},
      {id:"legend",name:"Leyenda"},
      {id:"summon",name:"Invocacion"},
      {id:"beast",name:"Bestia"},
      {id:"entity",name:"Entidad"},
      {id:"principal",name:"Personaje Principal"}
    ],
    races:[
      {id:"human",name:"Humano"},
      {id:"beast",name:"Bestia"},
      {id:"undead",name:"No-muerto"},
      {id:"demigod",name:"Semidios"},
      {id:"spirit",name:"Espiritu"},
      {id:"demon",name:"Demonio"},
      {id:"dragon",name:"Dragon"},
      {id:"entity",name:"Entidad"}
    ]
  };

  function runtimeUnits(){
    const pools=[];
    try{if(typeof CARD_TEMPLATES!=="undefined"&&Array.isArray(CARD_TEMPLATES))pools.push(CARD_TEMPLATES);}catch(_){}
    try{if(typeof SPECIAL_HUMAN_CARD_DATA!=="undefined"&&Array.isArray(SPECIAL_HUMAN_CARD_DATA))pools.push(SPECIAL_HUMAN_CARD_DATA);}catch(_){}
    try{if(typeof LEGENDARY_ALLY_CARDS!=="undefined"&&Array.isArray(LEGENDARY_ALLY_CARDS))pools.push(LEGENDARY_ALLY_CARDS);}catch(_){}
    try{if(typeof BEAST_CARD_TEMPLATES!=="undefined"&&Array.isArray(BEAST_CARD_TEMPLATES))pools.push(BEAST_CARD_TEMPLATES);}catch(_){}
    try{if(typeof ADVENTURE_SPECIALS!=="undefined"&&ADVENTURE_SPECIALS)pools.push(Object.values(ADVENTURE_SPECIALS));}catch(_){}
    const map=new Map();
    for(const pool of pools)for(const card of pool||[]){
      if(card?.type!=="unit"||card?.leader||!card?.key)continue;
      map.set(String(card.key),card);
    }
    return [...map.values()].sort((a,b)=>String(a.name||a.key).localeCompare(String(b.name||b.key),"es"));
  }

  function skillBank(){
    const map=new Map();
    try{for(const skill of Object.values(globalThis.HALLVALLA_UNIT_SKILL_BANK||{}))if(skill?.id)map.set(skill.id,skill);}catch(_){}
    for(const skill of generated().skills||[])if(skill?.id)map.set(skill.id,skill);
    return [...map.values()].sort((a,b)=>String(a.id).localeCompare(String(b.id)));
  }

  function assignmentFor(key){
    const generatedMeta=generated().assignments?.[String(key||"")];
    if(generatedMeta)return generatedMeta;
    try{return globalThis.HALLVALLA_UNIT_SKILL_ASSIGNMENTS?.[String(key||"")]||null;}catch(_){return null;}
  }

  function deriveRegistry(kind){
    const byId=new Map();
    for(const row of REGISTRY_DEFAULTS[kind]||[])byId.set(row.id,{...row,source:"base"});
    if(kind==="weapons"||kind==="classes"){
      try{
        const assignments=globalThis.HALLVALLA_UNIT_SKILL_ASSIGNMENTS||{};
        for(const meta of Object.values(assignments)){
          const values=kind==="weapons"?(meta.weaponTags||[]):(meta.classTags||[]);
          for(const id of values||[])if(id&&id!=="any")byId.set(String(id),{id:String(id),name:title(id),source:"base"});
        }
      }catch(_){}
      for(const skill of skillBank()){
        const values=kind==="weapons"?(skill.weapons||[]):(skill.classes||[]);
        for(const id of values||[])if(id&&id!=="any")byId.set(String(id),{id:String(id),name:title(id),source:"base"});
      }
    }
    for(const row of generated().registries?.[kind]||[]){
      if(row?.id)byId.set(String(row.id),{...row,source:"custom"});
    }
    return [...byId.values()].sort((a,b)=>String(a.name||a.id).localeCompare(String(b.name||b.id),"es"));
  }

  function normalizeText(text){
    try{return typeof globalThis.hallvallaPublicGameplayText==="function"?globalThis.hallvallaPublicGameplayText(String(text||"")):String(text||"");}
    catch(_){return String(text||"");}
  }

  function compatibleSkills(weapon,classId,unitKey,query=""){
    const w=String(weapon||""),c=String(classId||""),q=String(query||"").trim().toLowerCase();
    return skillBank().filter(skill=>{
      const exclusive=Array.isArray(skill.exclusiveKeys)?skill.exclusiveKeys:[];
      if(exclusive.length&&!exclusive.includes(String(unitKey||"")))return false;
      const weapons=skill.weapons||[],classes=skill.classes||[];
      const compatible=weapons.includes("any")||classes.includes("any")||weapons.includes(w)||classes.includes(c);
      if(!compatible)return false;
      if(!q)return true;
      return [skill.id,skill.name,skill.category,skill.effect,skill.trigger].some(v=>String(v||"").toLowerCase().includes(q));
    });
  }

  let state={mode:"existing",key:"",selectedSkills:[],imageData:"",imageName:"",registryKind:"weapons",activeTab:"units"};

  function ensureStyle(){
    if($("#hvContentEditorStyle"))return;
    const style=document.createElement("style");
    style.id="hvContentEditorStyle";
    style.textContent=`
#hvContentEditor{position:fixed;inset:14px;z-index:1000002;background:rgba(5,7,10,.985);border:1px solid #b68a3d;border-radius:18px;box-shadow:0 28px 90px #000;color:#f1e3bf;font:13px/1.35 system-ui,-apple-system,Segoe UI,sans-serif;display:flex;flex-direction:column;overflow:hidden}
#hvContentEditor.hidden{display:none}
.hvc-head{display:flex;align-items:center;gap:12px;padding:12px 16px;border-bottom:1px solid #6f522a;background:linear-gradient(180deg,#24190f,#0d0b09)}
.hvc-head h2{margin:0;font:700 20px Georgia,serif;color:#ffd57e}.hvc-head small{opacity:.72}.hvc-head .spacer{flex:1}
.hvc-head button,.hvc-btn{border:1px solid #9d7638;border-radius:9px;background:#17120d;color:#f7e4b4;padding:8px 11px;cursor:pointer;font-weight:700}
.hvc-head button:hover,.hvc-btn:hover{filter:brightness(1.18)}.hvc-tabs{display:flex;gap:6px;padding:8px 12px;border-bottom:1px solid #3c3124;background:#090a0b}
.hvc-tabs button.active{background:#5a3f19;color:#fff0c7}.hvc-body{display:grid;grid-template-columns:330px 1fr;min-height:0;flex:1}.hvc-side{border-right:1px solid #3c3124;padding:12px;overflow:auto}.hvc-main{padding:14px;overflow:auto}
.hvc-field{display:flex;flex-direction:column;gap:4px;margin-bottom:9px}.hvc-field>span{font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:#d2b77b}
.hvc-field input,.hvc-field select,.hvc-field textarea{width:100%;border:1px solid #5c4a31;border-radius:8px;background:#0b0d0f;color:#eee2c5;padding:8px}
.hvc-field textarea{min-height:105px;resize:vertical}.hvc-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}.hvc-grid.two{grid-template-columns:repeat(2,minmax(0,1fr))}
.hvc-section{border:1px solid #3b3328;border-radius:12px;padding:12px;margin-bottom:12px;background:rgba(255,255,255,.018)}.hvc-section h3{margin:0 0 10px;color:#ffd57e;font:700 16px Georgia,serif}
.hvc-unit-list{display:flex;flex-direction:column;gap:5px;max-height:46vh;overflow:auto}.hvc-unit-row{display:flex;gap:8px;align-items:center;text-align:left;border:1px solid #2d2e31;border-radius:8px;background:#0b0d10;color:#ddd;padding:7px;cursor:pointer}
.hvc-unit-row.active{border-color:#c89a48;background:#231a0f}.hvc-unit-row img{width:38px;height:38px;border-radius:6px;object-fit:cover;background:#000}.hvc-unit-row b{display:block;color:#f5dfae}.hvc-unit-row small{opacity:.65}
.hvc-slots{display:grid;grid-template-columns:repeat(9,minmax(0,1fr));gap:4px;margin:10px 0}.hvc-slot{aspect-ratio:1;border:1px solid #4a402f;border-radius:7px;background:#0c0d0f;display:flex;align-items:center;justify-content:center;font-size:9px;text-align:center;padding:2px;overflow:hidden}
.hvc-slot.filled{border-color:#c89a48;background:#2a1e0d}.hvc-skill-toolbar{display:grid;grid-template-columns:1fr auto;gap:8px}.hvc-skill-list{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px;max-height:360px;overflow:auto;margin-top:8px}
.hvc-skill{border:1px solid #383838;border-radius:8px;background:#0d0f12;color:#ddd;padding:7px;cursor:pointer;text-align:left}.hvc-skill.selected{border-color:#d6a84e;background:#2a1c0d}.hvc-skill b{display:block;color:#f1dca9}.hvc-skill small{display:block;opacity:.67}
.hvc-status{padding:7px 10px;border-radius:8px;background:#0e1114;border:1px solid #30363d}.hvc-status.ok{border-color:#397a49;color:#b9f2c4}.hvc-status.bad{border-color:#8e3f3f;color:#ffb7b7}
.hvc-actions{display:flex;gap:8px;flex-wrap:wrap}.hvc-primary{background:#694817!important;border-color:#d2a14d!important}.hvc-preview{white-space:pre-wrap;border-left:3px solid #a77e3b;padding:8px 10px;background:#0b0d10;color:#ddd}
.hvc-reg-list{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px}.hvc-reg{border:1px solid #343434;border-radius:8px;padding:8px;background:#0c0e10}.hvc-reg b{color:#efd8a2}
.hvc-audit-row{border:1px solid #37322a;border-radius:10px;padding:10px;margin-bottom:8px;background:#0b0d0f}.hvc-audit-row b{color:#f3d99f}.hvc-audit-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px}.hvc-audit-grid pre{white-space:pre-wrap;margin:0;padding:8px;border-radius:8px;background:#070809;color:#c9c9c9}
@media(max-width:950px){.hvc-body{grid-template-columns:1fr}.hvc-side{border-right:0;border-bottom:1px solid #3c3124;max-height:220px}.hvc-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.hvc-skill-list{grid-template-columns:repeat(2,minmax(0,1fr))}}
`;
    document.head.appendChild(style);
  }

  function createPanel(){
    if($("#hvContentEditor"))return $("#hvContentEditor");
    ensureStyle();
    const panel=document.createElement("section");
    panel.id="hvContentEditor";
    panel.dataset.hvDevTool="";
    panel.className="hidden";
    panel.innerHTML=`
      <div class="hvc-head"><div><h2>HALLVALLA · EDITOR DE CONTENIDO</h2><small>Unidades · habilidades · armas · clases · razas · tipos</small></div><span id="hvcBridgeState" class="hvc-status">Puente local: comprobando...</span><div class="spacer"></div><button id="hvcClose" type="button">Cerrar</button></div>
      <div class="hvc-tabs"><button class="hvc-btn active" data-hvc-tab="units">Unidades</button><button class="hvc-btn" data-hvc-tab="skills">Habilidades</button><button class="hvc-btn" data-hvc-tab="registries">Armas / Clases / Razas / Tipos</button><button class="hvc-btn" data-hvc-tab="audit">Auditoria de textos</button></div>
      <div class="hvc-body"><aside class="hvc-side" id="hvcSide"></aside><main class="hvc-main" id="hvcMain"></main></div>`;
    document.body.appendChild(panel);
    $("#hvcClose",panel).onclick=()=>panel.classList.add("hidden");
    $$(".hvc-tabs button",panel).forEach(btn=>btn.onclick=()=>{state.activeTab=btn.dataset.hvcTab;$$(".hvc-tabs button",panel).forEach(x=>x.classList.toggle("active",x===btn));render();});
    return panel;
  }

  async function bridgeHealth(){
    const node=$("#hvcBridgeState");if(!node)return false;
    try{const response=await fetch(`${BRIDGE}/health`,{cache:"no-store"});if(!response.ok)throw new Error(`HTTP ${response.status}`);node.textContent="Puente local: conectado";node.className="hvc-status ok";return true;}
    catch(_){node.textContent="Puente local: desconectado";node.className="hvc-status bad";return false;}
  }

  function bridgeHelp(){
    return `Para usar APLICAR AL REPO, ejecuta una vez en PowerShell:\n\ncd C:\\Users\\Usuario\\Documents\\GitHub\\Hallvalla\npowershell -ExecutionPolicy Bypass -File .\\tools\\hallvalla-content-bridge.ps1\n\nDeja esa ventana abierta mientras editas.`;
  }

  async function postBridge(payload){
    if(!(await bridgeHealth()))throw new Error(bridgeHelp());
    const response=await fetch(`${BRIDGE}/hallvalla/content`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});
    const data=await response.json().catch(()=>({}));
    if(!response.ok||data.ok===false)throw new Error(data.error||`HTTP ${response.status}`);
    return data;
  }

  function unitByKey(key){return runtimeUnits().find(u=>String(u.key)===String(key))||null;}
  function loadUnit(key){const unit=unitByKey(key);if(!unit)return;state.mode="existing";state.key=String(key);state.imageData="";state.imageName="";const meta=assignmentFor(key)||{};state.selectedSkills=[...(meta.innate||[])].slice(0,27);render();}
  function newUnit(){state.mode="new";state.key="";state.imageData="";state.imageName="";state.selectedSkills=[];render();}

  function renderUnitSide(){
    const side=$("#hvcSide"),units=runtimeUnits();
    side.innerHTML=`<div class="hvc-field"><span>Buscar unidad</span><input id="hvcUnitSearch" placeholder="Aquiles, arquero, dragon..."></div><div class="hvc-actions"><button class="hvc-btn hvc-primary" id="hvcNewUnit">+ Nueva unidad</button></div><div class="hvc-unit-list" id="hvcUnitList"></div>`;
    $("#hvcNewUnit").onclick=newUnit;
    const input=$("#hvcUnitSearch");
    const paint=()=>{const q=input.value.trim().toLowerCase();$("#hvcUnitList").innerHTML=units.filter(u=>!q||String(u.name||u.key).toLowerCase().includes(q)||String(u.key).includes(q)).map(u=>`<button class="hvc-unit-row ${String(u.key)===state.key?"active":""}" data-key="${esc(u.key)}">${u.portrait?`<img src="${esc(u.portrait)}" alt="">`:"<span style='width:38px'></span>"}<span><b>${esc(u.name||u.key)}</b><small>${esc(u.key)} · ${esc(u.rarity||"Basica")}</small></span></button>`).join("");$$(".hvc-unit-row",side).forEach(btn=>btn.onclick=()=>loadUnit(btn.dataset.key));};
    input.oninput=paint;paint();
  }

  function formValue(id){return $("#"+id)?.value??"";}
  function formChecked(id){return !!$("#"+id)?.checked;}
  function currentFormKey(){return state.mode==="existing"?state.key:slug(formValue("hvcName"));}

  function registryOptions(kind,current=""){
    const rows=deriveRegistry(kind);
    return [`<option value="">-- elegir --</option>`,...rows.map(row=>`<option value="${esc(row.id)}" ${String(row.id)===String(current)?"selected":""}>${esc(row.name||row.id)}</option>`)].join("");
  }

  function renderSlots(){
    const host=$("#hvcSlots");if(!host)return;
    const bank=new Map(skillBank().map(s=>[s.id,s]));
    host.innerHTML=Array.from({length:27},(_,i)=>{const id=state.selectedSkills[i],skill=bank.get(id);return `<div class="hvc-slot ${skill?"filled":""}" title="${esc(skill?.name||`Espacio ${i+1}`)}">${skill?esc(skill.name):String(i+1)}</div>`;}).join("");
  }

  function refreshSkills(){
    const host=$("#hvcSkillList");if(!host)return;
    const weapon=formValue("hvcWeapon"),klass=formValue("hvcClass"),key=currentFormKey(),q=formValue("hvcSkillSearch");
    const rows=compatibleSkills(weapon,klass,key,q);
    host.innerHTML=rows.map(skill=>`<button type="button" class="hvc-skill ${state.selectedSkills.includes(skill.id)?"selected":""}" data-skill="${esc(skill.id)}"><b>${esc(skill.name)}</b><small>${esc(skill.id)} · ${esc(skill.category||"")}</small><small>${esc(normalizeText(skill.effect||skill.trigger||""))}</small></button>`).join("")||`<div class="hvc-status">Elige arma/clase o cambia el filtro.</div>`;
    $$(".hvc-skill",host).forEach(btn=>btn.onclick=()=>{const id=btn.dataset.skill;const idx=state.selectedSkills.indexOf(id);if(idx>=0)state.selectedSkills.splice(idx,1);else if(state.selectedSkills.length<27)state.selectedSkills.push(id);else alert("El DET admite 27 efectos visibles.");renderSlots();refreshSkills();});
  }

  function renderUnitMain(){
    const unit=state.mode==="existing"?unitByKey(state.key):null;
    const meta=state.mode==="existing"?(assignmentFor(state.key)||{}):{};
    const override=generated().unitOverrides?.[state.key]||{};
    const source={...(unit||{}),...override};
    const weapon=(meta.weaponTags||source.weaponTags||[])[0]||source.primaryWeapon||"";
    const klass=(meta.classTags||source.classTags||[])[0]||source.primaryClass||"";
    const main=$("#hvcMain");
    main.innerHTML=`
      <div class="hvc-section"><h3>${state.mode==="new"?"Crear unidad":"Editar unidad existente"}</h3>
        <div class="hvc-grid two">
          <label class="hvc-field"><span>Nombre visible</span><input id="hvcName" value="${esc(source.name||"")}"></label>
          <label class="hvc-field"><span>ID interno automatico</span><input id="hvcKey" value="${esc(state.mode==="existing"?state.key:slug(source.name||""))}" readonly></label>
          <label class="hvc-field"><span>Rareza</span><select id="hvcRarity">${["Basica","Rara","Epica","Gloriosa","Mitica","Legendaria","Semidios"].map(v=>`<option ${String(source.rarity||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase()===v.toLowerCase()?"selected":""}>${v}</option>`).join("")}</select></label>
          <label class="hvc-field"><span>Tipo</span><select id="hvcType">${registryOptions("types",source.unitType||"unit")}</select></label>
          <label class="hvc-field"><span>Raza</span><select id="hvcRace">${registryOptions("races",source.race||"human")}</select></label>
          <label class="hvc-field"><span>Arma principal</span><select id="hvcWeapon">${registryOptions("weapons",weapon)}</select></label>
          <label class="hvc-field"><span>Clase principal</span><select id="hvcClass">${registryOptions("classes",klass)}</select></label>
          <label class="hvc-field"><span>Clase tactica de arma</span><select id="hvcWeaponClass">${["","sword","spear","cavalry","bow","axe","mage","beast","neutral"].map(v=>`<option value="${v}" ${String(source.weaponClass||"")===v?"selected":""}>${v?title(v):"Automatica"}</option>`).join("")}</select></label>
        </div>
        <div class="hvc-grid">
          ${[["Coste","Cost","cost"],["Vida","Hp","hp"],["Ataque","Atk","atk"],["Guardia","Guard","guard"],["Destreza","Dex","dex"],["Agilidad","Agi","agi"],["Movimiento","Mov","mov"],["Rango","Range","range"]].map(([label,id,key])=>`<label class="hvc-field"><span>${label}</span><input id="hvc${id}" type="number" step="1" value="${esc(source[key]??0)}"></label>`).join("")}
        </div>
        <div class="hvc-grid two"><label class="hvc-field"><span>Icono / emoji</span><input id="hvcIcon" value="${esc(source.icon||"")}"></label><label class="hvc-field"><span>Imagen</span><input id="hvcImage" type="file" accept="image/png,image/jpeg,image/webp"></label></div>
        <label class="hvc-field"><span>Texto publico / efectos propios</span><textarea id="hvcText">${esc(source.text||source.effectText||"")}</textarea></label>
        <div class="hvc-section"><h3>Vista publica en segundos</h3><div id="hvcTextPreview" class="hvc-preview">${esc(normalizeText(source.text||source.effectText||""))}</div></div>
        <label style="display:flex;gap:8px;align-items:center"><input id="hvcSpecial" type="checkbox" ${source.special?"checked":""}> Carta especial</label>
      </div>
      <div class="hvc-section"><h3>Habilidades compatibles · ${state.selectedSkills.length}/27</h3><p>Elige arma y clase. Solo aparecen habilidades compatibles y se respetan las exclusivas.</p><div id="hvcSlots" class="hvc-slots"></div><div class="hvc-skill-toolbar"><input id="hvcSkillSearch" placeholder="Buscar habilidad, estado o ID"><button class="hvc-btn" id="hvcClearSkills">Vaciar</button></div><div id="hvcSkillList" class="hvc-skill-list"></div></div>
      <div class="hvc-section"><h3>Guardar</h3><div class="hvc-actions"><button class="hvc-btn" id="hvcSaveDraft">Guardar borrador local</button><button class="hvc-btn hvc-primary" id="hvcApplyRepo">APLICAR AL REPO</button></div><pre id="hvcResult" class="hvc-preview" style="margin-top:10px">${esc(bridgeHelp())}</pre></div>`;

    $("#hvcName").oninput=()=>{if(state.mode==="new")$("#hvcKey").value=slug(formValue("hvcName"));refreshSkills();};
    $("#hvcText").oninput=()=>{$("#hvcTextPreview").textContent=normalizeText(formValue("hvcText"));};
    $("#hvcWeapon").onchange=refreshSkills;$("#hvcClass").onchange=refreshSkills;$("#hvcSkillSearch").oninput=refreshSkills;
    $("#hvcClearSkills").onclick=()=>{state.selectedSkills=[];renderSlots();refreshSkills();};
    $("#hvcImage").onchange=async event=>{const file=event.target.files?.[0];if(!file)return;state.imageName=file.name;state.imageData=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result||""));reader.onerror=reject;reader.readAsDataURL(file);});};
    $("#hvcSaveDraft").onclick=()=>saveDraft();$("#hvcApplyRepo").onclick=()=>applyUnit();
    renderSlots();refreshSkills();
  }

  function collectUnitPayload(){
    const name=formValue("hvcName").trim();if(!name)throw new Error("El nombre es obligatorio.");
    const key=currentFormKey(),weapon=formValue("hvcWeapon"),klass=formValue("hvcClass");
    const unit={key,name,type:"unit",unitType:formValue("hvcType")||"unit",race:formValue("hvcRace")||"human",primaryWeapon:weapon,weaponTags:weapon?[weapon]:[],primaryClass:klass,classTags:klass?[klass]:[],weaponClass:formValue("hvcWeaponClass")||"",rarity:formValue("hvcRarity")||"Basica",cost:num(formValue("hvcCost")),hp:num(formValue("hvcHp"),1),atk:num(formValue("hvcAtk")),guard:num(formValue("hvcGuard")),dex:num(formValue("hvcDex")),agi:num(formValue("hvcAgi")),mov:num(formValue("hvcMov"),1),range:num(formValue("hvcRange"),1),icon:formValue("hvcIcon").trim()||"✦",text:normalizeText(formValue("hvcText")),special:formChecked("hvcSpecial")};
    const assignment={name,rarity:unit.rarity,weaponTags:[...unit.weaponTags],classTags:[...unit.classTags],innate:[...state.selectedSkills].slice(0,27)};
    return {unit,assignment};
  }

  function saveDraft(){try{const payload=collectUnitPayload();localStorage.setItem(DRAFT_KEY,JSON.stringify({at:Date.now(),mode:state.mode,...payload}));$("#hvcResult").textContent="Borrador guardado solo en este navegador.";}catch(error){$("#hvcResult").textContent=error.message;}}

  async function applyUnit(){
    const result=$("#hvcResult");
    try{
      const {unit,assignment}=collectUnitPayload();result.textContent="Validando y enviando al puente local...";
      const response=await postBridge({action:"upsertUnit",existing:state.mode==="existing",originalKey:state.mode==="existing"?state.key:"",unit,assignment,imageData:state.imageData||"",imageName:state.imageName||"",commitMessage:`Content editor: ${state.mode==="existing"?"update":"add"} ${unit.name}`});
      result.textContent=`LISTO\nCommit: ${response.commit||""}\n${response.message||"Cambio aplicado y push completado."}`;state.key=unit.key;state.mode="existing";state.imageData="";state.imageName="";setTimeout(()=>location.reload(),900);
    }catch(error){result.textContent=`ERROR\n${error.message}`;}
  }

  function renderSkillsTab(){
    const side=$("#hvcSide"),main=$("#hvcMain");
    side.innerHTML=`<div class="hvc-field"><span>Buscar</span><input id="hvcBrowseSkillSearch" placeholder="Arena, veneno, HV-165..."></div><div class="hvc-field"><span>Arma</span><select id="hvcBrowseWeapon">${registryOptions("weapons","")}</select></div><div class="hvc-field"><span>Clase</span><select id="hvcBrowseClass">${registryOptions("classes","")}</select></div>`;
    main.innerHTML=`<div class="hvc-section"><h3>Banco de habilidades existente</h3><p>Consulta compatibilidades. Crear mecanicas nuevas queda separado para no inventar logica de combate automaticamente.</p><div id="hvcBrowseSkills" class="hvc-skill-list"></div></div>`;
    const paint=()=>{const q=formValue("hvcBrowseSkillSearch").toLowerCase(),w=formValue("hvcBrowseWeapon"),cl=formValue("hvcBrowseClass");let rows=skillBank();if(q)rows=rows.filter(s=>[s.id,s.name,s.effect,s.category,s.trigger].some(v=>String(v||"").toLowerCase().includes(q)));if(w)rows=rows.filter(s=>(s.weapons||[]).includes(w)||(s.weapons||[]).includes("any"));if(cl)rows=rows.filter(s=>(s.classes||[]).includes(cl)||(s.classes||[]).includes("any"));$("#hvcBrowseSkills").innerHTML=rows.map(s=>`<div class="hvc-skill"><b>${esc(s.name)}</b><small>${esc(s.id)} · ${esc(s.category||"")}</small><small>Armas: ${esc((s.weapons||[]).join(", "))}</small><small>Clases: ${esc((s.classes||[]).join(", "))}</small><small>${esc(normalizeText(s.effect||""))}</small></div>`).join("");};
    $("#hvcBrowseSkillSearch").oninput=paint;$("#hvcBrowseWeapon").onchange=paint;$("#hvcBrowseClass").onchange=paint;paint();
  }

  function renderRegistriesTab(){
    const side=$("#hvcSide"),main=$("#hvcMain");
    side.innerHTML=`<div class="hvc-field"><span>Catalogo</span><select id="hvcRegistryKind"><option value="weapons">Armas</option><option value="classes">Clases</option><option value="races">Razas</option><option value="types">Tipos</option></select></div><div id="hvcRegistryList" class="hvc-reg-list" style="grid-template-columns:1fr"></div>`;
    $("#hvcRegistryKind").value=state.registryKind;
    main.innerHTML=`<div class="hvc-section"><h3>Agregar entrada al catalogo</h3><div class="hvc-grid two"><label class="hvc-field"><span>Nombre visible</span><input id="hvcRegistryName" placeholder="Guadana de guerra"></label><label class="hvc-field"><span>ID interno automatico</span><input id="hvcRegistryId" readonly></label><label class="hvc-field" id="hvcTacticalWrap"><span>Clase tactica (solo armas)</span><select id="hvcRegistryTactical">${["neutral","sword","spear","cavalry","bow","axe","mage","beast"].map(v=>`<option value="${v}">${title(v)}</option>`).join("")}</select></label></div><div class="hvc-actions"><button class="hvc-btn hvc-primary" id="hvcRegistryApply">AGREGAR AL REPO</button></div><pre id="hvcRegistryResult" class="hvc-preview" style="margin-top:10px">${esc(bridgeHelp())}</pre></div>`;
    const paintList=()=>{const kind=$("#hvcRegistryKind").value;state.registryKind=kind;$("#hvcTacticalWrap").style.display=kind==="weapons"?"flex":"none";$("#hvcRegistryList").innerHTML=deriveRegistry(kind).map(row=>`<div class="hvc-reg"><b>${esc(row.name||row.id)}</b><small>${esc(row.id)}${row.tacticalClass?` · ${esc(row.tacticalClass)}`:""}</small></div>`).join("");};
    $("#hvcRegistryKind").onchange=paintList;$("#hvcRegistryName").oninput=()=>{$("#hvcRegistryId").value=slug(formValue("hvcRegistryName"));};
    $("#hvcRegistryApply").onclick=async()=>{const out=$("#hvcRegistryResult");try{const name=formValue("hvcRegistryName").trim();if(!name)throw new Error("Escribe un nombre.");const kind=$("#hvcRegistryKind").value;const item={id:slug(name),name};if(kind==="weapons")item.tacticalClass=formValue("hvcRegistryTactical")||"neutral";out.textContent="Aplicando...";const response=await postBridge({action:"upsertRegistry",kind,item,commitMessage:`Content editor: add ${kind} ${name}`});out.textContent=`LISTO\nCommit: ${response.commit||""}`;setTimeout(()=>location.reload(),800);}catch(error){out.textContent=`ERROR\n${error.message}`;}};
    paintList();
  }

  function suspiciousText(text){return /(turno|ciclo tactico|ciclo t[aá]ctico|periodo de efecto|\bTR\b|Ã|Â)/i.test(String(text||""));}

  function renderAuditTab(){
    const units=runtimeUnits().filter(u=>suspiciousText(u.text||u.effectText||""));
    $("#hvcSide").innerHTML=`<div class="hvc-status">${units.length} unidades con texto historico o tecnico detectable.</div><p>La presentacion publica ya se normaliza a segundos. Aqui puedes guardar el texto limpio como override canonico.</p>`;
    $("#hvcMain").innerHTML=`<div class="hvc-section"><h3>Auditoria de textos</h3><div id="hvcAuditRows"></div></div>`;
    $("#hvcAuditRows").innerHTML=units.map(u=>{const raw=String(u.text||u.effectText||""),clean=normalizeText(raw);return `<div class="hvc-audit-row"><b>${esc(u.name||u.key)}</b><small> · ${esc(u.key)}</small><div class="hvc-audit-grid"><pre>${esc(raw)}</pre><pre>${esc(clean)}</pre></div><button class="hvc-btn" data-clean-key="${esc(u.key)}" style="margin-top:8px">Guardar texto claro en repo</button></div>`;}).join("")||`<div class="hvc-status ok">No se detectaron textos sospechosos.</div>`;
    $$("[data-clean-key]").forEach(btn=>btn.onclick=async()=>{const unit=unitByKey(btn.dataset.cleanKey);if(!unit)return;try{btn.textContent="Aplicando...";const meta=assignmentFor(unit.key)||{},clean=normalizeText(unit.text||unit.effectText||"");await postBridge({action:"upsertUnit",existing:true,originalKey:unit.key,unit:{key:unit.key,name:unit.name,text:clean},assignment:{name:meta.name||unit.name,rarity:meta.rarity||unit.rarity||"Basica",weaponTags:meta.weaponTags||[],classTags:meta.classTags||[],innate:meta.innate||[]},commitMessage:`Content editor: clarify text ${unit.name}`});btn.textContent="Guardado";setTimeout(()=>location.reload(),700);}catch(error){btn.textContent="Error";alert(error.message);}});
  }

  function render(){
    createPanel();
    if(state.activeTab==="units"){renderUnitSide();if(!state.key&&state.mode==="existing"){const first=runtimeUnits()[0];if(first){state.key=String(first.key);state.selectedSkills=[...(assignmentFor(first.key)?.innate||[])];}}renderUnitMain();}
    else if(state.activeTab==="skills")renderSkillsTab();
    else if(state.activeTab==="registries")renderRegistriesTab();
    else renderAuditTab();
  }

  function open(){const panel=createPanel();panel.classList.remove("hidden");render();bridgeHealth();}

  globalThis.hvContentEditorOpen=open;
})();
