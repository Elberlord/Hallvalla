# HallValla — arquitectura frontend v219

## Regla canónica de combate
El combate continuo es el único runtime de gameplay. Las unidades desplegadas no reciben órdenes manuales MOV/ATK/DEF/EFFECT. El jugador interactúa mediante cartas, recursos y controles explícitos del runtime; las unidades resuelven movimiento, target, ataque y capacidades automáticas mediante el motor.

## Fronteras principales
- `realtime/experimental.js`: scheduling/cooldowns, movimiento automático, ataques, input canónico y checkpoints.
- `battle/combat-turn-ai.js`: resolutores compartidos de preparación/resultado de ataque y efectos de combate reutilizables. El nombre de archivo es histórico y debe tratarse como candidato de rename posterior, no como evidencia de turnos activos.
- `battle/board-interactions.js`: targeting de cartas, arrastre de invocaciones desde mano, DET/long-press y resolutores puros de efectos que consume el runtime.
- `battle/actions-inspector.js`: inspector/DET, reglas de rango compartidas y lectura de amenaza. Ya no contiene control manual de unidades.
- `battle/render-battle-tutorial.js`: renderer + tutorial; aún requiere división.
- `network/battle-state.js`: snapshots/estado/red; siguiente auditoría después de habilidades.

## Estado de compatibilidad
`turnPhase`, `turnKey` y campos `*TurnKey` pueden permanecer de forma transitoria por compatibilidad o como identificadores internos de ventana/ciclo. No deben reintroducir gating de jugador/fase. Ver `TURNKEY_TURNPHASE_TR_CANONICO.txt`.

## UI de unidad v219
Clic/tap selecciona la unidad para consulta y ofrece DET. Pulsación larga/clic derecho abre detalle. No existen comandos MOV/ATK/DEF/EFFECT sobre una unidad desplegada.
