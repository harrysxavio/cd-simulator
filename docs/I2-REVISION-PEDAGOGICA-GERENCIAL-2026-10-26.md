# I2 · Corrección pedagógica y gerencial vinculante · 26-10-2026

**Alcance:** mejora del plan vigente de 41 microfases, sin duplicar fases ni declarar requisitos futuros como terminados. Este documento complementa I2-REVISION-GESTION-GAMIFICADA-2026-10-24.md y es vinculante para I2-24–40.

## Auditoría de las nuevas observaciones

| Solicitud | Ya previsto | Brecha real | Implementar y aceptar |
| --- | --- | --- | --- |
| Nico enseña desde mirada de gerente | I2-12/16/17, 3 niveles, 8 consejos breves | No explica funcionamiento, indicadores, alternativas y efectos entre áreas | Refuerzo pedagógico de F4/F5 con prueba en I2-36/38 |
| Introducción completa saltable | I2-13/16 briefing de 3 pasos | No enseña el viaje del pedido, ocho áreas, gestión del CD, cliente y las reglas del juego | Refuerzo F4 incremental + I2-26/27 + QA F8 |
| Explicar SKU, días y variables | 3 SKU, BOM, ledger de 12 días; I2-32 cronología | Usuario no percibe utilidad causal ni dónde incide una decisión | I2-24/25, 27 y 32 |
| Análisis gerencial de resultados | I2-31/32/34 semáforos, fortalezas, evidencias | Falta informe humano «qué salió bien, qué salió mal, qué tradeoff hubo, qué probar» | I2-27–35 con «Mirada de Nico como gerente» |
| Varias decisiones en la recuperación | I2-28–30 selector exclusivo entre 5 opciones + fecha/cobertura | **Nueva brecha importante:** combinar acciones, recursos, plazos y costos | Ampliar I2-28/29/30 y comparar en I2-31–35 |
| Decisiones sin respuesta universal | Multieje y retos seeds ya previstos | Falta probar combinaciones y escenarios donde la acción cara sea mala o inútil | I2-27–35 |
| Impacto en el consumidor | Diferencia expedido/entregado está documentada | Falta mostrar cómo un pedido incompleto y tardío afecta la promesa | F4 tutor, I2-24–25, 31–34 |

## Nico: de pista breve a mentor gerencial opcional

Mantener el consejo corto actual como capa rápida, pero añadir **«Entender esta área con Nico»**, guía independiente accesible desde cada una de las ocho áreas y reabrible sin modificar decisiones. Debe incluir:

1. **Qué hace el área** en un CD real y qué recibe/entrega a la siguiente.
2. **Qué controla el gerente:** políticas, equipos, recursos, tiempo y restricciones; lo que NO controla.
3. **Cómo leer el negocio:** 1–2 KPI principales y detalle opcional de unidad, horizonte, fórmula, fuente y umbral cuando sean calculables. Productividad en pedidos/persona-hora solo si existen dotación y horas verificables; si no, etiquetar capacidad en unidades/jornada, NO productividad.
4. **Riesgos y compensaciones:** efectos positivos/negativos de cada alternativa, costos conocidos, tiempos, colas y posible impacto en las otras áreas y cliente.
5. **Ejemplo claro:** tres SKU/BOM/día cuando corresponda, expresamente marcado «ejemplo didáctico» versus «datos de tu partida».
6. **Pregunta de gerente:** qué cuello de botella importa para la meta elegida y qué tradeoff aceptar.

Tono cercano, sin instrucciones mecánicas ni receta «elige B». Novato/intermedio/avanzado cambia lenguaje y nivel de detalle, no resultado, semilla ni indicadores. Mantener pista corta y explicación extensa plegable; scroll solo del panel, no del documento, CTA fijo. Nico nunca ve la demanda futura ni inventa entregas, mermas, horas o contabilidad.

## Tutorial introductorio opcional y reabrible (refuerzo F4)

Dos controles claros: **«Conocer mi misión con Nico»** y **«Saltar tutorial / Empezar ahora»**; siempre se puede cerrar, volver y reabrir sin reiniciar, modificar el plan ni filtrar shock. Capítulos breves, cada uno con una pregunta o visual sobrio:

1. **Gerente del CD:** equilibrar promesa de servicio, stock, capacidad, tiempo y recursos, pensando en la persona que espera su pedido.
2. **Ruta de una caja:** Comercial → Planificación → Compras → Recepción → Calidad → Inventario → Picking → Transporte → salida del CD. Entre cada paso puede formarse una cola; salida NO significa entrega certificada al consumidor.
3. **Planificación antes de saber el futuro:** ocho elecciones, métricas de supuestos, compromiso de compra congelado al finalizar; no hay una decisión siempre correcta.
4. **Por qué 3 SKU y 12 días:** pedidos necesitan combinaciones BOM; falta de una pieza impide pedido completo; 12 días permiten observar lead times, capacidad, cola y recuperación. Día 13 no rescata la campaña día 12.
5. **Cuadro de gerente:** servicio, tiempos/colas, capacidad disponible/ociosa y gasto incremental CLP, con límites de fuentes y sin fingir productividad o costo total.
6. **Demanda real y respuesta:** sorpresa exógena seedada y diagnóstico de causas; evaluar una o varias palancas en un solo escenario, considerando presupuesto y fecha.
7. **Cierre:** comparar resultados frente a no actuar, entender lo bueno/malo y repetir el mismo seed para estudiar otras decisiones.

No exigir que el usuario complete siete pantallas: tutorial saltable, progreso y ayuda reabribles, resumen ejecutivo muy breve siempre visible. QA I2-36/38 comprueba que principiantes entiendan rol, ocho áreas, SKU/días, KPI y toma de decisiones; no basta test de botón.

## Visibilidad del modelo SKU y tiempo (I2-24/25/27/32)

Añadir acción «¿Por qué simulamos 3 SKU y 12 días?» con un pedido de ejemplo basado en una BOM real del catálogo y una línea de eventos **ilustrativa**, sin hacérsela pasar por datos de la campaña. Después de revelar, profundizar con identificadores y acontecimientos verdaderos del ledger: compromiso de compra → proveedor → muelle → Calidad → PICK-FACE → armado completo → expedición; atraso y costo de capacidad si hay datos válidos.

Poner en la pantalla:
- **Pedido completo:** necesita todos los SKU de su BOM; 100 unidades no equivalen a 100 pedidos completos.
- **Días:** día de llegada, tiempo esperando, jornada de preparación y corte día 12; día 13 queda fuera.
- **Estados físicos:** muelle ≠ recepción ≠ liberación ≠ verificable ≠ preparado ≠ expedido ≠ entregado.
- **Conservación:** apertura + recibos = inventario CD + expedición, separando reserva, Calidad y staging. Sin sumar dos veces.
- **Consecuencia de consumidor:** espera posible o pedido sin completar; el simulador no observa entrega real ni satisfacción.

## Recuperación multiacción: modificación fundamental del contrato I2-28–30

Actualmente el estado usa una sola opción de recuperación, más día y cobertura. Esto **no** representa que el gerente pueda tomar varias acciones compatibles.

**Nueva exigencia:** el gerente puede configurar un conjunto de palancas con recursos y fechas, por ejemplo: compra extraordinaria por SKU/cobertura, cambio de fecha de llegada modelada, liberación de reserva existente y refuerzo operacional si el motor modela de verdad su costo y efecto. «No actuar» es baseline exclusivo; no combinarlo con intervenciones. Impedir seleccionar acciones redundantes, aplicar reserva inexistente, prometer llegada día 13 antes del corte, o contar capacidad no disponible.

**Regla de oro:** cada conjunto debe evaluarse mediante **una corrida física conjunta del mismo motor canónico y baseline congelado**. Nunca sumar incrementos de los cinco resultados individuales; nunca duplicar pedidos recuperados, PO, stock ni gastos. Mantener cohorte, 3 SKU, horizonte y demanda fija. La compra original no cambia.

**Interacción:** elegir 0, 1 o varias palancas compatibles; editar fecha, cantidad y recursos; visualizar presupuesto y costo incremental, servicio, cola, tiempo y utilización cuando haya denominador medido. Comparar no actuar, acción individual y combinación sobre la misma seed; permitir cancelar, guardar y reintentar. No imponer solución única.

**Implementación progresiva sin más IDs:** I2-28 = contrato normalizado+migración y evaluación de múltiples intervenciones; I2-29 = calendario/presupuesto/interacción combinada y comparador; I2-30 = confirmación trazada, volver, persistir y reintento. Sub-PR 28a/b/c si requiere fragmentación, sin contar fase cerrada hasta aceptación íntegra. I2-31–35 deben soportar el conjunto sin doble conteo.

## «La mirada de Nico como gerente» tras crisis y resultados

Botón opcional en comparación previa y cierre; informe con **evidencia de la partida**, no texto genérico:
- **Qué salió bien:** servicio y pedidos expedidos, mejora versus base y meta.
- **Qué salió mal / se sacrificó:** gasto incremental, exceso de recursos, espera, falta de SKU, demoras y cuello de botella, solo si son observables.
- **Por qué:** hechos del ledger y causas posibles marcadas como hipótesis cuando no estén demostradas.
- **Qué significa para el consumidor:** demora potencial, completitud y salida del CD; NO inventar entrega al cliente.
- **Qué probaría un gerente:** 2–3 nuevas decisiones realistas para el mismo seed, incluyendo prudentemente no actuar cuando convenga.
- **Límites:** si no hay horas-persona, tarifa o medición final de entrega, «no disponible» explícito; no presentar utilidad/EBITDA/costo total sin datos.
Semáforos en servicio/tiempo/capacidad y gasto conocido, con definiciones, objetivo, unidad, fuente y periodo. Que un objetivo verde no oculte un costo rojo. Logros solo por gestión validada, no clics o gastar.

## Criterios y responsables por microfase existente

| ID | Modificación / ampliación **pendiente** | Aceptación |
| --- | --- | --- |
| I2-24 | Pedidos BOM completos y gerencia de Picking; abrir explicación de variables y cuello de botella | SKU faltante bloquea pedido; preparado ≠ expedido; no spoilers; causa con evidencia |
| I2-25 | Expedición, staging y impacto en consumidor | Preparado/expedido/entregado distintos, sin evento de entrega ficticia |
| Refuerzo transversal F4/F5 desde I2-24–27 | Tutorial saltable + guía gerencial de Nico en ocho áreas, documentación y pruebas | 7 capítulos opcionales, 8 fichas, 3 niveles, sin bloquear ni mutar motor |
| I2-26–27 | Sorpresa, diagnóstico de causas y lectura de 3 SKU/días | 2 KPIs principales, detalles verificables, semillas independientes |
| I2-28 | **Contrato nuevo de acciones combinables** | Baseline/seed únicos, ejecución conjunta, sin sumar deltas o gastar doble |
| I2-29 | Selector multilevers, recursos/fecha/presupuesto y comparación | 0/1/varias palancas, conflicto, día 13, escenario caro sin mejora |
| I2-30 | Confirmación, trazabilidad, vuelta y reinicio | Persistencia/migración, PO originales congeladas, V1 intacta |
| I2-31–33 | Informe multieje y botón «La mirada de Nico» basado en evidencia por SKU/día | Servicio alto + gasto rojo sigue alerta, explicaciones y límites, CLP sin doble conteo |
| I2-34–35 | Aprendizaje personalizado y replay de más casos | Retos alta/baja/stock/calidad/ociosidad, misma seed → mismo resultado, sin receta única |
| I2-36–40 | QA tutorial y combinaciones, Android/TalkBack y release | Novato entiende decisiones/impactos, accesibilidad, fórmula/periodo, no regresión V1 |

## Pruebas de aceptación transversal obligatorias

1. Un caso de servicio completo con gasto extra excesivo **no** se evalúa «excelente».
2. Un escenario de demanda baja puede penalizar la sobrecompra y refuerzo, sin castigo de demanda adaptado al jugador.
3. Dos acciones que comparten el mismo cuello de botella **no** suman beneficios artificialmente.
4. Día 13 no rescata pedidos al día 12; tampoco comprar más crea stock disponible inmediatamente.
5. Explicación de Nico, tutorial, imágenes y cambio de nivel no pueden modificar semilla, elecciones, costos o ledger.
6. Cualquier KPI de productividad/costo/cliente sin fuente real y denominador suficiente se rotula ausente, NO cero.
7. Reintento con mismo seed y mismas decisiones reproduce pedidos, esperas y costo.
8. Una persona principiante puede explicar por qué 3 SKU y 12 días afectan un pedido completo y una decisión de gerente (I2-38, evaluación humana).

**Estado de esta revisión:** solo contrato y plan. No declarar implementada la multiacción, tutorial ampliado ni informes extensos hasta tener UI, motor y tests en verde.


## Consideraciones complementarias tras auditoría de viabilidad (sin nuevas microfases)

Estas son comprobaciones adicionales, no una reescritura ni una duplicación del plan anterior:

1. **Cuatro momentos de aprendizaje diferenciados.** Antes de decidir: supuestos conocidos. Al revelar: hechos observados, con horizonte. Al intervenir: contrafactual del baseline fijo. Al concluir: qué se aprendió, con evidencias y límites. Nunca usar el mismo color o rótulo para una hipótesis y un hecho.
2. **Mapa de dependencias causales.** Una intervención se evalúa contra el cuello de botella real. Si Inventario bloquea por ausencia de B, reforzar Picking no recupera un pedido que exige B. Las fichas pedagógicas deben enlazar explícitamente salida de un área con entrada de la siguiente.
3. **Costo de oportunidad y sobrecapacidad.** También debe poder resultar acertado *no intervenir*: demanda baja, tiempos irreparables o gasto incremental sin ganancia. Asegurar casos donde comprar de más empeora el balance gerencial sin inventar contabilidad total.
4. **Presupuesto: distinguir restricción y evaluación.** Definir si el monto es un límite duro del motor o una meta/semáforo de evaluación; la interfaz no debe bloquear una decisión si el modelo solo lo usa como umbral. Reportar consumos de compras, turnos y traslados separadamente cuando existan fuentes, sin sumar doble.
5. **Multiacción con efectos no aditivos.** Las palancas deben compartir un único calendario, stock, pedidos y capacidad. Si dos palancas compiten por el mismo lote o jornada, no pueden ambas reclamar su mejora independiente. Probar costo y utilidad marginal de agregar la segunda palanca sobre la primera.
6. **Transparencia del modelo de aprendizaje.** Mostrar qué es simplificación (3 SKU, mezcla fija de pedidos, 12 días, capacidad modelo) y qué no está simulado: entrega al destinatario, NPS, horas-persona, merma real y costo integral. Nunca presentar estas ausencias como cero.
7. **Gerente novato versus experto.** El mismo ejemplo y las mismas decisiones físicas; solo cambia el vocabulario y la profundidad de la explicación. Medir si el usuario puede explicar el impacto **sin que Nico le indique una respuesta ganadora**.
8. **Revisión después del cierre.** Permitir estudiar la misma semilla, formular una hipótesis («el cuello fue B o fue Transporte»), reintentar y comprobarla. Separar factores que el gerente controla de la demanda exógena. La evaluación premia justificación y balance, no volumen de clics.

**Orden de entrega recomendado sin añadir IDs:**

- **Refuerzo pedagógico A (transversal, sin contabilizar microfase):** tutorial 7 capítulos opcional/reabrible + ocho fichas de gerente, con Node/E2E y accesibilidad básica. El consejo breve permanece y el motor no cambia.
- **I2-24–25:** mostrar una BOM completa de ejemplo y completar Picking/Transporte con su consecuencia sobre pedidos, staging y salida.
- **Refuerzo pedagógico B, integrado al diseño de I2-26–27:** distinguir supuesto/real/contrafactual, guiar lectura de 3 SKU y día 0–12, prueba de comprensión de cuello de botella.
- **I2-28a/b/c–30:** contrato conjunto de acciones, validación física, UI multipalanca, calendario/presupuesto y reintento; cada sub-PR pequeño con regresión, sin sumar al contador hasta que cumpla el gate entero de I2-28.
- **I2-31–35:** «La mirada de Nico» con evidencia, fortalezas/debilidades, costo incremental, servicio, cuellos y alternativas razonables. Separar causa demostrada de hipótesis.
- **I2-36–40:** E2E combinatorio, Android físico/TalkBack y prueba humana de comprensión, además de auditoría V1.

**Aceptación nueva para el refuerzo A:** el usuario puede empezar sin abrir ninguna lectura, ver siete capítulos en orden opcional, recorrer y reabrir la guía durante cualquier área, acceder a ocho fichas con qué hace/qué controla/KPI/riesgo/ejemplo/pregunta, cambiar nivel sin alterar semillas ni motor, y conservar el footer móvil. La guía no debe hacer afirmaciones sobre el futuro de su escenario.
