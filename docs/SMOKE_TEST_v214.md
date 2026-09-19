# HallValla v214 - Smoke test · settings/dev split

## Validación automatizada

| Prueba | Estado |
|---|---|
| Sintaxis de todos los `.js` (`node --check`) | PASS - 40/40 |
| `RESOURCE_HASHES` vs bytes reales | PASS - 39/39 |
| `ASSET_HASHES` Service Worker vs bytes reales | PASS - 713/713 |
| `dev/calibrators.js` eliminado | PASS |
| 0 editores DET/battle tuner dentro de `system/settings-events.js` | PASS |
| `hvdev` contiene solo módulos bajo `dev/` | PASS |
| Build/cache | PASS - `20260919.214` / `hallvalla-runtime-v214` |

## Validación heredada

- Aventura PvE TR: PASS reportado por el usuario en v212/v213.
- Exportación del diario IA: PASS en v211.
- Firebase rules: sin cambios.

## Smoke manual mínimo de v214

| Área | Prueba | Estado |
|---|---|---|
| URL normal | Home, Aventura y PvP abren sin `ReferenceError` | PENDIENTE USUARIO |
| URL normal | herramientas DEV no aparecen ni cargan | PENDIENTE USUARIO |
| `?dev` | abrir editor universal | PENDIENTE USUARIO |
| `?dev` batalla | abrir calibradores de stats/visual/cuadrícula/relojes | PENDIENTE USUARIO |
| `?dev` Misiones | abrir/exportar calibrador | PENDIENTE USUARIO |
| `?dev` DET | abrir `AJUSTAR DET` y seleccionar/mover un elemento | PENDIENTE USUARIO |

No se requiere publicar reglas nuevas de Firebase.
