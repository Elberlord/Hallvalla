# Smoke test v224

1. Home → Mina: abrir, cambiar pestañas, asignar/desasignar unidad, navegar slots y volver a Home.
2. Mina: abrir Ruleta, Misiones y Tienda; comprobar que no hay `ReferenceError`.
3. Aventura o PvP BOT: abrir Arsenal con varias cartas; dentro de cada lista visible, el coste menor debe aparecer primero.
4. Jugar una carta y comprobar que el Arsenal restante sigue ordenado por coste.
5. Ganar/desbloquear una carta que antes no estuviera en la colección.
6. Abrir Creación de mazo: la carta debe aparecer con `New` y, en orden por defecto, delante de las cartas antiguas.
7. Abrir el DET de esa carta: cerrar y volver al catálogo; `New` debe haber desaparecido solo para esa carta.
8. Una carta ya conocida que gane otra copia no debe volver a marcarse `New`.
9. PvP BOT/Aventura: terminar batalla y regresar a Home.
10. `?dev`: Control Universal/DET debe seguir disponible como en v223.
