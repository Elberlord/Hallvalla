/* HallValla v275 — Auditor de orden de efectos. Solo DEV; observador sin escrituras. */
(()=>{
'use strict';
if(globalThis.__HALLVALLA_DEV_TOOLS__!==true)return;
const bank=globalThis.HALLVALLA_UNIT_SKILL_BANK||{};
const assignments=globalThis.HALLVALLA_UNIT_SKILL_ASSIGNMENTS||{};
const skillList=Object.values(bank).sort((a,b)=>Number(a.id.slice(3))-Number(b.id.slice(3)));
const owned=new Map();
for(const [unitKey,data] of Object.entries(assignments))for(const id of data.innate||[]){
  if(!owned.has(id))owned.set(id,[]);owned.get(id).push(unitKey);
}
const namedRoute={
  'HV-002':['PRE','Golpe a distancia: paraliza después del impacto','Ruta especial'],
  'HV-014':['HIT','Debuff MOV/DX tras acertar','Ruta especial'],
  'HV-024':['POST','Repliegue tras disparar','Ruta especial v274'],
  'HV-143':['POST','Repliegue después de atacar','Ruta especial v274'],
  'HV-166':['MOD','Maldición AT a próxima acción','Ruta especial v271'],
  'HV-167':['MOD','Reducir GD en defensa','Ruta especial v271'],
  'HV-168':['MOD','Maldición movimiento y AGI','Ruta especial v271'],
  'HV-173':['MOD','Escudo Arcano de defensa','Ruta especial v274'],
  'HV-176':['SUPPORT','Purificación de estado','Ruta especial v271'],
  'HV-185':['SUPPORT','Visión Verdadera: detección en soporte','Ruta especial v274'],
  'HV-192':['HIT','Pisoteo: daño/retroceso','Ruta especial v274'],
  'HV-202':['PASSIVE','Horda: aura MOV/DX','Hook pasivo existente'],
  'HV-203':['SUPPORT','Nigromancia: devolver unidad','Ruta especial de soporte'],
  'HV-204':['SUPPORT','Nigromancia Profana: devolver unidad','Ruta especial de soporte'],
  'HV-205':['SUPPORT','Levantamiento Masivo','Ruta de soporte existente'],
  'HV-242':['HIT','Pisotón de área / 30 s','Ruta nativa v273']
};
const criticalGaps=new Set(['HV-044','HV-080','HV-129','HV-152','HV-172','HV-175','HV-182','HV-183','HV-186','HV-195','HV-197','HV-201','HV-220','HV-221']);
const phases=[
 ['PASSIVE','00 — Pasivas y auras','Antes de calcular cada acción: atributos/aura continuos'],
 ['SUPPORT','01 — Soporte automático','Habilidades periódicas y resurrecciones (en su propio tick)'],
 ['PRE','02 — Declarar el ataque','Alcance, Sigilo, trampas previas, interceptaciones'],
 ['MOD','03 — Preparar modificadores','Bonificaciones AT/DX/GD/AGI, equipo, defensa y marcas de cooldown'],
 ['HIT','04 — Resolver impacto','Precisión y evasión; luego Guardia y Vida; efectos al acertar'],
 ['POST','05 — Efectos posteriores','Empuje, daño lateral, estados, reacciones, contraataques, bajas'],
 ['CLOSE','06 — Consumir acciones','Limpiar penalizaciones consumidas y aplicar efectos a la acción siguiente']
];
const phaseRank=Object.fromEntries(phases.map((p,i)=>[p[0],i]));
const escapeHtml=v=>String(v??'').replace(/[&<>"']/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]));
const norm=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
function tagsFor(skill){
  const tags=new Set(skill.tags||[]),t=norm(skill.effect+' '+skill.secondary+' '+skill.name+' '+skill.scale);
  const result=new Set();
  const add=(condition,...items)=>{if(condition)items.forEach(v=>result.add(v));};
  add(tags.has('bleed')||tags.has('poison')||tags.has('burn'),'hp','estatus','relojes_estados');
  add(tags.has('stun')||tags.has('shock')||tags.has('silence'),'relojes_ataque','relojes_movimiento');
  add(tags.has('leg_slow')||tags.has('mobility')||/\bmov\b|retrocede|desplaza|mueve|empuja|teletransport|flanco/.test(t),'movimiento');
  add(tags.has('arm_slow')||/\bat\b|ataque/.test(t),'AT');
  add(/\bdx\b|destreza|precision/.test(t),'DX');
  add(/\bagi\b|evasion/.test(t),'AGI');
  add(tags.has('guard_break')||/guardia|\bgd\b|escudo/.test(t),'GD');
  add(tags.has('push')||/empuja|retrocede|desplaza|posicion|flanco|teletransporte/.test(t),'casilla');
  add(tags.has('death')||/reanim|resucita|cadaver|restos/.test(t),'cementerio','campo');
  add(tags.has('support')||/curaci[oó]n|regener|recupera hp/.test(t),'HP_aliado');
  add(/mana|man[aá]/.test(t),'mana');
  add(/sigilo|revel/.test(t),'sigilo');
  add(/cooldown|recarga/.test(t),'cooldown');
  if(!result.size)result.add('sin_clasificar');
  return [...result];
}
function classify(skill){
  if(namedRoute[skill.id])return {phase:namedRoute[skill.id][0],status:namedRoute[skill.id][2],note:namedRoute[skill.id][1],route:'especial'};
  if(skill.simple){const map={buff:'SUPPORT',strike:'MOD',block:'MOD',hit:'HIT'};return {phase:map[skill.simple.kind]||'POST',status:'Ruta genérica definida; requiere pruebas individuales',note:'Banco de 200 técnicas sencillas',route:'generico'};}
  const t=new Set(skill.tags||[]),trigger=norm(skill.trigger);
  let phase='POST';
  if(trigger==='pasiva'||t.has('aura')||trigger.startsWith('mientras '))phase='PASSIVE';
  else if(t.has('support')||t.has('exorcism')||t.has('death'))phase='SUPPORT';
  else if(trigger.includes('recibir')||t.has('defense')||t.has('stat')&&(/aumenta \bat\b|aumenta dx|reduce guardia|bonificacion/.test(norm(skill.effect))))phase='MOD';
  else if(trigger.includes('acertar')||trigger.includes('impact')||t.has('poison')||t.has('bleed')||t.has('burn')||t.has('multi'))phase='HIT';
  else if(trigger.includes('despues de'))phase='POST';
  return {phase,status:criticalGaps.has(skill.id)?'SIN EJECUTOR ESPECIAL VERIFICADO':'Ejecución individual no certificada',note:'Clasificación inferida de disparador y etiquetas, no una ejecución observada',route:criticalGaps.has(skill.id)?'pendiente':'inferido'};
}
const metaById=new Map(skillList.map(s=>[s.id,{...classify(s),touches:tagsFor(s)}]));
function potentialCollisions(skill){
  const m=metaById.get(skill.id),own=new Set(m.touches.filter(x=>x!=='sin_clasificar'));
  if(!own.size)return [];
  return skillList.filter(s=>s.id!==skill.id).map(s=>{
    const other=metaById.get(s.id),common=other.touches.filter(k=>own.has(k));
    const distance=Math.abs(phaseRank[m.phase]-phaseRank[other.phase]);
    if(!common.length||distance>1)return null;
    return{id:s.id,name:s.name,phase:other.phase,fields:common,distance,verified:other.route==='especial'};
  }).filter(Boolean).sort((a,b)=>a.distance-b.distance||a.id.localeCompare(b.id));
}
const stateKeys=['x','y','hp','guard','atk','dex','agi','mov','tempAtkBuff','tempGuardBuff','tempDexBuff','tempAgiBuff','tempAtkDebuff','tempGuardDebuff','tempDexDebuff','tempAgiDebuff','tempMovDebuff','hvNextAttackAtkDebuff','hvNextDefenseAgiDebuff','hvNextDefenseGuardDebuff','hvNextMoveDelayMs','hvNextMoveSkip','rtStunnedUntil','rtSilencedUntil','rtMoveLockedUntil','rtAttackLockedUntil','veilCurseCyclesRemaining','unitSkillCooldowns','hvCardCooldowns','poisonDamage','burnDamage','bleedDamage','hidden','stealth','revealed'];
const sessions=[];let current=null,serial=0;
function snapshot(units){
 const entries=[];
 for(const u of (units||[])){
  if(!u||u.id==null)continue;
  const attrs={};for(const k of stateKeys)if(u[k]!==undefined){
    const v=u[k];attrs[k]=v&&typeof v==='object'?JSON.stringify(v):v;
  }
  entries.push({id:String(u.id),name:String(u.name||u.key||u.id).slice(0,90),attributes:attrs});
 }
 return entries;
}
function changes(before,after){
 const b=new Map(before.map(u=>[u.id,u])),a=new Map(after.map(u=>[u.id,u])),out=[];
 for(const id of new Set([...b.keys(),...a.keys()])){
  const x=b.get(id),y=a.get(id);
  if(!x||!y){out.push({unit:y?.name||x?.name||id,field:'campo',before:x?'presente':'fuera',after:y?'presente':'fuera'});continue;}
  const keys=new Set([...Object.keys(x.attributes),...Object.keys(y.attributes)]);
  for(const k of keys){const old=x.attributes[k],value=y.attributes[k];if(old!==value)out.push({unit:y.name,field:k,before:old,after:value});}
 }
 return out.slice(0,125);
}
function hvSkillOrderTrace(stage,ctx={}){
 try{
  const snap=snapshot(ctx.units);
  const meta={attacker:ctx.a?.name||ctx.attacker?.name||'',defender:ctx.d?.name||ctx.defender?.name||'',hit:ctx.hit?.hit,notes:Array.isArray(ctx.mods?.notes)?ctx.mods.notes.slice(0,14):[]};
  if(stage==='00.inicio'||!current){
   current={id:++serial,when:new Date().toISOString(),attacker:meta.attacker,defender:meta.defender,events:[],finalized:false,last:snap};
   sessions.unshift(current);if(sessions.length>25)sessions.length=25;
  }
  const previous=current.last||snap;
  current.events.push({order:current.events.length+1,phase:String(stage).slice(0,64),meta,changes:changes(previous,snap)});
  current.last=snap;
  if(stage==='99.fin'){current.finalized=true;current=null;}
  if(document.getElementById('hvSkillOrderAuditPanel')?.dataset.mode==='live')renderLive();
 }catch(error){console.warn('[HV skill order audit]',error);}
}
globalThis.hvSkillOrderTrace=hvSkillOrderTrace;
globalThis.hvSkillOrderAuditExport=()=>JSON.stringify({version:'275',created:new Date().toISOString(),catalog:skillList.map(s=>({id:s.id,name:s.name,trigger:s.trigger,effect:s.effect,secondary:s.secondary,cooldown:s.cooldown,assigned:owned.get(s.id)||[],audit:metaById.get(s.id)})),sessions:sessions.map(({last,...rest})=>rest)},null,2);
let selected='HV-172';
function createEl(tag,attrs={},text=''){
 const node=document.createElement(tag);for(const [k,v] of Object.entries(attrs))if(k==='style')node.style.cssText=v;else if(k==='class')node.className=v;else node.setAttribute(k,v);
 if(text!==undefined)node.textContent=text;return node;
}
function renderDetail(){
 const area=document.getElementById('hvo-detail');if(!area)return;
 const s=bank[selected],meta=metaById.get(selected);if(!s||!meta)return;
 const clashes=potentialCollisions(s);
 const ph=phases.find(p=>p[0]===meta.phase)||[];
 const related=clashes.slice(0,25).map(c=>`<li><b>${escapeHtml(c.id)} ${escapeHtml(c.name)}</b> — ${escapeHtml(c.fields.join(', '))}, fase ${escapeHtml(c.phase)}${c.verified?' (ruta especial conocida)':''}</li>`).join('');
 area.innerHTML=`<h3>${escapeHtml(s.id)} · ${escapeHtml(s.name)}</h3>
 <p><b>Activador declarado:</b> ${escapeHtml(s.trigger||'sin especificar')}<br><b>Promesa:</b> ${escapeHtml(s.effect||'')}. ${escapeHtml(s.secondary||'')}<br><b>Recarga definida:</b> ${escapeHtml(s.cooldown??'sin cifra en banco / depende de regla')}<br><b>Asignaciones innatas:</b> ${escapeHtml((owned.get(s.id)||[]).join(', ')||'Ninguna; puede asignarse en el futuro')}</p>
 <p><b>Fase prevista:</b> ${escapeHtml(ph[1]||meta.phase)}<br><b>Estado:</b> ${escapeHtml(meta.status)}<br><b>Ruta:</b> ${escapeHtml(meta.note)}<br><b>Posibles campos afectados:</b> ${escapeHtml(meta.touches.join(', '))}</p>
 <h4>Orden del motor (referencia)</h4><ol>${phases.map(p=>`<li ${p[0]===meta.phase?'style="color:#e5b45c;font-weight:700"':''}>${escapeHtml(p[1])} · ${escapeHtml(p[2])}</li>`).join('')}</ol>
 <h4>Posibles cruces: ${clashes.length}</h4><p><small>Coincidir en fase y atributo NO demuestra un error. Estas son alertas preventivas, no combates simulados.</small></p>
 <ul>${related||'<li>Sin cruces estimados con este criterio.</li>'}</ul>${clashes.length>25?`<small>Se muestran los primeros 25 de ${clashes.length}.</small>`:''}`;
}
function renderCatalog(){
 const list=document.getElementById('hvo-list');if(!list)return;
 const search=norm(document.getElementById('hvo-search')?.value||'');
 const matches=skillList.filter(s=>norm(`${s.id} ${s.name} ${s.effect} ${s.trigger}`).includes(search));
 document.getElementById('hvo-count').textContent=`${matches.length} de ${skillList.length} habilidades`;
 list.replaceChildren();
 for(const s of matches.slice(0,140)){
  const meta=metaById.get(s.id),button=createEl('button',{type:'button',class:'hvo-entry'+(selected===s.id?' hvo-selected':'')});
  button.textContent=`${s.id} · ${s.name} · ${meta.phase}${meta.route==='pendiente'?' · ⚠':''}`;
  button.onclick=()=>{selected=s.id;renderCatalog();renderDetail();};list.appendChild(button);
 }
 if(matches.length>140)list.appendChild(createEl('small',{},'Refina la búsqueda para ver más de 140 coincidencias.'));
 renderDetail();
}
function renderLive(){
 const root=document.getElementById('hvo-live');if(!root)return;
 root.replaceChildren();
 if(!sessions.length){root.textContent='Aún no se han observado ataques con ?dev en esta pestaña. Las habilidades sin obtener pueden examinarse en Catálogo.';return;}
 for(const run of sessions.slice(0,15)){
  const d=createEl('details',{class:'hvo-run'}),sum=createEl('summary',{},`#${run.id} · ${run.attacker} → ${run.defender} (${run.events.length} pasos)${run.finalized?'':' · en curso'}`);
  d.appendChild(sum);
  for(const ev of run.events){
   const holder=createEl('div',{class:'hvo-event'});holder.appendChild(createEl('b',{},`${ev.order}. ${ev.phase} ${ev.meta.hit===undefined?'':(ev.meta.hit?'✓ impacto':'✕ falla')}`));
   if(ev.meta.notes.length)holder.appendChild(createEl('p',{},'Modificadores: '+ev.meta.notes.join('; ').slice(0,750)));
   if(!ev.changes.length)holder.appendChild(createEl('small',{},'Sin cambios observados entre estos dos puntos de inspección.'));
   else holder.appendChild(createEl('pre',{},ev.changes.slice(0,35).map(x=>`${x.unit}.${x.field}: ${String(x.before??'∅').slice(0,80)} → ${String(x.after??'∅').slice(0,80)}`).join('\n')));
   d.appendChild(holder);
  }
  root.appendChild(d);
 }
}
function downloadJson(){
 const blob=new Blob([globalThis.hvSkillOrderAuditExport()],{type:'application/json;charset=utf-8'}),url=URL.createObjectURL(blob),a=createEl('a',{href:url,download:'HallValla_v275_Orden_Efectos_456.json'});
 a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
const style=`#hvo-launch{position:fixed;right:16px;bottom:24px;z-index:2147483300;background:#352711;border:1px solid #ddb669;border-radius:12px;color:#ffe7b2;font:600 13px Arial;padding:9px 12px;box-shadow:0 5px 25px #000b;cursor:pointer}#hvSkillOrderAuditPanel{position:fixed;inset:3%;z-index:2147483400;color:#ead9b9;background:#17140f;border:2px solid #ba9956;border-radius:14px;box-shadow:0 10px 70px #000d;font:13px/1.5 Arial;overflow:hidden;display:flex;flex-direction:column}#hvSkillOrderAuditPanel[hidden],#hvSkillOrderAuditPanel [hidden]{display:none!important}#hvSkillOrderAuditPanel button{cursor:pointer;color:#f4deb2;background:#30271b;border:1px solid #826b43;border-radius:6px;padding:6px 9px}#hvSkillOrderAuditPanel header{display:flex;gap:7px;align-items:center;flex-wrap:wrap;padding:10px 13px;background:#292116}#hvSkillOrderAuditPanel header strong{margin-right:auto}#hvSkillOrderAuditPanel .hvo-main{display:grid;grid-template-columns:minmax(240px,33%) minmax(350px,67%);gap:12px;min-height:0;flex:1;padding:9px}#hvSkillOrderAuditPanel input{width:100%;background:#261f16;color:#fff3d9;border:1px solid #9c855e;border-radius:6px;padding:9px}#hvo-list,#hvo-detail,#hvo-live{overflow:auto;min-height:0;padding:8px}#hvo-list{border-right:1px solid #57462f}#hvSkillOrderAuditPanel .hvo-entry{display:block;text-align:left;width:100%;margin-bottom:4px}#hvSkillOrderAuditPanel .hvo-selected{border-color:#f4ba51;background:#534023}#hvo-detail h3,#hvo-detail h4{color:#ffda91;margin:5px 0}#hvo-detail li{margin:5px 0}#hvo-detail small,#hvo-live small{color:#c8b897}#hvo-live{padding:15px;flex:1}#hvSkillOrderAuditPanel .hvo-run{border:1px solid #665339;border-radius:8px;padding:7px;margin-bottom:6px}#hvSkillOrderAuditPanel .hvo-event{border-left:2px solid #745629;margin:8px 0;padding:4px 9px}#hvSkillOrderAuditPanel pre{white-space:pre-wrap;word-break:break-word;color:#c8dbff;font:11px/1.5 monospace}#hvo-count{display:block;margin:5px 0}#hvSkillOrderAuditPanel p{margin:7px 0}@media(max-width:650px){#hvSkillOrderAuditPanel{inset:2%}#hvSkillOrderAuditPanel .hvo-main{grid-template-columns:40% 60%;gap:2px}#hvSkillOrderAuditPanel header{padding:5px}}`;
function init(){
 if(document.getElementById('hvo-launch')||!document.body)return;
 const css=createEl('style');css.textContent=style;document.head.appendChild(css);
 const btn=createEl('button',{id:'hvo-launch',type:'button','data-hv-dev-tool':'1'},'⚙ Orden de efectos');document.body.appendChild(btn);
 const panel=createEl('section',{id:'hvSkillOrderAuditPanel',hidden:'',role:'dialog','aria-label':'Orden de efectos HallValla','data-hv-dev-tool':'1'});
 panel.innerHTML=`<header><strong>HALLVALLA · Orden de efectos · 456 habilidades</strong><button type="button" id="hvo-catalogBtn">Catálogo y riesgos</button><button type="button" id="hvo-liveBtn">Orden observado TR</button><button type="button" id="hvo-download">Exportar JSON</button><button type="button" id="hvo-close">Cerrar ✕</button></header><div class="hvo-main" id="hvo-catalog"><div style="min-height:0;display:flex;flex-direction:column"><input id="hvo-search" placeholder="Buscar habilidad, ID, efecto..."/><small id="hvo-count"></small><div id="hvo-list"></div></div><div id="hvo-detail"></div></div><div id="hvo-live" hidden></div>`;
 document.body.appendChild(panel);
 const setMode=mode=>{panel.dataset.mode=mode;document.getElementById('hvo-catalog').hidden=mode==='live';document.getElementById('hvo-live').hidden=mode!=='live';if(mode==='live')renderLive();else renderCatalog();};
 btn.onclick=()=>{panel.hidden=false;setMode('catalog')};
 document.getElementById('hvo-close').onclick=()=>panel.hidden=true;
 document.getElementById('hvo-catalogBtn').onclick=()=>setMode('catalog');
 document.getElementById('hvo-liveBtn').onclick=()=>setMode('live');
 document.getElementById('hvo-download').onclick=downloadJson;
 document.getElementById('hvo-search').addEventListener('input',renderCatalog);
 document.addEventListener('keydown',ev=>{if(ev.key==='Escape'&&!panel.hidden){ev.stopPropagation();panel.hidden=true;}},true);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
console.info(`[HallValla][DEV][SkillOrder] Catálogo ${skillList.length} habilidades. Auditoría solo lectura.`);
})();
