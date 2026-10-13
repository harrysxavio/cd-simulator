# Estado v11.51 · M5-22 · Compra urgente SKU con estados físicos y financieros separados

**Plan maestro:** [43 microfases](EXECUTION-PLAN-43.md). **Estado inicial:** desarrollo propuesto; se cierra únicamente con Node, Chromium, merge, Pages y HTTP públicos aprobados.

## Propósito y frontera

El costo de compra, el plazo del proveedor, el ingreso efectivo a bodega y el uso posterior de los SKU son eventos **distintos**. Antes de M5-22 ya existían órdenes originales y extraordinarias, trazas de Recepción, Calidad e inventario (M3/M4), pero no una lectura didáctica **por PO urgente y por SKU** que uniera esos estados. La interfaz titulaba erróneamente «día de recepción» al día de **llegada prevista al muelle**; M5-22 corrige esa confusión.

## Implementación

- Nuevo módulo `src/recovery-urgent.js`: `urgentPurchaseTraceReadModel()` recomputa el faltante teórico de cada SKU desde la mezcla real congelada de pedidos, el stock inicial y las cantidades de proveedor original comprometidas para entrega. Aplica el porcentaje de cobertura seleccionado y coteja el resultado con las PO extraordinarias reales de la misma campaña.
- **La regla actual de faltante descuenta todas las entregas originalmente comprometidas por el proveedor, incluso si llegarán después del corte**. Esto evita restarlas de nuevo como nuevos pedidos, pero **no constituye una optimización por plazo**. Una futura recomendación de compra debe distinguir el faltante por fecha para no prometer rescates irreales ni sobrecomprar.
- Cada `URG-...` y SKU conserva cantidad, costo estándar, compromiso principal, día supuesto de llegada al muelle, unidades en tránsito al corte, espera de Recepción, ingreso físico por lotes, unidades liberadas de Calidad y unidades aún retenidas.
- Conciliaciones principales: **comprometido = llegó al muelle + sigue en tránsito; llegó = recibido + espera en muelle; recibido = liberado de Calidad + retenido**. Las fechas y cantidades se comprueban en los mismos eventos ya usados por los libros de proveedor, recepción, Calidad e inventario, sin crear un segundo replay.
- Comprobación de identidades de PO, cantidades, fecha de llegada, costos, recargo hipotético, recibos y lotes. Rechaza insumos falsificados o duplicados. No supone pago, factura, despacho confirmado de proveedor ni ETA contractual.
- `campaignSnapshot()` incorpora el objeto congelado `urgentPurchase` y `checks.urgentPurchase`, también con saldo cero verificable para alternativas sin compra.
- Panel plegable, visible al seleccionar «Compra urgente» o «Compra urgente + refuerzo»: cifras esenciales en líneas breves, un desplegable por SKU y otro para fechas diarias. La guía ahora identifica correctamente el **día previsto de llegada al muelle**, no una fecha garantizada de recepción en bodega.
- Pruebas `tests/recovery-urgent.test.mjs`: cobertura parcial y 0 %, proveedor/Recepción bloqueados, calidad retenida, llegada posterior al día final, compras sin faltante, refuerzo junto a compra, compromisos originales intactos, alteraciones de orden/fechas/importes y ausencia de pago comprobado.
- E2E Chromium escritorio/teléfono con panel cerrado al inicio, tres SKU, 13 días, controles de al menos 44 px y sin desplazamiento horizontal a 360/412 px.

## Qué NO afirma

- **Llegada al muelle ≠ ingreso al CD ≠ liberación Calidad ≠ stock pickable ≠ expedición del CD ≠ entrega al cliente**. Las unidades liberadas de Calidad todavía dependen de verificación en Inventario y de la demanda/picking.
- Las PO urgentes se suponen totalmente abastecidas por el proveedor dentro del modelo, pero no hay confirmación real; los retrasos adicionales de terceros ni cancelaciones de PO extraordinarias no están simulados.
- Un aumento de pedidos expedidos frente al baseline **no significa que todos esos pedidos utilicen exclusivamente unidades de compra urgente**: el stock inicial y compras originales se mezclan, y la opción combinada puede recuperar pedidos por capacidad adicional.
- **Compromiso principal + recargo supuesto ≠ salida de caja confirmada**. Las facturas, vencimientos y pagos reales no constan.
- No se suman los importes SKU al simulador agregado de jornada, ni se altera el motor físico de eventos ni el valor de inventario M4.

## Próximo hito

**M5-23: reserva interna**, trasladar unidades reales desde RESERVA-CD a PICK-FACE en una fecha auditable, sin sumar stock nuevo ni comprar dos veces. Después M5-24 refuerzo y M5-25 combinación.

## Puerta de cierre

1. Regresión Node y Chromium de PR verdes.
2. Fusión y ambas suites de `main` verdes.
3. GitHub Pages **v11.51 revisión 160** desplegado y verificación HTTP pública aprobada.
4. Android físico/TalkBack continúa pendiente para M7.

**Evidencias de cierre:** pendientes de verificación.
