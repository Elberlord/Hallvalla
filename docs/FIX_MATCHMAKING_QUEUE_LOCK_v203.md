# HallValla v203 - Matchmaking queue lock

- Se elimina por completo la auto-reclamación del dueño sobre su propia entrada de /matchmaking/random.
- El fallback cierra temporalmente la entrada de cola antes de preparar rival automático.
- Si un humano ya ganó la carrera, el fallback se cancela.
- Si el fallback falla y la sala continúa libre, la entrada se vuelve a publicar automáticamente.
- Se mantiene el rival automático oculto para el jugador.
- profilePromoInput deja de ser type=password para evitar el warning del navegador; el contenido sigue visualmente enmascarado con -webkit-text-security.
