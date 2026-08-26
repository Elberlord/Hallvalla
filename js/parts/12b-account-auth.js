"use strict";
/* HallValla · Cuenta y progreso en nube v2
   - Firebase UID sigue siendo la identidad canónica de la cuenta.
   - El progreso importante se conserva bajo users/{uid}/cloudSaveV2.
   - cloudSaveV1 se mantiene como puente temporal para clientes de Etapa 1.
   - Las preferencias puramente visuales/audio continúan siendo locales al dispositivo.
   - La economía de compras se endurecerá después con backend/Cloud Functions. */

const HALLVALLA_ACCOUNT_SCHEMA_VERSION=1;
const HALLVALLA_CLOUD_SCHEMA_VERSION=2;
const HALLVALLA_ACCOUNT_OWNER_KEY="__hallvalla_account_owner_uid_v1";
const HALLVALLA_ACCOUNT_SYNC_FP_PREFIX="__hallvalla_account_sync_fp_v2_";
const HALLVALLA_ACCOUNT_LEGACY_SYNC_FP_PREFIX="__hallvalla_account_sync_fp_v1_";
const HALLVALLA_ACCOUNT_CLOUD_PATH="cloudSaveV2";
const HALLVALLA_ACCOUNT_LEGACY_CLOUD_PATH="cloudSaveV1";
const HALLVALLA_ACCOUNT_SYNC_INTERVAL_MS=8000;

const HALLVALLA_ACCOUNT_STORAGE_KEYS=new Set([
  "hallvalla_player_profile",
  "hallvalla_player_collection",
  "hallvalla_current_deck",
  "hallvalla_pending_packs",
  "hallvalla_notifications",
  "hallvalla_recorded_battles",
  "hallvalla_selected_leader",
  "hallvalla_principal_unit_v1",
  "hallvalla_principal_units_v2",
  "hallvalla_adventure_progress",
  "hallvalla_adventure_campaign_reset_marker",
  "hallvalla_account_mastery_events_v1",
  "hallvalla_basic_pack_open_counter",
  "hallvalla_daily_reward_chain_v1",
  "hallvalla_mine_state_v1",
  "hallvalla_mine_events_v1",
  "hallvalla_mine_missions_v1",
  "hallvalla_mine_rewards_wheel_v1",
  "hallvalla_mine_shop_v1",
  "hallvalla_dragon_eggs",
  "hallvalla_active_dragon_companion_v1",
  "hallvalla_dragon_growth_battle_v1",
  "hallvalla_beast_crafting_unlocked",
  "hallvalla_beastmaster_rewarded_battles_v2",
  "hallvalla_veil_curse_kill_event_v1",
  "hallvalla_basic_battle_tutorial_seen_v3",
  "hallvalla_tutorial_basic_complete_v2",
  "hallvalla_tutorial_basic_rewards_v1",
  "hallvalla_tutorial_basic_step_v2",
  "hallvalla_tutorial_home_complete_v1",
  "hallvalla_tutorial_home_rewards_v1",
  "hallvalla_tutorial_tactics_complete_v1",
  "hallvalla_tutorial_tactics_rewards_v1"
]);
const HALLVALLA_ACCOUNT_STORAGE_PREFIXES=Object.freeze([
  "hallvalla_reward_claimed_",
  "hallvalla_beast_event_claimed_",
  "hallvalla_dragon_contract_claimed_"
]);

let hallvallaAccountSyncTimer=null;
let hallvallaAccountSyncInFlight=false;
let hallvallaAccountBootstrapInFlight=null;
let hallvallaAccountManualAuthTransition=false;
let hallvallaAccountLastCloudState="Sin sincronizar";
let hallvallaGoogleGateForced=false;

function hallvallaIsPermanentAccount(user=auth?.currentUser){
  return !!(user&&!user.isAnonymous&&String(user.email||"").trim());
}
function hallvallaHasGoogleProvider(user=auth?.currentUser){
  return !!user?.providerData?.some(provider=>provider?.providerId==="google.com");
}
function hallvallaIsGoogleAccount(user=auth?.currentUser){
  return !!(user&&!user.isAnonymous&&hallvallaHasGoogleProvider(user));
}
function hallvallaApplyMandatoryGoogleGate(user=auth?.currentUser){
  const allowed=hallvallaIsGoogleAccount(user);
  const panel=$("accountPanel");
  const closeBtn=$("closeAccountPanelBtn");
  document.body.classList.toggle("hv-google-auth-required",!allowed);
  if(!allowed){
    hallvallaGoogleGateForced=true;
    if(panel){panel.dataset.authGate="1";panel.classList.remove("hidden");}
    $("profilePanel")?.classList.add("hidden");
    closeBtn?.classList.add("hidden");
    if(user&&!user.isAnonymous&&hallvallaIsPermanentAccount(user)){
      hallvallaSetAccountMessage("Vincula Google para continuar usando HallValla.","error");
    }else{
      hallvallaSetAccountMessage("Inicia sesión con Google para entrar a HallValla.");
    }
  }else{
    closeBtn?.classList.remove("hidden");
    if(panel?.dataset.authGate==="1"){
      panel.dataset.authGate="0";
      panel.classList.add("hidden");
    }
    hallvallaGoogleGateForced=false;
  }
  return allowed;
}
function hallvallaGoogleProvider(){
  const provider=new GoogleAuthProvider();
  provider.setCustomParameters({prompt:"select_account"});
  return provider;
}
function hallvallaIsAccountStorageKey(key){
  const safe=String(key||"");
  return HALLVALLA_ACCOUNT_STORAGE_KEYS.has(safe)||HALLVALLA_ACCOUNT_STORAGE_PREFIXES.some(prefix=>safe.startsWith(prefix));
}
function hallvallaCollectAccountStorage(){
  const storage={};
  try{
    for(let i=0;i<localStorage.length;i++){
      const key=localStorage.key(i);
      if(!hallvallaIsAccountStorageKey(key))continue;
      const value=localStorage.getItem(key);
      if(value!==null)storage[key]=value;
    }
  }catch(error){console.warn("[HallValla] No se pudo leer todo el progreso local para la nube:",error);}
  return Object.fromEntries(Object.entries(storage).sort(([a],[b])=>a.localeCompare(b)));
}
function hallvallaCloudFingerprint(storage){
  const text=JSON.stringify(storage&&typeof storage==="object"?storage:{});
  let hash=2166136261;
  for(let i=0;i<text.length;i++){
    hash^=text.charCodeAt(i);
    hash=Math.imul(hash,16777619);
  }
  return `${text.length.toString(36)}-${(hash>>>0).toString(36)}`;
}
function hallvallaGetLocalSyncFingerprint(uidValue){
  try{return localStorage.getItem(`${HALLVALLA_ACCOUNT_SYNC_FP_PREFIX}${uidValue}`)||"";}catch(_){return"";}
}
function hallvallaGetLegacyLocalSyncFingerprint(uidValue){
  try{return localStorage.getItem(`${HALLVALLA_ACCOUNT_LEGACY_SYNC_FP_PREFIX}${uidValue}`)||"";}catch(_){return"";}
}
function hallvallaSetLocalSyncFingerprint(uidValue,fingerprint){
  try{localStorage.setItem(`${HALLVALLA_ACCOUNT_SYNC_FP_PREFIX}${uidValue}`,String(fingerprint||""));}catch(_){ }
}
function hallvallaGetLocalOwnerUid(){
  try{return localStorage.getItem(HALLVALLA_ACCOUNT_OWNER_KEY)||"";}catch(_){return"";}
}
function hallvallaSetLocalOwnerUid(uidValue){
  try{
    if(uidValue)localStorage.setItem(HALLVALLA_ACCOUNT_OWNER_KEY,String(uidValue));
    else localStorage.removeItem(HALLVALLA_ACCOUNT_OWNER_KEY);
  }catch(_){ }
}
function hallvallaClearAccountOwnedLocalStorage(){
  try{
    const remove=[];
    for(let i=0;i<localStorage.length;i++){
      const key=localStorage.key(i);
      if(hallvallaIsAccountStorageKey(key))remove.push(key);
    }
    remove.forEach(key=>localStorage.removeItem(key));
  }catch(error){console.warn("[HallValla] No se pudo limpiar el progreso local al cerrar sesión:",error);}
}
function hallvallaApplyCloudStorage(storage){
  const source=storage&&typeof storage==="object"?storage:{};
  hallvallaClearAccountOwnedLocalStorage();
  for(const [key,value] of Object.entries(source)){
    if(!hallvallaIsAccountStorageKey(key)||typeof value!=="string")continue;
    try{localStorage.setItem(key,value);}catch(error){console.warn(`[HallValla] No se pudo restaurar ${key}:`,error);}
  }
}
function hallvallaAuthErrorMessage(error){
  const code=String(error?.code||"");
  const messages={
    "auth/invalid-email":"El correo electrónico no es válido.",
    "auth/email-already-in-use":"Ese correo ya está vinculado a otra cuenta. Usa «Ya tengo cuenta».",
    "auth/credential-already-in-use":"Esa cuenta de Google ya pertenece a otra cuenta de HallValla. Usa «Ya tengo cuenta» e inicia con Google.",
    "auth/account-exists-with-different-credential":"Ese correo ya existe con otro método. Inicia con correo/contraseña y vincula Google desde tu cuenta.",
    "auth/weak-password":"La contraseña es demasiado débil. Usa al menos 6 caracteres.",
    "auth/invalid-credential":"Correo o contraseña incorrectos.",
    "auth/wrong-password":"Correo o contraseña incorrectos.",
    "auth/user-not-found":"No existe una cuenta con ese correo.",
    "auth/too-many-requests":"Demasiados intentos. Espera un momento y vuelve a intentarlo.",
    "auth/network-request-failed":"No se pudo conectar con Firebase. Revisa tu conexión.",
    "auth/operation-not-allowed":"Debes activar Email/Password en Firebase Authentication antes de usar esta función.",
    "auth/requires-recent-login":"Firebase requiere que vuelvas a iniciar sesión para esta operación.",
    "auth/popup-closed-by-user":"Cerraste la ventana de Google antes de terminar.",
    "auth/popup-blocked":"El navegador bloqueó la ventana de Google. Permite ventanas emergentes para HallValla e inténtalo otra vez.",
    "auth/cancelled-popup-request":"La operación de Google fue cancelada porque ya había otra ventana de acceso abierta.",
    "auth/unauthorized-domain":"Este dominio todavía no está autorizado en Firebase Authentication."
  };
  return messages[code]||String(error?.message||"No se pudo completar la operación de cuenta.");
}
function hallvallaSetAccountMessage(message,type=""){
  const el=$("accountMessage");
  if(!el)return;
  el.textContent=String(message||"");
  el.classList.toggle("error",type==="error");
  el.classList.toggle("success",type==="success");
}
function hallvallaSetAccountBusy(busy){
  ["accountCreateSubmitBtn","accountGoogleMigrateBtn","accountLoginSubmitBtn","accountGoogleLoginBtn","accountResetPasswordBtn","accountVerifyEmailBtn","accountLinkGoogleBtn","accountSyncNowBtn","accountSignOutBtn"].forEach(id=>{
    const el=$(id);if(el)el.disabled=!!busy;
  });
}
function hallvallaRenderAccountState(user=auth?.currentUser){
  const anonymousView=$("accountAnonymousView"),permanentView=$("accountPermanentView"),status=$("accountStatusText");
  const permanent=hallvallaIsPermanentAccount(user);
  if(anonymousView)anonymousView.classList.toggle("hidden",permanent);
  if(permanentView)permanentView.classList.toggle("hidden",!permanent);
  if(status){
    status.textContent=permanent
      ?"Cuenta permanente vinculada a Firebase. Tu identidad de HallValla es tu UID; el correo sirve para iniciar sesión."
      :"Cuenta temporal. Crea una cuenta para conservar este UID y migrar el progreso actual al correo que elijas.";
  }
  if(permanent){
    const email=$("accountEmailValue"),verified=$("accountVerificationValue"),google=$("accountGoogleValue"),cloud=$("accountCloudValue"),verifyBtn=$("accountVerifyEmailBtn"),googleBtn=$("accountLinkGoogleBtn");
    const googleLinked=hallvallaHasGoogleProvider(user);
    if(email)email.textContent=user.email||"—";
    if(verified)verified.textContent=user.emailVerified?"Correo verificado":googleLinked?"Verificada con Google":"Pendiente";
    if(google)google.textContent=googleLinked?"Vinculado":"No vinculado";
    if(cloud)cloud.textContent=hallvallaAccountLastCloudState;
    if(verifyBtn)verifyBtn.classList.toggle("hidden",!!user.emailVerified||googleLinked);
    if(googleBtn)googleBtn.classList.toggle("hidden",googleLinked);
  }
}
function hallvallaShowAccountTab(tab){
  const create=tab!=="login";
  $("accountCreateForm")?.classList.toggle("hidden",!create);
  $("accountLoginForm")?.classList.toggle("hidden",create);
  $("accountCreateTabBtn")?.classList.toggle("primary",create);
  $("accountCreateTabBtn")?.classList.toggle("ghost",!create);
  $("accountLoginTabBtn")?.classList.toggle("primary",!create);
  $("accountLoginTabBtn")?.classList.toggle("ghost",create);
  hallvallaSetAccountMessage("");
}
async function hallvallaOpenAccountPanel(){
  $("profilePanel")?.classList.add("hidden");
  $("accountPanel")?.classList.remove("hidden");
  hallvallaRenderAccountState();
  const user=auth?.currentUser;
  if(!hallvallaIsPermanentAccount(user))return;
  try{
    await user.reload();
    hallvallaRenderAccountState(auth.currentUser);
  }catch(error){
    console.warn("[HallValla] No se pudo refrescar el estado de verificación del correo:",error);
  }
}
function hallvallaCloseAccountPanel(){
  if(hallvallaGoogleGateForced||!hallvallaIsGoogleAccount(auth?.currentUser)){
    hallvallaApplyMandatoryGoogleGate(auth?.currentUser);
    return;
  }
  $("accountPanel")?.classList.add("hidden");
  $("profilePanel")?.classList.remove("hidden");
}

async function hallvallaWriteAccountMetadata(user,extra={}){
  if(!hallvallaIsPermanentAccount(user))return false;
  const providers=[...new Set((user.providerData||[]).map(provider=>String(provider?.providerId||"").trim()).filter(Boolean))];
  const payload={
    schemaVersion:HALLVALLA_ACCOUNT_SCHEMA_VERSION,
    email:String(user.email||"").trim().toLowerCase(),
    emailVerified:!!user.emailVerified,
    googleLinked:providers.includes("google.com"),
    providers,
    provider:providers.includes("google.com")?"google":providers.includes("password")?"password":providers[0]||"unknown",
    updatedAt:Date.now(),
    ...extra
  };
  await update(ref(db,`users/${user.uid}/account`),payload);
  return true;
}
function hallvallaNormalizeRemoteCloud(raw,path){
  if(!raw||typeof raw!=="object"||!raw.storage||typeof raw.storage!=="object")return null;
  const storage=Object.fromEntries(Object.entries(raw.storage).filter(([key,value])=>hallvallaIsAccountStorageKey(key)&&typeof value==="string").sort(([a],[b])=>a.localeCompare(b)));
  return{
    path:String(path||""),
    version:Number(raw.version||0),
    updatedAt:Math.max(0,Number(raw.updatedAt||0)),
    fingerprint:String(raw.fingerprint||hallvallaCloudFingerprint(storage)),
    storage
  };
}
async function hallvallaReadRemoteCloud(uidValue){
  const [v2Snapshot,v1Snapshot]=await Promise.all([
    get(ref(db,`users/${uidValue}/${HALLVALLA_ACCOUNT_CLOUD_PATH}`)),
    get(ref(db,`users/${uidValue}/${HALLVALLA_ACCOUNT_LEGACY_CLOUD_PATH}`))
  ]);
  const v2=hallvallaNormalizeRemoteCloud(v2Snapshot.exists()?v2Snapshot.val():null,HALLVALLA_ACCOUNT_CLOUD_PATH);
  const v1=hallvallaNormalizeRemoteCloud(v1Snapshot.exists()?v1Snapshot.val():null,HALLVALLA_ACCOUNT_LEGACY_CLOUD_PATH);
  if(v2&&v1){
    if(v2.fingerprint===v1.fingerprint)return{selected:v2,v2,v1};
    return{selected:(v1.updatedAt>v2.updatedAt?v1:v2),v2,v1};
  }
  return{selected:v2||v1||null,v2,v1};
}
async function hallvallaMirrorLegacyCloudSave(user,storage,fingerprint,reason){
  try{
    await set(ref(db,`users/${user.uid}/${HALLVALLA_ACCOUNT_LEGACY_CLOUD_PATH}`),{
      version:1,
      updatedAt:Date.now(),
      reason:String(reason||"v2_mirror").slice(0,40),
      fingerprint:String(fingerprint||hallvallaCloudFingerprint(storage)),
      storage
    });
  }catch(error){
    console.warn("[HallValla] No se pudo actualizar el espejo cloudSaveV1:",error);
  }
}
async function hallvallaSeedCloudV2(user,storage,fingerprint,reason="migrate_v1"){
  const cleanStorage=storage&&typeof storage==="object"?storage:{};
  const cleanFingerprint=String(fingerprint||hallvallaCloudFingerprint(cleanStorage));
  await set(ref(db,`users/${user.uid}/${HALLVALLA_ACCOUNT_CLOUD_PATH}`),{
    version:HALLVALLA_CLOUD_SCHEMA_VERSION,
    updatedAt:Date.now(),
    reason:String(reason||"migrate_v1").slice(0,40),
    fingerprint:cleanFingerprint,
    previousFingerprint:"",
    storage:cleanStorage
  });
  hallvallaSetLocalSyncFingerprint(user.uid,cleanFingerprint);
  await hallvallaMirrorLegacyCloudSave(user,cleanStorage,cleanFingerprint,reason);
  return cleanFingerprint;
}
async function hallvallaUploadCloudSave(user=auth?.currentUser,{force=false,reason="auto"}={}){
  if(!hallvallaIsPermanentAccount(user)||hallvallaAccountSyncInFlight)return false;
  if(hallvallaGetLocalOwnerUid()!==user.uid&&!force)return false;
  const storage=hallvallaCollectAccountStorage();
  const fingerprint=hallvallaCloudFingerprint(storage);
  const baseFingerprint=hallvallaGetLocalSyncFingerprint(user.uid)||hallvallaGetLegacyLocalSyncFingerprint(user.uid);
  if(!force&&fingerprint===baseFingerprint)return false;
  hallvallaAccountSyncInFlight=true;
  hallvallaAccountLastCloudState="Sincronizando...";
  hallvallaRenderAccountState(user);
  try{
    let conflictFingerprint="";
    const result=await runTransaction(ref(db,`users/${user.uid}/${HALLVALLA_ACCOUNT_CLOUD_PATH}`),current=>{
      const currentCloud=hallvallaNormalizeRemoteCloud(current,HALLVALLA_ACCOUNT_CLOUD_PATH);
      const currentFingerprint=String(currentCloud?.fingerprint||"");
      // Protección multi-dispositivo: si la nube cambió desde nuestra última base
      // y nuestro estado local también cambió, no sobrescribimos silenciosamente.
      if(currentCloud&&baseFingerprint&&currentFingerprint!==baseFingerprint&&currentFingerprint!==fingerprint){
        conflictFingerprint=currentFingerprint;
        return;
      }
      return{
        version:HALLVALLA_CLOUD_SCHEMA_VERSION,
        updatedAt:Date.now(),
        reason:String(reason||"auto").slice(0,40),
        fingerprint,
        previousFingerprint:currentFingerprint,
        storage
      };
    },{applyLocally:false});
    if(!result.committed){
      hallvallaAccountLastCloudState="Cambios en otro dispositivo";
      hallvallaRenderAccountState(user);
      console.warn("[HallValla] Sincronización detenida para evitar sobrescribir cambios remotos.",{baseFingerprint,conflictFingerprint,fingerprint});
      return false;
    }
    hallvallaSetLocalOwnerUid(user.uid);
    hallvallaSetLocalSyncFingerprint(user.uid,fingerprint);
    hallvallaAccountLastCloudState="Sincronizado";
    hallvallaRenderAccountState(user);
    await hallvallaMirrorLegacyCloudSave(user,storage,fingerprint,reason);
    return true;
  }catch(error){
    hallvallaAccountLastCloudState="Error de sincronización";
    hallvallaRenderAccountState(user);
    throw error;
  }finally{hallvallaAccountSyncInFlight=false;}
}
async function hallvallaBootstrapPermanentAccount(user,{explicitLogin=false}={}){
  if(!hallvallaIsPermanentAccount(user))return false;
  if(hallvallaAccountBootstrapInFlight)return hallvallaAccountBootstrapInFlight;
  hallvallaAccountBootstrapInFlight=(async()=>{
    try{
      await hallvallaWriteAccountMetadata(user);
      const remoteState=await hallvallaReadRemoteCloud(user.uid);
      const remote=remoteState.selected;
      const localStorageSnapshot=hallvallaCollectAccountStorage();
      const localFingerprint=hallvallaCloudFingerprint(localStorageSnapshot);
      const owner=hallvallaGetLocalOwnerUid();
      const lastSync=hallvallaGetLocalSyncFingerprint(user.uid)||hallvallaGetLegacyLocalSyncFingerprint(user.uid);
      if(remote){
        const remoteFingerprint=remote.fingerprint;
        const localBelongsToUser=owner===user.uid;
        const localChangedSinceBase=localBelongsToUser&&!!lastSync&&localFingerprint!==lastSync;
        const remoteChangedSinceBase=!!lastSync&&remoteFingerprint!==lastSync;
        let restoreRemote=false;
        let uploadLocal=false;

        if(explicitLogin||!localBelongsToUser){
          restoreRemote=remoteFingerprint!==localFingerprint||!localBelongsToUser;
        }else if(remoteFingerprint===localFingerprint){
          // Mismo contenido: solo actualizamos la base de sincronización.
        }else if(localChangedSinceBase&&!remoteChangedSinceBase){
          uploadLocal=true;
        }else if(!localChangedSinceBase&&remoteChangedSinceBase){
          restoreRemote=true;
        }else if(localChangedSinceBase&&remoteChangedSinceBase){
          // Ambos cambiaron desde la misma base. La nube gana al reanudar para no
          // pisar silenciosamente el progreso hecho en otro dispositivo.
          restoreRemote=true;
          hallvallaAccountLastCloudState="Nube más reciente restaurada";
        }else{
          // Migración antigua sin huella local fiable: una cuenta permanente ya
          // existente recupera la copia de nube como fuente canónica.
          restoreRemote=true;
        }

        if(restoreRemote){
          hallvallaApplyCloudStorage(remote.storage);
          hallvallaSetLocalOwnerUid(user.uid);
          hallvallaSetLocalSyncFingerprint(user.uid,remoteFingerprint);
          hallvallaAccountLastCloudState=hallvallaAccountLastCloudState==="Nube más reciente restaurada"?hallvallaAccountLastCloudState:"Restaurado desde nube";
          // Si el dato más reciente aún venía de Etapa 1, lo promovemos a V2.
          if(remote.path===HALLVALLA_ACCOUNT_LEGACY_CLOUD_PATH||!remoteState.v2||remoteState.v2.fingerprint!==remoteFingerprint){
            await hallvallaSeedCloudV2(user,remote.storage,remoteFingerprint,"migrate_v1_remote");
          }
          hallvallaRenderAccountState(user);
          sessionStorage.setItem(`__hallvalla_cloud_restored_${user.uid}`,"1");
          location.reload();
          return true;
        }
        if(uploadLocal){
          const uploaded=await hallvallaUploadCloudSave(user,{force:true,reason:"resume_local"});
          if(uploaded)return true;
        }
        hallvallaSetLocalOwnerUid(user.uid);
        hallvallaSetLocalSyncFingerprint(user.uid,remoteFingerprint);
        // Promueve V1 a V2 aunque el contenido local ya coincida.
        if(remote.path===HALLVALLA_ACCOUNT_LEGACY_CLOUD_PATH||!remoteState.v2){
          await hallvallaSeedCloudV2(user,remote.storage,remoteFingerprint,"migrate_v1_equal");
        }
        hallvallaAccountLastCloudState="Sincronizado";
      }else{
        // Primera migración de esta cuenta: el estado local actual se convierte
        // en su semilla canónica de nube V2 y se refleja temporalmente en V1.
        hallvallaSetLocalOwnerUid(user.uid);
        await hallvallaSeedCloudV2(user,localStorageSnapshot,localFingerprint,"initial_migration_v2");
        hallvallaAccountLastCloudState="Sincronizado";
      }
      hallvallaRenderAccountState(user);
      return true;
    }catch(error){
      console.warn("[HallValla] No se pudo preparar el guardado de cuenta:",error);
      hallvallaAccountLastCloudState="Pendiente";
      hallvallaRenderAccountState(user);
      return false;
    }finally{hallvallaAccountBootstrapInFlight=null;}
  })();
  return hallvallaAccountBootstrapInFlight;
}

async function hallvallaCreatePermanentAccount(email,password,confirmPassword){
  const cleanEmail=String(email||"").trim().toLowerCase();
  if(!cleanEmail)throw new Error("Escribe un correo electrónico.");
  if(String(password||"").length<6)throw new Error("La contraseña debe tener al menos 6 caracteres.");
  if(password!==confirmPassword)throw new Error("Las contraseñas no coinciden.");
  let current=auth.currentUser;
  if(!current)throw new Error("La creación de cuentas por correo ya no está disponible. Usa Google.");
  if(!current?.isAnonymous)throw new Error("Ya hay una cuenta permanente iniciada.");
  const originalUid=current.uid;
  const credential=EmailAuthProvider.credential(cleanEmail,password);
  hallvallaAccountManualAuthTransition=true;
  try{
    const result=await linkWithCredential(current,credential);
    if(result.user.uid!==originalUid)throw new Error("Firebase cambió inesperadamente el UID durante la vinculación.");
    hallvallaSetLocalOwnerUid(result.user.uid);
    let cloudOk=true;
    try{
      await hallvallaWriteAccountMetadata(result.user,{linkedAt:Date.now(),migrationSource:"anonymous_uid"});
      await hallvallaUploadCloudSave(result.user,{force:true,reason:"account_link"});
    }catch(error){
      cloudOk=false;
      console.warn("[HallValla] La cuenta se vinculó, pero el guardado inicial no terminó:",error);
    }
    try{if(!result.user.emailVerified)await sendEmailVerification(result.user);}catch(error){console.warn("[HallValla] No se pudo enviar verificación de correo:",error);}
    hallvallaRenderAccountState(result.user);
    return{user:result.user,cloudOk};
  }finally{hallvallaAccountManualAuthTransition=false;}
}
async function hallvallaLoginPermanentAccount(email,password){
  const cleanEmail=String(email||"").trim().toLowerCase();
  if(!cleanEmail||!password)throw new Error("Escribe correo y contraseña.");
  hallvallaAccountManualAuthTransition=true;
  try{
    const result=await signInWithEmailAndPassword(auth,cleanEmail,password);
    await hallvallaBootstrapPermanentAccount(result.user,{explicitLogin:true});
    return result.user;
  }finally{hallvallaAccountManualAuthTransition=false;}
}
async function hallvallaCreatePermanentAccountWithGoogle(){
  let current=auth.currentUser;
  if(!current)return hallvallaLoginWithGoogle();
  if(!current?.isAnonymous)throw new Error("Ya hay una cuenta permanente iniciada.");
  const originalUid=current.uid;
  hallvallaAccountManualAuthTransition=true;
  try{
    const result=await linkWithPopup(current,hallvallaGoogleProvider(),browserPopupRedirectResolver);
    if(result.user.uid!==originalUid)throw new Error("Firebase cambió inesperadamente el UID durante la vinculación con Google.");
    hallvallaSetLocalOwnerUid(result.user.uid);
    await hallvallaWriteAccountMetadata(result.user,{linkedAt:Date.now(),migrationSource:"anonymous_uid_google"});
    await hallvallaUploadCloudSave(result.user,{force:true,reason:"account_link_google"});
    hallvallaRenderAccountState(result.user);
    return result.user;
  }finally{hallvallaAccountManualAuthTransition=false;}
}
async function hallvallaLoginWithGoogle(){
  hallvallaAccountManualAuthTransition=true;
  try{
    const result=await signInWithPopup(auth,hallvallaGoogleProvider(),browserPopupRedirectResolver);
    await hallvallaBootstrapPermanentAccount(result.user,{explicitLogin:true});
    return result.user;
  }finally{hallvallaAccountManualAuthTransition=false;}
}
async function hallvallaLinkGoogleToCurrentAccount(){
  const current=auth.currentUser;
  if(!hallvallaIsPermanentAccount(current))throw new Error("No hay una cuenta permanente iniciada.");
  if(hallvallaHasGoogleProvider(current))return current;
  const originalUid=current.uid;
  hallvallaAccountManualAuthTransition=true;
  try{
    const result=await linkWithPopup(current,hallvallaGoogleProvider(),browserPopupRedirectResolver);
    if(result.user.uid!==originalUid)throw new Error("Firebase cambió inesperadamente el UID durante la vinculación con Google.");
    await result.user.reload();
    const refreshed=auth.currentUser||result.user;
    await hallvallaWriteAccountMetadata(refreshed,{googleLinkedAt:Date.now()});
    await hallvallaUploadCloudSave(refreshed,{force:true,reason:"google_link"});
    hallvallaRenderAccountState(refreshed);
    return refreshed;
  }finally{hallvallaAccountManualAuthTransition=false;}
}
async function hallvallaRequestPasswordReset(email){
  const cleanEmail=String(email||"").trim().toLowerCase();
  if(!cleanEmail)throw new Error("Escribe primero el correo de la cuenta.");
  await sendPasswordResetEmail(auth,cleanEmail);
}
async function hallvallaResendVerification(){
  const user=auth.currentUser;
  if(!hallvallaIsPermanentAccount(user))throw new Error("No hay una cuenta permanente iniciada.");
  await user.reload();
  if(user.emailVerified)return false;
  await sendEmailVerification(user);
  return true;
}
async function hallvallaSignOutPermanentAccount(){
  const user=auth.currentUser;
  if(!hallvallaIsPermanentAccount(user))return false;
  try{await hallvallaUploadCloudSave(user,{force:true,reason:"sign_out"});}catch(error){console.warn("[HallValla] No se pudo completar la última sincronización antes de salir:",error);}
  hallvallaAccountManualAuthTransition=true;
  try{
    await signOut(auth);
    hallvallaClearAccountOwnedLocalStorage();
    hallvallaSetLocalOwnerUid("");
    setTimeout(()=>location.reload(),500);
  }finally{setTimeout(()=>{hallvallaAccountManualAuthTransition=false;},900);}
  return true;
}

function hallvallaStartCloudSyncLoop(){
  if(hallvallaAccountSyncTimer)return;
  hallvallaAccountSyncTimer=setInterval(()=>{
    const user=auth.currentUser;
    if(!hallvallaIsPermanentAccount(user)||document.hidden)return;
    hallvallaUploadCloudSave(user).catch(error=>console.warn("[HallValla] Sincronización automática pendiente:",error));
  },HALLVALLA_ACCOUNT_SYNC_INTERVAL_MS);
}

$("manageAccountBtn")?.addEventListener("click",hallvallaOpenAccountPanel);
$("closeAccountPanelBtn")?.addEventListener("click",hallvallaCloseAccountPanel);
$("accountCreateTabBtn")?.addEventListener("click",()=>hallvallaShowAccountTab("create"));
$("accountLoginTabBtn")?.addEventListener("click",()=>hallvallaShowAccountTab("login"));
$("accountCreateForm")?.addEventListener("submit",async event=>{
  event.preventDefault();hallvallaSetAccountBusy(true);hallvallaSetAccountMessage("Creando cuenta y migrando progreso...");
  try{
    const result=await hallvallaCreatePermanentAccount($("accountCreateEmail")?.value,$("accountCreatePassword")?.value,$("accountCreatePasswordConfirm")?.value);
    hallvallaSetAccountMessage(result.cloudOk?"Cuenta creada. Conservaste tu UID y el progreso quedó guardado en Firebase. Te enviamos un correo de verificación.":"La cuenta quedó creada y conserva tu UID. La sincronización con Firebase quedó pendiente; usa «Sincronizar ahora» después de desplegar las reglas.",result.cloudOk?"success":"error");
  }catch(error){hallvallaSetAccountMessage(hallvallaAuthErrorMessage(error),"error");}
  finally{hallvallaSetAccountBusy(false);}
});
$("accountGoogleMigrateBtn")?.addEventListener("click",async()=>{
  hallvallaSetAccountBusy(true);hallvallaSetAccountMessage("Abriendo Google y conservando tu UID actual...");
  try{
    const user=await hallvallaCreatePermanentAccountWithGoogle();
    hallvallaSetAccountMessage("Cuenta vinculada con Google. Conservaste tu UID y tu progreso quedó sincronizado.","success");
    hallvallaRenderAccountState(user);
  }catch(error){hallvallaSetAccountMessage(hallvallaAuthErrorMessage(error),"error");}
  finally{hallvallaSetAccountBusy(false);}
});
$("accountGoogleLoginBtn")?.addEventListener("click",async()=>{
  hallvallaSetAccountBusy(true);hallvallaSetAccountMessage("Abriendo Google...");
  try{
    const current=auth.currentUser;
    const user=current?.isAnonymous?await hallvallaCreatePermanentAccountWithGoogle():await hallvallaLoginWithGoogle();
    hallvallaRenderAccountState(user);
    hallvallaApplyMandatoryGoogleGate(user);
    hallvallaSetAccountMessage("Sesión iniciada con Google.","success");
  }catch(error){hallvallaSetAccountMessage(hallvallaAuthErrorMessage(error),"error");}
  finally{hallvallaSetAccountBusy(false);}
});
$("accountLinkGoogleBtn")?.addEventListener("click",async()=>{
  hallvallaSetAccountBusy(true);hallvallaSetAccountMessage("Vinculando Google a esta misma cuenta...");
  try{
    const user=await hallvallaLinkGoogleToCurrentAccount();
    hallvallaSetAccountMessage("Google quedó vinculado a esta misma cuenta y al mismo UID.","success");
    hallvallaRenderAccountState(user);
  }catch(error){hallvallaSetAccountMessage(hallvallaAuthErrorMessage(error),"error");}
  finally{hallvallaSetAccountBusy(false);}
});
$("accountLoginForm")?.addEventListener("submit",async event=>{
  event.preventDefault();hallvallaSetAccountBusy(true);hallvallaSetAccountMessage("Iniciando sesión y recuperando tu cuenta...");
  try{
    const user=await hallvallaLoginPermanentAccount($("accountLoginEmail")?.value,$("accountLoginPassword")?.value);
    hallvallaRenderAccountState(user);
    hallvallaSetAccountMessage("Sesión iniciada.","success");
  }catch(error){hallvallaSetAccountMessage(hallvallaAuthErrorMessage(error),"error");}
  finally{hallvallaSetAccountBusy(false);}
});
$("accountResetPasswordBtn")?.addEventListener("click",async()=>{
  hallvallaSetAccountBusy(true);
  try{await hallvallaRequestPasswordReset($("accountLoginEmail")?.value);hallvallaSetAccountMessage("Firebase envió el correo para restablecer la contraseña.","success");}
  catch(error){hallvallaSetAccountMessage(hallvallaAuthErrorMessage(error),"error");}
  finally{hallvallaSetAccountBusy(false);}
});
$("accountVerifyEmailBtn")?.addEventListener("click",async()=>{
  hallvallaSetAccountBusy(true);
  try{
    const sent=await hallvallaResendVerification();
    hallvallaSetAccountMessage(sent?"Correo de verificación enviado.":"El correo ya está verificado.","success");
    hallvallaRenderAccountState(auth.currentUser);
  }catch(error){hallvallaSetAccountMessage(hallvallaAuthErrorMessage(error),"error");}
  finally{hallvallaSetAccountBusy(false);}
});
$("accountSyncNowBtn")?.addEventListener("click",async()=>{
  hallvallaSetAccountBusy(true);hallvallaSetAccountMessage("Sincronizando...");
  try{await hallvallaUploadCloudSave(auth.currentUser,{force:true,reason:"manual"});hallvallaSetAccountMessage("Progreso sincronizado con Firebase.","success");}
  catch(error){hallvallaSetAccountMessage(`No se pudo sincronizar: ${hallvallaAuthErrorMessage(error)}`,"error");}
  finally{hallvallaSetAccountBusy(false);}
});
$("accountSignOutBtn")?.addEventListener("click",async()=>{
  hallvallaSetAccountBusy(true);hallvallaSetAccountMessage("Guardando y cerrando sesión...");
  try{await hallvallaSignOutPermanentAccount();}
  catch(error){hallvallaSetAccountMessage(hallvallaAuthErrorMessage(error),"error");hallvallaSetAccountBusy(false);}
});

onAuthStateChanged(auth,user=>{
  hallvallaRenderAccountState(user);
  hallvallaApplyMandatoryGoogleGate(user);
  if(!user)return;
  if(user.isAnonymous){
    hallvallaSetLocalOwnerUid(user.uid);
    hallvallaAccountLastCloudState="Cuenta temporal heredada";
    hallvallaRenderAccountState(user);
    return;
  }
  if(!hallvallaAccountManualAuthTransition){
    hallvallaBootstrapPermanentAccount(user).catch(error=>console.warn("[HallValla] Preparación de cuenta pendiente:",error));
  }
});
document.addEventListener("visibilitychange",()=>{
  if(!document.hidden)return;
  const user=auth.currentUser;
  if(hallvallaIsPermanentAccount(user))hallvallaUploadCloudSave(user).catch(()=>{});
});
hallvallaStartCloudSyncLoop();
hallvallaShowAccountTab("create");
hallvallaRenderAccountState();

Object.assign(globalThis,{
  hallvallaIsPermanentAccount,
  hallvallaIsGoogleAccount,
  hallvallaRequireGoogleLogin:()=>hallvallaApplyMandatoryGoogleGate(auth?.currentUser),
  hallvallaOpenAccountPanel,
  hallvallaUploadCloudSave,
  hallvallaBootstrapPermanentAccount
});
