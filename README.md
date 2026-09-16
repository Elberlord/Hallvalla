# HallValla — private source / public game distribution

Repository layout prepared for HallValla v138 infrastructure.

## What stays private
- `android/` — Android application source (v131 native Google Sign-In shell)
- `backend/firebase/` — Realtime Database rules and Cloud Functions source
- `docs/` — internal build/design documentation
- repository history, branches, issues and development files

## What is published
The workflow `.github/workflows/publish-hallvalla-public.yml` builds a Pages artifact containing only:
- `web/` — playable HallValla browser client
- `downloads/HallValla-Android.apk` — current stable signed Android APK
- Android release checksum/metadata

The APK signing key is deliberately NOT included in this repository package.

## Current versions
- Browser/gameplay base: v134
- Public distribution shell: v138 (Mina/mazo exclusión automática + botón Volver universal + farmeo diario de nodos de Aventura)
- Android APK: v131 / versionCode 131 / `com.hallvalla.game`

## First setup
Read `REPO_SETUP_FIRST_TIME.txt` before the first deployment.


## v145 — Mapa 3 competitivo
- Mapa 3 pasa a Tier 3 real (líder enemigo nivel mínimo 7, mazo de 20 cartas).
- 3-1 Guerrero, 3-2 Arquera y 3-3 Sun Tzu reciben `adaptiveFixedDeck` diseñados a mano.
- Mantienen acceso a Richard, Hua Lan, Wallace y Simo; Sun Tzu se garantiza en 3-3.
- Se aprovechan cartas Épicas del paquete mejorado que el jugador ya pudo obtener antes del Mapa 3.
- Se conserva una curva TR con abundancia de unidades y la adaptación puede modificar slots secundarios sin destruir el núcleo táctico.
