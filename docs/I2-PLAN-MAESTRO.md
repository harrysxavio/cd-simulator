# Implementación 2 · Plan maestro de 41 microfases (I2-00 a I2-40)

**Estado:** plan técnico vigente de 41 microfases, adoptado a partir de v11.68 r177. **Corte 27-10-2026:** I2-00–I2-34 integradas técnicamente hasta [PR #126](https://github.com/harrysxavio/cd-simulator/pull/126); **35/41** microentregas (85,4 %, no porcentaje de esfuerzo). F5 completada (8/8), F6 completada (5/5) y F7 en progreso (I2-31–34, 4/5). I2-35–I2-40 pendientes de aceptación formal aunque existe un MVP alfa transversal. Los **21 PNG originales de Nico ya están en GitHub y fueron verificados con los bytes del respaldo**. Activación visual y voz más amistosa/documentada en [I2-NICO-ARTE-Y-VOZ.md](I2-NICO-ARTE-Y-VOZ.md); QA humano Android/TalkBack continúa pendiente. La auditoría física Android/TalkBack (#67) es transversal. Android físico/TalkBack/usuario aún pendiente (#67); defecto V1 #73 cerrado con PR #74. Ver evidencia en [estado actualizado](I2-STATUS.md). El [roadmap ejecutivo rebaselado de 9 fases](I2-ROADMAP-EJECUCION-2026-10-23.md) define hitos, UX, dependencias, métricas y orden de ejecución, sin cambiar estos IDs.  
**Objetivo:** desarrollar **Misión CD**, una interfaz alternativa y gamificada, prioritaria en teléfono, dentro del MISMO sitio del simulador.  
**Regla principal:** **V1 debe permanecer funcional y accesible**, con su motor de eventos, 3 SKU, 8 áreas, 5 recuperaciones y economía auditada. I2 reutiliza lógica y contratos, no los duplica. El ingreso a la ruta I2 solo será visible cuando tenga destino real, prueba de navegación y regreso al laboratorio.

**Revisión de criterio de negocio y UX del 24-10-2026:** [Profundidad gerencial, semáforos, retos justos y pixel-art](I2-REVISION-GESTION-GAMIFICADA-2026-10-24.md). **Criterios vinculantes para I2-14–I2-40; no cambia los 41 IDs ni da por implementadas mejoras futuras.** La interfaz debe enseñar productividad/capacidad, servicio, tiempos y economía con causas y fórmulas, no solo contar expedidos.\n\n**Corrección gerencial vinculante del 26-10-2026:** [Nico como mentor por área, tutorial inicial saltable, explicación de 3 SKU/12 días, recuperación combinando varias palancas y «La mirada de Nico» al cierre](I2-REVISION-PEDAGOGICA-GERENCIAL-2026-10-26.md). Auditada frente al roadmap y la revisión 24-10. **No añade IDs ni declara implementados estos requisitos.** Amplía I2-24–35, refuerza F4/F5 y se comprueba en I2-36–40.

**Fuente de verdad para ejecuciones futuras:** este plan. El [plan V1 de 43 microfases](EXECUTION-PLAN-43.md) permanece separado; I2 no altera su histórico ni cierra M7-38/M8-42 por asociación. Consultar [auditoría](I2-AUDITORIA-BASE-V11.68.md), [UX/guion](I2-EXPERIENCIA-MOVIL.md), [arquitectura y pruebas](I2-ARQUITECTURA-Y-PRUEBAS.md).

## Continuación técnica · Lab11 (31-10-2026)

**PR #133 integrado:** resumen gerencial final con Nico en seis preguntas; aceptación
funcional automatizada antes de merge. No cierra por sí solo I2-37.1.

**I2-35.5a/b en desarrollo (rama rebasada sobre #133):**
- 35.5a: calendario independiente de demanda, parada de Recepción y retención
  temporal de Calidad modeladas en `eventSimulation`. Pruebas de inventario y FIFO.
- 35.5b: incidente opt-in en `integratedDemand` (solo ejecución observada),
  `createRecoveryBaseline`, `recoveryComparison` y comparación I2 multiacción.
  Las compras comprometidas se congelan antes del incidente y todas las
  alternativas se comparan con un solo calendario causal.
- 35.5c: próximo paso, `eventSeed` persistente, revelar en jornada correcta,
  solo acciones ejecutables desde su decisión; separar laboratorio retrospectivo.
- 35.5d: aceptación de diversidad operacional con pruebas discriminantes,
  E2E móvil/humano y actualización de Pages.

Los contratos anteriores continúan vigentes. No recontar hijas en 35/41.
[Detalle y límites](I2-35-5-EVENTOS-OPERACIONALES-FISICOS.md).

## A. Contrato de avance

Cada microfase se desarrolla en **rama + PR pequeños** con criterio específico, prueba automatizada, revisión de regresión V1, merge a main, chequeos post-merge y, si afecta publicación, Pages + HTTP servido real. Registrar SHA, links y limitaciones en **docs/I2-STATUS.md** antes de declararla completa.

**Estados:** pendiente · en curso · bloqueada · completada. **No confundir** plan escrito con implementación. Cuando una fase dependa de prototipo de UI seleccionado, adoptar un diseño basado en las pantallas y el tono descritos en [UX](I2-EXPERIENCIA-MOVIL.md); guardar capturas y evidencias de QA, no imponer una maqueta inventada sin validación.

**Prioridad:** primero navegabilidad móvil y fiabilidad del motor; luego narrativa y gamificación; al final pulido. Evitar reorganizar por grandes épicas que nunca se pueden cerrar. Cada entrega debe conservar la aplicación usable.

### Puertas universales por PR

1. **Comportamiento reproducible:** inputs, eventos y efectos con alcance (SKU pedidos 12 días o jornada agregada) explícito.
2. **No regresión:** Node de V1, E2E V1 en escritorio/móvil y nuevas suites I2 correspondientes.
3. **Diseño accesible:** sin overflow horizontal, objetivos táctiles, foco, restauración de modales, contraste y motion reducido.
4. **Datos y negocio:** mismo escenario ⇒ mismos pedidos, compra original, ledger y costos modelo; ayuda nunca altera estado.
5. **Publicación:** no declarar verde hasta comprobar los assets y el manifiesto HTTP; no usar favicon/tema como sustituto de pruebas.
6. **Transparencia:** Android/TalkBack y comprensión de usuarios son puertas manuales. Una emulación no las cierra.
7. **Documentación:** estado, decisión, límites, próximos pasos y changelog breve por microfase.

## B. Índice operativo completo

| ID | Grupo | Entrega pequeña | Dependencia | Aceptación principal |
|---|---|---|---|---|
| **I2-00** | Base | Congelar auditoría de V1 y fricciones UX | V1 r177 | Matriz botones, alcance real y limitaciones; no cerrar manual Android |
| **I2-01** | Base | Contrato funcional I2 vs V1 | 00 | Lista de fuentes canónicas, unidades, límites |
| **I2-02** | Base | Ruta aislada I2 / reversibilidad | 01 | URL válida sin alterar index V1 ni sesión |
| **I2-03** | Base | Enlace de entrada/salida entre modos | 02 | Botón real «Jugar» + regreso accesible; ningún callejón sin salida |
| **I2-04** | Datos | Adaptador de campaña SKU | 01,02 | mismo baseline/manifiesto/ledger que V1 |
| **I2-05** | Datos | Persistencia separada y reinicio | 02,04 | I2 usa clave propia y migra correctamente |
| **I2-06** | Datos | Control de secretos y alcance | 04,05 | jamás datos reales ni promesas de entrega/EBITDA |
| **I2-07** | UI | Tokens naranja, color semántico y contraste | 02 | tema naranja, accesibilidad, independencia V1 |
| **I2-08** | UI | Shell 100dvh seguro | 07 | 320–430px y alturas cortas sin solapamientos |
| **I2-09** | UI | Footer de acción y volver | 08 | siguiente accesible sin scroll de página |
| **I2-10** | UI | Diálogo/hoja «¿Por qué?» | 08 | foco, escape, TalkBack, scroll interior |
| **I2-11** | UI | Componente de progreso y mapa | 08 | 4 capítulos / 8 áreas / micro-pasos coherentes |
| **I2-12** | UI | Guía/personaje opcional | 08,10 | contenido breve, desactivable, no intrusivo |
| **I2-13** | Inicio | Portada, rol, briefing y regreso V1 | 09,11 | comenzar, salir y retomar funcionan |
| **I2-14** | Inicio | Configuración básica segura (metas, presupuesto incremental, dificultad) | 04,13 | defaults válidos; cambiar objetivo no cambia demanda, semilla ni motor silenciosamente |
| **I2-15** | Inicio | Configuración avanzada plegable | 14 | editar múltiples campos, guardar/cancelar |
| **I2-16** | Inicio | Tutorial y presentación de Nico, pixel-art y modales | 12,13 | guía optativa; X/backdrop/Escape; foco; tutorial no cambia el cálculo |
| **I2-17** | Juego | Plantilla Decisión / Indicadores / Nico con swipe optativo | 09,10,11,16 | KPI/semáforo y CTA accesibles sin gestos obligatorios; 0 scroll exterior |
| **I2-18** | Áreas | Comercial y pronóstico | 04,17 | forecast antes de conocer shock |
| **I2-19** | Áreas | Planificación y cobertura | 18 | PO original derivada sin anticipar shock |
| **I2-20** | Áreas | Compras/proveedor y llegada | 19 | comprado ≠ entregado/recibido |
| **I2-21** | Áreas | Recepción y cola | 20 | capacidad diaria y espera trazadas |
| **I2-22** | Áreas | Calidad y stock retenido | 21 | liberación, no inventar mermas |
| **I2-23** | Áreas | Inventario y reserva localizada | 22 | conservación stock físico / verificable |
| **I2-24** | Áreas | Picking y pedidos completos | 23 | BOM y staging, preparado ≠ salida |
| **I2-25** | Áreas | Transporte y expedición | 24 | salido del CD ≠ entregado al cliente |
| **I2-26** | Shock | Evento reproducible ±, semilla previa y revelación explícita | 25 | demanda externa fija antes de decidir; sin castigo adaptativo durante campaña |
| **I2-27** | Shock | Diagnóstico servicio/forecast/cola/presión económica | 26 | 2 KPI visibles por vista, detalle multieje; causas verificables sin mezclar SKU/turno |
| **I2-28** | Recovery | Contrato de palancas conjuntas y simulación única | 27 | baseline único, reservas físicas, PO originales y costos sin sumas |
| **I2-29** | Recovery | Selector móvil y comparación conjunta de palancas y CLP | 28 | reserva física preubicada, 0/1/varias palancas, día 13 y gasto marginal |
| **I2-30** | Recovery | Confirmación trazada y reintento | 29 | confirmación reversible antes de aceptar; PO congelada |
| **I2-31** | Resultado | Tablero multieje y semáforos con metas/fuentes | 30 | servicio/capacidad/tiempos/costo; nadie aprueba todo con rojo crítico |
| **I2-32** | Resultado | Evidencia por área y cronología | 31 | 8 áreas/lotes/PO sin inventar stock |
| **I2-33** | Resultado | Contribución parcial auditada, costos por recuperación y fuentes | 31 | PO ≠ gasto; costo total desconocido; no doble conteo de material |
| **I2-34** | Juego | Insignias de aprendizaje justificadas | 31–33 | sin premiar gastos ficticios o clicks |
| **I2-35** | Juego | Retos al alza/baja, seeds, replay y niveles | 26,34 | ≥5 casos, mismo seed = mismos eventos, exógeno no depende del jugador |
| **I2-36** | QA | Matriz de controles E2E por estado | 13–35 | todos los controles de I2 clicables en su estado |
| **I2-37** | QA | Calidad móvil real de layout y foco | 36 | 320/360/390/412/430 + zoom/foco |
| **I2-38** | QA | Accesibilidad humana y comprensión | 37 | Android/TalkBack/usuario real con evidencia |
| **I2-39** | QA | Regresión integral y auditoría económica | 38 | reconciliaciones y escenarios extremos |
| **I2-40** | Release | Publicación I2 verificable, guía y versionado | 39 | Pages/HTTP/versión, criterios humanos y V1 intacta |

**Total:** 41 microfases (00–40). **I2-00–I2-34 fusionadas; I2-35 es la siguiente microfase formal.** Las fases posteriores tienen un MVP de recorrido parcial, no aceptación completa. Consulte el [estado con evidencia](I2-STATUS.md) y el [roadmap rebaselado](I2-ROADMAP-EJECUCION-2026-10-23.md).

## C. Criterios detallados de fases, organizados por paquetes pequeños

### C1. Baseline y ruta (I2-00 a I2-03)

**I2-00 · Auditoría congelada.** Entregar matriz de 32 botones estáticos + dinámicos por estado; lista de fricciones UX con pruebas de código y del navegador; KPIs, fuentes y riesgos. Aceptación: nueva suite audita configuración, ocho áreas, diagnóstico, cinco vistas, recuperaciones y confirma estados sin alterar el motor; estado de limitaciones reales consignado. **Evidencia:** docs/I2-AUDITORIA-BASE-V11.68.md, tests/browser-i2-legacy-audit.e2e.mjs.

**I2-01 · Contrato de producto.** Establecer decisión universal \`{campaignId,area,optionId,source,scope,time,confirmation}\`, dos ámbitos mutuamente excluyentes de cifras, máximo dos KPI iniciales por área y equivalencia V1/I2. Aceptación: 8 entradas y 5 alternativas mapeadas; casos de negocio aprobados por tests.

**I2-02 · Ruta separada y shell mínimo.** Construir \`/juego/\` (o \`/game/\` fijado definitivamente antes de codificar) como HTML estático bajo Pages, con módulos relativos, fallback de caché y control de errores. No tocar UX V1 salvo el futuro enlace. Aceptación: abrir URL directa, recargar, navegar hacia atrás y conservar sesión de V1 sin sobrescribirla.

**I2-03 · Botón «Jugar».** Agregarlo a cabecera de V1 solo cuando la ruta I2-02 tenga destino real. Regresar con \`Volver al simulador\` y CTA secundaria desde juego. Aceptación: ambos sentidos funcionan con teclado/tacto, no se pierde progreso ni se rompe una V1 guardada; prueba HTTP verifica index y ruta juego.

### C2. Modelo compartido y aislamiento (I2-04 a I2-06)

**I2-04 · Adaptador read-only y comandos.** Exponer \`gameCampaignAdapter\` que traduce decisiones I2 → \`campaignSkuContract\`, \`createSkuSessionCache\`, \`recoveryComparison\`; sin crear motor de segunda opinión. Test: igualdad exacta de pedidos, compras originales, stocks y despachos por SKU y día en 8 escenarios × 5 decisiones. Prohibido sumar \`flow()\` a \`eventSimulation()\`.

**I2-05 · Estado I2 persistente.** Clave propia \`supply-lab-i2-v1\`, versionado/migración, seed, subpaso y campaña, reglas de bloqueo de decisiones confirmadas, clear/restart. No sobreescribir \`supply-lab-v90\`. Tests: reload, back/forward, upgrade y JSON corrupto; I2 y V1 independientes.

**I2-06 · Guardas económicas y privacidad.** Unidades etiquetadas, desconocido como \`null\`, datos ficticios, no backend/PII por defecto. Test: rechazar pasos con scope erróneo y confirmar que no se exponga una cifra CLP agregada como utilidad SKU.

### C3. Sistema visual y ergonomía (I2-07 a I2-12)

**I2-07 · Tokens naranja.** Un sistema visual único (alto contraste con azul base V1; naranja como acción principal), estados de selección, alertas, foco, tarjeta CTA, hovers. Contraste medido con test y revisión manual.

**I2-08 · Contenedor de teléfono.** Layout en tres zonas: header, content scroll y footer, con \`100dvh\`, safe area y fallback. Test geométrico 320×568, 360×640/760, 390×844, 412×915, 430×932, landscape y zoom. No botón tapado por teclado.

**I2-09 · Zona inferior persistente.** Un botón primaria \`Siguiente / Confirmar\`, secundaria \`Atrás\`; saltos entre escenas resetean scroll interno. Aceptación: opción y CTA siempre dentro de la ventana, sin tener que subir/bajar página. Medir cantidad de scrolls exteriores para completar una elección (objetivo **0**, salvo accesibilidad con zoom especial).

**I2-10 · Hojas informativas.** Abrir ayuda «Qué mide»/«Impacto» sobre la misma escena, no saltar a 30 KPI ni otra página. Modales con \`role=dialog\`, \`aria-modal\`, foco, Escape y botón cerrar, scroll dentro y bloqueo de scroll de fondo. CI comprueba reapertura y retorno al elemento de origen.

**I2-11 · Barra de progreso.** Mostrar capítulo 1/4 y áreas 1/8; indicador de subpasos; mapa opcional sin revelar etapas futuras ni permitir saltarse decisiones congeladas en modo desafío. Test: retroceso respeta reglas y no cambia baseline.

**I2-12 · Personaje guía.** Acompañante estilo coordinador, rótulos de voz y personaje accesibles, silenciar/ocultar y persistir preferencia, cero interrupciones automáticas. No crear imágenes raster pesadas sin validación de identidad. Microcopy ≤2 líneas por intervención y sin revelar el shock.

### C4. Onboarding y personalización (I2-13 a I2-17)

**I2-13 · Portada y briefing.** CTA Comenzar, regresar al laboratorio, objetivo de campaña, qué es CD, 8 áreas, 3 SKU, 12 días. Flujo de primera experiencia ≤3 decisiones hasta primera área.

**I2-14 · Configuración simple.** Elección de meta servicio/costo/equilibrio, **presupuesto incremental modelado explícito**, dificultad, guía optativa y reto seedado. La meta solo cambia lo que el jugador prioriza y los umbrales de evaluación; **nunca cambia físicamente demanda ni costo sin advertir**. Default seguro para «Empezar sin configurar». Test con los mismos inputs produce el mismo ledger independiente de preferencias visuales.

**I2-15 · Configuración avanzada.** Ajustar forecast base, capacidad, inventario y costos sin redireccionar tras cada campo; botones Guardar y Cancelar; validación inline y advertencia si cambia baseline. Test: editar 3 campos seguidos, cancelar y reabrir sin pérdida de progreso.

**Refuerzo pedagógico F4/I2-13/16 (sin repetir su cierre histórico):** [PR #114](https://github.com/harrysxavio/cd-simulator/pull/114) integró tutorial de gerente de siete capítulos, saltable y reabrible, con cadena de ocho áreas, cliente, 3 SKU/12 días y métricas con sus límites; más guía gerencial profunda por área (función, control, indicadores, riesgos, ejemplo, comparación de 3 alternativas, pregunta y nivel). Los consejos breves siguen disponibles, los datos físicos no se exponen antes de revelar y las tres suites PR aprobaron. **Pendientes de este mismo refuerzo:** vincular guía y métricas reales de Picking/Transporte en I2-24/25, diagnóstico y ejemplos vivos en I2-26/27, botón «La mirada de Nico» basado en evidencia en I2-31–35 y aceptación humana I2-38. No sumó un ID al contador cuando se integró PR #114: eran **24/41**; el avance vigente posterior a Picking #116 es **25/41**. [Criterios](I2-REVISION-PEDAGOGICA-GERENCIAL-2026-10-26.md).

**I2-16 · Tutor de aprendizaje.** Presentar a **Nico como coordinador ficticio del CD** en el inicio (identidad y propósito en ≤2 frases), opt-in; guía por perfil novato/intermedio/avanzado sin tocar resultados. Definir sprites pixel-art originales, sobrios, fallback y contraste. Ayudas: **× visible**, Escape y clic real fuera del diálogo, restaurando foco y sin click-through. E2E compara modelos con ayuda visible/oculta.

**Evidencia de cierre I2-14–I2-16 (25-10-2026):** [#98](https://github.com/harrysxavio/cd-simulator/pull/98) y [#100](https://github.com/harrysxavio/cd-simulator/pull/100) (metas y retos), [#101](https://github.com/harrysxavio/cd-simulator/pull/101) (configuración avanzada), [#102](https://github.com/harrysxavio/cd-simulator/pull/102) (Nico). Los tres entregables tienen Node, focused y Chromium de PR aprobados; controles de Pages/HTTP y QA Android real se registran en [estado](I2-STATUS.md). No equivale a completar F4 sin I2-17 ni a certificar costos totales.

**Refuerzo transversal de Nico (25-10-2026; no suma microfase):** Los 21 PNG originales cargados por el usuario pasaron comprobación de integridad (Git SHA de cada archivo frente al respaldo). La voz pasó de frases sueltas a consejos optativos con explicación breve, ejemplo de bodega y pregunta orientadora. Nico evita spoilers y no altera decisiones; el arte cambia según el contexto y la evaluación posterior. [Contrato pedagógico y visual](I2-NICO-ARTE-Y-VOZ.md). No implica cierre de QA de F8 ni convierte láminas en iconos recortados.

**I2-17 · Componente de decisión.** Tres vistas ligeras **Decisión / Indicadores / Nico** con pestañas accesibles; swipe opcional como atajo de navegación horizontal, nunca acceso exclusivo. Acción principal fija; selección con \`aria-pressed\`, hasta 2 KPI principales por vista y semáforo con fuente/umbral; impactos de planificación visibles sin revelar demanda. Test unitario y E2E de 8 áreas, 0 scroll externo, 0 errores de foco.

**Cierre técnico I2-17 / F4 (25-10-2026):** [PR #103](https://github.com/harrysxavio/cd-simulator/pull/103), merge `1032f80`: tres tabs accesibles, un máximo de dos indicadores de supuestos anteriores al evento, comparación con referencia V1 y fuente, tutor opcional, CTA fijo, swipe no obligatorio y tres gates Node/Chromium/focused aprobados. F4 integrada; esta aceptación técnica no sustituye Android físico, TalkBack ni pruebas con usuarios de F8.

### C5. Ocho áreas consecutivas (I2-18 a I2-25)

**I2-18 · Comercial:** forecast conservador/preciso/optimista y compra inicial proporcional. No revelar valor de shock hasta I2-26.

**Cierre técnico I2-18 (25-10-2026):** [PR #104](https://github.com/harrysxavio/cd-simulator/pull/104) (merge `316ce8a`) integrado: equivalencia de pronóstico en muestra sin revelar demanda, causalidad aguas abajo, y lectura posreveal auditada de forecast frente a pedidos reales con compras originales A/B/C congeladas. Node, focused y Chromium general de PR aprobados. Véase [contrato](I2-18-COMERCIAL-FORECAST.md); no completa las demás siete áreas ni implica métricas de costos integrales.

**I2-19 · Planificación:** cobertura original y stock; PO por SKU derivada del forecast ya elegido, sin sobreescritura tras la sorpresa.

**Cierre técnico I2-19 (25-10-2026):** [PR #105](https://github.com/harrysxavio/cd-simulator/pull/105), merge `4554411`: Planificación 70/100/110 % con compra original proyectada por SKU (cantidades, stock de apertura, valoración CLP y lead time nominal) sin revelar shock; resultado final ligado a `planningCommitment` congelado, con paridad de compras para cinco semillas y recuperaciones. Suite Node, focused y Chromium general aprobadas. Ver [contrato](I2-19-PLANIFICACION-COBERTURA.md). No valida dinero pagado, entrega real ni costo operacional total.

**I2-20 · Compras:** proveedor barato/confiable/urgente con porcentaje de cumplimiento y llegada; entregado por proveedor no contado como stock recibido.

**Cierre técnico I2-20 (25-10-2026):** [PR #106](https://github.com/harrysxavio/cd-simulator/pull/106), merge `ab8e295`, valida diferencias entre orden original, fill proveedor, llegada al muelle, tránsito y recepción SKU; reutiliza `flow` y `supplierOrderLedger` de V1, separa compra urgente y recepción real. Node, focused y Chromium general del PR aprobados. [Contrato](I2-20-COMPRAS-PROVEEDOR-Y-ARTE.md). Los 21 PNG originales se subieron posteriormente y sus objetos Git se verificaron frente al ZIP; las expresiones y los consejos humanos se documentan en [I2-NICO-ARTE-Y-VOZ.md](I2-NICO-ARTE-Y-VOZ.md).

**I2-21 · Recepción:** capacidad física diaria, FIFO y cola; botón opcional «¿Qué se acumula?». No aumentar stock si la recepción vale cero.

**Cierre técnico I2-21 (25-10-2026):** [PR #109](https://github.com/harrysxavio/cd-simulator/pull/109), merge `50cee64`. Recepción compara capacidad elegida frente al turno base sin adelantar demanda; tras revelar, muestra eventos originales FIFO del muelle, recibos, cola al cierre, pico y detalle diario, con conservación de unidades por SKU. Caso de cero capacidad sin recibos ni creación de stock, además de regreso a Recepción confirmada. Node, focused y Chromium general de PR verdes. [Contrato y pruebas](I2-21-RECEPCION-FIFO.md). Las pruebas físicas Android y los indicadores financieros integrales siguen pendientes.

**I2-22 · Calidad:** lotes retenidos/liberados y tiempos; controles reales sin interpretar retención como pérdida definitiva.

**Cierre técnico I2-22 (25-10-2026):** [PR #110](https://github.com/harrysxavio/cd-simulator/pull/110), merge `550a925`: decisiones 75/95/100 % de revisión/liberación, interpretación pedagógica sin inventar rechazo/merma, y resultados originales por lote, SKU, día, unidades retenidas y tiempos hasta liberar. Pruebas de conservación, replay de cinco semillas y extremos 0 %/100 %. Node, focused y Chromium general del PR aprobados; QA humana en Android/TalkBack continúa abierta. [Contrato y pruebas](I2-22-CALIDAD-LOTES.md). F5 5/8, siguiente Inventario.

**I2-23 · Inventario:** ubicaciones, reserva interna, verificable versus físico, estado por SKU; no inventar stock al moverlo.

**Cierre técnico I2-23 (25-10-2026):** [PR #111](https://github.com/harrysxavio/cd-simulator/pull/111), merge `3fd25d4`. Inventario 85/95/99 % comparado con referencia 95 % sin filtrar demanda; tras reveal, desglose por SKU de PICK-FACE físico/verificable/no verificable, reserva, Calidad y staging sobre ledger original. Conservación física diaria de apertura + recepciones − expediciones, incluso traslado de reserva y casos 0/100 % exactitud; recuperación urgente no altera original. Node, focused y Chromium general del PR en verde; [contrato](I2-23-INVENTARIO-FISICO.md). Android real/TalkBack y evaluación gerencial integral siguen pendientes.

**Orden pedagógico después de PR #114 y #116:** I2-24 ya añadió BOM completa A/B/C, unidades por SKU y ensayo de staging sobre el motor original. I2-25 debe cerrar preparado vs expedido y riesgo al cliente. I2-26/27 deben mostrar al jugador un diagnóstico de cuellos y la diferencia entre supuesto, evento observado e hipótesis. **I2-28–30 siguen requiriendo cambio del contrato de recuperación a varias palancas compatibles evaluadas en una sola corrida conjunta**, nunca sumas de mejoras individuales; después I2-31–35 presentarán «La mirada de Nico» por resultado. Esta prioridad usa los 41 IDs actuales, con sub-PR pequeños y pruebas (incluidos casos de acción cara inútil, falta de B, día 13 y capacidad ociosa).

**I2-24 · Picking:** BOM completa, capacidad y tiempo de preparación, etapa de staging si está realmente simulada; enseñar por qué 3 SKU y 12 días afectan servicio. Nico presenta un ejemplo del pedido y mirada gerencial con consecuencias verificables; preparado ≠ expedido. Aceptación: SKU faltante bloquea pedido, muestra qué limita el flujo sin spoiler, y enlaza la explicación pedagógica contextual.

**Cierre técnico I2-24 (25-10-2026):** [PR #116](https://github.com/harrysxavio/cd-simulator/pull/116), merge `dc9e762`: cuatro plantillas BOM físicas y capacidades Picking originales, detalles auditados de pedidos preparados y expedidos en días 0–12, y explicación contextual de 3 SKU/12 días. Datos rotulados como **escenario original SIN recuperación**, para no confundirlos con el resultado de intervención del gerente; test de staging separado. Reutiliza las siete etapas del tutorial y ocho guías de Nico de [PR #114](https://github.com/harrysxavio/cd-simulator/pull/114) sin replicarlas. [PR #115](https://github.com/harrysxavio/cd-simulator/pull/115) se cerró por solapamiento con #114 y fue sustituido por #116. Node, focused y Chromium general de PR aprobados; QA humana Android pendiente. [Contrato I2-24](I2-24-PICKING-BOM.md). F5 7/8, siguiente Transporte.

**I2-25 · Transporte:** expedición y, cuando el motor lo soporte, staging/tránsito temporal: distinguir preparado, expedido del CD y entregado al cliente (no medido). Nico explica promesa al consumidor, capacidades y costo/esperas, sin simular entrega real.

**Cierre técnico I2-25 (25-10-2026):** [PR #117](https://github.com/harrysxavio/cd-simulator/pull/117) (merge `3f4c9fd`): capacidad prevista de 500/800/1000 SKU/jornada sin spoilers, expedición real del escenario original con detalle diario, pendientes, staging y diferencia explícita entre salida CD y entrega al consumidor. Comparación con auditor Picking, 5 semillas × 3 capacidades y prueba de transporte 0. Node completo, focused I2 y Chromium integral del PR aprobados; chequeos postmerge Pages/HTTP/main separados de la aceptación humana. [Contrato I2-25](I2-25-TRANSPORTE-EXPEDICION.md). **F5 8/8 completa técnicamente, 26/41; próxima I2-26.** **Para las ocho fases:** solo una escena nueva por PR, probar la misma elección frente a V1, volver atrás sin reejecutar mutaciones, microcopy accesible y sin overflow 320/360.

### C6. Sorpresa, diagnóstico y recovery (I2-26 a I2-30)

**I2-26 · Reveal explícito:** al acabar Transporte mostrar pantalla **sin revelar datos reales automáticamente**. Demanda externa precomprometida por **semilla, plantilla y dificultad antes de las decisiones**: puede crecer o decrecer (rango didáctico sujeto a pruebas), no se recalcula para castigar/recompensar decisiones. Botón «Revelar demanda» único, seed persistente, compras originales congeladas. Test de no-spoiler, mismo seed y signo positivo/negativo.

**Cierre técnico I2-26 (26-10-2026):** [PR #118](https://github.com/harrysxavio/cd-simulator/pull/118), merge `f8322ec`. Dos lecturas separadas por el estado de revelación: antes solo reto y muestra planificada; después evento observado, variación por pedidos y enseñanza de que la demanda externa no depende del desempeño. Reutiliza cinco retos semilla y `i2ChallengeReveal` sin simular una segunda demanda. Tests con cinco semillas × tres tamaños, decisiones divergentes, replay, no spoilers y V1 intacta. [Node](https://github.com/harrysxavio/cd-simulator/actions/runs/40308519143), [I2 focused](https://github.com/harrysxavio/cd-simulator/actions/runs/40308519163) y [Chromium integral](https://github.com/harrysxavio/cd-simulator/actions/runs/40308519313) aprobados antes de fusionar. [Contrato I2-26](I2-26-EVENTO-DEMANDA.md). **F6 1/5; 27/41 integradas técnicamente; I2-27 siguiente.** Publicación Pages/HTTP y QA Android/TalkBack separados de esta aceptación.

**I2-27 · Diagnóstico de gerente:** «Tenías X previstos, llegaron Y, faltan Z» dentro de **la misma cohorte SKU**; mostrar causas posibles múltiples, colas, cuello de botella y demanda real sin inventar causalidad. Acceso contextual a «¿Por qué 3 SKU y 12 días?», tutorial inicial saltable/reabrible y explicación de consecuencias en cliente. Nico distingue observación de hipótesis.

**Cierre técnico I2-27 (26-10-2026):** [PR #119](https://github.com/harrysxavio/cd-simulator/pull/119) (merge `003317d`). Nico ofrece diagnóstico post-reveal opcional: servicio base por pedidos, error de forecast, pendientes, seis señales (compras, muelle, Calidad, Inventario, Picking, Transporte), compromiso CLP original y ejemplos de cliente. Separa observación, señal e hipótesis, sin atribuir causalidad ni simular otro motor. Conserva dos KPI principales visibles; fuentes y tutorial gerencial bajo detalle. Node cinco retos × tres tamaños, E2E móvil positivo/negativo, V1 aislada. [Node](https://github.com/harrysxavio/cd-simulator/actions/runs/40310890249), [focused I2](https://github.com/harrysxavio/cd-simulator/actions/runs/40310890167), [Chromium general](https://github.com/harrysxavio/cd-simulator/actions/runs/40310890195) en verde antes de fusionar. [Contrato I2-27](I2-27-DIAGNOSTICO-GERENCIAL.md). **F6 2/5, 28/41; próxima I2-28**, recuperación multiacción conjunta. La aceptación humana y publicación post-merge se verifican aparte.

**I2-28 · Contrato y comparador de recuperación multiacción:** reemplazar en F6 el selector exclusivo como único mecanismo por un **conjunto versionado de palancas compatibles** (compras urgentes, reserva física existente, capacidad de refuerzo realmente modelada, fecha y cobertura). «No intervenir» es conjunto vacío y exclusivo. Comparar base, una y varias palancas **con una única evaluación conjunta del mismo baseline**, sin sumar deltas de opciones separadas ni duplicar stock, compras o CLP. Migrar guardados previos sin alterar V1.

**Cierre técnico I2-28 (26-10-2026):** [PR #120](https://github.com/harrysxavio/cd-simulator/pull/120), merge `1d49264`. Nuevo contrato `i2NormalizeMultiRecovery` y `i2CompareMultiRecovery` con 0/1/varias palancas compatibles: compra urgente por cobertura y día, traslado fechado de RESERVA-CD (solo si existe al inicio), refuerzo de +80 pedidos/jornada. Cada combinación se simula con **una única corrida conjunta** de `eventSimulation` y el **mismo baseline congelado**, sin sumar mejoras individuales ni sobrescribir compras originales. `recoveryComparison` y costos SKU preservan las cinco opciones públicas V1; el modo interno `multi` no se añade al catálogo visible. Pruebas de cinco seeds, fechas posteriores al corte, stock A/B/C, POs, traslados, gastos y compatibilidad V1. [Node](https://github.com/harrysxavio/cd-simulator/actions/runs/40317834010), [I2 focused](https://github.com/harrysxavio/cd-simulator/actions/runs/40317833918), [Chromium general](https://github.com/harrysxavio/cd-simulator/actions/runs/40317833827) aprobados antes de fusionar, tras corregir defectos detectados en pruebas anteriores. [Contrato I2-28](I2-28-RECUPERACION-MULTIACCION.md). **29/41; F6 3/5; siguiente I2-29** (UI móvil de fecha/presupuesto y comparador). I2-30 (confirmación persistente) y QA humana aún pendientes.

**I2-29 · Plazos, presupuesto y combinación:** controles accesibles para seleccionar 0/1/varias palancas compatibles, cantidad/cobertura, fecha y refuerzo bajo recursos/presupuesto modelados. Comparar día 2/10/13, Δ servicio, espera, capacidad y CLP **desde la evaluación conjunta**; nunca sumar ganancias individuales. Día 13 no rescata la cohorte día 12 y más personal sin SKU puede agregar costo sin servicio. Etiquetas distintas para compra y traslado, advertencia por capacidad ociosa y límites de costo total. Test de conflictos, fecha, relevancia y costo marginal.

**Cierre técnico I2-29 (27-10-2026):** [PR #121](https://github.com/harrysxavio/cd-simulator/pull/121), merge `fa9a9f9`. `juego/multi-lever-panel.js` y `i2MultiLeverPreview` permiten explorar tres palancas en 0/1/varias combinaciones, con cobertura, fechas, presupuesto como semáforo no bloqueante, gasto parcial y comparación conjunta/marginal del mismo baseline I2-28. Configuración avanzada permite ubicar RESERVA-CD 0/25 % del stock real **antes** de confirmar Comercial; las partidas previas siguen en 0 y las lecturas SKU de juego y comparador comparten esa apertura. No se crean unidades, PO ficticias ni se suman deltas individuales. Comparación temporal: **la intervención multiacción aún no se confirma ni se guarda**; eso es I2-30. Tests de 5 retos y combinaciones, reserva física, día 13, ahorro/ociosidad, viewport de 360 px y aislamiento de V1. [Node](https://github.com/harrysxavio/cd-simulator/actions/runs/40442435330), [I2 focused](https://github.com/harrysxavio/cd-simulator/actions/runs/40442435329) y [Chromium integral](https://github.com/harrysxavio/cd-simulator/actions/runs/40442435316) verdes antes de fusionar. [Contrato I2-29](I2-29-SELECTOR-MULTIACCION.md). **30/41; F6 4/5; siguiente I2-30** confirmación trazada/persistente, resumen final y reintento. Pages/HTTP y pruebas humanas deben validarse aparte.

**I2-30 · Confirmar o reintentar un plan multiacción:** resumen conjunto de servicio/tiempo/costo/uso de recursos con decisión reversible antes de confirmar, «no intervenir» posible. Confirmar evento trazable de la **combinación** sin modificar PO originales; persistencia, migración de recuperación simple, cancelación y replay mismo seed. Test múltiples palancas, pasos atrás y conflictos.

### C7. Resultados y motivación (I2-31 a I2-35)

**I2-31 · Resultado principal:** servicio y pendientes, botón opcional «La mirada de Nico como gerente» con fortalezas, compensaciones y preguntas basadas en evidencia, y **tablero gerencial de cuatro ejes** (servicio, productividad/capacidad, costo parcial y tiempo/stock) y semáforos con fórmula, umbral, explicación y fuente. «Expedido CD» no es entrega al cliente. No felicitar globalmente si un rojo crítico persiste; progreso de capítulos ≠ desempeño. En inicio solo 2 KPI, detalle bajo demanda.

**I2-32 · Detalle de ocho áreas:** acceso bajo demanda a cronología física y ejemplo causal que explique 3 SKU, BOM y días; PO, recepción, lotes, reserva, staging, Picking, salida y colas. Distinguir ejemplo didáctico de evento real por SKU/orden/lote y día; Nico conecta «decisión → efecto → consumidor» sin afirmar entrega medida. Nada narrativo altera el ledger.

**Cierre técnico I2-32 (27-10-2026):** [PR #124](https://github.com/harrysxavio/cd-simulator/pull/124) (merge `4d5074d`). Relato desplegable por ocho áreas con función, hecho, pregunta de Nico y posible impacto en consumidor. Cronología interactiva días 0–12, conservación de movimientos de SKU A/B/C, BOM y muestreo de un lote y un pedido **realmente registrados en el simulador original**, contrastados con lote/PO/BOM y fecha; ejemplos ausentes no se fabrican. Compara totales elegidos por recuperación clásica o confirmación multiacción SIN presentar los eventos originales como si pertenecieran a esa intervención. [Node](https://github.com/harrysxavio/cd-simulator/actions/runs/40566642746), [I2 focused](https://github.com/harrysxavio/cd-simulator/actions/runs/40566643173) y [Chromium integral](https://github.com/harrysxavio/cd-simulator/actions/runs/40566643009) verdes antes de fusionar. [Contrato I2-32](I2-32-TRAZABILIDAD-OCHO-AREAS.md). **33/41, F7 2/5; siguiente I2-33**, auditoría económica material/costos sin inventar nómina, P&L o costo operativo total. Android/TalkBack físico, comprensión novatos y publicación HTTP permanecen controles separados.\n\n**I2-33 · Economía honesta:** integrar el **`skuEconomicAuditReadModel` de V1** en la vista I2 sin nuevo motor: contribución parcial (valor ilustrativo despachos − material expedido − turnos extra activados), CLP incremental, compras comprometidas vs recibidas/consumidas, costos por pedido recuperado cuando Δ>0, horas/empleados como desconocidos si no hay evidencia. Ninguna caja pagada ni utilidad/EBITDA fingidas; no importar el «Costo total» de jornada agregada como KPI de cohorte SKU ni duplicar desembolsos.

**Cierre técnico I2-33 (27-10-2026):** [PR #125](https://github.com/harrysxavio/cd-simulator/pull/125) (merge `9be409a`). La vista de resultados reutiliza **`skuEconomicAuditReadModel` y `skuPartialContributionReadModel` de V1** para clasificar valor ilustrativo de pedidos completos expedidos, material realmente expedido, refuerzo desplegado, contribución parcial no contable y PO comprometidas frente a stock recibido/consumido. Ambas vías (clásicas y multiacción confirmada) se auditan desde su propio replay, comparando con baseline sin sumar efectos independientes. Métrica CLP extra por pedido recuperado solo si mejora >0; desconocidos ≠ $0. No inventa costo total, factura, pago ni EBITDA, y no modifica las 5 recuperaciones V1. [Node](https://github.com/harrysxavio/cd-simulator/actions/runs/40582207579), [I2 focused](https://github.com/harrysxavio/cd-simulator/actions/runs/40582207538) y [Chromium integral](https://github.com/harrysxavio/cd-simulator/actions/runs/40582207560) verdes. [Contrato I2-33](I2-33-ECONOMIA-SKU-AUDITADA.md). **34/41; F7 3/5; siguiente I2-34** logros y aprendizajes basados en evidencia. Publicación Pages HTTP y QA humana pendientes.

**I2-34 · Aprendizaje gerencial e insignias:** «La mirada de Nico» explica por estrategia lo que salió bien, mal, sacrificios y sugerencias concretas para mejorar; hipótesis vs hechos explícitos. Logros solo por evidencia de servicio/costo/espera (incluido no actuar cuando conviene), nunca por clicks, gasto o elegir siempre una opción fija.

**Cierre técnico I2-34 (27-10-2026):** [PR #126](https://github.com/harrysxavio/cd-simulator/pull/126), merge `90c25b7`. Nico explica hechos, aciertos, errores, sacrificios y mejoras por estrategia, distinguiendo explícitamente las hipótesis de lo registrado por el motor. Insignias con **verificación simultánea** de servicio verde, gasto incremental verde y cola final no crítica (<=10 %, criterio educativo); máximo una, incluida prudencia al no intervenir cuando realmente se cumplen objetivos. Un clic, gasto o palanca predeterminada no otorga méritos. Lectura única de scorecard I2-06, objetivos I2-14, tablero I2-31 y auditoría económica V1 I2-33; sin simular más ni persistir premios. [Node](https://github.com/harrysxavio/cd-simulator/actions/runs/40602088541), [I2 focused](https://github.com/harrysxavio/cd-simulator/actions/runs/40602088543), [Chromium integral](https://github.com/harrysxavio/cd-simulator/actions/runs/40602088504) verdes. [Contrato](I2-34-APRENDIZAJE-INSIGNIAS-NICO.md). **35/41, F7 4/5; siguiente I2-35**: retos reproducibles y balance realista servicio/costo. Android físico/TalkBack y publicación HTTP no certificados todavía.

**I2-35 · Retos reproducibles y decisiones no triviales:** ≥5 casos con semillas persistentes: sobrepronóstico con demanda baja, subpronóstico con demanda alta, proveedor tardío, recepción/calidad restringidas y sobredotación costosa. Demandas ± y dificultad preestablecidas **antes** del juego, nunca ajustadas en el reveal por desempeño; replay con mismas condiciones, comparar servicio/costo/cola y decisiones. Guardado migrable desde alfa fijo.

### C8. Verificación y entrega (I2-36 a I2-40)

**I2-36 · Auditoría de interacciones:** matriz automática de botones y estados de I2, roles accesibles, click/touch/teclado, 0 controles inertes, efectos/foco, casos cancelar y back. Capturas en test-results y evidencias de runs.

**I2-37 · Diseño móvil:** QA visual explícito del conjunto 320/360/390/412/430 con alturas cortas, orientación y zoom; CTA permanente sin superposición, hojas que no ocultan controles y contraste. Diferenciar emulación de evidencia física.

**I2-38 · Accesibilidad física y comprensión:** Android Chrome + TalkBack en dispositivo real; si se dispone, Safari/VoiceOver. 1–3 personas principiantes pueden saltar/reabrir tutorial, comprender recorrido de ocho áreas y 3 SKU/12 días, interpretar KPI/compensaciones, elegir varias palancas, explicar qué efecto tiene en cliente y completar la primera campaña. Registrar dispositivo, versiones, defectos, fechas y retest; no declarar aprobado sin usuarios reales. Registrar dispositivo, versiones, defectos, fechas y retest; no declarar aprobado sin usuarios reales.

**I2-39 · Auditar integridad y rendimiento:** matriz ≥8 escenarios × 5 alternativas, copias/costos/balance, pruebas de extremos, accesibilidad, latencia de transición y presupuesto de JS/screenshot en teléfono. No fusionar si V1 retrocede.

**I2-40 · Release independiente del juego:** ruta \`/juego/\` pública, enlace V1↔I2, versionado I2 desacoplado, README/manual, changelog, licencias y assets, verificaciones HTTP reales y evidencia de aceptación humana. **V1 debe seguir siendo el mismo laboratorio y sus sesiones deben permanecer intactas.** Solo entonces anunciar Misión CD como lista para usuarios.

### C9. Reglas adicionales de valor didáctico y realismo (feedback 24-10-2026)

Ver [documento de diagnóstico y fórmulas](I2-REVISION-GESTION-GAMIFICADA-2026-10-24.md), obligatorio para aceptación de I2-14–I2-40. La profundidad de V1 **no puede quedar oculta irreversiblemente** bajo tarjetas bonitas: información básica visible, detalle opcional por swipe/pestañas y libro/causalidad al final. Las decisiones útiles deben mostrar compensaciones de **servicio, capacidad, esperas y CLP parciales**; evitar que una sobredotación cara sea evaluada como éxito por despachar todo.

**No usar demanda adaptada a las decisiones en la misma campaña.** La habilidad del usuario afecta los resultados bajo una demanda exógena y semilla fijadas. La dificultad puede adaptar **siguientes misiones**, antes de comenzarlas y con aviso. **No afirmar productividad por persona-hora** cuando solo hay capacidad en slots/turnos modelados; medir throughput/tiempo y utilización con denominadores verificables.

## D. Criterios globales de calidad del producto

| KPI/criterio de salida | Meta verificable | Método |
|---|---|---|
| Botón de continuación | **0 scroll externo** desde selección visible hasta CTA en 360×760, 390×844 | geometría Chromium + revisión física |
| Elección básica | ≥1 alternativa y CTA dentro del viewport a 100 % zoom | Playwright 320–430 px |
| Explicación opcional | lectura no altera forecast, PO, stock, seed ni eventos | igualdad de snapshots y sesión |
| Integridad de resultados | 0 divergencias de conteo SKU/costo modelado frente a V1 con iguales parámetros | matriz 8×5, hashes y ledger |
| Progreso | 4 capítulos, 8 áreas y subpaso anunciado sin saltos indebidos | tests state-machine + E2E |
| Alcance económico | costo «no tarifado» ≠ 0; proxy ≠ utilidad | contratos Node y checks textos |
| Accesibilidad | WCAG AA color, foco visible, lector real, teclas, área táctil ≥44 | CI + sesiones físicas |
| Rendimiento | transición normal sin freeze visible, evitar ejecución redundante de motor | perfil de replay + presupuesto documentado |
| Persistencia | 100 % de escenarios de save/reload/reset/back aceptados | Node + E2E |
| Comprensión novatos | cada participante entiende salida CD vs entrega, PO vs recibido, costo no tarifado | protocolo manual y actas |
| Regresión V1 | Node/Chromium/Pages/HTTP sin fallos | CI y URL pública |

Las metas numéricas son criterios futuros, **no mediciones ya obtenidas**.

## E. Estrategia de releases y control de alcance

**I2 R0: Base segura (00–06).** Enlace del juego solo tras ruta funcional.  
**I2 R1: Ergonomía (07–17).** Shell de 1 pantalla, un CTA, onboarding y componentes.  
**I2 R2: Operación 8 áreas (18–25).** Ciclo de decisiones completo.  
**I2 R3: Demanda y recuperación (26–30).** Crisis de gerente, alternativas reales.  
**I2 R4: Evaluación y motivación (31–35).** Resultados, aprendizaje, reintentos.  
**I2 R5: QA/release (36–40).** Certificación, accesibilidad humana, publicación.

**No adelantar** logros, puntuaciones o mascota como sustitutos de ergonomía y coherencia de negocio. No crear otra plataforma, backend ni producto móvil nativo para esta entrega. Mantener GitHub Pages y JavaScript modular; evitar dependencias pesadas sin caso medido.

## F. Cómo continuar en cualquier chat o agente

1. Leer este documento **antes** del ROADMAP histórico o de inferir completitud.
2. Inspeccionar último \`main\`, estado I2-STATUS.md, PR y runs; las fases sin acta son **pendientes**.
3. Seleccionar **la primera microfase desbloqueada**, confirmar archivos afectados y prueba objetivo; no pedir de nuevo el brief que ya está documentado.
4. Implementar una entrega pequeña; ejecutar Node/E2E; PR; validar merge/main/Pages HTTP; añadir acta antes de marcar completada.
5. Informar en cada respuesta **«I2 n/41 — última completada, actual, próximo bloqueo»** y el estado de V1 si difiere.
6. Si un hallazgo invalida el plan, actualizar este MD con motivo, riesgos, fases afectadas y nueva secuencia en PR. **El documento actualizado reemplaza versiones anteriores para futuras sesiones**.
7. Si el usuario solicita pausa, no reanudar ejecución automática; si dice «continúa», retomar fase siguiente sin esperar aprobación adicional para pasos seguros de código.
8. Las pruebas físicas y el test de comprensión corresponden a usuarios reales; no simularlos ni marcarlos cerrados mediante IA.

**Estado inicial al escribir el plan:** fases implementadas de I2: **0/41** hasta que se integre y certifique el paquete de auditoría (I2-00). La funcionalidad del modo juego **todavía no se ha construido**. El botón de acceso no debe presentarse hasta que exista ruta utilizable.


## D. Rebaselining vinculante 28-10-2026 · microfases ampliadas I2-35–40

> **Actualización verificable 31-10-2026:** [PR #129](https://github.com/harrysxavio/cd-simulator/pull/129), [#130](https://github.com/harrysxavio/cd-simulator/pull/130), [#127](https://github.com/harrysxavio/cd-simulator/pull/127) y [#131](https://github.com/harrysxavio/cd-simulator/pull/131) integrados en main. I2-35.4 tiene comparador clásico probado y publicado; I2-35.2 incorpora piloto guiado ARC-06 probado (sin sexta semilla nueva). **I2-35 padre sigue abierto**, porque faltan retos distintos, cronología y progresión; F7 continúa 4/5, F8 0/5. El contador histórico permanece 35/41. Detalle en [I2-STATUS](I2-STATUS.md) y [contrato del piloto](I2-35-2-PILOTO-PICKING-JUGABLE.md).



**Regla:** este apartado prevalece sobre criterios anteriores cuando añade rigor o descompone su ejecución; los IDs históricos I2-00–40 permanecen. Los padres I2-35–40 solo cierran cuando todas sus hijas y puertas aplicables están verificadas. Las hijas NO incrementan el histórico 35/41. [Auditoría y guion pedagógico](I2-AUDITORIA-PRODUCTO-REBASELINE-2026-10-28.md). **Esta revisión documental NO implementa ni certifica el juego.**

> **Corte UX integrado 31-10-2026:** PR #132 merge `05d5ffa`; tutorial modal Nico, mentor por área, combinación prioritaria y señales físicas post-reveal con Node/Chromium verdes. **No equivale a incidentes aleatorios independientes ni a cierre de F7/F8**. [Contrato UX](I2-36-UX-JUGABILIDAD-VISIBLE.md) · [Estado](I2-STATUS.md).

**Orden de prioridad:** invariantes y cronología → diversidad demostrada → descubrir multiacción/entrada móvil → Nico y aprendizaje → intentos → QA/release. No alterar código de PR #127 sin reconciliar su HEAD y tests.

**Contrato universal por hija:** problema/beneficio en tabla; alcance, archivos, dependencias, prueba/aceptación y estado en tabla; riesgo compartido de no confundir plan con hecho ni costo parcial con P&L. Siguiente acción: implementar el primer criterio aún no comprobado, registrar PR+CI, actualizar STATUS y comprobar publicación si cambia interfaz.

| Microfase · propósito y beneficio | Alcance y archivos/componentes | Dependencia | Aceptación observable y evidencia | Estado |
|---|---|---|---|---|
| **I2-35.1 · Matriz física y cronología** — Probar qué cuellos representa de verdad el motor, y separar acciones futuras de experimentos retrospectivos. | src/; tests/i2-*; docs auditoría | Motor canónico, I2-34 | 8 fixtures y tests que identifiquen cuello, efecto temporal y estrategia diferenciada. | Parcial: ocho sondas + casos Picking/Calidad/gasto integrados; faltan muelle, staging y reloj causal |
| **I2-35.2 · Catálogo de arquetipos** — Crear escenarios de compras, inventario, muelle, calidad, picking y transporte con parámetros físicos soportados. | src/i2-challenge-config.js; src/i2-mvp-adapter.js; tests | 35.1 | ≥5 arquetipos operacionalmente distintos; cada uno tiene semilla, fixture, baseline, evento sellado y prueba de estrategia útil. | Parcial: tres sondas + piloto jugable ARC-06; faltan otros cuellos estratégicos |
| **I2-35.3 · Semántica de incertidumbre** — Evitar que un simulador perfecto antes de confirmar se presente como predicción. | src/i2-demand-event.js; juego/; tests | 35.1 | Modo laboratorio separado de decisión en vivo; hipótesis/exploración y alerta de contrafactual temporal probadas. | Parcial: laboratorios retrospectivos etiquetados; falta reloj de decisión ejecutable |
| **I2-35.4 · Comparación y replay** — Completar PR #127 sin confundir cinco recuperaciones clásicas con todas las combinaciones. | PR #127; src/i2-challenge-replay-matrix.js; juego/app.js; tests | 35.1–35.3 | Cinco alternativas clásico de mismo seed y plan, costos/cola; multiacción correctamente identificada; Node+E2E+V1 verdes. | Integrado main y verificado en Pages para alternativas clásicas; falta comparación de intentos/colas por recuperación |
| **I2-35.5 · Progresión de misiones** — Diversificar ritmo y mapa de dependencias, sin inventar cambios de motor. | juego/app.js; juego/styles.css; tests/browser | 35.2 | Rutas con diferencias de qué información y decisión aparece, y mapa de áreas mostrando dependencia/estado; revisión 320–430. | Parcial: señales físicas canónicas mostradas tras revelación; faltan eventos externos reales y ritmo diferencial entre misiones |
| **I2-36.1 · Contrato de decisión y botones** — Auditar descubrir multiacción, no intervenir, cancelar y confirmar, estados UI. | juego/app.js; juego/multi-lever-panel.js; tests/browser | 35.4 | Matriz por fase, todos los controles clicables, foco restaurado, distinción explorar/calcular/confirmar. | Pendiente |
| **I2-36.2 · Entrada rápida móvil** — Reducir fricción de portada sin ocultar configuración. | juego/app.js; juego/styles.css; tests/browser | 36.1 | Una CTA empezar sugerido; acceso independiente a tutorial, objetivos y avanzado; test de retorno/persistencia. | Parcial: portada más breve y tutorial fuera de ella; falta medir primer inicio con usuarios |
| **I2-36.3 · Tutorial progresivo y Nico** — Enseñar por capas, con pasos cortos y repetición controlada. | src/i2-nico-*.js; juego/help-dialog.js; juego/app.js | 36.2 | Siguiente/atrás/saltar/reabrir; capítulo por etapa; 3 capas por concepto, preferencia persistida. | Parcial: Nico en diálogo por siete pasos y consejo por área; faltan evidencia humana y fichas técnicas completas |
| **I2-36.4 · Descubrimiento de multiacción** — Jerarquizar las estrategias de recuperación y su efecto marginal. | juego/multi-lever-panel.js; juego/app.js; tests/browser | 36.1 | Usuario encuentra 0/1/múltiples acciones sin panel escondido; plan editado vs confirmado inequívoco. | Parcial: plan de cero/una/varias acciones como flujo principal abierto; falta ampliar palancas por áreas y validación humana |
| **I2-37.1 · Cierre en seis preguntas** — Priorizar resumen y aprendizaje sobre auditoría extensa. | src/i2-six-question-summary.js; juego/app.js; juego/styles.css; tests Node/E2E; paneles de auditoría existentes | 35.4 | Objetivo, delta, evidencia, sacrificio, consumidor y reintento antes de anexos; auditoría a demanda. | Corte 1 propuesto en PR #133: seis respuestas visibles; falta CI/merge/Pages, reducir carga de auditorías y QA humana. |
| **I2-37.2 · Hipótesis y reintentos** — Aprender probando políticas distintas bajo misma semilla. | src/i2-game-state.js; juego/app.js; tests | 37.1 | Registrar hipótesis voluntaria, cambio y observación; comparativa de intentos reproducible, sin calificar texto automáticamente. | Pendiente |
| **I2-37.3 · Diseño táctil y adaptativo** — Eliminar scroll competidor, superposiciones y CTA lejanas. | juego/styles.css; tests/browser | 36.4–37.2 | 320/360/390/412/430 px + altura corta, zoom 200%, teclado, reduced-motion y objetivos táctiles. | Pendiente |
| **I2-38.1 · QA automatizado transversal** — Garantizar funcionamiento de flujos y guardados. | tests/browser; tests/node | 37.3 | Matriz E2E por estado: persistencia, regreso, cancelar, ayuda, mismos resultados, V1 intacto. | Pendiente |
| **I2-38.2 · QA humano pedagógico y accesible** — Probar comprensión real, no emulación. | issue #67; docs/evidencia | 38.1 | Evidencia Android físico/TalkBack y usuario principiante: seis preguntas del contrato. | Bloqueado por validación humana |
| **I2-39.1 · Regresión SKU y causalidad** — Validar inventario, BOM, fechas, costos y multiacción. | src/; tests | 38.1 | Invariantes físicos, stock por estado, PO, plazos, costo marginal, no doble conteo; escenarios extremos. | Pendiente |
| **I2-39.2 · Aceptación de negocio** — No aprobar retos solo porque pasa el código. | docs/; tests; revisión humana | 39.1,38.2 | Cada arquetipo demuestra una decisión diferente útil, metas conocidas y sin premio por azar/clicks. | Pendiente |
| **I2-40.1 · Publicación verificable** — Asegurar que el artefacto publicado corresponde al SHA aceptado. | GitHub Actions; docs/I2-STATUS.md | 39.2 | CI verde, merge, Pages/HTTP asset+SHA, V1 y /juego/ funcionales, versión visible. | Pendiente |
| **I2-40.2 · Cierre y continuidad** — Entregar versión estable y trazabilidad. | docs/I2-STATUS.md; README | 40.1 | Guía para jugador, límites conocidos, defectos y checkpoint, evidencia humana y release. | Pendiente |

### Riesgos, restricciones y protocolo de continuación
- **Riesgo de retrocausalidad:** compra urgente con fecha anterior al reveal solo puede ser contrafactual de laboratorio; definir reloj de decisión y lead time explícitos antes de aceptar acciones en modo operativo.
- **Riesgo de falsos arquetipos:** no declarar bloqueo en Calidad, muelle o transporte sin evidencia SKU por día y pruebas donde cambia la decisión óptima.
- **Riesgo de sobrecarga visual:** texto en tres capas y un concepto central; información técnica consultable y visible a petición; no depender exclusivamente de desplegables.
- **Riesgo de métricas:** unidad, fórmula, período, fuente, denominador y límites visibles al consultar; costo total, productividad persona-hora y entrega final permanecen desconocidos cuando el motor no los mide.
- **Riesgo humano:** I2-38.2 no aprobable por Chromium emulado ni revisión de IA.
- **Checkpoint obligatorio en STATUS:** último merge, rama/PR en curso, SHA, pruebas ejecutadas y resultado, Pages+HTTP o no comprobado, bloqueo, archivos tocados, siguiente prueba/acción y criterios faltantes.
- **Primer paso exacto:** tomar matriz de restricciones en `src/i2-mvp-adapter.js` y contratos de Recepción, Calidad, Picking y Transporte; producir fixtures para ARC-01–08 y distinguir soporte actual vs cambio mínimo antes de modificar PR #127.
