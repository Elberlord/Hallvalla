# HallValla v207 — PvP con entrada directa al duelo

## Objetivo
Simplificar el arranque competitivo: cuando matchmaking confirma rival y ambos estados privados están preparados, la partida pasa directamente al duelo. En salas manuales, ambos jugadores conservan LISTO y al confirmarlo entran igualmente al combate sin una fase intermedia.

## Cambios
- Eliminado el overlay, botones, estados, listeners y temporizadores del antiguo minijuego previo al combate.
- Eliminados sus estilos CSS y sus siete assets exclusivos.
- Eliminada la fase intermedia de las reglas de Firebase.
- Matchmaking marca LISTO automáticamente casi de inmediato cuando ambos mazos privados están preparados.
- El host resuelve internamente una prioridad inicial determinista y sincronizada, sin pedir una elección extra al jugador.
- El rival automático nace ya preparado para entrar a batalla y conserva el escalado por liga de v204.
- Se conservan el VS previo al combate, el ranking de v206, la EXP PvP y la salida segura del resultado.
- Rematch online vuelve a `waiting`, deja a ambos preparados/listos y arranca de nuevo por el mismo flujo directo.

## Build
- Web: `20260919.207`
- Cache: `hallvalla-runtime-v207`
