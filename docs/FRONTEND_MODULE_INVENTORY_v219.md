# HallValla — inventario de hotspots v219

Tamaños aproximados después de eliminar el shell manual. Los módulos DEV se excluyen de la prioridad de producción.

| Módulo | Bytes aprox. | Líneas aprox. | Próximo tratamiento |
|---|---:|---:|---|
| `system/settings-events.js` | 240,473 | 3,707 | separar Mina/recompensas/tutorial/bindings |
| `game/cards-specials-lore.js` | 224,356 | 2,650 | **siguiente**: datos/lore vs efectos |
| `adventure/campaign-data.js` | 160,682 | 120 | datos declarativos; tamaño aceptable por densidad |
| `features/pvp/index.js` | 160,494 | 2,681 | dividir al final por riesgo de protocolo |
| `game/decks-units-combat-rules.js` | 151,017 | 2,246 | factories/deck/líderes/reglas compartidas |
| `realtime/experimental.js` | 130,509 | 1,967 | runtime crítico; modularizar al final |
| `dragon/contracts.js` | 116,950 | 1,963 | revisar tras cartas/especiales |
| `battle/actions-inspector.js` | ~99,860 | ~1,211 | shell manual eliminado; DET todavía grande |
| `battle/render-battle-tutorial.js` | 98,741 | 1,597 | separar renderer/tutorial |
| `network/battle-state.js` | 93,192 | 1,638 | limpiar estado legacy/snapshots |
| `core/fx-audio-profile.js` | 92,273 | 1,307 | FX/audio/perfil |
| `forge/deck-builder.js` | 86,470 | 1,690 | revisar después de core combat |
| `battle/combat-turn-ai.js` | 62,382 | 992 | wrappers manuales fuera; quedan resolutores compartidos |
