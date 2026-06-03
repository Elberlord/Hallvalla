# v0.7AX - Unit Context Menu

## Cambios

- Al tocar una invocación/unidad en el campo ahora aparece un menú contextual con estética principal del juego.
- Opciones del menú:
  - `MOV`: prepara movimiento y marca casillas verdes.
  - `ATTK`: prepara ataque y marca objetivos rojos.
  - `DET`: abre el modal de detalles de la carta/unidad.
  - `EFFECT`: solo aparece si la unidad trae datos de efecto/trigger/activable.
- En unidades rivales se muestra solo `DET`.
- `MOV` y `ATTK` solo quedan disponibles durante `Action Phase` y si la unidad aún puede realizar esa acción.
- El menú usa un panel visual basado en assets del home para comenzar a unificar el arte principal de combate.

## Notas

- La lógica específica de resolución de `EFFECT` queda preparada para conectarse carta por carta cuando definamos sus triggers reales.
- Se separó la acción seleccionada (`mov` o `attk`) para evitar que un toque de movimiento dispare ataque por accidente, o viceversa.
