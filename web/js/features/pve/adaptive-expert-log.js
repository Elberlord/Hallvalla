/* HallValla · PvE adaptive expert learning log
   Responsibility: human-readable persistence/export of the adaptive campaign AI diary.
   Loaded lazily before features/pve/index.js and exposes one explicit API. */

const ADAPTIVE_EXPERT_TEXT_LOG_KEY="expertLearningTextLogV1";
const ADAPTIVE_EXPERT_TEXT_LOG_LIMIT=120;
const ADAPTIVE_EXPERT_PUBLIC_EVENT_LIMIT=18;

/* ============================================================================
   E50 · EXPERT LEARNING TEXT LOG
   ---------------------------------------------------------------------------
   La IA conserva su memoria estructurada para jugar, pero además mantiene un
   diario táctico HUMANO-LEGIBLE. No cambia reglas ni da información oculta.
   Solo resume datos legítimamente observables: mazo presentado, adaptación de
   la IA, resultado, supervivientes y el log público reciente del combate.

   El navegador no puede escribir silenciosamente un .txt en el disco del
   usuario. Por eso el diario persiste dentro del perfil/localStorage y puede
   exportarse bajo demanda desde Configuración como archivo de texto.
============================================================================ */
function getAdaptiveExpertTextLog(){
  try{
    const profile=getPlayerProfile();
    const raw=profile?.adaptiveAi?.[ADAPTIVE_EXPERT_TEXT_LOG_KEY];
    if(!raw||typeof raw!=="object")return{version:1,entries:[]};
    return{
      version:1,
      entries:(Array.isArray(raw.entries)?raw.entries:[]).filter(entry=>entry&&typeof entry.text==="string").slice(-ADAPTIVE_EXPERT_TEXT_LOG_LIMIT)
    };
  }catch(_){return{version:1,entries:[]};}
}
function saveAdaptiveExpertTextLog(log){
  try{
    const profile=getPlayerProfile();
    const adaptiveAi={...(profile.adaptiveAi||{})};
    adaptiveAi[ADAPTIVE_EXPERT_TEXT_LOG_KEY]={
      version:1,
      entries:(Array.isArray(log?.entries)?log.entries:[]).filter(entry=>entry&&typeof entry.text==="string").slice(-ADAPTIVE_EXPERT_TEXT_LOG_LIMIT)
    };
    savePlayerProfile({...profile,adaptiveAi});
    return true;
  }catch(e){console.warn("[HallValla] No se pudo guardar el diario experto de IA:",e);return false;}
}
function adaptiveExpertCardLabel(key){
  key=String(key||"");
  try{return String(getAdventureDeckCardTemplateByKey(key)?.name||key||"desconocida");}catch(_){return key||"desconocida";}
}
function adaptiveExpertFormatCounts(counts={},limit=12){
  const rows=Object.entries(counts||{}).filter(([,count])=>Number(count||0)>0).sort((a,b)=>Number(b[1]||0)-Number(a[1]||0)||String(a[0]).localeCompare(String(b[0]))).slice(0,limit);
  return rows.length?rows.map(([key,count])=>`${Number(count||0)}× ${adaptiveExpertCardLabel(key)}`).join(", "):"ninguna";
}
function adaptiveExpertTopRoles(roles={},limit=6){
  const labels={ranged:"ranged",tank:"tanques",cavalry:"caballería",assassin:"asesinos/sigilo",arcane:"arcano",swarm:"swarm",heavy:"pesadas",burst:"burst melee",damageSpell:"magia de daño",buffSpell:"buffs",heal:"curación",control:"control",highGuard:"Guardia alta",highHp:"Vida alta",mobile:"movilidad"};
  return Object.entries(labels).map(([key,label])=>({key,label,value:Number(roles?.[key]||0)})).filter(x=>x.value>0).sort((a,b)=>b.value-a.value).slice(0,limit).map(x=>`${x.label}=${x.value}`).join(", ")||"sin patrón dominante";
}
function adaptiveExpertInferLessons({result,snapshot,humanSummary,aiSummary,meta}){
  const lessons=[];
  const r=snapshot?.roles||{};
  const hs=humanSummary?.roles||{};
  const as=aiSummary?.roles||{};
  const humanWon=result==="human_win";

  if(humanWon&&Number(hs.ranged||0)>=2)lessons.push("FALLO: la backline/ranged humana sobrevivió demasiado. Próximo duelo: subir presión remota, acceso móvil o ejecución de backline sin vender el frontline.");
  if(humanWon&&Number(hs.cavalry||0)>=2)lessons.push("FALLO: varias monturas humanas terminaron vivas. Próximo duelo: más picas, control de MOV y/o Parálisis; no perseguirlas con tanques lentos.");
  if(humanWon&&Number(hs.assassin||0)>=1)lessons.push("FALLO: Sigilo/asesinos conservaron valor al final. Próximo duelo: detector, bodyguards y protección explícita de supports/ranged.");
  if(humanWon&&Number(as.tank||0)<=0&&(Number(r.burst||0)>=2||Number(r.mobile||0)>=3))lessons.push("FALLO: el frontline de IA colapsó frente a presión explosiva/móvil. Considerar más tanques, curación o control antes de añadir daño.");
  if(Number(r.heal||0)>=1)lessons.push("AMENAZA: el humano lleva curación. Healer/support debe subir en Urgency cuando pueda eliminarse sin exponer piezas frágiles.");
  if(Number(r.highGuard||0)>=3||Number(r.tank||0)>=4)lessons.push("AMENAZA: mucha Guardia/tanque. Priorizar Veneno, ruptura de Guardia, Samurai/Berserker u otra respuesta de daño eficiente; evitar gastar ataques pequeños en una pared.");
  if(Number(r.ranged||0)>=4)lessons.push("PATRÓN: composición ranged significativa. Mantener screens delante de las piezas frágiles y usar Fireball/Veneno/control contra campers cuando el acceso físico tarde demasiado.");
  if(Number(r.burst||0)>=3)lessons.push("PATRÓN: alto burst melee. No ofrecer caballería/ranged como intercambio; primero fijar con tanques y castigar desde segunda línea.");
  if(Number(r.cavalry||0)>=3)lessons.push("PATRÓN: movilidad alta. Amenaza prioritaria no significa perseguir con Guardianes; responder con picas, ranged, magia o control sin abandonar la backline.");
  if(!humanWon&&Number(humanSummary?.totalCards||0)===0)lessons.push("ÉXITO: la IA limpió por completo las unidades humanas. Conservar el núcleo y evitar sobre-adaptar el próximo mazo salvo que el humano cambie su composición.");
  if(!humanWon&&meta?.swaps>0)lessons.push(`ÉXITO PARCIAL: la adaptación previa realizó ${Number(meta.swaps||0)} cambio(s) y ganó. Esos counters deben conservar peso, pero no convertirse en reglas absolutas.`);
  if(!lessons.length)lessons.push("OBSERVACIÓN: no apareció una causa dominante con las métricas actuales. Conservar el arquetipo y acumular más muestras antes de alterar fuertemente el mazo.");
  return lessons.slice(0,8);
}
function buildAdaptiveExpertBattleText(pub,{runKey,snapshot,humanSummary,aiSummary,result}={}){
  const at=new Date(Number(pub?.endedAt||Date.now()));
  const battleId=String(pub?.adventureBattleId||"");
  let battle=null;
  try{battle=typeof getAdventureBattle==="function"?getAdventureBattle(battleId):null;}catch(_){battle=null;}
  const meta=battle?._adaptiveEvolutionMeta||null;
  const principalKeys=(snapshot?.principalKeys||[]).map(adaptiveExpertCardLabel);
  const publicEvents=(Array.isArray(pub?.log)?pub.log:[]).slice(0,ADAPTIVE_EXPERT_PUBLIC_EVENT_LIMIT).reverse().map(line=>String(line||"").trim().slice(0,420)).filter(Boolean);
  const topThreats=(meta?.topThreats||[]).slice(0,6).map(x=>`${adaptiveExpertCardLabel(x.key)}(${Number(x.weight||0).toFixed(2)})`).join(", ")||"sin datos";
  const topCounters=(meta?.topCounters||[]).slice(0,6).map(x=>`${adaptiveExpertCardLabel(x.key)} score=${Math.round(Number(x.score||0))}`).join(", ")||"sin cambios adaptativos registrados";
  const lessons=adaptiveExpertInferLessons({result,snapshot,humanSummary,aiSummary,meta});
  const resultLabel=result==="human_win"?"GANÓ EL HUMANO":"GANÓ LA IA";
  const lines=[
    "================================================================================",
    `[${at.toLocaleString("es-ES")}] ${battle?.enemyName||battleId||"Duelo de Aventura"} · ${resultLabel}`,
    `Run: ${runKey||"sin-id"} · Turno final: ${Math.max(1,Number(pub?.turn||1))} · Líder IA: ${String(pub?.playerLeaders?.[2]||battle?.enemyLeaderType||"desconocido")}`,
    "",
    "[MAZO HUMANO OBSERVADO]",
    `Cartas: ${adaptiveExpertFormatCounts(snapshot?.cardCounts||{},20)}`,
    `Principales: ${principalKeys.length?principalKeys.join(", "):"sin datos"}`,
    `Perfil: ${adaptiveExpertTopRoles(snapshot?.roles||{})}`,
    "",
    "[ADAPTACIÓN PREVIA DE LA IA]",
    meta?`Mapa ${Number(meta.chapter||0)} · cap ${String(meta.rarityLabel||meta.rarityCap||"?")} · cambios ${Number(meta.swaps||0)}/${Number(meta.maxSwaps||0)}`:"Encuentro sin metadatos del constructor adaptativo.",
    meta?`Mazo IA final: ${adaptiveExpertFormatCounts(meta.finalDeckCounts||{},20)}`:"Mazo IA final: sin datos",
    meta?`Entraron por adaptación: ${adaptiveExpertFormatCounts(meta.adaptiveAdded||{},12)}`:"Entraron por adaptación: sin datos",
    meta?`Salieron por adaptación: ${adaptiveExpertFormatCounts(meta.adaptiveRemoved||{},12)}`:"Salieron por adaptación: sin datos",
    `Amenazas que más pesaron: ${topThreats}`,
    `Counters priorizados: ${topCounters}`,
    "",
    "[RESULTADO OBSERVABLE]",
    `Supervivientes humanos: ${adaptiveExpertFormatCounts(humanSummary?.cardCounts||{})}`,
    `Roles humanos supervivientes: ${adaptiveExpertTopRoles(humanSummary?.roles||{})}`,
    `Supervivientes IA: ${adaptiveExpertFormatCounts(aiSummary?.cardCounts||{})}`,
    `Roles IA supervivientes: ${adaptiveExpertTopRoles(aiSummary?.roles||{})}`,
    "",
    "[LO QUE LA IA APRENDE / HIPÓTESIS PARA EL PRÓXIMO DUELO]",
    ...lessons.map((line,index)=>`${index+1}. ${line}`)
  ];
  if(publicEvents.length){
    lines.push("",`[ÚLTIMOS ${publicEvents.length} EVENTOS PÚBLICOS DEL COMBATE]`,...publicEvents.map((line,index)=>`${index+1}. ${line}`));
  }
  lines.push("================================================================================","");
  return lines.join("\n");
}
function appendAdaptiveExpertBattleLog(pub,context={}){
  try{
    const runKey=String(context?.runKey||`${pub?.code||pub?.adventureBattleId||"adaptive"}:${pub?.endedAt||Date.now()}`);
    const log=getAdaptiveExpertTextLog();
    if(log.entries.some(entry=>entry?.runKey===runKey))return false;
    const text=buildAdaptiveExpertBattleText(pub,{...context,runKey});
    log.entries=[...log.entries,{runKey,at:Number(pub?.endedAt||Date.now()),battleId:String(pub?.adventureBattleId||""),text:text.slice(0,20000)}].slice(-ADAPTIVE_EXPERT_TEXT_LOG_LIMIT);
    return saveAdaptiveExpertTextLog(log);
  }catch(e){console.warn("[HallValla] No se pudo añadir el duelo al diario experto:",e);return false;}
}
function getAdaptiveExpertLearningLogText(){
  const log=getAdaptiveExpertTextLog();
  const header=[
    "HALLVALLA — DIARIO DE APRENDIZAJE DE IA CONTRA HUMANO",
    `Build: ${String(globalThis.__HALLVALLA_BUILD_VERSION__||globalThis.__HALLVALLA_BUILD__||"desconocida")}`,
    `Exportado: ${new Date().toLocaleString("es-ES")}`,
    `Duelos registrados: ${log.entries.length}`,
    "",
    "Este archivo resume únicamente información observada legalmente por la IA durante Aventura.",
    "Sirve para estudiar patrones de jugadores expertos y mejorar doctrinas/counters en futuras builds.",
    ""
  ].join("\n");
  return header+log.entries.map(entry=>entry.text).join("\n");
}
function getAdaptiveExpertLearningLogStatus(){
  const log=getAdaptiveExpertTextLog();
  const last=log.entries[log.entries.length-1];
  return{entries:log.entries.length,lastAt:last?.at||0,lastBattleId:last?.battleId||""};
}
function exportAdaptiveExpertLearningLog(){
  try{
    const text=getAdaptiveExpertLearningLogText();
    const blob=new Blob([text],{type:"text/plain;charset=utf-8"});
    const url=URL.createObjectURL(blob);
    const a=document.createElement("a");
    const stamp=new Date().toISOString().replace(/[:.]/g,"-");
    a.href=url;a.download=`Hallvalla_AI_Expert_Learning_${stamp}.txt`;
    document.body.appendChild(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),1500);
    return true;
  }catch(e){console.warn("[HallValla] No se pudo exportar el diario experto:",e);return false;}
}


const HallVallaAdaptiveExpertLog=Object.freeze({
  appendBattleLog:appendAdaptiveExpertBattleLog,
  getText:getAdaptiveExpertLearningLogText,
  getStatus:getAdaptiveExpertLearningLogStatus,
  exportText:exportAdaptiveExpertLearningLog
});
globalThis.HallVallaAdaptiveExpertLog=HallVallaAdaptiveExpertLog;
