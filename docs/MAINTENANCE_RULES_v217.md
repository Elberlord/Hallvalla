# HallValla — Maintenance Rules v217

1. El combate continuo es el único runtime canónico.
2. No mostrar `TR`, `realtime`, `RTC`, `turnKey`, `turnPhase` ni "ciclo táctico" en UI de producción.
3. No reintroducir fases Draw/Main/Action/End ni alternancia por jugador.
4. `turnKey` y `turnPhase` se conservan solo mientras tengan consumidores técnicos o compatibilidad persistente real.
5. No reescribir textos fuente usados por scoring/reglas solo para resolver presentación; sanitizar en la frontera UI.
6. DEV y `/docs` sí pueden usar terminología técnica.
7. No tocar Firebase rules, layout o gameplay durante una limpieza de presentación sin bug reproducible autorizado.
8. Cada eliminación futura de campos legacy requiere mapa de consumidores y smoke test previo.
