# HallValla v225 — DET canónico + separación de Misiones/Tutoriales

Build: `20260920.225`

## DET
- El JSON aprobado por el usuario se horneó en `layout/universal-runtime.js`.
- Se aplica en producción y en `?dev`; ya no depende de localStorage para conservar esas posiciones.
- Se migró el selector específico de Hua Lan de `Ataque por la espalda` a `Golpe de Apertura`.
- El contenedor del modal pasa de la clase legacy `det-v32-card` a `det-v33-card`.
- El JSON canónico queda archivado en `docs/DET_LAYOUT_CANONICO_v225.json`.

## Auditoría de settings-events
- `system/settings-events.js`: 1222 líneas en v224 -> 669 líneas en v225.
- Se extrajeron Misiones, Maestrías y tutoriales de cuenta a `system/missions-tutorials.js` (568 líneas).
- La lógica de Misiones en producción ya no llama de forma obligatoria al calibrador DEV. `syncHvMissionsTunerControls()` solo se usa si `?dev` lo cargó.
- No se dejó una copia legacy del bloque dentro de `settings-events.js`.

## Firebase
`backend/firebase/database.rules.json` es idéntico byte por byte a v224. No requiere republicación.
