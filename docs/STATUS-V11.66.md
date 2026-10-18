# Estado v11.66 · M7-37 · ¿Qué mejoró y qué empeoró?

**Estado:** EN CURSO. Rama `feat/m7-37-readable-result-insights`. Cierre sujeto a Node, Chromium, merge a `main`, Pages y HTTP público. [Plan de 43 microfases](EXECUTION-PLAN-43.md).

## Alcance
- `src/recovery-outcome-insights.js`: read-model puro e inmutable, reutiliza `readableRecoveryResultsReadModel` sobre el comparador físico SKU M5-26 ya auditado. No duplica eventos, modificaciones, órdenes ni decisiones.
- **Tres señales comprensibles** con la misma base y horizonte: (1) más/menos/igual pedidos completos expedidos desde el CD, (2) menor/mayor/igual espera acumulada expresada en días-pedido, y (3) compromisos económicos parciales o no tarifados.
- Los mensajes son **descriptivos, no órdenes de intervención**. Una recuperación que no añade pedidos pero crea compromisos modelados produce una advertencia. Si el despacho mejora pero también aumenta la espera, se informa por separado; no se declara ganadora una alternativa a partir de un solo indicador.
- **Reserva:** costo del traslado desconocido aunque su importe proxy en la simulación sea CLP 0; **esperar:** no agregar recursos no implica que la operación total sea gratuita. Compra/refuerzo: importes son componentes modelados, no costo integral ni caja pagada.
- Límites explícitos sobre entregas al cliente, ETA de pendientes, costos/viabilidad y no mezclar unidades agregadas de una jornada con pedidos SKU de 12 días.
- `src/app.js`: tres señales compactas incorporadas en «Tu decisión frente a no intervenir», con advertencia legible y detalle expandible de límites. No agrega nuevos controles que guarden o alteren recuperación.
- `src/styles.css`: filas etiquetadas con énfasis visual semántico, lectura 360/412 px y detalle con objetivo táctil de 44 px.

## Pruebas
- `tests/recovery-outcome-insights.test.mjs`: coherencia física y espera, casos con mejora/igual/peor, espera sin intervención, reserva sin tarifa, compra sin recuperación, corrupción y congelamiento.
- `tests/browser-outcome-insights-m7-37.e2e.mjs`: Chromium móvil y escritorio, tres señales, límites, caso de reserva, persistencia intacta y no desbordamiento a 360/412 px.
- Regresión completa Node/Chromium: **pendiente**.

## Puertas obligatorias
- [ ] Node y Chromium de PR aprobados.
- [ ] Merge a `main`, Node y Chromium de `main` aprobados.
- [ ] Pages v11.66 r175 publicado y HTTP HTML/CSS/JS/release.json aprobado.
- [ ] README y plan maestro cerrados con evidencia; siguiente **M7-38**.

**Límites:** laboratorio determinista con costos incompletos; no incluye costos reales, entregas ni WMS productivo. Accesibilidad/TalkBack en dispositivo físico corresponde a M7-38.
