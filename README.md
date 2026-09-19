# HallValla v221 — DET corregido + balance de Tier y Maestría

Base funcional: v220.

Esta actualización aplica el rebalance acordado para evitar inflación extrema de estadísticas y reemplaza la plantilla DET que todavía contenía dos casillas por stat.

## Cambios v221
- nueva plantilla `assets/ui/det_templates/det_base_universal_v33.webp`;
- eliminado físicamente `det_base_universal_v32.webp`;
- DET con una sola casilla por HP / DX / MV / AT / GD / AG / RG;
- eliminado el adorno de estrella del panel inferior derecho de la nueva plantilla;
- valor de COPIAS reubicado dentro de su casilla;
- TIPO / RAREZA / ESTADO alineados con sus campos de la nueva plantilla;
- el costo bajo el retrato se conserva sin cambios;
- buff de categoría de todos los líderes reemplazado por una progresión acumulativa universal y estable;
- la Maestría/rango de una unidad aumenta únicamente DX: +2 DX por cada rango ganado, sin aumentar AT, HP, GD o AG;
- Hua Lan reemplaza el requisito posicional del antiguo ataque por la espalda por `Golpe de Apertura`: su primer ataque tras entrar al campo obtiene +6 AT;
- la ejecución automática de Hua Lan después de una baja se conserva: reposición de hasta 1 casilla y después ataque adicional si existe objetivo o defensa +2 GD si no existe;
- las reglas Firebase no cambian.

## Buff acumulativo de líder
- Tier 1: +1 AT
- Tier 2: +1 AT, +1 DX
- Tier 3: +1 AT, +1 DX, +1 AG
- Tier 4: +1 AT, +1 DX, +1 AG, +1 GD
- Tier 5: +1 AT, +1 DX, +1 AG, +1 GD, +1 HP

Cada Tier conserva todos los bonus anteriores y añade exactamente un stat. MV y RG no forman parte de esta progresión.

## Maestría de unidades
La progresión mantiene la magnitud histórica de +2 por rango, pero ahora se aplica exclusivamente a Destreza. Por tanto, una unidad en Rango XV recibe +28 DX de Maestría y 0 AT / HP / GD / AG adicionales por Maestría.

## Firebase
`backend/firebase/database.rules.json` es byte por byte idéntico a v220. No es necesario republicar reglas.

## Documentación
- `docs/AUDITORIA_DET_BALANCE_v221.md`
- `docs/PENDIENTES_AUDITORIA_v221.txt`
- `docs/SMOKE_TEST_v221.md`
- `docs/TURNKEY_TURNPHASE_TR_CANONICO.txt`

## Build
- v221 · `20260919.221`
