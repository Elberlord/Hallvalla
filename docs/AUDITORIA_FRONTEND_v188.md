# HallValla - Auditoria frontend v188

Plano logico: 1366x636.

## Cambios aplicados
- Universal Layout Runtime es el unico dueno de geometria de la Forja.
- forge-layout.js es solo un bridge de rerender.
- Se migraron width y height que se habian perdido en v187.
- Coleccion: 15 slots estables entre paginas.
- Mazo: 30 slots estables.
- Codigo muerto confirmado fue borrado fisicamente, no comentado ni encerrado en if(false).

## Resultado de limpieza
- Funciones JS borradas: 31
- Reglas CSS huerfanas borradas: 342
- JS antes: 3040306 bytes / 45217 lineas
- JS despues: 3038922 bytes / 44980 lineas
- CSS antes: 1175709 bytes / 29976 lineas
- CSS despues: 1124637 bytes / 29042 lineas
- Reduccion JS+CSS: 52456 bytes

## Funciones eliminadas
- defaultState
- countBy
- startTurnTimerLoop
- tickTurnTimer
- isUnitMovePhase
- canManuallyOpenHandNow
- canOpenHandForViewNow
- getPrincipalSlotsForLeaderType
- getDeckSizeForPrincipalSlots
- isSwordUnitCardLike
- isMountedArcherCard
- isCanonicalFootArcherMovementOne
- getStarterComplementTemplate
- handleBattleCancelButton
- syncBattleCancelUndoUi
- tryImmediateMoveUndo
- getBasicTutorialEnemyUnit
- renderDetail
- maybeShowBasicTutorialGate
- closeHallvallaPackOdds
- normalizePrincipalKeys
- setCurrentDeckPrincipal
- clearCurrentDeckPrincipal
- renderDeckPrincipalSelector
- isChapterOneCompleteForTutorial
- ensureHomeDeckTutorialUi
- startHomeDeckTutorial
- getHallvallaMineWheelCategory
- getHallvallaMineShopRevealOrder
- getHallvallaMineShopPuzzleHtml
- hallvallaRtMoveUnit

## Familias CSS eliminadas
- Mina antigua hv47
- UI antigua de Personajes Principales del constructor
- Maestrias antiguas previas a hv-mastery
- Panel antiguo de materiales/crafteo que ya no se renderiza
- actions-hud-tuner
- editor dedicado viejo de Creacion de mazo

## Retenido a proposito
- Migraciones y compatibilidad Firebase/localStorage
- battle-layout.js, porque sigue activo en combate
- event splash, porque esta dormido/deshabilitado pero no es inequívocamente basura
- herramientas DEV que aun tienen consumidores reales
