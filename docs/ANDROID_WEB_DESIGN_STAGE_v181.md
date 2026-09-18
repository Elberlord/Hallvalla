# HallValla v181 — Design Stage único

- `web/index.html`: shell físico. Nunca contiene la UI del juego.
- `web/hallvalla-stage.html`: HallValla completo dentro de un viewport real 1920×1080.
- El shell escala el iframe uniformemente con `contain` y centra las bandas sobrantes.
- Dentro del stage, `window.innerWidth`, `window.innerHeight`, `vw`, `vh`, media queries y `position:fixed` ven siempre 1920×1080.
- La web y Android deben usar el mismo `index.html`; Android no debe volver a recalcular layouts por tamaño de teléfono.
- Para diagnosticar en navegador: `?hvstageDebug=1`.
- Los 681 assets son los mismos de v180; no se duplicaron ni cambiaron.

Flujo de trabajo: primero se acomoda cada escena mirando la web dentro del Design Stage. Después la APK solo empaqueta y escala exactamente esa misma geometría.
