import {initializeApp} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {getDatabase,ref,set,update,get,onValue} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
import {getAuth,signInAnonymously,onAuthStateChanged} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
const firebaseConfig={apiKey:"AIzaSyA6C6f3gSVDvgxcQuyD8PsyQiHNDPD_ZOQ",authDomain:"hallvalla-online.firebaseapp.com",projectId:"hallvalla-online",storageBucket:"hallvalla-online.firebasestorage.app",messagingSenderId:"496903032464",appId:"1:496903032464:web:d1e63bfead7109fc905215",databaseURL:"https://hallvalla-online-default-rtdb.firebaseio.com"};
const app=initializeApp(firebaseConfig),db=getDatabase(app),auth=getAuth(app);
const ROWS=11,COLS=5,$=id=>document.getElementById(id);
const LEADER_PORTRAITS={warrior:"assets/leaders/leader_warrior.png",archer:"assets/leaders/leader_archer.png",mage:"assets/leaders/leader_mage.png"};
const LEADER_DATA={
  warrior:{name:"Guerrero",portrait:LEADER_PORTRAITS.warrior,desc:"Unidades +2 GUARDIA y +2 VIDA."},
  archer:{name:"Arquero",portrait:LEADER_PORTRAITS.archer,desc:"Unidades +3 ATAQUE y +3 DESTREZA."},
  mage:{name:"Hechicero",portrait:LEADER_PORTRAITS.mage,desc:"Magias y trampas -2 costo y +3 efecto."}
};
let uid=null,gameId=null,myPlayer=null,publicState=null,privateState=null,selectedCard=null,selectedUnitId=null,highlights=[],highlightType="move",handOpen=true,unsubPub=null,unsubPriv=null,turnStartLock=false,selectedLeaderType="",leaderProfileLoaded=false;
const CARD_TEMPLATES=[{key:"spearman",name:"Lancero solar",type:"unit",icon:"🛡️",cost:1,hp:4,atk:2,guard:2,dex:4,mov:2,range:1,text:"Unidad básica cuerpo a cuerpo."},{key:"archer",name:"Arquera del desierto",type:"unit",icon:"🏹",cost:1,hp:3,atk:2,guard:1,dex:5,mov:2,range:3,text:"Ataca a distancia."},{key:"guardian",name:"Guardián de piedra",type:"unit",icon:"🗿",cost:2,hp:6,atk:1,guard:4,dex:2,mov:1,range:1,text:"Unidad resistente."},{key:"scout",name:"Explorador de arena",type:"unit",icon:"🐍",cost:1,hp:2,atk:1,guard:1,dex:5,mov:4,range:1,text:"Unidad rápida."},{key:"bolt",name:"Maldición de arena",type:"spell",icon:"✨",cost:1,spell:"damage",damage:2,text:"Hace 2 de daño a una unidad o kaster rival."},{key:"blessing",name:"Bendición del faraón",type:"spell",icon:"☀️",cost:1,spell:"buff",buff:1,text:"+1 ataque a una unidad aliada este turno."}];
const ADVENTURE_SPECIALS={mulan:{key:"mulan",name:"Mulan",type:"unit",icon:"🌙",cost:2,hp:4,atk:4,guard:3,dex:4,mov:3,range:1,special:true,text:"Ataque por la espalda: si Mulan ataca desde la espalda, obtiene +6 ATQ durante ese ataque."},wallace:{key:"wallace",name:"William Wallace",type:"unit",icon:"🛡️",cost:3,hp:6,atk:6,guard:5,dex:6,mov:2,range:1,special:true,text:"Guardia Inquebrantable: cuando su Guardia reduce el daño recibido a 0, recupera +1 Vigor."}};
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
function applyLeaderToCard(card,leaderType){const c={...card};if(c.type==="unit"){c.guard=c.guard||0;c.dex=c.dex||0;if(leaderType==="warrior"){c.hp=(c.hp||0)+2;c.guard+=2;c.text=`${c.text} Bono Guerrero: +2 VIDA y +2 GUARDIA.`}else if(leaderType==="archer"){c.atk=(c.atk||0)+3;c.dex+=3;c.text=`${c.text} Bono Arquero: +3 ATQ y +3 DESTREZA.`}}else if((c.type==="spell"||c.type==="trap")&&leaderType==="mage"){const oldCost=c.cost||0;c.cost=Math.max(0,oldCost-2);if(typeof c.damage==="number")c.damage+=3;if(typeof c.buff==="number")c.buff+=3;c.text=`${c.text} Bono Hechicero: costo -2 y efecto +3.`}return c}
function makeCard(t,owner,leaderType){return {...applyLeaderToCard(t,leaderType),id:uid8(),owner,leaderType}}
function makeDeck(owner,leaderType=getSelectedLeaderType()||"warrior"){const deck=[];for(let i=0;i<60;i++)deck.push(makeCard(CARD_TEMPLATES[i%CARD_TEMPLATES.length],owner,leaderType));return shuffle(deck)}function drawCards(deck,hand,n){const d=[...(deck||[])],h=[...(hand||[])];for(let i=0;i<n;i++)if(d.length)h.push(d.shift());return{deck:d,hand:h}}
function makeLeader(owner,x,y,leaderType=getSelectedLeaderType()||"warrior"){const data=LEADER_DATA[leaderType]||LEADER_DATA.warrior;return{id:`leader${owner}`,owner,leader:true,name:`${data.name} J${owner}`,key:"kaster",icon:owner===1?"👑":"🔮",portrait:data.portrait,leaderType,x,y,hp:20,maxHp:20,atk:2,guard:0,dex:0,mov:2,range:1,moved:false,acted:false,buffAtk:0}}function makeUnit(card,x,y){return{id:uid8(),owner:card.owner,leader:false,name:card.name,key:card.key,icon:card.icon,x,y,nexoX:x,nexoY:y,hp:card.hp,maxHp:card.hp,atk:card.atk,guard:card.guard||0,dex:card.dex||0,mov:card.mov,range:card.range,moved:false,acted:false,buffAtk:0,leaderType:card.leaderType||""}}
function isMyTurn(){return publicState&&publicState.currentPlayer===myPlayer}function getUnitAt(x,y){return(publicState?.units||[]).find(u=>u.x===x&&u.y===y)}function getUnit(id){return(publicState?.units||[]).find(u=>u.id===id)}function getLeader(p){return(publicState?.units||[]).find(u=>u.owner===p&&u.leader)}function effectiveAtk(u){return Math.max(0,(u?.atk||0)+(u?.buffAtk||0))}function dist(a,b){return Math.max(Math.abs(a.x-b.x),Math.abs(a.y-b.y))}function setHint(t){$("hint").textContent=t}async function pushLog(t){if(!gameId||!publicState)return;const logs=[t,...(publicState.log||[])].slice(0,18);await update(ref(db,`games/${gameId}/public`),{log:logs})}async function updatePublic(patch){await update(ref(db,`games/${gameId}/public`),patch)}async function updatePrivate(patch){await update(ref(db,`games/${gameId}/private/player${myPlayer}`),patch)}async function updateUnits(units){await updatePublic({units})}
async function createGame(){const leaderType=getSelectedLeaderType();if(!leaderType){requireLeaderSelection();return}const code=code4(),initial=drawCards(makeDeck(1,leaderType),[],4),deck=initial.deck,hand=initial.hand;const pub={code,createdAt:Date.now(),currentPlayer:1,turn:1,phase:"main",turnKey:"1-1",playerSlots:{player1Uid:uid,player2Uid:null},playerLeaders:{1:leaderType,2:"mage"},playerStats:{1:{hp:20,honor:0,maxHonor:0,deck:deck.length,hand:hand.length},2:{hp:20,honor:0,maxHonor:0,deck:0,hand:0}},units:[makeLeader(1,Math.floor(COLS/2),ROWS-1,leaderType),makeLeader(2,Math.floor(COLS/2),0,"mage")],log:[`Duelo creado. J1 eligió ${LEADER_DATA[leaderType].name}. Mano inicial: 4 cartas. Esperando Jugador 2.`]};await set(ref(db,`games/${code}/public`),pub);await set(ref(db,`games/${code}/private/player1`),{ownerUid:uid,leaderType,deck,hand,honor:0,maxHonor:0,lastTurnStarted:"",skipFirstTurnDraw:true});enterGame(code,1)}
async function joinGame(){const leaderType=getSelectedLeaderType();if(!leaderType){requireLeaderSelection();return}const code=$("joinCode").value.trim().toUpperCase();if(!code)return $("lobbyStatus").textContent="Escribe el código.";const snap=await get(ref(db,`games/${code}/public`));if(!snap.exists())return $("lobbyStatus").textContent="No existe esa partida.";const pub=snap.val();if(pub.playerSlots?.player2Uid&&pub.playerSlots.player2Uid!==uid)return $("lobbyStatus").textContent="Partida llena.";const initial=drawCards(makeDeck(2,leaderType),[],4),deck=initial.deck,hand=initial.hand;let units=(pub.units||[]).map(u=>u.leader&&u.owner===2?makeLeader(2,Math.floor(COLS/2),0,leaderType):u);await update(ref(db,`games/${code}/public`),{"playerSlots/player2Uid":uid,"playerLeaders/2":leaderType,"units":units,"playerStats/2":{hp:20,honor:0,maxHonor:0,deck:deck.length,hand:hand.length},log:[`Jugador 2 se unió con ${LEADER_DATA[leaderType].name}. Mano inicial: 4 cartas.`,...(pub.log||[])]});await set(ref(db,`games/${code}/private/player2`),{ownerUid:uid,leaderType,deck,hand,honor:0,maxHonor:0,lastTurnStarted:"",skipFirstTurnDraw:true});enterGame(code,2)}

async function startAdventure(specialKey){
  const leaderType=getSelectedLeaderType();
  if(!leaderType){requireLeaderSelection();return}
  const specialTemplate=ADVENTURE_SPECIALS[specialKey];
  if(!specialTemplate)return;
  const code=`ADV${code4()}`;
  const playerBase=makeDeck(1,leaderType);
  const playerDraw=drawCards(playerBase,[],3);
  const specialCard=makeCard(specialTemplate,1,leaderType);
  const playerDeck=playerDraw.deck;
  const playerHand=[specialCard,...playerDraw.hand];
  const enemyLeaderType="mage";
  const enemyInitial=drawCards(makeDeck(2,enemyLeaderType),[],4);
  const pub={code,mode:"adventure",adventureSpecial:specialKey,createdAt:Date.now(),currentPlayer:1,turn:1,phase:"main",turnKey:"1-1",playerSlots:{player1Uid:uid,player2Uid:"ADVENTURE_AI"},playerLeaders:{1:leaderType,2:enemyLeaderType},playerStats:{1:{hp:20,honor:0,maxHonor:0,deck:playerDeck.length,hand:playerHand.length},2:{hp:20,honor:0,maxHonor:0,deck:enemyInitial.deck.length,hand:enemyInitial.hand.length}},units:[makeLeader(1,Math.floor(COLS/2),ROWS-1,leaderType),makeLeader(2,Math.floor(COLS/2),0,enemyLeaderType)],log:[`Aventura iniciada. Carta especial elegida: ${specialTemplate.name}. El rival Hechicero usa el mazo básico sin carta especial.`]};
  await set(ref(db,`games/${code}/public`),pub);
  await set(ref(db,`games/${code}/private/player1`),{ownerUid:uid,leaderType,adventureSpecial:specialKey,deck:playerDeck,hand:playerHand,honor:0,maxHonor:0,lastTurnStarted:"",skipFirstTurnDraw:true});
  await set(ref(db,`games/${code}/private/player2`),{ownerUid:"ADVENTURE_AI",leaderType:enemyLeaderType,deck:enemyInitial.deck,hand:enemyInitial.hand,honor:0,maxHonor:0,lastTurnStarted:"",skipFirstTurnDraw:true});
  $("adventurePanel").classList.add("hidden");
  enterGame(code,1);
}

function enterGame(code,player){gameId=code;myPlayer=player;$("onlineLobby").classList.add("hidden");$("mainMenu").classList.add("hidden");$("gameShell").classList.remove("hidden");if(unsubPub)unsubPub();if(unsubPriv)unsubPriv();unsubPub=onValue(ref(db,`games/${code}/public`),snap=>{publicState=snap.val();render();maybeStartTurn()});unsubPriv=onValue(ref(db,`games/${code}/private/player${player}`),snap=>{privateState=snap.val();render();maybeStartTurn()})}
async function maybeStartTurn(){if(!publicState||!privateState||!isMyTurn())return;if(privateState.lastTurnStarted===publicState.turnKey)return;if(turnStartLock)return;turnStartLock=true;try{const firstTurnNoDraw=privateState.skipFirstTurnDraw===true;const drawn=firstTurnNoDraw?{deck:[...(privateState.deck||[])],hand:[...(privateState.hand||[])]}:drawCards(privateState.deck||[],privateState.hand||[],2);const honorGain=(publicState.turn||1)>=3?2:1;const maxHonor=(privateState.maxHonor||0)+honorGain;const honor=maxHonor;await updatePrivate({deck:drawn.deck,hand:drawn.hand,honor,maxHonor,lastTurnStarted:publicState.turnKey,skipFirstTurnDraw:false});const units=(publicState.units||[]).map(u=>u.owner===myPlayer?{...u,moved:false,acted:false,buffAtk:0}:u);await updatePublic({units,[`playerStats/${myPlayer}`]:{hp:getLeader(myPlayer)?.hp||20,honor,maxHonor,deck:drawn.deck.length,hand:drawn.hand.length}});await pushLog(firstTurnNoDraw?`J${myPlayer} inicia primer turno: Honor máximo +${honorGain}, recarga a ${honor}. Mano inicial: ${drawn.hand.length} cartas.`:`J${myPlayer} inicia turno: Honor máximo +${honorGain}, recarga a ${honor} y roba 2 cartas.`)}finally{turnStartLock=false}}
function summonZones(player){const l=getLeader(player);if(!l)return[];const res=[];for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++){if(getUnitAt(x,y))continue;if(dist(l,{x,y})<=1)res.push(`${x},${y}`)}return res}function moveZones(u){if(!u||u.moved)return[];const res=[];for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++){if(x===u.x&&y===u.y)continue;if(getUnitAt(x,y))continue;if(dist(u,{x,y})<=u.mov)res.push(`${x},${y}`)}return res}function attackZones(u){if(!u||u.acted)return[];return(publicState.units||[]).filter(t=>t.owner!==u.owner&&dist(u,t)<=u.range).map(t=>`${t.x},${t.y}`)}function clearSelection(){selectedCard=null;selectedUnitId=null;highlights=[];highlightType="move";render()}
function selectCard(card){if(!isMyTurn())return setHint("No es tu turno.");if((privateState.honor||0)<card.cost)return setHint("No tienes Honor suficiente.");selectedCard=card;selectedUnitId=null;if(card.type==="unit"){highlights=summonZones(myPlayer);highlightType="summon";setHint("Elige una casilla junto a tu kaster para kastear.")}else if(card.spell==="damage"){highlights=(publicState.units||[]).filter(u=>u.owner!==myPlayer).map(u=>`${u.x},${u.y}`);highlightType="attack";setHint("Elige un objetivo rival para el hechizo.")}else if(card.spell==="buff"){highlights=(publicState.units||[]).filter(u=>u.owner===myPlayer).map(u=>`${u.x},${u.y}`);highlightType="move";setHint("Elige una unidad aliada para recibir +1 AT.")}render()}
function selectUnit(u){showUnit(u);if(!isMyTurn()||u.owner!==myPlayer)return;selectedUnitId=u.id;selectedCard=null;highlights=[...moveZones(u),...attackZones(u)];highlightType="move";setHint("Verde: mover. Rojo: atacar. Click en la carta para ver detalles.");render()}
async function playCardOn(x,y,target){const card=selectedCard;if(!card)return;if((privateState.honor||0)<card.cost)return setHint("No tienes Honor suficiente.");let units=[...(publicState.units||[])];if(card.type==="unit"){if(!summonZones(myPlayer).includes(`${x},${y}`))return setHint("Casilla inválida para kasteo.");units.push(makeUnit(card,x,y));await updateUnits(units);await removeCardAndPay(card);await pushLog(`J${myPlayer} kastea ${card.name}.`)}else if(card.spell==="damage"){if(!target||target.owner===myPlayer)return setHint("Elige un objetivo rival.");units=units.map(u=>u.id===target.id?{...u,hp:u.hp-card.damage}:u).filter(u=>u.hp>0);await updateUnits(units);await removeCardAndPay(card);await pushLog(`J${myPlayer} usa ${card.name}: ${target.name} recibe ${card.damage} daño.`)}else if(card.spell==="buff"){if(!target||target.owner!==myPlayer)return setHint("Elige una unidad aliada.");units=units.map(u=>u.id===target.id?{...u,buffAtk:(u.buffAtk||0)+card.buff}:u);await updateUnits(units);await removeCardAndPay(card);await pushLog(`J${myPlayer} usa ${card.name}: ${target.name} gana +${card.buff} AT este turno.`)}clearSelection()}
async function removeCardAndPay(card){const hand=(privateState.hand||[]).filter(c=>c.id!==card.id);const honor=(privateState.honor||0)-card.cost;const maxHonor=privateState.maxHonor||0;await updatePrivate({hand,honor});await updatePublic({[`playerStats/${myPlayer}`]:{hp:getLeader(myPlayer)?.hp||0,honor,maxHonor,deck:(privateState.deck||[]).length,hand:hand.length}})}
async function moveUnit(u,x,y){if(!moveZones(u).includes(`${x},${y}`))return setHint("Movimiento inválido.");const units=(publicState.units||[]).map(it=>it.id===u.id?{...it,x,y,moved:true}:it);await updateUnits(units);await pushLog(`${u.name} se mueve a ${x+1},${y+1}.`);clearSelection()}async function attackUnit(a,d){if(!attackZones(a).includes(`${d.x},${d.y}`))return setHint("Objetivo fuera de rango.");let units=(publicState.units||[]).map(u=>{if(u.id===a.id)return{...u,acted:true};if(u.id===d.id)return{...u,hp:u.hp-effectiveAtk(a)};return u}).filter(u=>u.hp>0);await updateUnits(units);await pushLog(`${a.name} ataca a ${d.name} e inflige ${effectiveAtk(a)} daño.`);clearSelection()}async function endTurn(){if(!isMyTurn())return setHint("No es tu turno.");const next=myPlayer===1?2:1,turn=next===1?(publicState.turn||1)+1:(publicState.turn||1);await updatePublic({currentPlayer:next,turn,turnKey:`${turn}-${next}`});clearSelection();await pushLog(`Fin de turno. Ahora juega J${next}.`);if(publicState?.mode==="adventure"&&next===2)setTimeout(adventureEnemyTurn,650)}
async function adventureEnemyTurn(){
  if(!gameId)return;
  const pubSnap=await get(ref(db,`games/${gameId}/public`));
  if(!pubSnap.exists())return;
  const pub=pubSnap.val();
  if(pub.mode!=="adventure"||pub.currentPlayer!==2)return;
  const privSnap=await get(ref(db,`games/${gameId}/private/player2`));
  if(!privSnap.exists())return;
  const ai=privSnap.val();
  const logs=[];
  const firstTurnNoDraw=ai.skipFirstTurnDraw===true;
  const drawn=firstTurnNoDraw?{deck:[...(ai.deck||[])],hand:[...(ai.hand||[])]}:drawCards(ai.deck||[],ai.hand||[],2);
  let deck=drawn.deck, hand=drawn.hand;
  const honorGain=(pub.turn||1)>=3?2:1;
  const maxHonor=(ai.maxHonor||0)+honorGain;
  let honor=maxHonor;
  let units=(pub.units||[]).map(u=>u.owner===2?{...u,moved:false,acted:false,buffAtk:0}:u);
  const d=(a,b)=>Math.max(Math.abs(a.x-b.x),Math.abs(a.y-b.y));
  const at=(x,y)=>units.find(u=>u.x===x&&u.y===y);
  const leader=(owner)=>units.find(u=>u.owner===owner&&u.leader);
  const enemyLeader=leader(2), playerLeader=leader(1);
  const killDead=()=>{units=units.filter(u=>u.hp>0)};
  const removeCard=(card)=>{hand=hand.filter(c=>c.id!==card.id)};
  const bestTargetInRange=(attacker)=>{
    const targets=units.filter(t=>t.owner===1&&d(attacker,t)<=attacker.range);
    if(!targets.length)return null;
    const caster=targets.find(t=>t.leader);
    if(caster)return caster;
    return targets.sort((a,b)=>(a.hp||99)-(b.hp||99))[0];
  };
  const attackWith=(attacker)=>{
    if(!attacker||attacker.acted)return false;
    const target=bestTargetInRange(attacker);
    if(!target)return false;
    target.hp-=effectiveAtk(attacker);
    attacker.acted=true;
    logs.push(`Rival: ${attacker.name} ataca a ${target.name} e inflige ${effectiveAtk(attacker)} daño.`);
    killDead();
    return true;
  };
  const chooseSummonCell=()=>{
    if(!enemyLeader)return null;
    const cells=[];
    for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++){
      if(at(x,y))continue;
      if(d(enemyLeader,{x,y})<=1)cells.push({x,y,score:playerLeader?d({x,y},playerLeader):0});
    }
    return cells.sort((a,b)=>a.score-b.score)[0]||null;
  };
  const moveTowardPlayer=(u)=>{
    if(!u||u.moved||!playerLeader)return false;
    let best=null;
    for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++){
      if(x===u.x&&y===u.y)continue;
      if(at(x,y))continue;
      if(d(u,{x,y})<=u.mov){
        const score=d({x,y},playerLeader);
        if(!best||score<best.score)best={x,y,score};
      }
    }
    if(best&&best.score<d(u,playerLeader)){
      u.x=best.x;u.y=best.y;u.moved=true;
      logs.push(`Rival: ${u.name} avanza a ${best.x+1},${best.y+1}.`);
      return true;
    }
    return false;
  };

  logs.push(firstTurnNoDraw?`Rival Hechicero inicia: Honor ${honor}/${maxHonor}. Mano inicial: ${hand.length} cartas.`:`Rival Hechicero roba 2 cartas. Honor ${honor}/${maxHonor}.`);

  // 1) Si puede atacar con unidades ya en mesa, ataca primero para enseñar presión inmediata.
  units.filter(u=>u.owner===2).forEach(u=>attackWith(u));

  // 2) Juega hasta 2 cartas simples por turno: daño, invocación o buff.
  let cardsPlayed=0;
  for(let i=0;i<2;i++){
    let played=false;
    const damageCard=hand.find(c=>c.spell==="damage"&&c.cost<=honor&&units.some(t=>t.owner===1));
    if(damageCard){
      const targets=units.filter(t=>t.owner===1).sort((a,b)=>Number(b.leader)-Number(a.leader)||(a.hp||99)-(b.hp||99));
      const target=targets[0];
      target.hp-=damageCard.damage||0;
      honor-=damageCard.cost;
      removeCard(damageCard);
      logs.push(`Rival usa ${damageCard.name}: ${target.name} recibe ${damageCard.damage||0} daño.`);
      killDead();
      played=true;cardsPlayed++;
    }
    if(!played){
      const unitCard=hand.find(c=>c.type==="unit"&&c.cost<=honor);
      const cell=unitCard?chooseSummonCell():null;
      if(unitCard&&cell){
        units.push(makeUnit(unitCard,cell.x,cell.y));
        honor-=unitCard.cost;
        removeCard(unitCard);
        logs.push(`Rival kastea ${unitCard.name}.`);
        played=true;cardsPlayed++;
      }
    }
    if(!played){
      const buffCard=hand.find(c=>c.spell==="buff"&&c.cost<=honor&&units.some(u=>u.owner===2&&!u.leader));
      if(buffCard){
        const ally=units.filter(u=>u.owner===2&&!u.leader).sort((a,b)=>effectiveAtk(b)-effectiveAtk(a))[0];
        ally.buffAtk=(ally.buffAtk||0)+(buffCard.buff||0);
        honor-=buffCard.cost;
        removeCard(buffCard);
        logs.push(`Rival usa ${buffCard.name}: ${ally.name} gana +${buffCard.buff||0} AT este turno.`);
        played=true;cardsPlayed++;
      }
    }
    if(!played)break;
  }
  if(cardsPlayed===0)logs.push("Rival no encontró carta jugable y avanza con sus unidades.");

  // 3) Mueve hacia el kaster del jugador y vuelve a atacar si queda en rango.
  units.filter(u=>u.owner===2&&!u.leader).forEach(u=>{if(!attackWith(u)){moveTowardPlayer(u);attackWith(u);}});

  const nextTurn=(pub.turn||1)+1;
  const p1Leader=units.find(u=>u.owner===1&&u.leader), p2Leader=units.find(u=>u.owner===2&&u.leader);
  const finalLogs=[...logs,`Rival termina turno. Ahora juega J1.`,...(pub.log||[])].slice(0,18);
  await update(ref(db,`games/${gameId}/private/player2`),{deck,hand,honor,maxHonor,lastTurnStarted:pub.turnKey,skipFirstTurnDraw:false});
  await update(ref(db,`games/${gameId}/public`),{
    units,
    currentPlayer:1,
    turn:nextTurn,
    turnKey:`${nextTurn}-1`,
    [`playerStats/1`]:{...(pub.playerStats?.[1]||{}),hp:p1Leader?.hp||0},
    [`playerStats/2`]:{hp:p2Leader?.hp||20,honor,maxHonor,deck:deck.length,hand:hand.length},
    log:finalLogs
  });
}
async function cellClick(x,y){const u=getUnitAt(x,y);if(selectedCard)return playCardOn(x,y,u);if(selectedUnitId){const s=getUnit(selectedUnitId);if(u&&u.owner!==myPlayer)return attackUnit(s,u);if(!u)return moveUnit(s,x,y)}if(u)selectUnit(u)}
function showUnit(u){$("inspectTitle").textContent=u.name;$("inspectSub").textContent=(u.leader?"Kaster":"Invocación")+` · J${u.owner}`;$("inspectArt").textContent=u.icon;const stats=[["Vida",`${u.hp}/${u.maxHp}`],["Ataque",effectiveAtk(u)],["Guardia",u.guard||0],["Destreza",u.dex||0],["Mov",u.mov],["Rango",u.range]];$("inspectStats").innerHTML=stats.map(([l,v])=>`<div class="inspect-stat">${l}<strong>${v}</strong></div>`).join("");$("inspectText").innerHTML=u.leader?"Si tu kaster llega a 0, pierdes.":`Nexo: ${u.nexoX+1},${u.nexoY+1}<br/>${u.name}`;$("inspector").classList.add("show")}
function render(){if(!publicState)return;renderHud();renderBoard();renderHand();renderLog();renderDetail();const hb=$("handBtn");if(hb)hb.classList.toggle("selected",handOpen)}function renderHud(){[1,2].forEach(p=>{const st=publicState.playerStats?.[p]||{hp:0,honor:0,deck:0,hand:0},leader=getLeader(p);$(`p${p}Life`).textContent=leader?Math.max(0,leader.hp):st.hp||0;$(`p${p}Honor`).textContent=`${st.honor||0}/${st.maxHonor||0}`;$(`p${p}Deck`).textContent=st.deck||0;$(`p${p}Hand`).textContent=st.hand||0;const b=$(`p${p}Badge`);b.textContent=publicState.currentPlayer===p?"Turno":"Espera";b.style.color=publicState.currentPlayer===p?"#ffd166":"#d7c3a2"});$("phaseBanner").textContent=isMyTurn()?"TU TURNO":"ESPERA"}
function renderBoard(){const grid=$("grid");grid.innerHTML="";for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++){const cell=document.createElement("div");cell.className="cell";const key=`${x},${y}`;if(highlights.includes(key))cell.classList.add(highlightType==="attack"?"attackable":"valid");const u=getUnitAt(x,y);if(u){const c=document.createElement("div");c.className=`unit-card ${u.owner===1?"p1":"p2"} ${u.leader?"leader":""}`;const leaderPortrait=(u.leader&&u.leaderType&&LEADER_DATA[u.leaderType])?LEADER_DATA[u.leaderType].portrait:u.portrait;const portraitHtml=leaderPortrait?`<img src="${leaderPortrait}" alt="${u.name}">`:u.icon;c.innerHTML=`<div class="unit-portrait">${portraitHtml}</div>`;c.title=`${u.name} · HP ${u.hp}/${u.maxHp} · AT ${effectiveAtk(u)}`;cell.appendChild(c)}cell.addEventListener("click",()=>cellClick(x,y));grid.appendChild(cell)}}
function renderHand(){$("handDrawer").classList.toggle("open",handOpen);const hand=privateState?.hand||[];$("handInfo").textContent=`Honor ${privateState?.honor||0}/${privateState?.maxHonor||0} · ${hand.length} cartas`;$("handRow").innerHTML=hand.map(c=>`<div class="hand-card ${selectedCard?.id===c.id?"selected":""}" data-id="${c.id}"><div class="hand-icon">${c.icon}</div><div class="hand-name">${c.name}</div><div class="hand-stats">Costo ${c.cost}${c.type==="unit"?` · AT ${c.atk} · HP ${c.hp} · GD ${c.guard||0} · DX ${c.dex||0} · MV ${c.mov} · RG ${c.range}`:` · Hechizo`}</div><div class="hand-text">${c.text}</div></div>`).join("");[...document.querySelectorAll(".hand-card")].forEach(el=>el.addEventListener("click",()=>{const card=hand.find(c=>c.id===el.dataset.id);if(card)selectCard(card)}))}
function renderLog(){$("log").innerHTML=(publicState.log||[]).map(t=>`<div>${escapeHtml(t)}</div>`).join("")}function renderDetail(){if(selectedCard){$("detail").innerHTML=`<p><b>${selectedCard.icon} ${selectedCard.name}</b></p><p>Costo: ${selectedCard.cost}</p><p>${selectedCard.text}</p>`;return}if(selectedUnitId){const u=getUnit(selectedUnitId);if(u){$("detail").innerHTML=`<p><b>${u.icon} ${u.name}</b></p><p>HP ${u.hp}/${u.maxHp} · AT ${effectiveAtk(u)} · GD ${u.guard||0} · DX ${u.dex||0} · MV ${u.mov} · RG ${u.range}</p><p>${u.leader?"Kaster":`Nexo ${u.nexoX+1},${u.nexoY+1}`}</p>`;return}}$("detail").innerHTML=`<p>Jugador ${myPlayer||"?"}</p><p>Código: ${gameId||"..."}</p><p>${publicState?.mode==="adventure"?"Modo: Aventura":"Modo: Online"}</p><p>Líder elegido: ${LEADER_DATA[getSelectedLeaderType()]?.name||"sin elegir"}. Guerrero: unidades +2 GD/+2 VIDA. Arquero: unidades +3 AT/+3 DX. Hechicero: magias/trampas -2 costo y +3 efecto.</p><p>Honor disponible/máximo se recarga al iniciar tu turno. Todas las piezas usan el mismo tamaño visual. Haz click sobre una carta para verla ampliada.</p>`}function escapeHtml(s){return String(s).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[m]))}
$("createBtn").addEventListener("click",createGame);$("joinBtn").addEventListener("click",joinGame);$("handBtn").addEventListener("click",()=>{if(!gameId)return;handOpen=!handOpen;render()});$("cancelBtn").addEventListener("click",clearSelection);$("endBtn").addEventListener("click",endTurn);$("inspectClose").addEventListener("click",()=>$("inspector").classList.remove("show"));

const defaultPlayerProfile = {
  name: "Nuevo jugador",
  level: 1,
  xp: 0,
  xpToNext: 100,
  gold: 0,
  gems: 0,
  fragments: 0
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
function xpNeededForLevel(level){
  return 100 + Math.max(0, level - 1) * 50;
}
function renderPlayerProfile(profile=getPlayerProfile()){
  profile.xpToNext = profile.xpToNext || xpNeededForLevel(profile.level || 1);
  $("playerName").textContent = profile.name || "Nuevo jugador";
  $("playerLevel").textContent = `Nv. ${profile.level || 1}`;
  $("goldValue").textContent = profile.gold || 0;
  $("gemsValue").textContent = profile.gems || 0;
  $("fragmentsValue").textContent = profile.fragments || 0;
  const pct = Math.max(0, Math.min(100, ((profile.xp || 0) / profile.xpToNext) * 100));
  $("xpText").textContent = `${profile.xp || 0}/${profile.xpToNext}`;
  requestAnimationFrame(()=>{$("xpFill").style.width = pct + "%";});
}
function addPlayerXp(amount){
  const profile = getPlayerProfile();
  profile.xp += amount;
  while(profile.xp >= xpNeededForLevel(profile.level)){
    profile.xp -= xpNeededForLevel(profile.level);
    profile.level += 1;
  }
  profile.xpToNext = xpNeededForLevel(profile.level);
  savePlayerProfile(profile);
  renderPlayerProfile(profile);
}
renderPlayerProfile();

renderSelectedLeaderBadge();
document.querySelectorAll("[data-leader-choice]").forEach(btn=>{
  btn.addEventListener("click",async()=>{
    const type=btn.dataset.leaderChoice;
    await setSelectedLeaderType(type);
    const data=LEADER_DATA[type];
    if(data)alert(`Líder elegido: ${data.name}. ${data.desc}`);
  });
});


const ADVENTURE_STORY_SCENES=[
  {title:"El llamado de HallValla",mark:"",cls:"scene-call",image:"assets/story/hallvalla_call.webp",text:"En los confines de HallValla, donde las viejas guerras dejaron cicatrices sobre la tierra, el Honor vuelve a llamar.\n\nNo todos nacen para mandar ejércitos, pero quienes escuchan ese llamado deben cruzar el campo y demostrar que su voluntad pesa más que el miedo.\n\nHoy comienza tu camino."},
  {title:"Dos leyendas responden",mark:"",cls:"scene-heroes",image:"assets/story/hallvalla_call.webp",leftActor:"assets/story/scene_mulan_actor.webp",rightActor:"assets/story/scene_wallace_actor.webp",text:"Antes de tu primera batalla, dos héroes se alzan entre las ruinas.\n\nMulan representa precisión, movimiento y decisión. William Wallace representa coraje, resistencia y fuerza frontal.\n\nAmbos son héroes de su propia historia. Uno de ellos peleará a tu lado en esta primera prueba."}
];
let adventureStoryIndex=0,pendingAdventureSpecial="";
function openAdventureStory(){
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
  ["adventureStoryStage","adventureChoiceStage","adventureWoundedStage","adventureGuardianStage"].forEach(id=>$(id).classList.toggle("hidden",id!==stage));
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
  const s=ADVENTURE_WOUNDED_SCENES[specialKey]||ADVENTURE_WOUNDED_SCENES.mulan;
  setAdventureGuardianActor("");
  showAdventureStage("adventureWoundedStage");
  applyAdventureSceneVisual("adventureWoundedVisual","adventureWoundedMark",s.cls,s.mark,s.image);
  $("adventureWoundedTitle").textContent=s.title;
  $("adventureWoundedText").textContent=s.text;
}
function showAdventureGuardianIntro(specialKey=pendingAdventureSpecial){
  pendingAdventureSpecial=specialKey;
  showAdventureStage("adventureGuardianStage");
  applyAdventureSceneVisual("adventureGuardianVisual","adventureGuardianMark","scene-guardian","","assets/story/guardian_intro.webp");
  setAdventureGuardianActor("");
  $("adventureGuardianTitle").textContent="El primer guardián";
  $("adventureGuardianText").textContent="Del otro lado del tablero, un hechicero guardián se alza cubierto por energía oscura.\n\nPara abrir tu camino en HallValla, tendrás que derrotarlo con estrategia, Honor y la fuerza del aliado que acabas de elegir.";
}
function showOnlineLobby(){
  $("mainMenu").classList.add("hidden");
  $("onlineLobby").classList.remove("hidden");
  $("gameShell").classList.add("hidden");
}
function backToMainMenu(){
  $("onlineLobby").classList.add("hidden");
  $("gameShell").classList.add("hidden");
  $("mainMenu").classList.remove("hidden");
}
function showComingSoon(name){
  alert(`${name} estará disponible próximamente.`);
}

$("onlineBtn").addEventListener("click",showOnlineLobby);
$("playBtn").addEventListener("click",showOnlineLobby);
$("backMenuFromLobby").addEventListener("click",backToMainMenu);

$("adventureBtn").addEventListener("click",openAdventureStory);
$("closeAdventureBtn").addEventListener("click",()=>$("adventurePanel").classList.add("hidden"));
$("skipAdventureStoryBtn").addEventListener("click",showAdventureChoice);
$("nextAdventureStoryBtn").addEventListener("click",nextAdventureStoryScene);
$("backToAdventureChoiceBtn").addEventListener("click",showAdventureChoice);
$("skipWoundedSceneBtn").addEventListener("click",()=>showAdventureGuardianIntro(pendingAdventureSpecial));
$("continueWoundedSceneBtn").addEventListener("click",()=>showAdventureGuardianIntro(pendingAdventureSpecial));
$("startAdventureBattleBtn").addEventListener("click",()=>{if(pendingAdventureSpecial)startAdventure(pendingAdventureSpecial)});
document.querySelectorAll("[data-adventure-special]").forEach(btn=>btn.addEventListener("click",()=>showAdventureWoundedIntro(btn.dataset.adventureSpecial)));
$("settingsBtn").addEventListener("click",()=>$("settingsPanel").classList.remove("hidden"));
$("closeSettingsBtn").addEventListener("click",()=>$("settingsPanel").classList.add("hidden"));
$("passBtn").addEventListener("click",()=>$("passPanel").classList.remove("hidden"));
$("closePassBtn").addEventListener("click",()=>$("passPanel").classList.add("hidden"));

$("missionsBtn").addEventListener("click",()=>showComingSoon("Misiones"));
$("mineBtn").addEventListener("click",()=>showComingSoon("Mina"));
$("collectionBtn").addEventListener("click",()=>showComingSoon("Colección"));
$("forgeBtn").addEventListener("click",()=>showComingSoon("Forja"));
$("storeBtn").addEventListener("click",()=>showComingSoon("Tienda"));
$("eventsBtn").addEventListener("click",()=>showComingSoon("Eventos"));
$("clansBtn").addEventListener("click",()=>showComingSoon("Clanes"));
$("rankingBtn").addEventListener("click",()=>showComingSoon("Ranking"));
$("profileBtn").addEventListener("click",()=>showComingSoon("Perfil"));
$("friendsBtn").addEventListener("click",()=>showComingSoon("Amigos"));
$("goldPlusBtn").addEventListener("click",()=>showComingSoon("Conseguir oro"));
$("gemsPlusBtn").addEventListener("click",()=>showComingSoon("Comprar gemas"));
$("fragmentsPlusBtn").addEventListener("click",()=>showComingSoon("Conseguir fragmentos"));
$("welcomeBtn").addEventListener("click",()=>showComingSoon("Paquete de bienvenida"));
$("dailyBtn").addEventListener("click",()=>{
  const profile = getPlayerProfile();
  profile.gold = (profile.gold || 0) + 25;
  savePlayerProfile(profile);
  renderPlayerProfile(profile);
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

const joinInputEl = document.getElementById("joinCode");
if(joinInputEl){
  joinInputEl.addEventListener("input",()=>{joinInputEl.value = joinInputEl.value.toUpperCase().replace(/[^A-Z0-9]/g,"").slice(0,8);});
}
onAuthStateChanged(auth,async u=>{
  if(u){
    uid=u.uid;
    $("lobbyStatus").textContent="Cargando perfil...";
    await loadLeaderProfile();
    $("lobbyStatus").textContent="Listo para jugar.";
  }
});
signInAnonymously(auth).catch(e=>$("lobbyStatus").textContent=e.message);
