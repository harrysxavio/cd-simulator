# Estado de implementación · v11.32 · M3-08 Recepción

**Plan oficial:** [43 microfases](EXECUTION-PLAN-43.md) · [issue maestro #21](https://github.com/harrysxavio/cd-simulator/issues/21).

## Objetivo

Diferenciar el suministro que **llega al muelle** de lo que **ingresa físicamente en Recepción**, respetando el límite diario, el orden de llegada y los lotes; la cola de muelle nunca se convierte anticipadamente en inventario disponible.

## Trabajo implementado

- `src/events.js` conserva ahora el **día de arribo** de cada PO, un registro de arribos al muelle (`dockArrivals`), el uso diario de capacidad y la cola restante por PO/SKU con antigüedad en días. No cambia la cantidad de entradas reales ni los balances anteriores.
- `src/receiving-ledger.js` construye un **único libro de Recepción** a partir del replay y las PO de M3-07; audita FIFO por orden de llegada, lotes, SKU, arribo previsto, límite diario, recepciones efectivas, cola final y conciliación con el proveedor.
- `campaignSnapshot` incorpora ese libro inmutable y lo comprueba contra recepción real, inventario y cola del día de corte.
- La vista **Recepción** de las ocho áreas expone en la explicación existente capacidad, máximo de cola y mayor antigüedad. El detalle por día muestra **muelle, recibido, cola**, Calidad y reserva sin tarjetas adicionales.
- Las pruebas cubren cola congestionada, capacidad cero e ilimitada, ingresos fuera de plazo, urgencias posteriores al horizonte, recibos con cantidades alteradas, cola falsificada, fecha de recarga y navegación desktop/Pixel 7.

## Reglas físicas

1. Compromiso de proveedor ≠ llegada al muelle ≠ ingreso físico a bodega ≠ liberación por Calidad.
2. Límite diario de Recepción se mide en **unidades SKU/día**, no pedidos completos.
3. Una PO parcialmente procesada queda en cola y conserva su fecha de ingreso al muelle.
4. Las entradas solo se registran mediante lotes reales, positivos y asociados a una PO.
5. El plazo de proveedor y el período de 12 días son supuestos didácticos; no se verificó una entrega real, factura ni ingreso contable.

## Estado antes de CI

| Microfase | Estado | Evidencia |
|---|---|---|
| 00 | 🟡 Verificación HTTP pública pendiente | Comprobar HTML, `release.json`, JS; GitHub Pages inaccesible en herramientas previas |
| 01–03 | ✅ Código y CI aprobados | PR #20, #22, #23 |
| 04a–04b | ✅ Código y CI aprobados | PR #25 y #26 |
| 04c–04d | ⏳ Pendiente | Depende de capacidad independiente Picking/Transporte en M3 |
| 05 | ✅ Código y CI aprobados | PR #27 |
| 06 | ✅ Código y CI aprobados | PR #28 |
| 07 | ✅ Código y CI aprobados | PR #29, v11.31 |
| **08** | 🔵 Implementada en rama v11.32 | PR, Node, Chromium, merge y Pages pendientes de verificar |
| 09–42 | ⏳ Pendientes de cierre | Conservar implementaciones parciales |

**Siguiente microfase:** M3-09 Calidad — eventos independientes de recepción y liberación por lote, días de espera, stock en control y disponibilidad real para Picking. La cola no es rechazo ni merma.
