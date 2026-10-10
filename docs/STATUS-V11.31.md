# Estado M3-07 · v11.31 — Compras y proveedores

**Plan maestro:** [43 microfases](EXECUTION-PLAN-43.md) · [issue #21](https://github.com/harrysxavio/cd-simulator/issues/21)

## Lo implementado

- **Nuevo `src/supplier-ledger.js`**: una fila inmutable por orden de compra, ligada al proveedor modelado y a cada recepción física por `purchaseOrderId`.
- **Original y urgente separados**: cantidad solicitada, cumplimiento/faltante de proveedor, día de llegada simulado, días extra frente al plazo base de catálogo para órdenes originales, mercancía que llegaría durante el período, mercancía en tránsito fuera del corte, unidades ingresadas por lote y cola esperando capacidad de Recepción.
- **Reconciliación física por PO**: llegada modelada = ingreso efectivo al CD + cola de Recepción; cumplimiento proveedor = llegadas en el corte + fuera del horizonte; pedido = cumplimiento + falta de proveedor. El sistema rechaza recepción anticipada, exceso recibido, orden/lote inexistente o identificadores repetidos.
- **Mismo modelo de ocho áreas**: Compras explica fill-rate, tránsito, cola e ingresos; Recepción muestra lo que sí ingresó y lo que espera en el muelle. Las evidencias son `supplierLedger.rows`, `supplierLedger.totals` y `receipts`; no se recalculan pedidos, compras ni movimientos.
- **Conciliación cruzada**: `supplyBridge` compara el libro canónico de órdenes+recepción con `skuProcurementReconciliation`, sin introducir un segundo inventario.
- **Experiencia en teléfono**: modifica el contenido de las áreas ya existentes, sin sumar KPI gigantes o paneles nuevos.

## Límites importantes

El proveedor **no está integrado con un sistema real**: las fechas de llegada y cumplimiento son hipótesis deterministas del simulador. «Llegó al muelle» es un hito simulado, no un ASN, comprobante de transportista ni recepción real. Una orden no es pago y llegar no habilita stock automáticamente. Los SKU no se suman a equivalentes de jornada. La separación física Picking/Transporte y la contabilidad de la cohorte continúan pendientes.

## Puertas y estado verificable

| Microfase | Estado | Evidencia |
|---|---|---|
| 00 | 🟡 Pendiente de prueba HTTP pública | HTML, manifest y JS accesibles con versión correcta desde Pages; la URL no fue accesible en la consulta externa |
| 01–03 | ✅ Código, CI, merge | PR #20, #22, #23 |
| 04a–04b | ✅ Código, CI, merge | PR #25, #26 |
| 05 | ✅ Código, CI, merge | PR #27 |
| 06 | ✅ Código, CI, merge | PR #28, v11.30 |
| 07 | 🔵 Implementada en rama v11.31 | Node + Chromium, merge y Pages aún por verificar |
| 04c–04d | ⏳ Pendientes | Separación física de picking, transporte y reporte |
| 08–42 | ⏳ Pendientes de cierre | Conservar adelantos históricos y ejecutar cada validación |

**Pruebas nuevas:** reconciliación proveedor/recepción con corte 2 y 12 días, fill parcial, capacidad de Recepción igual a cero, despacho urgente posterior al cierre, compra original congelada bajo shock, rechazo de lotes y órdenes falsificadas, navegación y recarga móvil/desktop.

**Siguiente entrega:** M3-08 Recepción. Exigir movimientos explícitos por muelle, lotes, cola y tiempos de ingreso; conservar stock físicamente solo después de un evento de recepción válido.
