# v7EP - Regla de contraataque: ignora Guardia y defensa restante

## Cambio

Se agrega una regla global para los contraataques:

- El contraataque ignora la Guardia del atacante original.
- Para defenderse del contraataque, el atacante original usa solo su defensa restante después de declarar el ataque.
- La defensa restante se calcula así:

```text
defensa restante = max(0, precisión del ataque original - evasión del defensor original)
precisión = Destreza + Agilidad del atacante
evasión = Destreza + Agilidad del defensor
```

## Ejemplo

Si el atacante tiene 8 de precisión y el lancero tiene 5 de evasión, el atacante queda con 3 de defensa restante para el contraataque.

Si el lancero contraataca con 5 de precisión, su contraataque se calcula contra esa defensa restante de 3.

## Alcance

- No se modifican estadísticas de cartas.
- Aplica a contraataques de lanzas/polearms.
- Aplica también al Atacar Primero de semidioses con lanza, porque funciona como contraataque preventivo.
- Miyamoto Musashi conserva su contraataque especial, pero también usa la nueva regla global de contraataque.
