# HallValla

HallValla es un juego de cartas táctico con tablero, líderes, unidades, magias, trampas, aventura, colección, construcción de mazos y duelos contra IA.

> Build interno detectado en el código: `v7HW_beastmaster_event_ai_max_allfix_2026_06_14`.

## Estado actual

Esta versión ya no corresponde a una base simple ni a ROK Lite. El proyecto activo se llama **HallValla**.

El juego incluye:

- Home visual por capas.
- Lobby local/online con Firebase.
- Modo aventura contra IA.
- Sistema de líderes.
- Sistema de colección y deckbuilder.
- Apertura de paquetes.
- Mapa de historia 1.1.
- Capítulos posteriores configurados.
- Evento especial Beastmaster.
- Sistema de fases por turno.
- Sistema de Honor/Maná recargable.
- Combate táctico con movimiento, rango, Guardia, Destreza, Agilidad, precisión/evasión, contraataques y efectos especiales.
- Magias, trampas, unidades básicas, cartas legendarias y cartas de evento.

## Estructura del proyecto

Archivos principales:

- `index.html`: estructura principal de la página.
- `styles.css`: estilos visuales, HUD, tablero, modales, home y efectos.
- `script.js`: lógica del juego, Firebase, aventura, IA, cartas, combate, colección, deckbuilder y UI.
- `firebase-config.js`: configuración de Firebase.
- `assets/`: imágenes, cartas, tablero, home, sonidos y recursos visuales.
- `docs/`: notas internas de parches y revisiones.

Para GitHub Pages o un repo estático, el archivo `index.html` debe quedar en la raíz junto con `script.js`, `styles.css`, `firebase-config.js` y la carpeta `assets/`.

## Flujo de turno

El duelo usa fases:

1. **Draw Phase**
   - Se recarga el recurso del jugador activo.
   - Se roban cartas según la regla activa del turno.
   - En el primer turno/inicio configurado puede mantenerse la mano inicial sin robo adicional.

2. **Main Phase**
   - El jugador puede jugar cartas desde la mano si tiene recurso suficiente y cumple las condiciones.
   - Si no hay cartas jugables, el sistema puede avanzar el flujo.

3. **Action Phase**
   - Las unidades del campo pueden moverse, atacar o usar acciones disponibles.
   - El combate considera movimiento, rango, Guardia, Destreza, Agilidad y efectos activos.

4. **Last Phase**
   - Ventana final para jugar cartas posibles desde la mano.
   - Si no hay cartas jugables, el turno puede avanzar.

5. **End Phase**
   - Cierra el turno del jugador activo.
   - Se pasa el turno al rival.

## Recurso: Honor / Maná

El recurso es recargable, no una bolsa acumulativa infinita.

Regla general visible en el motor:

- El recurso máximo aumenta al inicio del turno.
- El recurso disponible se recarga hasta el máximo.
- Los líderes tipo mago/hechicero usan **Maná** en lugar de **Honor**.
- El HUD muestra el recurso como `disponible/máximo`.

Regla base detectada:

- En turnos tempranos, el crecimiento normal es menor.
- A partir de turnos avanzados, la recarga base aumenta.
- Algunas batallas de aventura tienen modificadores de IA configurados, como `aiDrawBonus` y `aiHonorBonus`, para ajustar dificultad.

## Mazo y colección

Reglas actuales de deckbuilder:

- Tamaño válido de mazo: **25 cartas**.
- Cartas básicas: máximo **3 copias**.
- Cartas no básicas: máximo **1 copia**.
- La colección/mazos se desbloquea al completar la batalla final del mapa 1.1.
- Los paquetes ganados se guardan y pueden abrirse desde notificaciones.

## Combate táctico

El combate usa estadísticas de unidad/líder:

- **HP / Vida**: si llega a 0, la unidad sale de la arena.
- **ATK / Ataque**: daño ofensivo base.
- **Guardia**: defensa que reduce o absorbe daño según el caso.
- **Destreza**: precisión ofensiva.
- **Agilidad**: evasión defensiva.
- **Movimiento**: casillas que puede avanzar.
- **Rango**: distancia de ataque.

El sistema también contempla:

- Ataques cuerpo a cuerpo y a distancia.
- Contraataques cuando corresponda.
- Bonos o penalizadores por habilidades.
- Sangrado, veneno, trampas y efectos persistentes.
- Reglas especiales de líderes y cartas legendarias.

## Precisión y evasión

La precisión/evasión se maneja como una mecánica táctica conectada a Destreza y Agilidad.

El juego muestra información de acierto y gasto de estadísticas durante el turno. La explicación visible de la mecánica debe mantenerse sincronizada con el modal de **Prec/Eva** dentro de detalles.

Resumen conceptual:

- La Destreza ayuda a conectar ataques.
- La Agilidad ayuda a evitar ataques.
- Durante el turno pueden gastarse estadísticas asociadas al esfuerzo ofensivo o defensivo.
- Esas estadísticas se restauran al inicio del próximo turno correspondiente.

## Modo aventura

HallValla incluye una aventura contra IA con batallas progresivas.

### Prueba previa

Antes del mapa 1.1 existe una prueba de guardián:

- **El guardián hechicero**
- Sirve como combate de entrada antes de iniciar el mapa 1.1.

### Mapa 1.1: El inicio de la travesía

El mapa 1.1 contiene 5 batallas:

1. **La flecha en la frontera**
   - Rival: Arquero rebelde.
   - Recompensa: EXP, oro y paquete básico.

2. **El guerrero del puente**
   - Rival: Guerrero rebelde.
   - Recompensa: EXP, oro y paquete básico.

3. **El hechicero del estandarte**
   - Rival: Hechicero conspirador.
   - Recompensa: EXP, oro y paquete básico.

4. **El guerrero que no cayó**
   - Rival: Guerrero rebelde vengativo.
   - Recompensa: EXP, oro y paquete básico.

5. **La prueba de Richard**
   - Rival: Richard Corazón de León.
   - Recompensa final: carta **Richard Corazón de León**.

Al completar la batalla 1.1.5, el jugador desbloquea colección/mazos.

## Capítulos posteriores

El código contiene capítulos posteriores configurados, incluyendo enfrentamientos con cartas legendarias y recompensas especiales.

Entre las recompensas detectadas están cartas como:

- Richard Corazón de León.
- Simo Häyhä.
- Sun Tzu.
- Ulises.
- Aquiles.

Estas batallas forman parte del avance de aventura y deben revisarse junto con sus efectos especiales para asegurar que texto y código estén sincronizados.

## Evento Beastmaster

El proyecto incluye evento **Beastmaster / Señor de las Bestias**.

Incluye cartas de bestias, assets y reglas especiales vinculadas a sigilo, trampas, revelación, embestidas, efectos de ataque y habilidades de evento.

Este evento está integrado como contenido especial del juego, pero sus reglas concretas deben mantenerse revisadas carta por carta para asegurar que cada texto coincida con su implementación real.

## IA

La IA de aventura:

- Juega desde el primer duelo.
- Usa cartas desde la mano cuando puede.
- Mueve unidades.
- Ataca objetivos.
- Evalúa acciones ofensivas.
- Usa trampas/magias según su estado y disponibilidad.
- Tiene dificultad configurada por batalla mediante nivel, estilo y bonus de aventura.

Los campos de dificultad de batalla incluyen:

- `aiLevel`
- `aiDrawBonus`
- `aiHonorBonus`
- `aiStyle`

Estos campos deben permanecer sincronizados con la lógica real de IA en `script.js`.

## Home, HUD y notificaciones

El home refleja:

- Perfil.
- Nivel y EXP.
- Oro.
- Progreso de aventura.
- Estado de colección/mazos.
- Notificaciones.
- Recompensas y paquetes pendientes.

El HUD de duelo muestra:

- Vida de líderes.
- Honor/Maná disponible y máximo.
- Cartas en deck.
- Cartas en mano.
- Fase actual.
- Estado de turno.

## Audio

El duelo usa efectos de sonido cortos desde `assets/sfx/*.ogg`.

La música/fondos largos pueden estar desactivados según build.

## Notas de mantenimiento

Este README describe el estado actual general de HallValla. Si se cambia una regla en `script.js`, debe actualizarse este archivo para evitar contradicciones entre documentación y juego.

Pendientes recomendados para revisión futura:

- Sincronizar textos de cartas legendarias con implementación real.
- Revisar efectos Beastmaster carta por carta.
- Separar `script.js` por módulos cuando el sistema esté más estable.
- Mantener una “ruling bible” oficial dentro de `docs/` cuando las reglas finales estén cerradas.
