# HallValla v217 — runtime privado / presentación limpia

## Objetivo
El combate continuo ya es el único comportamiento canónico de HallValla. Esta fase elimina de la presentación de producción la jerga técnica heredada (`TR`, `realtime`, `RTC`, `turnKey`, `turnPhase`, "ciclo táctico" y expresiones de turnos) sin alterar la semántica interna necesaria para compatibilidad.

## Criterio arquitectónico
- El runtime puede conservar nombres históricos cuando aún tienen consumidores reales.
- La UI no debe enseñar detalles de implementación.
- Los datos persistentes no se renombran de forma destructiva durante esta fase.
- DEV y documentación técnica sí pueden usar la terminología interna.

## Cambios principales
- Se añadió `hallvallaPublicGameplayText()` como frontera de presentación para humanizar textos de combate antes de mostrarlos.
- Hints, logs públicos, descripciones DET, estados, tutorial y textos de habilidades pasan por esa frontera cuando corresponde.
- El HUD muestra `COMBATE` / `Activo`, no etiquetas de modo técnico.
- Configuración muestra `Controles de combate`, no `Controles TR`.
- Arsenal y gamepad dejan de mostrar la sigla `TR` al jugador.
- Los mensajes iniciales de PvP describen MANÁ/arsenal/automatización sin mencionar el nombre del runtime.
- La exportación nueva del diario de IA no añade una etiqueta de modo técnico por duelo.
- Se conserva la semántica interna de `turnKey`, `turnPhase="realtime"` y `currentPlayer:0` para compatibilidad.

## No modificado
- Daño, alcance, costes, cooldowns y comportamiento de unidades.
- Ajuste v216: ataque 2 s más rápido y movimiento 3 s más rápido.
- Firebase Realtime Database rules.
- Layout canónico.
- Matchmaking, ranking y recompensas.

## Riesgo controlado
Los textos fuente de algunas cartas todavía pueden contener términos históricos porque también alimentan lógica de evaluación/scoring. No se reescribieron destructivamente. La limpieza se realiza en la capa de presentación para no convertir texto de datos en una migración de gameplay.

## Regla nueva permanente
La UI de producción nunca debe explicar que el juego está en "TR" o "realtime": ese es simplemente el combate de HallValla. Los términos de implementación quedan en código, DEV y `/docs`.
