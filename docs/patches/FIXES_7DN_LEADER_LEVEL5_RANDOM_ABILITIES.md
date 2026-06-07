# HallValla v7DN - Habilidades aleatorias de líder nivel 5

Base usada: v7DM_leader_levels.

## Objetivo
Agregar una habilidad pasiva aleatoria para cada líder cuando alcanza nivel 5.

## Reglas aplicadas
- La habilidad se asigna automáticamente al alcanzar nivel 5.
- La habilidad queda guardada en el perfil local del jugador.
- No se elige manualmente.
- Todas las habilidades son positivas, pero favorecen tácticas distintas.
- No se modificó la IA, la mano inicial ni la cantidad de cartas que juega el rival.

## Habilidades posibles
- Vitalidad heroica: +2 HP al líder.
- Filo de mando: +1 AT al líder.
- Orden defensiva: invocaciones aliadas +1 GUARDIA.
- Marcha táctica: invocaciones aliadas +1 MOV.
- Foco arcano: hechizos numéricos +1 efecto.
- Entrenamiento de campo: invocaciones aliadas +1 DESTREZA.

## Archivos modificados
- script.js

## Notas
La habilidad aparece en el texto del líder y viaja dentro de la unidad líder al iniciar combate.
