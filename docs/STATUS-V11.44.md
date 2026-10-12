# Estado v11.44 · M4-15 · Valor diario del inventario físico SKU

**Plan maestro:** [43 microfases](EXECUTION-PLAN-43.md). **Estado inicial:** código en rama; validar CI, PR y Pages antes de cerrar.

## Decisión técnica: no crear un segundo simulador

El sistema ya reconstruye y valida los movimientos SKU día 0–12 en
`src/inventory-ledger.js`, con los mismos eventos que usan Compras,
Recepción, Calidad, Inventario, Picking y Transporte. La microfase
M4-14 ya definió un único costo estándar CLP para los SKU A/B/C.
Esta entrega **solo valoriza** las cantidades de ese libro físico,
sin modificar órdenes, stock, entregas ni tarifas.

## Entrega M4-15

- `src/inventory-valuation.js`: lectura inmutable de
  `inventoryLedger.daily` al **costo estándar SKU** del catálogo M4-14.
  Conserva identidad del SKU, fuente de tarifa, período y moneda.
- Para cada día y SKU verifica:
  `valor inicial + valor de recepciones acumuladas = valor expedido
  acumulado + valor físico del inventario al cierre`.
  Además comprueba la conciliación de día contra día.
- Cada stock final se divide en ubicaciones **excluyentes**:
  `PICK-FACE + retenido por Calidad + RESERVA-CD + STAGING-CD`.
  `verificable + no verificable = PICK-FACE` es una subdivisión,
  nunca un quinto componente que deba sumarse de nuevo.
- Los traslados internos y liberaciones de Calidad llevan valor para
  trazabilidad, pero **no crean compra, recepción ni pago**.
  Los artículos solo se consideran costo estándar expedido al salir
  del CD; no se presupone entrega al consumidor final.
- `campaignSnapshot()` comparte `inventoryValuation` y exige
  `checks.inventoryValuation` aprobada. Las ocho áreas siguen
  compartiendo la misma proyección física por campaña.
- Resultados → Inventario incorpora un resumen breve y un
  panel desplegable con **tres SKU y días**, plegado inicialmente
  para evitar sobrecargar la pantalla del teléfono.
  Se elimina un desglose de valoración redundante que antes
  aparecía en la auditoría secundaria.
- Pruebas de modelo: escenarios con demanda, compra urgente,
  llegada fuera del horizonte, Calidad retenida, reserva,
  inventario no verificable, staging, capacidad cero y días cero;
  verificación frente a `skuAudit()`, inmutabilidad y
  rechazo de inventarios adulterados y tarifas fuera de catálogo.
- Pruebas Chromium: panel de valoración de días 0–12,
  tres SKU, zonas y pantallas móvil/escritorio, con controles
  plegados y botones aptos para interacción táctil.

## Ejemplo de negocio

Si al inicio hay 150 unidades A, 90 B y 55 C, el valor a costo
estándar es **CLP 915.500**, calculado como
`150×1.800 + 90×3.200 + 55×6.500`.
Cada ingreso *efectivamente recibido* incrementa el valor físico;
cada SKU *expedido* lo disminuye. Una compra pendiente o
producto retenido no se trata como disponible para Picking.
Una reserva o preparación en staging cambia ubicación, **no el
total de inventario**.

## Lo que esto NO calcula

No existe aún resultado contable completo, facturas, impuestos,
pagos reales, costos completos por actividad o ingresos realizados
de la cohorte SKU. Tampoco se suman estos CLP a la jornada
agregada de `finance()`.

## Siguiente paso

**M4-16: costo de compras** con separación temporal entre
compromiso original y urgente, entrega del proveedor, recepción
en CD, consumo de material y caja simulada/no comprobada.
En especial, comprar fuera del horizonte no debe elevar
las existencias ni registrar un pago ficticio.

## Puerta de terminado

- PR Node + Chromium verde.
- Merge a `main` con Node + Chromium repetidos y verdes.
- Pages publica v11.44/revisión 153 con comprobación HTTP
  del manifest, HTML y JavaScript.
- Android físico/TalkBack todavía pendiente de M7.

**Cierre verificado (2026-10-12):** PR [#42](https://github.com/harrysxavio/cd-simulator/pull/42) fusionada a `main` (commit `d132809`). Modelo de rama [38308098722](https://github.com/harrysxavio/cd-simulator/actions/runs/38308098722), Chromium de rama [38308098638](https://github.com/harrysxavio/cd-simulator/actions/runs/38308098638), modelo de `main` [38308500673](https://github.com/harrysxavio/cd-simulator/actions/runs/38308500673), Chromium de `main` [38308500757](https://github.com/harrysxavio/cd-simulator/actions/runs/38308500757), despliegue Pages [38308500685](https://github.com/harrysxavio/cd-simulator/actions/runs/38308500685) y comprobación HTTP [38308500774](https://github.com/harrysxavio/cd-simulator/actions/runs/38308500774): **seis controles aprobados**. Android físico/TalkBack pendiente para M7.
