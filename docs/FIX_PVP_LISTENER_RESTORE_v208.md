# HallValla v208 — Restauración de infraestructura PvP

## Síntoma
Al pulsar PvP en v207, `resetUi()` lanzaba `ReferenceError: detachRoomListener is not defined`.

## Causa
Durante la eliminación completa del antiguo flujo previo al duelo se borró un bloque contiguo que contenía funciones del minijuego, pero dentro de ese mismo bloque también estaban cuatro funciones generales de infraestructura PvP que no dependían de dicho flujo:

- `detachRoomListener()`
- `detachOwnPrivateListener()`
- `attachOwnPrivateListener()`
- `removeOwnPrivateBranch()`

`resetUi()` llama a las dos funciones `detach*`, por lo que el error ocurría antes de poder abrir correctamente la pantalla PvP. Otras rutas de matchmaking también necesitaban las funciones de listener privado y limpieza de rama privada.

## Reparación
Se restauraron exclusivamente esas cuatro funciones desde la base estable anterior, sin recuperar ninguna función, estado, interfaz, temporizador ni asset del sistema eliminado.

## Firebase
No se modifica `backend/firebase/database.rules.json` en esta versión. Las reglas v207 sin la fase eliminada siguen siendo las correctas.

## Versionado
- Web: `20260919.208`
- Cache: `hallvalla-runtime-v208`
