/* HallValla STAGE2 · editor directo del lobby PvP */
(()=>{
  'use strict';
  const STORAGE_KEY='hallvalla_pvp_lobby_tuner_v1';
  const PANEL_KEY='hallvalla_pvp_lobby_tuner_panel_v1';
  const $=id=>document.getElementById(id);
  const TARGETS={
    panel:{label:'Lobby completo',selector:'#pvpRoomPanel',direct:false},
    artwrap:{label:'Imagen / marco completo',selector:'#pvpRoomPanel .pvp-room-artwrap',direct:false},
    art:{label:'Imagen del lobby',selector:'#pvpRoomPanel .pvp-room-art',direct:true},
    codeGroup:{label:'Grupo del código',selector:'#pvpRoomPanel .pvp-room-code-line',direct:false},
    codeText:{label:'Texto del código',selector:'#pvpRoomCode',direct:true},
    copyBtn:{label:'Botón Copiar',selector:'#pvpCopyCodeBtn',direct:true},
    player1:{label:'Panel Jugador 1',selector:'#pvpRoomPanel .pvp-room-player.player1',direct:true},
    player2:{label:'Panel Jugador 2',selector:'#pvpRoomPanel .pvp-room-player.player2',direct:true},
    p1Dot:{label:'Punto J1',selector:'#pvpRoomPlayer1Presence',direct:true},
    p2Dot:{label:'Punto J2',selector:'#pvpRoomPlayer2Presence',direct:true},
    p1Check:{label:'Check J1',selector:'#pvpRoomPlayer1Check',direct:true},
    p2Check:{label:'Check J2',selector:'#pvpRoomPlayer2Check',direct:true},
    readyBtn:{label:'Botón Listo',selector:'#pvpReadyBtn',direct:true},
    leaveBtn:{label:'Botón Salir',selector:'#pvpLeaveBtn',direct:true}
  };
  const defaults={
    panel:{x:0,y:0,scale:100,width:100,height:100},
    artwrap:{x:0,y:0,scale:100,width:100,height:100},
    art:{x:0,y:0,scale:100,width:100,height:100},
    codeGroup:{x:0,y:0,scale:100,width:100,height:100},
    codeText:{x:0,y:0,scale:100,width:100,height:100},
    copyBtn:{x:0,y:0,scale:100,width:100,height:100},
    player1:{x:0,y:0,scale:100,width:100,height:100},
    player2:{x:0,y:0,scale:100,width:100,height:100},
    p1Dot:{x:0,y:0,scale:100,width:100,height:100},
    p2Dot:{x:0,y:0,scale:100,width:100,height:100},
    p1Check:{x:0,y:0,scale:100,width:100,height:100},
    p2Check:{x:0,y:0,scale:100,width:100,height:100},
    readyBtn:{x:0,y:0,scale:100,width:100,height:100},
    leaveBtn:{x:0,y:0,scale:100,width:100,height:100}
  };
  let config=loadConfig(), selected='artwrap', shell=null, body=null, panelOpen=false, draggingKey='', dragStart=null;
  function loadConfig(){ try{return {...defaults,...JSON.parse(localStorage.getItem(STORAGE_KEY)||'{}')};}catch(_){return {...defaults};} }
  function saveConfig(){ localStorage.setItem(STORAGE_KEY,JSON.stringify(config)); }
  function target(key){ return document.querySelector(TARGETS[key]?.selector||''); }
  function isLobbyOpen(){ const host=$('onlineLobby'); return !!(host && !host.classList.contains('hidden')); }
  function isRoomVisible(){ const panel=$('pvpRoomPanel'); return !!(panel && !panel.classList.contains('hidden')); }
  function getCfg(key){ return {...defaults[key], ...(config[key]||{})}; }
  function applyOne(key){ const el=target(key); if(!el) return; const c=getCfg(key); el.style.setProperty('--hvLobbyTunerX',`${c.x||0}px`); el.style.setProperty('--hvLobbyTunerY',`${c.y||0}px`); el.style.setProperty('--hvLobbyTunerScale',`${(c.scale||100)/100}`); el.style.setProperty('--hvLobbyTunerW',`${c.width||100}%`); el.style.setProperty('--hvLobbyTunerH',`${c.height||100}%`); el.classList.add('hv-lobby-tunable'); if(panelOpen && selected===key) el.classList.add('hv-lobby-tuner-selected'); else el.classList.remove('hv-lobby-tuner-selected'); }
  function applyAll(){ Object.keys(TARGETS).forEach(applyOne); }
  function setValue(field,val){ const c=getCfg(selected); c[field]=Number(val); config[selected]=c; saveConfig(); applyOne(selected); syncControls(); }
  function nudge(field,delta){ const c=getCfg(selected); c[field]=(Number(c[field])||0)+delta; config[selected]=c; saveConfig(); applyOne(selected); syncControls(); }
  function resetSelected(){ config[selected]={...defaults[selected]}; saveConfig(); applyOne(selected); syncControls(); }
  function resetAll(){ config={...defaults}; saveConfig(); applyAll(); syncControls(); }
  function syncControls(){ if(!$('hvLobbyTargetSelect')) return; $('hvLobbyTargetSelect').value=selected; $('hvLobbySelectedName').textContent=TARGETS[selected].label; const c=getCfg(selected); ['x','y','scale','width','height'].forEach(f=>{ const inp=document.querySelector(`#hvLobbyTuner [data-field="${f}"]`); const out=document.querySelector(`#hvLobbyTuner [data-out="${f}"]`); if(inp) inp.value=String(c[f]??defaults[selected][f]); if(out) out.textContent=(f==='x'||f==='y'?`${c[f]||0}px`:`${c[f]||100}%`); }); applyAll(); }
  function selectKey(key){ if(!TARGETS[key]) return; selected=key; syncControls(); }
  function copyJson(btn){ const payload=JSON.stringify(config,null,2); navigator.clipboard?.writeText(payload).then(()=>{ const old=btn.textContent; btn.textContent='Copiado'; setTimeout(()=>btn.textContent=old,900); }); }
  function makeMovable(){ const bar=$('hvLobbyTunerMove'); if(!bar) return; let sx=0,sy=0,left=0,top=0,moving=false; const saved=(()=>{ try{return JSON.parse(localStorage.getItem(PANEL_KEY)||'{}');}catch(_){return{};} })(); if(saved.left!=null) shell.style.left=saved.left+'px'; if(saved.top!=null) shell.style.top=saved.top+'px'; const persist=()=>localStorage.setItem(PANEL_KEY,JSON.stringify({left:parseInt(shell.style.left||'16',10)||16, top:parseInt(shell.style.top||'120',10)||120})); const move=e=>{ if(!moving) return; shell.style.left=(left+(e.clientX-sx))+'px'; shell.style.top=(top+(e.clientY-sy))+'px'; }; const up=()=>{ if(!moving) return; moving=false; document.removeEventListener('pointermove',move); document.removeEventListener('pointerup',up); persist(); }; bar.addEventListener('pointerdown',e=>{ moving=true; sx=e.clientX; sy=e.clientY; left=parseInt(shell.style.left||'16',10)||16; top=parseInt(shell.style.top||'120',10)||120; document.addEventListener('pointermove',move); document.addEventListener('pointerup',up); e.preventDefault(); }); }
  function wireDirectSelection(){ document.addEventListener('pointerdown',e=>{ if(!panelOpen||!isRoomVisible()) return; if(shell.contains(e.target)) return; for(const [key,meta] of Object.entries(TARGETS)){ const el=target(key); if(el && meta.direct && (el===e.target || el.contains(e.target))){ selected=key; syncControls(); draggingKey=key; const c=getCfg(key); dragStart={x:e.clientX,y:e.clientY,baseX:c.x||0,baseY:c.y||0}; e.preventDefault(); break; } } }); document.addEventListener('pointermove',e=>{ if(!panelOpen||!draggingKey||!dragStart) return; const c=getCfg(draggingKey); c.x=dragStart.baseX+(e.clientX-dragStart.x); c.y=dragStart.baseY+(e.clientY-dragStart.y); config[draggingKey]=c; saveConfig(); applyOne(draggingKey); if(draggingKey===selected) syncControls(); }); document.addEventListener('pointerup',()=>{ draggingKey=''; dragStart=null; }); }
  function wireKeyboard(){ document.addEventListener('keydown',e=>{ if(!panelOpen) return; const tag=(document.activeElement?.tagName||'').toLowerCase(); if(['input','textarea','select'].includes(tag)) return; if(e.key==='+'){ nudge('scale',1); e.preventDefault(); } else if(e.key==='-'){ nudge('scale',-1); e.preventDefault(); } else if(e.key==='ArrowLeft'){ nudge('x',-1); e.preventDefault(); } else if(e.key==='ArrowRight'){ nudge('x',1); e.preventDefault(); } else if(e.key==='ArrowUp'){ nudge('y',-1); e.preventDefault(); } else if(e.key==='ArrowDown'){ nudge('y',1); e.preventDefault(); } }); }
  function createTuner(){
    shell=document.createElement('section'); shell.id='hvLobbyTuner'; shell.className='hv-lobby-tuner hidden'; shell.style.left='16px'; shell.style.top='120px'; shell.innerHTML=`<div class="hv-lobby-tuner-bar"><button id="hvLobbyTunerMove" type="button" title="Mover control">⠿</button><button id="hvLobbyTunerToggle" type="button">EDITAR LOBBY</button></div><div id="hvLobbyTunerBody" class="hv-lobby-tuner-body hidden"><div class="hv-lobby-tuner-head"><strong>EDITANDO LOBBY</strong><button id="hvLobbyTunerClose" type="button">×</button></div><div class="hv-lobby-tuner-scroll"><select id="hvLobbyTargetSelect" class="hv-lobby-target-select">${Object.entries(TARGETS).map(([k,v])=>`<option value="${k}">${v.label}</option>`).join('')}</select><div id="hvLobbySelectedName" class="hv-lobby-selected-name"></div><div class="hv-lobby-help"><b>Clic + arrastre</b>: mueve · <b>+</b>/<b>−</b>: tamaño · <b>Flechas</b>: ajuste fino</div>${['x','y','scale','width','height'].map(field=>{ const title={x:'Horizontal',y:'Vertical',scale:'Tamaño',width:'Ancho',height:'Altura'}[field]; const min=(field==='x'?-1200:field==='y'?-900:20), max=(field==='x'?1200:field==='y'?900:260); return `<div class="hv-lobby-control-row"><div class="hv-lobby-control-label"><b>${title}</b><output data-out="${field}"></output></div><div class="hv-lobby-control-line"><button type="button" data-nudge="${field}:-5">−</button><input data-field="${field}" type="range" min="${min}" max="${max}" step="1"><button type="button" data-nudge="${field}:5">+</button></div></div>`; }).join('')}</div><div class="hv-lobby-tuner-actions"><button id="hvLobbyResetSelected">Restaurar</button><button id="hvLobbyResetAll">Restaurar todo</button><button id="hvLobbyCopyJson">Copiar JSON</button><button id="hvLobbyTunerDone">Listo</button></div></div>`;
    document.body.appendChild(shell); body=$('hvLobbyTunerBody');
    $('hvLobbyTunerToggle').onclick=()=>{ panelOpen=body.classList.contains('hidden'); body.classList.toggle('hidden',!panelOpen); $('hvLobbyTunerToggle').textContent=panelOpen?'EDITANDO':'EDITAR LOBBY'; syncControls(); };
    const close=()=>{ panelOpen=false; body.classList.add('hidden'); $('hvLobbyTunerToggle').textContent='EDITAR LOBBY'; applyAll(); };
    $('hvLobbyTunerClose').onclick=close; $('hvLobbyTunerDone').onclick=close;
    $('hvLobbyTargetSelect').onchange=e=>selectKey(e.currentTarget.value);
    shell.querySelectorAll('[data-field]').forEach(inp=>inp.addEventListener('input',()=>setValue(inp.dataset.field,inp.value)));
    shell.querySelectorAll('[data-nudge]').forEach(btn=>btn.addEventListener('click',()=>{ const [f,d]=btn.dataset.nudge.split(':'); nudge(f,Number(d)); }));
    $('hvLobbyResetSelected').onclick=resetSelected; $('hvLobbyResetAll').onclick=resetAll; $('hvLobbyCopyJson').onclick=e=>copyJson(e.currentTarget);
    makeMovable(); wireDirectSelection(); wireKeyboard(); syncControls();
  }
  function updateVisibility(){ if(!shell) return; const show=isLobbyOpen(); shell.classList.toggle('hidden',!show); if(show) applyAll(); else{ panelOpen=false; body?.classList.add('hidden'); if($('hvLobbyTunerToggle')) $('hvLobbyTunerToggle').textContent='EDITAR LOBBY'; } }
  createTuner();
  const online=$('onlineLobby'); if(online){ new MutationObserver(updateVisibility).observe(online,{attributes:true,attributeFilter:['class'],subtree:false}); new MutationObserver(()=>{ if(isLobbyOpen()) applyAll(); }).observe(online,{childList:true,subtree:true}); }
  window.addEventListener('resize',applyAll);
  updateVisibility();
})();
