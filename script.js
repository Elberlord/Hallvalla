import {initializeApp} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {getDatabase,ref,set,update,get,onValue} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
import {getAuth,signInAnonymously,onAuthStateChanged} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
const firebaseConfig={apiKey:"AIzaSyA6C6f3gSVDvgxcQuyD8PsyQiHNDPD_ZOQ",authDomain:"hallvalla-online.firebaseapp.com",projectId:"hallvalla-online",storageBucket:"hallvalla-online.firebasestorage.app",messagingSenderId:"496903032464",appId:"1:496903032464:web:d1e63bfead7109fc905215",databaseURL:"https://hallvalla-online-default-rtdb.firebaseio.com"};
const app=initializeApp(firebaseConfig),db=getDatabase(app),auth=getAuth(app);
const ROWS=11,COLS=5,$=id=>document.getElementById(id);
function on(id,event,handler){
  const el=$(id);
  if(!el){console.warn(`[HallValla] Elemento no encontrado: #${id}`);return null;}
  el.addEventListener(event,handler);
  return el;
}
function setText(id,value){const el=$(id);if(el)el.textContent=value;}
function showEl(id){const el=$(id);if(el)el.classList.remove("hidden");}
function hideEl(id){const el=$(id);if(el)el.classList.add("hidden");}
const LEADER_PORTRAITS={warrior:"assets/leaders/leader_warrior.webp",archer:"assets/leaders/leader_archer.webp",mage:"assets/leaders/leader_mage.webp"};
const LEADER_DATA={
  warrior:{name:"Guerrero",portrait:LEADER_PORTRAITS.warrior,desc:"Unidades +2 GUARDIA y +2 VIDA."},
  archer:{name:"Arquero",portrait:LEADER_PORTRAITS.archer,desc:"Unidades +3 ATAQUE y +3 DESTREZA."},
  mage:{name:"Hechicero",portrait:LEADER_PORTRAITS.mage,desc:"Magias y trampas -2 costo y +3 efecto."}
};
let uid=null,gameId=null,myPlayer=null,publicState=null,privateState=null,selectedCard=null,selectedUnitId=null,highlights=[],highlightType="move",handOpen=true,actionsCollapsed=(typeof window!=="undefined"&&window.matchMedia?window.matchMedia("(max-width:980px)").matches:false),unsubPub=null,unsubPriv=null,turnStartLock=false,selectedLeaderType="",leaderProfileLoaded=false,shownBattleResultKey="",aiTurnLock=false,lastAiTurnKey="",aiWatchdogTimer=null;
const GAME_SETTINGS_KEY="hallvalla_game_settings";
let gameSettings=loadGameSettings();
function loadGameSettings(){try{return{sound:true,...(JSON.parse(localStorage.getItem(GAME_SETTINGS_KEY)||"{}")||{})};}catch(e){return{sound:true};}}
function saveGameSettings(){try{localStorage.setItem(GAME_SETTINGS_KEY,JSON.stringify(gameSettings));}catch(e){}}
const CARD_TEMPLATES=[{key:"spearman",name:"Lancero solar",type:"unit",icon:"🛡️",cost:1,hp:4,atk:2,guard:2,dex:4,mov:2,range:1,text:"Unidad básica cuerpo a cuerpo."},{key:"archer",name:"Arquera del desierto",type:"unit",icon:"🏹",cost:1,hp:3,atk:2,guard:1,dex:5,mov:2,range:3,text:"Ataca a distancia."},{key:"guardian",name:"Guardián de piedra",type:"unit",icon:"🗿",cost:2,hp:6,atk:1,guard:4,dex:2,mov:1,range:1,text:"Unidad resistente."},{key:"scout",name:"Explorador de arena",type:"unit",icon:"🐍",cost:1,hp:2,atk:1,guard:1,dex:5,mov:4,range:1,text:"Unidad rápida."},{key:"bolt",name:"Maldición de arena",type:"spell",icon:"🌫️",cost:1,spell:"damage",damage:2,text:"Hace 2 de daño a una unidad o kaster rival."},{key:"blessing",name:"Bendición del faraón",type:"spell",icon:"☀️",cost:1,spell:"buff",buff:1,text:"+1 ataque a una unidad aliada este turno."}];
const ADVENTURE_SPECIALS={mulan:{key:"mulan",name:"Mulan",type:"unit",icon:"🐉",cost:2,hp:4,atk:4,guard:3,dex:4,mov:3,range:1,special:true,text:"Ataque por la espalda: si Mulan ataca desde la espalda, obtiene +6 ATQ durante ese ataque."},wallace:{key:"wallace",name:"William Wallace",type:"unit",icon:"🛡️",cost:3,hp:6,atk:6,guard:5,dex:6,mov:2,range:1,special:true,text:"Guardia Inquebrantable: cuando su Guardia reduce el daño recibido a 0, recupera +1 Vigor."}};
const ADVENTURE_RESULT_ART={mulan:{name:"Mulan",heroImage:"assets/story/scene_mulan_actor.webp",cardImage:"assets/story/mulan_choice.webp"},wallace:{name:"William Wallace",heroImage:"assets/story/scene_wallace_actor.webp",cardImage:"assets/story/wallace_choice.webp"}};


const DECK_RULES={basicMaxCopies:10,nonBasicMaxCopies:1,deckSize:60};
function cardRarity(card){
  return String(card?.rarity||card?.rareza||"Básica").toLowerCase();
}
function maxCopiesForCard(card){
  const rarity=cardRarity(card);
  return rarity==="básica"||rarity==="basica"||rarity==="basic"?DECK_RULES.basicMaxCopies:DECK_RULES.nonBasicMaxCopies;
}
function validateDeckList(cards=[]){
  const counts={};
  const errors=[];
  cards.forEach(card=>{
    const key=card.key||card.name;
    counts[key]=(counts[key]||0)+1;
    const max=maxCopiesForCard(card);
    if(counts[key]>max)errors.push(`${card.name||key}: máximo ${max} copia${max>1?"s":""}.`);
  });
  if(cards.length!==DECK_RULES.deckSize)errors.push(`El mazo debe tener ${DECK_RULES.deckSize} cartas.`);
  return{valid:errors.length===0,errors,counts};
}

const RICHARD_CARD={key:"richard_lionheart",name:"Richard Corazón de León",type:"unit",icon:"🦁",cost:4,hp:6,atk:5,guard:5,dex:6,mov:3,range:1,rarity:"Gloriosa",special:true,text:"Corazón Indomable: una vez por turno, Richard puede elegir un aliado; ese aliado obtiene +5 VIDA máxima y +5 VIDA actual mientras siga en campo. Es moral de batalla, no magia."};
const MULAN_CARD={...ADVENTURE_SPECIALS.mulan,rarity:"Heroica",text:"Ataque por la espalda: si Mulan ataca desde la espalda, obtiene +6 ATQ durante ese ataque."};
const WALLACE_CARD={...ADVENTURE_SPECIALS.wallace,icon:"🏴",rarity:"Heroica",text:"Guardia Inquebrantable: cuando su Guardia reduce el daño recibido a 0, recupera +1 Vigor."};
const LEGENDARY_ALLY_CARDS=[RICHARD_CARD,MULAN_CARD,WALLACE_CARD];
const IMPROVED_MAGIC_TRAP_PACK=[
  {key:"sand_curse_plus",name:"Maldición de arena reforzada",type:"spell",icon:"🌪️",cost:2,spell:"damage",damage:4,rarity:"Poco ordinaria",text:"Hace 4 de daño a una unidad o kaster rival. Versión mejorada de Maldición de arena."},
  {key:"pharaoh_blessing_plus",name:"Bendición real del faraón",type:"spell",icon:"👑",cost:2,spell:"buff",buff:3,rarity:"Poco ordinaria",text:"+3 ataque a una unidad aliada este turno. Ideal para remates y presión."},
  {key:"dust_guard_plus",name:"Muralla de polvo",type:"spell",icon:"🧱",cost:2,spell:"shield",guard:4,rarity:"Poco ordinaria",text:"+4 GUARDIA a una unidad aliada hasta el final del turno."},
  {key:"snare_trap_plus",name:"Trampa de cadenas",type:"trap",icon:"⛓️",cost:2,trap:"slow",slow:2,rarity:"Poco ordinaria",text:"Cuando un enemigo se mueva, reduce su MOV en 2 durante este turno."},
  {key:"warning_rune_plus",name:"Runa de contraataque",type:"trap",icon:"◇",cost:2,trap:"guard",guard:3,rarity:"Poco ordinaria",text:"Cuando una unidad aliada sea atacada, obtiene +3 GUARDIA durante ese combate."}
];

const ADVENTURE_PROGRESS_KEY="hallvalla_adventure_progress";
const ADVENTURE_GUARDIAN_BATTLE={id:"guardian_mage",num:0,isGuardian:true,title:"El guardián hechicero",enemyName:"Hechicero guardián",enemyLeaderType:"mage",image:"assets/story/guardian_intro.webp",enemyIntro:"Antes de tocar el mapa 1.1, una figura se interpone entre las ruinas del umbral. Es un mago guardián, cubierto por energía oscura y rodeado por símbolos antiguos.\n\nEsta no es todavía la campaña del mapa: es la prueba que decide si puedes entrar en ella. Derrota al Hechicero guardián para desbloquear el mapa 1.1 El inicio de la travesía.",xp:5,gold:10,cardPack:false,aiLevel:1,aiDrawBonus:0,aiHonorBonus:0,aiCardsPerTurn:1,aiStyle:"Tutorial mágico",desc:"Derrota al Hechicero guardián para desbloquear el mapa 1.1."};
const ADVENTURE_CHAPTER_1_1={id:"chapter1_1",number:"1.1",title:"El inicio de la travesía",desc:"Los rebeldes intentan usurpar el trono y crear un golpe de estado. La primera campaña empieza en la frontera, atraviesa rutas tomadas por la rebelión y termina con Richard Corazón de León poniendo a prueba al jugador antes de aceptar unir fuerzas.",introTitle:"1.1 El inicio de la travesía",introText:"El reino de HallValla apenas comienza a respirar después de años de disputas internas. El trono sigue en pie, pero su autoridad ya no pesa igual en las tierras lejanas.\n\nEn la frontera, los rumores llegan antes que los mensajeros: aldeas cerradas, caminos bloqueados, estandartes quemados y soldados que ya no responden al llamado real. Lo que al principio parece una revuelta menor pronto revela una amenaza mayor.\n\nUn grupo de rebeldes intenta usurpar el trono y provocar un golpe de estado. No buscan solamente conquistar fortalezas: quieren quebrar la confianza del pueblo, aislar al reino y entrar al salón del trono antes de que las fuerzas leales puedan reunirse.",battles:[
{id:"battle1",num:1,title:"La flecha en la frontera",legacyTitle:"Rumores en la frontera",enemyName:"Arquero rebelde",enemyLeaderType:"archer",image:"assets/story/adventure_1_1/1_1_1_rumores_en_la_frontera.webp",enemyIntro:"La primera señal llega desde los puestos fronterizos. Humo en el horizonte. Torres abandonadas. Caminos que antes eran seguros ahora están cubiertos por patrullas sin emblema.\n\nUn arquero rebelde vigila los pasos de frontera. No busca honor, busca detener tu avance antes de que comprendas la escala del golpe.",xp:5,gold:10,cardPack:true,aiLevel:1,aiDrawBonus:0,aiHonorBonus:0,aiCardsPerTurn:1,aiStyle:"Tutorial agresivo",desc:"Confirma la presencia rebelde y derrota al arquero que protege las rutas del levantamiento."},
{id:"battle2",num:2,title:"El guerrero del puente",legacyTitle:"El puente tomado",enemyName:"Guerrero rebelde",enemyLeaderType:"warrior",image:"assets/story/adventure_1_1/1_1_2_el_puente_tomado.webp",enemyIntro:"El camino hacia la capital pasa por un antiguo puente de piedra. Durante generaciones fue símbolo de unión entre las provincias, pero ahora ondean sobre él estandartes rebeldes.\n\nEl puente está tomado por un guerrero rebelde que convirtió el cruce en una muralla de escudos. Tendrás que romper su frente para avanzar.",xp:8,gold:12,cardPack:true,aiLevel:2,aiDrawBonus:0,aiHonorBonus:0,aiCardsPerTurn:2,aiStyle:"Presión frontal",desc:"Recupera el puente tomado y obliga al guerrero rebelde a retirarse."},
{id:"battle3",num:3,title:"El hechicero del estandarte",legacyTitle:"La noche del estandarte",enemyName:"Hechicero conspirador",enemyLeaderType:"mage",image:"assets/story/adventure_1_1/1_1_3_la_noche_del_estandarte.webp",enemyIntro:"La rebelión no solo ataca con espadas. También ataca símbolos.\n\nDurante la noche, un hechicero rebelde intenta alzar un estandarte falso para quebrar la moral del reino. Sus conjuros no perdonan errores. No se trata solo de vencer: se trata de impedir que el miedo cambie de bando.",xp:12,gold:15,cardPack:true,aiLevel:3,aiDrawBonus:1,aiHonorBonus:0,aiCardsPerTurn:3,aiStyle:"Control y daño directo",desc:"Derrota al hechicero que intenta convertir el símbolo rebelde en una señal de victoria."},
{id:"battle4",num:4,title:"El guerrero que no cayó",legacyTitle:"Asedio al salón del trono",enemyName:"Guerrero rebelde vengativo",enemyLeaderType:"warrior",image:"assets/story/adventure_1_1/1_1_4_asedio_al_salon_del_trono.webp",enemyIntro:"Los rebeldes han avanzado más rápido de lo esperado. Sus fuerzas llegan a las puertas del salón del trono, donde los últimos guardias leales intentan resistir.\n\nEl guerrero del puente sobrevivió a su derrota y te siguió hasta las puertas. Esta vez no viene a defender una posición: viene a cazarte.",xp:16,gold:18,cardPack:true,aiLevel:4,aiDrawBonus:1,aiHonorBonus:1,aiCardsPerTurn:3,aiStyle:"Caza del kaster",desc:"Resiste el asedio y derrota de nuevo al guerrero rebelde antes de que abra paso al golpe de estado."},
{id:"battle5",num:5,title:"La prueba de Richard",legacyTitle:"El usurpador",enemyName:"Richard Corazón de León",enemyLeaderType:"warrior",image:"assets/story/adventure_1_1/1_1_5_el_usurpador.webp",enemyIntro:"La última defensa se rompe entre humo y acero. En el interior del salón, frente al trono, espera Richard Corazón de León.\n\nNo viene como usurpador. Viene a medir tu temple. Asegura que el reino necesita guerreros capaces de sostener la corona cuando el mundo se parte. Si sobrevives a su prueba, te aceptará como aliado.",xp:20,gold:25,cardPack:false,rewardCard:"richard_lionheart",richardInDeck:true,aiLevel:5,aiDrawBonus:2,aiHonorBonus:2,aiCardsPerTurn:4,aiStyle:"Despiadada y orientada a victoria",desc:"Supera la prueba final de Richard Corazón de León para completar el mapa 1.1 y ganar su carta."}
]};
const ADVENTURE_CHAPTER_2_1={id:"chapter2_1",number:"2.1",title:"Ecos del estandarte roto",desc:"Tras la prueba de Richard, la rebelión deja de pelear como una banda dispersa. Un nuevo consejo de estrategas roba tácticas del reino y usa leyendas invocadas contra ti: Corazón de León, Mulan y Wallace aparecen ahora en manos enemigas junto a magias y trampas reforzadas.",introTitle:"2.1 Ecos del estandarte roto",introText:"El golpe fue detenido, pero no destruido. Entre cartas quemadas y juramentos rotos, los rebeldes aprendieron a copiar la fuerza de las leyendas. Ahora cada comandante enemigo carga cartas básicas, magias reforzadas, trampas más crueles y tres nombres capaces de cambiar una batalla: Richard, Mulan y Wallace.",requiresChapter:"chapter1_1",packType:"improved_magic_trap",battles:[
{id:"chapter2_1_battle1",num:1,title:"El guerrero de las tres sombras",enemyName:"Guerrero de la Vanguardia Rota",enemyLeaderType:"warrior",image:"assets/story/adventure_1_1/1_1_2_el_puente_tomado.webp",enemyIntro:"En el viejo puente recuperado, una nueva fuerza bloquea el paso. El guerrero que dirige la vanguardia ya no depende solo de soldados comunes: lleva cartas copiadas de Richard, Mulan y Wallace. Su plan es simple y brutal: aguantar el centro, invocar una leyenda y aplastar tu kaster antes de que puedas preparar defensa.",xp:24,gold:28,cardPack:true,packType:"improved_magic_trap",enemyLegendaryCards:["richard_lionheart","mulan","wallace"],aiLevel:6,aiDrawBonus:2,aiHonorBonus:2,aiCardsPerTurn:4,aiStyle:"Vanguardia legendaria",desc:"Primer combate del mapa 2.1. El enemigo usa cartas básicas, tres aliados legendarios y magias/trampas reforzadas."},
{id:"chapter2_1_battle2",num:2,title:"La arquera del paso silencioso",enemyName:"Arquera del Paso Silencioso",enemyLeaderType:"archer",image:"assets/story/adventure_1_1/1_1_1_rumores_en_la_frontera.webp",enemyIntro:"La ruta de mensajeros aparece limpia, demasiado limpia. Desde las colinas, una arquera rebelde dirige disparos calculados y usa trampas reforzadas para cortar movimiento. Si dejas una unidad herida, la convertirá en una puerta abierta hacia tu kaster.",xp:28,gold:32,cardPack:true,packType:"improved_magic_trap",enemyLegendaryCards:["richard_lionheart","mulan","wallace"],aiLevel:7,aiDrawBonus:2,aiHonorBonus:3,aiCardsPerTurn:5,aiStyle:"Control a distancia",desc:"Segundo combate del mapa 2.1. La IA prioriza daño, rango y remates con apoyo legendario."},
{id:"chapter2_1_battle3",num:3,title:"El mago del eco quebrado",enemyName:"Mago del Eco Quebrado",enemyLeaderType:"mage",image:"assets/story/adventure_1_1/1_1_3_la_noche_del_estandarte.webp",enemyIntro:"En una cámara cubierta de runas, el verdadero avance rebelde se revela: no quieren solo usurpar el trono, quieren reescribir las leyendas a su favor. El mago del eco quebrado combina hechizos baratos, trampas reforzadas y aliados legendarios para obligarte a decidir rápido o caer bajo una avalancha de conjuros.",xp:35,gold:40,cardPack:false,rewardCard:"improved_magic_trap_pack",enemyLegendaryCards:["richard_lionheart","mulan","wallace"],aiLevel:8,aiDrawBonus:3,aiHonorBonus:3,aiCardsPerTurn:5,aiStyle:"Conjuros reforzados y remate",desc:"Jefe del mapa 2.1. El enemigo usa a Richard, Mulan y Wallace con magias/trampas mejoradas."}
]};
const ADVENTURE_CHAPTERS=[ADVENTURE_CHAPTER_1_1,ADVENTURE_CHAPTER_2_1];
const ADVENTURE_CHAPTER_BY_ID=Object.fromEntries(ADVENTURE_CHAPTERS.map(ch=>[ch.id,ch]));
function uid8(){return Math.random().toString(36).slice(2,10)}function code4(){return Math.random().toString(36).slice(2,6).toUpperCase()}function shuffle(a){const b=[...a];for(let i=b.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[b[i],b[j]]=[b[j],b[i]]}return b}
function getSelectedLeaderType(){return selectedLeaderType||localStorage.getItem("hallvalla_selected_leader")||""}
async function loadLeaderProfile(){
  if(!uid)return;
  leaderProfileLoaded=false;
  const cached=localStorage.getItem("hallvalla_selected_leader")||"";
  selectedLeaderType=LEADER_DATA[cached]?cached:"";
  try{
    const snap=await get(ref(db,`users/${uid}/profile/leaderType`));
    const saved=snap.exists()?snap.val():"";
    if(LEADER_DATA[saved]){
      selectedLeaderType=saved;
      localStorage.setItem("hallvalla_selected_leader",saved);
    }else if(selectedLeaderType){
      await update(ref(db,`users/${uid}/profile`),{leaderType:selectedLeaderType,updatedAt:Date.now()});
    }
  }catch(e){
    console.warn("No se pudo cargar líder desde Firebase:",e);
  }
  leaderProfileLoaded=true;
  renderSelectedLeaderBadge();
  requireLeaderSelection();
}
async function setSelectedLeaderType(type){
  if(!LEADER_DATA[type])return;
  selectedLeaderType=type;
  localStorage.setItem("hallvalla_selected_leader",type);
  renderSelectedLeaderBadge();
  if(uid){
    try{await update(ref(db,`users/${uid}/profile`),{leaderType:type,updatedAt:Date.now()});}
    catch(e){console.warn("No se pudo guardar líder en Firebase:",e);}
  }
  $("leaderSelectOverlay").classList.add("hidden");
}
function requireLeaderSelection(){if(leaderProfileLoaded&&!getSelectedLeaderType())$("leaderSelectOverlay").classList.remove("hidden")}
function renderSelectedLeaderBadge(){const type=getSelectedLeaderType();const data=LEADER_DATA[type];const badge=$("leaderCurrentBadge");if(badge)badge.textContent=data?`Líder actual: ${data.name} · ${data.desc}`:(leaderProfileLoaded?"Elige un líder para comenzar.":"Cargando perfil de líder...")}
function applyLeaderToCard(card,leaderType){const c={...card};if(c.type==="unit"){c.guard=c.guard||0;c.dex=c.dex||0;if(leaderType==="warrior"){c.hp=(c.hp||0)+2;c.guard+=2;c.text=`${c.text} Bono Guerrero: +2 VIDA y +2 GUARDIA.`}else if(leaderType==="archer"){c.atk=(c.atk||0)+3;c.dex+=3;c.text=`${c.text} Bono Arquero: +3 ATQ y +3 DESTREZA.`}}else if((c.type==="spell"||c.type==="trap")&&leaderType==="mage"){const oldCost=c.cost||0;c.cost=Math.max(0,oldCost-2);if(typeof c.damage==="number")c.damage+=3;if(typeof c.buff==="number")c.buff+=3;if(typeof c.guard==="number")c.guard+=3;if(typeof c.slow==="number")c.slow+=3;c.text=`${c.text} Bono Hechicero: costo -2 y efecto +3.`}return c}
function makeCard(t,owner,leaderType){return {...applyLeaderToCard(t,leaderType),id:uid8(),owner,leaderType}}
function makeDeck(owner,leaderType=getSelectedLeaderType()||"warrior"){const deck=[];for(let i=0;i<60;i++)deck.push(makeCard(CARD_TEMPLATES[i%CARD_TEMPLATES.length],owner,leaderType));return shuffle(deck)}function drawCards(deck,hand,n){const d=[...(deck||[])],h=[...(hand||[])];for(let i=0;i<n;i++)if(d.length)h.push(d.shift());return{deck:d,hand:h}}
function makeLeader(owner,x,y,leaderType=getSelectedLeaderType()||"warrior"){const data=LEADER_DATA[leaderType]||LEADER_DATA.warrior;return{id:`leader${owner}`,owner,leader:true,name:`${data.name} J${owner}`,key:"kaster",icon:owner===1?"👑":"🔮",portrait:data.portrait,leaderType,x,y,hp:20,maxHp:20,atk:2,guard:0,dex:0,mov:2,range:1,moved:false,acted:false,buffAtk:0}}function makeUnit(card,x,y){return{id:uid8(),owner:card.owner,leader:false,name:card.name,key:card.key,icon:card.icon,x,y,nexoX:x,nexoY:y,hp:card.hp,maxHp:card.hp,atk:card.atk,guard:card.guard||0,dex:card.dex||0,mov:card.mov,range:card.range,moved:false,acted:false,buffAtk:0,leaderType:card.leaderType||""}}
function isMyTurn(){return publicState&&publicState.currentPlayer===myPlayer}function getUnitAt(x,y){return(publicState?.units||[]).find(u=>u.x===x&&u.y===y)}function getUnit(id){return(publicState?.units||[]).find(u=>u.id===id)}function getLeader(p){return(publicState?.units||[]).find(u=>u.owner===p&&u.leader)}function effectiveAtk(u){return Math.max(0,(u?.atk||0)+(u?.buffAtk||0))}function dist(a,b){return Math.max(Math.abs(a.x-b.x),Math.abs(a.y-b.y))}function setHint(t){setText("hint",t)}function isBattleEnded(){return !!(publicState?.phase==="ended"||publicState?.battleEnded)}async function pushLog(t){if(!gameId||!publicState)return;const logs=[t,...(publicState.log||[])].slice(0,18);await update(ref(db,`games/${gameId}/public`),{log:logs})}async function updatePublic(patch){await update(ref(db,`games/${gameId}/public`),patch)}async function updatePrivate(patch){await update(ref(db,`games/${gameId}/private/player${myPlayer}`),patch)}async function updateUnits(units){await updatePublic({units})}function getBattleOutcome(units=publicState?.units||[]){const p1Leader=(units||[]).find(u=>u.owner===1&&u.leader);const p2Leader=(units||[]).find(u=>u.owner===2&&u.leader);if(!p1Leader&&!p2Leader)return{ended:true,winner:0,loser:0,p1Leader:null,p2Leader:null};if(!p1Leader)return{ended:true,winner:2,loser:1,p1Leader:null,p2Leader};if(!p2Leader)return{ended:true,winner:1,loser:2,p1Leader,p2Leader:null};return{ended:false,p1Leader,p2Leader}}async function finalizeBattle(units,actionLog=""){if(!gameId||!publicState)return false;const outcome=getBattleOutcome(units);if(!outcome.ended)return false;clearSelection();const baseLogs=[];if(actionLog)baseLogs.push(actionLog);if(publicState.mode==="adventure"){baseLogs.push(outcome.winner===1?`Has ganado ${publicState.adventureBattleTitle||"la batalla"}. La misión avanza.`:`Has caído en ${publicState.adventureBattleTitle||"la batalla"}. Puedes reintentar.`);}else{baseLogs.push(outcome.winner?`La partida terminó. Gana J${outcome.winner}.`:"La partida terminó en un estado sin líderes.");}const nextStats1={...(publicState.playerStats?.[1]||{}),hp:outcome.p1Leader?.hp||0};const nextStats2={...(publicState.playerStats?.[2]||{}),hp:outcome.p2Leader?.hp||0};await updatePublic({units,phase:"ended",battleEnded:true,winner:outcome.winner,loser:outcome.loser,endedAt:Date.now(),currentPlayer:0,[`playerStats/1`]:nextStats1,[`playerStats/2`]:nextStats2,log:[...baseLogs,...(publicState.log||[])].slice(0,18)});return true}function resetBattleState(){selectedCard=null;selectedUnitId=null;highlights=[];highlightType="move";publicState=null;privateState=null;gameId=null;myPlayer=null;shownBattleResultKey="";if(aiWatchdogTimer){clearInterval(aiWatchdogTimer);aiWatchdogTimer=null}const resultPanel=$("adventureResultPanel");if(resultPanel)resultPanel.classList.add("hidden")}function leaveCurrentGame(){if(unsubPub){unsubPub();unsubPub=null}if(unsubPriv){unsubPriv();unsubPriv=null}resetBattleState();$("adventurePanel").classList.add("hidden");$("onlineLobby").classList.add("hidden");$("gameShell").classList.add("hidden");$("mainMenu").classList.remove("hidden");renderHomeProgress()}function maybeShowBattleResult(){const panel=$("adventureResultPanel");if(!panel)return;if(!publicState||publicState.mode!=="adventure"||publicState.phase!=="ended"||!publicState.endedAt){panel.classList.add("hidden");return}const resultKey=`${gameId}:${publicState.endedAt}`;if(shownBattleResultKey===resultKey)return;shownBattleResultKey=resultKey;const win=publicState.winner===1;
const award=completeAdventureBattleOnce(publicState);const specialKey=publicState.adventureSpecial||privateState?.adventureSpecial||pendingAdventureSpecial||"mulan";const art=ADVENTURE_RESULT_ART[specialKey]||ADVENTURE_RESULT_ART.mulan;const hero=$("adventureResultHero"),enemy=$("adventureResultEnemy"),kicker=$("adventureResultKicker"),title=$("adventureResultTitle"),text=$("adventureResultText"),note=$("adventureResultNote"),caption=$("adventureResultCaption"),card=$("adventureResultCard"),mapBtn=$("adventureResultMapBtn"),nextBtn=$("adventureResultNextBtn");if(hero){hero.src=win?art.heroImage:art.cardImage;hero.alt=art.name}if(enemy){const enemyType=publicState.playerLeaders?.[2]||"mage";enemy.src=LEADER_PORTRAITS[enemyType]||LEADER_PORTRAITS.mage;enemy.alt=publicState.adventureEnemyName||"Kaster enemigo"}if(card)card.classList.toggle("defeat",!win);if(kicker)kicker.textContent=win?(publicState.adventureIsGuardian?"Prueba del guardián completada":`${publicState.adventureChapterTitle||ADVENTURE_CHAPTER_1_1.number} · Batalla ${publicState.adventureBattleNum||1} completada`):"Misión fallida";if(title)title.textContent=win?(publicState.adventureIsGuardian?"El mapa 1.1 se ha desbloqueado":`${publicState.adventureChapterTitle||"Aventura"}: victoria`):"El guardián resistió";const pendingPackName=award.battle?.packType==="improved_magic_trap"?"Paquete reforzado pendiente de apertura":"Paquete básico pendiente de apertura";const rewardCardsText=award.battle?.rewardCard==="richard_lionheart"&&award.cards?.length?` · Carta: ${award.cards.map(c=>c.name).join(", ")}`:(award.packPending?` · ${pendingPackName}`:"");const xpLine=win?(award.awarded?` Ganaste +${award.xp} EXP, +${award.gold||0} Oro${rewardCardsText}${award.levelUps?` y subiste ${award.levelUps} nivel${award.levelUps>1?"es":""}`:""}.`:` Esta batalla ya estaba completada, no entrega recompensas extra.`):"";if(text)text.textContent=win?(publicState.adventureIsGuardian?`Derrotaste al Hechicero guardián. Ahora puedes entrar al mapa ${ADVENTURE_CHAPTER_1_1.number} ${ADVENTURE_CHAPTER_1_1.title}.${xpLine}`:`Completaste la misión ${publicState.adventureBattleTitle||""}, buen trabajo.${xpLine}`):"El enemigo te derrotó. Puedes volver a intentarlo cuando quieras.";if(note)note.textContent=win?(publicState.adventureIsGuardian?`La puerta de campaña se abre. El siguiente paso será la primera batalla del mapa ${ADVENTURE_CHAPTER_1_1.number}.`:(award.battle?.rewardCard==="richard_lionheart"?`${art.name} supera la prueba. Richard Corazón de León reconoce tu valor y se une a tus fuerzas como carta de recompensa.`:`${art.name} atraviesa al kaster enemigo. Los rebeldes retroceden, pero el golpe de estado todavía no ha terminado.`)):"Reúne Honor, reorganiza tu estrategia y vuelve a desafiar a los rebeldes.";if(caption)caption.textContent=win?"Golpe final":"Retirada";if(mapBtn)mapBtn.classList.remove("hidden");if(nextBtn){const nextId=getNextAdventureBattleId();nextBtn.classList.toggle("hidden",!win||!nextId);nextBtn.textContent=nextId?"Siguiente batalla":"Mapa completado";}panel.classList.remove("hidden")}
async function createGame(){const leaderType=getSelectedLeaderType();if(!leaderType){requireLeaderSelection();return}const code=code4(),initial=drawCards(makeDeck(1,leaderType),[],4),deck=initial.deck,hand=initial.hand;const pub={code,createdAt:Date.now(),currentPlayer:1,turn:1,phase:"main",turnKey:"1-1",playerSlots:{player1Uid:uid,player2Uid:null},playerLeaders:{1:leaderType,2:"mage"},playerStats:{1:{hp:20,honor:0,maxHonor:0,deck:deck.length,hand:hand.length},2:{hp:20,honor:0,maxHonor:0,deck:0,hand:0}},units:[makeLeader(1,Math.floor(COLS/2),ROWS-1,leaderType),makeLeader(2,Math.floor(COLS/2),0,"mage")],log:[`Duelo creado. J1 eligió ${LEADER_DATA[leaderType].name}. Mano inicial: 4 cartas. Esperando Jugador 2.`]};await set(ref(db,`games/${code}/public`),pub);await set(ref(db,`games/${code}/private/player1`),{ownerUid:uid,leaderType,deck,hand,honor:0,maxHonor:0,lastTurnStarted:"",skipFirstTurnDraw:true});enterGame(code,1)}
async function joinGame(){const leaderType=getSelectedLeaderType();if(!leaderType){requireLeaderSelection();return}const code=$("joinCode").value.trim().toUpperCase();if(!code)return $("lobbyStatus").textContent="Escribe el código.";const snap=await get(ref(db,`games/${code}/public`));if(!snap.exists())return $("lobbyStatus").textContent="No existe esa partida.";const pub=snap.val();if(pub.playerSlots?.player2Uid&&pub.playerSlots.player2Uid!==uid)return $("lobbyStatus").textContent="Partida llena.";const initial=drawCards(makeDeck(2,leaderType),[],4),deck=initial.deck,hand=initial.hand;let units=(pub.units||[]).map(u=>u.leader&&u.owner===2?makeLeader(2,Math.floor(COLS/2),0,leaderType):u);await update(ref(db,`games/${code}/public`),{"playerSlots/player2Uid":uid,"playerLeaders/2":leaderType,"units":units,"playerStats/2":{hp:20,honor:0,maxHonor:0,deck:deck.length,hand:hand.length},log:[`Jugador 2 se unió con ${LEADER_DATA[leaderType].name}. Mano inicial: 4 cartas.`,...(pub.log||[])]});await set(ref(db,`games/${code}/private/player2`),{ownerUid:uid,leaderType,deck,hand,honor:0,maxHonor:0,lastTurnStarted:"",skipFirstTurnDraw:true});enterGame(code,2)}

async function startAdventure(specialKey,battleId=ADVENTURE_GUARDIAN_BATTLE.id){
  const leaderType=getSelectedLeaderType();
  if(!leaderType){requireLeaderSelection();return}
  const specialTemplate=ADVENTURE_SPECIALS[specialKey];
  if(!specialTemplate)return;
  const battle=getAdventureBattle(battleId)||ADVENTURE_GUARDIAN_BATTLE;
  if(!isBattleUnlocked(battle)){alert("Esta batalla está bloqueada. Completa primero la batalla anterior o el mapa requerido.");openAdventureMap(specialKey);return;}
  const code=`ADV${code4()}`;
  const playerBase=makeDeck(1,leaderType);
  const playerDraw=drawCards(playerBase,[],3);
  const specialCard=makeCard(specialTemplate,1,leaderType);
  const playerDeck=playerDraw.deck;
  const playerHand=[specialCard,...playerDraw.hand];
  const enemyLeaderType=battle.enemyLeaderType||"mage";
  const enemyInitial=makeEnemyDeckForBattle(battle,enemyLeaderType);
  const chapterForBattle=getAdventureChapterForBattle(battle)||ADVENTURE_CHAPTER_1_1;
  const pub={code,mode:"adventure",adventureChapter:battle.isGuardian?"guardian_gate":chapterForBattle.id,adventureChapterTitle:battle.isGuardian?"Prueba del guardián":`${chapterForBattle.number} ${chapterForBattle.title}`,adventureIsGuardian:!!battle.isGuardian,adventureBattleId:battle.id,adventureBattleNum:battle.num,adventureBattleTitle:battle.title,adventureBattleXp:battle.xp,adventureEnemyName:battle.enemyName,adventureAiLevel:battle.aiLevel||1,adventureAiDrawBonus:battle.aiDrawBonus||0,adventureAiHonorBonus:battle.aiHonorBonus||0,adventureAiCardsPerTurn:battle.aiCardsPerTurn||2,adventureAiStyle:battle.aiStyle||"Básica",adventureSpecial:specialKey,adventureAiState:{deck:enemyInitial.deck,hand:enemyInitial.hand,honor:0,maxHonor:0,lastTurnStarted:"",skipFirstTurnDraw:true},createdAt:Date.now(),currentPlayer:1,turn:1,phase:"main",turnKey:"1-1",playerSlots:{player1Uid:uid,player2Uid:"ADVENTURE_AI"},playerLeaders:{1:leaderType,2:enemyLeaderType},playerStats:{1:{hp:20,honor:0,maxHonor:0,deck:playerDeck.length,hand:playerHand.length},2:{hp:20,honor:0,maxHonor:0,deck:enemyInitial.deck.length,hand:enemyInitial.hand.length}},units:[makeLeader(1,Math.floor(COLS/2),ROWS-1,leaderType),makeLeader(2,Math.floor(COLS/2),0,enemyLeaderType)],log:[`${battle.isGuardian?"Prueba previa":"Aventura "+chapterForBattle.number}: ${battle.title}. Rival: ${battle.enemyName}. IA nivel ${battle.aiLevel||1}. Recompensa: ${getBattleRewardLabel(battle)}.`]};
  await set(ref(db,`games/${code}/public`),pub);
  await set(ref(db,`games/${code}/private/player1`),{ownerUid:uid,leaderType,adventureSpecial:specialKey,adventureBattleId:battle.id,deck:playerDeck,hand:playerHand,honor:0,maxHonor:0,lastTurnStarted:"",skipFirstTurnDraw:true});
  await set(ref(db,`games/${code}/private/player2`),{ownerUid:"ADVENTURE_AI",leaderType:enemyLeaderType,deck:enemyInitial.deck,hand:enemyInitial.hand,honor:0,maxHonor:0,lastTurnStarted:"",skipFirstTurnDraw:true});
  $("adventurePanel").classList.add("hidden");
  enterGame(code,1);
}

function enterGame(code,player){gameId=code;myPlayer=player;shownBattleResultKey="";aiTurnLock=false;lastAiTurnKey="";if(aiWatchdogTimer){clearInterval(aiWatchdogTimer);aiWatchdogTimer=null}const resultPanel=$("adventureResultPanel");if(resultPanel)resultPanel.classList.add("hidden");$("onlineLobby").classList.add("hidden");$("mainMenu").classList.add("hidden");$("gameShell").classList.remove("hidden");if(unsubPub)unsubPub();if(unsubPriv)unsubPriv();unsubPub=onValue(ref(db,`games/${code}/public`),snap=>{publicState=snap.val();render();maybeShowBattleResult();maybeStartTurn();maybeTriggerAdventureAI()});unsubPriv=onValue(ref(db,`games/${code}/private/player${player}`),snap=>{privateState=snap.val();render();maybeShowBattleResult();maybeStartTurn();maybeTriggerAdventureAI()});aiWatchdogTimer=setInterval(()=>{if(publicState?.mode==="adventure"&&publicState.currentPlayer===2&&!isBattleEnded())maybeTriggerAdventureAI()},1800)}
function maybeTriggerAdventureAI(){
  if(!gameId||!publicState||publicState.mode!=="adventure"||publicState.currentPlayer!==2||isBattleEnded())return;
  const key=`${gameId}:${publicState.turnKey||""}:${publicState.turn||0}`;
  if(aiTurnLock||lastAiTurnKey===key)return;
  aiTurnLock=true;
  lastAiTurnKey=key;
  setTimeout(async()=>{
    try{await adventureEnemyTurn();}
    catch(e){
      console.error("[HallValla] Error en turno de IA:",e);
      lastAiTurnKey="";
      setHint("La IA encontró un tropiezo. Recuperando el turno automáticamente para J1.");
      try{
        const nextTurn=(publicState?.turn||1)+1;
        await update(ref(db,`games/${gameId}/public`),{currentPlayer:1,turn:nextTurn,turnKey:`${nextTurn}-1`,log:["Sistema: la IA tuvo un tropiezo y el turno fue recuperado para J1.",...(publicState?.log||[])].slice(0,18)});
      }catch(recoverError){console.warn("[HallValla] No se pudo recuperar automáticamente el turno de IA:",recoverError);}
    }
    finally{aiTurnLock=false;}
  },650);
}
async function maybeStartTurn(){if(!publicState||!privateState||!isMyTurn()||isBattleEnded())return;if(privateState.lastTurnStarted===publicState.turnKey)return;if(turnStartLock)return;turnStartLock=true;try{const firstTurnNoDraw=privateState.skipFirstTurnDraw===true;const drawn=firstTurnNoDraw?{deck:[...(privateState.deck||[])],hand:[...(privateState.hand||[])]}:drawCards(privateState.deck||[],privateState.hand||[],2);const honorGain=(publicState.turn||1)>=3?2:1;const maxHonor=(privateState.maxHonor||0)+honorGain;const honor=maxHonor;await updatePrivate({deck:drawn.deck,hand:drawn.hand,honor,maxHonor,lastTurnStarted:publicState.turnKey,skipFirstTurnDraw:false});const units=(publicState.units||[]).map(u=>u.owner===myPlayer?{...u,moved:false,acted:false,buffAtk:0}:u);await updatePublic({units,[`playerStats/${myPlayer}`]:{hp:getLeader(myPlayer)?.hp||20,honor,maxHonor,deck:drawn.deck.length,hand:drawn.hand.length}});await pushLog(firstTurnNoDraw?`J${myPlayer} inicia primer turno: Honor máximo +${honorGain}, recarga a ${honor}. Mano inicial: ${drawn.hand.length} cartas.`:`J${myPlayer} inicia turno: Honor máximo +${honorGain}, recarga a ${honor} y roba 2 cartas.`)}finally{turnStartLock=false}}
function summonZones(player){const l=getLeader(player);if(!l)return[];const res=[];for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++){if(getUnitAt(x,y))continue;if(dist(l,{x,y})<=1)res.push(`${x},${y}`)}return res}function moveZones(u){if(!u||u.moved)return[];const res=[];for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++){if(x===u.x&&y===u.y)continue;if(getUnitAt(x,y))continue;if(dist(u,{x,y})<=u.mov)res.push(`${x},${y}`)}return res}function attackZones(u){if(!u||u.acted)return[];return(publicState.units||[]).filter(t=>t.owner!==u.owner&&dist(u,t)<=u.range).map(t=>`${t.x},${t.y}`)}function clearSelection(){selectedCard=null;selectedUnitId=null;highlights=[];highlightType="move";render()}
function selectCard(card){if(isBattleEnded())return setHint("La batalla ya terminó.");if(!isMyTurn())return setHint("No es tu turno.");if((privateState.honor||0)<card.cost)return setHint("No tienes Honor suficiente.");selectedCard=card;selectedUnitId=null;if(card.type==="unit"){highlights=summonZones(myPlayer);highlightType="summon";setHint("Elige una casilla junto a tu kaster para kastear.")}else if(card.spell==="damage"){highlights=(publicState.units||[]).filter(u=>u.owner!==myPlayer).map(u=>`${u.x},${u.y}`);highlightType="attack";setHint("Elige un objetivo rival para el hechizo.")}else if(card.spell==="buff"){highlights=(publicState.units||[]).filter(u=>u.owner===myPlayer).map(u=>`${u.x},${u.y}`);highlightType="move";setHint(`Elige una unidad aliada para recibir +${card.buff||0} AT.`)}else if(card.spell==="shield"||card.trap==="guard"){highlights=(publicState.units||[]).filter(u=>u.owner===myPlayer).map(u=>`${u.x},${u.y}`);highlightType="move";setHint(`Elige una unidad aliada para recibir +${card.guard||0} GUARDIA.`)}else if(card.trap==="slow"){highlights=(publicState.units||[]).filter(u=>u.owner!==myPlayer&&!u.leader).map(u=>`${u.x},${u.y}`);highlightType="attack";setHint(`Elige una invocación rival para reducir MOV en ${card.slow||0}.`)}render()}
function selectUnit(u){showUnit(u);if(isBattleEnded())return setHint("La batalla ya terminó.");if(!isMyTurn()||u.owner!==myPlayer)return;selectedUnitId=u.id;selectedCard=null;highlights=[...moveZones(u),...attackZones(u)];highlightType="move";setHint("Verde: mover. Rojo: atacar. Click en la carta para ver detalles.");render()}
async function playCardOn(x,y,target){if(isBattleEnded())return setHint("La batalla ya terminó.");const card=selectedCard;if(!card)return;if((privateState.honor||0)<card.cost)return setHint("No tienes Honor suficiente.");let units=[...(publicState.units||[])];if(card.type==="unit"){if(!summonZones(myPlayer).includes(`${x},${y}`))return setHint("Casilla inválida para kasteo.");units.push(makeUnit(card,x,y));await updateUnits(units);await removeCardAndPay(card);await pushLog(`J${myPlayer} kastea ${card.name}.`)}else if(card.spell==="damage"){if(!target||target.owner===myPlayer)return setHint("Elige un objetivo rival.");const actionLog=`J${myPlayer} usa ${card.name}: ${target.name} recibe ${card.damage} daño.`;units=units.map(u=>u.id===target.id?{...u,hp:u.hp-card.damage}:u).filter(u=>u.hp>0);await updateUnits(units);await removeCardAndPay(card);if(!(await finalizeBattle(units,actionLog)))await pushLog(actionLog)}else if(card.spell==="buff"){if(!target||target.owner!==myPlayer)return setHint("Elige una unidad aliada.");units=units.map(u=>u.id===target.id?{...u,buffAtk:(u.buffAtk||0)+card.buff}:u);await updateUnits(units);await removeCardAndPay(card);await pushLog(`J${myPlayer} usa ${card.name}: ${target.name} gana +${card.buff} AT este turno.`)}else if(card.spell==="shield"||card.trap==="guard"){if(!target||target.owner!==myPlayer)return setHint("Elige una unidad aliada.");units=units.map(u=>u.id===target.id?{...u,guard:(u.guard||0)+(card.guard||0)}:u);await updateUnits(units);await removeCardAndPay(card);await pushLog(`J${myPlayer} usa ${card.name}: ${target.name} gana +${card.guard||0} GUARDIA.`)}else if(card.trap==="slow"){if(!target||target.owner===myPlayer||target.leader)return setHint("Elige una invocación rival.");units=units.map(u=>u.id===target.id?{...u,mov:Math.max(0,(u.mov||0)-(card.slow||0))}:u);await updateUnits(units);await removeCardAndPay(card);await pushLog(`J${myPlayer} activa ${card.name}: ${target.name} pierde ${card.slow||0} MOV.`)}clearSelection()}
async function removeCardAndPay(card){const hand=(privateState.hand||[]).filter(c=>c.id!==card.id);const honor=(privateState.honor||0)-card.cost;const maxHonor=privateState.maxHonor||0;await updatePrivate({hand,honor});await updatePublic({[`playerStats/${myPlayer}`]:{hp:getLeader(myPlayer)?.hp||0,honor,maxHonor,deck:(privateState.deck||[]).length,hand:hand.length}})}
async function moveUnit(u,x,y){if(isBattleEnded())return setHint("La batalla ya terminó.");if(!moveZones(u).includes(`${x},${y}`))return setHint("Movimiento inválido.");const units=(publicState.units||[]).map(it=>it.id===u.id?{...it,x,y,moved:true}:it);await updateUnits(units);await pushLog(`${u.name} se mueve a ${x+1},${y+1}.`);clearSelection()}async function attackUnit(a,d){if(isBattleEnded())return setHint("La batalla ya terminó.");if(!attackZones(a).includes(`${d.x},${d.y}`))return setHint("Objetivo fuera de rango.");const actionLog=`${a.name} ataca a ${d.name} e inflige ${effectiveAtk(a)} daño.`;let units=(publicState.units||[]).map(u=>{if(u.id===a.id)return{...u,acted:true};if(u.id===d.id)return{...u,hp:u.hp-effectiveAtk(a)};return u}).filter(u=>u.hp>0);await updateUnits(units);if(!(await finalizeBattle(units,actionLog)))await pushLog(actionLog);clearSelection()}async function endTurn(){if(isBattleEnded())return setHint("La batalla ya terminó.");if(!isMyTurn())return setHint("No es tu turno.");const next=myPlayer===1?2:1,turn=next===1?(publicState.turn||1)+1:(publicState.turn||1);await updatePublic({currentPlayer:next,turn,turnKey:`${turn}-${next}`});clearSelection();await pushLog(`Fin de turno. Ahora juega J${next}.`);if(publicState?.mode==="adventure"&&next===2)setTimeout(maybeTriggerAdventureAI,650)}
async function adventureEnemyTurn(){
  if(!gameId)return;
  const pubSnap=await get(ref(db,`games/${gameId}/public`));
  if(!pubSnap.exists())return;
  const pub=pubSnap.val();
  if(pub.mode!=="adventure"||pub.currentPlayer!==2||pub.phase==="ended")return;
  let ai=pub.adventureAiState||null;
  if(!ai){
    try{
      const privSnap=await get(ref(db,`games/${gameId}/private/player2`));
      if(privSnap.exists())ai=privSnap.val();
    }catch(e){
      console.warn("[HallValla] No se pudo leer el estado privado de IA; se usará estado público de aventura.",e);
    }
  }
  if(!ai)ai={deck:[],hand:[],honor:0,maxHonor:0,lastTurnStarted:"",skipFirstTurnDraw:false};
  if(ai.lastTurnStarted===pub.turnKey){
    const nextTurn=(pub.turn||1)+1;
    await update(ref(db,`games/${gameId}/public`),{
      currentPlayer:1,
      turn:nextTurn,
      turnKey:`${nextTurn}-1`,
      log:[`Sistema: se recuperó un turno de IA que había quedado detenido. Ahora juega J1.`,...(pub.log||[])].slice(0,18)
    });
    return;
  }

  const logs=[];
  const aiLevel=Number(pub.adventureAiLevel||1);
  const firstTurnNoDraw=ai.skipFirstTurnDraw===true;
  const aiDrawCount=2+(pub.adventureAiDrawBonus||0);
  const drawn=firstTurnNoDraw?{deck:[...(ai.deck||[])],hand:[...(ai.hand||[])]}:drawCards(ai.deck||[],ai.hand||[],aiDrawCount);
  let deck=drawn.deck, hand=drawn.hand;
  const honorGain=(pub.turn||1)>=3?2:1;
  const maxHonor=(ai.maxHonor||0)+honorGain;
  let honor=maxHonor+(pub.adventureAiHonorBonus||0);
  let units=(pub.units||[]).map(u=>u.owner===2?{...u,moved:false,acted:false,buffAtk:0}:u);

  const d=(a,b)=>Math.max(Math.abs(a.x-b.x),Math.abs(a.y-b.y));
  const at=(x,y)=>units.find(u=>u.x===x&&u.y===y);
  const leader=(owner)=>units.find(u=>u.owner===owner&&u.leader);
  const removeCard=(card)=>{hand=hand.filter(c=>c.id!==card.id)};
  const killDead=()=>{units=units.filter(u=>u.hp>0)};
  const living=(owner)=>units.filter(u=>u.owner===owner);
  const canHit=(a,t)=>!!a&&!!t&&!a.acted&&d(a,t)<=a.range;
  const playerLeaderNow=()=>leader(1);
  const enemyLeaderNow=()=>leader(2);
  const inBounds=(x,y)=>x>=0&&x<COLS&&y>=0&&y<ROWS;

  const scoreTarget=(target,damage=0,attacker=null)=>{
    if(!target)return -9999;
    const lethal=damage>=(target.hp||0);
    const leaderBonus=target.leader?(aiLevel>=4?160:aiLevel>=2?95:60):0;
    const lethalBonus=lethal?(target.leader?1000:180):0;
    const lowHpBonus=Math.max(0,30-(target.hp||0)*4);
    const threatBonus=(target.atk||0)*6+(target.range||1)*3+(target.mov||0)*2;
    const proximityBonus=attacker?Math.max(0,10-d(attacker,target))*2:0;
    return leaderBonus+lethalBonus+lowHpBonus+threatBonus+proximityBonus;
  };

  const bestTargetForDamage=(card)=>{
    const dmg=card.damage||0;
    return living(1).map(t=>({target:t,score:scoreTarget(t,dmg)})).sort((a,b)=>b.score-a.score)[0]?.target||null;
  };

  const bestAttackTarget=(attacker)=>{
    return living(1).filter(t=>canHit(attacker,t)).map(t=>({target:t,score:scoreTarget(t,effectiveAtk(attacker),attacker)})).sort((a,b)=>b.score-a.score)[0]?.target||null;
  };

  const attackWith=(attacker)=>{
    if(!attacker||attacker.acted)return false;
    const target=bestAttackTarget(attacker);
    if(!target)return false;
    const damage=effectiveAtk(attacker);
    target.hp-=damage;
    attacker.acted=true;
    logs.push(`Rival: ${attacker.name} ataca a ${target.name} e inflige ${damage} daño.`);
    killDead();
    return true;
  };

  const evaluateSummonCell=(card,cell)=>{
    const pl=playerLeaderNow(), el=enemyLeaderNow();
    let score=0;
    const cardRange=card.range||1;
    const cardAtk=card.atk||0;
    const cardHp=card.hp||0;
    const distToCaster=pl?d(cell,pl):6;
    score+=Math.max(0,12-distToCaster)*6;
    if(pl&&distToCaster<=cardRange)score+=160+cardAtk*8;
    living(1).forEach(enemy=>{
      const distToEnemy=d(cell,enemy);
      if(distToEnemy<=cardRange)score+=enemy.leader?120:40;
      if(el&&d(enemy,el)<=2&&distToEnemy<=cardRange)score+=35;
      if(distToEnemy<=enemy.range)score-=Math.max(0,(enemy.atk||0)-Math.ceil(cardHp/2))*4;
    });
    score+=(cardAtk||0)*7+(cardHp||0)*4+(card.guard||0)*3+(card.mov||0)*2;
    if(card.key==="archer"||cardRange>1)score+=aiLevel>=3?35:15;
    if(card.key==="guardian"&&el&&living(1).some(e=>d(e,el)<=3))score+=45;
    return score;
  };

  const chooseBestSummon=()=>{
    const el=enemyLeaderNow();
    if(!el)return null;
    const options=[];
    for(const card of hand.filter(c=>c.type==="unit"&&c.cost<=honor)){
      for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++){
        if(!inBounds(x,y)||at(x,y))continue;
        if(d(el,{x,y})<=1){
          const cell={x,y};
          options.push({card,cell,score:evaluateSummonCell(card,cell)-(card.cost||0)*3});
        }
      }
    }
    return options.sort((a,b)=>b.score-a.score)[0]||null;
  };

  const chooseBestBuff=()=>{
    const options=[];
    for(const card of hand.filter(c=>c.spell==="buff"&&c.cost<=honor)){
      for(const ally of living(2).filter(u=>!u.leader)){
        const immediateTarget=bestAttackTarget(ally);
        let score=(card.buff||0)*8+effectiveAtk(ally)*3+(ally.hp||0);
        if(immediateTarget)score+=scoreTarget(immediateTarget,effectiveAtk(ally)+(card.buff||0),ally)+90;
        else{
          const pl=playerLeaderNow();
          if(pl)score+=Math.max(0,10-d(ally,pl))*3;
        }
        options.push({card,ally,score});
      }
    }
    return options.sort((a,b)=>b.score-a.score)[0]||null;
  };

  const chooseBestGuard=()=>{
    const options=[];
    for(const card of hand.filter(c=>(c.spell==="shield"||c.trap==="guard")&&c.cost<=honor)){
      for(const ally of living(2).filter(u=>!u.leader)){
        const nearbyThreat=living(1).some(e=>d(e,ally)<=Math.max(1,e.range||1)+1);
        let score=(card.guard||0)*10+(ally.atk||0)*2+Math.max(0,12-(ally.hp||0))*4;
        if(nearbyThreat)score+=85;
        if(ally.key==="wallace")score+=45;
        options.push({card,ally,score});
      }
    }
    return options.sort((a,b)=>b.score-a.score)[0]||null;
  };

  const chooseBestSlow=()=>{
    const options=[];
    for(const card of hand.filter(c=>c.trap==="slow"&&c.cost<=honor)){
      for(const enemy of living(1).filter(u=>!u.leader)){
        const pl=playerLeaderNow(), el=enemyLeaderNow();
        let score=(card.slow||0)*10+(enemy.mov||0)*5+(enemy.atk||0)*4;
        if(el&&d(enemy,el)<=4)score+=45;
        if(pl&&d(enemy,pl)<=3)score+=60;
        options.push({card,target:enemy,score});
      }
    }
    return options.sort((a,b)=>b.score-a.score)[0]||null;
  };

  const chooseBestDamageSpell=()=>{
    return hand.filter(c=>c.spell==="damage"&&c.cost<=honor&&living(1).length).map(card=>{
      const target=bestTargetForDamage(card);
      const score=scoreTarget(target,card.damage||0)-(card.cost||0)*2;
      return{card,target,score};
    }).sort((a,b)=>b.score-a.score)[0]||null;
  };

  const bestMoveFor=(u)=>{
    if(!u||u.moved)return null;
    const start={x:u.x,y:u.y};
    const pl=playerLeaderNow(), el=enemyLeaderNow();
    const options=[];
    for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++){
      if(x===u.x&&y===u.y)continue;
      if(at(x,y))continue;
      if(d(u,{x,y})<=u.mov){
        const pos={x,y};
        let score=0;
        const targets=living(1).filter(t=>d(pos,t)<=u.range);
        if(targets.length){
          score+=Math.max(...targets.map(t=>scoreTarget(t,effectiveAtk(u),pos)))+110;
        }
        if(pl)score+=Math.max(0,12-d(pos,pl))*6;
        if(el&&u.key==="guardian")score+=Math.max(0,8-d(pos,el))*4;
        if(pl&&d(pos,pl)<d(start,pl))score+=25;
        options.push({x,y,score});
      }
    }
    const best=options.sort((a,b)=>b.score-a.score)[0];
    return best&&best.score>0?best:null;
  };

  const moveUnitSmart=(u)=>{
    const best=bestMoveFor(u);
    if(!best)return false;
    u.x=best.x;u.y=best.y;u.moved=true;
    logs.push(`Rival: ${u.name} se posiciona en ${best.x+1},${best.y+1}.`);
    return true;
  };

  const playDamageSpell=(choice)=>{
    if(!choice?.card||!choice?.target)return false;
    choice.target.hp-=(choice.card.damage||0);
    honor-=choice.card.cost||0;
    removeCard(choice.card);
    logs.push(`Rival usa ${choice.card.name}: ${choice.target.name} recibe ${choice.card.damage||0} daño.`);
    killDead();
    return true;
  };

  const playSummon=(choice)=>{
    if(!choice?.card||!choice?.cell)return false;
    units.push(makeUnit(choice.card,choice.cell.x,choice.cell.y));
    honor-=choice.card.cost||0;
    removeCard(choice.card);
    logs.push(`Rival kastea ${choice.card.name} en ${choice.cell.x+1},${choice.cell.y+1}.`);
    return true;
  };

  const playBuff=(choice)=>{
    if(!choice?.card||!choice?.ally)return false;
    choice.ally.buffAtk=(choice.ally.buffAtk||0)+(choice.card.buff||0);
    honor-=choice.card.cost||0;
    removeCard(choice.card);
    logs.push(`Rival usa ${choice.card.name}: ${choice.ally.name} gana +${choice.card.buff||0} AT este turno.`);
    return true;
  };

  const playGuard=(choice)=>{
    if(!choice?.card||!choice?.ally)return false;
    choice.ally.guard=(choice.ally.guard||0)+(choice.card.guard||0);
    honor-=choice.card.cost||0;
    removeCard(choice.card);
    logs.push(`Rival usa ${choice.card.name}: ${choice.ally.name} gana +${choice.card.guard||0} GUARDIA.`);
    return true;
  };

  const playSlow=(choice)=>{
    if(!choice?.card||!choice?.target)return false;
    choice.target.mov=Math.max(0,(choice.target.mov||0)-(choice.card.slow||0));
    honor-=choice.card.cost||0;
    removeCard(choice.card);
    logs.push(`Rival activa ${choice.card.name}: ${choice.target.name} pierde ${choice.card.slow||0} MOV.`);
    return true;
  };

  logs.push(firstTurnNoDraw?`${pub.adventureEnemyName||"Rival"} inicia: IA nivel ${aiLevel}. Honor ${honor}/${maxHonor}. Mano inicial: ${hand.length} cartas.`:`${pub.adventureEnemyName||"Rival"} roba ${aiDrawCount} cartas. IA ${pub.adventureAiStyle||"Básica"}. Honor ${honor}/${maxHonor}.`);

  // Plan táctico: remate primero, preparación después, presión al final.
  let cardsPlayed=0;
  const maxCards=Math.max(1,Number(pub.adventureAiCardsPerTurn||2));
  for(let step=0;step<maxCards;step++){
    const damageChoice=chooseBestDamageSpell();
    if(damageChoice&&damageChoice.target&&(damageChoice.card.damage||0)>=(damageChoice.target.hp||0)){
      playDamageSpell(damageChoice);cardsPlayed++;continue;
    }
    const buffChoice=chooseBestBuff();
    if(buffChoice&&buffChoice.score>=130){
      playBuff(buffChoice);cardsPlayed++;continue;
    }
    const guardChoice=chooseBestGuard();
    if(guardChoice&&guardChoice.score>=115){
      playGuard(guardChoice);cardsPlayed++;continue;
    }
    const slowChoice=chooseBestSlow();
    if(slowChoice&&slowChoice.score>=110){
      playSlow(slowChoice);cardsPlayed++;continue;
    }
    const summonChoice=chooseBestSummon();
    const damageAgain=chooseBestDamageSpell();
    if(damageAgain&&(!summonChoice||damageAgain.score>=summonChoice.score+20||aiLevel>=4&&damageAgain.target?.leader)){
      playDamageSpell(damageAgain);cardsPlayed++;continue;
    }
    if(summonChoice){
      playSummon(summonChoice);cardsPlayed++;continue;
    }
    if(buffChoice){
      playBuff(buffChoice);cardsPlayed++;continue;
    }
    if(guardChoice){
      playGuard(guardChoice);cardsPlayed++;continue;
    }
    if(slowChoice){
      playSlow(slowChoice);cardsPlayed++;continue;
    }
    break;
  }

  // Unidades inteligentes: atacan si conviene, si no, se reposicionan para quedar con mejor amenaza.
  const aiUnits=()=>living(2).filter(u=>!u.leader).sort((a,b)=>{
    const aHas=bestAttackTarget(a)?1:0,bHas=bestAttackTarget(b)?1:0;
    return bHas-aHas||effectiveAtk(b)-effectiveAtk(a);
  });
  for(const u of aiUnits()){
    if(!attackWith(u)){
      moveUnitSmart(u);
      attackWith(u);
    }
  }
  // El kaster rival también puede atacar si el jugador se expone, pero no se lanza a lo loco.
  const el=enemyLeaderNow();
  if(el)attackWith(el);

  if(cardsPlayed===0&&!living(2).some(u=>u.moved||u.acted))logs.push("Rival conserva recursos: no encontró una jugada útil este turno.");

  const outcome=getBattleOutcome(units);
  const nextAiState={deck,hand,honor,maxHonor,lastTurnStarted:pub.turnKey,skipFirstTurnDraw:false};
  try{
    await update(ref(db,`games/${gameId}/private/player2`),nextAiState);
  }catch(e){
    console.warn("[HallValla] Estado privado de IA no actualizado; el estado público de aventura queda como respaldo.",e);
  }
  if(outcome.ended){
    const finalLogs=[...logs,outcome.winner===2?`Has caído en ${pub.adventureBattleTitle||"la batalla"}.`:`Has ganado ${pub.adventureBattleTitle||"la batalla"}.`,...(pub.log||[])].slice(0,18);
    await update(ref(db,`games/${gameId}/public`),{
      units,
      phase:"ended",
      battleEnded:true,
      winner:outcome.winner,
      loser:outcome.loser,
      endedAt:Date.now(),
      currentPlayer:0,
      adventureAiState:nextAiState,
      [`playerStats/1`]:{...(pub.playerStats?.[1]||{}),hp:outcome.p1Leader?.hp||0},
      [`playerStats/2`]:{...(pub.playerStats?.[2]||{}),hp:outcome.p2Leader?.hp||0,honor,maxHonor,deck:deck.length,hand:hand.length},
      log:finalLogs
    });
    return;
  }
  const nextTurn=(pub.turn||1)+1;
  const finalLogs=[...logs,`Rival termina turno. Ahora juega J1.`,...(pub.log||[])].slice(0,18);
  await update(ref(db,`games/${gameId}/public`),{
    units,
    currentPlayer:1,
    adventureAiState:nextAiState,
    turn:nextTurn,
    turnKey:`${nextTurn}-1`,
    [`playerStats/1`]:{...(pub.playerStats?.[1]||{}),hp:outcome.p1Leader?.hp||0},
    [`playerStats/2`]:{hp:outcome.p2Leader?.hp||20,honor,maxHonor,deck:deck.length,hand:hand.length},
    log:finalLogs
  });
}
async function cellClick(x,y){
  const u=getUnitAt(x,y);
  if(selectedCard)return playCardOn(x,y,u);
  if(selectedUnitId){
    const s=getUnit(selectedUnitId);
    if(u&&u.owner!==myPlayer)return attackUnit(s,u);
    if(!u)return moveUnit(s,x,y);
  }
  if(u)selectUnit(u);
}
function getUnitPortraitHtml(u){
  const portrait=(u?.leader&&u?.leaderType&&LEADER_DATA[u.leaderType])?LEADER_DATA[u.leaderType].portrait:u?.portrait;
  if(portrait)return `<img src="${portrait}" alt="${escapeHtml(u.name||"Unidad")}">`;
  return `<span>${u?.icon||"✦"}</span>`;
}
function showUnit(u){
  if(!u)return;
  const inspector=$("inspector");
  $("inspectTitle").textContent=u.name;
  $("inspectSub").textContent=(u.leader?"Kaster":"Invocación")+` · J${u.owner}`;
  $("inspectArt").innerHTML=getUnitPortraitHtml(u);
  const stats=[["Vida",`${Math.max(0,u.hp)}/${u.maxHp}`],["Ataque",effectiveAtk(u)],["Guardia",u.guard||0],["Destreza",u.dex||0],["Mov",u.mov||0],["Rango",u.range||1]];
  $("inspectStats").innerHTML=stats.map(([l,v])=>`<div class="inspect-stat">${l}<strong>${v}</strong></div>`).join("");
  const ownerLabel=u.owner===myPlayer?"Tu unidad":"Unidad rival";
  $("inspectText").innerHTML=u.leader
    ? `${ownerLabel}. Si un kaster llega a 0, pierde la batalla.`
    : `${ownerLabel}. Nexo: ${u.nexoX+1},${u.nexoY+1}<br/>Toca fuera/cerrar para volver al duelo.`;
  inspector.classList.add("show");
}
function render(){if(!publicState)return;renderHud();renderBoard();renderHand();renderLog();renderDetail();renderBattleChrome();const hb=$("handBtn");if(hb)hb.classList.toggle("selected",handOpen);maybeShowBattleResult()}function renderBattleChrome(){const side=document.querySelector(".side");if(side)side.classList.toggle("actions-collapsed",!!actionsCollapsed);const btn=$("toggleActionsBtn");if(btn){btn.textContent=actionsCollapsed?"Acciones ▴":"Acciones ▾";btn.setAttribute("aria-expanded",String(!actionsCollapsed));}const sound=$("battleToggleSoundBtn");if(sound)sound.textContent=gameSettings.sound?"Sonido: activado":"Sonido: apagado";}
function renderHud(){[1,2].forEach(p=>{const st=publicState.playerStats?.[p]||{hp:0,honor:0,deck:0,hand:0},leader=getLeader(p);$(`p${p}Life`).textContent=leader?Math.max(0,leader.hp):st.hp||0;$(`p${p}Honor`).textContent=`${st.honor||0}/${st.maxHonor||0}`;$(`p${p}Deck`).textContent=st.deck||0;$(`p${p}Hand`).textContent=st.hand||0;const b=$(`p${p}Badge`);const ended=isBattleEnded();b.textContent=ended?(publicState.winner===p?"Ganó":"Fin"):publicState.currentPlayer===p?"Turno":"Espera";b.style.color=ended?(publicState.winner===p?"#8bffb8":"#d7c3a2"):publicState.currentPlayer===p?"#ffd166":"#d7c3a2"});$("phaseBanner").textContent=isBattleEnded()?(publicState.winner===myPlayer?"VICTORIA":"DERROTA"):(isMyTurn()?"TU TURNO":"ESPERA")}
function renderBoard(){
  const grid=$("grid");
  grid.innerHTML="";
  for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++){
    const cell=document.createElement("div");
    cell.className="cell";
    const key=`${x},${y}`;
    if(highlights.includes(key))cell.classList.add(highlightType==="attack"?"attackable":"valid");
    const u=getUnitAt(x,y);
    if(u){
      const c=document.createElement("div");
      c.className=`unit-card ${u.owner===1?"p1":"p2"} ${u.leader?"leader":""}`;
      c.innerHTML=`<div class="unit-portrait">${getUnitPortraitHtml(u)}</div>`;
      c.title=`${u.name} · HP ${u.hp}/${u.maxHp} · AT ${effectiveAtk(u)}`;
      c.addEventListener("click",ev=>{
        if(!selectedCard){
          ev.stopPropagation();
          cellClick(x,y);
        }
      });
      cell.appendChild(c);
    }
    cell.addEventListener("click",()=>cellClick(x,y));
    grid.appendChild(cell);
  }
}

function getCardVisualClass(card){
  const parts=[`card-type-${card?.type||"unknown"}`];
  const key=String(card?.key||"");
  const rarity=String(card?.rarity||"").toLowerCase();
  if(card?.special||rarity.includes("hero")||rarity.includes("gloriosa")||["richard_lionheart","mulan","wallace"].includes(key))parts.push("card-rarity-legend");
  else if(rarity.includes("poco")||key.endsWith("_plus"))parts.push("card-rarity-improved");
  else parts.push("card-rarity-basic");
  if(card?.spell)parts.push(`card-spell-${card.spell}`);
  if(card?.trap)parts.push("card-type-trap");
  return parts.join(" ");
}
function cardTypeLabel(card){
  if(card?.type==="unit")return card.special?"Leyenda":"Unidad";
  if(card?.type==="trap")return "Trampa";
  if(card?.spell==="damage")return "Daño";
  if(card?.spell==="buff")return "Impulso";
  if(card?.spell==="shield")return "Guardia";
  return card?.type==="spell"?"Magia":"Carta";
}
function renderHand(){$("handDrawer").classList.toggle("open",handOpen);const hand=privateState?.hand||[];$("handInfo").textContent=`Honor ${privateState?.honor||0}/${privateState?.maxHonor||0} · ${hand.length} cartas`;$("handRow").innerHTML=hand.map(c=>`<div class="hand-card ${getCardVisualClass(c)} ${selectedCard?.id===c.id?"selected":""}" data-id="${c.id}"><div class="hand-icon"><span>${c.icon}</span></div><div class="hand-tag">${cardTypeLabel(c)}</div><div class="hand-name">${c.name}</div><div class="hand-stats">Costo ${c.cost}${c.type==="unit"?` · AT ${c.atk} · HP ${c.hp} · GD ${c.guard||0} · DX ${c.dex||0} · MV ${c.mov} · RG ${c.range}`:` · Hechizo`}</div><div class="hand-text">${c.text}</div></div>`).join("");[...document.querySelectorAll(".hand-card")].forEach(el=>el.addEventListener("click",()=>{const card=hand.find(c=>c.id===el.dataset.id);if(card)selectCard(card)}))}
function renderLog(){$("log").innerHTML=(publicState.log||[]).map(t=>`<div>${escapeHtml(t)}</div>`).join("")}
function renderDetail(){
  const isAdventure=publicState?.mode==="adventure";
  if(selectedCard){$("detail").innerHTML=`<p><b>${selectedCard.icon} ${selectedCard.name}</b></p><p>Costo: ${selectedCard.cost}</p><p>${selectedCard.text}</p>`;return}
  if(selectedUnitId){
    const u=getUnit(selectedUnitId);
    if(u){$("detail").innerHTML=`<p><b>${u.icon} ${u.name}</b></p><p>HP ${u.hp}/${u.maxHp} · AT ${effectiveAtk(u)} · GD ${u.guard||0} · DX ${u.dex||0} · MV ${u.mov} · RG ${u.range}</p><p>${u.leader?"Kaster":`Nexo ${u.nexoX+1},${u.nexoY+1}`}</p>`;return}
  }
  const modeLine=isAdventure?`<p><b>Modo:</b> Aventura contra IA</p><p><b>Batalla:</b> ${escapeHtml(publicState?.adventureBattleTitle||"Aventura")}</p>`:`<p><b>Jugador:</b> ${myPlayer||"?"}</p><p><b>Código:</b> ${gameId||"..."}</p><p><b>Modo:</b> Online</p>`;
  $("detail").innerHTML=`${modeLine}<p>Líder elegido: ${LEADER_DATA[getSelectedLeaderType()]?.name||"sin elegir"}. Guerrero: unidades +2 GD/+2 VIDA. Arquero: unidades +3 AT/+3 DX. Hechicero: magias/trampas -2 costo y +3 efecto.</p><p>Honor disponible/máximo se recarga al iniciar tu turno. Toca una carta o unidad para ver detalles.</p>`
}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[m]))}

function openBattleMenu(){const panel=$("battleMenuPanel");if(panel){panel.classList.remove("hidden");renderBattleChrome();}}
function closeBattleMenu(){const panel=$("battleMenuPanel");if(panel)panel.classList.add("hidden");}
function toggleBattleActions(){actionsCollapsed=!actionsCollapsed;renderBattleChrome();}
function toggleBattleSound(){gameSettings.sound=!gameSettings.sound;saveGameSettings();renderBattleChrome();}
function resetCurrentDuelFromMenu(){
  closeBattleMenu();
  if(!gameId||!publicState){return;}
  if(publicState.mode==="adventure"){
    if(confirm("¿Reiniciar este duelo de aventura desde el inicio?"))retryCurrentAdventureBattle();
    return;
  }
  alert("Para no romper la partida del otro jugador, el reinicio directo queda reservado para aventura contra IA. En online, salgan al menú y creen una sala nueva cuando ambos estén listos.");
}
function leaveCurrentGameFromMenu(){
  closeBattleMenu();
  if(!gameId){leaveCurrentGame();return;}
  if(confirm("¿Salir del duelo y volver al menú principal?"))leaveCurrentGame();
}
on("createBtn","click",createGame);on("joinBtn","click",joinGame);on("handBtn","click",()=>{if(!gameId)return;handOpen=!handOpen;render()});on("cancelBtn","click",clearSelection);on("endBtn","click",endTurn);on("toggleActionsBtn","click",toggleBattleActions);on("battleMenuBtn","click",openBattleMenu);on("battleCloseMenuBtn","click",closeBattleMenu);on("battleToggleSoundBtn","click",toggleBattleSound);on("battleResetBtn","click",resetCurrentDuelFromMenu);on("battleLeaveBtn","click",leaveCurrentGameFromMenu);on("inspectClose","click",()=>$("inspector").classList.remove("show"));
const inspectorEl=$("inspector");
if(inspectorEl)inspectorEl.addEventListener("click",ev=>{if(ev.target===inspectorEl)inspectorEl.classList.remove("show")});

const RENAME_COST_GEMS = 100;
const defaultPlayerProfile = {
  name: "Nuevo jugador",
  level: 1,
  xp: 0,
  xpToNext: 100,
  gold: 0,
  gems: 0,
  fragments: 0,
  nameChangeCount: 0
};
function getPlayerProfile(){
  try{
    const saved = JSON.parse(localStorage.getItem("hallvalla_player_profile") || "null");
    return {...defaultPlayerProfile, ...(saved || {})};
  }catch(e){
    return {...defaultPlayerProfile};
  }
}
function savePlayerProfile(profile){
  localStorage.setItem("hallvalla_player_profile", JSON.stringify(profile));
}
function cleanPlayerName(name){
  return String(name||"").trim().replace(/\s+/g," ").slice(0,18);
}
function getRenameCost(profile=getPlayerProfile()){
  return (profile.nameChangeCount||0) <= 0 ? 0 : RENAME_COST_GEMS;
}
function openProfilePanel(){
  const profile=getPlayerProfile();
  const panel=$("profilePanel"),input=$("profileNameInput"),rule=$("profileRenameRule"),gems=$("profileGemsValue"),msg=$("profileRenameMessage");
  if(!panel)return showComingSoon("Perfil");
  const cost=getRenameCost(profile);
  if(input)input.value=profile.name||"Nuevo jugador";
  if(rule)rule.textContent=cost===0?"Este cambio de nombre es gratis.":`Cambiar el nombre cuesta ${RENAME_COST_GEMS} gemas.`;
  if(gems)gems.textContent=profile.gems||0;
  if(msg){msg.textContent="";msg.className="profile-message";}
  panel.classList.remove("hidden");
  setTimeout(()=>{if(input){input.focus();input.select();}},40);
}
function closeProfilePanel(){
  const panel=$("profilePanel");
  if(panel)panel.classList.add("hidden");
}
function setProfileMessage(text,type=""){
  const msg=$("profileRenameMessage");
  if(!msg)return;
  msg.textContent=text;
  msg.className=`profile-message ${type}`.trim();
}
function saveProfileNameChange(){
  const input=$("profileNameInput");
  const profile=getPlayerProfile();
  const currentName=cleanPlayerName(profile.name||"Nuevo jugador");
  const nextName=cleanPlayerName(input?.value||"");
  if(!nextName)return setProfileMessage("Escribe un nombre válido.","error");
  if(nextName.length<3)return setProfileMessage("El nombre debe tener al menos 3 caracteres.","error");
  if(nextName===currentName)return setProfileMessage("Ese ya es tu nombre actual.","error");
  const cost=getRenameCost(profile);
  if(cost>0 && (profile.gems||0)<cost){
    return setProfileMessage(`Necesitas ${cost} gemas para cambiar el nombre. Tienes ${profile.gems||0}.`,"error");
  }
  if(cost>0)profile.gems=(profile.gems||0)-cost;
  profile.name=nextName;
  profile.nameChangeCount=(profile.nameChangeCount||0)+1;
  savePlayerProfile(profile);
  renderPlayerProfile(profile);
  const rule=$("profileRenameRule"),gems=$("profileGemsValue");
  if(rule)rule.textContent=`Tu próximo cambio costará ${RENAME_COST_GEMS} gemas.`;
  if(gems)gems.textContent=profile.gems||0;
  setProfileMessage(cost===0?"Nombre actualizado. Este primer cambio fue gratis.":`Nombre actualizado. Se descontaron ${cost} gemas.`,"success");
}

const BASIC_MAGIC_TRAP_PACK = [
  {key:"sand_curse_basic",name:"Maldición de arena",type:"spell",icon:"🌫️",cost:1,spell:"damage",damage:2,text:"Hace 2 de daño a una unidad o kaster rival."},
  {key:"pharaoh_blessing_basic",name:"Bendición del faraón",type:"spell",icon:"☀️",cost:1,spell:"buff",buff:1,text:"+1 ataque a una unidad aliada este turno."},
  {key:"dust_guard_basic",name:"Guardia de polvo",type:"spell",icon:"🛡️",cost:1,spell:"shield",guard:2,text:"+2 GUARDIA a una unidad aliada hasta el final del turno."},
  {key:"snare_trap_basic",name:"Trampa de lazo",type:"trap",icon:"🪤",cost:1,trap:"slow",slow:1,text:"Cuando un enemigo se mueva, reduce su MOV en 1 durante este turno."},
  {key:"warning_rune_basic",name:"Runa de advertencia",type:"trap",icon:"◆",cost:1,trap:"guard",guard:1,text:"Cuando una unidad aliada sea atacada, obtiene +1 GUARDIA durante ese combate."}
];

function getPlayerCollection(){
  try{
    const saved = JSON.parse(localStorage.getItem("hallvalla_player_collection") || "null");
    return saved && typeof saved === "object" ? saved : {cards:[]};
  }catch(e){
    return {cards:[]};
  }
}
function savePlayerCollection(collection){
  localStorage.setItem("hallvalla_player_collection", JSON.stringify(collection));
}
function addCardsToCollection(cards){
  const collection = getPlayerCollection();
  collection.cards = Array.isArray(collection.cards) ? collection.cards : [];
  cards.forEach(card=>{
    const existing = collection.cards.find(c=>c.key===card.key);
    if(existing){
      existing.qty = (existing.qty || 0) + 1;
    }else{
      collection.cards.push({...card, qty:1});
    }
  });
  savePlayerCollection(collection);
  renderNotificationBadge();
  renderHomeProgress();
  return collection;
}
function grantAdventureRewards(battle){
  if(!battle || !battle.id)return {alreadyClaimed:true, xp:0, gold:0, cards:[]};
  const claimedKey = `hallvalla_reward_claimed_${battle.id}`;
  if(localStorage.getItem(claimedKey)==="true")return {alreadyClaimed:true, xp:0, gold:0, cards:[]};

  const profile = getPlayerProfile();
  const xpReward = battle.exp || battle.xp || 0;
  const goldReward = battle.gold || 0;
  profile.gold = (profile.gold || 0) + goldReward;
  savePlayerProfile(profile);
  if(xpReward>0)addPlayerXp(xpReward);
  else renderPlayerProfile(profile);

  const packCards = battle.cardPack ? BASIC_MAGIC_TRAP_PACK : [];
  if(packCards.length)addCardsToCollection(packCards);

  localStorage.setItem(claimedKey,"true");
  return {alreadyClaimed:false, xp:xpReward, gold:goldReward, cards:packCards};
}
function formatRewardLine(reward){
  if(!reward || reward.alreadyClaimed)return "Recompensa ya reclamada.";
  const parts=[];
  if(reward.xp)parts.push(`+${reward.xp} EXP`);
  if(reward.gold)parts.push(`+${reward.gold} Oro`);
  if(reward.cards?.length)parts.push(`Paquete básico: ${reward.cards.length} cartas de magia/trampa`);
  return parts.join(" · ") || "Sin recompensa.";
}


function getRewardCardsForBattle(battle){
  if(!battle)return[];
  if(battle.rewardCard==="richard_lionheart")return[{...RICHARD_CARD}];
  if(battle.rewardCard==="improved_magic_trap_pack")return IMPROVED_MAGIC_TRAP_PACK.map(c=>({...c}));
  if(battle.cardPack)return (battle.packType==="improved_magic_trap"?IMPROVED_MAGIC_TRAP_PACK:BASIC_MAGIC_TRAP_PACK).map(c=>({...c}));
  return[];
}
function getBattleRewardLabel(battle){
  if(!battle)return"";
  const parts=[];
  if(battle.xp)parts.push(`${battle.xp} EXP`);
  if(battle.gold)parts.push(`${battle.gold} Oro`);
  if(battle.rewardCard==="richard_lionheart")parts.push("Carta: Richard Corazón de León");
  else if(battle.cardPack)parts.push(battle.packType==="improved_magic_trap"?"Paquete reforzado de 5 magia/trampa":"Paquete básico de 5 magia/trampa");
  else if(battle.rewardCard==="improved_magic_trap_pack")parts.push("Paquete reforzado completo");
  return parts.join(" · ");
}

function getCurrentAdventureBattle(){
  if(!publicState)return null;
  return getAdventureBattle(publicState.adventureBattleId||ADVENTURE_GUARDIAN_BATTLE.id)||ADVENTURE_GUARDIAN_BATTLE;
}
function getNextAdventureBattle(battle){
  if(!battle)return null;
  if(battle.isGuardian)return ADVENTURE_CHAPTER_1_1.battles[0]||null;
  const chapter=getAdventureChapterForBattle(battle)||ADVENTURE_CHAPTER_1_1;
  return chapter.battles.find(b=>b.num===battle.num+1)||null;
}
function isBattleUnlocked(battle){
  if(!battle)return false;
  const progress=getAdventureProgress();
  if(battle.isGuardian)return true;
  if(!progress.guardianDefeated)return false;
  const chapterInfo=getAdventureChapterForBattle(battle)||ADVENTURE_CHAPTER_1_1;
  if(chapterInfo.requiresChapter&&!isChapterComplete(ADVENTURE_CHAPTER_BY_ID[chapterInfo.requiresChapter],progress))return false;
  const chapter=getChapterProgress(progress,chapterInfo);
  return battle.num<=Math.max(1,chapter.unlockedBattle||1);
}
function showAdventureMapFromResult(){
  const panel=$("adventureResultPanel");
  if(panel)panel.classList.add("hidden");
  if(unsubPub){unsubPub();unsubPub=null}
  if(unsubPriv){unsubPriv();unsubPriv=null}
  resetBattleState();
  $("gameShell").classList.add("hidden");
  $("mainMenu").classList.remove("hidden");
  openAdventureMap();
}
function retryCurrentAdventureBattle(){
  const panel=$("adventureResultPanel");
  if(panel)panel.classList.add("hidden");
  const battleId=publicState?.adventureBattleId||ADVENTURE_GUARDIAN_BATTLE.id;
  const specialKey=publicState?.adventureSpecial||privateState?.adventureSpecial||pendingAdventureSpecial||getAdventureProgress().selectedSpecial||"mulan";
  if(unsubPub){unsubPub();unsubPub=null}
  if(unsubPriv){unsubPriv();unsubPriv=null}
  resetBattleState();
  startAdventure(specialKey,battleId);
}

function isAdventureChapterComplete(){
  const progress=getAdventureProgress();
  const chapter=progress.chapters[ADVENTURE_CHAPTER_1_1.id];
  return ADVENTURE_CHAPTER_1_1.battles.every(b=>chapter.completedBattles?.[b.id]);
}
function canAccessDecks(){
  return isAdventureChapterComplete();
}
function openCollectionOrLocked(){
  const total=getCollectionCardTotal();
  if(!canAccessDecks()){
    alert(`Mazos bloqueados: completa el mapa 1.1 El inicio de la travesía para poder editar tus mazos. Cartas guardadas: ${total}. Paquetes pendientes: ${getPendingPackCount()}.`);
    return;
  }
  openDeckBuilder();
}
function getLegendaryCardByKey(key){
  return LEGENDARY_ALLY_CARDS.find(c=>c.key===key)||null;
}
function makeEnemyDeckForBattle(battle,enemyLeaderType){
  let baseDeck=makeDeck(2,enemyLeaderType);
  if(battle?.packType==="improved_magic_trap"||battle?.rewardCard==="improved_magic_trap_pack"){
    baseDeck=[...baseDeck,...IMPROVED_MAGIC_TRAP_PACK.map(c=>makeCard(c,2,enemyLeaderType)),...IMPROVED_MAGIC_TRAP_PACK.map(c=>makeCard(c,2,enemyLeaderType))];
  }
  const forced=[];
  if(battle?.richardInDeck)forced.push(RICHARD_CARD);
  (battle?.enemyLegendaryCards||[]).forEach(key=>{const card=getLegendaryCardByKey(key);if(card)forced.push(card);});
  const draw=drawCards(shuffle(baseDeck),[],Math.max(0,4-forced.length));
  return{deck:draw.deck,hand:[...forced.map(c=>makeCard(c,2,enemyLeaderType)),...draw.hand]};
}



let activePackOpening=null;
let activePackCards=[];
let currentDeckDraft=[];

function normalizeBasicCards(){
  BASIC_MAGIC_TRAP_PACK.forEach(c=>{if(!c.rarity)c.rarity="Básica";});
  IMPROVED_MAGIC_TRAP_PACK.forEach(c=>{if(!c.rarity)c.rarity="Poco ordinaria";});
}
normalizeBasicCards();

function getPendingPacks(){
  try{
    const packs=JSON.parse(localStorage.getItem("hallvalla_pending_packs")||"[]");
    return Array.isArray(packs)?packs:[];
  }catch(e){return[];}
}
function savePendingPacks(packs){
  localStorage.setItem("hallvalla_pending_packs",JSON.stringify(packs||[]));
  renderNotificationBadge();
  renderHomeProgress();
}
function addPendingPack(pack){
  const packs=getPendingPacks();
  packs.push({...pack,id:pack.id||`pack_${Date.now()}_${Math.random().toString(36).slice(2,7)}`,createdAt:Date.now(),opened:false});
  savePendingPacks(packs);
}
function removePendingPack(packId){
  savePendingPacks(getPendingPacks().filter(p=>p.id!==packId));
}
function getPackCards(pack){
  if(!pack)return[];
  if(pack.rewardCard==="richard_lionheart")return[{...RICHARD_CARD}];
  if(pack.type==="improved_magic_trap")return IMPROVED_MAGIC_TRAP_PACK.map(c=>({...c}));
  return BASIC_MAGIC_TRAP_PACK.map(c=>({...c}));
}
function getPendingPackCount(){return getPendingPacks().length;}
function tryPlaySound(name){
  if(!gameSettings.sound)return;
  try{const audio=new Audio(`assets/sfx/${name}.ogg`);audio.volume=.45;audio.play().catch(()=>{});}catch(e){}
}
function openPackOpening(){
  const packs=getPendingPacks();
  if(!packs.length){alert("No tienes paquetes pendientes por abrir.");return;}
  activePackOpening=packs[0];
  activePackCards=getPackCards(activePackOpening);
  const panel=$("packOpeningPanel"),grid=$("packRevealGrid"),obj=$("packOpeningObject"),hint=$("packOpeningHint"),confirm=$("confirmPackCardsBtn"),next=$("openNextPackBtn");
  if(!panel||!grid||!obj)return;
  grid.innerHTML="";
  grid.classList.add("hidden");
  obj.classList.remove("hidden","opening");
  if(hint){hint.textContent="Toca el paquete para abrirlo";hint.classList.remove("hidden")}
  if(confirm)confirm.classList.add("hidden");
  if(next)next.classList.add("hidden");
  if($("packOpeningTitle"))$("packOpeningTitle").textContent=activePackOpening.name||"Paquete básico";
  if($("packOpeningStatus"))$("packOpeningStatus").textContent="Pendiente de apertura";
  panel.classList.remove("hidden");
}
function revealActivePack(){
  if(!activePackOpening||!activePackCards.length)return;
  const grid=$("packRevealGrid"),obj=$("packOpeningObject"),hint=$("packOpeningHint"),confirm=$("confirmPackCardsBtn");
  if(obj){obj.classList.add("opening");setTimeout(()=>obj.classList.add("hidden"),850)}
  if(hint)hint.classList.add("hidden");
  tryPlaySound("pack_open");
  setTimeout(()=>{
    if(!grid)return;
    grid.innerHTML=activePackCards.map((card,i)=>`<div class="revealed-card" style="animation-delay:${i*.09}s">
      <div class="card-icon">${card.icon||"✦"}</div>
      <div><b>${escapeHtml(card.name||"Carta")}</b><span>${escapeHtml(card.rarity||card.rareza||"Básica")} · ${escapeHtml(card.type||"card")} · Costo ${card.cost??"-"}</span></div>
      <span>${escapeHtml(card.text||"")}</span>
    </div>`).join("");
    grid.classList.remove("hidden");
    if(confirm)confirm.classList.remove("hidden");
    if($("packOpeningStatus"))$("packOpeningStatus").textContent=`${activePackCards.length} cartas reveladas`;
  },520);
}
function confirmActivePackCards(){
  if(!activePackOpening||!activePackCards.length)return;
  addCardsToCollection(activePackCards);
  removePendingPack(activePackOpening.id);
  activePackOpening=null;
  activePackCards=[];
  if($("confirmPackCardsBtn"))$("confirmPackCardsBtn").classList.add("hidden");
  const remaining=getPendingPackCount();
  if($("packOpeningStatus"))$("packOpeningStatus").textContent=remaining?`Cartas agregadas. Quedan ${remaining} paquetes.`:"Cartas agregadas a colección.";
  if($("openNextPackBtn"))$("openNextPackBtn").classList.toggle("hidden",remaining<=0);
  renderHomeProgress();
}
function closePackOpening(){const panel=$("packOpeningPanel");if(panel)panel.classList.add("hidden");}

function getSavedDeck(){try{const deck=JSON.parse(localStorage.getItem("hallvalla_current_deck")||"[]");return Array.isArray(deck)?deck:[]}catch(e){return[]}}
function saveDeck(deck){localStorage.setItem("hallvalla_current_deck",JSON.stringify(deck||[]))}
function getCollectionCardsExpanded(){const collection=getPlayerCollection();return (collection.cards||[]).map(c=>({...c,qty:c.qty||1}))}
function countInDraft(cardKey){return currentDeckDraft.filter(c=>c.key===cardKey).length}
function openDeckBuilder(){
  if(!canAccessDecks()){alert(`Mazos bloqueados: completa el mapa 1.1 para editar mazos. Paquetes pendientes: ${getPendingPackCount()}. Cartas guardadas: ${getCollectionCardTotal()}.`);return;}
  currentDeckDraft=getSavedDeck();
  $("deckBuilderPanel").classList.remove("hidden");
  renderDeckBuilder();
}
function closeDeckBuilder(){$("deckBuilderPanel").classList.add("hidden")}
function addCardToDeck(cardKey){
  const card=getCollectionCardsExpanded().find(c=>c.key===cardKey);
  if(!card)return;
  const used=countInDraft(card.key);
  const maxAllowed=Math.min(card.qty||1,maxCopiesForCard(card));
  if(used>=maxAllowed||currentDeckDraft.length>=DECK_RULES.deckSize)return;
  currentDeckDraft.push({...card,qty:1});
  renderDeckBuilder();
}
function removeCardFromDeck(cardKey){const idx=currentDeckDraft.findIndex(c=>c.key===cardKey);if(idx>=0)currentDeckDraft.splice(idx,1);renderDeckBuilder();}
function renderDeckBuilder(){
  const collectionGrid=$("deckCollectionGrid"),deckList=$("currentDeckList");
  if(!collectionGrid||!deckList)return;
  const search=($("deckSearchInput")?.value||"").toLowerCase().trim();
  const typeFilter=$("deckTypeFilter")?.value||"all";
  const rarityFilter=$("deckRarityFilter")?.value||"all";
  const cards=getCollectionCardsExpanded().filter(card=>{
    const hay=`${card.name||""} ${card.text||""}`.toLowerCase();
    const typeOk=typeFilter==="all"||card.type===typeFilter;
    const rarity=cardRarity(card);
    const rarityOk=rarityFilter==="all"||
      (rarityFilter==="basic"&&(rarity==="básica"||rarity==="basica"||rarity==="basic"))||
      (rarityFilter==="glorious"&&rarity==="gloriosa")||
      (rarityFilter==="epic"&&(rarity==="épica"||rarity==="epica"))||
      (rarityFilter==="mythic"&&(rarity==="mítica"||rarity==="mitica"))||
      (rarityFilter==="legendary"&&(rarity==="legendaria"||rarity==="legendary"))||
      (rarityFilter==="demigod"&&(rarity==="semidiós"||rarity==="semidios"));
    return (!search||hay.includes(search))&&typeOk&&rarityOk;
  });
  collectionGrid.innerHTML=cards.map(card=>{
    const used=countInDraft(card.key);
    const maxAllowed=Math.min(card.qty||1,maxCopiesForCard(card));
    const disabled=used>=maxAllowed||currentDeckDraft.length>=DECK_RULES.deckSize;
    return `<div class="deck-card ${disabled?"disabled":""}">
      <div class="deck-card-top"><span class="deck-card-icon">${card.icon||"✦"}</span><span>${used}/${maxAllowed}</span></div>
      <b>${escapeHtml(card.name||"Carta")}</b>
      <small>${escapeHtml(card.rarity||card.rareza||"Básica")} · ${escapeHtml(card.type||"card")} · Costo ${card.cost??"-"}</small>
      <small>${escapeHtml(card.text||"")}</small>
      <button type="button" data-add-card="${escapeHtml(card.key)}" ${disabled?"disabled":""}>Agregar</button>
    </div>`;
  }).join("")||`<div class="notification-item"><b>No hay cartas</b><small>Abre paquetes para llenar tu colección.</small></div>`;
  collectionGrid.querySelectorAll("[data-add-card]").forEach(btn=>btn.addEventListener("click",()=>addCardToDeck(btn.dataset.addCard)));
  const grouped={};
  currentDeckDraft.forEach(card=>{if(!grouped[card.key])grouped[card.key]={...card,count:0};grouped[card.key].count++;});
  const deckItems=Object.values(grouped).sort((a,b)=>(a.cost||0)-(b.cost||0)||String(a.name).localeCompare(String(b.name)));
  deckList.innerHTML=deckItems.map(card=>`<div class="deck-list-item">
    <b>${escapeHtml(card.name)} ×${card.count}</b>
    <small>${escapeHtml(card.rarity||card.rareza||"Básica")} · ${escapeHtml(card.type||"card")} · Máx ${maxCopiesForCard(card)}</small>
    <button type="button" data-remove-card="${escapeHtml(card.key)}">Quitar 1</button>
  </div>`).join("")||`<div class="notification-item"><b>Mazo vacío</b><small>Agrega cartas desde tu colección.</small></div>`;
  deckList.querySelectorAll("[data-remove-card]").forEach(btn=>btn.addEventListener("click",()=>removeCardFromDeck(btn.dataset.removeCard)));
  const validation=validateDeckList(currentDeckDraft);
  if($("deckCountText"))$("deckCountText").textContent=`${currentDeckDraft.length}/${DECK_RULES.deckSize}`;
  if($("deckValidText"))$("deckValidText").textContent=validation.valid?"Mazo válido":(currentDeckDraft.length<DECK_RULES.deckSize?"Mazo incompleto":validation.errors[0]||"Mazo inválido");
}
function saveCurrentDeck(){
  const validation=validateDeckList(currentDeckDraft);
  if(!validation.valid){alert(`No se puede guardar todavía: ${validation.errors.join(" ")}`);return;}
  saveDeck(currentDeckDraft);
  alert("Mazo guardado.");
}

function getNotificationState(){
  try{
    const saved=JSON.parse(localStorage.getItem("hallvalla_notifications")||"null");
    return saved&&typeof saved==="object"?{lastSeenCardCount:saved.lastSeenCardCount||0,deckUnlockSeen:!!saved.deckUnlockSeen}:{lastSeenCardCount:0,deckUnlockSeen:false};
  }catch(e){
    return{lastSeenCardCount:0,deckUnlockSeen:false};
  }
}
function saveNotificationState(state){
  localStorage.setItem("hallvalla_notifications",JSON.stringify(state));
}
function getCollectionCardTotal(){
  const collection=getPlayerCollection();
  return (collection.cards||[]).reduce((sum,c)=>sum+(c.qty||0),0);
}
function getCollectionUniqueTotal(){
  const collection=getPlayerCollection();
  return (collection.cards||[]).length;
}
function getHomeProgressSummary(){
  const progress=getAdventureProgress();
  const activeChapter=getCurrentAdventureChapter(progress);
  const chapter=getChapterProgress(progress,activeChapter);
  const completed=Object.values(chapter.completedBattles||{}).filter(Boolean).length;
  const total=activeChapter.battles.length;
  return{completed,total,chapter,progress,activeChapter};
}
function getNotificationItems(){
  const openPacksBtn=$("openPacksFromNotificationsBtn"),openDeckBtn=$("openDeckBuilderFromNotificationsBtn");
  if(openPacksBtn)openPacksBtn.classList.toggle("hidden",getPendingPackCount()<=0);
  if(openDeckBtn)openDeckBtn.classList.toggle("hidden",!canAccessDecks());
  const state=getNotificationState();
  const totalCards=getCollectionCardTotal();
  const newCards=Math.max(0,totalCards-(state.lastSeenCardCount||0));
  const pendingPacks=getPendingPackCount();
  const decksUnlocked=canAccessDecks();
  const items=[];
  if(pendingPacks>0){
    items.push({type:"packs",title:"Paquetes pendientes",body:`Tienes ${pendingPacks} paquete${pendingPacks===1?"":"s"} esperando apertura.`});
  }
  if(newCards>0){
    items.push({type:"cards",title:"Paquetes/cartas nuevas",body:`Tienes ${newCards} carta${newCards===1?"":"s"} nueva${newCards===1?"":"s"} en tu colección. Se guardaron aunque los mazos estén bloqueados.`});
  }
  if(decksUnlocked&&!state.deckUnlockSeen){
    items.push({type:"decks",title:"Mazos desbloqueados",body:"Completaste el mapa 1.1. Ya puedes acceder a mazos y editar tu colección."});
  }
  return items;
}
function renderHomeProgress(){
  renderPlayerProfile();
  const summary=getHomeProgressSummary();
  const collectionTotal=getCollectionCardTotal();
  const uniqueTotal=getCollectionUniqueTotal();
  const progressTitle=$("homeProgressTitle"),progressText=$("homeProgressText"),deckStatus=$("homeDeckStatus"),collectionStatus=$("homeCollectionStatus");
  if(progressTitle)progressTitle.textContent=`${summary.activeChapter.number} ${summary.activeChapter.title}`;
  if(progressText)progressText.textContent=summary.progress.guardianDefeated?`Progreso: ${summary.completed}/${summary.total} batallas completadas. Siguiente desbloqueada: ${Math.min(summary.chapter.unlockedBattle||1,summary.total)}/${summary.total}.`:`Prueba previa pendiente: derrota al Hechicero guardián para desbloquear el mapa ${ADVENTURE_CHAPTER_1_1.number}.`;
  if(deckStatus)deckStatus.textContent=canAccessDecks()?"Mazos desbloqueados":"Mazos bloqueados";
  const pendingPacks=getPendingPackCount();
  if(collectionStatus)collectionStatus.textContent=canAccessDecks()?`Colección: ${collectionTotal} cartas (${uniqueTotal} únicas). Paquetes: ${pendingPacks}. Regla: Básicas x10, demás x1.`:`Colección: ${collectionTotal} cartas guardadas. Paquetes pendientes: ${pendingPacks}. Completa 1.1 para editar mazos.`;
  renderNotificationBadge();
}
function renderNotificationBadge(){
  const badge=$("notificationBadge");
  if(!badge)return;
  const count=getNotificationItems().length;
  badge.textContent=count>9?"9+":String(count);
  badge.classList.toggle("hidden",count<=0);
}
function openNotifications(){
  const panel=$("notificationsPanel"),list=$("notificationsList");
  if(!panel||!list)return;
  const items=getNotificationItems();
  if(items.length){
    list.innerHTML=items.map(item=>`<div class="notification-item"><b>${escapeHtml(item.title)}</b><small>${escapeHtml(item.body)}</small></div>`).join("");
  }else{
    const collectionTotal=getCollectionCardTotal();
    list.innerHTML=`<div class="notification-item"><b>Sin avisos nuevos</b><small>Colección actual: ${collectionTotal} cartas. ${canAccessDecks()?"Mazos disponibles.":"Mazos bloqueados hasta completar 1.1."}</small></div>`;
  }
  const state=getNotificationState();
  state.lastSeenCardCount=getCollectionCardTotal();
  if(canAccessDecks())state.deckUnlockSeen=true;
  saveNotificationState(state);
  renderNotificationBadge();
  panel.classList.remove("hidden");
}
function closeNotifications(){
  const panel=$("notificationsPanel");
  if(panel)panel.classList.add("hidden");
}

function xpNeededForLevel(level){
  return 100 + Math.max(0, level - 1) * 50;
}
function renderPlayerProfile(profile=getPlayerProfile()){
  profile.xpToNext = profile.xpToNext || xpNeededForLevel(profile.level || 1);
  if($("playerName"))$("playerName").textContent = profile.name || "Nuevo jugador";
  if($("playerLevel"))$("playerLevel").textContent = `Nv. ${profile.level || 1}`;
  if($("playerRank"))$("playerRank").textContent = canAccessDecks() ? "Comandante" : "Recluta";
  if($("goldValue"))$("goldValue").textContent = profile.gold || 0;
  if($("gemsValue"))$("gemsValue").textContent = profile.gems || 0;
  if($("fragmentsValue"))$("fragmentsValue").textContent = profile.fragments || 0;
  const pct = Math.max(0, Math.min(100, ((profile.xp || 0) / profile.xpToNext) * 100));
  if($("xpText"))$("xpText").textContent = `${profile.xp || 0}/${profile.xpToNext}`;
  requestAnimationFrame(()=>{if($("xpFill"))$("xpFill").style.width = pct + "%";});
}
function addPlayerXp(amount){
  const profile = getPlayerProfile();
  const beforeLevel = profile.level || 1;
  let levelUps = 0;
  profile.xp = (profile.xp || 0) + amount;
  while(profile.xp >= xpNeededForLevel(profile.level)){
    profile.xp -= xpNeededForLevel(profile.level);
    profile.level += 1;
    levelUps += 1;
  }
  profile.xpToNext = xpNeededForLevel(profile.level);
  savePlayerProfile(profile);
  renderPlayerProfile(profile);
  return {profile, beforeLevel, levelUps, amount};
}

renderSelectedLeaderBadge();
document.querySelectorAll("[data-leader-choice]").forEach(btn=>{
  btn.addEventListener("click",async()=>{
    const type=btn.dataset.leaderChoice;
    await setSelectedLeaderType(type);
    const data=LEADER_DATA[type];
    if(data)alert(`Líder elegido: ${data.name}. ${data.desc}`);
  });
});



function getAdventureChapterForBattle(battle){
  if(!battle||battle.isGuardian)return null;
  return ADVENTURE_CHAPTERS.find(ch=>ch.battles.some(b=>b.id===battle.id))||ADVENTURE_CHAPTER_1_1;
}
function getAdventureBattle(battleId){
  if(battleId===ADVENTURE_GUARDIAN_BATTLE.id)return ADVENTURE_GUARDIAN_BATTLE;
  for(const chapter of ADVENTURE_CHAPTERS){
    const found=chapter.battles.find(b=>b.id===battleId);
    if(found)return found;
  }
  return null;
}
function getChapterProgress(progress,chapter){
  return progress.chapters?.[chapter.id]||{unlockedBattle:1,completedBattles:{}};
}
function isChapterComplete(chapter,progress=getAdventureProgress()){
  const ch=getChapterProgress(progress,chapter);
  return chapter.battles.every(b=>ch.completedBattles?.[b.id]);
}
function getCurrentAdventureChapter(progress=getAdventureProgress()){
  if(!progress.guardianDefeated)return ADVENTURE_CHAPTER_1_1;
  for(const chapter of ADVENTURE_CHAPTERS){
    if(chapter.requiresChapter&&!isChapterComplete(ADVENTURE_CHAPTER_BY_ID[chapter.requiresChapter],progress))continue;
    if(!isChapterComplete(chapter,progress))return chapter;
  }
  return ADVENTURE_CHAPTERS[ADVENTURE_CHAPTERS.length-1];
}
function getAdventureProgress(){
  const blank=()=>({selectedSpecial:"",guardianDefeated:false,guardianRewardClaimed:false,chapters:Object.fromEntries(ADVENTURE_CHAPTERS.map(ch=>[ch.id,{unlockedBattle:1,completedBattles:{}}]))});
  try{
    const saved=JSON.parse(localStorage.getItem(ADVENTURE_PROGRESS_KEY)||"null")||{};
    const progress=blank();
    progress.selectedSpecial=saved.selectedSpecial||"";
    progress.guardianDefeated=!!saved.guardianDefeated;
    progress.guardianRewardClaimed=!!saved.guardianRewardClaimed;
    ADVENTURE_CHAPTERS.forEach(ch=>{
      const savedChapter=saved.chapters?.[ch.id]||{};
      progress.chapters[ch.id]={
        unlockedBattle:Math.max(1,savedChapter.unlockedBattle||1),
        completedBattles:savedChapter.completedBattles||{}
      };
    });
    return progress;
  }catch(e){
    return blank();
  }
}
function saveAdventureProgress(progress){
  localStorage.setItem(ADVENTURE_PROGRESS_KEY,JSON.stringify(progress));
}
function setAdventureSpecialInProgress(specialKey){
  const progress=getAdventureProgress();
  if(ADVENTURE_SPECIALS[specialKey])progress.selectedSpecial=specialKey;
  saveAdventureProgress(progress);
  return progress;
}
function completeAdventureBattleOnce(pub){
  if(!pub||pub.mode!=="adventure"||pub.winner!==1)return{awarded:false,xp:0,gold:0,levelUps:0,cards:[]};
  const battle=getAdventureBattle(pub.adventureBattleId||ADVENTURE_GUARDIAN_BATTLE.id)||ADVENTURE_CHAPTER_1_1.battles[0];
  const chapterForBattle=getAdventureChapterForBattle(battle)||ADVENTURE_CHAPTER_1_1;
  const progress=getAdventureProgress();
  if(pub.adventureSpecial)progress.selectedSpecial=pub.adventureSpecial;
  if(battle.isGuardian){
    const already=progress.guardianRewardClaimed===true;
    progress.guardianDefeated=true;
    progress.guardianRewardClaimed=true;
    saveAdventureProgress(progress);
    if(already){
      renderHomeProgress();
      return{awarded:false,xp:battle.xp||0,gold:battle.gold||0,levelUps:0,cards:[],battle,progress,guardianUnlocked:true};
    }
    const xpResult=addPlayerXp(battle.xp||0);
    const profile=getPlayerProfile();
    profile.gold=(profile.gold||0)+(battle.gold||0);
    savePlayerProfile(profile);
    renderPlayerProfile(profile);
    renderHomeProgress();
    return{awarded:true,xp:battle.xp||0,gold:battle.gold||0,levelUps:xpResult.levelUps,cards:[],battle,progress,profile,guardianUnlocked:true};
  }
  const chapter=progress.chapters[chapterForBattle.id];
  if(chapter.completedBattles[battle.id]){
    saveAdventureProgress(progress);
    return{awarded:false,xp:battle.xp||0,gold:battle.gold||0,levelUps:0,cards:getRewardCardsForBattle(battle),battle,progress};
  }
  chapter.completedBattles[battle.id]=true;
  chapter.unlockedBattle=Math.max(chapter.unlockedBattle||1,Math.min(chapterForBattle.battles.length,battle.num+1));
  saveAdventureProgress(progress);

  const xpResult=addPlayerXp(battle.xp||0);
  const profile=getPlayerProfile();
  profile.gold=(profile.gold||0)+(battle.gold||0);
  savePlayerProfile(profile);
  renderPlayerProfile(profile);

  let rewardCards=[];
  if(battle.rewardCard==="richard_lionheart"||battle.rewardCard==="improved_magic_trap_pack"){
    rewardCards=getRewardCardsForBattle(battle);
    if(rewardCards.length)addCardsToCollection(rewardCards);
  }else if(battle.cardPack){
    addPendingPack({name:battle.packType==="improved_magic_trap"?"Paquete reforzado de magia/trampa":"Paquete básico de magia/trampa",type:battle.packType||"basic_magic_trap",battleId:battle.id,chapterId:chapterForBattle.id});
    rewardCards=getRewardCardsForBattle(battle);
  }
  renderHomeProgress();

  return{awarded:true,xp:battle.xp||0,gold:battle.gold||0,levelUps:xpResult.levelUps,cards:rewardCards,battle,progress,profile,packPending:!!battle.cardPack};
}
function getNextAdventureBattleId(){
  const progress=getAdventureProgress();
  if(!progress.guardianDefeated)return ADVENTURE_GUARDIAN_BATTLE.id;
  for(const chapter of ADVENTURE_CHAPTERS){
    if(chapter.requiresChapter&&!isChapterComplete(ADVENTURE_CHAPTER_BY_ID[chapter.requiresChapter],progress))continue;
    const ch=getChapterProgress(progress,chapter);
    const next=chapter.battles.find(b=>!ch.completedBattles[b.id]&&b.num<=ch.unlockedBattle);
    if(next)return next.id;
  }
  return "";
}
function openAdventureMap(specialKey=pendingAdventureSpecial||getAdventureProgress().selectedSpecial||"mulan"){
  pendingAdventureSpecial=ADVENTURE_SPECIALS[specialKey]?specialKey:"mulan";
  setAdventureSpecialInProgress(pendingAdventureSpecial);
  const progress=getAdventureProgress();
  $("adventurePanel").classList.remove("hidden");
  if(!progress.guardianDefeated){
    showAdventureGuardianIntro(pendingAdventureSpecial,ADVENTURE_GUARDIAN_BATTLE.id);
    return;
  }
  showAdventureStage("adventureMapStage");
  renderAdventureMap();
}
function renderAdventureMap(){
  const progress=getAdventureProgress();
  const activeChapter=getCurrentAdventureChapter(progress);
  const chapter=getChapterProgress(progress,activeChapter);
  const special=ADVENTURE_SPECIALS[progress.selectedSpecial||pendingAdventureSpecial]||ADVENTURE_SPECIALS.mulan;
  const title=$("adventureMapTitle"), text=$("adventureMapText"), meta=$("adventureMapMeta"), nodes=$("adventureMapNodes");
  if(title)title.textContent=`${activeChapter.number} ${activeChapter.title}`;
  if(text)text.textContent=activeChapter.desc;
  const completedCount=Object.values(chapter.completedBattles||{}).filter(Boolean).length;
  if(meta)meta.textContent=`Aliado: ${special.name} · Batallas completadas: ${completedCount}/${activeChapter.battles.length}`;
  if(!nodes)return;
  nodes.innerHTML=activeChapter.battles.map(b=>{
    const completed=!!chapter.completedBattles[b.id];
    const unlocked=b.num<=chapter.unlockedBattle;
    const state=completed?"completed":unlocked?"unlocked":"locked";
    const label=completed?"Completada":unlocked?"Iniciar combate":"Bloqueada";
    return `<button class="map-node ${state}" type="button" data-battle-id="${b.id}" ${unlocked?"":"disabled"}>
      <span class="map-node-number">${activeChapter.number}.${b.num}</span>
      <strong>${escapeHtml(b.title)}</strong>
      <small>${escapeHtml(b.desc)}</small>
      <em>${getBattleRewardLabel(b)} · ${label}</em>
    </button>`;
  }).join("");
  nodes.querySelectorAll(".map-node:not(.locked)").forEach(btn=>{
    btn.addEventListener("click",()=>showAdventureGuardianIntro(pendingAdventureSpecial,btn.dataset.battleId));
  });
}

const ADVENTURE_STORY_SCENES=[
  {title:"El llamado de HallValla",mark:"",cls:"scene-call",image:"assets/story/hallvalla_call.webp",text:"En los confines de HallValla, donde las viejas guerras dejaron cicatrices sobre la tierra, el Honor vuelve a llamar.\n\nNo todos nacen para mandar ejércitos, pero quienes escuchan ese llamado deben cruzar el campo y demostrar que su voluntad pesa más que el miedo.\n\nHoy comienza tu camino."},
  {title:"Dos leyendas responden",mark:"",cls:"scene-heroes",image:"assets/story/hallvalla_call.webp",leftActor:"assets/story/scene_mulan_actor.webp",rightActor:"assets/story/scene_wallace_actor.webp",text:"Antes de tu primera batalla, dos héroes se alzan entre las ruinas.\n\nMulan representa precisión, movimiento y decisión. William Wallace representa coraje, resistencia y fuerza frontal.\n\nAmbos son héroes de su propia historia. Uno de ellos peleará a tu lado en esta primera prueba."}
];
let adventureStoryIndex=0,pendingAdventureSpecial="",pendingAdventureBattleId="battle1";
function openAdventureStory(){
  const progress=getAdventureProgress();
  if(progress.selectedSpecial){
    pendingAdventureSpecial=progress.selectedSpecial;
    if(!progress.guardianDefeated){
      $("adventurePanel").classList.remove("hidden");
      return showAdventureGuardianIntro(progress.selectedSpecial,ADVENTURE_GUARDIAN_BATTLE.id);
    }
    return openAdventureMap(progress.selectedSpecial);
  }
  pendingAdventureSpecial="";
  $("adventurePanel").classList.remove("hidden");
  showAdventureStoryScene(0);
}
function scrollAdventureToTop(){
  const card=document.querySelector(".adventure-card");
  if(card) card.scrollTop=0;
  const panel=$("adventurePanel");
  if(panel) panel.scrollTop=0;
}
function showAdventureStage(stage){
  ["adventureStoryStage","adventureChoiceStage","adventureWoundedStage","adventureGuardianStage","adventureMapStage"].forEach(id=>$(id).classList.toggle("hidden",id!==stage));
  requestAnimationFrame(scrollAdventureToTop);
}
function applyAdventureSceneVisual(visualId, markId, cls, mark, image){
  const visual=$(visualId), markEl=$(markId);
  visual.className=`adventure-scene-visual ${cls}${image?" has-art":""}`;
  visual.style.backgroundImage=image?`linear-gradient(180deg,rgba(0,0,0,.03),rgba(0,0,0,.24)), url('${image}')`:"";
  if(markEl){
    if(image){markEl.textContent="";markEl.classList.add("hidden");}
    else {markEl.textContent=mark||"";markEl.classList.remove("hidden");}
  }
}
function setAdventureStoryActors(leftSrc,rightSrc){
  const wrap=$("adventureSceneActors"), left=$("adventureSceneActorLeft"), right=$("adventureSceneActorRight");
  if(!wrap||!left||!right)return;
  if(leftSrc||rightSrc){
    wrap.classList.remove("hidden");
    if(leftSrc){left.src=leftSrc;left.alt="Mulan";left.classList.remove("hidden");} else {left.removeAttribute("src");left.classList.add("hidden");}
    if(rightSrc){right.src=rightSrc;right.alt="William Wallace";right.classList.remove("hidden");} else {right.removeAttribute("src");right.classList.add("hidden");}
  }else{
    wrap.classList.add("hidden");
    left.removeAttribute("src");right.removeAttribute("src");
  }
}
function setAdventureGuardianActor(src){
  const wrap=$("adventureGuardianActorWrap"), img=$("adventureGuardianActor");
  if(!wrap||!img)return;
  if(src){img.src=src;wrap.classList.remove("hidden");}
  else{img.removeAttribute("src");wrap.classList.add("hidden");}
}
function showAdventureStoryScene(index){
  adventureStoryIndex=Math.max(0,Math.min(index,ADVENTURE_STORY_SCENES.length-1));
  const s=ADVENTURE_STORY_SCENES[adventureStoryIndex];
  showAdventureStage("adventureStoryStage");
  applyAdventureSceneVisual("adventureSceneVisual","adventureSceneMark",s.cls,s.mark,s.image);
  setAdventureStoryActors(s.leftActor,s.rightActor);
  $("adventureStoryTitle").textContent=s.title;
  $("adventureStoryText").textContent=s.text;
  $("adventureProgress").textContent=`${adventureStoryIndex+1}/${ADVENTURE_STORY_SCENES.length}`;
  $("nextAdventureStoryBtn").textContent=adventureStoryIndex===ADVENTURE_STORY_SCENES.length-1?"Elegir aliado":"Continuar";
}
function nextAdventureStoryScene(){
  if(adventureStoryIndex>=ADVENTURE_STORY_SCENES.length-1)return showAdventureChoice();
  showAdventureStoryScene(adventureStoryIndex+1);
}
function showAdventureChoice(){setAdventureStoryActors("","");showAdventureStage("adventureChoiceStage")}
const ADVENTURE_WOUNDED_SCENES={
  mulan:{
    title:"El peso del acero",
    mark:"",
    cls:"scene-wallace-wounded",
    image:"assets/story/wallace_wounded.webp",
    text:"Entre piedra quebrada y polvo de guerra, William Wallace cae sobre una rodilla. Una herida reciente le impide entrar en esta primera batalla, pero su mirada sigue firme.\n\n“Esta vez no marcharé contigo, pero eso no cambia lo que eres capaz de hacer.”\n\n“Ve. Lucha con decisión. Haz que HallValla recuerde tu nombre.”"
  },
  wallace:{
    title:"La hoja que sigue en pie",
    mark:"",
    cls:"scene-mulan-wounded",
    image:"assets/story/mulan_wounded.webp",
    text:"A un lado del camino, Mulan se sostiene de su espada mientras contiene el dolor de una herida reciente. No puede entrar en esta prueba, pero su temple no se quiebra.\n\n“No subestimes a ese hechicero. Su poder espera el momento exacto para golpear.”\n\n“Yo seguiré en pie. Esta batalla debes ganarla tú.”"
  }
};
function showAdventureWoundedIntro(specialKey){
  pendingAdventureSpecial=specialKey;
  setAdventureSpecialInProgress(specialKey);
  const s=ADVENTURE_WOUNDED_SCENES[specialKey]||ADVENTURE_WOUNDED_SCENES.mulan;
  setAdventureGuardianActor("");
  showAdventureStage("adventureWoundedStage");
  applyAdventureSceneVisual("adventureWoundedVisual","adventureWoundedMark",s.cls,s.mark,s.image);
  $("adventureWoundedTitle").textContent=s.title;
  $("adventureWoundedText").textContent=s.text;
}
function showAdventureGuardianIntro(specialKey=pendingAdventureSpecial,battleId=ADVENTURE_GUARDIAN_BATTLE.id){
  pendingAdventureSpecial=ADVENTURE_SPECIALS[specialKey]?specialKey:"mulan";
  pendingAdventureBattleId=battleId||ADVENTURE_GUARDIAN_BATTLE.id;
  const battle=getAdventureBattle(pendingAdventureBattleId)||ADVENTURE_GUARDIAN_BATTLE;
  showAdventureStage("adventureGuardianStage");
  applyAdventureSceneVisual("adventureGuardianVisual","adventureGuardianMark","scene-guardian","",battle.image||"assets/story/guardian_intro.webp");
  setAdventureGuardianActor("");
  const introChapter=getAdventureChapterForBattle(battle)||ADVENTURE_CHAPTER_1_1;
  $("adventureGuardianTitle").textContent=battle.isGuardian?battle.title:`${introChapter.number}.${battle.num} ${battle.title}`;
  const introConflict=introChapter.id===ADVENTURE_CHAPTER_2_1.id?"La rebelión ahora pelea con cartas legendarias copiadas y magias/trampas reforzadas.":"Los rebeldes intentan usurpar el trono y crear un golpe de estado.";
  $("adventureGuardianText").textContent=`${battle.enemyIntro||battle.desc}\n\n${introConflict} Derrota a ${battle.enemyName||"el rival"} para avanzar en el mapa.\n\nIA enemiga: nivel ${battle.aiLevel||1} · ${battle.aiStyle||"Básica"}\nRecompensa al ganar: ${getBattleRewardLabel(battle)}.`;
}
function showOnlineLobby(){
  $("mainMenu").classList.add("hidden");
  $("onlineLobby").classList.remove("hidden");
  $("gameShell").classList.add("hidden");
}
function backToMainMenu(){
  leaveCurrentGame();
}
function showComingSoon(name){
  alert(`${name} estará disponible próximamente.`);
}

on("onlineBtn","click",showOnlineLobby);
on("playBtn","click",showOnlineLobby);
on("backMenuFromLobby","click",backToMainMenu);

on("adventureBtn","click",openAdventureStory);
on("closeAdventureBtn","click",()=>$("adventurePanel").classList.add("hidden"));
on("skipAdventureStoryBtn","click",showAdventureChoice);
on("nextAdventureStoryBtn","click",nextAdventureStoryScene);
on("backToAdventureChoiceBtn","click",()=>openAdventureMap(pendingAdventureSpecial));
on("closeAdventureMapBtn","click",()=>$("adventurePanel").classList.add("hidden"));
on("skipWoundedSceneBtn","click",()=>showAdventureGuardianIntro(pendingAdventureSpecial,ADVENTURE_GUARDIAN_BATTLE.id));
on("continueWoundedSceneBtn","click",()=>showAdventureGuardianIntro(pendingAdventureSpecial,ADVENTURE_GUARDIAN_BATTLE.id));
on("startAdventureBattleBtn","click",()=>{if(pendingAdventureSpecial)startAdventure(pendingAdventureSpecial,pendingAdventureBattleId)});
on("adventureResultHomeBtn","click",backToMainMenu);

const resultMapBtn=$("adventureResultMapBtn");
if(resultMapBtn)resultMapBtn.addEventListener("click",showAdventureMapFromResult);
const resultRetryBtn=$("adventureResultRetryBtn");
if(resultRetryBtn)resultRetryBtn.addEventListener("click",retryCurrentAdventureBattle);

on("adventureResultNextBtn","click",()=>{
  const panel=$("adventureResultPanel");
  if(panel)panel.classList.add("hidden");
  const nextId=getNextAdventureBattleId();
  if(nextId){
    const special=getAdventureProgress().selectedSpecial||pendingAdventureSpecial||"mulan";
    leaveCurrentGame();
    $("mainMenu").classList.add("hidden");
    showAdventureGuardianIntro(special,nextId);
    $("adventurePanel").classList.remove("hidden");
  }
});
on("adventureResultCloseBtn","click",()=>$("adventureResultPanel").classList.add("hidden"));
document.querySelectorAll("[data-adventure-special]").forEach(btn=>btn.addEventListener("click",()=>showAdventureWoundedIntro(btn.dataset.adventureSpecial)));
on("notificationsBtn","click",openNotifications);
on("closeNotificationsBtn","click",closeNotifications);

const packObject=$("packOpeningObject");
if(packObject){packObject.addEventListener("click",revealActivePack);packObject.addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();revealActivePack();}});}
on("closePackOpeningBtn","click",closePackOpening);
on("confirmPackCardsBtn","click",confirmActivePackCards);
on("openNextPackBtn","click",openPackOpening);
on("openPacksFromNotificationsBtn","click",()=>{closeNotifications();openPackOpening();});
on("openDeckBuilderFromNotificationsBtn","click",()=>{closeNotifications();openDeckBuilder();});
on("closeDeckBuilderBtn","click",closeDeckBuilder);
on("deckSearchInput","input",renderDeckBuilder);
on("deckTypeFilter","change",renderDeckBuilder);
on("deckRarityFilter","change",renderDeckBuilder);
on("saveDeckBtn","click",saveCurrentDeck);

on("saveProfileNameBtn","click",saveProfileNameChange);
on("closeProfilePanelBtn","click",closeProfilePanel);
on("profileNameInput","keydown",e=>{if(e.key==="Enter")saveProfileNameChange();});

on("settingsBtn","click",()=>$("settingsPanel").classList.remove("hidden"));
on("closeSettingsBtn","click",()=>$("settingsPanel").classList.add("hidden"));
on("passBtn","click",()=>$("passPanel").classList.remove("hidden"));
on("closePassBtn","click",()=>$("passPanel").classList.add("hidden"));

on("missionsBtn","click",()=>showComingSoon("Misiones"));
on("mineBtn","click",()=>showComingSoon("Mina"));
on("collectionBtn","click",openCollectionOrLocked);
on("forgeBtn","click",()=>showComingSoon("Forja"));
on("storeBtn","click",()=>showComingSoon("Tienda"));
on("eventsBtn","click",()=>showComingSoon("Eventos"));
on("clansBtn","click",()=>showComingSoon("Clanes"));
on("rankingBtn","click",()=>showComingSoon("Ranking"));
on("profileBtn","click",openProfilePanel);
on("friendsBtn","click",()=>showComingSoon("Amigos"));
on("goldPlusBtn","click",()=>showComingSoon("Conseguir oro"));
on("gemsPlusBtn","click",()=>showComingSoon("Comprar gemas"));
on("fragmentsPlusBtn","click",()=>showComingSoon("Conseguir fragmentos"));
on("welcomeBtn","click",()=>showComingSoon("Paquete de bienvenida"));
on("dailyBtn","click",()=>{
  const profile = getPlayerProfile();
  profile.gold = (profile.gold || 0) + 25;
  savePlayerProfile(profile);
  renderHomeProgress();
  alert("Recompensa diaria: +25 Oro");
});

document.addEventListener("keydown",async(e)=>{
  if(e.shiftKey && e.key.toLowerCase()==="x"){
    addPlayerXp(25);
  }
  if(e.shiftKey && e.key.toLowerCase()==="l"){
    selectedLeaderType="";
    localStorage.removeItem("hallvalla_selected_leader");
    if(uid){
      try{await update(ref(db,`users/${uid}/profile`),{leaderType:null,updatedAt:Date.now()});}
      catch(err){console.warn("No se pudo borrar líder en Firebase:",err);}
    }
    leaderProfileLoaded=true;
    renderSelectedLeaderBadge();
    requireLeaderSelection();
  }
});


// Inicialización segura: se ejecuta al final para evitar usar constantes antes de que existan.
renderHomeProgress();
renderSelectedLeaderBadge();
renderNotificationBadge();

const joinInputEl = document.getElementById("joinCode");
if(joinInputEl){
  joinInputEl.addEventListener("input",()=>{joinInputEl.value = joinInputEl.value.toUpperCase().replace(/[^A-Z0-9]/g,"").slice(0,8);});
}
onAuthStateChanged(auth,async u=>{
  if(u){
    uid=u.uid;
    setText("lobbyStatus","Cargando perfil...");
    await loadLeaderProfile();
    setText("lobbyStatus","Listo para jugar.");
  }
});
signInAnonymously(auth).catch(e=>setText("lobbyStatus",e.message));
