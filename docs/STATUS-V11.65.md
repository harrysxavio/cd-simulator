# Estado v11.65 · M7-36 · Comparabilidad y legibilidad de resultados

**Estado:** **COMPLETADA (18 de octubre de 2026, Chile)**. Implementada, integrada y publicada; PR, Node, Chromium, Pages y HTTP público verificados. **M7: 4/6 completadas.** [Plan de 43 microfases](EXECUTION-PLAN-43.md).

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
- Regresión completa de Node y Chromium: **aprobada en PR y después de fusionar en `main`**. Los resultados de las cinco alternativas se conservan y el selector no modifica el estado.

## Condiciones de cierre
- [x] [PR #63](https://github.com/harrysxavio/cd-simulator/pull/63): [Node #39153782269](https://github.com/harrysxavio/cd-simulator/actions/runs/39153782269) y [Chromium #39153782266](https://github.com/harrysxavio/cd-simulator/actions/runs/39153782266) aprobados.
- [x] [Merge `fd7b3e9`](https://github.com/harrysxavio/cd-simulator/commit/fd7b3e91579de76d0df9f1a9e8c700a361413bcb) a `main`; [Node #39154195220](https://github.com/harrysxavio/cd-simulator/actions/runs/39154195220) y [Chromium #39154195207](https://github.com/harrysxavio/cd-simulator/actions/runs/39154195207) aprobados.
- [x] [Pages v11.65 r174 #39154195750](https://github.com/harrysxavio/cd-simulator/actions/runs/39154195750) y [HTTP público #39154195210](https://github.com/harrysxavio/cd-simulator/actions/runs/39154195210) aprobaron HTML, CSS, JS y `release.json`.
- [x] README y plan maestro cerrados con evidencias. **Siguiente: M7-37**, legibilidad e interpretación de resultados.

**Límites:** laboratorio sintético, no WMS, rentabilidad ni entrega garantizada. Costos integrales y traslados de reserva no calibrados; evaluación con Android físico/TalkBack sigue pendiente de M7-38.
