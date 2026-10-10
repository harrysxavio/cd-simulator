# Auditoría de alcance de modelos · M2-04a

**Base:** v11.26. **Plan oficial:** [43 microfases](EXECUTION-PLAN-43.md). **Ejecutor siguiente:** M2-04b.  
**Objetivo:** que cada cifra indique si pertenece a la **cohorte SKU de días 0–12** o al **modelo agregado de una jornada**, sin sumar ni convertir ambos.

## Mapa de datos en la interfaz

| Vista / función | Fuente observada | Unidad / tiempo | Estado y control |
|---|---|---|---|
| Planificación 8 áreas, `render()` + `flow()` | Motor agregado `src/flow.js` | Unidades equivalentes / jornada | **Legado**, didáctico. No usar como despachos SKU. |
| Configuración, mapa de capacidad, decisión por área | `flow()`, `numericValue()` | Capacidad pedagógica de jornada; puente adapta límites SKU/día | Intervenciones agregadas aún coexisten con decisiones físicas SKU. |
| Diagnóstico preliminar, `renderManagerBriefing()` | `skuServiceBrief(currentSkuAreaModel)` para **demanda real / salida CD / pendientes** tras revelar; `managerDiagnosis()` para contexto y explicación | Pedidos completos SKU en días 0–12 para servicio; jornada agregada para heurística | **Mixto pero etiquetado**. La causa mostrada es **hipótesis**, no evidencia causal SKU. |
| Datos técnicos de Diagnóstico `#diagnosisTechnical` | `flow()` / `diagnose()` | Jornada agregada | Atributo `data-model-scope=aggregate-shift`; apartado técnico desplegable. |
| Resultado principal `#primarySkuSummary` | `campaignAreaReadModel()` + `skuServiceBrief()` | Pedidos completos SKU, días 0–12 | Principal, atributo `data-model-scope=sku-cohort`; no representa entrega al cliente. |
| Áreas físicas `#canonicalAreaView` | `campaignAreaReadModel()` de `campaignSnapshot()` | Unidades SKU + pedidos completos, días 0–12 | Principal, atributo `data-model-scope=sku-cohort`; Picking y Transporte comparten evento por ahora. |
| Resumen viejo `#legacyAggregateDetails` | `flow()` | Unidades equivalentes, jornada | Colapsado y declarado legado; no sumar con resumen SKU. |
| Inventario, `#traceDetails`, `#sku`, flujo `#results` | `flow()` | Unidades agregadas, jornada | Apartado desplegable **renombrado** para evitar llamarlo flujo físico SKU; la vista física es la de 8 áreas. |
| Costos `[data-result-page=economics]` + `finance()` | Motor económico agregado | CLP didácticos de jornada | **No son los costos de la cohorte SKU**; aclaración de alcance visible. |
| Mejoras, restricciones y contrafactuales `#report` | `diagnose()`, `causalAudit()`, `finance()` | Jornada agregada | Explicación visible y etiqueta `aggregate-shift`, no causalidad física SKU. |
| Exportación `#export` / `aggregateFlowCsv()` | `flow()` | Unidades equivalentes / jornada | Nombre `supply-chain-jornada-agregada.csv`; incluye metadatos de modelo, período, unidades y límite antes de las columnas de área. **Nunca CSV de pedidos físicos SKU**. |
| Recuperación SKU `recoveryComparison()` / `skuDecisionStatus()` | Misma cohorte SKU + movimientos | Pedidos y unidades SKU en días 0–12 | Acciones SKU e inventario auditables, costos aún incrementales y simplificados; no mezclar con `finance()`. |

## Puntos concretos de acoplamiento por resolver

1. **04b:** consolidar reconstrucción física al navegar; `renderSkuLab()` crea `recoveryComparison` y `supplyBridge` al renderizar, mientras otras alternativas pueden recalcularse para la comparación. Reutilizar resultados dentro de la misma sesión y confirmar identidad. No asumir motor único solo por mostrar el mismo read-model.
2. **04c + M3:** separar preparación de Picking y carga/despacho Transporte. Actualmente comparten un evento, por lo que aumentar una sola capacidad no significa necesariamente despacho adicional.
3. **04d + M4:** reemplazar los KPI que aún presentan unidades agregadas como resultados finales por lecturas físicas SKU cuando existan, manteniendo costos del agregado únicamente como un ejemplo explícito. No convertir `scenario.initialStock` en SKU.
4. **Diagnóstico causal (M6):** la heurística `managerDiagnosis`, `diagnose` y `causalAudit` es de jornada; no atribuirla como causa raíz de pedidos SKU sin pruebas contrafactuales reales de la cohorte.

## Controles de salida M2-04a

- Existe clasificación escrita de los consumidores de `flow()`, `finance()`, `campaignAreaReadModel()` y su alcance.
- Pantallas principales indican qué es SKU, y costes/restricciones/flujo legado se identifican como **jornada agregada** sin texto extenso en tarjetas pequeñas.
- CSV nunca se titula genéricamente «diagnóstico SKU» ni omite su procedencia; prueba automática de metadatos, exportación real de navegador, distinción de unidades y protección frente a fórmulas.
- Pruebas Node + Chromium aprobadas antes de fusionar; **Pages HTTP real** debe validarse separadamente. Ningún check local de navegador prueba por sí solo que GitHub Pages se haya actualizado.

## Aclaración

Esta es una **auditoría de límites de modelo y comunicación**; NO equivale todavía a unificar los motores. La microfase M2-04 completa requiere 04b, 04c y 04d, con sus dependencias M3 documentadas en [issue #24](https://github.com/harrysxavio/cd-simulator/issues/24).
