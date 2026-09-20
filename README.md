# HallValla v235 — PvP deterministic human matchmaking

Build: `20260920.235`

Base: v234.

## Correcciones PvP de esta versión
- El emparejamiento humano ya no usa `createdAt` ni la hora local del dispositivo como criterio de elegibilidad.
- Dos jugadores de la misma liga se arbitran de forma determinista por UID; exactamente uno reclama la sala del otro.
- Cada cliente crea su sala y publica su propia entrada de matchmaking **antes** del primer intento de claim, tal como exigen las Firebase Rules actuales.
- El slot J2 se reclama con `runTransaction`, evitando que dos clientes puedan ocuparlo simultáneamente.
- Un cliente con claim humano entrante no intenta reclamar a otro jugador ni activar un BOT.
- Se añadió candado `randomHumanJoinInFlight` durante claim → cierre de sala provisional → join, evitando escaneos/fallback paralelos.
- El fallback BOT da prioridad absoluta a cualquier humano visible de la misma liga y sus aplazamientos por humano no consumen los intentos BOT.
- Claims humanos huérfanos pueden recuperarse por el dueño de la cola tras una gracia local, sin comparar relojes entre dispositivos.
- Diagnósticos repetitivos de matchmaking fueron limitados para no inundar la consola.
- Cache runtime: `hallvalla-runtime-v235`.

## Firebase
No requiere cambios de reglas respecto de v234. El nuevo orden de publicación/claim se ajusta al contrato ya existente de `matchmaking/random`.
