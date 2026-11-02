# Lab12 · Auditoría de jugabilidad desde la perspectiva de un gerente principiante

**Fecha:** 01-11-2026 (Chile). **Base funcional:** `main` posterior al PR #145 (reto Calidad), con PR #146 de escenas CD isométricas aún separado. **Criterio:** auditoría estática de código + contratos de motor y pruebas E2E existentes, complementada con nueva prueba de recorrido. **Limitación:** no equivale a observar una sesión humana real en Android; no se declaran aprobados tests nuevos hasta CI.

## 1. Contrato de experiencia del jugador

Cada pantalla tiene que ofrecer, en este orden y sin obligar a navegar un árbol de desplegables:

1. **Situación:** qué pasa en un CD real, fase, área, fecha y unidades relevantes.
2. **Dato suficiente para decidir:** KPI, capacidad, costo y límite temporal que la política realmente conoce; nunca demanda futura.
3. **Acciones explicadas:** hasta tres alternativas originales, con trade-off, y diferencia clara entre **propuesta editable** y **compromiso irreversible**.
4. **Consecuencia comprobable:** resultado observado o, si falta conocer la demanda, hipótesis explícita; respetar compras originales, BOM por SKU, stock físico y el día del incidente.
5. **Aprendizaje:** qué restringió el servicio, qué costó la intervención, qué cambió o no cambió y qué probar en el siguiente intento.

Una captura visual bonita o una prueba automatizada verde no demuestran que una persona entienda cómo dirigir el CD. Medir ambos objetivos por separado.

## 2. Auditoría por etapa y acción

| Etapa | Estado actual del juego | Hallazgo bajo criterio principiante | Prioridad / intervención |
|---|---|---|---|
| Portada / primer inicio | Rol, 3 retos opcionales, tutorial, objetivos, escenario, avanzados, botón de inicio | Demasiadas elecciones antes de entender las reglas; misión recomendada no es claramente distinguible de configuraciones para expertos | **P1 / I2-36.6**: camino «Iniciar misión recomendada», «Aprender con Nico», «Elegir otro reto» en panel independiente; mantener avanzados optativos |
| Tutorial Nico | Diálogo de 7 pasos, atrás/adelante/saltar/cerrar, nivel | Base correcta. Debe mostrar mapa de entradas/salidas, una idea por paso y ejemplo de pedido; ilustración CD en PR #146 | **P1 / I2-36.7**: test 320, alto corto, Escape, foco, texto alternativo y transferencia al área 1 |
| Comercial | Tres forecast, KPI de precisión y tutor | El jugador debe entender que pronóstico ≠ demanda cierta; evitar sugerir que bajar forecast mejora gasto sin trade-off de faltantes | **P1 / I2-36.8**: tarjeta «qué cambia en mi decisión» y enlace a cadena Compras |
| Planificación | Cobertura y lectura de SKU | Cobertura puede confundirse con recepción física. Debe mostrar brecha conocida y compromiso, no stock disponible | **P1 / I2-36.8**: entradas/salidas, fórmula en nivel avanzado, ejemplo sencillo |
| Compras | Proveedor barato/confiable/urgente | Explicar diferencia entre promesa, compromiso, llegada y recepción; fecha crítica del SKU C | **P1 / I2-36.8**: destacar lead time, posible costo y dependencia de Recepción |
| Recepción | Capacidad de muelle y cola; decisión extraordinaria posible tras incidente | Distinguir «turno previsto» del «turno adicional día 3», cada uno con precio/capacidad; no simular stock recibido al prometer proveedor | **P1 / I2-36.8, I2-35.6**: cuadro de tiempo/capacidad y prueba causal |
| Calidad | Política de liberación, retenidos, reto guiado #145 | Retenido no es daño ni merma; en debrief aparecían IDs técnicos `slow`/`priority` y el intro de Calidad decía «Misión 01» | **P0/P1 / I2-36.5**: etiquetas humanas e intro «Reto guiado» (corregidos en rama, por verificar) |
| Inventario | Exactitud y ubicaciones SKU | Aclarar que stock físico vs verificable vs reserva son subconjuntos, no inventarios que se suman | **P1 / I2-36.8**: ejemplo A/B y mapa de ubicaciones, sin duplicación |
| Picking | Capacidad SKU/día, pedido completo, piloto de tope 10 | Riesgo de interpretar «SKU/día» como «pedidos/día»; refuerzo nominal no supera cuello fijo del piloto | **P1 / I2-36.8**: ejemplo BOM 1 A+1 B y ficha «cuello real» |
| Transporte | Capacidad de expedición, staging | Preparado ≠ expedido ≠ entregado; imagen de transporte no debe sugerir entrega efectiva al hogar | **P1 / I2-36.8**: desglose de estados y decisión, sin métricas externas |
| Selección en un área | Un click en tarjeta guarda propuesta y reconstruye toda la pantalla | Salta al inicio del scroll, pierde foco y la explicación del «aún no confirmado» no es suficientemente visible | **P0 / I2-36.5a**: conservar scroll/foco y estado de propuesta. Corregido en rama + E2E pendiente |
| Confirmar / Atrás | Pie fijo confirma decisión, visita áreas anteriores de solo lectura | No debe confundirse «elegir» con «confirmar», ni permitir retroeditar compromisos ya sellados | **P0 / I2-36.5b**: frase visible y test de bloqueo; los 24 botones de alternativas deben responder |
| Mapa de misión | Modal textual con cuatro capítulos y ocho áreas | Informa progreso, pero no localiza el flujo del CD. No debe servir para saltarse decisiones | **P2 / I2-36.11**: mini mapa isométrico de orientación sin hotspots ambiguos, distinto del tutorial |
| Revelar demanda | Paso explícito, estado sellado, sin cantidades futuras | Buen límite de información. Las imágenes de shock no deben anticipar día/tipo de incidente | **P0 / I2-38.1**: test no spoilers antes de reveal y refresh |
| Diagnóstico | KPI + alertas + panel gerencial en desplegable | La información para decidir puede quedar debajo del fold o fragmentada; el diagnóstico no debería ser una búsqueda de pistas por paneles | **P1 / I2-36.9**: 2 KPI + principal cola + pregunta Nico antes de palancas; auditoría detallada a demanda |
| Recuperación sin evento | Multiacción visible, compare, confirmar; modo clásico plegado con otro CTA en pie | **Competencia de dos caminos para confirmar**: el pie «Confirmar opción simple» puede coexistir con el panel de múltiples acciones y confundir al usuario | **P0 / I2-36.10**: CTA única por modo, distinguir simular/cotizar/comprometer y cancelar; cero acciones válida |
| Incidente de Recepción / Calidad | Incidentes revelados día a día, elección fechada y costeada, diario | La decisión puede confundirse con retrospectiva del resultado final. El jugador debe ver cuándo se enteró, cuándo actúa y qué queda congelado | **P0 / I2-35.6, I2-36.10**: línea de tiempo antes/después, acciones disponibles sin mirar el futuro |
| Resultado | Seis respuestas de Nico, paneles operativos/económicos y detalles | Mucha densidad después de la conclusión. El jugador debe responder «servicio, costo, problema, decisión útil y próximo intento» sin abrir múltiples secciones | **P1 / I2-37.4**: resumen gerencial priorizado y auditoría avanzada secundaria |
| Reiniciar / Reintentar | Reinicio principal usa `newI2GameState`; footer reintenta manteniendo parámetros | El reinicio superior perdía `guidedScenario` del reto Calidad aunque el botón de reintento sí lo conservaba | **P0 / I2-36.5c**: ambos reinicios coherentes y pruebas de guardado. Corregido en rama |
| Imágenes Nico/CD | Nico 24 PNG publicados; 10 PNG isométricos en PR #146 | Cada imagen necesita explicar algo concreto, no ocupar pantalla ni ilustrar un evento inexistente. PNG de CD pesan ~19,9 MB | **P1/P2 / I2-36.12**: reducir carga efectiva, verificar 404/alt/rol, derivados optimizados sin eliminar originales |
| Horizonte/semántica | Días 0 a 12, interpretados como 12 jornadas en distintas explicaciones | Puede parecer una cuenta inconsistente: 0–12 incluye 13 marcas de tiempo, y «día 13» queda fuera del corte | **P1 / I2-36.13**: glosario con «inicio día 0 + cierre día 12» y duración inequívoca |
| Modos clásico vs gerencial | Motor V1 preservado y comparador retrospectivo disponible | No trasladar mejoras causales del modo de incidentes al laboratorio clásico ni confundir política posterior con acción histórica | **P0 / I2-39.1**: tests de aislamiento V1/I2 y evidencias por SKU/costo |

**Severidad:** P0 = compromiso, información futura o botón que puede inducir una acción incorrecta; P1 = fricción significativa o aprendizaje débil; P2 = mejora opcional de presentación/rendimiento.

## 3. Matriz obligatoria de controles y pruebas

| Pantalla | Controles y ruta a verificar | Efecto correcto |
|---|---|---|
| Inicio | Tutorial abrir/atrás/siguiente/saltar/cerrar/Escape; activar/desactivar Picking, Calidad e incidente; metas/avanzados; comenzar | Sin progreso perdido ni demanda filtrada; exclusividad y bloqueo de retos |
| Cabecera | Mapa, reiniciar, progreso, volver al modo clásico V1 | Mapa solo lectura; reinicio conserva preset/semilla; nunca corrompe V1 |
| Cada área ×8 | Tres tarjetas, pestañas Decisión/Indicadores/Nico, ayuda y ejemplo, anterior/siguiente, scroll y teclado | 24 tarjetas reales elegibles; solo confirmar bloquea; foco y scroll estables; indicadores coherentes |
| Revelar | Revisar Transporte, revelar explícito | Sin shock anticipado; compras iniciales congeladas |
| Recuperación clásica | Abrir/cerrar, opción, fecha, cobertura, impacto, botón pie | Estado editable claro; no doble confirmación ni valores stale |
| Recuperación múltiple | cero/una/varias acciones, checkbox, fechas, comparar, pistas, confirmar, cancelar | Previsualización distinta de ejecución; costos/capacidad/tiempo coherentes |
| Incidentes | activar sorpresa, primera decisión, día siguiente, segunda decisión, revisión de jornadas y cierre | Eventos no anticipados; primera orden irreversible; ningún día futuro visto antes |
| Resultado | aprendizaje Nico, 6 preguntas, evidencias KPI, paneles por área, comparación de políticas, reintentar | Resumen útil, datos reales, mismo seed en reintento, anexos secundarios |
| Arte | Imagen correcta de cada área, escena ampliada, cerrar/Escape, foco, fallback, 404, lazy | Imagen no cambia guardado, no tapa CTA ni contradice estado físico |

**Evidencias actuales:** tests previos `browser-i2-area-tabs.e2e.mjs`,
`browser-i2-mobile-shell.e2e.mjs`, `browser-i2-mobile-mentor-multi-recovery.e2e.mjs`,
`browser-i2-operational-drill.e2e.mjs`, `browser-i2-guided-picking-pilot.e2e.mjs`.
Nuevo `browser-i2-player-audit-choices.e2e.mjs` propone probar 24 elecciones,
foco/scroll/teclado, ayuda/mapa y reinicio de Calidad. Hasta CI verde,
considerar sus comprobaciones **pendientes**, no aprobadas.
La integración de arte está en PR #146 con su propia prueba `browser-i2-cd-isometric-art.e2e.mjs`.

## 4. Nuevo orden de microfases, manteniendo IDs históricos

**No reiniciar el conteo de fases:** continúan 35/41 padres aceptados, I2-35 a I2-40 abiertos.
Agregar hijas, sin declarar completada una fase padre por un PR aislado.
Esta propuesta complementa, no sustituye, las hijas existentes I2-35.1–35.5,
I2-36.1–36.4, I2-37.1–37.3 y resto de rebaselining 28-10.

| Orden | Hija nueva o ampliada | Propósito / entrega | Dependencia y gate |
|---|---|---|---|
| 01 | **I2-36.5a** | Corregir foco, scroll y propuesta editable al cambiar cualquiera de 24 alternativas | Código en PR de auditoría; nuevo E2E + Chromium verde |
| 02 | **I2-36.5b/c** | Mensajes de compromiso y reinicios coherentes con reto guiado; IDs de Calidad amigables | Prueba 320/360, recarga, confirmación y reinicio |
| 03 | **I2-36.6** | Portada de decisión clara: comenzar recomendado / tutorial / otros retos, opciones avanzadas secundarias | Prueba novato ≤3 acciones para empezar, no eliminar ajustes |
| 04 | **I2-36.7** | Tutor Nico visual de CD y ocho fichas «qué hace/entra/sale/decide/afecta/si falla» | Arte PR #146 publicado, lectura 320/430, accesibilidad |
| 05 | **I2-36.8** | Tarjeta gerencial por área: supuesto, unidad, costo, señal previa y riesgo posterior; imagen compacta | E2E 8 áreas; no afirmar KPI futuro |
| 06 | **I2-36.9** | Diagnóstico priorizado antes de la decisión; una pregunta Nico y acceso técnico opcional | Cuello y evidencia reales; no sesgar por sugerencia falsa |
| 07 | **I2-36.10** | Recuperación 0/1/N acciones, CTA sin conflicto, cancelación y contrato temporal claro | Matriz E2E completa de confirmar/cancelar/rehacer |
| 08 | **I2-35.6** | Al menos 5 misiones físicas diferenciadas por causa, reloj y estrategia, no solo demanda | Fixtures por SKU y consecuencias monetarias, replays |
| 09 | **I2-36.11** | Mapa orientativo CD/áreas/avance, sin hotspot impreciso ni navegación que omita fases | Prueba focalizada y ruta accesible |
| 10 | **I2-36.12** | Arte CD/Nico contextual con versiones web ligeras, loader/fallback/alt, originales preservados | WebP/AVIF realmente medidos, diez imágenes 200, sin 404 |
| 11 | **I2-36.13** | Unificar días, SKU, órdenes, servicio y gasto parcial en un glosario disponible | Textos contrastados con motor y experto supply |
| 12 | **I2-37.4** | Cierre primero «qué pasó / qué ganaste / qué costó / qué aprendiste» y auditoría avanzada optativa | Conteo y costo reconciliados por SKU |
| 13 | **I2-37.2 (ampliación)** | Reintento bajo misma semilla con registro opcional de hipótesis, plan y comparación | No guardar PII; test de partida y no spoilers |
| 14 | **I2-38.1 (ampliación)** | Cobertura E2E por pantalla/botón, fallos de foco, E2E × 320–430, horizontal, imágenes | CI V1+I2+Chromium, screenshots auditables |
| 15 | **I2-38.2** | Prueba humana real: principiante y conocedor, Android físico, teclado y TalkBack | Bloqueador de aceptación; no certificable por agentes |
| 16 | **I2-39.1/39.2** | Prueba de negocio de múltiples misiones: BOM, stock, fechas, gasto y decisiones racionales | ≥5 problemas físicamente distintos, evaluación gerente |
| 17 | **I2-40.1/40.2** | Release, gate GitHub Pages HTTP/SHA, guía para jugador, incidencias y continuidad | CI+UAT aprobados, V1 intacto y versión pública validada |

**Regla de eficiencia:** no diseñar un rediseño general ni sustituir el motor. Corregir
primero los defectos P0 que afectan cada click; luego mejorar el aprendizaje,
posteriormente ampliar misiones, terminar con UAT y release. Evitar duplicar paneles
de Nico y no convertir el mapa en un segundo menú.

## 5. Puertas de aceptación para dar por bueno el producto

- **Funcional:** 100 % de controles críticos de la matriz ejecutados con click, teclado cuando corresponda y cambios de estado esperados. Ningún error de JavaScript/404. No basta con contar nodos DOM.
- **Móvil:** 320/360/390/412/430, alturas cortas y horizontal, zoom 200 %, no scroll exterior ni solapamiento de footer; selección sin salto de foco/posición; imágenes compactas y ampliación independiente.
- **Pedagógica:** una persona principiante debe poder explicar el paso anterior y siguiente de cada área, distinguir unidades SKU de pedidos, elegir por trade-off y explicar causa + costo del resultado.
- **Gerencial:** una persona experta confirma que el motor prueba cuellos y que la mejora o ausencia de mejora corresponde al plan, fecha y gasto; no hay premio basado en imagen/clicks.
- **Seguridad semántica:** antes del reveal no se muestra demanda observada ni incidente futuro; no hay edición retroactiva de compras, inventario, decisiones cerradas o historia de jornadas.
- **Release:** PR verde con tests pertinentes, merge sin force push, Pages build/deploy y validación HTTP de código/PNG; QA humana separada.

## 6. Estado y próximos pasos

- **Publicado en `main`:** PR #145 Calidad (CI previo verde). El contador histórico no cambia.
- **Arte CD:** PR #146; reconciliado con cambios de Calidad, con Node/focused/Chromium de la versión reconciliada por confirmar. No declarar publicado hasta los gates.
- **Este corte de auditoría:** rama `feat/i2-36-player-audit-navigation-20261101`; focus/scroll, mensajes de confirmación, texto Calidad y reinicio, test E2E. **CI/PR/merge/Pages** pendientes.
- **Siguiente operación:** verificar E2E de ambas ramas, incorporar correcciones, fusionar en orden (arte y UX si son compatibles), validar Pages HTTP, y abordar la CTA conflictiva de recuperación.

**Simulador público (siempre indicar si los cambios están en rama):**
https://harrysxavio.github.io/cd-simulator/juego/


## Seguimiento Lab13 · I2-36.10: separar confirmación clásica y multiacción

**Solución en rama; no cerrar sin gates:** el panel de estrategias múltiples abre por defecto y no presenta el botón inferior de opción simple. Al abrir el modo clásico, se pliega el plan de varias acciones y aparece su botón inferior; al regresar al múltiple se deshabilita/oculta la confirmación simple. **No cambia simulación ni guardado por alternar modos.** Se añade E2E para cancelación, cero acciones, confirmación del clásico, 320/360 px y estado persistente. Contrato [I2-36.10](I2-36-10-RECUPERACION-MODOS-2026-11-01.md). Queda pendiente la portada I2-36.6 y simplificación del diagnóstico I2-36.9, sin presentar lo propuesto como ya publicado.
