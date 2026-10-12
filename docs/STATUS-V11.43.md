# Estado v11.43 · M4-14 · Catálogo de costos por SKU, recurso y actividad

**Plan de referencia:** [43 microfases](EXECUTION-PLAN-43.md). **Alcance:** M4-14, no se declara M4-15–19 implementada por esta entrega.

## Situación inicial

En v11.42 ya había valorización física parcial (`skuAudit()`,
`skuProcurementReconciliation()`) a costo estándar de los SKU
A/B/C, y había cinco parámetros didácticos por defecto en la
comparación incremental `recoveryComparison()`. Los importes
se definían separadamente como literales en distintos archivos;
no había una pantalla que distinguiese claramente su uso y
el costo de actividades sin tarifar.

## M4-14 entregada

- `src/sku-cost-catalog.js`: una fuente inmutable con alcance
  `sku-cohort`, moneda CLP y días 0–12. Cada tasa incluye
  unidad, clasificación, fuente, reconocimiento y si existe prueba de caja.
- `src/sku.js` y `src/recovery.js` consumen **las mismas tarifas
  que ya se usaban**. Se mantienen idénticos movimientos, precios y
  resultados por defecto; no se migra ni sobrescribe una campaña guardada.
- `skuCostCatalogReadModel({catalog})` verifica que precios y catálogo
  físico coincidan, y rechaza tasas inválidas, SKU faltantes, duplicados o
  una moneda/alcance incompatible. La vista no ejecuta simulaciones.
- `src/app.js`: en el laboratorio SKU aparece un apartado
  **desplegable** con los costos y su significado. Se inicia cerrado
  para mantener el teléfono legible; señala actividades sin precio
  en vez de inventar tarifa cero.
- Pruebas de modelo y Chromium de escritorio/teléfono corroboran
  las tarifas, procedencia, inmovilidad del catálogo, equivalencia de
  resultados y ausencia de doble contabilización o pagos fingidos.

## Tarifas iniciales explícitas (ejemplos, no valores de mercado)

| Concepto | Valor | Unidad | Interpretación |
|---|---:|---|---|
| SKU A | 1.800 | CLP/SKU | Costo estándar del inventario |
| SKU B | 3.200 | CLP/SKU | Costo estándar del inventario |
| SKU C | 6.500 | CLP/SKU | Costo estándar del inventario |
| Ingreso potencial | 9.000 | CLP/pedido expedido | Proxy; no es cobro confirmado |
| Recargo compra urgente | 30 % | Sobre compra urgente | Compromiso/supuesto, no pago confirmado |
| Refuerzo adicional | 70.000 | CLP/día de campaña | Gasto operacional supuesto por día, sin dotación individual calibrada |
| Penalidad por atraso | 150 | CLP/pedido pendiente/día | Proxy de decisión, no multa contabilizada |
| Tenencia de stock | 0,05 % | Del valor stock/día | Proxy, no gasto contable realizado |

**Sin tarifa física por actividad:** Recepción, Calidad, traslado de
reserva, Picking y Transporte. Un valor nulo aquí **no significa**
que la operación tenga costo cero. Horarios reales, costos laborales
y modalidades de flete requieren datos/calibración futura.

## Límites contables explícitos

Las compras originales y urgentes son **compromisos**, la recepción
es movimiento de existencias, su expedición reconoce consumo físico
a costo ilustrativo; ninguno prueba pago o cobro. El resultado incremental
de `recoveryComparison()` es una aproximación, no EBITDA, flujo
de caja bancario ni utilidad contable de la cohorte. La economía
agregada de `finance()` corresponde a una jornada diferente:
**nunca sumar ambas fuentes.**

## Siguiente fase, M4-15

Tomar los movimientos físicos por SKU, día, zona y lote ya existentes
y comprobar que la valorización de apertura + recepción = expedición
+ existencia (disponible, no verificable, reserva, calidad y staging)
conserve la moneda y las fuentes del nuevo catálogo. No crear nuevos
SKU ni facturas por el mero hecho de tener un precio.

## Puerta de cierre

1. PR con `Model regression tests` y `Browser end-to-end smoke` verdes.
2. Fusionar a `main` y repetir ambas suites.
3. GitHub Pages + respuesta HTTP `release.json` y assets confirma
   v11.43 / revisión 152.
4. Android físico/TalkBack no suplido por emulación Chromium; sigue M7.

**Cierre verificado (2026-10-12):** PR [#41](https://github.com/harrysxavio/cd-simulator/pull/41) fusionada a `main` como `ca92d70`. Regresión de rama [38303361061](https://github.com/harrysxavio/cd-simulator/actions/runs/38303361061), Chromium de rama [38303361004](https://github.com/harrysxavio/cd-simulator/actions/runs/38303361004), regresión de `main` [38303809990](https://github.com/harrysxavio/cd-simulator/actions/runs/38303809990), Chromium de `main` [38303810043](https://github.com/harrysxavio/cd-simulator/actions/runs/38303810043), despliegue Pages [38303808959](https://github.com/harrysxavio/cd-simulator/actions/runs/38303808959) y verificación HTTP pública [38303810006](https://github.com/harrysxavio/cd-simulator/actions/runs/38303810006): **aprobados**. Android físico/TalkBack pendiente en M7.
