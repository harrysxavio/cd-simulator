# Estado v11.36 · M3-12a · Núcleo físico de staging

**Plan maestro:** [43 microfases](EXECUTION-PLAN-43.md) · [issue #21](https://github.com/harrysxavio/cd-simulator/issues/21)

## Entrega pequeña, integrable sin romper el recorrido actual

La dependencia M3-12 se divide para evitar actualizar simultáneamente el motor, la contabilidad física, los informes y la interfaz. **M3-12a** implementa una ruta aislada activable explícitamente mediante `eventSimulation({separateTransport:true})`. El modo normal de los usuarios sigue siendo `false`.

- Picking prepara pedidos completos con BOM SKU, capacidad de unidades físicas y fecha. Traslada las unidades de PICK-FACE a **STAGING-CD**: salen de la zona disponible para Picking, pero **siguen dentro del CD**.
- Transporte despacha posteriormente solo pedidos ya preparados, en orden FIFO de preparación, respetando su **capacidad diaria independiente**. Con capacidad de transporte cero puede haber preparados en staging y **cero expediciones**.
- Cada día registra `stagingOrders`, `stagingUnits`, `stagingStock`, `pickEvents`, `shipmentEvents`. `ordersDetail` conserva `pickedDay` y `fulfilledDay` por separado.
- El stock físico de cierre se conserva incluyendo staging: `apertura + recepciones = despachos + PICK-FACE + STAGING-CD + RESERVA-CD + Calidad`, por SKU.
- `src/staging-ledger.js` audita automáticamente el modo experimental y rechaza pedidos alterados, despachos sin Picking, etapas anticipadas, cantidades extra, saldos negativos o capacidad excedida. Sus resultados son inmutables.
- Pruebas Node y Chromium revisan transporte cero/lento, Picking cero, stock de Calidad, reserva, fracción no verificable, reproducibilidad, integridad de datos, motor tradicional y navegador móvil.

## Límites importantes

**No se ha activado el modo nuevo en la aplicación.** La campaña canónica (`campaignSnapshot`), el libro general de Inventario, los KPI y las ocho áreas continúan leyendo el modo de despacho conjunto, para evitar saldos incompatibles. **M3-12b** migrará esos consumidores al staging real, y **M3-12c** mostrará en móvil los pedidos preparados, en espera y expedidos con pruebas completas. La preparación no prueba despacho ni entrega al cliente; no hay costos de staging o carga simulados.

## Estado de microfases

| Fase | Estado |
|---|---|
| 00 · Certificación HTTP de Pages | 🟡 Pendiente |
| 01–03, 04a–04b, 05–11 | ✅ Código/CI/merge hasta v11.35 |
| 04c–04d | ⏳ Dependencias de M3-12b/c |
| 12a · Núcleo staging | 🔵 En rama v11.36; CI y merge aún no verificados |
| 12b · Integrar campaña, Inventario y métricas | ⏳ Siguiente |
| 12c · Activar y explicar interfaz | ⏳ Posterior a 12b |
| 13–42 | ⏳ Pendiente de cierre, con avances parciales anteriores |

**Regla de salida:** no integrar sin Node y Chromium verdes para el mismo SHA. Certificación HTTP pública separada.
