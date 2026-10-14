# Estado v11.52 · M5-23 · Traslado de reserva interna con conciliación física y CLP

**Plan maestro:** [43 microfases](EXECUTION-PLAN-43.md). **Microfase:** M5-23. **Estado:** en validación; no marcar completada sin checks de PR, main, Pages y HTTP públicos.

## Objetivo

La reserva no es stock nuevo ni una compra: es una ubicación dentro de la misma apertura SKU. El flujo físico existente de `RESERVA-CD → PICK-FACE` es el origen único de los datos. Se audita por SKU y día sin volver a ejecutar el motor de eventos.

## Implementación / alcance

- `src/recovery-reserve.js`: lectura inmutable de apertura reservada, traslado efectivo fechado, saldos finales, IDs de movimiento y costo estándar por SKU. Reconcilia eventos de `replay.ledger` con `reserveTransfers`, `inventoryLedger` y `inventoryValuation`.
- Verifica que cada movimiento sea único, válido, en su día supuesto y nunca supere stock reservado. Si la fecha es posterior al horizonte (día 13), el material permanece en RESERVA-CD y no se contabilizan traslados ficticios.
- Diferencia **valor estándar reclasificado** de **gasto o caja**: mover 30 unidades SKU A de una ubicación a otra no crea un costo de compra de 30×CLP 1.800. La tarifa de mano de obra por traslado NO está calibrada: su valor es `null`, no CLP 0.
- El stock inicial no tiene identificadores de lote conocidos. No se inventan lotes ni una PO adicional; `lotId:null`. En caso de disponer de trazabilidad real por lote, requeriría otro cambio modelado explícitamente.
- Integra `reserveTrace` y `checks.reserveTrace` en `campaignSnapshot()` para reserva y alternativas sin traslado, con saldo cero auditable fuera de la acción.
- UI plegable en Resultados SKU: reserva inicial, traslado, saldo, valor reclasificado, costo no calibrado, SKU y días en detalles subordinados. Mejora la explicación sin añadir tarjetas gigantes.
- Pruebas Node: conservación, fecha 2 / fuera de horizonte, reserva 0 %, otras decisiones, restricciones de Recepción/Calidad/Inventario/Picking/Transporte y staging; rechazo de falsificaciones de cantidades, fechas, ubicaciones, lotes, duplicados y valorización.
- E2E Chromium extiende el recorrido de reserva móvil y escritorio: panel cerrado al inicio, visibilidad del estado, 3 SKU, 13 días, sin desbordamiento horizontal a 360/412 px.

## Límites de interpretación

- Traslado a PICK-FACE ≠ stock necesariamente verificable ≠ Picking ≠ salida del CD ≠ entrega al cliente.
- Los SKU reservados provienen de la apertura con ubicación simulada. No existen identificadores WMS/lote de apertura, ni pagos, ni una tarifa verificada por trasladar físicamente esos materiales.
- El dinero mostrado es valor a costo estándar del material ya existente, no gasto incremental, recargo ni caja pagada.
- La comparación contra baseline muestra despachos adicionales, no atribuye causalmente cuáles SKU concretos provinieron de la reserva.
- Se conserva la frontera entre campaña SKU de varios días y jornada agregada. No se mezclan inventarios ni se suman economías entre ambos modelos.

## Puerta de cierre y siguientes pasos

1. Node regresión y Chromium en PR: **pendiente de comprobar**.
2. Merge aprobado en main y ambas suites de main: **pendiente**.
3. GitHub Pages v11.52 revisión 161 y HTTP público: **pendiente**.
4. Android físico y TalkBack: pendiente para M7; emulación no es sustituto.
5. Siguiente microfase: **M5-24**, refuerzo de capacidad aplicado solo en jornadas operativas con capacidad útil y trazabilidad de costo/ociosidad.
