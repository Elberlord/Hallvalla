# Auditoría v221 — DET, Tier y Maestría

Build: `20260919.221`

## 1. Plantilla DET
La plantilla anterior `det_base_universal_v32.webp` contenía dos marcos por cada stat. v221 la reemplaza físicamente por `det_base_universal_v33.webp`, con una sola casilla por stat y sin la estrella añadida accidentalmente al panel inferior derecho.

La capa dinámica fue recalibrada para escribir el número dentro de la única casilla disponible. El costo artístico bajo el retrato sigue siendo un elemento independiente y no se elimina.

También se ajustaron los valores de COPIAS, TIPO, RAREZA y ESTADO para la geometría de la nueva base.

## 2. Buff de categoría de líderes
La antigua progresión desigual por arquetipo se reemplaza por una única tabla acumulativa para todos los líderes. El arquetipo sigue determinando qué unidades son compatibles; el Tier determina qué stats recibe cada unidad compatible.

| Tier | Bonus acumulativo |
| --- | --- |
| 1 | +1 AT |
| 2 | +1 AT, +1 DX |
| 3 | +1 AT, +1 DX, +1 AG |
| 4 | +1 AT, +1 DX, +1 AG, +1 GD |
| 5 | +1 AT, +1 DX, +1 AG, +1 GD, +1 HP |

No se añade MV ni RG por Tier.

## 3. Maestría/rango de unidades
La Maestría deja de inflar todas las estadísticas. Solo Destreza aumenta con el rango. Se conserva el paso histórico de +2 por rango:

`bonusDX = (rango - 1) × 2`

Rango I = +0 DX; Rango XV = +28 DX. HP, AT, GD y AG permanecen en los valores definidos por la carta y por efectos externos independientes.

Los rank-ups de unidades desplegadas actualizan únicamente DX y el estado `masteryDexBonus`. Se corrigió además el detector del evento Cuenta Regresiva Mortal para que un rank-up de DX se sincronice aunque ya no cambie maxHP.

## 4. Hua Lan
`Ataque por la espalda` deja de depender de posicionamiento para Hua Lan. Su regla base pasa a `Golpe de Apertura`: el primer ataque declarado después de entrar al campo recibe +6 AT. Tras ese ataque, `mulanFirstAttackUsed` impide volver a aplicar el bonus mientras esa instancia permanezca desplegada.

Reanimar/crear una nueva instancia limpia ese estado, por lo que la nueva entrada puede volver a tener un primer ataque.

La lógica automática posterior a una baja de v220 se conserva.

## 5. Compatibilidad
- No se modifican reglas Firebase.
- No se cambia el ritmo global de ataque/movimiento definido en v216.
- No se cambia targeting, daño base, costes ni deck size.
- El cambio de Tier afecta únicamente al buff que un líder otorga a unidades compatibles; las habilidades Nv.5 siguen siendo sistemas separados.
