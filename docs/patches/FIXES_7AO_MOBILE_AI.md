# v0.7AO - Corrección móvil + IA aventura

Cambios aplicados:

- La mano en móvil ahora usa todo el ancho disponible y deja ver las cartas iniciales sin quedar cortada por el ancho de escritorio.
- Los iconos/personajes del tablero en móvil son más grandes y legibles.
- En modo aventura ya no se muestra el código de partida; solo se muestra que es aventura contra IA y la batalla activa.
- La IA de aventura guarda su estado también en `public.adventureAiState`, así no depende de escribir siempre en `private/player2`. Esto evita errores de permisos o sincronización que congelaban el turno.
- Si la IA tropieza, el sistema intenta recuperar el turno automáticamente para J1 y ya no le pide al jugador presionar de nuevo el botón de finalizar turno.

Validaciones sugeridas en navegador:

1. Iniciar Hechicero guardián desde aventura.
2. Terminar turno sin invocar y confirmar que la IA actúa o devuelve turno sin mensaje de error.
3. Confirmar en móvil 100% que se ven 4 cartas iniciales de la mano.
4. Confirmar que al seleccionar una unidad/carta los detalles siguen apareciendo.
