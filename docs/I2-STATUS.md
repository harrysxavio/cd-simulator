# Implementación 2 · Estado verificable de Misión CD

**Corte:** 25 de octubre de 2026 (Chile) · **Base V1:** v11.68 r177.  
**Plan técnico:** [41 microfases I2-00–I2-40](I2-PLAN-MAESTRO.md) · [Roadmap ejecutivo de 9 fases](I2-ROADMAP-EJECUCION-2026-10-23.md).  
**Enlace de la alfa:** https://harrysxavio.github.io/cd-simulator/juego/  
**Documentación del primer corte vertical:** [I2-MVP-ALFA.md](I2-MVP-ALFA.md).

## Resumen

- **I2-00–I2-18: 19 de 41 microfases con PR fusionado a main (~46,3 % de entregas).** El avance por número de microfases no es porcentaje de esfuerzo ni equivale a certificación del producto final.
- **MVP alfa vertical integrado en PR #79.** Campaña inicial +40 % ampliada por PR #100 a cinco retos exógenos de demanda ±, ocho decisiones, revelación explícita, consulta de cinco recuperaciones, resultado SKU físico y reinicio. Es un corte transversal para probar usabilidad, **no un cierre automático de I2-14 a I2-40**.
- **Control técnico del MVP:** [PR #79](https://github.com/harrysxavio/cd-simulator/pull/79) con Node, Chromium completo y pruebas enfocadas aprobadas antes del merge, commit `5f0186352022e52f398e25ff6afdf0ee7313ba74`. Comprobación post-merge de publicación, HTTP y Chromium en `main` se registra como tarea de liberación.
- **Defecto V1 #73 cerrado:** [PR #74](https://github.com/harrysxavio/cd-simulator/pull/74) integrado, suites main y PR aprobadas. V1 sigue operativa en la ruta raíz.
- **Validación humana aún abierta:** [issue #67](https://github.com/harrysxavio/cd-simulator/issues/67): Android físico, TalkBack, comprensión pedagógica con usuario principiante. Ninguna prueba en Chromium emulado reemplaza esta aceptación.

## Feedback de profundidad de juego — 24-10-2026

[**Plan de mejora gerencial y UX registrado**](I2-REVISION-GESTION-GAMIFICADA-2026-10-24.md). El usuario confirmó que la alfa muestra **poco impacto gerencial** pese a que V1 modela ocho áreas, compras, cronología SKU y costos auditados. Se elevaron los criterios de I2-14–I2-40: costo/servicio/capacidad/espera, semáforos y resultados multieje, contexto de plazos, demanda exógena seedada +/−, Nico presentado y pixel-art profesional, cierres con ×/backdrop y paneles laterales accesibles.

**La revisión #96 fue documental** y no completó microfases al momento de fusionarse. La implementación posterior de I2-14 se integró mediante [PR #98](https://github.com/harrysxavio/cd-simulator/pull/98) (metas/costos) y [PR #100](https://github.com/harrysxavio/cd-simulator/pull/100) (cinco retos exógenos). **Avance formal actualizado: 19/41**. No se certifican KPI integrales ni fases I2-26/I2-35 por asociación. Se conserva la profundidad de V1 y no se crea un «Costo total» SKU no auditado. La siguiente microfase formal es **I2-19**, Planificación y cobertura, conservando los criterios de costos, servicio, capacidad y plazos.

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

## Fases ejecutivas

| Fase | Microfases | Estado formal | Evidencia, pendiente y gate |
| --- | --- | --- | --- |
| F0 · Auditoría | I2-00 | **Completada** | Auditoría y plan fusionados; QA Android de V1 sigue issue independiente |
| F1 · Dos modos navegables | I2-01–03 | **Implementada** | Contrato, ruta y enlace integrados; validar publicación de la alfa |
| F2 · Motor/estado/economía | I2-04–06 | **Completada técnicamente** | Matriz 8×5, guardado migrable, privacidad y límites CLP verificados; Android/TalkBack pendiente fuera de fase |
| F3 · UX móvil y guía | I2-07–12 | **Completada técnicamente (6/6)** | Tokens, viewport, navegación, ayuda modal, mapa y guía opcional integrados; Android físico y TalkBack pendientes de aceptación transversal |
| F4 · Configuración y tutorial | I2-13–17 | **I2-13–17 integradas; F4 técnicamente completa (5/5)** | Briefing y retomar la partida verificados. Tutor, configuración y tres vistas integradas; Android/TalkBack pendiente en F8 |
| F5 · Ocho áreas | I2-18–25 | **I2-18 integrada; 1/8 áreas profundizada** | Comercial: pronóstico, compromiso SKU y desviación verificables. Planificación I2-19 siguiente; demás áreas pendientes |
| F6 · Demanda sorpresa y recuperación | I2-26–30 | **Recorrido alfa, no cerrado** | Revelación explícita y cinco estrategias; faltan diagnósticos completos y controles avanzados |
| F7 · Resultados/gamificación | I2-31–35 | **Resultado básico alfa** | KPIs físicos y costos modelados parciales; faltan logros, reto, niveles y comparador más completo |
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

## MVP alfa: exactamente qué puede probarse

1. Abrir `/juego/` desde la raíz o mediante enlace directo; volver a V1 sin perder campaña.
2. Jugar un caso de tres SKU y cinco retos (+40 %, +10 %, −15 %, +50 %, −35 %) con sorpresa explícita; configurar 160/200/240 pedidos de muestra, stock SKU, capacidad Picking y tarifa de refuerzo antes de tomar decisiones.
3. Seleccionar opciones de las ocho áreas y consultar ayuda opcional, sin cifras físicas de futuro durante el plan.
4. Elegir una de cinco recuperaciones, plazo y cobertura; consultar el efecto **calculado**, confirmar y visualizar expedidos, pendientes y costo incremental **parcial**.
5. Reiniciar la misión y recuperar un avance intermedio por `localStorage` propio, sin guardar datos personales ni libro físico detallado.

**No prometer todavía:** economía total, escenarios configurables libres, desafíos de múltiples causas, personaje avanzado, mejoras móviles en V1 ni certificación humana. Los montos CLP del modelo son ilustrativos: desconocido no significa cero. Despachar desde CD no equivale a entregar al cliente.

## Regla de avance

Cada microfase futura debe contar con contrato, tests, PR, merge y evidencia de despliegue cuando corresponda. La siguiente microfase formal es **I2-19** (Planificación y cobertura: cálculo de compromiso original por SKU, desvíos y plazos sin anticipar la demanda). F4 está integrada; Android físico, TalkBack y evaluación con novatos permanecen pendientes. F3 sigue integrada técnicamente, pero Android/TalkBack y comprensión de novatos permanecen pendientes. La alfa transversal no cierra otras fases automáticamente.

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
