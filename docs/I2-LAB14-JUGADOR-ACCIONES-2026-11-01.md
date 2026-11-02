# Lab14 · Corrección de entrada, demanda y diseño del juego

**Fecha:** 01-11-2026 (Chile). **Estado de implementación:** candidata en rama, pendiente CI, merge, Pages y aceptación humana. **Diagnóstico realizado:** lectura del código y las pruebas del juego publicado; no afirmar que un jugador real fue observado en una sesión de QA.

## 1. Fallos reportados y causas que encontramos

| Observación del jugador | Comportamiento real en código | Corrección de este corte |
|---|---|---|
| «No puedo elegir retos en la portada» | Los tres botones estaban deshabilitados cuando `confirmedAreas.length > 0`, incluso al volver a portada; un reto activo también deshabilita los otros. No hay selector central que permita cambiar el juego desde una partida guardada | Nuevo selector modal de cuatro modos al principio de la portada. Si hay plan comprometido, pide confirmación de pérdida de decisiones antes de reiniciar. Cancelar preserva el estado |
| «No se muestra el cambio real de demanda» | La misión normal mostraba previstos y observados en Recuperación; la misión con incidentes pasaba a una pantalla de decisión sin la comparación visible | Banner post-revelación con pedidos previstos, demanda observada y diferencia, tanto en el primer incidente como en el segundo y el diario |
| «A veces puedo hacer algo y otras no» | El motor bloquea las ocho políticas tras confirmar y solo ofrece acciones nuevas en puntos de incidente. En días intermedios solo hay «Avanzar jornada»; la interfaz no explica el motivo | Estado de seguimiento diario y botón de ayuda que abre el plan vigente y explica qué acciones están disponibles y por qué |
| «Solo elijo una cosa de una lista» | Cada una de ocho áreas permite una alternativa **inicial** (8 decisiones). Luego el modo ordinario tiene hasta 3 palancas combinables, mientras incidentes concretos ofrecen respuestas discretas en su fecha. No existe aún un registro de órdenes diarias editable por las ocho áreas | Se conserva la física canónica. Se declara el límite actual y se diseña abajo el siguiente desarrollo; **no se inventan botones sin impacto** |
| «Los isométricos deberían estar aparte» | Había una tarjeta de imagen incluso en el flujo de elegir cada política | La imagen ya no aparece en el área de decisión. Botón contextual abre un modal autónomo con escena, descripción completa y seis preguntas/explicaciones gerenciales |
| «Aún se siente HTML, poco dinámico» | Pantallas largas de párrafos, desplegables y CTA fija sin estados suficientemente identificables | Primer corte: selector en tarjetas modales, resultado de demanda destacado, diálogo operativo de área y explicación de inactividad; rediseño de centro de mando y animaciones **pendientes** |

## 2. Contrato nuevo de experiencia

**Primera pantalla**: 1) reto activo, 2) botón «Elegir o cambiar reto», 3) CTA «Comenzar misión», 4) ajustes secundarios. El selector ofrece: primer turno, Picking, Calidad e incidentes. La demanda real jamás aparece en la selección.

**Decisión de área**: título y pregunta; un botón «Conocer el área» abre la explicación visual en ventana aparte, no empuja las tres alternativas. El botón devuelve el foco; la apertura/cierre no altera la partida.

**Revelación**: después de confirmar ocho políticas, el jugador debe pulsar «Revelar demanda». A partir de ahí, las cifras reales se identifican en una tarjeta de resultados. Antes del evento, esas cifras no aparecen.

**Jornadas**: distinguir explícitamente tres estados: a) observación sin órdenes nuevas, b) incidente que requiere decisión, c) resultado/cierre. Nunca anunciar día o tipo de incidente futuro.

**Acciones gerenciales**: conservar acciones físicas reales. No mostrar ocho botones de compra, refuerzo y transporte si todavía no hay reglas de inventario, tiempos, gastos y efecto causal para ejecutarlas.

## 3. Plan de ampliación con 8 áreas verdaderamente interactivas

La siguiente evolución debe construir un **registro de órdenes por jornada**, no ocho selectores cosméticos. Cada orden registra: `areaId`, `actionId`, `decidedDay`, `effectiveDay`, `skuScope`, `capacityDelta`, `expenseCLP`, restricciones, fecha de caducidad y estado. El motor calcula consecuencias por jornada y rechaza órdenes retroactivas. Todo el cálculo procede del motor físico y sus transiciones; ningún valor numérico debe derivarse del HTML.

| Área | Acción gerencial deseable | Soporte físico existente | Trabajo pendiente |
|---|---|---|---|
| Comercial | Revisar señales de demanda y escenarios para días posteriores | Forecast inicial y shock observado | Definir pedidos futuros no comprometidos; no modificar POs originales |
| Planificación | Reprogramar cobertura/prioridad de pedidos aún abiertos | Compra por SKU y planificación inicial | Reglas de asignación fecha/SKU y costo de reprogramación |
| Compras | Orden urgente adicional según faltantes | Urgencias y recargos en recuperación | Convertir a orden fechada en registro único, lead times trazables |
| Recepción | Turno extraordinario sobre la cola de muelle | Turno +80 SKU día 3, costo fijo, evento de muelle | Generalizar a jornadas permitidas, sin alterar la parada ni inflar capacidad |
| Calidad | Priorizar liberación o contratar línea adicional | Política inicial y línea extra día 5 | Generalizar ventanas permitidas y estados retenido/liberado por lote |
| Inventario | Reubicar reserva o corregir verificabilidad | Reserva previa y traslado con día | Tiempos y costo de conteo/traslado por SKU, sin crear stock |
| Picking | Reforzar preparación por turno | Refuerzo de capacidad, límite físico 10 SKU/día en reto | Efecto por día y capacidad real, dotación/costo sin inventar persona-hora |
| Transporte | Añadir cupos de expedición o reprogramar despacho | Política de salida inicial y staging modelado | Capacidad extra de salida con costo y efecto en staging real |

**Prioridad de construcción**: Compras+Inventario+Picking primero por palancas ya modeladas, luego Recepción+Calidad con costo diario, después Transporte y finalmente Comercial+Planificación, que requieren definir decisiones aún modificables. Si un área no tiene acción implementable, mostrar «sin orden disponible hoy» con explicación y estado, jamás un falso botón.

## 4. Microfases nuevas, sin alterar 41 fases históricas

| Secuencia | Hija | Entrega | Criterio de aceptación |
|---|---|---|---|
| 1 | **I2-36.14a** | Selector funcional de cuatro retos, reinicio confirmado, reintento y retorno; portada comprensible | E2E de reto Calidad→plan comprometido→cancelar→Picking, persistencia sin spoilers |
| 2 | **I2-36.14b** | Demanda observada claramente visible en recuperación con incidentes y cada jornada posterior | E2E 8 áreas→revelar→incidente→diario; no antes del reveal |
| 3 | **I2-36.14c** | Guía isométrica independiente para cada una de las ocho áreas | 8 modales, foco, alt, PNG/HTTP, scroll 320/430, 3 decisiones intactas |
| 4 | **I2-36.14d** | «Por qué puedo/no puedo actuar» en días y contraste con plan confirmado | Evidencia fecha/órdenes, modal solo lectura, sin resultado futuro |
| 5 | **I2-35.7** | Contrato de órdenes por área/día y motor por registro, sin retrocausalidad | Tests por SKU/día, costos marginales, condiciones sin intervención |
| 6 | **I2-35.8a** | Acciones reales de Compras, Inventario y Picking simultáneas | 0/1/N acciones, causalidad y presupuesto bajo misma semilla |
| 7 | **I2-35.8b** | Acciones reales por fecha en Recepción y Calidad | FIFO, retenidos y costo por turno, sin doble conteo |
| 8 | **I2-35.8c** | Acciones reales en Transporte, y gobernanza Comercial/Planificación posteriores | Staging→expedición reconciliados, sin retroeditar POs |
| 9 | **I2-36.15** | Centro de mando dinámico: día, KPI cambio vs ayer, mensajes de Nico, selector área, panel de acciones | Interacción táctil 320–430, modales accesibles, efectos reales, claridad de 3 estados |
| 10 | **I2-37.5** | Cierre que explique causalmente cada intervención por área, costo y servicio | Reproduce ledger y muestra dónde se movió el cuello de botella |
| 11 | **I2-38.3–39.3** | QA de cada botón, orden y evento; experto supply y principiante | 100 % controles relevantes, 5 misiones distintas, Android/TalkBack |
| 12 | **I2-40.3** | Publicación final con ciclo de UAT y versión comprobable | CI, SHA, Pages/HTTP, guía y V1 sin regresión |

**Dependencias**: no crear I2-36.15 (centro de mando) como interfaz ficticia sobre un motor que solo permite una respuesta discreta. Primero I2-35.7/I2-35.8a, después interacción y explicación rica. Las microfases hijas **no incrementan 35/41**.

## 5. Pruebas y límites

Archivos principales: `juego/mission-selector.js`, `juego/cd-area-guide-dialog.js`, `juego/app.js`, `juego/styles.css`, tests de navegador. No cambia `src/i2-mvp-adapter.js`, ledger económico ni motor V1. El selector reinicia deliberadamente la campaña al cambiar de reto; no altera metas globales. Las imágenes originales permanecen en `juego/assets/cd-isometrico/`.

**Aprobación pendiente de resultados CI** para este PR; no declarar que funciona en GitHub Pages antes de revisar Node + I2 focused + Chromium, merge, deploy y verificador de HTTP. El juego **todavía no permite modificar ocho áreas cada día**: esto es el siguiente trabajo de motor, no un resultado de esta rama.

Simulador público: https://harrysxavio.github.io/cd-simulator/juego/
