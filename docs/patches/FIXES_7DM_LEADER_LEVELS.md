# HallValla v7DM - Leader Levels 1-9

Base correcta: v7DK guardian intro layered. La v7DL de IA queda descartada y no se usa como continuidad.

## Cambios principales

- Se agregó sistema de nivel de líder del 1 al 9.
- El nivel 1 conserva el balance anterior del líder.
- Cada nivel aumenta de forma gradual:
  - Vida máxima del líder.
  - Ataque base del líder.
  - Nivel de buff del líder.
- El jugador usa el nivel del líder guardado en el perfil local.
- Si el perfil viejo no tenía niveles de líder, se migra automáticamente.
- Al subir nivel de perfil, los líderes suben hasta un máximo de nivel 9.
- Los enemigos de aventura quedan por defecto en líder nivel 1, para no alterar la dificultad ni la IA.

## Escala de líder

| Nivel | HP | AT | Buff |
|---|---:|---:|---:|
| 1 | 20 | 2 | 1 |
| 2 | 22 | 2 | 1 |
| 3 | 24 | 3 | 1 |
| 4 | 26 | 3 | 2 |
| 5 | 28 | 4 | 2 |
| 6 | 30 | 4 | 2 |
| 7 | 32 | 5 | 3 |
| 8 | 34 | 5 | 3 |
| 9 | 36 | 6 | 4 |

## Buff por tipo

### Guerrero
- Buff 1: infantería pesada +2 VIDA / +2 GUARDIA.
- Buff 2: infantería pesada +3 VIDA / +3 GUARDIA.
- Buff 3: infantería pesada +4 VIDA / +4 GUARDIA.
- Buff 4: infantería pesada +5 VIDA / +5 GUARDIA.

### Arquero
- Buff 1: arqueras +1 AT / +3 DX / +1 AGI.
- Buff 2: arqueras +2 AT / +4 DX / +1 AGI.
- Buff 3: arqueras +2 AT / +5 DX / +2 AGI.
- Buff 4: arqueras +3 AT / +6 DX / +2 AGI.

### Hechicero
- Buff 1: magias -2 costo / +3 efecto.
- Buff 2: magias -2 costo / +4 efecto.
- Buff 3: magias -3 costo / +5 efecto.
- Buff 4: magias -3 costo / +6 efecto.

## Archivos modificados

- script.js

## Notas

No se cambió la IA, no se fijó mano inicial, no se aumentó su nivel ni se aumentó cuántas cartas juega por turno.
