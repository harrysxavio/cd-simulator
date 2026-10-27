# Implementación 2 · Estado verificable de Misión CD

**Corte:** 27 de octubre de 2026 (Chile) · **Base V1:** v11.68 r177.  
**Plan técnico:** [41 microfases I2-00–I2-40](I2-PLAN-MAESTRO.md) · [Roadmap ejecutivo de 9 fases](I2-ROADMAP-EJECUCION-2026-10-23.md).  
**Enlace de la alfa:** https://harrysxavio.github.io/cd-simulator/juego/  
**Documentación del primer corte vertical:** [I2-MVP-ALFA.md](I2-MVP-ALFA.md).

## Resumen

- **I2-00–I2-34: 35 de 41 microfases fusionadas a main (~85,4 % de entregas).** El avance por número de microfases no es porcentaje de esfuerzo ni equivale a certificación del producto final.
- **MVP alfa vertical integrado en PR #79.** Campaña inicial +40 % ampliada por PR #100 a cinco retos exógenos de demanda ±, ocho decisiones, revelación explícita, consulta de cinco recuperaciones, resultado SKU físico y reinicio. Es un corte transversal para probar usabilidad, **no un cierre automático de I2-14 a I2-40**.
- **Control técnico del MVP:** [PR #79](https://github.com/harrysxavio/cd-simulator/pull/79) con Node, Chromium completo y pruebas enfocadas aprobadas antes del merge, commit `5f0186352022e52f398e25ff6afdf0ee7313ba74`. Comprobación post-merge de publicación, HTTP y Chromium en `main` se registra como tarea de liberación.
- **Defecto V1 #73 cerrado:** [PR #74](https://github.com/harrysxavio/cd-simulator/pull/74) integrado, suites main y PR aprobadas. V1 sigue operativa en la ruta raíz.
- **Validación humana aún abierta:** [issue #67](https://github.com/harrysxavio/cd-simulator/issues/67): Android físico, TalkBack, comprensión pedagógica con usuario principiante. Ninguna prueba en Chromium emulado reemplaza esta aceptación.

## I2-34 · Aprendizajes gerenciales de Nico e insignias verificables (27-10-2026)

- **[PR #126](https://github.com/harrysxavio/cd-simulator/pull/126) fusionada** a `main`, squash `90c25b7e5222d1cad021bcff31dcbb64c8db176c`. [Contrato de aceptación](I2-34-APRENDIZAJE-INSIGNIAS-NICO.md).
- Desde resultados clásicos y de multiacción confirmada, el panel **«Nico evalúa tu gestión · aprendizajes e insignias»** reúne hechos del escenario, aciertos, riesgos, sacrificios de la estrategia, hipótesis **rotuladas como tales** y recomendaciones gerenciales específicas. Los resultados se leen desde el scorecard SKU validado, las metas I2-14, los cuatro ejes I2-31 y la auditoría económica V1 de I2-33; ningún ledger adicional ni simulación extra.
- Las cuatro categorías de insignia **no se regalan por clics, gastar ni escoger siempre una palanca**. Se exige simultáneamente servicio verde, gasto incremental verde y cola <=10 % (umbral didáctico); se reconoce incluso «no intervenir» solo cuando las métricas cumplen. Máximo una insignia por resultado, o explicación clara de por qué no se obtuvo. No se almacena el premio: se vuelve a deducir de la partida auditada tras recargar.
- **Tres CI verdes antes del merge**: [Node completo](https://github.com/harrysxavio/cd-simulator/actions/runs/40602088541), [I2 focused](https://github.com/harrysxavio/cd-simulator/actions/runs/40602088543), [Chromium integral](https://github.com/harrysxavio/cd-simulator/actions/runs/40602088504). Cubren 5 retos, cinco recuperaciones clásicas, 0–3 palancas, tres metas/bandas de presupuesto y navegaciones Pixel 7, sin afectar V1.
- **35/41 (85,4 %); F7 4/5** técnicamente integradas. **Próxima I2-35**, retos reproducibles y decisiones con trade-offs claros. Publicación HTTP de Pages tras merge y QA humana Android/TalkBack siguen sin verificación certificada.

## I2-33 · Auditoría económica SKU y mirada gerencial (27-10-2026)

- **[PR #125](https://github.com/harrysxavio/cd-simulator/pull/125) fusionada** a `main`, squash `9be409abade7f2c4ef1de14de89800ddb3aa1b7a`. [Contrato](I2-33-ECONOMIA-SKU-AUDITADA.md).
- **Reutiliza directamente `skuEconomicAuditReadModel` de V1** mediante `campaignSnapshot` del mismo replay físico (no un motor alterno) en recuperaciones clásicas y combinaciones confirmadas; adapta las tres auditorías V1 de compra urgente, reserva y refuerzo al contrato multiacción sin modificar el catálogo público de cinco recuperaciones clásicas.
- El panel plegable de resultado muestra valor **ilustrativo** de pedidos completos expedidos, costo estándar de SKU realmente expedidos, refuerzos activados y **contribución parcial didáctica** (no utilidad). Compara referencia sin intervención y escenario elegido; CLP incremental por pedido recuperado solo si Δ pedidos es positivo, o «no calculable» si no.
- Desglosa PO originales y urgentes comprometidas, recepciones, muelle, tránsito/faltantes y balance físico valorizado **apertura + recibido = material expedido + stock final**. No descuenta otra vez las compras como gasto consumido. 13 jornadas con valores conciliados y Nico explica ausencia de comprobantes de pago, factura, horas-persona, fletes, costo total o EBITDA.
- **Tres gates finales verdes:** [Node completo](https://github.com/harrysxavio/cd-simulator/actions/runs/40582207579), [I2 focused](https://github.com/harrysxavio/cd-simulator/actions/runs/40582207538) y [Chromium integral](https://github.com/harrysxavio/cd-simulator/actions/runs/40582207560). Se corrigieron antes del merge la admisión de intervenciones multiacción en auditorías V1 y una explicación de pagos explícita solicitada por pruebas móviles.
- **34/41 (82,9 %); F7 3/5 técnicamente integradas. Próxima I2-34.** Publicación HTTP de Pages posterior al merge, Android real/TalkBack y usuarios principiantes siguen pendientes.

## I2-32 · Ocho áreas, cronología física, pedidos/lotes y Nico (27-10-2026)

- **[PR #124](https://github.com/harrysxavio/cd-simulator/pull/124) fusionada a `main`**, squash `4d5074d69df822fac8572d821c3e4b67f87bfa5c`. [Contrato I2-32](I2-32-TRAZABILIDAD-OCHO-AREAS.md).
- En el resultado clásico o confirmado multiacción, la opción **«Las ocho áreas · sigue el pedido con Nico»** muestra observación, función, preguntas, posible impacto en consumidor y fuente por Comercial, Planificación, Compras, Recepción, Calidad, Inventario, Picking y Transporte. Cronología interactiva días **0–12**, estado por SKU A/B/C, BOM y ejemplos **derivados del ledger original** de lote real simulado (PO, día y cantidades) y pedido (BOM y estado de preparación/expedición), nunca inventados.
- Los 13 diarios se concilian con Recepción, Calidad, Inventario, Picking y Transporte; stock inicial + recepción = físico restante + expedición SKU. Se distingue explícitamente **plan original SIN recuperación** de los totales de la recuperación elegida; no se asignan colas antiguas a nuevas acciones ni se infieren entregas reales o causas únicas.
- **CI completo verde:** [Node general](https://github.com/harrysxavio/cd-simulator/actions/runs/40566642746), [I2 focused](https://github.com/harrysxavio/cd-simulator/actions/runs/40566643173) (116 Node y 52 pruebas móviles; cero fallos) y [Chromium integral](https://github.com/harrysxavio/cd-simulator/actions/runs/40566643009). V1 y escenarios clásicos/multiacción protegidos.
- **33/41 (80,5 %); F7 2/5** integrada técnicamente. **Próxima I2-33**, auditoría económica de materiales y gasto incremental sin inventar utilidad ni costo total. QA física Android/TalkBack (#67) y despliegue Pages HTTP posterior al merge aún requieren verificación independiente.

## I2-31 · Resultado de cuatro ejes y Nico gerente (27-10-2026)

- **[PR #123](https://github.com/harrysxavio/cd-simulator/pull/123) fusionada** al commit `5e1a4449bfc7a0743268a947801c47265f059e52`. [Contrato de aceptación](I2-31-RESULTADO-GERENCIAL-NICO.md).
- Después de los dos KPI principales se abre opcionalmente el tablero de **servicio**, **ritmo medio de expedición** (pedidos/12 jornadas; productividad persona-hora desconocida y sin semáforo falso), **costo extra parcial** y **pendientes día 12** (umbral de cola educativo explícito). Cada eje muestra fuente, fórmula, umbral y explicación.
- El botón desplegable «La mirada de Nico como gerente» presenta fortalezas, sacrificios, tres preguntas y límites de impacto en el consumidor. No declara éxito global cuando un semáforo es rojo. Las señales de Recepción/Calidad se rotulan SOLO como baseline original sin recuperación. Se utiliza el mismo motor y scorecard para estrategias clásicas y multiacción confirmada.
- **Pruebas finales aprobadas**: [Node](https://github.com/harrysxavio/cd-simulator/actions/runs/40515894641), [I2 enfocada](https://github.com/harrysxavio/cd-simulator/actions/runs/40515894671) y [Chromium integral](https://github.com/harrysxavio/cd-simulator/actions/runs/40515894640). Cinco semillas, modos clásico/multi y E2E Pixel 7, V1 sin alteración.
- **32/41 (78,0 %); F7 1/5.** Siguiente I2-32, trazabilidad física del detalle de ocho áreas. La comprobación de despliegue HTTP GitHub Pages y validación Android real/TalkBack siguen independientes.

## I2-30 · Confirmación y replay de combinación (27-10-2026)

- [PR #122](https://github.com/harrysxavio/cd-simulator/pull/122) fusionada: `25dfa7e`. [Contrato](I2-30-CONFIRMACION-MULTIACCION.md).
- El gerente puede confirmar/cancelar 0/1/varias palancas. El evento guardado incluye solo acciones, semilla, demanda y clave de baseline; no guarda libro físico ni valores contables. Replay de resultado desde el mismo motor SKU, mismo plan y compras originales.
- Volver a editar, descartar combinación, continuar con cualquiera de las cinco alternativas clásicas y reiniciar sin conservar la intervención. Resultado: servicio, pendientes, recargo/compra/turnos, reserva y capacidad ociosa; costo total y entrega consumidor desconocidos.
- CI final verde: [Node](https://github.com/harrysxavio/cd-simulator/actions/runs/40485354314), [I2 focused](https://github.com/harrysxavio/cd-simulator/actions/runs/40485354558), [Chromium integral](https://github.com/harrysxavio/cd-simulator/actions/runs/40485354334).
- **31/41 (75,6 %). F6 técnicamente 5/5. Próxima I2-31**: resultado principal gerencial y Nico. Android/TalkBack y comprobación HTTP de Pages todavía pendientes.

## I2-29 · Selector móvil multiacción y meta económica (27-10-2026)

- **PR #121 fusionada a `main`**, squash `fa9a9f900dd5a4f00035f098e125d9018a5138f4`. [Contrato I2-29](I2-29-SELECTOR-MULTIACCION.md).
- **Antes de Comercial:** opción avanzada de ubicar **0 % o 25 %** del stock físico inicial A/B/C en RESERVA-CD. La ubicación es parte del baseline, no stock adicional ni una decisión retroactiva. Los guardados anteriores sin campo de reserva conservan valor 0 y su estructura habitual. Lecturas clásicas y multiacción comparten ese escenario inicial.
- **Después del reveal:** panel móvil opcional con interruptores para compra urgente (cobertura y llegada), traslado de reserva física (día independiente y solo si existe) y refuerzo +80 pedidos/jornada. Botón **Calcular impacto conjunto** con 0/1/varias acciones, baseline «No intervenir», acciones aisladas, corrida conjunta, gasto CLP parcial, ociosidad, umbral de presupuesto como alerta, compra que llega día 13 y efecto marginal de la última palanca. Nunca sumar ganancias independientes ni inventar entrega al cliente, utilidad o costo total.
- **No se confirma ni persiste aún el conjunto**: los controles clásicos siguen funcionando y la previsualización combinada se reinicia al recargar. I2-30 debe implementar guardado, confirmación/cancelación trazada y resultado final basado en el conjunto.
- **Gates PR verdes:** [Node completo](https://github.com/harrysxavio/cd-simulator/actions/runs/40442435330), [I2 focused](https://github.com/harrysxavio/cd-simulator/actions/runs/40442435329) y [Chromium integral V1+I2](https://github.com/harrysxavio/cd-simulator/actions/runs/40442435316). Se corrigieron un rechazo legítimo de campo físico en la auditoría SKU y un selector que enviaba 25 como texto antes de fusionar.
- **30/41 (73,2 %), F6 4/5 integradas técnicamente; siguiente I2-30.** La comprobación pública postmerge de Pages/HTTP y las pruebas humanas Android/TalkBack no se dan por certificadas sin ejecutarlas.

## I2-28 · Contrato multiacción y replay conjunto SKU (26-10-2026)

- **PR #120 fusionada a `main`**, squash `1d4926439036e67c700b4579fd0f88767b3a38d2`. [Contrato I2-28](I2-28-RECUPERACION-MULTIACCION.md).
- `src/i2-multi-recovery.js` incluye contrato versionado, normalizador, migración lógica de las cinco recuperaciones clásicas y `i2CompareMultiRecovery`: 0/1/varias palancas dentro de una sola ejecución física por plan (compra urgente, traslado de RESERVA-CD preexistente y refuerzo de capacidad). La comparación reutiliza **un único baseline congelado**, las mismas ocho elecciones, las PO originales y la misma demanda revelada.
- `recoveryComparison` y `operationalCapacityCostReadModel` reciben una modalidad I2 opt-in; el catálogo **V1 conserva exactamente cinco opciones**. Una primera regresión reveló que la reserva V1 de stock cero debía conservar el comportamiento legado; una prueba Chromium posterior detectó que agregar `multi` al catálogo visible rompía controles V1. Ambos defectos se corrigieron ANTES del merge.
- Se prueba conservación por SKU/día, órdenes originales, no doble conteo, costos parciales, refuerzo con cupos ociosos, día 13 fuera del horizonte y rechazo de reserva inexistente o spoiler previo. `reservePercent` integra el baseline; no es recurso creado tras conocer la demanda. La configuración UI para reservar antes de planificar seguirá I2-29.
- **Gates finales verdes**: [Node completo](https://github.com/harrysxavio/cd-simulator/actions/runs/40317834010), [I2 focused](https://github.com/harrysxavio/cd-simulator/actions/runs/40317833918) y [Chromium integral V1+I2](https://github.com/harrysxavio/cd-simulator/actions/runs/40317833827). No se fusionó hasta aprobar los tres.
- **29/41 (70,7 %), F6 3/5** integradas técnicamente. **I2-29 pendiente:** controles móviles para elegir palancas, fechas y presupuesto; **I2-30 pendiente:** confirmación, persistencia y reintento. F7–F8 y Android físico/TalkBack siguen pendientes. Pages/HTTP posterior al merge se verifica por separado.

## I2-27 · Diagnóstico gerencial observacional de Nico (26-10-2026)

- **PR #119 fusionada a `main`**, squash `003317dce7bae9eb15b892dbb24be809bf0e23ab`. [Contrato I2-27](I2-27-DIAGNOSTICO-GERENCIAL.md).
- Después de la revelación el usuario puede abrir un panel opcional que **no añade KPI permanentes** al teléfono. Muestra lectura de servicio del **plan original sin intervención**, error de forecast comercial, pendientes, seis señales auditadas por área y compromiso de compras CLP. Enlace a tutorial de Nico y explicación de 3 SKU/12 días.
- Separación explícita entre **observaciones físicas, señales de presión e hipótesis**. La lectura `i2ManagementDiagnosis` no atribuye causalidad sin contrafactual; no mezcla SKU con pedidos, salida del CD con entrega final ni compra comprometida con costo total. Usa únicamente el baseline `option='wait'` de `i2MvpPhysicalResult` y el evento revelado I2-26.
- **Gates de PR verdes:** [Node completo](https://github.com/harrysxavio/cd-simulator/actions/runs/40310890249), [I2 focused](https://github.com/harrysxavio/cd-simulator/actions/runs/40310890167) y [Chromium general](https://github.com/harrysxavio/cd-simulator/actions/runs/40310890195). Cinco retos × tres tamaños, corrupción de datos, cambio de recuperación y E2E móvil positivos/negativos con V1 aislada.
- **28/41 (68,3 %), F6 2/5 integradas técnicamente.** Próxima **I2-28**, recuperaciones compatibles evaluadas conjuntamente; después I2-29 e I2-30. La verificación post-merge Pages/HTTP, Android físico y TalkBack no se consideran certificadas automáticamente.

## I2-26 · Demanda exógena sellada y revelación auditable (26-10-2026)

- **PR #118 fusionada a `main`**, squash `f8322ec1e0dd407c10ec8c727a1b91707e5deeef`. [Contrato I2-26](I2-26-EVENTO-DEMANDA.md).
- Antes de revelar, `i2DemandEventSealed` solo presenta reto, dificultad y volumen planificado: no comunica signo, porcentaje ni demanda real. Ocho decisiones confirmadas, única acción explícita de revelar, semilla persistida y plan original de compras congelado.
- Después de revelar, `i2DemandEventObserved` presenta demanda prevista, observada y desviación por pedidos de muestra. La sorpresa se determina por la semilla y el volumen de muestra, no por alternativas operacionales, presupuesto o recuperación. Cinco casos ± × tres tamaños (160/200/240) y decisiones distintas probados. Reproducible no equivale a secreto criptográfico.
- **Gates PR verdes:** [Modelos Node](https://github.com/harrysxavio/cd-simulator/actions/runs/40308519143), [I2 focused](https://github.com/harrysxavio/cd-simulator/actions/runs/40308519163) y [Chromium general](https://github.com/harrysxavio/cd-simulator/actions/runs/40308519313). Incluye test E2E con sorpresa positiva/negativa, persistencia y aislamiento de V1. Verificación post-merge Pages/HTTP aún separada.
- **27/41 (65,9 %), F6 1/5 integrada técnicamente.** Próxima I2-27 diagnóstico causal observable, luego I2-28–30 multiacción conjunta. Resultado gerencial profundo I2-31–35 y QA humana física #67 siguen pendientes.

## Feedback de profundidad de juego — 24-10-2026

[**Plan de mejora gerencial y UX registrado**](I2-REVISION-GESTION-GAMIFICADA-2026-10-24.md). El usuario confirmó que la alfa muestra **poco impacto gerencial** pese a que V1 modela ocho áreas, compras, cronología SKU y costos auditados. Se elevaron los criterios de I2-14–I2-40: costo/servicio/capacidad/espera, semáforos y resultados multieje, contexto de plazos, demanda exógena seedada +/−, Nico presentado y pixel-art profesional, cierres con ×/backdrop y paneles laterales accesibles.

**La revisión #96 fue documental** y no completó microfases al momento de fusionarse. La implementación posterior de I2-14 se integró mediante [PR #98](https://github.com/harrysxavio/cd-simulator/pull/98) (metas/costos) y [PR #100](https://github.com/harrysxavio/cd-simulator/pull/100) (cinco retos exógenos). **Avance formal actualizado: 35/41**. F7 4/5; F8 sigue pendiente, sin certificación humana por asociación. Se conserva la profundidad de V1 y no se crea un «Costo total» SKU no auditado. La siguiente microfase formal es **I2-35**, retos reproducibles y decisiones gerenciales no triviales, conservando las metas de servicio, costos, capacidad y plazos.

## Microfases integradas y evidencia

| Microfase | Entrega | Merge | Estado |
| --- | --- | --- | --- |
| I2-00 | Auditoría V1, plan, hallazgos y pruebas | [#71](https://github.com/harrysxavio/cd-simulator/pull/71) | Integrada |
| I2-01 | Contrato de decisiones y unidades SKU | [#76](https://github.com/harrysxavio/cd-simulator/pull/76) | Integrada |
| I2-02 | Ruta real `/juego/`, retorno y aislamiento V1 | [#77](https://github.com/harrysxavio/cd-simulator/pull/77) | Integrada |
| I2-03 | Acceso desde V1, navegación móvil y verificador Pages | [#78](https://github.com/harrysxavio/cd-simulator/pull/78) | Integrada |
| I2-04 | Adaptador único y paridad de 8 configuraciones × 5 recuperaciones | [#81](https://github.com/harrysxavio/cd-simulator/pull/81) | Integrada; Node, Chromium y suite enfocada PR verdes |
| I2-05 | Guardado I2 schema 2, migración desde schema 1, bloqueo tras confirmación | [#82](https://github.com/harrysxavio/cd-simulator/pull/82) | Integrada; Node, Chromium y suite enfocada PR verdes |
| I2-06 | Frontera de unidades, economía CLP parcial y privacidad; arreglo HTTP Pages | [#84](https://github.com/harrysxavio/cd-simulator/pull/84) | Integrada; Node, Chromium y suite focalizada PR verdes |
| I2-07 | Tokens accesibles, contraste AA, estados seleccionados y forced-colors | [#85](https://github.com/harrysxavio/cd-simulator/pull/85) | Integrada; Node, Chromium y suite focalizada PR verdes |
| I2-08 | Footer móvil fijo, pantallas cortas, horizontal y zoom aproximado | [#86](https://github.com/harrysxavio/cd-simulator/pull/86) | Integrada; Node, Chromium y suite focalizada PR verdes |
| I2-09 | Estado único del footer, volver, revisión de decisiones sin reescribir compras tras revelar | [#88](https://github.com/harrysxavio/cd-simulator/pull/88) | Integrada; Node, Chromium y suite enfocada PR verdes |
| I2-10 | Ventana modal para ayuda contextual, Escape y retorno del foco | [#89](https://github.com/harrysxavio/cd-simulator/pull/89) | Integrada; Node, Chromium y suite enfocada PR verdes |
| I2-11 | Capítulos 1–4, barra de progreso accesible y mapa opcional de 8 áreas | [#91](https://github.com/harrysxavio/cd-simulator/pull/91) | Integrada; Node, Chromium y suite enfocada PR verdes |
| I2-12 | Guía textual Nico opcional, un consejo breve y preferencia independiente | [#92](https://github.com/harrysxavio/cd-simulator/pull/92) | Integrada; Node, Chromium y suite enfocada PR verdes |
| I2-13 | Bienvenida compacta, rol y 3 pasos; regreso a V1 y continuación del plan sin repetir decisiones | [#94](https://github.com/harrysxavio/cd-simulator/pull/94) | Integrada; Node, Chromium completo y suite móvil enfocada PR verdes |
| I2-14 | Metas, presupuesto incremental, 5 retos seedados y replay idéntico | [#98](https://github.com/harrysxavio/cd-simulator/pull/98) + [#100](https://github.com/harrysxavio/cd-simulator/pull/100) | Integrada técnicamente; Node general, Chromium general y focused del PR #100 aprobados |
| I2-15 | Configuración avanzada Guardar/Cancelar, muestra 160/200/240, Picking 10/40 SKU por jornada, stock físico A/B/C y tarifa de refuerzo | [#101](https://github.com/harrysxavio/cd-simulator/pull/101) | Integrada técnicamente; Node, Chromium completo y focused en PR aprobados |
| I2-16 | Nico presentado, tutorial opcional por nivel, avatar SVG original y preferencias separadas del motor | [#102](https://github.com/harrysxavio/cd-simulator/pull/102) | Integrada técnicamente; Node, focused y Chromium general del PR #102 aprobados |
| I2-17 | Tres pestañas accesibles Decisión/Indicadores/Nico; dos supuestos trazables a V1, teclado, swipe opcional y footer fijo | [#103](https://github.com/harrysxavio/cd-simulator/pull/103) | Integrada técnicamente; Node, focused y Chromium general en PR aprobados |
| I2-18 | Comercial: forecast 80/100/115 %, equivalente de muestra visible antes de la sorpresa, efectos sobre compras y comparación posreveal con compra original SKU congelada | [#104](https://github.com/harrysxavio/cd-simulator/pull/104) | Integrada técnicamente; Node, focused y Chromium general del PR verdes |
| I2-19 | Planificación: cobertura 70/100/110 %, unidades y compromiso de compra SKU antes del shock, conciliación con PO original congelada tras la sorpresa | [#105](https://github.com/harrysxavio/cd-simulator/pull/105) | Integrada; Node, focused y Chromium general del PR aprobados |
| I2-20 | Compras 75/95/100 % de cumplimiento nominal; tasa efectiva V1, entrega versus muelle versus recepción física SKU, y rutas de arte Nico protegidas | [#106](https://github.com/harrysxavio/cd-simulator/pull/106) | Integrada técnicamente; Node, focused y Chromium general verdes. Arte original ya activado y verificado por [PR #108](https://github.com/harrysxavio/cd-simulator/pull/108) |
| I2-21 | Recepción: capacidad diaria, FIFO, cola de muelle, conservación SKU y resultado por día del mismo ledger original, sin spoilers | [#109](https://github.com/harrysxavio/cd-simulator/pull/109) | Integrada técnicamente; Node, focused y Chromium general del PR aprobados |
| I2-22 | Calidad: liberación 75/95/100 %, lotes originales auditados por SKU/día, retención temporal, tiempos de espera y extremos 0/100 sin inventar merma | [#110](https://github.com/harrysxavio/cd-simulator/pull/110) | Integrada técnicamente; Node, focused y Chromium general del PR aprobados |
| I2-23 | Inventario: exactitud 85/95/99 %, stock físico, verificable, no verificable y RESERVA-CD por SKU/día sin crear unidades | [#111](https://github.com/harrysxavio/cd-simulator/pull/111) | Integrada técnicamente; Node, focused y Chromium general del PR aprobados |
| I2-24 | Picking: pedidos completos con BOM por A/B/C, jornada 0–12, capacidad SKU y diferencia entre preparación y expedición; sin spoilers | [#116](https://github.com/harrysxavio/cd-simulator/pull/116) | Integrada técnicamente; Node, focused y Chromium general verdes. Tutorial gerencial reutilizado de [#114](https://github.com/harrysxavio/cd-simulator/pull/114), sin duplicación |
| I2-25 | Transporte: capacidad 500/800/1000 SKU/día, expedición original por día, staging auditado y diferencia salida/entrega | [#117](https://github.com/harrysxavio/cd-simulator/pull/117) | **Integrada técnicamente**; Node completo, suite I2 focused y Chromium general del PR verdes. Publicación/main pendientes de comprobación independiente |

## Fases ejecutivas

| Fase | Microfases | Estado formal | Evidencia, pendiente y gate |
| --- | --- | --- | --- |
| F0 · Auditoría | I2-00 | **Completada** | Auditoría y plan fusionados; QA Android de V1 sigue issue independiente |
| F1 · Dos modos navegables | I2-01–03 | **Implementada** | Contrato, ruta y enlace integrados; validar publicación de la alfa |
| F2 · Motor/estado/economía | I2-04–06 | **Completada técnicamente** | Matriz 8×5, guardado migrable, privacidad y límites CLP verificados; Android/TalkBack pendiente fuera de fase |
| F3 · UX móvil y guía | I2-07–12 | **Completada técnicamente (6/6)** | Tokens, viewport, navegación, ayuda modal, mapa y guía opcional integrados; Android físico y TalkBack pendientes de aceptación transversal |
| F4 · Configuración y tutorial | I2-13–17 | **I2-13–17 integradas; F4 técnicamente completa (5/5)** | Briefing y retomar la partida verificados. Tutor, configuración y tres vistas integradas; Android/TalkBack pendiente en F8 |
| F5 · Ocho áreas | I2-18–25 | **Completada técnicamente (8/8)** | Comercial, Planificación, Compras, Recepción, Calidad, Inventario, Picking y Transporte integrados. Validación humana Android/TalkBack aún abierta |
| F6 · Demanda sorpresa y recuperación | I2-26–30 | **I2-26–30 integradas; 5/5 técnicamente** | Demanda revelada, diagnóstico, contrato y comparador móvil de 0/1/varias acciones. Confirmación, persistencia y replay I2-30 integrados; falta QA humana |
| F7 · Resultados/gamificación | I2-31–35 | **I2-31–34 integradas; 4/5 técnicamente** | Tablero, economía SKU, aprendizajes/insignias auditadas; pendiente I2-35 retos y balance |
| F8 · Certificación y publicación estable | I2-36–40 | **Pendiente** | Controles, múltiples dispositivos, accesibilidad/TalkBack, evaluación y release estable |

## I2-14 · Cierre técnico (25-10-2026)

- [PR #98](https://github.com/harrysxavio/cd-simulator/pull/98) incorporó metas de servicio y presupuesto incremental modelado con dos semáforos separados.
- [PR #100](https://github.com/harrysxavio/cd-simulator/pull/100), merge `3f06f6733bf551d74f870c7c76cc8efe22d6a25d`, incorporó cinco retos reproducibles: demanda real +40 %, +10 %, −15 %, +50 % y −35 % sobre 200 pedidos previstos. La semilla queda fijada antes de confirmar y se conserva al repetir; la sorpresa no se muestra antes del reveal.
- **Gates del PR:** [Node](https://github.com/harrysxavio/cd-simulator/actions/runs/40192639267), [focused](https://github.com/harrysxavio/cd-simulator/actions/runs/40192639261) y [Chromium general](https://github.com/harrysxavio/cd-simulator/actions/runs/40192639393) aprobados. **Postmerge main:** [Pages](https://github.com/harrysxavio/cd-simulator/actions/runs/40193216630), [HTTP Pages](https://github.com/harrysxavio/cd-simulator/actions/runs/40193216713) y [Node main](https://github.com/harrysxavio/cd-simulator/actions/runs/40193216772) aprobados; [Chromium main](https://github.com/harrysxavio/cd-simulator/actions/runs/40193216779) debe verificarse por separado.
- Esto **cierra I2-14 técnicamente: 15/41**. No completa F4 (I2-15–I2-17), ni escenarios amplios I2-26/35, ni certificación de Android físico / TalkBack / usuarios (#67).

## I2-15 · Cierre técnico (25-10-2026)

- [PR #101](https://github.com/harrysxavio/cd-simulator/pull/101), merge `397a6a6e02ebab5f2b456b41c537852ad55bd6f3`, habilita editor avanzado transaccional en el inicio, conserva semilla en replay y usa parámetros físicos acotados. Se corrigió una primera propuesta de dotación que no alteraba el resultado; ahora se utiliza límite de 10 o 40 SKU/día para Picking.
- [Modelos PR](https://github.com/harrysxavio/cd-simulator/actions/runs/40194854831), [focused PR](https://github.com/harrysxavio/cd-simulator/actions/runs/40194854838) y [Chromium PR](https://github.com/harrysxavio/cd-simulator/actions/runs/40194854853) aprobados. [Pages](https://github.com/harrysxavio/cd-simulator/actions/runs/40196124224), [HTTP](https://github.com/harrysxavio/cd-simulator/actions/runs/40196124481), [Node main](https://github.com/harrysxavio/cd-simulator/actions/runs/40196124482) aprobados; [Chromium main](https://github.com/harrysxavio/cd-simulator/actions/runs/40196124421) comprobar por separado.
- **Avance: 16/41**. La edición avanzada no convierte costos parciales en costo total ni certifica Android físico/TalkBack (#67).

## I2-16 · Cierre técnico (25-10-2026)

- [PR #102](https://github.com/harrysxavio/cd-simulator/pull/102), merge `b59c79379dbc87fcc2bba40032395b32cc71c6da`, introdujo a Nico como coordinador ficticio, tutorial opcional novato/intermedio/avanzado, avatar pixel SVG local y perfil de texto aislado del motor físico. Los consejos continúan ocultos por defecto.
- [Node del PR](https://github.com/harrysxavio/cd-simulator/actions/runs/40196731088), [suite focalizada](https://github.com/harrysxavio/cd-simulator/actions/runs/40196731096) y [Chromium completo](https://github.com/harrysxavio/cd-simulator/actions/runs/40196731124) aprobados. Verificaciones postmerge Pages/HTTP/Chromium en `main` deben registrarse por separado.
- **Avance formal: 17/41 (41,5 %).** El arte es concepto inicial: aprobación estética/Android real/TalkBack y usuario principiante todavía pendientes (#67); costos integrales y tablero completo siguen fuera de esta microfase.

## I2-17 · Cierre técnico de F4 (25-10-2026)

- [PR #103](https://github.com/harrysxavio/cd-simulator/pull/103), merge `1032f80f75fed07b2283afa4a8de5b41602cf2d0`, añadió tabs ARIA Decisión/Indicadores/Nico, botones y navegación por teclado Home/End/flechas, swipe opcional, dos supuestos de planificación trazados a `NODES/PARAMETERS/DEFAULTS` V1, y señales relativas a la referencia **que no califican desempeño**. No cambia el motor, la cohorte SKU, el estado V1 o la semilla.
- **Gates PR aprobados:** [Node](https://github.com/harrysxavio/cd-simulator/actions/runs/40209324856), [focused I2](https://github.com/harrysxavio/cd-simulator/actions/runs/40209324842), [Chromium general](https://github.com/harrysxavio/cd-simulator/actions/runs/40209324874). Los controles postmerge Pages/HTTP y browser de `main` se verifican separadamente.
- **F4 I2-13–17 completada técnicamente (5/5). Avance formal total 18/41 = 43,9 %.** Android real/TalkBack y prueba humana (#67) continúan abiertos. El tablero de resultados multieje, costos integrales e interdependencias didácticas de cada área **NO** se cierran por este cambio; siguen en F5–F8.

## I2-18 · Comercial y forecast (25-10-2026)

- [PR #104](https://github.com/harrysxavio/cd-simulator/pull/104), merge `316ce8aa106cabc4793018143875df3d3b391355`: tres hipótesis comerciales 80/100/115 % y sus equivalentes de demanda *pronosticada* en muestra de 160/200/240; tarjeta causal con cobertura, compras, lead time nominal SKU y demás restricciones antes de conocer la sorpresa.
- Tras la revelación explícita, `commercialPlanningReading` compara forecast y demanda real con compras originales SKU y fecha estimada ya congeladas. No reescribe POs ni interpreta compra comprometida como pago, costo total o entrega.
- **Pruebas PR aprobadas:** [Node](https://github.com/harrysxavio/cd-simulator/actions/runs/40215712077), [Misión CD focalizada](https://github.com/harrysxavio/cd-simulator/actions/runs/40215712144) y [Chromium general](https://github.com/harrysxavio/cd-simulator/actions/runs/40215712074). Controles de Pages/HTTP y Chromium posteriores a la integración se verifican separadamente.
- **Avance formal: 19/41 (46,3 %). F5: 1/8 microfases.** Android físico/TalkBack (#67), economía integral y restantes áreas siguen pendientes.

## I2-19 · Planificación y cobertura (25-10-2026)

- [PR #105](https://github.com/harrysxavio/cd-simulator/pull/105), merge `455441146e36f9217d1914f9f7e06a84ebf276dc`: cobertura 70/100/110 %, forecast Comercial previamente confirmado, proyección SKU de unidades y compromiso de compra usando `inventoryPolicy` + `Math.ceil` canónicos; detalle plegable por A/B/C, stock de apertura y lead time nominal. **Nunca revela demanda futura ni crea un segundo motor físico.**
- Tras la revelación, usa `planningCommitment` del mismo replay SKU, congelado antes de sorpresa y recuperación, y comprueba la PO original por SKU y su valoración de compromiso; compra comprometida no equivale a pago ni ingreso físico.
- **Gates del PR aprobados:** [Node](https://github.com/harrysxavio/cd-simulator/actions/runs/40223049560), [Misión CD focalizada](https://github.com/harrysxavio/cd-simulator/actions/runs/40223049550), [Chromium general](https://github.com/harrysxavio/cd-simulator/actions/runs/40223049562). La primera ejecución detectó un fallo de texto en el test E2E; se corrigió y las tres suites verdes pertenecen al commit corregido.
- **Avance formal 20/41 (48,8 %); F5 2/8.** Verificaciones postmerge Pages/HTTP y Chromium de `main` se comprueban aparte. Android físico/TalkBack (#67), costos integrales, I2-20–40 pendientes.

## I2-20 · Compras y arte Nico (25-10-2026)

- [PR #106](https://github.com/harrysxavio/cd-simulator/pull/106), merge `ab8e2950708e2d2d81da178012de43a25c7a22f8`. Explica proveedor nominal 75/95/100 %, tasa efectiva redondeada desde `flow` de V1, cantidades originales SKU por proveedor, y audita en postreveal compromisos, llegadas, tránsito y recepción a bodega desde `supplierOrderLedger` y `receiptEvents`. Los cinco modos de recuperación conservan el mismo manifiesto original.
- **Gates aprobados en PR:** [Node](https://github.com/harrysxavio/cd-simulator/actions/runs/40225695689), [I2 focused](https://github.com/harrysxavio/cd-simulator/actions/runs/40225695690) y [Chromium general](https://github.com/harrysxavio/cd-simulator/actions/runs/40225695657). Pages/HTTP y Chromium postmerge de `main` se verifican separadamente.
- Nico: al integrar el PR #106 el atlas y el fallback estaban preparados, pero los PNG aún no habían llegado. **Estado vigente posterior: [PR #108](https://github.com/harrysxavio/cd-simulator/pull/108) recuperó y activó 21/21 PNG originales verificados byte a byte**; el Nico de cuerpo completo se muestra al inicio y las expresiones enriquecen ayuda, alerta, crisis y cierre. [Contrato de voz y arte](I2-NICO-ARTE-Y-VOZ.md).
- **Avance formal 21/41 (51,2 %); F5 3/8.** Android físico/TalkBack y QA con novatos sigue abierto en [#67](https://github.com/harrysxavio/cd-simulator/issues/67). F7 y F8 no completadas.

## Nico · arte original y consejos cercanos (25-10-2026, mejora transversal)

- [PR #108](https://github.com/harrysxavio/cd-simulator/pull/108), merge `2cd69489c82888ad52fb869509a5db1f2add0061`: se cotejaron los 21 objetos Git PNG de `juego/assets/nico/` con los bytes originales del respaldo y sus 21 SHA-256. Se activó arte auténtico (retrato completo, expresiones por contexto, fallback local), manteniendo las cinco láminas de iconos como fuentes sin recortar.
- Nico ahora explica cada una de las **ocho áreas en tres niveles** con frases amistosas, un ejemplo práctico y una pregunta orientadora. Evita spoilers de demanda, predicciones sin fuente y respuestas correctas automáticas. Los consejos continúan siendo optativos, el motor V1 y el estado I2 permanecen intactos.
- **Gates PR aprobados:** [Node](https://github.com/harrysxavio/cd-simulator/actions/runs/40229536033), [Misión CD focalizada](https://github.com/harrysxavio/cd-simulator/actions/runs/40229536032), [Chromium general](https://github.com/harrysxavio/cd-simulator/actions/runs/40229536097). Los checks de Pages y main posteriores al merge se revisan aparte.
- Ajuste de calidad de **I2-12/I2-16/I2-17** (en ese corte se mantenían **21/41 y F5 3/8**). **No sumó microfase**; el avance actual incorpora por separado I2-21, integrada posteriormente. Android físico/TalkBack y evaluación con usuarios (#67) siguen pendientes.

## I2-21 · Recepción, capacidad y cola FIFO (25-10-2026)

- [PR #109](https://github.com/harrysxavio/cd-simulator/pull/109), merge `50cee64eef1113a64b0a79be5f72fa5c9765711f`: tarjeta de capacidad de Recepción versus turno normal, explicación de cola FIFO desplegable sin filtración de demanda futura; resultado posterior con llegadas, ingresos físicos, cola al cierre y pico de espera en el mismo `comparison.base.ledger` SKU, con auditorías por día y SKU.
- El modelo **no inventa una cola** si el tamaño de muestra no satura Recepción. Test físico de capacidad cero demuestra que ninguna llegada se convierte en stock ni crea recibos si la capacidad no alcanza; validación de regreso a decisiones ya confirmadas.
- **Gates del PR aprobados:** [Node](https://github.com/harrysxavio/cd-simulator/actions/runs/40231764270), [Misión CD focalizada](https://github.com/harrysxavio/cd-simulator/actions/runs/40231764234), [Chromium general](https://github.com/harrysxavio/cd-simulator/actions/runs/40231764251). Postmerge Pages/HTTP y Chromium de `main` se comprueban separadamente. [Contrato técnico](I2-21-RECEPCION-FIFO.md).
- **Avance formal: 22/41 (53,7 %), F5 4/8.** Siguiente I2-22 Calidad. Android real/TalkBack y evaluación humana (#67) siguen pendientes.

## I2-22 · Calidad: lotes retenidos y liberados (25-10-2026)

- [PR #110](https://github.com/harrysxavio/cd-simulator/pull/110), merge `550a925f89137c234eb68f3044c54506bfa7cc05`: pre-reveal liberación declarada 75/95/100 % y comparación con referencia sin demanda futura; resultado post-reveal original auditado de ingreso, liberación y retención por `lotId`, SKU A/B/C y jornada 0–12. Cero liberación retiene todo y 100 % libera en la misma jornada de recepción **en el modelo**.
- Una retención no se interpreta como merma, daño, rechazo o pérdida; el motor didáctico no modela rechazos. Indicadores diarios y totales provienen de `comparison.base.ledger`, sin cambios al compromiso original ni recuperación extraordinaria.
- **Gates del PR aprobados:** [Node](https://github.com/harrysxavio/cd-simulator/actions/runs/40245871613), [Misión CD focalizada](https://github.com/harrysxavio/cd-simulator/actions/runs/40245871532), [Chromium general](https://github.com/harrysxavio/cd-simulator/actions/runs/40245871521); revisión automática sin hallazgos. Publicación y verificaciones posteriores al merge de `main` se inspeccionan separadamente. [Contrato](I2-22-CALIDAD-LOTES.md).
- **Estado actual 23/41 (56,1 %) y F5 5/8**; siguiente I2-23 Inventario. F6–F8 y QA Android/TalkBack (#67) no quedan certificadas por este avance.

## I2-23 · Inventario físico, verificable y reserva (25-10-2026)

- [PR #111](https://github.com/harrysxavio/cd-simulator/pull/111), merge `3fd25d4dddc631dec71b81a5aa878a557bba3f1d`: Inventario 85/95/99 % explicado por Nico, con compromiso previo sin revelar shock. Después de revelar, lectura original auditada de PICK-FACE físico, unidades verificables y por conciliar, RESERVA-CD, Calidad y STAGING-CD, por SKU y jornada.
- Pruebas de conservación `apertura + recepciones = stock físico en CD + expediciones` para cada día/SKU, traslados internos sin sumar unidades y extremos 0/100 % de exactitud. Una fracción no verificable no se declara perdida ni se considera merma. La recuperación urgente no reescribe el baseline.
- **Gates del PR aprobados:** [Node](https://github.com/harrysxavio/cd-simulator/actions/runs/40248044699), [Misión CD focalizada](https://github.com/harrysxavio/cd-simulator/actions/runs/40248044629), [Chromium general](https://github.com/harrysxavio/cd-simulator/actions/runs/40248044638). Hubo un fallo textual del E2E sobre el vocabulario de Nico; se corrigió y las tres suites se volvieron a ejecutar en verde. Publicación y CI postmerge se comprobarán de forma separada. [Contrato I2-23](I2-23-INVENTARIO-FISICO.md).
- **Avance formal 24/41 (58,5 %); F5 6/8.** Siguiente I2-24 Picking, luego Transporte I2-25. Android físico, TalkBack y prueba humana (#67) siguen pendientes.

## Corrección de criterios gerenciales/pedagógicos (26-10-2026; **no suma microfase**)

[Auditoría de observaciones y contrato de aceptación](I2-REVISION-PEDAGOGICA-GERENCIAL-2026-10-26.md). Se comprobó qué estaba previsto y qué no: el tutorial actual es breve y Nico entrega pistas con ejemplo, pero faltan enseñanza completa del CD, ficha gerencial por cada área, explicación útil de los tres SKU y 12 días, informe de aprendizaje por estrategia y, **principalmente, permitir varias acciones compatibles en la recuperación**. El selector actual de 5 alternativas es exclusivo (una opción + fecha/cobertura), NO simula una intervención múltiple conjunta.

- Ajustes incorporados al plan maestro y roadmap existente: refuerzo tutorial/mentor de F4–F5 desde I2-24–27; I2-24/25 BOM y cliente; I2-28–30 contrato/costos/confirmación multiacción con un solo replay físico por combinación; I2-31–35 informe «La mirada de Nico como gerente», resultados multieje y escenarios sin respuesta universal; I2-36–40 pruebas humanas/seguridad.
- **Primer refuerzo ya implementado mediante [PR #114](https://github.com/harrysxavio/cd-simulator/pull/114)**: tutorial de siete capítulos, saltable y reabrible, y ocho fichas gerenciales profundas con tres alternativas cada una. Sigue pendiente implementar recuperación multiacción y los informes «La mirada de Nico» basados en resultados físicos. **El contador formal permanece 24/41 (58,5 %) y F5 6/8**, porque es un refuerzo transversal, no una microfase I2-24 terminada.
- Mayor prioridad: preservar la profundidad de gestión (costo, servicio, tiempo, stock, capacidad), pero exponerla por capas sin saturar la pantalla del teléfono.

## Refuerzo pedagógico de Nico y tutorial gerencial (25-10-2026)

- [PR #114](https://github.com/harrysxavio/cd-simulator/pull/114), merge `21111104d3f8aac44c40f806370dcbc5bb3f564f`: tutorial introductorio opcional de **7 capítulos**, ejemplos basados en BOM real A/B y horizonte de 12 días; botón de saltar e iniciar; reapertura durante la campaña desde la vista Nico.
- Las **8 áreas** ahora incluyen «Entender [área] con Nico»: función y traspaso al siguiente eslabón, controles del gerente, KPI y límites, riesgos de cada alternativa, ejemplo, pregunta y lectura por nivel (novato/intermedio/avanzado). Se conservan los consejos cortos optativos y el personaje original.
- **Gates aprobados en el PR:** [Node general](https://github.com/harrysxavio/cd-simulator/actions/runs/40253105040), [Misión CD focalizada](https://github.com/harrysxavio/cd-simulator/actions/runs/40253105015), [Chromium general](https://github.com/harrysxavio/cd-simulator/actions/runs/40253105019). Tutorial/ayuda no revelan el shock ni alteran decisiones o V1. QA humana Android/TalkBack permanece pendiente.
- **No se ha implementado aún** la combinación de intervenciones reales de I2-28–30, informe gerencial basado en evidencia I2-31–33 ni evaluación de casos/replay I2-34–35. [Contrato detallado](I2-REVISION-PEDAGOGICA-GERENCIAL-2026-10-26.md). El avance formal vigente, después de integrar Picking #116, es **25/41**; siguiente **I2-25 Transporte**.

## I2-25 · Transporte y cierre técnico F5 (25-10-2026)

- **PR #117 fusionada a main** (squash `3f4c9fdc01d8743c773ca5b78ebf9fdec637cc6a`). Agrega lectura física de capacidad y expedición SKU, sin spoilers de demanda y sin reimplementar el motor de V1.
- **Resultados por día 0–12:** `shipmentEvents`, pendientes, cumplimiento de capacidad y staging físico reconciliados con el auditor de Picking I2-24. La pantalla deja claro que son cifras del **plan original sin recuperación**; en modo estándar no inventa una cola entre Picking y salida. Salir del CD no acredita entrega al cliente.
- **Gates PR aprobados:** [Node completo](https://github.com/harrysxavio/cd-simulator/actions/runs/40258506626), [I2 focused](https://github.com/harrysxavio/cd-simulator/actions/runs/40258506638) y [Chromium integral](https://github.com/harrysxavio/cd-simulator/actions/runs/40258506789), tras corregir un test del auditor compartido y un selector de panel que producía regresión en Picking. No se integró hasta tener las tres suites en verde.
- [Contrato y pruebas I2-25](I2-25-TRANSPORTE-EXPEDICION.md). **El chequeo posterior al merge** de Pages/HTTP y navegador de `main` es una verificación distinta y no se declara aprobada sin comprobar sus ejecuciones.
- **Estado formal 26/41 (63,4 % de microentregas), F5 8/8 completada técnicamente.** Siguiente **I2-26** (demanda exógena y revelación), luego diagnóstico I2-27 y recuperación multiacción I2-28–30; F7/QA posteriores pendientes. Android físico/TalkBack y prueba con usuarios principiantes siguen abiertos (#67).

## I2-24 · Picking y BOM completos (25-10-2026)

- [PR #116](https://github.com/harrysxavio/cd-simulator/pull/116), merge `dc9e7623b641d378e2c29cb25c956af2a3304db5`: Picking 1.400/2.300/3.000 SKU/jornada con límite físico avanzado 10/40 cuando esté configurado. Explicación en Indicadores de **cuatro BOM verdaderas** A/B/C, por qué hay tres SKU distintos y por qué el horizonte día 0–12 importa para plazos, pedidos completos y corte.
- Resultado posreveal de **pedidos completos originales** por tipo y día, auditados contra `comparison.base.ordersDetail`, `pickEvents`, `shipmentEvents`, incluido ensayo de staging separado. Se etiqueta **plan original sin recuperación**, no se confunde con el resumen tras intervención ni se atribuyen faltantes a un único eslabón sin evidencia.
- La tutoría inicial de siete capítulos y las ocho guías gerenciales ya estaban integradas por [PR #114](https://github.com/harrysxavio/cd-simulator/pull/114). [PR #115](https://github.com/harrysxavio/cd-simulator/pull/115) fue cerrado sin fusionar porque duplicaba ese refuerzo; #116 conserva una única implementación y amplía Picking. [Contrato I2-24](I2-24-PICKING-BOM.md).
- **Gates PR #116 aprobados:** [Node](https://github.com/harrysxavio/cd-simulator/actions/runs/40254534856), [Misión CD focalizada](https://github.com/harrysxavio/cd-simulator/actions/runs/40254535038), [Chromium general](https://github.com/harrysxavio/cd-simulator/actions/runs/40254534902). Postmerge Pages/HTTP y main se verifican separadamente.
- **Avance actual 25/41 (61,0 %); F5 7/8.** Próxima I2-25 Transporte. Recuperación multiacción I2-28–30, informe causal «Mirada de Nico» I2-31–35 y QA humana Android/TalkBack (#67) permanecen pendientes.

## MVP alfa: exactamente qué puede probarse

1. Abrir `/juego/` desde la raíz o mediante enlace directo; volver a V1 sin perder campaña.
2. Jugar un caso de tres SKU y cinco retos (+40 %, +10 %, −15 %, +50 %, −35 %) con sorpresa explícita; configurar 160/200/240 pedidos de muestra, stock SKU, capacidad Picking y tarifa de refuerzo antes de tomar decisiones.
3. Seleccionar opciones de las ocho áreas y consultar ayuda opcional, sin cifras físicas de futuro durante el plan.
4. Elegir una de cinco recuperaciones, plazo y cobertura; consultar el efecto **calculado**, confirmar y visualizar expedidos, pendientes y costo incremental **parcial**.
5. Reiniciar la misión y recuperar un avance intermedio por `localStorage` propio, sin guardar datos personales ni libro físico detallado.

**No prometer todavía:** economía total, escenarios configurables libres, desafíos de múltiples causas, personaje avanzado, mejoras móviles en V1 ni certificación humana. Los montos CLP del modelo son ilustrativos: desconocido no significa cero. Despachar desde CD no equivale a entregar al cliente.

## Regla de avance

Cada microfase futura debe contar con contrato, tests, PR, merge y evidencia de despliegue cuando corresponda. La siguiente microfase formal es **I2-35** (retos reproducibles, semillas exógenas y decisiones gerenciales con sacrificios costo-servicio). F4 está integrada; Android físico, TalkBack y evaluación con novatos permanecen pendientes. F3 sigue integrada técnicamente, pero Android/TalkBack y comprensión de novatos permanecen pendientes. La alfa transversal no cierra otras fases automáticamente.

## Cierre técnico I2-04 e I2-05 (24-10-2026)

- **I2-04:** PR [#81](https://github.com/harrysxavio/cd-simulator/pull/81), merge `6956b1cc97b9a1bc7019738ba2c71b1cce305550`. [Node PR](https://github.com/harrysxavio/cd-simulator/actions/runs/40060723088), [Chromium PR](https://github.com/harrysxavio/cd-simulator/actions/runs/40060723123) y [focalizada PR](https://github.com/harrysxavio/cd-simulator/actions/runs/40060723208) aprobados. Documento [I2-04](I2-04-CONTRATO-ADAPTADOR.md).
- **I2-05:** PR [#82](https://github.com/harrysxavio/cd-simulator/pull/82), merge `ae43ebad4b53e94e3d50346a660cb6d33fec0ad3`. [Node PR](https://github.com/harrysxavio/cd-simulator/actions/runs/40060727107), [Chromium PR](https://github.com/harrysxavio/cd-simulator/actions/runs/40060727193) y [focalizada PR](https://github.com/harrysxavio/cd-simulator/actions/runs/40060727069) aprobados. Documento [I2-05](I2-05-GUARDADO-Y-MIGRACION.md).
- **Publicación y controles posteriores:** [Node main](https://github.com/harrysxavio/cd-simulator/actions/runs/40061279184), [Chromium main](https://github.com/harrysxavio/cd-simulator/actions/runs/40061279179), [Pages](https://github.com/harrysxavio/cd-simulator/actions/runs/40061279300) y [HTTP](https://github.com/harrysxavio/cd-simulator/actions/runs/40061279225). **Verificar resultados antes de llamar release estable**. La alfa sigue siendo validación técnica sin Android físico.

## Cambios I2-06 a I2-08 (24-10-2026)

- **I2-06** [PR #84](https://github.com/harrysxavio/cd-simulator/pull/84), merge `69e1de4c6a2fd14e0164ef8ebe49b5db55ba593e`: proyección económica tipada con totales desconocidos en `null`, filtrado de datos sensibles y reparación del chequeo HTTP Pages. Documentación [I2-06](I2-06-LIMITES-PRIVACIDAD.md). [Node](https://github.com/harrysxavio/cd-simulator/actions/runs/40122141152), [Chromium](https://github.com/harrysxavio/cd-simulator/actions/runs/40122141162), [focused](https://github.com/harrysxavio/cd-simulator/actions/runs/40122141221) verdes. [Pages público main](https://github.com/harrysxavio/cd-simulator/actions/runs/40122675001) verde.
- **I2-07** [PR #85](https://github.com/harrysxavio/cd-simulator/pull/85), merge `0b04a49b47b2f159aac5f9861d03cd1ded1d99e4`: sistema de tokens semánticos y contraste, forced-colors y foco. Documentación [I2-07](I2-07-TOKENS-VISUALES.md). [Node](https://github.com/harrysxavio/cd-simulator/actions/runs/40122506896), [Chromium](https://github.com/harrysxavio/cd-simulator/actions/runs/40122506969), [focused](https://github.com/harrysxavio/cd-simulator/actions/runs/40122506877) verdes.
- **I2-08** [PR #86](https://github.com/harrysxavio/cd-simulator/pull/86), merge `4160a414c617cda6d236a768420db5d6a8da8e25`: tamaños 320–430 px, landscape, zoom aproximado, ayuda con scroll interno, footer y teclado. Documentación [I2-08](I2-08-GEOMETRIA-MOVIL.md). [Node](https://github.com/harrysxavio/cd-simulator/actions/runs/40122922857), [Chromium](https://github.com/harrysxavio/cd-simulator/actions/runs/40122922833), [focused](https://github.com/harrysxavio/cd-simulator/actions/runs/40122922802) verdes. [Pages main](https://github.com/harrysxavio/cd-simulator/actions/runs/40123473055), [HTTP main](https://github.com/harrysxavio/cd-simulator/actions/runs/40123472313) y [Chromium main](https://github.com/harrysxavio/cd-simulator/actions/runs/40123472323) son los controles post-merge; registrar su resultado antes de afirmar certificación final.
- **QA humano:** Android real, TalkBack y comprensión por usuario principiante siguen pendientes (#67). Simulación de viewport y pruebas automatizadas no sustituyen esta evidencia.

## I2-09 e I2-10 — navegación y ayuda (24-10-2026)

- **I2-09** [PR #88](https://github.com/harrysxavio/cd-simulator/pull/88), merge `92c76adb668e68db721e2cfd43c9ef2bcc0dc599`: contrato único de botones, plan posterior a revelación de solo lectura, transición sin mutación, almacenamiento y teclado. [Node](https://github.com/harrysxavio/cd-simulator/actions/runs/40127105867), [Chromium](https://github.com/harrysxavio/cd-simulator/actions/runs/40127105901), [suite móvil](https://github.com/harrysxavio/cd-simulator/actions/runs/40127105907) aprobados. Documento [I2-09](I2-09-FOOTER-NAVEGACION.md).
- **I2-10** [PR #89](https://github.com/harrysxavio/cd-simulator/pull/89), merge `d16418e0b86d4d0fac4a4675308709ed25095f06`: ventana modal accesible, Escape/foco, teclado/scroll. Documento [I2-10](I2-10-AYUDA-CONTEXTUAL.md). [Node](https://github.com/harrysxavio/cd-simulator/actions/runs/40127662030), [Chromium](https://github.com/harrysxavio/cd-simulator/actions/runs/40127662012) y [suite enfocada](https://github.com/harrysxavio/cd-simulator/actions/runs/40127662014) aprobados. La fuga de foco por Tab encontrada durante CI fue corregida. 
- **I2-11** [PR #91](https://github.com/harrysxavio/cd-simulator/pull/91) en revisión, no contabilizado: cuatro capítulos, mapa de ocho áreas, progreso accesible y comprobación de Pages.

## I2-11 e I2-12 — progreso y acompañante (24-10-2026)

- **I2-11** [PR #91](https://github.com/harrysxavio/cd-simulator/pull/91), merge `7b45cd7e8674bc3a118db9010c190bc3a327d6a6`. Cuatro capítulos, progreso accesible, mapa de ocho áreas sin salto y sin spoilers. [Node](https://github.com/harrysxavio/cd-simulator/actions/runs/40128744836), [Chromium](https://github.com/harrysxavio/cd-simulator/actions/runs/40128744809) y [focused](https://github.com/harrysxavio/cd-simulator/actions/runs/40128744845) aprobados. [Pages](https://github.com/harrysxavio/cd-simulator/actions/runs/40129297204) y [HTTP](https://github.com/harrysxavio/cd-simulator/actions/runs/40129297065) aprobados. Documento [I2-11](I2-11-CAPITULOS-Y-MAPA.md).
- **I2-12** [PR #92](https://github.com/harrysxavio/cd-simulator/pull/92), merge `32d57cf2a37e9b25b3e388f35b2f103e39613715`. Nico opt-in, guía breve, preferencia local aislada de V1/I2 y consejos sin spoiler. [Node](https://github.com/harrysxavio/cd-simulator/actions/runs/40129193557), [Chromium](https://github.com/harrysxavio/cd-simulator/actions/runs/40129193447) y [focused](https://github.com/harrysxavio/cd-simulator/actions/runs/40129193558) aprobados. [Documento I2-12](I2-12-GUIA-OPCIONAL.md). Los checks post-merge (Node, Chromium, Pages/HTTP) deben registrarse antes de hablar de certificación final.
- **Pendiente transversal:** Android físico, TalkBack y comprensión humana de principiantes; una emulación no equivale a certificación final.

## I2-13 — bienvenida y primera experiencia (24-10-2026)

- **I2-13** [PR #94](https://github.com/harrysxavio/cd-simulator/pull/94), merge `dae33a4eb0a07c2b6cea72ee56587c5a458b0dfe`: rol explícito, explicación simple del CD, tres cifras canónicas y tres pasos breves; inicio directo en Comercial y retorno al primer área pendiente sin reescritura del plan. [Node PR](https://github.com/harrysxavio/cd-simulator/actions/runs/40130984459), [Chromium completo PR](https://github.com/harrysxavio/cd-simulator/actions/runs/40130984453) y [suite focalizada PR](https://github.com/harrysxavio/cd-simulator/actions/runs/40130984473) aprobados. [Especificación I2-13](I2-13-BIENVENIDA.md).
- **Publicación y regresión post-merge:** no considerar la nueva portada verificada en sitio público hasta que los runs en `main` de Pages, HTTP, Node y Chromium informen sus resultados. La ruta sigue siendo `/juego/`.
- **Aceptación humana pendiente:** probar claridad del onboarding en Android físico y TalkBack y con usuarios principiantes; los tests emulados no son aceptación final.

## Referencias de QA del MVP

- [Node completo PR #79](https://github.com/harrysxavio/cd-simulator/actions/runs/40055438267)
- [Chromium completo PR #79](https://github.com/harrysxavio/cd-simulator/actions/runs/40055438303)
- [Suite focalizada teléfono + motor](https://github.com/harrysxavio/cd-simulator/actions/runs/40055438292)
- [Despliegue main PR #79](https://github.com/harrysxavio/cd-simulator/actions/runs/40055970843)
- [Verificación pública main PR #79](https://github.com/harrysxavio/cd-simulator/actions/runs/40055970726)
- [Chromium main PR #79](https://github.com/harrysxavio/cd-simulator/actions/runs/40055970697)
