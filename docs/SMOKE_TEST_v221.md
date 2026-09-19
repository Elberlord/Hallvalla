# Smoke test v221

1. Abrir Forja/colección y abrir DET de varias unidades. Confirmar una sola casilla por HP/DX/MV/AT/GD/AG/RG.
2. Confirmar que el costo sigue bajo el retrato y que COPIAS aparece dentro de su casilla.
3. Confirmar que TIPO, RAREZA y ESTADO no pisan sus etiquetas.
4. Abrir el detalle de varios líderes y verificar la tabla acumulativa: T1 AT; T2 +DX; T3 +AG; T4 +GD; T5 +HP.
5. Iniciar batalla con una unidad compatible y comprobar que el buff efectivo coincide con el Tier del líder.
6. Revisar una unidad con Maestría mayor que I: únicamente DX debe aumentar por Maestría. AT/HP/GD/AG no deben crecer por rango.
7. Si Hua Lan está disponible: su primer ataque debe obtener +6 AT; el segundo ataque de la misma instancia no debe volver a recibirlo.
8. Tras una baja de Hua Lan, comprobar reposición automática y seguimiento/defensa como en v220.
9. Aventura completa y PvP BOT hasta regresar a Home.
10. Gamepad + DET y consola sin ReferenceError/TypeError nuevos.

Firebase rules no cambiaron; no es necesario republicarlas.
