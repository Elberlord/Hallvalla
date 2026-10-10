"use strict";
/* HallValla · contenido generado por HV DEV.
   Este archivo es la unica superficie de datos que modifica el puente local. */

globalThis.HALLVALLA_CONTENT_GENERATED = /*__HVC_DATA_START__*/{
  "version": 1,
  "registries": {
    "weapons": [],
    "classes": [],
    "races": [],
    "types": []
  },
  "unitOverrides": {},
  "units": [],
  "skills": [],
  "assignments": {}
}/*__HVC_DATA_END__*/;

(()=>{
  "use strict";
  const content=globalThis.HALLVALLA_CONTENT_GENERATED||{};
  const overrides=content.unitOverrides&&typeof content.unitOverrides==="object"?content.unitOverrides:{};
  const generatedUnits=Array.isArray(content.units)?content.units:[];

  const pools=[];
  try{if(typeof CARD_TEMPLATES!=="undefined"&&Array.isArray(CARD_TEMPLATES))pools.push(CARD_TEMPLATES);}catch(_){}
  try{if(typeof SPECIAL_HUMAN_CARD_DATA!=="undefined"&&Array.isArray(SPECIAL_HUMAN_CARD_DATA))pools.push(SPECIAL_HUMAN_CARD_DATA);}catch(_){}
  try{if(typeof LEGENDARY_ALLY_CARDS!=="undefined"&&Array.isArray(LEGENDARY_ALLY_CARDS))pools.push(LEGENDARY_ALLY_CARDS);}catch(_){}
  try{if(typeof BEAST_CARD_TEMPLATES!=="undefined"&&Array.isArray(BEAST_CARD_TEMPLATES))pools.push(BEAST_CARD_TEMPLATES);}catch(_){}
  try{if(typeof ADVENTURE_SPECIALS!=="undefined"&&ADVENTURE_SPECIALS&&typeof ADVENTURE_SPECIALS==="object")pools.push(Object.values(ADVENTURE_SPECIALS));}catch(_){}

  const patchCard=(card,patch)=>{
    if(!card||!patch||typeof patch!=="object")return card;
    for(const [key,value] of Object.entries(patch)){
      if(key==="key"||value===undefined)continue;
      if(Array.isArray(value))card[key]=[...value];
      else if(value&&typeof value==="object")card[key]={...value};
      else card[key]=value;
    }
    return card;
  };

  for(const pool of pools){
    for(const card of pool||[]){
      const key=String(card?.key||"");
      if(key&&overrides[key])patchCard(card,overrides[key]);
    }
  }

  const existingKeys=new Set();
  for(const pool of pools)for(const card of pool||[])if(card?.key)existingKeys.add(String(card.key));

  for(const raw of generatedUnits){
    if(!raw||typeof raw!=="object")continue;
    const key=String(raw.key||"").trim();
    if(!key||existingKeys.has(key))continue;
    const unit={...raw,type:"unit"};
    if(Array.isArray(raw.weaponTags))unit.weaponTags=[...raw.weaponTags];
    if(Array.isArray(raw.classTags))unit.classTags=[...raw.classTags];
    try{
      if(typeof CARD_TEMPLATES!=="undefined"&&Array.isArray(CARD_TEMPLATES))CARD_TEMPLATES.push(unit);
      if(unit.special&&typeof SPECIAL_HUMAN_CARD_DATA!=="undefined"&&Array.isArray(SPECIAL_HUMAN_CARD_DATA))SPECIAL_HUMAN_CARD_DATA.push({...unit});
      if(unit.special&&typeof LEGENDARY_ALLY_CARDS!=="undefined"&&Array.isArray(LEGENDARY_ALLY_CARDS))LEGENDARY_ALLY_CARDS.push({...unit});
      existingKeys.add(key);
    }catch(error){
      console.warn("[HallValla][Content] No se pudo registrar la unidad generada:",key,error);
    }
  }

  globalThis.getHallvallaGeneratedContent=()=>globalThis.HALLVALLA_CONTENT_GENERATED;
})();
