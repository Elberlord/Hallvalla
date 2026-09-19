# HallValla v211 - Smoke test de auditoria

## Validacion automatica

| Prueba | Estado |
|---|---|
| Sintaxis de todos los `.js` | PASS - 39 archivos verificados con `node --check` |
| `RESOURCE_HASHES` coincide con bytes reales | PASS - 36/36 |
| `ASSET_HASHES` del Service Worker coincide | PASS - 710/710 |
| Nuevo submodulo se carga antes de `pve/index.js` | PASS estructural |
| Sin referencias runtime a los globals expertos antiguos fuera del submodulo | PASS estructural |
| `ui-canonical.js` sin cambios respecto a v210 | PASS |
| `universal-runtime.js` sin cambios respecto a v210 | PASS |
| `styles.css` sin cambios respecto a v210 | PASS |
| Reglas Firebase sin cambios respecto a v210 | PASS |

## Smoke manual requerido

| Area | Comprobar | Estado inicial |
|---|---|---|
| Aventura/PvE | abrir mapa, iniciar y terminar una batalla | PENDIENTE USUARIO |
| Aprendizaje IA | al terminar, no hay error al registrar el diario | PENDIENTE USUARIO |
| Configuracion | muestra numero/fecha del diario | PENDIENTE USUARIO |
| Exportacion | boton exporta `.txt` correctamente | PENDIENTE USUARIO |
| Consola | sin `ReferenceError` al cargar PvE | PENDIENTE USUARIO |

El resto del juego no fue tocado funcionalmente en este lote. Si falla cualquiera de estas pruebas, v210 sigue siendo la base operativa y v211 no se usa para el siguiente refactor.

## Alcance estatico del nuevo submodulo

Todas las funciones/constantes declaradas en `adaptive-expert-log.js` tienen al menos una referencia adicional a su declaracion. No quedaron declaraciones de una sola ocurrencia dentro del lote extraido.
