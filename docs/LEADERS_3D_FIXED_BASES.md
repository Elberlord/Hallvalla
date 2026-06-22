# Líderes 3D en bases fijas

## Objetivo

Los líderes usan imágenes 3D tipo ficha/miniatura para que no se vean como cartas dentro del campo.

## Comportamiento actual

Los líderes:

- aparecen fuera del campo central.
- están anclados visualmente en una base superior o inferior.
- no pueden moverse.
- pueden atacar si el objetivo está dentro de su rango.
- pueden entrar en DEF.
- pueden abrir DET.
- pueden usar EFFECT si su líder lo permite.
- pueden recibir buffs, debuffs y estados activos.

## Base superior e inferior

Los textos visibles "Base Norte" y "Base Sur" fueron eliminados.

La ubicación visual se mantiene, pero ya no se muestra texto sobre la base.

## Hitbox

El patch 64 añadió una hitbox transparente sobre cada líder fijo para asegurar que el click abra el menú de acciones, tanto en el líder aliado como en el enemigo.

## HUD visible

El HUD fijo del líder muestra:

```text
HP + ATK + GD
```

No muestra RG, DX ni AGI porque esos datos están disponibles en DET.
