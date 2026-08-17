HallValla v8 Modular · Build actual
===================================

Estado del paquete: E42 · ARTE MONTADO DEL EXPLORADOR MONGOL + AJUSTE DE MINIATURAS DEL MAZO (2026-08-17)

Base funcional preservada
-------------------------
- Conserva la Etapa 4 completa (4A + 4B) de E41.
- Conserva íntegramente la Etapa 5 (hooks de Dragón/Contratos) de E40.
- No se alteró la lógica de combate, PvP/Firebase ni la Forja más allá del encuadre visual de las miniaturas.

Ajustes incluidos en E42
------------------------
1. Explorador mongol
- Se reemplazó el arte del archivo assets/cards/basic/units/mongol_explorer.webp por una nueva versión en formato WEBP donde la unidad aparece montada a caballo, coherente con su rol de caballería arquera/exploradora.

2. Miniaturas de Colección / Mazo
- Se ajustó el encuadre de las miniaturas horizontales del constructor de mazos.
- Las cartas de tipo Unidad anclan ahora el retrato más arriba (object-position vertical superior) y sin el sobre-zoom anterior, para evitar que la cabeza salga cortada en la galería y en el mazo actual.
- Los demás tipos de carta conservan el encuadre centrado.

Cache-bust / recarga
--------------------
- Se actualizó el build string global a E42MONGOLMINI1 en index.html, styles.css y bootstrap-loader.js para forzar la recarga del CSS/JS del build nuevo.

Archivos modificados respecto de E41
------------------------------------
- assets/cards/basic/units/mongol_explorer.webp
- styles.css
- index.html
- js/bootstrap-loader.js
- docs/README_CURRENT_BUILD.txt
