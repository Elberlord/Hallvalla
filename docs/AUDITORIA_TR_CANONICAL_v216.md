# HallValla v216 — TR CANONICAL CLEANUP + ritmo global

## Alcance
Auditoría del motor por turnos que quedó detrás del modo TR canónico. Se eliminó únicamente orquestación que ya era inalcanzable porque `isHallvallaRealtimeExperimentalRequested()` es permanentemente `true`.

## Eliminado físicamente
- Reloj de 180 s por turno y handoff de reloj por jugador.
- Expiración de turnos/duelos basada en `currentPlayer`.
- `maybeStartTurn()` (Draw/Main inicial, recarga por turno, efectos de inicio de turno).
- `finishTurn()` y `advanceTurnPhase()` (Draw/Main/Action/Last/End).
- Auto-avance por mano sin jugadas y por campo sin acciones.
- Presentación/announcement de fases y render del HUD de reloj de turno.
- Runner `dragonContractEnemyTurn` y hook huérfano `adventure.enemyTurn` (sin consumidores).
- Escritura nueva de `clockRulesetVersion/playerClockMs` en Aventura, Tutorial y PvP.

## Conservado deliberadamente
- `turnKey` y varios nombres históricos de estados siguen existiendo donde hoy funcionan como identificador de ciclo táctico/compatibilidad de saves. No ejecutan un sistema de turnos.
- Resolución compartida de ataques, efectos, quemadura/sangrado, trampas y líderes usada por TR.
- Reglas Firebase, layout y progreso.

## Velocidad global solicitada
- Ataque: cada unidad espera exactamente 2 s menos respecto al resultado del modelo v176 (ventana aprox. 8–14 s).
- Movimiento: cada unidad espera exactamente 3 s menos respecto al resultado del modelo v176 (ventana aprox. 7–15 s).
- Se conserva la diferenciación relativa por AGI, MOV, arma, armadura y carga.

## Métricas de los módulos limpiados
- `web/js/core/runtime-clocks.js`: 29,416 B / 572 líneas → 13,935 B / 298 líneas (Δ -15,481 B / -274 líneas).
- `web/js/network/battle-state.js`: 99,130 B / 1,712 líneas → 93,106 B / 1,637 líneas (Δ -6,024 B / -75 líneas).
- `web/js/battle/combat-turn-ai.js`: 83,848 B / 1,293 líneas → 78,098 B / 1,226 líneas (Δ -5,750 B / -67 líneas).
- `web/js/battle/actions-inspector.js`: 119,602 B / 1,560 líneas → 111,940 B / 1,395 líneas (Δ -7,662 B / -165 líneas).
- `web/js/dragon/contracts.js`: 127,262 B / 2,124 líneas → 116,950 B / 1,962 líneas (Δ -10,312 B / -162 líneas).
- `web/js/features/pvp/index.js`: 187,221 B / 3,090 líneas → 160,636 B / 2,680 líneas (Δ -26,585 B / -410 líneas).
- `web/hallvalla-stage.html`: 97,733 B / 1,497 líneas → 94,346 B / 1,452 líneas (Δ -3,387 B / -45 líneas).
- `web/styles.css`: 1,120,746 B / 29,013 líneas → 1,108,929 B / 28,884 líneas (Δ -11,817 B / -129 líneas).

## Smoke test requerido
1. Aventura TR completa: invocación, movimiento/ataque automáticos, magia y final de batalla.
2. PvP BOT: matchmaking directo, combate, ranking/EXP y Salir a Home.
3. Tutorial TR: inicio y primera invocación.
4. Confirmar visualmente que ataque es ~2 s más frecuente y movimiento ~3 s más frecuente que v215.
5. Consola sin `ReferenceError` de `finishTurn`, `maybeStartTurn`, timers o auto-avance.
