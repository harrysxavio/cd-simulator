# Estado v11.37 · M3-12b · Staging conciliado con campaña física

**Plan maestro:** [43 microfases](EXECUTION-PLAN-43.md) · [issue #21](https://github.com/harrysxavio/cd-simulator/issues/21)

## Incremento cerrado en código, pendiente de CI al abrir PR

- `recoveryComparison({separateTransport:true})` ejecuta exclusivamente la **rama recuperada** con capacidades Picking/Transporte separadas. La comparación base y los compromisos de compra original permanecen iguales. La estimación de tenencia incluye también las unidades físicamente en STAGING-CD; sin introducir una tarifa nueva.
- `campaignSnapshot` registra eventos de preparación y expedición con días distintos; tres estados únicos por pedido: **pending → staged → shipped**. Cada SKU transferido PICK-FACE → STAGING-CD y luego despachado tiene un movimiento canónico enlazado por pedido.
- `physicalInventoryReadModel` concilia por SKU/día: **apertura + recibido = expedido + PICK-FACE + STAGING-CD + RESERVA-CD + Calidad retenida**. Picking descuenta stock verificable de PICK-FACE al preparar; el despacho consume solo STAGING-CD. No se pierde stock por verificación ni se duplica reserva.
- `pickingOrderReadModel` usa el mismo libro `stagingIntegrityReadModel` (sin segundo replay): pedidos preparados, en staging y despachados. La cola admite transporte cero y despacho en día posterior.
- `campaignAreaReadModel` ofrece vistas ya conciliadas para ocho áreas cuando la comparación usa staging experimental, incluyendo cola, día y capacidad. Sigue mostrando el modo tradicional en el flujo normal de usuario, hasta M3-12c.
- Pruebas Node: 0 de Transporte con Picking positivo, transporte limitado y despacho posterior, stock por SKU/día, movimientos falsos o removidos, estados de pedidos, compromisos originales inmóviles y modo tradicional.
- Pruebas Chromium: reconstrucción de campaña y ocho áreas experimentales en desktop/Pixel 7 mediante módulos del navegador, sin activar el staging en la pantalla principal.

## Límites y aceptación

**Aún no hay interfaz visible de staging**: se habilitará y explicará en M3-12c, junto con pruebas móviles del flujo completo y persistencia. Tampoco se certifica todavía que GitHub Pages sirva v11.37 por HTTP; una CI local verde no prueba despliegue. No mezclar unidades SKU con pedidos completos, valor económico agregado ni entrega final al cliente.

| Fase | Estado |
|---|---|
| 00 · Pages HTTP | 🟡 Sin certificación externa |
| 01–03, 04a–04b, 05–11 | ✅ En main, aprobadas |
| 12a · Núcleo opt-in staging | ✅ PR #34, v11.36, Node+Chromium |
| **12b · Registros, Inventario y ocho áreas** | 🔵 v11.37 en rama, CI y merge pendientes |
| 12c · Activación UI y persistencia | ⏳ Siguiente |
| 04c/04d · Retirar modelos físicos paralelos | ⏳ Tras M3-12c |
| 13–42 | ⏳ Pendientes de cierre, con avances parciales |

**Siguiente paso de producto:** M3-12c activa la opción validada en el recorrido real; los indicadores deberán mostrar *pedidos sin preparar*, *preparados en staging* y *expedidos*, con comportamiento compacto en Android y reinicio persistente.
