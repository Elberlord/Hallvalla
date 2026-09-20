# HallValla v225 — DET canónico + Misiones/Tutoriales separadas

Build: `20260920.225`

Esta entrega hornea en producción el JSON de acomodo DET aprobado por el usuario y continúa la auditoría de `settings-events.js`.

Cambios principales:
- Layout DET aprobado guardado en `layout/universal-runtime.js`; no depende de localStorage.
- `det-v32-card` reemplazado por `det-v33-card`.
- Selector de Hua Lan actualizado a `Golpe de Apertura`.
- Misiones, Maestrías y tutoriales movidos a `system/missions-tutorials.js`.
- `settings-events.js` baja de 1222 a 669 líneas.
- Producción no requiere el calibrador DEV para abrir Misiones.
- Firebase rules sin cambios.

Pruebas: ver `docs/SMOKE_TEST_v225.md`.
Pendientes: ver `docs/PENDIENTES_AUDITORIA_v225.txt`.
