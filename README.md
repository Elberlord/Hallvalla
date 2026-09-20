# HallValla v234 — PvP handshake + fallback BOT hotfix

Build: `20260920.234`

Base: v233.

## Correcciones
- Reparado el deadlock `configured -> arena_ready` que podía dejar dos cuentas reales conectadas sin iniciar el duelo.
- El puente PvP ahora expone `buildRealPrivateState6e` al orquestador BOT; se elimina el `ReferenceError` del fallback.
- El fallback BOT tiene un único controlador de reintentos; ya no se dispara también desde cada escaneo de cola.
- Antes de preparar un BOT se comprueba nuevamente si existe un rival humano elegible de la misma liga; el humano tiene prioridad.
- Se añadieron diagnósticos de cola para detectar cuentas visibles pero no elegibles (por ejemplo, ligas distintas).
- Cache runtime: `hallvalla-runtime-v234`.

## Firebase
No requiere cambios de reglas respecto de v233.
