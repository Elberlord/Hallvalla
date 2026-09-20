(function(){
  function safeUniqueStrings(values=[]){
    const seen=new Set();
    return (Array.isArray(values)?values:[values]).map(v=>String(v||"").trim()).filter(v=>v&&!seen.has(v)&&(seen.add(v),true));
  }
  function createHallvallaPvpLobbyMatchmakingApi(deps={}){
    const $=deps.$||((id)=>document.getElementById(id));
    const getState=typeof deps.getState==="function"?deps.getState:()=>({});
    const normalizeFirebaseArray=deps.normalizeFirebaseArray||((value)=>Array.isArray(value)?value:(value==null?[]:[value]));
    const applyShowcaseImage=(img,candidates=[])=>{
      if(!img)return;
      const queue=safeUniqueStrings(candidates);
      let index=0;
      img.onerror=()=>{index+=1;if(index<queue.length)img.src=queue[index];else{img.removeAttribute("src");img.style.visibility="hidden";}};
      if(queue.length){img.style.visibility="visible";img.src=queue[0];}
      else{img.removeAttribute("src");img.style.visibility="hidden";}
    };
    const buildPublicShowcase=(privatePayload=null)=>{
      let leaderType=String(privatePayload?.battleProfile?.leaderType||"").trim();
      let principalKeys=normalizeFirebaseArray(privatePayload?.loadout?.principalKeys).map(v=>String(v||"").trim()).filter(Boolean);
      if(!leaderType){
        try{leaderType=String((typeof deps.getSelectedLeaderType==="function"&&deps.getSelectedLeaderType())||"warrior");}catch(_){leaderType="warrior";}
      }
      if(!principalKeys.length&&typeof deps.getSavedPrincipalKeysSafe==="function")principalKeys=deps.getSavedPrincipalKeysSafe().slice(0,3);
      return {leaderType:leaderType||"warrior",principalKeys:safeUniqueStrings(principalKeys).slice(0,3)};
    };
    const renderShowcaseSide=(side,showcase)=>{
      const safe=showcase&&typeof showcase==="object"?showcase:{};
      const leaderType=String(safe.leaderType||"").trim();
      const avatarId=side==="opponent"?"matchmakingOpponentAvatar":"matchmakingPlayerAvatar";
      const avatar=$(avatarId);
      let leaderSrc="";
      try{leaderSrc=String((deps.LEADER_PORTRAITS||globalThis.LEADER_PORTRAITS||{})[leaderType]||"");}catch(_){ }
      applyShowcaseImage(avatar,[leaderSrc]);
    };
    const renderRandomMatchmakingUi=(room={})=>{
      const state=getState();
      if(state.onlineFlowMode!=="random")return;
      const role=Number(state.activeRole||1);
      const otherRole=role===1?2:1;
      const localShowcase=room?.playerShowcase?.[role]||room?.playerShowcase?.[String(role)]||buildPublicShowcase();
      const opponentShowcase=room?.playerShowcase?.[otherRole]||room?.playerShowcase?.[String(otherRole)]||null;
      renderShowcaseSide("player",localShowcase);
      const otherUid=String(room?.playerSlots?.[`player${otherRole}Uid`]||"");
      const found=!!otherUid;
      renderShowcaseSide("opponent",found?opponentShowcase:null);
      const searchState=$("matchmakingSearchingState");
      if(searchState){
        searchState.classList.toggle("is-rival-found",found);
        searchState.classList.remove("hidden");
      }
    };
    const renderMatchmakingLeague=(snapshot)=>{
      const node=$("matchmakingLeagueLabel");
      if(!node)return;
      const safe=snapshot&&typeof snapshot==="object"?snapshot:{key:"stone",name:"Piedra",points:0};
      node.textContent=`LIGA ${String(safe.name||"Piedra").toUpperCase()} · ${Number(safe.points||0)} PTS`;
      node.dataset.league=String(safe.key||"stone");
    };
    const setOnlineFlowMode=(mode)=>{
      if(typeof deps.setOnlineFlowModeState==="function")deps.setOnlineFlowModeState(String(mode||"select"));
      const onlineFlowMode=String(mode||"select");
      const selector=$("onlineModeSelect");
      const matchmaking=$("onlineMatchmakingView");
      const art=document.querySelector("#onlineLobby .online-modal-art");
      const isSelect=onlineFlowMode==="select";
      const isRandom=onlineFlowMode==="random";
      const isWager=onlineFlowMode==="wager";
      if(selector)selector.classList.toggle("hidden",!isSelect);
      if(matchmaking)matchmaking.classList.toggle("hidden",!isRandom);
      if(art){
        art.classList.toggle("hidden",!isWager);
        art.classList.remove("pvp-room-active");
      }
    };
    const showOnlineModeSelect=()=>{
      if(typeof deps.clearRandomAutoReady==="function")deps.clearRandomAutoReady();
      setOnlineFlowMode("select");
    };
    const showWagerLobby=()=>{
      if(typeof deps.clearRandomAutoReady==="function")deps.clearRandomAutoReady();
      try{deps.hydrateAssetGroup?.("pvp-lobby");}catch(_){ }
      setOnlineFlowMode("wager");
    };
    return {safeUniqueStrings,buildPublicShowcase,renderRandomMatchmakingUi,renderMatchmakingLeague,setOnlineFlowMode,showOnlineModeSelect,showWagerLobby};
  }
  globalThis.createHallvallaPvpLobbyMatchmakingApi=createHallvallaPvpLobbyMatchmakingApi;
})();
