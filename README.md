# HallValla v232 — PvP sync/protocol split

Build: `20260920.232`

Esta entrega cierra el corte de sincronización/protocolo de la auditoría PvP.

Cambios principales:
- Nuevo `features/pvp/sync-protocol.js`: listeners público/privado, cleanup, reconciliación de fases y rematch.
- Nuevo `features/pvp/sync-engine-bridge.js`: handshake de arena, preparación privada J1/J2, `enginePrep`, prebattle y handoff concurrente al motor real.
- `features/pvp/index.js`: 2069 → 1475 líneas.
- Se mantienen separados `ranking-results.js`, `lobby-matchmaking.js` y `bot.js`.
- Firebase Rules no cambian.
- Build/cache/hashes actualizados a v232.

Pruebas: `docs/SMOKE_TEST_v232.md`.
Auditoría: `docs/AUDITORIA_v232_PVP_SYNC_PROTOCOL.txt`.
Pendientes: `docs/PENDIENTES_AUDITORIA_v232.txt`.
