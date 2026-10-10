# Estado de ejecución · v11.33 · M3-09 Calidad

**Plan maestro:** [43 microfases](EXECUTION-PLAN-43.md) · [issue #21](https://github.com/harrysxavio/cd-simulator/issues/21).

## Objetivo y evidencia

La microfase M3-09 separa tres cosas que jamás deben confundirse: **ingreso físico al CD**, **stock retenido por Calidad** y **stock liberado**, sin asumir que el retenido es defectuoso o que lo liberado ya está garantizado para Picking.

- `src/events.js`: evita crear liberaciones de cantidad cero para lotes agotados, manteniendo los mismos balances físicos.
- `src/quality-ledger.js`: lectura *inmutable* de los mismos lotes físicos. Por día concilia recibos, liberaciones positivas y fechadas, inventario retenido por SKU, orden FIFO y el porcentaje de procesamiento diario configurado. Rechaza lotes duplicados, eventos adelantados, unidades en exceso, SKU falsos y retenciones incompatibles.
- `campaignSnapshot` expone `qualityLedger`, que concilia con el mismo `receivingLedger` y el replay físico, sin crear una segunda simulación.
- En el apartado Calidad de las ocho áreas se indica el ritmo de liberación, unidades y lotes pendientes, y se advierte explícitamente que **retención ≠ merma o rechazo**. La línea diaria existente muestra «Calidad liberó … SKU · retenido … SKU», sin nuevas tarjetas gigantes.
- Pruebas Node: 0 %, 100 % y liberación parcial, días 0–12, ausencia de lotes ficticios, agotamiento de stock, eventos falsificados, y compromisos de compra invariables. Chromium desktop/Pixel 7: visibilidad del flujo, retención diaria, navegación, recarga y anchos 360/412 px.

## Límite pedagógico

El porcentaje diario de Calidad es una **tasa didáctica de procesamiento**, no un porcentaje de aceptación o defectos. En esta microfase no se simulan rechazos, daños, caducidad, pruebas de laboratorio ni gastos de Calidad. La mercadería liberada puede seguir limitada por la exactitud o verificación de Inventario. Picking y Transporte continúan compartiendo el evento de despacho hasta fases posteriores.

## Estado

| Microfase | Estado | Evidencia |
|---|---|---|
| 00 | 🟡 Pendiente | Falta comprobación HTTP de GitHub Pages (HTML, `release.json`, JS). |
| 01–03 | ✅ Código/CI/merge | PR #20, #22 y #23 |
| 04a–04b | ✅ Código/CI/merge | PR #25 y #26 |
| 04c–04d | ⏳ Pendientes | M3 Picking/Transporte aún acoplados |
| 05 | ✅ Código/CI/merge | PR #27 |
| 06–08 | ✅ Código/CI/merge | PR #28, #29, #30; base v11.32 |
| **09** | 🔵 Implementada en rama v11.33 | Pendiente Node+Chromium, merge y Pages |
| 10–42 | ⏳ Pendientes de cierre | Conservar avances parciales existentes |

**Siguiente M3-10:** Inventario SKU: verificar por ubicación y SKU que la apertura, entradas desde Calidad, traslados de reserva, stock verificable/no verificable y salida de Picking concilian día a día, sin inventar ajustes ni pérdidas.
