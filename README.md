# HallValla — private source / public game distribution

Repository layout prepared for HallValla private-source/public-game distribution.

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
- Browser/gameplay base: v151
- Public distribution shell: v151 (restauración visual Beast Master + premios de ruleta por iconos; conserva Tutorial V2, PvP BOT por nivel, Contratos de Dragón XV y progresión de mapas)
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


## v149 · PvP — 15 BOT por cada nivel
- Se sustituyen los antiguos BOT fijos de Nivel XV por 225 variantes: 15 rivales para cada nivel del I al XV.
- Cada nivel dispone de 3 Guerrero, 3 Arquero, 3 Caballería, 3 Hacha y 3 Asesino.
- El BOT de relleno toma exactamente el nivel del líder humano; ese nivel determina HP/AT del líder, Tier, tamaño del mazo y Maestría de sus unidades.
- Maestría PvP BOT = nivel del BOT: I en nivel 1, II en nivel 2 ... XV en nivel 15.
- Tamaño del mazo usa la regla canónica del líder: Tier 1/2/3/4/5 = 10/15/20/25/30 cartas.
- La rareza queda limitada simultáneamente por la liga y por el nivel para evitar cartas de endgame en rivales bajos.
- Los niveles bajos priorizan unidades de coste efectivo 1–2 para poder defenderse desde el inicio del TR; los niveles altos permiten mayor inversión y variedad.
- El BOT conserva la IA táctica máxima, sin recibir maná extra por esta modificación.


## v150 · Tutorial V2 — combate TR y recorrido completo
- El tutorial de combate antiguo se adapta al TR canónico: recoger orbe de MANÁ, convocar desde el Arsenal, comprender movimiento/ataque automático, lanzar Fireball y activar el escudo del líder.
- El escudo del líder se puede practicar tocando/clicando el propio líder en móvil/PC; con mando continúa disponible mediante RB.
- Tras el combate se añade un recorrido por Home, Mina, Armar el mazo, Eventos, Aventura, PvP, Tienda, Forja y Misiones/Maestrías.
- Cada paso nuevo entrega 5 Oro y completar cada módulo por primera vez entrega 20 Oro adicionales; repetir tutoriales no vuelve a pagar recompensas.
- Mina enseña la regla de unidades libres: una unidad en mazo no puede producir y una unidad que entra al mazo sale automáticamente de producción.
- El progreso del nuevo recorrido se conserva en almacenamiento local/nube mediante `hallvalla_tutorial_systems_v1`.


## v151 · Restauración de UI + Recompensas de ruleta por iconos
- Beast Master: se corrige la calibración heredada que desplazó Información, Recompensas y Eventos globales; vuelven a usar su fila base sin offsets extremos.
- Se añade migración puntual para navegadores que ya tenían guardado el preset defectuoso, sin borrar otros ajustes manuales.
- El icono de edición/control del Beast Master pasa a la esquina inferior derecha y se reduce.
- Mina > Recompensas: el control de premios posibles se convierte en un icono pequeño en la esquina inferior derecha.
- El panel de premios deja de mostrar las tarjetas grandes: primero aparecen 10 iconos exactos recortados del arte de la ruleta.
- Al tocar cada icono se abre únicamente la explicación de esa familia y sus premios todavía disponibles.
- Los iconos de explicación proceden del mismo asset `wheel_mine_grouped_final.webp`, para que coincidan visualmente con lo que el jugador ve en la rueda.
