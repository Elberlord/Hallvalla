# HallValla v239 — Smoke test

- JS syntax: PASS — todos los módulos.
- Runtime split parity: PASS — 127/127 funciones del motor v238 presentes tras el split/rename.
- PvP checkpoint security guard: PASS — gameplay permitido, playerSlots/terminal/ownerUid bloqueados según contrato.
- RESOURCE_HASHES: PASS — 61/61.
- Service Worker ASSET_HASHES: PASS — 731/731.
- Firebase rules JSON: PASS.
- Android assets vigentes: PASS — 668/668, 154596638 bytes.
- Checker Android v180: conserva 9 avisos históricos ya documentados (rutas web/js/parts, botones Home retirados y build marker v180). No corresponden a este corte.

## Firebase
v239 modifica backend/firebase/database.rules.json. Debe publicarse junto con el frontend para activar la validación de realtimeEnabled y ownership de rtCheckpoint.
