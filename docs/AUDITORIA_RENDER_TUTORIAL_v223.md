# HallValla v223 — separación renderer / estados / tutorial / overlays

Base funcional: v222.

## Auditoría `battle/render-battle-tutorial.js`
El monolito anterior fue eliminado físicamente y sus responsabilidades quedaron separadas en:

- `battle/render-battle.js`: renderer de HUD, tablero, líderes, mano e historial.
- `battle/status-presentation.js`: presentación visual y textos públicos de estados/buffs/debuffs.
- `battle/basic-tutorial.js`: tutorial básico, coach, foco y recompensas del tutorial.
- `battle/battle-ui-dialogs.js`: modal genérico y menú/audio/salida del combate.

No queda copia legacy de `render-battle-tutorial.js`.

## Limpieza adicional
- El renderer ya no usa `currentPlayer` para decidir el HUD local/rival ni para mostrar el texto de IA de Aventura.
- Los textos públicos de estados dejaron de hablar de “este turno”, “próximo turno” o “fin del turno rival”; describen la duración como temporal, periódica o hasta expiración.
- Se eliminaron los stubs muertos `showStatsTutorial`, `isBasicTutorialInitialDrawBlocked` y `getBasicTutorialPhaseGate`.
- `runFirstTimeTutorialBefore` fue retirado: sus dos consumidores ahora abren directamente el evento correspondiente.
- Se retiraron comentarios del tutorial que todavía enumeraban el shell manual MOV/DEF/ATTK eliminado en v219.

## Sin cambios de gameplay
No se modificaron daño, balance, movimiento, velocidad, Firebase, PvP, IA, líder, Tier ni costes.

## Build
- v223 · `20260919.223`

## Fix DEV del DET
El selector universal usaba `document.elementFromPoint()`. Como varios datos del DET usan `pointer-events:none` fuera de edición, el navegador los omitía y seleccionaba el fondo. v223 añade hit-test geométrico DEV para esos nodos sin modificar producción.
