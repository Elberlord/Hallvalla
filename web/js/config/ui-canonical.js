/* HallValla - UI canonical configuration v193
   ONE source of truth for production and DEV.
   Production always consumes these values.
   ?dev may overlay them temporarily in localStorage, but exported changes
   must be baked back here before they become canonical for every player. */
(()=>{
  "use strict";
  const deepFreeze=value=>{
    if(!value||typeof value!=="object"||Object.isFrozen(value))return value;
    Object.values(value).forEach(deepFreeze);
    return Object.freeze(value);
  };
  globalThis.HALLVALLA_UI_CANONICAL=deepFreeze({
    version:1,
    fieldBoard:{rows:9,cols:5,cardScale:80},
    battleVisual:{
      playerLeaderScale:74,
      playerLeaderX:-4,
      playerLeaderY:43,
      enemyLeaderScale:74,
      enemyLeaderX:-5,
      enemyLeaderY:-30,
      handCardScale:56
    },
    battleClock:{
      turn:{x:-427,y:318,scale:100},
      p1:{x:148,y:11,scale:100},
      p2:{x:-159,y:9,scale:100}
    },
    fieldStats:{
      hpUnit:{iconScale:205,iconX:-29,iconY:38,ringScale:220,ringX:0,ringY:0,ringStroke:2.6,numSize:32,numWeight:100,numScaleX:117,numScaleY:110,numX:-0.2,numY:5.2},
      hpLeader:{iconScale:125,iconX:-4,iconY:-32,ringScale:177,ringX:0,ringY:0,ringStroke:0.9,numSize:28,numWeight:100,numScaleX:100,numScaleY:100,numX:0,numY:-2},
      atkUnit:{iconScale:420,iconX:-3,iconY:-1,ringScale:168,ringX:-1,ringY:-3,ringStroke:0.2,numSize:15.8,numWeight:100,numScaleX:46,numScaleY:44,numX:-2.4,numY:2.8},
      atkLeader:{iconScale:125,iconX:-2,iconY:-26,ringScale:76,ringX:4,ringY:-27,ringStroke:0.3,numSize:13.8,numWeight:200,numScaleX:100,numScaleY:100,numX:0,numY:0},
      guardUnit:{iconScale:420,iconX:-2,iconY:-2,ringScale:203,ringX:0,ringY:0,ringStroke:0.2,numSize:6,numWeight:100,numScaleX:95,numScaleY:77,numX:-4.4,numY:-2.8},
      guardLeader:{iconScale:140,iconX:2,iconY:-25,ringScale:82,ringX:2,ringY:-10,ringStroke:0.2,numSize:16.4,numWeight:100,numScaleX:99,numScaleY:102,numX:10.2,numY:-20}
    }
  });
})();
