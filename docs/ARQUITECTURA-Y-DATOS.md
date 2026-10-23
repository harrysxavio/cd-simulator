# Arquitectura técnica, trazabilidad y modelo de datos

**Referencia:** v11.68 r177 · **Proyecto:** Supply Chain Operations Lab · **Tipo:** aplicación educativa estática, sin servidor de negocio ni conexión a WMS/ERP.

## 1. Arquitectura en una frase

El navegador ejecuta código JavaScript modular que toma parámetros y decisiones ficticias, construye una **campaña física SKU auditable** y muestra sus proyecciones por área. El código conserva además un **motor agregado de una jornada** para ejemplos históricos de capacidades y costos: **son dos alcances y no una contabilidad única**.

## 2. Diagrama de arquitectura

~~~mermaid
flowchart TD
    A[Interfaz web: index.html y app.js] --> B[Configuración y decisiones de campaña]
    B --> C[Contrato de campaña SKU: campaign-contract.js]
    C --> D[Sesión/caché: sku-session.js]
    D --> E[Baseline inmutable: recovery-baseline.js]
    E --> F[Simulación diaria: events.js y recovery.js]
    F --> G[Eventos SKU y auditoría: campaign.js]
    G --> H[Recepción, Calidad, Inventario, Picking y Transporte]
    G --> I[Valorización, compras y contribución parcial]
    H --> J[Proyección de ocho áreas: area-ledger.js]
    I --> K[Resultados SKU y recuperación explicable]
    J --> K
    B --> L[Motor de una jornada: flow.js]
    L --> M[Costos agregados: scenario.js y KPI]
    K --> N[Interfaz, diagnóstico, resultados y aprendizaje]
    M --> N
    O[localStorage: session-state.js] <--> B
~~~

**La flecha hacia el motor agregado no implica mezcla:** sus cifras se presentan rotuladas y no deben sumarse a pedidos físicos SKU ni a la contribución monetaria parcial SKU.

## 3. Recorrido de los datos

### 3.1 Entrada de decisiones

**index.html** presenta Configuración, Operación, Diagnóstico, Recuperación y Resultado. **src/app.js** contiene el estado de la sesión y gestiona navegación, elecciones, visualizaciones, control de foco y guardar/reiniciar.

Las ocho decisiones se basan en **src/engine.js**. Los supuestos de demanda, dotación, costos y productividad agregada están definidos y normalizados en **src/scenario.js**. La sorpresa se aplica después de planificar; las compras originales SKU se congelan respecto de ese punto.

### 3.2 Campaña física de pedidos completos

El modelo SKU usa tres productos del catálogo y cuatro plantillas de órdenes con distintas cantidades físicas:

| SKU | Perfil | Stock inicial ficticio | Lead time catálogo |
|---|---|---:|---:|
| A | Alta rotación | 150 unidades | 2 días |
| B | Media rotación | 90 unidades | 5 días |
| C | Baja rotación | 55 unidades | 10 días |

Plantillas representativas: básico (2 A), combinado (1 A + 1 B), especial (1 A + 1 C) y mixto (2 A + 1 B + 1 C). Un pedido únicamente se considera completo cuando se disponen todas las líneas y puede prepararse y expedirse con las restricciones configuradas.

El contrato conecta forecast y cobertura de Planificación con el manifiesto original por SKU. Una recuperación crea eventos posteriores independientes de la compra original; la reserva ubicada es solo una partición y traslado del stock físico inicial.

### 3.3 Procesamiento de eventos

~~~mermaid
flowchart LR
    A[Pronóstico y PO original] --> B[Proveedor y llegada al muelle]
    B --> C{Capacidad de Recepción}
    C -->|Hay cupo| D[Recepción física por SKU y lote]
    C -->|Sin cupo| Q[Cola de recepción]
    Q --> C
    D --> E{Liberación de Calidad}
    E -->|Retenido| F[Stock en espera de Calidad]
    F --> E
    E -->|Liberado| G[Stock disponible/identificable]
    R[Stock inicial] --> G
    S[RESERVA-CD] -->|Traslado fechado| G
    G --> H{BOM completo y capacidad de Picking}
    H -->|Sí| I[Pedido preparado]
    H -->|No| P[Pedido pendiente]
    I --> J{Capacidad de Transporte}
    J -->|Sí| K[Expedido desde el CD]
    J -->|No, modo staging| T[STAGING-CD]
    T --> J
~~~

- Los días son **índices de campaña**, generalmente 0 a 12; no representan una promesa logística al destinatario.
- El proveedor puede entregar parcialmente; las unidades no recibidas no se incorporan al inventario.
- Calidad retiene o libera: la retención no equivale automáticamente a rechazo, merma o daño.
- El stock no verificable sigue siendo físico, pero no se usa para preparar hasta que corresponda.
- El modo staging permite que Picking y Transporte tengan eventos independientes. Cuando se usa el modo histórico acoplado, no debe inventarse una espera intermedia.
- Una PO urgente con llegada día 13 no puede mejorar resultados dentro de los 12 días.

### 3.4 Libros y lecturas derivadas

| Módulo | Responsabilidad |
|---|---|
| src/campaign-contract.js | Traduce decisiones/escenario en parámetros de cohorte SKU |
| src/original-purchase.js | Compras originales identificables e inmutables |
| src/recovery-baseline.js | Estado previo a intervenciones compartido por alternativas |
| src/recovery.js | Compara espera, reserva, refuerzo, compra urgente y combinación |
| src/events.js | Cronología determinista de pedidos, recepciones, lotes y despachos |
| src/campaign.js | Snapshot canónico y conciliación de pedidos, SKU y eventos |
| src/supplier-ledger.js | PO, cumplimiento proveedor y llegada |
| src/receiving-ledger.js / src/quality-ledger.js | Cola de ingreso, recepción y retención/liberación |
| src/inventory-ledger.js | Stock físico, verificable, reservado, retenido y staging |
| src/picking-ledger.js / src/staging-ledger.js | Preparación, colas y expedición separada |
| src/inventory-valuation.js | Balance y costo estándar de existencias físicas |
| src/sku-purchase-cost.js | Separación de compromiso de PO, stock recibido y supuestos |
| src/sku-operational-cost.js | Recursos de refuerzo aplicables y su costo modelado |
| src/sku-economics.js / src/sku-economic-audit.js | Contribución parcial y auditoría económica SKU |
| src/area-ledger.js | Lectura de ocho áreas desde la misma campaña física |
| src/sku-session.js | Caché LRU limitada y reutilización del mismo escenario |
| src/supply-bridge.js | Puente para presentación de flujos y auditoría |
| src/flow.js / src/scenario.js | Modelo agregado distinto, de una jornada |
| src/session-state.js | Serialización, validación y migración de sesión local |
| src/release-status.js | Compara versión pública, recurso y actualización segura |

## 4. Identidades y ecuaciones auditadas

**Identificadores:** campaña, órdenes completas, PO, lotes, movimientos, preparación y expedición; permiten una traza de origen en el escenario simulado. La pantalla puede presentar vistas simplificadas, pero la auditoría del motor comprueba consistencia.

**Dimensiones:** pedidos completos (count), unidades físicas de SKU (unidades A/B/C), días de campaña (día relativo), dinero (CLP de tarifas/supuestos) y unidades agregadas de jornada (modelo histórico).

**Invariantes:**

1. **Pedidos:** solicitados = completos expedidos + pendientes. Los preparados no expedidos siguen sin contar como salida.
2. **Stock por SKU:** apertura + recepciones = despachos + disponible final + retenido en Calidad + reserva + staging, según corresponda.
3. **Recepción temporal:** día de recepción ≥ día esperado de llegada de la PO correspondiente.
4. **Compras originales:** el manifiesto anterior a la sorpresa no cambia por elegir una recuperación.
5. **Valorización física CLP:** valor de apertura + valor recibido = costo estándar de SKU despachado + stock físico valorizado al cierre.
6. **Contribución parcial:** valor potencial de pedidos expedidos − costo estándar de material expedido − costo modelado de refuerzo aplicado. No es utilidad contable, ingreso cobrado ni EBITDA.
7. **Causalidad:** el resultado conjunto de dos intervenciones se recalcula; nunca es la suma automática de impactos aislados.

## 5. Persistencia y seguridad del navegador

- Clave local: **supply-lab-v90**, esquema vigente de sesión **v3**.
- Se permiten solamente parámetros, elecciones, campaña y decisiones confirmadas bajo validaciones de estructura y rangos; no se guarda el ledger completo como JSON de sesión.
- Las sesiones antiguas compatibles se migran; estados JSON corruptos o versiones desconocidas se rechazan y permiten reiniciar con estado seguro.
- Los resultados deterministas se reconstruyen después de recargar desde parámetros guardados. La caché SKU en memoria está acotada.
- El sitio no requiere credenciales ni base de datos corporativa. El guardado local **no es cifrado, sincronización, respaldo centralizado ni control de acceso empresarial**.
- No utilizar datos personales ni información corporativa real. El proyecto es demostrativo, no un sistema diseñado para almacenar datos sujetos a políticas de retención empresariales.

## 6. Calidad, pruebas y despliegue

Repositorio: https://github.com/harrysxavio/cd-simulator

### Pruebas

- Node 22 ejecuta pruebas deterministas con **node --experimental-default-type=module --test tests/*.test.mjs**.
- Chromium/Playwright ejecuta **tests/*.e2e.mjs** mediante un servidor HTTP local de archivos estáticos.
- El CI ejecuta las puertas **Model regression tests** y **Browser end-to-end smoke** en PR y rama main.
- GitHub Pages construye/publica los activos estáticos. **Live GitHub Pages release verification** inspecciona HTML, manifiesto y módulos HTTP servidos realmente.
- El test **tests/m8-integral-regression.test.mjs** contiene 8 perfiles × 5 opciones y extremos económicos/físicos; pruebas de navegador comprueban interfaz, recarga y errores de consola.
- El CI no mide tiempos reales de operario ni realiza integración con sistemas logísticos.

### Cambios y publicación

~~~mermaid
flowchart LR
    A[Cambio pequeño en rama] --> B[Contrato + prueba automática]
    B --> C[PR y revisión]
    C --> D{Node y E2E verdes}
    D -->|No| A
    D -->|Sí| E[Merge a main]
    E --> F[CI post-merge]
    F --> G[Pages]
    G --> H[Verificación HTTP pública]
    H --> I[Acta de fase y limitaciones]
~~~

Los cambios que afecten la aplicación publicada deben sincronizar **index.html**, importaciones versionadas de **src/app.js**, **src/release-status.js** y **release.json**. Un job de despliegue aprobado sin verificación de la respuesta HTTP pública no demuestra qué código ve el usuario.

## 7. Deudas y límites conscientes

- No hay WMS, ERP, TMS, autenticación, API, backend, telemetría real ni datos de clientes.
- El motor agregado y la cohorte SKU no son una única contabilidad de operación real: las métricas agregadas de Costos/Mejoras no deben sumarse a SKU.
- No modela de forma integral facturas, IVA, pagos efectivos, impuestos, mermas valorizadas reales, transporte externo, devoluciones ni entrega final al cliente.
- El orden de pedidos y los parámetros de proveedores/capacidades son simplificaciones docentes, no un optimizador comercial ni pronósticos calibrados.
- **M7-38 pendiente:** prueba en Android físico, TalkBack y comprensión del público objetivo. La emulación de Chromium no la sustituye.
- El hito histórico 00 del [plan maestro](EXECUTION-PLAN-43.md) requiere regularización documental de evidencia.
- La validación final de entrega estable es **M8-42**, no forma parte de esta documentación.

## 8. Dónde continuar

Para utilizar la aplicación: [guía](GUIA-USUARIO.md). Para probar escenarios: [ejercicios](ESCENARIOS-DE-APRENDIZAJE.md). Para interpretar indicadores: [glosario](GLOSARIO-Y-LIMITES.md). Para mantener y diagnosticar: [soporte](SOPORTE-Y-VERIFICACION.md).
