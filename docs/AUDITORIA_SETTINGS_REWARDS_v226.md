# HallValla v226 — separación de recompensas de `settings-events`

Build: `20260920.226`

## Objetivo
Completar el siguiente corte de auditoría de `system/settings-events.js`: retirar el paquete de bienvenida y toda la cadena mensual de recompensas diarias, dejando el archivo concentrado en configuración, navegación y bindings generales.

## Cambios
- Nuevo `web/js/account/rewards.js`.
- Se movió íntegramente el checkout Sandbox del paquete de bienvenida, incluido el loader de PayPal y su modal.
- Se movió íntegramente la cadena diaria: generación mensual, cooldown real de 24 h, premio final mítico, render, claim, persistencia local y sincronización cloud inmediata.
- Se conservaron las claves persistidas existentes (`hallvalla_daily_reward_chain_v1`) y los nombres/contratos usados por el runtime.
- `bootstrap-loader.js` carga `account/rewards.js` después de `profile-shop-packs.js`, `auth.js` y `forge/deck-builder.js`, conservando disponibles antes del binding diario las APIs de perfil/pack, cloud save y cola de sobres (`addPendingPack`).
- No se modificaron reglas Firebase.

## Resultado de estructura
- `system/settings-events.js` ya no contiene `HALLVALLA_WELCOME_PACK_*`, `HALLVALLA_DAILY_REWARD_*`, `openHallvallaWelcomePack`, `claimDailyReward` ni los listeners de esos dos sistemas.
- No queda una copia legacy del bloque extraído.

## Riesgo funcional controlado
El cambio es una extracción mecánica entre scripts clásicos secuenciales. No cambia el contenido de recompensas, probabilidades, precio Sandbox, cooldown, claves de almacenamiento ni flujo de sincronización.
