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
- Browser/gameplay base: v148
- Public distribution shell: v148 (Contratos de Dragón con ejército elemental XV; conserva Mapas 4–6, Aquiles, Mina/mazo, Volver universal y farmeo diario)
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


## v148 · Contratos de Dragón — ejército elemental XV
- Cada uno de los tres jefes de contrato usa el mismo núcleo de 9 dragones: 1 Bebé, 1 Joven y 1 Adulto de Relámpago, Fuego e Hielo.
- Las 9 invocaciones enemigas entran siempre con Maestría XV; los dragones del jugador continúan iniciando en Maestría I y progresan normalmente.
- El mazo de contrato permanece en 25 cartas (Tier 4 actual): 9 dragones + 16 cartas exclusivamente de magia/trampa.
- Arsenal de apoyo: 3 Fireball, 3 Maldición de arena, 2 Parálisis, 2 Veneno y las seis trampas de cacería (Cepo, Foso, Red, Carnada, Estacas y Jaula).
- Apertura guiada: los tres Dragones Bebé y Parálisis quedan disponibles en la mano inicial del modo por turnos; en TR el mazo completo sigue funcionando como arsenal.
- El constructor del contrato queda exento del normalizador general de 70% unidades para respetar exactamente esta composición.
