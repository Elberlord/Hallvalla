const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const path=require('path');
const modulePath=fs.existsSync(path.join(__dirname,'hv280-presentation.js'))?path.join(__dirname,'hv280-presentation.js'):path.resolve(__dirname,'../../web/js/game/hv280-presentation.js');
const text=fs.readFileSync(modulePath,'utf8');
const speech=[],effects=[],elements={};
let cid=0;
const dom=()=>({className:'',children:[],style:{},classList:{add(){},remove(){}},setAttribute(){},replaceChildren(){},append(...nodes){this.children.push(...nodes)},appendChild(node){this.children.push(node)},get offsetWidth(){return 50;}});
const s={
  speechSynthesis:{getVoices:()=>[{lang:'es-ES',name:'Jorge',localService:true}],addEventListener(){},speak(item){speech.push(item.text)},cancel(){}},
  SpeechSynthesisUtterance:class{constructor(s){this.text=s}},
  document:{documentElement:{lang:'es'},body:{appendChild(el){elements[el.id]=el}},getElementById(id){return elements[id]||null},createElement:dom},
  navigator:{language:'es-ES'},gameSettings:{sound:true,sfx:true},localStorage:{getItem:()=>null,setItem(){}},
  publicState:{phase:'combat'},gameId:'pvp123',myPlayer:1,
  isBattleEnded:()=>false,
  HV_LEADER_NINE_SKILLS:{catalog:{archer:[{id:'arrow_rain',name:'Lluvia de flechas'}, {id:'fire_arrows',name:'Flechas incendiarias'}]}},
  spawnBattleFxNode(...a){effects.push(a)},getGridCellCenter(x,y){return {x,y}},
  maybePlayBattleFx(){return 'original'},console,setTimeout(fn,ms){return ++cid},clearTimeout(){},Date,Number,String,Map,Set,
};s.globalThis=s;vm.createContext(s);vm.runInContext(text,s);
const prev={mode:'online',units:[{id:'L1',leader:true,leaderType:'archer',owner:1,hp:20,leaderLevel:10,x:0,y:0,hvLeaderSkillLast:{}},{id:'e1',owner:2,hp:10,x:6,y:6}],log:[]};
const next={mode:'online',phase:'combat',units:[{id:'L1',leader:true,leaderType:'archer',owner:1,hp:20,leaderLevel:10,x:0,y:0,hvLeaderSkillLast:{fire_arrows:30000}},{id:'e1',owner:2,hp:10,x:6,y:6},{id:'a2',owner:1,hp:12,x:1,y:2,name:'Aquiles'}],log:['J1 usa Bola de fuego: acierta.']};
assert.equal(s.maybePlayBattleFx(prev,next),'original');
assert(effects.some(v=>v[0].includes('hv280-fire')),'fx de habilidad no generado');
assert(elements.hv280AnnouncerFx?.children?.length===2,'banner de habilidad no generado');
assert(speech.some(x=>x==='Aquiles'),'voz invocacion ausente');
assert.equal(s.hv280Announcer.supported,true);
assert(s.hv280Announcer.queueSize()>=2,'habilidad y carta deben esperar locucion prioritaria');
const count=effects.length;s.maybePlayBattleFx(next,next);assert.equal(effects.length,count,'activacion duplicada');
console.log('OK v280: wrapper compatible, invocacion, FX de habilidad, deduplicacion y narrador');