# Estado v11.65 · M7-36 · Comparabilidad y legibilidad de resultados

**Estado:** EN CURSO. Rama `feat/m7-36-readable-results-comparison`. Pendiente certificar PR, Node, Chromium, merge, Pages y HTTP público. [Plan de 43 microfases](EXECUTION-PLAN-43.md).

## Cambio implementado
- `src/recovery-readable-results.js`: modelo de lectura **puro, auditado, inmutable**; usa el comparador consolidado M5-26 previamente calculado, con la misma cohorte de pedidos SKU, stock de apertura, compras originales, días y restricciones.
- Cinco alternativas en orden fijo: esperar, reserva, refuerzo, compra urgente y combinación. No recalcula eventos, agrega expediciones, ordena por dinero ni cambia la recuperación elegida.
- Lectura **Pedidos físicos**: muestra pedidos completos expedidos desde el CD y pendientes al corte en dos columnas numéricas; los conteos se concilian contra la misma demanda.
- Lectura **Compromisos supuestos**: muestra solo compras urgentes, recargo y refuerzo del comparador original, no efectivo pagado ni costo total. **Reserva:** costo de traslado desconocido porque no hay tarifa; se muestra «Sin tarifa», jamás CLP 0. **Esperar:** «Sin acción» representa ausencia de nuevo compromiso en este modelo, no operación gratuita.
- `src/app.js`: detalle inicialmente cerrado «Comparar las cinco opciones · mismo escenario» y selector de vista sin escrituras a sesión. Las cinco filas presentan siempre un escenario base y distinguen la opción activa. Las demás herramientas y evidencias físicas siguen accesibles.
- `src/styles.css`: filas móviles compactas con al menos 44 px de altura, contraste del escenario activo y dos diseños que evitan columnas monetarias desbordadas a 360/412 px.
- Todos los textos separan expedición del CD vs entrega a cliente, costo parcial vs costo real total y pedidos SKU de 12 días vs unidades agregadas de una jornada.

## Pruebas
- `tests/recovery-readable-results.test.mjs`: cinco alternativas, conservación de pedidos en ambas vistas, costo de reserva `null`, no ranking económico, comparación no mutable, insumos adulterados.
- `tests/browser-readable-results-m7-36.e2e.mjs`: escritorio y móvil 360/412 px, acordeón inicialmente cerrado, cinco filas, selección de vista, costo desconocido, no escritura de recuperación, alturas, desbordamiento y recarga.
- Regresión completa de Node y Chromium: **pendiente de CI**.

## Condiciones de cierre
- [ ] PR y suites Node/Chromium aprobadas.
- [ ] Merge `main`, regresión completa Node/Chromium de `main` aprobada.
- [ ] GitHub Pages v11.65 r174 y HTTP público HTML/CSS/JS/`release.json` aprobados.
- [ ] README y plan maestro cerrados con enlaces a evidencia y **M7-37** siguiente.

**Límites:** laboratorio sintético, no WMS, rentabilidad ni entrega garantizada. Costos integrales y traslados de reserva no calibrados; evaluación con Android físico/TalkBack sigue pendiente de M7-38.
