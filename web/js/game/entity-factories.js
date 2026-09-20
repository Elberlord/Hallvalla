"use strict";
/* HallValla · factories compartidas de cartas, mazos, líderes y unidades */

function uid8(){return Math.random().toString(36).slice(2,10)}
function code4(){return Math.random().toString(36).slice(2,6).toUpperCase()}
/* PvP room-code generation lives exclusively in 07b-pvp-rebuild-clean-room.js. */
function shuffle(a){const b=[...a];for(let i=b.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[b[i],b[j]]=[b[j],b[i]]}return b}


function makeCard(t,owner,leaderType){let card={...t,id:uid8(),owner,leaderType};if(card.type==="unit"){card=applyArcherMovementRule(card);card.battlePower=getUnitBattlePower(card);card.hiddenUnitTag="unit";}return card}

function makeDeck(owner,leaderType=getSelectedLeaderType()||"warrior",options={}){
  const useSaved=!options.ai;
  const savedTemplates=useSaved?getPlayableSavedDeckTemplates(0):[];
  const starterTemplates=getDefaultDeckTemplates("",0,leaderType);
  const templates=savedTemplates.length?savedTemplates:starterTemplates;
  return shuffle(templates.map(card=>makeCard(card,owner,leaderType)));
}

function drawCards(deck,hand,n){const d=[...(deck||[])],h=[...(hand||[])];for(let i=0;i<n;i++)if(d.length)h.push(d.shift());return{deck:d,hand:h}}
function makeLeader(owner,x,y,leaderType=getSelectedLeaderType()||"warrior",leaderLevel=1,leaderAbility=""){const data=LEADER_DATA[leaderType]||LEADER_DATA.warrior;const level=normalizeLeaderLevel(leaderLevel);const normalizedAbility=normalizeLeaderAbilityKey(leaderAbility);const ability=level>=5&&LEADER_LEVEL5_ABILITY_MAP[normalizedAbility]?normalizedAbility:"";const stats=getLeaderBattleStats(leaderType,level,ability);const leaderGuard=getLeaderGuard(leaderType,level);const leader={id:`leader${owner}`,owner,leader:true,name:`${data.name} J${owner}`,key:leaderType==="beastmaster"?"beastmaster":"leader",icon:leaderType==="beastmaster"?"🐾":(owner===1?"👑":"🔮"),portrait:data.portrait,leaderType,leaderLevel:level,leaderAbility:ability,x,y,hp:stats.hp,maxHp:stats.hp,atk:stats.atk,baseGuard:leaderGuard,guard:leaderGuard,dex:0,agi:0,mov:1,range:getLeaderRange(leaderType,level),moved:false,movedSpaces:0,acted:false,buffAtk:0,evasionSpent:0,cost:0,text:ability?`Habilidad Nv.5: ${getLeaderAbilityText(ability)}`:"Regla de líder: no usa Destreza ni Agilidad; sus ataques y los ataques contra él impactan siempre, con daño reducido por Guardia."};return applyHallvallaValueHooks("leader.make",leader,{owner,x,y,leaderType,leaderLevel:level,leaderAbility:ability})}
function makeAdventureEnemyLeader(battle,enemyLeaderType,enemyLeaderLevel,enemyLeaderAbility){let leader=makeLeader(2,Math.floor(COLS/2),0,enemyLeaderType,enemyLeaderLevel,enemyLeaderAbility);if(battle?.enemyLeaderPortrait)leader.portrait=battle.enemyLeaderPortrait;if(battle?.enemyName)leader.name=battle.enemyName;return applyHallvallaValueHooks("leader.makeAdventureEnemy",leader,{battle,enemyLeaderType,enemyLeaderLevel,enemyLeaderAbility})}
function getCardEffectTextByKey(key){
  if(!key)return "";
  const pools=[CARD_TEMPLATES||[],EQUIPMENT_CARD_TEMPLATES||[],BASIC_MAGIC_TRAP_PACK||[],IMPROVED_MAGIC_TRAP_PACK||[],LEGENDARY_TRAP_CARDS||[],Object.values(ADVENTURE_SPECIALS||{}),LEGENDARY_ALLY_CARDS.filter(Boolean)];
  for(const pool of pools){
    const found=(pool||[]).find(c=>c&&c.key===key);
    if(found)return found.text||found.effectText||found.ability||"";
  }
  return "";
}
function getUnitEffectText(u){
  let base=normalizeSaboteadorRuleText(u,u?.text||u?.effectText||u?.ability||getCardEffectTextByKey(u?.key)||"");
  if(typeof isHannibalMountedUnit==="function"&&isHannibalMountedUnit(u)){
    const riderHp=Math.max(0,Number(u?.hannibalRiderHp??HANNIBAL_RIDER_BASE_HP));
    const riderMax=Math.max(1,Number(u?.hannibalRiderMaxHp??HANNIBAL_RIDER_BASE_HP));
    const elephantHp=Math.max(0,Number(u?.hannibalElephantHp??HANNIBAL_ELEPHANT_BASE_HP));
    const elephantMax=Math.max(1,Number(u?.hannibalElephantMaxHp??HANNIBAL_ELEPHANT_BASE_HP));
    base=[base,`Estado de montura: Jinete ${riderHp}/${riderMax} Vida · Elefante ${elephantHp}/${elephantMax} Vida.`].filter(Boolean).join(" ");
  }
  const equipped=getUnitEquipmentTemplates(u);
  if(!equipped.length)return typeof hallvallaPublicGameplayText==="function"?hallvallaPublicGameplayText(base):base;
  const eqText=equipped.map(eq=>`${eq.name}: ${eq.text||""}`).join(" ");
  const combined=[base,`Equipo: ${eqText}`].filter(Boolean).join(" ");
  return typeof hallvallaPublicGameplayText==="function"?hallvallaPublicGameplayText(combined):combined;
}
function makeUnit(card,x,y){card=applyArcherMovementRule(applyLanceWeaponRule(applyDesertAssassinRule({...card})));const baseGuard=(card.guard||0)+getSwordGuardBonus(card);let unit={id:uid8(),owner:card.owner,leader:false,type:"unit",name:card.name,key:card.key,icon:card.icon,portrait:card.portrait||getResolvedCardPortraitSource(card)||"",assetKey:card.assetKey||card.visualKey||getAssetIdentityKey(card)||"",visualKey:card.visualKey||"",assetBucket:card.assetBucket||card.assetFolder||card.assetCategory||"",assetFolder:card.assetFolder||"",assetCategory:card.assetCategory||"",cardAssetBucket:card.cardAssetBucket||card.cardsAssetBucket||"",cardsAssetBucket:card.cardsAssetBucket||"",fieldFigure:card.fieldFigure||card.fieldFigurePortrait||card.fieldFigureImage||getResolvedFieldFigureSource(card)||"",fieldFigurePortrait:card.fieldFigurePortrait||"",fieldFigureImage:card.fieldFigureImage||"",fieldFigureAssetBucket:card.fieldFigureAssetBucket||card.fieldAssetBucket||"",fieldAssetBucket:card.fieldAssetBucket||"",rarity:card.rarity||"Básica",special:!!card.special,text:card.text||card.effectText||card.ability||"",effectText:card.effectText||card.text||card.ability||"",ability:card.ability||"",x,y,nexoX:x,nexoY:y,hp:card.hp,maxHp:card.hp,atk:card.atk,baseGuard,guard:baseGuard,dex:card.dex||0,agi:card.agi||0,mov:card.mov,fixedMov:(card.fixedMov!==null&&card.fixedMov!==undefined&&card.fixedMov!==""&&Number.isFinite(Number(card.fixedMov)))?Math.max(0,Number(card.fixedMov)):null,range:getCardDisplayRange(card),moved:false,movedSpaces:0,lastMoveStraightDistance:0,lastMoveDistance:0,lastMoveDx:0,lastMoveDy:0,lastMoveWindowKey:"",acted:false,buffAtk:0,evasionSpent:0,arjunaRerollUsedWindow:false,lanceFirstStrikeUsedWindow:false,leaderType:card.leaderType||"",weaponClass:getWeaponClassForCard(card),battlePower:getUnitBattlePower(card),cost:Number(card.cost||0),effectRange:Math.max(0,Number(card.effectRange||0)),leaderBuffGroups:Array.isArray(card.leaderBuffGroups)?[...card.leaderBuffGroups]:[],caster:!!card.caster,healer:!!card.healer,hechicero:!!card.hechicero,hechicera:!!card.hechicera,nigromante:!!card.nigromante,summonOrigin:String(card.summonOrigin||"hand"),fieldGeneratedSummon:!!card.fieldGeneratedSummon,summonedWindowKey:publicState?.combatWindowKey||"",summonedWindowIndex:publicState?.combatWindowIndex||0,summonedRuntimeMode:getRuntimeMode?.()||"",hallvallaReadyOnSummon:true,beast:!!card.beast,elementalAffinity:card.elementalAffinity&&typeof card.elementalAffinity==="object"?{...card.elementalAffinity}:null,elementalNature:!!card.elementalNature,aerial:!!card.aerial,stealth:!!card.stealth,revealed:false,ninjutsu:!!card.ninjutsu,hanzoContractPending:false,hanzoContractConsumed:false,equipmentKeys:Array.isArray(card.equipmentKeys)?[...card.equipmentKeys]:[],undead:!!card.undead,noMuerto:!!card.noMuerto,mineExclusive:!!card.mineExclusive,minePuzzle:!!card.minePuzzle,reviveTurns:Math.max(0,Number(card.reviveTurns||3)),reviveHpRatio:Math.max(0,Number(card.reviveHpRatio||.5))};unit=applyHallvallaUnitLoadProfile(unit)||unit;unit=annotateUnitWithMastery(unit);const masteryDexBonus=Math.max(0,Number(unit.masteryDexBonus||0));if(masteryDexBonus>0)unit.dex=(unit.dex||0)+masteryDexBonus;const leaderHpBonus=Math.max(0,Number((getLeaderBonus(unit)||{}).hp||0));if(leaderHpBonus>0){unit.hp=(unit.hp||0)+leaderHpBonus;unit.leaderHpBonusApplied=leaderHpBonus;}unit.guard=maxWindowGuard(unit);unit=applyHallvallaValueHooks("unit.make",unit,{card,x,y})||unit;return unit}
