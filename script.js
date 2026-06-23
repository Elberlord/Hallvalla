const ROWS = 7;
const COLS = 5;
const $ = id => document.getElementById(id);

const LEADER_PORTRAITS = {
  warrior:"assets/leaders/leader_warrior_3d.png",
  archer:"assets/leaders/leader_archer_3d.png",
  mage:"assets/leaders/leader_mage_3d.png",
  axe:"assets/leaders/leader_axe_3d.png",
  cavalry:"assets/leaders/leader_cavalry_3d.png",
  assassin:"assets/leaders/leader_assassin_3d.png",
  beastmaster:"assets/leaders/leader_beastmaster_3d.png"
};

const CARD_PORTRAITS = {
  archer:"assets/cards/basic/archer.webp",
  cavalry:"assets/cards/basic/cavalry_light.webp",
  berserker:"assets/cards/basic/berserker_north.webp",
  guardian:"assets/cards/basic/paladin.webp"
};

let state = null;
let selectedId = null;

function newGame(){
  state = {
    turn:1,
    currentPlayer:1,
    phase:"ACTION",
    units:[
      makeLeader({id:"leader-p1",owner:1,type:"warrior",name:"Guerrero",hp:28,atk:3,guard:4,x:2,y:7}),
      makeLeader({id:"leader-p2",owner:2,type:"archer",name:"Arquero Rival",hp:28,atk:3,guard:2,x:2,y:-1}),
      makeUnit({id:"u1",owner:1,key:"archer",name:"Arquera",hp:2,atk:3,guard:1,x:1,y:5}),
      makeUnit({id:"u2",owner:1,key:"guardian",name:"Guardián",hp:9,atk:2,guard:7,x:3,y:5}),
      makeUnit({id:"e1",owner:2,key:"berserker",name:"Berserker Rival",hp:8,atk:8,guard:1,x:2,y:1})
    ],
    log:["Motor local iniciado. Prueba DEF sin Firebase ni FX viejos."]
  };
  selectedId = null;
  showGame();
  render();
}

function makeUnit(data){
  return {...data, leader:false, acted:false, statuses:[]};
}
function makeLeader(data){
  return {...data, leader:true, acted:false, statuses:[]};
}

function showHome(){
  $("home").classList.remove("hidden");
  $("game").classList.add("hidden");
}
function showGame(){
  $("home").classList.add("hidden");
  $("game").classList.remove("hidden");
}

function getSelected(){
  return state?.units.find(u=>u.id===selectedId) || null;
}
function log(text){
  state.log.unshift(text);
  state.log = state.log.slice(0,10);
  renderLog();
}

function getGridRect(){
  return $("grid").getBoundingClientRect();
}
function getBattleRect(){
  return $("battlefield").getBoundingClientRect();
}
function getCellCenter(x,y){
  const grid = getGridRect();
  const battle = getBattleRect();
  const cw = grid.width / COLS;
  const ch = grid.height / ROWS;
  return {
    x: (grid.left - battle.left) + (x + .5) * cw,
    y: (grid.top - battle.top) + (y + .5) * ch
  };
}
function getLeaderPoint(unit){
  const grid = getGridRect();
  const battle = getBattleRect();
  const cx = (grid.left - battle.left) + grid.width / 2;
  if(unit.owner === 1){
    return {x:cx, y:(grid.top - battle.top) + grid.height + 48};
  }
  return {x:cx, y:(grid.top - battle.top) - 48};
}
function getUnitPoint(unit){
  return unit.leader ? getLeaderPoint(unit) : getCellCenter(unit.x, unit.y);
}

function render(){
  if(!state)return;
  renderTop();
  renderGrid();
  renderUnits();
  renderLeaders();
  renderPanel();
  renderLog();
}
function renderTop(){
  $("turnInfo").textContent = `Jugador ${state.currentPlayer} · ${state.phase} · Turno ${state.turn}`;
}
function renderGrid(){
  const grid = $("grid");
  grid.innerHTML = "";
  for(let y=0;y<ROWS;y++){
    for(let x=0;x<COLS;x++){
      const cell = document.createElement("button");
      cell.className = "cell";
      cell.dataset.x = x;
      cell.dataset.y = y;
      cell.addEventListener("click",()=>selectCell(x,y));
      grid.appendChild(cell);
    }
  }
}
function renderUnits(){
  const layer = $("unitLayer");
  layer.innerHTML = "";
  state.units.filter(u=>!u.leader && u.hp>0).forEach(unit=>{
    const p = getUnitPoint(unit);
    const el = document.createElement("button");
    el.className = `unit p${unit.owner}`;
    el.style.left = `${p.x}px`;
    el.style.top = `${p.y}px`;
    el.innerHTML = `
      ${unit.statuses.length ? `<div class="status-row">${unit.statuses.map(statusHtml).join("")}</div>` : ""}
      <img src="${CARD_PORTRAITS[unit.key] || CARD_PORTRAITS.archer}" alt="">
      <div class="unit-stats">
        <span class="stat">❤${unit.hp}</span>
        <span class="stat">⚔${unit.atk}</span>
        <span class="stat">🛡${unit.guard + (hasStatus(unit,"def") ? 2 : 0)}</span>
      </div>`;
    el.addEventListener("click",()=>selectUnit(unit.id));
    layer.appendChild(el);
  });
}
function renderLeaders(){
  const layer = $("leaderLayer");
  layer.innerHTML = "";
  state.units.filter(u=>u.leader && u.hp>0).forEach(unit=>{
    const p = getUnitPoint(unit);
    const el = document.createElement("button");
    el.className = `leader p${unit.owner}`;
    el.style.left = `${p.x}px`;
    el.style.top = `${p.y}px`;
    el.innerHTML = `
      ${unit.statuses.length ? `<div class="status-row">${unit.statuses.map(statusHtml).join("")}</div>` : ""}
      <div class="pedestal"></div>
      <img src="${LEADER_PORTRAITS[unit.type] || LEADER_PORTRAITS.warrior}" alt="">
      <div class="unit-stats">
        <span class="stat">❤${unit.hp}</span>
        <span class="stat">⚔${unit.atk}</span>
        <span class="stat">🛡${unit.guard + (hasStatus(unit,"def") ? 2 : 0)}</span>
      </div>`;
    el.addEventListener("click",()=>selectUnit(unit.id));
    layer.appendChild(el);
  });
}
function statusHtml(s){
  if(s.type === "def") return `<span class="status def" title="DEF activo">🛡</span>`;
  return `<span class="status">•</span>`;
}
function hasStatus(unit,type){
  return unit.statuses.some(s=>s.type===type);
}

function renderPanel(){
  const unit = getSelected();
  if(!unit){
    $("selectedTitle").textContent = "Selecciona una unidad";
    $("selectedText").textContent = "Toca unidad o líder. DEF no usa FX de tablero en este core local.";
    return;
  }
  $("selectedTitle").textContent = unit.name;
  $("selectedText").textContent = `${unit.leader ? "Líder fijo fuera del grid" : `Unidad en ${unit.x},${unit.y}`} · HP ${unit.hp} · AT ${unit.atk} · GD ${unit.guard}${hasStatus(unit,"def") ? " · DEF activo" : ""}`;
}
function renderLog(){
  $("log").innerHTML = state.log.map(x=>`<div>${escapeHtml(x)}</div>`).join("");
}

function selectUnit(id){
  selectedId = id;
  renderPanel();
}
function selectCell(x,y){
  selectedId = null;
  log(`Celda seleccionada: ${x},${y}`);
  renderPanel();
}
function activateDef(){
  const unit = getSelected();
  if(!unit){ log("Selecciona una unidad o líder para usar DEF."); return; }
  if(unit.owner !== state.currentPlayer){ log("Solo puedes usar DEF con tu lado actual."); return; }
  if(unit.acted){ log(`${unit.name} ya actuó este turno.`); return; }
  unit.acted = true;
  if(!hasStatus(unit,"def")) unit.statuses.push({type:"def",turns:1});
  // Important: DEF is state only. No FX, no grid overlay, no board class.
  log(`${unit.name} entra en DEF: +2 Guardia al primer ataque recibido.`);
  spawnSafeFx(unit,"🛡 DEF");
  render();
}
function spawnSafeFx(unit,label){
  const layer = $("fxLayer");
  const p = getUnitPoint(unit);
  const el = document.createElement("div");
  el.className = "fx";
  el.style.left = `${p.x}px`;
  el.style.top = `${p.y - 20}px`;
  el.innerHTML = `<div class="badge">${escapeHtml(label)}</div>`;
  layer.appendChild(el);
  setTimeout(()=>el.remove(),720);
}
function endTurn(){
  state.currentPlayer = state.currentPlayer === 1 ? 2 : 1;
  if(state.currentPlayer === 1) state.turn++;
  state.units.forEach(u=>u.acted=false);
  log(`Turno de Jugador ${state.currentPlayer}.`);
  render();
}
function reset(){
  localStorage.removeItem("hallvalla_local_clean_core");
  newGame();
}
function escapeHtml(str){
  return String(str ?? "").replace(/[&<>"']/g, ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[ch]));
}

$("startBtn").addEventListener("click",newGame);
$("resetBtn").addEventListener("click",reset);
$("backHomeBtn").addEventListener("click",showHome);
$("endTurnBtn").addEventListener("click",endTurn);
$("defBtn").addEventListener("click",activateDef);
$("moveBtn").addEventListener("click",()=>log("MOV todavía no migrado en este core local."));
$("attackBtn").addEventListener("click",()=>log("ATTK todavía no migrado en este core local."));
$("detBtn").addEventListener("click",()=>renderPanel());

showHome();
