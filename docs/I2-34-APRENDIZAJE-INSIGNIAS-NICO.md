# I2-34 · La mirada de Nico e insignias por resultados verificables

**Fase:** F7 resultados y gamificación. **Implementación:** `src/i2-nico-evidence-learning.js` y `juego/nico-learning-panel.js`.

## Objetivo de aprendizaje

Que una persona principiante comprenda **qué logró, qué salió mal, cuál fue el sacrificio económico y operativo, qué queda como hipótesis y qué intentaría distinto un gerente**, en lugar de obtener un mensaje genérico por escoger una opción. Se utilizan solamente la lectura física SKU confirmada, los objetivos de gerencia I2-14, los cuatro ejes I2-31 y la auditoría financiera real de V1 incorporada en I2-33. **No se ejecuta otro simulador, no se modifica el stock y no se envían datos a un LLM.**

En la pantalla móvil se mantiene el par de KPI principales (expedidos y pendientes) y aparece, plegado por defecto, **«Nico evalúa tu gestión · aprendizajes e insignias»**. Incluye resumen de estrategia seleccionada (clásica, conjunto 0/1/varias palancas), a lo sumo **una insignia**, y seis apartados plegables:

1. Hechos del escenario, con denominadores y metas de servicio, gasto y pedidos.
2. Qué funcionó, solamente si los datos lo apoyan; se distingue mejora de pedidos de cumplimiento de la meta.
3. Qué salió mal o necesita atención: sin ignorar gasto extra sin beneficio, servicio bajo meta ni cola >10 %.
4. Sacrificios de la decisión: costo por pedido recuperado cuando hay delta positivo; compras comprometidas no son consumo ni pago.
5. Hipótesis que deben comprobarse, **identificadas expresamente como hipótesis**. Nunca trasladar hechos del plan original a una intervención elegida ni afirmar un único cuello causal.
6. Tres acciones sugeridas para mejorar como gerente con foco en servicio, presupuesto y cola física SKU.

## Insignias y reglas de emisión

**Regla común obligatoria:** `service.status === 'green'` **Y** `expense.status === 'green'` **Y** `time.status !== 'red'` (cola de cierre de máximo 10 %). Sin esas tres evidencias, **no hay insignia** aunque se hayan recuperado pedidos o solicitado un refuerzo costoso. Máximo una insignia por resultado para evitar confundir al jugador con muchas recompensas.

Orden de precedencia, una única insignia según hechos:

| Insignia | Requisito adicional |
|---|---|
| Decisión prudente | No intervenir, manteniendo el servicio, presupuesto y cola en los rangos de la regla común |
| Cierre sin pendientes | Intervención con 0 pedidos pendientes en el día 12 |
| Recuperación con criterio | Intervención con un aumento positivo de expediciones versus el mismo baseline |
| Equilibrio de gestión | Intervención que cumple la regla común aunque no haya aumento positivo de pedidos |

Ninguna se obtiene solo por pulsar botones, gastar dinero, elegir siempre compra urgente ni usar más palancas. No se guardan insignias independientemente del resultado (para evitar progreso manipulado): se reconstruyen al cargar la partida usando las métricas auditadas y el evento guardado.

## Evidencia, criterios y límites

- Pedido expedido del CD no equivale a entregado al consumidor.
- Contribución parcial del auditor V1 no es rentabilidad ni EBITDA ni pago verificado.
- La productividad persona-hora y el costo operativo total **no son evaluables**.
- Las colas de Recepción/Calidad en el diagnóstico pertenecen al **plan original**, no prueban que la recuperación fallara por esa área.
- Meta de servicio depende del objetivo configurado (85/90/95 %). Presupuesto incremental es el presupuesto elegido por el usuario. Cola tolerable <=10 % es un **umbral didáctico**, no estándar real de SLA.
- La calidad del aprendizaje se basa en *hechos simulados*, no en una explicación causal inventada.
- Misma seed, mismo baseline, mismas decisiones y mismos objetivos producen la misma insignia después de reiniciar o recargar; se rechazan KPI/semáforos y resultados contables adulterados.

## QA de cierre

- Node: cinco semillas × cinco opciones clásicas; cinco semillas × 0/1/2/3 palancas confirmadas; metas de 85/90/95 % y presupuestos 0–600.000 CLP; integridad del resultado, puertas de insignia, rechazo de datos falsos, ausencia de mutación y ausencia de causalidad falsa.
- Chromium móvil: recorrido completo antes y después del reveal, resultado clásico y multiacción, seis explicaciones desplegables, insignia o ausencia con explicación, sin scroll del documento exterior ni bloqueo del CTA, recarga y localStorage V1 intacto.
- Suite modelo general, suite I2 enfocada y Chromium integral **verdes antes de fusionar**. URL pública Pages y Android/TalkBack físico requieren aceptación separada.

**Siguiente I2-35:** ampliar retos reproducibles y exigir decisiones no triviales de costo-servicio, manteniendo semillas exógenas y guardados históricos.
