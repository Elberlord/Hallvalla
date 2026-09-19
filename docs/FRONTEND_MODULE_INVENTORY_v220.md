# HallValla — inventario frontend v220

Build: `20260919.220`

Módulos de producción de mayor tamaño tras la separación de cartas:

| Módulo | Bytes | Líneas | Estado / próxima acción |
| --- | ---: | ---: | --- |
| `system/settings-events.js` | 240,473 | 3,706 | pendiente: Mina/recompensas/tutorial/bindings |
| `adventure/campaign-data.js` | 160,682 | 119 | datos declarativos; tamaño alto por objetos compactos |
| `features/pvp/index.js` | 160,494 | 2,680 | pendiente de división al final |
| `game/decks-units-combat-rules.js` | 150,790 | 2,242 | pendiente: factories/deck/líderes/reglas |
| `realtime/experimental.js` | 133,855 | 2,027 | runtime crítico; modularizar al final |
| `dragon/contracts.js` | 116,951 | 1,962 | contratos/efectos Dragón |
| `game/card-special-rules.js` | 113,791 | 2,067 | nuevo runtime de reglas especiales |
| `battle/actions-inspector.js` | 99,860 | 1,210 | shell manual ya retirado |
| `battle/render-battle-tutorial.js` | 98,772 | 1,596 | pendiente: renderer vs tutorial |
| `network/battle-state.js` | 93,192 | 1,637 | **siguiente auditoría**: contrato legacy |
| `core/fx-audio-profile.js` | 92,273 | 1,307 | estable |
| `forge/deck-builder.js` | 86,470 | 1,690 | estable por ahora |
| `battle/combat-turn-ai.js` | 62,454 | 997 | resolutor compartido; nombre histórico |
| `game/card-lore-inspector.js` | 57,512 | 449 | nuevo lore/DET |
| `game/card-catalog-data.js` | 53,957 | 148 | nuevo catálogo declarativo |

`game/cards-specials-lore.js` ya no existe.
