# Supply Chain Operations Lab · v11.6

**Simulador educativo de operaciones, inventario, decisiones y costos para un centro de distribución ficticio.**

[▶ Abrir simulador](https://harrysxavio.github.io/cd-simulator/?v=116) · [Código fuente](https://github.com/harrysxavio/cd-simulator)

> **Idea central:** mejorar un área de manera aislada no garantiza mejorar el servicio, la productividad ni la rentabilidad del negocio. El objetivo es experimentar, identificar restricciones y aprender a decidir con datos.

**Estado:** prototipo funcional en desarrollo, con datos sintéticos y modelos deterministas. **No es un WMS, ERP ni un optimizador listo para producción.** No requiere cuenta, backend ni instalación: funciona como aplicación estática en GitHub Pages.

## Cómo utilizarlo

1. **Configura el escenario.** Ajusta demanda, existencias, personal, productividad, costos y estrategia de evaluación.
2. **Planifica la operación.** Decide en Comercial, Planning, Compras, Recepción, Calidad, Inventario, Picking y Transporte.
3. **Analiza el diagnóstico preliminar.** Examina capacidades, cuellos de botella, indicadores, costos y posibles causas.
4. **Revela la demanda sorpresa.** El escenario puede aumentar o disminuir respecto del plan. Las decisiones de abastecimiento previas quedan congeladas en el ejercicio SKU.
5. **Experimenta con recuperación.** Compara acciones y su efecto sobre el flujo agregado. En el laboratorio SKU también puedes evaluar compras urgentes y refuerzo de capacidad.
6. **Consulta el laboratorio SKU.** Compara políticas de inventario, plazos de proveedor, pedidos pendientes, atrasos y resultados económicos ilustrativos.

Los paneles son complementarios, pero **no todos comparten todavía el mismo inventario ni la misma contabilidad**. No se deben sumar sus resultados.

## Qué modela cada parte

### Motor principal: cadena de suministro agregada

- Ocho áreas: Comercial, Planning, Compras, Recepción, Calidad, Inventario, Picking y Transporte.
- Decisiones, capacidades y acciones correctivas con propagación de restricciones.
- Demanda planificada y demanda real revelada.
- Indicadores de servicio, capacidad, productividad, utilización y costos.
- Evaluación económica simplificada y diagnóstico causal contrafactual.
- Comparación entre planificación, sorpresa y recuperación.

**Límite:** es un modelo agregado de una jornada. No representa órdenes ni SKU individuales y su contabilidad no está integrada con el laboratorio de eventos.

### Laboratorio SKU: rotación, abastecimiento y pedidos

Tres productos ficticios con perfiles diferentes:

| SKU | Rotación física | Stock inicial | Plazo proveedor |
|---|---|---:|---:|
| A | Alta | 150 unidades | 2 días |
| B | Media | 90 unidades | 5 días |
| C | Baja | 55 unidades | 10 días |

- Cuatro tipos de pedidos, con listas de materiales (BOM) diferentes.
- Despacho únicamente de **pedidos completos**, sin inventario negativo.
- Demanda por SKU derivada de la mezcla de pedidos.
- Rotación física y clasificación ABC por **valor económico de demanda** diferenciadas; no se fuerza una letra ABC distinta para cada SKU.
- Cobertura estimada, punto de pedido y stock de seguridad ilustrativo.
- Políticas de cobertura **ajustada, equilibrada y protección de servicio**.
- Compras planificadas según revisión periódica de stock objetivo, distintas de la alerta de punto de pedido de revisión continua.
- Llegadas de proveedor por día, retraso opcional del SKU A y entregas parciales de proveedor en el motor.
- Cola de pedidos pendientes y despachos diarios con límite de capacidad.
- Comparación de demanda planificada versus demanda sorpresa con **compras originales congeladas**.
- Recuperación con espera, refuerzo de capacidad, compra urgente o combinación de ambas.

**Límites:** cohorte fija de pedidos generada el día 0; no hay pedidos nuevos diarios, cancelaciones ni reservas por cliente. Los pedidos bloqueados pueden saltarse. La recepción y calidad de las compras SKU se suponen instantáneas al llegar, sin consumo de capacidad. La compra urgente se supone disponible el día 1. Son hipótesis pedagógicas, no compromisos de proveedores reales.

## Economía: interpretar correctamente los números

El motor agregado calcula costos e ingresos operacionales simplificados, separando en lo posible compra y consumo de existencias. El laboratorio SKU ofrece una comparación **incremental**, no un estado de resultados consolidado.

En la recuperación SKU se muestran:

| Indicador | Qué representa |
|---|---|
| Pedidos completos y pendientes | Servicio físico al cierre del horizonte |
| Pedidos en plazo | Pedidos despachados el día 0 |
| Días-pedido de atraso | Suma diaria de pedidos que permanecen pendientes |
| Desembolso adicional | Compra urgente, recargo y refuerzo de capacidad |
| Caja incremental simplificada | Ingresos brutos adicionales menos desembolsos incrementales |
| Penalización por atraso | Supuesto de CLP 150 por pedido pendiente y día |
| Tenencia de inventario | Supuesto de 0,05 % diario sobre valor del stock al cierre de cada día |
| Resultado económico proxy | Caja incremental + penalizaciones evitadas − variación de tenencia |

**Importante:** la penalización es una valoración didáctica, no una multa contractual ni una pérdida contable confirmada. El costo de tenencia es una aproximación, no un gasto real auditado. El proxy **no es utilidad, EBITDA, margen neto ni flujo de caja certificado**. Faltan impuestos, fletes, empaques, financiamiento, costos fijos reales, mermas, costos de pedido y conciliación contable completa. El resultado también depende de los supuestos de precio y costo.

## Ejercicio sugerido

1. Selecciona **Protección de servicio** y planifica 200 pedidos.
2. Revela una sorpresa de **+30 %**: la muestra pasa a 260 pedidos, sin modificar las compras previas.
3. Compara **esperar**, **reforzar capacidad** y **comprar urgente**.
4. Activa el retraso de ocho días del proveedor A y observa el backlog.
5. Contrasta servicio, atraso, gasto adicional, caja incremental y proxy económico.
6. Explica **qué restricción cambió** y por qué una acción costosa puede no resolverla.

Los valores son reproducibles bajo los mismos parámetros, pero no predicen una operación real.

## Arquitectura técnica

Aplicación web estática, JavaScript ES modules, sin framework ni backend.

| Archivo | Responsabilidad |
|---|---|
| `index.html` y `src/styles.css` | Estructura, navegación y estilos |
| `src/app.js` | Estado local, interacción y visualización |
| `src/engine.js`, `src/flow.js` | Áreas, decisiones y flujo agregado |
| `src/scenario.js`, `src/kpis.js`, `src/attention.js` | Economía, indicadores y alertas |
| `src/labor.js`, `src/causal.js`, `src/journey.js` | Personal, diagnóstico y etapas de demanda |
| `src/sku.js` | Catálogo, mezcla y consumo físico de pedidos |
| `src/policy.js` | Políticas de cobertura y reposición |
| `src/timeline.js` | Plazos y recepciones por SKU |
| `src/events.js` | Eventos diarios, backlog y conservación física |
| `src/integrated.js` | Sorpresa de demanda con compras congeladas |
| `src/recovery.js` | Recuperación y comparación económica incremental |
| `src/audit.js` | Conciliación de existencias, pedidos y valoración desde un solo registro SKU |
| `tests/*.test.mjs` | Pruebas de regresión del modelo |

El navegador guarda decisiones y escenarios del motor principal en almacenamiento local. Los controles experimentales SKU no necesariamente se conservan al recargar.

## Ejecutar y comprobar

Para servir la aplicación localmente, desde la raíz del repositorio:

```bash
python3 -m http.server 8000
```

Abrir `http://localhost:8000`. Es importante usar servidor HTTP local por los módulos ES.

Pruebas automatizadas con **Node.js 22**:

```bash
node --experimental-default-type=module --test tests/*.test.mjs
```

Existe un workflow de GitHub Actions en `.github/workflows/model-tests.yml`. **No se ha confirmado aquí el estado real del CI ni la ejecución completa de Node.** Se han realizado comprobaciones de integración con DOM simulado, que no sustituyen pruebas reales de navegador, Android, accesibilidad ni experiencia de usuarios.

## Roadmap y estado estimado · v11.1

| Fase | Avance aproximado | Pendientes principales |
|---|---:|---|
| 1. Motor operacional y económico | 80 % | Auditoría y conciliación de casos extremos |
| 2. Demanda sorpresa y recuperación | 88 % | Escenarios reproducibles y cierre de validación |
| 3. SKU, inventario y abastecimiento | 82 % | Unificación física y económica con el motor principal |
| 4. UX y aprendizaje guiado | 72 % | Ejercicios progresivos, móvil y accesibilidad |
| 5. QA, documentación y portafolio | 58 % | CI verificado, regresiones reales y revisión visual |

**Próxima prioridad:** consolidar el inventario, la capacidad y la contabilidad de ambos motores, evitando doble conteo de existencias, compras, ingresos y costos. Después, ejecutar y corregir la suite Node y validar Android.

## v10.6 · Auditoría trazable del laboratorio SKU

Se incorporó `src/audit.js` y una sección de conciliación visible después de revelar la sorpresa de demanda. Para cada SKU se verifica:

```text
Stock inicial + unidades recibidas = unidades despachadas + stock final
```

El costo valorizado de las existencias se concilia con la misma identidad, usando el costo ilustrativo de cada SKU. También se verifica que los pedidos solicitados sean iguales a los completados más los pendientes, que el total de despachos diarios concuerde con los pedidos completos y que los cálculos económicos incrementales reconcilien aritméticamente. La auditoría utiliza el mismo resultado de eventos diarios que genera la operación SKU: **no se suman resultados de motores independientes**.

Se añadieron `tests/audit.test.mjs` y se comprobaron 36 combinaciones de política de inventario, intervención y sorpresa mediante evaluación JavaScript del modelo; las 36 conciliaron. Esta comprobación **no equivale a ejecutar la suite completa Node ni a QA de navegador real**.

**Límite relevante:** es una auditoría interna del motor SKU y sus supuestos, **no la unificación con el motor agregado principal**. La consolidación operacional y financiera sigue pendiente, así como validar CI y Android.

## Autoría y propósito

Proyecto conceptualizado y dirigido desde la experiencia de negocio en Supply Chain, operaciones, productividad, procesos y mejora continua, con desarrollo iterativo asistido por IA. Su propósito es facilitar aprendizaje práctico mediante decisiones transparentes, restricciones verificables y discusión de supuestos.

Los escenarios, precios, productividades, plazos y costos son ficticios y se utilizan exclusivamente con fines educativos.

## v10.8 · Corrección crítica de interfaz y controles (Android)

Un reporte con captura de pantalla de Android detectó que, aunque la navegación inicial se mostraba, los indicadores de diagnóstico y controles aparecían incompletos. **Causa confirmada en código:** `src/app.js` llamaba a `laborAudit(...)` durante `render()` pero no importaba la función desde `src/labor.js`. El navegador producía un `ReferenceError` y abandonaba el render antes de completar el diagnóstico, las tarjetas y los enlaces de botones. Se restauró la importación, se corrigió el título de alertas de estado positivo y se incrementó la versión de caché de módulos a `v=107`.

Se agregaron `tests/ui-contract.test.mjs` para detectar dependencias críticas omitidas, comprobar que los botones de navegación estén presentes y conectados y verificar consistencia de versión entre HTML e imports ES. **Prueba de integración con DOM simulado: 15/15 comprobaciones**, incluyendo KPI preliminares, personal, 4 controles SKU, 8 áreas, 3 estrategias, parámetros de escenario, diagnóstico, revelación de demanda, recuperación, navegación siguiente/anterior, resultado final y reinicio.

**Limitación de QA:** la ejecución anterior se realizó con un DOM simulado, no con Chrome real. El entorno de ejecución no pudo conectarse al sitio público para ejecutar una sesión automatizada de Android/Chromium. Por tanto, la corrección está confirmada por inspección de código y pruebas funcionales simuladas, pero **no se afirma que se haya verificado visualmente en el teléfono**. Si hay una versión anterior en caché, abrir el enlace con `?v=108` o actualizar la pestaña.

**Pendiente prioritario:** automatizar una prueba E2E real de navegador en GitHub Actions (por ejemplo, Playwright con Chromium móvil) que recorra planificación → diagnóstico → sorpresa → recuperación → resultado y falle si hay excepciones de JavaScript o elementos vacíos.

## v10.8 · Sorpresa en el diagnóstico y escenario personalizado

Al entrar en **2 · Diagnóstico** se revela automáticamente la variación aleatoria de demanda, antes de decidir la recuperación. Allí mismo se puede elegir **Aumento (+)** o **Disminución (−)** y un porcentaje entero entre **0 y 100 %** para reproducir un caso real. Aplicar un nuevo escenario conserva las decisiones y compras originales, pero reinicia las intervenciones de recuperación. El modo aleatorio sigue disponible sin configurar nada.

La interfaz móvil incorpora controles adaptables. Se comprobaron **11 de 11** interacciones con DOM simulado, incluyendo revelación automática, escenario de −20 %, rechazo de un porcentaje inválido, recuperación y reinicio. Se añadió una prueba de regresión de este flujo.

### Incidencia abierta de GitHub Actions

Las capturas de la ejecución **Model regression tests #77** muestran **82 pruebas aprobadas y 1 fallida, de 83**. El entorno Node y la descarga del código funcionaron. No se ve el nombre de la prueba fallida en las capturas, por lo que todavía no se puede afirmar que el CI esté reparado. Es necesario identificar el primer `not ok` del registro completo, corregirlo y comprobar una ejecución verde. No se recomienda desactivar las alertas mientras haya fallos reales.

## v10.9 · Lectura móvil y Compras ↔ Inventario

- En pantallas de hasta 760 px, el laboratorio SKU usa **una columna** de tarjetas de ancho completo, y los botones se adaptan a teléfonos angostos. Evita los bloques de texto de dos columnas que dificultaban la lectura en Android.
- En **Resultado final** hay un botón **Nueva campaña desde cero**. Pide confirmación y restablece demanda, decisiones, acciones correctivas, política SKU y retrasos. Se conserva la función de reinicio anterior en Operación.
- En el laboratorio SKU se puede seleccionar **día de recepción urgente 1, 2, 5, 10 o 13**. El día 13 cae fuera del horizonte de 12 días y permite observar el riesgo de comprar sin recibir a tiempo. La compra extraordinaria cubre el faltante físico calculado contra inventario inicial y compras ya comprometidas; nunca se recibe antes del plazo elegido. Se muestra el volumen de unidades extraordinarias y su impacto en pedidos completados, con advertencia cuando no mejora el servicio.
- Este control es **una simulación de recuperación SKU paralela**. Todavía no reemplaza el motor agregado de ocho áreas ni constituye una decisión de compras totalmente integrada. La siguiente fase debe conectar esa lógica con Compras, Inventario, recepción, picking y costos de la campaña principal.
- Se verificaron **8 de 8** comprobaciones de navegación y cálculo en DOM simulado. No equivale a certificación de GitHub Actions ni a prueba física en Android.

## v11.0 · Experiencia de resultados por vistas

- El informe final deja de ser una sola página extensa: ahora ofrece cinco vistas con pestañas horizontales adaptadas a teléfonos: **Resumen, Áreas, Inventario, Costos y Mejoras**. La vista activa se conserva al volver al informe durante la sesión.
- Cada pantalla presenta solo su contenido; los componentes anteriores mantienen sus identificadores y cálculo. La navegación accesible indica la pestaña seleccionada.
- Se añaden botones para avanzar entre vistas y un acceso desde Mejoras a la fase de recuperación para ensayar decisiones y revisar de nuevo sus consecuencias.
- Los detalles operativos y económicos siguen siendo desplegables. Las vistas de teléfonos apilan métricas, controles y tarjetas para evitar columnas estrechas.
- Prueba funcional de navegación con DOM simulado: **9 de 9** verificaciones aprobadas. Pendiente inspección visual real en Android y comprobación de GitHub Actions.

## v11.1 · Mejoras accionables por área

En **Resultado final → Mejoras → Restricciones observadas**, cada área presenta ahora una vista previa del potencial de expedición (o advierte que la mejora aislada no aporta), junto a **Explorar intervención**. El botón abre directamente la configuración de recuperación de esa misma área, sin obligar a recorrer todas las pantallas. La tarjeta es de una columna en móviles y utiliza etiquetas accesibles.

**Estado estimado de las cinco fases:** motor operacional/económico 80 %, demanda y recuperación 88 %, SKU e inventario 82 %, UX/aprendizaje 72 %, QA/documentación 58 %. **Avance global aproximado: 76 %**, calculado como promedio simple, no como auditoría de producción. Los pendientes principales siguen siendo la unificación del motor SKU con las ocho áreas, la ejecución verde de CI y las pruebas reales en navegador móvil.

## v11.2 · Comparador interactivo de recuperación SKU

- En **Resultado final → Inventario**, tras revelar la sorpresa de demanda, el laboratorio compara simultáneamente **Aceptar espera**, **Refuerzo operativo**, **Compra urgente SKU** y **Compra urgente + refuerzo** con idéntica demanda, política y plazo de llegada.
- Cada alternativa muestra pedidos completos, pendientes, mejora frente a no intervenir, desembolso incremental, caja incremental y un resultado económico **proxy**. Es posible seleccionar la alternativa directamente desde su tarjeta; en móvil se muestran una debajo de otra.
- Una indicación contextual identifica la opción con mayor proxy económico **entre las que mejoran el servicio**, sin confundirla con margen contable. Si ninguna mejora los pedidos dentro del horizonte, advierte que una compra tardía puede inmovilizar dinero sin recuperar pedidos.
- Se agregó una prueba de regresión para garantizar la misma línea base en las cuatro alternativas y que una recepción en día 13 no se anticipe dentro del horizonte de 12 días.
- **Límites:** este comparador continúa siendo un laboratorio SKU paralelo al motor agregado de ocho áreas. La nueva prueba está añadida al repositorio, pero **su ejecución en GitHub Actions todavía no está verificada**.

**Estado de fases (estimación):** F1 80 %, F2 89 %, F3 84 %, F4 76 %, F5 59 %. Global aproximado **78 %** como promedio simple, sujeto a pruebas reales y consolidación de motores.

## Corrección de regresión CI · 2026-10-09

La ejecución [37917786027](https://github.com/harrysxavio/cd-simulator/actions/runs/37917786027) registró **89/90 pruebas correctas**. El único fallo estaba en `tests/causal.test.mjs`: exigía exactamente dos KPI por departamento, pero Comercial ya ofrece tres y otras áreas incluyen más indicadores. Se actualizó el contrato para exigir **al menos dos KPI**, etiquetas únicas y campos descriptivos válidos, conservando los indicadores adicionales. Esta es una corrección del test, no una eliminación de KPI. **Pendiente:** confirmar el resultado del siguiente GitHub Actions sobre el commit de corrección; no se declara verde sin esa evidencia.

## v11.3 · Persistencia de decisiones SKU

- El navegador conserva ahora la política de inventario SKU, el retraso simulado de proveedor, la estrategia de recuperación y el día elegido para la compra urgente. Anteriormente, estos controles se perdían al actualizar la página aunque el resto de la campaña siguiera guardado.
- Al cargar se validan las opciones permitidas; valores corruptos o desactualizados vuelven a opciones seguras. **Nueva campaña desde cero** restablece también estos cuatro parámetros.
- Se añadió un test de contrato para verificar persistencia, validación y reinicio. **No se declara CI verde sin confirmar la nueva ejecución.**

### Estado de fases al cierre de v11.3 (estimación)

| Fase | Avance estimado | Pendiente principal |
|---|---:|---|
| 1. Motor operacional y económico | 80 % | Modelo agregado y eventos unificados |
| 2. Demanda sorpresa y recuperación | 89 % | Escenarios reproducibles y pruebas completas |
| 3. SKU, compras e inventario | 85 % | Conectar el laboratorio SKU al flujo principal |
| 4. UX y aprendizaje interactivo | 78 % | Pruebas móviles reales y simplificación de pantallas |
| 5. QA, documentación y portafolio | 60 % | GitHub Actions verde y E2E en navegador |

**Global aproximado: 78 %**, promedio simple de las cinco estimaciones, no porcentaje certificado de tareas. La integración del motor SKU es la dependencia crítica.

## v11.4 · Trazabilidad entre áreas para compras SKU

Se añadió `src/supply-bridge.js`, una interfaz de auditoría del mismo motor de eventos que sigue la secuencia **Compras → Recepción → Inventario → Picking y despacho → Caja incremental**. La pantalla Inventario presenta estas etapas juntas para que el usuario vea cómo una compra extraordinaria impacta el stock y los pedidos completos **solo después de su fecha de llegada**. El módulo devuelve recepciones y stock diario, costos de compra, pedidos completos, pendientes y la mejora respecto de no intervenir. Hay tres pruebas nuevas de plazos, recepción fuera del horizonte y conciliación física SKU.

**Límite de arquitectura:** el puente explica y calcula la interacción entre áreas en el laboratorio SKU, pero todavía no inyecta sus resultados al motor agregado principal de ocho áreas. No deben sumarse sus cifras a las del informe financiero agregado. Queda pendiente un único motor transaccional para evitar dobles conteos.

**Fases estimadas v11.4:** F1 80 %, F2 89 %, F3 87 %, F4 79 %, F5 61 %; promedio simple **79 %**. El CI y las pruebas reales de Android requieren comprobación independiente.

## v11.5 · Cronología SKU desplegable y control temporal

- En **Resultado final → Inventario → Cómo se conectan las áreas**, el usuario puede desplegar **Ver recepción, stock y pedidos por día**. Cada jornada muestra recepciones por SKU, inventario final, pedidos despachados, completos acumulados y pendientes. La cronología permanece plegada por defecto para reducir el desplazamiento en teléfonos.
- La prueba de abastecimiento urgente ahora compara **stock y recepciones completos contra la línea base** durante todos los días anteriores a la llegada de la compra. Antes solo comprobaba que las recepciones no fueran negativas, lo cual no detectaba recepciones anticipadas.
- Continúa pendiente conectar los resultados SKU al motor agregado de ocho áreas, sin sumar dos veces ventas o compras.

**Estado estimado v11.5:** F1 80 %, F2 89 %, F3 88 %, F4 81 %, F5 64 %. Promedio simple **80 %**. No equivale a QA certificada; GitHub Actions y pruebas en Android requieren verificación.

## v11.6 · Decide cuánto comprar para evitar sobrestock

La pantalla **Resultado final → Inventario** permite seleccionar **0, 25, 50, 75 o 100 % del faltante físico de cada SKU** para una compra urgente. El cálculo descuenta el inventario inicial y las compras originales, conserva el plazo de llegada y no anticipa ingresos en inventario. Los cuatro planes de recuperación se recalculan con el mismo porcentaje y muestran el intercambio entre stock, pedidos completos y desembolso incremental.

El flujo visible se ordenó para facilitar la toma de decisiones en móvil: primero configuración y alternativas, después resultado de Compras → Recepción → Inventario → Picking, con una explicación contextual **compra útil, tardía, innecesaria o sin mejora de servicio**. La traza por día sigue plegada por defecto. Se distingue la opción sin compra de una inexistencia real de faltante.

**Persistencia:** el porcentaje seleccionado se guarda en el navegador; al iniciar una campaña desde cero vuelve a 100 %. Una compra que llega fuera de los 12 días no debe mejorar los pedidos completos de la campaña.

**Límite importante:** el cálculo sigue siendo del laboratorio SKU de pedidos, mientras el motor principal de ocho áreas permanece agregado y no comparte aún un libro de eventos único. Sus ingresos y gastos **no deben sumarse**. La decisión reduce el riesgo de sobredimensionar compras, pero no equivale a un recomendador óptimo de reposición ni constituye una operación financiera real.

**Estado estimado v11.6:** F1 80 %, F2 89 %, F3 89 %, F4 83 %, F5 66 %. Promedio simple **81 %**. Los porcentajes son orientativos; el CI, las pruebas en Android y la integración de ambos motores deben verificarse independientemente.
