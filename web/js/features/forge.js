"use strict";
/* HallValla · FORJA v157
   - Hub visual + Fundir + Construir.
   - Solo usa arte existente de HallValla e iconos; no abre modales de Forja.
   - Fundir solo muestra copias libres: no están reservadas por el mazo ni por Mina.
   - Los fragmentos se separan por rareza usando el mismo icono con distinto brillo.
*/
(function(){
  const PANEL_ID="hallvallaForgeSystem";
  const STYLE_ID="hallvallaForgeSystemStyle";
  const FRAGMENT_ICON="assets/home/icon_fragments.webp";
  const BACK_ICON="assets/ui/btn_back_hallvalla.webp";
  const EYE_ICON="assets/ui/effect_icons/ojo_del_cazador.webp";
  const SALVAGE_GAIN=typeof CRAFT_MATERIAL_GAIN==="number"?Math.max(1,CRAFT_MATERIAL_GAIN):50;
  const PAGE_SIZE=16;
  const RARITIES=Object.freeze([
    {key:"basic",label:"Básica",cost:800,glow:"#d9e0e6"},
    {key:"rare",label:"Rara",cost:1200,glow:"#4ab8ff"},
    {key:"epic",label:"Épica",cost:1600,glow:"#b56cff"},
    {key:"glorious",label:"Gloriosa",cost:2000,glow:"#ffe06b"},
    {key:"mythic",label:"Mítica",cost:2400,glow:"#ff5a43"},
    {key:"legendary",label:"Legendaria",cost:2800,glow:"#ffb52e"}
  ]);
  const RARITY_BY_KEY=Object.fromEntries(RARITIES.map(row=>[row.key,row]));
  const RARITY_ORDER=Object.fromEntries(RARITIES.map((row,index)=>[row.key,index]));
  let currentView="hub";
  let showUnavailable=false;
  let lastStatus="";
  const pageByView={salvage:0,craft:0};

  function esc(value){
    if(typeof escapeHtml==="function")return escapeHtml(String(value??""));
    return String(value??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
  }
  function normalizeText(value){
    return String(value||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
  }
  function forgeRarityKey(card){
    const rarity=normalizeText(card?.rarity||card?.rareza||"Basica");
    if(rarity.includes("semid")||rarity.includes("demigod"))return "demigod";
    if(rarity.includes("legend"))return "legendary";
    if(rarity.includes("mitic")||rarity.includes("mythic"))return "mythic";
    if(rarity.includes("glor"))return "glorious";
    if(rarity.includes("epic"))return "epic";
    if(rarity.includes("rara")||rarity.includes("rare"))return "rare";
    return "basic";
  }
  function forgeMeta(card){return RARITY_BY_KEY[forgeRarityKey(card)]||RARITY_BY_KEY.basic;}
  function getMaterials(collection=getPlayerCollection()){
    const base=typeof normalizeCraftMaterials==="function"?normalizeCraftMaterials(collection?.materials||{}):{...(collection?.materials||{})};
    RARITIES.forEach(row=>base[row.key]=Math.max(0,Math.floor(Number(base[row.key]||0))));
    return base;
  }
  function isForgeUnit(card){
    if(!card||String(card.type||"").toLowerCase()!=="unit"||card.leader)return false;
    if(forgeRarityKey(card)==="demigod")return false; // Semidiós se mantiene exclusivo de combate/progresión.
    if(card.craftable===false||card.mineExclusive===true||card.minePuzzle===true)return false;
    try{if(typeof isMineExclusiveCard==="function"&&isMineExclusiveCard(card))return false;}catch(_){ }
    return true;
  }
  function cardPortrait(card){
    try{
      const src=typeof getResolvedCardPortraitSource==="function"?getResolvedCardPortraitSource(card):card?.portrait;
      return String(src||card?.portrait||"");
    }catch(_){return String(card?.portrait||"");}
  }
  function deckReservedCounts(){
    try{if(typeof getHallvallaDeckReservedCounts==="function")return getHallvallaDeckReservedCounts();}catch(_){ }
    const counts=new Map();
    try{
      const deck=JSON.parse(localStorage.getItem("hallvalla_current_deck")||"[]");
      (Array.isArray(deck)?deck:[]).forEach(card=>{
        const key=String(card?.key||"");if(!key)return;
        counts.set(key,(counts.get(key)||0)+Math.max(1,Math.floor(Number(card?.qty||1))));
      });
    }catch(_){ }
    return counts;
  }
  function mineAssignedCounts(){
    try{if(typeof getHallvallaMineAssignedCounts==="function")return getHallvallaMineAssignedCounts(getHallvallaMineState());}catch(_){ }
    const counts=new Map();
    try{
      const state=JSON.parse(localStorage.getItem("hallvalla_mine_state_v1")||"{}");
      (Array.isArray(state?.slots)?state.slots:[]).forEach(slot=>{
        const key=String(slot?.cardKey||"");if(key)counts.set(key,(counts.get(key)||0)+1);
      });
    }catch(_){ }
    return counts;
  }
  function freeUnitRows(){
    const collection=getPlayerCollection();
    const deck=deckReservedCounts();
    const mine=mineAssignedCounts();
    return (collection.cards||[]).map(raw=>{
      const card=typeof hydrateCardVisualData==="function"?hydrateCardVisualData(raw):raw;
      const key=String(card?.key||"");
      const owned=Math.max(0,Math.floor(Number(raw?.qty||card?.qty||0)));
      const inDeck=Math.max(0,Math.floor(Number(deck.get(key)||0)));
      const inMine=Math.max(0,Math.floor(Number(mine.get(key)||0)));
      return {card,owned,inDeck,inMine,free:Math.max(0,owned-inDeck-inMine)};
    }).filter(row=>isForgeUnit(row.card)&&row.free>0)
      .sort((a,b)=>(RARITY_ORDER[forgeRarityKey(a.card)]??99)-(RARITY_ORDER[forgeRarityKey(b.card)]??99)||String(a.card.name||"").localeCompare(String(b.card.name||""),"es"));
  }
  function craftRows(){
    const collection=getPlayerCollection();
    const materials=getMaterials(collection);
    const source=typeof getCraftableCardPool==="function"?getCraftableCardPool():[];
    return source.filter(isForgeUnit).map(card=>{
      const hydrated=typeof hydrateCardVisualData==="function"?hydrateCardVisualData(card):card;
      const rarity=forgeRarityKey(hydrated);
      const meta=RARITY_BY_KEY[rarity]||RARITY_BY_KEY.basic;
      const cost=Math.max(1,Number(meta.cost||800));
      let lock="";
      try{if(typeof getCraftLockReason==="function")lock=String(getCraftLockReason(hydrated)||"");}catch(_){ }
      const have=Math.max(0,Number(materials[rarity]||0));
      return {card:hydrated,rarity,meta,cost,have,missing:Math.max(0,cost-have),lock,canCraft:!lock&&have>=cost};
    }).filter(row=>showUnavailable||row.canCraft)
      .sort((a,b)=>{
        if(a.canCraft!==b.canCraft)return a.canCraft?-1:1;
        const rarityDiff=(RARITY_ORDER[a.rarity]??99)-(RARITY_ORDER[b.rarity]??99);
        return rarityDiff||String(a.card.name||"").localeCompare(String(b.card.name||""),"es");
      });
  }
  function paginateRows(rows,view){
    const list=Array.isArray(rows)?rows:[];
    const totalPages=Math.max(1,Math.ceil(list.length/PAGE_SIZE));
    const page=Math.max(0,Math.min(totalPages-1,Math.floor(Number(pageByView[view]||0))));
    pageByView[view]=page;
    const start=page*PAGE_SIZE;
    return {rows:list.slice(start,start+PAGE_SIZE),page,totalPages,total:list.length,start};
  }
  function pagerHtml(view,pageData){
    if(!pageData||pageData.totalPages<=1)return "";
    const prevDisabled=pageData.page<=0;
    const nextDisabled=pageData.page>=pageData.totalPages-1;
    return `<nav class="hv-forge-pager" aria-label="Páginas de ${view==="salvage"?"Fundir":"Construir"}">
      <button class="hv-forge-page-btn hv-forge-page-prev" type="button" data-forge-page-prev ${prevDisabled?"disabled":""} aria-label="Página anterior" title="Página anterior"><img src="${BACK_ICON}" alt=""></button>
      <span class="hv-forge-page-count" aria-live="polite">${pageData.page+1} / ${pageData.totalPages}</span>
      <button class="hv-forge-page-btn hv-forge-page-next" type="button" data-forge-page-next ${nextDisabled?"disabled":""} aria-label="Página siguiente" title="Página siguiente"><img src="${BACK_ICON}" alt=""></button>
    </nav>`;
  }

  function ensureStyle(){
    if(document.getElementById(STYLE_ID))return;
    const style=document.createElement("style");
    style.id=STYLE_ID;
    style.textContent=`
      #${PANEL_ID}{position:fixed;inset:0;z-index:18000;display:block;overflow:hidden;background:#090705 url("assets/ui/deck_forge/forge_background.webp") center/cover no-repeat;color:#f7e5bd;font-family:Georgia,"Times New Roman",serif;}
      #${PANEL_ID}.hidden{display:none!important;}
      #${PANEL_ID} .hv-forge-system-vignette{position:absolute;inset:0;pointer-events:none;background:radial-gradient(circle at 50% 44%,transparent 0 38%,rgba(0,0,0,.20) 62%,rgba(0,0,0,.68) 100%);}
      #${PANEL_ID} button{font:inherit;}
      #${PANEL_ID} .hv-forge-hub{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;}
      #${PANEL_ID} .hv-forge-system-brand{position:absolute;top:5.5%;left:50%;transform:translateX(-50%);width:min(560px,64vw);height:auto;pointer-events:none;filter:drop-shadow(0 10px 20px rgba(0,0,0,.7));}
      #${PANEL_ID} .hv-forge-system-actions{position:relative;z-index:2;display:flex;gap:min(4vw,58px);align-items:center;justify-content:center;margin-top:7vh;}
      #${PANEL_ID} .hv-forge-system-choice,#${PANEL_ID} .hv-forge-back,#${PANEL_ID} .hv-forge-icon-btn,#${PANEL_ID} .hv-forge-unit-action{appearance:none;border:0;padding:0;margin:0;background:transparent;cursor:pointer;line-height:0;transition:transform .14s ease,filter .14s ease,opacity .14s ease;}
      #${PANEL_ID} .hv-forge-system-choice{filter:drop-shadow(0 10px 18px rgba(0,0,0,.62));}
      #${PANEL_ID} .hv-forge-system-choice img{display:block;width:min(360px,34vw);height:auto;}
      #${PANEL_ID} .hv-forge-system-choice:hover,#${PANEL_ID} .hv-forge-system-choice:focus-visible{transform:translateY(-3px) scale(1.025);filter:drop-shadow(0 13px 22px rgba(0,0,0,.72)) brightness(1.08);outline:none;}
      #${PANEL_ID} .hv-forge-back{position:absolute;z-index:8;left:2.2%;bottom:2.4%;filter:drop-shadow(0 8px 12px rgba(0,0,0,.75));}
      #${PANEL_ID} .hv-forge-back img{display:block;width:92px;height:auto;}
      #${PANEL_ID} .hv-forge-back:hover,#${PANEL_ID} .hv-forge-back:focus-visible{transform:translateX(-3px) scale(1.05);filter:drop-shadow(0 0 12px rgba(255,198,72,.55));outline:none;}
      #${PANEL_ID} .hv-forge-view{position:absolute;inset:0;z-index:2;padding:2.6vh 4vw 8vh;overflow:hidden;}
      #${PANEL_ID} .hv-forge-view-header{height:17vh;min-height:108px;display:flex;align-items:flex-start;justify-content:center;pointer-events:none;}
      #${PANEL_ID} .hv-forge-view-title{width:min(390px,38vw);height:auto;filter:drop-shadow(0 8px 15px rgba(0,0,0,.7));}
      #${PANEL_ID} .hv-forge-materials{position:absolute;left:50%;top:15.3vh;transform:translateX(-50%);z-index:4;display:flex;gap:clamp(7px,1.8vw,28px);align-items:center;justify-content:center;max-width:80vw;}
      #${PANEL_ID} .hv-forge-material{display:flex;align-items:center;gap:4px;white-space:nowrap;text-shadow:0 2px 5px #000;}
      #${PANEL_ID} .hv-forge-material img{width:clamp(31px,3.2vw,49px);height:clamp(34px,3.6vw,55px);object-fit:contain;filter:drop-shadow(0 0 8px var(--forge-glow)) drop-shadow(0 0 3px var(--forge-glow));}
      #${PANEL_ID} .hv-forge-material b{font-size:clamp(13px,1.25vw,20px);color:#fff4d0;}
      #${PANEL_ID} .hv-forge-material small{display:none;}
      #${PANEL_ID} .hv-forge-toolbar{position:absolute;right:3.2vw;top:3vh;z-index:7;display:flex;gap:13px;align-items:center;}
      #${PANEL_ID} .hv-forge-icon-btn{position:relative;width:58px;height:58px;filter:drop-shadow(0 8px 12px rgba(0,0,0,.75));}
      #${PANEL_ID} .hv-forge-icon-btn>img{width:100%;height:100%;object-fit:contain;}
      #${PANEL_ID} .hv-forge-icon-btn:hover,#${PANEL_ID} .hv-forge-icon-btn:focus-visible{transform:scale(1.08);filter:drop-shadow(0 0 12px rgba(255,200,72,.58));outline:none;}
      #${PANEL_ID} .hv-forge-icon-btn .hv-forge-action-mark{position:absolute;right:-2px;bottom:0;display:grid;place-items:center;min-width:22px;height:22px;border-radius:50%;background:#1a1007;color:#ffd56b;font:bold 15px/1 Arial;border:1px solid #b77b2a;box-shadow:0 2px 7px #000;}
      #${PANEL_ID} .hv-forge-icon-btn.is-active{filter:drop-shadow(0 0 14px rgba(255,194,64,.85));}
      #${PANEL_ID} .hv-forge-grid{position:absolute;left:5vw;right:5vw;top:22.5vh;bottom:17vh;display:grid;grid-template-columns:repeat(8,minmax(0,1fr));grid-template-rows:repeat(2,minmax(0,1fr));gap:clamp(10px,1.15vw,17px);align-items:start;align-content:start;overflow:hidden;padding:5px 10px;}
      #${PANEL_ID} .hv-forge-unit{position:relative;width:100%;max-width:104px;min-width:0;justify-self:center;align-self:start;text-align:center;filter:drop-shadow(0 7px 11px rgba(0,0,0,.76));}
      #${PANEL_ID} .hv-forge-unit-art{position:relative;width:100%;aspect-ratio:3/4;overflow:hidden;border-radius:4px;box-shadow:inset 0 0 0 1px rgba(223,174,73,.45),0 0 0 1px rgba(0,0,0,.58);background:rgba(0,0,0,.15);}
      #${PANEL_ID} .hv-forge-unit-art>img{display:block;width:100%;height:100%;object-fit:cover;}
      #${PANEL_ID} .hv-forge-unit-name{display:block;margin-top:4px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#ffe7af;font-size:clamp(10px,.84vw,13px);text-shadow:0 2px 4px #000;}
      #${PANEL_ID} .hv-forge-unit-sub{display:flex;justify-content:center;align-items:center;gap:3px;min-height:15px;color:#d6c095;font:700 clamp(9px,.72vw,11px)/1.05 Arial,sans-serif;text-shadow:0 2px 4px #000;white-space:nowrap;}
      #${PANEL_ID} .hv-forge-unit-sub img{width:15px;height:17px;object-fit:contain;filter:drop-shadow(0 0 4px var(--forge-glow));}
      #${PANEL_ID} .hv-forge-unit-action{position:absolute;right:-7px;top:-7px;width:36px;height:36px;z-index:4;filter:drop-shadow(0 5px 7px rgba(0,0,0,.8));}
      #${PANEL_ID} .hv-forge-unit-action img{width:100%;height:100%;object-fit:contain;filter:drop-shadow(0 0 5px var(--forge-glow));}
      #${PANEL_ID} .hv-forge-unit-action .hv-forge-action-mark{position:absolute;right:-3px;bottom:-1px;display:block;color:#ffe083;font:bold 18px/1 Arial;text-shadow:0 2px 3px #000,0 0 5px #000,0 0 5px var(--forge-glow);background:transparent;border:0;box-shadow:none;}
      #${PANEL_ID} .hv-forge-unit-action:hover,#${PANEL_ID} .hv-forge-unit-action:focus-visible{transform:scale(1.12);filter:drop-shadow(0 0 10px var(--forge-glow));outline:none;}
      #${PANEL_ID} .hv-forge-unit-action:disabled{cursor:default;opacity:.36;filter:grayscale(.65);}
      #${PANEL_ID} .hv-forge-unit.is-unavailable .hv-forge-unit-art{filter:grayscale(.55) brightness(.58);}
      #${PANEL_ID} .hv-forge-unit.is-unavailable .hv-forge-unit-name{color:#aa9d86;}
      #${PANEL_ID} .hv-forge-pager{position:absolute;left:50%;bottom:7.2vh;transform:translateX(-50%);z-index:7;display:flex;align-items:center;justify-content:center;gap:12px;min-height:38px;}
      #${PANEL_ID} .hv-forge-page-btn{appearance:none;border:0;background:transparent;padding:0;margin:0;width:62px;height:38px;cursor:pointer;line-height:0;filter:drop-shadow(0 6px 9px rgba(0,0,0,.72));transition:transform .14s ease,filter .14s ease,opacity .14s ease;}
      #${PANEL_ID} .hv-forge-page-btn img{display:block;width:100%;height:100%;object-fit:contain;pointer-events:none;}
      #${PANEL_ID} .hv-forge-page-next img{transform:scaleX(-1);}
      #${PANEL_ID} .hv-forge-page-btn:hover:not(:disabled),#${PANEL_ID} .hv-forge-page-btn:focus-visible:not(:disabled){transform:scale(1.08);filter:brightness(1.12) drop-shadow(0 0 9px rgba(255,202,83,.48));outline:none;}
      #${PANEL_ID} .hv-forge-page-btn:disabled{opacity:.26;cursor:default;filter:grayscale(.7) brightness(.72);}
      #${PANEL_ID} .hv-forge-page-count{min-width:58px;text-align:center;color:#f6d678;font:900 13px/1 Georgia,"Times New Roman",serif;letter-spacing:.08em;text-shadow:0 2px 5px #000;}
      #${PANEL_ID} .hv-forge-empty{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:min(620px,80vw);text-align:center;color:#ecd5a3;font-size:clamp(15px,1.6vw,23px);text-shadow:0 3px 8px #000;}
      #${PANEL_ID} .hv-forge-status{position:absolute;left:50%;bottom:2.8vh;transform:translateX(-50%);z-index:6;max-width:70vw;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#ffe3a2;font:600 clamp(12px,1vw,15px)/1.2 Arial,sans-serif;text-shadow:0 2px 6px #000;pointer-events:none;}
      @media(max-width:850px),(pointer:coarse){
        #${PANEL_ID} .hv-forge-system-brand{top:4%;width:min(440px,68vw);}
        #${PANEL_ID} .hv-forge-system-actions{gap:22px;margin-top:8vh;}
        #${PANEL_ID} .hv-forge-system-choice img{width:min(300px,38vw);}
        #${PANEL_ID} .hv-forge-back{left:1.2%;bottom:1.2%;}
        #${PANEL_ID} .hv-forge-back img{width:76px;}
        #${PANEL_ID} .hv-forge-view{padding-left:2vw;padding-right:2vw;}
        #${PANEL_ID} .hv-forge-view-header{height:15vh;min-height:84px;}
        #${PANEL_ID} .hv-forge-view-title{width:min(320px,42vw);}
        #${PANEL_ID} .hv-forge-materials{top:13.5vh;gap:8px;max-width:86vw;}
        #${PANEL_ID} .hv-forge-material img{width:30px;height:34px;}
        #${PANEL_ID} .hv-forge-material b{font-size:12px;}
        #${PANEL_ID} .hv-forge-toolbar{right:2vw;top:2vh;gap:8px;}
        #${PANEL_ID} .hv-forge-icon-btn{width:48px;height:48px;}
        #${PANEL_ID} .hv-forge-grid{left:2vw;right:2vw;top:20vh;bottom:18vh;grid-template-columns:repeat(8,minmax(0,1fr));grid-template-rows:repeat(2,minmax(0,1fr));gap:7px;padding:4px 6px;}
        #${PANEL_ID} .hv-forge-unit{max-width:68px;}
        #${PANEL_ID} .hv-forge-unit-name{margin-top:2px;font-size:9px;}
        #${PANEL_ID} .hv-forge-unit-sub{min-height:12px;font-size:8px;gap:2px;}
        #${PANEL_ID} .hv-forge-unit-sub img{width:12px;height:14px;}
        #${PANEL_ID} .hv-forge-unit-action{width:29px;height:29px;right:-5px;top:-5px;}
        #${PANEL_ID} .hv-forge-unit-action .hv-forge-action-mark{font-size:15px;}
        #${PANEL_ID} .hv-forge-pager{bottom:7.2vh;gap:8px;min-height:30px;}
        #${PANEL_ID} .hv-forge-page-btn{width:50px;height:31px;}
        #${PANEL_ID} .hv-forge-page-count{min-width:48px;font-size:11px;}
        #${PANEL_ID} .hv-forge-status{bottom:1.7vh;max-width:68vw;font-size:10px;}
      }
    `;
    document.head.appendChild(style);
  }

  function materialStripHtml(){
    const materials=getMaterials();
    return `<div class="hv-forge-materials" aria-label="Fragmentos por rareza">${RARITIES.map(row=>`
      <span class="hv-forge-material" style="--forge-glow:${row.glow}" title="${esc(row.label)}: ${Math.floor(materials[row.key]||0)} fragmentos">
        <img src="${FRAGMENT_ICON}" alt="${esc(row.label)}"><b>${Math.floor(materials[row.key]||0)}</b><small>${esc(row.label)}</small>
      </span>`).join("")}</div>`;
  }
  function backButtonHtml(label="Volver"){
    return `<button class="hv-forge-back" type="button" data-forge-back aria-label="${esc(label)}" title="${esc(label)}"><img src="${BACK_ICON}" alt=""></button>`;
  }
  function hubHtml(){
    return `<div class="hv-forge-hub">
      <img class="hv-forge-system-brand" src="assets/home/btn_forge.webp" alt="Forja">
      <div class="hv-forge-system-actions" role="group" aria-label="Acciones de Forja">
        <button class="hv-forge-system-choice" type="button" data-forge-view="salvage" aria-label="Fundir unidades"><img src="assets/ui/forge/btn_fundir.webp" alt="Fundir"></button>
        <button class="hv-forge-system-choice" type="button" data-forge-view="craft" aria-label="Construir unidades"><img src="assets/ui/forge/btn_construir.webp" alt="Construir"></button>
      </div>
      ${backButtonHtml("Volver al inicio")}
    </div>`;
  }
  function cardArtHtml(card){
    const src=cardPortrait(card);
    return src?`<img src="${esc(src)}" alt="${esc(card?.name||"Unidad")}" draggable="false">`:`<span aria-hidden="true">${esc(card?.icon||"✦")}</span>`;
  }
  function salvageCardHtml(row){
    const meta=forgeMeta(row.card);
    return `<article class="hv-forge-unit" data-forge-card="${esc(row.card.key||"")}" style="--forge-glow:${meta.glow}">
      <div class="hv-forge-unit-art">${cardArtHtml(row.card)}</div>
      <button class="hv-forge-unit-action" type="button" data-forge-salvage-one="${esc(row.card.key||"")}" aria-label="Fundir una copia de ${esc(row.card.name||"unidad")}" title="Fundir 1 · +${SALVAGE_GAIN} fragmentos ${esc(meta.label)}"><img src="${FRAGMENT_ICON}" alt=""><span class="hv-forge-action-mark">−</span></button>
      <strong class="hv-forge-unit-name">${esc(row.card.name||"Unidad")}</strong>
      <span class="hv-forge-unit-sub">Libre ×${row.free} · +${SALVAGE_GAIN}</span>
    </article>`;
  }
  function craftCardHtml(row){
    const unavailable=!row.canCraft;
    const reason=row.lock?row.lock:(row.missing>0?`Faltan ${row.missing} fragmentos ${row.meta.label}`:"");
    return `<article class="hv-forge-unit ${unavailable?"is-unavailable":""}" data-forge-card="${esc(row.card.key||"")}" style="--forge-glow:${row.meta.glow}">
      <div class="hv-forge-unit-art">${cardArtHtml(row.card)}</div>
      <button class="hv-forge-unit-action" type="button" data-forge-craft-one="${esc(row.card.key||"")}" ${unavailable?"disabled":""} aria-label="Construir ${esc(row.card.name||"unidad")}" title="${esc(unavailable?reason:`Construir por ${row.cost} fragmentos ${row.meta.label}`)}"><img src="${FRAGMENT_ICON}" alt=""><span class="hv-forge-action-mark">+</span></button>
      <strong class="hv-forge-unit-name">${esc(row.card.name||"Unidad")}</strong>
      <span class="hv-forge-unit-sub"><img src="${FRAGMENT_ICON}" alt="">${row.cost}${unavailable&&row.missing>0?` · faltan ${row.missing}`:""}${row.lock?" · bloqueada":""}</span>
    </article>`;
  }
  function salvageViewHtml(){
    const allRows=freeUnitRows();
    const page=paginateRows(allRows,"salvage");
    const rows=page.rows;
    return `<div class="hv-forge-view" data-forge-screen="salvage">
      <div class="hv-forge-view-header"><img class="hv-forge-view-title" src="assets/ui/forge/btn_fundir.webp" alt="Fundir"></div>
      ${materialStripHtml()}
      <div class="hv-forge-toolbar">
        <button class="hv-forge-icon-btn" type="button" data-forge-salvage-all aria-label="Fundir todas las copias libres" title="Fundir todas las copias libres"><img src="${FRAGMENT_ICON}" alt=""><span class="hv-forge-action-mark">×</span></button>
      </div>
      ${allRows.length?`<div class="hv-forge-grid" aria-label="Unidades libres para fundir">${rows.map(salvageCardHtml).join("")}</div>`:`<p class="hv-forge-empty">No tienes unidades libres para fundir. Las copias usadas en el mazo o trabajando en la Mina no aparecen aquí.</p>`}
      ${pagerHtml("salvage",page)}
      ${backButtonHtml("Volver a la Forja")}
      <div class="hv-forge-status" aria-live="polite">${esc(lastStatus)}</div>
    </div>`;
  }
  function craftViewHtml(){
    const allRows=craftRows();
    const page=paginateRows(allRows,"craft");
    const rows=page.rows;
    return `<div class="hv-forge-view" data-forge-screen="craft">
      <div class="hv-forge-view-header"><img class="hv-forge-view-title" src="assets/ui/forge/btn_construir.webp" alt="Construir"></div>
      ${materialStripHtml()}
      <div class="hv-forge-toolbar">
        <button class="hv-forge-icon-btn ${showUnavailable?"is-active":""}" type="button" data-forge-toggle-unavailable aria-pressed="${showUnavailable?"true":"false"}" aria-label="${showUnavailable?"Ocultar":"Ver"} unidades que todavía no puedes construir" title="${showUnavailable?"Ocultar":"Ver"} unidades que todavía no puedes construir"><img src="${EYE_ICON}" alt=""></button>
      </div>
      ${allRows.length?`<div class="hv-forge-grid" aria-label="Unidades para construir">${rows.map(craftCardHtml).join("")}</div>`:`<p class="hv-forge-empty">${showUnavailable?"No hay unidades disponibles para construir en este momento.":"Todavía no tienes fragmentos suficientes para construir una unidad. Usa el icono del ojo para ver costes y cuánto te falta."}</p>`}
      ${pagerHtml("craft",page)}
      ${backButtonHtml("Volver a la Forja")}
      <div class="hv-forge-status" aria-live="polite">${esc(lastStatus)}</div>
    </div>`;
  }

  function ensurePanel(){
    let panel=document.getElementById(PANEL_ID);
    if(panel)return panel;
    ensureStyle();
    panel=document.createElement("section");
    panel.id=PANEL_ID;
    panel.className="hidden";
    panel.setAttribute("aria-label","Forja");
    panel.innerHTML='<div class="hv-forge-system-vignette" aria-hidden="true"></div><div data-forge-content></div>';
    document.body.appendChild(panel);
    panel.addEventListener("click",handleForgeClick);
    renderForge();
    return panel;
  }
  function setStatus(text=""){
    lastStatus=String(text||"");
    const el=document.querySelector(`#${PANEL_ID} .hv-forge-status`);
    if(el)el.textContent=lastStatus;
  }
  function renderForge(){
    const panel=document.getElementById(PANEL_ID);
    if(!panel)return;
    const content=panel.querySelector("[data-forge-content]");
    if(!content)return;
    content.innerHTML=currentView==="salvage"?salvageViewHtml():currentView==="craft"?craftViewHtml():hubHtml();
  }
  function openView(view){
    currentView=view==="salvage"||view==="craft"?view:"hub";
    if(currentView==="salvage"||currentView==="craft")pageByView[currentView]=0;
    lastStatus="";
    renderForge();
    try{tryPlaySound?.("button_click",.25);}catch(_){ }
  }
  function saveForgeCollection(collection){
    collection.materials=getMaterials(collection);
    savePlayerCollection(collection);
    try{renderNotificationBadge?.();renderHomeProgress?.();}catch(_){ }
  }
  function salvageOne(cardKey){
    const row=freeUnitRows().find(item=>String(item.card?.key||"")===String(cardKey||""));
    if(!row||row.free<=0){setStatus("Esa copia ya está reservada por el mazo o la Mina.");renderForge();return false;}
    const collection=getPlayerCollection();
    const card=collection.cards?.find(item=>String(item?.key||"")===String(cardKey||""));
    if(!card)return false;
    const rarity=forgeRarityKey(row.card),meta=RARITY_BY_KEY[rarity];
    if(!meta)return false;
    card.qty=Math.max(0,Math.floor(Number(card.qty||0))-1);
    collection.cards=collection.cards.filter(item=>Math.max(0,Math.floor(Number(item?.qty||0)))>0);
    collection.materials=getMaterials(collection);
    collection.materials[rarity]=Math.max(0,Number(collection.materials[rarity]||0))+SALVAGE_GAIN;
    saveForgeCollection(collection);
    lastStatus=`${row.card.name}: +${SALVAGE_GAIN} fragmentos ${meta.label}.`;
    renderForge();
    return true;
  }
  function salvageAll(){
    const rows=freeUnitRows();
    if(!rows.length){setStatus("No hay copias libres para fundir.");return false;}
    const collection=getPlayerCollection();
    collection.materials=getMaterials(collection);
    let destroyed=0;
    const gains={};
    rows.forEach(row=>{
      const card=collection.cards?.find(item=>String(item?.key||"")===String(row.card?.key||""));
      if(!card||row.free<=0)return;
      const rarity=forgeRarityKey(row.card);
      if(!RARITY_BY_KEY[rarity])return;
      const qty=Math.min(row.free,Math.max(0,Math.floor(Number(card.qty||0))));
      if(qty<=0)return;
      card.qty=Math.max(0,Math.floor(Number(card.qty||0))-qty);
      const gain=qty*SALVAGE_GAIN;
      collection.materials[rarity]=Math.max(0,Number(collection.materials[rarity]||0))+gain;
      gains[rarity]=(gains[rarity]||0)+gain;
      destroyed+=qty;
    });
    collection.cards=(collection.cards||[]).filter(item=>Math.max(0,Math.floor(Number(item?.qty||0)))>0);
    if(!destroyed){setStatus("No hay copias libres para fundir.");return false;}
    saveForgeCollection(collection);
    const summary=RARITIES.filter(row=>gains[row.key]).map(row=>`+${gains[row.key]} ${row.label}`).join(" · ");
    lastStatus=`Fundidas ${destroyed} unidades libres · ${summary}`;
    renderForge();
    return true;
  }
  function craftOne(cardKey){
    const source=typeof getCraftableCardPool==="function"?getCraftableCardPool():[];
    const card=source.find(item=>String(item?.key||"")===String(cardKey||""));
    if(!isForgeUnit(card)){setStatus("Esta unidad no puede construirse en la Forja.");return false;}
    const rarity=forgeRarityKey(card),meta=RARITY_BY_KEY[rarity];
    if(!meta){setStatus("Esta rareza no se construye en la Forja.");return false;}
    let lock="";
    try{if(typeof getCraftLockReason==="function")lock=String(getCraftLockReason(card)||"");}catch(_){ }
    if(lock){setStatus(lock);return false;}
    const collection=getPlayerCollection();
    collection.cards=Array.isArray(collection.cards)?collection.cards:[];
    collection.materials=getMaterials(collection);
    const have=Math.max(0,Number(collection.materials[rarity]||0));
    if(have<meta.cost){setStatus(`Faltan ${meta.cost-have} fragmentos ${meta.label} para ${card.name}.`);return false;}
    collection.materials[rarity]=have-meta.cost;
    const existing=collection.cards.find(item=>String(item?.key||"")===String(card.key||""));
    if(existing)existing.qty=Math.max(0,Math.floor(Number(existing.qty||0)))+1;
    else collection.cards.push({...card,qty:1});
    saveForgeCollection(collection);
    lastStatus=`${card.name} construida · −${meta.cost} fragmentos ${meta.label}.`;
    renderForge();
    return true;
  }

  function handleForgeClick(event){
    const target=event.target?.closest?.("button");
    if(!target)return;
    if(target.matches("[data-forge-view]")){openView(target.dataset.forgeView);return;}
    if(target.matches("[data-forge-back]")){
      if(currentView!=="hub")openView("hub");else closeForgeHub();
      return;
    }
    if(target.matches("[data-forge-salvage-one]")){salvageOne(target.dataset.forgeSalvageOne);return;}
    if(target.matches("[data-forge-salvage-all]")){salvageAll();return;}
    if(target.matches("[data-forge-craft-one]")){craftOne(target.dataset.forgeCraftOne);return;}
    if(target.matches("[data-forge-page-prev]")){
      if(currentView==="salvage"||currentView==="craft")pageByView[currentView]=Math.max(0,(pageByView[currentView]||0)-1);
      renderForge();return;
    }
    if(target.matches("[data-forge-page-next]")){
      if(currentView==="salvage"||currentView==="craft")pageByView[currentView]=Math.max(0,(pageByView[currentView]||0)+1);
      renderForge();return;
    }
    if(target.matches("[data-forge-toggle-unavailable]")){showUnavailable=!showUnavailable;pageByView.craft=0;lastStatus="";renderForge();}
  }

  function openForgeHub(){
    const panel=ensurePanel();
    currentView="hub";
    lastStatus="";
    renderForge();
    document.getElementById("mainMenu")?.classList.add("hidden");
    panel.classList.remove("hidden");
    panel.removeAttribute("aria-hidden");
    return true;
  }
  function closeForgeHub(){
    const panel=document.getElementById(PANEL_ID);
    if(panel){panel.classList.add("hidden");panel.setAttribute("aria-hidden","true");}
    currentView="hub";
    lastStatus="";
    document.getElementById("mainMenu")?.classList.remove("hidden");
    return true;
  }

  Object.assign(globalThis,{openForgeHub,closeForgeHub});
})();
