# I2-29 · Selector móvil y comparación gerencial de recuperaciones conjuntas

**Alcance integrado por I2-29:** seleccionar 0/1/varias palancas, fechas/coberturas, reserva físicamente disponible, comparación de costos y servicio en una misma cohorte, detección de gasto inútil, ociosidad y advertencias de presupuesto. **Confirmación, evento de recuperación persistente, replay y resumen final con la combinación seleccionada son I2-30 y no se declaran aquí completados.**

## Antes de revelar

En Configuración avanzada el gerente puede **ubicar 25 % del stock físico A/B/C inicial en RESERVA-CD** o dejarlo en 0 % (valor histórico). Es un supuesto previo al plan: se guarda antes de la primera confirmación, se bloquea con Comercial y forma parte de `skuInputs`/`baselineKey`. No altera el stock total, crea compras ni inventa unidades desde el resultado. La configuración antigua sin `reservePercent` conserva la misma forma normalizada, baseline y simulación; `i2ValidateAdvanced` solo añade la propiedad opcional cuando es 25.

La reserva física se propaga a **todas** las lecturas de la misma misión, incluidas V1/I2-`option:'wait'`, cinco recuperaciones antiguas e I2-28. Por tanto el diagnóstico postshock, tablero final clásico y comparación multiacción nacen del **mismo escenario inicial**. La base normal es 0 %. Si no se ubicó reserva, el selector de traslado está deshabilitado con explicación del motivo.

## Después de revelar: comparador que no confirma

Se conserva el selector clásico de cinco opciones. Un `details` adicional, **«Ensayar combinación de acciones · sin confirmar»**, presenta tres interruptores independientes:

- Compra urgente SKU: día de llegada (1/2/5/10/13) y cobertura del faltante (0/25/50/75/100 %).
- Traslado desde RESERVA-CD: día de liberación separado (1/2/5/10/13), solo si la reserva existe en el baseline. Trasladar no es recibir de proveedor.
- Refuerzo operativo: +80 cupos máximos de pedidos/jornada, con cargo por turnos modelados activados; la capacidad ociosa queda visible.

**«Calcular impacto conjunto»** llama `i2MultiLeverPreview` y al contrato I2-28 `i2CompareMultiRecovery`, sin escribir almacenamiento ni disparar el evento de confirmación. Muestra el baseline «No intervenir», cada acción aislada y la combinación *evaluada físicamente como conjunto*; calcula servicio (expedidos/observados), pendientes, ganancia incremental del conjunto, CLP de compra + recargo + turnos, alertas de capacidad ociosa, llegada día 13 sin mejora y exceso del presupuesto **como meta no bloqueante**. Muestra también el efecto marginal de la última palanca respecto de un plan idéntico sin esa palanca. No suma ganancias de escenarios individuales ni presenta una cifra ficticia de costo total, nómina, entregas efectivas al cliente o utilidad.

`juego/multi-lever-panel.js` mantiene controles accesibles, labels asociados y detalle optativo. El encabezado principal de demanda continúa con máximo dos KPI; la página exterior no debe desplazarse. El panel temporal no se guarda ni reemplaza `state.recovery`: el botón inferior sigue confirmando **solo** la alternativa clásica hasta que I2-30 añada persistencia formal del conjunto. Los controles avisan explícitamente esta limitación y se reinician al refrescar.

## Verificaciones de aceptación

- Migración de configuración avanzada anterior y nuevas reservas 0/25, mismos PO originales y comportamiento V1 intacto para 0.
- Una única apertura SKU y escenario pre-reveal; baseline multi coincide con el baseline de `i2MvpPhysicalResult(option='wait')`, incluso con reserva 25 %.
- Variantes de cinco semillas ±; 0/1/2/3 palancas, beneficio marginal, costo modelado no aditivo; día 13 produce 0 pedidos extra por compra tardía, con costo posible.
- Budget objetivo verde/rojo sin bloquear pruebas; gasto sin servicio es advertencia; recursos ociosos y CLP etiquetados con límites.
- En Chromium 360 px: navegación, reserva deshabilitada si 0, selección de tres palancas y días, detalle de comparación, sin scroll exterior ni mutación de `supply-lab-v90` o guardado I2.
- Gate de PR Node completo + I2 focused + Chromium integral. Verificar después de fusionar estado de Pages/HTTP si es posible. Pruebas humanas Android físico, TalkBack y comprensión de novatos siguen en F8.

**Siguiente I2-30:** confirmar o cancelar el conjunto, registrar la elección con contrato validado, migración/restauración, replay y resultado final del plan elegido. No fingir que esta fase de comparación ya realiza esos cambios.
