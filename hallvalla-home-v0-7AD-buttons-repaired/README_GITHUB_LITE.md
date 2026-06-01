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


## Recompensas de aventura 1.1
Cada batalla del mapa 1.1 entrega poca EXP, un pequeño monto de oro y un paquete básico de 5 cartas de magia/trampa. Las recompensas se marcan como reclamadas en localStorage para evitar duplicados.
- 1.1.1: 5 EXP + 10 Oro + paquete básico
- 1.1.2: 8 EXP + 12 Oro + paquete básico
- 1.1.3: 12 EXP + 15 Oro + paquete básico
- 1.1.4: 16 EXP + 18 Oro + paquete básico
- 1.1.5: 20 EXP + 25 Oro + paquete básico


## Mapa 1.1 actualizado: combatientes, IA y recompensas
El mapa 1.1 tiene 5 batallas:
1. La flecha en la frontera: rival Arquero rebelde, mazo básico, IA nivel 1, recompensa paquete básico.
2. El guerrero del puente: rival Guerrero rebelde, mazo básico, IA nivel 2, recompensa paquete básico.
3. El hechicero del estandarte: rival Hechicero conspirador, mazo básico, IA nivel 3, recompensa paquete básico.
4. El guerrero que no cayó: vuelve el Guerrero rebelde, mazo básico, IA nivel 4, recompensa paquete básico.
5. La prueba de Richard: Richard Corazón de León pone a prueba al jugador, usa mazo con Richard, IA nivel 5, recompensa la carta Richard Corazón de León en lugar del paquete.

La colección/mazos permanece bloqueada hasta completar la batalla 1.1.5. Los paquetes ganados se guardan, pero no se pueden usar para editar mazos hasta terminar el mapa.



# Historia integrada del mapa 1.1

## 1.1 El inicio de la travesía

El reino de HallValla apenas comienza a respirar después de años de disputas internas. El trono sigue en pie, pero su autoridad ya no pesa igual en las tierras lejanas.

En la frontera, los rumores llegan antes que los mensajeros: aldeas cerradas, caminos bloqueados, estandartes quemados y soldados que ya no responden al llamado real. Lo que al principio parece una revuelta menor pronto revela una amenaza mayor.

Un grupo de rebeldes intenta usurpar el trono y provocar un golpe de estado. No buscan solamente conquistar fortalezas: quieren quebrar la confianza del pueblo, aislar al reino y entrar al salón del trono antes de que las fuerzas leales puedan reunirse.

## Batallas

1. **La flecha en la frontera / Rumores en la frontera**  
   Rival: Arquero rebelde. Recompensa: EXP, oro y paquete básico.

2. **El guerrero del puente / El puente tomado**  
   Rival: Guerrero rebelde. Recompensa: EXP, oro y paquete básico.

3. **El hechicero del estandarte / La noche del estandarte**  
   Rival: Hechicero conspirador. Recompensa: EXP, oro y paquete básico.

4. **El guerrero que no cayó / Asedio al salón del trono**  
   Rival: Guerrero rebelde vengativo. Recompensa: EXP, oro y paquete básico.

5. **La prueba de Richard / El usurpador**  
   Rival: Richard Corazón de León. Recompensa final: carta Richard Corazón de León.

Al completar la batalla 1.1.5, el jugador desbloquea el acceso a mazos/colección.



## Flujo de victoria/derrota del mapa 1.1
- Al ganar una batalla: se entregan recompensas una sola vez, se marca como completada y se desbloquea la siguiente pelea.
- Al perder una batalla: no se entregan recompensas. El jugador puede reintentar o volver al mapa.
- Cada pelea debe ganarse para desbloquear la siguiente.
- Las recompensas de paquetes se guardan, pero los mazos/colección siguen bloqueados hasta completar 1.1.5.



## Home, notificaciones y reglas de mazo
- El home refleja nivel, EXP, oro, progreso del mapa 1.1 y estado de mazos.
- El botón de notificaciones avisa cuando hay cartas/paquetes nuevos y cuando los mazos quedan desbloqueados.
- La colección/mazos se desbloquea al completar la batalla 1.1.5.
- Regla de mazo: cartas básicas hasta 10 copias; todas las demás rarezas solo 1 copia por mazo.



## Pack opening y deckbuilder de prueba
- Las batallas 1.1.1 a 1.1.4 entregan paquetes pendientes, no cartas directas.
- Los paquetes se abren desde notificaciones con una escena visual usando el arte del home.
- Al confirmar apertura, las 5 cartas pasan a colección.
- La batalla 1.1.5 entrega directamente la carta Richard Corazón de León.
- El deckbuilder se abre desde Colección solo si el mapa 1.1 fue completado.
- Reglas de mazo: 60 cartas, básicas máximo 10 copias, demás rarezas máximo 1 copia.
