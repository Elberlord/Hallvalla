# HallValla Prototype

Prototipo web de HallValla / TCG táctico por turnos.

## Cómo usarlo en GitHub Pages

1. Sube estos archivos al repositorio.
2. Ve a **Settings > Pages**.
3. En **Build and deployment**, selecciona:
   - Source: `Deploy from a branch`
   - Branch: `main`
   - Folder: `/root`
4. Guarda.
5. GitHub Pages generará una URL pública.

## Archivos

- `index.html`: prototipo actual jugable offline.
- `firebase-config.js`: archivo preparado para pegar la configuración de Firebase después.
- `online-setup-notes.txt`: notas del siguiente paso para modo online.

## Estado actual

Esta versión incluye:

- Tablero 14x6.
- Faraón J1 vs Hechicero J2.
- Mano flotante.
- Drag manual con carta fantasma.
- Visor grande de cartas/unidades.
- Fase de casteo / fase de batalla / fin de turno.
- Convocación con display.
- Ataque y pantalla de combate.
- Cambio de turno local.

## Próximo paso

Conectar Firebase para:

- Crear partida.
- Unirse a partida.
- Sincronizar tablero.
- Mantener manos privadas por jugador.
