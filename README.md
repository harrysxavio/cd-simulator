# Supply Chain Operations Lab · v11.26

**Simulador educativo de operaciones, inventario, decisiones y costos para un centro de distribución ficticio.**

[▶ Abrir simulador](https://harrysxavio.github.io/cd-simulator/?release=11.26-r135) · [Código fuente](https://github.com/harrysxavio/cd-simulator)

> **Idea central:** mejorar un área de manera aislada no garantiza mejorar el servicio, la productividad ni la rentabilidad del negocio. El objetivo es experimentar, identificar restricciones y aprender a decidir con datos.

**Estado:** prototipo funcional en desarrollo, con datos sintéticos y modelos deterministas. **No es un WMS, ERP ni un optimizador listo para producción.** No requiere cuenta, backend ni instalación: funciona como aplicación estática en GitHub Pages.

## Base de escenarios de negocio y rediseño didáctico (histórico v11.16)

Se incorporó una batería reproducible de sobredemanda, sobredemanda con subcompra, compras extraordinarias a distintas fechas, restricciones físicas y sorpresa de demanda menor. **Esta sección describe el hito histórico de v11.16; la interfaz se modernizó en U1 (v11.17) y Recuperación (v11.18–v11.19).**

- [Escenarios de aceptación de negocio y cifras verificadas](docs/SCENARIO-BUSINESS-ACCEPTANCE.md).
- [Plan UX móvil, ejemplos de pantallas y criterios de aprendizaje](docs/UX-MOBILE-DIDACTIC-PLAN.md).
- **[Plan maestro vigente: 43 microfases verificables (00–42)](docs/EXECUTION-PLAN-43.md)**. Es la fuente de verdad para las siguientes sesiones y reemplaza el orden de ejecución del roadmap histórico.
- [Estado verificable actualizado de v11.26](docs/STATUS-V11.26.md).
- [Roadmap técnico histórico M1–M8/U0–U5](docs/ROADMAP.md).

**Avance v11.26 (M2-03):** las compras originales cuentan ahora con ID por SKU, cantidad, fecha prevista y costo inmutables. La misma orden queda auditada en planificación, cambio de demanda, recuperación y confirmación persistida, sin generar compras retroactivas. Las compras urgentes conservan identidades independientes. [Estado y limitaciones](docs/STATUS-V11.26.md).

**Base incremental v11.25 (M2-02):** planificación, recuperación y vistas de ocho áreas reutilizan la misma apertura de stock físico SKU validada. La reserva es una partición interna de esa apertura; nunca se suma. El stock agregado de una jornada continúa separado. [Evidencia de cierre y límites](docs/STATUS-V11.25.md).

**Base v11.23 (M2/M3):** la misión Diagnóstico muestra demanda, despachos y pendientes como **pedidos completos de la misma cohorte SKU reconciliada** que Resultados → Resumen y Áreas. No suma las unidades de la jornada agregada. La posible restricción se señala como **hipótesis del motor agregado**, todavía no como una causa SKU comprobada. Los 3 indicadores permanecen en formato compacto. Se corrigió además la versión estática visible en la cabecera.

**Prioridad v11.24 y siguientes:** primero contrato de unidades/horizontes (M2-01), después completar convergencia M2/M3 (pedido y stock común), después U2c/U3 con compromisos de servicio y M4 contabilidad única. El historial de versiones y porcentajes orientativos más abajo describe estados pasados; consultar el roadmap para las deudas actuales.

## v11.17 · U1 misión de Diagnóstico para gerente de CD

El diagnóstico ahora es una misión de gerencia **mobile-first**: primero presenta demanda, unidades expedibles y brecha; después identifica **una señal operativa prioritaria con explicación** y ofrece alternativas razonables según el escenario. Cada elección se contextualiza sin perder el análisis técnico:

- **Escenarios:** sobredemanda por faltante de abastecimiento, limitación de Recepción/Calidad/Inventario/Picking/Transporte, cobertura normal o sorpresa a la baja. Son **señales del modelo** basadas en restricciones, no causas raíz verificadas.
- **Claridad móvil:** cifras esenciales, tarjetas breves, botones grandes; ocho áreas, fórmulas y KPI completos en «Ver indicadores y explicación técnica». Los controles para probar otro shock están en otro panel desplegable.
- **Gamificación profesional:** misión 2 de 4, narrativa de dirección de CD, problema central y consecuencias. No se usan puntos arbitrarios ni se ocultan riesgos de negocio.
- **Acciones existentes:** «Explorar decisiones de recuperación» enfoca el área relevante; cuando falta abastecimiento, «Explorar compra urgente en laboratorio SKU» abre **otro modelo** con horizonte de doce días y explica esa limitación. Ningún botón finge aplicar una nueva compra al motor de una jornada.
- **Historial seguro:** se conserva el botón global de reinicio y el plan original cerrado tras revelar demanda. La pantalla técnica no se elimina.

U1 **no cambia las ecuaciones del motor agregado ni la economía**. U2/U3 integrarán eventos de compras nuevas con los movimientos físicos y una decisión previa al resultado final. [Criterios funcionales](docs/SCENARIO-BUSINESS-ACCEPTANCE.md) · [Plan incremental UX](docs/UX-MOBILE-DIDACTIC-PLAN.md).

## v11.18 · U2a: decisión extraordinaria con trazabilidad física SKU

Se implementa el primer segmento operativo de U2: desde **Recuperación / misión 3 de 4**, el gerente revisa existencias iniciales por SKU y la compra original congelada, compara **esperar** frente a **solicitar una compra extraordinaria**, configura la cobertura de faltantes y el día supuesto de arribo, ve cuántos pedidos completos se recuperan, y **confirma** la alternativa solo después de revisar el impacto.

- El botón de confirmar genera una decisión SKU persistida, asociada al ID de campaña y a la configuración exacta del escenario. Registra órdenes de compra adicionales con IDs trazables hacia el mismo libro de recepción y Calidad, SKU, unidades, costo estándar, recargo y día de arribo supuesto; no duplica la orden al recargar.
- La compra original **no se edita ni se reemite** tras conocer la demanda. Las unidades recién compradas solo pueden entrar a Picking cuando efectivamente se recepcionan y liberan por Calidad.
- Si la compra no ayuda o llega después del corte de 12 días, se advierte antes de confirmar. Confirmar no equivale a pagar ni a obtener compromiso de un proveedor real.
- La vista de Resultados SKU respeta la decisión confirmada, bloquea cambios que la reescribirían y conserva la conciliación física. Cambiar de escenario deja las decisiones anteriores como registro histórico; el botón global **Nueva campaña** elimina las decisiones de la campaña anterior tras confirmación.
- **Alcance explícito:** U2a opera dentro del laboratorio SKU de 12 días. No cambia la expedición agregada de una jornada ni integra aún la reserva de stock ni la planificación completa de promesas al cliente. U2b y U3 siguen abiertos.

## v11.19 · U2b: reserva ubicada y plan de salida por día

La tercera misión de gerencia permite asignar una **porción real del stock inicial** de los SKU a la ubicación lógica `RESERVA-CD`. Esa cantidad se descuenta de lo disponible para Picking, y solo puede habilitarse mediante un traslado trazado en el día seleccionado (`RESERVA-CD → PICK-FACE`). **No se crean unidades, ni compras, ni recepciones ficticias.**

- Tres decisiones: **esperar**, **compra extraordinaria** y **habilitar la reserva interna**. Se muestran el stock inicial, el stock localizado en reserva, el día de traslado, los pedidos recuperados y el saldo pendiente.
- Confirmación segura de traslado y conservación por SKU, valor estándar y cada etapa del circuito Recepción/Calidad/Inventario/Picking/Transporte; compras originales congeladas.
- **Proyección diaria de despachos completos y pendientes**, sin llamar a esas fechas una promesa comercial ni una entrega real al cliente.
- La reserva está localizada en una **zona hipotética del modelo**, todavía no en una ubicación WMS/lote verificada; el movimiento no tiene costo adicional de mano de obra modelado. No fusiona los 12 días SKU con el motor agregado de una jornada.
- Tests del traslado, imposibilidad de crear más stock del catálogo, restricciones y recuperación tardía; E2E móvil/escritorio y continuidad con versiones guardadas.

**Estado completo de fases y siguientes prioridades:** [M1–M8 y U0–U5](docs/STATUS-V11.19.md).

## v11.20 · M2/M3: las ocho áreas leen el mismo libro SKU

En **Resultados → Áreas** hay una nueva vista didáctica de la campaña de 12 días. Presenta primero **pedidos reales / expedidos del CD / pendientes** y luego ocho tarjetas profesionales y plegables para **Comercial, Planificación, Compras, Recepción, Calidad, Inventario, Picking y Transporte**. Cada cifra de estas tarjetas proviene de **una sola simulación de eventos SKU previamente conciliada**, no de ocho cálculos independientes.

- Las tarjetas detallan el pronóstico y compra original congelados, ingresos reales a Recepción, liberaciones por lote, movimientos de reserva, inventario verificable y pedidos completos.
- Se conserva la identidad de unidades: **SKU físico ≠ pedido completo ≠ unidad equivalente del motor agregado**. La vista SKU no se suma a la jornada agregada ni se atribuyen falsamente entregas al cliente.
- **Picking y Transporte siguen compartiendo un evento de expedición**; sin cola de preparado/cargado por separado. Es deuda M3, no una operación fingida.
- Los eventos día a día quedan bajo «Ver los movimientos diarios» y el detalle técnico de cada área permanece disponible a petición.

El código valida pedidos, stocks, transferencias y envíos contra el snapshot compartido y no muestra lecturas inconciliables. [Estado de M1–M8 y U0–U5](docs/STATUS-V11.20.md) · [Roadmap](docs/ROADMAP.md).

## v11.21 · Corrección visible de GitHub Pages + avance real en M2/M3

**Problema reportado:** el usuario seguía viendo el encabezado **V11.19** pese a haber desplegado **V11.20**. GitHub registraba el HTML `V11.20` en `main` y el despliegue de ese commit como exitoso; eso **no acredita** qué HTML estaba recibiendo cada teléfono o caché.

Se añadieron controles verificables:

- **Encabezado con versión visible V11.21**, botón **«Verificar actualización»** que consulta `release.json` con `Cache-Control: no-cache`, `cache: no-store` y query único; enlaces de apertura forzada con revisión de caché.
- `release.json` pública con versión y revisión de recursos. La comprobación detecta si el servidor indica una versión anterior o posterior a la cargada.
- Workflow independiente `Live GitHub Pages release verification` que consulta **el HTML realmente servido en https://harrysxavio.github.io/cd-simulator/** y confirma cabecera, HTML, manifiesto, JavaScript y número de asset con reintentos posteriores al push de `main`. **GitHub Pages success** por sí solo ya no se utiliza como evidencia suficiente del contenido visible.
- E2E Chromium en teléfono emulado comprueba versión, botones táctiles, aviso de actualización, ausencia de overflow y persistencia.

**M2/M3:** el Resumen de Resultados ahora prioriza **pedidos reales / pedidos completos expedidos / pedidos pendientes** desde el **mismo registro físico SKU de doce días** que alimenta las ocho áreas. El modelo anterior, de una jornada en unidades agregadas, queda dentro de un panel plegable y rotulado **no sumable**. Es un paso efectivo de migración del resultado físico, no la unificación completa de eventos y economía.

**Abrir la versión sin depender de la URL antigua:** [Simulador v11.21](https://harrysxavio.github.io/cd-simulator/?release=11.21-r130). Si una pestaña antigua está abierta, usar ese enlace en una pestaña nueva y seleccionar «Verificar actualización». Un servidor o caché que responda con HTML anterior se detectará en la nueva prueba en vivo.

## v11.22 · Experiencia móvil guiada, menos texto y decisiones más claras

Rediseño de jerarquía **a partir de capturas reales Android**: la barra superior de reinicio y navegación deja de cubrir textos durante el desplazamiento móvil; diagnósticos y decisiones dejan de duplicar grandes tarjetas con unidades y explicaciones repetidas.

- **Planificación:** objetivo de cada área, elección, resultado breve «Llegan X → siguen Y» y próximo paso. Datos de capacidad/por qué bajo detalle opcional.
- **Diagnóstico:** tres indicadores de una sola línea, problema prioritario y acción gerencial; las causas extendidas, otras alternativas y límites técnicos pasan a capas expandibles.
- **Recuperación:** «¿Con qué contamos?» → «¿Qué harás?» → «¿Qué cambia?». Stock por SKU y orden original siguen consultables; porcentaje de reserva aparece **solo al elegir esa acción**; las cifras Antes/Con tu opción/Recuperas ocupan una fila compacta.
- **Plan diario:** los días en que hay despachos y movimientos físicos aparecen primero; días sin movimiento bajo «Ver también días sin despachos». El contenido explica para qué sirve el calendario. **El registro físico completo y la posibilidad de auditarlo permanecen intactos**.
- Versión visible y verificable mediante la URL pública y manifiesto, con asset revision 131.

**Sin cambios físicos o económicos en el motor.** Los órdenes originales, traslados, compras urgentes y conciliaciones permanecen deterministas. [Detalle de las observaciones, decisiones de diseño y criterios](docs/UX-GUIDED-PHONE-V11.22.md). U5 continúa parcial: aún requiere prueba de usuario real Android/TalkBack.

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

**Límites:** cohorte fija de pedidos generada el día 0; no hay pedidos nuevos diarios, cancelaciones ni reservas por cliente. Los pedidos bloqueados pueden saltarse. La llegada al centro no equivale a recepción: el ingreso está limitado por capacidad y Calidad puede retener unidades. El día de llegada urgente es configurable, y puede quedar fuera del horizonte. Son hipótesis pedagógicas, no compromisos de proveedores reales.

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

Existe un workflow de GitHub Actions en `.github/workflows/model-tests.yml`. **La integración anterior v11.9 verificó GitHub Actions y 118 pruebas de regresión en el PR #5; v11.10 requiere validación propia.** Se han realizado comprobaciones de integración con DOM simulado, que no sustituyen pruebas reales de navegador, Android, accesibilidad ni experiencia de usuarios.

## Roadmap activo · v11.15

**[Consultar plan completo de cierre (hitos M1–M8)](docs/ROADMAP.md)**. Los valores mostrados son estimaciones de las funciones existentes, no porcentajes de esfuerzo restante.

| Fase | Referencia actual | Pendiente principal |
| --- | ---: | --- |
| 1. Motor operacional y económico | 85 % | Unificación del libro físico y financiero |
| 2. Demanda sorpresa y recuperación | 89 % | Recuperación desde un único evento de campaña |
| 3. SKU, inventario y abastecimiento | 94 % del laboratorio SKU | Sustituir el motor agregado paralelo, no sumar inventarios |
| 4. UX y aprendizaje guiado | 86 % | Tutoriales, accesibilidad y validación móvil real |
| 5. QA, documentación y portafolio | 76 % | Prueba E2E real, accesibilidad y cierre documental |

**v11.11:** Se incorpora un flujo real de Chromium E2E (escritorio y teléfono emulado) que recorre planificación, sorpresa, recuperación, resultados, SKU, persistencia, exportación y reinicio; GitHub Actions lo ejecuta como verificación independiente. Se publicarán los resultados de CI de la versión antes de declararla validada en producción. La emulación de dispositivo no reemplaza QA en Android real.

## v10.6 · Auditoría trazable del laboratorio SKU

Se incorporó `src/audit.js` y una sección de conciliación visible después de revelar la sorpresa de demanda. Para cada SKU se verifica:

```text
Stock inicial + unidades recibidas = unidades despachadas + stock final
```

El costo valorizado de las existencias se concilia con la misma identidad, usando el costo ilustrativo de cada SKU. También se verifica que los pedidos solicitados sean iguales a los completados más los pendientes, que el total de despachos diarios concuerde con los pedidos completos y que los cálculos económicos incrementales reconcilien aritméticamente. La auditoría utiliza el mismo resultado de eventos diarios que genera la operación SKU: **no se suman resultados de motores independientes**.

Se añadieron `tests/audit.test.mjs` y se comprobaron 36 combinaciones de política de inventario, intervención y sorpresa mediante evaluación JavaScript del modelo; las 36 conciliaron. Esta comprobación **no equivale a ejecutar la suite completa Node ni a QA de navegador real**.

**Límite relevante:** es una auditoría interna del motor SKU y sus supuestos, **no la unificación con el motor agregado principal**. La consolidación operacional y financiera sigue pendiente, así como validar CI y Android.

## v11.10 · Conciliación de compras y recepción SKU

El nuevo libro de compras SKU distingue órdenes comprometidas (que **no son pagos**), cumplimiento efectivo del proveedor, compras que todavía no llegan, unidades arribadas pero retenidas en cola de Recepción, unidades pendientes de Calidad, costo de inventario disponible y costo estándar de mercancía despachada. No inventa inventario en tránsito ni capitaliza el recargo urgente.

La trazabilidad de Recepción y Compras se calcula desde los mismos eventos diarios que generan el despacho; la auditoría valida identidades por SKU y valor, incluyendo compras tardías, cumplimiento parcial, restricciones de capacidad y retención de Calidad. **Estos movimientos corresponden exclusivamente al laboratorio SKU**; el motor agregado sigue mostrando una campaña hipotética distinta y todavía no se deben sumar ambas contabilidades.

La consolidación económica entre motores necesita primero unificar horizonte temporal, cantidades físicas, precios unitarios y costos. Un reporte que simplemente sumase los dos motores sería incorrecto.

## v11.12 · Registro canónico de campaña SKU (primer incremento M2)

- Los pedidos simulados tienen identificador estable y referencias a la lista de materiales de su tipo.
- Cada movimiento de recepción enlaza la orden de compra original o urgente, la fecha física de ingreso y el lote de Calidad.
- La liberación de Calidad y el despacho registran eventos individuales, sin alterar los totales diarios del modelo.
- `src/campaign.js` construye una instantánea inmutable de **una sola ejecución** con `campaignId`, `orders`, `purchaseOrders`, `receipts`, `qualityLots`, `qualityReleases`, `inventoryMovements`, `shipments` y `dailyEvents`. Audita identidades de pedidos, compras y existencias.
- La vista de trazabilidad SKU incorpora un resumen de órdenes y eventos identificables.

**Alcance declarado:** la nueva estructura es una proyección canónica del motor SKU, no la unificación completa de los dos motores. M2 sigue parcialmente abierto: faltan contrato de escenario único, migración de decisiones persistidas y soporte ampliado de eventos/demandas de la campaña agregada. M3–M4 permanecen pendientes. La regresión Node y Chromium se verifican por PR.

## v11.13 · Contrato único de decisiones y cohorte SKU (incremento M2)

- `src/campaign-contract.js` transforma las decisiones de las ocho áreas en un único contrato inmutable con pronóstico comercial, cobertura de compras, porcentaje de entrega de proveedor, tasa de liberación de Calidad y capacidades de Recepción, Picking y Transporte.
- La sorpresa de demanda modifica el tamaño de la **muestra SKU**, pero no la compra original congelada. La muestra continúa siendo de 200 pedidos planificados, representativos solo para el ejercicio; las unidades agregadas de la campaña no equivalen a pedidos o unidades SKU.
- El identificador `campaignId` persiste en el navegador mediante el formato anterior de almacenamiento, compatible con partidas ya guardadas. Una nueva campaña genera otra identidad.
- La vista SKU reutiliza una misma ejecución seleccionada para el informe canónico, la auditoría de inventario y el comparador. Se evita repetir cálculos redundantes.
- Se añade una advertencia visible: el inventario del catálogo SKU aún no deriva del stock agregado configurable. Los costos de los dos motores siguen separados.

**Pendiente de M2:** origen físico único de stock y pedidos para las ocho áreas, migración completa del modelo agregado y prueba de escenarios de campaña conjunta. M3 (motor común) y M4 (economía unificada) siguen sin completarse. No sumar magnitudes de motores diferentes.

## v11.14 · Reinicio global y auditoría de navegación y estado

- Los controles **Ver operación** y **↺ Nueva campaña** permanecen disponibles en todas las etapas, incluida Configuración, Diagnóstico, Recuperación y el Dashboard. El botón de nueva campaña pide confirmación y reinicia decisiones, ajustes, sorpresa, recuperación, ID y vista activa.
- La pestaña Operación vuelve a abrirse después de revelar demanda. En ese caso las decisiones históricas y cantidades editables quedan **en modo de solo lectura**, para impedir cambios retroactivos en compras congeladas. Los indicadores de la misión siguen mostrando los datos de demanda y recuperación del escenario actual.
- La sesión guardada registra la pantalla activa (`currentSection`) y la restaura tras recargar o actualizar la página. Las sesiones anteriores que no tenían ese campo se migran a una pantalla válida, sin eliminar sus decisiones.
- Los campos numéricos de planificación y recuperación ahora incluyen etiquetas accesibles.
- La batería de auditoría incorpora combinaciones de escenarios económicos, campañas SKU, restricciones físicas, controles y recuperación de sesiones anteriores. El detalle y las limitaciones están en **[docs/AUDIT-V11.14.md](docs/AUDIT-V11.14.md)**.
- Se mantiene la distinción entre el simulador agregado de una jornada y la cohorte SKU; sus contabilidades siguen separadas.

## v11.15 · Exactitud de Inventario con conservación física SKU (M3 incremental)

- El valor de **exactitud de Inventario** seleccionado en las ocho áreas ahora limita realmente las unidades que el laboratorio SKU puede prometer a Picking (`inventoryAccuracyPercent`).
- El motor mantiene separadas **unidades físicas en almacén**, **unidades verificables para picking** y **unidades no verificables**, además de **unidades retenidas por Calidad**. La falta de confiabilidad nunca elimina stock físico, no es merma y mantiene su valor estándar.
- La cantidad verificable se calcula sobre existencias libres tras la liberación de Calidad al inicio de cada día. Al preparar un pedido se descuenta de la cantidad verificable y del stock físico; las existencias no verificables se recalculan diariamente, **sin suponer que hubo un conteo o un ajuste real de stock**.
- Trazabilidad, reabastecimiento, recuperación, auditoría financiera SKU y snapshot inmutable usan los mismos saldos; se prueba la identidad `físico = verificable + no verificable`.
- **Límite explícito:** la acción "Habilitar stock de reserva" del motor agregado no suma unidades al catálogo SKU. Aún no existe un modelo físico único de stock inicial ni libro contable global. Los motores no deben sumarse.

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

## v11.7 · Primera integración real de capacidades entre motores

**Hasta v11.6**, una campaña podía tener cero operarios de recepción y, aun así, el laboratorio SKU mostraba todos los pedidos de proveedor automáticamente recibidos. Esta versión corrige ese desacople operacional:

- El laboratorio SKU ahora lee la capacidad diaria de **Recepción, Picking y Transporte** directamente de las decisiones, acciones y dotación del flujo principal de ocho áreas.
- Las entregas ordinarias y urgentes **esperan recepción física** cuando la capacidad del área es insuficiente. Nunca se incorporan al inventario anticipadamente.
- Picking y Transporte limitan el **número de unidades SKU físicas** de pedidos completos despachados cada día. Una orden de cuatro unidades consume cuatro unidades de capacidad, no una.
- El reporte de Compras → Recepción → Inventario → Picking indica las capacidades compartidas, las unidades aún por recibir y el gasto de compras que no produjo mejora de servicio.
- La auditoría SKU recibe **los mismos parámetros de recuperación, cobertura, fecha y capacidad** que el comparador visible, evitando dos conciliaciones de escenarios distintos.
- Se añaden pruebas de regresión de cero capacidad, restricciones diarias, conservación de stock, fechas de recepción y propagación de cuellos de botella.

**Alcance actual de la integración:** la cohorte SKU mantiene 200 pedidos planificados e interpreta el shock como variación proporcional de pedidos; las capacidades importadas son unidades SKU/día. Calidad, pronóstico, proveedores y contabilidad todavía no están unificados en un único libro de eventos. Los resultados monetarios de ambos motores se presentan por separado para no contar compras o ventas dos veces. La simulación no representa inventario en preparación entre Picking y Transporte: cada pedido se prepara y expide como una transacción indivisible.

**Fases estimadas v11.7:** F1 83 %, F2 89 %, F3 91 %, F4 84 %, F5 69 %; promedio simple **83 %**. La integración física de 3 áreas no significa que las 8 áreas y la contabilidad estén terminadas. Antes de declararla estable, GitHub Actions debe terminar en verde y corresponde hacer una revisión visual real en Android.

## v11.8 · Proveedores y Calidad conectados al flujo SKU

La simulación de órdenes SKU incorpora dos restricciones más de la campaña principal:

1. **Compras:** el porcentaje efectivo de unidades entregadas por el proveedor según la decisión de Compras se aplica a los SKU ordinarios de la compra planificada. La parte que el proveedor no entrega se registra como faltante de proveedor, no como stock ni como recepción futura ficticia. Las compras urgentes utilizan su propio supuesto de entrega y plazo.
2. **Calidad:** todas las unidades efectivamente recibidas pasan al estado *retenido en Calidad* y solo la fracción autorizada por el porcentaje de liberación de la campaña se vuelve disponible para Picking. El remanente se revisa en las jornadas siguientes; es espera de liberación, no rechazo ni merma. La retención de stock ahora aparece en la traza diaria y en la auditoría en unidades y CLP.

**Balance de unidades por SKU**: inventario inicial + recepciones reales = unidades expedidas + stock disponible final + stock retenido en Calidad. Este invariante se comprueba con pruebas nuevas. Compras, Recepción, Calidad, Inventario, Picking y Transporte ya comparten parámetros en el libro diario de eventos del laboratorio SKU.

**UX móvil:** los ejercicios teóricos de cobertura, ABC, política de inventario y fechas hipotéticas quedaron bajo una sección plegada de *modelos complementarios*, para separar con claridad cálculos ilustrativos aislados de resultados operacionales efectivos. La sección principal sigue mostrando los impactos y el registro por día.

**Límites pendientes**: las decisiones agregadas de forecast/planeación aún no producen el manifiesto exacto de compras SKU. La capacidad de Inventario, disponibilidad confiable y el costo agregado tampoco provienen de un único libro transaccional; los resultados económicos del laboratorio SKU no deben sumarse a los de la campaña agregada. La simulación de Calidad es una tasa de liberación diaria, no una tasa de defectos.

**Estado estimado v11.8:** motor operacional/económico 85 %, demanda/recuperación 89 %, SKU/compras/inventario 93 %, UX y aprendizaje 86 %, QA/documentación 72 %. Promedio simple **85 %**, orientativo y pendiente de validación de interfaz en Android.

## v11.9 · Comercial y Planeación fijan la compra SKU original

Las decisiones tomadas en **Comercial** y **Planeación** ya modifican la compra original del laboratorio SKU. La lógica es explícita y auditable:

1. Comercial determina el pronóstico SKU para la cohorte de referencia: **pedidos pronosticados = redondeo(200 × forecast %)**.
2. La política de inventario calcula objetivos SKU usando esos pedidos pronosticados, inventario inicial y cobertura en días.
3. Planeación solicita una fracción de cada necesidad: **compra comprometida por SKU = techo(necesidad propuesta × cobertura de Planeación %)**.
4. El valor de la orden se calcula exclusivamente desde esas unidades comprometidas y su costo por SKU.
5. Cuando aparece la demanda sorpresa, el manifiesto original se mantiene **congelado**; Compras determina cuánto entrega efectivamente el proveedor, Recepción aplica capacidad, Calidad libera, y Picking/Transporte respetan sus límites.
6. Si el proveedor entrega menos que la orden comprometida, la compra urgente calcula el faltante físico respecto de las **unidades realmente entregadas**, no frente a existencias imaginarias por órdenes incumplidas.

**Ejemplo verificable del laboratorio (política de servicio, 200 pedidos planificados):** con pronóstico y cobertura al 100 %, la orden inicial es A 160, B 17, C 29 unidades (CLP 530.900). Con pronóstico al 80 % y cobertura al 60 %, es A 60, B 0, C 8 (CLP 160.000). Son escenarios comparativos, no compras reales.

Se amplían pruebas de regresión para detectar cambios indebidos en el manifiesto tras la sorpresa, proveedores que no entregan, compatibilidad del escenario base y conciliación con auditoría SKU.

**Límites:** el plan SKU sigue usando una cohorte didáctica proporcional de 200 pedidos, no la escala directa de 1000 unidades del modelo agregado. Aún falta compartir el control de accesibilidad del inventario, reservas, y el libro contable/económico único. Los montos del laboratorio no se suman a los del reporte financiero de la campaña.

**Estado orientativo:** fase 1 motor/economía 86 %, fase 2 sorpresa/recuperación 90 %, fase 3 SKU/compras 95 %, fase 4 UX móvil 87 %, fase 5 QA/documentación 74 %. Promedio simple **86 %**. Estos porcentajes son estimaciones funcionales, no verificación de producción. Validar en GitHub Actions y en un Android real.
