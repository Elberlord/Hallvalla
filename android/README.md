# HallValla Android v131 — Google login nativo

- applicationId: `com.hallvalla.game`
- versionCode: `131`
- versionName: `1.0.131`
- Sitio cargado: `https://elberlord.github.io/Hallvalla/?apk=131`
- Firma: debe usar exactamente el mismo `hallvalla-release.p12` de v130.
- OAuth Web Client usado por Firebase: `496903032464-mcru6mkdr99pgos2fdegarg08eb55ujf.apps.googleusercontent.com`

## Cambio v131

La página web no se modifica. El wrapper Android intercepta únicamente los botones Google dentro de HallValla, abre Google Sign-In nativo mediante Google Play Services, obtiene un Google ID token y entrega ese token al Firebase Auth JS ya cargado por HallValla mediante `signInWithCredential`/`linkWithCredential`.

Esto evita ejecutar el OAuth de Google dentro de Android WebView.

## Requisito OAuth Android

El proyecto Google/Firebase debe tener un cliente OAuth de tipo Android con:

- Package name: `com.hallvalla.game`
- SHA-1 release: `54:ED:93:B1:F9:14:30:D2:B7:E9:91:1D:04:D0:52:E7:EC:93:15:F5`

Si falta esa asociación, Google Play Services devuelve `DEVELOPER_ERROR (10)` y la APK muestra una explicación específica.
