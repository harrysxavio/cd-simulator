# I2-24 · Picking: pedidos completos por BOM, no solo unidades

**F5 área 7/8, integración condicionada a CI.** Este PR fue rehecho sobre `main` para **reutilizar** el tutorial de Nico y las ocho guías gerenciales incorporadas por [PR #114](https://github.com/harrysxavio/cd-simulator/pull/114). No se crean sistemas de ayuda duplicados.

## Qué agrega Picking

- Supuestos canónicos V1: 1.400/2.300/3.000 unidades SKU preparables por jornada y tope físico avanzado adicional 10/40 SKU/día cuando esté configurado. Son **capacidades**, no productividad medida en personas/hora.
- Acción «¿Por qué simulamos tres SKU y doce días?», basada en `ORDER_TEMPLATES` y `SKU_CATALOG`: cuatro clases de pedido con sus combinaciones A/B/C, incluido el pedido mixto **2×A + 1×B + 1×C**. Si falta cualquiera, no se cuenta como pedido preparado completo.
- La vista previa solo conoce la capacidad elegida y los ejemplos didácticos del catálogo. No calcula resultados futuros ni anticipa shock.
- Después de revelar, la lectura audita pedidos completos (`comparison.base.ordersDetail`), preparación y expedición por `pickEvents` y `shipmentEvents` con identificador de orden, `pickId`, BOM y fecha por jornada 0–12. Prueba conservación por plantilla y modo de staging físico separado.
- **Importante:** el detalle de Picking está etiquetado **«plan original sin recuperación»**. El resumen de la campaña puede incorporar la intervención del jugador; no son cifras intercambiables ni deben sumarse. Pendiente de preparación no se atribuye automáticamente a una sola área.
- Un producto SKU no es un pedido: 3 SKU y horizonte hasta día 12 permiten aprender completitud, plazos, colas y corte. Día 13 no rescata pedidos de una campaña que cierra día 12. Despachado no implica entregado al domicilio.

## Qué se reutiliza del plan ya implementado

- [PR #114](https://github.com/harrysxavio/cd-simulator/pull/114): tutorial saltable y reabrible de siete capítulos, fichas extensas de Nico para ocho áreas, tres niveles, sin cambio de semilla ni elección. I2-24 **no repite** estos módulos y solo amplía la explicación de BOM/tiempo y resultado físico en Picking.
- [Revisión pedagógica y gerencial vinculante](I2-REVISION-PEDAGOGICA-GERENCIAL-2026-10-26.md): conserva **41 IDs**, evitando añadir fases artificialmente.
- I2-28–30 **pendientes**: recuperación con 0/1/varias acciones compatibles ejecutadas conjuntamente en el motor original, nunca sumando beneficios de acciones individuales.
- I2-31–35 **pendientes**: «La mirada de Nico como gerente» sobre hechos y compensaciones reales del resultado, semáforos servicio/tiempos/costo/capacidad con fuentes y sin inventar costo total.

## Aceptación

- Unit: 5 seeds × 3 dotaciones, 4 BOM canónicas, 0 spoilers, paridad del ledger original, staging separado y rechazo de `pickEvents` adulterados.
- E2E Chromium móvil: tutorial PR114 accesible, elección Picking, indicador BOM, detalle sin pre-reveal de demanda, resultado baseline rotulado, V1 intacta, CTA fijo y cero overflow exterior 320–740 px.
- CI Node general, I2 focused y Chromium general **verdes antes de merge**. Luego actualizar `docs/I2-STATUS.md` y `docs/I2-PLAN-MAESTRO.md`, verificar Pages/HTTP y seguir con I2-25 Transporte.
