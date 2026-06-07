# HallValla v7DB — Home buttons / selección de líder

## Problema
En algunos casos el juego abría automáticamente la pantalla de selección de líder al cargar el Home. Esa pantalla queda por encima del menú principal y puede hacer que parezca que ningún botón del Home funciona.

## Cambio
- La selección de líder ya no se fuerza automáticamente al abrir el Home.
- El Home queda clickeable desde el inicio: Configuración, Perfil, Pase, Tienda, Colección, etc.
- Si el jugador entra a Aventura sin líder, entonces sí se abre la selección de líder.
- Si el jugador crea o se une a una partida online sin líder, entonces también se solicita el líder.
- El líder guardado local/Firebase sigue cargándose igual cuando existe.

## Archivos modificados
- `script.js`
