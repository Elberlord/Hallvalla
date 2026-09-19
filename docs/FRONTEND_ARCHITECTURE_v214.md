# HallValla Frontend Architecture - v214

## Estado canónico

La URL normal no carga herramientas de calibración. La geometría aprobada sigue definida por `config/ui-canonical.js` y se aplica al runtime mediante el puente canónico de `system/settings-events.js`.

## Feature DEV

```text
FEATURE_PARTS.hvdev   // únicamente con ?dev
  1. dev/battle-calibrators.js
       -> iconos/aros/números, líderes/mano, cuadrícula y relojes
  2. dev/missions-calibrator.js
       -> geometría de Misiones
  3. dev/det-layout-editor.js
       -> editor visual DET
  4. dev/universal-layout-editor.js
       -> editor universal
```

`bootstrap-loader.js` rechaza `hvdev` cuando `?dev` no está activo y solo ejecuta `await hvEnsureFeature("hvdev")` en modo DEV.

## system/settings-events.js

Ya no contiene editores/calibradores. Mantiene:
- bindings de Home/configuración;
- misiones y tutoriales runtime;
- Mina/ruleta/tienda de mina;
- recompensa diaria y paquete de bienvenida;
- eventos de UI y arranque de autenticación.

El bloque de batalla que permanece en producción únicamente aplica los valores de `HALLVALLA_CANONICAL_UI`; no persiste offsets DEV ni crea listeners de edición.

## PvE

Se conserva la arquitectura cerrada en v212: doctrina de mazo, campaña adaptativa y diario experto separados; el combate real pertenece a `realtime/experimental.js`.

## Regla permanente

Ningún tuner nuevo puede añadirse a `system/`, `game/` o `battle/`. Si es una herramienta de calibración, debe vivir bajo `web/js/dev/` y cargarse solo mediante `hvdev`.
