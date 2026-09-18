# HallValla v191 — coordenadas de DEV horneadas en producción

- Se fusionó el JSON exportado desde `?dev` sobre el `CANONICAL_CONFIG`.
- Se conservaron todos los ajustes existentes de producción: botón Volver,
  Beast Master/evento y demás entradas canónicas.
- Las 25 entradas del JSON enviado por el usuario quedaron
  horneadas en el runtime de producción.
- Las cartas del mazo se normalizaron por `data-draft-index` únicamente, para que
  la geometría pertenezca al slot y no a la identidad de la carta.
- El editor DEV v8 usa una sola identidad `data-*` estable por elemento.
- Normal y `?dev` comparten el mismo `Universal Layout Runtime`; `?dev` solo agrega
  la capa de edición.
