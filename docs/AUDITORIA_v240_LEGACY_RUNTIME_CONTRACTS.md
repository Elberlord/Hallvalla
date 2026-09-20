# HallValla v240 — Auditoría de contratos legacy del runtime

Fecha: 2026-09-20  
Base: v239

## Resultado

El bloque de nombres/contratos heredados queda **cerrado estructuralmente** en v240.
El motor activo ya no usa semántica de turnos de jugador. Los nombres históricos que
todavía deben viajar por compatibilidad quedaron concentrados en una única frontera:
`web/js/core/runtime-contracts.js`.

## Contratos canónicos

- `combatWindowKey`
- `combatWindowIndex`
- `combatWindowStartedAt`
- `runtimeMode`
- `*WindowKey`
- `*UsedWindow`
- `damagedThisWindow`
- `cyclesRemaining` / `baseCycles`
- `bleedCyclesRemaining`
- `veilCurseCyclesRemaining`
- `summonedWindowIndex` / `summonedRuntimeMode`

## Compatibilidad controlada

`runtime-contracts.js` normaliza snapshots antiguos al entrar y expande aliases legacy
solo al escribir en la frontera Firebase. Esto permite convivir temporalmente con
clientes/snapshots v239 o anteriores sin volver a introducir semántica por turnos.

## PvP / Firebase

`currentPlayer` dejó de autorizar el cierre de una partida. El commit terminal usa
`resultCommitOwner`, validado contra el UID de `playerSlots/player1Uid` o
`playerSlots/player2Uid`. `currentPlayer=0` solo queda como sentinel de wire para
compatibilidad de builds anteriores.

**Las Firebase Rules cambian en v240 y deben desplegarse.**

## Limpieza adicional

- `battle/combat-turn-ai.js` fue renombrado a `battle/combat-ai.js`.
- Eliminada una llamada muerta al antiguo `stopTurnTimerLoop()`.
- Eliminados flags privados obsoletos `lastTurnStarted` y `skipFirstTurnDraw`.
- El motor continuo actualiza su índice/clave de ventana sin alternar jugador.

## Excepciones deliberadas

No se renombraron campos persistentes de contenido como `poisonTurns`, `burnTurns`,
`reviveTurns`, `shieldTurns`, `paralysisTurns`, `dragonFrostTurns` o
`electrocutionTurns`. Son contratos históricos de datos de cartas/estados, no control
de turno del jugador. Cambiarlos sin una migración de contenido podría romper datos
guardados. Semánticamente representan ciclos/ticks de efecto.

Tampoco se renombraron selectores/IDs históricos de UI/layout que puedan estar
referenciados por JSON de calibración, por ejemplo `turnTimerHud` o `turnHonorHud`.
No gobiernan gameplay.

## Criterio de cierre

Fuera de `core/runtime-contracts.js`, el código activo no debe consumir `turnKey`,
`turnPhase`, `currentPlayer`, `damagedThisTurn`, `turnsRemaining`, `*TurnKey` o
`*UsedTurn` como lógica de gameplay.
