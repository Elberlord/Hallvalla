# HallValla v214 — Auditoría system/settings-events · DEV split

## Objetivo
Segundo hotspot después de PvE: sacar de producción los calibradores y editores DEV que seguían mezclados con `system/settings-events.js`.

## Cambio estructural
- `system/settings-events.js`: 306,921 bytes / 4,891 líneas → 240,473 bytes / 3,706 líneas.
- Eliminado `dev/calibrators.js` catch-all.
- Nuevo `dev/battle-calibrators.js`: iconos/aros/números, visual de líderes/mano, cuadrícula y relojes.
- Nuevo `dev/missions-calibrator.js`: editor de geometría de Misiones.
- Nuevo `dev/det-layout-editor.js`: editor DET.
- Los tres archivos solo se cargan mediante feature `hvdev`, que bootstrap habilita exclusivamente con `?dev`.

## Producción
Se conserva un puente pequeño en `settings-events.js` que aplica `HALLVALLA_CANONICAL_UI` a las variables CSS de batalla. No lee localStorage DEV ni crea handlers/editor. Por tanto, la geometría aprobada sigue siendo canónica en URL normal.

## No tocado
Gameplay, PvE, PvP, Firebase, Mina, tutoriales, recompensas, tienda, posiciones canónicas, reglas de base de datos.

## Prueba manual solicitada
1. URL normal: Home + Aventura/PvP sin errores.
2. URL normal: confirmar que no aparecen herramientas DEV.
3. `?dev`: abrir hub/editor y comprobar Battle calibrators, Misiones y DET.
