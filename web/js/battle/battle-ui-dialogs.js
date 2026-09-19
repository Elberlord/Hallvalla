"use strict";
/* HallValla · Diálogos y menú del combate */

function ensureHallVallaModal(){
  let modal=$("hvModal");
  if(modal)return modal;
  modal=document.createElement("div");
  modal.id="hvModal";
  modal.className="hv-modal hidden";
  modal.setAttribute("role","dialog");
  modal.setAttribute("aria-modal","true");
  modal.setAttribute("aria-hidden","true");
  modal.setAttribute("aria-labelledby","hvModalTitle");
  modal.innerHTML=`<div class="hv-modal-card"><h2 id="hvModalTitle">Información</h2><p id="hvModalMessage"></p><div id="hvModalActions" class="hv-modal-actions"></div></div>`;
  document.body.appendChild(modal);
  return modal;
}
function hvDialog(message,{title="Información",confirmText="Aceptar",cancelText="Cancelar",showCancel=false,danger=false}={}){
  return new Promise(resolve=>{
    const modal=ensureHallVallaModal();
    const titleEl=$("hvModalTitle"),messageEl=$("hvModalMessage"),actions=$("hvModalActions");
    if(titleEl)titleEl.textContent=title;
    if(messageEl)messageEl.textContent=message;
    if(actions){
      actions.innerHTML="";
      if(showCancel){
        const cancel=document.createElement("button");
        cancel.type="button";
        cancel.className="btn ghost";
        cancel.textContent=cancelText;
        cancel.addEventListener("click",()=>{modal.classList.add("hidden");modal.setAttribute("aria-hidden","true");resolve(false);},{once:true});
        actions.appendChild(cancel);
      }
      const ok=document.createElement("button");
      ok.type="button";
      ok.className=danger?"btn danger":"btn primary";
      ok.textContent=confirmText;
      ok.addEventListener("click",()=>{modal.classList.add("hidden");modal.setAttribute("aria-hidden","true");resolve(true);},{once:true});
      actions.appendChild(ok);
    }
    modal.setAttribute("aria-hidden","false");
    modal.classList.remove("hidden");
    // El mando puede confirmar inmediatamente con A. El foco también ayuda a
    // teclado/accesibilidad, pero no cambia la interacción de mouse/touch.
    requestAnimationFrame(()=>{
      const preferred=actions?.querySelector("button.primary,button:not([disabled])");
      try{preferred?.focus({preventScroll:true});}catch(_){try{preferred?.focus();}catch(__){ }}
    });
  });
}
function hvAlert(message,title="Información"){return hvDialog(message,{title,confirmText:"Aceptar"});}
function hvConfirm(message,title="Confirmar",confirmText="Aceptar",cancelText="Cancelar",danger=false){return hvDialog(message,{title,confirmText,cancelText,showCancel:true,danger});}



function openBattleMenu(){const panel=$("battleMenuPanel");if(panel){panel.classList.remove("hidden");renderBattleChrome();}}
function closeBattleMenu(){const panel=$("battleMenuPanel");if(panel)panel.classList.add("hidden");}
function toggleBattleSound(){gameSettings.sound=!gameSettings.sound;saveGameSettings();if(!gameSettings.sound)stopMusic(false);else refreshAudioState();renderBattleChrome();}
function toggleBattleMusic(){gameSettings.music=!gameSettings.music;if(gameSettings.music&&clampAudioVolume(gameSettings.musicVolume,.32)<=0)gameSettings.musicVolume=.32;saveGameSettings();refreshAudioState();renderBattleChrome();}
function toggleBattleSfx(){gameSettings.sfx=!gameSettings.sfx;if(gameSettings.sfx&&clampAudioVolume(gameSettings.sfxVolume,.58)<=0)gameSettings.sfxVolume=.58;saveGameSettings();renderBattleChrome();if(gameSettings.sound&&gameSettings.sfx)tryPlaySound("button_click",.25);}
function setBattleMusicVolume(value){
  const vol=clampAudioVolume(Number(value)/100,.32);
  gameSettings.musicVolume=vol;
  if(vol>0)gameSettings.music=true;
  saveGameSettings();
  if(currentMusic){try{currentMusic.volume=vol;}catch(e){}}
  if(gameSettings.sound&&gameSettings.music)syncBattleMusic();
  renderBattleChrome();
}
function setBattleSfxVolume(value){
  const vol=clampAudioVolume(Number(value)/100,.58);
  gameSettings.sfxVolume=vol;
  if(vol>0)gameSettings.sfx=true;
  saveGameSettings();
  renderBattleChrome();
}
async function resetCurrentDuelFromMenu(){
  closeBattleMenu();
  if(!gameId||!publicState){return;}
  if(publicState.mode==="adventure"){
    if(await hvConfirm("¿Reiniciar este duelo de aventura desde el inicio?","Reiniciar duelo","Reiniciar","Cancelar",true))retryCurrentAdventureBattle();
    return;
  }
  await hvAlert("Para no romper la partida del otro jugador, el reinicio directo queda reservado para aventura contra IA. En online, salgan al menú y creen una sala nueva cuando ambos estén listos.","Reinicio online bloqueado");
}
async function leaveCurrentGameFromMenu(){
  closeBattleMenu();
  if(!gameId){leaveCurrentGame();return;}
  if(await hvConfirm("¿Salir del duelo y volver al menú principal?","Salir del duelo","Salir","Cancelar"))leaveCurrentGame();
}
