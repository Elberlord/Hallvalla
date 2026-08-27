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
