# I2-21 · Recepción: capacidad, FIFO y cola de muelle

**Corte:** 25-10-2026 · **Fase F5:** 4.ª de ocho áreas, cierre condicionado a CI y merge.

## Decisión y explicación al usuario

El jugador elige uno de los turnos que ya existían en V1 (reducido, normal, reforzado). Su capacidad **por jornada** proviene de `flow` con demanda únicamente planificada y opciones ya confirmadas. La nueva tarjeta en la pestaña Indicadores muestra capacidad diaria y diferencia frente al turno normal. No proyecta ni filtra entregas futuras, demanda sorpresa, resultados SKU ni stock recibido.

«¿Qué se acumula si no alcanzamos a recibir?» abre una explicación de Nico: las unidades llegan al **muelle**; la capacidad de Recepción las registra por orden de llegada (FIFO), pudiendo procesar parcialmente un lote. El saldo espera al siguiente día. Recién después de registrarse físicamente puede pasar al control de Calidad. No es merma ni inventario utilizable.

La capacidad de V1 se utiliza en `receivingUnitCapacity` de la cohorte SKU tal como establece `campaignSkuContract`; no se convierten métricas de pedidos, turno agregado o dinero a SKU. El ejemplo de 100 llegadas y 60 recepciones es **puramente ilustrativo**, no resultado del escenario.

## Tras revelar demanda: hechos físicos

`i2ReceivingOutcomeReading(comparison)` lee exclusivamente `comparison.base.ledger` de `eventSimulation`, previamente congelado, **sin simular nuevamente** ni incorporar compras de recuperación. Se muestran llegadas, entradas físicas, cola al cierre, pico de unidades en espera y opcionalmente todos los días con actividad. La descripción debe expresar «**no se generó cola**» cuando los recibos no saturaron la muestra, sin inventar un problema.

Cada uno de los 13 días (día 0–12) cumple:

```
cola_final_día = cola_previa + unidades_arribadas - unidades_recepcionadas
sum(arribos al corte) = sum(recibos físicos) + cola final
recibos_día <= capacidad_física_diaria
```

Los lotes en cola preservan PO original, SKU, fecha real de llegada y `waitingDays`; la lectura coteja además conservación por SKU, rechaza eventos con unidades inválidas y verifica que la cola por SKU sea igual a arribos − ingresos. El orden FIFO es responsabilidad del motor canónico (iteración `pendingReceipts`), no del widget. La nueva vista no altera la secuencia.

`queueSkuDays` integra las unidades esperando cada cierre de día **0–11** para evitar contabilizar el día siguiente al horizonte. No representa costo de almacenamiento y no se suma a las unidades físicas. El escenario original se mantiene idéntico al comparar recuperación de emergencia y espera.

## Cierre físico y límites importantes

- Con **capacidad cero**, `eventSimulation` no genera `receiptEvents` ni cambia el stock por recepciones; las unidades del proveedor esperan en muelle.
- Aun con cero cola, puede haber faltantes de proveedor, retenidos por Calidad, inventario no verificable o falta de expedición.
- Mercancía arribada ≠ recibida ≠ liberada ≠ preparada ≠ despachada ≠ entregada al cliente.
- Una capacidad más alta no crea unidades ni garantiza mejora del servicio; depende de órdenes originales, cumplimiento y plazos.
- Nico explica con lenguaje cálido y ejemplos, sin conocer demanda antes de la revelación. El arte original queda activo; el usuario puede ocultar la ayuda.

## Puertas de calidad

- `tests/i2-receiving-dock.test.mjs`: tres turnos × cinco semillas, conservación por día/SKU, conciliación con `supplierOrderLedger`, compras originales inmutables, cero capacidad, rechazo de diarios inconsistentes y sin spoilers.
- `tests/browser-i2-receiving-dock.e2e.mjs`: lectura anterior a revelación, detalle FIFO desplegable, elección/recarga, Nico, revelación explícita, filas de día y viewport compacto/CTA.
- Node general, focused I2 y Chromium general verdes antes de merge. Pages/HTTP y regresión `main` tras merge.

## Dependencias restantes

I2-22: Calidad, stock en revisión y liberación temporal; no confundir cola de Calidad con cola de Recepción ni afirmar pérdida permanente por retención. F7: evaluación de servicio y costo total con fronteras explícitas. F8: Android real/TalkBack y pruebas con usuario principiante (#67).
