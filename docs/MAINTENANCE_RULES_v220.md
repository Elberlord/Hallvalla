# HallValla — reglas de mantenimiento v220

1. El combate continuo es el único gameplay canónico.
2. No reintroducir gating por turnos/fases ni comandos MOV/ATK/DEF/EFFECT sobre unidades desplegadas.
3. Datos declarativos de cartas van en `card-catalog-data.js`; lore/DET en `card-lore-inspector.js`; resolutores activos en `card-special-rules.js`.
4. Una habilidad que antes exigía una orden manual debe recibir una semántica automática explícita antes de borrar su estado heredado.
5. No usar `*TurnKey` como evidencia de un turno activo: primero identificar su contrato y consumidor real.
6. Los renombres de campos persistidos/sincronizados deben centralizarse en la capa de estado y contemplar lectura de snapshots anteriores.
7. Al reemplazar una implementación, borrar físicamente la anterior; no dejar `if(false)`, copias comentadas ni assets huérfanos.
8. Terminología `TR`, `realtime`, `RTC`, `turnKey` y equivalentes es interna; la UI de producción expresa mecánicas en lenguaje normal/segundos.
9. No modificar Firebase rules por refactors locales que no cambian el contrato autorizado.
10. Toda alta/baja/cambio de frontend actualiza build, cache, `RESOURCE_HASHES`, `ASSET_HASHES` y hash del bootstrap.
11. Antes de avanzar al siguiente hotspot: sintaxis JS, JSON, hashes, ZIP y smoke test funcional.
