# I2-35.8b — Compras e Inventario con decisiones adicionales en jornada 3

**Fecha:** 5 de noviembre de 2026. **Estado:** implementación candidata, pendiente de CI, publicación y aceptación humana.

## Problema de experiencia y operación
En las misiones con interrupción de muelle, después de la respuesta inicial el gerente todavía tenía pocas decisiones. El diario mostraba las colas, pero no dejaba aprovechar lo aprendido para autorizar una compra o mover existencias en un día posterior. No basta con poner botones: cada orden debe cambiar SKU, fechas y compromisos bajo el motor físico único.

## Comportamiento implementado
Durante la jornada **3** (después de observar la parada de Recepción del día 2), si la acción no fue contratada antes, el juego ofrece:

1. **Compras — Compra urgente con llegada al muelle día 4.** Evalúa faltantes por SKU respecto a la demanda observada, stock original y compras iniciales. Antes de confirmar muestra unidades SKU solicitadas, principal CLP, recargo didáctico y monto total comprometido (no factura ni pago). La llegada no garantiza recepción, liberación, Picking ni expedición.
2. **Inventario — Traslado de reserva preexistente a la zona de preparación en día 4.** Solo cuando el jugador separó **25 % del stock inicial en RESERVA-CD** antes de revelar demanda y no comprometió previamente ese traslado. Muestra cuántos SKU están reservados. **No compra stock ni inventa costo de traslado**: este costo sigue sin calibrar.
3. **Recepción — Turno adicional día 4** (I2-35.8a), sigue operativo y se puede combinar con las otras dos intervenciones si no se había contratado antes.

Las ofertas son independientes. Abrir/cancelar un diálogo no modifica el guardado. Confirmar una acción recompone una **única simulación física** con todas las decisiones acumuladas. Las órdenes originales del proveedor, demanda observada, semilla y apertura SKU no cambian.

La oferta y la nueva bitácora **no anticipan un segundo incidente**. Si la misión tiene dos incidentes, las órdenes del día 3 se conservan al llegar a la segunda decisión.

## Control de causalidad temporal
`src/i2-day3-supply-followups.js` usa `i2CompareMultiRecovery`, `i2ConfirmMultiRecovery`, `i2DailyOperationsSnapshot` y el mismo evento simulado con FIFO y balances SKU. El contrato **rechaza** confirmación después del día 3, compras o traslados repetidos, y reserva no preparada.

**Invariante principal:** el ledger físico de los días 0, 1, 2 y 3 permanece idéntico antes/después de autorizar una orden para el día 4. Se compara el snapshot observado y el ledger de días 0–3, las POs originales, demanda y clave del baseline. Cualquier divergencia cancela la orden.

Los marcadores `purchaseFollowupIssuedDay=3` y `reserveFollowupIssuedDay=3` son metadatos de emisión, validados al cargar y derivados en la bitácora; no duplican existencias ni almacenan un resultado precalculado. Todos los cálculos del costo de la compra vienen del catálogo SKU. Se conserva el marcador del turno de Recepción original o tardío, y los marcadores de Compras/Inventario en el segundo incidente.

## Pruebas y criterios de aceptación
- `tests/i2-day3-supply-followups.test.mjs`: falta física, CLP, originalPurchaseOrders, inventario reservado, días 0–3 idénticos, combinación de Compras+Inventario+Recepción, guardado, segundo incidente, rechazo de duplicaciones y fecha forjada.
- `tests/browser-i2-day3-supply-followups.e2e.mjs`: 320×568, misión reproducible, dos ofertas, cancelación sin escritura, confirmación de ambas órdenes, día 3 intacto, jornada 4, recarga, sin overflow.
- Mantener todas las suites de regresión Node, verificación I2 y Chromium completas; verificar GitHub Pages/HTTP después de fusionar.
- QA humano Android y aceptación didáctica pendientes.

## Fases
Esta es **I2-35.8b**: una microfase funcional de la fase principal **I2-35**, que sigue abierta junto a I2-36–40. Permanecen **35/41 fases principales** completadas.

**Pendiente para simulador completo:** refuerzo de Picking fechado con costo real, reglas posteriores para Calidad/Transporte y decisiones Comercial/Planificación sobre compromisos futuros. Además, centro de mando más dinámico y menos formularios, misiones causales diversas, contraste de aprendizaje, test Android/TalkBack y lanzamiento final. No confundir esta entrega con **ocho nuevas acciones diarias**; son nuevas opciones reales en una jornada concreta.

Juego público: https://harrysxavio.github.io/cd-simulator/juego/
