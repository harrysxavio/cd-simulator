# I2-19 · Planificación y cobertura original por SKU

**Fecha:** 25-10-2026. **Fase:** F5 (2/8 si CI y merge son verdes).

## Qué aprende y decide el usuario

La segunda de ocho decisiones usa las alternativas ya existentes en V1: cobertura parcial del 70 %, cobertura completa 100 % y colchón 110 %. El forecast de Comercial queda confirmado antes de llegar a Planificación, y el usuario ve cómo la cobertura afecta el compromiso original **de tres SKU**. No se anticipan demanda sorpresa, expedición, servicio o costo total.

La tarjeta de «Indicadores» muestra unidades SKU que se proyecta comprar, compromiso valorizado en CLP y un detalle plegable A/B/C con inventario inicial, necesidad de la política, cantidad comprometida y lead time nominal del catálogo. No presupone recepción inmediata, exactitud del stock ni llegada cierta del proveedor.

## Única fuente de cálculo

`src/i2-planning-coverage.js` llama exactamente `inventoryPolicy({policy:'balanced',orders:forecastOrders,stock:openingStock})` con la apertura SKU de `i2AdvancedPhysicalOptions`. Luego aplica la misma regla del contrato integrado: `Math.ceil(policyNeedSkuUnits * planningCoveragePercent/100)` por SKU. El pronóstico de Comercial usa `Math.round(plannedOrders * forecastPercent/100)`.

Esto es una **lectura del compromiso previsto**, no un nuevo motor de compras o una PO efectivamente emitida; no utiliza el valor de demanda real, el seed, la recuperación o un reporte de proveedor. `i2MvpPhysicalResult` solo tras el reveal expone `i2PlanningCoverageOutcome(comparison.planningCommitment)` ya congelado en el simulador integrado.

Las magnitudes son explícitas y no se suman entre unidades distintas: demanda prevista/real en **pedidos de muestra**; inventario, necesidad y compra en **unidades SKU A/B/C**; compromiso a costo estándar ficticio en **CLP**, no pago ni gasto total.

## Qué cambia y qué no

- Cambiar entre 70/100/110 % modifica la compra SKU original. El precio unitario proviene del catálogo y el costo comprometido aumenta o permanece igual con mayor cobertura; no se genera ninguna compra física antes del evento.
- Las tres alternativas respetan el forecast confirmado en Comercial y el stock inicial SKU de la configuración avanzada; no se reescribe la elección Comercial.
- Una sorpresa positiva/negativa puede alterar demanda y servicio **posterior**, pero no cantidades originales ni sus supuestos de llegada.
- Una intervención extraordinaria puede generar otro PO, pero nunca muta las compras originales.
- La tabla de compras originales se consulta opcionalmente en resultados, sin extender tarjetas del teléfono.

## Gate de cierre

- Node: `tests/i2-planning-coverage.test.mjs`, matriz 3 coberturas × 3 forecasts × 3 volúmenes × 3 stocks, paridad SKU con compra integrada, congelamiento bajo cinco seeds y cinco recuperaciones, ausencia de spoilers y fallo en manifiesto corrupto.
- Chromium móvil: `tests/browser-i2-planning-coverage.e2e.mjs`, lectura de Planificación, 70 %, registro/localStorage, sorpresa sellada, resultado y desglose SKU, viewport y botón siempre fijo, V1 intacta.
- PR: Node general, focused I2, Chromium completo y revisión de código. Postmerge: Pages, HTTP y regresiones main.

## Pendientes preservados

I2-20 profundizará **Compras y proveedor**, distinguiendo pedido al proveedor, fill rate, fecha prevista y recepción física. I2-21–25 completarán las demás áreas. F7 mantiene pendiente el tablero de costo/servicio/capacidad/espera; Android físico, TalkBack y prueba humana siguen en F8 (#67).
