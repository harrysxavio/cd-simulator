# Estado v11.40 · M3-13b · Frontera explícita de decisiones agregadas / SKU

**Plan de referencia:** [43 microfases](EXECUTION-PLAN-43.md) · [PR #38](https://github.com/harrysxavio/cd-simulator/pull/38)

## Qué se corrige

La jornada agregada (`flow()`) trabaja con unidades equivalentes en un turno.
La campaña `eventSimulation()` trabaja con pedidos completos, unidades SKU físicas
y días 0–12. La conexión anterior transfería ocho señales operacionales,
pero no hacía cumplir documentalmente las **fuentes, exclusiones y alcance**
de la transformación. Interpretar stock reservado agregado como SKU real
o usar el despacho de jornada como expedición por pedido es incorrecto.

## Entrega M3-13b

- `src/sku-boundary-audit.js`: comprobación de solo lectura, inmutable, sin
  ejecutar otra simulación. Inspecciona las ocho correspondencias de decisiones
  Comercial, Planificación, Compras, Recepción, Calidad, Inventario,
  Picking y Transporte.
- La demanda agregada solo determina el **tamaño de una muestra** de pedidos
  completos mediante el cociente demanda real/plan. No convierte automáticamente
  unidades equivalentes a unidades SKU.
- La existencia inicial procede **únicamente del catálogo y apertura SKU**.
  La reserva agregada, el resultado despachado, costos y entregas al cliente
  están expresamente fuera del contrato.
- Los porcentajes de decisión y capacidades de jornada alimentan el motor SKU
  como **supuestos didácticos**: el valor numérico SKU/día aún no cuenta con una
  calibración independiente de tiempos o mix de productos.
- Validación de muestras, tipos, capacidades, correspondencia con fuente,
  exactitud de stock, orden de ocho áreas y lista blanca de parámetros.
- `campaignSkuContract()` incluye `boundaryAudit` congelado, además de las
  entradas anteriores. No cambia el motor físico ni el resultado económico.
- Pruebas específicas: stock agregado y reserva no crean SKU, shock modifica
  muestra sin reescribir compra planificada, falsificaciones son rechazadas,
  y cohorte SKU mantiene conciliación física y staging separado.

## Ejemplo operativo

Se proyectan **1.000 unidades equivalentes de jornada**, aparecen **1.300**
y la muestra representa **200 pedidos completos previstos**. Se generan
**260 pedidos completos SKU**, **no** 1.300 SKU ni 1.300 pedidos.
El stock inicial A/B/C proviene de la apertura física de catálogo y no de
`scenario.initialStock`. Si el turno agregado habilita 150 unidades de
reserva, ese acto no ingresa otras 150 unidades a la campaña SKU.

## Condiciones de cierre

1. PR #38 con pruebas **Model regression tests** y **Browser end-to-end smoke** aprobadas.
2. Integración en `main` con ambos checks verdes.
3. Versión pública 11.40: verificar HTML, JS y `release.json` revisión 149.
4. Si no se dispone de Android físico/TalkBack, no declarar ese ensayo completado.

**Pendiente ulterior:** M2-04c/04d retirarán la traducción física parcial y
establecerán qué decisiones pueden pasar al motor por SKU bajo equivalencia
comprobada. M4 y posteriores todavía no pueden tomar ingresos/costos de
`flow()` como contabilidad de campaña SKU.

**Cierre verificado (2026-10-12):** PR #38 integrada a `main` (merge `549c5e2`). Modelo CI de rama [38282160593](https://github.com/harrysxavio/cd-simulator/actions/runs/38282160593), Chromium de rama [38282160632](https://github.com/harrysxavio/cd-simulator/actions/runs/38282160632), modelo de `main` [38282619951](https://github.com/harrysxavio/cd-simulator/actions/runs/38282619951), Chromium de `main` [38282620154](https://github.com/harrysxavio/cd-simulator/actions/runs/38282620154), despliegue [38282619824](https://github.com/harrysxavio/cd-simulator/actions/runs/38282619824) y Pages HTTP [38282620106](https://github.com/harrysxavio/cd-simulator/actions/runs/38282620106): **aprobados**. Android físico/TalkBack no verificados; reservado para M7.
