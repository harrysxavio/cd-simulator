# I2-24 · Picking y pedido completo por BOM: hechos y mirada gerencial

**Alcance:** sexta? No: séptima área de F5 (Comercial, Planificación, Compras, Recepción, Calidad, Inventario, **Picking**). Se integra solo con PR + Node + focused + Chromium aprobados. Las funciones se construyen sobre las mismas ocho elecciones, 3 SKU y horizonte día 0–12 del motor V1.

## Antes de la demanda: explicar el modelo sin spoilers

En Picking el usuario consulta la capacidad nominal elegida 1.400/2.300/3.000 unidades por jornada de **referencia agregada V1**; no se convierte ilícitamente a productividad persona-hora ni a capacidad SKU física. Se muestran las BOM de las cuatro plantillas originales (básico A×2, combinado A+B, especial A+C, mixto A×2+B+C) y los plazos de los tres SKU (A: 2, B: 5, C: 10 días). Se distingue expresamente **ejemplo ilustrativo** de pedidos reales del escenario, que están sellados hasta la revelación.

La tarjeta desplegable **«¿Por qué simulamos 3 SKU y 12 días?»** explica que los pedidos requieren el kit completo y que la combinación de producto/plazo genera faltantes y colas. Nico añade un desarrollo opcional «Entender esta área con Nico · mirada de gerente»: propósito de Picking, relaciones con Calidad/Inventario/Transporte, palancas gerenciales, capacidad, costos potenciales, métricas disponibles, el efecto en la promesa de cliente y una pregunta reflexiva. Se conserva el consejo rápido opcional.

**No significa que el nuevo tutorial completo de CD y las ocho guías profundas estén terminados**: forman parte del refuerzo transversal de [corrección gerencial 26-10](I2-REVISION-PEDAGOGICA-GERENCIAL-2026-10-26.md).

## Después de la sorpresa: evidencia real del mismo replay

La lectura física `i2PickingBOMOutcome(comparison)` verifica `comparison.base.ledger.pickEvents`, `shipmentEvents` y `ordersDetail` por orderId, templateId, pickId, día y BOM real:

- pedido solo se prepara cuando se registran TODOS los SKU necesarios, no cuando se mueve una unidad suelta;
- no hay preparación duplicada, expedición de orden nunca preparada ni dos expediciones del mismo pedido;
- los SKU preparados/expedidos por jornada suman los eventos físicos y no superan el límite del motor;
- preparado = expedido + en staging; pedido solicitado = preparado + no preparado; pendiente = no preparado + en staging;
- cuando el replay actual usa modo acoplado, Picking y expedición ocurren el mismo día y **no hay staging independiente**. Solo un replay segregado con eventos genera cola real de staging.
- un refuerzo no genera stock, el cliente no está certificado como entregado, ni una compra tardía se adelanta artificialmente.

El cierre enseña pedidos preparados, expedidos, sin preparar y preparados sin salida, desglosables por tipo de BOM, SKU y jornadas. La misma base es inmutable si el usuario compara recuperaciones. En modo segregado se usa el validador físico existente `stagingIntegrityReadModel`, nunca una suma inventada.

## Límites y aceptación

- `tests/i2-picking-bom.test.mjs`: tres turnos × cinco seeds, retorno a Picking confirmado, sin spoilers, SKU completos, conservación preparado/expedido, picking con capacidad cero, transporte sin capacidad en modo segregado, rechazo de eventos alterados.
- `tests/browser-i2-picking-bom.e2e.mjs`: guía larga opcional, BOM 3 SKU/12 días, móvil, decisión/persistencia, shock sellado, resultado físico, V1 intacta y CTA sin scroll exterior.
- Tres gates antes del merge: Node general, focused I2 y Chromium general. Publicación Pages/HTTP y regressiones `main` tras merge se comprueban aparte.
- **Siguiente:** I2-25 Transporte y staging, conectado a consumidor sin inventar entrega. Posteriormente I2-26–35 tutorial ampliado, diagnóstico multiacción real y «La mirada de Nico» en recuperación/resultados. Android físico/TalkBack y pruebas con usuarios novatos siguen pendientes (#67).
