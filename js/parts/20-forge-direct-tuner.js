/* HallValla FORGE1CTRL2FIX1 · calibrador directo aislado de la Forja */
(()=>{
  'use strict';

  const STORAGE_KEY='hallvalla_forge1_direct_tuner_v1';
  const PANEL_KEY='hallvalla_forge1_direct_tuner_panel_v1';
  const $=id=>document.getElementById(id);

  const GROUPS={
    parchment:{label:'Pergamino'},
    cards:{label:'Cartas'},
    filters:{label:'Filtros'},
    navigation:{label:'Navegación'},
    other:{label:'Otros'}
  };

  const TARGETS={
    parchment:{group:'parchment',label:'Pergamino',selector:'#hvForgeParchmentLayer',kind:'layer'},
    cards:{group:'cards',label:'Bloque de cartas',selector:'#deckBuilderPanel #deckCollectionGrid'},
    search:{group:'filters',label:'Buscador',selector:'#deckBuilderPanel #deckSearchInput'},
    type:{group:'filters',label:'Filtro Tipo',selector:'#deckBuilderPanel #deckTypeFilter'},
    rarity:{group:'filters',label:'Filtro Rareza',selector:'#deckBuilderPanel #deckRarityFilter'},
    power:{group:'filters',label:'Filtro Poder',selector:'#deckBuilderPanel #deckBattlePowerFilter'},
    sort:{group:'filters',label:'Filtro Orden',selector:'#deckBuilderPanel #deckBattlePowerSort'},
    pager:{group:'navigation',label:'Paginador completo',selector:'#deckBuilderPanel #deckCollectionPager'},
    prev:{group:'navigation',label:'Anterior',selector:'#deckBuilderPanel #deckCollectionPrevBtn'},
    page:{group:'navigation',label:'Contador de página',selector:'#deckBuilderPanel #deckCollectionPageInfo'},
    next:{group:'navigation',label:'Siguiente',selector:'#deckBuilderPanel #deckCollectionNextBtn'},
    title:{group:'other',label:'Cartas disponibles',selector:'#deckBuilderPanel .deckbuilder-collection h3'},
    materials:{group:'other',label:'Materiales',selector:'#deckBuilderPanel #craftMaterialPanel'},
    save:{group:'other',label:'Guardar',selector:'#deckBuilderPanel #saveDeckBtn'}
  };

  const defaultState=()=>Object.fromEntries(Object.keys(TARGETS).map(key=>[key,{x:0,y:0,scale:100,width:100,height:100}]));
  let state=loadState();
  let activeGroup='cards';
  let activeKey='cards';
  let panelOpen=false;
  let drag=null;
  let shell=null;
  let body=null;
  let pointerSelectWired=false;

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
  function saveState(){try{localStorage.setItem(STORAGE_KEY,JSON.stringify(state));}catch(_){}}
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

  function ensureNaturalMetrics(key,el){
    if(!el)return {width:1,height:1};
    const attrW='hvTunerNaturalW',attrH='hvTunerNaturalH';
    let w=Number(el.dataset[attrW]),h=Number(el.dataset[attrH]);
    if(w>2&&h>2)return {width:w,height:h};

    const props=['width','height','min-height','max-width','max-height','transform'];
    const saved=Object.fromEntries(props.map(p=>[p,[el.style.getPropertyValue(p),el.style.getPropertyPriority(p)]]));
    props.forEach(p=>el.style.removeProperty(p));
    const rect=el.getBoundingClientRect();
    for(const p of props){const [value,priority]=saved[p];if(value)el.style.setProperty(p,value,priority||'');}
    w=rect.width;h=rect.height;
    if(!(w>2))w=key==='parchment'?1120:key==='cards'?720:150;
    if(!(h>2))h=key==='parchment'?640:key==='cards'?150:34;
    el.dataset[attrW]=String(w);el.dataset[attrH]=String(h);
    return {width:w,height:h};
  }

  function applyTarget(key){
    const el=targetElement(key);if(!el)return;
    const value=state[key]||defaultState()[key];
    const metrics=ensureNaturalMetrics(key,el);
    const width=Math.max(20,Math.min(250,Number(value.width)||100));
    const height=Math.max(20,Math.min(250,Number(value.height)||100));
    const scale=Math.max(20,Math.min(250,Number(value.scale)||100));

    el.style.setProperty('--hv-tuner-x',`${Number(value.x)||0}px`);
    el.style.setProperty('--hv-tuner-y',`${Number(value.y)||0}px`);
    el.style.setProperty('--hv-tuner-scale',String(scale/100));
    el.style.setProperty('transform',`translate(${Number(value.x)||0}px,${Number(value.y)||0}px) scale(${scale/100})`,'important');
    el.style.setProperty('transform-origin','center center','important');

    if(key==='parchment'){
      el.style.setProperty('width',`${Math.round(metrics.width*width/100)}px`,'important');
      el.style.setProperty('height',`${Math.round(metrics.height*height/100)}px`,'important');
      el.style.setProperty('left','50%','important');
      el.style.setProperty('top','50%','important');
      el.style.setProperty('margin-left',`${-Math.round(metrics.width*width/200)}px`,'important');
      el.style.setProperty('margin-top',`${-Math.round(metrics.height*height/200)}px`,'important');
    }else{
      el.style.setProperty('width',`${Math.round(metrics.width*width/100)}px`,'important');
      el.style.setProperty('height',`${Math.round(metrics.height*height/100)}px`,'important');
      el.style.setProperty('min-height','0px','important');
      el.style.setProperty('max-height','none','important');
    }
    if(key==='parchment'){
      el.style.setProperty('position','absolute','important');
      el.style.setProperty('z-index','0','important');
    }else{
      el.style.setProperty('position','relative','important');
      el.style.setProperty('z-index',key===activeKey&&panelOpen?'80':'20','important');
    }
  }

  function applyAll(){
    ensureParchmentLayer();
    for(const key of Object.keys(TARGETS))applyTarget(key);
    refreshSelectionClasses();
    syncControls();
  }

  function refreshSelectionClasses(){
    for(const [key,cfg] of Object.entries(TARGETS)){
      const el=targetElement(key);if(!el)continue;
      el.classList.toggle('hv-forge-tuner-group-candidate',panelOpen&&cfg.group===activeGroup);
      el.classList.toggle('hv-forge-tuner-selected',panelOpen&&key===activeKey);
      el.dataset.hvForgeTunerName=cfg.label;
    }
  }

  function selectKey(key){
    if(!TARGETS[key])return;
    activeKey=key;
    activeGroup=TARGETS[key].group;
    const group=$('hvForgeGroupSelect');if(group)group.value=activeGroup;
    const label=$('hvForgeSelectedName');if(label)label.textContent=TARGETS[key].label;
    applyAll();
  }

  function findClickedTarget(node){
    if(!(node instanceof Element))return null;
    const candidates=Object.entries(TARGETS)
      .filter(([,cfg])=>cfg.group===activeGroup)
      .map(([key,cfg])=>({key,el:targetElement(key),cfg}))
      .filter(item=>item.el&&item.el.contains(node));
    if(!candidates.length)return null;
    // Prefer the most specific (smallest DOM box), except cards where any card selects the block.
    if(activeGroup==='cards')return 'cards';
    candidates.sort((a,b)=>{
      const ar=a.el.getBoundingClientRect(),br=b.el.getBoundingClientRect();
      return ar.width*ar.height-br.width*br.height;
    });
    return candidates[0].key;
  }

  function wireDirectSelection(){
    if(pointerSelectWired)return;pointerSelectWired=true;
    document.addEventListener('pointerdown',event=>{
      if(!panelOpen||!isForgeOpen()||event.target.closest('#hvForgeDirectTuner'))return;
      const key=findClickedTarget(event.target);if(!key)return;
      event.preventDefault();event.stopPropagation();
      selectKey(key);
      const value=state[key];
      drag={key,startX:event.clientX,startY:event.clientY,baseX:Number(value.x)||0,baseY:Number(value.y)||0,moved:false};
    },true);
    document.addEventListener('pointermove',event=>{
      if(!drag)return;
      const dx=event.clientX-drag.startX,dy=event.clientY-drag.startY;
      if(Math.abs(dx)+Math.abs(dy)>2)drag.moved=true;
      state[drag.key].x=Math.round(drag.baseX+dx);
      state[drag.key].y=Math.round(drag.baseY+dy);
      applyTarget(drag.key);syncControls();
    },true);
    const finish=()=>{if(!drag)return;saveState();drag=null;};
    document.addEventListener('pointerup',finish,true);
    document.addEventListener('pointercancel',finish,true);
  }

  function setValue(field,value){
    if(!state[activeKey])return;
    const limits=field==='x'?[-900,900]:field==='y'?[-700,700]:[20,250];
    state[activeKey][field]=Math.max(limits[0],Math.min(limits[1],Number(value)||0));
    saveState();applyTarget(activeKey);syncControls();
  }
  function nudge(field,delta){setValue(field,(Number(state[activeKey]?.[field])||0)+delta);}

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

  function resetSelected(){state[activeKey]={x:0,y:0,scale:100,width:100,height:100};saveState();applyAll();}
  function resetAll(){state=defaultState();saveState();for(const key of Object.keys(TARGETS)){const el=targetElement(key);if(el){delete el.dataset.hvTunerNaturalW;delete el.dataset.hvTunerNaturalH;}}applyAll();}
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
      <div class="hv-forge-tuner-bar"><button id="hvForgeTunerMove" type="button" title="Mover control">⠿</button><button id="hvForgeTunerToggle" type="button">AJUSTAR FORJA</button></div>
      <section id="hvForgeTunerBody" class="hv-forge-tuner-body hidden">
        <div class="hv-forge-tuner-scroll">
          <div class="hv-forge-tuner-top"><select id="hvForgeGroupSelect">${Object.entries(GROUPS).map(([key,g])=>`<option value="${key}">${g.label}</option>`).join('')}</select><button id="hvForgeTunerClose" type="button">×</button></div>
          <div id="hvForgeSelectedName" class="hv-forge-selected-name">Bloque de cartas</div>
          ${['x','y','scale','width','height'].map(field=>{
            const title={x:'Horizontal',y:'Vertical',scale:'Tamaño',width:'Ancho',height:'Altura'}[field];
            const min=(field==='x'?-900:field==='y'?-700:20),max=(field==='x'?900:field==='y'?700:250),step=field==='x'||field==='y'?1:1;
            const minus=-5,plus=5;
            return `<div class="hv-forge-control-row"><div class="hv-forge-control-label"><b>${title}</b><output data-out="${field}"></output></div><div class="hv-forge-control-line"><button type="button" data-nudge="${field}:${minus}">−</button><input data-field="${field}" type="range" min="${min}" max="${max}" step="${step}"><button type="button" data-nudge="${field}:${plus}">+</button></div></div>`;
          }).join('')}
        </div>
        <div class="hv-forge-tuner-actions"><button id="hvForgeResetSelected">Restaurar</button><button id="hvForgeResetAll">Restaurar todo</button><button id="hvForgeCopyJson">Copiar JSON</button><button id="hvForgeTunerDone">Listo</button></div>
      </section>`;
    document.body.appendChild(shell);
    body=$('hvForgeTunerBody');
    $('hvForgeTunerToggle').onclick=()=>{panelOpen=body.classList.contains('hidden');body.classList.toggle('hidden',!panelOpen);refreshSelectionClasses();syncControls();};
    $('hvForgeTunerClose').onclick=()=>{panelOpen=false;body.classList.add('hidden');refreshSelectionClasses();};
    $('hvForgeTunerDone').onclick=()=>{panelOpen=false;body.classList.add('hidden');refreshSelectionClasses();};
    $('hvForgeGroupSelect').value=activeGroup;
    $('hvForgeGroupSelect').onchange=event=>{activeGroup=event.currentTarget.value;const first=Object.keys(TARGETS).find(key=>TARGETS[key].group===activeGroup);if(first)selectKey(first);};
    shell.querySelectorAll('[data-field]').forEach(input=>input.addEventListener('input',()=>setValue(input.dataset.field,input.value)));
    shell.querySelectorAll('[data-nudge]').forEach(button=>button.addEventListener('click',()=>{const [field,delta]=button.dataset.nudge.split(':');nudge(field,Number(delta));}));
    $('hvForgeResetSelected').onclick=resetSelected;
    $('hvForgeResetAll').onclick=resetAll;
    $('hvForgeCopyJson').onclick=event=>copyJson(event.currentTarget);
    makePanelMovable();wireDirectSelection();syncControls();
  }

  function updateVisibility(){
    if(!shell)return;
    const open=isForgeOpen();shell.classList.toggle('hidden',!open);
    if(open){ensureParchmentLayer();applyAll();}
    else{panelOpen=false;body?.classList.add('hidden');refreshSelectionClasses();}
  }

  createTuner();
  const forge=$('deckBuilderPanel');
  if(forge)new MutationObserver(updateVisibility).observe(forge,{attributes:true,attributeFilter:['class'],subtree:false});
  window.addEventListener('resize',()=>{for(const key of Object.keys(TARGETS)){const el=targetElement(key);if(el){delete el.dataset.hvTunerNaturalW;delete el.dataset.hvTunerNaturalH;}}applyAll();});
  updateVisibility();
})();
