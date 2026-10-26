# I2-23 · Inventario físico, verificable y reserva, sin doble conteo

**25-10-2026 · F5 área 6/8, pendiente de integrar hasta CI verde.**

## Decisión antes de revelar

El jugador elige exactitud de Inventario 85/95/99 % (las tres opciones originales de V1), una hipótesis de unidades verificables en PICK-FACE. Se muestra la diferencia contra el 95 % normal y un ejemplo explicado por Nico: si existen 100 SKU y solo 85 son localizables, **15 continúan físicamente en bodega**. No se consultan ni anticipan la demanda real, los recibos, el despacho ni el stock de días futuros.

## Interpretación física del cierre

`i2InventoryPhysicalReading` lee **únicamente** `comparison.base.ledger` del mismo escenario original; no recalcula ventas ni vuelve a simular para obtener indicadores. Cada día, para cada SKU, valida:

```text
PICK-FACE físico = verificable + no verificable
Stock en CD = PICK-FACE físico + reserva CD + pendiente Calidad + staging CD
Apertura + recepciones acumuladas = stock en CD + expediciones acumuladas
Reserva final del día = reserva del día previo - traslados registrados
```

No se mezclan dimensiones: `pickableStock` es subconjunto y una disponibilidad operacional, no una segunda existencia que pueda sumarse. `RESERVA-CD` es parte del stock inicial; solo pasa a `PICK-FACE` mediante evento `reserveEvents`. `STAGING-CD` puede contener unidades ya preparadas pero no expedidas en un ensayo separado de Transporte; ni se duplican ni se atribuyen al proveedor. Los lotes retenidos por Calidad son estados físicos diferentes. El stock en muelle todavía **no está recibido** y no suma en bodega.

La prueba verifica día por día los tres SKU, los eventos `receiptEvents` y `shipmentEvents` con cantidades BOM verdaderas, y el origen de los movimientos. Rechaza balances adulterados. La simulación permanece de solo lectura y las compras urgentes de recuperación no modifican el baseline original.

## Experiencia y limitaciones

En Inventario: pestañas Decisión/Indicadores/Nico y explicación desplegable «¿Por qué existe stock que aún no podemos prometer?». El tablero de resultados ofrece físico en CD, en PICK-FACE, verificable, por conciliar, reserva y Calidad, más desglose por SKU y ubicación. Nunca afirma que el porcentaje de exactitud sea una pérdida física, merma, calidad rechazada o productividad por hora. Conciliación mejora lo promesable; no crea stock ni garantiza servicio por sí sola.

## Gates de calidad

- `tests/i2-inventory-physical.test.mjs`: 3 opciones × 5 shocks, stock original ante recuperación, identidad física por día y SKU, extremos 0/100 % de verificación y traslado RESERVA-CD a PICK-FACE sin generar unidades.
- `tests/browser-i2-inventory-physical.e2e.mjs`: elección, consejo cálido de Nico, persistencia, detalle de ubicación y SKU, shock sellado hasta revelación, V1 intacta y CTA sin scroll exterior a 320–740px.
- Node general + I2 focused + Chromium general deben estar verdes antes del merge. Pages, HTTP y postmerge se verifican aparte.

## Siguientes fases

I2-24 · Picking y BOM pedidos completos, distinguiendo preparación física de expedición; I2-25 Transporte con staging y capacidad de salida. F6–F8 pendientes de evaluación formal; Android real, TalkBack y prueba humana siguen abiertos en #67.
