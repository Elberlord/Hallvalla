# v7EQ - Archer Range +1

## Cambio
Se añadió una regla global para unidades que usan arco:

- Todas las arqueras/arqueros reciben +1 Rango base.
- El cambio se aplica como regla global para cartas actuales y futuras detectadas como arqueras.
- No se modificaron estadísticas de daño, vida, guardia, destreza ni agilidad.

## Cartas cubiertas inicialmente

- Arquera del desierto
- Simo Häyhä
- Nasu no Yoichi
- Arjuna
- Caballería Arquera de Saladino
- Atila el Huno

## Detección automática
También se detectan futuras cartas de unidad cuyo nombre o texto incluya:

- arquera
- arquero
- archer
- arco
- flecha

## Notas técnicas

Se agregaron helpers:

- `isArcherWeaponUnitCardLike(card)`
- `applyArcherRangeRule(card)`
- `getArcherRangeBonus(card)`
- `getCardDisplayRange(card)`

La lógica de invocación usa el rango ajustado, incluyendo cartas antiguas guardadas en mazos anteriores.
