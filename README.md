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
- Browser/gameplay base: v146
- Public distribution shell: v146 (Mapas 4–6 Tier 5 + Aquiles extremo; conserva Mina/mazo, Volver universal y farmeo diario)
- Android APK: v131 / versionCode 131 / `com.hallvalla.game`

## First setup
Read `REPO_SETUP_FIRST_TIME.txt` before the first deployment.


## v145 — Mapa 3 competitivo
- Mapa 3 pasa a Tier 3 real (líder enemigo nivel mínimo 7, mazo de 20 cartas).
- 3-1 Guerrero, 3-2 Arquera y 3-3 Sun Tzu reciben `adaptiveFixedDeck` diseñados a mano.
- Mantienen acceso a Richard, Hua Lan, Wallace y Simo; Sun Tzu se garantiza en 3-3.
- Se aprovechan cartas Épicas del paquete mejorado que el jugador ya pudo obtener antes del Mapa 3.
- Se conserva una curva TR con abundancia de unidades y la adaptación puede modificar slots secundarios sin destruir el núcleo táctico.


## v146 — Mapas 4–6 y Aquiles extremo
- Se diseñan mazos Tier 5 de 30 cartas para todos los encuentros de los Mapas 4, 5 y 6.
- Cada mazo conserva identidad de clase y una mayoría amplia de unidades para presión TR desde el inicio.
- La adaptación puede responder al jugador sin destruir el núcleo táctico de cada encuentro.
- La batalla opcional de Aquiles usa un mazo fijo de 30 cartas de rareza superior, con semidioses, héroes legendarios y artillería.
- Aquiles abre siempre con Arjuna, Simo Häyhä, Lü Bu y Aquiles disponibles en la mano inicial.


## v147 · Maestría de unidades enemigas por mapa
- La IA de Aventura recibe Maestría según el mapa: Mapa 1 = Rango I, 2 = II, 3 = III ... 15 = XV.
- A partir del Mapa 15 las unidades permanecen en Rango XV, por lo que la progresión puede continuar a 30+ mapas sin exceder el sistema actual de 15 rangos.
- La regla se aplica al mazo enemigo completo, incluidos héroes y unidades de aperturas forzadas.
- El evento Beastmaster conserva su regla especial de rango máximo.
