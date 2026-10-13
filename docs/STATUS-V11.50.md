# Estado v11.50 · M5-21 · Esperar sin intervenir sobre el mismo baseline

**Plan maestro:** [43 microfases](EXECUTION-PLAN-43.md). **Al comenzar:** implementación propuesta, sujeta a Node, Chromium, integración, Pages y verificación HTTP antes de cierre.

## Objetivo

«Aceptar espera» debe ser una **decisión válida de no hacer ninguna recuperación**. No crea órdenes extraordinarias, traslada reserva, añade dotación, genera expediciones o fechas ficticias. Los pedidos que salieron físicamente del CD, y su día, deben coincidir con el **escenario real sin intervención**, pedido por pedido. Los que no alcanzaron a salir dentro del horizonte quedan pendientes con fecha de expedición futura *desconocida*.

## Corrección física importante: staging debe estar en la base

Antes del cambio el replay original creado en `integratedDemand()` siempre tenía `separateTransport=false`, mientras que una opción de recuperación podía activar `separateTransport=true`. Así se comparaban **dos modalidades operacionales distintas**, incluso cuando la opción elegida era «esperar», generando diferencias que **no procedían de la intervención**.

M5-21 introduce la modalidad de Picking/Transporte como **supuesto físico de partida del baseline compartido**, normalizada en `recoveryBaselineKey`, tanto para planificación como para demanda real. Cambiar la modalidad de staging ahora requiere una nueva firma de baseline y una simulación base compatible. No se presenta como una mejora causada por «esperar».

## Implementación

- `src/integrated.js`: `separateTransport` se aplica a ambas ejecuciones planificada y real originales, sin tocar cantidad/valor de PO original.
- `src/recovery-baseline.js`: la firma inmutable incluye ese modo, lo valida y rechaza reutilizar un baseline incompatible.
- `src/recovery.js`: para `option='wait'`, `recovered` es **exactamente el mismo objeto congelado** que `baseline.integrated.actual`, sin otra llamada a `eventSimulation()`. Alternativas activas conservan sus propios eventos y efectos.
- Nuevo `src/recovery-wait.js`: lectura pura, inmutable, `waitWithoutInterventionReadModel()`, que comprueba identidad del baseline, documentos, expediciones diarias, backlogs, fechas por pedido, pedidos preparados en staging que aún esperan Transporte, gastos y proxies incrementales iguales a cero, y ausencia de transferencias, compra urgente y refuerzos. No inventa `promisedDispatchDay` ni `confirmedCustomerDeliveryDay`: ambos son `null`.
- `src/app.js`: nueva explicación plegable en el comparador, «Esperar sin intervenir», muestra despachos al día 0/posteriores, pendientes al final, días-pedido de espera y cronología diario bajo demanda. La misión de recuperación advierte que los pedidos pendientes **no tienen fecha de salida prometida**, y confirma costo incremental CLP 0.
- `tests/recovery-wait.test.mjs` cubre baseline común por identidad, fechas pedido por pedido, staging sin camiones, reserva ubicada no liberada, recepción y calidad bloqueada, inventario no verificable, horizonte día 0, falta total de SKU, cambio de tarifas sin acción y recarga móvil de campaña.
- `tests/recovery-baseline.test.mjs` incorpora staging entre las condiciones que obligan a generar un baseline nuevo.
- E2E Chromium en escritorio/Android emulado 360/412 px, con panel inicialmente plegado, 13 días auditables, área táctil de al menos 44 px y sin scroll horizontal.

## Interpretación y limitaciones

- **Esperar es costo incremental cero** bajo los supuestos del simulador, no costo de operación cero: compras originales, actividades base y eventual demora siguen existiendo.
- Días-pedido pendientes y penalidades/tenencia estimadas pueden mantenerse en el baseline; son supuestos de comparación, no gastos bancarios reales ni nuevos costos por «esperar».
- El día en que un pedido se expide del CD **no equivale a entrega confirmada al cliente**. Fuera del horizonte no se promete ETA.
- Antes, en modo staging, algunos deltas incrementales podían derivar de comparar staging frente a una base sin staging. Esta inconsistencia se corrige; por eso algunos proxies de la comparación pueden cambiar **sin alterarse los movimientos físicos de cada alternativa**. No se mezclan motores de jornada agregada y cohorte SKU.
- El porcentaje **inicial** de RESERVA-CD sigue siendo una premisa de apertura y no una intervención; M5-23 abordará el traslado real.

## Siguiente

**M5-22 · Compra urgente:** SKU, cantidad, PO, plazo, recargo y recepción trazable desde la base congelada, nunca antes de la llegada del proveedor.

## Puerta de cierre

1. Node y Chromium de la PR aprobados.
2. PR integrada, Node y Chromium de `main` aprobados.
3. Pages desplegado y verificación HTTP pública de **v11.50, revisión 159**.
4. Android físico/TalkBack permanece pendiente para M7.

**Cierre verificado (13 de octubre de 2026, Chile):** PR [#48](https://github.com/harrysxavio/cd-simulator/pull/48) fusionada en `main` mediante commit `d688d0b`. Versión funcional **v11.50, revisión 159**.
- PR: [regresión Node #38453377223](https://github.com/harrysxavio/cd-simulator/actions/runs/38453377223) y [Chromium #38453377439](https://github.com/harrysxavio/cd-simulator/actions/runs/38453377439): **aprobados**.
- `main`: [modelo #38453947047](https://github.com/harrysxavio/cd-simulator/actions/runs/38453947047), [navegador #38453946397](https://github.com/harrysxavio/cd-simulator/actions/runs/38453946397), [Pages #38453945793](https://github.com/harrysxavio/cd-simulator/actions/runs/38453945793) y [verificación HTTP #38453947375](https://github.com/harrysxavio/cd-simulator/actions/runs/38453947375): **todos aprobados**.
- Se validaron identidad exacta de replay `wait===baseline.actual`, fechas y backlog de cada pedido, modalidades staging/camión, compra/recurso/traslado adicional cero y ninguna ETA inventada. Se corrigió el baseline anterior sin staging cuando la operación elegida sí tenía staging.
- **Límite:** Chromium emula dispositivos móviles; Android físico y TalkBack siguen pendientes de M7. Siguiente fase: **M5-22** compra urgente por SKU desde esta base.
