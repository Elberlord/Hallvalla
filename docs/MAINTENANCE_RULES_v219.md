# HallValla — reglas de mantenimiento v219

1. El combate continuo es el único gameplay canónico.
2. No reintroducir gates `isMyTurn`/fases ni comandos manuales MOV/ATK/DEF/EFFECT sobre unidades desplegadas.
3. DET/consulta sí es una interacción manual válida y debe permanecer accesible por mouse/touch/gamepad.
4. Las cartas sí pueden usar targeting manual y drag desde mano cuando su diseño lo requiera.
5. La resolución compartida de daño/targeting/efectos debe vivir separada de UI y wrappers de input.
6. Antes de borrar una función, rastrear todos sus consumidores reales y diferenciar compatibilidad de gameplay activo.
7. Al reemplazar una implementación, borrar físicamente la anterior; no dejar `if(false)`, copias comentadas ni assets huérfanos.
8. `TR`, `realtime`, `RTC`, `turnKey` y nombres técnicos equivalentes son internos: producción no debe exponerlos al usuario salvo debug DEV.
9. No modificar Firebase rules por refactors locales que no cambian el contrato de datos.
10. Toda alta/baja/cambio de frontend actualiza build, cache, `RESOURCE_HASHES`, `ASSET_HASHES` y hash del bootstrap.
11. Cada lote debe pasar sintaxis JS, JSON, hashes, ZIP y smoke test funcional antes del siguiente hotspot.
