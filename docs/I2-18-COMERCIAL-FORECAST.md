# I2-18 · Comercial y pronóstico con consecuencias verificables

**Fase:** F5 (primera de ocho áreas) · **Corte:** 25-10-2026 · **Estado:** condicionado a CI/merge.

## 1. Propósito gerencial

En Comercial la persona debe seleccionar **una hipótesis de demanda futura**, no adivinar un dato ya conocido por el simulador. La semilla y demanda real se fijaron antes de jugar y NO dependen de sus decisiones.

El usuario ve tres alternativas heredadas del catálogo V1: subestimación 80 %, referencia 100 %, sobreestimación 115 %. La **vista Decisión** incluye una frase contextual sobre el forecast y la **vista Indicadores** muestra, además de los dos indicadores I2-17, una tarjeta compacta sobre el equivalente de pedidos previsto. No se calcula ningún evento físico ni se revela el shock.

| Muestra base | 80 % | 100 % | 115 % |
| --- | ---: | ---: | ---: |
| 160 | 128 | 160 | 184 |
| 200 | 160 | 200 | 230 |
| 240 | 192 | 240 | 276 |

La fórmula coincide con la del contrato físico `commercial-planning.js`: `Math.round(plannedOrders * forecastPercent / 100)`. **No** representa demanda real, orden de compra emitida, pedidos expedidos ni costo total. La diferencia se compara con el forecast de referencia, no con un dato futuro.

El panel opcional «Cómo afecta Compras y al resto del CD» explica la cadena causal: pronóstico → cobertura → órdenes SKU originales → proveedor/lead time → recepción → calidad → inventario → picking → transporte. Presenta lead time **nominal del catálogo ficticio** (A 2, B 5, C 10 días), aclarando que fecha efectiva depende de proveedor y proceso.

## 2. Después de revelar demanda

`src/i2-mvp-adapter.js` utiliza exclusivamente `comparison.planningCommitment` junto a `commercialPlanningReading`, que coteja las órdenes originales congeladas y la demanda observada. `i2CommercialOutcomeReading` extrae una vista estrecha, auditada y congelada:

- Pronóstico de pedidos de muestra y pedidos realmente observados.
- Error (observados − pronosticados) y dirección subestimación/sobreestimación/coincidencia.
- Total de unidades SKU **comprometidas originalmente** y valor de compromiso en CLP **no pago ni gasto total**.
- Tres líneas A/B/C con cantidad original y día de llegada **previsto**, no recibido ni despachado.

La lectura aparece en el resultado final, después del reveal. No cambia compras originales, recuperación, semilla o apertura SKU. La compra extraordinaria nunca modifica el compromiso original.

## 3. Evidencia necesaria

- Test `tests/i2-commercial-forecast-lesson.test.mjs`: matriz 3 alternativas × 3 tamaños de muestra; libro previo sin demanda real; paridad forecast vs el compromiso canónico; mismo baseline/PO entre intervenciones; incremento real de compra al elegir forecast mayor con otros parámetros fijos.
- Test móvil `tests/browser-i2-commercial-forecast.e2e.mjs`: selección, recarga, ausencia de spoilers, explicación opcional, ocho decisiones, revelación, diferencia de forecast y compras originales, viewport móvil/landscape, V1 intacta.
- CI Node general, focused I2 y Chromium general; luego merge, Pages/HTTP y Chromium main.

## 4. Límites no resueltos

No hay pronóstico probabilístico o calibrado, stock financiero integral, pronósticos por SKU ajustables, tarifa real de proveedor, entrega final al consumidor o productividad persona-hora. La causalidad se apoya en reglas didácticas existentes; I2-19 profundizará Planificación/cobertura y su cálculo de compras. Las siguientes áreas, retos avanzados y tablero gerencial integral siguen en I2-19–40.
