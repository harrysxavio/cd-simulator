# Pruebas de aceptación de negocio · Sobredemanda y decisiones de recuperación

**Fecha:** 2026-10-09 · **Versión base estudiada:** v11.15 · **Incremento:** v11.16 (pruebas y diseño; sin rediseño visual todavía).

## Por qué existe este documento

Las pruebas de integridad física (inventario sin negativos) no prueban que un simulador sea **comprensible o que recomiende decisiones útiles**. Esta batería parte de problemas operativos concretos, observa resultados de negocio y define qué reacción sería razonable. Es una especificación de aceptación para mejorar la experiencia sin construir un segundo simulador.

**Fuente reproducible:** `tests/scenario-business-acceptance.test.mjs`. Recorrido real de pantalla: `tests/browser-underforecast.e2e.mjs` (Chromium escritorio y móvil); ejecutar CI para confirmar resultado. Los valores numéricos siguientes provienen de la ejecución de Node en [Actions #37955594401](https://github.com/harrysxavio/cd-simulator/actions/runs/37955594401) antes de añadir el test E2E.

## Escenario A · El ejemplo de sobredemanda (caso obligatorio)

### Configuración de negocio

- Campaña principal: **1.000 unidades** de demanda base.
- Comercial: **forecast conservador 80 %**, calcula 800 unidades.
- Planning: **compra 70 % del faltante**, después de considerar 250 unidades de stock inicial.
- Compras: proveedor confiable **95 %** de cumplimiento; no hay cambios retroactivos una vez revelada la demanda.
- Recepción, Calidad, Inventario, Picking y Transporte: **decisiones normales**, con sus parámetros y capacidades vigentes.
- Sorpresa explícita: **+40 %**, la demanda real asciende a **1.400 unidades**. Evitar el signo aleatorio en pruebas de aceptación.

### Resultado medido del motor agregado, jornada única

| Dato | Medición |
| --- | ---: |
| Demanda comercial prevista base | 1.000 unidades |
| Forecast ajustado | 800 unidades |
| Compra inicial solicitada | 385 unidades |
| Entrega original proveedor | 365 unidades |
| Stock expedible según flujo de una jornada | 566 unidades |
| Demanda real | 1.400 unidades |
| Brecha no expedible con el plan | **834 unidades** |
| Capacidad teórica normal de Picking | 2.300 unidades/jornada |
| Capacidad normal Transporte | 800 unidades/jornada |

**Interpretación:** en este caso es incorrecto recomendar de entrada más personal de Picking o transporte. Su capacidad ya supera las 566 unidades expedibles. La causa de negocio requiere investigar pronóstico, compra original y disponibilidad, no comprar una máquina nueva ni reforzar turnos a ciegas. Las decisiones de Comercial/Planning/Compras originales son históricas y no deben alterarse al revelar la sorpresa.

**Precisión:** las 566 son *unidades expedibles ilustrativas*, NO órdenes completas ni entregas confirmadas al cliente. El motor agregado no modela tiempo de reabastecimiento posterior al shock ni órdenes de compra extraordinarias. Tampoco permite convertir la reserva genérica directamente en SKU físico trazado.

### Resultado medido en el laboratorio SKU (muestra separada)

Para estudiar órdenes completas con fechas de recepción, se usa una **cohorte representativa** de 200 órdenes planificadas → 280 órdenes reales, política SKU de protección de servicio, forecast de compra 160 órdenes (80 %), coverage de compra 70 %, proveedor conforme al área Compras, liberación y capacidades normales. **Las cifras SKU no deben sumarse a las 1.400 unidades agregadas.**

Compra original congelada por producto: **A 70; B 0; C 9** (CLP **184.500** a costo estándar ilustrativo).

| Intervención | Pedidos completos de 280 | Pendientes | Efecto / interpretación |
| --- | ---: | ---: | --- |
| No intervenir | 139 | 141 | Existen faltantes de SKU |
| Solo reforzar operación | 139 | 141 | **Ningún pedido extra**: la restricción es abastecimiento; gasto proxy adicional CLP 910.000 |
| Nueva compra urgente, llega día 1 | **279** | **1** | **140 pedidos recuperados** en horizonte de 12 días |
| Compra urgente + refuerzo | 279 | 1 | Igual servicio que solo comprar, pero más costo |
| Compra urgente, llega día 13 | 139 | 141 | Llega fuera del horizonte: **cero recuperación** dentro del corte |

Compra extraordinaria de la alternativa día 1: **A 218, B 22 y C 7 = 247 unidades SKU**. En el supuesto del modelo, desembolso/compromiso incremental aproximado CLP **660.790** incluyendo recargo. La variable calculada `netCashDelta` asciende a CLP **599.210**, **solo como proxy simplificado** (ingreso hipotético incremental menos gastos/compromisos); no es margen neto, pago verificado, ni flujo contable conciliado. Es imprescindible corregir las etiquetas económicas antes de usar estos importes como recomendación de negocio.

**Salvedad crucial:** una entrega *urgente el día 1* es una **hipótesis explícita de abastecimiento acelerado**, no un plazo demostrado. No se debe ofrecer como promesa genérica. La orden original de C tiene lead time del catálogo distinto. El simulador futuro debe pedir o mostrar proveedor disponible, stock externo, confirmación y fecha comprometida para cada SKU.

### ¿Qué debería experimentar el usuario?

1. Ve **problema**: la demanda real supera lo planificado; el servicio cae por escasez de SKU y no por personal insuficiente.
2. Ve **evidencia breve**: pronóstico 800 vs demanda 1.400; compra original congelada; inventario verificable; demanda pendiente por SKU/pedido; cuándo entra la reposición normal.
3. Ve **decisiones posibles**, en lenguaje de negocio: no intervenir y prometer otra fecha; verificar/habilitar stock realmente localizado (no inventarlo); emitir compra extraordinaria con plazo y costo; transferir desde otra ubicación **solo cuando exista stock externo modelado**.
4. Antes de confirmar, ve **simulación contrafactual**: pedidos rescatados, fechas, costos extra, pendientes remanentes y restricciones de Recepción/Calidad/Picking/Transporte. Las opciones que no agregan servicio deben explicarse y no presentarse como recomendación.
5. Tras confirmar, se registra un evento de decisión: una **nueva orden**, traslado o cambio de prioridad; no se reescribe la compra original. La vista de tiempo muestra que el inventario solo crece **después de recibir y liberar unidades**.
6. Resultado: antes/ahora, fechas prometibles, semáforos relevantes y una explicación causal de decisiones acertadas y errores evitables.

## Escenarios negativos obligatorios

| Prueba | Resultado medido o esperado | Lección que debe comunicar la UI |
| --- | --- | --- |
| Llegada urgente día 13, corte día 12 | 139 completos, 141 pendientes; el adicional no se recibió | No prometer pedidos antes de la fecha física de arribo; mostrar compromiso, no pago confirmado |
| Recepción con capacidad cero | 96 completos de stock inicial; la compra no recupera pedidos; cero recepción | Primero resolver el bloqueo de recepción o elegir fecha/logística alternativa |
| Calidad con liberación cero | 96 completos de stock inicial; compra recibida pero retenida | Una recepción en CD no significa stock disponible |
| Picking con capacidad cero | 0 completos, aunque haya stock | Comprar más no sirve sin capacidad de preparación |
| Transporte con capacidad cero | 0 completos, aunque haya stock | No prometer salida del CD sin cupos de expedición |
| Sorpresa negativa −40 %, sobreforecast +15 %, planning +10 % | 120 órdenes reales de una muestra planificada de 200; compromiso original CLP 814.800 | Evitar compras adicionales, analizar exceso de stock, costo de tenencia y reprogramación de aprovisionamiento |
| Confiabilidad de Inventario reducida | Menos unidades *prometibles*, pero stock físico idéntico | Conciliar y ubicar antes de prometer; no crear ni eliminar unidades |

Los números del motor agregado representan **una jornada**. Los SKU anteriores son pedidos completos dentro de **12 días**. Hasta terminar M2–M4, la pantalla de resultados debe declararlos **simulaciones relacionadas, no un único cierre operacional/económico**.

## Problemas constatados en el código

1. **La decisión de compra urgente está dentro de Resultados → Inventario.** Es técnicamente seleccionable, pero pedagógicamente llega después de cerrar la recuperación. Debe moverse al momento de decisión y quedar registrada como nueva compra.
2. **Diagnóstico ofrece «Evaluar recuperación» incluso en Comercial/Planning/Compras históricas.** El motor congela esas decisiones una vez revelada la demanda; el botón conduce a un área informativa sin acción correctiva propia. La UI debería ofrecer un plan correctivo distinto de la edición retrospectiva.
3. **La recomendación puede no atender dos restricciones simultáneas.** Una intervención aislada que no sube despachos puede volverse útil solo tras otra; el análisis causal debe evaluar combinaciones físicamente válidas y los costos conjuntos sin sumar ganancias individuales.
4. **Varias pantallas presentan todos los indicadores y registros extensos de una vez.** La pantalla inicial de Diagnóstico construye tarjetas de ocho áreas con varios KPI cada una; Inventario despliega trazabilidad, comparadores, múltiples modelos y ledger. Es preciso mostrar primero resumen y decisión; tablas y conceptos técnicos permanecen en «Detalle».
5. **El refuerzo SKU de opción `overtime` se cobra como un costo por todas las 13 jornadas** aun sin ganancia, mientras la UI lo presenta como «refuerzo operativo» sin selección de días. Se debe explicar y evolucionar a fechas/turnos realmente contratados.
6. **`unitRevenue` de pedidos SKU y costos de unidades agregadas no son el mismo libro.** No llamar utilidad ni caja contable a los resultados proxy hasta completar M4.
7. **La política de reposición SKU usa días objetivo y una demanda de referencia mensual de 30 días**, aunque la campaña de pedidos se ejecuta en 12 días. Esta distinción explica por qué una política puede emitir compra cero pese a tener demanda futura; contextualizar el horizonte y la fecha prometida.

## Aceptación para las fases siguientes

- Un caso con los mismos valores produce los mismos pedidos, compras y hechos físicos.
- Las compras originales quedan congeladas después del shock; toda acción nueva tiene **ID, SKU, cantidad, proveedor/origen, día comprometido, precio supuesto y día de recepción real**.
- Al cambiar una opción, la vista de comparación no toca la campaña comprometida hasta pulsar «Aplicar decisión».
- No se rescatan pedidos antes del día de ingreso y liberación, ni se contabilizan pendientes como vendidos.
- Una intervención con cero mejora y gasto positivo se clasifica como **«no recomendable con la situación actual»**, excepto si existe una justificación explícita elegida por el usuario.
- El semáforo se vincula a evidencia de evento y a una alternativa ejecutable, no solo a porcentajes descontextualizados.
- Tests E2E verifican lectura de problema → selección de alternativa → revisión de plazo y costo → decisión → resultado → reinicio en 360 y 412 px, además de escritorio.
