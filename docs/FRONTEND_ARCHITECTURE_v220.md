# HallValla — arquitectura frontend v220

## Regla canónica
El combate continuo es el único gameplay. Los conceptos de scheduling/ciclos pertenecen al runtime interno y no son modos seleccionables ni turnos de jugador.

## Fronteras de cartas especiales
- `game/card-catalog-data.js`: datos declarativos. No debe convertirse en un contenedor de resolutores de combate.
- `game/card-special-rules.js`: reglas, transformaciones y resolutores especiales compartidos.
- `game/card-lore-inspector.js`: lore, DET y presentación de información de cartas.
- `game/decks-units-combat-rules.js`: factories/reglas generales todavía pendientes de una división posterior.

## Combate
- `realtime/experimental.js`: scheduler activo, cooldowns, movimiento/ataque automático y checkpoints. El nombre `experimental` es histórico.
- `battle/combat-turn-ai.js`: resolución compartida de ataque/resultado. El nombre de archivo es histórico; no implica un motor por turnos activo.
- `battle/actions-inspector.js`: DET/rango/consulta; sin shell MOV/ATK/DEF/EFFECT.
- `network/battle-state.js`: contrato de snapshots/red. Es la siguiente frontera a auditar antes de renombrar campos legacy de estado.

## Compatibilidad
`turnPhase`, `turnKey` y varios `*TurnKey` pueden aparecer en el contrato interno. Ninguno debe utilizarse para decidir qué jugador puede actuar. La migración/normalización de esos nombres debe realizarse de forma centralizada en `network/battle-state.js`, no carta por carta.

## Habilidades automáticas adaptadas
Hua Lan y Khalid ya resuelven sus cadenas mediante el runtime automático; no dependen de botones ni órdenes manuales sobre unidades desplegadas.
