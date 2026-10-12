# Estado v11.42 · M2-04d · Consolidación segura del render y duplicados

**Plan maestro:** [43 microfases](EXECUTION-PLAN-43.md). **Microfase:** M2-04d, cierre sujeto a pruebas e integración.

## Diagnóstico de duplicidad

Antes de M2-04d, una actualización completa de la interfaz invocaba
`flow()` para los resultados de jornada, `campaignSkuContract()` (que
a su vez invoca `flow()`) para Resultados, y nuevamente
`campaignSkuContract()` desde Recuperación. Eran cálculos equivalentes
del estado actual realizados por separado. La campaña SKU tenía caché
de sus eventos, pero ello no evitaba reconstruir el adaptador agregado
alrededor de dos vistas.

Además, el diagnóstico técnico presentaba dos tarjetas con el mismo
cumplimiento después de la sorpresa: `Cumplimiento tras sorpresa` y
`Cumplimiento`, sin información adicional.

## Cambio entregado

- `render()` construye **un `campaignSkuContract()` inmutable** y obtiene
  su `area` para las lecturas de una jornada. Comparte exactamente el
  mismo objeto con `renderSkuLab(contract)` y
  `renderSkuRecoveryMission(contract)`.
- Los controles SKU autónomos siguen reconstruyendo un contrato nuevo
  cuando realmente cambia política, reserva o proveedores, para evitar
  usar estados obsoletos. Los eventos detallados y proyecciones continúan
  reutilizando la caché física `createSkuSessionCache()`.
- Se retira solo el **KPI agregado redundante** del detalle de diagnóstico.
  Se conservan el cumplimiento del plan y el de la sorpresa, capacidad,
  picking y costo unitario en sus alcances correspondientes.
- Tests de contrato de la interfaz confirman un solo punto de construcción
  del adaptador y que las dos vistas reciben el mismo contrato; Chromium
  revisa seis KPI únicos en escritorio y móvil, además de las suites ya
  existentes sobre sesión, navegación, compras y conciliación SKU.
- Versión v11.42, asset revision 151.

## Exclusiones deliberadas

**No** se suprime `flow()`, `finance()`, `diagnose()` ni
`causalAudit()`: todavía alimentan una jornada didáctica, la evaluación
de dotación y la economía agregada, sin equivalente físico-contable
completo para la cohorte SKU. Reemplazar arbitrariamente una unidad
equivalente por pedido o SKU crearía resultados espurios.

**No** se alteran los eventos de demanda, compras, inventario,
calidad, picking, staging y transporte, ni el manejo de sesiones.
El trabajo de resultados económicos SKU reales corresponde a M4
(microfases 14–19) y el análisis causal físico a M6 (28–32).
Solo cuando esas salidas estén verificadas será apropiado eliminar
su contenido agregado residual, sin dejar pantallas sin datos útiles.

## Escenario de aceptación

Pronóstico subestimado, demanda +40 %, compras originales congeladas y
elección de reposición extraordinaria. El resultado físico de los pedidos
SKU y su manifiesto no deben cambiar respecto a v11.41. Navegar
Diagnóstico → Recuperación → Resultados no debe crear otra compra ni
mezclar costos de una jornada agregada con la cohorte de días 0–12.
La tarjeta técnica duplicada desaparece; el detalle permanece plegado.

## Puerta de cierre

- PR con `Model regression tests` y Chromium completo verdes.
- Merge en `main`, repetir ambos controles.
- Despliegue Pages HTTP verifica v11.42 y revision 151.
- Prueba Android física/TalkBack queda pendiente de M7.

**Cierre verificado (2026-10-12):** PR [#40](https://github.com/harrysxavio/cd-simulator/pull/40) fusionada en `main` (merge `72fffc2`). Modelo de rama [38293955615](https://github.com/harrysxavio/cd-simulator/actions/runs/38293955615), Chromium de rama [38293955796](https://github.com/harrysxavio/cd-simulator/actions/runs/38293955796), modelo de `main` [38294405709](https://github.com/harrysxavio/cd-simulator/actions/runs/38294405709), Chromium de `main` [38294405777](https://github.com/harrysxavio/cd-simulator/actions/runs/38294405777), despliegue Pages [38294405618](https://github.com/harrysxavio/cd-simulator/actions/runs/38294405618), HTTP público [38294405842](https://github.com/harrysxavio/cd-simulator/actions/runs/38294405842): **todos aprobados**. Android físico/TalkBack pendiente de M7.
