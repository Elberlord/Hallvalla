# HallValla Frontend Hotspots - v214

PvE está cerrado y los calibradores DEV ya no contaminan producción. Siguientes hotspots por tamaño/responsabilidad:

| Prioridad | Módulo | Tamaño | Líneas | Próxima separación sugerida |
|---:|---|---:|---:|---|
| 1 | `web/js/game/decks-units-combat-rules.js` | 311,119 B | 2,356 | deck rules / leader selection / card factory / validation / progression |
| 2 | `web/js/system/settings-events.js` | 240,473 B | 3,706 | Mina / tutoriales / recompensas / bindings generales |
| 3 | `web/js/game/cards-specials-lore.js` | 224,425 B | 2,649 | equipamiento / bestias / lore / efectos por familia |
| 4 | `web/js/features/pvp/index.js` | 187,221 B | 3,090 | ranking/results / lobby / matchmaking / bots / sync |
| 5 | `web/js/realtime/experimental.js` | 130,573 B | 1,965 | sync TR / casts / auto-movement / checkpoints |
| 6 | `web/js/dragon/contracts.js` | 127,262 B | 2,124 | contratos / rewards / combate / UI |
| 7 | `web/js/battle/actions-inspector.js` | 119,602 B | 1,560 | targeting / validators / inspector / ranges |
| 8 | `web/js/battle/render-battle-tutorial.js` | 101,123 B | 1,627 | render scheduler / HUD / overlays / tutorial |
| 9 | `web/js/network/battle-state.js` | 99,130 B | 1,712 | projection / Firebase / stealth / patches |
| 10 | `web/js/core/fx-audio-profile.js` | 92,273 B | 1,307 | FX / audio / perfil |
| 11 | `web/js/forge/deck-builder.js` | 86,519 B | 1,690 | revisar cohesión antes de extraer |
| 12 | `web/js/battle/combat-turn-ai.js` | 83,848 B | 1,293 | revisar cohesión antes de extraer |
