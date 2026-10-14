# Estado v11.54 · M5-25 · Acciones combinadas sin suma ficticia

**Estado de microfase:** en validación, pendiente CI PR y cierre formal. **Plan maestro:** [43 microfases](EXECUTION-PLAN-43.md).

## Propósito

Comprar SKU urgente y reforzar capacidad son acciones que modifican simultáneamente la misma cadena física. No se deben sumar los pedidos recuperados por cada alternativa independiente: compiten por los mismos SKU, órdenes, calendario, recepción, calidad, picking y transporte.

## Implementación

- `src/recovery-combined.js`: lectura inmutable de los **cuatro escenarios ya calculados**, esperar, compra, refuerzo y ambos. Rechaza bases, manifiestos originales, parámetros, modos staging y fechas incompatibles.
- El escenario combinado tiene su **propio replay SKU**, ejecutado una sola vez por `recoveryComparison({option:'combined'})`, y lo reutiliza la caché `skuSession`. La lectura no ejecuta otro motor ni añade entregas.
- Compara pedidos completos expedidos, pendientes y cronología día 0–12. Muestra la interacción de modelo: delta de ambos juntos menos deltas individuales. Puede ser positiva, cero o negativa; no es un pedido adicional ni inferencia causal real.
- El compromiso extraordinario SKU aparece una sola vez en ambas alternativas con compra, no duplica compra original. El costo conjunto = principal urgente + recargo supuesto + jornadas extra **activadas** en el replay conjunto; no se factura dos veces Picking/Transporte.
- Panel compacto plegable en el comparador, con cifras simples y detalle por día bajo demanda.
- Pruebas: mismo baseline, un solo inventario por SKU, recepción/control, staging bloqueado, compra con plazo fuera del corte, costos conciliados, duplicaciones y alteraciones maliciosas rechazadas. Chromium revisa escritorio y 360/412 px.

## Límites didácticos

- Los incrementos son **expediciones desde CD**, nunca ventas facturadas, pagos ni entregas al cliente confirmadas.
- Los costos son supuestos SKU; no son rentabilidad contable ni caja realmente pagada.
- Diferencia contrafactual dentro de este motor **no demuestra causalidad externa** ni asigna unidades precisas a cada componente.
- La jornada agregada permanece independiente del horizonte SKU.

## Puerta de cierre

- PR con Node y Chromium: pendiente.
- Merge main más Node y Chromium: pendiente.
- Pages y HTTP reales v11.54 revisión 163: pendiente.
- Android físico/TalkBack: pendiente M7.
- **Siguiente M5-26:** comparador consolidado antes/alternativa/diferencia con órdenes, plazos, restricciones y costos.
