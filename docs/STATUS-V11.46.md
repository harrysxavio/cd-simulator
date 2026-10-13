# Estado v11.46 · M4-17 · Costos de capacidad operativa aplicada

**Plan maestro:** [43 microfases](EXECUTION-PLAN-43.md). **Estado inicial:** cambio propuesto; comprobar Node, Chromium, integración y publicación antes de cerrar.

## Alcance y decisión de modelado

El comparador de recuperación `recoveryComparison()` antes imputaba
**CLP 70.000 por cada uno de los 13 días** al seleccionar refuerzo,
aunque no hubiese tareas de Picking ni despachos posteriores.
No había evidencia de jornadas efectivamente aplicables ni
de capacidad ociosa. También mezclaba en la descripción
la selección de refuerzo con una obligación de pago.

La opción de refuerzo ahora representa **capacidad de pedidos
adicional contratada a demanda por jornada**. En una jornada
con al menos una preparación (Picking) o expedición observada,
se activa y cobra la tarifa diaria completa, incluso cuando los
cupos contratados quedan parcialmente ociosos. Si no existe
ninguna tarea de esos tipos, no se activa ni cobra un refuerzo.
No se simulan contratos con cobro fijo por toda la campaña.

## Entrega

- `src/sku-operational-cost.js`: lectura inmutable de la **misma
  ejecución de eventos SKU** que calcula pedidos y fechas.
  Registra, para cada día, activación, cupos extraordinarios
  reservados, utilizados sobre capacidad base, ociosos, y CLP.
- Tarifas desde el catálogo único M4-14; `extraLabor` y el
  costo incremental de recuperación reutilizan exactamente
  el total conciliado de jornadas. No existe doble contabilización.
- Se preserva el costo completo si la jornada se activa aunque
  no se necesiten todos los cupos: el usuario puede observar
  sobreinversión y horas/capacidad ociosa **sin inventar horas**.
- La capacidad está expresada en máximo de pedidos por día,
  no número de operarios, jornada laboral en horas ni tarifa
  salarial validada: esos datos figuran `null` por ausencia
  de evidencia.
- `campaignSnapshot()` incorpora `operationalCost` y el
  control `checks.operationalCost`, sobre los mismos días
  y movimientos. No se agrega un segundo replay.
- Panel plegable en la sección SKU para consultar costo de
  refuerzo, días activados, cupos adicionales y ociosos,
  y detalle diario, sin saturar el móvil.
- Pruebas Node: sin refuerzo; trabajo concentrado en un solo
  día y jornadas restantes sin cobro; inventario totalmente
  faltante que impide trabajos; capacidad base cero; staging
  con Transporte bloqueado pero Picking real; ociosidad que
  sí debe costar; validación de fechas/capacidades adulteradas
  y consistencia del resultado incremental.
- E2E Chromium: panel cerrado al inicio, ver cifras y días,
  lectura compacta en escritorio/teléfono (360/412 px).

## Limitaciones económicas

No se conoce la dotación real de personal por SKU, turnos en
horas, salarios, consumibles, fletes, costos basales de
Recepción/Calidad/Inventario/Picking/Transporte ni comprobantes
de pago. La lectura calcula únicamente **refuerzo incremental
didáctico**, no el costo total de operación ni el flujo de caja
bancario. Tampoco se suma la economía SKU a la jornada agregada.

La regla de activación a demanda es un **supuesto nuevo** de la
simulación didáctica; escenarios v11.45 y anteriores cobraban
todos los días al seleccionar refuerzo. Por ello el resultado
incremental de alternativas con refuerzo puede cambiar sin
cambiar pedidos ni stock físico. No se migran pagos pasados.

## Próximo paso

**M4-18:** ingresos potenciales por pedidos expedidos y
estado económico de la cohorte, distinguibles de pagos,
resultado contable y caja real, sin contar dos veces compra,
inventario ni refuerzo. **M4-19:** auditoría integrada y
escenarios extremos económicos.

## Puerta de cierre

1. Regresión Node y Chromium (rama de PR) aprobadas.
2. PR integrada en `main` y ambas suites repetidas verdes.
3. GitHub Pages v11.46/revisión 155 desplegado y verificable
   por HTTP público.
4. Android físico/TalkBack continúa como validación M7.

**Evidencia de cierre:** pendiente al crear este documento.
