# Estado v11.39 · M3-13a · Auditoría cruzada de ocho áreas

**Plan maestro:** [43 microfases](EXECUTION-PLAN-43.md) · [issue #21](https://github.com/harrysxavio/cd-simulator/issues/21)

## Objetivo de la microentrega

Comprobar que las ocho áreas no agregan unidades ficticias ni representan varias veces la misma mercadería. Comercial y Planificación son decisiones y compromisos de demanda, mientras Compras, Recepción, Calidad, Inventario, Picking y Transporte explican pasos sucesivos del **mismo registro SKU**. El motor agregado de una jornada permanece en un alcance distinto.

## Incremento verificable

- `src/operational-chain-audit.js`: un read-model **inmutable** que consume la campaña física y las ocho proyecciones existentes sin reejecutar demanda, compras, movimientos ni despachos. Verifica orden fijo de áreas, alcance SKU, calendario común y correspondencia de cada indicador con su fuente.
- Cada día concilia **sin preparar + preparados en STAGING-CD + expedidos = pedidos de la cohorte**; verifica preparado antes que despachado, cantidad física de SKU preparada, unidades despachadas, compras recibidas, retención de Calidad y traslados.
- Conservación diaria y **por SKU**: stock inicial + unidades recibidas = unidades despachadas + PICK-FACE + STAGING-CD + RESERVA-CD + Calidad. La diferencia entre verificable y no verificable afecta disponibilidad de Picking, **no** elimina inventario físico.
- `campaignAreaReadModel` comprueba `checks.chainAudit` antes de entregar los ocho indicadores; expone `chainAudit.days`, `chainAudit.totals`, `chainAudit.evidence` para inspección por etapas sin nuevas tarjetas móviles.
- Modo normal y staging activo están incluidos. Ninguna salida del CD equivale a **entrega confirmada al cliente**; la economía del motor agregado no se suma a la cohorte SKU.
- Node y Chromium: cohortes de 13 días en ambos modos, camion detenido, capacidad de Recepción o Picking nula, SKU retenidos, falsificación de datos, determinismo, escritorio/Pixel 7 y vista de teléfono 360/412 px.

## Límites para decidir cierre

Esta prueba cierra solo **M3-13a**, no toda M3-13: aún hay que auditar los puntos en que decisiones agregadas de áreas se traducen en restricciones del modelo SKU, y revisar los criterios concretos de **04c y 04d** antes de retirarlas del plan. La nueva auditoría no convierte las operaciones de `flow()` (una jornada, unidades equivalentes) en los movimientos por SKU de `eventSimulation()`.

## Estado de microfases, previo a CI

| Fase | Estado |
|---|---|
| 00 · Publicación GitHub Pages | 🟡 Pendiente de prueba externa HTTP |
| 01–03, 04a–04b, 05–11 | ✅ Código integrado con CI verde |
| 12a–12c · Transporte y staging | ✅ PR #34, #35, #36; hasta v11.38 |
| **13a · Auditoría cruzada diaria** | 🔵 En rama v11.39; Node/Chromium y merge por verificar |
| 13b · Decisiones y límites físico/agregado | ⏳ Pendiente |
| 04c–04d · Retirar transición física parcial | ⏳ Pendiente, requiere evaluación separada |
| 14–42 | ⏳ Pendientes de cierre, avances anteriores por evaluar |

**Próxima entrega:** M3-13b, revisar y documentar el contrato exacto entre la gestión agregada de áreas y la cohorte SKU, sin introducir nuevas unidades, ingresos o compras de forma implícita; después evaluar cierre específico 04c/04d.

**Certificación pública:** pruebas y fusión a `main` no prueban por sí mismas HTML/`release.json`/JS servidos en Pages. Android físico y TalkBack quedan para M7.
