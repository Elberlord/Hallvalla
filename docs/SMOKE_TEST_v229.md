# HallValla v229 — Smoke test

Build: `20260920.229`

| Comprobación | Resultado |
|---|---|
| Sintaxis de todos los JS (`node --check`) | PASS |
| `RESOURCE_HASHES` vs bytes reales | PASS — 53/53 |
| `ASSET_HASHES` vs bytes reales | PASS — 723/723 |
| Feature PvP carga `ranking-results.js` antes de `index.js` | PASS |
| `features/pvp/index.js` sin bloque ranking/resultados | PASS — 2363 líneas |
| `features/pvp/ranking-results.js` extraído | PASS — 316 líneas |
| Huevo de Dragón: umbral de incubación | PASS — 200 eliminaciones |
| Orden canónico de combate | PASS — `dragon_egg` tiene prioridad absoluta antes del coste |
| Android: manifiesto de assets reales | PASS — 668/668, 154596638 bytes |
| Firebase Rules | SIN CAMBIOS |

## Nota del checker Android heredado

`check-android-virtual-layout.py` continúa conteniendo comprobaciones históricas de v180 para rutas `web/js/parts/*` y botones ya retirados. La parte vigente del checker confirma launcher, empaquetado, bridge nativo y manifiesto 668/668; sus 9 errores finales corresponden a contratos obsoletos ya documentados para el cierre Android/gamepad y no a este corte PvP.
