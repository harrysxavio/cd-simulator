# Seguimiento de microfases · v11.25

**Fecha:** 2026-10-09. **Plan vigente:** [43 microfases](EXECUTION-PLAN-43.md) · [issue permanente #21](https://github.com/harrysxavio/cd-simulator/issues/21).

## Evidencia reciente

- **Microfase 01 · contrato de unidades y períodos:** completada a nivel de código, fusionada mediante [PR #20](https://github.com/harrysxavio/cd-simulator/pull/20) en `main` (SHA `c3093d07d50fa4055799938ec72241e1db530850`). Pruebas de PR Node y Chromium verdes. La comprobación de publicación HTTP pública continúa **sin evidencia directa** desde esta sesión; no declarar cerrada la puerta de despliegue.
- **Microfase 02 · apertura física común:** implementación **en rama**, hasta verificar Node/Chromium, merge y Pages. `src/opening-state.js` define un solo stock inicial SKU y lo particiona entre PICK-FACE y RESERVA-CD. `campaignSkuContract` lo entrega a compras; `integratedDemand` lo reutiliza para pronóstico/base/shock; `recoveryComparison` reutiliza la misma apertura; `campaignSnapshot` la audita contra el libro de eventos; `campaignAreaReadModel` la expone sin crear stock alternativo.
- **Microfase 00 · verificación de publicación:** en curso. No se pudo leer directamente el HTTP del sitio público desde el entorno actual. La existencia del workflow automático por sí sola no certifica su última ejecución; comprobarlo en Actions/Pages.

## Estado por grupos

| Microfases | Estado honesto |
|---|---|
| 00 | En curso: falta prueba HTTP pública y teléfono Android |
| 01 | CI y merge aprobados; despliegue pendiente de confirmar |
| 02 | Implementada en rama, pruebas y publicación pendientes |
| 03–05 | Pendientes de cierre |
| 06–13 | Pendientes de cierre; avances históricos físicos existentes |
| 14–19 | Pendientes de cierre; economía aún separada |
| 20–27 | Pendientes de cierre; acciones SKU individuales parciales |
| 28–32 | Pendientes de cierre; causa SKU provisional |
| 33–38 | Pendientes de cierre; mejoras móviles anteriores aprovechables |
| 39–42 | Pendientes de cierre |

## Límites verificables de M2-02

1. El stock **físico SKU** se deriva del catálogo o de cantidades SKU explícitas; se valida que sea entero no negativo. No procede de `scenario.initialStock` ni de `scenario.reserveStock`, que pertenecen a **unidades agregadas de una jornada**.
2. La ubicación RESERVA-CD **resta de PICK-FACE**, nunca agrega unidades físicas.
3. Las compras planificadas se calculan desde la misma apertura que utilizan el escenario base, la sorpresa de demanda y recuperación. La compra original no se altera al revelar la demanda.
4. La auditoría de eventos rechaza una apertura o reserva diferente, incluso cuando el resultado sería numéricamente atractivo.
5. No se declara motor físico único, ni integración económica, ni promesa de entrega al cliente; permanecen en 03–19.

## Próximo orden

1. CI Node + Chromium verde para PR de M2-02; corregir antes de merge si falla.
2. Merge, verificar GitHub Pages LIVE (HTML, `release.json`, scripts) y versión visual `v11.25`.
3. M2-03: congelar orden original identificable por SKU y período; preservar el valor de la orden tras cambios de demanda, recuperación y recarga.
