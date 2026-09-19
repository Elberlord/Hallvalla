"use strict";
/* HallValla · Tutorial básico de combate */

function markBasicBattleTutorialSeen(){try{localStorage.setItem(HALLVALLA_BASIC_TUTORIAL_KEY,"true");}catch(e){}}
// El tutorial antiguo de entrada por modal fue retirado. El Tutorial básico se inicia
// desde su botón y enseña todo dentro del tablero mediante texto flotante.
function getTutorialCardTemplate(key){
  const card=getStarterBasicCardByKey(key);
  return card?{...card}:null;
}
function makeBasicTutorialPracticeUnit(key,owner,x,y,leaderType,role){
  const template=getTutorialCardTemplate(key);
  if(!template)return null;
  const unit=makeUnit({...template,owner,leaderType,summonOrigin:"tutorial",fieldGeneratedSummon:true},x,y);
  unit.tutorialRole=role||"";
  return unit;
}
async function startBasicTutorialBattle(){
  if(!(await ensureFirebaseAuthReady("tutorial")))return;
  basicTutorialCoachStep=0;
  basicTutorialProgressStep=0;
  basicTutorialFlags={orbCollected:false,summoned:false,spellPlayed:false,leaderShielded:false,completionHandled:false};
  clearBasicTutorialTargetHighlight();
  const oldCoach=$("basicTutorialCoach");if(oldCoach)oldCoach.classList.add("hidden");
  const leaderType=getSelectedLeaderType()||"warrior";
  const leaderLevel=getLocalLeaderLevel(leaderType)||1;
  const leaderAbility=getLocalLeaderAbility(leaderType)||"";
  const leaderStats=getLeaderBattleStats(leaderType,leaderLevel,leaderAbility);
  const code=`TUT${code4()}`;
  // El tutorial usa el mismo Arsenal y automatización que una batalla normal.
  // Dos unidades baratas + una magia permiten practicar la secuencia real del juego.
  const deck=["spearman","archer","fireball"].map(k=>getTutorialCardTemplate(k)).filter(Boolean).map(card=>makeCard(card,1,leaderType));
  const hand=[];
  const enemyLeaderType="warrior";
  const enemyLeaderStats=getLeaderBattleStats(enemyLeaderType,1,"");
  const center=Math.floor(COLS/2);
  const enemyTarget=makeBasicTutorialPracticeUnit("guardian",2,Math.max(0,center-1),Math.max(1,Math.floor(ROWS/2)-1),enemyLeaderType,"target-demo");
  if(enemyTarget){
    enemyTarget.name="Guardia de práctica";
    enemyTarget.hp=24;enemyTarget.maxHp=24;enemyTarget.guard=4;enemyTarget.baseGuard=4;
    enemyTarget.mov=0;enemyTarget.baseMov=0;enemyTarget.acted=false;enemyTarget.moved=true;
  }
  const playerLeader=makeLeader(1,center,ROWS-1,leaderType,leaderLevel,leaderAbility);
  const enemyLeader=makeLeader(2,center,0,enemyLeaderType,1,"");
  if(enemyLeader){enemyLeader.hp=Math.max(40,Number(enemyLeader.hp||0));enemyLeader.maxHp=enemyLeader.hp;}
  const units=[playerLeader,enemyLeader,enemyTarget].filter(Boolean);
  const now=Date.now();
  const pub={
    code,
    boardRows:ROWS,
    boardCols:COLS,
    mode:"tutorial",
    tutorialBasic:true,
    realtimeExperimental:true,
    createdAt:now,
    // El primer orbe debe estar visible al entrar para que el jugador aprenda la mecánica sin esperar 14 s.
    engineStartedAt:now-15050,
    currentPlayer:0,
    turn:1,
    phase:"active",
    turnPhase:"realtime",
    turnKey:"RT-1",

    playerSlots:{player1Uid:uid,player2Uid:"TUTORIAL_DUMMY"},
    playerNames:{1:getLocalProfileName(),2:"Instructor de práctica"},
    playerLeaders:{1:leaderType,2:enemyLeaderType},
    playerLeaderLevels:{1:leaderLevel,2:1},
    playerLeaderAbilities:{1:leaderAbility,2:""},
    playerStats:{1:{hp:leaderStats.hp,honor:2,maxHonor:2,deck:deck.length,hand:0},2:{hp:enemyLeaderStats.hp,honor:0,maxHonor:0,deck:0,hand:0}},
    erictoGraveyard:[],
    units,
    log:["Tutorial: recoge MANÁ, convoca, usa magia y aprende a bloquear daño con tu líder."]
  };
  await set(ref(db,`games/${code}/public`),pub);
  await set(getGamePrivatePlayerRef(code,1),{ownerUid:uid,leaderType,leaderLevel,leaderAbility,deck,hand,honor:2,maxHonor:2,lastTurnStarted:"RT",skipFirstTurnDraw:true});
  const main=$("mainMenu");if(main)main.classList.add("hidden");
  enterGame(code,1);
}

function ensureBasicTutorialCoach(){
  let coach=$("basicTutorialCoach");
  if(coach)return coach;
  coach=document.createElement("div");
  coach.id="basicTutorialCoach";
  coach.className="basic-tutorial-coach hidden";
  coach.setAttribute("aria-live","polite");
  coach.innerHTML=`
    <div class="basic-tutorial-coach-card">
      <div class="basic-tutorial-coach-top">
        <div id="basicTutorialStepText" class="basic-tutorial-step">TUTORIAL DE COMBATE · 1/7</div>
        <button id="basicTutorialCloseCoachBtn" class="basic-tutorial-close" type="button" aria-label="Salir del tutorial" title="Salir del tutorial">×</button>
      </div>
      <h3 id="basicTutorialCoachTitle">Tutorial básico</h3>
      <p id="basicTutorialCoachBody"></p>
      <div id="basicTutorialCoachHint" class="basic-tutorial-hint"></div>
      <button id="basicTutorialNextBtn" class="basic-tutorial-next" type="button">Continuar</button>
    </div>`;
  document.body.appendChild(coach);
  ensureBasicTutorialFocusRing();
  on("basicTutorialCloseCoachBtn","click",()=>exitBasicTutorialBattle());
  on("basicTutorialNextBtn","click",()=>advanceBasicTutorialManualStep());
  if(!window.__hallvallaBasicTutorialPositionBound){
    window.__hallvallaBasicTutorialPositionBound=true;
    window.addEventListener("resize",()=>{if(publicState?.mode==="tutorial")renderBasicTutorialCoach(false);});
  }
  return coach;
}
function ensureBasicTutorialFocusRing(){let ring=$("basicTutorialFocusRing");if(ring)return ring;ring=document.createElement("div");ring.id="basicTutorialFocusRing";ring.className="basic-tutorial-focus-ring hidden";document.body.appendChild(ring);return ring;}
let basicTutorialCurrentTarget=null;
let basicTutorialFlags={orbCollected:false,summoned:false,spellPlayed:false,leaderShielded:false,completionHandled:false};
function clearBasicTutorialTargetHighlight(){if(basicTutorialCurrentTarget&&basicTutorialCurrentTarget.classList)basicTutorialCurrentTarget.classList.remove("tutorial-target-active");basicTutorialCurrentTarget=null;const ring=$("basicTutorialFocusRing");if(ring)ring.classList.add("hidden");}
function getBasicTutorialPlayerUnits(){return (publicState?.units||[]).filter(u=>u&&u.owner===myPlayer&&!u.leader&&u.hp>0);}
function getBasicTutorialSummonedUnit(){return getBasicTutorialPlayerUnits().find(u=>u.summonOrigin==="hand")||null;}
function getBasicTutorialEnemyLeader(){return (publicState?.units||[]).find(u=>u&&u.owner!==myPlayer&&u.leader&&u.hp>0)||null;}
function getBasicTutorialPlayerLeader(){return (publicState?.units||[]).find(u=>u&&u.owner===myPlayer&&u.leader&&u.hp>0)||null;}
function getBasicTutorialBoardUnitEl(unit){if(!unit)return null;return document.querySelector(`.unit-card[data-x="${unit.x}"][data-y="${unit.y}"]`)||document.querySelector(`.leader-base[data-x="${unit.x}"][data-y="${unit.y}"]`)||null;}
function getBasicTutorialRtCardEl(key){const card=(privateState?.hand||[]).find(c=>c?.key===key);if(!card)return null;return [...document.querySelectorAll("#rtArsenalCards [data-rt-card-id]")].find(el=>String(el.dataset.rtCardId||"")===String(card.id||""))||null;}
function getBasicTutorialTargetElement(step){if(!step)return null;try{const el=typeof step.targetResolver==="function"?step.targetResolver():null;return el&&el.nodeType===1?el:null;}catch(e){return null;}}
function hallvallaBasicTutorialOnManaOrbCollected(){if(publicState?.mode!=="tutorial"||!publicState?.tutorialBasic)return;basicTutorialFlags.orbCollected=true;battleRequestAnimationFrame(()=>renderBasicTutorialCoach(false),"tutorial-orb-progress");}
function hallvallaBasicTutorialOnLeaderShield(){if(publicState?.mode!=="tutorial"||!publicState?.tutorialBasic)return;basicTutorialFlags.leaderShielded=true;battleRequestAnimationFrame(()=>renderBasicTutorialCoach(false),"tutorial-shield-progress");}
function hallvallaBasicTutorialOnSpellPlayed(){if(publicState?.mode!=="tutorial"||!publicState?.tutorialBasic)return;basicTutorialFlags.spellPlayed=true;battleRequestAnimationFrame(()=>renderBasicTutorialCoach(false),"tutorial-spell-progress");}
globalThis.hallvallaBasicTutorialOnManaOrbCollected=hallvallaBasicTutorialOnManaOrbCollected;
globalThis.hallvallaBasicTutorialOnLeaderShield=hallvallaBasicTutorialOnLeaderShield;
globalThis.hallvallaBasicTutorialOnSpellPlayed=hallvallaBasicTutorialOnSpellPlayed;
function getTutorialRewardedSteps(){try{return new Set(JSON.parse(localStorage.getItem(HALLVALLA_BASIC_TUTORIAL_REWARDS_KEY)||"[]"));}catch(e){return new Set();}}
function awardBasicTutorialStep(stepIndex){const rewarded=getTutorialRewardedSteps();if(rewarded.has(stepIndex))return;rewarded.add(stepIndex);try{localStorage.setItem(HALLVALLA_BASIC_TUTORIAL_REWARDS_KEY,JSON.stringify([...rewarded]));}catch(e){}const profile=getPlayerProfile();profile.gold=(profile.gold||0)+5;savePlayerProfile(profile);renderPlayerProfile(profile);}
function setBasicTutorialComplete(){
  try{localStorage.setItem(HALLVALLA_BASIC_TUTORIAL_COMPLETE_KEY,"true");localStorage.setItem(HALLVALLA_BASIC_TUTORIAL_KEY,"true");localStorage.setItem(HALLVALLA_BASIC_TUTORIAL_STEP_KEY,String(BASIC_TUTORIAL_STEPS.length));}catch(e){}
  try{
    const rewardKey="hallvalla_tutorial_basic_completion_reward_v1";
    if(localStorage.getItem(rewardKey)!=="true"){
      localStorage.setItem(rewardKey,"true");
      const profile=getPlayerProfile();profile.gold=(Number(profile.gold)||0)+20;savePlayerProfile(profile);renderPlayerProfile?.(profile);
    }
  }catch(_){ }
  renderHomeProgress();
}
function isBasicTutorialComplete(){try{return localStorage.getItem(HALLVALLA_BASIC_TUTORIAL_COMPLETE_KEY)==="true";}catch(e){return false;}}

function getBasicTutorialProtectedRects(target){
  const selectors=[
    ".action-img-btn",
    ".unit-context-btn",
    ".hv-det-play-card-button",
    ".battle-tool-btn",
    "#hudP1",
    "#hudP2",
    "#turnHonorHud",
    "#rivalHonorHud",
    "#turnTimerHud",
    "#playerClock1",
    "#playerClock2",
    "#phaseBanner",
    "#handDrawer"
  ];
  const nodes=[...document.querySelectorAll(selectors.join(","))];
  return nodes.filter(el=>el&&el!==target&&!el.contains?.(target)&&el.offsetParent!==null).map(el=>el.getBoundingClientRect()).filter(r=>r.width>0&&r.height>0);
}
function rectOverlapArea(a,b){const w=Math.max(0,Math.min(a.right,b.right)-Math.max(a.left,b.left));const h=Math.max(0,Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top));return w*h;}
function clampBasicTutorialValue(value,min,max){return Math.min(Math.max(value,min),max);}
function positionBasicTutorialCoach(step,target){
  const coach=$("basicTutorialCoach");if(!coach)return;
  const vw=Math.max(320,window.innerWidth||document.documentElement.clientWidth||320);
  const vh=Math.max(320,window.innerHeight||document.documentElement.clientHeight||320);
  const margin=10,gap=14;
  const cr=coach.getBoundingClientRect();
  const cw=Math.min(cr.width||300,vw-margin*2),ch=Math.min(cr.height||120,vh-margin*2);

  const placeCoach=(left,top,name="free")=>{
    const safeLeft=clampBasicTutorialValue(left,margin,Math.max(margin,vw-cw-margin));
    const safeTop=clampBasicTutorialValue(top,margin,Math.max(margin,vh-ch-margin));
    coach.style.setProperty("left",`${safeLeft}px`,"important");
    coach.style.setProperty("top",`${safeTop}px`,"important");
    coach.style.setProperty("right","auto","important");
    coach.dataset.placement=name;
  };

  if(!target||target.offsetParent===null){placeCoach(margin,Math.max(margin,vh-ch-margin),"free");return;}

  if(step&&(step.id==="intro"||step.id==="mana")){
    const hudRect=$("hudP1")?.getBoundingClientRect?.();
    const honorRect=$("turnHonorHud")?.getBoundingClientRect?.();
    const handRect=$("handDrawer")?.getBoundingClientRect?.();
    const sideRect=document.querySelector(".side")?.getBoundingClientRect?.();
    const topBlock=Math.max(hudRect?.bottom||0,honorRect?.bottom||0)+12;
    const bottomBlock=(handRect?.top||vh-margin)-12;
    const laneHeight=bottomBlock-topBlock;
    const preferredLeft=margin;
    if(laneHeight>Math.max(ch,86)){
      const laneTop=topBlock+Math.max(0,(laneHeight-ch)/2);
      placeCoach(preferredLeft,laneTop,step.id+"-lane");
      return;
    }
    if(sideRect&&sideRect.left-cw-margin>margin){
      placeCoach(sideRect.left-cw-margin,margin,step.id+"-side");
      return;
    }
  }

  const r=target.getBoundingClientRect();
  const candidates=[
    {name:"right",left:r.right+gap,top:r.top+r.height/2-ch/2},
    {name:"left",left:r.left-cw-gap,top:r.top+r.height/2-ch/2},
    {name:"below",left:r.left+r.width/2-cw/2,top:r.bottom+gap},
    {name:"above",left:r.left+r.width/2-cw/2,top:r.top-ch-gap},
    {name:"left-mid",left:margin,top:vh*.34-ch/2},
    {name:"bottom-left",left:margin,top:vh-ch-margin-8},
    {name:"top-center",left:vw/2-cw/2,top:margin},
    {name:"bottom-center",left:vw/2-cw/2,top:vh-ch-margin-8}
  ];
  const protectedRects=getBasicTutorialProtectedRects(target);
  let best=null;
  for(const c of candidates){
    const left=Math.min(Math.max(margin,c.left),Math.max(margin,vw-cw-margin));
    const top=Math.min(Math.max(margin,c.top),Math.max(margin,vh-ch-margin));
    const box={left,top,right:left+cw,bottom:top+ch};
    const overflow=Math.max(0,margin-c.left)+Math.max(0,c.left+cw-(vw-margin))+Math.max(0,margin-c.top)+Math.max(0,c.top+ch-(vh-margin));
    const targetOverlap=rectOverlapArea(box,r);
    const controlsOverlap=protectedRects.reduce((sum,pr)=>sum+rectOverlapArea(box,pr),0);
    const distancePenalty=Math.abs((left+cw/2)-(r.left+r.width/2))*0.05+Math.abs((top+ch/2)-(r.top+r.height/2))*0.02;
    const score=overflow*10000+targetOverlap*100+controlsOverlap+distancePenalty;
    if(!best||score<best.score)best={...c,left,top,score};
  }
  placeCoach(best?.left??margin,best?.top??margin,best?.name||"free");
}
function applyBasicTutorialTarget(step){
  clearBasicTutorialTargetHighlight();
  const el=getBasicTutorialTargetElement(step);const ring=ensureBasicTutorialFocusRing();
  if(!el||!ring){positionBasicTutorialCoach(step,null);return;}
  basicTutorialCurrentTarget=el;el.classList.add("tutorial-target-active");
  const rect=el.getBoundingClientRect();const pad=5;
  ring.style.left=`${Math.max(4,rect.left-pad)}px`;ring.style.top=`${Math.max(4,rect.top-pad)}px`;ring.style.width=`${Math.max(24,rect.width+pad*2)}px`;ring.style.height=`${Math.max(24,rect.height+pad*2)}px`;ring.classList.remove("hidden");
  positionBasicTutorialCoach(step,el);
}
function basicTutorialSpellWasPlayed(){
  if(basicTutorialFlags.spellPlayed)return true;
  const fireballGone=Array.isArray(privateState?.hand)&&!privateState.hand.some(c=>c?.key==="fireball");
  return fireballGone;
}
const BASIC_TUTORIAL_STEPS=[
  {id:"intro",manual:true,title:"Combate",body:"Tus unidades avanzan y atacan automáticamente; tu trabajo es administrar MANÁ, elegir qué convocar y cuándo usar magia, trampas y defensa del líder.",hint:"Pulsa Comenzar para practicar las cuatro acciones esenciales.",button:"Comenzar",targetResolver:()=>$("hallvallaRtStatus")||$("phaseBanner")},
  {id:"mana",title:"Recoge el orbe de MANÁ",body:"Empiezas con 2/2 de MANÁ y recuperas 1 cada 9 segundos. El orbe aparece cada 14 segundos: al recogerlo aumenta en +1 tu capacidad máxima y también te entrega 1 MANÁ.",hint:"Toca el orbe brillante de tu lado. Con mando también puedes usar LB.",targetResolver:()=>document.querySelector('.rt-mana-orb.own')||$("hallvallaRtStatus"),done:()=>!!basicTutorialFlags.orbCollected},
  {id:"summon",title:"Convoca una unidad",body:"Abre UNIDADES y toca una carta que puedas pagar. La invocación aparece automáticamente en una casilla libre de tu zona y desde ahí se mueve y combate por sí sola.",hint:"No necesitas moverla manualmente. El coste se descuenta al convocarla.",targetResolver:()=>hallvallaRtState?.arsenalLevel==="cards"&&hallvallaRtState?.arsenalCategory==="unit"?(getBasicTutorialRtCardEl("spearman")||getBasicTutorialRtCardEl("archer")):document.querySelector('#rtArsenalPanel [data-rt-category="unit"]'),done:()=>!!getBasicTutorialSummonedUnit()},
  {id:"auto",manual:true,title:"Movimiento y ataque automáticos",body:"Una vez invocada, la unidad busca enemigos, avanza y ataca automáticamente según su MOV y RG. Tú construyes la presión desde el Arsenal.",hint:"Observa cómo tu unidad abandona la zona de aparición y busca a la Guardia de práctica.",button:"Entendido",targetResolver:()=>getBasicTutorialBoardUnitEl(getBasicTutorialSummonedUnit())||$("grid")},
  {id:"spell",title:"Usa una magia",body:"Las magias se lanzan desde su categoría y HallValla selecciona automáticamente un objetivo válido cercano. Fireball causa daño y Quemadura; recuerda que la Quemadura ya no desaparece sola y deja la DX de la víctima en 0.",hint:"Abre MAGIAS y lanza Fireball contra la Guardia de práctica.",targetResolver:()=>hallvallaRtState?.arsenalLevel==="cards"&&hallvallaRtState?.arsenalCategory==="spell"?(getBasicTutorialRtCardEl("fireball")||document.querySelector('#rtArsenalCards .rt-arsenal-card')):document.querySelector('#rtArsenalPanel [data-rt-category="spell"]'),done:()=>basicTutorialSpellWasPlayed()},
  {id:"shield",title:"Bloquea daño con tu líder",body:"Tu líder puede activar un escudo durante 3 segundos que reduce en 50% el daño recibido. En móvil o PC toca/clica tu propio líder; con mando usa RB. El escudo no se puede prolongar mientras ya está activo.",hint:"Activa ahora el escudo de tu líder.",targetResolver:()=>getBasicTutorialBoardUnitEl(getBasicTutorialPlayerLeader()),done:()=>!!basicTutorialFlags.leaderShielded},
  {id:"victory",manual:true,final:true,title:"Cómo ganas",body:"Ganas cuando la Vida del líder rival llega a 0. No necesitas eliminar todas sus unidades. Mantén presión con unidades baratas, recoge orbes, reserva MANÁ cuando puedas y protege tu líder cuando el golpe importante vaya a entrar.",hint:"Tutorial de combate completado. Esta recompensa solo se obtiene la primera vez.",button:"Finalizar tutorial",targetResolver:()=>getBasicTutorialBoardUnitEl(getBasicTutorialEnemyLeader())}
];

let basicTutorialCoachStep=0;
let basicTutorialProgressStep=0;
function storeBasicTutorialStep(){try{localStorage.setItem(HALLVALLA_BASIC_TUTORIAL_STEP_KEY,String(basicTutorialCoachStep));}catch(e){}}
function syncBasicTutorialProgress(){
  if(!publicState||publicState.mode!=="tutorial"||basicTutorialFlags.completionHandled)return;
  let changed=false;
  while(basicTutorialCoachStep<BASIC_TUTORIAL_STEPS.length){
    const step=BASIC_TUTORIAL_STEPS[basicTutorialCoachStep];
    if(step?.manual||typeof step?.done!=="function"||!step.done())break;
    awardBasicTutorialStep(basicTutorialCoachStep);
    basicTutorialCoachStep++;
    basicTutorialProgressStep=Math.max(basicTutorialProgressStep,basicTutorialCoachStep);
    changed=true;
  }
  if(changed)storeBasicTutorialStep();
}
function advanceBasicTutorialManualStep(){
  if(!publicState||publicState.mode!=="tutorial")return;
  const step=BASIC_TUTORIAL_STEPS[basicTutorialCoachStep];if(!step?.manual)return;
  if(typeof step.canContinue==="function"&&!step.canContinue())return;
  awardBasicTutorialStep(basicTutorialCoachStep);
  if(step.final){completeBasicTutorial();return;}
  basicTutorialCoachStep=Math.min(BASIC_TUTORIAL_STEPS.length-1,basicTutorialCoachStep+1);
  basicTutorialProgressStep=Math.max(basicTutorialProgressStep,basicTutorialCoachStep);
  storeBasicTutorialStep();
  renderBasicTutorialCoach(true);
}
function completeBasicTutorial(){
  if(basicTutorialFlags.completionHandled)return;
  basicTutorialFlags.completionHandled=true;
  setBasicTutorialComplete();
  markBasicBattleTutorialSeen();
  clearBasicTutorialTargetHighlight();
  const coach=$("basicTutorialCoach");if(coach)coach.classList.add("hidden");
  setHint("Tutorial de combate completado.");
  battleSetTimeout(()=>{
    backToMainMenu();
    setTimeout(()=>{try{globalThis.startNextHallvallaSystemTutorial?.("home");}catch(_){ }},420);
  },220,"tutorial-basic-finish");
}
function exitBasicTutorialBattle(){
  clearBasicTutorialTargetHighlight();
  const coach=$("basicTutorialCoach");if(coach)coach.classList.add("hidden");
  backToMainMenu();
}
document.addEventListener("click",ev=>{
  if(!publicState||publicState.mode!=="tutorial")return;
  const cardEl=ev.target?.closest?.("#handRow .hand-card");
  if(cardEl){const card=(privateState?.hand||[]).find(c=>c.id===cardEl.dataset.id);if(card?.key)basicTutorialFlags.inspectedCardKey=card.key;}
  // Algunos controles del combate cambian estado local sin escribir Firebase.
  // Reubica la guía después del click para que el foco siga al siguiente control útil.
  battleRequestAnimationFrame(()=>renderBasicTutorialCoach(false),"tutorial-interaction-frame");
},true);
function renderBasicTutorialCoach(forceShow=false){
  if(!publicState||publicState.mode!=="tutorial"){clearBasicTutorialTargetHighlight();const coach=$("basicTutorialCoach");if(coach)coach.classList.add("hidden");return;}
  const coach=ensureBasicTutorialCoach();syncBasicTutorialProgress();const step=BASIC_TUTORIAL_STEPS[basicTutorialCoachStep]||BASIC_TUTORIAL_STEPS[0];
  setText("basicTutorialStepText",`TUTORIAL DE COMBATE · ${basicTutorialCoachStep+1}/${BASIC_TUTORIAL_STEPS.length}`);
  setText("basicTutorialCoachTitle",step.title);
  setText("basicTutorialCoachBody",step.body);
  setText("basicTutorialCoachHint",step.hint||"");
  const nextBtn=$("basicTutorialNextBtn");
  if(nextBtn){
    const manual=!!step.manual;nextBtn.classList.toggle("hidden",!manual);
    if(manual){const ready=typeof step.canContinue==="function"?!!step.canContinue():true;nextBtn.disabled=!ready;nextBtn.textContent=ready?(step.button||"Continuar"):(step.id==="draw"?"Robando…":(step.button||"Continuar"));}
  }
  if(forceShow||coach.classList.contains("hidden"))coach.classList.remove("hidden");
  battleRequestAnimationFrame(()=>applyBasicTutorialTarget(step),"tutorial-target-frame");
}

