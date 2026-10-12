# Estado v11.41 · M2-04c · Procedencia de decisiones y evidencia física SKU

**Plan vigente:** [43 microfases](EXECUTION-PLAN-43.md). **PR de entrega:** abrir desde `feat/m2-04c-decision-physical-coverage`.

## Problema que resuelve

`flow()` emplea unidades equivalentes de una sola jornada, pero los límites de
capacidad y tasas decididos por el usuario actúan como supuestos del laboratorio
SKU. Los resultados de este segundo motor son pedidos completos, movimientos
por SKU y días 0–12. Sin un mapa visible, alguien puede interpretar
erróneamente la capacidad del turno como una medición real de SKU/día, o el
pronóstico de Comercial como entrada de mercadería.

## Entrega acotada M2-04c

- `src/decision-physical-coverage.js`: read-model inmutable que **no ejecuta
  otra simulación**. Compara el contrato M3-13b con el resultado auditable
  `campaignAreaReadModel()`; valida orden de las ocho áreas, fuentes
  de evidencia, alcance, pedidos de muestra y ausencia de entregas confirmadas.
- Distingue **dos compromisos de planificación** (Comercial/Planificación)
  de **seis etapas con evidencia de eventos físicos simulados**
  (Compras, Recepción, Calidad, Inventario, Picking, Transporte). La
  llegada al muelle no es recepción, el picking no es salida del CD
  y el despacho tampoco confirma entrega al cliente.
- Todos los límites y tasas transferidos desde una jornada agregada
  siguen siendo **hipótesis didácticas**, sin calibración independiente de
  personas, tiempo o mezcla SKU. La nueva auditoría no demuestra causalidad.
- `src/app.js`: añade un desglose **desplegable y no intrusivo** junto al
  recorrido de la muestra SKU; diferencia supuestos de registros
  y corrige un rótulo ambiguo de demanda de la jornada agregada.
- Nueva prueba de unidad de clases de evidencia, mutaciones y aislamiento
  físico; la prueba E2E existente comprueba escritorio y móvil, ocho filas
  y detalle expandible.

## Caso de negocio

Ante 1.000 unidades equivalentes planificadas y 1.300 observadas,
una muestra prevista de 200 pedidos genera 260 pedidos SKU simulados.
El pronóstico y la compra original se comprometen antes de la sorpresa;
la recepción, liberación, picking y expedición solo cuentan si tienen
evento propio por SKU y fecha. Una acción de reserva en el motor agregado
no crea 150 SKU en el libro físico. Aumentar capacidad de Transporte
tampoco garantiza más pedidos despachados si Picking o stock siguen limitados.

## Frontera de M2-04c (para no simular avance ficticio)

No se reemplaza `flow()`, ni se retira `finance()`, `diagnose()` o
`causalAudit()`, ni se recalibran unidades equivalentes de jornada a
SKU por día. Esos consumidores permanecen identificados como jornada
agregada. El retiro de vistas y cálculos paralelos se evalúa como
**M2-04d** después de disponer de pruebas de paridad y de economía SKU
(M4) cuando corresponda.

## Puerta de cierre

- PR con `Model regression tests` y `Browser end-to-end smoke` aprobados.
- Merge comprobado a `main`, repetir ambos controles.
- Pages publica v11.41 / revisión 150 y verificador HTTP confirma
  HTML, `release.json` y JavaScript.
- Android físico con TalkBack queda fuera de esta microfase, para M7.

**Cierre verificado (2026-10-12):** PR [#39](https://github.com/harrysxavio/cd-simulator/pull/39) integrada a `main` (merge `e8d94a47`). Modelo de rama [38284051053](https://github.com/harrysxavio/cd-simulator/actions/runs/38284051053), Chromium de rama [38284051225](https://github.com/harrysxavio/cd-simulator/actions/runs/38284051225), modelo de `main` [38284569085](https://github.com/harrysxavio/cd-simulator/actions/runs/38284569085), Chromium de `main` [38284569172](https://github.com/harrysxavio/cd-simulator/actions/runs/38284569172), despliegue [38284568413](https://github.com/harrysxavio/cd-simulator/actions/runs/38284568413) y Pages HTTP [38284569139](https://github.com/harrysxavio/cd-simulator/actions/runs/38284569139): **todos aprobados**. Android físico/TalkBack permanece pendiente para M7.
