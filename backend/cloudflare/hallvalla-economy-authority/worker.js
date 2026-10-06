/* HallValla Economy Authority · v146 · Worker v4 · Server Fraud Audit */
"use strict";

const PROJECT_ID="hallvalla-online";
const DB_BASE="https://hallvalla-online-default-rtdb.firebaseio.com";
const ISSUER=`https://securetoken.google.com/${PROJECT_ID}`;
const JWK_URL="https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com";
const TOKEN_URL="https://oauth2.googleapis.com/token";
const SCOPE="https://www.googleapis.com/auth/firebase.database https://www.googleapis.com/auth/userinfo.email";
const MAX=2147483647;
const HALLVALLA_MASTER_ADMIN_UID="5V3mDjSyeNbI7W0qI16cEz5PbsN2";
const SECURITY_WINDOW_MS=24*60*60*1000;
const SECURITY_AUTO_HOLD_MS=24*60*60*1000;
const SECURITY_AUTO_HOLD_SCORE=100;

const GOLD_OFFERS=Object.freeze([
  {gold:5000,gems:90},{gold:2500,gems:50},{gold:7500,gems:130},
  {gold:10000,gems:170},{gold:15000,gems:240},{gold:50000,gems:700},{gold:25000,gems:380}
]);
const PACK_COST=Object.freeze({basic:100,rare:400,epic:900,mythic:1400,legendary:2000});
const ADVENTURE_GOLD=Object.freeze({
  guardian_mage:10,battle1:10,battle2:12,battle3:15,battle4:18,battle5:25,
  chapter2_1_battle1:28,chapter2_1_battle2:32,chapter2_1_battle3:40,
  chapter3_1_battle1:42,chapter3_1_battle2:46,chapter3_1_battle3:55,
  chapter4_1_battle1:58,chapter4_1_battle2:62,chapter4_1_battle3:66,chapter4_1_battle4:75,chapter4_1_battle5:120,
  chapter5_1_battle1:82,chapter5_1_battle2:88,chapter5_1_battle3:94,chapter5_1_battle4:100,chapter5_1_battle5:120,
  chapter6_1_battle1:125,chapter6_1_battle2:130,chapter6_1_battle3:135,chapter6_1_battle4:145,chapter6_1_battle5:160,chapter6_1_battle6:150,
  chapter7_1_battle1:170,chapter7_1_battle2:175,chapter7_1_battle3:180,chapter7_1_battle4:185,chapter7_1_battle5:205,
  chapter8_1_battle1:210,chapter8_1_battle2:215,chapter8_1_battle3:220,chapter8_1_battle4:225,chapter8_1_battle5:245,
  chapter9_1_battle1:250,chapter9_1_battle2:255,chapter9_1_battle3:260,chapter9_1_battle4:265,chapter9_1_battle5:285,
  chapter10_1_battle1:290,chapter10_1_battle2:295,chapter10_1_battle3:300,chapter10_1_battle4:305,
  chapter11_1_battle1:335,chapter11_1_battle2:340,chapter11_1_battle3:345,chapter11_1_battle4:350
});
const DRAGON_GOLD=Object.freeze({dragon_contract_lightning:120,dragon_contract_fire:160,dragon_contract_ice:220});
const MINE_EVENT_REWARD=Object.freeze({tesoro:{gold:120,gems:2},veta_rica:{gems:3},camara_secreta:{gems:2,fragments:60}});
const MINE_REPAIR_COST=Object.freeze({incendio:40,inundacion:50,derrumbe:60});
const MASTERY_KEYS=new Set(["summons","kills","collection","spells","traps","equipment"]);
const SYSTEM_TUTORIAL_STEPS=Object.freeze({home:6,mine:6,deck:5,events:4,adventure:4,pvp:4,shop:4,forge:3,missions:3});
const BASIC_TUTORIAL_STEP_MAX=6;
const TACTICS_TUTORIAL_STEP_MAX=12;
const DAILY_ALLOWED=new Set(["gold:25","gold:50","gold:75","gold:100","gems:2","gems:3","fragments:10","fragments:20"]);
const MINE_MISSION_BASE=Object.freeze({
  fire_control:{gold:75},flood_control:{gold:75},cave_secure:{gold:100},collect_10:{gold:120},
  full_capacity:{gems:3},wheel_5:{gold:100},jackpot:{gold:500},collect_50:{gems:10}
});
const MINE_MISSION_FACTORS=Object.freeze([1,2,3,5,8,12,18,26,36,48,62,78,96,116,138,162]);
const WHEEL_CURRENCY=Object.freeze({
  p_gems_25:{gems:25},p_gems_50:{gems:50},p_gold_300:{gold:300},p_fragments_75:{fragments:75},
  n_gold_25:{gold:-25},n_gold_40:{gold:-40},n_frag_10:{fragments:-10},n_gold_50:{gold:-50},
  n_gold_75:{gold:-75},n_frag_20:{fragments:-20},n_gold_100:{gold:-100},n_frag_30:{fragments:-30},
  n_gold_125:{gold:-125},n_frag_40:{fragments:-40},n_gem_15:{gems:-15}
});
const WHEEL_ACCELERATION=new Set(["p_half_all","p_half_slot","p_complete_slot","p_complete_all","p_cycle_slot_2","p_cycle_slot_3","p_cycle_all_2","p_advance_slot_6","p_advance_all_6","p_advance_slot_12","p_advance_all_12"]);

let jwks=null,jwksExp=0,saToken="",saExp=0;

function cors(origin="*"){return {"Access-Control-Allow-Origin":origin||"*","Access-Control-Allow-Headers":"Authorization, Content-Type","Access-Control-Allow-Methods":"GET,POST,OPTIONS","Cache-Control":"no-store"};}
function out(data,status=200,origin="*"){return new Response(JSON.stringify(data),{status,headers:{...cors(origin),"Content-Type":"application/json; charset=utf-8"}});}
function pos(v,max=MAX){return Math.max(0,Math.min(max,Math.floor(Number(v)||0)));}
function signed(v,max=MAX){return Math.max(-max,Math.min(max,Math.trunc(Number(v)||0)));}
function wallet(v={}){return {gold:pos(v.gold),gems:pos(v.gems),fragments:pos(v.fragments)};}
function cleanKey(v,max=140){const s=String(v||"").replace(/[.#$/\[\]]/g,"_").replace(/\s+/g,"_").slice(0,max);if(!s)throw new Error("KEY_INVALID");return s;}
function receipt(...parts){return cleanKey(parts.map(x=>String(x??"")).join(":"),180);}
function bytes64(s){const x=String(s||"").replace(/-/g,"+").replace(/_/g,"/"),p=x.length%4?"=".repeat(4-x.length%4):"";const raw=atob(x+p),a=new Uint8Array(raw.length);for(let i=0;i<raw.length;i++)a[i]=raw.charCodeAt(i);return a;}
function json64(s){return JSON.parse(new TextDecoder().decode(bytes64(s)));}
function enc64(bytes){const a=bytes instanceof Uint8Array?bytes:new Uint8Array(bytes);let s="";for(const b of a)s+=String.fromCharCode(b);return btoa(s).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");}
function text64(s){return enc64(new TextEncoder().encode(String(s)));}
function maxAge(h){const m=String(h.get("cache-control")||"").match(/max-age=(\d+)/i);return m?Math.max(60,Number(m[1])||60):3600;}

async function keys(force=false){
  if(!force&&jwks&&Date.now()<jwksExp)return jwks;
  const r=await fetch(JWK_URL);if(!r.ok)throw new Error("FIREBASE_PUBLIC_KEYS_FAILED");
  const d=await r.json();if(!Array.isArray(d?.keys))throw new Error("FIREBASE_PUBLIC_KEYS_INVALID");
  jwks=d.keys;jwksExp=Date.now()+maxAge(r.headers)*1000;return jwks;
}
async function verify(idToken){
  const p=String(idToken||"").split(".");if(p.length!==3)throw new Error("FIREBASE_ID_TOKEN_FORMAT");
  const h=json64(p[0]),c=json64(p[1]);if(h.alg!=="RS256"||!h.kid)throw new Error("FIREBASE_ID_TOKEN_HEADER");
  let ks=await keys(),j=ks.find(x=>x.kid===h.kid);if(!j){ks=await keys(true);j=ks.find(x=>x.kid===h.kid);}
  if(!j)throw new Error("FIREBASE_SIGNING_KEY_NOT_FOUND");
  const k=await crypto.subtle.importKey("jwk",j,{name:"RSASSA-PKCS1-v1_5",hash:"SHA-256"},false,["verify"]);
  const ok=await crypto.subtle.verify({name:"RSASSA-PKCS1-v1_5"},k,bytes64(p[2]),new TextEncoder().encode(`${p[0]}.${p[1]}`));
  if(!ok)throw new Error("FIREBASE_ID_TOKEN_SIGNATURE");
  const now=Math.floor(Date.now()/1000);
  if(c.aud!==PROJECT_ID||c.iss!==ISSUER||!c.sub||Number(c.exp||0)<=now||Number(c.iat||0)>now+60)throw new Error("FIREBASE_ID_TOKEN_INVALID");
  return {uid:String(c.sub),name:String(c.name||""),email:String(c.email||"")};
}
function pkcs8(pem){
  const b=String(pem||"").replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\s+/g,"");
  const raw=atob(b),a=new Uint8Array(raw.length);for(let i=0;i<raw.length;i++)a[i]=raw.charCodeAt(i);return a.buffer;
}
async function serviceToken(env){
  if(saToken&&Date.now()<saExp-60000)return saToken;
  const sa=JSON.parse(String(env.FIREBASE_SERVICE_ACCOUNT_JSON||""));if(!sa.client_email||!sa.private_key)throw new Error("FIREBASE_SERVICE_ACCOUNT_INVALID");
  const now=Math.floor(Date.now()/1000),h=text64(JSON.stringify({alg:"RS256",typ:"JWT"})),p=text64(JSON.stringify({iss:sa.client_email,sub:sa.client_email,aud:TOKEN_URL,iat:now,exp:now+3600,scope:SCOPE}));
  const k=await crypto.subtle.importKey("pkcs8",pkcs8(sa.private_key),{name:"RSASSA-PKCS1-v1_5",hash:"SHA-256"},false,["sign"]);
  const sig=await crypto.subtle.sign({name:"RSASSA-PKCS1-v1_5"},k,new TextEncoder().encode(`${h}.${p}`));
  const body=new URLSearchParams({grant_type:"urn:ietf:params:oauth:grant-type:jwt-bearer",assertion:`${h}.${p}.${enc64(sig)}`});
  const r=await fetch(TOKEN_URL,{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body});
  const d=await r.json();if(!r.ok||!d.access_token)throw new Error("FIREBASE_SERVER_AUTH_FAILED");
  saToken=String(d.access_token);saExp=Date.now()+Number(d.expires_in||3600)*1000;return saToken;
}
function dburl(path,token){return `${DB_BASE}/${String(path||"").replace(/^\/+|\/+$/g,"")}.json?access_token=${encodeURIComponent(token)}`;}
async function dbget(path,token){const r=await fetch(dburl(path,token));if(!r.ok)throw new Error(`DATABASE_GET_${r.status}`);return r.json();}
async function dbetag(path,token){const r=await fetch(dburl(path,token),{headers:{"X-Firebase-ETag":"true"}});if(!r.ok)throw new Error(`DATABASE_GET_${r.status}`);return {value:await r.json(),etag:r.headers.get("etag")||""};}
async function dbput(path,value,etag,token){
  const r=await fetch(dburl(path,token),{method:"PUT",headers:{"Content-Type":"application/json","if-match":etag},body:JSON.stringify(value)});
  if(r.status===412)return {conflict:true};if(!r.ok)throw new Error(`DATABASE_PUT_${r.status}`);return {conflict:false};
}
async function dbset(path,value,token){
  const r=await fetch(dburl(path,token),{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify(value)});
  if(!r.ok)throw new Error(`DATABASE_SET_${r.status}`);
  return r.json().catch(()=>value);
}
async function dbpatch(path,value,token){
  const r=await fetch(dburl(path,token),{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify(value)});
  if(!r.ok)throw new Error(`DATABASE_PATCH_${r.status}`);
  return r.json().catch(()=>value);
}

function cloudProfile(c){try{const x=c?.storage?.hallvalla_player_profile;return typeof x==="string"?JSON.parse(x):{};}catch(_){return{};}}
async function seed(uid,token){
  const [a,b]=await Promise.all([dbget(`users/${uid}/cloudSaveV2`,token).catch(()=>null),dbget(`users/${uid}/cloudSaveV1`,token).catch(()=>null)]);
  const c=Number(b?.updatedAt||0)>Number(a?.updatedAt||0)?b:a,p=cloudProfile(c);
  return {wallet:wallet(p),renameCount:pos(p.nameChangeCount,1000000),source:c?(c===b?"cloudSaveV1":"cloudSaveV2"):"empty"};
}
async function ensure(uid,token){
  for(let i=0;i<6;i++){
    const g=await dbetag(`economyV146/${uid}`,token);
    if(g.value?.version===3&&g.value?.wallet)return g.value;
    const now=Date.now();
    let next;
    if(g.value?.wallet){next={...g.value,version:3,meta:{...(g.value.meta||{}),mineSettled:{...(g.value.meta?.mineSettled||{})}},updatedAt:now};}
    else{const s=await seed(uid,token);next={version:3,wallet:s.wallet,meta:{renameCount:s.renameCount,migrationSource:s.source,dailyLastAt:0,mineSettled:{}},receipts:{},migratedAt:now,updatedAt:now};}
    const p=await dbput(`economyV146/${uid}`,next,g.etag,token);if(!p.conflict)return next;
  }
  throw new Error("ECONOMY_BOOTSTRAP_CONFLICT");
}
function deltaWallet(w,d={}){
  const x=wallet(w);
  for(const k of ["gold","gems","fragments"]){const z=x[k]+signed(d[k]||0);if(z<0)throw new Error(`INSUFFICIENT_${k.toUpperCase()}`);if(z>MAX)throw new Error("BALANCE_LIMIT");x[k]=z;}
  return x;
}
function nextMasteryTarget(current){
  const n=Math.max(1000000,Math.floor(Number(current)||1000000)),exp=Math.floor(Math.log10(n)),power=Math.pow(10,exp),mantissa=n/power;
  const next=mantissa<4.999999?5*power:10*power;
  return Number.isSafeInteger(next)&&next>n?next:null;
}
function masteryReward(target){
  const t=pos(target,Number.MAX_SAFE_INTEGER),known=new Map([
    [10,{gold:5}],[25,{gold:10,fragments:10}],[50,{gold:20,gems:1,fragments:25}],[100,{gold:40,gems:2,fragments:50}],
    [250,{gold:75,gems:3,fragments:100}],[500,{gold:150,gems:5,fragments:200}],[1000,{gold:300,gems:10,fragments:350}],
    [5000,{gold:600,gems:20,fragments:600}],[10000,{gold:1000,gems:35,fragments:1000}],[50000,{gold:2000,gems:75,fragments:2000}],
    [100000,{gold:4000,gems:125,fragments:3500}],[500000,{gold:8000,gems:250,fragments:7000}],[1000000,{gold:12000,gems:500,fragments:12000}]
  ]);
  if(known.has(t))return known.get(t);
  let cursor=1000000,steps=0;
  while(cursor<t&&steps<100){const next=nextMasteryTarget(cursor);if(!next)break;cursor=next;steps++;}
  if(cursor===t&&t>1000000)return {gold:12000+steps*4000,gems:500+steps*150,fragments:12000+steps*3000};
  throw new Error("MASTERY_TARGET_NOT_SERVER_AUTHORIZED");
}
async function latestCloud(uid,token){
  const [v2,v1]=await Promise.all([dbget(`users/${uid}/cloudSaveV2`,token).catch(()=>null),dbget(`users/${uid}/cloudSaveV1`,token).catch(()=>null)]);
  if(v2&&v1)return Number(v1.updatedAt||0)>Number(v2.updatedAt||0)?v1:v2;
  return v2||v1||null;
}
function cloudJson(cloud,key){
  try{const raw=cloud?.storage?.[key];return typeof raw==="string"?JSON.parse(raw):null;}catch(_){return null;}
}
function tutorialReward(mode,key){
  const m=String(mode||""),k=String(key||"");
  if(m==="complete"){
    if(k==="basic")return 20;
    const hit=k.match(/^system_([a-z_]+)$/);if(hit&&Object.prototype.hasOwnProperty.call(SYSTEM_TUTORIAL_STEPS,hit[1]))return 20;
    throw new Error("TUTORIAL_REWARD_INVALID");
  }
  if(m!=="step")throw new Error("TUTORIAL_REWARD_INVALID");
  let hit=k.match(/^basic_(\d+)$/);if(hit&&Number(hit[1])>=0&&Number(hit[1])<=BASIC_TUTORIAL_STEP_MAX)return 5;
  hit=k.match(/^tactics_(\d+)$/);if(hit&&Number(hit[1])>=0&&Number(hit[1])<=TACTICS_TUTORIAL_STEP_MAX)return 5;
  hit=k.match(/^system_([a-z_]+)_(\d+)$/);
  if(hit&&Object.prototype.hasOwnProperty.call(SYSTEM_TUTORIAL_STEPS,hit[1])&&Number(hit[2])>=0&&Number(hit[2])<SYSTEM_TUTORIAL_STEPS[hit[1]])return 5;
  throw new Error("TUTORIAL_REWARD_INVALID");
}
function mineRateMs(level){const hours={1:24,2:20,3:16,4:12,5:8}[Math.max(1,Math.min(5,pos(level,5)))]||24;return hours*60*60*1000;}
async function resolveMineProduction(payload,uid,token,state){
  const mine=await dbget(`users/${uid}/mine/state`,token);if(!mine)throw new Error("MINE_STATE_NOT_FOUND");
  const slots=Array.isArray(mine.slots)?mine.slots:Object.values(mine.slots||{}),rate=mineRateMs(mine.level),now=Date.now();
  const requested=Array.isArray(payload?.indexes)?[...new Set(payload.indexes.map(v=>pos(v,19)).filter(v=>v>=0&&v<20))]:Array.from({length:20},(_,i)=>i);
  const settled={...(state?.meta?.mineSettled||{})};let gain=0;const stamp=[];
  for(const i of requested){
    const slot=slots[i]||{},startedAt=pos(slot.startedAt,9999999999999),claimed=pos(slot.claimedCycles,1000000000);
    if(!slot.cardKey||!startedAt){delete settled[i];continue;}
    const produced=Math.max(0,Math.floor((now-startedAt)/rate));
    const prev=settled[i]&&Number(settled[i].startedAt)===startedAt?pos(settled[i].produced,1000000000):claimed;
    const base=Math.max(claimed,prev),delta=Math.max(0,produced-base);
    gain+=delta;settled[i]={startedAt,produced:Math.max(base,produced)};stamp.push(`${i}-${startedAt}-${Math.max(base,produced)}`);
  }
  if(gain>10000)throw new Error("MINE_PRODUCTION_LIMIT");
  return {key:receipt("mine_production",stamp.join("_")),delta:{gems:gain},meta:{mineSettled:settled},note:`mine_production:${gain}`};
}
function mineMissionReward(id,tier){
  const base=MINE_MISSION_BASE[String(id||"")],n=pos(tier,1000);if(!base||n<1)throw new Error("MINE_MISSION_INVALID");
  const idx=n-1,factor=idx<MINE_MISSION_FACTORS.length?MINE_MISSION_FACTORS[idx]:MINE_MISSION_FACTORS.at(-1)+(idx-MINE_MISSION_FACTORS.length+1)*24;
  const d={};for(const k of ["gold","gems","fragments"])if(base[k])d[k]=Math.max(1,Math.floor(base[k]*factor));return d;
}
async function wheelSettlement(uid,payload,token){
  const at=pos(payload.at,9999999999999),state=await dbget(`users/${uid}/mine/rewardsWheel`,token),last=state?.lastResult||{};
  if(!at||pos(last.at,9999999999999)!==at)throw new Error("MINE_WHEEL_RESULT_MISMATCH");
  const id=String(last.id||""),cost=pos(last.cost,1000000),d={gems:-cost};
  const effect=WHEEL_CURRENCY[id]||{};
  for(const k of ["gold","gems","fragments"])d[k]=signed(d[k]||0)+signed(effect[k]||0);
  if(id==="p_jackpot")d.gems=signed(d.gems||0)+Math.max(1000,pos(state?.jackpot,1000000));
  return {key:receipt("wheel",at),delta:d,note:`wheel:${id}`};
}
async function resolveSpend(kind,payload,uid,token,state,op){
  switch(kind){
    case "exchange_gold":{
      const o=GOLD_OFFERS[pos(payload.index,99)];if(!o)throw new Error("SHOP_OFFER_INVALID");
      return {key:receipt("op",op),delta:{gems:-o.gems,gold:o.gold},note:`exchange_gold:${payload.index}`};
    }
    case "shop_pack":{
      const k=String(payload.packKey||""),c=PACK_COST[k];if(!c)throw new Error("PACK_INVALID");
      return {key:receipt("op",op),delta:{gold:-c},note:`shop_pack:${k}`};
    }
    case "rename":{
      const count=pos(state?.meta?.renameCount,1000000),cost=count<=0?0:100;
      return {key:receipt("op",op),delta:{gems:-cost},meta:{renameCount:count+1},note:"rename"};
    }
    case "beastmaster_entry":{
      const duel=pos(payload.duelNumber,999999999);if(!duel)throw new Error("BEAST_DUEL_INVALID");
      return {key:receipt("spend","beastmaster",duel),delta:{gold:-100},note:`beast_entry:${duel}`};
    }
    case "beastmaster_refund":{
      const duel=pos(payload.duelNumber,999999999);if(!state.receipts?.[receipt("spend","beastmaster",duel)])throw new Error("BEAST_ENTRY_NOT_FOUND");
      return {key:receipt("refund","beastmaster",duel),delta:{gold:100},note:`beast_refund:${duel}`};
    }
    case "dragon_entry":return {key:receipt("op",op),delta:{gold:-1000},note:`dragon_entry:${String(payload.battleId||"")}`};
    case "adventure_farm_settle":{
      const node=cleanKey(payload.nodeCode,40),cycle=pos(payload.cycleId,9999999999),rec=await dbget(`users/${uid}/adventureFarm/${node}`,token);
      if(!rec||pos(rec.cycleId,9999999999)!==cycle||pos(rec.costGems,100)!==2)throw new Error("ADVENTURE_FARM_RECORD_INVALID");
      const d={gems:-2};if(rec.rewardKind==="gold")d.gold=pos(rec.rewardAmount,1000);
      return {key:receipt("farm",node,cycle),delta:d,note:`farm:${rec.rewardKind}`};
    }
    case "mine_slot":{
      const index=pos(payload.index,19);if(index<5)throw new Error("MINE_SLOT_INVALID");
      const unlocked=pos(await dbget(`users/${uid}/mine/state/unlockedSlots`,token),20);
      if(unlocked<index+1)throw new Error("MINE_SLOT_NOT_CONFIRMED");
      return {key:receipt("mine_slot",index),delta:{gems:-(5*Math.pow(2,index-5))},note:`mine_slot:${index}`};
    }
    case "mine_repair":{
      const k=String(payload.key||""),c=MINE_REPAIR_COST[k];if(!c)throw new Error("MINE_REPAIR_INVALID");
      return {key:receipt("mine_repair",payload.eventId||k),delta:{gold:-c},note:`mine_repair:${k}`};
    }
    case "mine_potion":{
      const k=payload.kind==="leader"?"leader":"unit",day=pos(payload.day,999999999),field=k==="leader"?"leaderLastPurchaseDay":"unitLastPurchaseDay";
      const remote=await dbget(`users/${uid}/mine/shop/potions/${field}`,token);
      if(Number(remote)!==day)throw new Error("MINE_POTION_NOT_CONFIRMED");
      return {key:receipt("mine_potion",k,day),delta:{gems:-250},note:`mine_potion:${k}`};
    }
    case "mine_piece":{
      const k=cleanKey(payload.key,80),day=pos(payload.day,999999999),remote=await dbget(`users/${uid}/mine/shop/units/${k}/lastPurchaseDay`,token);
      if(Number(remote)!==day)throw new Error("MINE_PIECE_NOT_CONFIRMED");
      return {key:receipt("mine_piece",k,day),delta:{gems:-250},note:`mine_piece:${k}`};
    }
    case "mine_loss":{
      const f=String(payload.field||""),a=pos(payload.amount,1000);if(!["gold","gems","fragments"].includes(f)||!a)throw new Error("MINE_LOSS_INVALID");
      return {key:receipt("mine_loss",payload.ref||op),delta:{[f]:-a},note:`mine_loss:${f}`};
    }
    case "mine_wheel_settle":return wheelSettlement(uid,payload,token);
    default:throw new Error("SPEND_KIND_INVALID");
  }
}
async function resolveClaim(kind,payload,uid,token,state){
  switch(kind){
    case "daily":{
      const type=String(payload.type||""),amount=pos(payload.amount,100000),mk=cleanKey(payload.monthKey,20),day=pos(payload.day,31);
      if(!day||!DAILY_ALLOWED.has(`${type}:${amount}`))throw new Error("DAILY_REWARD_INVALID");
      const key=receipt("daily",mk,day);if(state.receipts?.[key])return {key,delta:{},note:"daily_replay"};
      const last=pos(state?.meta?.dailyLastAt,9999999999999),now=Date.now();if(last&&now-last<23*60*60*1000)throw new Error("DAILY_TOO_EARLY");
      return {key,delta:{[type]:amount},meta:{dailyLastAt:now},note:`daily:${type}:${amount}`};
    }
    case "tutorial":{
      const mode=String(payload.mode||""),key=cleanKey(payload.key||payload.step||mode,80),gold=tutorialReward(mode,key);
      return {key:receipt("tutorial",mode,key),delta:{gold},note:`tutorial:${mode}:${key}`};
    }
    case "mastery":{
      const k=String(payload.key||""),target=pos(payload.target,Number.MAX_SAFE_INTEGER);if(!MASTERY_KEYS.has(k))throw new Error("MASTERY_KEY_INVALID");
      const cloud=await latestCloud(uid,token),profile=cloudJson(cloud,"hallvalla_player_profile")||{},count=pos(profile?.actionMasteries?.[k]?.count,Number.MAX_SAFE_INTEGER);
      if(count<target)throw new Error("MASTERY_PROGRESS_NOT_CONFIRMED");
      return {key:receipt("mastery",k,target),delta:masteryReward(target),note:`mastery:${k}:${target}`};
    }
    case "adventure":{
      const id=String(payload.battleId||""),gold=ADVENTURE_GOLD[id];if(typeof gold!=="number")throw new Error("ADVENTURE_BATTLE_INVALID");
      const cloud=await latestCloud(uid,token),progress=cloudJson(cloud,"hallvalla_adventure_progress")||{};
      const confirmed=id==="guardian_mage"?!!(progress.guardianRewardClaimed||progress.guardianDefeated):Object.values(progress.chapters||{}).some(ch=>!!ch?.completedBattles?.[id]);
      if(!confirmed)throw new Error("ADVENTURE_PROGRESS_NOT_CONFIRMED");
      return {key:receipt("adventure",id),delta:{gold},note:`adventure:${id}`};
    }
    case "beastmaster":{
      const duel=pos(payload.duelNumber,999999999);if(!duel||!state.receipts?.[receipt("spend","beastmaster",duel)])throw new Error("BEAST_ENTRY_NOT_FOUND");
      return {key:receipt("beast_reward",duel),delta:{gems:10},note:`beast_reward:${duel}`};
    }
    case "dragon":{
      const id=String(payload.battleId||""),gold=DRAGON_GOLD[id];if(typeof gold!=="number")throw new Error("DRAGON_REWARD_INVALID");
      const cloud=await latestCloud(uid,token);if(String(cloud?.storage?.[`hallvalla_dragon_contract_claimed_${id}`]||"")!=="1")throw new Error("DRAGON_PROGRESS_NOT_CONFIRMED");
      return {key:receipt("dragon",id),delta:{gold},note:`dragon:${id}`};
    }
    case "mine_event":{
      const id=cleanKey(payload.eventId,100),k=String(payload.key||""),d=MINE_EVENT_REWARD[k];if(!d)throw new Error("MINE_EVENT_INVALID");
      const events=await dbget(`users/${uid}/mine/events/active`,token),arr=Array.isArray(events)?events:Object.values(events||{});
      if(!arr.some(e=>String(e?.id||"")===id&&String(e?.key||"")===k))throw new Error("MINE_EVENT_NOT_ACTIVE");
      return {key:receipt("mine_event",id),delta:d,note:`mine_event:${k}`};
    }
    case "mine_production":return resolveMineProduction(payload,uid,token,state);
    case "mine_compensation":{
      const at=pos(payload.at,9999999999999),wheel=await dbget(`users/${uid}/mine/rewardsWheel`,token),last=wheel?.lastResult||{};
      if(pos(last.at,9999999999999)!==at||!WHEEL_ACCELERATION.has(String(last.id||"")))throw new Error("MINE_COMPENSATION_INVALID");
      const mine=await dbget(`users/${uid}/mine/state`,token),active=(Array.isArray(mine?.slots)?mine.slots:Object.values(mine?.slots||{})).filter(s=>s?.cardKey).length;
      if(active>0)throw new Error("MINE_COMPENSATION_NOT_ALLOWED");
      return {key:receipt("mine_comp",at),delta:{gems:5},note:"mine_compensation"};
    }
    case "mine_mission":{
      const id=String(payload.missionId||""),tier=pos(payload.tier,1000),remote=pos(await dbget(`users/${uid}/mine/missions/claimed/${id}`,token),1000);
      if(!tier||remote<tier)throw new Error("MINE_MISSION_NOT_CONFIRMED");
      return {key:receipt("mine_mission",id,tier),delta:mineMissionReward(id,tier),note:`mine_mission:${id}:${tier}`};
    }
    case "adventure_farm_fallback":{
      const node=cleanKey(payload.nodeCode,40),cycle=pos(payload.cycleId,9999999999),rec=await dbget(`users/${uid}/adventureFarm/${node}`,token);
      if(!rec||pos(rec.cycleId,9999999999)!==cycle||rec.rewardKind==="gold")throw new Error("ADVENTURE_FARM_FALLBACK_INVALID");
      const m=String(rec.chapterId||"").match(/(\d+)/),level=Math.max(1,Math.min(20,Number(m?.[1]||1))),gold=80+level*60;
      return {key:receipt("farm_fallback",node,cycle),delta:{gold},note:`farm_fallback:${rec.rewardKind}`};
    }
    case "admin_reward":{
      const id=cleanKey(payload.rewardId,140),r=await dbget(`community/adminRewards/${uid}/${id}`,token);if(!r)throw new Error("ADMIN_REWARD_NOT_FOUND");
      const type=String(r.type||""),amount=pos(r.amount,1000000);if(!["gold","gems","fragments"].includes(type)||!amount)throw new Error("ADMIN_REWARD_NOT_CURRENCY");
      return {key:receipt("admin_reward",id),delta:{[type]:amount},note:`admin_reward:${id}`};
    }
    default:throw new Error("CLAIM_KIND_INVALID");
  }
}
async function transact(uid,token,resolver){
  for(let i=0;i<8;i++){
    const g=await dbetag(`economyV146/${uid}`,token);let s=g.value;
    if(!s?.wallet){await ensure(uid,token);continue;}
    s.receipts=s.receipts&&typeof s.receipts==="object"?s.receipts:{};
    const x=await resolver(s);
    if(s.receipts[x.key])return {wallet:wallet(s.wallet),receipt:s.receipts[x.key],idempotent:true};
    const w=deltaWallet(s.wallet,x.delta||{}),now=Date.now(),rc={key:x.key,note:String(x.note||"").slice(0,160),delta:{gold:signed(x.delta?.gold||0),gems:signed(x.delta?.gems||0),fragments:signed(x.delta?.fragments||0)},createdAt:now};
    const next={...s,wallet:w,meta:{...(s.meta||{}),...(x.meta||{})},receipts:{...s.receipts,[x.key]:rc},updatedAt:now};
    const p=await dbput(`economyV146/${uid}`,next,g.etag,token);if(p.conflict)continue;
    return {wallet:w,receipt:rc,idempotent:false};
  }
  throw new Error("ECONOMY_TRANSACTION_CONFLICT");
}

function securityRule(reason,body={}){
  const r=String(reason||"");
  if(
    !r||
    r==="ACCOUNT_SUSPENDED"||
    r==="NOT_FOUND"||
    r==="METHOD_NOT_ALLOWED"||
    r==="DAILY_TOO_EARLY"||
    r==="ECONOMY_TRANSACTION_CONFLICT"||
    r.startsWith("INSUFFICIENT_")||
    r.startsWith("DATABASE_")||
    r.startsWith("FIREBASE_")||
    r==="AUTH_INVALID"
  )return null;

  const critical=new Set([
    "CLAIM_KIND_INVALID",
    "SPEND_KIND_INVALID",
    "DAILY_REWARD_INVALID",
    "TUTORIAL_REWARD_INVALID",
    "BALANCE_LIMIT"
  ]);
  if(critical.has(r)){
    return {severity:"critical",points:60,summary:"Solicitud económica imposible o no autorizada"};
  }

  if(
    r.endsWith("_INVALID")||
    r==="MASTERY_TARGET_NOT_SERVER_AUTHORIZED"||
    r==="MINE_PRODUCTION_LIMIT"
  ){
    return {severity:"high",points:35,summary:"Datos económicos inválidos enviados al servidor"};
  }

  if(
    r.includes("NOT_CONFIRMED")||
    r.includes("MISMATCH")||
    r.includes("NOT_ACTIVE")||
    r.includes("PROGRESS_NOT_CONFIRMED")||
    r.includes("ENTRY_NOT_FOUND")||
    r.includes("STATE_NOT_FOUND")
  ){
    return {severity:"medium",points:15,summary:"El servidor no pudo confirmar el progreso declarado"};
  }

  return null;
}
function securityClient(request){
  const ua=String(request?.headers?.get?.("user-agent")||"");
  if(/Android/i.test(ua))return "android";
  if(/Windows/i.test(ua))return "windows";
  return "web";
}
function securityPayloadEvidence(body={}){
  try{
    const safe={
      kind:String(body?.kind||"").slice(0,60),
      opId:String(body?.opId||"").slice(0,120),
      payload:body?.payload&&typeof body.payload==="object"?body.payload:{}
    };
    return JSON.stringify(safe).replace(/[\r\n\t]+/g," ").slice(0,420);
  }catch(_){return "{}";}
}
async function securityPlayerName(uid,token,user={}){
  try{
    const cloud=await latestCloud(uid,token);
    const profile=cloudJson(cloud,"hallvalla_player_profile")||{};
    const name=String(profile?.name||user?.name||"Jugador").replace(/\s+/g," ").trim().slice(0,24);
    return name||"Jugador";
  }catch(_){
    const name=String(user?.name||"Jugador").replace(/\s+/g," ").trim().slice(0,24);
    return name||"Jugador";
  }
}
async function bumpSecurityRisk(uid,reason,points,token){
  const path=`securityV146/risk/${uid}`;
  for(let attempt=0;attempt<6;attempt++){
    const got=await dbetag(path,token);
    const now=Date.now();
    const previous=got.value&&typeof got.value==="object"?got.value:{};
    const expired=!Number(previous.windowStartedAt||0)||now-Number(previous.windowStartedAt||0)>SECURITY_WINDOW_MS;
    const counts=expired?{}:{...(previous.counts||{})};
    const code=cleanKey(reason,64);
    counts[code]=Math.min(1000000,pos(counts[code],1000000)+1);
    const score=Math.min(10000,(expired?0:pos(previous.score,10000))+Math.max(0,pos(points,1000)));
    const next={
      version:1,
      score,
      counts,
      windowStartedAt:expired?now:Number(previous.windowStartedAt),
      lastAt:now,
      lastReason:String(reason||"").slice(0,100),
      autoHoldCount:pos(previous.autoHoldCount,1000000)
    };
    const put=await dbput(path,next,got.etag,token);
    if(!put.conflict)return next;
  }
  throw new Error("SECURITY_RISK_CONFLICT");
}
async function applyAutomaticSecurityHold(uid,token,risk){
  if(uid===HALLVALLA_MASTER_ADMIN_UID)return false;
  if(pos(risk?.score,10000)<SECURITY_AUTO_HOLD_SCORE)return false;
  const now=Date.now();
  const current=await dbget(`community/moderation/${uid}`,token).catch(()=>null);
  const existingUntil=pos(current?.banUntil,9999999999999);
  const desiredUntil=now+SECURITY_AUTO_HOLD_MS;
  const banUntil=Math.max(existingUntil,desiredUntil);
  await dbpatch(`community/moderation/${uid}`,{
    muteUntil:pos(current?.muteUntil,9999999999999),
    muteReason:String(current?.muteReason||"").slice(0,180),
    banUntil,
    banReason:"Bloqueo automático de seguridad: actividad económica inválida detectada. Revisión administrativa pendiente.",
    updatedAt:now,
    updatedBy:"SERVER_SECURITY_V146"
  },token);
  return true;
}
async function createServerSecurityAlert({uid,token,user,request,reason,rule,risk,body,holdApplied=false}){
  const now=Date.now();
  const alertId=cleanKey(`economy_${now}_${crypto.randomUUID?.()||Math.random().toString(36).slice(2)}`,140);
  const attempts=Math.max(1,pos(risk?.counts?.[cleanKey(reason,64)],1000000));
  const evidence=[
    `Worker Economy r4`,
    `ruta=${new URL(request.url).pathname}`,
    `motivo=${reason}`,
    `riesgo=+${rule.points} => ${pos(risk?.score,10000)}/${SECURITY_AUTO_HOLD_SCORE}`,
    holdApplied?"AUTO-HOLD 24H=SI":"AUTO-HOLD 24H=NO",
    `datos=${securityPayloadEvidence(body)}`
  ].join(" · ").slice(0,700);
  await dbset(`community/securityAlerts/${alertId}`,{
    alertId,
    uid:String(uid).slice(0,160),
    playerName:await securityPlayerName(uid,token,user),
    severity:rule.severity,
    code:String(reason||"security").slice(0,64),
    summary:String(rule.summary||"Alerta de seguridad económica").slice(0,180),
    evidence,
    attempts,
    client:securityClient(request),
    build:"economy-r4",
    createdAt:now,
    status:"open",
    resolvedAt:0,
    resolvedBy:"",
    adminNote:""
  },token);
  return alertId;
}
async function recordSecurityIncident({uid,token,user,request,reason,body}){
  if(!uid||!token||uid===HALLVALLA_MASTER_ADMIN_UID)return null;
  const rule=securityRule(reason,body);
  if(!rule)return null;
  const risk=await bumpSecurityRisk(uid,reason,rule.points,token);
  const holdApplied=await applyAutomaticSecurityHold(uid,token,risk);
  const alertId=await createServerSecurityAlert({uid,token,user,request,reason,rule,risk,body,holdApplied});
  if(holdApplied){
    const riskPath=`securityV146/risk/${uid}`;
    await dbpatch(riskPath,{autoHoldCount:pos(risk.autoHoldCount,1000000)+1,lastAutoHoldAt:Date.now()},token).catch(()=>{});
  }
  return {alertId,riskScore:risk.score,holdApplied};
}
async function assertEconomyNotSuspended(uid,token){
  if(uid===HALLVALLA_MASTER_ADMIN_UID)return true;
  const moderation=await dbget(`community/moderation/${uid}`,token).catch(()=>null);
  if(pos(moderation?.banUntil,9999999999999)>Date.now())throw new Error("ACCOUNT_SUSPENDED");
  return true;
}
async function createSecuritySelfTestAlert(uid,token,user,request){
  if(uid!==HALLVALLA_MASTER_ADMIN_UID)throw new Error("ADMIN_ONLY");
  const now=Date.now();
  const alertId=cleanKey(`security_self_test_${now}_${crypto.randomUUID?.()||"test"}`,140);
  await dbset(`community/securityAlerts/${alertId}`,{
    alertId,
    uid:String(uid).slice(0,160),
    playerName:await securityPlayerName(uid,token,user),
    severity:"low",
    code:"server_security_self_test",
    summary:"Prueba del registro de seguridad del Worker",
    evidence:"Alerta sintética creada por la cuenta administradora. No suma riesgo y no aplica sanciones.",
    attempts:1,
    client:securityClient(request),
    build:"economy-r4",
    createdAt:now,
    status:"open",
    resolvedAt:0,
    resolvedBy:"",
    adminNote:""
  },token);
  return alertId;
}

function publicReason(e){
  const m=String(e?.message||e||"ECONOMY_FAILED");
  if(m.startsWith("FIREBASE_ID_TOKEN")||m.startsWith("FIREBASE_SIGNING"))return "AUTH_INVALID";
  return m.replace(/[^A-Za-z0-9_:-]/g,"_").slice(0,100);
}
async function auth(request){
  const h=String(request.headers.get("authorization")||"");if(!/^Bearer\s+\S+/i.test(h))throw new Error("FIREBASE_ID_TOKEN_MISSING");
  return verify(h.replace(/^Bearer\s+/i,"").trim());
}

export default{
  async fetch(request,env){
    const origin=request.headers.get("origin")||"*";
    if(request.method==="OPTIONS")return new Response(null,{status:204,headers:cors(origin)});
    const url=new URL(request.url);
    if(request.method==="GET"&&url.pathname==="/")return out({
      ok:true,
      service:"hallvalla-economy-authority",
      revision:4,
      mode:"authoritative-wallet-fraud-audit",
      serverSecurityAudit:true,
      automaticSecurityHold:true,
      autoHoldScore:SECURITY_AUTO_HOLD_SCORE
    },200,origin);
    if(request.method!=="POST")return out({ok:false,reason:"METHOD_NOT_ALLOWED"},405,origin);

    let securityContext={uid:"",token:"",user:null,body:{},path:url.pathname};

    try{
      const u=await auth(request),token=await serviceToken(env),body=await request.json().catch(()=>({}));
      securityContext={uid:u.uid,token,user:u,body,path:url.pathname};

      if(url.pathname==="/bootstrap"){
        const s=await ensure(u.uid,token);
        return out({ok:true,revision:4,wallet:wallet(s.wallet),migratedAt:s.migratedAt||0},200,origin);
      }
      if(url.pathname==="/state"){
        const s=await ensure(u.uid,token);
        return out({ok:true,revision:4,wallet:wallet(s.wallet),updatedAt:s.updatedAt||0},200,origin);
      }
      if(url.pathname==="/security-self-test"){
        const alertId=await createSecuritySelfTestAlert(u.uid,token,u,request);
        return out({ok:true,revision:4,alertId,synthetic:true,riskChanged:false,holdApplied:false},200,origin);
      }
      if(url.pathname==="/spend"){
        await assertEconomyNotSuspended(u.uid,token);
        await ensure(u.uid,token);
        const kind=String(body.kind||""),op=cleanKey(body.opId||`op_${Date.now()}`,120);
        const result=await transact(u.uid,token,s=>resolveSpend(kind,body.payload||{},u.uid,token,s,op));
        return out({ok:true,revision:4,...result},200,origin);
      }
      if(url.pathname==="/claim"){
        await assertEconomyNotSuspended(u.uid,token);
        await ensure(u.uid,token);
        const kind=String(body.kind||"");
        const result=await transact(u.uid,token,s=>resolveClaim(kind,body.payload||{},u.uid,token,s));
        return out({ok:true,revision:4,...result},200,origin);
      }
      if(url.pathname==="/self-test"){
        const s=await ensure(u.uid,token);
        return out({ok:true,revision:4,firebaseUserVerified:true,firebaseDatabaseAdmin:true,serverSecurityAudit:true,wallet:wallet(s.wallet)},200,origin);
      }
      return out({ok:false,reason:"NOT_FOUND"},404,origin);
    }catch(e){
      const reason=publicReason(e);
      if(securityContext.uid&&securityContext.token){
        try{
          await recordSecurityIncident({
            uid:securityContext.uid,
            token:securityContext.token,
            user:securityContext.user,
            request,
            reason,
            body:securityContext.body
          });
        }catch(auditError){
          console.error("[HallValla][SecurityAudit] No se pudo registrar incidente:",auditError);
        }
      }
      const status=
        reason==="AUTH_INVALID"||reason==="FIREBASE_ID_TOKEN_MISSING"?401:
        reason==="ACCOUNT_SUSPENDED"?423:
        reason==="ADMIN_ONLY"?403:
        reason.startsWith("INSUFFICIENT_")?409:
        /INVALID|NOT_FOUND|NOT_CONFIRMED|NOT_ACTIVE|NOT_ALLOWED|MISMATCH|TOO_EARLY/.test(reason)?400:
        500;
      console.error("[HallValla][Economy]",e);
      return out({ok:false,reason,message:String(e?.message||e)},status,origin);
    }
  }
};
