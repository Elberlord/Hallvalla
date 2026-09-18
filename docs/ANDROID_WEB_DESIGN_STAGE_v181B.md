# HallValla v181B — Design Stage de referencia

Resolución lógica canónica de prueba: **1366 × 636**.

Se eligió porque la captura web de referencia donde Construcción de mazo está correctamente acomodada tiene un viewport de contenido de 1366 × 636. El intento 1920 × 1080 cambió media queries, `vw/vh` y cálculos de JS, produciendo una composición distinta.

La meta es congelar exactamente la geometría web buena y escalarla uniformemente en Android con `contain`, dejando bandas mínimas cuando la relación de aspecto del dispositivo sea diferente.
