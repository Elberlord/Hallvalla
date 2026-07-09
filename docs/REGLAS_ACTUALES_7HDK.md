# Reglas actuales de HallValla · 7HDK

Documento generado desde el código actual del juego.

## Recurso: Honor / Mana

- El recurso interno se llama `honor`, pero visualmente puede mostrarse como Honor o Mana.
- Si el líder del dueño es `mage`, el recurso se muestra como Mana.
- Los demás líderes usan Honor.
- Tope global actual: `10`.
- El recurso máximo no puede superar 10.
- Al iniciar turno, el recurso máximo sube según la regla de turno y se recarga al máximo permitido.
- Si ya está en 10/10, no aumenta más.
- Las partidas viejas con valores mayores se recortan visual y lógicamente a 10.

## Mazo y copias

Reglas detectadas:
```txt
basicMaxCopies:3,nonBasicMaxCopies:1,deckSize:30
```

Resumen:
- Mazo estándar: 30 cartas.
- Cartas básicas: hasta 3 copias.
- Cartas no básicas: hasta 1 copia.
- La mano inicial se roba desde el mazo generado.
- El mazo inicial usa plantillas básicas y puede recibir cartas especiales según aventura/recompensas.

## Turnos y fases

- Draw Phase: roba cartas y recarga Honor/Mana.
- Main Phase: permite jugar cartas de la mano.
- Action Phase: las unidades en campo pueden moverse, defender, atacar o usar efectos manuales.
- Last Phase: permite jugar cartas restantes si todavía hay jugables.
- End Phase: cierre de turno y paso al rival.
- En aventura, la IA toma el turno de J2.

## Tablero

- Cada unidad ocupa una casilla.
- Movimiento y rango usan distancia de cuadrícula.
- La unidad recién invocada queda lista para acciones al pasar a Action Phase.
- El lugar del tablero donde aparece AT cambia según turno:
  - Turno del dueño de la unidad: muestra AT.
  - Turno rival/IA: muestra GD.
- DET conserva información completa de la unidad.

## Combate

- Ataques normales primero interactúan con Guardia.
- Vida solo baja después de agotar Guardia, salvo efectos marcados como daño directo o ignorar Guardia.
- Ataques mágicos/daño directo pueden ignorar Guardia si la carta o habilidad lo indica.
- PREC/EVA usa Destreza + Agilidad y se gasta durante ataques.
- Si el atacante acierta, gasta solo lo necesario.
- Si falla, gasta la reserva disponible del intento.
- Si el defensor evade y le queda evasión: splash de Esquiva.
- Si el defensor evita el golpe pero queda sin evasión: splash de Guardia/Bloqueo.
- Si el ataque conecta contra Guardia: splash de Guardia.
- Si el ataque atraviesa Guardia y causa HP: daño a Vida.

## Guardia

- `guard` representa Guardia almacenada/base actual.
- `tempGuardBuff` representa Guardia temporal.
- Shield Wall y efectos de defensa temporal usan Guardia temporal.
- El daño consume en orden:
  1. Guardia temporal.
  2. Guardia base almacenada.
  3. Vida, solo si corresponde.
- Si una unidad pierde Vida por ataque normal, la Guardia almacenada queda en 0.
- Auras de Guardia cuentan para el cálculo, pero no se escriben como Guardia permanente.

## Armas y ventaja táctica

Clases de arma detectadas en cartas:
No se detectaron clases por regex.

Rueda actual documentada en código y parches vigentes:
- Espada > Lanza.
- Lanza > Caballería.
- Caballería > Arco.
- Arco > Hacha.
- Hacha > Espada.
- Arco > Bestia.
- Bestia > Caballería.
- Magia/Arcano y Neutral no tienen ventaja base directa.

La ventaja táctica da +5 DX temporal durante ese combate.

## Lanzas

- Las unidades de lanza tienen Atacar Primero cuando son atacadas dentro de alcance de reacción.
- Si la lanza derrota al atacante, el ataque original se cancela.
- Atacar Primero se usa una vez por turno.
- Ataque en Picada del Halcón ignora Atacar Primero.
- Lanza contra Caballería en cuerpo a cuerpo aplica anticaballería:
  - Caballería queda con AGI 0 y Guardia 0 durante ese combate.

## Estados alterados

Estados principales:
- Sangrado.
- Veneno.
- Quemadura.
- Miedo.
- Aturdido.
- Reducción de MOV.
- Reducción de AGI.
- Reducción de AT.
- Reducción de DX.
- Buffs temporales de AT/GD/MOV/DX/AGI.
- Sigilo.
- Aéreo.
- Guardia defensiva.
- Evasión gastada.

Splashes centrales actuales:
- Esquiva.
- Guardia.
- Sangrado.
- Quemadura.
- Veneno.
- Miedo.
- Aturdido.
- Debilitado.
- Emboscada/Sigilo.

## Audio

Controles actuales:
- Audio general ON/OFF.
- Música ON/OFF.
- Volumen música.
- Efectos ON/OFF.
- Volumen efectos.
- Modal de control de sonido compactado para PC y móvil.

## IA / Aventura

- J2 puede ser jugador online o IA de aventura.
- La IA usa su estado de aventura dentro de `public.adventureAiState`.
- La IA roba, gana recurso, juega cartas, invoca, ataca, usa trampas y resuelve final de turno.
- El modo aventura tiene mapas, recompensas, progreso, packs y desbloqueos.

## Desempate por agotamiento

- Si ambos jugadores quedan sin unidades no-líder en el tablero y ninguno tiene cartas jugables, la partida termina por agotamiento.
- Gana el jugador cuyo líder tenga más Vida actual.
- Si ambos líderes tienen la misma Vida, la partida termina en empate.
- El sistema marca a cada jugador como agotado al inicio de su turno, después de robar/recargar y resolver estados, si sigue sin unidades ni cartas jugables.
- En PVP, esto evita que una partida quede en ciclo infinito aunque una mano tenga cartas que no puedan jugarse.
