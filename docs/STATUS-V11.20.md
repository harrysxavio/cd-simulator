# Estado de fases y entregables · v11.20

**Corte:** 9 de octubre de 2026. Documento histórico v11.20: la priorización de Resumen y la verificación pública de GitHub Pages se extendieron en v11.21.  Este estado distingue el avance de la **vista gerencial SKU**, que ya obtiene las ocho perspectivas desde un mismo libro físico, de la **unificación definitiva**, que sigue pendiente. Una etapa solo se considera completada si cumple toda su aceptación.

## Fases técnicas M1–M8

| Fase | Estado actualizado | Evidencia y deuda más importante |
| --- | --- | --- |
| **M1 — Calidad Chromium** | **Completada** | Recorrido real de navegador automatizado, escritorio/móvil emulado, reinicio, errores JS, 360/412 px. Falta Android físico dentro de M7 |
| **M2 — Campaña canónica** | **Parcial — avance v11.20** | `campaignSnapshot()` tiene pedidos, POs, lotes, recepciones, QA, movimientos, reserva y envíos. **Nuevo:** `campaignAreaReadModel()` genera 8 lecturas del **mismo** snapshot/replay sin rehacer simulación. Pendiente: eliminar el motor físico agregado separado de una jornada, stock inicial único y escenario/horizonte compartidos |
| **M3 — Ocho áreas integradas** | **Parcial — avance v11.20** | Comercial/Planning/Compras alimentan el contrato; Recepción, Calidad, Inventario, Picking y Transporte reciben eventos SKU. Nueva interfaz **Resultados → Áreas** con 8 etapas y reconciliación física. Pendiente: Picking y Transporte son aún un evento de salida conjunto; flujo agregado aún distinto; bin/lote, carga y prueba de entrega no modelados |
| **M4 — Economía reconciliada** | **Parcial** | Valor estándar, zona de reserva, compromisos de compras y auditoría SKU. Pendiente costos operacionales y caja comunes; compromisos no son pagos |
| **M5 — Recuperación** | **Parcial** | Esperar/comprar/trasladar reserva son decisiones de campaña SKU confirmables; alternativas overtime/combined se ensayan. Pendiente recuperación integrada en un solo libro común, turnos efectivos y promesa cliente |
| **M6 — Diagnóstico causal** | **Parcial** | U1 explica restricción probable, v11.20 da evidencia por área del mismo registro. Pendiente evidencia contrafactual simultánea, causa raíz vs restricción y recomendación cuantificada |
| **M7 — UX didáctica** | **Parcial** | Misiones de gerente y tarjetas de decisiones; nueva secuencia de 8 áreas plegables y calendario físico con foco móvil. Pendiente ejercicios completos, experiencia Android real, TalkBack y pruebas con aprendices |
| **M8 — Release final** | **En curso** | CI Node+Chromium+Pages en cada PR y main; matriz escenarios, auditoría y documentación. Pendiente cerrar M2–M7 y etiqueta de presentación estable |

## Experiencia U0–U5

| Fase | Estado | Próximo hito |
| --- | --- | --- |
| **U0 · Escenarios reproducibles** | **Completada** | Mantener pruebas y escenarios negativos |
| **U1 · Diagnóstico gerencial** | **Completada en el alcance inicial** | Perfeccionar causalidad real al cerrar M3/M6 |
| **U2 · Acciones físicas** | **Parcial avanzada** | Traslados/compras con ID y fechas ya existen. Faltan ubicación/lote WMS, costo de traslado y promesa/SLA de servicio |
| **U3 · Vista previa de decisiones** | **Parcial** | Simular antes de confirmar ya funciona; falta comparar acciones conjuntas y reprogramación verificable |
| **U4 · Resultado narrativo** | **Parcial inicial por v11.20** | Ahora hay un recorrido gerencial SKU de 8 áreas con evidencia. Falta un único resultado agregado/SKU económico y semáforo causal |
| **U5 · Refinamiento móvil final** | **Parcial** | Diseño adaptativo y Chromium emulado; falta Android real, accesibilidad y prueba de aprendizaje |

## Qué valida v11.20

El nuevo módulo **`src/area-ledger.js`** toma la comparación ya ejecutada y el **mismo snapshot canónico** que utilizan inventario y compras. Genera ocho perspectivas para la cohorte SKU de 12 días:

1. **Comercial:** pronóstico SKU frente a pedidos reales, sin reescribir el pasado.
2. **Planning:** cobertura y unidades SKU de la compra original.
3. **Compras:** pedido a proveedor frente a cumplimiento y compra extraordinaria separada.
4. **Recepción:** unidades efectivamente ingresadas y cola pendiente.
5. **Calidad:** unidades liberadas por evento/lote y retenidas al cierre.
6. **Inventario:** stock de apertura, ingresos, stock libre, reserva ubicada y no verificable; sin duplicaciones.
7. **Picking:** solo pedidos completos con BOM y unidades SKU consumidas.
8. **Transporte:** pedidos expedidos del CD; **no** entregados al cliente.

Las ocho tarjetas comparten **los mismos 280 pedidos en el escenario de sobredemanda**, las mismas compras, stock inicial, eventos, horizonte y límites. Los movimientos diarios forman un detalle expandible. La auditoría comprueba las igualdades:

```text
pedidos reales = pedidos expedidos + pedidos pendientes
stock inicial SKU + SKU recibidos =
  SKU despachados + SKU libres PICK-FACE +
  SKU en RESERVA-CD + SKU retenidos en Calidad
SKU verificable + SKU no verificable = SKU libre PICK-FACE
```

**Límites de interpretación:**

- El motor agregado del diagnóstico principal **sigue siendo una jornada en unidades equivalentes**; el SKU es una cohorte de pedidos de doce días. Las cifras no se suman ni sus estados financieros se fusionan.
- Picking y Transporte **comparten el evento de salida física** de pedidos completos. No se ha creado un falso evento de preparación independiente ni se ha supuesto confirmación del transportista.
- El origen de la reserva es un supuesto del catálogo. No hay WMS ni verificación real por bin.
- Los estados de las tarjetas son señales pedagógicas, no auditorías de causa raíz ni OTIF.
- La nueva vista no reemplaza físicamente el motor anterior: **primero muestra una lectura coherente para preparar su sustitución controlada en M2/M3**.

## Orden de próximas entregas

**Siguiente:** M2/M3, migrar el resumen principal y la lectura del diagnóstico al mismo horizonte/registro SKU de eventos (sin degradar el aprendizaje); entonces aislar o retirar el flujo agregado incompatible. En paralelo, U2c/U3 puede sumar decisión de fecha prometida/prioridades con reglas claras; M4 después integrará costos y compromisos en un solo libro. M7/U5 debe verificar accesibilidad real en Android.

**Estado de publicación:** la rama v11.20 solo se considera liberada cuando las pruebas del PR y los workflows posteriores al merge de Node, Chromium y Pages estén verdes.
