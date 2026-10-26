# I2-27 · Diagnóstico gerencial multieje con Nico

**Primera lectura post-revelación sobre el escenario original, sin recuperación.** No anticipa ni cierra I2-28–35.

## Objetivo y experiencia

Al revelarse la demanda, la misión mantiene los dos indicadores públicos de I2-26 (observado y diferencia vs lo planificado). Aparece la sección opcional **«Diagnóstico de Nico: ¿dónde se detienen los pedidos?»** que enseña una lectura gerencial más profunda sin saturar el teléfono. Al expandirla, se ven servicio del plan original (despachados/pedidos observados), desviación del forecast, pedidos pendientes, seis evidencias operativas (Compras, Recepción, Calidad, Inventario, Picking, Transporte), puntos de presión económica y preguntas para decidir mejor. El tutorial de siete capítulos y «por qué 3 SKU/12 días» se puede reabrir desde la misma sección.

### Tres niveles separados

1. **Dato observado en el baseline SKU:** pedido expedido, pedido pendiente, espera de muelle, retención de Calidad, inventario pendiente de verificar, no preparado, staging. Fuente detallada por campo, distinción de pedido vs SKU.
2. **Señal:** presencia de colas o faltantes. Múltiples señales pueden coexistir y **ninguna por sí sola prueba que aumentar una capacidad logre más servicio**. Ausencia de cola al día 12 no descarta que haya existido antes.
3. **Hipótesis para investigar:** mezcla BOM y SKU faltante, Picking vs Transporte, fechas y capacidades de Recepción/Calidad. Nunca rotularlas como «causa confirmada».

## Contrato físico y económico

- `i2ManagementDiagnosis(state, baseline)` exige que el estado esté ya revelado; obtiene demanda solo desde `i2DemandEventObserved(state)` y exige `i2MvpPhysicalResult({option:'wait'})` del mismo `seed`, muestra y cohorte. **No ejecuta un nuevo motor** ni modifica compras originales o estado de juego.
- Conserva `baselineShipped + baselinePending = actualOrders`, `neverPrepared + preparedAwaitingDispatch = pending`, coherencia de inventario/Calidad/Recepción y expedición SKU, sin sumar unidades SKU con pedidos.
- Servicio del plan original: `baselineShipped / actualOrders × 100`. Forecast: `actualOrders − commercial.forecastOrders` — **no confundir** con `actualOrders − plannedOrders`, que sigue disponible en la vista I2-26.
- Presión económica: compras originales comprometidas en CLP, **no costo, pago ni utilidad**. Costo total `null`. El baseline sin recuperación tiene gasto incremental de intervención cero por definición; no interpreta el gasto normal del CD como cero.
- Evitar adelantar la sorpresa o recrear el estado de recuperación en el diagnóstico. Información desplegable, texto breve, sin KPI adicionales permanentes en móvil.

## Criterios

- Node: cinco retos × tres tamaños de muestra, todas las reconciliaciones y constancia de baseline ante variación de intervención, rechazo de estados antes del reveal y entradas adulteradas.
- Chromium: tutorial y diagnóstico accesibles después de revelar, dos KPI principales, detalle de evidencia e hipótesis, fuente visible, viewport móvil y V1 inmutable.
- Gate PR: Node general + I2 focused + Chromium general. Después merge/main/Pages/HTTP verificados antes de considerar despliegue certificado. Android real/TalkBack y aceptación de usuarios principiantes permanecen pendientes.

**Siguiente:** I2-28 recuperaciones multiacción conjunta, preservando un solo baseline y comparaciones sin sumar deltas individuales.
