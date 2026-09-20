# HallValla v228 — Smoke test

## Automático / estático
| Prueba | Estado |
|---|---|
| Sintaxis de módulos JS + Service Worker + Firebase config | PASS |
| Declaraciones identificadas en el hotspot antes/después (1305/1305) | PASS |
| `RESOURCE_HASHES` vs bytes reales | PASS — 52/52 |
| `ASSET_HASHES` vs bytes reales | PASS — 722/722 |
| Cobertura completa de assets cacheables | PASS |
| Hash de `bootstrap-loader.js` en `hallvalla-stage.html` | PASS |
| Firebase backend/rules vs v227 | PASS — sin cambios |
| Asset de Perfil WEBP abre y valida | PASS — 300×300 |
| Manifiesto Android vs `web/assets` | PASS — 668/668, hashes/tamaños |

## Smoke manual recomendado
1. Abrir Home y confirmar que el retrato de Perfil aparece, no el icono roto.
2. Entrar a Mina > Shop y confirmar ambas pociones a 250 gemas.
3. Comprar Poción de Experiencia con una unidad <45 y comprobar +1 nivel.
4. Comprar Poción de Mando con un líder <45 y comprobar +1 nivel.
5. Abrir Colección/Forja y validar un mazo del tamaño requerido por el líder.
6. Entrar a Aventura, invocar una unidad, mover/atacar y terminar combate.
7. Entrar a PvP BOT solo como smoke de regresión; la modularización específica de PvP corresponde a v229.
