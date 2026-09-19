# HallValla v220 — catálogo, reglas especiales y lore separados

Base funcional: v219.

Esta actualización cierra el punto 1 pendiente de la auditoría: el antiguo `game/cards-specials-lore.js` fue eliminado físicamente y sus responsabilidades se separaron entre datos declarativos, resolutores de reglas y lore/DET. Además se adaptaron al combate automático dos habilidades que todavía dependían semánticamente del antiguo shell manual: Hua Lan y Khalid ibn al-Walid.

## Cambios v220
- eliminado `web/js/game/cards-specials-lore.js`;
- creado `game/card-catalog-data.js` para plantillas/datos estáticos de cartas, equipamiento, bestias, especiales y entidades de Salomón;
- creado `game/card-special-rules.js` para resolutores, servicios y reglas especiales activas;
- creado `game/card-lore-inspector.js` para lore, mapeos DET e información de inspección;
- renombrados helpers internos de efectos periódicos para dejar de describirlos como inicio/fin de turno;
- el hook `turn.clearTempStats` pasó a `cycle.clearTempStats`;
- eliminado `restoreTurnGuardForOwner()`, que no tenía consumidores;
- Hua Lan ya no espera MOV/ATK/DEF manual: tras una baja normal resuelve automáticamente su reposición de hasta 1 casilla y después ataque adicional o defensa +2 GD;
- el ataque adicional de Hua Lan no puede volver a disparar su propia ejecución;
- Khalid ya no depende de `khalidChainReady`: una baja habilita el siguiente ataque sin esperar el cooldown normal; si vuelve a destruir, la cadena continúa y conserva la penalización acumulada existente;
- los antiguos flags `mulanExecutionMoveReady`, `mulanExecutionChoiceReady` y `khalidChainReady` ya no se escriben en estados nuevos; solo se purgan al leer/normalizar snapshots antiguos;
- los Restos Persistentes muestran su reanimación al jugador en segundos, aunque el contrato interno legacy conserva temporalmente `turnsRemaining`.

## Compatibilidad de campos `*TurnKey`
Se auditó el grupo de campos históricos `*TurnKey`. Todavía existen identificadores de snapshot usados como claves de la ventana periódica interna. No se renombraron masivamente en esta versión porque forman parte del contrato de estado compartido y su migración pertenece a la siguiente auditoría de `network/battle-state.js`. No controlan turnos de jugadores.

## Firebase
`backend/firebase/database.rules.json` es idéntico a v219. Esta versión no requiere republicar reglas.

## Se conserva
- ataque global 2 s más rápido y movimiento global 3 s más rápido de v216;
- UI normal sin terminología técnica del runtime;
- combate automático, targeting, daño, trampas, cooldowns y efectos;
- PvE, PvP, ranking/recompensas, Forja, DET, gamepad y calibradores `?dev`;
- `docs/TURNKEY_TURNPHASE_TR_CANONICO.txt`.

## Documentación v220
- `docs/AUDITORIA_CARD_RULES_LORE_v220.md`
- `docs/FRONTEND_ARCHITECTURE_v220.md`
- `docs/FRONTEND_MODULE_INVENTORY_v220.md`
- `docs/MAINTENANCE_RULES_v220.md`
- `docs/PENDIENTES_AUDITORIA_v220.txt`
- `docs/SMOKE_TEST_v220.md`
- `docs/TURNKEY_TURNPHASE_TR_CANONICO.txt`

## Build
- v220 · `20260919.220`
