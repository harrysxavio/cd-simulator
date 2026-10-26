# I2-26 · Evento exógeno de demanda reproducible y revelación explícita

**F6, primera microfase.** Complementa I2-14; no reimplementa las cinco semillas ya integradas ni altera el motor físico original de V1.

## Qué muestra el juego

- **Antes de revelar:** una escena de plan cerrado indica que el reto fue elegido antes de la primera confirmación, que las ocho decisiones quedaron cerradas y que la demanda todavía se desconoce. No se muestra el signo, porcentaje, cantidad real ni resultado de la simulación. La selección de reto y tamaño de muestra se bloquean tras la primera decisión.
- **Al pulsar «Revelar demanda»:** se conoce el escenario exógeno, la diferencia de pedidos respecto del volumen planificado, y se explica qué depende del mundo externo (demanda) y qué depende de la gestión (capacidad, stock, salida y costos). Se reutilizan las cinco semillas de I2-14, con variaciones +40 %, +10 %, −15 %, +50 % y −35 %.
- **Tras revelar:** el read model puro `i2DemandEventObserved` conserva la misma cantidad observada para una semilla y muestra iguales, independientemente de todas las elecciones, recuperaciones y presupuesto. Reproducibilidad **no significa seguridad criptográfica**: los cinco retos y sus porcentajes se encuentran en código abierto.

## Arquitectura y restricciones

`src/i2-demand-event.js` tiene dos funciones de lectura separadas por el estado autorizado del juego:

- `i2DemandEventSealed(state)` devuelve solo metadatos públicos y la cantidad **planificada** cuando la fase es `reveal`, se confirmaron las ocho áreas y `reveal === false`.
- `i2DemandEventObserved(state)` devuelve el valor determinista de `i2ChallengeReveal(seed, plannedOrders)` **únicamente después de** la transición explícita, sin usar `choices`, `recovery` ni reejecutar el motor físico.

Ni las ayudas de Nico ni las lecturas provocan eventos, reescriben compras originales o mutan `localStorage`. `i2MvpPhysicalResult` sigue calculando exclusivamente pedidos y su cumplimiento físico bajo la misma semilla tras revelar; no se utiliza antes para conseguir valores ocultos.

## Criterios de aceptación

- Cinco retos × tres tamaños de muestra (160/200/240), signos positivos y negativos, varianzas en pedidos correctas y recuperación con el mismo evento.
- Diferentes decisiones de las ocho áreas no modifican el evento de demanda.
- Pruebas antes y después de pulsar el único botón de revelar, back, reload y reinicio con la misma semilla.
- No mostrar demanda futura ni métricas de pedidos reales antes del evento. V1 `supply-lab-v90` permanece aislada.
- Node completo, focused I2 y Chromium general, después merge a `main`; comprobar Pages/HTTP cuando esté disponible. Android físico/TalkBack y usuarios novatos siguen en el gate I2-38.

**Lo siguiente:** I2-27 incorporará lectura multieje de servicio, forecast, colas y presión económica basada en fuentes conciliadas. I2-28–30 sigue siendo la implementación de multiacción real, no solo su documentación.
