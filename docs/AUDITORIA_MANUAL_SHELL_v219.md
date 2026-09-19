# HallValla v219 — auditoría del shell manual de unidades

## Objetivo
Eliminar físicamente la antigua capa de control manual MOV / ATK / DEF / EFFECT sin tocar la resolución compartida que utiliza el combate automático actual.

## Qué se eliminó

### `battle/actions-inspector.js`
Se eliminaron los predicados de disponibilidad manual, la búsqueda de destinos manuales, las zonas MOV/ATK, la selección táctica directa y los helpers de path usados exclusivamente por `moveUnit()`. Se conservan `getLiveUnitRef()`, `getUnitAttackRange()` y `attackRangeCells()` porque todavía sirven a resolución compartida o lectura de amenaza.

### `battle/board-interactions.js`
Se eliminó el arrastre de una unidad ya desplegada, el undo inmediato de movimiento, el flujo `cellClick()` para MOV/ATK/EFFECT, los wrappers manuales de EFFECT/DEF y el menú de cinco acciones. El menú de unidad queda como acceso DET. El arrastre de una carta de unidad desde la mano se conserva para invocación.

### `battle/combat-turn-ai.js`
Se eliminaron `moveUnit()`, `attackUnit()` e `inspectSharedAttackActionEligibility()`. Se conservan `inspectSharedAttackTargetBasics()`, `resolveSharedAttackPreparation()` y `resolveSharedAttackOutcome()`, que son consumidos directamente por `realtime/experimental.js`.

### render / gamepad / clocks
Se retiraron estados visuales de agotamiento manual, arrastre de unidades, targeting directo manual, fallback DEF y ciclado manual del gamepad, además de helpers de fase que quedaron sin consumidores.

### Dragon / Falsa Corona
Los hooks del Huevo de Dragón hacia wrappers manuales fueron eliminados. `cannotAttack` se valida en el motor automático. El redirect de Falsa Corona ya no usa `attackZones()` y evalúa directamente aliados vivos dentro del alcance del atacante.

## Eliminación física comprobada
En `web/js` no quedan referencias runtime a:

`isUnitManualActionAvailable`, `isUnitManualMoveAvailable`, `unitManualActionUnavailableHint`, `moveUnit`, `attackUnit`, `activateDefenseStance`, `activateUnitEffect`, `isMyTurn`, `isActionPhase`, `isHandPlayPhase`, `turnPhaseLabel`, `shouldAutoOpenHand`, `isOnlineOpponentHandReview`, `startUnitBoardDrag`, `getDragUnitMoveKeys`, `getDragUnitAttackKeys`, `canUnitDeclareAttack`, `getAttackableTargets`, `moveZones`, `attackZones`, `isDirectTacticalUnitSelection`, `inspectSharedAttackActionEligibility`.

También se eliminaron los estados globales `selectedUnitActionMode`, `selectedUnitEffectChoice`, `dragMoveHighlights` y `dragAttackHighlights`.

## Reducción aproximada
- `actions-inspector.js`: 106,809 B → ~99.9 KB.
- `board-interactions.js`: 70,578 B → ~50.5 KB.
- `combat-turn-ai.js`: 78,131 B → ~62.4 KB.
- cuatro imágenes legacy del menú: ~150 KB eliminados.

## Fuera de alcance deliberado
Algunas habilidades todavía conservan campos históricos como `mulanExecutionMoveReady`, `mulanExecutionChoiceReady`, `khalidChainReady` y `khalidAttackPenalty`. Ya no controlan el shell manual. Su semántica debe adaptarse/limpiarse al auditar `cards-specials-lore.js`, para no inventar cambios de balance durante esta eliminación estructural.
