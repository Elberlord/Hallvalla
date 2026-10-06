"use strict";
/* HallValla · Economy Authority v146 · client bridge v2
   gold/gems/fragments are mirrors only. Canonical balance lives in economyV146.
*/
(()=>{
  const ENDPOINT="https://hallvalla-economy-authority.anakinjd1985.workers.dev";
  const CACHE_PREFIX="hallvalla_authoritative_wallet_v146_";
  const QUEUE_PREFIX="hallvalla_economy_claim_queue_v146_";
  let wallet=null,uid="",bootPromise=null,flushPromise=null,internalWrite=false;

  function user(){try{return getAuth().currentUser||null;}catch(_){return null;}}
  function n(v,max=2147483647){return Math.max(0,Math.min(max,Math.floor(Number(v)||0)));}
  function safeWallet(v={}){return Object.freeze({gold:n(v.gold),gems:n(v.gems),fragments:n(v.fragments)});}
  function cacheKey(id){return `${CACHE_PREFIX}${String(id||"")}`;}
  function queueKey(id){return `${QUEUE_PREFIX}${String(id||"")}`;}
  function getCached(id=uid){
    if(wallet&&id===uid)return wallet;
    try{const v=JSON.parse(localStorage.getItem(cacheKey(id))||"null");return v?safeWallet(v):null;}catch(_){return null;}
  }
  function setCached(id,v){
    uid=String(id||uid||"");wallet=safeWallet(v);
    try{if(uid)localStorage.setItem(cacheKey(uid),JSON.stringify(wallet));}catch(_){}
    return wallet;
  }
  function overlayProfile(profile){
    if(!profile||typeof profile!=="object")return profile;
    const w=getCached(String(user()?.uid||uid||""));
    if(w){profile.gold=w.gold;profile.gems=w.gems;profile.fragments=w.fragments;}
    return profile;
  }
  function guardProfileForSave(profile){
    const p=profile&&typeof profile==="object"?profile:{};
    if(internalWrite)return p;
    const w=getCached(String(user()?.uid||uid||""));
    if(w){p.gold=w.gold;p.gems=w.gems;p.fragments=w.fragments;}
    return p;
  }
  function repaint(){
    try{
      const p=typeof getPlayerProfile==="function"?getPlayerProfile():null;
      if(typeof renderPlayerProfile==="function")renderPlayerProfile(p);
      if(typeof renderHomeProgress==="function")renderHomeProgress();
      if(typeof renderMineResourceValues==="function")renderMineResourceValues();
    }catch(_){}
  }
  function applyWallet(v,id=String(user()?.uid||uid||"")){
    const w=setCached(id,v);
    try{
      const p=JSON.parse(localStorage.getItem("hallvalla_player_profile")||"{}");
      p.gold=w.gold;p.gems=w.gems;p.fragments=w.fragments;
      internalWrite=true;
      localStorage.setItem("hallvalla_player_profile",JSON.stringify(p));
    }catch(_){}
    finally{internalWrite=false;}
    repaint();
    return w;
  }
  async function request(path,body={}){
    const u=user();if(!u)throw new Error("Debes iniciar sesión.");
    const token=await u.getIdToken(true);
    const r=await fetch(`${ENDPOINT}${path}`,{
      method:"POST",
      headers:{"Content-Type":"application/json","Authorization":`Bearer ${token}`},
      body:JSON.stringify(body||{})
    });
    let data=null;try{data=await r.json();}catch(_){}
    if(!r.ok||!data?.ok){
      const e=new Error(String(data?.message||data?.reason||`Economy HTTP ${r.status}`));
      e.code=String(data?.reason||"ECONOMY_FAILED");e.payload=data;throw e;
    }
    if(data.wallet)applyWallet(data.wallet,u.uid);
    return data;
  }
  async function bootstrap(force=false){
    if(!user())return null;
    if(bootPromise&&!force)return bootPromise;
    bootPromise=request("/bootstrap",{}).finally(()=>{bootPromise=null;});
    return bootPromise;
  }
  function opId(prefix="op"){
    const r=crypto?.randomUUID?.()||`${Date.now()}_${Math.random().toString(36).slice(2,10)}`;
    return `${String(prefix||"op").replace(/[^A-Za-z0-9:_-]/g,"_").slice(0,50)}:${r}`.slice(0,120);
  }
  async function spend(kind,payload={},id=""){
    await bootstrap();
    return request("/spend",{kind:String(kind||""),opId:String(id||opId(kind)),payload:payload||{}});
  }
  async function claim(kind,payload={}){
    await bootstrap();
    return request("/claim",{kind:String(kind||""),payload:payload||{}});
  }

  function readQueue(id=uid){
    try{const q=JSON.parse(localStorage.getItem(queueKey(id))||"[]");return Array.isArray(q)?q.filter(Boolean).slice(-200):[];}
    catch(_){return[];}
  }
  function saveQueue(id,q){try{localStorage.setItem(queueKey(id),JSON.stringify((q||[]).slice(-200)));}catch(_){}}
  function queueClaim(kind,payload={}){
    const u=user();if(!u)return Promise.resolve(false);
    const item={kind:String(kind||""),payload:payload||{},queuedAt:Date.now()};
    const fingerprint=JSON.stringify([item.kind,item.payload]);
    const q=readQueue(u.uid);
    if(!q.some(x=>JSON.stringify([x.kind,x.payload])===fingerprint)){q.push(item);saveQueue(u.uid,q);}
    return flush();
  }
  async function flush(){
    if(flushPromise)return flushPromise;
    const u=user();if(!u)return false;
    flushPromise=(async()=>{
      await bootstrap();
      let q=readQueue(u.uid);
      while(q.length){
        try{await request("/claim",q[0]);q.shift();saveQueue(u.uid,q);}
        catch(e){
          if(["ALREADY_CLAIMED","NOTHING_TO_SETTLE"].includes(String(e.code||""))){q.shift();saveQueue(u.uid,q);continue;}
          console.warn("[HallValla][Economy] Claim pendiente:",q[0],e.code||e);
          setTimeout(()=>void flush(),5000);
          break;
        }
      }
      return q.length===0;
    })().finally(()=>{flushPromise=null;});
    return flushPromise;
  }
  async function state(){await bootstrap();return request("/state",{});}
  async function selfTest(){
    const u=user();if(!u)throw new Error("Inicia sesión.");
    const server=(await state()).wallet;
    const raw=JSON.parse(localStorage.getItem("hallvalla_player_profile")||"{}");
    raw.gold=n(server.gold)+5000000;raw.gems=n(server.gems)+999999;raw.fragments=n(server.fragments)+999999;
    localStorage.setItem("hallvalla_player_profile",JSON.stringify(raw));
    const guarded=overlayProfile(JSON.parse(localStorage.getItem("hallvalla_player_profile")||"{}"));
    const after=(await state()).wallet;applyWallet(after,u.uid);
    const ok=guarded.gold===after.gold&&guarded.gems===after.gems&&guarded.fragments===after.fragments;
    if(!ok)throw new Error("Tamper local no fue neutralizado.");
    return {ok:true,revision:3,localTamperRejected:true,wallet:after};
  }

  try{
    onAuthStateChanged(getAuth(),u=>{
      if(!u){uid="";wallet=null;return;}
      uid=u.uid;const cached=getCached(uid);if(cached)applyWallet(cached,uid);
      setTimeout(()=>void bootstrap(true).then(()=>flush()).catch(e=>console.warn("[HallValla][Economy] bootstrap:",e)),250);
    });
  }catch(e){console.warn("[HallValla][Economy] auth hook:",e);}
  addEventListener("online",()=>void flush(),{passive:true});
  document.addEventListener("visibilitychange",()=>{if(!document.hidden)void bootstrap().then(()=>flush()).catch(()=>{});},{passive:true});

  Object.assign(globalThis,{
    hallvallaEconomyOverlayProfile:overlayProfile,
    hallvallaEconomyGuardProfileForSave:guardProfileForSave,
    hallvallaEconomyApplyWallet:applyWallet,
    hallvallaEconomyBootstrap:bootstrap,
    hallvallaEconomyState:state,
    hallvallaEconomySpend:spend,
    hallvallaEconomyClaim:claim,
    hallvallaEconomyQueueClaim:queueClaim,
    hallvallaEconomyFlush:flush,
    hallvallaEconomySelfTest:selfTest
  });
  console.info("[HallValla][Economy] Authority client v2 READY.");
})();
