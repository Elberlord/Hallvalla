# HallValla v240 — Contratos canónicos del motor

Build: `20260920.240`

Base: v239.

## Auditoría v240
- Cerrado el bloque legacy de `turnKey`, `turnPhase`, `currentPlayer`, `*TurnKey`, `damagedThisTurn`, `turnsRemaining` y equivalentes.
- Gameplay activo usa `combatWindowKey`, `runtimeMode`, `combatWindowIndex`, `*WindowKey`, `damagedThisWindow` y `cyclesRemaining`.
- Los aliases históricos están aislados en `web/js/core/runtime-contracts.js` para compatibilidad con snapshots/builds anteriores.
- `battle/combat-turn-ai.js` pasa a `battle/combat-ai.js`.
- PvP terminal deja de depender de `currentPlayer`; Firebase valida `resultCommitOwner` contra el UID real de J1/J2.
- Campos persistentes de contenido como `poisonTurns`/`burnTurns` se conservan deliberadamente: son contadores de duración de esquema, no turnos de jugador.

## Firebase
**v240 modifica `backend/firebase/database.rules.json`. Deben publicarse las reglas junto con el frontend.**

## Próximo bloque
Cierre final: código muerto/assets huérfanos + pruebas completas de Aventura, PvP BOT, PvP humano concurrente, gamepad, Mina/Forja/Colección/Tutorial y validación final de hashes/cache/Firebase.
