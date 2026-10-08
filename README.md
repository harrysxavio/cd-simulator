# Supply Chain Operations Lab — v8.6

**[Abrir el laboratorio interactivo](https://harrysxavio.github.io/cd-simulator/)**

Simulador educativo, gratuito y sin registro para practicar decisiones conectadas en una **empresa ficticia de distribución**. Pensado para estudiantes, personas que comienzan en Supply Chain y profesionales que quieren experimentar con restricciones y trade-offs operacionales.

> **Idea central:** optimizar un área no garantiza mejorar el resultado de la empresa. Hay que distinguir capacidad local, flujo recibido, productividad observada, costo y resultado global.

## Recorrido de aprendizaje

1. **Configura (opcional):** elige estrategia (servicio, equilibrio o eficiencia), meta de cumplimiento, demanda, stock, reservas, personal y costos. La estrategia modifica la evaluación, no las reglas físicas del flujo.
2. **Planifica:** toma decisiones en Comercial, Planning, Compras, Recepción, Calidad, Inventario, Picking y Transporte. En cada área puedes abrir **«Aprende el indicador»** para ver su fórmula, interpretación y vínculo con la estrategia.
3. **Diagnóstico preliminar:** identifica la diferencia entre capacidad propia y restricciones heredadas; revisa el resultado antes de cualquier recuperación.
4. **Recuperación opcional:** mantén la operación o elige mejoras puntuales, equilibradas, intensivas o cantidades personalizadas. El impacto se recalcula en toda la cadena.
5. **Resultado final:** compara cumplimiento, unidades expedibles y costos; consulta trazabilidad, flujo y economía en paneles desplegables. Revisa una rúbrica pedagógica de 0 a 100 con pesos visibles según estrategia.

## KPI de aprendizaje

| Área | Indicador pedagógico |
|---|---|
| Comercial | Error absoluto de pronóstico |
| Planning | Cobertura de la brecha de reposición |
| Compras | Cumplimiento de entrega del proveedor |
| Recepción | Unidades recibidas por operario y jornada |
| Calidad | Tasa de liberación |
| Inventario | Disponibilidad respecto de la demanda |
| Picking | Unidades preparadas por operario y utilización |
| Transporte | Utilización de la capacidad de expedición |

Los indicadores se calculan con el escenario actual. **Productividad observada ≠ productividad intrínseca del trabajador:** puede existir capacidad ociosa por restricciones aguas arriba. No se calcula OTIF, fill rate por pedido ni precisión estadística real de pronósticos históricos.

## Modelo económico y límites

- El resultado operacional simulado es ingreso potencial menos costo de mercancía expedible y gastos operacionales.
- El desembolso de la jornada contabiliza compras recibidas por separado; no se reconoce todo lo comprado como costo de venta.
- El stock inicial y la reserva utilizada se valorizan según el costo unitario configurado.
- Las decisiones especiales y las acciones correctivas incorporan recargos de referencia didácticos.
- La meta de costo unitario es global. No se inventan presupuestos por área.
- No se trata de un estado de resultados completo: se excluyen impuestos, depreciación, mermas valorizadas, inventario final contable y entregas confirmadas.
- Una jornada, unidades agregadas, sin SKU ni pedidos individuales. Datos ficticios y deterministas.
- La información se guarda localmente en el navegador.

## Arquitectura

- `index.html` — estructura semántica y navegación.
- `src/engine.js` — áreas, decisiones y parámetros (incluye compatibilidad con un evaluador anterior).
- `src/flow.js` — propagación de unidades y acciones correctivas.
- `src/scenario.js` — configuración, validación y modelo económico.
- `src/app.js` — experiencia de usuario, KPI, diagnóstico, navegación y exportación CSV.
- `src/styles.css` — estilos responsivos.
- `tests/model.test.mjs` — regresión del modelo (`node --test tests/model.test.mjs`).
- `archive/` — versiones anteriores.

Aplicación estática en GitHub Pages, sin dependencias de frontend ni backend.

## Estado de calidad

Se realizan pruebas de sintaxis, cálculo y navegación simulada; estas pruebas **no sustituyen** una revisión visual en Chrome Android, accesibilidad con lector de pantalla ni validación por usuarios externos. El simulador es una herramienta didáctica, no un software de planificación empresarial.

## Portafolio y autoría

Proyecto conceptualizado y dirigido con criterios de Supply Chain, mejora continua, productividad y costos, desarrollado iterativamente con asistencia de IA. El valor del ejercicio está en definir las reglas de negocio, cuestionar resultados, detectar inconsistencias y decidir qué merece automatizarse, no en presentar la generación de código como una hazaña técnica.

## Rúbrica pedagógica v8.3

La evaluación pondera tres dimensiones: cumplimiento relativo a la meta, costo unitario relativo a la meta y resultado operacional relativo al ingreso potencial. Pesos: servicio 65/20/15; equilibrio 45/35/20; eficiencia 25/55/20. La escala es ilustrativa, **no evalúa las capacidades personales ni garantiza una decisión óptima**. Los resultados antes y después de la recuperación se comparan con la misma estrategia.

Para ejecutar la suite ESM en Node 22 sin package.json: `node --experimental-default-type=module --test tests/model.test.mjs`. La revisión de interfaz Android con navegador real continúa pendiente.

## Próximas fases

Pendiente: metas diferenciadas por área, diagnóstico causal más riguroso, evaluación de decisiones con retroalimentación detallada, comparación de escenarios y validación con usuarios externos.

## Indicadores operativos v8.6

Se muestran **dos indicadores por cada una de las ocho áreas** en la misión y el diagnóstico preliminar, con fórmulas e interpretación: Comercial (error y sesgo del pronóstico); Planning (cobertura de compra y cobertura teórica de demanda); Compras (cumplimiento al corte y brecha de entrega); Recepción (productividad por persona-jornada y utilización de capacidad); Calidad (tasa de liberación y unidades pendientes de liberación); Inventario (disponibilidad y stock base no habilitado); Picking (productividad por persona-jornada y utilización); Transporte (cumplimiento expedible y utilización de expedición).

**Alcance:** no se calculan OTIF, lead time, defectos, exactitud física, productividad horaria, días de inventario ni cumplimiento por pedido porque el escenario no contiene esos datos. La cifra de proveedor puede diferir décimas del porcentaje configurado debido al redondeo a unidades enteras. El mapa de operación utiliza una cuadrícula de 4 × 2 en teléfonos para evitar desbordamientos de tarjetas horizontales. Falta validación visual en Chrome Android real.

## Fase v8.6: diagnóstico contrafactual

Se calcula para cada área una intervención adicional aislada manteniendo las demás decisiones constantes, mostrando unidades expedibles adicionales, variación de costo, ingreso potencial y resultado operacional. El foco prioriza la variación del resultado entre intervenciones que sí aumentan expedición. **No se presenta como causa raíz verificada**: restricciones simultáneas pueden requerir combinaciones y las pruebas aisladas no son aditivas. El diagnóstico inicial y final muestra este contexto, y las explicaciones de KPI siguen basadas en datos de una jornada ficticia.

Pruebas adicionales: `tests/causal.test.mjs`. Para ejecutar toda la suite: `node --experimental-default-type=module --test tests/*.test.mjs`. La comprobación visual real en Android permanece pendiente.

## Fase v8.6: demanda prevista, real y control por área

La **demanda prevista base** es independiente de la **demanda real observada**. Comercial ajusta el pronóstico sobre la prevista, Planning calcula reposición, Compras solicita unidades y las ocho áreas ejecutan; el cumplimiento final se divide por los pedidos reales. Hay tres escenarios rápidos: demanda 30 % menor, igual o 30 % mayor, además de entrada manual. La planificación no conoce el futuro: cambiar la demanda real no altera automáticamente la compra solicitada.

Se muestran entre 2 y 5 KPI por área (más en Inventario, Picking y Transporte) con fórmulas. Se incluye excedente potencial de stock, brecha de demanda, utilización y productividad. No se inventan tiempos de entrega, OTIF, defectos ni exactitud física: harían falta pedidos con fechas, ubicaciones, registros de eventos y mediciones reales.

**Costos por área:** referencia con modos operativos estándar, sin recuperación, con demanda observada igual a la prevista. El usuario configura tolerancia porcentual de sobrecosto (10 % por defecto). Se distribuyen solo gastos atribuibles: dotación, intervenciones, recargos, empaque y transporte. No se reparten costos fijos compartidos ni mercancía entre áreas. Un costo inferior causado por bajo volumen **no se califica como eficiencia**. Las alertas incluyen refuerzos sin unidades adicionales, capacidad insuficiente, desviación de demanda, excedente potencial y servicio bajo meta. Las referencias son pedagógicas, no presupuestos reales ni benchmarking externo.

Pruebas: `tests/demand.test.mjs`. Pendiente validar visualmente en Android y extender a un modelo por SKU/pedido con tiempos de proceso y de entrega.

## v9.0 · Inicio del plan de cinco fases

**Fase 1 (en desarrollo):** se cobran recursos adicionales por capacidad personalizada sobre referencia de Recepción (325 unidades por operario incremental) y Picking (460 unidades por operario incremental), un recargo de capacidad personalizada de Transporte (100 CLP por unidad de capacidad diaria extra) y aceleración de Calidad (80 CLP por unidad liberada sobre 95 %). Estos parámetros son supuestos pedagógicos y no tarifas reales. Los costos adicionales se asignan a sus áreas y la referencia de costo se recalcula sin parámetros personalizados. La fase económica aún requiere presupuestos flexibles, validación completa de otras decisiones personalizadas y pruebas visuales.

**Adelanto de Fase 2, sorpresa de demanda:** en Configuración se introduce una magnitud porcentual (por defecto 30 %, editable de 0 % a 80 %) con signo sorteado al revelar. Durante la planificación y el diagnóstico inicial, el motor utiliza la demanda prevista y oculta la real. Al pulsar «Revelar sorpresa de demanda», aplica la variación a la demanda real, preserva la compra planificada y habilita Recuperación. Se impide volver a planificar sin reiniciar el ejercicio. Cambiar la configuración reinicia la revelación y las recuperaciones.

El usuario define la magnitud de la sorpresa y el sistema sortea el signo positivo o negativo al revelarla. La dirección sorteada se guarda localmente durante el ejercicio. Quedan pendientes escenarios preparados por otra persona, comparación entre escenarios y presupuesto flexible.

Pruebas de regresión nuevas: `tests/surprise.test.mjs`. Ejecución prevista: `node --experimental-default-type=module --test tests/*.test.mjs`.

## v9.1 · Fase 1: control de costos por capacidad y presupuesto flexible

Se corrigió un doble cargo: elegir el modo reforzado de Recepción/Picking ya tiene una tarifa especial y **no** vuelve a cobrar dotación por esa misma capacidad. Las capacidades personalizadas por encima de la capacidad del modo elegido y su dotación sí generan un cargo incremental. El control por área utiliza ahora un presupuesto flexible: el costo estándar de personal se mantiene y el gasto estándar de empaque/transporte se ajusta a las unidades efectivamente procesadas. Se informan por separado desviación de volumen y desviación de gasto; los costos por área siguen conciliando con los gastos operacionales excluyendo costos fijos compartidos. No se interpreta menor volumen como eficiencia.

**Limitación aún abierta:** el presupuesto flexible es parcial: recepción, calidad, inventario y otras variaciones de productividad no tienen todavía un estándar de horas/productividad suficientemente rico. Los recargos son didácticos, no cotizaciones reales. La fase 1 no se considera cerrada hasta auditar todos los parámetros y escenarios extremos, añadir presupuesto de mano de obra ajustado por dotación y ejecutar la suite real de Node y una prueba de navegador.

## v9.2 · Fase 1: horas efectivas y productividad estándar

Las capacidades de Recepción, Inventario y Picking ahora se calculan desde **dotación × horas efectivas × unidades por hora-persona**, con un multiplicador para los modos reducidos/reforzados. Parámetros editables: horas efectivas (1–12), productividad de Recepción, Picking e Inventario (unidades/hora-persona). Los valores iniciales mantienen las capacidades del modelo anterior (650, 1.200, 2.300 unidades por jornada respectivamente). La dotación incremental de capacidades personalizadas se estima con las mismas horas y tasas estándar, y se cobra como costo diario.

Se añadió `src/labor.js` con auditoría de productividad realizada, utilización, dotación teórica necesaria para el flujo, y exposición monetaria indicativa de dotación superior a la teórica. La cifra **no** es un ahorro realizable automáticamente ni una recomendación de despedir personas: faltan tareas indirectas, restricciones de turnos, variabilidad por SKU y tiempos de cambio. El reporte aparece al final junto a semáforos y costos.

Pruebas nuevas en `tests/labor.test.mjs`. Pendiente ejecutar la suite Node completa y pruebas visuales reales. Fase 1 todavía abierta: auditar el vínculo de cada modo con costo de personal, el tratamiento de stock por SKU y la gestión de presupuesto por volumen y nivel de servicio.

## v9.3 · Auditoría de dotación y variación presupuestaria

La referencia de presupuesto por área usa ahora los **modos operativos predeterminados** (no las decisiones del ejercicio), sin capacidades personalizadas. Esto evita comparar decisiones contra una referencia contaminada por un modo especial. Las tarjetas muestran separadamente desviación de gasto frente al presupuesto flexible y efecto volumen frente al presupuesto estático.

El motor expone `stockUsableTotal` antes del límite de demanda y `unusedStock` después de expedición. La auditoría de Inventario ya no usa toda la demanda como carga de trabajo: usa el stock utilizable y muestra también dotación teórica para atender la demanda posible. Los semáforos detectan dotación superior a la carga teórica o carga superior a la dotación en Recepción, Inventario y Picking, con exposición monetaria **indicativa**, no ahorro realizable. Los indicadores no incluyen dotación mínima, tareas indirectas, restricciones laborales ni variabilidad de mezcla; no deben emplearse para decisiones reales de personal.

Se ampliaron las pruebas en `tests/labor.test.mjs`. Se ejecutaron 11 verificaciones funcionales con DOM simulado (11 correctas); la suite real de Node y QA visual Android continúan pendientes. El simulador sigue siendo de unidades agregadas, no una herramienta de dimensionamiento industrial.

## v9.4 · Regresión financiera y controles de decisiones

Se corrigió la doble imputación en Calidad: la modalidad **priority** ya paga su recargo fijo de 22.000 CLP y no paga adicionalmente la aceleración de liberación hasta el 100 % propia de ese modo. Solo una liberación por encima del estándar del modo seleccionado activa el costo variable ilustrativo.

Los semáforos comparan ahora las modalidades operativas especiales de Recepción, Calidad, Inventario, Picking y Transporte con la modalidad normal manteniendo las demás decisiones y acciones. Cuando una modalidad no mejora las unidades despachadas y además reduce el resultado simulado, aparece la alerta «Modo sin retorno demostrado». Esta prueba es un contrafactual aislado y no considera seguridad, SLA, calidad de servicio ni beneficios futuros no modelados.

Se añadieron pruebas de regresión de ambos casos en `tests/labor.test.mjs` y un workflow `.github/workflows/model-tests.yml` para ejecutar la suite Node 22 en cada push/PR. En esta iteración pasaron **11 de 11 verificaciones funcionales con DOM simulado**; no se ha confirmado todavía la ejecución exitosa de GitHub Actions ni realizado una prueba visual real en Android.

## v9.5 · Cierre de decisiones previas a la sorpresa

Tras revelar la demanda, el motor usa `lockUpstream: true`: ya no acepta acciones correctivas de Comercial, Planning o Compras que alterarían retroactivamente el forecast, las unidades solicitadas o las entregas comprometidas. La interfaz muestra esas áreas como decisiones cerradas y explica el motivo; las acciones de Recepción, Calidad, Inventario, Picking y Transporte continúan disponibles. Las acciones antiguas guardadas en el navegador para las tres áreas cerradas se ignoran también en el motor y no generan costos fantasma.

Se corrigió además la navegación entre pestañas: primero se resuelve la restricción de acceso (no permitir Recuperación/Resultado antes de revelar) y luego se actualiza la visibilidad. Antes podía quedar seleccionada una pestaña oculta tras una redirección.

Se añadieron pruebas a `tests/demand.test.mjs` y se verificaron 9 escenarios funcionales con interfaz simulada. Pendiente: ejecutar suite Node en GitHub Actions y prueba visual real en Android; la operación sigue modelada como flujo agregado de un solo día y no representa compromisos por pedido/SKU.

## v9.6 · Comparación temporal correcta de la sorpresa

El diagnóstico preliminar conserva una fotografía **del plan original**, evaluada con demanda prevista, y al revelar la sorpresa presenta por separado el resultado del plan con la demanda realmente observada, antes de aplicar acciones de recuperación. Esto evita reinterpretar retroactivamente el diagnóstico original como si la demanda real ya se hubiera conocido. El motor mantiene iguales las compras y entregas originales para ambos escenarios.

Se corrigió el valor por defecto de `cleanScenario`: si no se proporciona `actualDemand`, utiliza `demand`, y nunca presupone silenciosamente una sorpresa positiva. La sorpresa continúa calculándose solo al revelarla. Cambiar parámetros o restablecer la configuración reinicia el modo planificación y devuelve a Operación para evitar una recuperación abierta con escenario nuevo. Se añadieron dos pruebas a `tests/surprise.test.mjs` y se verificaron 7 recorridos de interfaz con DOM simulado. Suite Node real y QA visual Android pendientes.

## v9.7 · Comparación de tres momentos de demanda

Nuevo módulo puro `src/journey.js` con `demandJourney()`: evalúa (1) plan original con demanda prevista, (2) sorpresa observada sin recuperación y (3) resultado posterior a intervenciones. Cada momento expone demanda, unidades expedibles, pendientes, cumplimiento, resultado y gasto operacional; también se muestran diferencias de servicio, gasto y resultado económico atribuibles a recuperación. El módulo fuerza el bloqueo de acciones anteriores al evento, incluso si se guardaron acciones obsoletas.

El diagnóstico muestra los tres momentos juntos para no confundir impacto de la demanda con efecto de las decisiones. Se impide volver a sortear la demanda después de revelarla sin reiniciar el ejercicio. Al editar parámetros se sincroniza la demanda oculta con el nuevo plan. Nuevas pruebas `tests/journey.test.mjs` para ambos signos, bloqueo de acciones previas y reconciliación de diferencias. Ocho comprobaciones funcionales simuladas correctas. Pendiente verificar GitHub Actions y navegador real; es una comparación de escenarios estáticos, no un libro de movimientos de inventario ni una simulación horaria.
