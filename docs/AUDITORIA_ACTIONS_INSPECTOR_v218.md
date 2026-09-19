# HallValla v218 — limpieza de actions-inspector

## Objetivo
Eliminar del inspector/flujo de cartas las decisiones heredadas de turnos que ya eran inalcanzables desde que el combate continuo es el único runtime canónico, sin modificar daño, costes, targeting, cooldowns ni reglas de Firebase.

## Eliminado físicamente
- `normalizeFreshSummonsForActionPhase()`; no tenía consumidores.
- Gate de `isMyTurn()` en `getCardPlayState()`.
- Gate de `isHandPlayPhase()` y textos Main/Last Phase en `getCardPlayState()`.
- Gate de turno en `getPlayableCardsInHand()`.
- `canPlayCardWithSnapshot()` y `handHasPlayableWithSnapshot()`; evaluador del flujo Main/Last sin consumidores.
- `getHandAvailabilityKey()` y el auto-open de mano asociado al viejo ciclo de turno.
- Rama de revisión de mano durante turno rival.
- Gates Main/Last Phase en `selectCard()` y `playCardOn()`.

## Compatibilidad temporal explícita
Las acciones manuales MOV/ATK/DEF/EFFECT de unidades ya estaban inalcanzables en v217 porque `currentPlayer=0` e `isActionPhase()` era falso. En v218 se reemplazó esa dependencia engañosa por predicados explícitos:
- `isUnitManualActionAvailable()` → `false`
- `isUnitManualMoveAvailable()` → `false`

Esto conserva exactamente el comportamiento actual mientras permite retirar en una fase posterior el shell visual/manual restante de `board-interactions`, `combat-turn-ai`, render y gamepad sin confundirlo con lógica activa del combate automático.

## Presentación
El propio `actions-inspector.js` ya no contiene referencias visibles a Main Phase, Last Phase, Action Phase, "turno" o "ciclo táctico". Los textos DET de PREC/EVA, Guardia, lanza, arquería y sangrado se expresan con tiempo/recarga periódica.

## Métrica
- v217: 112,070 B / 1,395 líneas / 88 funciones.
- v218: 106,809 B / 1,332 líneas / 84 funciones.
- Reducción: 5,261 B / 63 líneas / 4 funciones.

## No modificado
- Daño, Guardia, DX/AGI, alcance, targeting o resolución de golpes.
- Velocidades v216: ataque -2 s y movimiento -3 s.
- PvP, matchmaking, ranking, EXP.
- Aventura/PvE.
- Firebase rules.
- Layout o calibración DEV.
