# Revisión pre-repo v0.7AN

## Resultado
Se revisó el parche v0.7AM antes de subirlo al repo y se corrigió un candado interno del mapa 2.1.

## Corrección aplicada
- `isBattleUnlocked()` ahora valida primero el requisito del capítulo antes de permitir la batalla 1 de un capítulo nuevo.
- Esto evita que `chapter2_1_battle1` pueda iniciarse por llamada directa antes de completar todo el mapa 1.1.
- La navegación normal ya mostraba solo el capítulo activo, pero ahora el bloqueo también queda protegido a nivel de motor.

## Validaciones realizadas
- `node --check script.js`
- Revisión de IDs usados por JS contra `index.html`
- Revisión de referencias a assets locales
- Confirmación de que no quedan PNG ni referencias `.png`
- Revisión de flujo: guardián → mapa 1.1 → mapa 2.1
- Validación de zip con `zip -T`
