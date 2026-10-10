# Estado v11.34 · M3-10 Inventario físico SKU

**Plan:** [43 microfases](EXECUTION-PLAN-43.md) · [issue #21](https://github.com/harrysxavio/cd-simulator/issues/21).

## Implementación

- `src/inventory-ledger.js` construye una lectura inmutable desde **el mismo** replay de pedidos y movimientos. Para cada SKU y cada día comprueba la igualdad entre apertura, recepción desde proveedor, liberación de Calidad, reserva, traslados internos y consumo de pedidos despachados.
- **Ubicaciones físicas**: `PICK-FACE`, `RESERVA-CD` y stock bajo control de Calidad. Cada SKU cierra sin saldos negativos ni cantidades duplicadas. Los traslados solo cambian ubicación.
- **Verificabilidad**: una porción del stock en `PICK-FACE` puede no estar verificada para Picking. Ese producto existe físicamente y no es pérdida, merma o ajuste contable. Solo la porción verificable permite preparación bajo el modelo vigente.
- **Movimientos**: cada registro canónico `inventoryMovements` debe tener exactamente su evento original (ID, tipo, fecha, SKU, lote u orden y cantidad). Se rechazan eventos falsos o repetidos.
- `campaignSnapshot` comparte `inventoryLedger` con `campaignAreaReadModel`. La explicación móvil de Inventario y el detalle diario diferencian stock físico y verificabilidad sin sumar tarjetas.
- **Node**: conservación diaria y por SKU, reserva, exactitud cero, Calidad al 0%, manipulación de movimientos y reproducción determinista. **Chromium**: navegación, recarga y vista en 360/412 px.

## Límites

Este modelo no añade ajustes de inventario, conteo real, pérdida ni devoluciones. El stock no verificable se estima didácticamente, no significa que se haya descubierto un faltante. Picking y Transporte aún comparten un solo despacho físico. La contabilidad agregada sigue separada.

## Estado

| Microfase | Estado |
|---|---|
| 00 · Verificar HTTP público | Pendiente; CI local no prueba despliegue de Pages |
| 01–03, 04a–04b, 05–09 | Código integrado, CI verde, merge hasta v11.33 |
| 04c–04d | Pendientes, dependen de M3 Picking/Transporte |
| **10 · Inventario** | Implementada en rama v11.34; CI y merge por comprobar |
| 11–42 | Pendientes de cierre, conservar logros parciales |

**Siguiente:** M3-11 Picking físico separado, con preparación por pedido y capacidad, sin presumir expedición hasta que Transporte lo reciba. Hacerlo en microentregas verificables.
