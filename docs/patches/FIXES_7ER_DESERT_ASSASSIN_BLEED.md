# v7ER - Asesina del desierto y Sangrado

## Cambios

- La antigua unidad básica `scout` / Explorador de arena ahora se muestra como **Asesina del desierto**.
- Mantiene la misma key interna (`scout`) para no romper mazos guardados ni referencias existentes.
- Nuevas estadísticas base:
  - ATK: 1
  - Guardia: 0
  - Destreza: 4
  - Agilidad: 3
  - Movimiento: 4
  - Rango: 1
- Se retiró a `scout` de la regla global de espadas, así no recibe el +3 Guardia.

## Nueva regla: Sangrado

Cuando la Asesina del desierto logra hacer daño a HP, el objetivo queda con **Sangrado**.

- El objetivo pierde 1 Vida al inicio de su turno.
- El daño por Sangrado ignora Guardia.
- No modifica estadísticas base de otras cartas.
- El efecto funciona para jugador e IA.
- Los mazos guardados que todavía tengan el viejo Explorador de arena se normalizan al cargar como Asesina del desierto.
