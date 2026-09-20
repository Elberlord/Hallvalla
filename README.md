# HallValla v239 — Motor automático canónico + seguridad PvP

Build: `20260920.239`

Base: v237, que fue la primera prueba con dos cuentas reales que sí completó el matchmaking directo J1/J2.


## v239 · Auditoría actual
- `realtime/experimental.js` deja de formar parte del runtime y se divide en cinco módulos canónicos.
- El estado nuevo usa `realtimeEnabled` y las APIs activas usan nombres `Realtime`, sin `Experimental`.
- PvP añade guard previo de checkpoints para impedir que gameplay normal altere estructura de sala/identidad/reglas/resultados.
- Firebase valida el owner de `rtCheckpoint` contra el UID autenticado de J1/J2.
- Esta versión modifica `backend/firebase/database.rules.json`; deben desplegarse las reglas junto con el frontend.

## Cambio principal
- PvP humano activo detecta desconexión real mediante Firebase `onDisconnect`.
- El jugador que abandona/desconecta primero recibe **-2 puntos PvP y 1 derrota**.
- El rival que permanece conectado **no recibe victoria, empate ni puntos**.
- Las bajas de unidades realizadas antes de la desconexión se conservan; la Maestría las registra en el instante de la baja.
- Salir antes de que el combate esté activo no aplica penalización.
- El rival recibe un aviso claro de desconexión y el duelo se limpia de forma segura.
- `private/playerN` queda protegido con cleanup `onDisconnect`.

## Firebase
**Esta versión SÍ modifica `backend/firebase/database.rules.json`.**
Hay que desplegar las reglas nuevas para que el registro especial de desconexión y el cleanup por J2 cuando cae J1 funcionen en producción.

## Diagnóstico de v236/v237
Que v237 funcionara al eliminar el claim intermedio confirma que el bloqueo anterior estaba en la capa extra `matchmaking/random -> claimedBy`, no en el nivel del jugador ni en Liga Piedra. El claim canónico sigue siendo la transacción sobre `playerSlots/player2Uid`.
