# HallValla v243 — Android 1366×636 + assets locales (prueba firmada)

Web build base: `20260920.242`
Android: `versionCode 136` · `versionName 1.0.136`
Application ID: `com.hallvalla.game`

## Objetivo de esta entrega
Validar en un teléfono real el plano canónico 1366×636 sin que Android reacomode los elementos internos de HallValla.

- El shell web usa un escenario lógico fijo 1366×636 y escala por `contain`.
- El proyecto Android v136 usa la misma relación 1366:636.
- Todo `web/assets/` permanece empaquetado localmente dentro de la app.
- El APK de prueba incluido contiene 638/638 assets vigentes.
- La APK está firmada con la misma identidad de actualización de HallValla utilizada por las versiones anteriores.
- La firma privada/keystore NO forma parte de este repositorio ni de este ZIP.

## APK de prueba
`releases/android/HallValla-Android-v136.apk`

Esta APK está destinada a la prueba física de layout/arranque en Android. La fuente Android canónica sigue en `/android` y conserva Google Sign-In nativo, gamepad y resolución local estricta de assets.

## Auditoría previa
El cierre estructural/técnico v242 se mantiene. No se cambió gameplay, balance, economía, IA ni Firebase Rules para esta prueba Android.
