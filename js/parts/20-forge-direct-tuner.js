/* HallValla FORGE5CTRL · editor directo total de la Forja */
(()=>{
  'use strict';

  const STORAGE_KEY='hallvalla_forge_direct_tuner_v5_totalcontrol';
  const PANEL_KEY='hallvalla_forge_direct_tuner_panel_v2';
  const $=id=>document.getElementById(id);

  const GROUPS={
    layout:{label:'Pergaminos / layout'},
    filters:{label:'Filtros'},
    collection:{label:'Colección'},
    materials:{label:'Materiales'},
    navigation:{label:'Navegación'},
    spellbook:{label:'Spellbook'},
    actions:{label:'Botones'},
    window:{label:'Ventana'}
  };

  const TARGETS={
    parchment:{group:'layout',label:'Pergamino principal',selector:'#hvForgeParchmentLayer'},
    parchmentStage:{group:'layout',label:'Área del pergamino',selector:'#deckBuilderPanel .deckbuilder-parchment-stage'},
    filterGroup:{group:'filters',label:'Todos los filtros',selector:'#deckBuilderPanel #deckFilterGroup'},
    search:{group:'filters',label:'Buscador',selector:'#deckBuilderPanel #deckSearchInput'},
    type:{group:'filters',label:'Filtro Tipo',selector:'#deckBuilderPanel #deckTypeFilter'},
    ownership:{group:'filters',label:'Filtro Posesión',selector:'#deckBuilderPanel #deckOwnershipFilter'},
    rarity:{group:'filters',label:'Filtro Rareza',selector:'#deckBuilderPanel #deckRarityFilter'},
    power:{group:'filters',label:'Filtro Poder',selector:'#deckBuilderPanel #deckBattlePowerFilter'},
    sort:{group:'filters',label:'Filtro Orden',selector:'#deckBuilderPanel #deckBattlePowerSort'},

    collectionSection:{group:'collection',label:'Área de colección',selector:'#deckBuilderPanel .deckbuilder-collection'},
    title:{group:'collection',label:'Cartas disponibles',selector:'#deckBuilderPanel .deckbuilder-collection h3'},
    cards:{group:'collection',label:'Bloque de cartas',selector:'#deckBuilderPanel #deckCollectionGrid'},

    materials:{group:'materials',label:'Imagen Materiales',selector:'#deckBuilderPanel #craftMaterialPanel'},
    material1:{group:'materials',label:'Material Básica',selector:'#deckBuilderPanel #craftMaterialPanel .craft-material-node:nth-child(1)'},
    material2:{group:'materials',label:'Material Épica',selector:'#deckBuilderPanel #craftMaterialPanel .craft-material-node:nth-child(2)'},
    material3:{group:'materials',label:'Material Gloriosa',selector:'#deckBuilderPanel #craftMaterialPanel .craft-material-node:nth-child(3)'},
    material4:{group:'materials',label:'Material Mítica',selector:'#deckBuilderPanel #craftMaterialPanel .craft-material-node:nth-child(4)'},
    material5:{group:'materials',label:'Material Legendaria',selector:'#deckBuilderPanel #craftMaterialPanel .craft-material-node:nth-child(5)'},
    material6:{group:'materials',label:'Material Semidiós',selector:'#deckBuilderPanel #craftMaterialPanel .craft-material-node:nth-child(6)'},

    pager:{group:'navigation',label:'Paginación completa',selector:'#deckBuilderPanel #deckCollectionPager'},
    prev:{group:'navigation',label:'Anterior',selector:'#deckBuilderPanel #deckCollectionPrevBtn'},
    page:{group:'navigation',label:'Contador de página',selector:'#deckBuilderPanel #deckCollectionPageInfo'},
    next:{group:'navigation',label:'Siguiente',selector:'#deckBuilderPanel #deckCollectionNextBtn'},

    drawer:{group:'spellbook',label:'Pergamino Spellbook',selector:'#deckBuilderPanel #deckBuilderDrawer'},
    drawerTab:{group:'spellbook',label:'Pestaña Spellbook',selector:'#deckBuilderPanel #deckBuilderDrawerTab'},
    drawerClose:{group:'spellbook',label:'Cerrar Spellbook',selector:'#deckBuilderPanel #deckBuilderDrawerClose'},
    deckCounter:{group:'spellbook',label:'Contador Spellbook',selector:'#deckBuilderPanel #deckCountText'},
    principalGroup:{group:'spellbook',label:'Principales (grupo)',selector:'#deckBuilderPanel #deckPrincipalSlots'},
    principal1:{group:'spellbook',label:'Principal 1',selector:'#deckBuilderPanel #deckPrincipalSlots .deck-principal-selector:nth-child(1)'},
    principal2:{group:'spellbook',label:'Principal 2',selector:'#deckBuilderPanel #deckPrincipalSlots .deck-principal-selector:nth-child(2)'},
    principal3:{group:'spellbook',label:'Principal 3',selector:'#deckBuilderPanel #deckPrincipalSlots .deck-principal-selector:nth-child(3)'},
    deckCards:{group:'spellbook',label:'Cartas del Spellbook',selector:'#deckBuilderPanel #currentDeckList'},

    actionGroup:{group:'actions',label:'Todos los botones',selector:'#deckBuilderPanel #deckBuilderActionGroup'},
    save:{group:'actions',label:'Guardar',selector:'#deckBuilderPanel #saveDeckBtn'},
    dust:{group:'actions',label:'Convertir sobrantes',selector:'#deckBuilderPanel #dustAllSurplusCornerBtn'},

    mainClose:{group:'window',label:'Cerrar Forja',selector:'#deckBuilderPanel #closeDeckBuilderBtn'}
  };

  const defaultValue=()=>({x:0,y:0,scale:100,width:100,height:100});
  const defaultState=()=>Object.fromEntries(Object.keys(TARGETS).map(key=>[key,defaultValue()]));
  let state=loadState();
  let activeGroup='collection';
  let activeKey='cards';
  let panelOpen=false;
  let drag=null;
  let shell=null;
  let body=null;
  let pointerSelectWired=false;
  let keyboardWired=false;

  function loadState(){
    const base=defaultState();
    try{
      const raw=JSON.parse(localStorage.getItem(STORAGE_KEY)||'null')||{};
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

  function ensureParchmentLayer(){
    const stage=document.querySelector('#deckBuilderPanel .deckbuilder-parchment-stage');
    if(!stage)return null;
    let layer=$('hvForgeParchmentLayer');
    if(!layer){
      layer=document.createElement('div');
      layer.id='hvForgeParchmentLayer';
      layer.className='hv-forge-parchment-layer';
      stage.prepend(layer);
    }
    return layer;
  }

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
    if(!(w>2))w=key==='parchment'?1120:key==='cards'?760:160;
    if(!(h>2))h=key==='parchment'?640:key==='cards'?240:40;
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

  function applyAll(){
    ensureParchmentLayer();
    for(const key of Object.keys(TARGETS))applyTarget(key);
    refreshSelectionClasses();
    syncControls();
  }

  function refreshSelectionClasses(){
    document.body.classList.toggle('hv-forge-edit-active',panelOpen&&isForgeOpen());
    for(const key of Object.keys(TARGETS)){
      const el=targetElement(key);if(!el)continue;
      el.classList.toggle('hv-forge-tuner-selected',panelOpen&&key===activeKey);
      el.dataset.hvForgeTunerName=TARGETS[key].label;
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

  function findClickedTarget(node){
    if(!(node instanceof Element))return null;
    const candidates=Object.entries(TARGETS)
      .map(([key,cfg])=>({key,cfg,el:targetElement(key)}))
      .filter(item=>item.el&&item.el.getClientRects().length>0&&getComputedStyle(item.el).display!=='none'&&getComputedStyle(item.el).visibility!=='hidden'&&item.el.contains(node));
    if(!candidates.length){
      const stage=document.querySelector('#deckBuilderPanel .deckbuilder-parchment-stage');
      if(stage&&stage.contains(node))return 'parchment';
      return null;
    }
    candidates.sort((a,b)=>{
      const ar=a.el.getBoundingClientRect(),br=b.el.getBoundingClientRect();
      const aa=Math.max(1,ar.width*ar.height),ba=Math.max(1,br.width*br.height);
      return aa-ba;
    });
    return candidates[0].key;
  }

  function wireDirectSelection(){
    if(pointerSelectWired)return;pointerSelectWired=true;
    document.addEventListener('pointerdown',event=>{
      if(!panelOpen||!isForgeOpen()||event.target.closest('#hvForgeDirectTuner'))return;
      const key=findClickedTarget(event.target);if(!key)return;
      selectKey(key);
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
    const limits=field==='x'?[-1200,1200]:field==='y'?[-900,900]:[20,300];
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
    shell=document.createElement('div');shell.id='hvForgeDirectTuner';shell.className='hv-forge-direct-tuner hidden';
    shell.innerHTML=`
      <div class="hv-forge-tuner-bar"><button id="hvForgeTunerMove" type="button" title="Mover control">⠿</button><button id="hvForgeTunerToggle" type="button">EDITAR FORJA</button></div>
      <section id="hvForgeTunerBody" class="hv-forge-tuner-body hidden">
        <div class="hv-forge-tuner-scroll-wrap">
          <div id="hvForgeTunerScroll" class="hv-forge-tuner-scroll">
            <div class="hv-forge-tuner-top"><select id="hvForgeGroupSelect">${Object.entries(GROUPS).map(([key,g])=>`<option value="${key}">${g.label}</option>`).join('')}</select><button id="hvForgeTunerClose" type="button">×</button></div>
            <select id="hvForgeTargetSelect" class="hv-forge-target-select" aria-label="Elemento a editar"></select>
            <div id="hvForgeSelectedName" class="hv-forge-selected-name">Bloque de cartas</div>
            <div class="hv-forge-editor-help">Clic + arrastre: mover · <b>+</b>/<b>−</b>: tamaño · Flechas: ajuste fino</div>
            ${['x','y','scale','width','height'].map(field=>{
              const title={x:'Horizontal',y:'Vertical',scale:'Tamaño',width:'Ancho',height:'Altura'}[field];
              const min=(field==='x'?-1200:field==='y'?-900:20),max=(field==='x'?1200:field==='y'?900:300);
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

  function updateVisibility(){
    if(!shell)return;
    const open=isForgeOpen();shell.classList.toggle('hidden',!open);
    if(open){ensureParchmentLayer();applyAll();refreshTargetSelect();}
    else{panelOpen=false;body?.classList.add('hidden');$('hvForgeTunerToggle')&&($('hvForgeTunerToggle').textContent='EDITAR FORJA');refreshSelectionClasses();}
  }

  createTuner();
  const forge=$('deckBuilderPanel');
  if(forge)new MutationObserver(updateVisibility).observe(forge,{attributes:true,attributeFilter:['class'],subtree:false});
  window.addEventListener('resize',()=>{
    for(const key of Object.keys(TARGETS)){const el=targetElement(key);if(el){delete el.dataset.hvTunerNaturalW;delete el.dataset.hvTunerNaturalH;}}
    applyAll();
  });
  updateVisibility();
})();
