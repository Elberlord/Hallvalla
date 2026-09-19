# HallValla v201 — Matchmaking cache + fallback

- Corrige sincronización de shell/loader/service worker antes de abrir el stage.
- El shell registra el Service Worker actual antes de cargar HallValla.
- El Service Worker elimina caches HallValla anteriores al activar la nueva build.
- Todos los marcadores de build pasan a 20260919.201 / shell 201.
- Se corrigen hashes de bootstrap, PvP, settings y CSS.
- Fallback PvP libera claims humanos obsoletos tras 8 s si la sala sigue sin rival.
- Diagnóstico interno del matchmaking se imprime solo en consola; la UI no revela BOT.
- Se eliminan tres bindings muertos que generaban warnings por elementos inexistentes.
