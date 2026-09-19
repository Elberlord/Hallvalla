# HallValla v213 — salida PvP a Home

## Problema observado
Tras finalizar un duelo PvP, **Ir a Home** podía tardar ~8–10 s. La consola mostraba `Leer private/player1 antes de limpiar superó 4s sin responder`.

## Causa
La limpieza hacía lecturas Firebase redundantes antes de borrar `private/playerN` y antes de cerrar/liberar `public`. Las reglas de Realtime Database ya validan ownership, por lo que esos GET no añadían seguridad y sí podían bloquear la navegación.

## Corrección
- Eliminado el GET previo de `removeOwnPrivateBranch`.
- J1 limpia `private/player1` y `public` en paralelo.
- J2 limpia su rama privada y libera su slot público en paralelo.
- Al salir de una batalla ya terminada no se vuelve a escribir la cola de matchmaking si no existe una búsqueda viva.
- Ranking/EXP se siguen confirmando antes de destruir la sala.

No cambian reglas Firebase, gameplay, PvE ni layout.
