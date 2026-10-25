# I2-14 · Metas de gestión y presupuesto en Misión CD (entrega incremental)

**Objetivo:** que el jugador sea evaluado por servicio **y** presión económica, sin confundir un 100 % de pedidos expedidos con una gerencia integral eficiente.

## Entregado en este PR

- Portada: sección plegable «Ajustar metas gerenciales» con meta de servicio según estrategia (**95 %** servicio, **90 %** equilibrio, **85 %** costo) y límite didáctico de **gasto incremental modelado**: CLP 0 / 50.000 / 150.000 / 300.000 / 600.000. Se parte del objetivo equilibrio / CLP 150.000, editable antes de confirmar Comercial.
- La preferencia se guarda en `supply-lab-i2-objectives-v1`. Nunca altera `supply-lab-i2-v1`, la partida V1 ni el motor de SKU. Después de confirmar la primera área las metas se muestran bloqueadas para impedir cambiar los objetivos a posteriori.
- Resultado final: dos indicadores textuales con semáforo **adecuado / atención / crítico** y sus metas. Servicio = expedidos/real a día 12. Gasto = importe **incremental modelado** del motor vs límite configurado. Verde cuando <= presupuesto, ámbar hasta +10 % y crítico sobre +10 %. Nunca publicar costo total como si se conociera.
- Una advertencia explícita evita conclusiones verdes globales cuando alguno de los dos ejes sea crítico; productividad por persona-hora, costos no tarificados y utilidad siguen como desconocidos.
- El panel de la configuración queda plegado por defecto para no añadir scroll exterior ni controles permanentes.

## Ampliación funcional: retos seedados (continuación de I2-14)

La segunda entrega conecta la configuración de dificultad con cinco escenarios **efectivos**, fijados por semilla antes de la primera confirmación. Incluye demanda real superior e inferior al pronóstico, revelación explícita, persistencia/reinicio sobre el mismo reto y conciliación con el motor físico SKU original. La configuración no cambia pronóstico, órdenes de compra o costo de forma silenciosa. La dificultad **ya no es un selector decorativo**.

Especificaciones y criterios verificables: [I2-14-RETOS-REPRODUCIBLES.md](I2-14-RETOS-REPRODUCIBLES.md). Los cinco casos son un primer catálogo de demanda; I2-26/35 siguen pendientes de diagnóstico ampliado y retos de proveedores, recepción, calidad y sobredotación.

**La finalización de I2-14 está condicionada a los gates y al merge de esta segunda entrega;** no se cuenta de antemano.

## Pruebas

- `tests/i2-management-objectives.test.mjs`: validación de presupuesto/objetivo, dos ejes independientes, sobrecosto rojo a pesar de servicio verde, cambios que no modifican V1 ni I2, datos no auditables rechazados.
- `tests/browser-i2-management-objectives.e2e.mjs`: 360×760 Android emulado, configuración plegable, selección, persistencia tras recarga, primera decisión bloquea cambios, cierre de misión con refuerzo y semáforos de resultado.
- Gate focused de I2, Node completa, Chromium general y Pages/HTTP antes de desplegar el cambio.

**Siguientes entregas:** I2-15 (configuración avanzada), diagnóstico I2-26 y retos ampliados I2-35; I2-17 y I2-31–33 ampliarán de dos a cuatro ejes de servicio, capacidad, espera y costos auditados. La meta es pedagógica y configurable, no un SLA estándar de una empresa real.
