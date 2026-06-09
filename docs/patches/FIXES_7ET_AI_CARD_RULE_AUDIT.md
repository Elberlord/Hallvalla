# v7ET - Auditoría y reparación de IA: cartas y reglas

## Problema encontrado
La IA de aventura no lee el texto/ruling de las cartas de forma interpretativa. Solo ejecuta reglas programadas en `script.js`.

Antes de este parche la IA podía usar cartas de unidad, daño, buff, guardia, curación y slow, pero tenía huecos importantes:

- No jugaba Trampas Legendarias dirigidas (`trap: "legendary_mark"`).
- Sus ataques usaban una versión simplificada del combate.
- En ataques de IA podían saltarse contraataques, Atacar Primero, algunas trampas legendarias, modificadores de daño y bonos posteriores a daño/kill.
- Cuando la IA usaba buff/guardia/curación, no disparaba correctamente trampas del jugador que cancelan ayudas.
- Algunas habilidades pasivas de héroes no estaban conectadas del todo al motor.

## Cambios aplicados

### Mano de IA
La IA ahora evalúa y puede jugar:

- Unidades.
- Hechizos de daño.
- Buffs de ataque.
- Guardia/escudos.
- Curación.
- Trampas de slow.
- Trampas Legendarias dirigidas.

### Trampas Legendarias
La IA ahora puede colocar Trampas Legendarias sobre unidades del jugador usando criterios tácticos:

- Prioriza objetivos especiales, legendarios, semidioses o amenazas con alto ataque/movimiento/rango.
- Respeta restricciones de cada trampa, por ejemplo:
  - `La Cama del Traidor` no marca unidades que ya actuaron.
  - `Banquete de Ceniza` solo marca unidades con vida completa.
  - `Corte de Sombras` solo marca unidades heridas.
- No duplica una misma trampa activa del mismo dueño.

### Combate de IA
Los ataques de la IA ahora pasan por una resolución equivalente a la del jugador:

- Trampas pre-ataque como `La Corona Falsa`.
- Modificadores de combate.
- Atacar Primero de semidioses con lanza.
- Repetición de Arjuna.
- Ignorar Guardia de la Asesina del desierto.
- Sangrado de la Asesina del desierto.
- Trampas de daño como `Corte de Sombras`.
- Exilio del Nombre Verdadero después de matar.
- Contraataques de lanzas y Musashi.
- Bonos después de daño/muerte como Ragnar, Beowulf, Lü Bu, Boudica y Alejandro.

### Movimiento de IA
El movimiento de IA ahora dispara:

- Trampas de movimiento legendarias.
- Emboscada de Hannibal / Trampa de Cannas.

### Buff, guardia y curación de IA
Ahora respetan trampas del jugador que cancelan ayuda:

- `Juramento de Sangre Roto`.
- `Sello de los Reyes Caídos`.

### Habilidades conectadas/reforzadas
Se conectaron o reforzaron estas reglas:

- Juana de Arco reduce 1 daño una vez por turno.
- Si el aliado protegido por Juana queda en 1 vida, gana +1 Guardia.
- Leónidas da +1 Guardia en formación con unidades básicas adyacentes.
- Leónidas sobrevive una vez por duelo con 1 Vida al recibir daño fatal.
- Nasu no Yoichi conserva el castigo de Guardia si acierta desde rango largo.

## Nota importante
Algunas habilidades con decisiones complejas de movimiento extra, como segundos ataques/movimientos especiales muy específicos, pueden necesitar una segunda pasada de IA táctica más avanzada si se quiere que juegue perfecto como una persona. Este parche corrige los huecos más graves: que cartas en mano quedaran muertas y que el combate de IA no respetara reglas centrales.
