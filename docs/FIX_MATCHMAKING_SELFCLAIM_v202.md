# HallValla v202 - Matchmaking self-claim fix

Diagnóstico real de v201:
`fallback-self-claim-not-committed` se repetía porque un intento de fallback podía dejar la entrada propia con `claimedBy == myUid`. El siguiente intento trataba de reservarla otra vez; la transacción abortaba y nunca avanzaba a crear el rival.

Corrección:
- una auto-reserva existente del mismo UID se reutiliza;
- cualquier salida anticipada posterior a la auto-reserva la libera en `finally`;
- se conserva la prioridad de un claim de otro jugador;
- se elimina el binding muerto `deckSearchInput` que generaba el warning residual;
- build/cache 202 para impedir mezcla con v201.
