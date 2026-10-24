# I2-06 · Fronteras económicas y privacidad para Misión CD

**Alcance:** protección de la interfaz gamificada; no se cambia el motor físico/económico de V1 ni se promete un balance financiero que sus datos no permiten. **24-10-2026**.

## Decisiones de negocio

1. **Alcances incompatibles:** pedidos completos de la cohorte SKU y unidades SKU físicas son cantidades distintas; ninguna es una «unidad equivalente» de jornada. Toda cuenta publicada en el juego debe acreditar `scope=sku-cohort`, `horizonDays=12`, `unit=orders`.
2. **Conciliación física:** `expedidos + pendientes = demanda real` y `expedidos basales + pendientes basales = demanda real`. `pedidos recuperados = expedidos con intervención - expedidos sin ella`. Se rechazan valores no enteros/negativos donde corresponda.
3. **CLP no son un único costo:** gasto incremental de intervención, compromiso inicial de compras y delta de proxy económico son conceptos diferentes. Ninguno equivale por sí solo a costo operacional total, pago confirmado, utilidad neta o EBITDA.
4. **Desconocido no significa cero:** `totalCostCLP`, `netProfitCLP`, `ebitdaCLP` y `customerDeliveredOrders` se publican como `null` explícito, sin transformarlos en `$0`. No se inventa última milla ni contabilidad completa.
5. **Datos mínimos:** vista segura sólo contiene cantidades tipadas y explicaciones de límites; no reenvía pedido original, identificadores de seguimiento, nombres, direcciones, órdenes de compra físicas, email ni registro de eventos. Las decisiones guardadas se serializan por whitelist desde I2-05.
6. **Sin terceros:** `/juego/` y sus módulos no ejecutan solicitudes de red hacia servicios externos ni recopilan identificadores personales. No hay backend ni telemetría en esta fase.

## Contrato técnico

- `src/i2-result-boundary.js` exporta `i2SafeScorecard(resultadoCanonico)`. Sólo acepta una cohorte revelada, conciliable, con importes numéricos finitos y costo total marcado como no conocido.
- La respuesta es **inmutable y explícitamente tipada**: cantidades por `measuredCount`, dinero por `{value,currency:'CLP',scope:'sku-cohort',kind,modeled:true,partial:true}`. `economic-proxy-delta` puede ser negativo, pero no es contabilidad real.
- `juego/app.js` usa la proyección validada tanto para la previsión opcional de recuperación como para la pantalla de cierre. Muestra solo dos KPI principales; fuentes y límites bajo detalles voluntarios.
- `scripts/verify-pages.mjs` prueba el **grafo real actual de módulos** (I2-04 → adaptador V1; I2-05 → estado; I2-06 → vista económica) y la respuesta HTTP pública de cada archivo; se elimina la verificación obsoleta que causó fallo en el run `40061279225` al exigir un import ya movido.
- `tests/i2-economic-privacy.test.mjs` y `tests/browser-i2-boundary.e2e.mjs` comprueban scope, sumas, $ parciales, nulos, whitelists de PII, ausencia de envíos externos y contenido sólo después del reveal.

## No cubierto por esta fase

No se ofrecen utilidades reales, rentabilidad completa, conciliación contable contra SAP, entregas a clientes ni simulación de mercado. Cualquier cifra económica completa futura necesitará fuentes adicionales, auditoría explícita y un contrato separado.

## Cierre de la microfase

Node y Chromium íntegros, focused MVP, merge y post-merge; Pages + GET públicos deben estar verdes, con el chequeo corregido. QA humano Android/TalkBack continúa como pendiente del programa I2.

**Siguiente microfase:** I2-07, tokens y contraste visual/semántico del juego móvil.
