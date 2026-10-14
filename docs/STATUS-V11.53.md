# Estado v11.53 · M5-24 · Refuerzo de capacidad SKU y costo por jornada

**Plan maestro:** [43 microfases](EXECUTION-PLAN-43.md). **Estado inicial:** en validación. Esta fase requiere Node, Chromium, PR merge, Pages e inspección HTTP públicos aprobados antes de marcarse como completada.

## Alcance real

El motor de eventos `eventSimulation()` ya aplica un límite máximo de pedidos por jornada y `operationalCapacityCostReadModel()` ya cobra el refuerzo de forma simplificada. **M5-24 no vuelve a simularlo**: añade el auditor inmutable `src/recovery-capacity.js` que contrasta ambas fuentes contra los pedidos preparados y expedidos en el mismo libro físico canónico.

- Distingue capacidad base por etapa (pedidos/jornada), capacidad adicional asignada, cupos utilizados por encima del máximo base, cupos ociosos y costo CLP de cada jornada activada.
- Una única capacidad máxima compartida se aplica al límite de órdenes de Picking y salida; **NO se cobran dos turnos** por pasar un pedido por ambos procesos. No se simula dotación diferenciada de Picking/Transporte.
- Un turno es **supuesto activado** si hubo trabajo de Picking o expedición ese día. Si se activó, tiene costo completo aunque no supere la capacidad original. Sin actividad no se activa ni cobra. No equivale a contratación real de trabajadores o nómina pagada.
- Contrasta por día, contra el baseline congelado, los pedidos preparados/expedidos. Un incremento de pedidos totales no puede asignarse a la capacidad adicional si la opción combinada también cambió compras.
- Si las restricciones de inventario, Recepción, Calidad, Picking físico o Transporte evitan trabajar, aumentar el límite de pedidos no inventa unidades ni despachos.
- Integra `capacityTrace` y `checks.capacityTrace` en `campaignSnapshot()`. Las opciones sin refuerzo también muestran trazas verificables de cero capacidad adicional.
- Actualiza el panel existente de refuerzo (sin tarjetas redundantes) para mostrar coste, ociosidad, comparación de expediciones y una alerta ante capacidad sin mejora. Incluye detalle por jornada y explicación didáctica de no causalidad.
- Pruebas Node con refuerzo útil, activado y ocioso, sin SKU disponibles, Transporte atascado con staging, opción combinada, controles de alteraciones y restricciones de unidades. Chromium móvil/escritorio revisa panel, persistencia y anchos 360/412 px.

## Límites

- **Cupos adicionales usados ≠ pedidos causados por refuerzo**. El conteo registra sobrepasar el máximo base de capacidad ese día; el impacto marginal requiere un contraste controlado y la separación entre cambios conjuntos se aborda en M5-25/M6.
- No se trata de productividad validada, empleados, salario, horas reales, flete ni compromisos de proveedores o entrega al cliente.
- El refuerzo de pedidos **no incrementa** por sí mismo capacidad física en unidades SKU de Recepción, Calidad o Transporte.
- `extraCapacityDailyCost` se utiliza en la contribución ilustrativa del SKU existente; no se crea un segundo asiento ni se suma dos veces.
- Los modelos agregado y SKU siguen separados.

## Evidencia y puerta de cierre

- PR e identificador: pendiente de anotar.
- Node regresión y Chromium PR: pendientes de comprobar.
- CI de main posterior a merge: pendiente.
- Pages versión **v11.53 revisión 162** y HTTP público: pendiente.
- Android físico / TalkBack: fuera del alcance, pendiente para M7.
- **Siguiente M5-25:** interacción de acciones combinadas sin sumar beneficios de decisiones independientes.
