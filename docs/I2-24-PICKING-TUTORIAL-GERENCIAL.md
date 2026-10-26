# I2-24 · Picking con BOM de pedidos completos + primera integración pedagógica gerencial

**Corte:** 25-10-2026 · **Estado:** pendiente de CI y PR; F5 área 7/8 solo al fusionar.

## Qué se incorpora

- Picking con las tres alternativas reales de V1: nominal 1.400/2.300/3.000 unidades SKU por jornada. La configuración avanzada permite, además, un tope SKU de 10/40 por jornada, mostrado como limitación separada; no se llama «productividad por persona-hora».
- Explicación visible «¿Por qué simulamos tres SKU y doce días?» basada en los cuatro `ORDER_TEMPLATES` canónicos (basic, combo, premium, bulk), las proporciones reales y los plazos del catálogo. Un pedido mixto requiere **2×A + 1×B + 1×C**. Sin una unidad C, aunque sobre A, no hay pedido completo.
- La planificación no muestra resultados futuros. Tras la revelación, la lectura de solo eventos `comparison.base.ordersDetail`, `ledger.pickEvents` y `shipmentEvents` valida pedidos enteros, identidad de `pickId`, BOM íntegra, unidades por evento, día de preparación y día de expedición.
- Cuando el motor trabaja en modo estándar, preparado y expedido coinciden por jornada; no presentar esta coincidencia como regla de operaciones reales. El modelo admite ensayo `separateTransport` con `STAGING-CD`, donde un pedido preparado puede no salir.
- Indicadores de resultado: pedidos solicitados, preparados completos, expedidos y preparados aún sin salir, con desglose de cuatro plantillas y días. Los pendientes no se atribuyen automáticamente a una única causa o área.

## Revisión pedagógica vinculante del usuario

Se implementa una **primera rebanada concreta** de [la revisión gerencial](I2-REVISION-PEDAGOGICA-GERENCIAL-2026-10-26.md), **sin declarar terminado el nuevo sistema multiactividad**:

1. **Tutorial opcional «Conocer mi misión con Nico»**, siete capítulos sobre rol del gerente, ocho áreas, viaje del pedido, 3 SKU/12 días, KPI y límites, crisis y aprendizaje. Está cerrado por defecto; en portada permite «Saltar tutorial / Empezar ahora» y en vistas de área, recuperación y cierre se puede reabrir. Ninguna apertura, lectura o cierre modifica semilla, compromiso, preferencias ni ledger.
2. **«Entender esta área con Nico · mirada de gerente»** en cada una de las ocho áreas, diferente de la pista rápida: objetivo y funcionamiento, control gerencial, KPI/denominadores, ventajas y sacrificios, ejemplo contextual y pregunta. El contenido no depende de la demanda futura.
3. **Visibilidad explícita del modelo**: un pedido es una BOM completa; 3 SKU son distintos productos físicos, no «tres pedidos»; 12 días son horizonte temporal de observación, no capacidad adicional. Día 13 no rescata una campaña que cierra día 12. Salida del CD no demuestra entrega efectiva al consumidor.

**Sigue pendiente** crear la evaluación conjunta de **0/1/varias acciones** durante recuperación en I2-28–30. Actualmente se elige una de cinco opciones de V1. Tampoco están completados «La mirada de Nico como gerente» basado en evidencia de cada partida, ni los KPI gerenciales de servicio/tiempos/capacidad/costo de I2-27 y I2-31–33. No sumar deltas de opciones individuales; el nuevo contrato exige una sola corrida canónica con acciones compatibles. F8 Android físico/TalkBack/usuario real (#67) sigue abierto.

## Validaciones obligatorias

- Unit: cinco semillas × tres capacidades, original inmutable ante emergencia, conservación de preparación/expedición en plantilla BOM, ensayo staging y rechazo de errores; tutorial siete capítulos, ocho fichas y cero spoilers.
- Chromium: ruta saltable y reabrible, Nico en ocho áreas, BOM y 12 días, planificación sin demanda revelada, resultado real, ancho 320–740px y footer fijo, aislamiento V1.
- Node general, I2 focused y Chromium general en verde antes del merge; Pages/HTTP y CI de main después del merge.

**Siguiente:** I2-25 Transporte y staging. Las acciones gerenciales combinadas no se simulan todavía.
