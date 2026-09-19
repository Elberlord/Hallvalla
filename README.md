## v211 - Auditoria frontend: primer submodulo PvE

Base operativa: v210.

Este lote continua la auditoria profunda sin cambiar gameplay ni layout. Se extrajo el diario humano-legible de aprendizaje de la IA adaptativa desde `web/js/features/pve/index.js` a `web/js/features/pve/adaptive-expert-log.js`.

- API nueva: `globalThis.HallVallaAdaptiveExpertLog`.
- La feature PvE sigue siendo lazy; el submodulo carga inmediatamente antes de `features/pve/index.js`.
- Sin cambios en reglas Firebase, geometria canonica o CSS.
- Build `20260919.211`.
- Cache `hallvalla-runtime-v211`.

Documentacion principal:
- `docs/AUDITORIA_PROFUNDA_FRONTEND_v211.md`
- `docs/FRONTEND_ARCHITECTURE_v211.md`
- `docs/FRONTEND_MODULE_INVENTORY_v211.md`
- `docs/MAINTENANCE_RULES_v211.md`
- `docs/FRONTEND_HOTSPOTS_v211.md`
- `docs/SMOKE_TEST_v211.md`

Antes de usar v211 como base del siguiente lote, probar manualmente una batalla de Aventura y la exportacion del diario IA desde Configuracion.
