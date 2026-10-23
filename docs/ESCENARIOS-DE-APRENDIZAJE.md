# Cuaderno de ejercicios · decisiones conectadas de un CD

**Versión de referencia:** v11.68 r177 · **Audiencia:** principiantes, analistas y responsables de operaciones.  
**Requisito:** leer primero [la guía del usuario](GUIA-USUARIO.md). Todos los escenarios son ficticios y reproducibles con los parámetros descritos.

## Cómo utilizar este cuaderno

Cada ejercicio contiene: situación, decisiones iniciales, cambio de demanda, alternativas, evidencia a observar y pregunta de negocio. Evita comparar resultados si has cambiado stock, estrategia, proveedores, calidad, política SKU o dotación entre pruebas.

Para fijar un shock reproducible, termina la planificación y, dentro de Diagnóstico, despliega **Probar otro escenario de demanda**: elige signo y porcentaje. No dependas del signo aleatorio inicial.

**Convención crítica:** la campaña agregada de 1.000 unidades es una **jornada**; la cohorte SKU de 200 pedidos planificados (280 si sube un 40 %) usa hasta **12 días**. Nunca los sumes, ni llames a 566 “pedidos” si corresponden a unidades agregadas.

## Escenario 1 · La demanda supera al plan y falta inventario

**Nivel:** principiante. **Pregunta:** ¿conviene comprar, reforzar personal o esperar?

**Preparación:**

1. Inicia **Nueva campaña** y utiliza la configuración base (demanda agregada prevista de 1.000 unidades).
2. En Comercial selecciona **Forecast conservador** (80 %).
3. En Planificación elige la cobertura parcial del 70 % del faltante; en Compras, **Proveedor confiable**.
4. Deja Recepción, Calidad, Inventario, Picking y Transporte en sus políticas normales.
5. En Diagnóstico aplica **aumento +40 %**. La demanda agregada real será 1.400 unidades.
6. En Resultado final → Inventario usa la política de SKU **Protección de servicio** y compara **Esperar**, **Refuerzo operativo**, **Compra urgente SKU** y **Combinación** con arribo día 1 y cobertura 100 %.

**Testigo de aceptación histórico, bajo esos supuestos** (revisar siempre los números de la versión en ejecución):

| Vista y alcance | Dato esperado en la prueba de referencia |
|---|---:|
| Agregado: pronóstico conservador | 800 unidades |
| Agregado: compra original | 385 unidades |
| Agregado: expedibles | 566 unidades |
| Agregado: pendientes | 834 unidades |
| SKU: pedidos reales | 280 pedidos completos como cohorte |
| SKU: sin intervenir | 139 expedidos, 141 pendientes |
| SKU: refuerzo aislado | 139 expedidos, 141 pendientes |
| SKU: compra urgente día 1 | 279 expedidos, 1 pendiente |

Los valores están documentados en [aceptación histórica del negocio](SCENARIO-BUSINESS-ACCEPTANCE.md) y protegidos por pruebas de regresión y navegador. Si el usuario cambia un parámetro, la cifra deja de ser un valor esperado fijo.

**Interpretación:** la limitación dominante del caso es abastecimiento. El refuerzo aumenta capacidad que no puede utilizarse; una nueva compra solo recupera pedidos después del ingreso físico y liberación. El valor monetario mostrado es un supuesto, no gasto real ni ingreso cobrado.

**Actividad:** redacta la recomendación en una frase: “Elijo ______ porque hay evidencia de ______; el riesgo pendiente es ______”.

## Escenario 2 · Compra fuera del horizonte

**Nivel:** principiante/intermedio. **Pregunta:** ¿una compra urgente siempre mejora el nivel de servicio?

1. Parte del escenario 1 sin cambiar pronóstico, cobertura ni política SKU.
2. Selecciona compra urgente con arribo **día 13**, fuera del horizonte de 12 días.
3. Compara contra **Esperar** y revisa pedidos expedidos, pendientes, unidades compradas comprometidas y cronología.

**Resultado esperado:** no se generan despachos adicionales dentro del horizonte por esa PO tardía. Existe un compromiso económico modelado y un arribo hipotético, pero no mercancía recibida en los días 0–12. No interpretes el compromiso como pago confirmado.

**Actividad:** diferencia con tus palabras **orden de compra**, **llegada al muelle**, **recepción física**, **liberación de Calidad** y **salida del CD**.

## Escenario 3 · Proveedor llega, pero Recepción/Calidad no libera

**Nivel:** intermedio. **Pregunta:** ¿dónde se transforma una entrega externa en stock utilizable?

Analiza dos subcasos: capacidad de Recepción igual a 0 y liberación de Calidad igual a 0. La suite de regresión mantiene perfiles de este tipo en el motor SKU, aunque algunos ajustes detallados se configuran indirectamente a través de decisiones del área o se ejecutan desde pruebas técnicas.

- **Recepción bloqueada:** el proveedor puede llegar, pero las unidades esperan una recepción válida; no aumentan el stock disponible para Picking.
- **Calidad bloqueada:** hay unidades físicamente recibidas, pero quedan retenidas; tampoco se convierten en expedibles hasta liberarse.
- **Punto de control:** abre la cronología del laboratorio SKU, busca días de espera y contrasta ingresos, retenciones y expediciones.

**Actividad:** identifica qué condición técnica debe cambiar antes de recomendar más compras. No fuerces el bloqueo exacto desde la interfaz si no existe un control directo: los casos límite automatizados se encuentran en tests/m8-integral-regression.test.mjs y tests/scenario-business-acceptance.test.mjs.

## Escenario 4 · Picking prepara pedidos, Transporte no puede despachar

**Nivel:** intermedio/avanzado. **Pregunta:** ¿cuándo “preparado” no es “expedido”?

1. En el laboratorio SKU habilita, si está disponible en la configuración de la campaña, el modo de **Picking/Transporte separados (staging)**.
2. Revisa el circuito **PICK-FACE → STAGING-CD → despacho** y las capacidades.
3. Compara con los supuestos de transporte restringido. En el caso extremo automatizado con capacidad de transporte 0 y capacidad positiva de Picking, puede haber pedidos preparados pero **cero** expediciones.

**Regla de lectura:** un pedido preparado no se factura automáticamente ni se marca como entregado. Si no hay transporte, el costo operacional de recursos activados puede existir mientras el valor potencial de pedidos expedidos sigue en cero.

**Actividad:** identifica qué evento falta para que un pedido pase de “preparado” a “salió del CD”. Ver el caso en tests/m8-integral-regression.test.mjs.

## Escenario 5 · Sorpresa de demanda negativa y sobrecompra

**Nivel:** intermedio. **Pregunta:** ¿cuál es el costo de planificar de más?

1. Comienza una nueva campaña con demanda base de 1.000 unidades.
2. En Comercial ensaya un pronóstico optimista (sobreestimado), y en Planificación una cobertura con colchón.
3. Revela una **disminución −40 %** de demanda.
4. Observa la compra original, el stock final, pendientes y los supuestos de tenencia; compáralos contra un plan conservador en una **nueva campaña**.

**Resultado pedagógico:** el compromiso original no desaparece después de saber que la demanda bajó. Puede aumentar el inventario remanente. El simulador no calcula por ello una pérdida contable certificada; distingue desembolso supuesto, valorización de existencias y proxy de tenencia.

**Actividad:** explica por qué comprar más para mejorar cobertura también puede ser una decisión incorrecta.

## Escenario 6 · Dos restricciones simultáneas

**Nivel:** avanzado. **Pregunta:** ¿podemos sumar beneficios de dos intervenciones?

1. Usa un escenario donde Inventario y Transporte, o Recepción y Picking, limiten el resultado.
2. Compara **A** (una capacidad), **B** (otra capacidad) y **A+B** con el mismo pronóstico, cohorte y PO original.
3. Verifica el resultado combinado en lugar de sumar variaciones individuales.
4. Analiza tiempos de espera y costos solo si el modelo declara tarifas y recursos aplicables.

En contrafactuales, **efecto combinado ≠ necesariamente efecto A + efecto B**. Por ejemplo, aumentar Picking sin camiones no genera salidas; aumentar Transporte sin pedidos preparados tampoco. Es posible que solo intervenir conjuntamente produzca una mejora física.

**Actividad:** identifica si la pantalla demuestra un **cuello de botella modelado**, una **hipótesis de causalidad** o una **causa raíz de operación real**. La última no puede demostrarse solo con un simulador.

## Plantilla para evaluar cualquier alternativa

| Campo | Registro sugerido |
|---|---|
| Escenario y configuración | Forecast, cobertura, stock, shock y horizonte |
| Baseline | Pedidos completos expedidos / pendientes |
| Intervención | Esperar / reserva / refuerzo / urgente / combinación |
| Evidencia física | Recepción, liberación, preparación, despacho y fechas |
| Delta de servicio | Expedidos con alternativa − expedidos baseline |
| Efecto económico | Costo tarifado, compra comprometida y proxy claramente separados |
| Riesgo | Actividad sin costo modelado, plazo supuesto o cuello no resuelto |
| Decisión | Recomendar, no recomendar o investigar |

### Criterio de aprobación formativa

El participante puede explicar sin confundir conceptos:

- Pedido completo frente a unidades físicas SKU.
- Expedición desde el CD frente a entrega al destinatario.
- Pedido emitido, producto recibido y producto liberado.
- Costo desconocido frente a costo cero.
- Mejoras conjuntas frente a impactos individuales no aditivos.
- Una jornada agregada frente a una cohorte SKU de 12 días.

En una sesión de evaluación real, registra si cada explicación fue correcta y qué texto resultó difícil. Esa evaluación formativa **no sustituye** la aceptación de TalkBack/Android físico pendiente en [M7-38](M7-38-ANDROID-A11Y-CHECKLIST.md).

Continúa en [arquitectura técnica](ARQUITECTURA-Y-DATOS.md) y [glosario y límites](GLOSARIO-Y-LIMITES.md).
