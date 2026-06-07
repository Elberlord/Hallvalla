# HallValla v7DA — Limpieza y pulido general

## Cambios aplicados
- Caballería ligera ahora usa retrato propio: `assets/cards/basic/cavalry_light.webp`.
- Berserker del norte ahora usa retrato propio: `assets/cards/basic/berserker_north.webp`.
- Lancero solar mantiene el retrato rojo de infantería pesada: `assets/cards/basic/heavy_infantry_paladin.webp`.
- Se eliminaron imágenes duplicadas exactas y exports sueltos no usados (`asset_*.png`, líderes PNG sobrantes, campos no referenciados).
- Los documentos de parches fueron movidos a `docs/patches/`.
- Se reemplazaron `alert()` y `confirm()` nativos por modales internos con estilo HallValla.
- Se verificó que no quedan referencias rotas a assets.
- Se verificó que no quedan retratos compartidos entre las cartas principales analizadas.
- Se verificó que no quedan duplicados exactos por hash dentro del paquete.

## Seguridad
- No se tocó la estructura de Firebase.
- No se borró `users/{uid}` ni perfiles.
- El botón seguro de Firebase sigue limitado al duelo activo en `games/{code}`.
