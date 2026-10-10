# Estado v11.35 · M3-11 Picking trazable por pedido

**Plan:** [43 microfases](EXECUTION-PLAN-43.md) · [issue #21](https://github.com/harrysxavio/cd-simulator/issues/21).

## Incremento M3-11

- **`src/events.js`:** emite un **evento de Picking** independiente e identificable `PICK-ORD-xxxxxx`, antes de cada expedición del CD. Registra día, pedido completo, plantilla/BOM, unidades físicas SKU y vínculo con el despacho. No añade entradas, salidas ni consumo nuevo de inventario: continúa un solo libro físico.
- **`src/picking-ledger.js`:** lectura inmutable por pedido y día. Verifica que los componentes realmente seleccionados coincidan con la mezcla del pedido, que no haya duplicados, y que se respeten los límites diarios de pedidos y unidades SKU en Picking. Cada despacho exige un Picking previo vinculado, en el mismo día de esta etapa.
- **`campaignSnapshot`:** expone `picks` y `pickingLedger` junto con `shipments`; compara órdenes, eventos y capacidad con la simulación original.
- **Ocho áreas:** Picking diferencia pedidos preparados y unidades físicas seleccionadas; Transporte mantiene expediciones del CD, sin presumir entrega al cliente. Los detalles diarios muestran Picking vs. Transporte en una línea compacta; no se agregan paneles gigantes.
- **Pruebas:** Node verifica BOM, día, identidad, capacidad, ausencia de preparación con capacidad cero o falta de transporte, falsificación de un pedido/expedición, reproducción determinista y stock intacto. Chromium comprueba desktop, Pixel 7, recarga y anchos 360/412 px.

### Limitación explícita: todavía están acoplados

**M3-11 no crea todavía staging ni una cola independiente de pedidos preparados esperando transporte.** El evento de Picking ocurre antes del evento de salida, pero **ambos suceden el mismo día** y aún comparten la restricción operativa. El motor sigue sin representar prueba de entrega al cliente. La separación de inventario de staging y despacho independiente será M3-12; ese trabajo también desbloqueará M2-04c/04d.

## Estado previo a CI y fusión

| Microfase | Estado |
|---|---|
| 00 · Pages HTTP | 🟡 Pendiente de prueba pública de HTML, manifest y JS |
| 01–03, 04a–04b, 05–10 | ✅ Código/CI/merge en main hasta v11.34 |
| 04c–04d | ⏳ Pendiente; depende de preparación/Transporte físicamente separados |
| **11 · Picking** | 🔵 Preparado en rama v11.35; Node, Chromium y merge por verificar |
| 12–42 | ⏳ Pendiente de cierre, con avances parciales anteriores |

**Siguiente:** M3-12 Transporte físico y staging: conservar los pedidos completos que Picking termina aunque el camión no tenga capacidad, con eventos separados por día, balance de stock en proceso y salida del CD comprobable. Es un incremento mayor, por lo que dividirlo en subentregas verificables si hace falta.
