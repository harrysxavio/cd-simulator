# UX móvil guiada · v11.22

**Objetivo de esta entrega:** corregir los problemas observados en capturas de un teléfono Android real del 9 de octubre de 2026. El simulador debe enseñar a dirigir un centro de distribución mediante decisiones y consecuencias, no mediante un informe extenso y disperso.

## Hallazgos verificados en las capturas

| Problema detectado | Cambios U5 incrementales |
| --- | --- |
| Barra fija «Ver operación / Nueva campaña» superpuesta a títulos, textos y controles | En teléfonos de hasta 680 px de ancho CSS la barra pasa a **flujo normal**, sin posición sticky; pestañas de Resultados también dejan de ser sticky |
| Tarjetas de KPI demasiado altas para un teléfono por repetir «unidades» y márgenes grandes | Diagnóstico: **3 filas compactas** con etiqueta y cifra en una sola línea, sin subtítulo de unidades repetido; resumen de Recuperación: tres cifras «Antes», «Con tu opción», «Recuperas» |
| Jerga o causalidad técnica antes de que el usuario entienda la decisión | «¿Qué está pasando?» → «Tu siguiente paso» → causa **bajo «¿Por qué sucede?»**. Otras alternativas y límites del modelo se abren solo cuando interesan |
| La ficha de área repite la relación Entrada/Salida/Capacidad y «Consecuencia para toda la cadena» | Una sola línea **«Llegan X → siguen Y»**, con aviso corto sobre unidades detenidas. Capacidad y explicación adicional quedan en paneles de detalle. Se conserva la decisión actual y el resultado previo en el motor |
| Recuperación muestra inventario, ubicación, costos, restricciones y calendario todo a la vez | Tres preguntas progresivas: **1 · ¿Con qué contamos? 2 · ¿Qué harás como gerente? 3 · ¿Qué cambia si eliges esto?** El listado de SKU queda plegado; el control de porcentaje en RESERVA-CD solo aparece cuando se decide habilitar la reserva |
| Calendario «stock diario» sin función pedagógica y doce tarjetas incluso cuando no se despacha nada | Explica que sirve para descubrir **cuándo salen pedidos y cuándo dejan de avanzar**. Al abrirlo, prioriza **días de actividad** y deja los días sin movimiento bajo un segundo detalle desplegable; los trece días originales permanecen disponibles para auditoría |
| Confirmación despliega demasiados números técnicos | Primero muestra pedidos antes/después y pendientes; costo/orden por SKU queda accesible bajo detalle |

## Secuencia de aprendizaje visible

- **Planificar (Área 1–8):** entender función del área → escoger opción → ver cuánto flujo sigue a la próxima área → continuar. Indicadores, capacidad y fórmula a petición.
- **Diagnosticar:** sorpresa de demanda → tres cifras comparables → problema principal → orientación del gerente → explicación ampliable.
- **Recuperar:** revisar existencias brevemente → comparar esperar/comprar/trasladar reserva → observar diferencia de pedidos completos y pendientes → confirmar con advertencias contextualizadas.
- **Resultado:** primero pedidos de la campaña SKU; fichas de ocho áreas ampliables; resultado agregado de una jornada encerrado en panel histórico separado. La nueva jerarquía **no modifica la física, compra original, órdenes, recepciones ni conciliaciones**.

## Regla de redacción para próximos incrementos

Usar lenguaje directo: «pedidos», «productos», «stock» y «salieron del CD». Presentar conceptos técnicos **cuando ayuden a una decisión** y definirlos en el detalle («SKU = tipo de producto», «RESERVA-CD = otra zona del mismo centro»). No utilizar «entregado al cliente» por «expedido del CD», y no llamar stock físico a unidades equivalentes del motor agregado. Mostrar una sola comparación primaria y un indicador de consecuencia.

## Criterios de aceptación automatizados

1. A 360 y 412 px no debe aparecer **desplazamiento horizontal** ni superposición por barras sticky.
2. Diagnóstico: tres cifras sin leyendas duplicadas. Una sola decisión siguiente. La causa y alternativas son accesibles, pero plegadas por defecto.
3. Planificación: una explicación causal del flujo visible, otra técnica plegada; puede elegir y avanzar.
4. Recuperación: ninguna selección de reserva aparece mientras el usuario estudia esperar o comprar.
5. Vista previa es inocua: no se guardan órdenes hasta confirmar; los saldos, compras y movimientos físicos permanecen reconciliados.
6. El calendario muestra primero las jornadas con expediciones; el resto está disponible en un nivel técnico, manteniendo 13 días físicos idénticos al motor.
7. Todas las opciones de toque conservan altura mínima 44 px cuando corresponda y el botón global reiniciar permanece disponible en el documento.

## Limitaciones, sin sobreventa

No se ha probado todavía en Android físico con TalkBack, ni con usuarios principiantes haciendo el ejercicio completo sin asistencia. El emulador Chromium comprueba el comportamiento de DOM y tamaños; las capturas del usuario confirman defectos visuales anteriores, no validación del resultado corregido. Los motores agregado (una jornada) y SKU (doce días) continúan separados económicamente: M2/M3/M4 siguen **parciales**. U5 está en progreso, no completada.
