# Implementación 2 · Plan maestro de 41 microfases (I2-00 a I2-40)

**Estado:** propuesta ejecutable y persistente, adoptada a partir de la auditoría de v11.68 r177.  
**Objetivo:** desarrollar **Misión CD**, una interfaz alternativa y gamificada, prioritaria en teléfono, dentro del MISMO sitio del simulador.  
**Regla principal:** **V1 debe permanecer funcional y accesible**, con su motor de eventos, 3 SKU, 8 áreas, 5 recuperaciones y economía auditada. I2 reutiliza lógica y contratos, no los duplica. El ingreso a la ruta I2 solo será visible cuando tenga destino real, prueba de navegación y regreso al laboratorio.

**Fuente de verdad para ejecuciones futuras:** este plan. El [plan V1 de 43 microfases](EXECUTION-PLAN-43.md) permanece separado; I2 no altera su histórico ni cierra M7-38/M8-42 por asociación. Consultar [auditoría](I2-AUDITORIA-BASE-V11.68.md), [UX/guion](I2-EXPERIENCIA-MOVIL.md), [arquitectura y pruebas](I2-ARQUITECTURA-Y-PRUEBAS.md).

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
| **I2-14** | Inicio | Configuración básica segura | 04,13 | defaults correctos, sin interruptor forzado |
| **I2-15** | Inicio | Configuración avanzada plegable | 14 | editar múltiples campos, guardar/cancelar |
| **I2-16** | Inicio | Tutorial opcional y perfil de usuario | 12,13 | saltar ayuda sin cambiar la simulación |
| **I2-17** | Juego | Plantilla «Entender → Decidir → Impacto» | 09,10,11,16 | uno por pantalla, sin lectura obligatoria |
| **I2-18** | Áreas | Comercial y pronóstico | 04,17 | forecast antes de conocer shock |
| **I2-19** | Áreas | Planificación y cobertura | 18 | PO original derivada sin anticipar shock |
| **I2-20** | Áreas | Compras/proveedor y llegada | 19 | comprado ≠ entregado/recibido |
| **I2-21** | Áreas | Recepción y cola | 20 | capacidad diaria y espera trazadas |
| **I2-22** | Áreas | Calidad y stock retenido | 21 | liberación, no inventar mermas |
| **I2-23** | Áreas | Inventario y reserva localizada | 22 | conservación stock físico / verificable |
| **I2-24** | Áreas | Picking y pedidos completos | 23 | BOM y staging, preparado ≠ salida |
| **I2-25** | Áreas | Transporte y expedición | 24 | salido del CD ≠ entregado al cliente |
| **I2-26** | Shock | Evento narrativo y revelación explícita | 25 | shock oculto hasta acción del jugador |
| **I2-27** | Shock | Diagnóstico de gerente a 3 KPIs | 26 | misma cohorte SKU; una hipótesis útil |
| **I2-28** | Recovery | Selector de 5 alternativas SKU | 27 | baseline único, deltas reales sin sumas |
| **I2-29** | Recovery | Plazos, costo y simulación opcional | 28 | día 13 no rescata; costo desconocido no es cero |
| **I2-30** | Recovery | Confirmación trazada y reintento | 29 | confirmación reversible antes de aceptar; PO congelada |
| **I2-31** | Resultado | Resumen de servicio y pendientes | 30 | pedidos completos, corte, sin entregas falsas |
| **I2-32** | Resultado | Evidencia por área y cronología | 31 | 8 áreas/lotes/PO sin inventar stock |
| **I2-33** | Resultado | Lectura económica parcial y fuentes | 31 | CLP proxy etiquetado, no mezcla motores |
| **I2-34** | Juego | Insignias de aprendizaje justificadas | 31–33 | sin premiar gastos ficticios o clicks |
| **I2-35** | Juego | Retos, seeds, replay y niveles | 34 | 3+ escenarios reproducibles / mismo seed |
| **I2-36** | QA | Matriz de controles E2E por estado | 13–35 | todos los controles de I2 clicables en su estado |
| **I2-37** | QA | Calidad móvil real de layout y foco | 36 | 320/360/390/412/430 + zoom/foco |
| **I2-38** | QA | Accesibilidad humana y comprensión | 37 | Android/TalkBack/usuario real con evidencia |
| **I2-39** | QA | Regresión integral y auditoría económica | 38 | reconciliaciones y escenarios extremos |
| **I2-40** | Release | Publicación I2 verificable, guía y versionado | 39 | Pages/HTTP/versión, criterios humanos y V1 intacta |

**Total:** 41 microfases (00–40). **Inicio:** I2-00; I2-01 puede comenzar solo después de que la auditoría esté integrada/verificada. **No se han implementado por el solo hecho de escribir el plan.**

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

**I2-14 · Configuración simple.** Elección de meta servicio/costo/equilibrio, ayuda sí/no, dificultad, escenario normal o reto. Default válido al hacer «Empezar sin configurar». Pruebas de equivalencia de parámetros.

**I2-15 · Configuración avanzada.** Ajustar forecast base, capacidad, inventario y costos sin redireccionar tras cada campo; botones Guardar y Cancelar; validación inline y advertencia si cambia baseline. Test: editar 3 campos seguidos, cancelar y reabrir sin pérdida de progreso.

**I2-16 · Tutor de aprendizaje.** Botón «Aprender» opcional, estrategia de habilidad (novato/intermedio/avanzado) solo afecta lo narrado; nunca cambia parámetros físicos silenciosamente. E2E compara modelos con ayuda visible/oculta.

**I2-17 · Componente de decisión.** Tres microvistas conceptuales y una sola acción principal; selección con \`aria-pressed\`, ayuda modal, confirmación y vuelta atrás. Test unitario y E2E reutilizado por cada área; 0 errores de foco.

### C5. Ocho áreas consecutivas (I2-18 a I2-25)

**I2-18 · Comercial:** forecast conservador/preciso/optimista y compra inicial proporcional. No revelar valor de shock hasta I2-26.

**I2-19 · Planificación:** cobertura original y stock; PO por SKU derivada del forecast ya elegido, sin sobreescritura tras la sorpresa.

**I2-20 · Compras:** proveedor barato/confiable/urgente con porcentaje de cumplimiento y llegada; entregado por proveedor no contado como stock recibido.

**I2-21 · Recepción:** capacidad física diaria, FIFO y cola; botón opcional «¿Qué se acumula?». No aumentar stock si la recepción vale cero.

**I2-22 · Calidad:** lotes retenidos/liberados y tiempos; controles reales sin interpretar retención como pérdida definitiva.

**I2-23 · Inventario:** ubicaciones, reserva interna, verificable versus físico, estado por SKU; no inventar stock al moverlo.

**I2-24 · Picking:** BOM y preparación de pedidos completos; staging queda separado de transporte cuando corresponde.

**I2-25 · Transporte:** expedición limitada por capacidad, preparada previamente; jamás prometer llegada cliente. **Para las ocho fases:** solo una escena nueva por PR, probar la misma elección frente a V1, volver atrás sin reejecutar mutaciones, microcopy accesible y sin overflow 320/360.

### C6. Sorpresa, diagnóstico y recovery (I2-26 a I2-30)

**I2-26 · Reveal explícito:** al acabar Transporte mostrar pantalla de sorpresa **sin revelarla automáticamente**. Botón único «Revelar demanda», seed fijado para retos/replay, cambios visibles +/−; compras originales congeladas. Test de ocultación antes de pulsar y unicidad del reveal después.

**I2-27 · Diagnóstico de gerente:** «Tenías X previstos, llegaron Y, faltan Z» dentro de **la misma cohorte SKU** con tres KPI; panel de explicación causal con evidencia. Si hay restricciones simultáneas, indicarlas sin inventar causa única.

**I2-28 · Comparador de recuperación:** cinco alternativas trazadas nacen de una misma base inmutable: espera, reserva, refuerzo, urgente, combinado. Visual comparar X→Y pedidos y días; no agregar deltas independientes.

**I2-29 · Plazos y costo:** selectores de fecha 1/2/5/10/13 y cobertura 0/25/50/75/100; costo de compra comprometida, CLP proxy y costo desconocido separados. Test: día13 rescata 0, refuerzo sin SKU no rescata y equipo extra no inventa pedidos.

**I2-30 · Confirmar o reintentar:** resumen completo previo, cancelar no muta, confirmar crea evento con ID/PO/timeline y bloquea nueva confirmación incompatible; continuar sin intervenir siempre posible. Persistencia y reintento con misma semilla probados.

### C7. Resultados y motivación (I2-31 a I2-35)

**I2-31 · Resultado principal:** expedidos, pendientes y servicio SKU a corte. Gráfico simple de situación inicial/final sin métricas agregadas.

**I2-32 · Detalle de ocho áreas:** acceso bajo demanda al libro físico, PO, SKU, recepción, lotes, reserva, staging, salida, colas diarias. Nada en la historia del juego altera los eventos.

**I2-33 · Economía honesta:** compromisos, valor de stock, costos aplicados y contribución parcial dentro de supuestos; proxy etiquetado, ninguna caja pagada o margen contable fingidos. No importar \`Costos\` V1 como KPI de la cohorte.

**I2-34 · Insignias:** logros solo asociados a aprendizajes verificables (identificar compra tardía, stock retenido, no intervenir cuando corresponde), progreso de misión separado de rendimiento. Sin premios por gastar.

**I2-35 · Retos reproducibles:** ≥5 plantillas, seed persistente, dificultad didáctica, replay del mismo caso, registro «qué cambió» y tabla de decisiones; ni datos reales ni aleatoriedad no reproducible.

### C8. Verificación y entrega (I2-36 a I2-40)

**I2-36 · Auditoría de interacciones:** matriz automática de botones y estados de I2, roles accesibles, click/touch/teclado, 0 controles inertes, efectos/foco, casos cancelar y back. Capturas en test-results y evidencias de runs.

**I2-37 · Diseño móvil:** QA visual explícito del conjunto 320/360/390/412/430 con alturas cortas, orientación y zoom; CTA permanente sin superposición, hojas que no ocultan controles y contraste. Diferenciar emulación de evidencia física.

**I2-38 · Accesibilidad física y comprensión:** Android Chrome + TalkBack en dispositivo real; si se dispone, Safari/VoiceOver; 1–3 personas principiantes entienden tres distinciones críticas y completan la primera campaña sin ayuda. Registrar dispositivo, versiones, defectos, fechas y retest; no declarar aprobado sin usuarios reales.

**I2-39 · Auditar integridad y rendimiento:** matriz ≥8 escenarios × 5 alternativas, copias/costos/balance, pruebas de extremos, accesibilidad, latencia de transición y presupuesto de JS/screenshot en teléfono. No fusionar si V1 retrocede.

**I2-40 · Release independiente del juego:** ruta \`/juego/\` pública, enlace V1↔I2, versionado I2 desacoplado, README/manual, changelog, licencias y assets, verificaciones HTTP reales y evidencia de aceptación humana. **V1 debe seguir siendo el mismo laboratorio y sus sesiones deben permanecer intactas.** Solo entonces anunciar Misión CD como lista para usuarios.

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
