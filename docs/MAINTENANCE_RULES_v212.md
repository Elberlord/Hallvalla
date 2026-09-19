# HallValla Maintenance Rules - v212

1. **Tiempo real es canónico.** No añadir un segundo motor PvE por turnos detrás de flags siempre verdaderos/falsos.
2. **Una responsabilidad por módulo.** PvE mantiene doctrina de mazo, campaña adaptativa y log experto separados.
3. **Nada de cementerios.** Implementación reemplazada se elimina físicamente; no `if(false)`, no bloques comentados, no copias `legacy` sin consumidor.
4. **Compatibilidad solo con consumidor real.** Un stub que siempre devuelve `null` y no tiene caller externo se elimina.
5. **API mínima.** Los namespaces publican únicamente métodos con consumidores actuales.
6. **No confundir nombres legacy con necesidad.** Antes de borrar una ruta antigua, comprobar callers, guards runtime, Firebase/localStorage, gamepad y bridges nativos.
7. **No tocar layout durante auditoría lógica.** `ui-canonical`, `universal-runtime` y CSS se preservan salvo bug visual autorizado.
8. **No tocar Firebase por refactor local.** Las reglas solo cambian cuando cambia el contrato de datos.
9. **Hashes obligatorios.** Cualquier alta/baja/cambio de JS actualiza `RESOURCE_HASHES`, `ASSET_HASHES` y el hash del bootstrap en `hallvalla-stage.html`.
10. **Repo completo por versión.** Cada entrega de auditoría es reemplazable conservando únicamente `.git`.
