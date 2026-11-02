# I2-35.7a · Bitácora de órdenes operativas por jornada

**Fecha:** 02-11-2026 · **Estado:** candidato, requiere PR, CI, merge, Pages/HTTP y prueba humana.

## Problema de negocio
El gerente veía las jornadas y un radar, pero no tenía una lista explícita de órdenes comprometidas ni de cuándo debían surtir efecto. Una compra urgente o un turno adicional se confundía con una pieza ya recibida/procesada. Había un problema de trazabilidad de decisión a impacto.

## Entrega implementada
Se añadió `src/i2-dated-operational-orders.js` con la función pura `i2DatedOrdersForObservedDay(state)`. Durante el diario operativo con incidentes aparece «ÓRDENES GERENCIALES · HISTORIAL CONFIRMADO», derivado únicamente del save validado:
- **Compras:** orden urgente, porcentaje de faltante y jornada objetivo, no recepción presumida.
- **Inventario:** traslado de reserva previa con su jornada objetivo; nunca crea stock adicional.
- **Recepción:** turno adicional día 3 después de interrupción día 2; hasta 80 SKU, costo didáctico fijo $55.000.
- **Calidad:** línea certificada alternativa día 5 después de observar la segunda interrupción; hasta 80 SKU, costo didáctico fijo $70.000.
- Sin orden, muestra que el gerente decidió no intervenir. La primera decisión sigue visible cuando aparece la segunda; no se puede emitir retroactivamente.
- Estados legibles: «Pendiente de fecha objetivo», «Hoy corresponde su fecha objetivo», «La fecha objetivo ya pasó; verificar ejecución física».

El modelo **no guarda una segunda bitácora**: deriva las órdenes del registro de acciones existente. No modifica el motor de inventario, los costos, el baseline, las compras originales ni los KPI. El resultado físico debe comprobarse con radar y ledger; la fecha comprometida **no acredita** unidades recibidas ni expedidas. El CLP de compra urgente no se inventa en la tarjeta: su costo se concilia en la simulación completa.

## Ejemplos
**Básico:** un turno de Recepción autorizado al observar el cierre día 2 aparece el día 3 con fecha prevista y costo fijo, y el día 4 como «fecha objetivo transcurrida»; las colas indican si se procesó algo.

**Avanzado:** una misión combinada puede mostrar una compra urgente emitida día 2, y solo después de observar día 4 una segunda orden de Calidad con efecto día 5. El sistema nunca presenta esta segunda orden durante el día 3.

## Pruebas y aceptación
- `tests/i2-dated-operational-orders.test.mjs`: sin acción / orden de compra / turno de muelle / segunda línea Calidad / manipulación de fechas, reconciliación, objetos inmutables.
- `tests/browser-i2-dated-orders.e2e.mjs`: 320×568, pasar por las 8 áreas, revelación, decisión de turno, registro con costo $55.000, recarga idéntica, avance de jornada, sin spoilers ni overflow.
- Puertas: Node, I2 focused, Chromium completo, Pages/HTTP, aceptación humana Android.

## Siguiente incremento obligatorio (I2-35.7b y 35.8)
Esto **no crea todavía nuevas órdenes elegibles todos los días**. Esa funcionalidad requiere un comando `areaId/actionId/issuedDay/effectiveDay` validado y persistido, y un replay SKU por jornada que cambie capacidad, stock y costo real, sin editar el pasado. Priorizar Compras/Inventario/Picking y después Recepción/Calidad/Transporte. Comercial/Planificación solo sobre demanda y decisiones futuras no comprometidas. El nuevo panel de 8 áreas I2-36.16 será el punto de entrada.

**Fases padre:** 35/41 completadas. I2-35–I2-40 abiertas.

Juego: https://harrysxavio.github.io/cd-simulator/juego/
