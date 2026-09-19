# HallValla — Frontend Architecture v217

## Frontera nueva de presentación

### Runtime / reglas
Conservan estructuras y claves históricas cuando siguen siendo necesarias para compatibilidad:
- `turnKey`
- `turnPhase: "realtime"`
- `currentPlayer: 0`
- campos `*TurnKey`
- módulo `realtime/experimental.js` (nombre de archivo histórico)

### Presentación de producción
No expone esos nombres. Usa lenguaje de juego:
- `COMBATE`
- `Activo`
- tiempos en segundos cuando son adecuados
- descripciones de estados/acciones sin mencionar la implementación

La función `hallvallaPublicGameplayText()` en `core/boot-config.js` es la frontera común para texto de combate proveniente de datos históricos.

## Dependencia permitida
`reglas/datos internos -> sanitizador de presentación -> HUD / hint / DET / log visible`

No debe existir el flujo contrario: la lógica de combate no debe depender del texto ya humanizado.

## DEV
Los calibradores y herramientas continúan bajo `web/js/dev/` y solo cargan con `?dev`. Pueden mostrar nombres técnicos internos cuando ayuden a depurar.
