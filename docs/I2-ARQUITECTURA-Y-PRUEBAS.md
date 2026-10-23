# Implementación 2 · Arquitectura, fuentes de verdad, tests y convenciones

**Objetivo:** añadir un cliente de aprendizaje guiado \`/juego/\` al sitio existente. No migrar ni duplicar el motor físico; mantener V1 íntegra, su URL, su sesión y su contrato de 12 días.

## 1. Arquitectura propuesta

~~~mermaid
flowchart TB
    P[GitHub Pages /cd-simulator/] --> V1[V1: index.html + src/app.js]
    P --> V2[I2: juego/index.html + game/app.js]
    V1 --> CORE[Motor compartido src: contracts, events, recovery, ledgers]
    V2 --> A[game/game-adapter.js]
    A --> CORE
    V1 --> V1STORE[localStorage supply-lab-v90]
    V2 --> V2STORE[localStorage supply-lab-i2-v1]
    V2 --> UX[game/scenes/* + game/ui/* + game/content/*]
    UX --> CTRL[GameController, reducer, state machine]
    CTRL --> A
    A --> SNAP[Snapshot inmutable con source + units + horizon]
    SNAP --> UX
~~~

Los dos frontends comparten funciones **puras** de simulación, no el estado mutable de \`src/app.js\`. Nunca importar \`src/app.js\` desde el juego porque inicializa UI V1 y eventos de documento.

### Rutas y estructura objetivo

~~~text
cd-simulator/
  index.html                         # V1 actual, sin reemplazo
  src/                               # motor y V1, tal como hoy
  juego/
    index.html                       # ruta estática real, navegable/reload
  game/
    app.js                           # bootstrap + vista actual
    game-adapter.js                  # calls to shared core, versioned inputs
    campaign-state.js               # reducer/state machine, no DOM
    storage.js                      # localStorage separado, migración
    lesson-catalog.js               # 8 áreas, KPI, opciones, microcopy
    scenarios.js                    # seeds, plantillas, retos
    scoring.js                      # insignias justificadas, no profit falso
    ui/
      shell.js                       # cabecera, contenido único, footer
      decision-card.js              # opciones tactiles accesibles
      info-sheet.js                  # modal/hoja, focus trap y regreso
      guide-character.js             # accesibilidad y silencio
      progress.js                    # 4 macro etapas / 8 áreas
      kpi-inline.js                  # max 2 KPI visibles
    scenes/
      welcome.js
      setup.js
      briefing.js
      area.js
      surprise.js
      diagnosis.js
      recovery.js
      results.js
      reflection.js
    styles/
      tokens.css
      base.css
      shell.css
      components.css
  tests/
    game-*.test.mjs
    browser-game-*.e2e.mjs
  docs/
    I2-PLAN-MAESTRO.md
    I2-AUDITORIA-BASE-V11.68.md
    I2-EXPERIENCIA-MOVIL.md
    I2-ARQUITECTURA-Y-PRUEBAS.md
    I2-STATUS.md
~~~

Este árbol es un **objetivo**, no una lista de archivos existentes hoy. Evitar construirlo de golpe: cada microfase crea solamente los módulos requeridos.

## 2. Contratos de escenario y decisión

~~~js
// Contratos propuestos: implementar y probar en I2-01/I2-04,
// no asumir que estas estructuras ya existen en V1.
const GameCampaignConfig = {
  schemaVersion: 1,
  mode: 'guided',
  campaignId: 'CD-...',
  scenarioSeed: 'underforecast-01',
  teachingLevel: 'beginner',
  guidanceEnabled: true,
  gameOptions: {strategy:'balanced'},
  scope: 'sku-cohort',
  horizonDays: 12
};

const AreaDecision = {
  areaId: 'commercial',
  choiceId: 'under',
  status: 'confirmed',
  confirmedAtStep: 1,
  source: 'game-user-action',
  // No se guarda una orden de compra arbitraria aquí:
  // se deriva de contrato de campaña canónico cuando corresponde.
};

const GameViewSnapshot = {
  campaignId: 'CD-...',
  scope: 'sku-cohort',
  horizonDays: 12,
  unit: 'complete-orders',
  inputSignature: '...',
  plannedOrders: 200,
  actualOrders: null, // intencionalmente oculto hasta reveal
  shippedOrders: null,
  pendingOrders: null,
  source: 'campaignAreaReadModel',
  limitations: []
};
~~~

**Reglas:** \`null\` no significa cero; las unidades físicas A/B/C son distintas de pedidos; la sorpresa y su signo no pueden aparecer en ViewSnapshot visible antes del evento reveal. La compra original no se reescribe tras el shock; los refuerzos, traslados y PO urgentes son eventos adicionales.

La capa \`game-adapter\` recibe el estado y entrega **una proyección inmutable** con \`scope\`, \`source\`, \`days\`, \`unit\`, \`warnings\`. Reutilizar en este orden V1: \`campaignSkuContract\`, \`createSkuSessionCache\`, \`recoveryComparison\`, \`campaignAreaReadModel\`, \`sku-economics\` y \`skuEconomicAudit\` según corresponda. Si la importación actual no es pura o exige DOM, extraer una función pura pequeña mediante un PR con regresión, no copiar el algoritmo.

## 3. Máquina de estados de juego

~~~mermaid
stateDiagram-v2
    [*] --> welcome
    welcome --> setup
    setup --> briefing
    briefing --> areaUnderstand
    areaUnderstand --> areaChoose
    areaChoose --> areaImpact: Solicitar contexto (opcional)
    areaImpact --> areaChoose: Cerrar explicación
    areaChoose --> areaUnderstand: Confirmar y pasar a siguiente área
    areaChoose --> surpriseReady: Confirmar Transporte
    surpriseReady --> diagnosis: Revelar explícitamente
    diagnosis --> recovery
    recovery --> recoveryPreview
    recoveryPreview --> recovery: Cambiar opción o fecha
    recoveryPreview --> result: Confirmar o esperar
    result --> reflection
    reflection --> welcome: Nueva campaña
    reflection --> setup: Reintentar mismo seed
~~~

**Seguridad de estado:** todos los cambios por comandos validados \`SELECT_CHOICE\`, \`CONFIRM_AREA\`, \`REVEAL_DEMAND\`, \`SET_RECOVERY\`, \`CONFIRM_RECOVERY\`, \`RESET_CAMPAIGN\`; prohibido que \`OPEN_HELP\`, \`CLOSE_HELP\`, \`HIDE_GUIDE\` o \`BACK\` ejecuten compras/replays. El comparador prueba opciones sin persistir PO hasta confirmar.

**Persistencia:** \`supply-lab-i2-v1\` no comparte claves con V1; guarda campaña, seed, elecciones, narración activa, microvista, ajustes y decisión confirmada. A través de migración schemaVersion:1, repara o rechaza estados corruptos; no guardar miles de eventos ni datos identificables. Persistir un mismo input produce el mismo hash físico tras recarga.

## 4. Filosofía de UI y carga cognitiva

- Una vista central, **una decisión principal**; pocas opciones autoexplicativas.
- KPI esencial (1, máximo 2) visible. Glosario y fórmulas accesibles, sin forzar lectura.
- No usar carruseles que oculten opciones de negocio sin indicar cuántas hay.
- El botón fijo queda fuera del área de scroll interior, con padding por safe-area; cuando teclado o zoom impiden el layout, priorizar accesibilidad frente a «no scroll».
- Puntuación y logros son **lectura secundaria**, nunca modifican costos, pedidos, stock ni decisiones.
- Personaje opcional; mensajes cortos que no cubren indicadores. Se puede apagar.
- Configuración avanzada no redirige tras cada edición; cambios quedan en borrador hasta «Guardar».
- Fallo controlado del motor: mostrar una notificación con «Reintentar»/«Volver», no pantalla en blanco ni dato inventado.
- Si una compra no rescata pedidos, la UI no la recomienda por ser «urgente»; explicar la restricción y el plazo.

## 5. Pruebas obligatorias

### Contratos de datos

1. Ocho departamentos, cada opción de V1 con su \`choiceId\` mapeado o excepción documentada.
2. Misma configuración V1/I2 ⇒ igualdad de manif. original por SKU, número pedidos, recepciones y expedidos.
3. Cinco recuperaciones siempre parten de la misma base inmutable.
4. Día13, calidad cero, recepción cero, picking cero, transporte cero, reserva sin stock, pedidos multicomponente y combinación no aditiva.
5. Plan original no cambia al revelar, ni al observar impacto opcional.
6. \`OPEN_HELP\`, \`CLOSE_HELP\` y switching guide no modifican signature, estado ni replay count.
7. Modo juego no mezcla jamás \`aggregate-shift\` con \`sku-cohort\` ni numera PO como stock recibido.

### Matriz E2E UX

| Área | Comprobación necesaria |
|---|---|
| Modo dual | Entrada V1 → juego y vuelta; refresh directo /juego/; storage independiente |
| Inicio | Empezar con defaults; 3 ajustes avanzados consecutivos sin volver a operación |
| Navegación | Atrás/continuar/selector/microvistas; scroll central independiente, cabecera/footer estables |
| Elección | 3 tarjetas accesibles, una selección; botón confirmar ejecuta una sola transición |
| Ayuda | Modal atrapando foco, Escape, cierre y retorno al botón; no mutar simulación |
| Shock | oculto hasta reveal; uno solo; semilla/replay reproducible |
| Recuperación | 5 estrategias, fechas, costo, cancelación, confirmación y persistencia |
| Resultado | servicio, pendientes, espera y costos con alcance; informe detallado accesible |
| Teléfono | 320/360/390/412/430; alturas 568/640/760/844; landscape, zoom 200%, teclado |
| Accesibilidad | labels, focus order, contrastes, reduced motion, TalkBack real |
| Rendimiento | sin freeze tras seleccionar, sin reejecuciones al abrir ayudas, tamaño JS monitorizado |

**El pase E2E no acredita el resultado humano.** Registrar aparte pruebas físicas y comprensión. Las capturas de Chromium deben guardarse como artefactos del CI cuando se quiera revisión visual remota; no referenciarlas como vistas personalmente si no se abrieron.

### Inventario automático de controles

A partir de I2-36 generar matriz CSV/JSON con \`sceneId\`, \`role\`, \`accessibleName\`, \`enabledWhen\`, \`action\`, \`expectedState\`, \`testedMobile\`, \`testedKeyboard\`, \`manualRequired\`, y lanzar fallo si hay botones sin ruta/acción o acciones que no producen la transición anunciada. Validar también controles ocultos y deshabilitados, no solo «botones presentes» en DOM.

## 6. Despliegue y compatibilidad

GitHub Pages estático; assets versionados de I2 en namespace propio (p. ej. \`?i2=0.1-r1\`) independiente del \`release.json\` V1 o adaptar manifiesto con dos productos sin romper el comparador actual. El verificador HTTP deberá consultar ambos HTML (V1 e I2) y manifest apropiados. Se evitará service worker/caché agresiva hasta haber probado actualización segura. En cada release se ejecutan suites del juego **y** del laboratorio histórico.

Licencias y recursos: preservar MIT, generar recursos de mascota con derechos de uso claros; no usar fuentes privadas ni imágenes con licencias dudosas. Los elementos visuales nuevos son opcionales y no deben producir dependencia de descarga externa para entender una decisión.

## 7. Entrega y evolución

- **Primero**: QA de botones/scroll y contrato de dos modos.
- **Después**: shell de una pantalla, acción inferior, información desplegable.
- **Finalmente**: guion de gerente, elecciones por área, crisis, recuperación, resultados y logros.

**Nunca lanzar un botón "Jugar" sin destino**; habilitar después de que \`/juego/\` exista y pase HTTP. Cualquier cambio de ámbito económico debe tener propuesta explícita y tests; V1 puede mejorar por separado, pero eso no autoriza mezclar resultados.

Consulta [I2-PLAN-MAESTRO.md](I2-PLAN-MAESTRO.md) para orden, definición de terminado y decisiones.
