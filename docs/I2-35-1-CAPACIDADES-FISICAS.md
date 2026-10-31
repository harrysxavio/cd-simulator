# I2-35.1 · Matriz inicial de capacidades y cronología · checkpoint

**Estado: en curso, CI anterior mostró un fallo de aserción de forma del manifiesto de compras; corregido en commit `3e89c0c`, nueva CI por verificar.** No certificar diversidad de ocho retos todavía. Fuente vinculante: [plan maestro](I2-PLAN-MAESTRO.md) y [auditoría](I2-AUDITORIA-PRODUCTO-REBASELINE-2026-10-28.md).

## Evidencias del motor y límites
| Arquetipo | Parámetro actualmente soportado | Qué todavía NO está demostrado |
|---|---|---|
| ARC-01 demanda menor | `seed alpha-case-05` (-35%), compras originales conservadas | Nivel de inventario final desperdiciado / distinta estrategia óptima |
| ARC-02 SKU crítico | `stockProfile:'low'`, 3 SKU y BOM de pedidos | Cuál SKU limita realmente y qué acción lo corrige |
| ARC-03 proveedor tarde | `purchasing:'cheap'` equivale a menor cumplimiento y `leadDays` original | **No** es un evento independiente de fecha tardía inesperada; requiere extensión de contrato exógeno |
| ARC-04 muelle | `receiving:'low'` limita SKU/jornada, colas auditadas en `i2-receiving-dock.js` | Demostrar que la cola es cuello vinculante en el fixture, no solo menor capacidad nominal |
| ARC-05 Calidad | `quality:'slow'` libera 75% de lotes por jornada | Demostrar backlog y impacto distintivo; NO se modelan rechazos ni mermas |
| ARC-06 Picking | `pickingLimitSkuPerDay:'10'` con BOM SKU | Probar binding, servicio y estrategias relevantes contra otros cuellos |
| ARC-07 Transporte | `transport:'low'` SKU/jornada, staging y eventos de despacho | Cuello efectivo en esta cohorte: capacidad diaria puede sobrar aun con límite bajo |
| ARC-08 costo sin beneficio | `extraCapacityDailyCostCLP:100000` y opción `overtime` | Demostrar gasto >0 y Δ pedidos =0 en fixture específico, no afirmarlo de antemano |

## Calendario causal obligatorio
1. Día 0: configurar y confirmar ocho áreas y pedidos planificados, stock inicial, compromiso de compras.
2. El evento de demanda queda fijado por `seed` antes de actuar y se revela explícitamente después de ocho decisiones.
3. Las recuperaciones existentes se calculan sobre los 12 días simulados. **Riesgo:** comprar con fecha de llegada anterior a la revelación es contrafactual de laboratorio, no actuación cronológica después de conocer el problema.
4. El corte de medición es final del día 12. Compra que llega día 13 no puede recuperar pedidos dentro del corte.
5. Antes de habilitar retos de proveedor tardío/acciones en vivo: añadir tiempo de descubrimiento, momento de decisión, origen de lead time y día de disponibilidad físico; test que ninguna compra retroactiva se contabiliza como acción en vivo.

## Implementación y validación actual
- Creado `tests/i2-35-physical-fixtures.test.mjs`: ocho sondas sobre motor canónico, determinismo, conservación de pedidos, demanda independiente, compras originales intactas, cota física de Picking y compra llegada día 13.
- Pruebas discriminantes **pendientes**: capturar resultados de cada fixture y verificar que cambia una estrategia útil, medir dónde está el cuello y costo de acciones; no confundir una sonda invariante con aceptación de escenario.
- La matriz es de **posibilidades soportadas por el API**, no de ocho misiones listas.
- **Próxima acción**: revisar CI de rama, corregir fallos, agregar tests discriminantes por área y evidencia de cronología; después cerrar 35.1 o registrar limitaciones con pruebas bloqueadas.
- PR #127 permanece draft separado: no rebasar ni modificar sin reconciliar después de 35.1.
- Pages, Android, TalkBack y evaluación humana: no verificados en este trabajo.

## Registro de defecto de prueba · 31-10-2026
- Run Node inicial PR #129: cuatro de cinco pruebas nuevas aprobaron, la primera falló porque trató `originalPurchaseOrders` como arreglo (`.length`) aunque su contrato puede ser un objeto.
- Se cambió la aserción para validar presencia de estructura sin suponer su forma; no se tocó el motor ni el contenido de compras. Se conserva en otros tests la comparación estructural exacta entre replay y alternativa.
- CI del nuevo HEAD pendiente. Próximo paso técnico **después de verde**: medir `receiving.totals.peakDockQueueSkuUnits`, `quality.totals.peakHeldSkuUnits`, `picking.totals.neverPreparedOrders`, `transport.totals.preparedAwaitingDispatchOrders` y su sensibilidad a acciones, conservando misma demanda/semilla.

## Pares discriminantes · ampliación del 31-10-2026
- El test `paired physical observations` calcula **sobre la misma semilla** dos alternativas por área (Recepción bajo/reforzado, Calidad lenta/prioritaria, Picking bajo/reforzado, Transporte bajo/reforzado, proveedor económico/confiable) y el límite físico Picking 10 vs base.
- Se guardan en logs CI: expedidos, pendientes, máximo de cola de muelle, stock retenido por Calidad, pedidos nunca preparados, staging, gasto extra parcial y diferencia de expedición. **Un valor cero en diferencia de expedición NO invalida el motor: significa que ese parámetro no resultó vinculante en ese fixture.**
- Hasta revisar resultados de CI no afirmar cuellos efectivos ni estrategia ganadora. Los pares no son misión jugable y no alteran interfaz ni fuentes canónicas.
- Próximo paso exacto: extraer `I2-35.1 PAIRED_PHYSICAL_EVIDENCE` desde run Node, clasificar pares vinculantes/no vinculantes, escoger fixtures para I2-35.2; después integrar/merge si se satisfacen puertas y actualizar STATUS.
