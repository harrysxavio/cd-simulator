# I2-37.5a — Evidencia causal de las órdenes emitidas en jornada 3

**Fecha:** 5 de noviembre de 2026. **Estado:** candidata; no declarar publicada sin CI, merge y verificación HTTP de Pages.

## Pregunta del jugador
«Gasté en Compras o moví inventario. ¿Realmente mejoró el CD? ¿Qué hubiera pasado si no autorizaba esas órdenes?»

Esta microfase le permite a Nico responder con **datos del motor SKU**, en vez de solo mostrar una tarjeta con gastos o una felicitación genérica.

## Qué aparece en el diario
A partir de la **jornada 4 observada**, si se emitió una orden de Compras o Inventario el día 3, Nico muestra una comparación de la **misma campaña con/sin únicamente esas nuevas órdenes**:
- Pedidos acumulados expedidos hasta hoy, con y sin órdenes nuevas.
- Pedidos pendientes al cierre de hoy, con y sin.
- Unidades SKU en cola de Recepción, con y sin.
- Gasto adicional comprometido en CLP, no gasto contable ni pago verificado.
- SKU trasladados desde reserva y SKU de compra urgente llegados al muelle desde la orden.

Una observación de **0 pedidos adicionales** también es un hallazgo válido. La guía dice que invertir dinero o recibir unidades no garantiza expedición; debe revisarse si Calidad, Picking o Transporte continúan limitando el flujo.

## Integridad
`src/i2-day3-supply-impact.js` calcula dos escenarios con `i2CompareMultiRecovery`, conservando misma demanda, baseline, manifest original, calendario, capacidades y otras órdenes, pero retirando de uno las órdenes de Compras/Inventario **emitidas en día 3**. Si el ledger de días 0–3, el baseline o las POs originales dejan de coincidir, falla la lectura.

- No muestra datos del día 4 antes de observarlo.
- Con segundo incidente, aparece desde el diario de las jornadas observadas posteriores a la segunda decisión; no adelanta el evento.
- El read model retorna únicamente métricas acumuladas o del **día observado**, no ledger completo, expedición final, incidentes futuros ni supuestos valores de entrega al cliente.
- No escribe al guardado ni inventa costos; reserva preexistente no incorpora tarifa inventada.
- Si no hubo órdenes nuevas día 3, no muestra un contrafactual innecesario.

## QA
- `tests/i2-day3-supply-impact.test.mjs`: compra sola, reserva sola, combinación con refuerzo real de Recepción, segundo incidente, costos, días 0–3 idénticos y no spoilers.
- `tests/browser-i2-day3-supply-impact.e2e.mjs`: Pixel 7 / 320×568, escena vacía antes de revelación/día 4, compra autorizada, comparación visible, cuatro indicadores, guardado inmutable, recarga y scroll.
- Node + I2 focused + Chromium + Pages/HTTP obligatorios antes de fusionar/publicar.

## Estado del plan
Esta es la microfase **I2-37.5a**, no cierra todavía I2-37. **35/41 fases principales** completadas. Sigue pendiente ampliar órdenes diarias por Picking y Transporte, la interfaz de centro de mando, misiones físicas variadas y pruebas humanas Android/TalkBack.

Simulador: https://harrysxavio.github.io/cd-simulator/juego/
