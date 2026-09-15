# HallValla · Backend seguro de economía · Etapa 1

Esta carpeta introduce la base autoritativa para Oro, Gemas y Fragmentos.

## Garantías de esta etapa

- `/economy/{uid}` puede ser leído únicamente por su dueño.
- Ningún cliente puede escribir en `/economy/{uid}` mediante el SDK web.
- Las escrituras de economía se realizan con Firebase Admin dentro de Cloud Functions.
- Las mutaciones usan transacciones y `operationId` para impedir doble cobro/doble premio.
- No existe una función pública que permita al jugador elegir arbitrariamente cuánto oro/gemas recibir.
- `economyAdminAdjustWallet` exige un custom claim `admin: true` y está pensado solo para migración/correcciones administrativas.

## Importante

Esta etapa NO reemplaza todavía el saldo local del juego. Eso es intencional para no romper Mina, Tienda, Aventura ni recompensas antes de migrar cada operación sensible al backend.

El siguiente paso es migrar el saldo existente una sola vez y luego cambiar cada fuente/gasto de moneda para que invoque una Cloud Function específica. Solo después se elimina la autoridad de monedas del `cloudSaveV2`.

## Despliegue

Desde la raíz de Hallvalla:

```bash
npm install -g firebase-tools
firebase login
cd functions
npm install
cd ..
firebase use hallvalla-online
firebase deploy --only database,functions
```

Cloud Functions requiere que el proyecto tenga facturación habilitada para el despliegue de funciones de producción.
