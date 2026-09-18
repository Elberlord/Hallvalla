# HallValla — private source / public game distribution

Repository layout prepared for HallValla private-source/public-game distribution.

## What stays private
- `android/` — Android application source (v133 virtual 1920×1080 test shell; stable public APK remains v131)
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
- Browser/gameplay base: v179 (v178 gameplay + conditional Android viewport test)
- Public distribution shell: v179 (web normal conserva el layout v178; `hvfit=1` activa exclusivamente el viewport virtual Android 1920×1080)
- Android APK pública estable: v131 / versionCode 131. Fuente de prueba preparada: v133 / versionCode 133 / `com.hallvalla.game`

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


## v169 — Web estable: Grimorio, ruleta y sincronización diaria
- Grimorio usa un único icono canónico de libro HallValla tanto en normal como en `?dev`.
- Play/Pausa/Stop usan iconos HallValla y la narración corrige la carrera de Chrome/Brave tras `speechSynthesis.cancel()`.
- Mina > Premios posibles deja de mostrar cuadrados/fotografías de la ruleta: usa los mismos motivos del arte de la ruleta aislados con transparencia sobre contenedor invisible.
- Vida/Ataque/Guardia adoptan exactamente los valores de calibración aprobados y el DEV deja de exponer PREC/EVA.
- La recompensa diaria fuerza guardado Firebase inmediatamente tras reclamar para evitar que normal y `?dev` diverjan.
- Se mantienen intactas las coordenadas Beast Master v167: Información (592,-229), Recompensas (209,-110), Eventos globales (-176,9).


## v170 — Iconografía WEBP canónica
- Los 10 iconos de familias de premios de la Mina se sustituyen por assets individuales WEBP creados expresamente para HallValla.
- Cada icono usa un lienzo transparente con margen de seguridad, evitando los recortes que aparecían en la v169.
- El Grimorio usa el nuevo libro oscuro/dorado con cristal azul como acceso principal.
- Play, Pausa y Stop usan tres medallones WEBP individuales; se eliminan los SVG anteriores.
- Normal y `?dev` consumen exactamente los mismos assets.
- No se modifica la APK Android en esta versión.


## v171 — Mina: piezas gratis atómicas
- La tienda de No Muertos usa `freePieces` como saldo remoto de piezas gratis bajo `users/{uid}/mine/shop`.
- Canjear una pieza gratis descuenta 1 vale y suma 1 pieza al esqueleto dentro de la misma transacción de Firebase; si la transacción falla, no se consume el vale.
- Las reglas de Realtime Database distinguen compra diaria con gemas y canje gratis, permitiendo varios vales en un mismo día sin romper el límite de compra diaria.
- Los vales antiguos guardados como `minePuzzleVouchers` se migran automáticamente al nuevo saldo remoto al abrir/sincronizar la tienda.
- Los nuevos premios de pieza de la Ruleta se acreditan al saldo remoto; las recompensas de Maestría usan el mismo sistema cuando está disponible y conservan una cola de compatibilidad si Firebase no responde.
- Mensajes de error separados para compra con gemas y canje gratis.
- No se modifica la APK Android.


## v172 — Mina + lectura del Grimorio
- El canje de piezas gratis deja de depender de `runTransaction()` sobre `/mine/shop`, evitando el aborto prematuro cuando RTDB entrega primero un valor local nulo/vacío.
- El canje obtiene primero el estado remoto fresco y aplica un `update()` multipath único: `freePieces - 1` + `pieces + 1`. Las Rules v171 siguen validando que ambos cambios ocurran juntos.
- Tras escribir, se vuelve a leer Firebase y se confirma que ambos contadores coincidan antes de actualizar la UI local.
- El Grimorio muestra una barra de desplazamiento vertical visible con estética HallValla para capítulos largos; cada nueva página comienza arriba.
- No se modifica la APK Android.




## v176 — Ritmo compacto 10–16 s / 10–18 s

- Se compacta la cadencia general sin perder la diferenciación por unidad.
- Ataque: intervalo canónico entre 10 y 16 s; AGI alta y poca carga acercan a 10 s, mientras armas/equipo pesados acercan a 16 s.
- Movimiento: intervalo canónico entre 10 y 18 s; MOV/locomoción, AGI y carga siguen determinando quién avanza antes.
- Se mantiene la regla de legibilidad: una unidad nunca se desplaza con mayor frecuencia de la que ataca; el movimiento conserva al menos 1 s extra de intervalo respecto a su ataque cuando el cálculo lo requiere.
- Base de calibración: 13 s ataque y 22 s movimiento antes de modificadores.
- Huevo de Dragón MOV 0 continúa inmóvil. Campo mantiene únicamente Vida/Ataque/Guardia visibles.
- APK Android y reglas Firebase sin cambios.

## v175 — Ataque más rápido · movimiento más lento

- Se invierte la prioridad temporal de v174: las unidades atacan con mayor frecuencia de la que se desplazan.
- Ataque base: 20 s antes de AGI/carga; rango canónico 12–30 s.
- Movimiento base: 32 s antes de MOV/AGI/carga; rango canónico 18–42 s para unidades móviles. El movimiento conserva al menos 1 s más de intervalo que el ataque de esa misma unidad.
- Se conserva la diferenciación continua: AGI alta reduce intervalos; armas/armaduras/carga añaden inercia; MOV y locomoción siguen dando ventaja real a caballería, bestias y unidades ágiles.
- Referencias aproximadas con la misma calibración de v174: Hattori Hanzō ≈ 17.5 s ataque / 22.4 s movimiento; Berserker del norte ≈ 21.8 s / 25.5 s; Arquero escita montado ≈ 17.4 s / 18.4 s; Hombre de armas acorazado ≈ 28.2 s / 42.0 s.
- El Huevo de Dragón sigue inmóvil y no se añaden iconos nuevos al campo.
- APK Android y reglas Firebase sin cambios.

## v174 — Velocidad de ataque y movimiento por AGI/peso

- El ritmo global de combate se reduce aproximadamente a la mitad respecto a v173: el intervalo base de ataque pasa de 12 s a 24 s y el de movimiento de 10 s a 20 s antes de modificadores.
- Velocidad de Ataque y Velocidad de Movimiento son cálculos independientes.
- AGI reduce el tiempo entre acciones; arma, armadura, escudo y carga aumentan la inercia.
- Movimiento conserva MOV/locomoción como factor principal y luego aplica AGI + carga.
- Los buffs/debuffs de AGI y MOV cambian el ritmo dinámicamente durante el combate; no es una cifra congelada al invocar.
- Límites canónicos: ataque 14–34 s; movimiento móvil 8–30 s. Las unidades inmóviles continúan sin desplazarse.
- Ejemplos base: Hattori Hanzō ≈ 21.0 s ataque / 14.0 s movimiento; Berserker del norte ≈ 26.2 s / 15.9 s; Hombre de armas acorazado ≈ 33.9 s / 26.8 s; Arquero escita montado ≈ 20.9 s / 11.6 s.
- El campo mantiene únicamente Vida/Ataque/Guardia visibles; el nuevo ritmo no agrega iconos adicionales al tablero.

## v173 — Tutorial PvP + crecimiento dracónico + Hannibal compuesto
- El tutorial de PvP ya no abre un modal vacío: carga el módulo PvP y abre explícitamente la selección de modo antes de enfocar sus pasos.
- Huevo de Dragón, Dragón Bebé y Dragón Joven cuentan correctamente las eliminaciones aliadas mientras ese compañero permanezca vivo en el campo; también se contabiliza la baja final del líder rival.
- Se añade un ledger por batalla para evitar dobles conteos al recibir snapshots repetidos.
- El progreso dracónico queda visible en el DET/carta y en el campo; si existen varias copias de la misma etapa (por ejemplo dos huevos), se muestran por separado como #1, #2, etc., con bajas actuales y las que faltan.
- Hannibal Barca pasa a representar jinete + elefante como dos componentes ligados: 4 Vida del jinete y 18 del elefante antes de bonificaciones de Maestría.
- A RG 2–3 Hannibal usa el ataque a distancia del jinete (jabalinas, AT 4); adyacente usa la fuerza del Elefante Africano (AT 16) y puede activar Arremetida Colosal (+6 AT, AT 22).
- El daño de ataques de unidades cuerpo a cuerpo se dirige al elefante y el de ataques de unidades a distancia al jinete. Si cae el elefante, Hannibal continúa desmontado; si cae Hannibal, el elefante continúa como bestia. El daño sobrante de un golpe no salta automáticamente al superviviente.
- El DET de Hannibal montado muestra la Vida restante de jinete y elefante sin añadir nuevos iconos al campo. Los contraataques usan la misma separación.
- No se modifica la APK Android ni las reglas de Firebase en esta versión.

## v177 — Limpieza de controles heredados de batalla
- Retirados físicamente del campo los controles heredados Mano/Mazo, Cancelar y Siguiente fase; también desaparecen los contadores visuales de Mazo de ambos HUD.
- Retirados los botones Acciones de escritorio/móvil y el editor DEV del HUD de acciones.
- Eliminados los tres assets WEBP exclusivos de esos controles.
- El combate fluido conserva el arsenal TR, selección contextual, configuración, Vida/Ataque/Guardia y automatización de unidades.
- No se modificó la APK ni las reglas de Firebase.
## v178 — Reparación de arranque modular
- Corregida una dependencia circular introducida por el modelo de velocidad: el registro inicial de cartas podía calcular MOV antes de que se cargaran los helpers de Gengis/Hannibal.
- Los helpers de penalización necesarios durante bootstrap ahora viven en el módulo de reglas de combate (`06`) y ya no dependen del módulo de acciones (`08`) que se carga después.
- Esto evita la cascada de `ReferenceError` que hacía aparecer como ausentes catálogos, aventura, dragones y selección de líder aunque el perfil de Firebase siguiera intacto.
- Se conservan la limpieza de controles heredados de v177 y la calibración de velocidad de v176.
- No se modifican la APK ni las reglas de Firebase.

