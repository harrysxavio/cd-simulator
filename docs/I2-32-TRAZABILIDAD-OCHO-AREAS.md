# I2-32 · Trazabilidad física de ocho áreas y Nico (plan original)

## Alcance

Añade al resultado un panel opcional **«Las ocho áreas · sigue el pedido con Nico»** debajo de los dos KPI originales. Es un relato gerencial que muestra hechos físicos conciliados del **baseline original sin intervención**, tanto en resultado clásico como en resultado de recuperación multiacción confirmada. Nunca simula otro motor ni afirma que las colas originales sean eventos observados de la intervención.

Ocho áreas reales del plan: Comercial, Planificación, Compras, Recepción, Calidad, Inventario, Picking y Transporte. Cada una explica **para qué existe**, **hecho registrado**, **pregunta que haría Nico gerente**, **efecto posible sobre el consumidor** y **fuente del motor**. «Posible» no es causalidad demostrada; expedición CD no es entrega consumidor.

## Evidencia

`i2AreaPhysicalTimeline({state,baseline,scorecard})` reutiliza `i2ManagementDiagnosis` y la lectura única de `i2MvpPhysicalResult(option:'wait')`. El scorecard final puede venir de cualquiera de las cinco recuperaciones clásicas o de `i2ConfirmedMultiOutcome`. El resultado elegido solo se compara en **totales**, no se usa para reescribir los eventos de las ocho áreas.

- **Días 0–12**: lectura seleccionable de llegadas a muelle, recepción, cola FIFO, liberación y retención en Calidad, PICK-FACE, reserva, pendientes por verificar, pedidos preparados, staging, expedidos del día y pendientes acumulados. Validación cruzada de identidad y conservación en cada jornada.
- **SKU A/B/C**: apertura + recibidos = inventario físicamente presente al cierre + SKU expedidos. Compra comprometida por separado de ingreso y ubicación. No sumar SKU con pedidos.
- **BOM didáctica**: tres combinaciones canónicas `ORDER_TEMPLATES` con cantidades y pedidos observados; se señala cuándo es regla educativa y cuándo existe un pedido del motor.
- **Ejemplo real del escenario simulado**: `physicalExamples` del mismo `comparison.base.ledger` y `ordersDetail`, muestrea **un lote original** con `lotId`, `purchaseOrderId`, `skuId`, cantidad y día de recepción/liberación; además un **pedido original** con `orderId`, BOM A/B/C, día preparado y expedido, o ausencia explícita. Verifica las relaciones contra `quality.lots` y el catálogo de BOM antes de presentarlas. Si no hay evento, se declara «No hubo»; jamás se inventa.
- **Comparación honesta**: baseline expedidos vs intervención elegida + diferencia de pedidos, con etiqueta explícita: **No reasignar los movimientos originales a recuperación**. No es auditoría de recepción/Calidad y transporte de una recuperación futura; I2-33–35 se ocupan del aprendizaje económico y de resultados posteriores.

## Diseño y seguridad

Todas las secciones son plegables, con selector día 0..12 y lectura con `aria-live`. Etiquetas accesibles, márgenes compactos y sin scroll del documento exterior en pantalla móvil. No se persistirán eventos por orden o lote en `localStorage`; la muestra existe solo en lectura recalculada post-reveal. No expone pedidos ni tracking de clientes reales. Contrato a nivel JS con `Object.freeze` y validación de totales.

## QA

- Node: cinco semillas, recuperaciones clásicas + multiacción confirmada, reconciliación de 13 jornadas y tres SKU, lote real y BOM, plan original intacto, rechazo de adulteración y pre-reveal.
- Pixel 7/Chromium: ambos resultados, ocho tarjetas, 13 días, lote y pedido, esquema 3 SKU, sin spoilers, sin body scroll o movimiento de botón principal, V1 storage sin cambios y recarga funcional.
- Gates Node completo, I2 focused, Chromium integral antes del merge. Validación física Android/TalkBack y Pages HTTP independientes.

**Próxima I2-33:** economía parcial auditable, compra comprometida vs consumida, valor ilustrativo del material efectivamente expedido, costo incremental por pedido recuperado cuando exista divisor. I2-34/Nico e I2-35/retos quedan abiertos.
