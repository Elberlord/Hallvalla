# v7EO - Sword Guard +3

## Cambio solicitado
Todas las unidades que usan espada reciben +3 Guardia.

## Implementación
- Se añadió la regla global `SWORD_UNIT_KEYS` en `script.js`.
- Las cartas de espada reciben `+3` a su Guardia base y muestran el texto:
  - `Regla de espada: recibe +3 Guardia base.`
- Para cartas guardadas en mazos anteriores/localStorage, `makeUnit()` añade el bonus si la carta todavía no lo tenía aplicado.
- El bonus se aplica como Guardia base, por lo que se combina correctamente con buffs de líder, habilidades y auras.

## Unidades incluidas inicialmente
- Caballería ligera
- Explorador de arena
- Hua Lan
- William Wallace
- Richard Corazón de León
- Saladino
- Yi Sun-sin
- Boudica
- Ulises / Odiseo
- Juana de Arco
- Tomoe Gozen
- Subotai / Subutai
- Ragnar Lodbrok
- El Cid Campeador
- Espartaco
- Beowulf
- Miyamoto Musashi
- Khalid ibn al-Walid
- Gilgamesh
- Julio César

## Detección futura
También se detectan automáticamente cartas futuras si su nombre o texto contiene:
- `espada`
- `espadach`
- `sword`
