"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const root=path.resolve(__dirname,"../..");
const combat=fs.readFileSync(path.join(root,"web/js/realtime/autonomy.js"),"utf8");
const runtime=fs.readFileSync(path.join(root,"web/js/realtime/runtime.js"),"utf8");
const factory=fs.readFileSync(path.join(root,"web/js/game/entity-factories.js"),"utf8");
const catalog=fs.readFileSync(path.join(root,"web/js/game/card-catalog-data.js"),"utf8");
const start=combat.indexOf("async function hallvallaRtPelidGrowthTick(now){");
const end=combat.indexOf("async function hallvallaRtCombatRefreshTick(now){",start);
assert.ok(start>=0&&end>start,"Falta temporizador individual de Aquiles");
const handler=combat.slice(start,end);
const combatCycle=combat.slice(end,combat.indexOf("async function hallvallaRtAiCardCost",end));
assert.ok(!combatCycle.includes('hvCardMark({...u,hp:Math.min(effectiveMaxHp(u)'),"No debe regenerarse por ventana tactica");
assert.ok(runtime.includes('()=>hallvallaRtPelidGrowthTick(now)'),"El motor TR debe ejecutar el temporizador individual");
assert.ok(factory.includes('sangre_pelida:Date.now()+30000'),"Primera activacion 30 s despues de invocar");
assert.ok(catalog.includes("Sangre del Pélida: cada 30 s, gana +1 Vida máxima y +1 Vida actual"),"El texto debe describir su efecto");
let state={units:[{id:"a",key:"achilles",hp:5,maxHp:5,hvCardCooldowns:{sangre_pelida:30000}}]};
let calls=0;
const mark=(u,id,once,now)=>({...u,hvCardCooldowns:{...(u.hvCardCooldowns||{}),[id]:now+30000}});
const updatePublic=async({units})=>{calls++;state.units=units;return true;};
async function tick(time){
  const run=new Function("publicState","hvCardMark","updatePublic",handler+";return hallvallaRtPelidGrowthTick;")(state,mark,updatePublic);
  return run(time);
}
async function run(){
  assert.equal(await tick(10000),false);assert.equal(calls,0,"No cambiar antes de 30s");
  assert.equal(await tick(29999),false);assert.deepEqual([state.units[0].hp,state.units[0].maxHp],[5,5]);
  await tick(30000);assert.deepEqual([state.units[0].hp,state.units[0].maxHp],[6,6],"Crece exactamente al vencer cooldown");
  assert.equal(await tick(40000),false);
  await tick(60000);assert.deepEqual([state.units[0].hp,state.units[0].maxHp],[7,7]);
  state.units[0].hp=3;
  await tick(90000);assert.deepEqual([state.units[0].hp,state.units[0].maxHp],[4,8],"Crece maxHP aun herido");
  state.units.push({id:"b",key:"achilles",hp:5,maxHp:5,hvCardCooldowns:{sangre_pelida:120000}});
  state.units.push({id:"other",key:"guardian",hp:4,maxHp:4});
  await tick(120000);assert.deepEqual([state.units[0].hp,state.units[0].maxHp],[5,9]);
  assert.deepEqual([state.units[1].hp,state.units[1].maxHp],[6,6],"Segundo Aquiles crece independiente");
  assert.deepEqual([state.units[2].hp,state.units[2].maxHp],[4,4],"Otras unidades no cambian");
  // El Aquiles muerto no debe incrementar vida ni generar cambios de estado.
  state.units[0]={...state.units[0],hp:0};
  state.units[1]={...state.units[1],hp:0};
  const previousCalls=calls;
  assert.equal(await tick(500000),false);assert.equal(calls,previousCalls,"No procesa unidades muertas");
  assert.deepEqual([state.units[0].hp,state.units[0].maxHp],[0,9]);
  // Migracion: una copia viva sin cooldown inicia sus 30 s, sin curarse al cargar.
  state.units=[{id:"legacy",key:"achilles",hp:5,maxHp:5,hvCardCooldowns:{}}];
  await tick(600000);assert.deepEqual([state.units[0].hp,state.units[0].maxHp],[5,5]);
  assert.equal(state.units[0].hvCardCooldowns.sangre_pelida,630000);
  await tick(630000);assert.deepEqual([state.units[0].hp,state.units[0].maxHp],[6,6]);
  console.log("PASS: Aquiles crece cada 30s desde su propio reloj; muerto no se procesa; copias independientes.");
}
run().catch(e=>{console.error(e);process.exitCode=1;});
