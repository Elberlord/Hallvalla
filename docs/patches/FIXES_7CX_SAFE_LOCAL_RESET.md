# FIXES 7CX - Reinicio seguro de partida local y duelo actual Firebase

Cambios:
- Se agregó botón en Configuración: `Nueva partida local segura`.
- Este botón borra progreso local de prueba: colección, mazo guardado, paquetes pendientes, progreso de aventura y recompensas reclamadas.
- No borra Firebase.
- Conserva el líder elegido y el nombre del jugador.
- Reinicia oro, gemas, fragmentos, EXP y nivel al estado inicial de prueba.
- Se agregó botón dentro del menú de duelo: `Borrar solo este duelo en Firebase`.
- Ese botón borra únicamente `games/{codigo}` del duelo activo.
- No toca `users/{uid}` ni `users/{uid}/profile`.
- Se actualizó la importación de Firebase Realtime Database para usar `remove`.

Uso recomendado:
- Si una actualización no aparece por estar usando datos viejos, usar `Nueva partida local segura`.
- Si una batalla vieja quedó creada en la nube, entrar a esa batalla y usar `Borrar solo este duelo en Firebase`.

Seguridad:
- No hay botón que borre todo Firebase.
- No hay botón que borre todos los usuarios.
- No se elimina `users/{uid}`.
