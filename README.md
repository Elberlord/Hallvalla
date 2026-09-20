# HallValla v241 — Cierre: código muerto y assets huérfanos

Build: `20260920.241`

Base: v240.

## Auditoría v241
- Eliminación conservadora de código sin consumidores reales.
- 29 funciones top-level muertas eliminadas tras análisis iterativo de referencias.
- 8 declaraciones/variables sin lectura eliminadas.
- Eliminados assets huérfanos confirmados y duplicados exactos de la Mina.
- Saneado el checker Android histórico v180: ahora valida las rutas, viewport, gamepad, build y manifiesto vigentes.
- El manifiesto Android pasa a `hallvalla_assets_current.json`.
- No se eliminaron recursos detectados únicamente como candidatos cuando podían cargarse mediante rutas dinámicas (audio, secuencias FX, badges, branding).

## Firebase
Las reglas de Firebase permanecen iguales a v240.

## Próximo bloque
Prueba funcional completa de Aventura.
