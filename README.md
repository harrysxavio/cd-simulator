# Supply Chain Operations Lab · v10.6

**Simulador educativo de operaciones, inventario, decisiones y costos para un centro de distribución ficticio.**

[▶ Abrir simulador](https://harrysxavio.github.io/cd-simulator/?v=106) · [Código fuente](https://github.com/harrysxavio/cd-simulator)

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

## Roadmap y estado estimado · v10.6

| Fase | Avance aproximado | Pendientes principales |
|---|---:|---|
| 1. Motor operacional y económico | 80 % | Auditoría y conciliación de casos extremos |
| 2. Demanda sorpresa y recuperación | 85 % | Escenarios reproducibles y cierre de validación |
| 3. SKU, inventario y abastecimiento | 82 % | Unificación física y económica con el motor principal |
| 4. UX y aprendizaje guiado | 50 % | Ejercicios progresivos, móvil y accesibilidad |
| 5. QA, documentación y portafolio | 55 % | CI verificado, regresiones reales y revisión visual |

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

## v10.7 · Corrección crítica de interfaz y controles (Android)

Un reporte con captura de pantalla de Android detectó que, aunque la navegación inicial se mostraba, los indicadores de diagnóstico y controles aparecían incompletos. **Causa confirmada en código:** `src/app.js` llamaba a `laborAudit(...)` durante `render()` pero no importaba la función desde `src/labor.js`. El navegador producía un `ReferenceError` y abandonaba el render antes de completar el diagnóstico, las tarjetas y los enlaces de botones. Se restauró la importación, se corrigió el título de alertas de estado positivo y se incrementó la versión de caché de módulos a `v=107`.

Se agregaron `tests/ui-contract.test.mjs` para detectar dependencias críticas omitidas, comprobar que los botones de navegación estén presentes y conectados y verificar consistencia de versión entre HTML e imports ES. **Prueba de integración con DOM simulado: 15/15 comprobaciones**, incluyendo KPI preliminares, personal, 4 controles SKU, 8 áreas, 3 estrategias, parámetros de escenario, diagnóstico, revelación de demanda, recuperación, navegación siguiente/anterior, resultado final y reinicio.

**Limitación de QA:** la ejecución anterior se realizó con un DOM simulado, no con Chrome real. El entorno de ejecución no pudo conectarse al sitio público para ejecutar una sesión automatizada de Android/Chromium. Por tanto, la corrección está confirmada por inspección de código y pruebas funcionales simuladas, pero **no se afirma que se haya verificado visualmente en el teléfono**. Si hay una versión anterior en caché, abrir el enlace con `?v=107` o actualizar la pestaña.

**Pendiente prioritario:** automatizar una prueba E2E real de navegador en GitHub Actions (por ejemplo, Playwright con Chromium móvil) que recorra planificación → diagnóstico → sorpresa → recuperación → resultado y falle si hay excepciones de JavaScript o elementos vacíos.
