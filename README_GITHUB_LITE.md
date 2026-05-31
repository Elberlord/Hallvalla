# HallValla Home 0.6 Lite - GitHub

Versión ligera optimizada para subir a GitHub Pages.

Cambios:
- Imágenes convertidas a WebP.
- Assets grandes reducidos de tamaño.
- Mantiene el mismo arte visual.
- Conserva Home + Board oscuro 11x6.

Cómo subir:
1. Descomprime este ZIP.
2. Sube el contenido descomprimido a GitHub, no el ZIP.
3. Debe quedar index.html en la raíz del repositorio.
4. La carpeta assets debe quedar junto al index.html.


0.6B:
- La mano inicia abierta por defecto.
- El botón del libro ahora dice MANO.
- La mano tiene más contraste para no perderse visualmente.


HallValla Home 0.7:
- Nuevo modal visual para Competir en línea.
- Modal base como imagen WebP.
- Botones Crear partida, Unirse y Volver al inicio como imágenes separadas WebP.
- Input real HTML sobre el espacio visual del código.
- Mantiene versión ligera para GitHub.


0.7B:
- Corregido el input del código de partida para que no se vea doble el texto.

## Estructura separada

Esta versión separa el código en:

- `index.html`: estructura de la página.
- `styles.css`: estilos visuales.
- `script.js`: lógica, Firebase y comportamiento del juego/home.
- `assets/`: imágenes y recursos.

Para GitHub Pages o un repo estático, sube todos estos archivos manteniendo la misma estructura. No cambia la URL principal: sigue abriendo `index.html`.
