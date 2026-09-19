# HallValla v212 - Smoke test final de auditoría PvE

## Validación automatizada

| Prueba | Estado |
|---|---|
| Sintaxis de todos los `.js` (`node --check`) | PASS - 38/38 |
| `RESOURCE_HASHES` vs bytes reales | PASS - 37/37 |
| `ASSET_HASHES` Service Worker vs bytes reales | PASS - 711/711 |
| No existe `features/pve/index.js` | PASS estructural |
| 0 referencias runtime a `adventureEnemyTurn` | PASS estructural |
| 0 referencias runtime a `HallvallaAICombatEngine` / `HallvallaAITempoEngine` | PASS estructural |
| API de doctrina reducida a consumidores reales | PASS estructural |
| `ui-canonical.js` igual a v211 | PASS |
| `universal-runtime.js` igual a v211 | PASS |
| `styles.css` igual a v211 | PASS |
| Firebase rules igual a v211 | PASS |
| Runtime TR igual a v211 | PASS |

## Smoke manual mínimo

| Área | Prueba | Estado |
|---|---|---|
| Aventura | entrar y completar una batalla TR | PENDIENTE USUARIO |
| IA adaptativa | rival construye/usa mazo normalmente | PENDIENTE USUARIO |
| Diario IA | exportar `.txt` después del duelo | PENDIENTE USUARIO |
| PvP BOT | matchmaking -> BOT -> duelo directo | PENDIENTE USUARIO |
| Consola | sin `ReferenceError`/errores de carga PvE | PENDIENTE USUARIO |

No se necesita publicar reglas nuevas de Firebase.

## Sello automatizado

- JSON: 8/8 archivos parseados correctamente.
- Hash del `bootstrap-loader.js` en `hallvalla-stage.html`: PASS.
- 0 referencias runtime a los motores PvE por turnos eliminados.
- Los cinco globals públicos de campaña adaptativa con una sola referencia local fueron verificados con consumidores externos reales.
