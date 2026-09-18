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
- Browser/gameplay base: v168
- Public distribution shell: v168 (campo simplificado a Vida/Ataque/Guardia; PREC/EVA siguen internas; conserva ajustes v167, PvP EXP/Maestría, Mapas 11–20, Xsolla, Contratos de Dragón XV, Tutorial V2 y PvP BOT por nivel)
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


## v154 · Probabilidades individuales de sobres para Xsolla
- Cada sobre de la tienda tiene acceso directo a “PROBABILIDADES” antes de comprar.
- La pantalla de apertura también permite revisar probabilidades antes de tocar el sobre.
- Cada carta muestra su probabilidad individual como Carta 1, Carta 2 y de aparecer en el sobre.
- Los porcentajes se calculan desde los mismos pools y pesos usados por el RNG real.
- Cambio web compatible con el APK remoto anterior al publicarse en GitHub Pages.


## v164 · Mapa 11 — La segunda llave + limpieza DEV
- Se añade el Mapa 11.1 “La segunda llave”, desbloqueado al completar el Mapa 10.1.
- Rango de progresión: Nv. 31–33; cinco nodos con mazos Tier 5 de 30 cartas e IA adaptativa.
- La historia continúa desde el Primer Juramento: el jugador busca la segunda de siete llaves mientras Satanyahu falsifica órdenes de la Vigilia.
- El jefe final es Juana de Arco; al derrotarla se obtiene su carta y la segunda llave queda integrada en la trama.
- La narración permanece fuera de la pantalla principal y se consulta desde el Grimorio.
- DEV: se elimina una sola vez el selector residual `div[data-draft-index="20"]:nth-of-type(21)` etiquetado como Hua Lan, evitando que el desplazamiento +5 px termine afectando a cualquier carta que ocupe ese índice.
- Se conservan intactas las posiciones v163 de Información, Recompensas y Eventos globales del evento Beast Master.


## v165 — Mapas 12–20 · Las siete llaves
- Se añaden nueve mapas completos, del 12.1 al 20.1, con 45 encuentros nuevos.
- Progresión continua: Nv.34–60, cinco nodos por mapa.
- Mapas 12–16: llaves tercera a séptima.
- Mapa 17: Satanyahu activa la trampa de resonancia y copia la huella de las siete llaves.
- Mapas 18–19: persecución por el subsuelo de HallValla y siete cerraduras defensivas.
- Mapa 20: cierre del arco con Satanyahu.
- Todos los encuentros usan mazos Tier 5 de 30 cartas y adaptación IA.
- La historia permanece en el Grimorio y no invade la UI principal del mapa.


## v166 — PvP EXP + Maestría por bajas
- Todo duelo PvP terminado otorga EXP de cuenta una sola vez por jugador y resultado: 25 por victoria, 15 por empate y 10 por derrota.
- La entrega se procesa desde el snapshot final local de cada jugador, por lo que ganador y perdedor reciben su EXP aunque solo un cliente haya escrito el cierre en Firebase.
- Se añade protección local contra duplicados por partida/rematch y sincronización forzada con la nube.
- Las bajas de unidades en PvP continúan alimentando su Maestría individual y ahora también cuenta rematar al líder enemigo.
- Los líderes obtienen un contador propio de bajas y Maestría I–XV con la misma curva de bajas de las unidades.
- Ataques básicos, magias de daño lanzadas por el líder y habilidades automáticas de líder (Barrido de Guerra, Lluvia de flechas y Descarga arcana) pueden acreditar bajas al líder.
- El panel del líder muestra su progreso de Maestría por bajas.
- La Maestría acumulativa de cuenta también reconoce la derrota del líder rival como una baja válida.


## v167 — Web UI estable antes de rehacer Android
- Beast Master: coordenadas finales confirmadas: Información (592,-229), Recompensas (209,-110), Eventos globales (-176,9).
- Se actualizan tanto el preset PROD del evento como el Control Universal `?dev`, con migración nueva para navegadores que ya tenían v163 guardada.
- El acceso al Grimorio deja de ser un rectángulo con texto y pasa a ser un icono visual de libro abierto, manteniendo accesibilidad mediante `aria-label`/`title`.
- No se modifica el APK Android en esta build; los problemas de WebView/móvil se abordarán sobre esta base web estable.
- Xsolla: se conserva la divulgación de probabilidades; la restricción efectiva de Bélgica, Brasil y China corresponde al Publisher Account de Xsolla.


## v168 — Campo simplificado: Vida / Ataque / Guardia
- Las unidades del campo muestran siempre los tres stats públicos definidos: Vida, Ataque y Guardia.
- Se elimina del render del campo la alternancia AT/GD por turno: ambos valores permanecen visibles simultáneamente.
- Precisión y Evasión continúan funcionando exactamente en la resolución interna de impactos, desgaste, IA y efectos, pero sus valores dejan de mostrarse como badges públicos del campo.
- Se elimina del campo el badge de estado que revelaba el desgaste numérico de Evasión.
- La descripción pública de Guardia defensiva deja de revelar el modificador numérico de Precisión, sin cambiar su cálculo interno.
- El editor DEV de badges deja de ofrecer objetivos de Precisión/Evasión, ya que esos emblemas ya no se renderizan en combate.
- Se sincronizan las huellas de caché del loader para `hvdev.js` y `17-dragon-contracts.js`, que estaban heredadas de una versión anterior.
- Android/APK no se modifica en esta build.
