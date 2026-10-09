# Estado de fases y próximos hitos · v11.19

**Corte:** 9 de octubre de 2026 · rama candidata v11.19 · **criterios por aceptación**, no porcentajes estimados sin una descomposición de trabajo fiable.

## Estado técnico M1–M8

| Fase | Estado actual | Ya existe, con evidencia | Falta para cerrarla |
| --- | --- | --- | --- |
| **M1 · Chromium E2E** | **Completada** | Flujo plan→shock→recuperación→SKU→resultado→reset y persistencia en Chromium escritorio/móvil | Validación física Android entra en M7, no invalida M1 |
| **M2 · Campaña canónica** | **Parcial** | IDs de órdenes, POs, recibos, Calidad, movimientos SKU, inventario y despachos reconciliados; PO original congelada; decisiones U2 persistidas y firmadas por escenario | Una **única campaña física inicial** para motor agregado (1 jornada) y SKU (12 días); validación tipada general, estado común |
| **M3 · Ocho áreas integradas** | **Parcial** | Restricciones Recepción, Calidad, Inventario verificable, Picking, Transporte afectan órdenes SKU. **v11.19** agrega zona RESERVA-CD derivada de stock inicial y traslado físico trazado a PICK-FACE | El agregado sigue calculando por separado; reserva sin ubicación/bin/lote verificable externo; transformar agregado en proyección de eventos, no otro motor |
| **M4 · Economía única** | **Parcial** | Conciliación de costo estándar SKU entre entrada, reservado, Calidad, libre y despacho; compromisos de compra original/adicional separados de proxy | Contabilidad/horizonte únicos; pagos vs compromisos; costos reales del traslado y días/turnos; evitar sumar motor agregado y SKU |
| **M5 · Recuperación operacional** | **Parcial** | Esperar, reforzar, urgente, combinado en SKU; decisiones confirmadas de esperar/comprar/reserva interna; simulación por día con compras y traslados en fecha | Un único libro operativo/económico para todas las alternativas; combinaciones confirmables, nuevas capacidades y compromisos prometidos |
| **M6 · Diagnóstico causal** | **Parcial** | Lectura gerencial U1 por cuello de botella, contrafactual de medidas aisladas, alertas cuando intervenir cuesta sin producir | Evaluar restricciones múltiples y combinaciones; evidencias de eventos por área y semáforos ligados a acciones |
| **M7 · UX didáctica** | **Parcial** | Misión gerente, diagnóstico narrativo, tres decisiones de recuperación en tarjetas móviles, KPI técnicos plegables, reinicio universal, 360/412 px en Chromium | Reorganizar áreas del paso Planificar, resultado narrativo U4, accesibilidad WCAG auditada, Android físico/TalkBack y usuarios reales |
| **M8 · Cierre y release** | **En curso** | CI Node, E2E Chromium y GitHub Pages; documentadas limitaciones; escenarios de aceptación de negocio y pruebas de conservación | Cierre de M2–M7, validación funcional con usuarios, guía final y versión etiquetada de presentación |

## Estado UX U0–U5

| Fase | Estado | Próximo criterio |
| --- | --- | --- |
| **U0 · Pruebas de escenarios** | **Completada** · v11.16 | Mantener como suite de regresión |
| **U1 · Diagnóstico gerente** | **Completada para alcance inicial** · v11.17 | Extender causas con evidencia diaria al completar M3/M6 |
| **U2 · Acciones físicas** | **Parcial avanzada** · U2a v11.18; U2b incrementada v11.19 | Compra PO adicional y traslado de reserva ya existentes; falta reubicación real por bin/lote, stock inter-CD, decisión de reprogramación con fecha pactada |
| **U3 · Comparar antes de confirmar** | **Parcial fundacional** | Ya hay vista previa / confirmar por acción; falta comparar varias acciones con el mismo escenario, priorización, fechas y costos conjuntos |
| **U4 · Resultado narrativo** | **Pendiente** | Semáforo por área, antes/después en un solo libro de eventos, causa y aprendizaje |
| **U5 · Pulido móvil y usabilidad** | **Parcial transversal** | Pruebas de Android físico, accesibilidad, tipografía y validación de comprensión con usuarios |

## U2b v11.19: alcance y límites exactos

**Nuevo caso:** el gerente descubre que un subconjunto *ya existente* del stock de catálogo está en la ubicación lógica **RESERVA-CD**. Ese subconjunto deja de ser accesible para Picking hasta que se decida su traslado interno a **PICK-FACE**. La simulación registra un evento de traslado por SKU y día. No hay recepción de proveedor, compra ni creación de unidades.

- Se permite definir 0 / 10 / 20 / 30 % del **stock inicial** del catálogo por SKU como reserva de ubicación; no representa una medición de una bodega real.
- En cada alternativa se compara con **el mismo inventario inicial y el mismo porcentaje de reserva**. Comparar contra un baseline sin reserva y atribuirse esas unidades sería un error experimental.
- Reserva retenida y reserva trasladada tienen el mismo valor de mercancía; ni las compras ni el flujo contable obtienen inventario nuevo. **Conservación:** inicial + recibido = despachado + retenido Calidad + libre PICK-FACE + retenido RESERVA-CD.
- Transferencia efectuada en el día configurado **antes** de preparar pedidos; una habilitación posterior al día 12 no produce recuperación en el período.
- Los saldos diarios, valoraciones, transferencia, compras originales y resultado por pedido se obtienen del mismo replay `eventSimulation`, `campaignSnapshot`, `skuAudit` y `skuProcurementReconciliation`.
- Se presenta la secuencia diaria **pedidos despachados/pendientes**. Es una proyección de salida de CD, **no** una fecha prometida o recepción del cliente. Pendientes fuera de horizonte quedan sin compromiso de fecha.
- El traslado no consume una capacidad adicional ni tiene costo interno en este incremento; **debe incorporarse** al motor de recursos/dotación antes de aconsejarlo como económicamente óptimo.
- El stock interno es una zona lógica modelada y **no proviene de escaneo de bin/lote, WMS, conteo físico ni stock de otra instalación**.
- El motor agregado **sigue separado**: no se suman 12 días de SKU con una jornada equivalente.

## Próxima secuencia recomendada

1. **M2/M3 · Convergencia física**: fuente única de stock inicial por SKU y traza diaria para ocho áreas; guardar fecha prometida/SLA como dato del pedido; modelar stock de reserva por ubicación/lote verificado, con costo/tiempo de traslado.
2. **U2c/U3 · Decisiones de servicio**: permitir priorizar pedidos con reglas visibles y reprogramar fecha comunicada al cliente sin cambiar demanda ni declarar despachos ficticios.
3. **M4/M5 · Libro económico y medidas simultáneas**: compromisos, pagos modelados (o ausentes), costos de horas/días, movimientos, costos de transporte y comparación coherente.
4. **M6/U4 · Aprendizaje**: semáforo basado en evento con explicación *qué cambió, por qué, cuánto costó*.
5. **M7/U5/M8 · Calidad final**: accesibilidad, Android real, pruebas con aprendices y experto, release documentado.

**Publicación:** considerar v11.19 solo cuando PR, suites Node/Chromium y despliegue Pages aprueben; este documento es especificación de la versión candidata mientras la CI no haya concluido.
