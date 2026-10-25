# I2-22 · Calidad y liberación de lotes sin inventar mermas

**Fase:** F5 (5.ª de 8 áreas). **Corte:** 25-10-2026. **Estado:** implementación en rama hasta pasar CI y fusionar.

## Decisión previa a la sorpresa

El jugador compara tres alternativas originales V1: revisión limitada **75 %**, normal **95 %**, o prioridad **100 %**. La lectura `i2QualityReleasePreview` muestra el **supuesto de liberación por jornada** y la diferencia con el 95 %; no revela ni utiliza demanda real, stock recibido futuro ni resultados de liberación.

La pantalla conserva Decisión / Indicadores / Nico con ayudas opcionales. Nico explica en términos sencillos por qué las cajas físicamente recibidas no son todavía unidades liberadas. El detalle plegable usa un ejemplo explícitamente **didáctico** (40 en revisión, 30 liberadas, 10 retenidas) y no finge datos del escenario.

## Evidencia del escenario original

`i2QualityReleaseOutcomeReading(comparison)` consume únicamente `comparison.base.ledger` del motor físico existente, con la misma compra original y sin aplicar el proveedor urgente de la recuperación.

La lectura enlaza `receiptEvents` y `releaseEvents` mediante `lotId`, verifica cantidades por SKU A/B/C y conserva por día:

```text
pendiente_al_cierre = pendiente_anterior + recibido_físicamente - liberado
recibido_total = liberado_total + retenido_al_corte
liberado_por_lote <= cantidad_recibida_de_ese_lote
```

Solo se muestra tras revelar la sorpresa: unidades recibidas para inspección, liberadas, retenidas al corte, pico de retenidas y detalle de los días con movimiento. La métrica opcional `pendingSkuDays` contabiliza jornadas de espera por unidad, **no** pesos, costo ni inventario perdido. `meanDaysToRelease` informa la media ponderada de días entre recepción y liberación, o **desconocida/null** si ninguna unidad fue liberada.

## Fronteras operacionales

- «Retenido» **no** significa rechazado, dañado, perdido o merma. El juego actualmente no simula rechazos ni defectos.
- Calidad al 100 % libera todo lo recibido en esa jornada en este **modelo**, no garantiza control perfecto real.
- Calidad al 0 % no debe generar ninguna `releaseEvent`, y todo lo recibido permanece retenido.
- Stock de apertura no entra otra vez a inspección: solo los recibos físicos del escenario se comparan con liberaciones.
- Liberação ≠ existencias verificables de Inventario ≠ pedidos completos preparados ≠ expedidos ≠ entregados.
- Subir prioridad puede sumar gasto modelado, pero esta vista **no** afirma costo total, ahorro real o utilidad neta.
- El motor, los pedidos originales, las semillas de demanda y el flujo V1 permanecen intactos.

## Evidencia para integrar

- `tests/i2-quality-release.test.mjs`: 3 decisiones × 5 semillas; mismas lecturas originales bajo estrategias de recuperación, conservación por SKU/día/lote, escenarios 0/100 % y rechazo de diarios alterados.
- `tests/browser-i2-quality-release.e2e.mjs`: nivel móvil, Nico amigable, decisiones, persistencia, sorpresa sellada, comparador de Calidad posrevelación, 320–740 px, V1 intacta.
- Suite Node general, I2 focused y Chromium general aprobadas antes de fusionar; GitHub Pages/HTTP + main checks verificados separadamente después.

## Siguiente fase

I2-23 Inventario: físico, verificable, reservado y ubicaciones; no convertir movimientos o precisiones de registro en creación de stock. F6–F8 mantienen sus criterios y QA Android físico/TalkBack (#67).
