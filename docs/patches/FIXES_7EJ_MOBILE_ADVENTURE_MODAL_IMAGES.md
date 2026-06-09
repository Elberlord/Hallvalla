# FIXES 7EJ - Mobile Adventure Modal Images

Cambio aplicado:
- Se corrigió el recorte de imágenes de aventura en móvil.
- PC queda intacto.
- En móvil, los fondos de escenas de aventura usan `contain` en vez de `cover`.
- Se quitó el `max-height:62svh` que forzaba el recorte del modal del guardián.
- Las imágenes de selección de aventura usan `object-fit:contain` en móvil.
- Los fondos de resultado/victoria de aventura también dejan de cortarse en móvil.

Motivo:
- Los assets estaban completos.
- El recorte venía del CSS responsive móvil, no de las imágenes.
