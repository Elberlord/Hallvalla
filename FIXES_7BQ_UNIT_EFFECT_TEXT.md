# 7BQ - Texto de efecto en detalles de unidades

## Problema
Las cartas especiales como Mulan sí tenían su texto de habilidad en la carta de la mano, pero al ser invocadas el objeto de unidad en el tablero no copiaba ese texto.

Resultado: al abrir los detalles de Mulan en el campo, la zona **Destreza/Efecto** mostraba el texto genérico:

> si la unidad tiene una habilidad especial, aquí se explica cuándo y cómo aplica.

## Solución
- `makeUnit()` ahora conserva `text`, `effectText` y `ability` desde la carta original.
- Se agregó `getUnitEffectText(u)` para recuperar el efecto desde la unidad o, si la partida ya tenía una unidad vieja sin texto, buscarlo por `key` en las cartas conocidas.
- El panel lateral de detalle también muestra el efecto cuando existe.

## Ejemplo esperado
Mulan ahora debe mostrar:

> Ataque por la espalda: si Mulan ataca desde la espalda, obtiene +6 ATQ durante ese ataque.

## Nota
Este parche corrige la visualización/documentación del efecto en campo. La lógica especial avanzada de algunas cartas legendarias puede seguir ampliándose en un parche posterior si se quiere que el efecto se active automáticamente en combate.
