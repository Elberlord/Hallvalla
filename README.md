# HallValla v212 - Cierre de auditoría PvE

Base: v211 aprobada manualmente.

Este build elimina el antiguo motor PvE por turnos, que quedó inalcanzable desde que TR es canónico, y deja PvE dividido únicamente en campaña adaptativa, doctrina de mazo y diario experto.

Cambios clave:
- eliminado `features/pve/index.js` monolítico;
- -251 KB / -4,755 líneas dentro de `features/pve`;
- eliminado `adventureEnemyTurn`, AI Combat Engine y AI Tempo Engine antiguos;
- eliminados timers/locks y callers exclusivos de esa ruta;
- eliminado preload PvE innecesario al crear BOT PvP;
- reglas Firebase, layout y motor TR sin cambios;
- build `20260919.216`, cache `hallvalla-runtime-v216`.
- v214: calibradores DEV retirados de `system/settings-events.js` y separados por responsabilidad bajo `web/js/dev/`.

Documentación:
- `docs/AUDITORIA_PROFUNDA_FRONTEND_v212.md`
- `docs/FRONTEND_ARCHITECTURE_v212.md`
- `docs/FRONTEND_MODULE_INVENTORY_v212.md`
- `docs/FRONTEND_HOTSPOTS_v212.md`
- `docs/MAINTENANCE_RULES_v212.md`
- `docs/SMOKE_TEST_v212.md`

- v215: datos estáticos de Aventura 1–20 extraídos de `game/decks-units-combat-rules.js` a `adventure/campaign-data.js`; sin cambio de gameplay.

- v216: eliminado el orquestador legacy por turnos alcanzable solo fuera de TR; ataque global 2 s más rápido y movimiento global 3 s más rápido.
