# HallValla v226 — recompensas separadas de settings-events

Build: `20260920.226`

Esta entrega continúa la auditoría estructural sin cambiar reglas de juego. El paquete de bienvenida y la cadena mensual de recompensas diarias salen de `system/settings-events.js` y viven ahora en `account/rewards.js`.

Cambios principales:
- `system/settings-events.js`: 669 -> 266 líneas.
- Nuevo `account/rewards.js`: paquete de bienvenida PayPal Sandbox + cadena diaria completa.
- Se conservan precio Sandbox, contenido mostrado, cooldown de 24 h, premio final mítico y `hallvalla_daily_reward_chain_v1`.
- El loader coloca Recompensas después de perfil/auth/Forja para conservar disponibles sus dependencias históricas.
- Misiones/Tutoriales siguen aislados en `system/missions-tutorials.js`.
- Hashes de loader y Service Worker actualizados a v226.
- Firebase rules sin cambios.

Auditoría: `docs/AUDITORIA_SETTINGS_REWARDS_v226.md`.
Pruebas: `docs/SMOKE_TEST_v226.md`.
Pendientes: `docs/PENDIENTES_AUDITORIA_v226.txt`.
