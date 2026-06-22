# Assets activos

Este documento lista los assets que el sistema actual usa de forma directa.

## Líderes 3D activos

Ubicación:

```text
assets/leaders/
```

Archivos activos:

```text
leader_warrior_3d.png
leader_archer_3d.png
leader_mage_3d.png
leader_axe_3d.png
leader_cavalry_3d.png
leader_assassin_3d.png
leader_beastmaster_3d.png
```

El código apunta a estos archivos desde `LEADER_PORTRAITS`.

## Assets de líderes eliminados

Las imágenes antiguas o duplicadas de líderes fueron retiradas de `assets/leaders/`.

Ejemplos de archivos que ya no deben volver salvo que se reactive su uso:

```text
leader_warrior.webp
leader_archer.webp
leader_mage.webp
leader_axe.webp
leader_cavalry.webp
leader_assassin.webp
leader_beastmaster.webp
Warrior Leader.png
Archer leader.png
Mage Leader.png
Cavalry Leader.png
Assasin Leader.png
Berseker Leader.png
Beast Master Leader.png
```

## Importante

No borrar carpetas de assets fuera de `assets/leaders/` sin revisar el código, porque el juego todavía usa:

- `assets/cards/`
- `assets/home/`
- `assets/modal/`
- `assets/sfx/`
- `assets/story/`
- `assets/ui/`
- `assets/board_oscuro_11x6.webp`
