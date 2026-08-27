/* HallValla Stage 10 · HVDEV bundle
   Todos los calibradores internos agrupados. Solo existe en runtime con ?hvdev=1. */

/* HallValla FORGE6CTRL · editor directo individual de la Forja */
(()=>{
  'use strict';

  /* Clave nueva: no reutiliza posiciones del editor anterior que podían desplazar contenedores completos. */
  const STORAGE_KEY='hallvalla_forge_direct_tuner_clean_v6';
  const LEGACY_STORAGE_KEYS=[];
  const PANEL_KEY='hallvalla_forge_direct_tuner_panel_clean_v1';
  const $=id=>document.getElementById(id);
  const DEV_TOOLS_ENABLED=globalThis.__HALLVALLA_DEV_TOOLS__===true; // El editor solo existe en ?hvdev=1; el layout aprobado sigue siendo runtime.

  const GROUPS={
    tabs:{label:'Pestañas de unidades'},
    filters:{label:'Filtros invisibles'},
    collection:{label:'Colección'},
    navigation:{label:'Navegación'},
    spellbook:{label:'Mazo'},
    actions:{label:'Botones'},
    window:{label:'Ventana'}
  };

  /* direct:false = grupo seleccionable desde el panel, sin secuestrar un clic normal. */
  const TARGETS={
    forgeWindow:{group:'window',label:'Ventana completa de Forja',selector:'#deckBuilderPanel .deckbuilder-card',direct:false},
    mainClose:{group:'actions',label:'Botón cerrar',selector:'#deckBuilderPanel #closeDeckBuilderBtn',direct:true},
    save:{group:'actions',label:'Botón guardar',selector:'#deckBuilderPanel #saveDeckBtn',direct:true},

    tabsGroup:{group:'tabs',label:'Todas las pestañas (grupo)',selector:'#deckBuilderPanel .deckbuilder-leader-tabs',direct:false},
    tabWarrior:{group:'tabs',label:'Hitbox Guerrero',selector:'#deckBuilderPanel [data-deck-unit-filter="warrior"]',direct:true},
    tabArcher:{group:'tabs',label:'Hitbox Arquero',selector:'#deckBuilderPanel [data-deck-unit-filter="archer"]',direct:true},
    tabAssassin:{group:'tabs',label:'Hitbox Asesino',selector:'#deckBuilderPanel [data-deck-unit-filter="assassin"]',direct:true},
    tabMage:{group:'tabs',label:'Hitbox Arcano',selector:'#deckBuilderPanel [data-deck-unit-filter="mage"]',direct:true},
    tabCavalry:{group:'tabs',label:'Hitbox Caballería',selector:'#deckBuilderPanel [data-deck-unit-filter="cavalry"]',direct:true},
    tabAxe:{group:'tabs',label:'Hitbox Hacha',selector:'#deckBuilderPanel [data-deck-unit-filter="axe"]',direct:true},

    filterGroup:{group:'filters',label:'Cinco filtros (grupo)',selector:'#deckBuilderPanel #deckFilterGroup',direct:false},
    filterType:{group:'filters',label:'Hitbox Tipo',selector:'#deckBuilderPanel #deckTypeFilter',direct:true},
    filterOwnership:{group:'filters',label:'Hitbox Posesión',selector:'#deckBuilderPanel #deckOwnershipFilter',direct:true},
    filterRarity:{group:'filters',label:'Hitbox Rareza',selector:'#deckBuilderPanel #deckRarityFilter',direct:true},
    filterPower:{group:'filters',label:'Hitbox Poder de batalla',selector:'#deckBuilderPanel #deckBattlePowerFilter',direct:true},
    filterSort:{group:'filters',label:'Hitbox Orden',selector:'#deckBuilderPanel #deckBattlePowerSort',direct:true},

    collectionSection:{group:'collection',label:'Colección completa (grupo)',selector:'#deckBuilderPanel .deckbuilder-collection',direct:false},
    cards:{group:'collection',label:'Todas las cartas visibles (grupo)',selector:'#deckBuilderPanel #deckCollectionGrid',direct:false},

    pager:{group:'navigation',label:'Paginación completa (grupo)',selector:'#deckBuilderPanel #deckCollectionPager',direct:false},
    prev:{group:'navigation',label:'Flecha anterior',selector:'#deckBuilderPanel #deckCollectionPrevBtn',direct:true},
    next:{group:'navigation',label:'Flecha siguiente',selector:'#deckBuilderPanel #deckCollectionNextBtn',direct:true},

    deckGroup:{group:'spellbook',label:'Mazo completo (grupo)',selector:'#deckBuilderPanel #deckBuilderDeckPanel',direct:false},
    principalGroup:{group:'spellbook',label:'Principales (grupo)',selector:'#deckBuilderPanel #deckPrincipalSlots',direct:false},
    deckCards:{group:'spellbook',label:'Cartas del mazo (grupo)',selector:'#deckBuilderPanel #currentDeckList',direct:false}
  };

  /* Cada carta y cada botón funcional restante se calibra de forma independiente. */
  for(let i=1;i<=20;i++){
    TARGETS[`collectionCard${i}`]={group:'collection',label:`Carta colección ${i}`,selector:`#deckBuilderPanel #deckCollectionGrid > :nth-child(${i})`,direct:true};
    TARGETS[`collectionPlus${i}`]={group:'collection',label:`Botón + ${i}`,selector:`#deckBuilderPanel #deckCollectionGrid > :nth-child(${i}) .deck-mini-plus`,direct:true};
    TARGETS[`deckCard${i}`]={group:'spellbook',label:`Carta mazo ${i}`,selector:`#deckBuilderPanel #currentDeckList > :nth-child(${i})`,direct:true};
    TARGETS[`deckRemove${i}`]={group:'spellbook',label:`Quitar mazo ${i}`,selector:`#deckBuilderPanel #currentDeckList > :nth-child(${i}) .deck-mini-remove`,direct:true};
    TARGETS[`deckStar${i}`]={group:'spellbook',label:`Estrella mazo ${i}`,selector:`#deckBuilderPanel #currentDeckList > :nth-child(${i}) .deck-mini-principal`,direct:true};
  }
  for(let i=1;i<=3;i++){
    TARGETS[`principal${i}`]={group:'spellbook',label:`Principal ${i}`,selector:`#deckBuilderPanel #deckPrincipalSlots > :nth-child(${i})`,direct:true};
    TARGETS[`principalClear${i}`]={group:'spellbook',label:`Quitar principal ${i}`,selector:`#deckBuilderPanel #deckPrincipalSlots > :nth-child(${i}) .deck-principal-clear`,direct:true};
  }

  const defaultValue=()=>({x:0,y:0,scale:100,width:100,height:100});
  const USER_LAYOUT={"forgeWindow":{"x":0,"y":0,"scale":100,"width":100,"height":100},"mainClose":{"x":1,"y":453,"scale":80,"width":100,"height":100},"save":{"x":5,"y":-3,"scale":95,"width":100,"height":100},"tabsGroup":{"x":0,"y":0,"scale":100,"width":100,"height":100},"tabWarrior":{"x":0,"y":0,"scale":100,"width":100,"height":100},"tabArcher":{"x":0,"y":0,"scale":100,"width":100,"height":100},"tabAssassin":{"x":0,"y":0,"scale":100,"width":100,"height":100},"tabMage":{"x":0,"y":0,"scale":100,"width":100,"height":100},"tabCavalry":{"x":0,"y":0,"scale":100,"width":100,"height":100},"tabAxe":{"x":0,"y":0,"scale":100,"width":100,"height":100},"filterGroup":{"x":0,"y":0,"scale":100,"width":100,"height":100},"filterType":{"x":0,"y":0,"scale":100,"width":100,"height":100},"filterOwnership":{"x":0,"y":0,"scale":100,"width":100,"height":100},"filterRarity":{"x":0,"y":0,"scale":100,"width":100,"height":100},"filterPower":{"x":0,"y":0,"scale":100,"width":100,"height":100},"filterSort":{"x":0,"y":0,"scale":100,"width":100,"height":100},"collectionSection":{"x":0,"y":0,"scale":100,"width":100,"height":100},"cards":{"x":0,"y":0,"scale":100,"width":100,"height":100},"pager":{"x":0,"y":0,"scale":100,"width":100,"height":100},"prev":{"x":16,"y":0,"scale":60,"width":100,"height":200},"next":{"x":-7,"y":1,"scale":70,"width":100,"height":100},"deckGroup":{"x":0,"y":0,"scale":100,"width":100,"height":100},"principalGroup":{"x":0,"y":0,"scale":100,"width":100,"height":100},"deckCards":{"x":9,"y":-13,"scale":95,"width":100,"height":105},"collectionCard1":{"x":0,"y":-5,"scale":90,"width":110,"height":100},"collectionPlus1":{"x":-5,"y":70,"scale":50,"width":100,"height":100},"deckCard1":{"x":3,"y":1,"scale":100,"width":100,"height":100},"deckRemove1":{"x":0,"y":0,"scale":100,"width":100,"height":100},"deckStar1":{"x":0,"y":0,"scale":100,"width":100,"height":100},"collectionCard2":{"x":0,"y":-5,"scale":70,"width":170,"height":150},"collectionPlus2":{"x":-10,"y":85,"scale":70,"width":100,"height":100},"deckCard2":{"x":1,"y":-1,"scale":100,"width":100,"height":100},"deckRemove2":{"x":0,"y":0,"scale":100,"width":100,"height":100},"deckStar2":{"x":0,"y":0,"scale":100,"width":100,"height":100},"collectionCard3":{"x":-2,"y":-7,"scale":75,"width":160,"height":140},"collectionPlus3":{"x":-12,"y":85,"scale":70,"width":100,"height":100},"deckCard3":{"x":5,"y":-3,"scale":100,"width":100,"height":100},"deckRemove3":{"x":0,"y":0,"scale":100,"width":100,"height":100},"deckStar3":{"x":0,"y":0,"scale":100,"width":100,"height":100},"collectionCard4":{"x":-4,"y":-2,"scale":75,"width":165,"height":100},"collectionPlus4":{"x":-8,"y":74,"scale":75,"width":100,"height":100},"deckCard4":{"x":4,"y":-2,"scale":100,"width":100,"height":100},"deckRemove4":{"x":0,"y":0,"scale":100,"width":100,"height":100},"deckStar4":{"x":0,"y":0,"scale":100,"width":100,"height":100},"collectionCard5":{"x":-7,"y":-6,"scale":75,"width":100,"height":100},"collectionPlus5":{"x":-5,"y":79,"scale":70,"width":100,"height":100},"deckCard5":{"x":4,"y":-2,"scale":100,"width":100,"height":100},"deckRemove5":{"x":0,"y":0,"scale":100,"width":100,"height":100},"deckStar5":{"x":0,"y":0,"scale":100,"width":100,"height":100},"collectionCard6":{"x":1,"y":-10,"scale":70,"width":190,"height":100},"collectionPlus6":{"x":-15,"y":82,"scale":70,"width":100,"height":100},"deckCard6":{"x":1,"y":0,"scale":100,"width":100,"height":100},"deckRemove6":{"x":0,"y":0,"scale":100,"width":100,"height":100},"deckStar6":{"x":0,"y":0,"scale":100,"width":100,"height":100},"collectionCard7":{"x":-1,"y":-12,"scale":65,"width":220,"height":185},"collectionPlus7":{"x":-16,"y":96,"scale":70,"width":100,"height":100},"deckCard7":{"x":0,"y":0,"scale":100,"width":100,"height":100},"deckRemove7":{"x":0,"y":0,"scale":100,"width":100,"height":100},"deckStar7":{"x":0,"y":0,"scale":100,"width":100,"height":100},"collectionCard8":{"x":-2,"y":-11,"scale":80,"width":165,"height":135},"collectionPlus8":{"x":-13,"y":83,"scale":60,"width":100,"height":100},"deckCard8":{"x":0,"y":0,"scale":100,"width":100,"height":100},"deckRemove8":{"x":0,"y":0,"scale":100,"width":100,"height":100},"deckStar8":{"x":0,"y":0,"scale":100,"width":100,"height":100},"collectionCard9":{"x":-5,"y":-10,"scale":73,"width":170,"height":100},"collectionPlus9":{"x":-11,"y":82,"scale":70,"width":100,"height":100},"deckCard9":{"x":2,"y":-2,"scale":100,"width":100,"height":100},"deckRemove9":{"x":0,"y":0,"scale":100,"width":100,"height":100},"deckStar9":{"x":0,"y":0,"scale":100,"width":100,"height":100},"collectionCard10":{"x":-7,"y":-12,"scale":70,"width":185,"height":160},"collectionPlus10":{"x":-11,"y":90,"scale":70,"width":100,"height":100},"deckCard10":{"x":3,"y":-3,"scale":100,"width":100,"height":100},"deckRemove10":{"x":0,"y":0,"scale":100,"width":100,"height":100},"deckStar10":{"x":0,"y":0,"scale":100,"width":100,"height":100},"collectionCard11":{"x":1,"y":-19,"scale":70,"width":195,"height":160},"collectionPlus11":{"x":-14,"y":90,"scale":75,"width":100,"height":100},"deckCard11":{"x":1,"y":-1,"scale":100,"width":100,"height":100},"deckRemove11":{"x":0,"y":0,"scale":100,"width":100,"height":100},"deckStar11":{"x":0,"y":0,"scale":100,"width":100,"height":100},"collectionCard12":{"x":-1,"y":-18,"scale":70,"width":195,"height":100},"collectionPlus12":{"x":-16,"y":83,"scale":70,"width":100,"height":100},"deckCard12":{"x":0,"y":0,"scale":100,"width":100,"height":100},"deckRemove12":{"x":0,"y":0,"scale":100,"width":100,"height":100},"deckStar12":{"x":0,"y":0,"scale":100,"width":100,"height":100},"collectionCard13":{"x":-3,"y":-19,"scale":65,"width":225,"height":190},"collectionPlus13":{"x":-17,"y":97,"scale":70,"width":100,"height":100},"deckCard13":{"x":4,"y":-2,"scale":100,"width":100,"height":100},"deckRemove13":{"x":0,"y":0,"scale":100,"width":100,"height":100},"deckStar13":{"x":0,"y":0,"scale":100,"width":100,"height":100},"collectionCard14":{"x":-5,"y":-17,"scale":75,"width":165,"height":100},"collectionPlus14":{"x":-10,"y":78,"scale":70,"width":100,"height":100},"deckCard14":{"x":5,"y":0,"scale":100,"width":95,"height":95},"deckRemove14":{"x":0,"y":0,"scale":100,"width":100,"height":100},"deckStar14":{"x":0,"y":0,"scale":100,"width":100,"height":100},"collectionCard15":{"x":-6,"y":-17,"scale":60,"width":235,"height":175},"collectionPlus15":{"x":-11,"y":92,"scale":70,"width":100,"height":100},"deckCard15":{"x":2,"y":-2,"scale":90,"width":95,"height":100},"deckRemove15":{"x":0,"y":0,"scale":100,"width":100,"height":100},"deckStar15":{"x":0,"y":0,"scale":100,"width":100,"height":100},"collectionCard16":{"x":0,"y":0,"scale":100,"width":100,"height":100},"collectionPlus16":{"x":0,"y":0,"scale":100,"width":100,"height":100},"deckCard16":{"x":2,"y":-2,"scale":85,"width":100,"height":100},"deckRemove16":{"x":0,"y":0,"scale":100,"width":100,"height":100},"deckStar16":{"x":0,"y":0,"scale":100,"width":100,"height":100},"collectionCard17":{"x":0,"y":0,"scale":100,"width":100,"height":100},"collectionPlus17":{"x":0,"y":0,"scale":100,"width":100,"height":100},"deckCard17":{"x":0,"y":0,"scale":90,"width":100,"height":95},"deckRemove17":{"x":0,"y":0,"scale":100,"width":100,"height":100},"deckStar17":{"x":0,"y":0,"scale":100,"width":100,"height":100},"collectionCard18":{"x":0,"y":0,"scale":100,"width":100,"height":100},"collectionPlus18":{"x":0,"y":0,"scale":100,"width":100,"height":100},"deckCard18":{"x":2,"y":-1,"scale":85,"width":100,"height":100},"deckRemove18":{"x":0,"y":0,"scale":100,"width":100,"height":100},"deckStar18":{"x":0,"y":0,"scale":100,"width":100,"height":100},"collectionCard19":{"x":0,"y":0,"scale":100,"width":100,"height":100},"collectionPlus19":{"x":0,"y":0,"scale":100,"width":100,"height":100},"deckCard19":{"x":3,"y":-1,"scale":85,"width":100,"height":100},"deckRemove19":{"x":0,"y":0,"scale":100,"width":100,"height":100},"deckStar19":{"x":0,"y":0,"scale":100,"width":100,"height":100},"collectionCard20":{"x":0,"y":0,"scale":100,"width":100,"height":100},"collectionPlus20":{"x":0,"y":0,"scale":100,"width":100,"height":100},"deckCard20":{"x":2,"y":-1,"scale":85,"width":100,"height":100},"deckRemove20":{"x":0,"y":0,"scale":100,"width":100,"height":100},"deckStar20":{"x":0,"y":0,"scale":100,"width":100,"height":100},"principal1":{"x":11,"y":-22,"scale":75,"width":100,"height":100},"principalClear1":{"x":0,"y":0,"scale":100,"width":100,"height":100},"principal2":{"x":11,"y":-23,"scale":80,"width":100,"height":100},"principalClear2":{"x":0,"y":0,"scale":100,"width":100,"height":100},"principal3":{"x":8,"y":-23,"scale":80,"width":100,"height":100},"principalClear3":{"x":0,"y":0,"scale":100,"width":100,"height":100}};
  const defaultState=()=>Object.fromEntries(Object.keys(TARGETS).map(key=>[key,{...defaultValue(),...(USER_LAYOUT[key]||{})}]));

  function isUniformCardKey(key){
    return /^(collectionCard\d+|deckCard\d+|principal\d+)$/.test(String(key||''));
  }

  function normalizeUniformCardSizing(layout){
    if(!layout||typeof layout!=='object')return layout;
    for(const key of Object.keys(layout)){
      if(!isUniformCardKey(key)||!layout[key])continue;
      layout[key].x=0;
      layout[key].y=0;
      layout[key].scale=100;
      layout[key].width=100;
      layout[key].height=100;
    }
    return layout;
  }

  let state=loadState();
  let activeGroup='collection';
  let activeKey='collectionCard1';
  let panelOpen=false;
  let drag=null;
  let shell=null;
  let body=null;
  let pointerSelectWired=false;
  let keyboardWired=false;
  let contentObserver=null;
  let mutationScheduled=false;

  function loadState(){
    const base=defaultState();
    try{
      let raw=JSON.parse(localStorage.getItem(STORAGE_KEY)||'null');
      if(!raw){
        for(const legacyKey of LEGACY_STORAGE_KEYS){
          raw=JSON.parse(localStorage.getItem(legacyKey)||'null');
          if(raw)break;
        }
      }
      raw=raw||{};
      for(const key of Object.keys(base)){
        const src=raw[key]||{};
        for(const field of Object.keys(base[key])){
          const n=Number(src[field]);
          if(Number.isFinite(n))base[key][field]=n;
        }
      }
    }catch(_){ }
    return base;
  }
  function saveState(){try{localStorage.setItem(STORAGE_KEY,JSON.stringify(state));}catch(_){} }
  function isForgeOpen(){const panel=$('deckBuilderPanel');return !!(panel&&!panel.classList.contains('hidden'));}
  function targetElement(key){const cfg=TARGETS[key];return cfg?document.querySelector(cfg.selector):null;}

  function clearTunerStyles(el){
    if(!el)return;
    for(const prop of ['translate','scale','width','height','min-height','max-height','transform-origin'])el.style.removeProperty(prop);
  }

  function naturalMetrics(key,el){
    if(!el)return {width:1,height:1};
    const attrW='hvTunerNaturalW',attrH='hvTunerNaturalH';
    let w=Number(el.dataset[attrW]),h=Number(el.dataset[attrH]);
    if(w>2&&h>2)return {width:w,height:h};
    const rect=el.getBoundingClientRect();
    w=rect.width;h=rect.height;
    if(!(w>2))w=160;
    if(!(h>2))h=40;
    el.dataset[attrW]=String(w);el.dataset[attrH]=String(h);
    return {width:w,height:h};
  }

  function applyTarget(key){
    const el=targetElement(key);if(!el)return;
    const value=state[key]||defaultValue();
    const x=Math.round(Number(value.x)||0),y=Math.round(Number(value.y)||0);
    const scale=Math.max(20,Math.min(300,Number(value.scale)||100));
    const width=Math.max(20,Math.min(300,Number(value.width)||100));
    const height=Math.max(20,Math.min(300,Number(value.height)||100));

    if(x||y)el.style.setProperty('translate',`${x}px ${y}px`,'important');
    else el.style.removeProperty('translate');
    if(scale!==100)el.style.setProperty('scale',String(scale/100),'important');
    else el.style.removeProperty('scale');
    el.style.setProperty('transform-origin','center center','important');

    if(width!==100||height!==100){
      const metrics=naturalMetrics(key,el);
      if(width!==100)el.style.setProperty('width',`${Math.max(2,Math.round(metrics.width*width/100))}px`,'important');
      else el.style.removeProperty('width');
      if(height!==100){
        el.style.setProperty('height',`${Math.max(2,Math.round(metrics.height*height/100))}px`,'important');
        el.style.setProperty('min-height','0px','important');
        el.style.setProperty('max-height','none','important');
      }else{
        el.style.removeProperty('height');el.style.removeProperty('min-height');el.style.removeProperty('max-height');
      }
    }else{
      el.style.removeProperty('width');el.style.removeProperty('height');el.style.removeProperty('min-height');el.style.removeProperty('max-height');
    }
  }

  function applyRuntimeLayout(){
    for(const key of Object.keys(TARGETS))applyTarget(key);
  }

  function applyAll(){
    applyRuntimeLayout();
    if(!DEV_TOOLS_ENABLED)return;
    refreshSelectionClasses();
    syncControls();
  }

  function refreshSelectionClasses(){
    document.body.classList.toggle('hv-forge-edit-active',panelOpen&&isForgeOpen());
    document.querySelectorAll('[data-hv-forge-tuner-name]').forEach(el=>{delete el.dataset.hvForgeTunerName;el.classList.remove('hv-forge-tuner-selected');});
    for(const key of Object.keys(TARGETS)){
      const el=targetElement(key);if(!el)continue;
      if(TARGETS[key].direct!==false)el.dataset.hvForgeTunerName=TARGETS[key].label;
      el.classList.toggle('hv-forge-tuner-selected',panelOpen&&key===activeKey);
    }
  }

  function keysForGroup(group){return Object.keys(TARGETS).filter(key=>TARGETS[key].group===group);}
  function refreshTargetSelect(){
    const select=$('hvForgeTargetSelect');if(!select)return;
    const keys=keysForGroup(activeGroup);
    select.innerHTML=keys.map(key=>`<option value="${key}">${TARGETS[key].label}</option>`).join('');
    if(!keys.includes(activeKey)&&keys.length)activeKey=keys[0];
    select.value=activeKey;
  }

  function selectKey(key){
    if(!TARGETS[key])return;
    activeKey=key;
    activeGroup=TARGETS[key].group;
    const group=$('hvForgeGroupSelect');if(group)group.value=activeGroup;
    refreshTargetSelect();
    const label=$('hvForgeSelectedName');if(label)label.textContent=TARGETS[activeKey].label;
    refreshSelectionClasses();
    syncControls();
  }

  function isVisible(el){
    if(!el||!el.getClientRects().length)return false;
    const cs=getComputedStyle(el);
    return cs.display!=='none'&&cs.visibility!=='hidden'&&Number(cs.opacity)!==0;
  }

  function findClickedTarget(node){
    if(!(node instanceof Element))return null;
    const candidates=Object.entries(TARGETS)
      .filter(([,cfg])=>cfg.direct!==false)
      .map(([key,cfg])=>({key,cfg,el:targetElement(key)}))
      .filter(item=>isVisible(item.el)&&item.el.contains(node));
    if(candidates.length){
      candidates.sort((a,b)=>{
        const ar=a.el.getBoundingClientRect(),br=b.el.getBoundingClientRect();
        const aa=Math.max(1,ar.width*ar.height),ba=Math.max(1,br.width*br.height);
        if(aa!==ba)return aa-ba;
        return b.el.compareDocumentPosition(a.el)&Node.DOCUMENT_POSITION_CONTAINED_BY?1:-1;
      });
      return candidates[0].key;
    }
    return null;
  }

  function chosenGroupContains(node){
    const cfg=TARGETS[activeKey];
    if(!cfg||cfg.direct!==false)return false;
    const el=targetElement(activeKey);
    return !!(el&&node instanceof Element&&el.contains(node));
  }

  function wireDirectSelection(){
    if(pointerSelectWired)return;pointerSelectWired=true;
    document.addEventListener('pointerdown',event=>{
      if(!panelOpen||!isForgeOpen()||event.target.closest('#hvForgeDirectTuner'))return;
      /* Si el usuario eligió deliberadamente un grupo en el selector, respétalo. De lo contrario,
         un clic siempre selecciona la pieza individual más pequeña bajo el puntero. */
      const key=chosenGroupContains(event.target)?activeKey:findClickedTarget(event.target);
      if(!key)return;
      if(key!==activeKey)selectKey(key);
      event.preventDefault();event.stopPropagation();
      const value=state[key]||defaultValue();
      drag={key,startX:event.clientX,startY:event.clientY,baseX:Number(value.x)||0,baseY:Number(value.y)||0};
      document.documentElement.classList.add('hv-forge-dragging');
    },true);
    document.addEventListener('pointermove',event=>{
      if(!drag)return;
      state[drag.key].x=Math.round(drag.baseX+event.clientX-drag.startX);
      state[drag.key].y=Math.round(drag.baseY+event.clientY-drag.startY);
      applyTarget(drag.key);syncControls();
      event.preventDefault();
    },true);
    const finish=()=>{if(!drag)return;saveState();drag=null;document.documentElement.classList.remove('hv-forge-dragging');};
    document.addEventListener('pointerup',finish,true);
    document.addEventListener('pointercancel',finish,true);
  }

  function setValue(field,value){
    if(!state[activeKey])return;
    const limits=field==='x'?[-1400,1400]:field==='y'?[-1000,1000]:[20,300];
    state[activeKey][field]=Math.max(limits[0],Math.min(limits[1],Number(value)||0));
    saveState();applyTarget(activeKey);syncControls();
  }
  function nudge(field,delta){setValue(field,(Number(state[activeKey]?.[field])||0)+delta);}

  function wireKeyboard(){
    if(keyboardWired)return;keyboardWired=true;
    document.addEventListener('keydown',event=>{
      if(!panelOpen||!isForgeOpen()||event.target.closest?.('#hvForgeDirectTuner input, #hvForgeDirectTuner select'))return;
      let handled=true;
      const step=event.shiftKey?10:2;
      if(event.key==='+'||event.key==='='||event.code==='NumpadAdd')nudge('scale',5);
      else if(event.key==='-'||event.key==='_'||event.code==='NumpadSubtract')nudge('scale',-5);
      else if(event.key==='ArrowLeft')nudge('x',-step);
      else if(event.key==='ArrowRight')nudge('x',step);
      else if(event.key==='ArrowUp')nudge('y',-step);
      else if(event.key==='ArrowDown')nudge('y',step);
      else handled=false;
      if(handled){event.preventDefault();event.stopPropagation();}
    },true);
  }

  function syncControls(){
    const value=state[activeKey];if(!value)return;
    for(const field of ['x','y','scale','width','height']){
      const input=document.querySelector(`#hvForgeDirectTuner [data-field="${field}"]`);
      const out=document.querySelector(`#hvForgeDirectTuner [data-out="${field}"]`);
      if(input)input.value=String(value[field]);
      if(out)out.textContent=(field==='x'||field==='y')?`${Math.round(value[field])} px`:`${Math.round(value[field])}%`;
    }
    const label=$('hvForgeSelectedName');if(label)label.textContent=TARGETS[activeKey]?.label||'';
  }

  function resetSelected(){
    const el=targetElement(activeKey);if(el){clearTunerStyles(el);delete el.dataset.hvTunerNaturalW;delete el.dataset.hvTunerNaturalH;}
    state[activeKey]=defaultValue();saveState();applyAll();
  }
  function resetAll(){
    for(const key of Object.keys(TARGETS)){
      const el=targetElement(key);if(el){clearTunerStyles(el);delete el.dataset.hvTunerNaturalW;delete el.dataset.hvTunerNaturalH;}
    }
    state=defaultState();saveState();applyAll();
  }
  function copyJson(button){
    const payload=JSON.stringify(state,null,2);
    const done=()=>{if(!button)return;const old=button.textContent;button.textContent='✓ COPIADO';setTimeout(()=>button.textContent=old,900);};
    if(navigator.clipboard?.writeText)navigator.clipboard.writeText(payload).then(done).catch(()=>window.prompt('Configuración de Forja:',payload));
    else window.prompt('Configuración de Forja:',payload);
  }

  function makePanelMovable(){
    const handle=$('hvForgeTunerMove');if(!handle||!shell)return;
    let d=null;
    try{const pos=JSON.parse(localStorage.getItem(PANEL_KEY)||'null');if(pos&&Number.isFinite(pos.left)&&Number.isFinite(pos.top)){shell.style.left=`${pos.left}px`;shell.style.top=`${pos.top}px`;shell.style.right='auto';}}
    catch(_){ }
    handle.addEventListener('pointerdown',event=>{d={sx:event.clientX,sy:event.clientY,left:shell.offsetLeft,top:shell.offsetTop};handle.setPointerCapture?.(event.pointerId);event.preventDefault();});
    handle.addEventListener('pointermove',event=>{if(!d)return;const left=Math.max(4,Math.min(innerWidth-shell.offsetWidth-4,d.left+event.clientX-d.sx));const top=Math.max(4,Math.min(innerHeight-44,d.top+event.clientY-d.sy));shell.style.left=`${left}px`;shell.style.top=`${top}px`;shell.style.right='auto';});
    const end=()=>{if(!d)return;try{localStorage.setItem(PANEL_KEY,JSON.stringify({left:shell.offsetLeft,top:shell.offsetTop}));}catch(_){ }d=null;};
    handle.addEventListener('pointerup',end);handle.addEventListener('pointercancel',end);
  }

  function createTuner(){
    if($('hvForgeDirectTuner'))return;
    shell=document.createElement('div');shell.id='hvForgeDirectTuner';shell.className='hv-forge-direct-tuner hidden';shell.dataset.hvDevTool='';
    shell.innerHTML=`
      <div class="hv-forge-tuner-bar"><button id="hvForgeTunerMove" type="button" title="Mover control">⠿</button><button id="hvForgeTunerToggle" type="button">EDITAR FORJA</button></div>
      <section id="hvForgeTunerBody" class="hv-forge-tuner-body hidden">
        <div class="hv-forge-tuner-scroll-wrap">
          <div id="hvForgeTunerScroll" class="hv-forge-tuner-scroll">
            <div class="hv-forge-tuner-top"><select id="hvForgeGroupSelect">${Object.entries(GROUPS).map(([key,g])=>`<option value="${key}">${g.label}</option>`).join('')}</select><button id="hvForgeTunerClose" type="button">×</button></div>
            <select id="hvForgeTargetSelect" class="hv-forge-target-select" aria-label="Elemento a editar"></select>
            <div id="hvForgeSelectedName" class="hv-forge-selected-name">Carta colección 1</div>
            <div class="hv-forge-editor-help"><b>Clic + arrastre</b>: mueve SOLO lo tocado · <b>+</b>/<b>−</b>: tamaño · Flechas: ajuste fino. Para mover un conjunto, elige explícitamente el elemento que dice <b>(grupo)</b>.</div>
            ${['x','y','scale','width','height'].map(field=>{
              const title={x:'Horizontal',y:'Vertical',scale:'Tamaño',width:'Ancho',height:'Altura'}[field];
              const min=(field==='x'?-1400:field==='y'?-1000:20),max=(field==='x'?1400:field==='y'?1000:300);
              return `<div class="hv-forge-control-row"><div class="hv-forge-control-label"><b>${title}</b><output data-out="${field}"></output></div><div class="hv-forge-control-line"><button type="button" data-nudge="${field}:-5">−</button><input data-field="${field}" type="range" min="${min}" max="${max}" step="1"><button type="button" data-nudge="${field}:5">+</button></div></div>`;
            }).join('')}
          </div>
          <div class="hv-forge-custom-scroll" aria-label="Desplazar controles">
            <button id="hvForgeScrollUp" type="button" aria-label="Subir">▲</button>
            <input id="hvForgeScrollRange" type="range" min="0" max="100" value="0" step="1" aria-label="Posición vertical del panel">
            <button id="hvForgeScrollDown" type="button" aria-label="Bajar">▼</button>
          </div>
        </div>
        <div class="hv-forge-tuner-actions"><button id="hvForgeResetSelected">Restaurar</button><button id="hvForgeResetAll">Restaurar todo</button><button id="hvForgeCopyJson">Copiar JSON</button><button id="hvForgeTunerDone">Listo</button></div>
      </section>`;
    document.body.appendChild(shell);
    body=$('hvForgeTunerBody');

    $('hvForgeTunerToggle').onclick=()=>{
      panelOpen=body.classList.contains('hidden');
      body.classList.toggle('hidden',!panelOpen);
      $('hvForgeTunerToggle').textContent=panelOpen?'EDITANDO':'EDITAR FORJA';
      refreshSelectionClasses();syncControls();
      requestAnimationFrame(()=>{const box=$('hvForgeTunerScroll'),range=$('hvForgeScrollRange');if(box&&range){const max=Math.max(0,box.scrollHeight-box.clientHeight);range.value=max?String(Math.round(box.scrollTop/max*100)):'0';range.disabled=max<=0;}});
    };
    const closeEditor=()=>{panelOpen=false;body.classList.add('hidden');$('hvForgeTunerToggle').textContent='EDITAR FORJA';refreshSelectionClasses();};
    $('hvForgeTunerClose').onclick=closeEditor;
    $('hvForgeTunerDone').onclick=closeEditor;

    $('hvForgeGroupSelect').value=activeGroup;
    $('hvForgeGroupSelect').onchange=event=>{activeGroup=event.currentTarget.value;const first=keysForGroup(activeGroup)[0];if(first)selectKey(first);};
    refreshTargetSelect();
    $('hvForgeTargetSelect').onchange=event=>selectKey(event.currentTarget.value);
    shell.querySelectorAll('[data-field]').forEach(input=>input.addEventListener('input',()=>setValue(input.dataset.field,input.value)));
    shell.querySelectorAll('[data-nudge]').forEach(button=>button.addEventListener('click',()=>{const [field,delta]=button.dataset.nudge.split(':');nudge(field,Number(delta));}));

    const scrollBox=$('hvForgeTunerScroll'),scrollRange=$('hvForgeScrollRange'),scrollUp=$('hvForgeScrollUp'),scrollDown=$('hvForgeScrollDown');
    const syncCustomScroll=()=>{if(!scrollBox||!scrollRange)return;const max=Math.max(0,scrollBox.scrollHeight-scrollBox.clientHeight);scrollRange.value=max?String(Math.round(scrollBox.scrollTop/max*100)):'0';scrollRange.disabled=max<=0;};
    const setCustomScrollFromRange=()=>{if(!scrollBox||!scrollRange)return;const max=Math.max(0,scrollBox.scrollHeight-scrollBox.clientHeight);scrollBox.scrollTop=max*(Number(scrollRange.value)||0)/100;};
    scrollRange?.addEventListener('input',setCustomScrollFromRange);
    scrollBox?.addEventListener('scroll',syncCustomScroll,{passive:true});
    scrollUp?.addEventListener('click',()=>scrollBox?.scrollBy({top:-90,behavior:'smooth'}));
    scrollDown?.addEventListener('click',()=>scrollBox?.scrollBy({top:90,behavior:'smooth'}));
    if(typeof ResizeObserver==='function'&&scrollBox)new ResizeObserver(syncCustomScroll).observe(scrollBox);
    requestAnimationFrame(syncCustomScroll);

    $('hvForgeResetSelected').onclick=resetSelected;
    $('hvForgeResetAll').onclick=resetAll;
    $('hvForgeCopyJson').onclick=event=>copyJson(event.currentTarget);
    makePanelMovable();wireDirectSelection();wireKeyboard();syncControls();
  }

  function scheduleReapply(){
    if(mutationScheduled)return;
    mutationScheduled=true;
    requestAnimationFrame(()=>{mutationScheduled=false;if(isForgeOpen())applyAll();});
  }

  function updateVisibility(){
    if(!shell)return;
    const open=isForgeOpen();shell.classList.toggle('hidden',!open);
    if(open){applyAll();refreshTargetSelect();}
    else{panelOpen=false;body?.classList.add('hidden');$('hvForgeTunerToggle')&&($('hvForgeTunerToggle').textContent='EDITAR FORJA');refreshSelectionClasses();}
  }

  // El layout aprobado forma parte del runtime. La UI de edición y sus observers/listeners, no.
  globalThis.__HALLVALLA_APPLY_FORGE_LAYOUT__=applyRuntimeLayout;

  if(!DEV_TOOLS_ENABLED){
    if(isForgeOpen())applyRuntimeLayout();
    let resizeQueued=false;
    window.addEventListener('resize',()=>{
      if(!isForgeOpen()||resizeQueued)return;
      resizeQueued=true;
      requestAnimationFrame(()=>{
        resizeQueued=false;
        for(const key of Object.keys(TARGETS)){const el=targetElement(key);if(el){delete el.dataset.hvTunerNaturalW;delete el.dataset.hvTunerNaturalH;}}
        applyRuntimeLayout();
      });
    },{passive:true});
    return;
  }

  createTuner();
  const forge=$('deckBuilderPanel');
  if(forge){
    new MutationObserver(updateVisibility).observe(forge,{attributes:true,attributeFilter:['class'],subtree:false});
    contentObserver=new MutationObserver(scheduleReapply);
    contentObserver.observe(forge,{childList:true,subtree:true});
  }
  window.addEventListener('resize',()=>{
    for(const key of Object.keys(TARGETS)){const el=targetElement(key);if(el){delete el.dataset.hvTunerNaturalW;delete el.dataset.hvTunerNaturalH;}}
    applyAll();
  });
  updateVisibility();
})();

(()=>{
  "use strict";
  if(globalThis.__HALLVALLA_DEV_TOOLS__!==true)return;

  const STORAGE_KEY="hallvalla_online_layout_tuner_v3";
  const PANEL_POS_KEY="hallvalla_online_layout_tuner_panel_v1";
  const TARGETS=[
    {key:"matchmaking.player.leader",label:"Matchmaking · Tu líder",selector:"#matchmakingPlayerLeader",stage:"#onlineMatchmakingView",refW:1672,refH:941},
    {key:"matchmaking.player.principal1",label:"Matchmaking · Tu principal 1",selector:"#matchmakingPlayerPrincipal1",stage:"#onlineMatchmakingView",refW:1672,refH:941},
    {key:"matchmaking.player.principal2",label:"Matchmaking · Tu principal 2",selector:"#matchmakingPlayerPrincipal2",stage:"#onlineMatchmakingView",refW:1672,refH:941},
    {key:"matchmaking.player.principal3",label:"Matchmaking · Tu principal 3",selector:"#matchmakingPlayerPrincipal3",stage:"#onlineMatchmakingView",refW:1672,refH:941},
    {key:"matchmaking.opponent.leader",label:"Matchmaking · Líder rival",selector:"#matchmakingOpponentLeader",stage:"#onlineMatchmakingView",refW:1672,refH:941},
    {key:"matchmaking.opponent.principal1",label:"Matchmaking · Principal rival 1",selector:"#matchmakingOpponentPrincipal1",stage:"#onlineMatchmakingView",refW:1672,refH:941},
    {key:"matchmaking.opponent.principal2",label:"Matchmaking · Principal rival 2",selector:"#matchmakingOpponentPrincipal2",stage:"#onlineMatchmakingView",refW:1672,refH:941},
    {key:"matchmaking.opponent.principal3",label:"Matchmaking · Principal rival 3",selector:"#matchmakingOpponentPrincipal3",stage:"#onlineMatchmakingView",refW:1672,refH:941},
    {key:"selector.matchmaking",label:"Competir en línea · Botón Matchmaking",selector:"#onlineModeMatchBtn",stage:"#onlineModeSelect",refW:1672,refH:941},
    {key:"selector.apuestas",label:"Competir en línea · Botón Apuestas",selector:"#onlineModeWagerBtn",stage:"#onlineModeSelect",refW:1672,refH:941},
    {key:"selector.volver",label:"Competir en línea · Botón Volver",selector:"#onlineModeBackBtn",stage:"#onlineModeSelect",refW:1672,refH:941},
    {key:"apuestas.crear",label:"Apuestas · Crear partida",selector:"#createBtn",stage:".online-modal-art",refW:1060,refH:737},
    {key:"apuestas.codigo",label:"Apuestas · Campo de código",selector:".visual-input-wrap",stage:".online-modal-art",refW:1060,refH:737},
    {key:"apuestas.unirse",label:"Apuestas · Unirse",selector:"#joinBtn",stage:".online-modal-art",refW:1060,refH:737},
    {key:"apuestas.volver",label:"Apuestas · Volver",selector:"#backMenuFromLobby",stage:".online-modal-art",refW:1060,refH:737}
  ];
  const byKey=new Map(TARGETS.map(t=>[t.key,t]));
  const defaults=()=>({x:0,y:0,scale:1});
  let config={version:1,units:"design-px",targets:{}};
  let selectedKey="matchmaking.player.principal1";
  let editing=false;
  let drag=null;
  let panelDrag=null;

  const $=(s,r=document)=>r.querySelector(s);
  const clamp=(v,min,max)=>Math.min(max,Math.max(min,v));
  const round=(v,d=2)=>Number(Number(v||0).toFixed(d));

  function readConfig(){
    try{
      const raw=localStorage.getItem(STORAGE_KEY);
      if(!raw)return;
      const parsed=JSON.parse(raw);
      if(parsed&&typeof parsed==="object"&&parsed.targets&&typeof parsed.targets==="object"){
        config={version:1,units:"design-px",targets:{...parsed.targets}};
      }
    }catch(error){console.warn("[HallValla][LayoutTuner] No se pudo leer el ajuste guardado.",error);}
  }
  function writeConfig(){
    try{localStorage.setItem(STORAGE_KEY,JSON.stringify(config));}catch(error){console.warn("[HallValla][LayoutTuner] No se pudo guardar el ajuste.",error);}
  }
  function stateFor(key){
    const raw=config.targets[key]||{};
    return {
      x:Number.isFinite(Number(raw.x))?Number(raw.x):0,
      y:Number.isFinite(Number(raw.y))?Number(raw.y):0,
      scale:Number.isFinite(Number(raw.scale))?Number(raw.scale):1
    };
  }
  function setState(key,next){
    const clean={
      x:round(clamp(Number(next.x)||0,-600,600),2),
      y:round(clamp(Number(next.y)||0,-600,600),2),
      scale:round(clamp(Number(next.scale)||1,.35,2),3)
    };
    config.targets[key]=clean;
    writeConfig();
    applyTarget(key);
    syncPanel();
    updateJsonPreview();
  }
  function nodeFor(target){return target?$(target.selector):null;}
  function stageFor(target){return target?$(target.stage):null;}
  function applyTarget(key){
    const target=byKey.get(key); if(!target)return;
    const node=nodeFor(target),stage=stageFor(target); if(!node||!stage)return;
    node.dataset.hvLayoutTarget=key;
    const s=stateFor(key);
    const rect=stage.getBoundingClientRect();
    if(rect.width>0&&rect.height>0){
      const pxX=s.x*(rect.width/target.refW);
      const pxY=s.y*(rect.height/target.refH);
      node.style.translate=`${pxX}px ${pxY}px`;
      node.style.scale=String(s.scale);
      node.style.transformOrigin="50% 50%";
    }
    node.classList.toggle("hv-layout-selected",editing&&key===selectedKey);
  }
  function applyAll(){for(const t of TARGETS)applyTarget(t.key);}
  function clearTargetStyle(key){
    const target=byKey.get(key),node=nodeFor(target); if(!node)return;
    node.style.removeProperty("translate");
    node.style.removeProperty("scale");
    node.style.removeProperty("transform-origin");
    node.classList.remove("hv-layout-selected");
  }
  function resetTarget(key){delete config.targets[key];writeConfig();clearTargetStyle(key);applyTarget(key);syncPanel();updateJsonPreview();}
  function resetAll(){
    for(const t of TARGETS)clearTargetStyle(t.key);
    config={version:1,units:"design-px",targets:{}};
    writeConfig();applyAll();syncPanel();updateJsonPreview();
  }
  function exportConfig(){
    const ordered={version:1,units:"design-px",targets:{}};
    for(const t of TARGETS){
      if(config.targets[t.key])ordered.targets[t.key]=stateFor(t.key);
    }
    return ordered;
  }

  function createUi(){
    const launcher=document.createElement("button");
    launcher.id="hvOnlineLayoutTunerLauncher";
    launcher.type="button";
    launcher.dataset.hvDevTool="";
    launcher.className="hv-online-layout-launcher hidden";
    launcher.textContent="AJUSTAR UI";
    launcher.addEventListener("click",()=>setEditing(!editing));
    document.body.appendChild(launcher);

    const panel=document.createElement("aside");
    panel.id="hvOnlineLayoutTuner";
    panel.dataset.hvDevTool="";
    panel.className="hv-online-layout-tuner hidden";
    panel.innerHTML=`
      <div class="hv-online-layout-head" id="hvLayoutDragHandle" title="Arrastra esta cabecera para mover el panel">
        <div><b>Calibrador PvP</b><small>Arrastra esta cabecera para mover el panel. Arrastra los elementos o usa los controles. Los cambios se guardan solo en este navegador.</small></div>
        <button id="hvLayoutClose" type="button" aria-label="Cerrar">×</button>
      </div>
      <label class="hv-online-layout-field"><span>Elemento</span><select id="hvLayoutTarget"></select></label>
      <label class="hv-online-layout-field"><span>X <output id="hvLayoutXOut">0</output></span><input id="hvLayoutX" type="range" min="-300" max="300" step="1" value="0"></label>
      <label class="hv-online-layout-field"><span>Y <output id="hvLayoutYOut">0</output></span><input id="hvLayoutY" type="range" min="-300" max="300" step="1" value="0"></label>
      <label class="hv-online-layout-field"><span>Tamaño <output id="hvLayoutScaleOut">100%</output></span><input id="hvLayoutScale" type="range" min="35" max="160" step="1" value="100"></label>
      <div class="hv-online-layout-actions">
        <button id="hvLayoutResetCurrent" type="button">Restablecer este</button>
        <button id="hvLayoutResetAll" type="button">Restablecer todo</button>
        <button id="hvLayoutCopy" type="button">Copiar JSON</button>
        <button id="hvLayoutDownload" type="button">Descargar JSON</button>
      </div>
      <textarea id="hvLayoutJson" readonly spellcheck="false" aria-label="JSON de posiciones"></textarea>
      <p id="hvLayoutStatus" class="hv-online-layout-status">Selecciona o arrastra un elemento.</p>
    `;
    document.body.appendChild(panel);

    const select=$("#hvLayoutTarget",panel);
    const groups=[
      ["MATCHMAKING",TARGETS.filter(t=>t.key.startsWith("matchmaking."))],
      ["COMPETIR EN LÍNEA",TARGETS.filter(t=>t.key.startsWith("selector."))],
      ["APUESTAS · CREAR / UNIRSE",TARGETS.filter(t=>t.key.startsWith("apuestas."))]
    ];
    for(const [label,items] of groups){
      const og=document.createElement("optgroup");og.label=label;
      for(const t of items){const o=document.createElement("option");o.value=t.key;o.textContent=t.label.replace(/^.*? · /,"");og.appendChild(o);}select.appendChild(og);
    }
    select.value=selectedKey;
    select.addEventListener("change",()=>{selectedKey=select.value;applyAll();syncPanel();});
    $("#hvLayoutClose",panel).addEventListener("click",()=>setEditing(false));
    $("#hvLayoutResetCurrent",panel).addEventListener("click",()=>resetTarget(selectedKey));
    $("#hvLayoutResetAll",panel).addEventListener("click",()=>{if(confirm("¿Restablecer todas las posiciones del calibrador PvP?"))resetAll();});
    $("#hvLayoutCopy",panel).addEventListener("click",copyJson);
    $("#hvLayoutDownload",panel).addEventListener("click",downloadJson);
    $("#hvLayoutX",panel).addEventListener("input",onControlInput);
    $("#hvLayoutY",panel).addEventListener("input",onControlInput);
    $("#hvLayoutScale",panel).addEventListener("input",onControlInput);
    const dragHandle=$("#hvLayoutDragHandle",panel);
    dragHandle?.addEventListener("pointerdown",onPanelPointerDown);
    dragHandle?.addEventListener("pointermove",onPanelPointerMove);
    dragHandle?.addEventListener("pointerup",onPanelPointerUp);
    dragHandle?.addEventListener("pointercancel",onPanelPointerUp);
    updateJsonPreview();syncPanel();
    requestAnimationFrame(restorePanelPosition);
  }

  function panel(){return $("#hvOnlineLayoutTuner");}
  function launcher(){return $("#hvOnlineLayoutTunerLauncher");}
  function status(msg){const n=$("#hvLayoutStatus");if(n)n.textContent=msg;}
  function readPanelPosition(){
    try{
      const raw=localStorage.getItem(PANEL_POS_KEY);
      if(!raw)return null;
      const parsed=JSON.parse(raw);
      if(Number.isFinite(Number(parsed?.left))&&Number.isFinite(Number(parsed?.top))){
        return {left:Number(parsed.left),top:Number(parsed.top)};
      }
    }catch(_){ }
    return null;
  }
  function writePanelPosition(left,top){
    try{localStorage.setItem(PANEL_POS_KEY,JSON.stringify({left:round(left,1),top:round(top,1)}));}catch(_){ }
  }
  function setPanelPosition(left,top,{save=false}={}){
    const p=panel();if(!p)return;
    const margin=6;
    const rect=p.getBoundingClientRect();
    const maxLeft=Math.max(margin,window.innerWidth-rect.width-margin);
    const maxTop=Math.max(margin,window.innerHeight-Math.min(rect.height,window.innerHeight-margin*2)-margin);
    const nextLeft=clamp(Number(left)||0,margin,maxLeft);
    const nextTop=clamp(Number(top)||0,margin,maxTop);
    p.style.left=`${nextLeft}px`;
    p.style.top=`${nextTop}px`;
    p.style.right="auto";
    p.style.bottom="auto";
    if(save)writePanelPosition(nextLeft,nextTop);
  }
  function restorePanelPosition(){
    const p=panel();if(!p)return;
    const saved=readPanelPosition();
    if(saved){setPanelPosition(saved.left,saved.top);return;}
    const rect=p.getBoundingClientRect();
    setPanelPosition(rect.left,rect.top);
  }
  function syncPanel(){
    const p=panel();if(!p)return;
    const s=stateFor(selectedKey);
    const x=$("#hvLayoutX",p),y=$("#hvLayoutY",p),sc=$("#hvLayoutScale",p);
    x.value=String(clamp(s.x,-300,300));y.value=String(clamp(s.y,-300,300));sc.value=String(clamp(s.scale*100,35,160));
    $("#hvLayoutXOut",p).textContent=`${round(s.x,1)} px`;
    $("#hvLayoutYOut",p).textContent=`${round(s.y,1)} px`;
    $("#hvLayoutScaleOut",p).textContent=`${Math.round(s.scale*100)}%`;
    const select=$("#hvLayoutTarget",p);if(select&&select.value!==selectedKey)select.value=selectedKey;
  }
  function updateJsonPreview(){const ta=$("#hvLayoutJson");if(ta)ta.value=JSON.stringify(exportConfig(),null,2);}
  function onControlInput(){
    const p=panel(),s=stateFor(selectedKey);if(!p)return;
    setState(selectedKey,{x:Number($("#hvLayoutX",p).value),y:Number($("#hvLayoutY",p).value),scale:Number($("#hvLayoutScale",p).value)/100});
  }
  async function copyJson(){
    const text=JSON.stringify(exportConfig(),null,2);
    try{await navigator.clipboard.writeText(text);status("JSON copiado. Pégamelo en el chat y lo dejo fijo en el código.");}
    catch(_){const ta=$("#hvLayoutJson");ta?.focus();ta?.select();status("No pude usar el portapapeles. El JSON quedó seleccionado para copiarlo manualmente.");}
  }
  function downloadJson(){
    const blob=new Blob([JSON.stringify(exportConfig(),null,2)],{type:"application/json"});
    const url=URL.createObjectURL(blob),a=document.createElement("a");
    a.href=url;a.download="hallvalla-online-layout.json";document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),500);
    status("JSON descargado.");
  }
  function setEditing(active){
    editing=!!active;
    document.documentElement.classList.toggle("hv-layout-editing",editing);
    panel()?.classList.toggle("hidden",!editing);
    launcher()?.classList.toggle("is-active",editing);
    applyAll();syncPanel();
    status(editing?"Modo edición activo: arrastra una unidad/botón o usa X, Y y Tamaño.":"Calibrador cerrado.");
  }

  function onPanelPointerDown(event){
    if(event.button!==0||event.target?.closest?.("button,input,select,textarea"))return;
    const p=panel();if(!p)return;
    const rect=p.getBoundingClientRect();
    panelDrag={pointerId:event.pointerId,startX:event.clientX,startY:event.clientY,startLeft:rect.left,startTop:rect.top,handle:event.currentTarget};
    p.classList.add("hv-layout-panel-dragging");
    try{event.currentTarget.setPointerCapture?.(event.pointerId);}catch(_){ }
    event.preventDefault();
  }
  function onPanelPointerMove(event){
    if(!panelDrag||event.pointerId!==panelDrag.pointerId)return;
    setPanelPosition(panelDrag.startLeft+(event.clientX-panelDrag.startX),panelDrag.startTop+(event.clientY-panelDrag.startY));
    event.preventDefault();
  }
  function onPanelPointerUp(event){
    if(!panelDrag||event.pointerId!==panelDrag.pointerId)return;
    const p=panel();
    try{panelDrag.handle?.releasePointerCapture?.(event.pointerId);}catch(_){ }
    if(p){
      p.classList.remove("hv-layout-panel-dragging");
      const rect=p.getBoundingClientRect();
      writePanelPosition(rect.left,rect.top);
    }
    panelDrag=null;
    event.preventDefault();
  }

  function targetFromEvent(event){
    const node=event.target?.closest?.("[data-hv-layout-target]");
    if(!node)return null;
    const key=node.dataset.hvLayoutTarget;
    return byKey.has(key)?{key,target:byKey.get(key),node}:null;
  }
  function onPointerDown(event){
    if(!editing||event.button!==0)return;
    const hit=targetFromEvent(event);if(!hit)return;
    const stage=stageFor(hit.target);if(!stage)return;
    const rect=stage.getBoundingClientRect();if(rect.width<=0||rect.height<=0)return;
    selectedKey=hit.key;syncPanel();applyAll();
    const s=stateFor(hit.key);
    drag={pointerId:event.pointerId,key:hit.key,target:hit.target,node:hit.node,startX:event.clientX,startY:event.clientY,startState:s,stageRect:rect,moved:false};
    try{hit.node.setPointerCapture?.(event.pointerId);}catch(_){ }
    event.preventDefault();event.stopPropagation();
  }
  function onPointerMove(event){
    if(!editing||!drag||event.pointerId!==drag.pointerId)return;
    const dx=event.clientX-drag.startX,dy=event.clientY-drag.startY;
    if(Math.abs(dx)+Math.abs(dy)>2)drag.moved=true;
    const designDx=dx*(drag.target.refW/drag.stageRect.width);
    const designDy=dy*(drag.target.refH/drag.stageRect.height);
    setState(drag.key,{x:drag.startState.x+designDx,y:drag.startState.y+designDy,scale:drag.startState.scale});
    event.preventDefault();
  }
  function onPointerUp(event){
    if(!drag||event.pointerId!==drag.pointerId)return;
    try{drag.node.releasePointerCapture?.(event.pointerId);}catch(_){ }
    status(drag.moved?"Posición actualizada. Usa Copiar JSON cuando termines.":"Elemento seleccionado.");
    drag=null;event.preventDefault();
  }
  function suppressGameplayClick(event){
    if(!editing)return;
    const hit=targetFromEvent(event);if(!hit)return;
    event.preventDefault();event.stopImmediatePropagation();
  }
  function updateLauncherVisibility(){
    const lobby=$("#onlineLobby"),btn=launcher();if(!btn)return;
    const visible=!!lobby&&!lobby.classList.contains("hidden");
    btn.classList.toggle("hidden",!visible);
    if(!visible&&editing)setEditing(false);
  }

  readConfig();
  createUi();
  applyAll();
  updateLauncherVisibility();

  document.addEventListener("pointerdown",onPointerDown,true);
  document.addEventListener("pointermove",onPointerMove,true);
  document.addEventListener("pointerup",onPointerUp,true);
  document.addEventListener("pointercancel",onPointerUp,true);
  document.addEventListener("click",suppressGameplayClick,true);
  window.addEventListener("resize",()=>requestAnimationFrame(()=>{
    applyAll();
    const p=panel();if(p&&!p.classList.contains("hidden")){const r=p.getBoundingClientRect();setPanelPosition(r.left,r.top);}
  }),{passive:true});

  const observer=new MutationObserver(()=>{requestAnimationFrame(()=>{applyAll();updateLauncherVisibility();});});
  for(const selector of ["#onlineLobby","#onlineModeSelect","#onlineMatchmakingView",".online-modal-art"]){const n=$(selector);if(n)observer.observe(n,{attributes:true,attributeFilter:["class","style"]});}
  if(globalThis.ResizeObserver){const ro=new ResizeObserver(()=>requestAnimationFrame(applyAll));for(const selector of ["#onlineModeSelect","#onlineMatchmakingView",".online-modal-art"]){const n=$(selector);if(n)ro.observe(n);}}

  globalThis.hallvallaOnlineLayoutTuner={
    get:()=>exportConfig(),
    reset:resetAll,
    apply:(json)=>{
      const parsed=typeof json==="string"?JSON.parse(json):json;
      if(!parsed||typeof parsed!=="object"||!parsed.targets)throw new TypeError("JSON de layout inválido.");
      config={version:1,units:"design-px",targets:{...parsed.targets}};writeConfig();applyAll();syncPanel();updateJsonPreview();return exportConfig();
    }
  };
})();

(()=>{
  "use strict";
  const DEV_TOOLS_ENABLED=globalThis.__HALLVALLA_DEV_TOOLS__===true;

  const STORAGE_KEY="hallvalla_battle_layout_tuner_v3_dev";
  const PANEL_POS_KEY="hallvalla_battle_layout_tuner_panel_v1";
  const REF_W=1366;
  const REF_H=768;
  const STAGE="#gameShell .battlefield";
  const T=(key,label,selector,group="GENERAL")=>({key,label,selector,group,stage:STAGE,refW:REF_W,refH:REF_H});
  const TARGETS=[
    T("battle.player.hud","Jugador · HUD completo","#hudP1","JUGADOR"),
    T("battle.player.name","Jugador · Nombre","#p1HudName","JUGADOR"),
    T("battle.player.turn","Jugador · Turno / estado","#p1Badge","JUGADOR"),
    T("battle.player.life","Jugador · Vida","#hudP1 .player-status-life","JUGADOR"),
    T("battle.player.hand","Jugador · Mano","#hudP1 .player-status-hand","JUGADOR"),
    T("battle.player.deck","Jugador · Mazo","#hudP1 .player-status-deck","JUGADOR"),
    T("battle.player.honor","Jugador · Honor · Marco","#turnHonorHud","JUGADOR"),
    T("battle.player.honorText","Jugador · Honor · Texto completo","#turnHonorHudText","JUGADOR"),
    T("battle.player.honorLabel","Jugador · Honor · Palabra HONOR","#turnHonorHud .turn-honor-label","JUGADOR"),
    T("battle.player.honorValue","Jugador · Honor · Valor","#turnHonorHudValue","JUGADOR"),

    T("battle.rival.hud","Rival · HUD completo","#hudP2","RIVAL"),
    T("battle.rival.name","Rival · Nombre","#p2HudName","RIVAL"),
    T("battle.rival.turn","Rival · Turno / estado","#p2Badge","RIVAL"),
    T("battle.rival.life","Rival · Vida","#hudP2 .player-status-life","RIVAL"),
    T("battle.rival.hand","Rival · Mano","#hudP2 .player-status-hand","RIVAL"),
    T("battle.rival.deck","Rival · Mazo","#hudP2 .player-status-deck","RIVAL"),
    T("battle.rival.honor","Rival · Honor · Marco","#rivalHonorHud","RIVAL"),
    T("battle.rival.honorText","Rival · Honor · Texto completo","#rivalHonorHudText","RIVAL"),
    T("battle.rival.honorLabel","Rival · Honor · Palabra HONOR","#rivalHonorHud .turn-honor-label","RIVAL"),
    T("battle.rival.honorValue","Rival · Honor · Valor","#rivalHonorHudValue","RIVAL"),

    T("battle.clock.turn","Reloj · Turno","#turnTimerHud","RELOJES / ESTADO"),
    T("battle.clock.player","Reloj · Jugador","#playerClock1","RELOJES / ESTADO"),
    T("battle.clock.rival","Reloj · Rival","#playerClock2","RELOJES / ESTADO"),
    T("battle.phase.banner","Fase · Banner","#phaseBanner","RELOJES / ESTADO"),
    T("battle.hint","Mensaje / ayuda","#hint","RELOJES / ESTADO"),

    T("battle.tool.settings","Herramientas · Configuración","#battleMenuBtn","HERRAMIENTAS"),
    T("battle.tool.actions","Herramientas · Acciones","#toggleActionsBtn","HERRAMIENTAS"),
    T("battle.tool.actionsMobile","Herramientas · Acciones móvil","#mobileToggleActionsBtn","HERRAMIENTAS"),

    T("battle.action.hand","Acción derecha · Mano","#handBtn","ACCIONES DERECHA"),
    T("battle.action.cancel","Acción derecha · Cancelar","#cancelBtn","ACCIONES DERECHA"),
    T("battle.action.next","Acción derecha · Siguiente fase","#endBtn","ACCIONES DERECHA"),

    T("battle.spellbook","Spellbook / Mano abierta","#handDrawer","SPELLBOOK / OTROS"),
    T("battle.history","Historial de eventos","#log","SPELLBOOK / OTROS"),
    T("battle.context","Menú contextual de unidad","#unitContextMenu","SPELLBOOK / OTROS")
  ];
  const byKey=new Map(TARGETS.map(t=>[t.key,t]));
  const $=(s,r=document)=>r.querySelector(s);
  const clamp=(v,min,max)=>Math.min(max,Math.max(min,v));
  const round=(v,d=2)=>Number(Number(v||0).toFixed(d));
  const PRESET_TARGETS={
    "battle.player.hud":{x:-3.03,y:-1.24,scale:1,visible:true},
    "battle.player.name":{x:46.43,y:2.47,scale:1,visible:true},
    "battle.player.turn":{x:-43.41,y:3.71,scale:1,visible:true},
    "battle.player.life":{x:3.03,y:-14.84,scale:.9,visible:true},
    "battle.player.hand":{x:0,y:-16.07,scale:.89,visible:true},
    "battle.player.deck":{x:2.02,y:-16.07,scale:.9,visible:true},
    "battle.player.honor":{x:188,y:28,scale:.92,visible:true},
    "battle.player.honorText":{x:0,y:6,scale:.72,visible:true},
    "battle.rival.turn":{x:6.06,y:2.47,scale:.98,visible:true},
    "battle.rival.life":{x:2.02,y:-17.31,scale:.9,visible:true},
    "battle.rival.hand":{x:3.03,y:-16.07,scale:.89,visible:true},
    "battle.rival.deck":{x:4.04,y:-14.84,scale:.89,visible:true},
    "battle.rival.honor":{x:-211,y:18,scale:.72,visible:true},
    "battle.rival.honorText":{x:0,y:6,scale:.89,visible:true},
    "battle.clock.turn":{x:93.88,y:-223.77,scale:1,visible:true},
    "battle.tool.settings":{x:-27.24,y:107.72,scale:.8,visible:true},
    "battle.tool.actions":{x:9.42,y:36.32,scale:.65,visible:true},
    "battle.action.hand":{x:-13.13,y:-2.47,scale:.8,visible:true},
    "battle.action.cancel":{x:0,y:0,scale:.8,visible:true},
    "battle.action.next":{x:-296.78,y:160.72,scale:.8,visible:true},
    "battle.spellbook":{x:0,y:0,scale:.8,visible:true},
    "battle.history":{x:11,y:3,scale:.7,visible:true},
    "battle.context":{x:0,y:0,scale:.8,visible:true}
  };  let config={version:1,units:"design-px",targets:{...PRESET_TARGETS}};
  let selectedKey=TARGETS[0].key;
  let editing=false;
  let drag=null;
  let panelDrag=null;
  let panelCollapsed=false;

  function defaultState(){return {x:0,y:0,scale:1,visible:true};}
  function readConfig(){
    try{
      const raw=localStorage.getItem(STORAGE_KEY);if(!raw)return;
      const parsed=JSON.parse(raw);
      if(parsed&&typeof parsed==="object"&&parsed.targets&&typeof parsed.targets==="object")config={version:1,units:"design-px",targets:{...parsed.targets}};
    }catch(error){console.warn("[HallValla][BattleLayoutTuner] No se pudo leer el ajuste.",error);}
  }
  function writeConfig(){try{localStorage.setItem(STORAGE_KEY,JSON.stringify(config));}catch(error){console.warn("[HallValla][BattleLayoutTuner] No se pudo guardar.",error);}}
  function stateFor(key){
    const raw=config.targets[key]||{};
    return {
      x:Number.isFinite(Number(raw.x))?Number(raw.x):0,
      y:Number.isFinite(Number(raw.y))?Number(raw.y):0,
      scale:Number.isFinite(Number(raw.scale))?Number(raw.scale):1,
      visible:raw.visible!==false
    };
  }
  function nodeFor(target){return target?$(target.selector):null;}
  function stageFor(target){return target?$(target.stage):null;}
  function setState(key,next){
    const prev=stateFor(key);
    const clean={
      x:round(clamp(Number(next.x ?? prev.x)||0,-900,900),2),
      y:round(clamp(Number(next.y ?? prev.y)||0,-900,900),2),
      scale:round(clamp(Number(next.scale ?? prev.scale)||1,.25,2.2),3),
      visible:next.visible!==undefined?!!next.visible:prev.visible
    };
    config.targets[key]=clean;writeConfig();applyTarget(key);syncPanel();updateJsonPreview();
  }
  function applyTarget(key,sharedRect=null){
    const target=byKey.get(key);if(!target)return;
    const node=nodeFor(target),stage=stageFor(target);if(!node||!stage)return;
    node.dataset.hvBattleLayoutTarget=key;
    const s=stateFor(key),rect=sharedRect||stage.getBoundingClientRect();
    if(rect.width>0&&rect.height>0){
      const pxX=s.x*(rect.width/target.refW),pxY=s.y*(rect.height/target.refH);
      node.style.translate=`${pxX}px ${pxY}px`;
      node.style.scale=String(s.scale);
      node.style.transformOrigin="50% 50%";
    }
    if(!s.visible){
      node.style.visibility=editing?"visible":"hidden";
      node.style.opacity=editing?".18":"0";
      node.style.pointerEvents=editing?"auto":"none";
    }else{
      node.style.removeProperty("visibility");
      node.style.removeProperty("opacity");
      node.style.removeProperty("pointer-events");
    }
    node.classList.toggle("hv-battle-layout-selected",editing&&key===selectedKey);
    node.classList.toggle("hv-battle-layout-hidden-preview",editing&&!s.visible);
  }
  function applyAll(){
    const stage=$(STAGE);
    if(!stage)return;
    const rect=stage.getBoundingClientRect();
    if(rect.width<=0||rect.height<=0)return;
    for(const t of TARGETS)applyTarget(t.key,rect);
  }
  function clearTargetStyle(key){
    const target=byKey.get(key),node=nodeFor(target);if(!node)return;
    for(const p of ["translate","scale","transform-origin","visibility","opacity","pointer-events"])node.style.removeProperty(p);
    node.classList.remove("hv-battle-layout-selected","hv-battle-layout-hidden-preview");
    delete node.dataset.hvBattleLayoutTarget;
  }
  function resetTarget(key){delete config.targets[key];writeConfig();clearTargetStyle(key);applyTarget(key);syncPanel();updateJsonPreview();}
  function resetAll(){for(const t of TARGETS)clearTargetStyle(t.key);config={version:1,units:"design-px",targets:{}};writeConfig();applyAll();syncPanel();updateJsonPreview();}
  function exportConfig(){
    const ordered={version:1,units:"design-px",targets:{}};
    for(const t of TARGETS)if(config.targets[t.key])ordered.targets[t.key]=stateFor(t.key);
    return ordered;
  }

  function createUi(){
    const launcher=document.createElement("button");
    launcher.id="hvBattleLayoutTunerLauncher";launcher.type="button";launcher.dataset.hvDevTool="";launcher.className="hv-battle-layout-launcher hidden";launcher.textContent="AJUSTAR COMBATE";
    launcher.addEventListener("click",()=>setEditing(!editing));document.body.appendChild(launcher);

    const panel=document.createElement("aside");
    panel.id="hvBattleLayoutTuner";panel.dataset.hvDevTool="";panel.className="hv-battle-layout-tuner hidden";
    panel.innerHTML=`
      <div class="hv-battle-layout-head" id="hvBattleLayoutDragHandle" title="Arrastra esta cabecera para mover el panel">
        <div><b>Calibrador de combate</b><small>Mueve cada parte por separado. Puedes ocultarla, cambiar tamaño y luego copiarme el JSON.</small></div>
        <div class="hv-battle-layout-head-actions"><button id="hvBattleLayoutCollapse" type="button" aria-label="Minimizar">—</button><button id="hvBattleLayoutClose" type="button" aria-label="Cerrar">×</button></div>
      </div>
      <div class="hv-battle-layout-body">
        <label class="hv-battle-layout-field"><span>Elemento</span><select id="hvBattleLayoutTarget"></select></label>
        <label class="hv-battle-layout-field"><span>X <output id="hvBattleLayoutXOut">0 px</output></span><input id="hvBattleLayoutX" type="range" min="-500" max="500" step="1" value="0"></label>
        <label class="hv-battle-layout-field"><span>Y <output id="hvBattleLayoutYOut">0 px</output></span><input id="hvBattleLayoutY" type="range" min="-500" max="500" step="1" value="0"></label>
        <label class="hv-battle-layout-field"><span>Tamaño <output id="hvBattleLayoutScaleOut">100%</output></span><input id="hvBattleLayoutScale" type="range" min="25" max="200" step="1" value="100"></label>
        <label class="hv-battle-layout-visible"><input id="hvBattleLayoutVisible" type="checkbox" checked><span>Mostrar este elemento</span></label>
        <div class="hv-battle-layout-actions">
          <button id="hvBattleLayoutResetCurrent" type="button">Restablecer este</button>
          <button id="hvBattleLayoutResetAll" type="button">Restablecer todo</button>
          <button id="hvBattleLayoutCopy" type="button">Copiar JSON</button>
          <button id="hvBattleLayoutDownload" type="button">Descargar JSON</button>
        </div>
        <textarea id="hvBattleLayoutJson" readonly spellcheck="false" aria-label="JSON de la interfaz de combate"></textarea>
        <p id="hvBattleLayoutStatus" class="hv-battle-layout-status">Selecciona un elemento o arrástralo directamente.</p>
      </div>`;
    document.body.appendChild(panel);

    const select=$("#hvBattleLayoutTarget",panel);
    const groups=[...new Set(TARGETS.map(t=>t.group))];
    for(const group of groups){
      const og=document.createElement("optgroup");og.label=group;
      for(const t of TARGETS.filter(x=>x.group===group)){const o=document.createElement("option");o.value=t.key;o.textContent=t.label;o.append();og.appendChild(o);}select.appendChild(og);
    }
    select.value=selectedKey;
    select.addEventListener("change",()=>{selectedKey=select.value;applyAll();syncPanel();status(`Seleccionado: ${byKey.get(selectedKey)?.label||selectedKey}.`);});
    $("#hvBattleLayoutClose",panel).addEventListener("click",()=>setEditing(false));
    $("#hvBattleLayoutCollapse",panel).addEventListener("click",toggleCollapse);
    $("#hvBattleLayoutResetCurrent",panel).addEventListener("click",()=>resetTarget(selectedKey));
    $("#hvBattleLayoutResetAll",panel).addEventListener("click",()=>{if(confirm("¿Restablecer toda la interfaz de combate del calibrador?"))resetAll();});
    $("#hvBattleLayoutCopy",panel).addEventListener("click",copyJson);
    $("#hvBattleLayoutDownload",panel).addEventListener("click",downloadJson);
    $("#hvBattleLayoutX",panel).addEventListener("input",onControlInput);
    $("#hvBattleLayoutY",panel).addEventListener("input",onControlInput);
    $("#hvBattleLayoutScale",panel).addEventListener("input",onControlInput);
    $("#hvBattleLayoutVisible",panel).addEventListener("change",onControlInput);
    const handle=$("#hvBattleLayoutDragHandle",panel);
    handle.addEventListener("pointerdown",onPanelPointerDown);handle.addEventListener("pointermove",onPanelPointerMove);handle.addEventListener("pointerup",onPanelPointerUp);handle.addEventListener("pointercancel",onPanelPointerUp);
    updateJsonPreview();syncPanel();requestAnimationFrame(restorePanelPosition);
  }
  function panel(){return $("#hvBattleLayoutTuner");}
  function launcher(){return $("#hvBattleLayoutTunerLauncher");}
  function status(msg){const n=$("#hvBattleLayoutStatus");if(n)n.textContent=msg;}
  function toggleCollapse(){panelCollapsed=!panelCollapsed;panel()?.classList.toggle("is-collapsed",panelCollapsed);const b=$("#hvBattleLayoutCollapse");if(b)b.textContent=panelCollapsed?"+":"—";}
  function readPanelPosition(){try{const raw=localStorage.getItem(PANEL_POS_KEY);if(!raw)return null;const p=JSON.parse(raw);if(Number.isFinite(Number(p?.left))&&Number.isFinite(Number(p?.top)))return {left:Number(p.left),top:Number(p.top)};}catch(_){ }return null;}
  function writePanelPosition(left,top){try{localStorage.setItem(PANEL_POS_KEY,JSON.stringify({left:round(left,1),top:round(top,1)}));}catch(_){ }}
  function setPanelPosition(left,top,{save=false}={}){const p=panel();if(!p)return;const margin=6,rect=p.getBoundingClientRect(),maxLeft=Math.max(margin,window.innerWidth-rect.width-margin),maxTop=Math.max(margin,window.innerHeight-Math.min(rect.height,window.innerHeight-margin*2)-margin);const l=clamp(Number(left)||0,margin,maxLeft),t=clamp(Number(top)||0,margin,maxTop);p.style.left=`${l}px`;p.style.top=`${t}px`;p.style.right="auto";p.style.bottom="auto";if(save)writePanelPosition(l,t);}
  function restorePanelPosition(){const p=panel();if(!p)return;const saved=readPanelPosition();if(saved){setPanelPosition(saved.left,saved.top);return;}const r=p.getBoundingClientRect();setPanelPosition(r.left,r.top);}
  function syncPanel(){const p=panel();if(!p)return;const s=stateFor(selectedKey);const x=$("#hvBattleLayoutX",p),y=$("#hvBattleLayoutY",p),sc=$("#hvBattleLayoutScale",p),vis=$("#hvBattleLayoutVisible",p);x.value=String(clamp(s.x,-500,500));y.value=String(clamp(s.y,-500,500));sc.value=String(clamp(s.scale*100,25,200));vis.checked=s.visible;$("#hvBattleLayoutXOut",p).textContent=`${round(s.x,1)} px`;$("#hvBattleLayoutYOut",p).textContent=`${round(s.y,1)} px`;$("#hvBattleLayoutScaleOut",p).textContent=`${Math.round(s.scale*100)}%`;const select=$("#hvBattleLayoutTarget",p);if(select&&select.value!==selectedKey)select.value=selectedKey;}
  function updateJsonPreview(){const ta=$("#hvBattleLayoutJson");if(ta)ta.value=JSON.stringify(exportConfig(),null,2);}
  function onControlInput(){const p=panel();if(!p)return;setState(selectedKey,{x:Number($("#hvBattleLayoutX",p).value),y:Number($("#hvBattleLayoutY",p).value),scale:Number($("#hvBattleLayoutScale",p).value)/100,visible:$("#hvBattleLayoutVisible",p).checked});}
  async function copyJson(){const text=JSON.stringify(exportConfig(),null,2);try{await navigator.clipboard.writeText(text);status("JSON copiado. Pégamelo y dejo las posiciones fijas en el código.");}catch(_){const ta=$("#hvBattleLayoutJson");ta?.focus();ta?.select();status("El JSON quedó seleccionado para copiarlo manualmente.");}}
  function downloadJson(){const blob=new Blob([JSON.stringify(exportConfig(),null,2)],{type:"application/json"}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download="hallvalla-battle-ui-layout.json";document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),500);status("JSON descargado.");}
  function setEditing(active){editing=!!active;document.documentElement.classList.toggle("hv-battle-layout-editing",editing);panel()?.classList.toggle("hidden",!editing);launcher()?.classList.toggle("is-active",editing);applyAll();syncPanel();if(editing)requestAnimationFrame(restorePanelPosition);status(editing?"Edición activa: arrastra un elemento o usa X, Y, Tamaño y Mostrar.":"Calibrador cerrado.");}

  function onPanelPointerDown(event){if(event.button!==0||event.target?.closest?.("button,input,select,textarea"))return;const p=panel();if(!p)return;const r=p.getBoundingClientRect();panelDrag={pointerId:event.pointerId,startX:event.clientX,startY:event.clientY,startLeft:r.left,startTop:r.top,handle:event.currentTarget};p.classList.add("hv-battle-layout-panel-dragging");try{event.currentTarget.setPointerCapture?.(event.pointerId);}catch(_){ }event.preventDefault();}
  function onPanelPointerMove(event){if(!panelDrag||event.pointerId!==panelDrag.pointerId)return;setPanelPosition(panelDrag.startLeft+(event.clientX-panelDrag.startX),panelDrag.startTop+(event.clientY-panelDrag.startY));event.preventDefault();}
  function onPanelPointerUp(event){if(!panelDrag||event.pointerId!==panelDrag.pointerId)return;const p=panel();try{panelDrag.handle?.releasePointerCapture?.(event.pointerId);}catch(_){ }if(p){p.classList.remove("hv-battle-layout-panel-dragging");const r=p.getBoundingClientRect();writePanelPosition(r.left,r.top);}panelDrag=null;event.preventDefault();}

  function targetFromEvent(event){
    let node=event.target instanceof Element?event.target:null;
    while(node){
      const key=node.dataset?.hvBattleLayoutTarget;
      if(key&&byKey.has(key))return {key,target:byKey.get(key),node};
      node=node.parentElement;
    }
    return null;
  }
  function onPointerDown(event){if(!editing||event.button!==0)return;const hit=targetFromEvent(event);if(!hit)return;const stage=stageFor(hit.target);if(!stage)return;const rect=stage.getBoundingClientRect();if(rect.width<=0||rect.height<=0)return;selectedKey=hit.key;syncPanel();applyAll();const s=stateFor(hit.key);drag={pointerId:event.pointerId,key:hit.key,target:hit.target,node:hit.node,startX:event.clientX,startY:event.clientY,startState:s,stageRect:rect,moved:false};try{hit.node.setPointerCapture?.(event.pointerId);}catch(_){ }event.preventDefault();event.stopPropagation();}
  function onPointerMove(event){if(!editing||!drag||event.pointerId!==drag.pointerId)return;const dx=event.clientX-drag.startX,dy=event.clientY-drag.startY;if(Math.abs(dx)+Math.abs(dy)>2)drag.moved=true;const designDx=dx*(drag.target.refW/drag.stageRect.width),designDy=dy*(drag.target.refH/drag.stageRect.height);setState(drag.key,{x:drag.startState.x+designDx,y:drag.startState.y+designDy,scale:drag.startState.scale,visible:drag.startState.visible});event.preventDefault();}
  function onPointerUp(event){if(!drag||event.pointerId!==drag.pointerId)return;try{drag.node.releasePointerCapture?.(event.pointerId);}catch(_){ }status(drag.moved?"Posición actualizada. Cuando termines, copia el JSON.":"Elemento seleccionado.");drag=null;event.preventDefault();}
  function suppressGameplayClick(event){if(!editing)return;const hit=targetFromEvent(event);if(!hit)return;event.preventDefault();event.stopImmediatePropagation();}
  function updateLauncherVisibility(){const shell=$("#gameShell"),btn=launcher();if(!btn)return;const visible=!!shell&&!shell.classList.contains("hidden");btn.classList.toggle("hidden",!visible);if(!visible&&editing)setEditing(false);}

  // Layout aprobado: producción NO lee localStorage del calibrador.
  // Se aplica solo en eventos estructurales (entrada/salida de combate y resize).
  // No observamos todo el body: eso provocaba recalculo de layout con cada cambio
  // de clase durante combate y podia introducir lag, especialmente contra IA.
  if(!DEV_TOOLS_ENABLED){
    config={version:1,units:"design-px",targets:{...PRESET_TARGETS}};
    const reapplyStable=()=>{
      requestAnimationFrame(()=>{
        applyAll();
        requestAnimationFrame(applyAll);
      });
      setTimeout(applyAll,90);
      setTimeout(applyAll,260);
    };
    reapplyStable();
    window.addEventListener("resize",reapplyStable,{passive:true});
    const shell=$("#gameShell");
    if(shell){
      const shellObserver=new MutationObserver(reapplyStable);
      shellObserver.observe(shell,{attributes:true,attributeFilter:["class"]});
    }
    const battlefield=$(STAGE);
    if(globalThis.ResizeObserver&&battlefield){
      let resizeQueued=false;
      const ro=new ResizeObserver(()=>{
        if(resizeQueued)return;
        resizeQueued=true;
        requestAnimationFrame(()=>{resizeQueued=false;applyAll();});
      });
      ro.observe(battlefield);
    }
    globalThis.hallvallaBattleLayout={get:()=>exportConfig(),apply:applyAll};
    return;
  }

  readConfig();createUi();applyAll();updateLauncherVisibility();
  document.addEventListener("pointerdown",onPointerDown,true);document.addEventListener("pointermove",onPointerMove,true);document.addEventListener("pointerup",onPointerUp,true);document.addEventListener("pointercancel",onPointerUp,true);document.addEventListener("click",suppressGameplayClick,true);
  window.addEventListener("resize",()=>requestAnimationFrame(()=>{applyAll();const p=panel();if(p&&!p.classList.contains("hidden")){const r=p.getBoundingClientRect();setPanelPosition(r.left,r.top);}}),{passive:true});
  const observer=new MutationObserver(()=>requestAnimationFrame(()=>{applyAll();updateLauncherVisibility();}));const shell=$("#gameShell");if(shell)observer.observe(shell,{attributes:true,attributeFilter:["class","style"]});
  const battlefield=$(STAGE);if(globalThis.ResizeObserver&&battlefield){const ro=new ResizeObserver(()=>requestAnimationFrame(applyAll));ro.observe(battlefield);}
  globalThis.hallvallaBattleLayoutTuner={get:()=>exportConfig(),reset:resetAll,apply:(json)=>{const parsed=typeof json==="string"?JSON.parse(json):json;if(!parsed||typeof parsed!=="object"||!parsed.targets)throw new TypeError("JSON de layout inválido.");config={version:1,units:"design-px",targets:{...parsed.targets}};writeConfig();applyAll();syncPanel();updateJsonPreview();return exportConfig();}};
})();

/* HallValla DEVHUB1 · centro único de calibradores internos */
(()=>{
  "use strict";
  if(globalThis.__HALLVALLA_DEV_TOOLS__!==true)return;

  const $=id=>document.getElementById(id);
  const nextFrame=()=>new Promise(resolve=>requestAnimationFrame(()=>resolve()));
  const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
  const isShown=node=>{
    if(!node||node.classList?.contains("hidden"))return false;
    try{
      const style=getComputedStyle(node);
      return style.display!=="none"&&style.visibility!=="hidden";
    }catch(_){return true;}
  };
  const setStatus=message=>{const node=$("hvDevToolsHubStatus");if(node)node.textContent=String(message||"");};

  function clickControl(id,label){
    const node=$(id);
    if(!node){setStatus(`${label}: control no disponible todavía.`);return false;}
    node.click();
    setStatus(`${label}: control abierto.`);
    return true;
  }
  function battleReady(){return isShown($("gameShell"));}
  function openBattleControl(id,label){
    if(!battleReady()){setStatus(`${label}: entra primero a un duelo.`);return;}
    clickControl(id,label);
  }
  function openDetControl(){
    const det=$("cardInspectModal");
    if(!det||det.classList.contains("hidden")){setStatus("DET: abre primero el detalle de una carta o unidad.");return;}
    clickControl("hvDetLayoutTunerToggle","DET");
  }
  function openAdventureMapControl(){
    if(!isShown($("adventureMapStage"))){setStatus("Mapa de Aventura: abre primero el mapa de Aventura.");return;}
    clickControl("openAdventureMapNodeTunerBtn","Burbujas del mapa");
  }
  function openOnlineControl(){
    const launcher=$("hvOnlineLayoutTunerLauncher");
    if(!launcher||launcher.classList.contains("hidden")){setStatus("PvP / Online: abre primero Competir en línea o una pantalla PvP compatible.");return;}
    launcher.click();
    setStatus("PvP / Online: calibrador abierto.");
  }
  function openBattleLayoutControl(){
    const launcher=$("hvBattleLayoutTunerLauncher");
    if(!battleReady()||!launcher||launcher.classList.contains("hidden")){setStatus("Combate completo: entra primero a un duelo.");return;}
    launcher.click();
    setStatus("Combate completo: calibrador abierto.");
  }

  function bindForgeShell(shell,body){
    if(!shell||!body||body.dataset.hvHubObserved==="1")return;
    body.dataset.hvHubObserved="1";
    const sync=()=>shell.classList.toggle("hv-dev-hub-tool-open",!body.classList.contains("hidden"));
    new MutationObserver(sync).observe(body,{attributes:true,attributeFilter:["class"]});
    sync();
  }
  async function openForgeControl(){
    setStatus("Creación de mazo: preparando editor…");
    try{
      if(typeof globalThis.hvEnsureFeature==="function")await globalThis.hvEnsureFeature("forge-layout");
      let panel=$("deckBuilderPanel");
      if(panel?.classList.contains("hidden")){
        if(isShown($("mainMenu"))&&$("collectionBtn")){
          $("collectionBtn").click();
          await nextFrame();await nextFrame();await delay(40);
          panel=$("deckBuilderPanel");
        }else{
          setStatus("Creación de mazo: vuelve al Home y abre Colección; después toca este control.");
          return;
        }
      }
      if(typeof globalThis.hvEnsureFeature==="function")await globalThis.hvEnsureFeature("forge-layout");
      await nextFrame();await nextFrame();
      const shell=$("hvForgeDirectTuner"),body=$("hvForgeTunerBody"),toggle=$("hvForgeTunerToggle");
      if(!shell||!body||!toggle){setStatus("Creación de mazo: el editor todavía no está disponible.");return;}
      bindForgeShell(shell,body);
      shell.classList.add("hv-dev-hub-tool-open");
      if(body.classList.contains("hidden"))toggle.click();
      setStatus("Creación de mazo: editor abierto.");
    }catch(error){
      console.error("[HallValla][DEVHUB] No se pudo abrir el editor de mazo:",error);
      setStatus(`Creación de mazo: ${error?.message||"no se pudo abrir"}.`);
    }
  }

  function closeKnownEditors(){
    const closers=[
      "closeActionsHudTunerBtn",
      "closeFieldStatBadgesTunerBtn",
      "closeBattleVisualSizeTunerBtn",
      "closeFieldBoardTunerBtn",
      "closeBattleClockTunerBtn",
      "closeFieldFigureEditorBtn",
      "closeAdventureMapNodeTunerBtn",
      "hvDetLayoutTunerClose",
      "hvBattleLayoutClose",
      "hvLayoutClose",
      "hvForgeTunerDone"
    ];
    for(const id of closers){const node=$(id);if(node)node.click();}
    setStatus("Paneles de ajuste cerrados.");
  }

  const GROUPS=[
    {title:"COMBATE",items:[
      {label:"Interfaz completa",action:openBattleLayoutControl},
      {label:"HUD de acciones",action:()=>openBattleControl("openActionsHudTunerBattleBtn","HUD de acciones")},
      {label:"Iconos / aros / números",action:()=>openBattleControl("openFieldStatBadgesTunerBattleBtn","Iconos / aros / números")},
      {label:"Líderes + mano",action:()=>openBattleControl("openBattleVisualSizeTunerBtn","Líderes + mano")},
      {label:"Campo / cuadrícula",action:()=>openBattleControl("openFieldBoardTunerBattleBtn","Campo / cuadrícula")},
      {label:"Relojes",action:()=>openBattleControl("openBattleClockTunerBtn","Relojes")},
      {label:"Figuras 3D",action:()=>openBattleControl("openFieldFigureEditorBtn","Figuras 3D")},
      {label:"DET",action:openDetControl}
    ]},
    {title:"PANTALLAS",items:[
      {label:"Creación de mazo",action:openForgeControl},
      {label:"PvP / Online",action:openOnlineControl},
      {label:"Mapa de Aventura",action:openAdventureMapControl}
    ]}
  ];

  function buildButtons(){
    return GROUPS.map(group=>`<section class="hv-dev-hub-group"><h4>${group.title}</h4><div class="hv-dev-hub-grid">${group.items.map((item,index)=>`<button type="button" data-hv-dev-group="${group.title}" data-hv-dev-index="${index}">${item.label}</button>`).join("")}</div></section>`).join("");
  }
  function wireButtons(hub){
    hub.querySelectorAll("[data-hv-dev-group][data-hv-dev-index]").forEach(button=>{
      button.addEventListener("click",()=>{
        const group=GROUPS.find(item=>item.title===button.dataset.hvDevGroup);
        const item=group?.items?.[Number(button.dataset.hvDevIndex)];
        if(item?.action)void item.action();
      });
    });
  }
  function adoptInlineDevTools(){
    const host=$("hvDevHubInlineTools");
    if(!host)return;
    const promo=document.querySelector(".profile-promo-box[data-hv-dev-tool]");
    if(promo&&!host.contains(promo)){
      promo.classList.add("hv-dev-hub-inline-tool");
      host.appendChild(promo);
    }
  }
  function bindDeferredForgeObserver(){
    const observer=new MutationObserver(()=>{
      const shell=$("hvForgeDirectTuner"),body=$("hvForgeTunerBody");
      if(shell&&body)bindForgeShell(shell,body);
    });
    observer.observe(document.body,{childList:true,subtree:false});
  }
  function createHub(){
    if($("hvDevToolsHub"))return;
    const launcher=document.createElement("button");
    launcher.id="hvDevToolsHubLauncher";
    launcher.type="button";
    launcher.dataset.hvDevTool="";
    launcher.setAttribute("aria-expanded","false");
    launcher.textContent="HV DEV";

    const hub=document.createElement("aside");
    hub.id="hvDevToolsHub";
    hub.dataset.hvDevTool="";
    hub.className="hv-dev-tools-hub hidden";
    hub.setAttribute("aria-label","Centro de controles de desarrollo de HallValla");
    hub.innerHTML=`
      <header class="hv-dev-hub-head"><div><b>HALLVALLA · CONTROLES DEV</b><small>Único acceso de calibración · ?hvdev=1</small></div><button id="hvDevToolsHubClose" type="button" aria-label="Cerrar">×</button></header>
      <div class="hv-dev-hub-scroll">${buildButtons()}<section class="hv-dev-hub-group"><h4>PRUEBAS INTERNAS</h4><div id="hvDevHubInlineTools"></div></section></div>
      <footer class="hv-dev-hub-foot"><button id="hvDevHubCloseEditors" type="button">Cerrar paneles abiertos</button><p id="hvDevToolsHubStatus" aria-live="polite">Selecciona el sistema que quieres ajustar.</p></footer>`;

    document.body.append(launcher,hub);
    wireButtons(hub);
    const setOpen=open=>{
      hub.classList.toggle("hidden",!open);
      launcher.classList.toggle("is-active",open);
      launcher.setAttribute("aria-expanded",open?"true":"false");
    };
    launcher.addEventListener("click",()=>setOpen(hub.classList.contains("hidden")));
    $("hvDevToolsHubClose")?.addEventListener("click",()=>setOpen(false));
    $("hvDevHubCloseEditors")?.addEventListener("click",closeKnownEditors);
    document.addEventListener("keydown",event=>{if(event.key==="Escape"&&!hub.classList.contains("hidden"))setOpen(false);});
    adoptInlineDevTools();
    bindDeferredForgeObserver();
  }

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",createHub,{once:true});
  else createHub();
})();
